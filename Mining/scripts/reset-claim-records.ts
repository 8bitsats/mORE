/**
 * Reset incorrect claim records in the database
 * This removes all claim_orb and claim_sol transactions from the database
 * while keeping deployment, swap, and other transaction records intact
 */
import { initializeDatabase, closeDatabase } from '../src/utils/database';
import sqlite3 from 'sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'orb_mining.db');

async function resetClaimRecords() {
  console.log('\n🔧 Resetting claim records...\n');

  await initializeDatabase();

  const db = new sqlite3.Database(DB_PATH);

  // Get count of claim records before deletion
  const beforeCount = await new Promise<number>((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as count FROM transactions WHERE type IN ('claim_orb', 'claim_sol')",
      (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });

  console.log(`Found ${beforeCount} claim transactions to remove`);

  // Delete claim records
  await new Promise<void>((resolve, reject) => {
    db.run(
      "DELETE FROM transactions WHERE type IN ('claim_orb', 'claim_sol')",
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Get count after deletion
  const afterCount = await new Promise<number>((resolve, reject) => {
    db.get(
      "SELECT COUNT(*) as count FROM transactions WHERE type IN ('claim_orb', 'claim_sol')",
      (err, row: any) => {
        if (err) reject(err);
        else resolve(row.count);
      }
    );
  });

  console.log(`\n✅ Deleted ${beforeCount - afterCount} claim records`);
  console.log(`Remaining claim records: ${afterCount}`);

  // Show remaining transaction counts
  const remainingCounts = await new Promise<any[]>((resolve, reject) => {
    db.all(
      "SELECT type, COUNT(*) as count FROM transactions GROUP BY type ORDER BY count DESC",
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  console.log('\n📊 Remaining transactions by type:');
  remainingCounts.forEach((row: any) => {
    console.log(`  ${row.type}: ${row.count}`);
  });

  db.close();
  await closeDatabase();

  console.log('\n✅ Claim records reset complete!');
  console.log('The bot will now track only actual claimed amounts going forward.\n');

  process.exit(0);
}

resetClaimRecords().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
