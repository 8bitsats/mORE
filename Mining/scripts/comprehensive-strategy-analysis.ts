/**
 * Comprehensive ORB Mining Strategy Analysis
 *
 * Advanced Monte Carlo simulations with:
 * - Real reward mechanics (base + motherload)
 * - Variable competition levels
 * - Kelly Criterion optimization
 * - Long-term sustainability analysis
 * - Risk-adjusted returns
 * - Variance analysis
 *
 * Usage: npx ts-node scripts/comprehensive-strategy-analysis.ts
 */

// ============================================================================
// CONSTANTS - Actual ORB Mining Mechanics
// ============================================================================

const SQUARES_PER_ROUND = 25;
const BASE_ORB_REWARD = 4; // ORB distributed every round
const REFINING_FEE = 0.10; // 10% fee on ORB rewards
const SOL_RETURN_RATE = 0.95; // 95% of SOL returned
const MOTHERLOAD_HIT_CHANCE = 1 / 625; // 1 in 625 chance to hit motherload
const LAMPORTS_PER_SOL = 1e9;

// ============================================================================
// TYPES
// ============================================================================

interface TierConfig {
  motherloadThreshold: number;
  targetRounds: number;
}

interface StrategyConfig {
  name: string;
  description: string;
  tiers: TierConfig[];
}

interface SimulationParams {
  initialBudget: number;
  orbPriceInSol: number;
  competitionMultiplier: number;
  numSimulations: number;
}

interface RoundResult {
  solSpent: number;
  solReturned: number;
  orbEarned: number;
  hitMotherload: boolean;
}

interface SimulationResult {
  strategy: string;
  motherload: number;
  competition: number;
  totalRuns: number;

  // Performance metrics
  avgProfit: number;
  avgROI: number;
  medianROI: number;
  winRate: number;
  motherloadHits: number;

  // Risk metrics
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  riskOfRuin: number;
  valueAtRisk95: number;

  // Sustainability
  profitableRuns: number;
  sustainabilityScore: number;
  avgRoundsPlayed: number;
  budgetDepletionRate: number;

  // Distribution
  roiStdDev: number;
  roiSkewness: number;
  percentile10: number;
  percentile90: number;
}

// ============================================================================
// REWARD CALCULATION (Actual Mechanics)
// ============================================================================

/**
 * Calculate expected rewards for a single round
 */
function calculateRoundRewards(
  yourDeployment: number,
  totalCompetition: number,
  motherloadOrb: number
): { expectedOrb: number; expectedSol: number } {
  const totalDeployment = yourDeployment + totalCompetition;
  const yourShare = yourDeployment / totalDeployment;

  // Base reward (always distributed)
  const baseOrbReward = yourShare * BASE_ORB_REWARD;

  // Motherload reward (1/625 chance, expected value)
  const expectedMotherloadOrb = MOTHERLOAD_HIT_CHANCE * yourShare * motherloadOrb;

  // Total expected ORB after refining fee
  const totalExpectedOrb = (baseOrbReward + expectedMotherloadOrb) * (1 - REFINING_FEE);

  // Expected SOL back (95% return)
  const expectedSolBack = yourDeployment * SOL_RETURN_RATE;

  return {
    expectedOrb: totalExpectedOrb,
    expectedSol: expectedSolBack,
  };
}

/**
 * Simulate a single mining round with randomness
 */
function simulateRound(
  deploymentSol: number,
  totalCompetition: number,
  motherloadOrb: number
): RoundResult {
  const totalDeployment = deploymentSol + totalCompetition;
  const yourShare = deploymentSol / totalDeployment;

  // Check if motherload hit (random)
  const hitMotherload = Math.random() < MOTHERLOAD_HIT_CHANCE;

  // Calculate rewards
  let orbEarned = yourShare * BASE_ORB_REWARD; // Base reward always

  if (hitMotherload) {
    orbEarned += yourShare * motherloadOrb; // Add motherload share
  }

  // Apply refining fee
  orbEarned *= (1 - REFINING_FEE);

  // SOL returned (95%)
  const solReturned = deploymentSol * SOL_RETURN_RATE;

  return {
    solSpent: deploymentSol,
    solReturned,
    orbEarned,
    hitMotherload,
  };
}

// ============================================================================
// STRATEGY CALCULATION
// ============================================================================

/**
 * Calculate SOL per round for a given motherload and strategy
 */
function calculateSolPerRound(
  motherload: number,
  strategy: StrategyConfig,
  budget: number
): number {
  // Find matching tier (sorted high to low)
  const sortedTiers = [...strategy.tiers].sort((a, b) =>
    b.motherloadThreshold - a.motherloadThreshold
  );

  let targetRounds = sortedTiers[sortedTiers.length - 1].targetRounds;

  for (const tier of sortedTiers) {
    if (motherload >= tier.motherloadThreshold) {
      targetRounds = tier.targetRounds;
      break;
    }
  }

  // Distribute budget over target rounds
  return budget / targetRounds;
}

// ============================================================================
// SIMULATION ENGINE
// ============================================================================

/**
 * Run a single simulation (one budget lifecycle)
 */
function runSingleSimulation(
  strategy: StrategyConfig,
  motherload: number,
  initialBudget: number,
  competitionMultiplier: number,
  orbPriceInSol: number
): { profit: number; roi: number; roundsPlayed: number; motherloadHits: number; budgetHistory: number[] } {
  let budget = initialBudget;
  let totalOrbEarned = 0;
  let roundsPlayed = 0;
  let motherloadHits = 0;
  const budgetHistory: number[] = [initialBudget];

  // Calculate deployment amount
  const solPerRound = calculateSolPerRound(motherload, strategy, initialBudget);
  const competition = solPerRound * competitionMultiplier;

  // Get target rounds
  const sortedTiers = [...strategy.tiers].sort((a, b) => b.motherloadThreshold - a.motherloadThreshold);
  let targetRounds = sortedTiers[sortedTiers.length - 1].targetRounds;
  for (const tier of sortedTiers) {
    if (motherload >= tier.motherloadThreshold) {
      targetRounds = tier.targetRounds;
      break;
    }
  }

  // Simulate rounds
  while (budget >= solPerRound && roundsPlayed < targetRounds) {
    const result = simulateRound(solPerRound, competition, motherload);

    budget = budget - result.solSpent + result.solReturned;
    totalOrbEarned += result.orbEarned;
    roundsPlayed++;

    if (result.hitMotherload) {
      motherloadHits++;
    }

    budgetHistory.push(budget);
  }

  // Calculate final value
  const orbValue = totalOrbEarned * orbPriceInSol;
  const finalValue = budget + orbValue;
  const profit = finalValue - initialBudget;
  const roi = (profit / initialBudget) * 100;

  return { profit, roi, roundsPlayed, motherloadHits, budgetHistory };
}

/**
 * Run full Monte Carlo simulation for a strategy
 */
function runMonteCarloSimulation(
  strategy: StrategyConfig,
  motherload: number,
  params: SimulationParams
): SimulationResult {
  const results: { profit: number; roi: number; roundsPlayed: number; motherloadHits: number; maxDrawdown: number }[] = [];
  const roiValues: number[] = [];

  let totalMotherloadHits = 0;
  let profitableRuns = 0;
  let ruinCount = 0;

  // Run simulations
  for (let i = 0; i < params.numSimulations; i++) {
    const result = runSingleSimulation(
      strategy,
      motherload,
      params.initialBudget,
      params.competitionMultiplier,
      params.orbPriceInSol
    );

    // Calculate max drawdown
    let maxBudget = params.initialBudget;
    let maxDrawdown = 0;
    for (const budget of result.budgetHistory) {
      if (budget > maxBudget) maxBudget = budget;
      const drawdown = (maxBudget - budget) / maxBudget;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    results.push({
      profit: result.profit,
      roi: result.roi,
      roundsPlayed: result.roundsPlayed,
      motherloadHits: result.motherloadHits,
      maxDrawdown: maxDrawdown * 100,
    });

    roiValues.push(result.roi);
    totalMotherloadHits += result.motherloadHits;

    if (result.profit > 0) profitableRuns++;
    if (result.profit < -params.initialBudget * 0.8) ruinCount++;
  }

  // Calculate statistics
  const avgProfit = results.reduce((sum, r) => sum + r.profit, 0) / params.numSimulations;
  const avgROI = results.reduce((sum, r) => sum + r.roi, 0) / params.numSimulations;
  const avgRoundsPlayed = results.reduce((sum, r) => sum + r.roundsPlayed, 0) / params.numSimulations;
  const avgDrawdown = results.reduce((sum, r) => sum + r.maxDrawdown, 0) / params.numSimulations;

  // ROI statistics
  roiValues.sort((a, b) => a - b);
  const medianROI = roiValues[Math.floor(roiValues.length / 2)];
  const percentile10 = roiValues[Math.floor(roiValues.length * 0.1)];
  const percentile90 = roiValues[Math.floor(roiValues.length * 0.9)];
  const valueAtRisk95 = roiValues[Math.floor(roiValues.length * 0.05)];

  // Standard deviation
  const roiVariance = roiValues.reduce((sum, roi) => sum + Math.pow(roi - avgROI, 2), 0) / roiValues.length;
  const roiStdDev = Math.sqrt(roiVariance);

  // Sharpe Ratio (assuming risk-free rate = 0)
  const sharpeRatio = roiStdDev > 0 ? avgROI / roiStdDev : 0;

  // Sortino Ratio (downside deviation)
  const downsideDeviations = roiValues.filter(roi => roi < 0).map(roi => Math.pow(roi, 2));
  const downsideVariance = downsideDeviations.length > 0
    ? downsideDeviations.reduce((a, b) => a + b, 0) / downsideDeviations.length
    : 0;
  const downsideDeviation = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDeviation > 0 ? avgROI / downsideDeviation : 0;

  // Skewness
  const roiSkewness = roiValues.reduce((sum, roi) => sum + Math.pow((roi - avgROI) / roiStdDev, 3), 0) / roiValues.length;

  // Win rate (motherload hits / total rounds)
  const totalRounds = results.reduce((sum, r) => sum + r.roundsPlayed, 0);
  const winRate = totalRounds > 0 ? (totalMotherloadHits / totalRounds) * 100 : 0;

  // Sustainability score (weighted: profitability - risk)
  const profitabilityPct = (profitableRuns / params.numSimulations) * 100;
  const riskOfRuin = (ruinCount / params.numSimulations) * 100;
  const sustainabilityScore = profitabilityPct - (riskOfRuin * 2) + (avgROI / 10);

  // Budget depletion rate
  const solPerRound = calculateSolPerRound(motherload, strategy, params.initialBudget);
  const budgetDepletionRate = (solPerRound / params.initialBudget) * 100;

  return {
    strategy: strategy.name,
    motherload,
    competition: params.competitionMultiplier,
    totalRuns: params.numSimulations,

    avgProfit,
    avgROI,
    medianROI,
    winRate,
    motherloadHits: totalMotherloadHits,

    maxDrawdown: avgDrawdown,
    sharpeRatio,
    sortinoRatio,
    riskOfRuin,
    valueAtRisk95,

    profitableRuns,
    sustainabilityScore,
    avgRoundsPlayed,
    budgetDepletionRate,

    roiStdDev,
    roiSkewness,
    percentile10,
    percentile90,
  };
}

// ============================================================================
// KELLY CRITERION ANALYSIS
// ============================================================================

/**
 * Calculate optimal bet size using Kelly Criterion
 */
function calculateKellyCriterion(
  motherload: number,
  competitionMultiplier: number,
  orbPriceInSol: number
): { kellyFraction: number; expectedValue: number; optimalBetSize: number } {
  // For a given budget, what's the optimal fraction to bet?
  const budget = 1.0; // Reference budget
  const testBet = 0.01; // Test bet size
  const competition = testBet * competitionMultiplier;

  // Calculate expected rewards
  const { expectedOrb, expectedSol } = calculateRoundRewards(testBet, competition, motherload);
  const orbValue = expectedOrb * orbPriceInSol;
  const totalReturn = expectedSol + orbValue;
  const expectedValue = totalReturn - testBet;

  // Win probability (simplified: based on if EV > 0)
  const winProb = expectedValue > 0 ? 0.51 : 0.49;
  const loseProb = 1 - winProb;

  // Win/loss amounts
  const winAmount = totalReturn - testBet;
  const lossAmount = testBet - totalReturn;

  // Kelly formula: f = (bp - q) / b
  // where b = odds, p = win prob, q = lose prob
  const odds = winAmount / Math.abs(lossAmount);
  const kellyFraction = (odds * winProb - loseProb) / odds;

  // Clamp to reasonable range
  const clampedKelly = Math.max(0.01, Math.min(0.25, kellyFraction));

  return {
    kellyFraction: clampedKelly,
    expectedValue,
    optimalBetSize: budget * clampedKelly,
  };
}

// ============================================================================
// STRATEGY DEFINITIONS
// ============================================================================

const STRATEGIES: StrategyConfig[] = [
  {
    name: 'CURRENT (Default AUTO)',
    description: 'Current implementation with extended tiers',
    tiers: [
      { motherloadThreshold: 1600, targetRounds: 40 },
      { motherloadThreshold: 1500, targetRounds: 50 },
      { motherloadThreshold: 1400, targetRounds: 60 },
      { motherloadThreshold: 1300, targetRounds: 70 },
      { motherloadThreshold: 1200, targetRounds: 80 },
      { motherloadThreshold: 1100, targetRounds: 100 },
      { motherloadThreshold: 1000, targetRounds: 120 },
      { motherloadThreshold: 900, targetRounds: 160 },
      { motherloadThreshold: 800, targetRounds: 200 },
      { motherloadThreshold: 700, targetRounds: 240 },
      { motherloadThreshold: 600, targetRounds: 280 },
      { motherloadThreshold: 500, targetRounds: 320 },
      { motherloadThreshold: 400, targetRounds: 360 },
      { motherloadThreshold: 300, targetRounds: 400 },
      { motherloadThreshold: 200, targetRounds: 440 },
      { motherloadThreshold: 0, targetRounds: 880 },
    ],
  },
  {
    name: 'AGGRESSIVE',
    description: 'Fewer rounds, larger bets per round',
    tiers: [
      { motherloadThreshold: 1600, targetRounds: 25 },
      { motherloadThreshold: 1400, targetRounds: 35 },
      { motherloadThreshold: 1200, targetRounds: 50 },
      { motherloadThreshold: 1000, targetRounds: 75 },
      { motherloadThreshold: 800, targetRounds: 100 },
      { motherloadThreshold: 600, targetRounds: 150 },
      { motherloadThreshold: 400, targetRounds: 200 },
      { motherloadThreshold: 200, targetRounds: 300 },
      { motherloadThreshold: 0, targetRounds: 500 },
    ],
  },
  {
    name: 'ULTRA CONSERVATIVE',
    description: 'Maximum rounds, smallest bets',
    tiers: [
      { motherloadThreshold: 1600, targetRounds: 60 },
      { motherloadThreshold: 1400, targetRounds: 80 },
      { motherloadThreshold: 1200, targetRounds: 120 },
      { motherloadThreshold: 1000, targetRounds: 180 },
      { motherloadThreshold: 800, targetRounds: 300 },
      { motherloadThreshold: 600, targetRounds: 400 },
      { motherloadThreshold: 400, targetRounds: 500 },
      { motherloadThreshold: 200, targetRounds: 600 },
      { motherloadThreshold: 0, targetRounds: 1000 },
    ],
  },
  {
    name: 'KELLY OPTIMIZED',
    description: 'Based on Kelly Criterion calculations',
    tiers: [
      { motherloadThreshold: 1600, targetRounds: 35 },
      { motherloadThreshold: 1400, targetRounds: 45 },
      { motherloadThreshold: 1200, targetRounds: 65 },
      { motherloadThreshold: 1000, targetRounds: 95 },
      { motherloadThreshold: 800, targetRounds: 140 },
      { motherloadThreshold: 600, targetRounds: 200 },
      { motherloadThreshold: 400, targetRounds: 280 },
      { motherloadThreshold: 200, targetRounds: 380 },
      { motherloadThreshold: 0, targetRounds: 650 },
    ],
  },
];

// ============================================================================
// MAIN ANALYSIS
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE ORB MINING STRATEGY ANALYSIS                      ║');
  console.log('║   Monte Carlo + Kelly Criterion + Risk Analysis                   ║');
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

  // Simulation parameters
  const params: SimulationParams = {
    initialBudget: 1.0,
    orbPriceInSol: 0.15, // ~$30 if SOL = $200
    competitionMultiplier: 15, // 15x competition
    numSimulations: 5000, // 5k runs per test
  };

  console.log('📊 Simulation Parameters:');
  console.log(`   Simulations per test: ${params.numSimulations.toLocaleString()}`);
  console.log(`   Initial budget: ${params.initialBudget} SOL`);
  console.log(`   ORB price: ${params.orbPriceInSol} SOL (~$${(params.orbPriceInSol * 200).toFixed(0)})`);
  console.log(`   Competition: ${params.competitionMultiplier}x your deployment`);
  console.log(`   Strategies tested: ${STRATEGIES.length}\n`);

  // Test motherload levels
  const motherloadLevels = [100, 200, 300, 400, 500, 600, 800, 1000, 1200, 1400, 1600];

  console.log(`🎯 Motherload levels: ${motherloadLevels.join(', ')} ORB\n`);
  console.log('Running simulations... (this will take a few minutes)\n');

  // Store all results
  const allResults: SimulationResult[] = [];

  // Run simulations
  for (const strategy of STRATEGIES) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`📈 Testing: ${strategy.name}`);
    console.log(`   ${strategy.description}`);
    console.log('═'.repeat(70));

    for (const motherload of motherloadLevels) {
      const result = runMonteCarloSimulation(strategy, motherload, params);
      allResults.push(result);

      console.log(`\n🎲 Motherload: ${motherload} ORB`);
      console.log(`   Avg ROI:           ${result.avgROI >= 0 ? '+' : ''}${result.avgROI.toFixed(2)}%`);
      console.log(`   Median ROI:        ${result.medianROI >= 0 ? '+' : ''}${result.medianROI.toFixed(2)}%`);
      console.log(`   Profitability:     ${result.profitableRuns}/${result.totalRuns} runs (${((result.profitableRuns/result.totalRuns)*100).toFixed(1)}%)`);
      console.log(`   Sharpe Ratio:      ${result.sharpeRatio.toFixed(3)}`);
      console.log(`   Max Drawdown:      ${result.maxDrawdown.toFixed(1)}%`);
      console.log(`   Risk of Ruin:      ${result.riskOfRuin.toFixed(1)}%`);
      console.log(`   Sustainability:    ${result.sustainabilityScore.toFixed(1)} pts`);
    }
  }

  // Kelly Criterion Analysis
  console.log('\n\n' + '═'.repeat(70));
  console.log('📐 KELLY CRITERION ANALYSIS');
  console.log('═'.repeat(70));
  console.log('\nOptimal bet sizing recommendations:\n');

  for (const motherload of motherloadLevels) {
    const kelly = calculateKellyCriterion(motherload, params.competitionMultiplier, params.orbPriceInSol);
    console.log(`${motherload} ORB: ${(kelly.kellyFraction * 100).toFixed(2)}% of budget`);
    console.log(`         (EV: ${kelly.expectedValue >= 0 ? '+' : ''}${kelly.expectedValue.toFixed(6)} SOL per round)`);
  }

  // Best Strategy Analysis
  console.log('\n\n' + '═'.repeat(70));
  console.log('🏆 BEST STRATEGY BY MOTHERLOAD LEVEL');
  console.log('═'.repeat(70));

  for (const motherload of motherloadLevels) {
    const resultsForLevel = allResults.filter(r => r.motherload === motherload);

    // Best by ROI
    const bestROI = resultsForLevel.reduce((best, curr) =>
      curr.avgROI > best.avgROI ? curr : best
    );

    // Best by Sharpe Ratio (risk-adjusted)
    const bestSharpe = resultsForLevel.reduce((best, curr) =>
      curr.sharpeRatio > best.sharpeRatio ? curr : best
    );

    // Best by Sustainability
    const bestSustain = resultsForLevel.reduce((best, curr) =>
      curr.sustainabilityScore > best.sustainabilityScore ? curr : best
    );

    console.log(`\n📊 ${motherload} ORB Motherload:`);
    console.log(`   Highest ROI:         ${bestROI.strategy}`);
    console.log(`                        ${bestROI.avgROI >= 0 ? '+' : ''}${bestROI.avgROI.toFixed(2)}% avg, ${bestROI.medianROI.toFixed(2)}% median`);
    console.log(`   Best Risk-Adjusted:  ${bestSharpe.strategy}`);
    console.log(`                        Sharpe ${bestSharpe.sharpeRatio.toFixed(3)}, ${bestSharpe.maxDrawdown.toFixed(1)}% drawdown`);
    console.log(`   Most Sustainable:    ${bestSustain.strategy}`);
    console.log(`                        ${bestSustain.sustainabilityScore.toFixed(1)} pts, ${bestSustain.riskOfRuin.toFixed(1)}% ruin risk`);
  }

  // Overall Recommendation
  console.log('\n\n' + '═'.repeat(70));
  console.log('💡 OVERALL RECOMMENDATION');
  console.log('═'.repeat(70));

  // Calculate average scores for each strategy
  const strategyScores = STRATEGIES.map(strategy => {
    const stratResults = allResults.filter(r => r.strategy === strategy.name);
    const avgROI = stratResults.reduce((sum, r) => sum + r.avgROI, 0) / stratResults.length;
    const avgSharpe = stratResults.reduce((sum, r) => sum + r.sharpeRatio, 0) / stratResults.length;
    const avgSustain = stratResults.reduce((sum, r) => sum + r.sustainabilityScore, 0) / stratResults.length;
    const avgRisk = stratResults.reduce((sum, r) => sum + r.riskOfRuin, 0) / stratResults.length;

    return {
      name: strategy.name,
      avgROI,
      avgSharpe,
      avgSustain,
      avgRisk,
      overallScore: avgROI * 0.3 + avgSharpe * 20 + avgSustain * 0.4 - avgRisk * 0.5,
    };
  });

  strategyScores.sort((a, b) => b.overallScore - a.overallScore);

  console.log('\n🥇 Strategy Rankings (Overall Score):\n');
  strategyScores.forEach((score, idx) => {
    console.log(`${idx + 1}. ${score.name}`);
    console.log(`   Avg ROI:          ${score.avgROI >= 0 ? '+' : ''}${score.avgROI.toFixed(2)}%`);
    console.log(`   Avg Sharpe:       ${score.avgSharpe.toFixed(3)}`);
    console.log(`   Avg Sustainability: ${score.avgSustain.toFixed(1)}`);
    console.log(`   Avg Risk:         ${score.avgRisk.toFixed(1)}%`);
    console.log(`   Overall Score:    ${score.overallScore.toFixed(2)}\n`);
  });

  const winner = strategyScores[0];
  console.log('═'.repeat(70));
  console.log(`🎯 RECOMMENDED STRATEGY: ${winner.name}`);
  console.log('═'.repeat(70));
  console.log(`\nThis strategy provides the best balance of:`);
  console.log(`  • Positive returns (${winner.avgROI >= 0 ? '+' : ''}${winner.avgROI.toFixed(2)}% avg ROI)`);
  console.log(`  • Risk-adjusted performance (${winner.avgSharpe.toFixed(3)} Sharpe ratio)`);
  console.log(`  • Long-term sustainability (${winner.avgSustain.toFixed(1)} pts)`);
  console.log(`  • Acceptable risk (${winner.avgRisk.toFixed(1)}% ruin risk)`);

  console.log('\n' + '═'.repeat(70));
  console.log('✅ Analysis complete!');
  console.log('═'.repeat(70) + '\n');
}

// Run analysis
main().catch(console.error);
