/**
 * BA Refinement Context Injection Hook Test Suite
 *
 * Tests for:
 * - ba-refinement-context.cjs: BA team refinement context injection on PBI artifact writes
 */

const path = require('path');
const { runHook, getHookPath, createPreToolUseInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

// Hook path
const BA_REFINEMENT_CONTEXT = getHookPath('ba-refinement-context.cjs');

// ============================================================================
// ba-refinement-context.cjs Tests
// ============================================================================

const baRefinementContextTests = [
    {
        name: '[ba-refinement-context] injects for Write to team-artifacts/pbis/ path',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'team-artifacts/pbis/260312-pbi-employee-onboarding.md',
                    content: '# PBI: Employee Onboarding'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'BA Team Refinement Context', 'Should inject BA context for PBI path');
                assertContains(output, 'Decision Model', 'Should contain decision model info');
                assertContains(output, 'DoR Gate', 'Should contain DoR gate checklist');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] injects for Edit to team-artifacts/pbis/stories/ path',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'team-artifacts/pbis/stories/260312-us-employee-profile.md',
                    old_string: 'old text',
                    new_string: 'new text'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'BA Team Refinement Context', 'Should inject BA context for story path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] injects for Write to team-artifacts/ideas/ path',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'team-artifacts/ideas/new-feature-idea.md',
                    content: '# Idea: New Feature'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'BA Team Refinement Context', 'Should inject BA context for ideas path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] injects for MultiEdit tool on PBI path',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('MultiEdit', {
                    file_path: 'team-artifacts/pbis/260312-pbi-test.md'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'BA Team Refinement Context', 'Should inject for MultiEdit too');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] skips non-BA paths',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'src/Services/ServiceA/Goals/GoalEntity.cs',
                    content: 'public class GoalEntity {}'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout.trim(), '', 'Should not inject for non-BA path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] skips plans/ path (not a BA artifact)',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'plans/260312-feature/plan.md',
                    content: '# Plan'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout.trim(), '', 'Should not inject for plans/ path');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] skips Read tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Read', {
                    file_path: 'team-artifacts/pbis/260312-pbi-test.md'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout.trim(), '', 'Should not inject for Read tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] skips Bash tool',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Bash', {
                    command: 'ls team-artifacts/pbis/'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                assertEqual(result.stdout.trim(), '', 'Should not inject for Bash tool');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] handles empty input gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const result = await runHook(BA_REFINEMENT_CONTEXT, {}, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open on empty input');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] handles missing file_path gracefully',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    content: 'some content'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code, 'Should fail-open on missing file_path');
                assertEqual(result.stdout.trim(), '', 'Should produce no output');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] context includes role scopes',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'team-artifacts/pbis/test.md',
                    content: '# Test'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'UX BA:', 'Should include UX BA role');
                assertContains(output, 'Designer BA:', 'Should include Designer BA role');
                assertContains(output, 'Dev BA PIC', 'Should include Dev BA PIC role');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] context includes protocol references',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Edit', {
                    file_path: 'team-artifacts/pbis/test.md',
                    old_string: 'a',
                    new_string: 'b'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'ba-team-decision-model-protocol.md', 'Should reference decision model protocol');
                assertContains(output, 'refinement-dor-checklist-protocol.md', 'Should reference DoR checklist protocol');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    },
    {
        name: '[ba-refinement-context] handles Windows-style path separators',
        fn: async () => {
            const tmpDir = createTempDir();
            try {
                const input = createPreToolUseInput('Write', {
                    file_path: 'team-artifacts\\pbis\\260312-pbi-test.md',
                    content: '# PBI'
                });
                const result = await runHook(BA_REFINEMENT_CONTEXT, input, { cwd: tmpDir });
                assertAllowed(result.code);

                const output = result.stdout;
                assertContains(output, 'BA Team Refinement Context', 'Should handle Windows paths');
            } finally {
                cleanupTempDir(tmpDir);
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'BA Refinement Context Injection Hook',
    tests: baRefinementContextTests
};
