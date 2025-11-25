import { queryCommand } from '../src/commands/query';

/**
 * Test script to check wallet balances, rewards, round info, and ORB price
 * Run with: npx ts-node tests/test-query.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Running Query Test');
  console.log('============================================================\n');

  try {
    await queryCommand();
    console.log('\n✅ Query test completed successfully');
  } catch (error) {
    console.error('\n❌ Query test failed:', error);
    process.exit(1);
  }
}

main();
