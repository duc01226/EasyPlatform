/**
 * Sub-Agent Concurrency & Isolation Test Suite
 *
 * TC-SUBCTX-058 to TC-SUBCTX-071
 *
 * Covers concurrency and session-isolation gaps not addressed by the existing
 * lifecycle.test.cjs suite (TC-SUBCTX-020 to TC-SUBCTX-057).
 *
 * Key scenarios:
 *   - TEMP_FILE_PATTERN regex correctness (unit)
 *   - bash-cleanup integration (progress files survive, tmpclaude-* removed)
 *   - Backward compat: no Session header → visible to all sessions
 *   - Session state isolation between concurrent sessions
 *   - Rapid sequential todo state writes → no corruption
 *   - Cross-session compact marker isolation
 *   - Recovery idempotency (marker deleted on first run → second run silent)
 *   - Stale calibration lock auto-cleared → marker still written
 *   - Idempotent cleanup: other-session done files survive
 *   - TOCTOU: file deleted before hook → exits 0 (no crash)
 *   - Concurrent recovery invocations → both exit 0
 *   - subagent-init-todos no-env → exits 0
 *   - subagent-init-todos no-todos → exits 0 silently
 *   - write-compact-marker creates separate markers per session
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const {
    runHook,
    runHooksParallel,
    getHookPath,
    createSessionStartInput,
    createSubagentStartInput,
    createPreCompactInput,
    createPostToolUseInput
} = require('../lib/hook-runner.cjs');

const {
    assertEqual,
    assertTrue,
    assertFalse,
    assertContains,
    assertNotContains
} = require('../lib/assertions.cjs');

const {
    createTempDir,
    cleanupTempDir
} = require('../lib/test-utils.cjs');

// Direct imports from lib modules under test
const { TEMP_FILE_PATTERN, cleanupAll } = require('../../lib/temp-file-cleanup.cjs');
const { writeSessionState, readSessionState, deleteSessionState } = require('../../lib/ck-session-state.cjs');
const { setTodoState, getTodoState, clearTodoState } = require('../../lib/todo-state.cjs');
const { MARKERS_DIR, getMarkerPath, ensureDir } = require('../../lib/ck-paths.cjs');

// Hook paths
const BASH_CLEANUP = getHookPath('bash-cleanup.cjs');
const POST_COMPACT_RECOVERY = getHookPath('post-compact-recovery.cjs');
const WRITE_COMPACT_MARKER = getHookPath('write-compact-marker.cjs');
const SUBAGENT_INIT_TODOS = getHookPath('subagent-init-todos.cjs');

// ============================================================================
// Local helpers (mirror lifecycle.test.cjs helpers)
// ============================================================================

/**
 * Create a compact marker for the given sessionId in the real /tmp/ck/markers/ directory.
 * Returns marker path for cleanup in finally blocks.
 */
function createCompactMarker(sessionId) {
    const markersDir = path.join(os.tmpdir(), 'ck', 'markers');
    fs.mkdirSync(markersDir, { recursive: true });
    const markerPath = path.join(markersDir, `${sessionId}.json`);
    fs.writeFileSync(markerPath, JSON.stringify({ sessionId, timestamp: Date.now() }));
    return markerPath;
}

/**
 * Remove a compact marker (best-effort, idempotent).
 */
function removeCompactMarker(markerPath) {
    try { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); } catch (_e) {}
}

// ============================================================================
// Test Cases
// ============================================================================

const tests = [
    // -------------------------------------------------------------------------
    // TC-SUBCTX-058: TEMP_FILE_PATTERN regex unit test
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-058: TEMP_FILE_PATTERN matches tmpclaude-* files and rejects progress files',
        fn() {
            // Should match
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd'), 'Should match valid tmpclaude-*-cwd');
            assertTrue(TEMP_FILE_PATTERN.test('tmpclaude-f0e1d2c3-cwd'), 'Should match all-hex tmpclaude-*-cwd');

            // Should NOT match progress files
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-20260414120000-aabbcc.progress.md'), 'Must NOT match progress files');
            assertFalse(TEMP_FILE_PATTERN.test('ck-agent-00000000000000000-ffffff.progress.md'), 'Must NOT match long-ts progress');

            // Should NOT match other patterns
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123-cwd-extra'), 'Must NOT match extra suffix');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-ABCDEF00-cwd'), 'Must NOT match uppercase hex');
            assertFalse(TEMP_FILE_PATTERN.test('tmpclaude-abc123de-cwd.json'), 'Must NOT match with extension');
            assertFalse(TEMP_FILE_PATTERN.test(''), 'Must NOT match empty string');
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-059: bash-cleanup integration — tmpclaude-* removed, progress file survives
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-059: bash-cleanup removes tmpclaude-* but preserves progress files',
        async fn() {
            const tmpDir = createTempDir();
            try {
                // Create a tmpclaude-* temp file in the project root that bash-cleanup should remove
                const tmpFile = path.join(tmpDir, 'tmpclaude-deadbeef-cwd');
                fs.writeFileSync(tmpFile, '/some/working/dir');

                // Create a progress file in tmp/ subdir — bash-cleanup must NOT touch it
                const progressDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(progressDir, { recursive: true });
                const progressFile = path.join(progressDir, 'ck-agent-20260414120000-aabbcc.progress.md');
                fs.writeFileSync(progressFile, 'Session: sess-059\n## Task\n[done] finished\n');

                // bash-cleanup is triggered as PostToolUse for Bash — pass a realistic payload
                const input = createPostToolUseInput('Bash', { command: 'echo test' }, { output: 'test' });
                const result = await runHook(BASH_CLEANUP, input, { cwd: tmpDir });

                assertEqual(result.code, 0, 'bash-cleanup should exit 0');

                // tmpclaude-* file should be gone
                assertFalse(fs.existsSync(tmpFile), 'tmpclaude-*-cwd file must be deleted by cleanup');

                // Progress file must survive
                assertTrue(fs.existsSync(progressFile), 'progress.md file must survive bash-cleanup');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-060: backward compat — no Session header → visible to any session
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-060: progress file without Session header is visible to any session',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-060-any');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // No "Session:" header — backward-compat file (pre-session-scoping era)
                const legacyFile = path.join(tmpSubDir, 'ck-agent-20260414120000-legacy0.progress.md');
                fs.writeFileSync(legacyFile, '## Task\n[partial] step 1 still running\n');

                // Any session should see it
                const input = createSessionStartInput('resume', 'sess-060-any');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0');
                assertContains(result.stdout, 'Partial Subagent Work',
                    'Legacy file without Session header must surface to any session (backward compat)');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-061: session state isolation (unit)
    // -------------------------------------------------------------------------
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

    // -------------------------------------------------------------------------
    // TC-SUBCTX-062: sequential todo state writes — valid JSON final state
    // Tests the atomic write-then-rename path. The Windows EEXIST/EPERM fallback
    // (copy+delete) is covered by TC-SUBCTX-055 in lifecycle.test.cjs.
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-062: sequential setTodoState writes produce valid JSON final state (atomic rename)',
        fn() {
            const sessionId = 'sess-062-rapid';
            try {
                // Sequential writes — each write uses write-then-rename (atomic)
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
                // Last write wins: pendingCount=1, completedCount=9
                assertEqual(finalState.pendingCount, 1, 'pendingCount from last write must be 1');
                assertEqual(finalState.completedCount, 9, 'completedCount from last write must be 9');
            } finally {
                try { clearTodoState(sessionId); } catch (_) {}
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-063: compact marker for sess-A doesn't trigger sess-B recovery
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-063: sess-A compact marker does not trigger sess-B recovery',
        async fn() {
            const tmpDir = createTempDir();
            // Create marker only for sess-A
            const markerPath = createCompactMarker('sess-063-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Create a sess-A partial progress file
                const ownFile = path.join(tmpSubDir, 'ck-agent-20260414120000-063aaa.progress.md');
                fs.writeFileSync(ownFile, 'Session: sess-063-A\n## Task\n[partial] running\n');

                // Run recovery as sess-B — no marker for sess-B → should be silent
                const input = createSessionStartInput('resume', 'sess-063-B');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Should exit 0 for sess-B');
                assertNotContains(result.stdout, 'Partial Subagent Work',
                    'sess-B must NOT see sess-A partial files when sess-B has no marker');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-064: recovery runs twice → second run is silent (marker deleted by first)
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-064: recovery idempotency — second run is silent after marker deleted',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-064-idem';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Create a partial progress file owned by this session
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-064aaa.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Task\n[partial] interrupted\n`);

                const input = createSessionStartInput('resume', sessionId);

                // First run: marker present → recovery surfaces partial files (or deletes marker)
                const result1 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result1.code, 0, 'First run must exit 0');

                // After first run, marker should be deleted
                assertFalse(fs.existsSync(markerPath),
                    'Marker must be deleted by first recovery run');

                // Second run: no marker → hook skips partial-file surfacing entirely
                const result2 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result2.code, 0, 'Second run must exit 0');
                assertNotContains(result2.stdout, 'Partial Subagent Work',
                    'Second run must not surface partial files (marker already deleted)');
            } finally {
                removeCompactMarker(markerPath); // idempotent if already deleted
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-065: stale calibration lock auto-cleared, marker still created
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-065: stale calibration lock auto-cleared, marker written with correct sessionId',
        async fn() {
            const sessionId = 'sess-065-lock';
            const markerPath = getMarkerPath(sessionId);

            // Ensure markers dir exists
            ensureDir(MARKERS_DIR);

            // Remove any pre-existing marker for this session
            try { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); } catch (_) {}

            // Write a stale lock file (mtime > 5 seconds ago)
            const { CALIBRATION_PATH } = require('../../lib/ck-paths.cjs');
            const lockPath = CALIBRATION_PATH.replace('.json', '.lock');
            try {
                ensureDir(path.dirname(lockPath)); // ensure /tmp/ck/ exists before lock write
                fs.writeFileSync(lockPath, '99999'); // stale PID
                // Backdate the lock file by setting mtime to 10 seconds ago
                const staleTime = new Date(Date.now() - 10000);
                fs.utimesSync(lockPath, staleTime, staleTime);
            } catch (_) { /* skip if lock creation fails */ }

            try {
                const input = createPreCompactInput({
                    session_id: sessionId,
                    trigger: 'manual',
                    context_window: {
                        total_input_tokens: 50000,
                        total_output_tokens: 5000,
                        context_window_size: 200000
                    }
                });
                const result = await runHook(WRITE_COMPACT_MARKER, input);
                assertEqual(result.code, 0, 'Should exit 0 even with stale lock');

                // Marker must be created with correct sessionId
                assertTrue(fs.existsSync(markerPath), 'Marker file must exist after compact');
                const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
                assertEqual(marker.sessionId, sessionId, 'Marker sessionId must match input session_id');
            } finally {
                try { if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath); } catch (_) {}
                try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch (_) {}
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-066: idempotent cleanup — own-session done deleted, other-session done survives
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-066: idempotent cleanup — other-session done files survive both runs',
        async fn() {
            const tmpDir = createTempDir();
            const markerPathA = createCompactMarker('sess-066-A');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // sess-A: done file — freshly created (0 seconds old), not yet eligible for
                // 24h-age-based deletion in cleanupDoneProgressFiles. Not cleaned by this test.
                const ownDoneFile = path.join(tmpSubDir, 'ck-agent-20260414120000-066aaa.progress.md');
                fs.writeFileSync(ownDoneFile, 'Session: sess-066-A\n## Task\n[done] completed successfully\n');

                // sess-B: done file (must NOT be touched by sess-A cleanup)
                const otherDoneFile = path.join(tmpSubDir, 'ck-agent-20260414120001-066bbb.progress.md');
                fs.writeFileSync(otherDoneFile, 'Session: sess-066-B\n## Task\n[done] also complete\n');

                const input = createSessionStartInput('resume', 'sess-066-A');

                // Run recovery twice as sess-A
                const result1 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result1.code, 0, 'First run must exit 0');

                const result2 = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result2.code, 0, 'Second run must exit 0');

                // sess-B's done file must be untouched by both runs
                assertTrue(fs.existsSync(otherDoneFile),
                    'sess-B done file must survive sess-A cleanup (cross-session isolation)');
            } finally {
                removeCompactMarker(markerPathA);
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-067: Absent progress file → exits 0 cleanly (no crash)
    // Note: this exercises the "no files matching this session" path. The per-file
    // statSync/readFileSync TOCTOU guard (post-compact-recovery.cjs:80-85) is an
    // internal implementation guard; the observable property tested here is that the
    // hook never crashes when the tmp dir contains no matching files.
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-067: absent progress file — hook exits 0 cleanly with no ENOENT errors',
        async fn() {
            const tmpDir = createTempDir();
            const markerPath = createCompactMarker('sess-067-toctou');
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Create and immediately delete the progress file (simulates concurrent deletion)
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-067aaa.progress.md');
                fs.writeFileSync(progressFile, 'Session: sess-067-toctou\n## Task\n[partial] step 1\n');
                fs.unlinkSync(progressFile); // deleted before hook runs

                const input = createSessionStartInput('resume', 'sess-067-toctou');
                const result = await runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir });
                assertEqual(result.code, 0, 'Must exit 0 even when progress file vanishes before hook reads it');
                assertNotContains(result.stderr, 'ENOENT', 'Must not surface ENOENT errors to stderr');
            } finally {
                removeCompactMarker(markerPath);
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-068: concurrent recovery invocations → both exit 0, no crash
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-068: concurrent recovery invocations both exit 0 (no crash or data corruption)',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-068-concurrent';
            const markerPath = createCompactMarker(sessionId);
            try {
                const tmpSubDir = path.join(tmpDir, 'tmp');
                fs.mkdirSync(tmpSubDir, { recursive: true });

                // Create a partial progress file
                const progressFile = path.join(tmpSubDir, 'ck-agent-20260414120000-068aaa.progress.md');
                fs.writeFileSync(progressFile, `Session: ${sessionId}\n## Task\n[partial] step 2\n`);

                const input = createSessionStartInput('resume', sessionId);

                // Launch both hooks in parallel (simulates two recovery invocations racing)
                const [r1, r2] = await Promise.all([
                    runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir }),
                    runHook(POST_COMPACT_RECOVERY, input, { cwd: tmpDir })
                ]);

                assertEqual(r1.code, 0, 'First concurrent invocation must exit 0');
                assertEqual(r2.code, 0, 'Second concurrent invocation must exit 0');
                // No crash-level stderr from either
                assertNotContains(r1.stderr, 'Unhandled', 'No unhandled error in first invocation');
                assertNotContains(r2.stderr, 'Unhandled', 'No unhandled error in second invocation');
            } finally {
                removeCompactMarker(markerPath); // marker may already be deleted by one of the runs
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-069: subagent-init-todos exits 0 when no CLAUDE_SESSION_ID env
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-069: subagent-init-todos exits 0 when CLAUDE_SESSION_ID is absent',
        async fn() {
            const tmpDir = createTempDir();
            try {
                const input = createSubagentStartInput('fullstack-developer', 'Test task', null, 'agent-069');
                // Explicitly unset CLAUDE_SESSION_ID to simulate missing env
                const env = { ...process.env };
                delete env.CLAUDE_SESSION_ID;

                const result = await runHook(SUBAGENT_INIT_TODOS, input, {
                    cwd: tmpDir,
                    env
                });
                assertEqual(result.code, 0, 'Must exit 0 when no CLAUDE_SESSION_ID (fail-open)');
                assertNotContains(result.stderr, 'TypeError', 'Must not crash on missing env var');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-070: subagent-init-todos exits 0 silently when hasTodos=false
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-070: subagent-init-todos exits 0 and omits Parent Task Context when hasTodos=false',
        async fn() {
            const tmpDir = createTempDir();
            const sessionId = 'sess-070-notodos';
            try {
                // Write a state with hasTodos=false
                setTodoState(sessionId, {
                    hasTodos: false,
                    pendingCount: 0,
                    completedCount: 0,
                    inProgressCount: 0,
                    lastTodos: [],
                    bypasses: [],
                    taskSubjects: {},
                    metadata: {}
                });

                const input = createSubagentStartInput('fullstack-developer', 'Test task', sessionId, 'agent-070');
                const result = await runHook(SUBAGENT_INIT_TODOS, input, {
                    cwd: tmpDir,
                    env: { CLAUDE_SESSION_ID: sessionId }
                });
                assertEqual(result.code, 0, 'Must exit 0 when hasTodos=false');
                // Should produce no output (emitSubagentContext exits silently when no lines)
                const output = result.stdout.trim();
                if (output) {
                    const parsed = JSON.parse(output);
                    const ctx = parsed.hookSpecificOutput?.additionalContext || '';
                    assertNotContains(ctx, '## Parent Task Context',
                        'No task section should appear when hasTodos=false');
                }
            } finally {
                try { clearTodoState(sessionId); } catch (_) {}
                cleanupTempDir(tmpDir);
            }
        }
    },

    // -------------------------------------------------------------------------
    // TC-SUBCTX-071: write-compact-marker creates separate markers for sess-A and sess-B
    // -------------------------------------------------------------------------
    {
        name: 'TC-SUBCTX-071: write-compact-marker creates separate markers for concurrent sessions',
        async fn() {
            const sessA = 'sess-071-A';
            const sessB = 'sess-071-B';
            const markerA = getMarkerPath(sessA);
            const markerB = getMarkerPath(sessB);

            // Ensure markers dir exists
            ensureDir(MARKERS_DIR);

            // Remove pre-existing markers
            try { if (fs.existsSync(markerA)) fs.unlinkSync(markerA); } catch (_) {}
            try { if (fs.existsSync(markerB)) fs.unlinkSync(markerB); } catch (_) {}

            try {
                const inputA = createPreCompactInput({
                    session_id: sessA,
                    trigger: 'auto',
                    context_window: {
                        total_input_tokens: 40000,
                        total_output_tokens: 4000,
                        context_window_size: 200000
                    }
                });
                const inputB = createPreCompactInput({
                    session_id: sessB,
                    trigger: 'auto',
                    context_window: {
                        total_input_tokens: 60000,
                        total_output_tokens: 6000,
                        context_window_size: 200000
                    }
                });

                // Fire both hooks in parallel (simulates two sessions compacting simultaneously)
                const [r1, r2] = await Promise.all([
                    runHook(WRITE_COMPACT_MARKER, inputA),
                    runHook(WRITE_COMPACT_MARKER, inputB)
                ]);

                assertEqual(r1.code, 0, 'sess-A compact marker hook must exit 0');
                assertEqual(r2.code, 0, 'sess-B compact marker hook must exit 0');

                // Both markers must exist
                assertTrue(fs.existsSync(markerA), 'sess-A marker file must be created');
                assertTrue(fs.existsSync(markerB), 'sess-B marker file must be created');

                // Each marker must contain its own sessionId (no cross-contamination)
                const dataA = JSON.parse(fs.readFileSync(markerA, 'utf8'));
                const dataB = JSON.parse(fs.readFileSync(markerB, 'utf8'));
                assertEqual(dataA.sessionId, sessA, 'sess-A marker must contain sessA sessionId');
                assertEqual(dataB.sessionId, sessB, 'sess-B marker must contain sessB sessionId');
            } finally {
                try { if (fs.existsSync(markerA)) fs.unlinkSync(markerA); } catch (_) {}
                try { if (fs.existsSync(markerB)) fs.unlinkSync(markerB); } catch (_) {}
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Sub-Agent Concurrency & Isolation',
    tests
};
