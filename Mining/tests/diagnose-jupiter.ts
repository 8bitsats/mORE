#!/usr/bin/env ts-node
/**
 * Jupiter API Diagnostic and Fix Tool
 *
 * This script:
 * 1. Tests DNS resolution
 * 2. Tests multiple Jupiter endpoints
 * 3. Tests different API versions
 * 4. Suggests working configuration
 */

import axios from 'axios';
import * as dns from 'dns/promises';

const ORB_MINT = 'orebyr4mDiPDVgnfqvF5xiu5gKnh94Szuz8dqgNqdJn';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TEST_AMOUNT = '100000000'; // 0.1 ORB in lamports

interface TestResult {
  endpoint: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  quoteData?: any;
}

const TEST_ENDPOINTS = [
  // Lite API V1 (primary - working endpoint)
  'https://lite-api.jup.ag/swap/v1',

  // Official Jupiter V6 endpoints
  'https://quote-api.jup.ag/v6',
  'https://api.jup.ag/v6',

  // Alternative endpoints
  'https://public.jupiterapi.com/v6',

  // Legacy V4 (as fallback)
  'https://quote-api.jup.ag/v4',
];

// Test DNS resolution
async function testDNS(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Step 1: DNS Resolution Test');
  console.log('='.repeat(70));

  const domains = [
    'quote-api.jup.ag',
    'api.jup.ag',
    'lite-api.jup.ag',
    'public.jupiterapi.com',
    'jup.ag',
  ];

  let allFailed = true;

  for (const domain of domains) {
    try {
      const addresses = await dns.resolve4(domain);
      console.log(`✅ ${domain.padEnd(30)} → ${addresses[0]}`);
      allFailed = false;
    } catch (error: any) {
      console.log(`❌ ${domain.padEnd(30)} → ${error.code || 'Failed'}`);
    }
  }

  if (allFailed) {
    console.log('\n⚠️  WARNING: All DNS lookups failed!');
    console.log('   Possible fixes:');
    console.log('   1. Change DNS to Google (8.8.8.8) or Cloudflare (1.1.1.1)');
    console.log('   2. Check firewall/antivirus settings');
    console.log('   3. Try using a VPN');
    console.log('   4. Check if your ISP blocks certain domains');
  }

  console.log();
}

// Test HTTP connectivity
async function testHTTP(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      validateStatus: () => true, // Accept any status
    });
    console.log(`✅ HTTP accessible (Status: ${response.status})`);
    return true;
  } catch (error: any) {
    console.log(`❌ HTTP failed: ${error.code || error.message}`);
    return false;
  }
}

// Test quote endpoint with multiple parameter formats
async function testQuoteEndpoint(baseUrl: string): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    endpoint: baseUrl,
    success: false,
  };

  console.log(`\nTesting: ${baseUrl}`);
  console.log('-'.repeat(70));

  // Test 1: Basic HTTP connectivity
  console.log('Test 1: Basic connectivity...');
  const httpOk = await testHTTP(baseUrl);
  if (!httpOk) {
    result.error = 'Cannot connect to endpoint';
    return result;
  }

  // Test 2: Quote with query params (v6 style)
  console.log('\nTest 2: Quote endpoint (v6 format)...');
  try {
    const quoteUrl = `${baseUrl}/quote`;
    const params = {
      inputMint: ORB_MINT,
      outputMint: SOL_MINT,
      amount: TEST_AMOUNT,
      slippageBps: '50',
      onlyDirectRoutes: 'false',
      asLegacyTransaction: 'false',
    };

    console.log(`   GET ${quoteUrl}`);
    console.log(`   Params:`, JSON.stringify(params, null, 2));

    const response = await axios.get(quoteUrl, {
      params,
      timeout: 15000,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.data && response.data.outAmount) {
      const outSol = Number(response.data.outAmount) / 1e9;
      console.log(`✅ Quote successful!`);
      console.log(`   Input: 0.1 ORB`);
      console.log(`   Output: ${outSol.toFixed(6)} SOL`);
      console.log(`   Price Impact: ${response.data.priceImpactPct}%`);

      result.success = true;
      result.quoteData = response.data;
      result.responseTime = Date.now() - startTime;
      return result;
    }
  } catch (error: any) {
    console.log(`❌ V6 format failed: ${error.code || error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error:`, error.response.data);
    }
  }

  // Test 3: Try v4 format (legacy)
  console.log('\nTest 3: Quote endpoint (v4 format)...');
  try {
    const quoteUrl = `${baseUrl}/quote`;
    const params = {
      inputMint: ORB_MINT,
      outputMint: SOL_MINT,
      amount: TEST_AMOUNT,
      slippage: '0.5', // v4 uses decimal
    };

    console.log(`   GET ${quoteUrl}`);
    const response = await axios.get(quoteUrl, {
      params,
      timeout: 15000,
    });

    if (response.data && response.data.data) {
      console.log(`✅ Quote successful (v4)!`);
      result.success = true;
      result.quoteData = response.data;
      result.responseTime = Date.now() - startTime;
      return result;
    }
  } catch (error: any) {
    console.log(`❌ V4 format failed: ${error.code || error.message}`);
  }

  result.error = 'All quote formats failed';
  return result;
}

// Test all endpoints
async function testAllEndpoints(): Promise<TestResult[]> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Step 2: Testing Jupiter API Endpoints');
  console.log('='.repeat(70));

  const results: TestResult[] = [];

  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testQuoteEndpoint(endpoint);
    results.push(result);

    if (result.success) {
      console.log(`\n✅ WORKING ENDPOINT FOUND!`);
      console.log(`   Response time: ${result.responseTime}ms`);
      break; // Stop after first success
    }

    console.log(); // spacing
  }

  return results;
}

// Generate .env recommendation
function generateRecommendation(results: TestResult[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('📋 Recommendations');
  console.log('='.repeat(70));

  const workingEndpoint = results.find(r => r.success);

  if (workingEndpoint) {
    console.log('\n✅ Found working Jupiter endpoint!');
    console.log('\nUpdate your .env file:');
    console.log(`JUPITER_API_URL=${workingEndpoint.endpoint}`);
    console.log('\nThen restart the bot:');
    console.log('npm start');
  } else {
    console.log('\n❌ No working Jupiter endpoints found.');
    console.log('\nPossible issues and fixes:');
    console.log('\n1. Network/Firewall Issue:');
    console.log('   - Check firewall settings');
    console.log('   - Disable VPN or try different VPN server');
    console.log('   - Check antivirus is not blocking connections');

    console.log('\n2. DNS Issue:');
    console.log('   - Change DNS to Google DNS (8.8.8.8, 8.8.4.4)');
    console.log('   - Change DNS to Cloudflare (1.1.1.1, 1.0.0.1)');
    console.log('   - Flush DNS cache: ipconfig /flushdns');

    console.log('\n3. ISP Blocking:');
    console.log('   - Your ISP might be blocking Jupiter API');
    console.log('   - Try mobile hotspot or different network');
    console.log('   - Use VPN service');

    console.log('\n4. Temporary Workaround:');
    console.log('   - Disable auto-swap in .env:');
    console.log('     AUTO_SWAP_ENABLED=false');
    console.log('   - Manually swap when needed:');
    console.log('     npx ts-node src/commands/swap.ts --amount 10');
  }
}

// Test network configuration
async function testNetworkConfig(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 Step 3: Network Configuration');
  console.log('='.repeat(70));

  try {
    // Check current DNS
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      const { stdout } = await execAsync('ipconfig /all');
      const dnsMatch = stdout.match(/DNS Servers.*?:\s*([0-9.]+)/);
      if (dnsMatch) {
        console.log(`Current DNS: ${dnsMatch[1]}`);
        if (dnsMatch[1].startsWith('8.8.') || dnsMatch[1].startsWith('1.1.')) {
          console.log('✅ Using public DNS (good)');
        } else {
          console.log('⚠️  Using ISP DNS (might cause issues)');
        }
      }
    } catch (error) {
      console.log('Unable to check DNS configuration');
    }

    // Test general internet connectivity
    console.log('\nTesting general internet connectivity...');
    const testSites = [
      'https://www.google.com',
      'https://api.github.com',
      'https://solana.com',
    ];

    for (const site of testSites) {
      try {
        await axios.get(site, { timeout: 5000 });
        console.log(`✅ ${site}`);
      } catch (error) {
        console.log(`❌ ${site}`);
      }
    }

  } catch (error) {
    console.log('Network configuration check failed:', error);
  }
}

// Main diagnostic
async function main() {
  console.log('\n🚀 Jupiter API Diagnostic Tool');
  console.log('='.repeat(70));
  console.log('This tool will diagnose Jupiter API connectivity issues');
  console.log('and suggest fixes.');
  console.log('='.repeat(70));

  // Run diagnostics
  await testDNS();
  const results = await testAllEndpoints();
  await testNetworkConfig();

  // Generate recommendations
  generateRecommendation(results);

  console.log('\n' + '='.repeat(70));
  console.log('✅ Diagnostic Complete');
  console.log('='.repeat(70) + '\n');
}

// Run
main().catch(console.error);
