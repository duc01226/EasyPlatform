/**
 * Integration Test Suite
 *
 * Tests for hook chain interactions:
 * - Session Lifecycle Chain: session-init -> session-resume -> session-end
 * - Security Chain: privacy-block + scout-block (parallel check)
 * - Todo Enforcement Flow: todo-tracker -> skill-enforcement
 * - Concurrent Execution: Race condition safety
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  runHook,
  runHookSequence,
  runHooksParallel,
  getHookPath,
  createPreToolUseInput,
  createPostToolUseInput,
  createSessionStartInput,
  createSessionEndInput,
  createPreCompactInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertAllowed,
  assertBlocked,
  assertTrue,
  assertFalse
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupCheckpoint,
  setupTodoState,
  fileExists,
  createTimestamp,
  createDaysAgoTimestamp
} = require('../lib/test-utils.cjs');

/**
 * Write todo state to /tmp/ck/todo/todo-state-{sessionId}.json
 * skill-enforcement reads from this path via hasTodos().
 */
function setupCkTodoState(sessionId, state) {
  const todoDir = path.join(os.tmpdir(), 'ck', 'todo');
  fs.mkdirSync(todoDir, { recursive: true });
  const stateFile = path.join(todoDir, `todo-state-${sessionId}.json`);
  fs.writeFileSync(stateFile, JSON.stringify({
    hasTodos: false, pendingCount: 0, completedCount: 0,
    inProgressCount: 0, lastTodos: [], bypasses: [], metadata: {},
    ...state
  }, null, 2));
  return stateFile;
}

function cleanupCkTodoState(sessionId) {
  try {
    const f = path.join(os.tmpdir(), 'ck', 'todo', `todo-state-${sessionId}.json`);
    if (fs.existsSync(f)) fs.unlinkSync(f);
  } catch (_) { /* ignore */ }
}

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const SESSION_END = getHookPath('session-end.cjs');
const PRIVACY_BLOCK = getHookPath('privacy-block.cjs');
const SCOUT_BLOCK = getHookPath('scout-block.cjs');
const TODO_TRACKER = getHookPath('todo-tracker.cjs');
const TODO_ENFORCEMENT = getHookPath('skill-enforcement.cjs');

// ============================================================================
// Session Lifecycle Chain Tests
// ============================================================================

const lifecycleChainTests = [
  {
    name: '[lifecycle-chain] init -> end -> resume preserves state',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Step 1: Initialize session
        const initResult = await runHook(
          SESSION_INIT,
          createSessionStartInput('startup', 'test-session-123'),
          { cwd: tmpDir }
        );
        assertAllowed(initResult.code, 'Session init should succeed');

        // Step 2: Create todos
        setupTodoState(tmpDir, {
          hasTodos: true,
          todos: [
            { content: 'Task 1', status: 'pending' },
            { content: 'Task 2', status: 'in_progress' }
          ]
        });

        // Step 3: Create checkpoint for resume
        setupCheckpoint(tmpDir, {
          timestamp: createTimestamp(0),
          todos: [
            { content: 'Task 1', status: 'pending' },
            { content: 'Task 2', status: 'in_progress' }
          ]
        });

        // Step 4: End session
        const endResult = await runHook(
          SESSION_END,
          createSessionEndInput('clear'),
          { cwd: tmpDir }
        );
        assertAllowed(endResult.code, 'Session end should succeed');

        // Step 5: Resume session
        const resumeResult = await runHook(
          SESSION_RESUME,
          createSessionStartInput('resume'),
          { cwd: tmpDir }
        );
        assertAllowed(resumeResult.code, 'Session resume should succeed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[lifecycle-chain] checkpoint restoration on resume',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup checkpoint with todos
        setupCheckpoint(tmpDir, {
          timestamp: createTimestamp(0), // Now
          todos: [
            { content: 'Checkpoint Task', status: 'pending' }
          ]
        });

        // Resume session - should restore checkpoint
        const result = await runHook(
          SESSION_RESUME,
          createSessionStartInput('resume'),
          { cwd: tmpDir }
        );

        assertAllowed(result.code, 'Resume should succeed with checkpoint');
        // The hook should process the checkpoint
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

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
// Todo Enforcement Flow Tests
// ============================================================================

const todoFlowTests = [
  {
    name: '[todo-flow] tracker -> enforcement allows with active todos',
    fn: async () => {
      const sessionId = `integration-flow-${Date.now()}`;
      try {
        // Setup todo state in the correct /tmp/ck/ path
        setupCkTodoState(sessionId, {
          hasTodos: true,
          pendingCount: 0,
          inProgressCount: 1,
          completedCount: 0
        });

        // Enforcement should allow skill with active todos
        const skillInput = createPreToolUseInput('Skill', { skill: 'cook' });
        const result = await runHook(TODO_ENFORCEMENT, skillInput, {
          env: { CK_SESSION_ID: sessionId }
        });

        assertAllowed(result.code, 'Should allow with active todos');
      } finally {
        cleanupCkTodoState(sessionId);
      }
    }
  },
  {
    name: '[todo-flow] enforcement blocks implementation skill without todos',
    fn: async () => {
      const sessionId = `integration-noflow-${Date.now()}`;
      try {
        // No todos setup - enforcement should block (exit 1)
        const skillInput = createPreToolUseInput('Skill', { skill: 'cook' });
        const result = await runHook(TODO_ENFORCEMENT, skillInput, {
          env: { CK_SESSION_ID: sessionId }
        });

        // skill-enforcement blocks with exit code 1 (not 2)
        assertTrue(result.code === 1, 'Should block /cook without todos (exit 1)');
      } finally {
        cleanupCkTodoState(sessionId);
      }
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
    ...lifecycleChainTests,
    ...securityChainTests,
    ...todoFlowTests,
    ...concurrentTests
  ]
};
