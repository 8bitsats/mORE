# Test Scripts

Individual test scripts for each bot action. These scripts directly call the command functions without needing to modify the `.env` file.

## Available Tests

### Core Bot Commands

- **test-query.ts** - Check wallet balances, claimable rewards, round info, and ORB price
- **test-deploy.ts** - Deploy SOL to all 25 squares once (manual single deploy)
- **test-auto-deploy.ts** - Start the autominer (bot-managed continuous deployment)
- **test-setup-automation.ts** - Setup on-chain automation (basic contract-managed)
- **test-setup-smart-automation.ts** - Setup smart automation (dynamic budget allocation) ⭐ RECOMMENDED
- **test-stake.ts** - Stake ORB tokens for yield
- **test-swap.ts** - Swap ORB to SOL via Jupiter

#### Deployment Methods Explained

There are **three ways** to automate ORB mining:

1. **Bot-Managed (test-auto-deploy.ts)** - Flexible but requires bot running
   - Bot monitors rounds and sends deploy transactions
   - Requires bot to be running continuously
   - More flexible (auto-claim, auto-swap features)
   - Uses manual deploy instruction each round

2. **Contract-Managed (test-setup-automation.ts)** - Basic on-chain automation
   - Uses ORB's built-in automate instruction
   - Creates an automation account with pre-funded SOL
   - Contract automatically deploys each round
   - No bot needed to be running!
   - Requires executor to trigger (can be self)

3. **Smart Contract-Managed (test-setup-smart-automation.ts)** ⭐ RECOMMENDED
   - Same as contract-managed, but with intelligent budget allocation
   - Uses 90% of SOL balance
   - Adjusts deployment per motherload:
     - 600+ ORB motherload → 40 rounds (aggressive, high EV)
     - 400-599 ORB → 50-60 rounds (moderate)
     - <400 ORB → 70-100 rounds (conservative)
   - Optimizes expected value based on reward pool size
   - Deploys to all 25 squares each round

### Automation Management

- **test-close-automation.ts** - Stop automation and recover remaining SOL

### Claiming Rewards

- **test-claim.ts** - Claim SOL/ORB rewards (uses .env CLAIM_TYPE configuration)
- **test-claim-mining-sol.ts** - Claim ONLY SOL from mining rewards
- **test-claim-mining-orb.ts** - Claim ONLY ORB from mining rewards

### Debug/Analysis Scripts

- **debug-stake-account.ts** - Inspect raw stake account data structure
- **find-stake-claim-tx.ts** - Find recent stake claim transactions
- **analyze-automate-instruction.ts** - Analyze automation account and transactions

## How to Run

### Individual Tests

Run any test directly with ts-node:

```bash
# Check what you have claimable
npx ts-node tests/test-query.ts

# Deploy once
npx ts-node tests/test-deploy.ts

# Start the autominer - bot managed (runs continuously)
npx ts-node tests/test-auto-deploy.ts

# Setup on-chain automation - basic (one-time setup)
npx ts-node tests/test-setup-automation.ts

# Setup SMART automation - dynamic allocation (RECOMMENDED)
npx ts-node tests/test-setup-smart-automation.ts

# Close automation and recover SOL
npx ts-node tests/test-close-automation.ts

# Claim rewards (uses CLAIM_TYPE from .env)
npx ts-node tests/test-claim.ts

# Claim ONLY SOL from mining
npx ts-node tests/test-claim-mining-sol.ts

# Claim ONLY ORB from mining
npx ts-node tests/test-claim-mining-orb.ts

# Stake ORB
npx ts-node tests/test-stake.ts

# Swap ORB to SOL
npx ts-node tests/test-swap.ts

# Debug stake account structure
npx ts-node tests/debug-stake-account.ts

# Find stake claim transactions
npx ts-node tests/find-stake-claim-tx.ts
```

### Using npm scripts

You can also add these to your `package.json` scripts section for easier access:

```json
"scripts": {
  "test:query": "ts-node tests/test-query.ts",
  "test:deploy": "ts-node tests/test-deploy.ts",
  "test:claim": "ts-node tests/test-claim.ts",
  "test:stake": "ts-node tests/test-stake.ts",
  "test:swap": "ts-node tests/test-swap.ts"
}
```

Then run with:

```bash
npm run test:query
npm run test:claim
# etc.
```

## Notes

- All tests use the same configuration from `.env` (wallet, RPC endpoint, etc.)
- Settings like `DRY_RUN`, `SOL_PER_DEPLOYMENT`, `CLAIM_TYPE`, etc. are respected
- For the main automation loop, use `BOT_ACTION=auto-deploy` in `.env` and run `npm start`
