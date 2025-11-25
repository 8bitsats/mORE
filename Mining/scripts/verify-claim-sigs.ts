/**
 * Verify if the claim transaction signatures in the database are real
 */
import { getRecentTransactions, initializeDatabase, closeDatabase } from '../src/utils/database';
import { getConnection } from '../src/utils/solana';

async function verifyClaims() {
  await initializeDatabase();
  const connection = getConnection();

  const txs = await getRecentTransactions(500);
  const claimOrbTxs = txs.filter((tx: any) =>
    tx.type === 'claim_orb' && tx.status === 'success'
  );

  console.log('\n=== VERIFYING CLAIM TRANSACTIONS ===\n');

  for (const tx of claimOrbTxs) {
    const date = new Date(tx.timestamp).toISOString();
    const amount = tx.orb_amount || 0;
    const sig = tx.signature;

    console.log(`\n${date}: ${amount.toFixed(4)} ORB`);
    console.log(`Signature: ${sig}`);

    if (sig) {
      try {
        const txInfo = await connection.getParsedTransaction(sig, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });

        if (txInfo) {
          console.log(`✅ Transaction exists on-chain`);
          console.log(`   Block time: ${txInfo.blockTime ? new Date(txInfo.blockTime * 1000).toISOString() : 'unknown'}`);
          console.log(`   Status: ${txInfo.meta?.err ? 'FAILED' : 'SUCCESS'}`);
        } else {
          console.log(`❌ Transaction NOT found on-chain`);
        }
      } catch (err) {
        console.log(`❌ Error fetching transaction: ${err}`);
      }
    } else {
      console.log(`⚠️  No signature recorded`);
    }
  }

  await closeDatabase();
  process.exit(0);
}

verifyClaims().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
