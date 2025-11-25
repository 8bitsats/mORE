#!/usr/bin/env ts-node
/**
 * Test Jupiter API connectivity
 *
 * This script tests different Jupiter endpoints to diagnose connection issues
 */

import axios from 'axios';

const endpoints = [
  'https://quote-api.jup.ag/v6',
  'https://lite-api.jup.ag/v6',
  'https://api.jup.ag/v6',
];

const testMints = {
  ORB: 'orebyr4mDiPDVgnfqvF5xiu5gKnh94Szuz8dqgNqdJn',
  SOL: 'So11111111111111111111111111111111111111112',
};

async function testEndpoint(baseUrl: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${baseUrl}`);
  console.log('='.repeat(60));

  // Test 1: Basic connectivity
  try {
    console.log('Test 1: Basic connectivity (health check)...');
    const healthUrl = `${baseUrl}/health` || baseUrl;
    const response = await axios.get(healthUrl, { timeout: 10000 });
    console.log(`✅ Connected! Status: ${response.status}`);
  } catch (error: any) {
    console.log(`❌ Health check failed: ${error.code || error.message}`);
  }

  // Test 2: Quote endpoint
  try {
    console.log('\nTest 2: Quote endpoint...');
    const quoteUrl = `${baseUrl}/quote`;
    const params = {
      inputMint: testMints.ORB,
      outputMint: testMints.SOL,
      amount: '100000000', // 0.1 ORB
      slippageBps: '50',
    };

    console.log(`GET ${quoteUrl}`);
    console.log('Params:', params);

    const response = await axios.get(quoteUrl, {
      params,
      timeout: 15000
    });

    console.log(`✅ Quote successful!`);
    console.log(`   In: ${params.amount} (0.1 ORB)`);
    console.log(`   Out: ${response.data.outAmount} lamports`);
    console.log(`   Price Impact: ${response.data.priceImpactPct}%`);

    return true;
  } catch (error: any) {
    console.log(`❌ Quote failed:`);
    console.log(`   Error: ${error.code || error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return false;
  }
}

async function testDNS() {
  console.log('\n' + '='.repeat(60));
  console.log('DNS Resolution Test');
  console.log('='.repeat(60));

  const domains = [
    'quote-api.jup.ag',
    'lite-api.jup.ag',
    'api.jup.ag',
    'jup.ag',
  ];

  for (const domain of domains) {
    try {
      console.log(`\nResolving: ${domain}`);
      const dns = require('dns').promises;
      const addresses = await dns.resolve4(domain);
      console.log(`✅ Resolved to: ${addresses.join(', ')}`);
    } catch (error: any) {
      console.log(`❌ DNS failed: ${error.code}`);
    }
  }
}

async function main() {
  console.log('🔍 Jupiter API Connection Diagnostics\n');

  // Test DNS first
  await testDNS();

  // Test each endpoint
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint);
    if (success) {
      console.log(`\n✅ Working endpoint found: ${endpoint}`);
      console.log(`\nUpdate your .env file:`);
      console.log(`JUPITER_API_URL=${endpoint}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Diagnostic Complete');
  console.log('='.repeat(60));
  console.log('\nIf all tests failed, possible issues:');
  console.log('  1. Firewall blocking Jupiter API');
  console.log('  2. ISP DNS issues - try Google DNS (8.8.8.8)');
  console.log('  3. VPN/Proxy required');
  console.log('  4. Network restrictions');
}

main().catch(console.error);
