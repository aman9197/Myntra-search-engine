/**
 * Test Suite for Phase 4: 4-Mode RAG Search Engine & Counter-Evidence Core
 * Verifies query routing, mode execution, multi-facet filtering, and counter-evidence extraction.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { executeRAGSearch, extractCounterEvidence, filterEvidence } = require('../engine/search_rag');

console.log('--------------------------------------------------');
console.log('RUNNING PHASE 4 TEST SUITE: 4-Mode RAG Search Core');
console.log('--------------------------------------------------');

let totalTests = 0;
let passedTests = 0;

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

// Load real research DB for integration testing
const dbPath = path.join(__dirname, '../data/myntra_extracted_db.json');
const realDb = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf8')) : [];

// Test 1: Explore Mode Execution
runTest('Should execute Mode 1 (Explore) and return structured research summary', () => {
  const result = executeRAGSearch('Why do users wishlist dresses on Myntra without buying?', 'explore', {}, realDb);
  assert.strictEqual(result.mode, 'explore');
  assert.ok(result.total_matching_conversations > 0);
  assert.ok(result.empirical_counts.total_conversations > 0);
  assert.ok(typeof result.finding === 'string' && result.finding.length > 20);
  assert.ok(Array.isArray(result.opportunities));
});

// Test 2: Compare Mode Execution
runTest('Should execute Mode 2 (Compare) and generate delta analysis between themes', () => {
  const result = executeRAGSearch('Compare size uncertainty vs price uncertainty on Myntra', 'compare', {}, realDb);
  assert.strictEqual(result.mode, 'compare');
  assert.ok(result.mode_data.comparison_target);
  assert.ok(result.mode_data.metrics_comparison);
});

// Test 3: Segment Mode Execution
runTest('Should execute Mode 3 (Segment) and contrast friction across demographic segments', () => {
  const result = executeRAGSearch('Gen Z vs Working Professionals on Myntra', 'segment', {}, realDb);
  assert.strictEqual(result.mode, 'segment');
  assert.ok(Array.isArray(result.mode_data.segment_comparison));
  assert.ok(result.mode_data.segment_comparison.length >= 3);
});

// Test 4: Evidence Mode Execution
runTest('Should execute Mode 4 (Evidence) and return high-confidence direct quotes', () => {
  const result = executeRAGSearch('Show 20 direct quotes of users leaving Myntra for Instagram fit photos', 'evidence', {}, realDb);
  assert.strictEqual(result.mode, 'evidence');
  assert.ok(Array.isArray(result.mode_data.direct_evidence_quotes));
  if (result.mode_data.direct_evidence_quotes.length > 0) {
    assert.strictEqual(result.mode_data.direct_evidence_quotes[0].evidence_strength, 'High');
  }
});

// Test 5: Counter-Evidence Extraction
runTest('Should detect disconfirming counter-evidence to eliminate confirmation bias', () => {
  const mockCounterData = [
    {
      text: 'I bought the kurta on Myntra even though there was no discount because I needed it urgently.',
      purchase_status: 'Purchased',
      source: 'Play Store'
    },
    {
      text: 'Myntra gave 50% discount on dress during EORS but I still abandoned cart because size chart was confusing.',
      purchase_status: 'Abandoned',
      purchase_barrier: 'Fit Uncertainty',
      source: 'Reddit'
    }
  ];

  const counterResult = extractCounterEvidence(mockCounterData, 'price');
  assert.ok(counterResult.has_disconfirming_evidence, 'Should detect counter evidence');
  assert.strictEqual(counterResult.total_counter_evidence, 2);
});

// Test 6: Multi-Facet Filtering
runTest('Should apply source and segment filters accurately', () => {
  const filters = { sources: ['Reddit'], segments: ['Gen Z / Myntra FWD'] };
  const filtered = filterEvidence(realDb, filters, '');
  
  filtered.forEach(item => {
    assert.strictEqual(item.source, 'Reddit');
    assert.strictEqual(item.user_segment, 'Gen Z / Myntra FWD');
  });
});

// Test 7: Star Rating Filter (1-5 Stars)
runTest('Should apply star rating filter (1-5 stars) accurately', () => {
  const filters = { ratings: [1, 2] };
  const filtered = filterEvidence(realDb, filters, '');
  
  filtered.forEach(item => {
    if (item.rating !== null) {
      assert.ok([1, 2].includes(parseInt(item.rating, 10)));
    }
  });
});

console.log('--------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('--------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('Phase 4 4-Mode RAG Search Core verified successfully!');
}
