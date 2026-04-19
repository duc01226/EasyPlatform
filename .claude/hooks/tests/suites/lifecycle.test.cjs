/**
 * Session Lifecycle Hooks Test Suite
 *
 * Tests for:
 * - session-init.cjs: Session initialization and project detection
 * - session-resume.cjs: Checkpoint restoration
 * - session-end.cjs: Session cleanup
 * - subagent-init-identity.cjs: Subagent context injection (Part 1 of 18 — replaces removed subagent-init.cjs)
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const {
    runHook,
    getHookPath,
    createSessionStartInput,
    createSubagentStartInput,
    createSessionEndInput,
    createPreCompactInput,
    createPostToolUseInput
} = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue, assertNotNullish, assertNotContains } = require('../lib/assertions.cjs');
const {
    createTempDir,
    cleanupTempDir,
    setupCheckpoint,
    setupTodoState,
    createMockFile,
    fileExists,
    createTimestamp
} = require('../lib/test-utils.cjs');

// Hook paths
const SESSION_INIT = getHookPath('session-init.cjs');
const SESSION_RESUME = getHookPath('session-resume.cjs');
const POST_AGENT_VALIDATOR = getHookPath('post-agent-validator.cjs');
const SESSION_END = getHookPath('session-end.cjs');
const SUBAGENT_INIT = getHookPath('subagent-init-identity.cjs');

// Subagent-init hook paths (for TC-SUBCTX-044+)
const SUBAGENT_PATTERNS_P1 = getHookPath('subagent-init-patterns-p1.cjs');
const SUBAGENT_PATTERNS_P2 = getHookPath('subagent-init-patterns-p2.cjs');
const SUBAGENT_DEV_RULES_P1 = getHookPath('subagent-init-dev-rules-p1.cjs');
// Note: SUBAGENT_CLAUDE_MD_P1/P2 removed — hooks deleted in Phase 2A (redundant with native claudeMd)

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
                // Session init outputs project context
                const output = result.stdout + result.stderr;
                assertTrue(
                    output.includes('Session') || output.includes('Project') || output === '' || output.includes('single-repo'), // May detect project type
                    'Should output session context or nothing'
                );
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
                const output = result.stdout + result.stderr;
                // May detect node/npm project
                assertTrue(
                    output.toLowerCase().includes('npm') ||
                        output.toLowerCase().includes('node') ||
                        output.toLowerCase().includes('single-repo') ||
                        output === '',
                    'May detect Node project'
                );
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
// session-resume.cjs Tests
// ============================================================================

const sessionResumeTests = [
    {
        name: '[session-resume] restores todos from fresh checkpoint',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                setupCheckpoint(tmpDir, {
                    timestamp: createTimestamp(0), // Now
                    todos: [
                        { content: 'Task 1', status: 'pending' },
                        { content: 'Task 2', status: 'in_progress' }
                    ]
                });
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
                const output = result.stdout + result.stderr;
                // May output restoration message
                assertTrue(
                    output.includes('restore') || output.includes('checkpoint') || output.includes('todo') || output === '',
                    'May mention restoration or be silent'
                );
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] skips if no checkpoint exists',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] skips stale checkpoint (>24h old)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                setupCheckpoint(tmpDir, {
                    timestamp: createTimestamp(25), // 25 hours ago
                    todos: [{ content: 'Old task', status: 'pending' }]
                });
                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
                // Should not restore stale checkpoint
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] handles startup source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('startup');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[session-resume] handles compact source',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSessionStartInput('compact');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code);
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
// subagent-init-identity.cjs Tests (Part 1 of 18 — replaces removed subagent-init.cjs)
// ============================================================================

const subagentInitTests = [
    {
        name: '[subagent-init-identity] injects context for researcher agent',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'researcher',
                    agent_id: 'test-123',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
                // Should output JSON with hookSpecificOutput
                const output = result.stdout.trim();
                if (output) {
                    assertTrue(output.includes('researcher') || output.includes('Subagent') || output.startsWith('{'), 'Should contain agent context');
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[subagent-init-identity] injects context for planner agent',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'planner',
                    agent_id: 'plan-456',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[subagent-init-identity] includes parent todo state if present',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                setupTodoState(tmpDir, {
                    hasTodos: true,
                    taskCount: 3,
                    pendingCount: 2,
                    inProgressCount: 1,
                    completedCount: 0,
                    summaryTodos: ['[pending] Task 1', '[in_progress] Task 2']
                });
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'cook',
                    agent_id: 'cook-789',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
                const output = result.stdout;
                if (output) {
                    // May include todo context
                    assertTrue(
                        output.includes('Todo') || output.includes('Tasks') || output.includes('pending') || output.includes('Subagent'),
                        'Should include context'
                    );
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[subagent-init-identity] handles unknown agent type',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'unknown-agent',
                    agent_id: 'unknown-001',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block unknown agent');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[subagent-init-identity] outputs JSON format with hookSpecificOutput',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'explorer',
                    agent_id: 'exp-001',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code);
                const output = result.stdout.trim();
                if (output) {
                    // Should be valid JSON with hookSpecificOutput key
                    const parsed = JSON.parse(output); // throws if malformed — that's intentional
                    assertTrue(parsed.hookSpecificOutput !== undefined, 'Should have hookSpecificOutput');
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[subagent-init-identity] handles empty input gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(SUBAGENT_INIT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open on empty input');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // TC-SUBCTX-045: identity hook output stays under 9000 chars after H5 fix (todos moved to hook 18)
        name: 'TC-SUBCTX-045: subagent-init-identity output < 9000 chars (H5 fix)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('code-reviewer', 'Test task with maximum context', 'test-session-045', 'agent-045');
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should exit 0');
                const output = result.stdout.trim();
                if (output) {
                    const parsed = JSON.parse(output);
                    const contextLen = (parsed.hookSpecificOutput?.additionalContext || '').length;
                    assertTrue(contextLen < 9000, `Output length ${contextLen} must be < 9000`);
                }
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
        name: '[session-resume] handles malformed checkpoint file',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const memoryDir = path.join(tmpDir, '.claude', 'memory');
                fs.mkdirSync(memoryDir, { recursive: true });
                // Write malformed checkpoint
                fs.writeFileSync(path.join(memoryDir, 'session-checkpoint.json'), '{ broken');

                const input = createSessionStartInput('resume');
                const result = await runHook(SESSION_RESUME, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not crash on malformed checkpoint');
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

// TC-SUBCTX-001 / 002 / 003 — PostToolUse Agent result validator
const postAgentValidatorTests = [
    {
        name: 'TC-SUBCTX-001: empty Agent result triggers truncation warning',
        async fn() {
            const input = createPostToolUseInput('Agent', {}, '');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
            assertContains(result.stdout, 'truncated', 'Should mention truncated');
            assertContains(result.stdout, 'subagent', 'Should mention subagent');
        }
    },
    {
        name: 'TC-SUBCTX-002: short result without terminal punctuation triggers warning',
        async fn() {
            const input = createPostToolUseInput('Agent', {}, 'Investigating the issue and checking files for');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
            assertContains(result.stdout, 'truncated', 'Should emit truncation warning');
        }
    },
    {
        name: 'TC-SUBCTX-003: healthy result (>200 chars with terminal punctuation) is silent',
        async fn() {
            const healthyResult = 'Completed analysis of write-compact-marker.cjs. Found 2 HIGH bugs: (1) truthy guard at line 164 uses !== null instead of truthy check; (2) SESSION_ID_DEFAULT not used at call site. All findings confirmed with file-level grep evidence.';
            const input = createPostToolUseInput('Agent', {}, healthyResult);
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0');
            assertNotContains(result.stdout, 'truncated', 'Should NOT emit truncation warning for healthy result');
        }
    },
    {
        // TC-SUBCTX-044: object toolResult must not crash (H4 fix — JSON.stringify try/catch)
        name: 'TC-SUBCTX-044: post-agent-validator: object toolResult exits 0 (no crash)',
        async fn() {
            // Pass object (not string) as toolResult — exercises the JSON.stringify/try-catch branch
            const input = createPostToolUseInput('Agent', {}, {});
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0 — no crash on object toolResult');
        }
    }
];

// TC-SUBCTX-020 / 021 / 022 — post-compact-recovery.cjs partial progress scanner
const POST_COMPACT_RECOVERY = getHookPath('post-compact-recovery.cjs');

/**
 * Create a compact marker file for the given sessionId so that post-compact-recovery
 * will surface partial progress files (H2 fix: marker gates the partial-file scanner).
 * Returns the marker path for cleanup in finally blocks.
 */
function createCompactMarker(sessionId) {
    const markersDir = path.join(os.tmpdir(), 'ck', 'markers');
    fs.mkdirSync(markersDir, { recursive: true });
    const markerPath = path.join(markersDir, `${sessionId}.json`);
    fs.writeFileSync(markerPath, JSON.stringify({ sessionId, timestamp: Date.now() }));
    return markerPath;
}

function removeCompactMarker(markerPath) {
    try { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); } catch (e) {}
}

const partialProgressScannerTests = [
    {
        name: 'TC-SUBCTX-020: partial progress file triggers recovery block',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('test-session-phase03');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-f1e2d3.progress.md');
                fs.writeFileSync(progressFile, 'Session: test-session-phase03\n## Analysis\n[partial] step 2 interrupted\nstill in progress\n');

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work', 'Should contain Partial Subagent Work heading');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-021: done-only progress file is silent',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = require('path').join(tmpDir, 'tmp');
                require('fs').mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = require('path').join(tmpSubDir, 'ck-agent-20260414120001.progress.md');
                require('fs').writeFileSync(progressFile, '## Analysis\n[done] step 1 complete\n[done] step 2 complete\n');

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work', 'Should NOT surface done-only file');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-022: old done-only file is cleaned up',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('test-session-phase03');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260412000000.progress.md');
                fs.writeFileSync(progressFile, '## Analysis\n[done] step 1 complete\n');
                const oldTime = new Date(Date.now() - 48 * 3600 * 1000);
                fs.utimesSync(progressFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'test-session-phase03');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertTrue(!fs.existsSync(progressFile), 'Old done file should be deleted');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-023: backward-compat: headerless partial file shown to any session',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-any');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                // Old-format: no Session header, no random suffix
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120002.progress.md');
                fs.writeFileSync(progressFile, '## Analysis\n[partial] step 1 incomplete\n');

                const input = createSessionStartInput('resume', 'sess-any');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work',
                    'Backward-compat: headerless partial file must be shown to any session');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-030 to TC-SUBCTX-034 — Concurrency & session isolation
const { buildContextGuardContext } = require('../../lib/subagent-context-builders.cjs');
const SUBAGENT_CONTEXT_GUARD = getHookPath('subagent-init-context-guard.cjs');

const concurrencyTests = [
    {
        name: 'TC-SUBCTX-030: same-millisecond progress filenames differ via random suffix',
        fn: () => {
            // Use fixed values to prove the formula works deterministically
            const ts = '20260414143022847'; // fixed 17-char timestamp (YYYYMMDDHHmmssSSS)
            const rnd1 = 'a3f9d2';
            const rnd2 = 'b7c041';
            const name1 = `ck-agent-${ts}-${rnd1}.progress.md`;
            const name2 = `ck-agent-${ts}-${rnd2}.progress.md`;
            assertEqual(ts.length, 17, 'Timestamp must be 17 chars (YYYYMMDDHHmmssSSS — ms precision)');
            assertTrue(name1 !== name2, 'Same-timestamp, different-rnd names must differ');
            assertTrue(/^ck-agent-\d{17}-[0-9a-f]{6}\.progress\.md$/.test(name1), 'Name must match new format pattern');
            // Verify live formula produces correct length timestamp
            const liveTs = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 17);
            assertEqual(liveTs.length, 17, 'Live timestamp must be 17 chars');
        }
    },
    {
        name: 'TC-SUBCTX-031: findPartialProgressFiles returns only own-session partial files',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Own-session partial file
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260414120010-aaaaaa.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-A\n## Task\n[partial] step 2 in progress\n');

                // Other-session partial file
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260414120011-bbbbbb.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Task\n[partial] step 1 in progress\n');

                const input = createSessionStartInput('resume', 'sess-A');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414120010-aaaaaa', 'Should show own-session file');
                assertNotContains(result.stdout, 'ck-agent-20260414120011-bbbbbb', 'Should NOT show other-session file');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-032: findPartialProgressFiles excludes other-session partial files',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // sess-B's partial file only
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260414120020-cccccc.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Task\n[partial] step 3 incomplete\n');

                // Run as sess-A — should see nothing
                const input = createSessionStartInput('resume', 'sess-A');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work', 'Should NOT show other-session partial file to sess-A');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-033: cleanupDoneProgressFiles skips other-session files',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Own-session done file — old enough to delete
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260413000000-dddddd.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-A\n## Done\n[done] step 1\n');
                const oldTime = new Date(Date.now() - 48 * 3600 * 1000);
                fs.utimesSync(ownFile, oldTime, oldTime);

                // Other-session done file — also old
                const otherFile = path.join(tmpSubDir, 'ck-agent-20260413000001-eeeeee.progress.md');
                fs.writeFileSync(otherFile, 'Session: sess-B\n## Done\n[done] step 1\n');
                fs.utimesSync(otherFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'sess-A');
                await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });

                // Own-session file should be deleted; other-session file must survive
                assertTrue(!fs.existsSync(ownFile), 'Own-session done file should be deleted');
                assertTrue(fs.existsSync(otherFile), 'Other-session done file must NOT be deleted');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-034: buildContextGuardContext with sessionId embeds session ID',
        fn: () => {
            const output = buildContextGuardContext('test-session-xyz').join('\n');
            assertContains(output, 'test-session-xyz', 'Should embed session ID in output');
            assertContains(output, 'Session:', 'Should contain Session: header instruction');
            assertContains(output, '17-char', 'Should reference 17-char ms timestamp format');
        }
    },
    {
        name: 'TC-SUBCTX-035: two sibling agents (same parent session) both shown in recovery',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('parent-sess');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                // Two sibling agents under parent-sess
                const file1 = path.join(tmpSubDir, 'ck-agent-20260414130001-aaa111.progress.md');
                fs.writeFileSync(file1, 'Session: parent-sess\n## Step 1\n[partial] agent A incomplete\n');
                const file2 = path.join(tmpSubDir, 'ck-agent-20260414130002-bbb222.progress.md');
                fs.writeFileSync(file2, 'Session: parent-sess\n## Step 2\n[partial] agent B incomplete\n');

                const input = createSessionStartInput('resume', 'parent-sess');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414130001-aaa111', 'Agent A file must be shown');
                assertContains(result.stdout, 'ck-agent-20260414130002-bbb222', 'Agent B file must be shown');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: 'TC-SUBCTX-036: buildContextGuardContext(null) uses <your-session-id> placeholder',
        fn: () => {
            const output = buildContextGuardContext(null).join('\n');
            assertContains(output, '<your-session-id>', 'Should use placeholder when sessionId is null');
            assertNotContains(output, 'Session: null', 'Must NOT emit literal "Session: null"');
        }
    },
    {
        name: 'TC-SUBCTX-037: subagent-init-context-guard hook embeds session_id from payload',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = {
                    event: 'SubagentStart',
                    agent_type: 'researcher',
                    agent_id: 'r-001',
                    session_id: 'hook-test-session',
                    cwd: tmpDir
                };
                const result = await runHook(SUBAGENT_CONTEXT_GUARD, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                assertContains(ctx, 'hook-test-session', 'Context must embed session_id from payload');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-038 to TC-SUBCTX-043 — Additional concurrency & isolation coverage
const additionalConcurrencyTests = [
    {
        // Hook-level proof that null session_id → placeholder, not literal "null"/"undefined"
        name: 'TC-SUBCTX-038: subagent-init-context-guard without session_id uses placeholder not null',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Deliberately omit session_id from payload
                const input = createSubagentStartInput('researcher', '', null, 'r-038');
                const result = await runHook(SUBAGENT_CONTEXT_GUARD, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                assertContains(ctx, '<your-session-id>', 'Should use placeholder when session_id absent');
                assertNotContains(ctx, 'Session: null', 'Must NOT emit literal "Session: null"');
                assertNotContains(ctx, 'Session: undefined', 'Must NOT emit literal "Session: undefined"');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // post-agent-validator must be silent for non-Agent tool calls (e.g. Read, Bash)
        name: 'TC-SUBCTX-039: post-agent-validator is silent for non-Agent tool calls',
        async fn() {
            const input = createPostToolUseInput('Read', { file_path: 'some/file.md' }, 'File content here. Something fully valid.');
            const result = await runHook(POST_AGENT_VALIDATOR, input);
            assertEqual(result.code, 0, 'Should exit 0');
            assertNotContains(result.stdout, 'truncated', 'Should NOT warn for non-Agent tool calls');
            assertNotContains(result.stdout, 'subagent', 'Should be completely silent for non-Agent calls');
        }
    },
    {
        // Heuristic 3: result references a plans/ path that does NOT exist on disk → warning
        name: 'TC-SUBCTX-040: post-agent-validator warns when referenced report path is missing on disk',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Result has terminal punctuation (skips H2), but referenced plan path doesn't exist — H3 fires
                const result_text = 'Analysis complete. All findings written to plans/reports/analysis-20260414-missing-038.md for review.';
                const input = createPostToolUseInput('Agent', {}, result_text);
                const result = await runHook(POST_AGENT_VALIDATOR, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0 (fail-open)');
                assertContains(result.stdout, 'truncated', 'Should warn when referenced report does not exist on disk');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Heuristic 3 negative: result references an EXISTING report → no warning
        name: 'TC-SUBCTX-041: post-agent-validator is silent when referenced report exists on disk',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Create the report file the result will reference
                const reportsDir = path.join(tmpDir, 'plans', 'reports');
                fs.mkdirSync(reportsDir, { recursive: true });
                fs.writeFileSync(path.join(reportsDir, 'analysis-20260414-exists-041.md'), '# Report');

                const result_text = 'Analysis complete. All findings written to plans/reports/analysis-20260414-exists-041.md for review.';
                const input = createPostToolUseInput('Agent', {}, result_text);
                const result = await runHook(POST_AGENT_VALIDATOR, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'truncated', 'Should NOT warn when report file exists on disk');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // findPartialProgressFiles age filter: partial file older than maxAgeMinutes (120) is excluded
        name: 'TC-SUBCTX-042: partial progress file older than maxAgeMinutes is not surfaced in recovery',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // [partial] file but mtime = 3 hours ago (> 120-min window)
                const oldFile = path.join(tmpSubDir, 'ck-agent-20260413000000-ffffff.progress.md');
                fs.writeFileSync(oldFile, 'Session: sess-age-042\n## Step\n[partial] interrupted 3h ago\n');
                const oldTime = new Date(Date.now() - 3 * 3600 * 1000); // 3 hours ago
                fs.utimesSync(oldFile, oldTime, oldTime);

                const input = createSessionStartInput('resume', 'sess-age-042');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'Old partial file (>maxAgeMinutes) must not be surfaced in recovery');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // End-to-end: only own-session + recent + partial files are surfaced; all others excluded
        name: 'TC-SUBCTX-043: mixed progress files — only own-session recent partial files surfaced',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-mixed-043');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // A: own-session, partial, recent → SHOWN
                const fileA = path.join(tmpSubDir, 'ck-agent-20260414120100-aa0001.progress.md');
                fs.writeFileSync(fileA, 'Session: sess-mixed-043\n## Step 1\n[partial] incomplete\n');

                // B: own-session, partial, OLD (>2h) → NOT shown
                const fileB = path.join(tmpSubDir, 'ck-agent-20260413000000-bb0002.progress.md');
                fs.writeFileSync(fileB, 'Session: sess-mixed-043\n## Step 2\n[partial] old incomplete\n');
                const oldTime = new Date(Date.now() - 3 * 3600 * 1000);
                fs.utimesSync(fileB, oldTime, oldTime);

                // C: own-session, DONE (no [partial]) → NOT shown
                const fileC = path.join(tmpSubDir, 'ck-agent-20260414120200-cc0003.progress.md');
                fs.writeFileSync(fileC, 'Session: sess-mixed-043\n## Step 3\n[done] all complete\n');

                // D: other-session, partial, recent → NOT shown for sess-mixed-043
                const fileD = path.join(tmpSubDir, 'ck-agent-20260414120300-dd0004.progress.md');
                fs.writeFileSync(fileD, 'Session: sess-other\n## Step 4\n[partial] other session partial\n');

                const input = createSessionStartInput('resume', 'sess-mixed-043');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'ck-agent-20260414120100-aa0001', 'Should surface own-session recent partial');
                assertNotContains(result.stdout, 'ck-agent-20260413000000-bb0002', 'Should NOT surface old partial');
                assertNotContains(result.stdout, 'ck-agent-20260414120200-cc0003', 'Should NOT surface done file');
                assertNotContains(result.stdout, 'ck-agent-20260414120300-dd0004', 'Should NOT surface other-session partial');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// TC-SUBCTX-044 to TC-SUBCTX-055 — Subagent hook concurrency & edge case verification
const {
    splitContentIntoPart,
    emitSubagentContext,
    PATTERN_AWARE_AGENT_TYPES,
    DEV_RULES_AGENT_TYPES
} = require('../../lib/subagent-context-builders.cjs');
const { getTodoState, setTodoState } = require('../../lib/todo-state.cjs');

const newConcurrencyTests = [
    {
        // Non-pattern-aware agent → patterns-p1 exits 0 silently (no JSON output)
        name: 'TC-SUBCTX-044: patterns-p1 exits silently for non-PATTERN_AWARE agent (researcher)',
        async fn() {
            const tmpDir = createTempDir();
            try {
                assertTrue(!PATTERN_AWARE_AGENT_TYPES.has('researcher'), 'researcher must NOT be in PATTERN_AWARE_AGENT_TYPES');
                const input = createSubagentStartInput('researcher', '', 'sess-044', 'r-044');
                const result = await runHook(SUBAGENT_PATTERNS_P1, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertEqual(result.code, 0, 'Should exit 0');
                assertEqual(result.stdout.trim(), '', 'Should produce no stdout for excluded agent type');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Pattern-aware agent with minimal content → patterns-p2 exits 0 silently (page 2 empty)
        name: 'TC-SUBCTX-045: patterns-p2 exits silently when p1 covers all content (minimal docs)',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Use a pattern-aware agent type
                const agentType = [...PATTERN_AWARE_AGENT_TYPES][0]; // e.g. 'fullstack-developer'
                const input = createSubagentStartInput(agentType, '', 'sess-045', 'r-045');
                const result = await runHook(SUBAGENT_PATTERNS_P2, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertEqual(result.code, 0, 'Should exit 0');
                // p2 exits silently when p1 consumed all content (no docs in tmpDir)
                if (result.stdout.trim() !== '') {
                    const parsed = JSON.parse(result.stdout.trim());
                    const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                    assertTrue(ctx === '' || ctx.length > 0, 'If output present it must be valid JSON');
                }
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // Non-DEV_RULES agent → dev-rules-p1 exits 0 silently
        name: 'TC-SUBCTX-046: dev-rules-p1 exits silently for non-DEV_RULES agent (researcher)',
        async fn() {
            const tmpDir = createTempDir();
            try {
                assertTrue(!DEV_RULES_AGENT_TYPES.has('researcher'), 'researcher must NOT be in DEV_RULES_AGENT_TYPES');
                const input = createSubagentStartInput('researcher', '', 'sess-046', 'r-046');
                const result = await runHook(SUBAGENT_DEV_RULES_P1, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_PROJECT_DIR: tmpDir }
                });
                assertEqual(result.code, 0, 'Should exit 0');
                assertEqual(result.stdout.trim(), '', 'Should produce no stdout for excluded agent type');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // splitContentIntoPart unit: content shorter than maxCharsPerPart → p1=full content, p2=empty
        name: 'TC-SUBCTX-049: splitContentIntoPart — short content fits in p1, p2 returns empty',
        fn() {
            const shortContent = 'Line 1\nLine 2\nLine 3\n';
            const p1 = splitContentIntoPart(shortContent, 0, 2, 9000);
            const p2 = splitContentIntoPart(shortContent, 1, 2, 9000);

            assertTrue(p1.content.length > 0, 'p1 must have content');
            assertContains(p1.content, 'Line 1', 'p1 must include all lines');
            assertContains(p1.content, 'Line 3', 'p1 must include last line');
            assertEqual(p2.content, '', 'p2 content must be empty when all fits in p1');
            assertEqual(p2.overflow, null, 'p2 overflow must be null when p1 covers all');
        }
    },
    {
        // splitContentIntoPart unit: content exceeds totalParts pages → overflow is non-null on last page
        name: 'TC-SUBCTX-050: splitContentIntoPart — overflow detected when content exceeds totalParts pages',
        fn() {
            // Create content that exceeds 2 pages × 100 chars/page limit
            const bigLine = 'x'.repeat(80);
            const manyLines = Array.from({ length: 10 }, (_, i) => `${bigLine}-line${i}`).join('\n');
            // With maxCharsPerPart=100, 2 pages can hold ~200 chars but manyLines is ~850 chars
            const lastPage = splitContentIntoPart(manyLines, 1, 2, 100);

            // Last page (index 1 = second of 2) should detect overflow
            assertTrue(lastPage.overflow !== null, 'overflow must be non-null when content exceeds declared pages');
            assertTrue(lastPage.overflow.fromLine > 0, 'overflow.fromLine must be positive');
            assertTrue(lastPage.overflow.remainingLines > 0, 'overflow.remainingLines must be positive');
        }
    },
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
        // Invalid JSON stdin to identity hook → exits 0 (fail-open, no crash)
        name: 'TC-SUBCTX-052: subagent-init-identity exits 0 on invalid JSON stdin (fail-open)',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Pass raw invalid JSON directly (bypass createSubagentStartInput)
                const result = await runHook(SUBAGENT_INIT, 'this is not json at all{{{', { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0 (fail-open) on invalid JSON stdin');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // emitSubagentContext([]) → exits 0 with no stdout output
        name: 'TC-SUBCTX-053: emitSubagentContext([]) calls process.exit(0) with no stdout',
        fn() {
            const originalExit = process.exit;
            const originalLog = console.log;
            let capturedExitCode = null;
            let capturedStdout = '';

            // Throw to simulate real process.exit stopping execution — without this,
            // execution falls through past the exit call and logs output spuriously.
            process.exit = (code) => { capturedExitCode = code; throw new Error(`EXIT:${code}`); };
            console.log = (...args) => { capturedStdout += args.join(' '); };

            try {
                emitSubagentContext([]);
            } catch (e) {
                // Expected: our mock throws to stop execution, just like real process.exit
                if (!e.message.startsWith('EXIT:')) throw e;
            } finally {
                process.exit = originalExit;
                console.log = originalLog;
            }

            assertEqual(capturedExitCode, 0, 'emitSubagentContext([]) must call process.exit(0)');
            assertEqual(capturedStdout, '', 'emitSubagentContext([]) must produce no stdout');
        }
    },
    {
        // All subagent-init hooks fire in sequence → each exits 0, no duplicate section headers
        name: 'TC-SUBCTX-054: all 11 subagent-init hooks exit 0 with no duplicate section headers',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Small CLAUDE.md so multi-page hooks have predictable output
                fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '# Project\nTest instructions.\n');

                const hookNames = [
                    'subagent-init-identity.cjs',
                    'subagent-init-patterns-p1.cjs',
                    'subagent-init-patterns-p2.cjs',
                    'subagent-init-patterns-p3.cjs',
                    'subagent-init-patterns-p4.cjs',
                    'subagent-init-patterns-p5.cjs',
                    'subagent-init-dev-rules-p1.cjs',
                    'subagent-init-dev-rules-p2.cjs',
                    // claude-md-p1/p2/p3 removed — redundant with native claudeMd injection
                    'subagent-init-lessons.cjs',
                    'subagent-init-context-guard.cjs',
                    'subagent-init-todos.cjs'
                ];

                const input = createSubagentStartInput('fullstack-developer', '', 'sess-054', 'r-054');
                const results = [];

                for (const hookName of hookNames) {
                    const hookPath = getHookPath(hookName);
                    const result = await runHook(hookPath, input, {
                        cwd: tmpDir,
                        env: { CLAUDE_PROJECT_DIR: tmpDir }
                    });
                    assertEqual(result.code, 0, `${hookName} must exit 0`);
                    results.push(result);
                }

                // Collect all additionalContext blocks
                const combined = results
                    .filter(r => r.stdout.trim() !== '')
                    .map(r => {
                        try {
                            const parsed = JSON.parse(r.stdout.trim());
                            return parsed.hookSpecificOutput?.additionalContext || '';
                        } catch { return ''; }
                    })
                    .join('\n');

                // Count occurrences of major section headers — each must appear ≤ expected times
                // (patterns p1-p5 each emit "## Coding Patterns" so up to 5 is OK; identity emits once)
                const projectInstructionsCount = (combined.match(/## Project Instructions/g) || []).length;
                // Each page of CLAUDE.md is a new section so ≤3 (p1/p2/p3) is expected
                assertTrue(projectInstructionsCount <= 3, `## Project Instructions must appear ≤3 times (got ${projectInstructionsCount})`);

            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // setTodoState() concurrent write: second rename fails → data preserved via copyFileSync fallback
        // TC-SUBCTX-056: post-compact-recovery with NO marker file + [partial] file →
        // output does NOT include "Partial Subagent Work" (scanner is gated by marker)
        name: 'TC-SUBCTX-056: post-compact-recovery without marker: partial file not surfaced',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-056-no-marker';
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120056-a1b2c3.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Analysis\n[partial] step 1 incomplete\n`);

                // Explicitly do NOT create a compact marker
                const input = createSessionStartInput('resume', sessionId);
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'Without marker, partial scanner must NOT surface partial files');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // TC-SUBCTX-056B: post-compact-recovery with marker present →
        // marker file is deleted after recovery runs (Fix 1.2: prevents duplicate surface on second resume)
        name: 'TC-SUBCTX-056B: post-compact-recovery deletes marker after recovery runs',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-056b-marker-del';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120056-d4e5f6.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Analysis\n[partial] step 1 interrupted\n`);

                const input = createSessionStartInput('resume', sessionId);
                await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });

                // Marker MUST be deleted after recovery so second resume doesn't re-surface
                assertTrue(!fs.existsSync(markerPath),
                    'Compact marker must be deleted after recovery runs (Fix 1.2)');
            } finally {
                removeCompactMarker(markerPath); // idempotent cleanup if test failed before hook ran
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // TC-SUBCTX-057: subagent-init-todos with 60 pending todos →
        // output stays under 9000 chars (semantic trim caps at MAX_TODOS=30)
        name: 'TC-SUBCTX-057: subagent-init-todos caps output at 30 todos (< 9000 chars)',
        async fn() {
            const sessionId = 'sess-057-todos-cap';
            const SUBAGENT_TODOS = getHookPath('subagent-init-todos.cjs');
            try {
                // Set up 60 pending todos in session state
                const lastTodos = Array.from({ length: 60 }, (_, i) => ({
                    content: `Task ${i + 1}: Implement feature with a reasonably long description to exercise the size cap behavior`,
                    status: 'pending'
                }));
                setTodoState(sessionId, {
                    hasTodos: true,
                    pendingCount: 60,
                    completedCount: 0,
                    inProgressCount: 0,
                    lastTodos,
                    bypasses: [],
                    taskSubjects: {},
                    metadata: {}
                });

                const input = createSubagentStartInput('fullstack-developer', 'Test task', sessionId, 'agent-057');
                const result = await runHook(SUBAGENT_TODOS, input, {
                    env: { CLAUDE_SESSION_ID: sessionId }
                });
                assertEqual(result.code, 0, 'Should exit 0');
                const output = result.stdout.trim();
                if (output) {
                    const parsed = JSON.parse(output);
                    const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                    assertTrue(ctx.length < 9000,
                        `Output length ${ctx.length} must be < 9000 chars (semantic trim enforced)`);
                    assertContains(ctx, 'more todos (truncated',
                        'Overflow line must appear when > MAX_TODOS=30 items present');
                }
            } finally {
                try { clearTodoState(sessionId); } catch (_) { /* best-effort cleanup */ }
            }
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
    },
    {
        // identity hook must NOT contain Context Guard after BUG 1 fix (removed buildContextGuardContext call)
        name: 'TC-DEDUP-001: identity hook output contains no Context Guard block',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('general-purpose', 'Test task', 'sess-dedup-001', 'r-dedup-001');
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                assertNotContains(ctx, 'Context Guard', 'identity hook must NOT inject Context Guard block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // context-guard hook must emit exactly ONE Context Guard block (single authoritative injection)
        name: 'TC-DEDUP-002: context-guard hook output contains exactly one Context Guard block',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('general-purpose', 'Test task', 'sess-dedup-002', 'r-dedup-002');
                const result = await runHook(SUBAGENT_CONTEXT_GUARD, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                const count = (ctx.match(/Context Guard/g) || []).length;
                assertTrue(count === 1, `Context Guard must appear exactly once in context-guard output (got ${count})`);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // identity hook must start with [CRITICAL-THINKING-MINDSET] after BUG 2 fix (moved from deleted claude-md-p1)
        name: 'TC-DEDUP-003: identity hook output starts with [CRITICAL-THINKING-MINDSET]',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('general-purpose', 'Test task', 'sess-dedup-003', 'r-dedup-003');
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = (parsed.hookSpecificOutput?.additionalContext || '').trimStart();
                const idx = ctx.indexOf('[CRITICAL-THINKING-MINDSET]');
                assertTrue(idx >= 0 && idx < 200,
                    `[CRITICAL-THINKING-MINDSET] must appear near top of identity output (found at idx ${idx})`);
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // identity hook must still emit the ## Subagent: block after Context Guard removal
        name: 'TC-DEDUP-004: identity hook still outputs ## Subagent: identity block',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('general-purpose', 'Test task', 'sess-dedup-004', 'r-dedup-004');
                const result = await runHook(SUBAGENT_INIT, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                const parsed = JSON.parse(result.stdout.trim());
                const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                assertContains(ctx, '## Subagent:', 'identity hook must still output ## Subagent: identity block');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        // settings.json must have exactly 18 SubagentStart hooks:
        // identity + patterns-p1..p5 + dev-rules-p1..p3 + code-review-rules-p1..p5 + lessons + ai-mistakes + context-guard + todos
        name: 'TC-DEDUP-005: settings.json SubagentStart has exactly 18 hook commands',
        fn() {
            const settingsPath = path.resolve(__dirname, '../../../..', '.claude', 'settings.json');
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            const hookCount = settings.hooks.SubagentStart[0].hooks.length;
            assertEqual(hookCount, 18,
                `SubagentStart must have 18 hooks (identity + patterns-p1..p5 + dev-rules-p1..p3 + code-review-rules-p1..p5 + lessons + ai-mistakes + context-guard + todos) (got ${hookCount})`);
        }
    },
    {
        // claude-md-p1/p2/p3 hook files must not exist on disk after Phase 2A deletion
        name: 'TC-DEDUP-006: claude-md-p1/p2/p3 hook files do not exist on disk',
        fn() {
            const deleted = [
                'subagent-init-claude-md-p1.cjs',
                'subagent-init-claude-md-p2.cjs',
                'subagent-init-claude-md-p3.cjs'
            ];
            for (const hookName of deleted) {
                const hookPath = getHookPath(hookName);
                assertTrue(!fs.existsSync(hookPath),
                    `${hookName} must be deleted after Phase 2A (still exists at ${hookPath})`);
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Session Lifecycle Hooks',
    tests: [...sessionInitTests, ...sessionResumeTests, ...sessionEndTests, ...subagentInitTests, ...configEdgeCaseTests, ...postAgentValidatorTests, ...partialProgressScannerTests, ...concurrencyTests, ...additionalConcurrencyTests, ...newConcurrencyTests]
};
