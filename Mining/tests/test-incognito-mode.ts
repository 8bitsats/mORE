/**
 * Test script to verify incognito mode masking functionality
 *
 * Run with: npx ts-node tests/test-incognito-mode.ts
 */

import { maskSensitiveData, alwaysMask } from '../src/utils/mask';

console.log('='.repeat(60));
console.log('  Incognito Mode Masking Test');
console.log('='.repeat(60));
console.log();

// Test 1: Mask transaction signature
console.log('Test 1: Transaction Signature');
console.log('-'.repeat(60));
const signature = '3Qv8rFKG9YhJKqU5DmP7xK8wVvZfNq2LmPxHJpVz7wC1nEuJbX5qR9kWmTy4vN2pXdGhL8sC6fJ1rY3aZbM9cT';
console.log('Original:', signature);
console.log('Masked (incognito=true):', maskSensitiveData(signature, true));
console.log('Not masked (incognito=false):', maskSensitiveData(signature, false));
console.log();

// Test 2: Mask wallet address
console.log('Test 2: Wallet Address');
console.log('-'.repeat(60));
const address = 'DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CJDL';
console.log('Original:', address);
console.log('Masked (incognito=true):', maskSensitiveData(address, true));
console.log('Not masked (incognito=false):', maskSensitiveData(address, false));
console.log();

// Test 3: Mask RPC URL
console.log('Test 3: RPC Endpoint URL');
console.log('-'.repeat(60));
const rpcUrl = 'https://api.mainnet-beta.solana.com';
console.log('Original:', rpcUrl);
console.log('Masked (incognito=true):', maskSensitiveData(rpcUrl, true));
console.log('Not masked (incognito=false):', maskSensitiveData(rpcUrl, false));
console.log();

// Test 4: Mask complex log message with multiple sensitive items
console.log('Test 4: Complex Log Message');
console.log('-'.repeat(60));
const logMessage = `Transaction successful! Signature: ${signature}\nWallet: ${address}\nRPC: ${rpcUrl}\nAmount: 0.5 SOL`;
console.log('Original:');
console.log(logMessage);
console.log();
console.log('Masked (incognito=true):');
console.log(maskSensitiveData(logMessage, true));
console.log();
console.log('Not masked (incognito=false):');
console.log(maskSensitiveData(logMessage, false));
console.log();

// Test 5: Always mask (explicit masking)
console.log('Test 5: Explicit Masking (alwaysMask)');
console.log('-'.repeat(60));
console.log('Original:', address);
console.log('Always masked:', alwaysMask(address));
console.log('Always masked (3 chars):', alwaysMask(address, 3));
console.log();

// Test 6: Real-world example
console.log('Test 6: Real-World Log Example');
console.log('-'.repeat(60));
const realLog = 'Deployed 0.01 SOL to round 12345. Wallet: DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CJDL. Tx: 3Qv8rFKG9YhJKqU5DmP7xK8wVvZfNq2LmPxHJpVz7wC1nEuJbX5qR9kWmTy4vN2pXdGhL8sC6fJ1rY3aZbM9cT';
console.log('Without incognito mode:');
console.log(maskSensitiveData(realLog, false));
console.log();
console.log('With incognito mode:');
console.log(maskSensitiveData(realLog, true));
console.log();

console.log('='.repeat(60));
console.log('  Test Complete!');
console.log('='.repeat(60));
console.log();
console.log('To enable incognito mode in the bot:');
console.log('1. Set INCOGNITO_MODE=true in your .env file');
console.log('2. Restart the bot');
console.log('3. All console output will mask sensitive data');
console.log('4. Full details remain in log files for debugging');
console.log();
