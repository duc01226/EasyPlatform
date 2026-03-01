#!/usr/bin/env node
/**
 * Tests for search-before-code.cjs hook
 *
 * Validates that the hook correctly:
 * 1. Blocks Edit/Write when no recent Grep/Glob found
 * 2. Allows Edit/Write when search was performed
 * 3. Allows trivial files without search
 * 4. Respects "skip search" override
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOOK_PATH = path.resolve(__dirname, '../../search-before-code.cjs');
const TEST_TRANSCRIPT = path.resolve(__dirname, '../fixtures/test-transcript.jsonl');

// Test counter
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// Helper to run hook with payload
function runHook(payload, transcriptContent = '') {
  // Create temp transcript
  const tempTranscript = path.resolve(__dirname, '../fixtures/temp-transcript.jsonl');
  if (transcriptContent) {
    fs.writeFileSync(tempTranscript, transcriptContent);
    payload.transcript_path = tempTranscript;
  }

  const input = JSON.stringify(payload);

  try {
    execSync(`node "${HOOK_PATH}"`, {
      input,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Clean up
    if (fs.existsSync(tempTranscript)) {
      fs.unlinkSync(tempTranscript);
    }

    return { exitCode: 0, blocked: false };
  } catch (error) {
    // Clean up
    if (fs.existsSync(tempTranscript)) {
      fs.unlinkSync(tempTranscript);
    }

    return { exitCode: error.status || 1, blocked: true };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

console.log('\n🧪 Testing search-before-code.cjs hook\n');

// Test 1: Should allow Edit on non-code files
test('Allows Edit on non-code files (.md)', () => {
  const payload = {
    tool_name: 'Edit',
    tool_input: {
      file_path: 'README.md',
      new_string: 'Some markdown content'
    }
  };

  const result = runHook(payload);
  assert(result.exitCode === 0, 'Should allow .md files');
  assert(!result.blocked, 'Should not block .md files');
});

// Test 2: Should allow trivial files (< 20 lines)
test('Allows trivial files without search', () => {
  const payload = {
    tool_name: 'Write',
    tool_input: {
      file_path: 'test.ts',
      content: 'const x = 1;\n'.repeat(10) // 10 lines
    }
  };

  const result = runHook(payload);
  assert(result.exitCode === 0, 'Should allow trivial files');
});

// Test 3: Should BLOCK new pattern implementation without search
// Content must be >= 20 lines to bypass trivial file check
test('Blocks pattern keyword implementation without search', () => {
  const padding = 'const x = 1;\n'.repeat(15); // Pad to exceed trivial threshold
  const payload = {
    tool_name: 'Edit',
    tool_input: {
      file_path: 'component.ts',
      new_string: padding + `
import { ifValidator } from '@libs/core';

export class MyComponent {
  form = new FormControl('', [
    ifValidator(() => true, () => Validators.required)
  ]);
}
      `.trim()
    }
  };

  const result = runHook(payload, ''); // No transcript = no search
  assert(result.exitCode === 1, 'Should block without search');
  assert(result.blocked, 'Should return blocked status');
});

// Test 4: Should ALLOW with recent Grep search
test('Allows implementation when Grep was used', () => {
  const transcriptWithGrep = JSON.stringify({
    tool_name: 'Grep',
    tool_input: { pattern: 'ifValidator' }
  });

  const padding = 'const x = 1;\n'.repeat(15);
  const payload = {
    tool_name: 'Edit',
    tool_input: {
      file_path: 'component.ts',
      new_string: padding + `
import { ifValidator } from '@libs/core';

export class MyComponent {
  form = new FormControl('', [
    ifValidator(() => true, () => Validators.required)
  ]);
}
      `.trim()
    }
  };

  const result = runHook(payload, transcriptWithGrep);
  assert(result.exitCode === 0, 'Should allow with Grep search');
  assert(!result.blocked, 'Should not block when search performed');
});

// Test 5: Should ALLOW with "skip search" override
test('Allows with "skip search" override', () => {
  const transcriptWithOverride = 'User: skip search and just implement it';

  const padding = 'const x = 1;\n'.repeat(15);
  const payload = {
    tool_name: 'Edit',
    tool_input: {
      file_path: 'component.ts',
      new_string: padding + `
import { ifValidator } from '@libs/core';
export class MyComponent {
  form = new FormControl('', [ifValidator(() => true, () => Validators.required)]);
}
      `.trim()
    }
  };

  const result = runHook(payload, transcriptWithOverride);
  assert(result.exitCode === 0, 'Should allow with skip override');
  assert(!result.blocked, 'Should not block with override');
});

// Test 6: Should detect config-driven pattern keywords
// Content must be >= 20 lines to bypass trivial file check
test('Detects config-driven pattern keyword', () => {
  const padding = 'const x = 1;\n'.repeat(20); // Pad to exceed trivial threshold
  const payload = {
    tool_name: 'Write',
    tool_input: {
      file_path: 'store.ts',
      content: padding + `
export class MyStore extends SomeCommandHandler {
  execute() { return this.repository.save(); }
}
      `.trim()
    }
  };

  const result = runHook(payload, '');
  assert(result.exitCode === 1, 'Should block Command.*Handler without search');
});

// Test 7: Should allow non-pattern code
test('Allows code without pattern keywords', () => {
  const payload = {
    tool_name: 'Edit',
    tool_input: {
      file_path: 'utils.ts',
      new_string: `
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
      `.trim()
    }
  };

  const result = runHook(payload, '');
  assert(result.exitCode === 0, 'Should allow non-pattern code');
  assert(!result.blocked, 'Should not block simple utility functions');
});

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════

console.log(`\n${'═'.repeat(70)}`);
console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
console.log('═'.repeat(70));

process.exit(failed > 0 ? 1 : 0);
