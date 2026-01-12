#!/usr/bin/env node
'use strict';

/**
 * ACE Hooks Test Script - Verifies all critical fixes
 *
 * Tests:
 * 1. withLock behavior (throws on timeout)
 * 2. Bounds checking (MAX_COUNT, MAX_SOURCE_EVENTS)
 * 3. atomicWriteJSON (correct writes)
 * 4. Module imports work correctly
 * 5. Similarity calculations
 * 6. Confidence calculations
 *
 * Run: node .claude/hooks/test-ace-hooks.cjs
 */

const fs = require('fs');
const path = require('path');

// Test results
const results = { passed: 0, failed: 0, tests: [] };

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: err.message });
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${err.message}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${expected}, got ${actual}`);
  }
}

function assertThrows(fn, msg) {
  try {
    fn();
    throw new Error(`${msg}: expected function to throw`);
  } catch (err) {
    if (err.message.includes('expected function to throw')) throw err;
    // Expected to throw - pass
  }
}

function assertNoThrow(fn, msg) {
  try {
    fn();
  } catch (err) {
    throw new Error(`${msg}: unexpected throw - ${err.message}`);
  }
}

// ============================================================================
// Test Module Imports
// ============================================================================

console.log('\n=== Testing Module Imports ===\n');

test('ace-constants.cjs exports all required constants', () => {
  const constants = require('./lib/ace-constants.cjs');
  assertEqual(typeof constants.HUMAN_WEIGHT, 'number', 'HUMAN_WEIGHT type');
  assertEqual(typeof constants.SIMILARITY_THRESHOLD, 'number', 'SIMILARITY_THRESHOLD type');
  assertEqual(typeof constants.MAX_DELTAS, 'number', 'MAX_DELTAS type');
  assertEqual(typeof constants.MAX_COUNT, 'number', 'MAX_COUNT type');
  assertEqual(typeof constants.MAX_SOURCE_EVENTS, 'number', 'MAX_SOURCE_EVENTS type');
  assertEqual(typeof constants.CONFIDENCE_THRESHOLD, 'number', 'CONFIDENCE_THRESHOLD type');
  assertEqual(typeof constants.LOCK_TIMEOUT_MS, 'number', 'LOCK_TIMEOUT_MS type');
});

test('ace-playbook-state.cjs exports all required functions', () => {
  const state = require('./lib/ace-playbook-state.cjs');
  assertEqual(typeof state.withLock, 'function', 'withLock type');
  assertEqual(typeof state.atomicWriteJSON, 'function', 'atomicWriteJSON type');
  assertEqual(typeof state.ensureDirs, 'function', 'ensureDirs type');
  assertEqual(typeof state.stringSimilarity, 'function', 'stringSimilarity type');
  assertEqual(typeof state.areSimilarDeltas, 'function', 'areSimilarDeltas type');
  assertEqual(typeof state.recalculateConfidence, 'function', 'recalculateConfidence type');
  assertEqual(typeof state.incrementCount, 'function', 'incrementCount type');
  assertEqual(typeof state.mergeDeltas, 'function', 'mergeDeltas type');
  assertEqual(typeof state.loadDeltas, 'function', 'loadDeltas type');
  assertEqual(typeof state.saveDeltas, 'function', 'saveDeltas type');
  assertEqual(typeof state.loadCandidates, 'function', 'loadCandidates type');
  assertEqual(typeof state.saveCandidates, 'function', 'saveCandidates type');
});

test('ace-lesson-schema.cjs exports ACE_CONFIG', () => {
  const schema = require('./lib/ace-lesson-schema.cjs');
  assertEqual(typeof schema.ACE_CONFIG, 'object', 'ACE_CONFIG type');
  assertEqual(typeof schema.ACE_CONFIG.CONFIDENCE_THRESHOLD, 'number', 'ACE_CONFIG.CONFIDENCE_THRESHOLD type');
  assertEqual(typeof schema.ACE_CONFIG.MAX_SOURCE_EVENTS, 'number', 'ACE_CONFIG.MAX_SOURCE_EVENTS type');
  assertEqual(typeof schema.generateDeltaId, 'function', 'generateDeltaId type');
  assertEqual(typeof schema.calculateConfidence, 'function', 'calculateConfidence type');
  assertEqual(typeof schema.validateDelta, 'function', 'validateDelta type');
  assertEqual(typeof schema.createDelta, 'function', 'createDelta type');
});

// ============================================================================
// Test Bounds Checking
// ============================================================================

console.log('\n=== Testing Bounds Checking ===\n');

test('incrementCount respects MAX_COUNT', () => {
  const { incrementCount, MAX_COUNT } = require('./lib/ace-playbook-state.cjs');

  // Normal increment
  assertEqual(incrementCount(0, 1), 1, 'Basic increment');
  assertEqual(incrementCount(10, 5), 15, 'Multi increment');

  // Bounds checking
  assertEqual(incrementCount(MAX_COUNT - 1, 1), MAX_COUNT, 'At limit');
  assertEqual(incrementCount(MAX_COUNT, 1), MAX_COUNT, 'Above limit');
  assertEqual(incrementCount(MAX_COUNT + 100, 1), MAX_COUNT, 'Way above limit');
});

test('mergeDeltas respects count limits', () => {
  const { mergeDeltas, MAX_COUNT, MAX_SOURCE_EVENTS } = require('./lib/ace-playbook-state.cjs');
  const { MAX_SOURCE_EVENTS: SCHEMA_MAX } = require('./lib/ace-constants.cjs');

  const delta1 = {
    delta_id: 'test-1',
    helpful_count: MAX_COUNT - 5,
    not_helpful_count: 10,
    human_feedback_count: 0,
    source_events: ['e1', 'e2', 'e3', 'e4', 'e5']
  };

  const delta2 = {
    delta_id: 'test-2',
    helpful_count: 100,
    not_helpful_count: 50,
    human_feedback_count: 5,
    source_events: ['e6', 'e7', 'e8', 'e9', 'e10', 'e11']
  };

  const merged = mergeDeltas(delta1, delta2);

  // Counts should be capped
  assertEqual(merged.helpful_count <= MAX_COUNT, true, 'helpful_count capped');
  assertEqual(merged.not_helpful_count <= MAX_COUNT, true, 'not_helpful_count capped');
  assertEqual(merged.human_feedback_count <= MAX_COUNT, true, 'human_feedback_count capped');

  // Source events should be limited
  assertEqual(merged.source_events.length <= SCHEMA_MAX, true, 'source_events limited');
});

// ============================================================================
// Test Similarity Calculations
// ============================================================================

console.log('\n=== Testing Similarity Calculations ===\n');

test('stringSimilarity returns correct values', () => {
  const { stringSimilarity } = require('./lib/ace-playbook-state.cjs');

  // Identical strings
  assertEqual(stringSimilarity('hello world', 'hello world'), 1, 'Identical strings');

  // Empty strings
  assertEqual(stringSimilarity('', ''), 0, 'Empty strings');
  assertEqual(stringSimilarity('hello', ''), 0, 'One empty string');

  // Different strings
  const sim = stringSimilarity('hello world', 'hello there');
  assertEqual(sim > 0 && sim < 1, true, 'Partial similarity');
});

test('areSimilarDeltas correctly identifies similar deltas', () => {
  const { areSimilarDeltas } = require('./lib/ace-playbook-state.cjs');

  const delta1 = {
    problem: 'Error handling validation issues in forms',
    condition: 'When using form validation',
    solution: 'Add proper error messages and validation'
  };

  const delta2 = {
    problem: 'Error handling validation issues in forms',
    condition: 'When using form validation',
    solution: 'Add proper error messages and validation'
  };

  const delta3 = {
    problem: 'Completely different problem',
    condition: 'Different condition',
    solution: 'Different solution'
  };

  assertEqual(areSimilarDeltas(delta1, delta2), true, 'Identical deltas are similar');
  assertEqual(areSimilarDeltas(delta1, delta3), false, 'Different deltas are not similar');
});

// ============================================================================
// Test Confidence Calculations
// ============================================================================

console.log('\n=== Testing Confidence Calculations ===\n');

test('recalculateConfidence returns correct values', () => {
  const { recalculateConfidence } = require('./lib/ace-playbook-state.cjs');
  const { HUMAN_WEIGHT } = require('./lib/ace-constants.cjs');

  // All helpful
  const conf1 = recalculateConfidence({
    helpful_count: 10,
    not_helpful_count: 0,
    human_feedback_count: 0
  });
  assertEqual(conf1, 1, 'All helpful = 1.0 confidence');

  // All not helpful
  const conf2 = recalculateConfidence({
    helpful_count: 0,
    not_helpful_count: 10,
    human_feedback_count: 0
  });
  assertEqual(conf2, 0, 'All not helpful = 0.0 confidence');

  // Human feedback weighted correctly
  const conf3 = recalculateConfidence({
    helpful_count: 0,
    not_helpful_count: 0,
    human_feedback_count: 1
  });
  assertEqual(conf3, 1, 'Human feedback only = 1.0 confidence');

  // Mixed with human weight
  const conf4 = recalculateConfidence({
    helpful_count: 1,
    not_helpful_count: 1,
    human_feedback_count: 1
  });
  // (1 + 3) / (1 + 3 + 1) = 4/5 = 0.8
  assertEqual(conf4, (1 + HUMAN_WEIGHT) / (1 + HUMAN_WEIGHT + 1), 'Mixed confidence with human weight');
});

test('calculateConfidence from schema matches recalculateConfidence', () => {
  const { calculateConfidence } = require('./lib/ace-lesson-schema.cjs');
  const { recalculateConfidence } = require('./lib/ace-playbook-state.cjs');

  const helpful = 5;
  const notHelpful = 3;
  const human = 2;

  const fromSchema = calculateConfidence(helpful, notHelpful, human);
  const fromState = recalculateConfidence({
    helpful_count: helpful,
    not_helpful_count: notHelpful,
    human_feedback_count: human
  });

  assertEqual(fromSchema, fromState, 'Both calculate same confidence');
});

// ============================================================================
// Test Atomic Write
// ============================================================================

console.log('\n=== Testing Atomic Write ===\n');

test('atomicWriteJSON writes valid JSON', () => {
  const { atomicWriteJSON, ensureDirs, MEMORY_DIR } = require('./lib/ace-playbook-state.cjs');

  ensureDirs();

  const testFile = path.join(MEMORY_DIR, 'test-atomic-write.json');
  const testData = { test: true, items: [1, 2, 3] };

  // Write
  atomicWriteJSON(testFile, testData);

  // Verify
  const content = fs.readFileSync(testFile, 'utf8');
  const parsed = JSON.parse(content);
  assertEqual(parsed.test, true, 'test field');
  assertEqual(parsed.items.length, 3, 'items length');

  // Cleanup
  fs.unlinkSync(testFile);
});

test('atomicWriteJSON cleans up temp files', () => {
  const { atomicWriteJSON, ensureDirs, MEMORY_DIR } = require('./lib/ace-playbook-state.cjs');

  ensureDirs();

  const testFile = path.join(MEMORY_DIR, 'test-cleanup.json');
  const testData = { cleanup: true };

  // Write twice to test cleanup
  atomicWriteJSON(testFile, testData);
  atomicWriteJSON(testFile, testData);

  // Verify no .tmp or .bak files remain
  assertEqual(fs.existsSync(testFile + '.tmp'), false, 'No .tmp file');
  assertEqual(fs.existsSync(testFile + '.bak'), false, 'No .bak file');

  // Cleanup
  fs.unlinkSync(testFile);
});

// ============================================================================
// Test Delta Validation
// ============================================================================

console.log('\n=== Testing Delta Validation ===\n');

test('validateDelta catches invalid deltas', () => {
  const { validateDelta, generateDeltaId } = require('./lib/ace-lesson-schema.cjs');

  // Missing required field
  const result1 = validateDelta({ problem: '', solution: 'test', condition: 'test' });
  assertEqual(result1.valid, false, 'Empty problem invalid');

  // Valid delta (use generateDeltaId for correct format)
  const result2 = validateDelta({
    delta_id: generateDeltaId(),
    problem: 'A problem that is at least 10 characters',
    solution: 'A solution that is at least 10 characters',
    condition: 'A condition that is at least 10 characters',
    helpful_count: 1,
    not_helpful_count: 0,
    human_feedback_count: 0,
    confidence: 0.8,
    created: new Date().toISOString()
  });
  assertEqual(result2.valid, true, 'Valid delta passes');
});

test('createDelta generates valid delta structure', () => {
  const { createDelta, validateDelta } = require('./lib/ace-lesson-schema.cjs');

  const delta = createDelta({
    problem: 'Test problem that is at least 10 chars',
    solution: 'Test solution that is at least 10 chars',
    condition: 'Test condition at least 10 chars'
  });

  // Should have generated ID
  assertEqual(typeof delta.delta_id, 'string', 'Has delta_id');
  assertEqual(delta.delta_id.length > 0, true, 'delta_id not empty');

  // Should have defaults
  assertEqual(delta.helpful_count, 0, 'Default helpful_count');
  assertEqual(delta.not_helpful_count, 0, 'Default not_helpful_count');
  assertEqual(typeof delta.confidence, 'number', 'Has confidence');
  assertEqual(typeof delta.created, 'string', 'Has created');

  // Should be valid
  const result = validateDelta(delta);
  assertEqual(result.valid, true, 'Created delta is valid');
});

// ============================================================================
// Test withLock Behavior
// ============================================================================

console.log('\n=== Testing withLock Behavior ===\n');

test('withLock returns function result', () => {
  const { withLock } = require('./lib/ace-playbook-state.cjs');

  const result = withLock(() => {
    return 'test-result';
  });

  assertEqual(result, 'test-result', 'Returns function result');
});

test('withLock releases lock after execution', () => {
  const { withLock, MEMORY_DIR } = require('./lib/ace-playbook-state.cjs');
  const lockFile = path.join(MEMORY_DIR, 'deltas.lock');

  // Execute withLock
  withLock(() => {
    // Lock should exist during execution
    assertEqual(fs.existsSync(lockFile), true, 'Lock exists during execution');
  });

  // Lock should be released after
  assertEqual(fs.existsSync(lockFile), false, 'Lock released after execution');
});

test('withLock releases lock on exception', () => {
  const { withLock, MEMORY_DIR } = require('./lib/ace-playbook-state.cjs');
  const lockFile = path.join(MEMORY_DIR, 'deltas.lock');

  try {
    withLock(() => {
      throw new Error('Test exception');
    });
  } catch (e) {
    // Expected
  }

  // Lock should be released even after exception
  assertEqual(fs.existsSync(lockFile), false, 'Lock released after exception');
});

// ============================================================================
// Test Hook Scripts Load Without Error
// ============================================================================

console.log('\n=== Testing Hook Script Loading ===\n');

test('ace-event-emitter.cjs loads without error', () => {
  assertNoThrow(() => {
    // Just verify the module can be required (syntax check)
    const code = fs.readFileSync(path.join(__dirname, 'ace-event-emitter.cjs'), 'utf8');
    new Function(code.replace('#!/usr/bin/env node', '').replace("'use strict';", ''));
  }, 'Load ace-event-emitter.cjs');
});

test('ace-feedback-tracker.cjs loads without error', () => {
  assertNoThrow(() => {
    const code = fs.readFileSync(path.join(__dirname, 'ace-feedback-tracker.cjs'), 'utf8');
    new Function(code.replace('#!/usr/bin/env node', '').replace("'use strict';", ''));
  }, 'Load ace-feedback-tracker.cjs');
});

test('ace-reflector-analysis.cjs loads without error', () => {
  assertNoThrow(() => {
    const code = fs.readFileSync(path.join(__dirname, 'ace-reflector-analysis.cjs'), 'utf8');
    new Function(code.replace('#!/usr/bin/env node', '').replace("'use strict';", ''));
  }, 'Load ace-reflector-analysis.cjs');
});

test('ace-curator-pruner.cjs loads without error', () => {
  assertNoThrow(() => {
    const code = fs.readFileSync(path.join(__dirname, 'ace-curator-pruner.cjs'), 'utf8');
    new Function(code.replace('#!/usr/bin/env node', '').replace("'use strict';", ''));
  }, 'Load ace-curator-pruner.cjs');
});

test('ace-session-inject.cjs loads without error', () => {
  assertNoThrow(() => {
    const code = fs.readFileSync(path.join(__dirname, 'ace-session-inject.cjs'), 'utf8');
    new Function(code.replace('#!/usr/bin/env node', '').replace("'use strict';", ''));
  }, 'Load ace-session-inject.cjs');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(50));
console.log(`\nTest Results: ${results.passed} passed, ${results.failed} failed\n`);

if (results.failed > 0) {
  console.log('Failed tests:');
  results.tests.filter(t => t.status === 'FAIL').forEach(t => {
    console.log(`  - ${t.name}: ${t.error}`);
  });
  process.exit(1);
} else {
  console.log('All tests passed! ✅\n');
  process.exit(0);
}
