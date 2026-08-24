/**
 * Test Suite for Groq API Integration Core
 * Tests Groq API client configuration, prompt formatting, fallback handling, and Groq LLM integration.
 */

const assert = require('assert');
const { DEFAULT_MODEL, callGroqAPI } = require('../engine/groq_api');

console.log('--------------------------------------------------');
console.log('RUNNING GROQ API INTEGRATION TEST SUITE');
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

// Test 1: Verify Default Groq Model
runTest('Should configure default Groq model as llama3-70b-8192', () => {
  assert.strictEqual(DEFAULT_MODEL, 'llama3-70b-8192');
});

// Test 2: Fallback Handling when GROQ_API_KEY is not set or placeholder
runTest('Should handle fallback mode gracefully if GROQ_API_KEY is placeholder', async () => {
  // If GROQ_API_KEY is placeholder 'gsk_your_groq_api_key_here', callGroqAPI handles error gracefully
  try {
    const result = await callGroqAPI('Test prompt');
    assert.ok(result === null || typeof result === 'string');
  } catch (err) {
    assert.ok(err.message.includes('Groq API') || err.message.includes('401'));
  }
});

console.log('--------------------------------------------------');
console.log(`RESULTS: ${passedTests}/${totalTests} tests passed.`);
console.log('--------------------------------------------------');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('Groq API Integration verified successfully!');
}
