import { claimCommand } from '../src/commands/claim';

/**
 * Test script to claim SOL/ORB rewards from mining and/or staking
 * Run with: npx ts-node tests/test-claim.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Running Claim Test');
  console.log('============================================================\n');

  try {
    await claimCommand();
    console.log('\n✅ Claim test completed successfully');
  } catch (error) {
    console.error('\n❌ Claim test failed:', error);
    process.exit(1);
  }
}

main();
