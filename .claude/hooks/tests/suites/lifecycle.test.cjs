/**
 * Session Lifecycle & State Isolation Test Suite
 *
 * Tests for:
 * - session-init.cjs: Session initialization and project detection
 * - session-end.cjs: Session cleanup
 * - State-library isolation: todo-state, ck-session-state, workflow-state,
 *   temp-file-cleanup (cross-session concurrency & Windows-safe atomic writes)
 *
 * (The session-resume / post-compact-recovery / post-agent-validator / bash-cleanup /
 *  write-compact-marker hook tests and the subagent-init*.cjs dispatcher tests were
 *  removed when those hooks were deleted — session lifecycle is now session-init +
 *  session-end, and workflow/recovery progression is model-driven, not hook-enforced.)
 */

const path = require('path');
const fs = require('fs');
const {
    runHook,
    getHookPath,
    createSessionStartInput,
    createSessionEndInput
} = require('../lib/hook-runner.cjs');
const { assertEqual, assertAllowed, assertTrue, assertFalse } = require('../lib/assertions.cjs');
const {
    createTempDir,
    cleanupTempDir,
    setupTodoState,
    createMockFile
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_END = getHookPath('session-end.cjs');

// ============================================================================
// session-init.cjs Tests
// ============================================================================

const sessionInitTests = [
    {
        name: '[session-init] handles startup source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('startup', 'test-session-123');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertTrue(result.stdout === '', 'SessionStart hooks must not inject stdout context');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles resume source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('resume', 'test-session-123');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles clear source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('clear');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles compact source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('compact');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] detects Node project by package.json',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                createMockFile(tmpDir, 'package.json', '{"name": "test-project"}');
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
                assertTrue(result.stdout === '', 'Project detection must stay silent on SessionStart');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] detects .NET project by .sln file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                createMockFile(tmpDir, 'Project.sln', 'Microsoft Visual Studio Solution File');
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles empty input gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(SESSION_INIT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block on empty input');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// session-end.cjs Tests
// ============================================================================

const sessionEndTests = [
    {
        name: '[session-end] handles clear source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create state files
                setupTodoState(tmpDir, { hasTodos: true, taskCount: 2 });
                const input = createSessionEndInput('clear');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-end] handles exit source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionEndInput('exit');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-end] handles empty directory',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionEndInput('clear');
                const result = await runHook(SESSION_END, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not fail on missing files');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Config File Edge Cases
// ============================================================================

const configEdgeCaseTests = [
    {
        name: '[session-init] handles missing .ck.json config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create .claude directory but no .ck.json
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash without config file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles empty .ck.json config',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{}');

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should handle empty config');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles invalid JSON in .ck.json',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), '{ broken json');

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash on malformed JSON');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles config with wrong types',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const claudeDir = path.join(tmpDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                // Write config with wrong types (string instead of boolean, number instead of string, etc.)
                fs.writeFileSync(
                    path.join(claudeDir, '.ck.json'),
                    JSON.stringify({
                        enableHooks: 'yes', // Should be boolean
                        maxRetries: 'three', // Should be number
                        timeout: true, // Should be number
                        features: 123 // Should be array/object
                    })
                );

                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should handle config with wrong types');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-init] handles config in different locations',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create nested project structure with config at different level
                const projectDir = path.join(tmpDir, 'project');
                const subDir = path.join(projectDir, 'src', 'app');
                fs.mkdirSync(subDir, { recursive: true });

                // Config only at root level
                const claudeDir = path.join(projectDir, '.claude');
                fs.mkdirSync(claudeDir, { recursive: true });
                fs.writeFileSync(path.join(claudeDir, '.ck.json'), JSON.stringify({ projectName: 'test' }));

                // Run from subdirectory
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_INIT, input, { cwd: subDir });
                assertAllowed(result.code, 'Should handle config search path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Todo-state concurrency & isolation (survivor lib: todo-state.cjs)
//   The todo-tracker.cjs hook was deleted, but the todo-state.cjs lib survives as
//   shared session state — these tests exercise the lib directly.
// ============================================================================
const { getTodoState, setTodoState, clearTodoState } = require('../../lib/todo-state.cjs');

const todoStateConcurrencyTests = [
    {
        // Two agents same session_id read todo-state simultaneously → consistent state
        name: 'TC-SUBCTX-051: concurrent reads of todo-state return consistent hasTodos value',
        async fn() {
            const sessionId = 'sess-051-concurrent';
            // Write initial state
            const written = setTodoState(sessionId, { hasTodos: true, pendingCount: 3, completedCount: 1, inProgressCount: 0, lastTodos: [], bypasses: [], taskSubjects: {} });
            assertTrue(written, 'setTodoState must succeed');

            // Simulate two concurrent reads
            const [state1, state2] = await Promise.all([
                Promise.resolve(getTodoState(sessionId)),
                Promise.resolve(getTodoState(sessionId))
            ]);

            assertEqual(state1.hasTodos, true, 'state1.hasTodos must be true');
            assertEqual(state2.hasTodos, true, 'state2.hasTodos must be true');
            assertEqual(state1.pendingCount, state2.pendingCount, 'Both reads must return same pendingCount');
        }
    },
    {
        name: 'TC-SUBCTX-055: setTodoState() Windows-safe fallback preserves valid JSON on concurrent writes',
        fn() {
            const sessionId = 'sess-055-rename';

            // Write #1: initial state
            const ok1 = setTodoState(sessionId, {
                hasTodos: true, pendingCount: 2, completedCount: 0,
                inProgressCount: 1, lastTodos: [], bypasses: [], taskSubjects: {}
            });
            assertTrue(ok1, 'First setTodoState must succeed');

            // Write #2: update state (simulates second concurrent write overwriting #1 result)
            const ok2 = setTodoState(sessionId, {
                hasTodos: true, pendingCount: 1, completedCount: 1,
                inProgressCount: 0, lastTodos: [], bypasses: [], taskSubjects: {}
            });
            assertTrue(ok2, 'Second setTodoState must succeed (Windows-safe fallback)');

            // Both writes completed — final state must be valid JSON with correct values
            const finalState = getTodoState(sessionId);
            assertTrue(finalState !== null, 'Final state must not be null');
            assertEqual(finalState.hasTodos, true, 'hasTodos must be preserved');
            // Second write should win (most recent)
            assertEqual(finalState.completedCount, 1, 'completedCount from second write must be preserved');
            assertEqual(finalState.inProgressCount, 0, 'inProgressCount from second write must be preserved');
        }
    }
];

// ============================================================================
// State-library isolation (survivor libs: temp-file-cleanup, ck-session-state,
// todo-state, workflow-state). Relocated from the former subagent-concurrency
// suite; these exercise SURVIVING libs only — every deleted-hook assert
// (post-compact-recovery, bash-cleanup, write-compact-marker, edit-state) and the
// context-injection asserts (subagent-init*.cjs dispatchers) were dropped.
// ============================================================================
const { TEMP_FILE_PATTERN } = require('../../lib/temp-file-cleanup.cjs');
const { writeSessionState, readSessionState, deleteSessionState } = require('../../lib/ck-session-state.cjs');
const { saveState, loadState, clearState } = require('../../lib/workflow-state.cjs');

const stateIsolationTests = [
    {
        name: 'TC-SUBCTX-058: TEMP_FILE_PATTERN matches tmpclaude-* files and rejects progress files',
        fn() {
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd'), 'Should match valid tmpclaude-*-cwd');
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-f0e1d2c3-cwd'), 'Should match all-hex tmpclaude-*-cwd');
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-20260414120000-aabbcc.progress.md'), 'Must NOT match progress files');
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-00000000000000000-ffffff.progress.md'), 'Must NOT match long-ts progress');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123-cwd-extra'), 'Must NOT match extra suffix');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-ABCDEF00-cwd'), 'Must NOT match uppercase hex');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd.json'), 'Must NOT match with extension');
            assertFalse(TEMP_FILE_PATTERN.test(''), 'Must NOT match empty string');
        }
    },
    {
        name: 'TC-SUBCTX-061: writeSessionState/readSessionState isolates data between sessions',
        fn() {
            const sessA = 'sess-061-A';
            const sessB = 'sess-061-B';
            try {
                writeSessionState(sessA, { agent: 'alpha', step: 1 });
                writeSessionState(sessB, { agent: 'beta', step: 99 });

                const stateA = readSessionState(sessA);
                const stateB = readSessionState(sessB);

                assertTrue(stateA !== null, 'sess-A state must exist');
                assertTrue(stateB !== null, 'sess-B state must exist');
                assertEqual(stateA.agent, 'alpha', 'sess-A must read its own agent field');
                assertEqual(stateB.agent, 'beta', 'sess-B must read its own agent field');
                assertEqual(stateA.step, 1, 'sess-A step must not be overwritten by sess-B');
                assertEqual(stateB.step, 99, 'sess-B step must not be overwritten by sess-A');
            } finally {
                deleteSessionState(sessA);
                deleteSessionState(sessB);
            }
        }
    },
    {
        name: 'TC-SUBCTX-062: sequential setTodoState writes produce valid JSON final state (atomic rename)',
        fn() {
            const sessionId = 'sess-062-rapid';
            try {
                for (let i = 0; i < 10; i++) {
                    const ok = setTodoState(sessionId, {
                        hasTodos: true,
                        pendingCount: 10 - i,
                        completedCount: i,
                        inProgressCount: 1,
                        lastTodos: [],
                        bypasses: [],
                        taskSubjects: {},
                        metadata: {}
                    });
                    assertTrue(ok, `setTodoState write #${i} must succeed`);
                }

                const finalState = getTodoState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null after rapid writes');
                assertEqual(finalState.hasTodos, true, 'hasTodos must be preserved');
                assertEqual(finalState.pendingCount, 1, 'pendingCount from last write must be 1');
                assertEqual(finalState.completedCount, 9, 'completedCount from last write must be 9');
            } finally {
                try { clearTodoState(sessionId); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-072: saveState() Windows-safe fallback preserves valid JSON on sequential writes',
        fn() {
            const sessionId = 'sess-072-wf-rename';
            try {
                const ok1 = saveState(sessionId, {
                    workflowType: 'bugfix', workflowSteps: ['scout', 'fix'], currentStepIndex: 0,
                    completedSteps: [], activePlan: null, todos: [], metadata: {}
                });
                assertTrue(ok1, 'First saveState must succeed');

                const ok2 = saveState(sessionId, {
                    workflowType: 'bugfix', workflowSteps: ['scout', 'fix'], currentStepIndex: 1,
                    completedSteps: ['scout'], activePlan: null, todos: [], metadata: {}
                });
                assertTrue(ok2, 'Second saveState must succeed (Windows-safe fallback)');

                const finalState = loadState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null');
                assertEqual(finalState.workflowType, 'bugfix', 'workflowType must be preserved');
                assertEqual(finalState.currentStepIndex, 1, 'currentStepIndex from second write must win');
                assertEqual(finalState.completedSteps.length, 1, 'completedSteps from second write must be preserved');
            } finally {
                try { clearState(sessionId); } catch (_) {}
            }
        }
    },
    {
        name: 'TC-SUBCTX-074: writeSessionState() Windows-safe fallback preserves valid JSON on sequential writes',
        fn() {
            const sessionId = 'sess-074-ck-rename';
            try {
                const ok1 = writeSessionState(sessionId, { phase: 'init', count: 1 });
                assertTrue(ok1, 'First writeSessionState must succeed');

                const ok2 = writeSessionState(sessionId, { phase: 'active', count: 2 });
                assertTrue(ok2, 'Second writeSessionState must succeed (Windows-safe fallback)');

                const finalState = readSessionState(sessionId);
                assertTrue(finalState !== null, 'Final state must not be null');
                assertEqual(finalState.phase, 'active', 'phase from second write must win');
                assertEqual(finalState.count, 2, 'count from second write must be preserved');
            } finally {
                try { deleteSessionState(sessionId); } catch (_) {}
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Session Lifecycle & State Isolation',
    tests: [...sessionInitTests, ...sessionEndTests, ...configEdgeCaseTests, ...todoStateConcurrencyTests, ...stateIsolationTests]
};
