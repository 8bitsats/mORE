import { getWallet } from '../src/utils/wallet';
import { getAutomationPDA } from '../src/utils/accounts';
import { getConnection } from '../src/utils/solana';
import { PublicKey } from '@solana/web3.js';

/**
 * Properly parse and display automation account structure
 */

async function main() {
  console.log('============================================================');
  console.log('Automation Account Details');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [automationPDA] = getAutomationPDA(wallet.publicKey);

    console.log(`Your Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Automation PDA: ${automationPDA.toBase58()}\n`);

    const accountInfo = await connection.getAccountInfo(automationPDA);
    if (!accountInfo) {
      console.log('❌ No automation account found\n');
      return;
    }

    const data = accountInfo.data;
    console.log(`Account size: ${data.length} bytes`);
    console.log(`Account lamports: ${(accountInfo.lamports / 1e9).toFixed(6)} SOL\n`);

    // Parse Automation struct:
    // - Discriminator: 8 bytes (offset 0)
    // - amount: 8 bytes (offset 8)
    // - authority: 32 bytes (offset 16)
    // - balance: 8 bytes (offset 48)
    // - executor: 32 bytes (offset 56)
    // - fee: 8 bytes (offset 88)
    // - strategy: 8 bytes (offset 96)
    // - mask: 8 bytes (offset 104)

    console.log('Automation Configuration:');
    console.log('-------------------------');

    const discriminator = data.readBigUInt64LE(0);
    console.log(`Discriminator: 0x${discriminator.toString(16)}`);

    const amount = data.readBigUInt64LE(8);
    console.log(`Amount per square: ${(Number(amount) / 1e9).toFixed(6)} SOL`);

    const authority = new PublicKey(data.slice(16, 48));
    console.log(`Authority: ${authority.toBase58()}`);
    console.log(`  Is your wallet? ${authority.equals(wallet.publicKey) ? '✅ YES' : '❌ NO'}`);

    const balance = data.readBigUInt64LE(48);
    console.log(`Remaining balance: ${(Number(balance) / 1e9).toFixed(6)} SOL`);

    const executor = new PublicKey(data.slice(56, 88));
    console.log(`Executor: ${executor.toBase58()}`);
    console.log(`  Is your wallet? ${executor.equals(wallet.publicKey) ? '✅ YES (self-execute)' : '❌ NO (external)'}`);

    const fee = data.readBigUInt64LE(88);
    console.log(`Fee per execution: ${(Number(fee) / 1e9).toFixed(6)} SOL`);

    const strategy = data.readBigUInt64LE(96);
    console.log(`Strategy: ${strategy === 0n ? 'Random (0)' : strategy === 1n ? 'Preferred (1)' : `Unknown (${strategy})`}`);

    const mask = data.readBigUInt64LE(104);
    console.log(`Mask: ${mask} (${strategy === 0n ? 'number of squares' : 'bitmask'})`);

    console.log('\nCalculated Stats:');
    console.log('-------------------------');
    const solPerRound = (Number(amount) / 1e9) * Number(mask);
    const roundsRemaining = Math.floor(Number(balance) / Number(amount) / Number(mask));
    console.log(`SOL per round: ${solPerRound.toFixed(4)} SOL (${(Number(amount) / 1e9).toFixed(6)} × ${mask} squares)`);
    console.log(`Rounds remaining: ~${roundsRemaining} rounds`);

    console.log('\n✅ Analysis completed');
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }
}

main();
