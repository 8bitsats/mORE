import { getWallet } from '../src/utils/wallet';
import { fetchMiner } from '../src/utils/accounts';
import { buildClaimSolInstruction, sendAndConfirmTransaction } from '../src/utils/program';
import { config } from '../src/utils/config';

/**
 * Test script to claim ONLY SOL from mining rewards
 * Run with: npx ts-node tests/test-claim-mining-sol.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Claiming SOL from Mining Rewards Only');
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

    const miningSol = Number(miner.rewardsSol) / 1e9;
    console.log(`Mining SOL Rewards: ${miningSol.toFixed(4)} SOL`);

    if (miningSol === 0) {
      console.log('ℹ️  No SOL rewards to claim');
      return;
    }

    // Build claim SOL instruction
    console.log('\nBuilding claim SOL instruction...');
    const instruction = buildClaimSolInstruction();

    // Dry run check
    if (config.dryRun) {
      console.log('[DRY RUN] Would claim:', miningSol.toFixed(4), 'SOL');
      console.log('✅ Dry run completed');
      return;
    }

    // Send transaction
    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction([instruction], 'Claim Mining SOL');

    console.log('\n✅ Claim successful!');
    console.log(`Transaction: ${signature}`);
    console.log(`Claimed: ${miningSol.toFixed(4)} SOL`);
  } catch (error) {
    console.error('\n❌ Claim failed:', error);
    process.exit(1);
  }
}

main();
