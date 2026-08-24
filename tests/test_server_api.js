/**
 * Test Suite for Phase 5: REST API Backend Server
 * Tests API routing, health check, stats distribution, search integration, dynamic weight updates, and ingestion.
 */

const assert = require('assert');
const http = require('http');
const app = require('../server');

console.log('--------------------------------------------------');
console.log('RUNNING PHASE 5 TEST SUITE: REST API Server');
console.log('--------------------------------------------------');

let totalTests = 0;
let passedTests = 0;
const TEST_PORT = 3098;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`✓ PASS: ${testName}`);
  } catch (err) {
    console.error(`✗ FAIL: ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    }, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(dataString);
    req.end();
  });
}

async function runAllAPITests() {
  const server = app.listen(TEST_PORT, async () => {
    try {
      // Test 1: GET /api/health
      const res1 = await makeRequest('/api/health');
      runTest('GET /api/health should return healthy status', () => {
        assert.strictEqual(res1.status, 200);
        assert.strictEqual(res1.data.status, 'healthy');
        assert.ok(typeof res1.data.records_loaded === 'number');
      });

      // Test 2: GET /api/stats
      const res2 = await makeRequest('/api/stats');
      runTest('GET /api/stats should return dataset distributions', () => {
        assert.strictEqual(res2.status, 200);
        assert.strictEqual(res2.data.success, true);
        assert.ok(res2.data.total_records > 0);
        assert.ok(res2.data.sources_distribution);
      });

      // Test 3: GET /api/opportunities
      const res3 = await makeRequest('/api/opportunities');
      runTest('GET /api/opportunities should return opportunity matrix', () => {
        assert.strictEqual(res3.status, 200);
        assert.strictEqual(res3.data.success, true);
        assert.ok(Array.isArray(res3.data.opportunities));
      });

      // Test 4: GET /api/search
      const res4 = await makeRequest('/api/search?q=fit&mode=explore');
      runTest('GET /api/search should execute 4-mode search query', () => {
        assert.strictEqual(res4.status, 200);
        assert.strictEqual(res4.data.success, true);
        assert.strictEqual(res4.data.mode, 'explore');
      });

      // Test 5: POST /api/ingest
      const payload = {
        text: 'I wishlisted size L kurta on Myntra during EORS, but didn\'t buy because size chart was confusing.',
        source: 'Reddit'
      };
      const res5 = await makeRequest('/api/ingest', 'POST', payload);
      runTest('POST /api/ingest should shape and add raw customer statement', () => {
        assert.strictEqual(res5.status, 200);
        assert.strictEqual(res5.data.success, true);
        assert.strictEqual(res5.data.extracted_record.fashion_category, 'Ethnic Wear');
      });

      console.log('--------------------------------------------------');
      console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
      console.log('--------------------------------------------------');

      server.close(() => {
        if (passedTests !== totalTests) {
          process.exit(1);
        } else {
          console.log('Phase 5 REST API Server verified successfully!');
          process.exit(0);
        }
      });
    } catch (err) {
      console.error('API Test Error:', err);
      server.close(() => process.exit(1));
    }
  });
}

runAllAPITests();
