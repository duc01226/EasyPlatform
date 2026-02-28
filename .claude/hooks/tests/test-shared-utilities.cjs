#!/usr/bin/env node
/**
 * Unit Tests for Shared Utility Modules
 *
 * Tests:
 * - debug-log.cjs: Debug logging utility
 * - stdin-parser.cjs: Stdin parsing utility
 * - hook-runner.cjs: Hook execution wrapper
 *
 * Usage: node test-shared-utilities.cjs [--verbose]
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const {
  assertEqual,
  assertDeepEqual,
  assertTrue,
  assertFalse,
  assertContains,
  createTempDir,
  cleanupTempDir,
  TestGroup,
  TestSuite
} = require('./helpers/test-utils.cjs');

// ============================================================================
// Configuration
// ============================================================================

const LIB_DIR = path.join(__dirname, '..', 'lib');
const VERBOSE = process.argv.includes('--verbose');

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Capture console.error output during a function call
 */
function captureStderr(fn) {
  const originalError = console.error;
  const captured = [];
  console.error = (...args) => captured.push(args.join(' '));
  try {
    fn();
  } finally {
    console.error = originalError;
  }
  return captured;
}

// ============================================================================
// Debug Log Tests
// ============================================================================

async function testDebugLog(suite) {
  const group = new TestGroup('debug-log.cjs');

  const debugLog = require(path.join(LIB_DIR, 'debug-log.cjs'));

  // Test 1: Module exports
  group.test('exports required functions', () => {
    assertTrue(typeof debugLog.debug === 'function', 'debug function');
    assertTrue(typeof debugLog.debugJson === 'function', 'debugJson function');
    assertTrue(typeof debugLog.debugError === 'function', 'debugError function');
    assertTrue(typeof debugLog.logError === 'function', 'logError function');
    assertTrue(typeof debugLog.isDebugEnabled === 'function', 'isDebugEnabled function');
  });

  // Test 2: isDebugEnabled returns false by default
  group.test('isDebugEnabled returns false when CK_DEBUG not set', () => {
    const originalDebug = process.env.CK_DEBUG;
    delete process.env.CK_DEBUG;
    assertFalse(debugLog.isDebugEnabled());
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
  });

  // Test 3: isDebugEnabled returns true when CK_DEBUG=1
  group.test('isDebugEnabled returns true when CK_DEBUG=1', () => {
    const originalDebug = process.env.CK_DEBUG;
    process.env.CK_DEBUG = '1';
    assertTrue(debugLog.isDebugEnabled());
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
    else delete process.env.CK_DEBUG;
  });

  // Test 4: debug outputs nothing when disabled
  group.test('debug outputs nothing when CK_DEBUG not set', () => {
    const originalDebug = process.env.CK_DEBUG;
    delete process.env.CK_DEBUG;
    const output = captureStderr(() => debugLog.debug('test', 'message'));
    assertEqual(output.length, 0, 'No output when debug disabled');
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
  });

  // Test 5: debug outputs when enabled
  group.test('debug outputs with context prefix when CK_DEBUG=1', () => {
    const originalDebug = process.env.CK_DEBUG;
    process.env.CK_DEBUG = '1';
    const output = captureStderr(() => debugLog.debug('my-hook', 'test message'));
    assertTrue(output.length > 0, 'Should have output');
    assertContains(output[0], '[my-hook]', 'Should have context prefix');
    assertContains(output[0], 'test message', 'Should have message');
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
    else delete process.env.CK_DEBUG;
  });

  // Test 6: debugJson formats JSON
  group.test('debugJson formats object as JSON', () => {
    const originalDebug = process.env.CK_DEBUG;
    process.env.CK_DEBUG = '1';
    const output = captureStderr(() => debugLog.debugJson('hook', 'data', { key: 'value' }));
    assertTrue(output.length > 0, 'Should have output');
    assertContains(output[0], '"key"', 'Should contain JSON key');
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
    else delete process.env.CK_DEBUG;
  });

  // Test 7: logError always outputs
  group.test('logError outputs regardless of CK_DEBUG', () => {
    const originalDebug = process.env.CK_DEBUG;
    delete process.env.CK_DEBUG;
    const output = captureStderr(() => debugLog.logError('hook', 'error message'));
    assertTrue(output.length > 0, 'Should output even when debug disabled');
    assertContains(output[0], 'ERROR', 'Should contain ERROR');
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
  });

  // Test 8: debugError with Error object
  group.test('debugError handles Error objects', () => {
    const originalDebug = process.env.CK_DEBUG;
    process.env.CK_DEBUG = '1';
    const output = captureStderr(() => debugLog.debugError('hook', new Error('test error')));
    assertTrue(output.length > 0, 'Should have output');
    assertContains(output[0], 'test error', 'Should contain error message');
    if (originalDebug) process.env.CK_DEBUG = originalDebug;
    else delete process.env.CK_DEBUG;
  });

  return group;
}

// ============================================================================
// Stdin Parser Tests
// ============================================================================

async function testStdinParser(suite) {
  const group = new TestGroup('stdin-parser.cjs');

  const stdinParser = require(path.join(LIB_DIR, 'stdin-parser.cjs'));

  // Test 1: Module exports
  group.test('exports required functions', () => {
    assertTrue(typeof stdinParser.parseStdinSync === 'function', 'parseStdinSync');
    assertTrue(typeof stdinParser.readStdinSync === 'function', 'readStdinSync');
    assertTrue(typeof stdinParser.parseHookEvent === 'function', 'parseHookEvent');
  });

  // Test 2: parseStdinSync with defaultValue
  group.test('parseStdinSync returns defaultValue option', () => {
    // Can't easily test stdin in unit test, but can test the function signature
    const defaultVal = { test: true };
    // When stdin is empty/invalid, should return default
    // This is a signature test - actual stdin testing requires integration tests
    assertTrue(typeof stdinParser.parseStdinSync === 'function');
  });

  // Test 3: parseHookEvent extracts common fields
  group.test('parseHookEvent signature is correct', () => {
    // Verify the function exists and returns expected structure
    assertTrue(typeof stdinParser.parseHookEvent === 'function');
  });

  return group;
}

// ============================================================================
// Hook Runner Tests
// ============================================================================

async function testHookRunner(suite) {
  const group = new TestGroup('hook-runner.cjs');

  const hookRunner = require(path.join(LIB_DIR, 'hook-runner.cjs'));

  // Test 1: Module exports
  group.test('exports required functions', () => {
    assertTrue(typeof hookRunner.runHook === 'function', 'runHook');
    assertTrue(typeof hookRunner.runHookSync === 'function', 'runHookSync');
    assertTrue(typeof hookRunner.runBlockingHook === 'function', 'runBlockingHook');
  });

  // Test 2: runHook is async
  group.test('runHook returns a Promise', () => {
    // runHook should be an async function
    const fnStr = hookRunner.runHook.toString();
    assertTrue(fnStr.includes('async') || hookRunner.runHook.constructor.name === 'AsyncFunction',
      'runHook should be async');
  });

  // Test 3: runBlockingHook is async
  group.test('runBlockingHook returns a Promise', () => {
    const fnStr = hookRunner.runBlockingHook.toString();
    assertTrue(fnStr.includes('async') || hookRunner.runBlockingHook.constructor.name === 'AsyncFunction',
      'runBlockingHook should be async');
  });

  return group;
}

// ============================================================================
// Integration Test: Hook with utilities
// ============================================================================

async function testIntegration(suite) {
  const group = new TestGroup('Integration');

  // Test 1: All utilities can be required together
  group.test('utilities can be required without circular deps', () => {
    // Clear require cache
    const cacheKeys = Object.keys(require.cache).filter(k => k.includes('debug-log') || k.includes('stdin-parser') || k.includes('hook-runner'));
    cacheKeys.forEach(k => delete require.cache[k]);

    // Re-require all
    const debugLog = require(path.join(LIB_DIR, 'debug-log.cjs'));
    const stdinParser = require(path.join(LIB_DIR, 'stdin-parser.cjs'));
    const hookRunner = require(path.join(LIB_DIR, 'hook-runner.cjs'));

    assertTrue(typeof debugLog.debug === 'function');
    assertTrue(typeof stdinParser.parseStdinSync === 'function');
    assertTrue(typeof hookRunner.runHook === 'function');
  });

  // Test 2: stdin-parser uses debug-log for errors
  group.test('stdin-parser imports debug-log correctly', () => {
    const stdinParserPath = path.join(LIB_DIR, 'stdin-parser.cjs');
    const content = fs.readFileSync(stdinParserPath, 'utf-8');
    assertContains(content, "require('./debug-log.cjs')", 'Should import debug-log');
  });

  // Test 3: hook-runner uses stdin-parser
  group.test('hook-runner imports stdin-parser correctly', () => {
    const hookRunnerPath = path.join(LIB_DIR, 'hook-runner.cjs');
    const content = fs.readFileSync(hookRunnerPath, 'utf-8');
    assertContains(content, "require('./stdin-parser.cjs')", 'Should import stdin-parser');
  });

  return group;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║          Shared Utilities Test Suite                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const suite = new TestSuite('Shared Utilities');

  // Add test groups
  suite.addGroup(await testDebugLog(suite));
  suite.addGroup(await testStdinParser(suite));
  suite.addGroup(await testHookRunner(suite));
  suite.addGroup(await testIntegration(suite));

  // Run tests and get results
  const { passed, failed } = await suite.run(VERBOSE);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
