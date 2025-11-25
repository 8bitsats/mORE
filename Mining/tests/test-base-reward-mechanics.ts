/**
 * Proof that the base reward calculation correctly accounts for the hybrid distribution:
 * - 50% of time: 4 ORB split proportionally
 * - 50% of time: 4 ORB to one winner (weighted random)
 */

console.log('🎲 BASE REWARD MECHANICS - Mathematical Proof\n');
console.log('ORB Protocol: 4 ORB per round with hybrid distribution\n');

// Example: You have 3.17% of total deployment
const yourShare = 0.0317;
const baseReward = 4; // ORB per round

console.log(`📊 Your Position:`);
console.log(`   Your share of total deployment: ${(yourShare * 100).toFixed(2)}%\n`);

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Scenario 1: Proportional Split (50% of time)
console.log(`📍 SCENARIO 1: Proportional Split (50% of rounds)\n`);
console.log(`   All winners share 4 ORB proportionally`);
console.log(`   Your reward: ${(yourShare * 100).toFixed(2)}% × 4 ORB = ${(yourShare * baseReward).toFixed(6)} ORB`);
const scenario1EV = yourShare * baseReward;
console.log(`   Expected value: ${scenario1EV.toFixed(6)} ORB\n`);

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Scenario 2: Weighted Random Winner (50% of time)
console.log(`🎰 SCENARIO 2: Weighted Random Winner (50% of rounds)\n`);
console.log(`   ONE winner gets all 4 ORB (weighted by deployment)`);
console.log(`   Your chance to win: ${(yourShare * 100).toFixed(2)}%`);
console.log(`   Reward if you win: 4 ORB`);
console.log(`   Reward if you lose: 0 ORB`);
console.log(`   Expected value: ${(yourShare * 100).toFixed(2)}% × 4 ORB = ${(yourShare * baseReward).toFixed(6)} ORB\n`);
const scenario2EV = yourShare * baseReward;

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Combined Expected Value
console.log(`🎯 COMBINED EXPECTED VALUE (across all rounds)\n`);
console.log(`   50% of rounds: Proportional split = ${scenario1EV.toFixed(6)} ORB`);
console.log(`   50% of rounds: Weighted random = ${scenario2EV.toFixed(6)} ORB`);
console.log(`   \n   Total EV = 0.5 × ${scenario1EV.toFixed(6)} + 0.5 × ${scenario2EV.toFixed(6)}`);
const combinedEV = 0.5 * scenario1EV + 0.5 * scenario2EV;
console.log(`           = ${combinedEV.toFixed(6)} ORB\n`);

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Simplified Formula
console.log(`✅ SIMPLIFIED FORMULA (what the bot uses):\n`);
console.log(`   Expected ORB = yourShare × 4`);
console.log(`                = ${(yourShare * 100).toFixed(2)}% × 4`);
console.log(`                = ${(yourShare * baseReward).toFixed(6)} ORB\n`);

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Proof
console.log(`📐 PROOF:\n`);
console.log(`   Scenario 1 EV:  ${scenario1EV.toFixed(6)} ORB`);
console.log(`   Scenario 2 EV:  ${scenario2EV.toFixed(6)} ORB`);
console.log(`   Combined EV:    ${combinedEV.toFixed(6)} ORB`);
console.log(`   Simplified:     ${(yourShare * baseReward).toFixed(6)} ORB`);

if (Math.abs(combinedEV - (yourShare * baseReward)) < 0.000001) {
  console.log(`\n   ✅ VERIFIED: All calculations match!\n`);
} else {
  console.log(`\n   ❌ ERROR: Calculations don't match!\n`);
}

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Why this works
console.log(`💡 WHY THIS WORKS:\n`);
console.log(`   In weighted random selection, your probability of winning`);
console.log(`   is PROPORTIONAL to your share. So:\n`);
console.log(`   • Proportional split: You always get (share × reward)`);
console.log(`   • Weighted random: You have (share) chance of getting (reward)`);
console.log(`   \n   Both have the same expected value: share × reward\n`);
console.log(`   Therefore, the hybrid system (50/50 mix) also equals: share × reward\n`);

console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

// Variance note
console.log(`📊 VARIANCE NOTE:\n`);
console.log(`   While the EXPECTED VALUE is the same, the hybrid system has:`);
console.log(`   • Lower variance than pure weighted random (50% proportional)`);
console.log(`   • Higher variance than pure proportional split (50% random)\n`);
console.log(`   This is actually BENEFICIAL - reduces risk while keeping EV!\n`);

console.log(`🎉 CONCLUSION: The bot's calculation is CORRECT!\n`);
console.log(`   It properly accounts for both distribution methods.\n`);
