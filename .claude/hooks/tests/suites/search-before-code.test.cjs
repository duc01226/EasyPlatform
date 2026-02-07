#!/usr/bin/env node
/**
 * Test Suite for search-before-code.cjs Hook
 *
 * Tests:
 *  1. Extension validation (.ts, .tsx, .cs, .html, .scss)
 *  2. Pattern keyword detection (PlatformVmStore, Command handlers, etc.)
 *  3. Transcript analysis (last 100 lines for Grep/Glob)
 *  4. Trivial file threshold (20 lines)
 *  5. Skip override keywords
 *  6. Exempt patterns (.claude/, plans/, docs/, *.md)
 *  7. Cache behavior (CK_SEARCH_PERFORMED)
 *  8. Bypass environment variable (CK_SKIP_SEARCH_CHECK)
 *
 * Usage:
 *   node temp/search-before-code.test.cjs
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ═══════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

let testsPassed = 0;
let testsFailed = 0;
const hookPath = path.join(__dirname, 'search-before-code.cjs');

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ❌ ${message}`);
    testsFailed++;
  }
}

function runHook(payload, env = {}) {
  try {
    const result = execSync(`echo '${JSON.stringify(payload)}' | node "${hookPath}"`, {
      encoding: 'utf-8',
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { exitCode: 0, output: result };
  } catch (error) {
    return { exitCode: error.status || 1, output: error.stdout || error.message };
  }
}

function createPayload(toolName, toolInput, transcriptPath = null) {
  return {
    tool_name: toolName,
    tool_input: toolInput,
    transcript_path: transcriptPath
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🧪 Search-Before-Code Hook Test Suite\n');

// ───────────────────────────────────────────────────────────────────────────
// Test 1: Extension Validation
// ───────────────────────────────────────────────────────────────────────────

console.log('📋 Test 1: Extension Validation');

let result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 1, '.ts file should be blocked');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.tsx',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 1, '.tsx file should be blocked');

result = runHook(createPayload('Edit', {
  file_path: 'src/Command.cs',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 1, '.cs file should be blocked');

result = runHook(createPayload('Edit', {
  file_path: 'src/template.html',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 1, '.html file should be blocked');

result = runHook(createPayload('Edit', {
  file_path: 'src/styles.scss',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 1, '.scss file should be blocked');

result = runHook(createPayload('Edit', {
  file_path: 'src/notes.txt',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, '.txt file should be allowed (not code)');

// ───────────────────────────────────────────────────────────────────────────
// Test 2: Trivial Change Threshold
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 2: Trivial Change Threshold');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'short',
  new_string: 'tiny'
}));
assert(result.exitCode === 0, 'Changes < 20 lines should be allowed');

const largeContent = 'line\n'.repeat(25);
result = runHook(createPayload('Write', {
  file_path: 'src/app.component.ts',
  content: largeContent
}));
assert(result.exitCode === 1, 'Changes >= 20 lines should be blocked');

// ───────────────────────────────────────────────────────────────────────────
// Test 3: Bypass Keywords
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 3: Bypass Keywords');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50),
  description: 'skip search: quick fix'
}));
assert(result.exitCode === 0, '"skip search" should bypass');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'no search needed here'
}));
assert(result.exitCode === 0, '"no search" should bypass');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'just do it - fix'
}));
assert(result.exitCode === 0, '"just do it" should bypass');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'quick: typo'.repeat(10)
}));
assert(result.exitCode === 0, '"quick:" prefix should bypass');

// ───────────────────────────────────────────────────────────────────────────
// Test 4: Exempt Patterns
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 4: Exempt Patterns');

result = runHook(createPayload('Edit', {
  file_path: '.claude/hooks/test.cjs',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, '.claude/ files exempt');

result = runHook(createPayload('Edit', {
  file_path: 'plans/feature.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, 'plans/ files exempt');

result = runHook(createPayload('Edit', {
  file_path: 'docs/api.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, 'docs/ files exempt');

result = runHook(createPayload('Edit', {
  file_path: 'src/README.md',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, '.md files exempt');

result = runHook(createPayload('Edit', {
  file_path: 'temp/test.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, 'temp/ files exempt');

result = runHook(createPayload('Edit', {
  file_path: 'node_modules/lib/index.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}));
assert(result.exitCode === 0, 'node_modules/ files exempt');

// ───────────────────────────────────────────────────────────────────────────
// Test 5: Environment Variable Bypass
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 5: Environment Variable Bypass');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}), { CK_SKIP_SEARCH_CHECK: '1' });
assert(result.exitCode === 0, 'CK_SKIP_SEARCH_CHECK=1 bypasses');

// ───────────────────────────────────────────────────────────────────────────
// Test 6: Cache Behavior
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 6: Cache Behavior');

result = runHook(createPayload('Edit', {
  file_path: 'src/app.component.ts',
  old_string: 'a'.repeat(50),
  new_string: 'b'.repeat(50)
}), { CK_SEARCH_PERFORMED: '1' });
assert(result.exitCode === 0, 'CK_SEARCH_PERFORMED=1 allows (cached)');

// ───────────────────────────────────────────────────────────────────────────
// Test 7: Transcript Analysis
// ───────────────────────────────────────────────────────────────────────────

console.log('\n📋 Test 7: Transcript Analysis');

const tempTranscriptPath = path.join(__dirname, 'test-transcript.txt');
const transcriptWithSearch = '<invoke name="Grep"><parameter name="pattern">Test
