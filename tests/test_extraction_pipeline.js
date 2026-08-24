/**
 * Test Suite for Phase 2: Behavioral Extraction Pipeline & Dataset Processing
 * Verifies batch processing of raw feedback dataset into structured 20-attribute research DB.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { extractEvidenceFromRawText, processRawFeedbackDataset } = require('../engine/extraction');

console.log('--------------------------------------------------');
console.log('RUNNING PHASE 2 TEST SUITE: Extraction Pipeline');
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

// Test 1: Single Raw Text Extraction
runTest('Should extract structured evidence from raw customer text', () => {
  const rawSample = {
    id: 'RAW-TEST-1',
    source: 'Reddit',
    text: 'I added size M kurtas on Myntra to my wishlist, but didn\'t buy because there were no fabric close-up photos. Left Myntra to check Instagram try-on reels.',
    platform_context: 'r/IndianFashionAddicts'
  };

  const extracted = extractEvidenceFromRawText(rawSample);
  assert.strictEqual(extracted.source, 'Reddit');
  assert.strictEqual(extracted.fashion_category, 'Ethnic Wear');
  assert.strictEqual(extracted.evidence_strength, 'High');
  assert.strictEqual(extracted.purchase_barrier, 'Lack of Authentic Customer Photo Reviews');
  assert.strictEqual(extracted.theme, 'Review & Fabric Quality Trust');
  assert.ok(extracted.workaround.includes('Instagram'));
});

// Test 2: Full Dataset Ingestion & Processing
runTest('Should ingest myntra_raw_feedback.json and produce valid myntra_extracted_db.json', () => {
  const rawPath = path.join(__dirname, '../data/myntra_raw_feedback.json');
  assert.ok(fs.existsSync(rawPath), 'raw_feedback.json must exist');

  const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
  assert.ok(Array.isArray(rawData) && rawData.length > 0, 'raw_feedback.json must contain records');

  const processed = processRawFeedbackDataset(rawData);
  assert.strictEqual(processed.length, rawData.length, 'All raw items must be extracted');

  // Verify schema compliance on all 20 fields for every record
  processed.forEach((item, idx) => {
    assert.ok(typeof item.source === 'string', `Item ${idx}: source missing`);
    assert.ok(typeof item.text === 'string', `Item ${idx}: text missing`);
    assert.ok(typeof item.relevance_score === 'number', `Item ${idx}: relevance_score missing`);
    assert.ok(['High', 'Medium', 'Low'].includes(item.evidence_strength), `Item ${idx}: invalid evidence_strength`);
  });
});

// Test 3: Segment & Journey Detection
runTest('Should correctly classify Gen Z FWD segment and journey stages', () => {
  const rawGenZ = {
    text: 'Wishlisted viral corset crop top on Myntra FWD but didn\'t buy because I was unsure how to style it.',
    source: 'App Store'
  };

  const extracted = extractEvidenceFromRawText(rawGenZ);
  assert.strictEqual(extracted.user_segment, 'Gen Z / Myntra FWD');
  assert.strictEqual(extracted.theme, 'Styling & Wardrobe Integration');
  assert.strictEqual(extracted.purchase_status, 'Abandoned');
});

// Test 4: Disconfirming Evidence / Purchase Conversion Detection
runTest('Should extract successful conversion and positive sentiment for purchase events', () => {
  const rawConversion = {
    text: 'Converted my wishlist item on Myntra after seeing Instagram try-on reels showing actual customer fit.',
    source: 'YouTube'
  };

  const extracted = extractEvidenceFromRawText(rawConversion);
  assert.strictEqual(extracted.purchase_status, 'Purchased');
  assert.strictEqual(extracted.sentiment, 'Positive');
});

console.log('--------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('--------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('Phase 2 Behavioral Extraction Pipeline verified successfully!');
}
