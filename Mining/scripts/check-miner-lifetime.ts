/**
 * Check lifetime mining stats from on-chain miner account
 */
import { getWallet } from '../src/utils/wallet';
import { fetchMiner } from '../src/utils/accounts';

async function checkMinerLifetime() {
  const wallet = getWallet();
  const minerData = await fetchMiner(wallet.publicKey);

  if (!minerData) {
    console.log('No miner account found');
    process.exit(0);
  }

  console.log('\n=== MINER ACCOUNT LIFETIME STATS ===\n');
  console.log(`Lifetime SOL Earned: ${(Number(minerData.lifetimeRewardsSol) / 1e9).toFixed(4)} SOL`);
  console.log(`Lifetime ORB Earned: ${(Number(minerData.lifetimeRewardsOre) / 1e9).toFixed(4)} ORB`);
  console.log(`\nCurrent Pending:`);
  console.log(`  SOL: ${(Number(minerData.rewardsSol) / 1e9).toFixed(4)} SOL`);
  console.log(`  ORB: ${(Number(minerData.rewardsOre) / 1e9).toFixed(4)} ORB`);

  process.exit(0);
}

checkMinerLifetime().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
