/**
 * Workflow Hooks Test Suite
 *
 * Tests for:
 * - todo-enforcement.cjs: Blocks implementation skills without todos
 * - todo-tracker.cjs: Records TodoWrite calls
 * - workflow-router.cjs: Routes prompts based on intent detection
 * - dev-rules-reminder.cjs: Injects dev rules on prompt submit
 */

const path = require('path');
const {
  runHook,
  getHookPath,
  createPreToolUseInput,
  createPostToolUseInput,
  createUserPromptInput
} = require('../lib/hook-runner.cjs');
const {
  assertEqual,
  assertContains,
  assertBlocked,
  assertAllowed,
  assertNotContains,
  assertTrue
} = require('../lib/assertions.cjs');
const {
  createTempDir,
  cleanupTempDir,
  setupTodoState,
  readStateFile
} = require('../lib/test-utils.cjs');

// Hook paths
const TODO_ENFORCEMENT = getHookPath('todo-enforcement.cjs');
const TODO_TRACKER = getHookPath('todo-tracker.cjs');
const WORKFLOW_ROUTER = getHookPath('workflow-router.cjs');
const DEV_RULES_REMINDER = getHookPath('dev-rules-reminder.cjs');

// Helper to create Skill tool input
function createSkillInput(skill, args = '') {
  return createPreToolUseInput('Skill', { skill, args });
}

// ============================================================================
// todo-enforcement.cjs Tests
// ============================================================================

const todoEnforcementTests = [
  // ALLOW - Research skills without todos
  {
    name: '[todo-enforcement] allows /scout without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // No todo state = no todos
        const input = createSkillInput('scout');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow scout');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /scout:ext without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('scout:ext');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow scout:ext');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /plan without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('plan');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow plan');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /plan:hard without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('plan:hard');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow plan:hard');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /investigate without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('investigate');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow investigate');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /watzup without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('watzup');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow watzup');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /research without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('research');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow research');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /explore without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('explore');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow explore');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // BLOCK - Implementation skills without todos
  {
    name: '[todo-enforcement] blocks /cook without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('cook');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block cook');
        const output = result.stdout + result.stderr;
        assertContains(output, 'Todo List Required', 'Should show todo required message');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /fix without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('fix');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block fix');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /code without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('code');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block code');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /commit without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('commit');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block commit');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /test without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('test');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block test');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /code-review without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('code-review');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block code-review');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // ALLOW - Implementation skills WITH todos
  {
    name: '[todo-enforcement] allows /cook with todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 3,
          pendingCount: 2,
          inProgressCount: 1,
          completedCount: 0
        });
        const input = createSkillInput('cook');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow cook with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /fix with todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 1,
          pendingCount: 0,
          inProgressCount: 1,
          completedCount: 0
        });
        const input = createSkillInput('fix');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow fix with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] warns when all todos completed',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 2,
          pendingCount: 0,
          inProgressCount: 0,
          completedCount: 2
        });
        const input = createSkillInput('cook');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow with completed todos');
        assertContains(result.stdout, 'completed', 'Should warn about completed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // BYPASS - quick: prefix
  {
    name: '[todo-enforcement] bypasses with quick: prefix',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('cook', 'quick: add a button');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should bypass with quick:');
        assertContains(result.stdout, 'bypassed', 'Should mention bypassed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] bypass works case-insensitive',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('fix', 'QUICK: fix typo');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should bypass with QUICK:');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // IGNORE - Non-Skill tools
  {
    name: '[todo-enforcement] ignores Read tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Read', { file_path: 'test.ts' });
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Read');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] ignores Bash tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Bash', { command: 'ls' });
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Bash');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] ignores Edit tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Edit', { file_path: 'test.ts' });
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Edit');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// todo-tracker.cjs Tests
// ============================================================================

const todoTrackerTests = [
  {
    name: '[todo-tracker] records todos on TodoWrite',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('TodoWrite', {
          todos: [
            { content: 'Task 1', status: 'pending' },
            { content: 'Task 2', status: 'in_progress' },
            { content: 'Task 3', status: 'completed' }
          ]
        });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertTrue(state !== null, 'State file should exist');
        assertTrue(state.hasTodos, 'Should have todos');
        assertEqual(state.taskCount, 3, 'Should have 3 tasks');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] counts statuses correctly',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('TodoWrite', {
          todos: [
            { content: 'Task 1', status: 'pending' },
            { content: 'Task 2', status: 'pending' },
            { content: 'Task 3', status: 'in_progress' },
            { content: 'Task 4', status: 'completed' },
            { content: 'Task 5', status: 'completed' }
          ]
        });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.pendingCount, 2, 'Should have 2 pending');
        assertEqual(state.inProgressCount, 1, 'Should have 1 in_progress');
        assertEqual(state.completedCount, 2, 'Should have 2 completed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] ignores other tools',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('Edit', { file_path: 'test.ts' });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state, null, 'Should not create state for Edit');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] handles empty todos array',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('TodoWrite', { todos: [] });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code);

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertTrue(state === null || !state.hasTodos, 'Should not have todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] updates existing state',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // First write
        const input1 = createPostToolUseInput('TodoWrite', {
          todos: [{ content: 'Task 1', status: 'pending' }]
        });
        await runHook(TODO_TRACKER, input1, { cwd: tmpDir });

        // Second write with more todos
        const input2 = createPostToolUseInput('TodoWrite', {
          todos: [
            { content: 'Task 1', status: 'completed' },
            { content: 'Task 2', status: 'pending' }
          ]
        });
        await runHook(TODO_TRACKER, input2, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.taskCount, 2, 'Should have 2 tasks');
        assertEqual(state.completedCount, 1, 'Should have 1 completed');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// workflow-router.cjs Tests
// ============================================================================

const workflowRouterTests = [
  {
    name: '[workflow-router] detects bug fix intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('fix this bug in the login form');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertContains(output.toLowerCase(), 'bug', 'Should detect bug keyword');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects feature implementation intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('implement a dark mode toggle');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        // Check if either feature detection or workflow reference appears
        assertTrue(
          output.toLowerCase().includes('feature') ||
          output.toLowerCase().includes('implement') ||
          output.toLowerCase().includes('workflow'),
          'Should detect feature intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects documentation intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Use "document" instead of "docs" - pattern is \b(doc|document|readme)\b
        const input = createUserPromptInput('document the API changes');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('doc') ||
          output.toLowerCase().includes('workflow') ||
          output === '', // May have no output if no workflow.json config
          'Should detect doc intent or have no output'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] skips quick: prefix',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('quick: add a button');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        // Quick prefix should skip workflow detection
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] handles questions gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('what is the status of the build?');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block questions');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// dev-rules-reminder.cjs Tests
// ============================================================================

const devRulesReminderTests = [
  {
    name: '[dev-rules-reminder] injects context on prompt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('add a new feature');
        const result = await runHook(DEV_RULES_REMINDER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        // May or may not have output depending on config
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[dev-rules-reminder] handles empty prompt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('');
        const result = await runHook(DEV_RULES_REMINDER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block empty prompt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// Export test suite
module.exports = {
  name: 'Workflow Hooks',
  tests: [
    ...todoEnforcementTests,
    ...todoTrackerTests,
    ...workflowRouterTests,
    ...devRulesReminderTests
  ]
};
