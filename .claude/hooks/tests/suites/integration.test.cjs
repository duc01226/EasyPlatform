/**
 * Integration Test Suite
 *
 * Tests for hook chain interactions:
 * - Concurrent Execution: Race condition safety
 *
 * (The session-resume / todo-tracker / skill-enforcement chain tests were removed
 *  with those hooks — session lifecycle is now session-init + session-end only.)
 */

const path = require('path');
const {
  runHooksParallel,
  getHookPath,
  createSessionStartInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertAllowed,
  assertFalse
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');

// 10 parallel session-init spawns (each with 3 git/python grandchildren) is the
// suite's heaviest spawn burst; under full-suite contention a spawn can exceed
// hook-runner's 10s default and hit SIGKILL — a flaky, environmental timeout
// (see tmp/reports/debug-investigate-260711-lifecycle-timeouts.md). Give this
// burst a wider per-call ceiling, matching test-all-hooks.cjs:334/348.
const SPAWN_TIMEOUT_MS = 20000;

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

        const results = await runHooksParallel(hooks, { cwd: tmpDir, timeout: SPAWN_TIMEOUT_MS });

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
  }
];

// Export test suite
module.exports = {
  name: 'Integration Tests',
  tests: [
      ...concurrentTests
  ]
};
