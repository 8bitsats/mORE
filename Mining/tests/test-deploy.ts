import { deployCommand } from '../src/commands/deploy';

/**
 * Test script to deploy SOL to all 25 squares once
 * Run with: npx ts-node tests/test-deploy.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Running Deploy Test');
  console.log('============================================================\n');

  try {
    await deployCommand();
    console.log('\n✅ Deploy test completed successfully');
  } catch (error) {
    console.error('\n❌ Deploy test failed:', error);
    process.exit(1);
  }
}

main();
