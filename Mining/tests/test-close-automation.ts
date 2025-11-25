import { getWallet } from '../src/utils/wallet';
import { getAutomationPDA, getMinerPDA } from '../src/utils/accounts';
import { sendAndConfirmTransaction } from '../src/utils/program';
import { getConnection } from '../src/utils/solana';
import { config } from '../src/utils/config';
import { TransactionInstruction, PublicKey } from '@solana/web3.js';

/**
 * Close automation account and recover remaining SOL
 *
 * This script:
 * - Closes the automation account
 * - Returns all remaining SOL to your wallet
 * - Stops all automatic deployments
 *
 * Run with: npx ts-node tests/test-close-automation.ts
 */

// To close automation: send automate instruction with executor = Pubkey::default() (all zeros)
// This signals to the contract to close the account and return funds
const AUTOMATE_DISCRIMINATOR = 0x00;

function buildCloseAutomationInstruction(): TransactionInstruction {
  const wallet = getWallet();
  const [minerPDA] = getMinerPDA(wallet.publicKey);
  const [automationPDA] = getAutomationPDA(wallet.publicKey);

  // Build automate instruction with executor = Pubkey::default() to signal closure
  // Format: discriminator + amount + deposit + fee + mask + strategy (34 bytes)
  // Set all to zero to signal closure
  const data = Buffer.alloc(34);
  data.writeUInt8(AUTOMATE_DISCRIMINATOR, 0);
  // Rest is all zeros

  // Account keys (5 accounts):
  // 0. signer (wallet)
  // 1. automation PDA
  // 2. executor (Pubkey::default() = all zeros to signal close)
  // 3. miner PDA
  // 4. system program
  const keys = [
    { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
    { pubkey: automationPDA, isSigner: false, isWritable: true },
    { pubkey: PublicKey.default, isSigner: false, isWritable: true }, // default pubkey signals close
    { pubkey: minerPDA, isSigner: false, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // system program
  ];

  return new TransactionInstruction({
    keys,
    programId: config.orbProgramId,
    data,
  });
}

async function main() {
  console.log('============================================================');
  console.log('Close Automation Account');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [automationPDA] = getAutomationPDA(wallet.publicKey);

    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Automation PDA: ${automationPDA.toBase58()}\n`);

    // Check if automation account exists
    console.log('Checking automation account...');
    const accountInfo = await connection.getAccountInfo(automationPDA);

    if (!accountInfo) {
      console.log('❌ No automation account found');
      console.log('Nothing to close.\n');
      return;
    }

    console.log('✅ Automation account exists');
    console.log(`Account balance: ${(accountInfo.lamports / 1e9).toFixed(4)} SOL`);
    console.log(`Account size: ${accountInfo.data.length} bytes\n`);

    // Parse automation account to show details
    const data = accountInfo.data;
    if (data.length >= 40) {
      const authority = new PublicKey(data.slice(8, 40));
      console.log('Automation Details:');
      console.log(`  Authority: ${authority.toBase58()}`);

      if (data.length >= 48) {
        const balance = data.readBigUInt64LE(40);
        console.log(`  Remaining balance: ${(Number(balance) / 1e9).toFixed(4)} SOL`);
      }
      console.log('');
    }

    console.log('This will:');
    console.log('  • Stop all automatic deployments');
    console.log('  • Close the automation account');
    console.log('  • Return remaining SOL to your wallet');
    console.log('');

    // Dry run check
    if (config.dryRun) {
      console.log('[DRY RUN] Would close automation account');
      console.log('✅ Dry run completed');
      return;
    }

    console.log('⚠️  Press Ctrl+C to cancel, or wait 3 seconds to proceed...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Closing automation account...');
    const instruction = buildCloseAutomationInstruction();

    console.log('Sending transaction...');
    const signature = await sendAndConfirmTransaction([instruction], 'Close Automation');

    console.log('\n✅ Automation account closed successfully!');
    console.log(`Transaction: ${signature}`);
    console.log(`\nAll remaining SOL has been returned to your wallet.`);
    console.log(`Automatic deployments have been stopped.`);
  } catch (error) {
    console.error('\n❌ Failed to close automation:', error);
    console.error('\nNote: If the close instruction fails, the automation account');
    console.error('structure might be different than expected. You may need to use');
    console.error('the ORB UI or wait for the account to deplete naturally.');
    process.exit(1);
  }
}

main();
