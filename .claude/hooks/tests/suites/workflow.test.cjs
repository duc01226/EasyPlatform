/**
 * Workflow Hooks Test Suite
 *
 * Tests for:
 * - skill-enforcement.cjs: Blocks implementation skills without todos (Skill branch)
 * - todo-tracker.cjs: Records TaskCreate calls
 * - workflow-router.cjs: Injects workflow catalog on qualifying prompts
 * - dev-rules-reminder.cjs: Injects dev rules on prompt submit
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { runHook, getHookPath, createPreToolUseInput, createPostToolUseInput, createUserPromptInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertBlocked, assertAllowed, assertNotContains, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir, setupTodoState, readStateFile } = require('../lib/test-utils.cjs');

// Hook paths
const TODO_ENFORCEMENT = getHookPath('skill-enforcement.cjs');
const TODO_TRACKER = getHookPath('todo-tracker.cjs');
const WORKFLOW_ROUTER = getHookPath('workflow-router.cjs');
const DEV_RULES_REMINDER = getHookPath('dev-rules-reminder.cjs');

// Helper to create Skill tool input
function createSkillInput(skill, args = '') {
    return createPreToolUseInput('Skill', { skill, args });
}

/**
 * Write todo state to the correct /tmp/ck/todo/ path for a given session ID.
 * skill-enforcement reads from /tmp/ck/todo/todo-state-{sessionId}.json via hasTodos().
 * @param {string} sessionId - Session ID used as CK_SESSION_ID env var
 * @param {object} state - Todo state to write
 * @returns {string} Path to written file
 */
function setupCkTodoState(sessionId, state) {
    const todoDir = path.join(os.tmpdir(), 'ck', 'todo');
    fs.mkdirSync(todoDir, { recursive: true });
    const stateFile = path.join(todoDir, `todo-state-${sessionId}.json`);
    fs.writeFileSync(stateFile, JSON.stringify({
        hasTodos: false,
        pendingCount: 0,
        completedCount: 0,
        inProgressCount: 0,
        lastTodos: [],
        bypasses: [],
        metadata: {},
        ...state
    }, null, 2));
    return stateFile;
}

/**
 * Cleanup a todo state file for a test session.
 * @param {string} sessionId - Session ID to clean up
 */
function cleanupCkTodoState(sessionId) {
    try {
        const stateFile = path.join(os.tmpdir(), 'ck', 'todo', `todo-state-${sessionId}.json`);
        if (fs.existsSync(stateFile)) fs.unlinkSync(stateFile);
    } catch (_) { /* ignore */ }
}

// ============================================================================
// skill-enforcement.cjs Tests
// ============================================================================

const todoEnforcementTests = [
    // ALLOW - Meta skills always allowed (no workflow or todos needed)
    {
        name: '[skill-enforcement] allows /watzup (meta skill) without todos',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSkillInput('watzup');
                const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should allow watzup (meta skill)');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /help (meta skill) without todos',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSkillInput('help');
                const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should allow help (meta skill)');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /compact (meta skill) without todos',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSkillInput('compact');
                const result = await runHook(TODO_ENFORCEMENT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should allow compact (meta skill)');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },

    // ALLOW - Research skills WITH todos (todos bypass workflow requirement)
    {
        name: '[skill-enforcement] allows /scout with todos',
        fn: async () => {
            const sessionId = `test-scout-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, { hasTodos: true, pendingCount: 1 });
                const input = createSkillInput('scout');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow scout with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /plan with todos',
        fn: async () => {
            const sessionId = `test-plan-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, { hasTodos: true, pendingCount: 2 });
                const input = createSkillInput('plan');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow plan with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /investigate with todos',
        fn: async () => {
            const sessionId = `test-investigate-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, { hasTodos: true, pendingCount: 1 });
                const input = createSkillInput('investigate');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow investigate with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /explore with todos',
        fn: async () => {
            const sessionId = `test-explore-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, { hasTodos: true, pendingCount: 1 });
                const input = createSkillInput('explore');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow explore with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },

    // BLOCK - All non-meta skills without workflow AND without todos
    {
        name: '[skill-enforcement] blocks /scout without workflow or todos',
        fn: async () => {
            const sessionId = `test-scout-nostate-${Date.now()}`;
            try {
                // No todo state + no workflow state = blocked
                const input = createSkillInput('scout');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertTrue(result.code === 1, 'Should block scout without workflow or todos (exit 1)');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] blocks /cook without workflow or todos',
        fn: async () => {
            const sessionId = `test-cook-nostate-${Date.now()}`;
            try {
                const input = createSkillInput('cook');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertTrue(result.code === 1, 'Should block cook without workflow or todos (exit 1)');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] blocks /fix without workflow or todos',
        fn: async () => {
            const sessionId = `test-fix-nostate-${Date.now()}`;
            try {
                const input = createSkillInput('fix');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertTrue(result.code === 1, 'Should block fix without workflow or todos (exit 1)');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] blocks /code without workflow or todos',
        fn: async () => {
            const sessionId = `test-code-nostate-${Date.now()}`;
            try {
                const input = createSkillInput('code');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertTrue(result.code === 1, 'Should block code without workflow or todos (exit 1)');
                const output = result.stdout + result.stderr;
                assertContains(output, 'Workflow Detection Required', 'Should show workflow required message');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },

    // ALLOW - Implementation skills WITH todos
    {
        name: '[skill-enforcement] allows /cook with todos',
        fn: async () => {
            const sessionId = `test-cook-todos-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, {
                    hasTodos: true,
                    pendingCount: 2,
                    inProgressCount: 1,
                    completedCount: 0
                });
                const input = createSkillInput('cook');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow cook with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /fix with todos',
        fn: async () => {
            const sessionId = `test-fix-todos-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, {
                    hasTodos: true,
                    pendingCount: 0,
                    inProgressCount: 1,
                    completedCount: 0
                });
                const input = createSkillInput('fix');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                assertAllowed(result.code, 'Should allow fix with todos');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },
    {
        name: '[skill-enforcement] allows /cook with all-completed todos',
        fn: async () => {
            const sessionId = `test-cook-completed-${Date.now()}`;
            try {
                setupCkTodoState(sessionId, {
                    hasTodos: true,
                    pendingCount: 0,
                    inProgressCount: 0,
                    completedCount: 2
                });
                const input = createSkillInput('cook');
                const result = await runHook(TODO_ENFORCEMENT, input, { env: { CK_SESSION_ID: sessionId } });
                // hasTodos = true, so hook allows even if all completed
                assertAllowed(result.code, 'Should allow cook when hasTodos=true');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },

    // BYPASS - CK_QUICK_MODE env var
    {
        name: '[skill-enforcement] bypasses with CK_QUICK_MODE=true',
        fn: async () => {
            const sessionId = `test-quick-${Date.now()}`;
            try {
                const input = createSkillInput('cook');
                const result = await runHook(TODO_ENFORCEMENT, input, {
                    env: { CK_SESSION_ID: sessionId, CK_QUICK_MODE: 'true' }
                });
                assertAllowed(result.code, 'Should bypass with CK_QUICK_MODE=true');
            } finally {
                cleanupCkTodoState(sessionId);
            }
        }
    },

    // IGNORE - Non-Skill tools
    {
        name: '[skill-enforcement] ignores Read tool',
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
        name: '[skill-enforcement] ignores Bash tool',
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
        name: '[skill-enforcement] ignores Edit tool',
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
        name: '[todo-tracker] records todos on TaskCreate',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPostToolUseInput('TaskCreate', {
                    subject: 'Task 1',
                    description: 'Task description',
                    activeForm: 'Creating task'
                });
                const result = await runHook(TODO_TRACKER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');

                const state = readStateFile(tmpDir, '.todo-state.json');
                assertTrue(state !== null, 'State file should exist');
                assertTrue(state.hasTodos, 'Should have todos');
                assertEqual(state.taskCount, 1, 'Should have 1 task');
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
        name: '[workflow-router] injects catalog on qualifying prompt',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('fix this bug in the login form');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertContains(output, 'Workflow Catalog', 'Should inject workflow catalog');
                assertContains(output, 'Workflow Detection Instructions', 'Should include detection instructions');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] catalog contains workflow entries with descriptions',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('implement a dark mode toggle');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                // Default config has feature, bugfix, documentation
                assertContains(output, 'Feature Implementation', 'Should list feature workflow');
                assertContains(output, 'Bug Fix', 'Should list bugfix workflow');
                assertContains(output, 'Use:', 'Should include whenToUse description');
                assertContains(output, 'Not for:', 'Should include whenNotToUse description');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] catalog contains step sequences',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('document the API changes for the team');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertContains(output, 'Steps:', 'Should include sequence steps');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] skips catalog for short prompts',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('yes');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertNotContains(result.stdout, 'Workflow Catalog', 'Should skip catalog for short prompts');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] skips catalog for explicit commands',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('/plan implement dark mode');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertTrue(output.trim() === '' || !output.includes('Workflow Catalog'), 'Should skip catalog for explicit commands');
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
// workflow-router.cjs Catalog Structure Tests
// ============================================================================

const catalogStructureTests = [
    {
        name: '[workflow-router] catalog includes workflow-start activation instruction',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('fix this bug in the login form');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertContains(output, 'workflow-start', 'Should reference /workflow-start activation');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] catalog includes TaskCreate enforcement',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('create feature documentation for the recruitment module');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertContains(output, 'TaskCreate', 'Should include TaskCreate enforcement');
                assertContains(output, 'MANDATORY', 'Should mark TaskCreate as mandatory');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] catalog shows confirm marker for confirmFirst workflows',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('how does the authentication system work?');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                // Default feature workflow has confirmFirst: true, should show Confirm marker
                assertContains(output, 'Confirm', 'Should show confirm marker for confirmFirst workflows');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] quick: prefix adds quick mode notice',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('quick: implement a new feature');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                const output = result.stdout;
                assertContains(output, 'Quick mode', 'Should include quick mode notice');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[workflow-router] explicit command skips catalog injection',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createUserPromptInput('/some-explicit-command');
                const result = await runHook(WORKFLOW_ROUTER, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Explicit commands should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Dead Module Removal Verification Tests
// ============================================================================

const deadModuleVerificationTests = [
    {
        name: '[dead-module-removal] wr-detect.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-detect.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-detect.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] wr-output.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-output.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-output.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] wr-control.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-control.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-control.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no enableCheckpoints',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'enableCheckpoints', 'workflows.json should not contain enableCheckpoints');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no supportedLanguages in settings',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'supportedLanguages', 'workflows.json should not contain supportedLanguages');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no checkpoints settings block',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            assertTrue(!data.settings.checkpoints, 'settings.checkpoints should not exist');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no triggerPatterns',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'triggerPatterns', 'workflows.json should not contain triggerPatterns');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no excludePatterns',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'excludePatterns', 'workflows.json should not contain excludePatterns');
        }
    },
    {
        name: '[dead-module-removal] no workflow has priority field',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const withPriority = Object.entries(data.workflows).filter(([, w]) => w.priority !== undefined);
            assertTrue(withPriority.length === 0, `No workflow should have priority, found: ${withPriority.map(([id]) => id).join(', ')}`);
        }
    },
    {
        name: '[dead-module-removal] all workflows have whenToUse field',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const missing = Object.entries(data.workflows).filter(([, w]) => !w.whenToUse);
            assertTrue(missing.length === 0, `All workflows should have whenToUse, missing: ${missing.map(([id]) => id).join(', ')}`);
        }
    },
    {
        name: '[dead-module-removal] all workflows have whenNotToUse field',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const missing = Object.entries(data.workflows).filter(([, w]) => !w.whenNotToUse);
            assertTrue(missing.length === 0, `All workflows should have whenNotToUse, missing: ${missing.map(([id]) => id).join(', ')}`);
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
        ...catalogStructureTests,
        ...deadModuleVerificationTests,
        ...devRulesReminderTests
    ]
};
