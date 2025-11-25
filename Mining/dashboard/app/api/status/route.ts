import { NextResponse } from 'next/server';
import { ensureBotInitialized } from '@/lib/init-bot';
import { Connection, PublicKey } from '@solana/web3.js';
import { config, loadAndCacheConfig } from '@bot/utils/config';
import { fetchBoard, fetchMiner, fetchStake, fetchTreasury, fetchRound, getAutomationPDA, calculateAccruedStakingRewards } from '@bot/utils/accounts';
import { getWallet, getBalances } from '@bot/utils/wallet';
import { getOrbPrice } from '@bot/utils/jupiter';
import { isMaintenanceMode, MAINTENANCE_RESPONSE } from '@/lib/maintenance';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Cache for unique miners count (updates every 30 seconds)
let minerCountCache: { count: number; roundId: string; timestamp: number } = { count: 0, roundId: '', timestamp: 0 };
const MINER_COUNT_CACHE_TTL = 30000; // 30 seconds

export async function GET() {
  try {
    // Check for maintenance mode - don't access database if in maintenance
    if (isMaintenanceMode()) {
      return NextResponse.json(MAINTENANCE_RESPONSE, { status: 503 });
    }

    // Ensure bot utilities are initialized
    await ensureBotInitialized();

    // Load configuration from database
    await loadAndCacheConfig();

    const connection = new Connection(config.rpcEndpoint);
    const wallet = getWallet();
    // Create a fresh PublicKey instance from the string to avoid toBuffer() issues
    const walletPublicKey = new PublicKey(wallet.publicKey.toBase58());

    // Fetch blockchain data in parallel
    const [board, miner, stake, treasury, walletBalances, orbPrice] = await Promise.all([
      fetchBoard(),
      fetchMiner(walletPublicKey),
      fetchStake(walletPublicKey).catch(() => null),
      fetchTreasury(),
      getBalances(walletPublicKey),
      getOrbPrice().catch(() => ({ priceInSol: 0, priceInUsd: 0 })),
    ]);

    // Fetch current round data
    let round = null;
    try {
      round = await fetchRound(board.roundId);
    } catch (error) {
      console.error('Error fetching round data:', error);
    }

    // Count unique miners in current round (with caching)
    let uniqueMinersCount = 0;
    const currentRoundId = board.roundId.toString();
    const now = Date.now();

    // Check if cache is valid (same round and not expired)
    if (minerCountCache.roundId === currentRoundId && (now - minerCountCache.timestamp) < MINER_COUNT_CACHE_TTL) {
      uniqueMinersCount = minerCountCache.count;
    } else {
      // Cache expired or different round - fetch fresh data
      try {
        const ORB_PROGRAM_ID = new PublicKey(config.orbProgramId);

        // Import base58 encoder from @solana/web3.js
        const { encode: bs58encode } = await import('bs58');

        const MINER_DISCRIMINATOR = Buffer.from([103, 0, 0, 0, 0, 0, 0, 0]); // Miner account discriminator
        const roundIdBuffer = board.roundId.toArrayLike(Buffer, 'le', 8);

        const minerAccounts = await connection.getProgramAccounts(ORB_PROGRAM_ID, {
          filters: [
            {
              memcmp: {
                offset: 0,
                bytes: bs58encode(MINER_DISCRIMINATOR),
              },
            },
            {
              memcmp: {
                offset: 512, // roundId offset in Miner struct (8 + 504 = 512 absolute)
                bytes: bs58encode(roundIdBuffer),
              },
            },
          ],
          dataSlice: { offset: 0, length: 0 }, // Only fetch account keys, not data
        });

        uniqueMinersCount = minerAccounts.length;

        // Update cache
        minerCountCache = {
          count: uniqueMinersCount,
          roundId: currentRoundId,
          timestamp: now,
        };
      } catch (error) {
        console.error('Error counting unique miners:', error);
        // Fallback: estimate based on active squares (rough estimate)
        uniqueMinersCount = round ? Math.ceil(round.deployed.filter(amt => Number(amt) > 0).length * 1.2) : 0;
      }
    }

    // Calculate claimable rewards
    const claimableSol = miner ? Number(miner.rewardsSol) / 1e9 : 0;
    const claimableOrb = miner ? Number(miner.rewardsOre) / 1e9 : 0;
    const stakedOrb = stake ? Number(stake.balance) / 1e9 : 0;
    const claimableStakingRewardsSol = stake ? Number(stake.rewardsSol) / 1e9 : 0;
    const claimableStakingRewardsOre = stake ? Number(stake.rewardsOre) / 1e9 : 0;

    // Calculate accrued (unsettled) staking rewards using I80F48 reward factors
    let accruedStakingRewardsOre = 0;
    if (stake && treasury) {
      const accruedLamports = calculateAccruedStakingRewards(
        treasury.stakeRewardsFactor,
        stake.rewardsFactor,
        stake.balance
      );
      accruedStakingRewardsOre = Number(accruedLamports) / 1e9;
    }

    // Calculate automation balance (if automation account exists)
    let automationBalance = 0;
    if (miner) {
      try {
        const [automationPDA] = getAutomationPDA(walletPublicKey);
        const automationAccountInfo = await connection.getAccountInfo(automationPDA);
        if (automationAccountInfo) {
          automationBalance = automationAccountInfo.lamports / 1e9;
        }
      } catch (error) {
        console.error('Error fetching automation balance:', error);
      }
    }

    // Calculate mining premium/discount if miner has active deployments
    let miningPremium = null;
    if (miner && miner.deployed.some((amt) => Number(amt) > 0) && orbPrice.priceInSol > 0 && round) {
      try {
        const totalDeployedByMiner = miner.deployed.reduce((sum, amt) => sum + Number(amt), 0) / 1e9;
        const totalDeployedInRound = round.deployed.reduce((sum, amt) => sum + Number(amt), 0) / 1e9;
        const motherloadOrb = treasury ? Number(treasury.motherlode) / 1e9 : 0;

        // Calculate your share of total deployment
        const yourShare = totalDeployedInRound > 0
          ? totalDeployedByMiner / (totalDeployedInRound + totalDeployedByMiner)
          : 0;

        // Calculate expected ORB rewards
        const baseRewardExpected = yourShare * 4; // 4 ORB base reward per round
        const motherloadChance = 1 / 625;
        const motherloadExpected = motherloadChance * yourShare * motherloadOrb;
        const expectedOrbRewards = (baseRewardExpected + motherloadExpected) * 0.9; // After 10% refining fee

        if (expectedOrbRewards > 0) {
          // Production cost per ORB = NET COST (fees paid) / Expected ORB
          // You get back ~95% of deployment on average, so net cost is ~5%
          const expectedSolBack = totalDeployedByMiner * 0.95;
          const netCost = totalDeployedByMiner - expectedSolBack; // Fees paid
          const productionCostPerOrb = netCost / expectedOrbRewards;

          // Mining premium ratio = (Production Cost / Market Price) × 100
          const miningPremiumRatio = (productionCostPerOrb / orbPrice.priceInSol) * 100;

          // Discount/Premium percentage (negative = discount, positive = premium)
          const discountOrPremium = 100 - miningPremiumRatio;

          miningPremium = {
            productionCostPerOrb, // in SOL
            productionCostPerOrbUsd: productionCostPerOrb * (orbPrice.priceInUsd / orbPrice.priceInSol), // in USD
            miningPremiumRatio, // percentage
            discountOrPremium, // negative = discount, positive = premium
            expectedOrbRewards,
            yourShare: yourShare * 100, // as percentage
            totalDeployedByMiner, // Total SOL deployed
            netCost, // Net cost (fees)
          };
        }
      } catch (error) {
        console.error('Error calculating mining premium:', error);
      }
    }

    const status = {
      timestamp: new Date().toISOString(),

      // Current round info
      round: {
        id: board.roundId.toString(),
        motherlode: treasury ? Number(treasury.motherlode) / 1e9 : 0,
        startSlot: board.startSlot.toString(),
        endSlot: board.endSlot.toString(),
        totalDeployed: round ? round.deployed.reduce((sum, amt) => sum + Number(amt), 0) / 1e9 : 0,
        activeSquares: round ? round.deployed.filter(amt => Number(amt) > 0).length : 0,
        uniqueMiners: uniqueMinersCount,
        totalDeployments: round ? round.count.reduce((sum, count) => sum + Number(count), 0) : 0,
      },

      // Wallet balances
      balances: {
        sol: walletBalances.sol,
        orb: walletBalances.orb,
        automationSol: automationBalance,
      },

      // Claimable rewards
      claimable: {
        sol: claimableSol,
        orb: claimableOrb,
        stakingRewardsSol: claimableStakingRewardsSol,
        stakingRewardsOrb: claimableStakingRewardsOre,
      },

      // Staking info
      staking: {
        stakedOrb,
        claimableRewardsSol: claimableStakingRewardsSol,
        claimableRewardsOrb: claimableStakingRewardsOre,
        accruedRewardsOrb: accruedStakingRewardsOre, // Accrued but not yet settled
      },

      // Price info
      prices: {
        orbPriceUsd: orbPrice.priceInUsd,
        orbPriceSol: orbPrice.priceInSol,
      },

      // Miner stats
      miner: miner ? {
        lifetimeRewardsSol: Number(miner.lifetimeRewardsSol) / 1e9,
        lifetimeRewardsOre: Number(miner.lifetimeRewardsOre) / 1e9,
        hasAutomation: automationBalance > 0,
        deployed: miner.deployed.map((amt) => Number(amt) / 1e9), // Current round deployments per square
        totalDeployed: miner.deployed.reduce((sum, amt) => sum + Number(amt), 0) / 1e9,
        activeSquares: miner.deployed.filter((amt) => Number(amt) > 0).length,
      } : null,

      // Mining premium/discount calculation
      miningPremium,

      // Treasury info
      treasury: treasury ? {
        totalStaked: Number(treasury.totalStaked) / 1e9,
        totalUnclaimed: Number(treasury.totalUnclaimed) / 1e9,
      } : null,

      // Automation info
      automation: {
        isActive: automationBalance > 0,
        balance: automationBalance,
        motherloadThreshold: config.motherloadThreshold,
      },

      // Bot status - determine if bot is mining, waiting, or idle
      botStatus: (() => {
        if (automationBalance === 0) return 'idle';

        const currentMotherlode = treasury ? Number(treasury.motherlode) / 1e9 : 0;
        const isAboveThreshold = currentMotherlode >= config.motherloadThreshold;

        // Bot is waiting if automation is active but motherload is below threshold
        if (!isAboveThreshold) return 'waiting';

        // If above threshold and automation is active, assume mining
        return 'mining';
      })(),
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
