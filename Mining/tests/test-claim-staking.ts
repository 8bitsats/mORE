import { getWallet } from '../src/utils/wallet';
import { fetchStake } from '../src/utils/accounts';
import { buildClaimYieldInstruction, sendAndConfirmTransaction } from '../src/utils/program';
import { config } from '../src/utils/config';

/**
 * Test claiming staking rewards
 *
 * This will attempt to claim the 0.078 ORB shown in the UI
 * to understand how the ClaimYield instruction works.
 *
 * Run with: npx ts-node tests/test-claim-staking.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Test Claiming Staking Rewards');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    console.log(`Wallet: ${wallet.publicKey.toBase58()}\n`);

    // Check current stake
    console.log('Fetching stake account...');
    const stake = await fetchStake(wallet.publicKey);

    if (!stake) {
      console.log('❌ No stake account found');
      console.log('You need to stake ORB first.\n');
      return;
    }

    const stakedAmount = Number(stake.balance) / 1e9;
    const claimableFromAccount = Number(stake.rewardsOre) / 1e9;
    const lifetimeRewards = Number(stake.lifetimeRewardsOre) / 1e9;

    console.log('Current Stake Info:');
    console.log(`  Staked: ${stakedAmount.toFixed(6)} ORB`);
    console.log(`  Claimable (from account): ${claimableFromAccount.toFixed(6)} ORB`);
    console.log(`  Lifetime rewards: ${lifetimeRewards.toFixed(6)} ORB\n`);

    // The UI shows 0.078 ORB claimable, but account shows 0
    // Let's try different approaches to claim

    console.log('--- Approach 1: Try claiming with amount from UI (0.078 ORB) ---');
    const uiAmount = 0.078146359; // What the UI shows

    console.log(`Building ClaimYield instruction with amount: ${uiAmount.toFixed(6)} ORB`);
    const instruction1 = await buildClaimYieldInstruction(uiAmount);

    if (config.dryRun) {
      console.log('[DRY RUN] Would send claim transaction\n');
    } else {
      console.log('⚠️  This will attempt a REAL transaction!');
      console.log('Press Ctrl+C within 3 seconds to cancel...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        console.log('Sending claim transaction...');
        const signature = await sendAndConfirmTransaction([instruction1], 'Claim Staking Yield');
        console.log(`✅ Claim successful!`);
        console.log(`Transaction: ${signature}\n`);

        // Check balance after claim
        console.log('Checking stake after claim...');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for state update

        const stakeAfter = await fetchStake(wallet.publicKey);
        if (stakeAfter) {
          const claimableAfter = Number(stakeAfter.rewardsOre) / 1e9;
          const lifetimeAfter = Number(stakeAfter.lifetimeRewardsOre) / 1e9;

          console.log('After Claim:');
          console.log(`  Claimable: ${claimableAfter.toFixed(6)} ORB`);
          console.log(`  Lifetime: ${lifetimeAfter.toFixed(6)} ORB`);
          console.log(`  Difference: +${(lifetimeAfter - lifetimeRewards).toFixed(6)} ORB\n`);
        }
      } catch (error: any) {
        console.log('❌ Claim failed!');
        console.log(`Error: ${error.message}\n`);

        if (error.message.includes('insufficient')) {
          console.log('💡 The amount specified might be higher than actual claimable rewards');
          console.log('💡 Try claiming with 0 to let the program claim whatever is available\n');
        }

        // Try approach 2: Claim with 0
        console.log('--- Approach 2: Try claiming with amount = 0 ---');
        console.log('Some programs ignore the amount and claim whatever is available...');

        const instruction2 = await buildClaimYieldInstruction(0);

        try {
          console.log('Sending claim transaction with amount=0...');
          const signature = await sendAndConfirmTransaction([instruction2], 'Claim Staking Yield (0)');
          console.log(`✅ Claim successful with amount=0!`);
          console.log(`Transaction: ${signature}\n`);

          // Check balance after claim
          console.log('Checking stake after claim...');
          await new Promise(resolve => setTimeout(resolve, 2000));

          const stakeAfter = await fetchStake(wallet.publicKey);
          if (stakeAfter) {
            const claimableAfter = Number(stakeAfter.rewardsOre) / 1e9;
            const lifetimeAfter = Number(stakeAfter.lifetimeRewardsOre) / 1e9;

            console.log('After Claim:');
            console.log(`  Claimable: ${claimableAfter.toFixed(6)} ORB`);
            console.log(`  Lifetime: ${lifetimeAfter.toFixed(6)} ORB`);
            console.log(`  Difference: +${(lifetimeAfter - lifetimeRewards).toFixed(6)} ORB\n`);
          }
        } catch (error2: any) {
          console.log('❌ Claim with amount=0 also failed!');
          console.log(`Error: ${error2.message}\n`);

          console.log('💡 This suggests rewards haven\'t actually accrued yet on-chain');
          console.log('💡 The UI might be showing projected/estimated rewards');
          console.log('💡 Wait longer for rewards to accumulate and become claimable\n');
        }
      }
    }

    console.log('============================================================');
    console.log('Test Complete');
    console.log('============================================================');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
