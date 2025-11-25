import { Connection, PublicKey, ComputeBudgetProgram, TransactionInstruction } from '@solana/web3.js';
import { config } from './config';
import logger from './logger';

/**
 * Fee estimation utility with RPC capability detection
 * Supports: Helius, Triton, and standard Solana RPC methods
 */

export enum FeeLevel {
  Low = 'low',          // May take longer to land
  Medium = 'medium',    // Balanced speed/cost
  High = 'high',        // Fast landing
  VeryHigh = 'veryHigh' // Guaranteed fast landing
}

interface HeliusFeeResponse {
  result?: {
    priorityFeeEstimate?: number;
  };
}

export interface FeeEstimate {
  computeUnitPrice: number;    // Micro-lamports per compute unit
  computeUnitLimit: number;    // Max compute units for transaction
  totalFeeLamports: number;    // Estimated total priority fee
}

interface RpcCapabilities {
  supportsHeliusFees: boolean;
  supportsRecentPrioritizationFees: boolean;
  lastChecked: number;
}

// Cache RPC capabilities (checked once per session)
let rpcCapabilities: RpcCapabilities | null = null;

/**
 * Detect RPC capabilities for fee estimation
 */
async function detectRpcCapabilities(connection: Connection): Promise<RpcCapabilities> {
  // Return cached result if available and recent (< 1 hour old)
  if (rpcCapabilities && Date.now() - rpcCapabilities.lastChecked < 3600000) {
    return rpcCapabilities;
  }

  logger.info('Detecting RPC fee estimation capabilities...');

  const capabilities: RpcCapabilities = {
    supportsHeliusFees: false,
    supportsRecentPrioritizationFees: false,
    lastChecked: Date.now(),
  };

  // Test 1: Check for Helius-style getPriorityFeeEstimate
  try {
    const testPubkey = new PublicKey('11111111111111111111111111111111');
    const response = await fetch(connection.rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getPriorityFeeEstimate',
        params: [
          {
            accountKeys: [testPubkey.toBase58()],
            options: { recommended: true },
          },
        ],
      }),
    });

    const data = await response.json() as HeliusFeeResponse;
    if (data.result?.priorityFeeEstimate !== undefined) {
      capabilities.supportsHeliusFees = true;
      logger.info('✅ RPC supports Helius-style getPriorityFeeEstimate');
    }
  } catch (error) {
    // Not supported, try alternative method
  }

  // Test 2: Check for standard getRecentPrioritizationFees
  if (!capabilities.supportsHeliusFees) {
    try {
      const fees = await connection.getRecentPrioritizationFees();
      if (fees && fees.length > 0) {
        capabilities.supportsRecentPrioritizationFees = true;
        logger.info('✅ RPC supports standard getRecentPrioritizationFees');
      }
    } catch (error) {
      logger.warn('⚠️  RPC does not support priority fee estimation APIs');
    }
  }

  // Cache the result
  rpcCapabilities = capabilities;

  if (!capabilities.supportsHeliusFees && !capabilities.supportsRecentPrioritizationFees) {
    logger.info('ℹ️  Using fallback static fee estimation');
  }

  return capabilities;
}

/**
 * Get priority fee estimate from Helius-style RPC
 */
async function getHeliusPriorityFee(
  connection: Connection,
  accounts: PublicKey[]
): Promise<number | null> {
  try {
    const accountKeys = accounts.map(a => a.toBase58());

    const response = await fetch(connection.rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getPriorityFeeEstimate',
        params: [
          {
            accountKeys,
            options: {
              recommended: true,
            },
          },
        ],
      }),
    });

    const data = await response.json() as HeliusFeeResponse;
    const estimate = data.result?.priorityFeeEstimate;

    if (typeof estimate === 'number' && estimate > 0) {
      logger.debug(`Helius fee estimate: ${estimate} micro-lamports/CU`);
      return estimate;
    }

    return null;
  } catch (error) {
    logger.debug('Failed to get Helius fee estimate:', error);
    return null;
  }
}

/**
 * Get priority fee estimate from standard Solana RPC
 * Uses getRecentPrioritizationFees and calculates percentile
 */
async function getSolanaPriorityFee(
  connection: Connection,
  percentile: number = 50 // 50th percentile = median
): Promise<number | null> {
  try {
    const fees = await connection.getRecentPrioritizationFees();

    if (!fees || fees.length === 0) {
      return null;
    }

    // Extract fee values and sort
    const feeValues = fees
      .map(f => f.prioritizationFee)
      .filter(f => f > 0)
      .sort((a, b) => a - b);

    if (feeValues.length === 0) {
      return null;
    }

    // Calculate percentile
    const index = Math.floor((percentile / 100) * feeValues.length);
    const fee = feeValues[Math.min(index, feeValues.length - 1)];

    logger.debug(`Solana RPC fee estimate (p${percentile}): ${fee} micro-lamports/CU from ${feeValues.length} samples`);
    return fee;
  } catch (error) {
    logger.debug('Failed to get Solana fee estimate:', error);
    return null;
  }
}

/**
 * Get fallback fee based on static configuration
 */
function getFallbackFee(level: FeeLevel): number {
  const fallbackFees = {
    [FeeLevel.Low]: config.minPriorityFeeMicroLamports,
    [FeeLevel.Medium]: Math.floor((config.minPriorityFeeMicroLamports + config.maxPriorityFeeMicroLamports) / 2),
    [FeeLevel.High]: Math.floor(config.maxPriorityFeeMicroLamports * 0.75),
    [FeeLevel.VeryHigh]: config.maxPriorityFeeMicroLamports,
  };

  return fallbackFees[level];
}

/**
 * Get percentile for fee level (used with standard Solana RPC)
 */
function getPercentileForLevel(level: FeeLevel): number {
  const percentiles = {
    [FeeLevel.Low]: 25,
    [FeeLevel.Medium]: 50,
    [FeeLevel.High]: 75,
    [FeeLevel.VeryHigh]: 95,
  };

  return percentiles[level];
}

/**
 * Estimate priority fee for a transaction
 *
 * @param connection - Solana connection
 * @param accounts - Accounts involved in the transaction (for better estimation)
 * @param level - Desired fee level (speed/cost tradeoff)
 * @param computeUnitLimit - Expected compute units (default: 200k for simple txs)
 * @returns Fee estimate with compute unit price and limit
 */
export async function estimatePriorityFee(
  connection: Connection,
  accounts: PublicKey[],
  level: FeeLevel = FeeLevel.Medium,
  computeUnitLimit: number = 200000
): Promise<FeeEstimate> {
  try {
    // Detect RPC capabilities
    const capabilities = await detectRpcCapabilities(connection);

    let computeUnitPrice: number | null = null;

    // Try Helius-style API first (most accurate)
    if (capabilities.supportsHeliusFees) {
      computeUnitPrice = await getHeliusPriorityFee(connection, accounts);
    }

    // Fallback to standard Solana RPC
    if (computeUnitPrice === null && capabilities.supportsRecentPrioritizationFees) {
      const percentile = getPercentileForLevel(level);
      computeUnitPrice = await getSolanaPriorityFee(connection, percentile);
    }

    // Final fallback to static configuration
    if (computeUnitPrice === null) {
      computeUnitPrice = getFallbackFee(level);
      logger.debug(`Using fallback fee: ${computeUnitPrice} micro-lamports/CU`);
    }

    // Apply min/max bounds from config
    computeUnitPrice = Math.max(
      config.minPriorityFeeMicroLamports,
      Math.min(computeUnitPrice, config.maxPriorityFeeMicroLamports)
    );

    // Calculate total fee in lamports
    // Total fee = (computeUnitPrice * computeUnitLimit) / 1,000,000
    const totalFeeLamports = Math.ceil((computeUnitPrice * computeUnitLimit) / 1_000_000);

    const estimate: FeeEstimate = {
      computeUnitPrice,
      computeUnitLimit,
      totalFeeLamports,
    };

    logger.debug(
      `Fee estimate (${level}): ${computeUnitPrice} μ-lamports/CU, ` +
      `limit: ${computeUnitLimit} CU, ` +
      `total: ${totalFeeLamports} lamports (~${(totalFeeLamports / 1e9).toFixed(6)} SOL)`
    );

    return estimate;
  } catch (error) {
    logger.warn('Fee estimation failed, using fallback:', error);

    const fallbackPrice = getFallbackFee(level);
    const totalFeeLamports = Math.ceil((fallbackPrice * computeUnitLimit) / 1_000_000);

    return {
      computeUnitPrice: fallbackPrice,
      computeUnitLimit,
      totalFeeLamports,
    };
  }
}

/**
 * Build compute budget instructions for a transaction
 *
 * @param connection - Solana connection
 * @param accounts - Accounts involved in the transaction
 * @param level - Desired fee level
 * @param computeUnitLimit - Expected compute units
 * @returns Array of compute budget instructions to prepend to transaction
 */
export async function buildComputeBudgetInstructions(
  connection: Connection,
  accounts: PublicKey[],
  level: FeeLevel = FeeLevel.Medium,
  computeUnitLimit: number = 200000
): Promise<TransactionInstruction[]> {
  const estimate = await estimatePriorityFee(connection, accounts, level, computeUnitLimit);

  return [
    ComputeBudgetProgram.setComputeUnitLimit({ units: estimate.computeUnitLimit }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: estimate.computeUnitPrice }),
  ];
}

/**
 * Get recommended compute unit limits for different transaction types
 */
export const COMPUTE_UNIT_LIMITS = {
  DEPLOY: 300000,      // Mining deployment (complex, involves automation PDA)
  CLAIM_SOL: 50000,    // Simple SOL claim
  CLAIM_ORB: 150000,   // ORB claim (involves token accounts)
  STAKE: 100000,       // Staking operation
  SWAP: 400000,        // Jupiter swap (most complex)
  CHECKPOINT: 200000,  // Checkpoint operation
  AUTOMATION_SETUP: 200000, // Setup automation account
};

/**
 * Helper: Get fee level from config or string
 */
export function parseFeeLevel(level: string | FeeLevel): FeeLevel {
  const validLevels = Object.values(FeeLevel);
  if (validLevels.includes(level as FeeLevel)) {
    return level as FeeLevel;
  }

  logger.warn(`Invalid fee level "${level}", using Medium`);
  return FeeLevel.Medium;
}
