/**
 * Inspect what a claim transaction actually does
 */
import { getConnection } from '../src/utils/solana';

async function inspectTx() {
  const connection = getConnection();

  // Check the first claim transaction
  const sig = '21QfaUhQ6KmmVxWbvaNn4GbB7jxfLNHSj45WqwxSc9YWuWokPpKpkefh46XUrxz87kuhdvZmhhb8tTuo2j1sEzHz';

  console.log('\n=== INSPECTING CLAIM TRANSACTION ===\n');
  console.log(`Signature: ${sig}`);
  console.log(`Solscan: https://solscan.io/tx/${sig}\n`);

  const txInfo = await connection.getParsedTransaction(sig, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed'
  });

  if (!txInfo) {
    console.log('Transaction not found');
    process.exit(1);
  }

  console.log('Instructions:');
  const instructions = txInfo.transaction.message.instructions;
  instructions.forEach((ix: any, i: number) => {
    console.log(`\n${i + 1}. ${ix.programId.toString()}`);
    if (ix.parsed) {
      console.log(`   Type: ${ix.parsed.type}`);
      console.log(`   Info:`, JSON.stringify(ix.parsed.info, null, 2));
    } else {
      console.log(`   Data: ${ix.data}`);
      console.log(`   Accounts: ${ix.accounts.length}`);
    }
  });

  console.log('\n\nToken Balance Changes:');
  console.log('Pre-balances:', txInfo.meta?.preTokenBalances || []);
  console.log('Post-balances:', txInfo.meta?.postTokenBalances || []);

  console.log('\n\nSOL Balance Changes:');
  const preBalances = txInfo.meta?.preBalances || [];
  const postBalances = txInfo.meta?.postBalances || [];
  const accountKeys = txInfo.transaction.message.accountKeys;

  accountKeys.forEach((key: any, i: number) => {
    const pre = preBalances[i] / 1e9;
    const post = postBalances[i] / 1e9;
    const diff = post - pre;
    if (Math.abs(diff) > 0.00001) {
      console.log(`${key.pubkey.toString()}: ${diff >= 0 ? '+' : ''}${diff.toFixed(6)} SOL`);
    }
  });

  process.exit(0);
}

inspectTx().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
