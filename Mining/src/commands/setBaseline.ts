import { initializeDatabase, closeDatabase, setBaselineBalance, getBaselineBalance } from '../utils/database';
import { getWallet, getBalances } from '../utils/wallet';
import { fetchStake } from '../utils/accounts';
import { getOrbPrice } from '../utils/jupiter';
import logger, { ui } from '../utils/logger';

/**
 * Set baseline wallet balance for accurate PnL tracking
 * This should be run once before starting mining operations
 */
export async function setBaselineCommand(manualAmount?: number): Promise<void> {
  try {
    await initializeDatabase();

    ui.header('SET BASELINE WALLET BALANCE');
    ui.blank();

    // Check if baseline already exists
    const existing = await getBaselineBalance();
    if (existing > 0) {
      ui.warning(`Baseline already set to ${existing.toFixed(4)} SOL equivalent`);
      logger.info('');
      logger.info('To reset baseline, you must manually delete the baseline transaction from the database.');
      logger.info('Or use the reset-pnl script.');
      await closeDatabase();
      return;
    }

    let totalValue: number;
    let notes: string;

    if (manualAmount !== undefined) {
      // Use manually specified amount (assumed to be total portfolio value)
      totalValue = manualAmount;
      notes = `Manual baseline: ${totalValue.toFixed(4)} SOL equivalent`;
      ui.status('Manual Amount', `${totalValue.toFixed(4)} SOL equivalent`);
    } else {
      // Fetch current balances
      const wallet = getWallet();
      const balances = await getBalances(wallet.publicKey);

      // Fetch staked ORB
      const stake = await fetchStake(wallet.publicKey).catch(() => null);
      const stakedOrb = stake ? Number(stake.balance) / 1e9 : 0;

      // Get ORB price
      const orbPrice = await getOrbPrice().catch(() => ({ priceInSol: 0, priceInUsd: 0 }));

      // Calculate total portfolio value in SOL
      const totalOrb = balances.orb + stakedOrb;
      const orbValueInSol = totalOrb * orbPrice.priceInSol;
      totalValue = balances.sol + orbValueInSol;

      // Create detailed notes
      notes = `Initial portfolio: ${balances.sol.toFixed(4)} SOL + ${totalOrb.toFixed(4)} ORB @ ${orbPrice.priceInSol.toFixed(6)} = ${totalValue.toFixed(4)} SOL equivalent`;

      ui.status('Current SOL Balance', `${balances.sol.toFixed(4)} SOL`);
      ui.status('Current ORB Balance', `${totalOrb.toFixed(4)} ORB (${balances.orb.toFixed(4)} wallet + ${stakedOrb.toFixed(4)} staked)`);
      ui.status('ORB Price', `${orbPrice.priceInSol.toFixed(6)} SOL (${orbPrice.priceInUsd > 0 ? '$' + orbPrice.priceInUsd.toFixed(4) : 'N/A'})`);
      ui.status('ORB Value', `${orbValueInSol.toFixed(4)} SOL`);
      ui.blank();
      ui.status('Total Portfolio Value', `${totalValue.toFixed(4)} SOL equivalent`);
      logger.info('');
      logger.info('⚠️  This will set your STARTING portfolio value for PnL tracking.');
      logger.info('   Future profit/loss will be calculated from this baseline.');
      logger.info('   All SOL and ORB holdings are included in the baseline.');
      logger.info('');
      logger.info('💡 If you already started mining, manually specify the total value');
      logger.info('   from BEFORE you began mining operations.');
    }

    // Set baseline
    await setBaselineBalance(totalValue, notes);

    ui.blank();
    ui.success(`Baseline set to ${totalValue.toFixed(4)} SOL equivalent`);
    logger.info('');
    logger.info('✅ PnL tracking will now calculate true mining profit from this baseline.');
    logger.info('   Both SOL and ORB holdings are tracked at current market prices.');

    await closeDatabase();
  } catch (error) {
    logger.error('Failed to set baseline:', error);
    throw error;
  }
}
