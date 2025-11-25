import { getWallet } from '../src/utils/wallet';
import { getStakePDA } from '../src/utils/accounts';
import { getConnection } from '../src/utils/solana';
import BN from 'bn.js';

/**
 * Debug script to inspect raw stake account data
 * Run with: npx ts-node tests/debug-stake-account.ts
 */

function deserializeU64(data: Buffer, offset: number): BN {
  return new BN(data.slice(offset, offset + 8), 'le');
}

async function main() {
  console.log('============================================================');
  console.log('Debug: Raw Stake Account Data');
  console.log('============================================================\n');

  try {
    const wallet = getWallet();
    const connection = getConnection();
    const [stakePDA] = getStakePDA(wallet.publicKey);

    console.log(`Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`Stake PDA: ${stakePDA.toBase58()}\n`);

    const accountInfo = await connection.getAccountInfo(stakePDA);
    if (!accountInfo) {
      console.log('❌ Stake account not found');
      return;
    }

    const data = accountInfo.data;
    console.log(`Account data length: ${data.length} bytes\n`);

    // Show discriminator
    console.log('Discriminator (first 8 bytes):');
    console.log(data.slice(0, 8).toString('hex'));
    console.log('');

    // Show entire data as hex
    console.log('Full account data (hex):');
    console.log(data.toString('hex'));
    console.log('');

    // Try to parse with current offsets
    console.log('Current parsing (may be incorrect):');
    console.log('-----------------------------------');
    let offset = 8;
    console.log(`Authority (bytes ${offset}-${offset+32}):`, new (require('@solana/web3.js').PublicKey)(data.slice(offset, offset + 32)).toBase58());
    console.log(`Balance (bytes ${offset+32}-${offset+40}):`, deserializeU64(data, offset + 32).toString(), `(${Number(deserializeU64(data, offset + 32)) / 1e9} ORB)`);
    console.log(`RewardsSol (bytes ${offset+40}-${offset+48}):`, deserializeU64(data, offset + 40).toString(), `(${Number(deserializeU64(data, offset + 40)) / 1e9} SOL)`);
    console.log(`RewardsOre (bytes ${offset+48}-${offset+56}):`, deserializeU64(data, offset + 48).toString(), `(${Number(deserializeU64(data, offset + 48)) / 1e9} ORB)`);
    console.log(`LifetimeRewardsSol (bytes ${offset+56}-${offset+64}):`, deserializeU64(data, offset + 56).toString(), `(${Number(deserializeU64(data, offset + 56)) / 1e9} SOL)`);
    console.log(`LifetimeRewardsOre (bytes ${offset+64}-${offset+72}):`, deserializeU64(data, offset + 64).toString(), `(${Number(deserializeU64(data, offset + 64)) / 1e9} ORB)`);
    console.log('');

    // Try scanning for the known balance value (16.708546313 ORB = 16708546313 units)
    const knownBalanceLamports = 16708546313n;
    console.log(`Scanning for known balance (${knownBalanceLamports} = 16.708546313 ORB):`);
    console.log('-----------------------------------');
    for (let i = 0; i < data.length - 8; i++) {
      const value = new BN(data.slice(i, i + 8), 'le');
      if (value.toString() === knownBalanceLamports.toString()) {
        console.log(`✓ Found at byte offset ${i}: ${value.toString()} (${Number(value) / 1e9} ORB)`);
      }
    }
    console.log('');

    console.log('✅ Debug completed');
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

main();
