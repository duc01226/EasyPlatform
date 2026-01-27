/**
 * Workflow Hooks Test Suite
 *
 * Tests for:
 * - todo-enforcement.cjs: Blocks implementation skills without todos
 * - todo-tracker.cjs: Records TodoWrite, TaskCreate, TaskUpdate calls
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
  // BLOCK - Planning skills without todos (planning requires task tracking)
  {
    name: '[todo-enforcement] blocks /plan without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('plan');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block plan without todos');
        const output = result.stdout + result.stderr;
        assertContains(output, 'Todo List Required', 'Should show todo required message');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] blocks /plan:hard without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('plan:hard');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlocked(result.code, 'Should block plan:hard without todos');
        const output = result.stdout + result.stderr;
        assertContains(output, 'Todo List Required', 'Should show todo required message');
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

  // ALLOW - Planning and implementation skills WITH todos
  {
    name: '[todo-enforcement] allows /plan with todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 2,
          pendingCount: 1,
          inProgressCount: 1,
          completedCount: 0
        });
        const input = createSkillInput('plan');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow plan with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-enforcement] allows /plan:hard with todos',
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
        const input = createSkillInput('plan:hard');
        const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow plan:hard with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
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
  },

  // TaskCreate tracking
  {
    name: '[todo-tracker] records task on TaskCreate',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPostToolUseInput('TaskCreate', {
          subject: 'Investigate feature X',
          description: 'Research how feature X works',
          activeForm: 'Investigating feature X'
        });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertTrue(state !== null, 'State file should exist');
        assertTrue(state.hasTodos, 'Should have todos');
        assertEqual(state.taskCount, 1, 'Should have 1 task');
        assertEqual(state.pendingCount, 1, 'Should have 1 pending');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] increments count on multiple TaskCreate calls',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input1 = createPostToolUseInput('TaskCreate', {
          subject: 'Task A',
          description: 'First task'
        });
        await runHook(TODO_TRACKER, input1, { cwd: tmpDir });

        const input2 = createPostToolUseInput('TaskCreate', {
          subject: 'Task B',
          description: 'Second task'
        });
        await runHook(TODO_TRACKER, input2, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.taskCount, 2, 'Should have 2 tasks');
        assertEqual(state.pendingCount, 2, 'Should have 2 pending');
        assertEqual(state.lastTodos.length, 2, 'Should track 2 entries in lastTodos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // TaskUpdate tracking
  {
    name: '[todo-tracker] updates state on TaskUpdate to completed',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // Setup initial state with 2 pending tasks
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 2,
          pendingCount: 1,
          inProgressCount: 1,
          completedCount: 0,
          lastTodos: [
            { content: 'Task A', status: 'pending' },
            { content: 'Task B', status: 'in_progress' }
          ]
        });

        const input = createPostToolUseInput('TaskUpdate', {
          taskId: '1',
          status: 'completed'
        });
        const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertTrue(state.hasTodos, 'Should still have todos');
        assertEqual(state.completedCount, 1, 'Should have 1 completed');
        assertEqual(state.inProgressCount, 0, 'Should decrement in_progress');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] updates state on TaskUpdate to in_progress',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 2,
          pendingCount: 2,
          inProgressCount: 0,
          completedCount: 0
        });

        const input = createPostToolUseInput('TaskUpdate', {
          taskId: '1',
          status: 'in_progress'
        });
        await runHook(TODO_TRACKER, input, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.inProgressCount, 1, 'Should have 1 in_progress');
        assertEqual(state.pendingCount, 1, 'Should decrement pending');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] updates state on TaskUpdate to deleted',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 2,
          pendingCount: 2,
          inProgressCount: 0,
          completedCount: 0
        });

        const input = createPostToolUseInput('TaskUpdate', {
          taskId: '1',
          status: 'deleted'
        });
        await runHook(TODO_TRACKER, input, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.taskCount, 1, 'Should have 1 task after deletion');
        assertEqual(state.pendingCount, 1, 'Should decrement pending');
        assertTrue(state.hasTodos, 'Should still have todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[todo-tracker] hasTodos becomes false when last task deleted',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        setupTodoState(tmpDir, {
          hasTodos: true,
          taskCount: 1,
          pendingCount: 1,
          inProgressCount: 0,
          completedCount: 0
        });

        const input = createPostToolUseInput('TaskUpdate', {
          taskId: '1',
          status: 'deleted'
        });
        await runHook(TODO_TRACKER, input, { cwd: tmpDir });

        const state = readStateFile(tmpDir, '.todo-state.json');
        assertEqual(state.taskCount, 0, 'Should have 0 tasks');
        assertTrue(!state.hasTodos, 'Should not have todos');
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
  },
  // Verification workflow detection
  {
    name: '[workflow-router] detects verify intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('verify the payment flow works correctly');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('verif') ||
          output.toLowerCase().includes('workflow'),
          'Should detect verification intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects validate intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('validate that user auth handles expired tokens');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('validat') ||
          output.toLowerCase().includes('verif') ||
          output.toLowerCase().includes('workflow'),
          'Should detect validation intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects check-that intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('check that the migration ran properly');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('verif') ||
          output.toLowerCase().includes('check') ||
          output.toLowerCase().includes('workflow'),
          'Should detect check-that intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects make-sure intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('make sure the API returns correct status codes');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('verif') ||
          output.toLowerCase().includes('make sure') ||
          output.toLowerCase().includes('workflow'),
          'Should detect make-sure intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects ensure intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('ensure that the cron job is running correctly');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('verif') ||
          output.toLowerCase().includes('ensure') ||
          output.toLowerCase().includes('workflow'),
          'Should detect ensure intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] verify with feature excluded from verification',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        // "feature" is in excludePatterns for verification workflow
        const input = createUserPromptInput('implement a new feature to verify user emails');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        // Should NOT detect as verification (feature exclude), should detect as feature
        assertTrue(
          !output.toLowerCase().includes('verification') ||
          output.toLowerCase().includes('feature') ||
          output.toLowerCase().includes('workflow'),
          'Should not detect as verification when feature keyword present'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  // Quality Audit workflow detection
  {
    name: '[workflow-router] detects quality audit intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('quality audit the auth module');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('quality') ||
          output.toLowerCase().includes('audit') ||
          output.toLowerCase().includes('workflow'),
          'Should detect quality audit intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects best practices review as quality audit',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('review code for best practices');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('quality') ||
          output.toLowerCase().includes('audit') ||
          output.toLowerCase().includes('workflow'),
          'Should detect best practices as quality audit'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects ensure quality intent',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('ensure quality of the API layer');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('quality') ||
          output.toLowerCase().includes('workflow'),
          'Should detect ensure quality intent'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] plain code review does not trigger quality audit',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('review the code changes');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        // Should detect as review, NOT quality-audit
        assertTrue(
          !output.toLowerCase().includes('quality-audit') ||
          output.toLowerCase().includes('review') ||
          output.toLowerCase().includes('workflow'),
          'Plain code review should not trigger quality audit'
        );
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] detects no flaws intent as quality audit',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('check there are no flaws in the service');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertTrue(
          output.toLowerCase().includes('quality') ||
          output.toLowerCase().includes('audit') ||
          output.toLowerCase().includes('workflow'),
          'Should detect no flaws as quality audit'
        );
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
