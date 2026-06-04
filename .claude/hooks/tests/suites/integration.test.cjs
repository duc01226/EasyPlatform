/**
 * Integration Test Suite
 *
 * Tests for hook chain interactions:
 * - Security Chain: privacy-block + scout-block (parallel check)
 * - Concurrent Execution: Race condition safety
 *
 * (The session-resume / todo-tracker / skill-enforcement chain tests were removed
 *  with those hooks — session lifecycle is now session-init + session-end only.)
 */

const path = require('path');
const {
  runHookSequence,
  runHooksParallel,
  getHookPath,
  createPreToolUseInput,
  createSessionStartInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertAllowed,
  assertBlocked,
  assertFalse
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const PRIVACY_BLOCK = getHookPath('privacy-block.cjs');
const SCOUT_BLOCK = getHookPath('scout-block.cjs');

// ============================================================================
// Security Chain Tests
// ============================================================================

const securityChainTests = [
  {
    name: '[security-chain] both hooks allow legitimate operations',
    fn: async () => {
      const input = createPreToolUseInput('Glob', { pattern: 'src/**/*.ts' });

      // Run both security hooks in parallel
      const results = await runHooksParallel([
        { hookPath: PRIVACY_BLOCK, input },
        { hookPath: SCOUT_BLOCK, input }
      ]);

      // Both should allow legitimate pattern
      for (const { hookPath, result } of results) {
        assertAllowed(result.code, `${path.basename(hookPath)} should allow src/**/*.ts`);
      }
    }
  },
  {
    name: '[security-chain] privacy blocks before scout processes',
    fn: async () => {
      const input = createPreToolUseInput('Read', { file_path: '.env' });

      // Run in sequence (privacy-block first)
      const results = await runHookSequence([PRIVACY_BLOCK, SCOUT_BLOCK], input);

      // First hook should block, sequence should stop
      assertEqual(results.length, 1, 'Sequence should stop at first block');
      assertBlocked(results[0].result.code, 'Privacy block should block .env');
    }
  }
];

// ============================================================================
// Concurrent Execution Tests
// ============================================================================

const concurrentTests = [
  {
    name: '[concurrent] handles parallel execution without corruption',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSessionStartInput('startup');

        // Run 10 session-init hooks in parallel
        const hooks = Array(10).fill(null).map(() => ({
          hookPath: SESSION_INIT,
          input
        }));

        const results = await runHooksParallel(hooks, { cwd: tmpDir });

        // All should complete without error
        for (const { result } of results) {
          assertAllowed(result.code, 'Parallel execution should not crash');
          assertFalse(result.timedOut, 'Should not timeout');
        }

        assertEqual(results.length, 10, 'All 10 hooks should complete');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[concurrent] parallel security checks are consistent',
    fn: async () => {
      const legitInput = createPreToolUseInput('Glob', { pattern: 'src/config/*.ts' });
      const blockedInput = createPreToolUseInput('Read', { file_path: '.env' });

      // Run multiple parallel checks
      const hooks = [
        { hookPath: PRIVACY_BLOCK, input: legitInput },
        { hookPath: PRIVACY_BLOCK, input: blockedInput },
        { hookPath: SCOUT_BLOCK, input: legitInput },
        { hookPath: PRIVACY_BLOCK, input: legitInput }
      ];

      const results = await runHooksParallel(hooks);

      // Verify consistent results
      assertAllowed(results[0].result.code, 'Legit path should be allowed');
      assertBlocked(results[1].result.code, '.env should be blocked');
      assertAllowed(results[2].result.code, 'Scout should allow scoped pattern');
      assertAllowed(results[3].result.code, 'Legit path should be allowed consistently');
    }
  }
];

// Export test suite
module.exports = {
  name: 'Integration Tests',
  tests: [
    ...securityChainTests,
    ...concurrentTests
  ]
};
