import { getWallet } from '../src/utils/wallet';
import { fetchMiner } from '../src/utils/accounts';
import { buildClaimOreInstruction, sendAndConfirmTransaction } from '../src/utils/program';
import { config } from '../src/utils/config';

/**
 * Test script to claim ONLY ORB from mining rewards
 * Run with: npx ts-node tests/test-claim-mining-orb.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Claiming ORB from Mining Rewards Only');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();

    // Fetch miner account
    console.log('Checking mining rewards...');
    const miner = await fetchMiner(wallet.publicKey);

    if (!miner) {
      console.log('❌ No miner account found');
      return;
    }

    const miningOrb = Number(miner.rewardsOre) / 1e9;
    console.log(`Mining ORB Rewards: ${miningOrb.toFixed(2)} ORB`);

    if (miningOrb === 0) {
      console.log('ℹ️  No ORB rewards to claim');
      return;
    }

    // Build claim ORB instruction
    console.log('\nBuilding claim ORB instruction...');
    const instruction = await buildClaimOreInstruction();

    // Dry run check
    if (config.dryRun) {
      console.log('[DRY RUN] Would claim:', miningOrb.toFixed(2), 'ORB');
      console.log('✅ Dry run completed');
      return;
    }

    // Send transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction([instruction], 'Claim Mining ORB');

    console.log('\n✅ Claim successful!');
    console.log(`Transaction: ${signature}`);
    console.log(`Claimed: ${miningOrb.toFixed(2)} ORB`);
  } catch (error) {
    console.error('\n❌ Claim failed:', error);
    process.exit(1);
  }
}

main();
