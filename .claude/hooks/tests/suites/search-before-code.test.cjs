/**
 * Test Suite for search-before-code.cjs Hook
 *
 * Tests:
 *  1. Extension validation (.ts, .tsx, .cs, .html, .scss)
 *  2. Trivial change threshold
 *  3. Bypass keywords
 *  4. Exempt patterns (.claude/, plans/, docs/, *.md)
 *  5. Environment variable bypass
 *  6. Cache behavior (CK_SEARCH_PERFORMED)
 *  7. Transcript analysis
 */

'use strict';

const path = require('path');
const fs = require('fs');
const {
  runHook,
  getHookPath
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertAllowed
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir
} = require('../lib/test-utils.cjs');

const SEARCH_BEFORE_CODE = getHookPath('search-before-code.cjs');

// Hook exits 1 to block (not 2 like PreToolUse hooks)
function assertSearchBlocked(exitCode, msg) {
  assertEqual(exitCode, 1, msg || 'Expected search-before-code to block (exit 1)');
}

// Generate multi-line content exceeding the threshold
function multiLine(n) {
  return Array.from({ length: n }, (_, i) => `const line${i} = ${i};`).join('\n');
}

function makeEditInput(filePath, oldStr, newStr, extra) {
  return {
    tool_name: 'Edit',
    tool_input: { file_path: filePath, old_string: oldStr, new_string: newStr, ...extra },
    transcript_path: '/dev/null'
  };
}

function makeWriteInput(filePath, content) {
  return {
    tool_name: 'Write',
    tool_input: { file_path: filePath, content },
    transcript_path: '/dev/null'
  };
}

// ============================================================================
// Test 1: Extension Validation
// ============================================================================

const extensionTests = [
  {
    name: '[search-before-code] blocks large .ts edit without search',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // .ts threshold is 10 lines — use 15 lines to exceed
        const input = makeEditInput('src/app.component.ts', 'old', multiLine(15));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertSearchBlocked(result.code, 'Should block .ts without search');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] blocks large .cs edit without search',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // .cs threshold is 10 lines — use 15 lines to exceed
        const input = makeEditInput('src/Command.cs', 'old', multiLine(15));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertSearchBlocked(result.code, 'Should block .cs without search');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] blocks large .html edit without search',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // .html threshold is 20 lines — use 25 lines to exceed
        const input = makeEditInput('src/template.html', 'old', multiLine(25));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertSearchBlocked(result.code, 'Should block .html without search');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] allows .txt file (not code)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/notes.txt', 'a'.repeat(50), 'b'.repeat(50));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow .txt (not code)');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Test 2: Trivial Change Threshold
// ============================================================================

const thresholdTests = [
  {
    name: '[search-before-code] allows small edit below threshold',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/app.component.ts', 'short', 'tiny');
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Changes below threshold should be allowed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] blocks Write with >= threshold lines',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const largeContent = multiLine(25);
        const input = makeWriteInput('src/app.component.ts', largeContent);
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertSearchBlocked(result.code, 'Write with >= threshold lines should be blocked');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Test 3: Bypass Keywords
// ============================================================================

const bypassTests = [
  {
    name: '[search-before-code] "skip search" keyword bypasses',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/app.component.ts', 'old', multiLine(15),
          { description: 'skip search: quick fix' });
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, '"skip search" should bypass');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] "quick:" prefix in Write content bypasses',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeWriteInput('src/app.component.ts', 'quick: ' + multiLine(15));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, '"quick:" in Write content should bypass');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Test 4: Exempt Patterns
// ============================================================================

const exemptTests = [
  {
    name: '[search-before-code] .claude/ files exempt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('.claude/hooks/test.cjs', 'a'.repeat(50), 'b'.repeat(50));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, '.claude/ files should be exempt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] plans/ files exempt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('plans/feature.ts', 'a'.repeat(50), 'b'.repeat(50));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, 'plans/ files should be exempt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] .md files exempt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/README.md', 'a'.repeat(50), 'b'.repeat(50));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, '.md files should be exempt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] node_modules/ files exempt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('node_modules/lib/index.ts', 'a'.repeat(50), 'b'.repeat(50));
        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, 'node_modules/ files should be exempt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Test 5: Environment Variable Bypass
// ============================================================================

const envBypassTests = [
  {
    name: '[search-before-code] CK_SKIP_SEARCH_CHECK=1 bypasses',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/app.component.ts', 'old', multiLine(15));
        const result = await runHook(SEARCH_BEFORE_CODE, input, {
          cwd: tmpDir,
          env: { CK_SKIP_SEARCH_CHECK: '1' }
        });
        assertAllowed(result.code, 'CK_SKIP_SEARCH_CHECK=1 should bypass');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] CK_SEARCH_PERFORMED=1 allows (cached)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = makeEditInput('src/app.component.ts', 'old', multiLine(15));
        const result = await runHook(SEARCH_BEFORE_CODE, input, {
          cwd: tmpDir,
          env: { CK_SEARCH_PERFORMED: '1' }
        });
        assertAllowed(result.code, 'CK_SEARCH_PERFORMED=1 should allow');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Test 6: Transcript Analysis
// ============================================================================

const transcriptTests = [
  {
    name: '[search-before-code] allows when transcript contains Grep evidence',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const transcriptFile = path.join(tmpDir, 'transcript.txt');
        const searchEvidence = '<invoke name="Grep"><parameter name="pattern">TestPattern</parameter></invoke>';
        fs.writeFileSync(transcriptFile, searchEvidence);

        const input = {
          tool_name: 'Edit',
          tool_input: {
            file_path: 'src/app.component.ts',
            old_string: 'old',
            new_string: multiLine(15)
          },
          transcript_path: transcriptFile
        };

        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow when transcript has Grep evidence');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[search-before-code] blocks when transcript has no search evidence',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const transcriptFile = path.join(tmpDir, 'transcript.txt');
        fs.writeFileSync(transcriptFile, 'Just some random content with no search tools');

        const input = {
          tool_name: 'Edit',
          tool_input: {
            file_path: 'src/app.component.ts',
            old_string: 'old',
            new_string: multiLine(15)
          },
          transcript_path: transcriptFile
        };

        const result = await runHook(SEARCH_BEFORE_CODE, input, { cwd: tmpDir });
        assertSearchBlocked(result.code, 'Should block when transcript has no search evidence');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// Export test suite
// ============================================================================

module.exports = {
  name: 'Search Before Code',
  tests: [
    ...extensionTests,
    ...thresholdTests,
    ...bypassTests,
    ...exemptTests,
    ...envBypassTests,
    ...transcriptTests
  ]
};
