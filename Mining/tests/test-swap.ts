import { swapCommand } from '../src/commands/swap';

/**
 * Test script to swap ORB to SOL via Jupiter
 * Run with: npx ts-node tests/test-swap.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Running Swap Test');
  console.log('============================================================\n');

  try {
    await swapCommand();
    console.log('\n✅ Swap test completed successfully');
  } catch (error) {
    console.error('\n❌ Swap test failed:', error);
    process.exit(1);
  }
}

main();
