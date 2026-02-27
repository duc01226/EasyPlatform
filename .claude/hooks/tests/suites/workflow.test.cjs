/**
 * Workflow Hooks Test Suite
 *
 * Tests for:
 * - skill-enforcement.cjs: Force workflow first — blocks non-meta skills without tasks
 * - edit-enforcement.cjs: Blocks file edits without tasks
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
const { buildWorkflowInstructions, buildCatalogInjection, buildActiveWorkflowContext } = require('../../lib/wr-output.cjs');
const { shouldInjectCatalog, buildWorkflowCatalog } = require('../../lib/wr-detect.cjs');

// Hook paths
const SKILL_ENFORCEMENT = getHookPath('skill-enforcement.cjs');
const EDIT_ENFORCEMENT = getHookPath('edit-enforcement.cjs');
const TODO_TRACKER = getHookPath('todo-tracker.cjs');
const WORKFLOW_ROUTER = getHookPath('workflow-router.cjs');
const DEV_RULES_REMINDER = getHookPath('dev-rules-reminder.cjs');

// Helper to create Skill tool input
function createSkillInput(skill, args = '') {
  return createPreToolUseInput('Skill', { skill, args });
}

// skill-enforcement uses exit(1) to block, not exit(2)
function assertBlockedExit1(exitCode, msg = '') {
  if (exitCode !== 1) {
    const prefix = msg ? `${msg}: ` : '';
    throw new Error(`${prefix}Expected exit code 1 (blocked), got ${exitCode}`);
  }
}

// ============================================================================
// skill-enforcement.cjs Tests (Force Workflow First)
// ============================================================================

const skillEnforcementTests = [
  // META SKILLS - Always allowed without workflow or tasks
  {
    name: '[skill-enforcement] allows /watzup without todos (meta skill)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('watzup');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow watzup (meta)');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /checkpoint without todos (meta skill)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('checkpoint');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow checkpoint (meta)');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /kanban without todos (meta skill)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('kanban');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow kanban (meta)');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /workflow-start always',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('workflow-start');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow workflow-start');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // FORCE WORKFLOW FIRST - Research skills BLOCKED without tasks
  {
    name: '[skill-enforcement] blocks /scout without todos (force workflow first)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('scout');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block scout without tasks');
        assertContains(result.stdout, 'Workflow', 'Should show workflow message');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /investigate without todos (force workflow first)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('investigate');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block investigate without tasks');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /plan without todos (force workflow first)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('plan');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block plan without tasks');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /research without todos (force workflow first)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('research');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block research without tasks');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // BLOCKED - Implementation skills without todos
  {
    name: '[skill-enforcement] blocks /cook without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('cook');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block cook');
        assertContains(result.stdout, 'Workflow', 'Should show workflow message');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /fix without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('fix');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block fix');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /code without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('code');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block code');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /commit without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('commit');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block commit');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] blocks /test without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('test');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block test');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // ALLOWED - All skills with todos
  {
    name: '[skill-enforcement] allows /scout with todos',
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
        const input = createSkillInput('scout');
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow scout with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /plan with todos',
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
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow plan with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /cook with todos',
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
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow cook with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] allows /fix with todos',
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
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow fix with todos');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // BYPASS - CK_QUICK_MODE
  {
    name: '[skill-enforcement] bypasses with CK_QUICK_MODE=true',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createSkillInput('cook');
        const result = await runHook(SKILL_ENFORCEMENT, input, {
          cwd: tmpDir,
          env: { CK_QUICK_MODE: 'true' }
        });
        assertAllowed(result.code, 'Should bypass with CK_QUICK_MODE');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },

  // IGNORE - Non-Skill tools (skill-enforcement only matches Skill)
  {
    name: '[skill-enforcement] ignores Read tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Read', { file_path: 'test.ts' });
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Read');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[skill-enforcement] ignores Bash tool',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Bash', { command: 'ls' });
        const result = await runHook(SKILL_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should ignore Bash');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  }
];

// ============================================================================
// edit-enforcement.cjs Tests
// ============================================================================

const editEnforcementTests = [
  {
    name: '[edit-enforcement] blocks Edit on non-exempt file without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Edit', { file_path: 'src/app/test.ts' });
        const result = await runHook(EDIT_ENFORCEMENT, input, { cwd: tmpDir });
        assertBlockedExit1(result.code, 'Should block Edit without todos');
        assertContains(result.stdout, 'Task Tracking', 'Should show task tracking message');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-enforcement] allows Edit on exempt file (.md) without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Edit', { file_path: 'docs/readme.md' });
        const result = await runHook(EDIT_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow .md files');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-enforcement] allows Edit on .claude/ path without todos',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createPreToolUseInput('Edit', { file_path: '.claude/hooks/test.cjs' });
        const result = await runHook(EDIT_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow .claude/ paths');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[edit-enforcement] allows Edit with todos',
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
        const input = createPreToolUseInput('Edit', { file_path: 'src/app/test.ts' });
        const result = await runHook(EDIT_ENFORCEMENT, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should allow Edit with todos');
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
  // ── shouldInjectCatalog() unit tests ──
  {
    name: '[catalog-heuristic] shouldInjectCatalog returns false for short prompts (<15 chars)',
    fn: async () => {
      const config = { settings: { overridePrefix: 'quick:' } };
      assertTrue(!shouldInjectCatalog('yes', config), 'Should skip "yes"');
      assertTrue(!shouldInjectCatalog('ok thanks', config), 'Should skip "ok thanks"');
      assertTrue(!shouldInjectCatalog('hello world', config), 'Should skip <15 chars');
    }
  },
  {
    name: '[catalog-heuristic] shouldInjectCatalog only checks length (slash/quick filtering moved to router)',
    fn: async () => {
      const config = { settings: { overridePrefix: 'quick:' } };
      // Slash commands and quick: prefix filtering now happens in workflow-router.cjs main flow,
      // not in shouldInjectCatalog. The function only checks prompt length >= 15.
      assertTrue(shouldInjectCatalog('/cook auto something', config), 'Slash commands are long enough');
      assertTrue(shouldInjectCatalog('quick: add a button to the page', config), 'Quick prefix is long enough');
      assertTrue(!shouldInjectCatalog('/plan', config), 'Short slash command skipped by length');
    }
  },
  {
    name: '[catalog-heuristic] shouldInjectCatalog returns true for qualifying prompts',
    fn: async () => {
      const config = { settings: { overridePrefix: 'quick:' } };
      assertTrue(shouldInjectCatalog('fix this bug in the login form', config), 'Should inject for bug fix prompt');
      assertTrue(shouldInjectCatalog('implement a dark mode toggle feature', config), 'Should inject for feature prompt');
      assertTrue(shouldInjectCatalog('refactor the authentication module', config), 'Should inject for refactor prompt');
    }
  },

  // ── buildWorkflowCatalog() unit tests ──
  {
    name: '[catalog-output] buildWorkflowCatalog sorts alphabetically by ID',
    fn: async () => {
      const config = {
        workflows: {
          zebra: { name: 'Zebra', whenToUse: 'Test', sequence: ['plan'], confirmFirst: false },
          alpha: { name: 'Alpha', whenToUse: 'Test', sequence: ['plan'], confirmFirst: false },
          middle: { name: 'Middle', whenToUse: 'Test', sequence: ['plan'], confirmFirst: false }
        },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const catalog = buildWorkflowCatalog(config);
      const alphaIdx = catalog.indexOf('**alpha**');
      const middleIdx = catalog.indexOf('**middle**');
      const zebraIdx = catalog.indexOf('**zebra**');
      assertTrue(alphaIdx < middleIdx, 'alpha should appear before middle');
      assertTrue(middleIdx < zebraIdx, 'middle should appear before zebra');
    }
  },
  {
    name: '[catalog-output] buildWorkflowCatalog includes whenToUse and confirmFirst',
    fn: async () => {
      const config = {
        workflows: {
          feature: {
            name: 'Feature',
            whenToUse: 'User wants to build new functionality.',
            sequence: ['plan', 'cook'],
            confirmFirst: true
          }
        },
        commandMapping: { plan: { claude: '/plan' }, cook: { claude: '/cook' } }
      };
      const catalog = buildWorkflowCatalog(config);
      assertContains(catalog, 'User wants to build new functionality', 'Should contain whenToUse');
      assertContains(catalog, 'confirmFirst', 'Should contain confirmFirst flag');
    }
  },
  {
    name: '[catalog-output] buildWorkflowCatalog includes whenNotToUse',
    fn: async () => {
      const config = {
        workflows: {
          bugfix: {
            name: 'Bug Fix',
            whenToUse: 'User reports a bug.',
            whenNotToUse: 'User wants new features.',
            sequence: ['fix'],
            confirmFirst: false
          }
        },
        commandMapping: { fix: { claude: '/fix' } }
      };
      const catalog = buildWorkflowCatalog(config);
      assertContains(catalog, 'NOT: User wants new features', 'Should contain whenNotToUse');
    }
  },
  {
    name: '[catalog-output] buildCatalogInjection includes /workflow-start instruction',
    fn: async () => {
      const config = {
        settings: { allowOverride: true, overridePrefix: 'quick:' },
        workflows: {
          feature: {
            name: 'Feature',
            whenToUse: 'Implement new stuff.',
            sequence: ['plan'],
            confirmFirst: false
          }
        },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const injection = buildCatalogInjection(config);
      assertContains(injection, 'Workflow Catalog', 'Should have header');
      assertContains(injection, '/workflow-start', 'Should contain /workflow-start instruction');
      assertContains(injection, 'quick:', 'Should contain override hint');
    }
  },

  // ── Router integration tests ──
  {
    name: '[workflow-router] injects catalog for qualifying prompt (no active workflow)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('fix this bug in the login form');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = result.stdout + result.stderr;
        assertContains(output, 'Workflow Catalog', 'Should inject catalog');
        assertContains(output, '/workflow-start', 'Should include activation instruction');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] no output for short prompt (no active workflow)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('yes');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = (result.stdout + result.stderr).trim();
        assertNotContains(output, 'Workflow Catalog', 'Should NOT inject catalog for short prompt');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] no output for slash command prompt',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('/plan');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = (result.stdout + result.stderr).trim();
        assertNotContains(output, 'Workflow Catalog', 'Should NOT inject catalog for slash command');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] quick: prefix still gets catalog (filtering now in enforcement hooks)',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('quick: add a button to the settings page');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block');
        const output = (result.stdout + result.stderr).trim();
        // quick: filtering moved to enforcement hooks; router always injects for long prompts
        assertContains(output, 'Workflow Catalog', 'Should inject catalog (quick: handled by enforcement hooks now)');
      } finally {
        cleanupTempDir(tmpDir);
      }
    }
  },
  {
    name: '[workflow-router] handles empty prompt gracefully',
    fn: async () => {
      const tmpDir = createTempDir();
      try {
        const input = createUserPromptInput('');
        const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
        assertAllowed(result.code, 'Should not block empty prompt');
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

// ============================================================================
// preActions Output Tests (wr-output.cjs)
// ============================================================================

const preActionsOutputTests = [
  {
    name: '[preActions] emits injectContext in workflow instructions',
    fn: async () => {
      const activation = {
        workflowId: 'bugfix',
        workflow: {
          name: 'Bug Fix',
          description: 'Fix bugs',
          sequence: ['scout', 'fix'],
          confirmFirst: false,
          preActions: {
            injectContext: 'BUG FIX PROTOCOL: reproduce first'
          }
        }
      };
      const config = {
        settings: { confirmHighImpact: true },
        commandMapping: { scout: { claude: '/scout' }, fix: { claude: '/fix' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      assertContains(output, 'Pre-Actions', 'Should have Pre-Actions header');
      assertContains(output, 'BUG FIX PROTOCOL', 'Should contain injectContext text');
    }
  },
  {
    name: '[preActions] emits activateSkill instruction',
    fn: async () => {
      const activation = {
        workflowId: 'test-workflow',
        workflow: {
          name: 'Test Workflow',
          sequence: ['plan'],
          confirmFirst: false,
          preActions: {
            activateSkill: 'my-skill',
            injectContext: 'Some context'
          }
        }
      };
      const config = {
        settings: { confirmHighImpact: false },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      assertContains(output, 'Activate skill', 'Should have activate skill instruction');
      assertContains(output, 'my-skill', 'Should contain skill name');
    }
  },
  {
    name: '[preActions] emits readFiles list',
    fn: async () => {
      const activation = {
        workflowId: 'docs-workflow',
        workflow: {
          name: 'Docs Workflow',
          sequence: ['plan'],
          confirmFirst: false,
          preActions: {
            readFiles: ['docs/template.md', 'docs/guide.md'],
            injectContext: 'Read docs first'
          }
        }
      };
      const config = {
        settings: { confirmHighImpact: false },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      assertContains(output, 'MUST READ', 'Should have read files instruction');
      assertContains(output, 'docs/template.md', 'Should list first file');
      assertContains(output, 'docs/guide.md', 'Should list second file');
    }
  },
  {
    name: '[preActions] skips section when no preActions defined',
    fn: async () => {
      const activation = {
        workflowId: 'no-preactions',
        workflow: {
          name: 'No PreActions',
          sequence: ['plan'],
          confirmFirst: false
        }
      };
      const config = {
        settings: { confirmHighImpact: false },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      assertNotContains(output, 'Pre-Actions', 'Should NOT have Pre-Actions when undefined');
    }
  },
  {
    name: '[preActions] skips section when preActions is empty object',
    fn: async () => {
      const activation = {
        workflowId: 'empty-preactions',
        workflow: {
          name: 'Empty PreActions',
          sequence: ['plan'],
          confirmFirst: false,
          preActions: {}
        }
      };
      const config = {
        settings: { confirmHighImpact: false },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      assertNotContains(output, 'Pre-Actions', 'Should NOT have Pre-Actions when empty');
    }
  },
  {
    name: '[preActions] emits all three sub-properties in correct order',
    fn: async () => {
      const activation = {
        workflowId: 'full-preactions',
        workflow: {
          name: 'Full PreActions',
          sequence: ['plan'],
          confirmFirst: false,
          preActions: {
            activateSkill: 'test-skill',
            readFiles: ['file1.md'],
            injectContext: 'PROTOCOL TEXT'
          }
        }
      };
      const config = {
        settings: { confirmHighImpact: false },
        commandMapping: { plan: { claude: '/plan' } }
      };
      const output = buildWorkflowInstructions(activation, config);
      const skillIdx = output.indexOf('Activate skill');
      const readIdx = output.indexOf('MUST READ');
      const contextIdx = output.indexOf('PROTOCOL TEXT');
      assertTrue(skillIdx < readIdx, 'activateSkill should appear before readFiles');
      assertTrue(readIdx < contextIdx, 'readFiles should appear before injectContext');
    }
  }
];

// Export test suite
module.exports = {
  name: 'Workflow Hooks',
  tests: [
    ...skillEnforcementTests,
    ...editEnforcementTests,
    ...todoTrackerTests,
    ...workflowRouterTests,
    ...devRulesReminderTests,
    ...preActionsOutputTests
  ]
};
