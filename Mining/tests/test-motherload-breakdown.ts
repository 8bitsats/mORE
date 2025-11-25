import { fetchBoard, fetchRound, fetchTreasury } from '../src/utils/accounts';
import { getOrbPrice } from '../src/utils/jupiter';

/**
 * Detailed breakdown showing how MOTHERLOAD affects Expected Value
 */
async function testMotherloadBreakdown() {
  console.log('💎 MOTHERLOAD IMPACT ON EXPECTED VALUE\n');
  console.log('This shows exactly how motherload is factored into profitability\n');

  // Get current data
  const board = await fetchBoard();
  const currentRound = await fetchRound(board.roundId);
  const treasury = await fetchTreasury();
  const { priceInSol } = await getOrbPrice();

  const motherloadOrb = Number(treasury.motherlode) / 1e9;
  const totalDeployedSol = Number(currentRound.totalDeployed) / 1e9;
  const yourDeploymentPerRound = 0.1828; // SOL

  console.log(`📊 Current Round Data:`);
  console.log(`   Round: ${board.roundId.toString()}`);
  console.log(`   Motherload: ${motherloadOrb.toFixed(2)} ORB`);
  console.log(`   Total Deployed: ${totalDeployedSol.toFixed(4)} SOL`);
  console.log(`   ORB Price: ${priceInSol.toFixed(6)} SOL\n`);

  // Calculate your share
  const yourShareOfTotal = yourDeploymentPerRound / (totalDeployedSol + yourDeploymentPerRound);

  console.log(`🎯 Your Position:`);
  console.log(`   Your Deployment: ${yourDeploymentPerRound.toFixed(4)} SOL`);
  console.log(`   Your Share: ${(yourShareOfTotal * 100).toFixed(2)}%\n`);

  // DETAILED BREAKDOWN
  console.log(`💰 Expected Value Calculation:\n`);

  // 1. Base reward
  const baseRewardOrb = yourShareOfTotal * 4;
  const baseRewardSol = baseRewardOrb * priceInSol;
  console.log(`1️⃣  BASE REWARD (4 ORB per round):`);
  console.log(`    Your share (${(yourShareOfTotal * 100).toFixed(2)}%) × 4 ORB = ${baseRewardOrb.toFixed(6)} ORB`);
  console.log(`    Value: ${baseRewardOrb.toFixed(6)} × ${priceInSol.toFixed(6)} = ${baseRewardSol.toFixed(6)} SOL\n`);

  // 2. Motherload reward
  const motherloadChance = 1 / 625;
  const motherloadRewardOrb = motherloadChance * yourShareOfTotal * motherloadOrb;
  const motherloadRewardSol = motherloadRewardOrb * priceInSol;
  console.log(`2️⃣  MOTHERLOAD REWARD (${motherloadOrb.toFixed(2)} ORB vault, 1/625 chance):`);
  console.log(`    Chance to hit: ${(motherloadChance * 100).toFixed(2)}% (1 in 625)`);
  console.log(`    Your share IF hit: ${(yourShareOfTotal * 100).toFixed(2)}% of ${motherloadOrb.toFixed(2)} ORB`);
  console.log(`    Expected: ${motherloadChance.toFixed(6)} × ${yourShareOfTotal.toFixed(6)} × ${motherloadOrb.toFixed(2)} = ${motherloadRewardOrb.toFixed(6)} ORB`);
  console.log(`    Value: ${motherloadRewardOrb.toFixed(6)} × ${priceInSol.toFixed(6)} = ${motherloadRewardSol.toFixed(6)} SOL\n`);

  // 3. Total ORB before refining
  const totalOrbBeforeRefining = baseRewardOrb + motherloadRewardOrb;
  console.log(`3️⃣  TOTAL ORB (before refining fee):`);
  console.log(`    ${baseRewardOrb.toFixed(6)} + ${motherloadRewardOrb.toFixed(6)} = ${totalOrbBeforeRefining.toFixed(6)} ORB\n`);

  // 4. After refining fee
  const totalOrbAfterRefining = totalOrbBeforeRefining * 0.9;
  const totalOrbValueSol = totalOrbAfterRefining * priceInSol;
  console.log(`4️⃣  AFTER 10% REFINING FEE:`);
  console.log(`    ${totalOrbBeforeRefining.toFixed(6)} × 0.9 = ${totalOrbAfterRefining.toFixed(6)} ORB`);
  console.log(`    Value: ${totalOrbAfterRefining.toFixed(6)} × ${priceInSol.toFixed(6)} = ${totalOrbValueSol.toFixed(6)} SOL\n`);

  // 5. Expected SOL back
  const expectedSolBack = yourDeploymentPerRound * 0.95;
  console.log(`5️⃣  EXPECTED SOL BACK (95% of deployment):`);
  console.log(`    ${yourDeploymentPerRound.toFixed(6)} × 0.95 = ${expectedSolBack.toFixed(6)} SOL\n`);

  // 6. Total returns
  const totalReturns = totalOrbValueSol + expectedSolBack;
  console.log(`6️⃣  TOTAL EXPECTED RETURNS:`);
  console.log(`    ORB Value: ${totalOrbValueSol.toFixed(6)} SOL`);
  console.log(`    SOL Back:  ${expectedSolBack.toFixed(6)} SOL`);
  console.log(`    TOTAL:     ${totalReturns.toFixed(6)} SOL\n`);

  // 7. Expected Value
  const expectedValue = totalReturns - yourDeploymentPerRound;
  const roi = (expectedValue / yourDeploymentPerRound) * 100;
  console.log(`7️⃣  EXPECTED VALUE (EV):`);
  console.log(`    Returns - Cost = ${totalReturns.toFixed(6)} - ${yourDeploymentPerRound.toFixed(6)}`);
  console.log(`    EV = ${expectedValue >= 0 ? '+' : ''}${expectedValue.toFixed(6)} SOL`);
  console.log(`    ROI = ${roi.toFixed(2)}%\n`);

  // Show motherload contribution
  const motherloadContribution = (motherloadRewardSol / totalOrbValueSol) * 100;
  console.log(`📊 MOTHERLOAD CONTRIBUTION:`);
  console.log(`    Motherload adds: ${motherloadRewardSol.toFixed(6)} SOL to expected ORB value`);
  console.log(`    This is ${motherloadContribution.toFixed(1)}% of total ORB expected value`);
  console.log(`    Without motherload, EV would be: ${(expectedValue - (motherloadRewardSol * 0.9)).toFixed(6)} SOL\n`);

  if (expectedValue >= 0) {
    console.log(`✅ PROFITABLE - Motherload makes it ${motherloadContribution.toFixed(1)}% more valuable!\n`);
  } else {
    console.log(`❌ UNPROFITABLE even with motherload factored in\n`);
  }

  // Scenario comparison
  console.log(`🔬 SCENARIO COMPARISON:\n`);

  const scenarios = [
    { motherload: 100, label: "Low motherload (100 ORB)" },
    { motherload: motherloadOrb, label: `Current motherload (${motherloadOrb.toFixed(0)} ORB)` },
    { motherload: 1500, label: "High motherload (1500 ORB)" },
  ];

  for (const scenario of scenarios) {
    const mlReward = motherloadChance * yourShareOfTotal * scenario.motherload;
    const totalOrb = (baseRewardOrb + mlReward) * 0.9;
    const totalValue = (totalOrb * priceInSol) + expectedSolBack;
    const ev = totalValue - yourDeploymentPerRound;

    console.log(`   ${scenario.label}:`);
    console.log(`      Expected ORB: ${totalOrb.toFixed(6)} ORB`);
    console.log(`      EV: ${ev >= 0 ? '+' : ''}${ev.toFixed(6)} SOL`);
    console.log(`      ROI: ${((ev / yourDeploymentPerRound) * 100).toFixed(2)}%\n`);
  }

  console.log(`💡 Key Insight: Larger motherload = higher expected value!\n`);
}

testMotherloadBreakdown().catch(console.error);
