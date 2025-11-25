/**
 * PnL Reconciliation Tool
 *
 * Audits the database against on-chain state and identifies discrepancies.
 * Helps fix PnL tracking issues caused by manual operations or bot crashes.
 */

import { getWallet, getBalances, getSolBalance } from "../src/utils/wallet";
import { getConnection } from "../src/utils/solana";
import {
  getAutomationPDA,
  fetchMiner,
  fetchStake,
} from "../src/utils/accounts";
import { getPnLSummary, getRecentTransactions, initializeDatabase, closeDatabase } from "../src/utils/database";

interface ReconciliationReport {
  databaseState: {
    totalDeployed: number;
    totalClaimedSol: number;
    totalClaimedOrb: number;
    totalSwappedSol: number;
    totalSwappedOrb: number;
  };
  onChainState: {
    automationBalance: number;
    automationExists: boolean;
    claimableSol: number;
    claimableOrb: number;
    walletSol: number;
    walletOrb: number;
    stakedOrb: number;
  };
  discrepancies: string[];
  recommendations: string[];
}

async function getAutomationInfo() {
  const connection = getConnection();
  const [automationPDA] = getAutomationPDA(getWallet().publicKey);
  const accountInfo = await connection.getAccountInfo(automationPDA);

  if (!accountInfo || accountInfo.data.length < 112) {
    return { exists: false, balance: 0, pda: automationPDA };
  }

  const data = accountInfo.data;
  const amountPerSquare = data.readBigUInt64LE(8);
  const balance = data.readBigUInt64LE(48);
  const mask = data.readBigUInt64LE(104);

  return {
    exists: true,
    pda: automationPDA,
    amountPerSquare: Number(amountPerSquare) / 1e9,
    balance: Number(balance) / 1e9,
    mask: Number(mask),
    costPerRound: (Number(amountPerSquare) * Number(mask)) / 1e9,
  };
}

async function reconcilePnL(): Promise<ReconciliationReport> {
  console.log("🔍 Starting PnL Reconciliation...\n");

  await initializeDatabase();
  const wallet = getWallet();

  // Get database state
  console.log("📊 Reading database state...");
  const pnl = await getPnLSummary();
  const recentTxs = await getRecentTransactions(100);

  const automationSetups = recentTxs.filter(
    (tx: any) => tx.type === "automation_setup" && tx.status === "success"
  );
  const automationCloses = recentTxs.filter(
    (tx: any) => tx.type === "automation_close" && tx.status === "success"
  );

  const dbState = {
    totalDeployed: pnl.totalDeployedSol,
    totalClaimedSol: pnl.totalClaimedSol,
    totalClaimedOrb: pnl.totalClaimedOrb,
    totalSwappedSol: pnl.totalSwappedSol,
    totalSwappedOrb: pnl.totalSwappedOrb,
  };

  console.log("Database State:");
  console.log(
    `  Capital Deployed: ${dbState.totalDeployed.toFixed(4)} SOL (${
      automationSetups.length
    } setups)`
  );
  console.log(`  Claimed SOL: ${dbState.totalClaimedSol.toFixed(4)} SOL`);
  console.log(`  Claimed ORB: ${dbState.totalClaimedOrb.toFixed(4)} ORB`);
  console.log(
    `  Swapped: ${dbState.totalSwappedOrb.toFixed(
      4
    )} ORB → ${dbState.totalSwappedSol.toFixed(4)} SOL`
  );
  console.log(
    `  Automation Closes: ${automationCloses.length} (returned SOL should be in claimed or swapped)`
  );
  console.log();

  // Get on-chain state
  console.log("⛓️  Reading on-chain state...");

  const automationInfo = await getAutomationInfo();
  const minerData = await fetchMiner(wallet.publicKey);
  const balances = await getBalances(wallet.publicKey);
  const walletSol = await getSolBalance();

  let stakedOrb = 0;
  try {
    const stakeData = await fetchStake(wallet.publicKey);
    if (stakeData) {
      stakedOrb = Number(stakeData.balance) / 1e9;
    }
  } catch {
    // No stake account
  }

  const onChainState = {
    automationExists: automationInfo.exists,
    automationBalance: automationInfo.balance,
    claimableSol: minerData ? Number(minerData.rewardsSol) / 1e9 : 0,
    claimableOrb: minerData ? Number(minerData.rewardsOre) / 1e9 : 0,
    walletSol,
    walletOrb: balances.orb,
    stakedOrb,
  };

  console.log("On-Chain State:");
  console.log(`  Automation Exists: ${onChainState.automationExists}`);
  console.log(
    `  Automation Balance: ${onChainState.automationBalance.toFixed(4)} SOL`
  );
  console.log(`  Claimable SOL: ${onChainState.claimableSol.toFixed(4)} SOL`);
  console.log(`  Claimable ORB: ${onChainState.claimableOrb.toFixed(4)} ORB`);
  console.log(`  Wallet SOL: ${onChainState.walletSol.toFixed(4)} SOL`);
  console.log(`  Wallet ORB: ${onChainState.walletOrb.toFixed(4)} ORB`);
  console.log(`  Staked ORB: ${onChainState.stakedOrb.toFixed(4)} ORB`);
  console.log();

  // Analyze discrepancies
  const discrepancies: string[] = [];
  const recommendations: string[] = [];

  // Check if automation exists but has 0 balance
  if (onChainState.automationExists && onChainState.automationBalance === 0) {
    discrepancies.push(
      "⚠️  Automation account exists but has 0 balance (depleted or manually drained)"
    );
    recommendations.push(
      "Close automation account with: npx ts-node tests/test-close-automation.ts"
    );
  }

  // Check if automation doesn't exist but database shows setups
  if (!onChainState.automationExists && automationSetups.length > 0) {
    discrepancies.push(
      "⚠️  Database shows automation setups, but no automation account exists on-chain"
    );
    recommendations.push(
      "This is normal if automation was closed. Verify closure was recorded in database."
    );
  }

  // Calculate expected current value
  const expectedCurrentValue =
    dbState.totalClaimedSol +
    dbState.totalSwappedSol +
    onChainState.automationBalance +
    onChainState.claimableSol;

  const netPnL = expectedCurrentValue - dbState.totalDeployed;
  const roiPercent =
    dbState.totalDeployed > 0 ? (netPnL / dbState.totalDeployed) * 100 : 0;

  console.log("📈 Calculated PnL:");
  console.log(`  Capital Deployed: ${dbState.totalDeployed.toFixed(4)} SOL`);
  console.log(
    `  Current Value: ${expectedCurrentValue.toFixed(4)} SOL`
  );
  console.log(`    = ${dbState.totalClaimedSol.toFixed(4)} claimed`);
  console.log(`    + ${dbState.totalSwappedSol.toFixed(4)} swapped`);
  console.log(`    + ${onChainState.automationBalance.toFixed(4)} automation`);
  console.log(`    + ${onChainState.claimableSol.toFixed(4)} pending`);
  console.log(
    `  Net PnL: ${netPnL >= 0 ? "✅" : "❌"} ${
      netPnL >= 0 ? "+" : ""
    }${netPnL.toFixed(4)} SOL (${
      roiPercent >= 0 ? "+" : ""
    }${roiPercent.toFixed(1)}% ROI)`
  );
  console.log();

  // Check for ORB accounting issues
  const expectedOrbBalance =
    dbState.totalClaimedOrb -
    dbState.totalSwappedOrb +
    onChainState.claimableOrb +
    onChainState.walletOrb +
    onChainState.stakedOrb;

  console.log("🪙 ORB Accounting:");
  console.log(`  Total Claimed: ${dbState.totalClaimedOrb.toFixed(4)} ORB`);
  console.log(
    `  Total Swapped: -${dbState.totalSwappedOrb.toFixed(4)} ORB`
  );
  console.log(
    `  Current Holdings: ${(
      onChainState.claimableOrb +
      onChainState.walletOrb +
      onChainState.stakedOrb
    ).toFixed(4)} ORB`
  );
  console.log(
    `    = ${onChainState.claimableOrb.toFixed(
      4
    )} pending + ${onChainState.walletOrb.toFixed(
      4
    )} wallet + ${onChainState.stakedOrb.toFixed(4)} staked`
  );
  console.log(`  Net ORB Balance: ${expectedOrbBalance.toFixed(4)} ORB`);

  if (expectedOrbBalance < -0.01) {
    discrepancies.push(
      `⚠️  Negative ORB balance (${expectedOrbBalance.toFixed(
        4
      )} ORB) - possible missing claim records or manual swaps`
    );
    recommendations.push(
      "Check if you manually claimed or swapped ORB outside the bot"
    );
  }
  console.log();

  // Check for common issues
  if (automationSetups.length === 0) {
    discrepancies.push(
      "⚠️  No automation setup transactions recorded - database may be empty or corrupted"
    );
    recommendations.push(
      "Consider resetting database with: npx ts-node scripts/reset-pnl.ts"
    );
  }

  if (automationSetups.length > automationCloses.length + 1) {
    discrepancies.push(
      `⚠️  ${automationSetups.length} setups but only ${automationCloses.length} closes - possible missing close records`
    );
    recommendations.push(
      "If you manually closed automation accounts, those closes weren't recorded"
    );
  }

  // Display findings
  if (discrepancies.length > 0) {
    console.log("🔍 Discrepancies Found:");
    discrepancies.forEach((d) => console.log(`  ${d}`));
    console.log();
  }

  if (recommendations.length > 0) {
    console.log("💡 Recommendations:");
    recommendations.forEach((r, i) => console.log(`  ${i + 1}. ${r}`));
    console.log();
  }

  if (discrepancies.length === 0) {
    console.log(
      "✅ No major discrepancies found! PnL tracking appears accurate."
    );
    console.log();
  }

  return {
    databaseState: dbState,
    onChainState,
    discrepancies,
    recommendations,
  };
}

// Run reconciliation
reconcilePnL()
  .then(async () => {
    console.log("✅ Reconciliation complete!");
    await closeDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Reconciliation failed:", error);
    await closeDatabase();
    process.exit(1);
  });
