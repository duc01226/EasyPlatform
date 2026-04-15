/**
 * Code Patterns Injector Hook Test Suite
 *
 * Tests for:
 * - code-patterns-injector.cjs: On-demand code pattern injection for Edit/Write/MultiEdit
 *
 * Covers:
 * - Edit/Write trigger with backend (.cs) and frontend (.ts/.html) paths
 * - E2E test file detection (config-driven + fallback globs)
 * - MultiEdit support (edits array format)
 * - Dedup via transcript marker within DEDUP_LINES window (code / E2E)
 * - Skip behavior for non-code files, non-Edit tools, and out-of-scope paths
 * - Graceful failure on empty/malformed input
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertNotContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir, createMockFile } = require('../lib/test-utils.cjs');

// Hook under test
const HOOK_PATH = getHookPath('code-patterns-injector.cjs');
const { CODE_PATTERNS: MARKER, E2E_CONTEXT: E2E_MARKER, DEDUP_LINES } = require('../../lib/dedup-constants.cjs');
const { generateTestFixtures } = require('../../lib/test-fixture-generator.cjs');

// Project root (4 levels up from suites/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Common run options: set CLAUDE_PROJECT_DIR so hook finds pattern files
const RUN_OPTS = { env: { CLAUDE_PROJECT_DIR: PROJECT_ROOT } };

// Config-driven test fixtures (no hardcoded project-specific paths)
const f = generateTestFixtures();

// ============================================================================
// Edit/Write Trigger Tests
// ============================================================================

const triggerTests = [
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in Services',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.backendServiceCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
            assertNotContains(result.stdout, 'typescript', 'Should NOT contain TypeScript blocks');
        }
    },
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in framework',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.frameworkCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in example app',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.exampleCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in modern app',
        fn: async () => {
            const input = { tool_name: 'Write', tool_input: { file_path: f.modernAppTs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
            assertNotContains(result.stdout, 'csharp', 'Should NOT contain C# blocks');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in legacy Web',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.legacyAppTs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .component.html in modern app',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.modernAppHtml }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in domain library',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.domainLibTs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] handles MultiEdit tool (edits array format)',
        fn: async () => {
            const input = {
                tool_name: 'MultiEdit',
                tool_input: {
                    edits: [{ file_path: f.backendServiceCs, old_string: 'a', new_string: 'b' }]
                },
                transcript_path: ''
            };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should inject for MultiEdit');
        }
    },
    {
        name: '[code-patterns-injector] skips .html outside frontend apps',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'docs/index.html' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertEqual(result.stdout.trim(), '', 'Should not inject for non-app HTML');
        }
    },
    {
        name: '[code-patterns-injector] skips non-code files (README.md)',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'README.md' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertEqual(result.stdout.trim(), '', 'Should not inject for .md file');
        }
    },
    {
        name: '[code-patterns-injector] skips .cs outside backend service paths',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'docs/example.cs' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertEqual(result.stdout.trim(), '', 'Should not inject for out-of-scope .cs');
        }
    },
    {
        name: '[code-patterns-injector] skips non-Edit/Write tools (Read)',
        fn: async () => {
            const input = { tool_name: 'Read', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertEqual(result.stdout.trim(), '', 'Should not inject for Read tool');
        }
    },
    {
        name: '[code-patterns-injector] skips Skill tool',
        fn: async () => {
            const input = { tool_name: 'Skill', tool_input: { skill: 'cook' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertEqual(result.stdout.trim(), '', 'Should not inject for Skill tool');
        }
    }
];

// ============================================================================
// Dedup Behavior Tests
// ============================================================================

const dedupTests = [
    {
        name: '[code-patterns-injector] skips when marker in recent transcript (within dedup window)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create transcript with marker within last 300 lines
                const lines = Array(100).fill('some line').concat([MARKER]).concat(Array(50).fill('more content'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertEqual(result.stdout.trim(), '', 'Should skip when marker in recent transcript');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] injects when marker beyond dedup window',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Marker at top, then enough lines so marker is outside the dedup window
                const lines = [MARKER].concat(Array(DEDUP_LINES.CODE_PATTERNS + 100).fill('other content'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertContains(result.stdout, MARKER, 'Should inject when marker is beyond dedup window');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] injects when no transcript path provided',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should inject when no transcript');
        }
    }
];

// ============================================================================
// Graceful Failure Tests
// ============================================================================

const failureTests = [
    {
        name: '[code-patterns-injector] exits 0 on empty stdin',
        fn: async () => {
            const result = await runHook(HOOK_PATH, undefined, RUN_OPTS);
            assertAllowed(result.code, 'Should exit 0 on empty stdin');
        }
    },
    {
        name: '[code-patterns-injector] exits 0 on empty object',
        fn: async () => {
            const result = await runHook(HOOK_PATH, {}, RUN_OPTS);
            assertAllowed(result.code, 'Should exit 0 on empty object');
        }
    },
    {
        name: '[code-patterns-injector] exits 0 on unknown tool_name',
        fn: async () => {
            const result = await runHook(HOOK_PATH, { tool_name: 'Unknown', tool_input: {} }, RUN_OPTS);
            assertAllowed(result.code, 'Should exit 0 for unknown tool');
            assertEqual(result.stdout.trim(), '', 'Should produce no output for unknown tool');
        }
    },
    {
        name: '[code-patterns-injector] exits 0 on missing tool_input',
        fn: async () => {
            const result = await runHook(HOOK_PATH, { tool_name: 'Edit' }, RUN_OPTS);
            assertAllowed(result.code, 'Should exit 0 on missing tool_input');
        }
    }
];

// ============================================================================
// E2E Context Tests
// ============================================================================

const e2eTests = [
    {
        name: '[code-patterns-injector] injects E2E context for BDD step definition (.cs in bddProject)',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should contain E2E marker');
            assertContains(result.stdout, 'E2E Testing Configuration:', 'Should contain E2E testing configuration');
            assertNotContains(result.stdout, MARKER, 'Should NOT contain code patterns marker');
        }
    },
    {
        name: '[code-patterns-injector] injects E2E context for shared page object (.cs in sharedProject)',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eSharedCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should contain E2E marker');
        }
    },
    {
        name: '[code-patterns-injector] injects E2E context for platform automation (.cs in platformProject)',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2ePlatformCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should contain E2E marker');
        }
    },
    {
        name: '[code-patterns-injector] injects E2E context for .feature file',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eFeature }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should contain E2E marker for .feature');
        }
    },
    {
        name: '[code-patterns-injector] injects E2E context for fallback e2e/ path',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eFallbackSpec }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should match fallback e2e/ pattern');
        }
    },
    {
        name: '[code-patterns-injector] injects E2E context for fallback automation/ path',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eFallbackAutomation }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, E2E_MARKER, 'Should match fallback automation/ pattern');
        }
    },
    {
        name: '[code-patterns-injector] E2E dedup uses separate marker and dedup window',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // E2E marker within last 400 lines → should skip
                const lines = Array(100).fill('some line').concat([E2E_MARKER]).concat(Array(50).fill('more'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertEqual(result.stdout.trim(), '', 'Should skip when E2E marker in recent transcript');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] E2E re-injects when E2E marker beyond dedup window',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const lines = [E2E_MARKER].concat(Array(DEDUP_LINES.E2E_CONTEXT + 100).fill('other content'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertContains(result.stdout, E2E_MARKER, 'Should re-inject when E2E marker is old');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] E2E file does not inject backend/frontend patterns',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertNotContains(result.stdout, MARKER, 'E2E should not include code patterns marker');
        }
    }
];

// ============================================================================
// Export
// ============================================================================

module.exports = {
    name: 'Code Patterns Injector Hook',
    tests: [...triggerTests, ...dedupTests, ...e2eTests, ...failureTests]
};
