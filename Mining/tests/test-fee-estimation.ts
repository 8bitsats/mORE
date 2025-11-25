/**
 * Test script for fee estimation utility
 * Tests RPC capability detection and fee estimation for different transaction types
 */

import { PublicKey } from '@solana/web3.js';
import { getConnection } from '../src/utils/solana';
import { config } from '../src/utils/config';
import {
  estimatePriorityFee,
  FeeLevel,
  COMPUTE_UNIT_LIMITS,
} from '../src/utils/feeEstimation';
import logger from '../src/utils/logger';

async function main() {
  logger.info('='.repeat(80));
  logger.info('Fee Estimation Test');
  logger.info('='.repeat(80));

  const connection = getConnection();

  logger.info(`\nRPC Endpoint: ${connection.rpcEndpoint}`);
  logger.info(`Configured Fee Level: ${config.priorityFeeLevel}`);
  logger.info(`Min Priority Fee: ${config.minPriorityFeeMicroLamports} micro-lamports/CU`);
  logger.info(`Max Priority Fee: ${config.maxPriorityFeeMicroLamports} micro-lamports/CU`);

  // Test accounts (sample accounts for estimation)
  const testAccounts = [
    config.orbProgramId,
    config.orbTokenMint,
    new PublicKey('11111111111111111111111111111111'), // System program
  ];

  logger.info('\n' + '='.repeat(80));
  logger.info('Testing RPC Capability Detection');
  logger.info('='.repeat(80));

  // This will automatically detect and log RPC capabilities
  logger.info('\nDetecting RPC fee estimation capabilities...');

  logger.info('\n' + '='.repeat(80));
  logger.info('Testing Fee Estimation for Different Transaction Types');
  logger.info('='.repeat(80));

  const txTypes = [
    { name: 'Deploy/Mining', limit: COMPUTE_UNIT_LIMITS.DEPLOY },
    { name: 'Claim SOL', limit: COMPUTE_UNIT_LIMITS.CLAIM_SOL },
    { name: 'Claim ORB', limit: COMPUTE_UNIT_LIMITS.CLAIM_ORB },
    { name: 'Stake', limit: COMPUTE_UNIT_LIMITS.STAKE },
    { name: 'Swap', limit: COMPUTE_UNIT_LIMITS.SWAP },
    { name: 'Checkpoint', limit: COMPUTE_UNIT_LIMITS.CHECKPOINT },
  ];

  for (const txType of txTypes) {
    logger.info(`\n${'─'.repeat(80)}`);
    logger.info(`Transaction Type: ${txType.name}`);
    logger.info(`Compute Unit Limit: ${txType.limit.toLocaleString()} CU`);
    logger.info(`${'─'.repeat(40)}`);

    for (const level of Object.values(FeeLevel)) {
      try {
        const estimate = await estimatePriorityFee(
          connection,
          testAccounts,
          level,
          txType.limit
        );

        const costSol = estimate.totalFeeLamports / 1e9;
        const costUsd = costSol * 150; // Assume $150 SOL for rough USD estimate

        logger.info(
          `  ${level.padEnd(10)} → ` +
          `${estimate.computeUnitPrice.toString().padStart(6)} μ-lamports/CU | ` +
          `Total: ${estimate.totalFeeLamports.toString().padStart(6)} lamports ` +
          `(~${costSol.toFixed(6)} SOL / ~$${costUsd.toFixed(4)})`
        );
      } catch (error: any) {
        logger.error(`  ${level}: Failed - ${error.message}`);
      }
    }
  }

  logger.info('\n' + '='.repeat(80));
  logger.info('Fee Comparison: Network Levels vs Config Settings');
  logger.info('='.repeat(80));

  // Show what the bot will actually use based on config
  const configLevel = config.priorityFeeLevel as FeeLevel;
  logger.info(`\nBot will use fee level: ${configLevel}`);

  const botEstimate = await estimatePriorityFee(
    connection,
    testAccounts,
    configLevel,
    COMPUTE_UNIT_LIMITS.DEPLOY
  );

  logger.info('\nBot Mining Transaction Fee Estimate:');
  logger.info(`  Compute Unit Price: ${botEstimate.computeUnitPrice} micro-lamports/CU`);
  logger.info(`  Compute Unit Limit: ${botEstimate.computeUnitLimit.toLocaleString()} CU`);
  logger.info(`  Total Priority Fee: ${botEstimate.totalFeeLamports} lamports (~${(botEstimate.totalFeeLamports / 1e9).toFixed(6)} SOL)`);

  const isAtMin = botEstimate.computeUnitPrice === config.minPriorityFeeMicroLamports;
  const isAtMax = botEstimate.computeUnitPrice === config.maxPriorityFeeMicroLamports;

  if (isAtMin) {
    logger.info('  ⚠️  Fee is at MINIMUM (network is uncongested or RPC does not support fee estimation)');
  } else if (isAtMax) {
    logger.info('  ⚠️  Fee is at MAXIMUM (network is highly congested - consider raising max fee)');
  } else {
    logger.info('  ✅ Fee is within configured range (dynamic estimation active)');
  }

  logger.info('\n' + '='.repeat(80));
  logger.info('Recommendations');
  logger.info('='.repeat(80));

  if (!isAtMin && !isAtMax) {
    logger.info('\n✅ Your RPC supports dynamic fee estimation!');
    logger.info('   Fees will automatically adjust based on network congestion.');
    logger.info('   This will help you save on fees during quiet periods and');
    logger.info('   ensure transactions land during busy periods.');
  } else if (isAtMin) {
    logger.info('\nℹ️  Using minimum fee (fallback mode)');
    logger.info('   Your RPC may not support fee estimation APIs, or the network is very quiet.');
    logger.info('   Consider using Helius or Triton RPC for dynamic fee optimization:');
    logger.info('   - Helius: https://www.helius.dev/');
    logger.info('   - Triton: https://triton.one/');
  } else {
    logger.info('\n⚠️  Network is highly congested!');
    logger.info(`   Consider increasing MAX_PRIORITY_FEE_MICRO_LAMPORTS above ${config.maxPriorityFeeMicroLamports}`);
    logger.info('   to ensure transactions land reliably.');
  }

  logger.info('\n' + '='.repeat(80));
  logger.info('Test Complete');
  logger.info('='.repeat(80));
}

main().catch(error => {
  logger.error('Test failed:', error);
  process.exit(1);
});
