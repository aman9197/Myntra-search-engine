/**
 * Test Suite for Phase 3: Opportunity Engine & Theme Clustering
 * Tests Opportunity Evidence Score formulas, severity overrides, theme clustering, and dynamic ranking.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { calculateOpportunityScores } = require('../engine/opportunity');
const { clusterEvidenceByTheme } = require('../engine/clustering');

console.log('--------------------------------------------------');
console.log('RUNNING PHASE 3 TEST SUITE: Opportunity Engine');
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

// Mock dataset for deterministic testing
const sampleEvidence = [
  {
    theme: 'Fit & Size Uncertainty',
    sub_theme: 'Size Chart Inconsistency',
    purchase_status: 'Abandoned',
    evidence_strength: 'High',
    workaround: 'Left Myntra app to check Instagram',
    external_research: ['Instagram'],
    user_segment: 'Gen Z / Myntra FWD',
    journey_stage: 'Wishlist -> External Research -> Abandonment',
    text: 'Size M was boxy, abandoned cart.'
  },
  {
    theme: 'Fit & Size Uncertainty',
    sub_theme: 'Body Type Fit Silhouette',
    purchase_status: 'Abandoned',
    evidence_strength: 'High',
    workaround: 'Checked Reddit',
    external_research: ['Reddit'],
    user_segment: 'Gen Z / Myntra FWD',
    journey_stage: 'Wishlist -> External Research -> Abandonment',
    text: 'Fit was unclear.'
  },
  {
    theme: 'Review & Fabric Quality Trust',
    sub_theme: 'Unverified Review Trust',
    purchase_status: 'Postponed',
    evidence_strength: 'Medium',
    workaround: null,
    external_research: null,
    user_segment: 'Working Professional',
    journey_stage: 'Wishlist -> Evaluation',
    text: 'No customer photos.'
  }
];

// Test 1: Theme Clustering
runTest('Should cluster evidence records into distinct opportunity themes', () => {
  const clusters = clusterEvidenceByTheme(sampleEvidence);
  assert.ok(Array.isArray(clusters) && clusters.length >= 2, 'Should create clusters for sample themes');

  const fitCluster = clusters.find(c => c.theme === 'Fit & Size Uncertainty');
  assert.ok(fitCluster, 'Fit & Size Uncertainty cluster must exist');
  assert.strictEqual(fitCluster.abandoned_count, 2);
  assert.strictEqual(fitCluster.workaround_count, 2);
});

// Test 2: Opportunity Evidence Score Calculation
runTest('Should calculate Opportunity Scores and component breakdown metrics', () => {
  const opportunities = calculateOpportunityScores(sampleEvidence);
  assert.ok(Array.isArray(opportunities) && opportunities.length >= 2);

  const topOpp = opportunities[0];
  assert.ok(typeof topOpp.opportunity_score === 'number');
  assert.ok(topOpp.opportunity_score >= 0 && topOpp.opportunity_score <= 100);
  assert.ok(topOpp.metrics.frequency >= 1 && topOpp.metrics.frequency <= 10);
  assert.ok(topOpp.metrics.severity >= 1 && topOpp.metrics.severity <= 10);
  assert.ok(topOpp.metrics.workaround_intensity >= 1 && topOpp.metrics.workaround_intensity <= 10);
});

// Test 3: Severity Multiplier Override
runTest('Should apply minimum score override when severity >= 9.0', () => {
  const highSeverityEvidence = [
    {
      theme: 'Return & Seller Policy Concerns',
      purchase_status: 'Abandoned',
      evidence_strength: 'High',
      text: 'Non-returnable item fear, abandoned immediately.'
    }
  ];

  const opportunities = calculateOpportunityScores(highSeverityEvidence);
  const returnOpp = opportunities.find(o => o.opportunity === 'Return & Seller Policy Concerns');
  assert.ok(returnOpp);
  assert.strictEqual(returnOpp.metrics.severity, 10);
  assert.ok(returnOpp.opportunity_score >= 65.0, 'Score must be at least 65.0 due to severity override');
});

// Test 4: Real Extracted Database Execution
runTest('Should process real research DB and calculate ranked opportunity matrix', () => {
  const dbPath = path.join(__dirname, '../data/myntra_extracted_db.json');
  assert.ok(fs.existsSync(dbPath), 'myntra_extracted_db.json must exist');

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const opportunities = calculateOpportunityScores(db);

  assert.ok(opportunities.length > 0, 'Must produce opportunities from real DB');
  console.log(`\n  Discovered Top Opportunity: "${opportunities[0].opportunity}" (Score: ${opportunities[0].opportunity_score})`);
  console.log(`  Dominant Segment: ${opportunities[0].segment_concentration}`);
  console.log(`  Frequency: ${opportunities[0].metric_levels.frequency} | Severity: ${opportunities[0].metric_levels.severity} | Workarounds: ${opportunities[0].metric_levels.workaround_intensity}`);
});

console.log('--------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('--------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('Phase 3 Opportunity Engine & Clustering verified successfully!');
}
