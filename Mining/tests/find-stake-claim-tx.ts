import { getWallet } from '../src/utils/wallet';
import { getConnection } from '../src/utils/solana';
import { getStakePDA } from '../src/utils/accounts';

/**
 * Find recent stake claim transactions to analyze the instruction format
 * Run with: npx ts-node tests/find-stake-claim-tx.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Finding Recent Stake Claim Transactions');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [stakePDA] = getStakePDA(wallet.publicKey);

    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Stake PDA: ${stakePDA.toBase58()}\n`);

    console.log('Fetching recent transactions for stake account...');

    const signatures = await connection.getSignaturesForAddress(stakePDA, { limit: 20 });

    console.log(`Found ${signatures.length} transactions\n`);

    for (const sig of signatures) {
      console.log(`\nSignature: ${sig.signature}`);
      console.log(`Slot: ${sig.slot}`);
      console.log(`Block time: ${sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'unknown'}`);
      console.log(`Error: ${sig.err ? JSON.stringify(sig.err) : 'none'}`);

      // Fetch full transaction
      const tx = await connection.getTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (tx && tx.meta) {
        console.log(`Status: ${tx.meta.err ? 'Failed' : 'Success'}`);
        console.log(`Fee: ${tx.meta.fee} lamports`);

        // Show instruction data
        if (tx.transaction.message.compiledInstructions) {
          console.log(`Instructions: ${tx.transaction.message.compiledInstructions.length}`);
          tx.transaction.message.compiledInstructions.forEach((ix, i) => {
            console.log(`  Instruction ${i}: ${Buffer.from(ix.data).toString('hex')}`);
          });
        }
      }
    }

    console.log('\n✅ Search completed');
  } catch (error) {
    console.error('❌ Search failed:', error);
    process.exit(1);
  }
}

main();
