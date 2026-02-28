/**
 * Code Patterns Injector Hook Test Suite
 *
 * Tests for:
 * - code-patterns-injector.cjs: On-demand code pattern injection for Edit/Write/MultiEdit
 *
 * Covers:
 * - Edit/Write trigger with backend (.cs) and frontend (.ts/.html) paths
 * - MultiEdit support (edits array format)
 * - Dedup via transcript marker within 300 lines
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
const MARKER = '## EasyPlatform Code Patterns';

// Project root (4 levels up from suites/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Common run options: set CLAUDE_PROJECT_DIR so hook finds pattern files
const RUN_OPTS = { env: { CLAUDE_PROJECT_DIR: PROJECT_ROOT } };

// ============================================================================
// Edit/Write Trigger Tests
// ============================================================================

const triggerTests = [
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in Services',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Services/bravoGROWTH/Application/SaveCommand.cs' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
            // Backend patterns should have C# content
            assertContains(result.stdout, 'csharp', 'Should contain C# code blocks');
            assertNotContains(result.stdout, 'typescript', 'Should NOT contain TypeScript blocks');
        }
    },
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in Platform',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Platform/Easy.Platform/Domain/Entity.cs' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects backend patterns for .cs in PlatformExampleApp',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/PlatformExampleApp/TextSnippet/SaveCommand.cs' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in WebV2',
        fn: async () => {
            const input = { tool_name: 'Write', tool_input: { file_path: 'src/WebV2/apps/growth/component.ts' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
            assertContains(result.stdout, 'typescript', 'Should contain TypeScript blocks');
            assertNotContains(result.stdout, 'csharp', 'Should NOT contain C# blocks');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in legacy Web',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Web/bravoTALENTS/user-list.component.ts' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
            assertContains(result.stdout, 'typescript', 'Should contain TypeScript blocks');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .component.html in WebV2',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/WebV2/apps/growth/user-list.component.html' }, transcript_path: '' };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns-injector] injects frontend patterns for .ts in libs/bravo-domain',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'libs/bravo-domain/employee.service.ts' }, transcript_path: '' };
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
                    edits: [{ file_path: 'src/Services/bravoGROWTH/Application/SaveCommand.cs', old_string: 'a', new_string: 'b' }]
                },
                transcript_path: ''
            };
            const result = await runHook(HOOK_PATH, input, RUN_OPTS);
            assertAllowed(result.code);
            assertContains(result.stdout, MARKER, 'Should inject for MultiEdit');
        }
    },
    {
        name: '[code-patterns-injector] skips .html outside WebV2/Web',
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
        name: '[code-patterns-injector] skips .cs outside Platform/Services/PlatformExampleApp',
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
            const input = { tool_name: 'Read', tool_input: { file_path: 'src/Services/bravoGROWTH/Save.cs' }, transcript_path: '' };
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
        name: '[code-patterns-injector] skips when marker in recent transcript (within 300 lines)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create transcript with marker within last 300 lines
                const lines = Array(100).fill('some line').concat([MARKER]).concat(Array(50).fill('more content'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Services/bravoGROWTH/Save.cs' }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertEqual(result.stdout.trim(), '', 'Should skip when marker in recent transcript');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] injects when marker beyond 300 lines ago',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Marker at top, then 400+ lines of content (marker will be outside last 300 lines)
                const lines = [MARKER].concat(Array(400).fill('other content'));
                const transcriptPath = createMockFile(tmpDir, 'transcript.jsonl', lines.join('\n'));

                const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Services/bravoGROWTH/Save.cs' }, transcript_path: transcriptPath };
                const result = await runHook(HOOK_PATH, input, RUN_OPTS);
                assertAllowed(result.code);
                assertContains(result.stdout, MARKER, 'Should inject when marker is beyond 300 lines');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[code-patterns-injector] injects when no transcript path provided',
        fn: async () => {
            const input = { tool_name: 'Edit', tool_input: { file_path: 'src/Services/bravoGROWTH/Save.cs' }, transcript_path: '' };
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
// Export
// ============================================================================

module.exports = {
    name: 'Code Patterns Injector Hook',
    tests: [...triggerTests, ...dedupTests, ...failureTests]
};
