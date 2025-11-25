# Comprehensive ORB Mining Strategy Analysis

## Overview

This advanced Monte Carlo simulation script analyzes different AUTO strategy configurations to find the optimal tier settings for long-term profitability.

## What It Tests

### 1. **Real ORB Mining Mechanics**
- Base reward: 4 ORB per round (distributed proportionally)
- Motherload: 1/625 chance to hit (distributed proportionally)
- Refining fee: 10% on all ORB rewards
- SOL return: 95% of deployment returned
- Competition impact on rewards

### 2. **Multiple Strategy Configurations**
- **CURRENT**: Your current AUTO strategy (extended to 1600+ ORB)
- **AGGRESSIVE**: Fewer rounds, larger bets (higher risk/reward)
- **ULTRA CONSERVATIVE**: Maximum rounds, smallest bets (lower risk)
- **KELLY OPTIMIZED**: Based on Kelly Criterion optimal bet sizing

### 3. **Performance Metrics**
- **Average ROI**: Mean return on investment
- **Median ROI**: Middle value (more stable than average)
- **Win Rate**: Percentage of motherload hits
- **Profitability**: % of simulation runs that end positive

### 4. **Risk Metrics**
- **Max Drawdown**: Worst peak-to-trough decline
- **Sharpe Ratio**: Risk-adjusted return measure
- **Sortino Ratio**: Downside-only risk measure
- **Risk of Ruin**: Probability of losing 80%+ of capital
- **Value at Risk**: 5th percentile worst-case ROI

### 5. **Sustainability Analysis**
- **Sustainability Score**: Weighted metric (profitability - risk)
- **Budget Depletion Rate**: How fast you burn through budget
- **Average Rounds Played**: Longevity of strategy

### 6. **Statistical Analysis**
- **Standard Deviation**: Measure of ROI volatility
- **Skewness**: Distribution asymmetry
- **Percentiles**: 10th and 90th percentile outcomes

### 7. **Kelly Criterion Optimization**
- Calculates mathematically optimal bet sizing
- Maximizes long-term growth rate
- Accounts for win probability and payoff ratios

## How to Run

```bash
# Run the comprehensive analysis
npx ts-node scripts/comprehensive-strategy-analysis.ts
```

## What to Look For in Results

### 1. **Best Overall Strategy**
The script will rank all strategies by an overall score that balances:
- Returns (30% weight)
- Risk-adjusted performance (40% weight via Sharpe ratio)
- Sustainability (40% weight)
- Risk mitigation (negative weight for risk of ruin)

### 2. **Motherload-Specific Recommendations**
For each motherload level (100-1600 ORB), you'll see:
- **Highest ROI**: Best raw returns
- **Best Risk-Adjusted**: Best Sharpe ratio
- **Most Sustainable**: Best long-term viability

### 3. **Kelly Criterion Guidance**
Shows the mathematically optimal percentage of your budget to bet at each motherload level.

## Interpreting the Metrics

### Sharpe Ratio
- **> 1.0**: Good risk-adjusted returns
- **> 2.0**: Excellent risk-adjusted returns
- **< 0.5**: Poor risk-adjusted returns

### Risk of Ruin
- **< 5%**: Very safe
- **5-15%**: Acceptable risk
- **> 15%**: High risk

### Sustainability Score
- **> 50**: Excellent long-term viability
- **30-50**: Good
- **< 30**: Poor sustainability

## Customization

You can modify the script to test:

1. **Different Competition Levels**
   ```typescript
   competitionMultiplier: 10, // Change from 15 to 10
   ```

2. **Different ORB Prices**
   ```typescript
   orbPriceInSol: 0.20, // Test at higher ORB price
   ```

3. **Different Budgets**
   ```typescript
   initialBudget: 2.0, // Test with 2 SOL
   ```

4. **Your Own Strategy**
   Add a new strategy to the `STRATEGIES` array with custom tiers.

## Expected Runtime

- **5,000 simulations × 11 motherload levels × 4 strategies** = ~220,000 simulation runs
- Runtime: **2-5 minutes** depending on your CPU

## What Makes a Good Strategy?

The best strategy should have:
1. **Positive average ROI** across all motherload levels
2. **High Sharpe ratio** (>1.5) for risk-adjusted returns
3. **Low risk of ruin** (<10%)
4. **High sustainability score** (>40)
5. **Consistent profitability** (>60% of runs end positive)

## Key Insights

Based on ORB mining mechanics:

1. **Lower motherload = Higher bets should be used**
   - Less competition at low motherload
   - Higher probability of winning
   - Deploy more aggressively

2. **Higher motherload = Smaller bets**
   - More competition at high motherload
   - Lower probability of winning per round
   - Deploy conservatively to survive longer

3. **Optimal strategy varies with competition**
   - High competition (20x+): Ultra conservative
   - Medium competition (10-15x): Balanced (current)
   - Low competition (<10x): Aggressive

4. **Kelly Criterion provides mathematical optimum**
   - But often too aggressive for risk-averse miners
   - Using 50% of Kelly is usually safer (Half-Kelly)

## Next Steps

After running the analysis:

1. **Review the recommended strategy**
2. **Check if it aligns with your risk tolerance**
3. **Update the DEFAULT_AUTO_TIERS in src/utils/strategies.ts** if needed
4. **Re-run with different competition/price parameters** to stress-test
5. **Monitor real-world performance** and adjust tiers based on actual results

## Notes

- Simulations assume **constant competition** (not dynamic)
- Real-world competition varies by time of day, motherload level, etc.
- ORB price volatility not modeled (uses fixed price)
- Transaction fees not included in simulation
- Results are probabilistic - actual performance will vary
