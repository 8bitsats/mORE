import { getWallet } from '../src/utils/wallet';
import { getConnection } from '../src/utils/solana';
import { fetchStake } from '../src/utils/accounts';
import { buildClaimYieldInstruction } from '../src/utils/program';
import { Transaction } from '@solana/web3.js';

/**
 * Simulate claiming staking rewards to see what would be claimed
 * without actually sending a transaction
 *
 * Run with: npx ts-node tests/simulate-claim-staking.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Simulate Claiming Staking Rewards');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();

    console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Check current stake
    console.log('Fetching stake account...');
    const stake = await fetchStake(wallet.publicKey);

    if (!stake) {
      console.log('❌ No stake account found\n');
      return;
    }

    const stakedAmount = Number(stake.balance) / 1e9;
    const claimableFromAccount = Number(stake.rewardsOre) / 1e9;

    console.log('Current Stake Info:');
    console.log(`  Staked: ${stakedAmount.toFixed(6)} ORB`);
    console.log(`  Claimable (from rewards field): ${claimableFromAccount.toFixed(6)} ORB\n`);

    // Try simulating with different amounts to find the maximum claimable
    const testAmounts = [999999, 100, 10, 1, 0.1, 0.01, 0];

    console.log('Testing different claim amounts via simulation...\n');

    for (const amount of testAmounts) {
      console.log(`--- Simulating claim of ${amount} ORB ---`);

      try {
        // Build claim instruction
        const instruction = await buildClaimYieldInstruction(amount);

        // Create transaction
        const transaction = new Transaction();
        transaction.add(instruction);
        transaction.feePayer = wallet.publicKey;

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;

        // Sign transaction (for simulation)
        transaction.sign(wallet);

        // Simulate transaction
        const simulation = await connection.simulateTransaction(transaction, [wallet]);

        if (simulation.value.err) {
          console.log(`❌ Simulation failed: ${JSON.stringify(simulation.value.err)}`);

          // Check if error indicates insufficient rewards
          const errStr = JSON.stringify(simulation.value.err);
          if (errStr.includes('InsufficientFunds') || errStr.includes('Custom')) {
            console.log('   → Not enough rewards accrued yet\n');
          }
        } else {
          console.log('✅ Simulation succeeded!');
          console.log(`   → Would claim: ${amount} ORB`);

          // Check logs for more details
          if (simulation.value.logs && simulation.value.logs.length > 0) {
            console.log('\n   Logs:');
            simulation.value.logs.forEach(log => {
              if (log.includes('Transfer') || log.includes('ORB') || log.includes('claim')) {
                console.log(`     ${log}`);
              }
            });
          }

          console.log(`\n💡 Maximum claimable appears to be around: ${amount} ORB\n`);
          break; // Found working amount
        }
      } catch (error: any) {
        console.log(`❌ Simulation error: ${error.message}\n`);
      }
    }

    console.log('============================================================');
    console.log('Simulation Complete');
    console.log('============================================================');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
