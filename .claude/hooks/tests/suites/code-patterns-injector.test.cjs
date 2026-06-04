/**
 * Code Patterns Builder Test Suite  (Phase 04 migration)
 *
 * Tests for:
 * - buildCodePatterns(payload, preloadedLines) in lib/pretooluse-context-builders.cjs
 *   — the live successor to the (now consolidated) code-patterns-injector.cjs hook.
 *   The legacy module is UNREGISTERED; the dispatcher pretooluse-ctx-edit invokes
 *   this builder. The builder returns the legacy hook's trimmed stdout block, or
 *   '' when the legacy hook would have emitted nothing (proven byte-equivalent in
 *   TC-HOOKS-030). Every assertion that previously ran on `result.stdout` now runs
 *   identically on the builder's return value; exit-code assertions become
 *   "builder returns a string without throwing" (the legacy inject hook always
 *   exited 0).
 *
 * Covers:
 * - Edit/Write trigger with backend (.cs) and frontend (.ts/.html) paths
 * - E2E test file detection (config-driven + fallback globs)
 * - MultiEdit support (edits array format)
 * - Dedup via preloadedLines marker within DEDUP_LINES window (code / E2E)
 * - Skip behavior for non-code files, non-Edit tools, and out-of-scope paths
 * - Graceful return on empty/malformed input
 */

const { assertEqual, assertContains, assertNotContains, assertTrue } = require('../lib/assertions.cjs');

// Builder under test (replaces the spawned legacy code-patterns-injector.cjs)
const { buildCodePatterns } = require('../../lib/pretooluse-context-builders.cjs');
const { CODE_PATTERNS: MARKER, E2E_CONTEXT: E2E_MARKER, DEDUP_LINES } = require('../../lib/dedup-constants.cjs');
const { generateTestFixtures } = require('../../lib/test-fixture-generator.cjs');

// Config-driven test fixtures (no hardcoded project-specific paths). The runner
// sets CLAUDE_PROJECT_DIR to the repo root before this suite loads, so both the
// fixtures and the builder's module-load project config resolve to the same root
// — identical to the legacy RUN_OPTS = { env: { CLAUDE_PROJECT_DIR: ROOT } }.
const f = generateTestFixtures();

// Direct builder invocation: returns the legacy hook's trimmed stdout block (or '').
// `preloadedLines` mirrors the dispatcher's single-scan transcript dedup; null
// disables dedup (equivalent to the legacy transcript_path: '').
function build(payload, preloadedLines = null) {
    return buildCodePatterns(payload, preloadedLines);
}

// ============================================================================
// Edit/Write Trigger Tests
// ============================================================================

const triggerTests = [
    {
        name: '[code-patterns] injects backend patterns for .cs in Services',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.backendServiceCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
            assertNotContains(out, 'typescript', 'Should NOT contain TypeScript blocks');
        }
    },
    {
        name: '[code-patterns] injects backend patterns for .cs in framework',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.frameworkCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns] injects backend patterns for .cs in example app',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.exampleCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns] injects frontend patterns for .ts in modern app',
        fn: () => {
            const out = build({ tool_name: 'Write', tool_input: { file_path: f.modernAppTs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
            assertNotContains(out, 'csharp', 'Should NOT contain C# blocks');
        }
    },
    {
        name: '[code-patterns] injects frontend patterns for .ts in legacy Web',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.legacyAppTs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns] injects frontend patterns for .component.html in modern app',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.modernAppHtml }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns] injects frontend patterns for .ts in domain library',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.domainLibTs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should contain pattern marker');
        }
    },
    {
        name: '[code-patterns] handles MultiEdit tool (edits array format)',
        fn: () => {
            const out = build({
                tool_name: 'MultiEdit',
                tool_input: {
                    edits: [{ file_path: f.backendServiceCs, old_string: 'a', new_string: 'b' }]
                },
                transcript_path: ''
            });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should inject for MultiEdit');
        }
    },
    {
        name: '[code-patterns] skips .html outside frontend apps',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'docs/index.html' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should not inject for non-app HTML');
        }
    },
    {
        name: '[code-patterns] skips non-code files (README.md)',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'README.md' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should not inject for .md file');
        }
    },
    {
        name: '[code-patterns] skips .cs outside backend service paths',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'docs/example.cs' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should not inject for out-of-scope .cs');
        }
    },
    {
        name: '[code-patterns] skips non-Edit/Write tools (Read)',
        fn: () => {
            const out = build({ tool_name: 'Read', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should not inject for Read tool');
        }
    },
    {
        name: '[code-patterns] skips Skill tool',
        fn: () => {
            const out = build({ tool_name: 'Skill', tool_input: { skill: 'cook' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should not inject for Skill tool');
        }
    }
];

// ============================================================================
// Dedup Behavior Tests
// ============================================================================
// Legacy tests wrote `lines.join('\n')` to a temp transcript file and passed
// transcript_path. The builder consumes the SAME lines as a preloadedLines array
// (the dispatcher pre-splits the transcript once); wasRecentlyInjected applies
// identical `slice(-window).join('\n').includes(marker)` logic, so the dedup
// assertion is preserved exactly.

const dedupTests = [
    {
        name: '[code-patterns] skips when marker in recent transcript (within dedup window)',
        fn: () => {
            // marker within last 300 lines → dedup suppresses
            const lines = Array(100).fill('some line').concat([MARKER]).concat(Array(50).fill('more content'));
            const out = build({ tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' }, lines);
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should skip when marker in recent transcript');
        }
    },
    {
        name: '[code-patterns] injects when marker beyond dedup window',
        fn: () => {
            // Marker at top, then enough lines so marker is outside the dedup window
            const lines = [MARKER].concat(Array(DEDUP_LINES.CODE_PATTERNS + 100).fill('other content'));
            const out = build({ tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' }, lines);
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should inject when marker is beyond dedup window');
        }
    },
    {
        name: '[code-patterns] injects when no transcript provided',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: `${f.backendBase}/Save.cs` }, transcript_path: '' }, null);
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, MARKER, 'Should inject when no transcript');
        }
    }
];

// ============================================================================
// Graceful Failure Tests
// ============================================================================
// The legacy inject hook always exited 0 on empty/malformed input. The builder
// analog: returns a string (never throws) for empty/empty-object/unknown-tool/
// missing-tool_input payloads.

const failureTests = [
    {
        name: '[code-patterns] returns string on empty payload',
        fn: () => {
            const out = build({});
            assertTrue(typeof out === 'string', 'Should return a string (analog of exit 0 on empty stdin)');
        }
    },
    {
        name: '[code-patterns] returns string on empty object tool_input',
        fn: () => {
            const out = build({ tool_name: '', tool_input: {} });
            assertTrue(typeof out === 'string', 'Should return a string (analog of exit 0 on empty object)');
        }
    },
    {
        name: '[code-patterns] returns empty for unknown tool_name',
        fn: () => {
            const out = build({ tool_name: 'Unknown', tool_input: {} });
            assertTrue(typeof out === 'string', 'Should return a string (analog of exit 0 for unknown tool)');
            assertEqual(out.trim(), '', 'Should produce no output for unknown tool');
        }
    },
    {
        name: '[code-patterns] returns string on missing tool_input',
        fn: () => {
            const out = build({ tool_name: 'Edit' });
            assertTrue(typeof out === 'string', 'Should return a string (analog of exit 0 on missing tool_input)');
        }
    }
];

// ============================================================================
// E2E Context Tests
// ============================================================================

const e2eTests = [
    {
        name: '[code-patterns] injects E2E context for BDD step definition (.cs in bddProject)',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should contain E2E marker');
            assertContains(out, 'e2e-test-reference.md', 'Should reference E2E test guide');
            assertNotContains(out, MARKER, 'Should NOT contain code patterns marker');
        }
    },
    {
        name: '[code-patterns] injects E2E context for shared page object (.cs in sharedProject)',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eSharedCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should contain E2E marker');
        }
    },
    {
        name: '[code-patterns] injects E2E context for platform automation (.cs in platformProject)',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2ePlatformCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should contain E2E marker');
        }
    },
    {
        name: '[code-patterns] injects E2E context for .feature file',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eFeature }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should contain E2E marker for .feature');
        }
    },
    {
        name: '[code-patterns] injects E2E context for fallback e2e/ path',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eFallbackSpec }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should match fallback e2e/ pattern');
        }
    },
    {
        name: '[code-patterns] injects E2E context for fallback automation/ path',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eFallbackAutomation }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should match fallback automation/ pattern');
        }
    },
    {
        name: '[code-patterns] E2E dedup uses separate marker and dedup window',
        fn: () => {
            // E2E marker within last 400 lines → should skip
            const lines = Array(100).fill('some line').concat([E2E_MARKER]).concat(Array(50).fill('more'));
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' }, lines);
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertEqual(out.trim(), '', 'Should skip when E2E marker in recent transcript');
        }
    },
    {
        name: '[code-patterns] E2E re-injects when E2E marker beyond dedup window',
        fn: () => {
            const lines = [E2E_MARKER].concat(Array(DEDUP_LINES.E2E_CONTEXT + 100).fill('other content'));
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' }, lines);
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertContains(out, E2E_MARKER, 'Should re-inject when E2E marker is old');
        }
    },
    {
        name: '[code-patterns] E2E file does not inject backend/frontend patterns',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: f.e2eBddCs }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0)');
            assertNotContains(out, MARKER, 'E2E should not include code patterns marker');
        }
    }
];

// ============================================================================
// Export
// ============================================================================

module.exports = {
    name: 'Code Patterns Builder (Phase 04)',
    tests: [...triggerTests, ...dedupTests, ...e2eTests, ...failureTests]
};
