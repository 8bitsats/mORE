/**
 * Diagnostic tool to find the correct checkpointId offset in the Miner account
 */

import { getWallet } from '../src/utils/wallet';
import { getMinerPDA, fetchBoard } from '../src/utils/accounts';
import { getConnection } from '../src/utils/solana';
import BN from 'bn.js';

// Helper to deserialize u64 at specific offset
function deserializeU64(data: Buffer, offset: number): BN {
  return new BN(data.slice(offset, offset + 8), 'le');
}

async function diagnoseCheckpointOffset() {
  try {
    console.log('🔍 Diagnosing Miner account checkpointId offset...\n');

    const wallet = getWallet();
    const [minerPDA] = getMinerPDA(wallet.publicKey);
    const connection = getConnection();

    // Fetch current board to get actual round
    const board = await fetchBoard();
    const currentRound = board.roundId.toNumber();
    console.log(`Current board round: ${currentRound}\n`);

    // Fetch miner account raw data
    const accountInfo = await connection.getAccountInfo(minerPDA);
    if (!accountInfo) {
      console.log('❌ Miner account not found');
      return;
    }

    const data = accountInfo.data;
    console.log(`Miner account size: ${data.length} bytes\n`);

    // Expected structure:
    // discriminator(8) + authority(32) + deployed(200) + cumulative(200) + ...

    // Try different offsets for checkpointId and roundId
    console.log('Scanning for checkpointId field (should be close to current round):\n');
    console.log('Offset | Value      | Reasonable?');
    console.log('-------|------------|------------');

    // Scan every 8-byte boundary from offset 400 to 600
    for (let offset = 400; offset < 600; offset += 8) {
      const value = deserializeU64(data, offset);
      const valueNum = value.toNumber();

      // checkpointId should be <= currentRound and > 0
      const isReasonable = valueNum > 0 && valueNum <= currentRound && valueNum >= currentRound - 500;

      const marker = isReasonable ? '✅' : '  ';
      console.log(`${marker} ${offset.toString().padStart(3)} | ${valueNum.toString().padStart(10)} | ${isReasonable ? 'YES - close to current round!' : 'no'}`);
    }

    console.log('\n📊 Current offset being used: 448 (offset + 440)');
    const currentCheckpointId = deserializeU64(data, 448);
    console.log(`   Value at offset 448: ${currentCheckpointId.toString()}`);

    console.log('\n💡 Look for an offset with a value close to current round.');
    console.log('   That\'s likely the correct checkpointId offset!');

  } catch (error) {
    console.error('Error:', error);
  }
}

diagnoseCheckpointOffset().catch(console.error);
