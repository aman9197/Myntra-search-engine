/**
 * Test Suite for Schema Validation Core (Phase 1)
 * Tests schema compliance, null fallback rules, and zero-hallucination sanitization.
 */

const assert = require('assert');
const { validateAndSanitizeRecord, deriveEvidenceStrength } = require('../engine/schema');

console.log('--------------------------------------------------');
console.log('RUNNING PHASE 1 TEST SUITE: Schema Core Validation');
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

// Test 1: Full Valid Record Validation
runTest('Should correctly validate and normalize a complete 20-attribute record', () => {
  const rawInput = {
    source: 'Reddit',
    source_url: 'https://reddit.com/r/IndianFashionAddicts/comments/1234',
    date: '2026-08-20T10:00:00Z',
    text: 'I saved size M dress on Myntra during EORS, but didn\'t buy because I was unsure if it would fit my waist. Checked Instagram for try-ons.',
    relevance_score: 0.95,
    user_intent: 'Wishlisted during sale for purchase evaluation',
    wishlist_behavior: 'Sale shortlisting',
    purchase_status: 'Abandoned due to fit uncertainty',
    purchase_barrier: 'Size & Silhouette Uncertainty',
    uncertainty: 'Waist fit accuracy in size M',
    information_needed: ['Real customer try-on photos', 'Waist measurement chart'],
    alternative_considered: 'Ajio dress',
    external_research: ['Instagram try-on reels'],
    workaround: 'Left Myntra app to search Instagram',
    user_segment: 'Gen Z / Myntra FWD',
    fashion_category: 'Westernwear',
    journey_stage: 'Wishlist -> External Research -> Abandonment',
    sentiment: 'Neutral',
    evidence_strength: 'High',
    theme: 'Fit & Size Uncertainty',
    sub_theme: 'Silhouette Doubt'
  };

  const result = validateAndSanitizeRecord(rawInput);
  assert.strictEqual(result.source, 'Reddit');
  assert.strictEqual(result.relevance_score, 0.95);
  assert.strictEqual(result.evidence_strength, 'High');
  assert.strictEqual(result.alternative_considered, 'Ajio dress');
  assert.strictEqual(result.theme, 'Fit & Size Uncertainty');
  assert.deepStrictEqual(result.information_needed, ['Real customer try-on photos', 'Waist measurement chart']);
});

// Test 2: Null Fallback Rule & Zero-Hallucination
runTest('Should enforce strict null fallback for unmentioned attributes', () => {
  const partialInput = {
    source: 'App Store',
    text: 'I added 2 kurtas to my wishlist but didn\'t buy because there were no fabric details.',
    user_intent: 'Wishlist bookmarking'
  };

  const result = validateAndSanitizeRecord(partialInput);
  assert.strictEqual(result.source, 'App Store');
  assert.strictEqual(result.user_intent, 'Wishlist bookmarking');
  assert.strictEqual(result.alternative_considered, null, 'Unmentioned alternative_considered must default to null');
  assert.strictEqual(result.uncertainty, null, 'Unmentioned uncertainty must default to null');
  assert.strictEqual(result.external_research, null, 'Unmentioned external_research must default to null');
  assert.strictEqual(result.workaround, null, 'Unmentioned workaround must default to null');
  assert.strictEqual(result.evidence_strength, 'High', 'First-person text ("I added") should auto-derive High evidence strength');
});

// Test 3: String "null" and Empty String Sanitization
runTest('Should sanitize string "null", empty strings, and empty arrays to null', () => {
  const messyInput = {
    text: 'Myntra app is good but wishlist items get out of stock quickly.',
    source: 'Play Store',
    alternative_considered: 'null',
    uncertainty: '   ',
    information_needed: ['  '],
    external_research: []
  };

  const result = validateAndSanitizeRecord(messyInput);
  assert.strictEqual(result.alternative_considered, null);
  assert.strictEqual(result.uncertainty, null);
  assert.strictEqual(result.information_needed, null);
  assert.strictEqual(result.external_research, null);
});

// Test 4: Evidence Strength Auto-Derivation
runTest('Should correctly derive evidence strength based on first-person statement vs general commentary', () => {
  const directText = 'I saved size S sneakers on Myntra but abandoned them.';
  const genericText = 'Myntra app should fix their sizing recommendations.';

  assert.strictEqual(deriveEvidenceStrength(directText), 'High');
  assert.strictEqual(deriveEvidenceStrength(genericText), 'Low');
});

// Test 5: Validation Error on Missing Required Text
runTest('Should throw an error if record text is missing or empty', () => {
  assert.throws(() => {
    validateAndSanitizeRecord({ source: 'Reddit' });
  }, /field is required/);
});

console.log('--------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('--------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('Phase 1 Schema Validation Core verified successfully!');
}
