/**
 * Check all claim transactions in the database
 */
import { getRecentTransactions, initializeDatabase, closeDatabase } from '../src/utils/database';

async function checkClaims() {
  await initializeDatabase();
  const txs = await getRecentTransactions(500);

  const claimOrbTxs = txs.filter((tx: any) =>
    tx.type === 'claim_orb' && tx.status === 'success'
  );

  const claimSolTxs = txs.filter((tx: any) =>
    tx.type === 'claim_sol' && tx.status === 'success'
  );

  console.log('\n=== ORB CLAIM TRANSACTIONS ===');
  console.log(`Total ORB claims: ${claimOrbTxs.length}\n`);

  let totalOrbClaimed = 0;
  claimOrbTxs.forEach((tx: any) => {
    const date = new Date(tx.timestamp).toISOString();
    const amount = tx.orb_amount || 0;
    totalOrbClaimed += amount;
    console.log(`${date}: ${amount.toFixed(4)} ORB (sig: ${tx.signature?.substring(0, 12)}...)`);
  });

  console.log(`\nTotal ORB from transactions: ${totalOrbClaimed.toFixed(4)} ORB`);

  console.log('\n=== SOL CLAIM TRANSACTIONS ===');
  console.log(`Total SOL claims: ${claimSolTxs.length}\n`);

  let totalSolClaimed = 0;
  claimSolTxs.forEach((tx: any) => {
    const date = new Date(tx.timestamp).toISOString();
    const amount = tx.sol_amount || 0;
    totalSolClaimed += amount;
    console.log(`${date}: ${amount.toFixed(4)} SOL (sig: ${tx.signature?.substring(0, 12)}...)`);
  });

  console.log(`\nTotal SOL from transactions: ${totalSolClaimed.toFixed(4)} SOL`);

  await closeDatabase();
  process.exit(0);
}

checkClaims().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
