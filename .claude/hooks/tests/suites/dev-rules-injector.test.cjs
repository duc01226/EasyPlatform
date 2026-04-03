/**
 * Dev Rules Injector Test Suite
 *
 * Tests for:
 * - dev-rules-injector.cjs: Injects development-rules.md before code-editing operations
 * - dedup-constants.cjs: Correct path in DEV_RULES config
 * - subagent-init.cjs: Correct path in Rules section
 *
 * Context: development-rules.md was moved from .claude/workflows/ to .claude/docs/
 * These tests verify the new path is resolved correctly.
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertNotContains, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

// Hook paths
const DEV_RULES_INJECTOR = getHookPath('dev-rules-injector.cjs');

// Helper: create temp dir with .claude/docs/development-rules.md
function setupDevRulesDir() {
    const tmpDir = createTempDir();
    const docsDir = path.join(tmpDir, '.claude', 'docs');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'development-rules.md'), '# Development Rules\n\nTest content for dev rules injection.\n');
    return tmpDir;
}

// Helper: create Skill tool input
function createSkillInput(skill, args = '') {
    return createPreToolUseInput('Skill', { skill, args });
}

// ============================================================================
// Path Resolution Tests
// ============================================================================

const pathResolutionTests = [
    {
        name: '[dev-rules-injector] resolves file from .claude/docs/ path',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/test.ts',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertContains(result.stdout, 'Development Rules', 'Should inject dev rules content');
                assertContains(result.stdout, '.claude/docs/development-rules.md', 'Should show new path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] does NOT resolve from old .claude/workflows/ path',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                // Create file at OLD path only
                const oldDir = path.join(tmpDir, '.claude', 'workflows');
                fs.mkdirSync(oldDir, { recursive: true });
                fs.writeFileSync(path.join(oldDir, 'development-rules.md'), '# Old Rules\n');
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/test.ts',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                // Should NOT inject old content since hook now looks in docs/
                assertNotContains(result.stdout, 'Old Rules', 'Should not inject from old path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] exits gracefully when file is missing',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/test.ts',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should exit 0 when file missing');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Tool Trigger Tests
// ============================================================================

const toolTriggerTests = [
    {
        name: '[dev-rules-injector] injects on Edit tool',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'src/test.ts',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on Edit');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] injects on Write tool',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'src/new-file.ts',
                    content: 'hello'
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on Write');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] injects on MultiEdit tool',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('MultiEdit', {
                    file_path: 'src/test.ts',
                    edits: []
                });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on MultiEdit');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] ignores Read tool',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('Read', { file_path: 'src/test.ts' });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertNotContains(result.stdout, 'Development Rules', 'Should not inject on Read');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] ignores Bash tool',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createPreToolUseInput('Bash', { command: 'ls' });
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertNotContains(result.stdout, 'Development Rules', 'Should not inject on Bash');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// ============================================================================
// Skill Trigger Tests
// ============================================================================

const skillTriggerTests = [
    {
        name: '[dev-rules-injector] injects on review skill (code-review)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('code-review');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on code-review skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] injects on review skill (review-changes)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('review-changes');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on review-changes skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] injects on coding skill (cook)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('cook');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on cook skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] injects on coding skill (fix)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('fix');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject on fix skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] ignores non-matching skill (scout)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('scout');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertNotContains(result.stdout, 'Development Rules', 'Should not inject on scout skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] ignores non-matching skill (plan)',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('plan');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should not block');
                assertNotContains(result.stdout, 'Development Rules', 'Should not inject on plan skill');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[dev-rules-injector] normalizes skill name with leading slash',
        fn: async () => {
            const tmpDir = setupDevRulesDir();
            try {
                const input = createSkillInput('/code-review');
                const result = await runHook(DEV_RULES_INJECTOR, input, { cwd: tmpDir });
                assertContains(result.stdout, 'Development Rules', 'Should inject with leading slash');
            } finally {
                cleanupTempDir(tmpDir);
            }
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
        name: '[subagent-init] Rules section references .claude/docs/ path',
        fn: () => {
            const subagentPath = path.resolve(__dirname, '..', '..', 'subagent-init.cjs');
            const content = fs.readFileSync(subagentPath, 'utf-8');
            assertContains(content, '.claude/docs/development-rules.md', 'Should reference new docs/ path');
            assertNotContains(content, '.claude/workflows/development-rules.md', 'Should not reference old workflows/ path');
        }
    },
    {
        name: '[dev-rules-injector] resolveDevRulesPath uses .claude/docs/ directory',
        fn: () => {
            const hookContent = fs.readFileSync(DEV_RULES_INJECTOR, 'utf-8');
            assertContains(hookContent, "'docs'", 'Should use docs directory in path.join');
            assertNotContains(hookContent, "'workflows'", 'Should not use workflows directory in path.join');
        }
    }
];

// Export test suite
module.exports = {
    name: 'Dev Rules Injector',
    tests: [...pathResolutionTests, ...toolTriggerTests, ...skillTriggerTests, ...pathReferenceTests]
};
