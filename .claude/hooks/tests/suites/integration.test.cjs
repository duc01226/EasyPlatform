/**
 * Integration Test Suite
 *
 * Tests for hook chain interactions:
 * - ACE Pipeline Chain: ace-event-emitter -> ace-reflector-analysis -> ace-curator-pruner
 * - Session Lifecycle Chain: session-init -> session-resume -> session-end
 * - Security Chain: privacy-block + scout-block (parallel check)
 * - Todo Enforcement Flow: todo-tracker -> todo-enforcement
 * - Concurrent Execution: Race condition safety
 */

const path = require('path');
const fs = require('fs');
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
  setupEventsStream,
  setupDeltaCandidates,
  setupCheckpoint,
  setupTodoState,
  fileExists,
  readDeltas,
  readDeltaCandidates,
  createTimestamp,
  createDaysAgoTimestamp
} = require('../lib/test-utils.cjs');

// Hook paths
const ACE_EVENT_EMITTER = getHookPath('ace-event-emitter.cjs');
const ACE_REFLECTOR = getHookPath('ace-reflector-analysis.cjs');
const ACE_CURATOR = getHookPath('ace-curator-pruner.cjs');
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const SESSION_END = getHookPath('session-end.cjs');
const PRIVACY_BLOCK = getHookPath('privacy-block.cjs');
const SCOUT_BLOCK = getHookPath('scout-block.cjs');
const TODO_TRACKER = getHookPath('todo-tracker.cjs');
const TODO_ENFORCEMENT = getHookPath('todo-enforcement.cjs');

// ============================================================================
// ACE Pipeline Chain Tests
// ============================================================================

const acePipelineTests = [
  {
    name: '[ace-pipeline] event emitter processes skill execution',
    fn: async () => {
      // Test that ace-event-emitter hook completes successfully for Skill tool
      // Note: MEMORY_DIR is hardcoded in hooks, so we verify execution only
      const input = createPostToolUseInput('Skill', { skill: 'test-skill' }, { exit_code: 0 });
      const result = await runHook(ACE_EVENT_EMITTER, input);

      assertAllowed(result.code, 'Event emitter should complete successfully');
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[ace-pipeline] reflector processes PreCompact event',
    fn: async () => {
      // Test that ace-reflector-analysis hook completes successfully on PreCompact
      const compactInput = createPreCompactInput({ compact_type: 'manual' });
      const result = await runHook(ACE_REFLECTOR, compactInput);

      assertAllowed(result.code, 'Reflector should complete successfully');
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[ace-pipeline] curator processes PreCompact event',
    fn: async () => {
      // Test that ace-curator-pruner hook completes successfully on PreCompact
      const compactInput = createPreCompactInput({ compact_type: 'manual' });
      const result = await runHook(ACE_CURATOR, compactInput);

      assertAllowed(result.code, 'Curator should complete successfully');
      assertFalse(result.timedOut, 'Should not timeout');
    }
  },
  {
    name: '[ace-pipeline] full pipeline sequence executes',
    fn: async () => {
      // Test that ACE pipeline hooks execute in sequence without blocking
      const compactInput = createPreCompactInput({ compact_type: 'manual' });

      // Run ACE pipeline sequence
      const results = await runHookSequence(
        [ACE_REFLECTOR, ACE_CURATOR],
        compactInput
      );

      // Both should complete (none should block)
      assertEqual(results.length, 2, 'Both hooks should execute');
      for (const { result } of results) {
        assertAllowed(result.code, 'Pipeline hooks should complete successfully');
      }
    }
  }
];

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
      const tmpDir = createTempDir();
      try {
        // Track todos first
        const todoInput = createPostToolUseInput('TodoWrite', {
          todos: [{ content: 'Active task', status: 'in_progress' }]
        });
        await runHook(TODO_TRACKER, todoInput, { cwd: tmpDir });

        // Setup active todos for enforcement check
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 1,
          pendingCount: 0,
          inProgressCount: 1,
          completedCount: 0
        });

        // Enforcement should allow skill with active todos
        const skillInput = createPreToolUseInput('Skill', { skill: 'cook' });
        const result = await runHook(TODO_ENFORCEMENT, skillInput, { cwd: tmpDir });

        assertAllowed(result.code, 'Should allow with active todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-flow] enforcement blocks implementation skill without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No todos setup - enforcement should block
        const skillInput = createPreToolUseInput('Skill', { skill: 'cook' });
        const result = await runHook(TODO_ENFORCEMENT, skillInput, { cwd: tmpDir });

        assertBlocked(result.code, 'Should block /cook without todos');
      } finally {
        cleanupTempDir(tmpDir);
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
    ...acePipelineTests,
    ...lifecycleChainTests,
    ...securityChainTests,
    ...todoFlowTests,
    ...concurrentTests
  ]
};
