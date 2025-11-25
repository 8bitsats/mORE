/**
 * Check actual ORB amounts claimed in each transaction
 */
import { getRecentTransactions, initializeDatabase, closeDatabase } from '../src/utils/database';
import { getConnection } from '../src/utils/solana';
import { getWallet } from '../src/utils/wallet';
import { config } from '../src/utils/config';

async function checkClaimAmounts() {
  await initializeDatabase();
  const connection = getConnection();
  const wallet = getWallet();

  const txs = await getRecentTransactions(500);
  const claimOrbTxs = txs.filter((tx: any) =>
    tx.type === 'claim_orb' && tx.status === 'success'
  );

  console.log('\n=== CHECKING ACTUAL CLAIM AMOUNTS ===\n');

  let totalDbAmount = 0;
  let totalActualAmount = 0;

  for (const tx of claimOrbTxs) {
    const date = new Date(tx.timestamp).toISOString();
    const dbAmount = tx.orb_amount || 0;
    totalDbAmount += dbAmount;

    console.log(`\n${date}`);
    console.log(`Database recorded: ${dbAmount.toFixed(4)} ORB`);
    console.log(`Signature: ${tx.signature?.substring(0, 16)}...`);

    if (tx.signature) {
      try {
        const txInfo = await connection.getParsedTransaction(tx.signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });

        if (txInfo && txInfo.meta) {
          // Find token balance changes
          const preBalances = txInfo.meta.preTokenBalances || [];
          const postBalances = txInfo.meta.postTokenBalances || [];

          // Find our wallet's ORB token balance change
          const walletStr = wallet.publicKey.toString();
          const orbMintStr = config.orbTokenMint;

          const preBalance = preBalances.find((b: any) =>
            b.owner === walletStr && b.mint === orbMintStr
          );
          const postBalance = postBalances.find((b: any) =>
            b.owner === walletStr && b.mint === orbMintStr
          );

          if (preBalance && postBalance) {
            const preAmount = Number(preBalance.uiTokenAmount.uiAmount || 0);
            const postAmount = Number(postBalance.uiTokenAmount.uiAmount || 0);
            const actualClaimed = postAmount - preAmount;
            totalActualAmount += actualClaimed;

            console.log(`On-chain actual: ${actualClaimed.toFixed(4)} ORB`);
            if (Math.abs(actualClaimed - dbAmount) > 0.001) {
              console.log(`❌ MISMATCH! Difference: ${(actualClaimed - dbAmount).toFixed(4)} ORB`);
            } else {
              console.log(`✅ Amounts match`);
            }
          } else {
            console.log(`⚠️  Could not find token balance change`);
          }
        }
      } catch (err) {
        console.log(`❌ Error fetching transaction: ${err}`);
      }
    }
  }

  console.log(`\n==================`);
  console.log(`Database total: ${totalDbAmount.toFixed(4)} ORB`);
  console.log(`On-chain total: ${totalActualAmount.toFixed(4)} ORB`);
  console.log(`Difference: ${(totalActualAmount - totalDbAmount).toFixed(4)} ORB`);

  await closeDatabase();
  process.exit(0);
}

checkClaimAmounts().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
