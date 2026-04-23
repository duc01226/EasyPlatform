#!/usr/bin/env node
'use strict';

/**
 * Tests for context-tracker.cjs marker infrastructure
 *
 * Scope: marker infrastructure only
 * - Only marker read/write/delete + clearAllState survive
 * - Tool-count + baseline + calibration subsystems removed
 *
 * Fixes #178: Tests use /tmp/ck/ namespace
 */

const {
  clearAllState,
  readMarker,
  writeMarker,
  deleteMarker
} = require('../lib/context-tracker.cjs');

const { MARKERS_DIR, ensureDir, getMarkerPath } = require('../lib/ck-paths.cjs');

const fs = require('fs');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} Expected ${expected}, got ${actual}`);
  }
}

function assertTrue(condition, msg = '') {
  if (!condition) {
    throw new Error(msg || 'Assertion failed');
  }
}

// Clean up before tests
clearAllState();

console.log('\n=== Namespace Verification (#178) ===\n');

test('MARKERS_DIR uses /tmp/ck/ namespace', () => {
  assertTrue(
    MARKERS_DIR.includes('/ck/') || MARKERS_DIR.includes('\\ck\\'),
    `MARKERS_DIR should use /ck/ namespace: ${MARKERS_DIR}`
  );
});

console.log('\n=== Marker Infrastructure: read/write/delete ===\n');

test('writeMarker creates marker with sessionId and trigger', () => {
  const marker = {
    sessionId: 'write-test',
    trigger: 'manual',
    timestamp: Date.now()
  };
  writeMarker('write-test', marker);
  const read = readMarker('write-test');
  assertTrue(read !== null, 'Marker should be readable');
  assertEqual(read.sessionId, 'write-test', 'sessionId should round-trip');
  assertEqual(read.trigger, 'manual', 'trigger should round-trip');
  deleteMarker('write-test');
});

test('writeMarker preserves compactState.gitStatus (preservation invariant)', () => {
  const marker = {
    sessionId: 'git-status-test',
    trigger: 'manual',
    timestamp: Date.now(),
    compactState: { gitStatus: 'M foo.cs\n?? bar.cs', warningShown: false }
  };
  writeMarker('git-status-test', marker);
  const read = readMarker('git-status-test');
  assertTrue(read !== null, 'Marker should be readable');
  assertEqual(read.compactState.gitStatus, 'M foo.cs\n?? bar.cs', 'gitStatus must be preserved');
  assertEqual(read.compactState.warningShown, false, 'warningShown must be preserved');
  deleteMarker('git-status-test');
});

test('readMarker returns null for missing session', () => {
  const marker = readMarker('does-not-exist');
  assertEqual(marker, null, 'Missing marker should return null');
});

test('deleteMarker removes marker file', () => {
  writeMarker('delete-test', { sessionId: 'delete-test', trigger: 'manual', timestamp: Date.now() });
  assertTrue(readMarker('delete-test') !== null, 'Marker should exist before delete');
  deleteMarker('delete-test');
  assertEqual(readMarker('delete-test'), null, 'Marker should be null after delete');
});

test('deleteMarker is idempotent (no throw on missing file)', () => {
  deleteMarker('never-existed');
  // Should not throw
  assertTrue(true, 'deleteMarker must swallow missing-file errors');
});

console.log('\n=== Robustness: Corrupt/Missing Files ===\n');

test('readMarker handles corrupt JSON gracefully', () => {
  ensureDir(MARKERS_DIR);
  fs.writeFileSync(getMarkerPath('corrupt'), 'not valid json{{{');
  const marker = readMarker('corrupt');
  assertEqual(marker, null, 'Corrupt JSON should return null');
  deleteMarker('corrupt');
});

test('readMarker handles empty file gracefully', () => {
  ensureDir(MARKERS_DIR);
  fs.writeFileSync(getMarkerPath('empty'), '');
  const marker = readMarker('empty');
  assertEqual(marker, null, 'Empty marker file should return null');
  deleteMarker('empty');
});

test('readMarker rejects marker missing sessionId (schema validation)', () => {
  ensureDir(MARKERS_DIR);
  fs.writeFileSync(getMarkerPath('no-sid'), JSON.stringify({ trigger: 'manual' }));
  const marker = readMarker('no-sid');
  assertEqual(marker, null, 'Marker without sessionId should return null');
  deleteMarker('no-sid');
});

console.log('\n=== Cleanup: clearAllState ===\n');

test('clearAllState removes all markers', () => {
  writeMarker('clear-a', { sessionId: 'clear-a', trigger: 'manual', timestamp: Date.now() });
  writeMarker('clear-b', { sessionId: 'clear-b', trigger: 'manual', timestamp: Date.now() });
  assertTrue(readMarker('clear-a') !== null, 'clear-a should exist');
  assertTrue(readMarker('clear-b') !== null, 'clear-b should exist');
  clearAllState();
  assertEqual(readMarker('clear-a'), null, 'clear-a should be gone');
  assertEqual(readMarker('clear-b'), null, 'clear-b should be gone');
});

// Cleanup
clearAllState();

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
process.exit(failed > 0 ? 1 : 0);
