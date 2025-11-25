import { autoDeployCommand } from '../src/commands/autoDeploy';

/**
 * Test script to start the auto-deploy bot (autominer)
 * This will run continuously until stopped with Ctrl+C
 *
 * Features:
 * - Smart round management (waits for new rounds)
 * - Motherload threshold checking
 * - Auto-claim rewards when thresholds met
 * - Auto-swap ORB to SOL when balance low
 * - Graceful shutdown on Ctrl+C
 *
 * Run with: npx ts-node tests/test-auto-deploy.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Starting Auto-Deploy Bot (Autominer)');
  console.log('============================================================\n');
  console.log('This will run continuously. Press Ctrl+C to stop.');
  console.log('');

  try {
    await autoDeployCommand();
  } catch (error) {
    console.error('\n❌ Auto-deploy failed:', error);
    process.exit(1);
  }
}

main();
