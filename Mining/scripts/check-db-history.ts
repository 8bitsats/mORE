/**
 * Check when database tracking started
 */
import { getRecentTransactions, initializeDatabase, closeDatabase } from '../src/utils/database';

async function checkHistory() {
  await initializeDatabase();

  const allTxs = await getRecentTransactions(1000);

  if (allTxs.length === 0) {
    console.log('No transactions in database');
    await closeDatabase();
    process.exit(0);
  }

  // Sort by timestamp (oldest first)
  const sorted = allTxs.sort((a: any, b: any) => a.timestamp - b.timestamp);

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  console.log('\n=== DATABASE HISTORY ===\n');
  console.log(`Oldest transaction: ${new Date(oldest.timestamp).toISOString()}`);
  console.log(`  Type: ${oldest.type}`);
  console.log(`  Status: ${oldest.status}`);

  console.log(`\nNewest transaction: ${new Date(newest.timestamp).toISOString()}`);
  console.log(`  Type: ${newest.type}`);
  console.log(`  Status: ${newest.status}`);

  console.log(`\nTotal transactions: ${allTxs.length}`);

  // Count by type
  const typeCount: { [key: string]: number } = {};
  allTxs.forEach((tx: any) => {
    typeCount[tx.type] = (typeCount[tx.type] || 0) + 1;
  });

  console.log('\nTransactions by type:');
  Object.entries(typeCount).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  await closeDatabase();
  process.exit(0);
}

checkHistory().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
