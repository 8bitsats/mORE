# PnL Tracking Tools

These scripts help you manage and troubleshoot PnL (Profit and Loss) tracking for your ORB mining bot.

## Common Issues

PnL tracking can become inaccurate when:
- Bot is manually started/stopped during operations
- Automation accounts are manually created/closed outside the bot
- Database file is corrupted or deleted
- Manual transactions (claims, swaps) are performed without bot knowledge

## Available Tools

### 1. Reconcile PnL (`reconcile-pnl.ts`)

**What it does:** Audits your database against on-chain state to identify discrepancies

**When to use:**
- PnL numbers seem wrong or inconsistent
- Want to verify tracking accuracy
- After manually interacting with automation account

**How to run:**
```bash
npx ts-node scripts/reconcile-pnl.ts
```

**What it checks:**
- Compares database records with on-chain balances
- Identifies missing or duplicate transaction records
- Detects automation account issues
- Calculates expected vs actual PnL
- Provides recommendations for fixes

**Example output:**
```
🔍 Starting PnL Reconciliation...

📊 Reading database state...
Database State:
  Capital Deployed: 28.3751 SOL (3 setups)
  Claimed SOL: 2.1234 SOL
  Swapped: 5.6789 ORB → 0.0653 SOL

⛓️  Reading on-chain state...
On-Chain State:
  Automation Balance: 14.1803 SOL
  Claimable SOL: 0.0322 SOL

📈 Calculated PnL:
  Net PnL: ❌ -14.1295 SOL (-49.8% ROI)

🔍 Discrepancies Found:
  ⚠️  3 setups but only 1 close - possible missing close records

💡 Recommendations:
  1. If you manually closed automation accounts, those closes weren't recorded
  2. Consider resetting database with fresh baseline
```

---

### 2. Reset PnL (`reset-pnl.ts`)

**What it does:** Deletes all historical PnL data and optionally starts fresh with current state

**When to use:**
- Database is corrupted beyond repair
- Want to start tracking from scratch
- Previous tracking is too messy to salvage

**How to run:**
```bash
npx ts-node scripts/reset-pnl.ts
```

**⚠️ WARNING:** This deletes ALL transaction history! A backup is created automatically.

**What it does:**
1. Creates backup of current database in `data/backups/`
2. Deletes the database file
3. Asks if you want to record current automation balance as starting capital
4. Initializes fresh database

**Interactive prompts:**
```
Are you sure you want to reset PnL tracking? (yes/no): yes
This will DELETE ALL transaction history. Continue? (yes/no): yes

📦 Creating backup...
✅ Backup saved to: data/backups/orb_mining_2025-11-19T12-30-45.db

🗑️  Deleting database...
✅ Database deleted

📊 Checking current on-chain state...
Current State:
  Automation Balance: 14.1803 SOL

💡 You have an active automation account with funds.
Record current automation balance as starting capital? (yes/no): yes

✅ Recorded 14.1803 SOL as starting capital
📈 Future PnL will be calculated from this baseline
```

**Best practice:** Record current automation balance as starting capital to maintain accurate future tracking.

---

### 3. State Persistence (Automatic)

**What it does:** Automatically saves and restores bot session state across restarts

**File location:** `data/bot-state.json`

**What's saved:**
- `setupMotherload`: Motherload amount when automation was created (used for dynamic scaling)
- `setupTimestamp`: When automation was created
- `setupRoundId`: Round when automation was created
- `notes`: Context about the setup

**When it's used:**
- **Saved:** When automation account is created
- **Loaded:** On bot startup
- **Cleared:** When automation account is closed

**Example state file:**
```json
{
  "setupMotherload": 350.5,
  "setupTimestamp": 1700000000000,
  "setupRoundId": 12345,
  "notes": "Setup with 80 rounds @ 0.0125 SOL/round"
}
```

**Why it matters:** The bot uses `setupMotherload` to detect when motherload has changed significantly (±40-50%) to trigger automatic restart with optimized amounts. Without persistence, this tracking would be lost on bot restart.

---

### 4. Startup Reconciliation Check (Automatic)

**What it does:** Automatically checks PnL health when bot starts

**When warnings appear:**

**Warning 1: Unrecorded Automation**
```
⚠️  PnL Tracking Warning:
   Automation account has 14.1803 SOL but no setup recorded in database
   This usually means the database was reset or corrupted.
   Run: npx ts-node scripts/reconcile-pnl.ts to investigate
```
**Cause:** You have an automation account but database shows no setups
**Fix:** Run reconciliation tool or reset with current balance as baseline

**Warning 2: Large Loss Detected**
```
⚠️  Large PnL Loss Detected:
   Net PnL: -14.1295 SOL (-49.8% loss)
   This may indicate tracking issues from manual operations.
   Run: npx ts-node scripts/reconcile-pnl.ts to audit
   Or reset: npx ts-node scripts/reset-pnl.ts
```
**Cause:** Significant negative PnL (>30% loss) which may indicate tracking errors
**Fix:** Run reconciliation to diagnose, or reset to start fresh

---

## Recommended Workflow

### When PnL looks wrong:

1. **First, investigate:**
   ```bash
   npx ts-node scripts/reconcile-pnl.ts
   ```
   Review the discrepancies and recommendations.

2. **If minor issues (missing records):**
   - Note the issues from reconciliation
   - Decide if the inaccuracy is acceptable
   - Continue using bot (future tracking will be accurate)

3. **If major issues (corrupted database):**
   ```bash
   npx ts-node scripts/reset-pnl.ts
   ```
   Choose to record current automation balance as starting capital.

4. **After reset:**
   - Run bot normally: `npm start`
   - PnL will track accurately from the new baseline
   - Old data is backed up in `data/backups/`

---

## Files Created/Modified

### New Files:
- `scripts/reconcile-pnl.ts` - Reconciliation tool
- `scripts/reset-pnl.ts` - Reset tool
- `src/utils/state.ts` - State persistence utilities
- `data/bot-state.json` - Session state (auto-created)
- `data/backups/*.db` - Database backups (created by reset tool)

### Modified Files:
- `src/commands/smartBot.ts`:
  - Loads/saves state on automation create/close
  - Startup reconciliation check
  - setupMotherload now persists across restarts

---

## Understanding PnL Calculation

**Capital Deployed** = Sum of all `automation_setup` transactions
- Only counts initial deposits to automation account
- Does NOT count individual round deployments (those spend from automation)

**Current Value** = Claimed SOL + Swapped SOL + Automation Balance + Pending Claims
- All SOL you've received back or still have invested

**Net PnL** = Current Value - Capital Deployed
- Positive = Profit
- Negative = Loss

**Why tracking can break:**
- Manual automation setup → Not recorded in database → Capital deployed is wrong
- Manual close → Returned SOL not recorded → Current value is wrong
- Manual claims/swaps → Not recorded → Current value is wrong
- Database deleted → All history lost → Everything is wrong

**Solution:** These tools help detect and fix tracking issues!

---

## Advanced: Manual Database Inspection

If you want to manually inspect the database:

```bash
# Install sqlite3 if not already installed
npm install -g sqlite3

# Open database
sqlite3 data/orb_mining.db

# View all automation setups
SELECT * FROM transactions WHERE type = 'automation_setup';

# View all automation closes
SELECT * FROM transactions WHERE type = 'automation_close';

# Calculate total deployed
SELECT SUM(sol_amount) FROM transactions WHERE type = 'automation_setup' AND status = 'success';

# Calculate total claimed
SELECT SUM(sol_amount) FROM transactions WHERE type = 'claim_sol' AND status = 'success';

# Exit
.quit
```

---

## Prevention: Best Practices

To avoid PnL tracking issues:

1. ✅ **Let the bot manage automation accounts**
   - Don't manually create/close automation accounts
   - If you must, run reconciliation afterward

2. ✅ **Use bot commands for all operations**
   - Claims: Let auto-claim handle it
   - Swaps: Let auto-swap handle it
   - Stakes: Let auto-stake handle it

3. ✅ **Don't delete the database**
   - File: `data/orb_mining.db`
   - Contains all historical tracking
   - If corrupted, use reset tool (creates backup)

4. ✅ **Check startup warnings**
   - Bot now warns on startup if tracking looks wrong
   - Address warnings before running long-term

5. ✅ **Periodic reconciliation**
   - Run reconcile tool weekly to catch issues early
   - Especially after any manual interventions

---

## Need Help?

If you're still having issues:

1. Run reconciliation with full output:
   ```bash
   npx ts-node scripts/reconcile-pnl.ts > pnl-audit.txt
   ```

2. Check logs:
   ```bash
   tail -100 logs/combined.log
   tail -50 logs/error.log
   ```

3. Export transaction history:
   ```bash
   sqlite3 data/orb_mining.db "SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 50;" > recent-txs.txt
   ```

4. Share these files for debugging
