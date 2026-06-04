/**
 * Dev Rules Builder Test Suite  (Phase 04 migration)
 *
 * Tests for:
 * - buildDevRules(payload, preloadedLines) in lib/pretooluse-context-builders.cjs
 *   — the live successor to the (now consolidated) dev-rules-injector.cjs hook.
 *   The legacy module is UNREGISTERED; the dispatcher pretooluse-ctx-dev invokes
 *   this builder. The builder returns the legacy hook's trimmed stdout block, or
 *   '' when the legacy hook would have emitted nothing. Exit-code assertions
 *   become "builder returns a string without throwing" (the legacy inject hook
 *   always exited 0).
 * - dedup-constants.cjs: Correct path in DEV_RULES config
 * - subagent-init.cjs: Correct dev-rules path in dispatcher-1 identity Rules section
 *
 * Context: development-rules.md was moved from .claude/workflows/ to .claude/docs/
 * These tests verify the new path is resolved correctly. The runner sets
 * CLAUDE_PROJECT_DIR to the repo root before this suite loads, so the builder's
 * module-load PROJECT_DIR resolves the real repo .claude/docs/development-rules.md
 * — identical to how the legacy hook (spawned with the same inherited env)
 * resolved it. Content assertions therefore exercise the same real file.
 */

const path = require('path');
const fs = require('fs');
const { assertEqual, assertContains, assertNotContains, assertTrue } = require('../lib/assertions.cjs');

// Builder under test (replaces the spawned legacy dev-rules-injector.cjs)
const { buildDevRules } = require('../../lib/pretooluse-context-builders.cjs');

// Direct builder invocation: returns the legacy hook's trimmed stdout block (or '').
function build(payload, preloadedLines = null) {
    return buildDevRules(payload, preloadedLines);
}

// Helper: build a Skill payload (mirrors the legacy createSkillInput)
function skillPayload(skill, args = '') {
    return { tool_name: 'Skill', tool_input: { skill, args }, transcript_path: '' };
}

// ============================================================================
// Path Resolution Tests
// ============================================================================
// The builder resolves .claude/docs/development-rules.md from PROJECT_DIR (the
// repo root). These tests assert the resolved source path + injected content
// exactly as the legacy hook did.

const pathResolutionTests = [
    {
        name: '[dev-rules] resolves file from .claude/docs/ path',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            assertContains(out, 'Development Rules', 'Should inject dev rules content');
            assertContains(out, '.claude/docs/development-rules.md', 'Should show new docs/ path');
        }
    },
    {
        name: '[dev-rules] does NOT resolve from old .claude/workflows/ path',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            // Builder reads .claude/docs/ only — never the old workflows/ path.
            assertNotContains(out, '.claude/workflows/development-rules.md', 'Should not reference old workflows/ path');
        }
    },
    {
        name: '[dev-rules] exits gracefully (returns string) for editish tool',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'Should return a string without throwing (analog of exit 0)');
        }
    }
];

// ============================================================================
// Tool Trigger Tests
// ============================================================================

const toolTriggerTests = [
    {
        name: '[dev-rules] injects on Edit tool',
        fn: () => {
            const out = build({ tool_name: 'Edit', tool_input: { file_path: 'src/test.ts', old_string: 'a', new_string: 'b' }, transcript_path: '' });
            assertContains(out, 'Development Rules', 'Should inject on Edit');
        }
    },
    {
        name: '[dev-rules] injects on Write tool',
        fn: () => {
            const out = build({ tool_name: 'Write', tool_input: { file_path: 'src/new-file.ts', content: 'hello' }, transcript_path: '' });
            assertContains(out, 'Development Rules', 'Should inject on Write');
        }
    },
    {
        name: '[dev-rules] injects on MultiEdit tool',
        fn: () => {
            const out = build({ tool_name: 'MultiEdit', tool_input: { file_path: 'src/test.ts', edits: [] }, transcript_path: '' });
            assertContains(out, 'Development Rules', 'Should inject on MultiEdit');
        }
    },
    {
        name: '[dev-rules] ignores Read tool',
        fn: () => {
            const out = build({ tool_name: 'Read', tool_input: { file_path: 'src/test.ts' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            assertNotContains(out, 'Development Rules', 'Should not inject on Read');
        }
    },
    {
        name: '[dev-rules] ignores Bash tool',
        fn: () => {
            const out = build({ tool_name: 'Bash', tool_input: { command: 'ls' }, transcript_path: '' });
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            assertNotContains(out, 'Development Rules', 'Should not inject on Bash');
        }
    }
];

// ============================================================================
// Skill Trigger Tests
// ============================================================================

const skillTriggerTests = [
    {
        name: '[dev-rules] injects on review skill (code-review)',
        fn: () => {
            const out = build(skillPayload('code-review'));
            assertContains(out, 'Development Rules', 'Should inject on code-review skill');
        }
    },
    {
        name: '[dev-rules] injects on review skill (review-changes)',
        fn: () => {
            const out = build(skillPayload('review-changes'));
            assertContains(out, 'Development Rules', 'Should inject on review-changes skill');
        }
    },
    {
        name: '[dev-rules] injects on coding skill (cook)',
        fn: () => {
            const out = build(skillPayload('cook'));
            assertContains(out, 'Development Rules', 'Should inject on cook skill');
        }
    },
    {
        name: '[dev-rules] injects on coding skill (fix)',
        fn: () => {
            const out = build(skillPayload('fix'));
            assertContains(out, 'Development Rules', 'Should inject on fix skill');
        }
    },
    {
        name: '[dev-rules] ignores non-matching skill (scout)',
        fn: () => {
            const out = build(skillPayload('scout'));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            assertNotContains(out, 'Development Rules', 'Should not inject on scout skill');
        }
    },
    {
        name: '[dev-rules] ignores non-matching skill (plan)',
        fn: () => {
            const out = build(skillPayload('plan'));
            assertTrue(typeof out === 'string', 'builder returns a string (legacy exited 0, non-blocking)');
            assertNotContains(out, 'Development Rules', 'Should not inject on plan skill');
        }
    },
    {
        name: '[dev-rules] normalizes skill name with leading slash',
        fn: () => {
            const out = build(skillPayload('/code-review'));
            assertContains(out, 'Development Rules', 'Should inject with leading slash');
        }
    }
];

// ============================================================================
// Path Reference Verification Tests (static checks)
// ============================================================================

const pathReferenceTests = [
    {
        name: '[dedup-constants] DEV_RULES config references .claude/docs/ path',
        fn: () => {
            const dedupPath = path.resolve(__dirname, '..', '..', 'lib', 'dedup-constants.cjs');
            const content = fs.readFileSync(dedupPath, 'utf-8');
            assertContains(content, '.claude/docs/development-rules.md', 'DEV_RULES should reference new docs/ path');
            assertNotContains(content, '.claude/workflows/development-rules.md', 'Should not reference old workflows/ path');
        }
    },
    {
        name: '[dedup-constants] DEV_RULES_MODULARIZATION config references .claude/docs/ path',
        fn: () => {
            const dedupPath = path.resolve(__dirname, '..', '..', 'lib', 'dedup-constants.cjs');
            const content = fs.readFileSync(dedupPath, 'utf-8');
            // Both DEV_RULES and DEV_RULES_MODULARIZATION should use new path
            const matches = content.match(/\.claude\/docs\/development-rules\.md/g);
            assertTrue(matches && matches.length >= 2, 'Should have at least 2 references to new docs/ path');
        }
    },
    {
        name: '[subagent-init] dispatcher-1 Rules section references .claude/docs/ path',
        fn: () => {
            // buildIdentityLines (the former subagent-init-identity body) now lives in dispatcher 1.
            const subagentPath = path.resolve(__dirname, '..', '..', 'subagent-init.cjs');
            const content = fs.readFileSync(subagentPath, 'utf-8');
            assertContains(content, '.claude/docs/development-rules.md', 'Should reference new docs/ path');
            assertNotContains(content, '.claude/workflows/development-rules.md', 'Should not reference old workflows/ path');
        }
    },
    {
        name: '[dev-rules builder] resolveDevRulesPath uses .claude/docs/ directory',
        fn: () => {
            // Repoint from the (consolidated) legacy hook to its live successor: the
            // builder source. resolveDevRulesPath lives in pretooluse-context-builders.cjs
            // and must join the docs/ directory, never the old workflows/ directory.
            const builderPath = path.resolve(__dirname, '..', '..', 'lib', 'pretooluse-context-builders.cjs');
            const content = fs.readFileSync(builderPath, 'utf-8');
            assertContains(content, "'docs'", 'Should use docs directory in path.join');
            assertNotContains(content, "'workflows', 'development-rules.md'", 'Should not use workflows directory for dev-rules path');
        }
    }
];

// Export test suite
module.exports = {
    name: 'Dev Rules Builder (Phase 04)',
    tests: [...pathResolutionTests, ...toolTriggerTests, ...skillTriggerTests, ...pathReferenceTests]
};
