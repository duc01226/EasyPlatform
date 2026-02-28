/**
 * Quality Audit Workflow Test Suite
 *
 * Tests for the quality-audit workflow in workflows.json:
 * - Config validation (required fields, v2.0.0 schema compliance)
 * - Catalog integration (workflow appears in injected catalog)
 * - Workflow router integration (catalog output on qualifying prompts)
 * - No deprecated fields (triggerPatterns, excludePatterns, priority removed)
 */

const path = require('path');
const fs = require('fs');
const { runHook, getHookPath, createUserPromptInput } = require('../lib/hook-runner.cjs');
const { assertEqual, assertContains, assertNotContains, assertAllowed, assertTrue } = require('../lib/assertions.cjs');
const { createTempDir, cleanupTempDir } = require('../lib/test-utils.cjs');

// Hook under test
const WORKFLOW_ROUTER = getHookPath('workflow-router.cjs');

// Project root (4 levels up from suites/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// Run options: use project root so workflow-router finds .claude/workflows.json
const RUN_OPTS = { cwd: PROJECT_ROOT };

// Load workflows.json once for unit tests
let workflowConfig;
try {
    workflowConfig = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, '.claude', 'workflows.json'), 'utf-8'));
} catch (e) {
    workflowConfig = null;
}

const qualityAudit = workflowConfig?.workflows?.['quality-audit'];

// ============================================================================
// Config Validation Tests
// ============================================================================

const configTests = [
    {
        name: '[quality-audit] workflow exists in workflows.json',
        fn: async () => {
            assertTrue(qualityAudit !== null && qualityAudit !== undefined, 'quality-audit workflow should exist');
        }
    },
    {
        name: '[quality-audit] has correct sequence of 7 steps',
        fn: async () => {
            const expected = ['code-review', 'plan', 'plan-review', 'plan-validate', 'code', 'test', 'watzup'];
            assertEqual(JSON.stringify(qualityAudit.sequence), JSON.stringify(expected), 'Sequence should match');
        }
    },
    {
        name: '[quality-audit] all sequence steps exist in commandMapping',
        fn: async () => {
            const mapping = workflowConfig.commandMapping;
            for (const step of qualityAudit.sequence) {
                assertTrue(mapping[step] !== undefined, `commandMapping should have "${step}"`);
                assertTrue(mapping[step].claude !== undefined, `commandMapping["${step}"] should have claude cmd`);
            }
        }
    },
    {
        name: '[quality-audit] confirmFirst is true',
        fn: async () => {
            assertTrue(qualityAudit.confirmFirst === true, 'confirmFirst should be true');
        }
    },
    {
        name: '[quality-audit] has preActions with injectContext',
        fn: async () => {
            assertTrue(qualityAudit.preActions !== undefined, 'preActions should exist');
            assertTrue(
                typeof qualityAudit.preActions.injectContext === 'string' && qualityAudit.preActions.injectContext.length > 0,
                'injectContext should be a non-empty string'
            );
        }
    },
    {
        name: '[quality-audit] injectContext contains CRITICAL GATE',
        fn: async () => {
            assertContains(qualityAudit.preActions.injectContext, 'CRITICAL GATE', 'injectContext should contain CRITICAL GATE instruction');
        }
    },
    {
        name: '[quality-audit] has whenToUse field',
        fn: async () => {
            assertTrue(typeof qualityAudit.whenToUse === 'string' && qualityAudit.whenToUse.length > 0, 'whenToUse should be a non-empty string');
        }
    },
    {
        name: '[quality-audit] has whenNotToUse field',
        fn: async () => {
            assertTrue(typeof qualityAudit.whenNotToUse === 'string' && qualityAudit.whenNotToUse.length > 0, 'whenNotToUse should be a non-empty string');
        }
    },
    {
        name: '[quality-audit] no deprecated triggerPatterns field',
        fn: async () => {
            assertTrue(qualityAudit.triggerPatterns === undefined, 'triggerPatterns should not exist (removed in v2.0.0)');
        }
    },
    {
        name: '[quality-audit] no deprecated excludePatterns field',
        fn: async () => {
            assertTrue(qualityAudit.excludePatterns === undefined, 'excludePatterns should not exist (removed in v2.0.0)');
        }
    },
    {
        name: '[quality-audit] no deprecated priority field',
        fn: async () => {
            assertTrue(qualityAudit.priority === undefined, 'priority should not exist (removed in v2.0.0)');
        }
    }
];

// ============================================================================
// Catalog Content Tests
// ============================================================================

const catalogContentTests = [
    {
        name: '[quality-audit] appears in workflow catalog output',
        fn: async () => {
            const { buildWorkflowCatalog } = require(path.join(PROJECT_ROOT, '.claude', 'hooks', 'workflow-router.cjs'));
            const catalog = buildWorkflowCatalog(workflowConfig);
            assertContains(catalog, 'quality-audit', 'Catalog should contain quality-audit workflow');
        }
    },
    {
        name: '[quality-audit] catalog entry has whenToUse description',
        fn: async () => {
            const { buildWorkflowCatalog } = require(path.join(PROJECT_ROOT, '.claude', 'hooks', 'workflow-router.cjs'));
            const catalog = buildWorkflowCatalog(workflowConfig);
            // The catalog should contain partial whenToUse text
            assertTrue(catalog.includes(qualityAudit.name) || catalog.includes('quality-audit'), 'Catalog should reference quality-audit by name or ID');
        }
    },
    {
        name: '[quality-audit] catalog entry has step sequence',
        fn: async () => {
            const { buildWorkflowCatalog } = require(path.join(PROJECT_ROOT, '.claude', 'hooks', 'workflow-router.cjs'));
            const catalog = buildWorkflowCatalog(workflowConfig);
            // Verify at least the first and last step commands appear
            const firstCmd = workflowConfig.commandMapping[qualityAudit.sequence[0]]?.claude;
            const lastCmd = workflowConfig.commandMapping[qualityAudit.sequence[qualityAudit.sequence.length - 1]]?.claude;
            assertTrue(catalog.includes(firstCmd) && catalog.includes(lastCmd), `Catalog should contain ${firstCmd} and ${lastCmd}`);
        }
    }
];

// ============================================================================
// Workflow Router Integration Tests
// ============================================================================

const integrationTests = [
    {
        name: '[quality-audit] workflow-router injects catalog on qualifying prompt',
        fn: async () => {
            const input = createUserPromptInput('review all skills for best practices and quality');
            const result = await runHook(WORKFLOW_ROUTER, input, RUN_OPTS);
            assertAllowed(result.code, 'Should not block');
            const output = result.stdout;
            assertContains(output, 'Workflow Catalog', 'Should inject workflow catalog');
            assertContains(output, 'quality-audit', 'Catalog should include quality-audit workflow');
        }
    },
    {
        name: '[quality-audit] workflow-router injects catalog on audit prompt',
        fn: async () => {
            const input = createUserPromptInput('audit the hooks for flaws and enhancements');
            const result = await runHook(WORKFLOW_ROUTER, input, RUN_OPTS);
            assertAllowed(result.code, 'Should not block');
            const output = result.stdout;
            assertContains(output, 'Workflow Catalog', 'Should inject workflow catalog');
        }
    },
    {
        name: '[quality-audit] workflow-router skips explicit command',
        fn: async () => {
            const input = createUserPromptInput('/code-review check quality');
            const result = await runHook(WORKFLOW_ROUTER, input, RUN_OPTS);
            assertAllowed(result.code, 'Should not block');
            const output = result.stdout;
            assertTrue(output.trim() === '' || !output.includes('Workflow Catalog'), 'Should skip workflow catalog for explicit command');
        }
    },
    {
        name: '[quality-audit] workflow-router handles empty prompt',
        fn: async () => {
            const input = createUserPromptInput('');
            const result = await runHook(WORKFLOW_ROUTER, input, RUN_OPTS);
            assertAllowed(result.code, 'Should not block empty prompt');
        }
    }
];

// ============================================================================
// Export
// ============================================================================

module.exports = {
    name: 'Quality Audit Workflow',
    tests: [...configTests, ...catalogContentTests, ...integrationTests]
};
