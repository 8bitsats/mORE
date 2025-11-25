import { getWallet } from '../src/utils/wallet';
import { getConnection } from '../src/utils/solana';
import { getAutomationPDA } from '../src/utils/accounts';
import { PublicKey } from '@solana/web3.js';

/**
 * Analyze automation account and transactions to understand the automate instruction format
 * Run with: npx ts-node tests/analyze-automate-instruction.ts
 */

async function main() {
  console.log('============================================================');
  console.log('Analyzing Automation Account and Transactions');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [automationPDA] = getAutomationPDA(wallet.publicKey);

    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Automation PDA: ${automationPDA.toBase58()}\n`);

    // Check if automation account exists
    console.log('Checking if automation account exists...');
    const accountInfo = await connection.getAccountInfo(automationPDA);

    if (!accountInfo) {
      console.log('❌ No automation account found');
      console.log('This wallet has not used the automate instruction yet.\n');

      // Let's search for other wallets that have used automate
      console.log('Searching for example automation transactions on the network...');
      console.log('Looking at ORB program transactions...\n');

      const orbProgram = new PublicKey('boreXQWsKpsJz5RR9BMtN8Vk4ndAk23sutj8spWYhwk');
      const signatures = await connection.getSignaturesForAddress(orbProgram, { limit: 100 });

      console.log(`Found ${signatures.length} recent transactions on ORB program`);
      console.log('Analyzing transactions for automate instruction...\n');

      let automateFound = 0;
      for (const sig of signatures.slice(0, 20)) {
        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (tx && tx.meta && !tx.meta.err) {
          // Check each instruction for potential automate calls
          const instructions = tx.transaction.message.compiledInstructions || [];
          for (const ix of instructions) {
            const data = Buffer.from(ix.data);
            // Automate instructions are typically longer than simple mine instructions
            if (data.length >= 40) {
              console.log(`\nPotential automate instruction found:`);
              console.log(`Signature: ${sig.signature}`);
              console.log(`Data length: ${data.length} bytes`);
              console.log(`Data (hex): ${data.toString('hex')}`);
              console.log(`First byte (discriminator): 0x${data[0].toString(16).padStart(2, '0')}`);
              automateFound++;
              if (automateFound >= 3) break;
            }
          }
        }
        if (automateFound >= 3) break;
      }

      if (automateFound === 0) {
        console.log('\nNo automate instructions found in recent transactions.');
      }

    } else {
      console.log('✅ Automation account exists!');
      console.log(`Account size: ${accountInfo.data.length} bytes`);
      console.log(`Account data (hex): ${accountInfo.data.toString('hex')}\n`);

      // Parse account structure
      console.log('Parsing automation account structure...');
      const data = accountInfo.data;

      // Try to parse based on expected structure
      console.log(`Discriminator (8 bytes): ${data.slice(0, 8).toString('hex')}`);
      console.log(`Authority (32 bytes): ${new PublicKey(data.slice(8, 40)).toBase58()}`);

      // Get transactions for this automation account
      console.log('\nFetching transactions for automation account...');
      const signatures = await connection.getSignaturesForAddress(automationPDA, { limit: 10 });
      console.log(`Found ${signatures.length} transactions\n`);

      for (const sig of signatures) {
        console.log(`\nSignature: ${sig.signature}`);
        console.log(`Slot: ${sig.slot}`);
        console.log(`Block time: ${sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : 'unknown'}`);

        const tx = await connection.getTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });

        if (tx && tx.meta) {
          console.log(`Status: ${tx.meta.err ? 'Failed' : 'Success'}`);
          const instructions = tx.transaction.message.compiledInstructions || [];
          console.log(`Instructions: ${instructions.length}`);
          instructions.forEach((ix, i) => {
            const data = Buffer.from(ix.data);
            console.log(`  Instruction ${i}: ${data.toString('hex').substring(0, 64)}... (${data.length} bytes)`);
          });
        }
      }
    }

    console.log('\n✅ Analysis completed');
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  }
}

main();
