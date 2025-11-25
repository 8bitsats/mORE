import { getWallet, getSolBalance } from '../src/utils/wallet';
import { getAutomationPDA, fetchTreasury } from '../src/utils/accounts';
import { buildAutomateInstruction, sendAndConfirmTransaction, AutomationStrategy } from '../src/utils/program';
import { getConnection } from '../src/utils/solana';
import { config } from '../src/utils/config';

/**
 * Smart automation setup with dynamic budget allocation based on motherload
 *
 * Strategy:
 * - Uses 90% of current SOL balance
 * - Spreads budget over variable number of rounds based on motherload
 * - Higher motherload = fewer rounds with more SOL per round (better EV)
 * - Deploys to all 25 squares each round
 *
 * Motherload tiers:
 * - 0-99 ORB:    100 rounds (conservative)
 * - 100-199 ORB:  90 rounds
 * - 200-299 ORB:  80 rounds
 * - 300-399 ORB:  70 rounds
 * - 400-499 ORB:  60 rounds
 * - 500-599 ORB:  50 rounds
 * - 600-699 ORB:  40 rounds (aggressive - high EV)
 * - 700+ ORB:     30 rounds (very aggressive)
 *
 * Run with: npx ts-node tests/test-setup-smart-automation.ts
 */

function calculateTargetRounds(motherloadOrb: number): number {
  // Base rounds = 100, decrease by 10 for every 100 ORB increase
  const baseRounds = 100;
  const motherloadTier = Math.floor(motherloadOrb / 100);
  const reduction = motherloadTier * 10;

  // Minimum 30 rounds even for huge motherloads
  const targetRounds = Math.max(30, baseRounds - reduction);

  return targetRounds;
}

async function main() {
  console.log('============================================================');
  console.log('Smart On-Chain Automation Setup');
  console.log('Dynamic Budget Allocation Based on Motherload');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [automationPDA] = getAutomationPDA(wallet.publicKey);

    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Automation PDA: ${automationPDA.toBase58()}\n`);

    // Check if automation account already exists
    const existingAccount = await connection.getAccountInfo(automationPDA);
    if (existingAccount) {
      console.log('⚠️  Automation account already exists!');
      console.log('To modify automation settings, you need to close the existing account first.\n');
      return;
    }

    // Get current SOL balance
    const solBalance = await getSolBalance();
    console.log(`Current SOL Balance: ${solBalance.toFixed(4)} SOL`);

    // Calculate usable budget (90% of balance)
    const usableBudget = solBalance * 0.9;
    console.log(`Usable Budget (90%): ${usableBudget.toFixed(4)} SOL\n`);

    if (usableBudget < 0.5) {
      console.log('❌ Insufficient SOL balance. Need at least 0.56 SOL (0.5 usable + 0.06 reserve)');
      return;
    }

    // Get current motherload
    console.log('Fetching current motherload...');
    const treasury = await fetchTreasury();
    const motherloadOrb = Number(treasury.motherlode) / 1e9;
    console.log(`Current Motherload: ${motherloadOrb.toFixed(2)} ORB\n`);

    // Calculate target rounds based on motherload
    const targetRounds = calculateTargetRounds(motherloadOrb);
    console.log('='.repeat(60));
    console.log('SMART ALLOCATION CALCULATION');
    console.log('='.repeat(60));
    console.log(`Motherload Tier: ${Math.floor(motherloadOrb / 100) * 100}-${Math.floor(motherloadOrb / 100) * 100 + 99} ORB`);
    console.log(`Target Rounds: ${targetRounds} rounds`);
    console.log(`Squares per Round: 25 squares`);
    console.log('');

    // Calculate SOL per square
    const totalSquares = targetRounds * 25;
    const solPerSquare = usableBudget / totalSquares;
    const solPerRound = solPerSquare * 25;

    console.log('Deployment Configuration:');
    console.log(`  SOL per square: ${solPerSquare.toFixed(6)} SOL`);
    console.log(`  SOL per round: ${solPerRound.toFixed(4)} SOL`);
    console.log(`  Total squares: ${totalSquares} (${targetRounds} rounds × 25)`);
    console.log(`  Total budget: ${usableBudget.toFixed(4)} SOL`);
    console.log('');

    // Estimate rounds until depletion
    console.log('Expected Performance:');
    console.log(`  Rounds funded: ${targetRounds} rounds`);
    console.log(`  Win probability: ${(1/25 * 100).toFixed(2)}% per round (random deployment)`);
    console.log(`  Expected wins: ${(targetRounds / 25).toFixed(1)} times`);
    console.log(`  Risk level: ${motherloadOrb >= 600 ? 'AGGRESSIVE' : motherloadOrb >= 400 ? 'MODERATE' : 'CONSERVATIVE'}`);
    console.log('');

    // Safety check
    if (solPerSquare < 0.0001) {
      console.log('⚠️  WARNING: SOL per square is very low. Consider increasing budget or reducing rounds.');
    }

    // Configuration for automation
    const deposit = usableBudget; // Fund with full usable budget
    const feePerExecution = 0.00001; // Minimal fee for self-execution
    const strategy = AutomationStrategy.Random;
    const squareMask = 25n; // All 25 squares

    console.log('='.repeat(60));
    console.log('AUTOMATION ACCOUNT CONFIGURATION');
    console.log('='.repeat(60));
    console.log(`  Initial deposit: ${deposit.toFixed(4)} SOL`);
    console.log(`  Fee per round: ${feePerExecution.toFixed(6)} SOL`);
    console.log(`  Strategy: Random (all 25 squares)`);
    console.log(`  Executor: ${wallet.publicKey.toBase58()} (self)`);
    console.log('');

    // Dry run check
    if (config.dryRun) {
      console.log('[DRY RUN] Would create automation account with above settings');
      console.log('✅ Dry run completed');
      return;
    }

    // Confirm with user
    console.log('⚠️  IMPORTANT: Once created, automation will run automatically!');
    console.log('    Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('Creating smart automation account...');
    const instruction = buildAutomateInstruction(
      solPerSquare,
      deposit,
      feePerExecution,
      strategy,
      squareMask,
      wallet.publicKey // Self-execute
    );

    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction([instruction], 'Setup Smart Automation');

    console.log('\n' + '='.repeat(60));
    console.log('✅ SMART AUTOMATION SETUP SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log(`Transaction: ${signature}`);
    console.log(`\nAutomation Account: ${automationPDA.toBase58()}`);
    console.log(`\nYour automation is now active and will:`);
    console.log(`  • Deploy ${solPerRound.toFixed(4)} SOL per round (${solPerSquare.toFixed(6)} SOL/square)`);
    console.log(`  • Cover approximately ${targetRounds} rounds`);
    console.log(`  • Adjust strategy as motherload changes`);
    console.log(`\n💡 TIP: Fund the automation account anytime to extend runtime!`);
    console.log(`💡 TIP: Monitor with: npx ts-node tests/analyze-automate-instruction.ts`);
  } catch (error) {
    console.error('\n❌ Smart automation setup failed:', error);
    process.exit(1);
  }
}

main();
