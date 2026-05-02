/**
 * Pre-Compact Snapshot Test Suite
 *
 * Tests for:
 * - pre-compact-snapshot.cjs: Captures last 200 readable transcript lines before compact
 * - post-compact-recovery.cjs: Injects snapshot block after compact (SessionStart)
 *
 * Verifies the fix that extended extractReadableLines to include:
 *   - tool_use blocks  → [tool:<name>] <input summary>
 *   - tool_result blocks → [result] <text excerpt>
 *   - text blocks (original behavior preserved)
 * And that the limit was raised from 100 to 200 lines.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');

const { runHook, getHookPath, createSessionStartInput, createPreCompactInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertTrue, assertFalse, assertContains, assertNotContains, assertAllowed } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');
const ckPaths = require('../../lib/ck-paths.cjs');

const SNAPSHOT_HOOK = getHookPath('pre-compact-snapshot.cjs');
const RECOVERY_HOOK = getHookPath('post-compact-recovery.cjs');
const COMPACT_MARKER_HOOK = getHookPath('write-compact-marker.cjs');

const generateSessionId = () => `test-snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// ---------------------------------------------------------------------------
// Transcript builder helpers
// ---------------------------------------------------------------------------

function makeTextMsg(role, text) {
    return JSON.stringify({ message: { role, content: [{ type: 'text', text }] } });
}

function makeToolUseMsg(name, input) {
    return JSON.stringify({ message: { role: 'assistant', content: [
        { type: 'text', text: `Calling ${name}.` },
        { type: 'tool_use', id: 'tu_1', name, input }
    ] } });
}

function makeToolResultMsg(text) {
    return JSON.stringify({ message: { role: 'user', content: [
        { type: 'tool_result', tool_use_id: 'tu_1', content: [{ type: 'text', text }] }
    ] } });
}

function makeStringContentMsg(role, text) {
    return JSON.stringify({ message: { role, content: text } });
}

function writeTranscript(tmpDir, lines) {
    const p = path.join(tmpDir, 'transcript.jsonl');
    fs.writeFileSync(p, lines.join('\n'));
    return p;
}

function readSnapshot(sessionId) {
    const p = ckPaths.getSnapshotPath(sessionId);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function cleanSnapshot(sessionId) {
    try { fs.unlinkSync(ckPaths.getSnapshotPath(sessionId)); } catch { /* ok */ }
}

function writeMarker(sessionId) {
    ckPaths.ensureDir(path.dirname(ckPaths.getMarkerPath(sessionId)));
    fs.writeFileSync(ckPaths.getMarkerPath(sessionId), JSON.stringify({
        sessionId, trigger: 'auto', timestamp: Date.now()
    }));
}

function cleanMarker(sessionId) {
    try { fs.unlinkSync(ckPaths.getMarkerPath(sessionId)); } catch { /* ok */ }
}

// ---------------------------------------------------------------------------
// TC-SNAP-001: text-only messages captured
// ---------------------------------------------------------------------------
const textOnlyTests = [
    {
        name: '[pre-compact-snapshot] TC-SNAP-001: captures text-only human and assistant messages',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeTextMsg('user', 'Fix the build'),
                    makeTextMsg('assistant', 'Running dotnet build now.')
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot file should be written');
                assertTrue(snap.lines.some(l => l.includes('[Human]: Fix the build')), 'Should capture human text');
                assertTrue(snap.lines.some(l => l.includes('[Assistant]: Running dotnet build')), 'Should capture assistant text');
                assertTrue(snap.lineCount === snap.lines.length, 'lineCount should match lines array length');
                assertTrue(typeof snap.capturedAt === 'number', 'capturedAt should be a number');
                assertTrue(Date.now() - snap.capturedAt < 10000, 'capturedAt should be recent (within 10s)');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    // TC-SNAP-002: string content (non-array) messages
    {
        name: '[pre-compact-snapshot] TC-SNAP-002: captures string-content messages (non-array format)',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeStringContentMsg('user', 'Show me the logs'),
                    makeStringContentMsg('assistant', 'Here are the logs.')
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                assertTrue(snap.lines.some(l => l.includes('Show me the logs')), 'Should capture string-content human msg');
                assertTrue(snap.lines.some(l => l.includes('Here are the logs')), 'Should capture string-content assistant msg');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-003: tool_use blocks captured
// ---------------------------------------------------------------------------
const toolUseTests = [
    {
        name: '[pre-compact-snapshot] TC-SNAP-003: captures tool_use block with tool name and input summary',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeToolUseMsg('Edit', { file_path: '/src/Foo.cs', old_string: 'x', new_string: 'y' })
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                const line = snap.lines.find(l => l.includes('[tool:Edit]'));
                assertTrue(line !== undefined, 'Should have a [tool:Edit] line');
                assertContains(line, 'file_path', 'tool_use line should include input key');
                assertContains(line, '/src/Foo.cs', 'tool_use line should include file path value');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-004: captures Bash tool_use with command input',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeToolUseMsg('Bash', { command: 'dotnet build Example.sln', description: 'Build solution' })
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                const line = snap.lines.find(l => l.includes('[tool:Bash]'));
                assertTrue(line !== undefined, 'Should have a [tool:Bash] line');
                assertContains(line, 'dotnet build', 'Bash tool line should contain command');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-005: text and tool_use in same message joined with pipe separator',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeToolUseMsg('Read', { file_path: '/docs/readme.md' })
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                const line = snap.lines.find(l => l.includes('[tool:Read]'));
                assertTrue(line !== undefined, 'Should have [tool:Read] line');
                // Text part ("Calling Read.") + tool_use part joined with " | "
                assertContains(line, 'Calling Read.', 'Should include text part of message');
                assertContains(line, ' | ', 'Text and tool_use should be separated by pipe');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-006: tool_result blocks captured
// ---------------------------------------------------------------------------
const toolResultTests = [
    {
        name: '[pre-compact-snapshot] TC-SNAP-006: captures tool_result block with result text',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const transcriptPath = writeTranscript(tmpDir, [
                    makeToolResultMsg('Build succeeded. 0 errors, 0 warnings.')
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                const line = snap.lines.find(l => l.includes('[result]'));
                assertTrue(line !== undefined, 'Should have a [result] line');
                assertContains(line, 'Build succeeded', 'Result line should contain result text');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-007: tool_result text truncated at 200 chars',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const longResult = 'X'.repeat(500);
                const transcriptPath = writeTranscript(tmpDir, [
                    makeToolResultMsg(longResult)
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                const line = snap.lines.find(l => l.includes('[result]'));
                assertTrue(line !== undefined, 'Should have a [result] line');
                // [result] prefix + 200 chars = line should not contain 500 X's
                const resultPart = line.split('[result] ')[1] || '';
                assertTrue(resultPart.length <= 200, `Result excerpt should be ≤200 chars, got ${resultPart.length}`);
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-008: empty tool_result content produces no [result] line',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                // tool_result with empty string content
                const transcriptPath = writeTranscript(tmpDir, [
                    JSON.stringify({ message: { role: 'user', content: [
                        { type: 'tool_result', tool_use_id: 'tu_1', content: [{ type: 'text', text: '' }] }
                    ] } })
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                // Empty result → no line emitted → no snapshot (lineCount 0 → exits without writing)
                // OR snapshot not written at all. Both are valid behaviors.
                if (snap !== null) {
                    assertFalse(snap.lines.some(l => l.includes('[result]')), 'Should not emit [result] line for empty content');
                }
                // If snap is null, hook exited early — also correct
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-009: 200-line limit
// ---------------------------------------------------------------------------
const lineLimitTests = [
    {
        name: '[pre-compact-snapshot] TC-SNAP-009: captures at most 200 readable lines (was 100)',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                // Generate 250 text messages
                const lines = [];
                for (let i = 1; i <= 250; i++) {
                    lines.push(makeTextMsg('user', `Message number ${i}`));
                }
                const transcriptPath = writeTranscript(tmpDir, lines);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                assertEqual(snap.lineCount, 200, 'Should capture exactly 200 lines');
                assertEqual(snap.lines.length, 200, 'lines array should have 200 entries');
                // Last line should be message 250, first should be message 51
                assertContains(snap.lines[snap.lines.length - 1], 'Message number 250', 'Last captured line should be the last message');
                assertContains(snap.lines[0], 'Message number 51', 'First captured line should be message 51 (250-200+1)');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-010: captures all lines when transcript < 200 readable lines',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const lines = [];
                for (let i = 1; i <= 50; i++) {
                    lines.push(makeTextMsg(i % 2 === 0 ? 'assistant' : 'user', `Turn ${i}`));
                }
                const transcriptPath = writeTranscript(tmpDir, lines);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                assertEqual(snap.lineCount, 50, 'Should capture all 50 lines when under 200 limit');
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-011: edge cases — empty/missing transcript
// ---------------------------------------------------------------------------
const edgeCaseTests = [
    {
        name: '[pre-compact-snapshot] TC-SNAP-011: exits cleanly when transcript_path is absent',
        fn: async () => {
            const sessionId = generateSessionId();
            const result = await runHook(SNAPSHOT_HOOK, { session_id: sessionId });
            assertAllowed(result.code);
            const snap = readSnapshot(sessionId);
            assertTrue(snap === null, 'No snapshot should be written when transcript_path is missing');
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-012: exits cleanly when transcript file does not exist',
        fn: async () => {
            const sessionId = generateSessionId();
            const result = await runHook(SNAPSHOT_HOOK, {
                transcript_path: '/tmp/nonexistent-transcript-99999.jsonl',
                session_id: sessionId
            });
            assertAllowed(result.code);
            const snap = readSnapshot(sessionId);
            assertTrue(snap === null, 'No snapshot should be written when transcript file is missing');
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-013: exits cleanly when transcript has no readable messages',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                // Only garbage / non-message lines
                const transcriptPath = writeTranscript(tmpDir, [
                    'not json at all',
                    JSON.stringify({ notAMessage: true }),
                    JSON.stringify({ message: { role: 'assistant' } }) // missing content
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);
                const snap = readSnapshot(sessionId);
                assertTrue(snap === null, 'No snapshot should be written when no readable lines exist');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-014: exits cleanly with empty stdin',
        fn: async () => {
            // Pass no input (empty string) — hook should exit 0 silently
            const result = await runHook(SNAPSHOT_HOOK, undefined);
            assertAllowed(result.code);
        }
    },

    {
        name: '[pre-compact-snapshot] TC-SNAP-015: text blocks truncated at 300 chars',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                const longText = 'A'.repeat(600);
                const transcriptPath = writeTranscript(tmpDir, [
                    makeTextMsg('user', longText)
                ]);

                const result = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(result.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should be written');
                const line = snap.lines[0];
                // "[Human]: " prefix (9) + 300 chars max
                const textPart = line.replace('[Human]: ', '');
                assertTrue(textPart.length <= 300, `Text should be ≤300 chars, got ${textPart.length}`);
            } finally {
                cleanSnapshot(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-016: post-compact-recovery injection
// ---------------------------------------------------------------------------
const recoveryInjectionTests = [
    {
        name: '[post-compact-recovery] TC-SNAP-016: injects snapshot block when marker exists and snapshot is fresh',
        fn: async () => {
            const sessionId = generateSessionId();
            try {
                // Write snapshot manually
                const snapshot = {
                    sessionId,
                    capturedAt: Date.now(),
                    lineCount: 3,
                    lines: [
                        '[Human]: fix the login bug',
                        '[Assistant]: Reading auth handler. | [tool:Read] {"file_path":"/src/Auth.cs"}',
                        '[Human]: [result] public class AuthHandler { ... }'
                    ]
                };
                ckPaths.ensureDir(path.dirname(ckPaths.getSnapshotPath(sessionId)));
                fs.writeFileSync(ckPaths.getSnapshotPath(sessionId), JSON.stringify(snapshot));

                // Write compact marker (required gate for injection)
                writeMarker(sessionId);

                // Run post-compact-recovery as if SessionStart after compact
                const input = createSessionStartInput('compact', sessionId);
                const result = await runHook(RECOVERY_HOOK, input);
                assertAllowed(result.code);

                assertContains(result.stdout, '## 📋 Context Snapshot (Before Compact)', 'Should inject snapshot header');
                assertContains(result.stdout, 'fix the login bug', 'Should contain human message from snapshot');
                assertContains(result.stdout, '[tool:Read]', 'Should contain tool_use line from snapshot');
                assertContains(result.stdout, '[result]', 'Should contain tool_result line from snapshot');
            } finally {
                cleanSnapshot(sessionId);
                cleanMarker(sessionId);
            }
        }
    },

    {
        name: '[post-compact-recovery] TC-SNAP-017: does NOT inject snapshot when compact marker is absent',
        fn: async () => {
            const sessionId = generateSessionId();
            try {
                // Write snapshot but NO compact marker
                const snapshot = {
                    sessionId,
                    capturedAt: Date.now(),
                    lineCount: 1,
                    lines: ['[Human]: some previous message']
                };
                ckPaths.ensureDir(path.dirname(ckPaths.getSnapshotPath(sessionId)));
                fs.writeFileSync(ckPaths.getSnapshotPath(sessionId), JSON.stringify(snapshot));

                // Ensure no marker
                cleanMarker(sessionId);

                const input = createSessionStartInput('startup', sessionId);
                const result = await runHook(RECOVERY_HOOK, input);
                assertAllowed(result.code);

                assertNotContains(result.stdout, '## 📋 Context Snapshot (Before Compact)', 'Should NOT inject snapshot without compact marker');
            } finally {
                cleanSnapshot(sessionId);
            }
        }
    },

    {
        name: '[post-compact-recovery] TC-SNAP-018: does NOT inject snapshot when snapshot is stale (>120 min)',
        fn: async () => {
            const sessionId = generateSessionId();
            try {
                // Write snapshot with old capturedAt (130 minutes ago)
                const staleTime = Date.now() - (130 * 60 * 1000);
                const snapshot = {
                    sessionId,
                    capturedAt: staleTime,
                    lineCount: 1,
                    lines: ['[Human]: old message from 2 hours ago']
                };
                ckPaths.ensureDir(path.dirname(ckPaths.getSnapshotPath(sessionId)));
                fs.writeFileSync(ckPaths.getSnapshotPath(sessionId), JSON.stringify(snapshot));

                writeMarker(sessionId);

                const input = createSessionStartInput('compact', sessionId);
                const result = await runHook(RECOVERY_HOOK, input);
                assertAllowed(result.code);

                assertNotContains(result.stdout, 'old message from 2 hours ago', 'Should NOT inject stale snapshot (>120 min)');
            } finally {
                cleanSnapshot(sessionId);
                cleanMarker(sessionId);
            }
        }
    },

    {
        name: '[post-compact-recovery] TC-SNAP-019: snapshot file deleted after injection (one-shot)',
        fn: async () => {
            const sessionId = generateSessionId();
            try {
                const snapshot = {
                    sessionId,
                    capturedAt: Date.now(),
                    lineCount: 1,
                    lines: ['[Human]: check if deleted after read']
                };
                ckPaths.ensureDir(path.dirname(ckPaths.getSnapshotPath(sessionId)));
                fs.writeFileSync(ckPaths.getSnapshotPath(sessionId), JSON.stringify(snapshot));
                writeMarker(sessionId);

                await runHook(RECOVERY_HOOK, createSessionStartInput('compact', sessionId));

                assertFalse(fs.existsSync(ckPaths.getSnapshotPath(sessionId)), 'Snapshot file should be deleted after injection');
            } finally {
                cleanSnapshot(sessionId); // no-op if already deleted, but safe
                cleanMarker(sessionId);
            }
        }
    }
];

// ---------------------------------------------------------------------------
// TC-SNAP-020: full pipeline integration (snapshot hook → compact → recovery)
// ---------------------------------------------------------------------------
const pipelineTests = [
    {
        name: '[pipeline] TC-SNAP-020: full flow — snapshot written, marker written, recovery injects both',
        fn: async () => {
            const sessionId = generateSessionId();
            const tmpDir = createTempDir('snap-test-');
            try {
                // Build a mixed transcript with text + tool_use + tool_result
                const transcriptLines = [
                    makeTextMsg('user', 'deploy to production'),
                    makeToolUseMsg('Bash', { command: 'kubectl apply -f deployment.yaml', description: 'Deploy' }),
                    makeToolResultMsg('deployment.apps/example-service configured'),
                    makeTextMsg('assistant', 'Deployment complete. All pods running.')
                ];
                const transcriptPath = writeTranscript(tmpDir, transcriptLines);

                // Step 1: UserPromptSubmit fires pre-compact-snapshot
                const snapResult = await runHook(SNAPSHOT_HOOK, { transcript_path: transcriptPath, session_id: sessionId });
                assertAllowed(snapResult.code);

                const snap = readSnapshot(sessionId);
                assertTrue(snap !== null, 'Snapshot should exist after pre-compact-snapshot');
                assertTrue(snap.lines.some(l => l.includes('[tool:Bash]')), 'Snapshot should contain Bash tool call');
                assertTrue(snap.lines.some(l => l.includes('[result]')), 'Snapshot should contain tool result');
                assertTrue(snap.lines.some(l => l.includes('kubectl apply')), 'Snapshot should contain command value');
                assertTrue(snap.lines.some(l => l.includes('deployment.apps/example-service')), 'Snapshot should contain result text');

                // Step 2: PreCompact fires write-compact-marker
                const markerResult = await runHook(COMPACT_MARKER_HOOK, createPreCompactInput({ session_id: sessionId }));
                assertAllowed(markerResult.code);
                assertTrue(fs.existsSync(ckPaths.getMarkerPath(sessionId)), 'Compact marker should be written');

                // Step 3: SessionStart fires post-compact-recovery
                const recoveryResult = await runHook(RECOVERY_HOOK, createSessionStartInput('compact', sessionId));
                assertAllowed(recoveryResult.code);
                assertContains(recoveryResult.stdout, '## 📋 Context Snapshot (Before Compact)', 'Recovery should inject snapshot header');
                assertContains(recoveryResult.stdout, 'kubectl apply', 'Recovery should contain tool call command');
                assertContains(recoveryResult.stdout, 'deployment.apps/example-service', 'Recovery should contain tool result');

                // Snapshot file cleaned up after injection
                assertFalse(fs.existsSync(ckPaths.getSnapshotPath(sessionId)), 'Snapshot file should be gone after recovery injection');
            } finally {
                cleanSnapshot(sessionId);
                cleanMarker(sessionId);
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Pre-Compact Snapshot System',
    tests: [
        ...textOnlyTests,
        ...toolUseTests,
        ...toolResultTests,
        ...lineLimitTests,
        ...edgeCaseTests,
        ...recoveryInjectionTests,
        ...pipelineTests
    ]
};
