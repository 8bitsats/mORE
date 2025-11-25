import { stakeCommand } from '../src/commands/stake';

/**
 * Test script to stake ORB tokens for yield
 * Run with: npx ts-node tests/test-stake.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Running Stake Test');
  console.log('============================================================\n');

  try {
    await stakeCommand();
    console.log('\n✅ Stake test completed successfully');
  } catch (error) {
    console.error('\n❌ Stake test failed:', error);
    process.exit(1);
  }
}

main();
