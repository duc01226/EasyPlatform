/**
 * Workflow Config Schema Guards Test Suite
 *
 * Tests for:
 * - workflows.json schema guards: dead-module removal + framework-rename regression
 *
 * (The skill-enforcement.cjs + todo-tracker.cjs hook tests were removed when those
 *  hooks were deleted — workflow progression is now model-driven, not hook-enforced.)
 */

const path = require('path');
const fs = require('fs');
const { assertEqual, assertContains, assertNotContains, assertTrue } = require('../lib/assertions.cjs');

// Project root (4 levels up from suites/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

// ============================================================================
// Dead Module Removal Verification Tests
// ============================================================================

const deadModuleVerificationTests = [
    {
        name: '[dead-module-removal] wr-detect.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-detect.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-detect.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] wr-output.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-output.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-output.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] wr-control.cjs does not exist',
        fn: async () => {
            const fs = require('fs');
            const filePath = path.join(__dirname, '..', '..', 'lib', 'wr-control.cjs');
            assertTrue(!fs.existsSync(filePath), 'wr-control.cjs should not exist');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no enableCheckpoints',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'enableCheckpoints', 'workflows.json should not contain enableCheckpoints');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no supportedLanguages in settings',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'supportedLanguages', 'workflows.json should not contain supportedLanguages');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no checkpoints settings block',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            assertTrue(!data.settings.checkpoints, 'settings.checkpoints should not exist');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no triggerPatterns',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'triggerPatterns', 'workflows.json should not contain triggerPatterns');
        }
    },
    {
        name: '[dead-module-removal] workflows.json has no excludePatterns',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const content = fs.readFileSync(configPath, 'utf8');
            assertNotContains(content, 'excludePatterns', 'workflows.json should not contain excludePatterns');
        }
    },
    {
        name: '[dead-module-removal] no workflow has priority field',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const withPriority = Object.entries(data.workflows).filter(([, w]) => w.priority !== undefined);
            assertTrue(withPriority.length === 0, `No workflow should have priority, found: ${withPriority.map(([id]) => id).join(', ')}`);
        }
    },
    {
        name: '[dead-module-removal] all workflows have whenToUse field',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const missing = Object.entries(data.workflows).filter(([, w]) => !w.whenToUse);
            assertTrue(missing.length === 0, `All workflows should have whenToUse, missing: ${missing.map(([id]) => id).join(', ')}`);
        }
    },
    {
        name: '[review-guidance] review-changes workflow injectContext includes multilingual UI sync check',
        fn: async () => {
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const text = data.workflows?.['workflow-review-changes']?.preActions?.injectContext || '';
            assertContains(text, 'MULTILINGUAL UI SYNC CHECK', 'review-changes workflow should include multilingual UI sync guidance');
        }
    }
];

// prompt-context-assembler.cjs and workflow-router.cjs were both removed in the
// inject-hook removal (Claude/Codex skill parity) — their prompt-injection / catalog
// smoke tests were dropped with them. The workflow catalog is now static in CLAUDE.md
// `## Workflow & Skills Catalog`; no UserPromptSubmit hook remains in this suite.

// ============================================================================
// Framework Rename Regression Guards
//   cook → feature-implement, code → plan-execute,
//   workflow-build-specs → workflow-code-to-spec,
//   workflow-product-discovery → workflow-idea-to-spec
//
// Ports Guard A from the deleted orphan .claude/tests/workflow-routing-test.cjs:
//   - Guard A (orphan Section 3): every workflow sequence step resolves to a
//     real skill dir (steps are invoked as /<step>).
// Plus the rename-fix workflow-id-set integrity lock (F-5/R-1).
// (The former Guard B + getStepDescription guard were dropped with
//  workflow-router.cjs — buildWorkflowCatalog/getStepDescription no longer exist.)
// ============================================================================

const WORKFLOW_CONFIG_PATH = path.resolve(__dirname, '..', '..', '..', 'workflows.json');

// Canonical current workflow-id set — a deliberate rename-lock. Update this list
// only when a workflow is intentionally added or removed (same discipline as the
// count-drift inventory guard, which owns doc-count sync but not id-set integrity).
const EXPECTED_WORKFLOW_IDS = [
    'workflow-big-feature',
    'workflow-bugfix',
    'workflow-e2e',
    'workflow-feature',
    'workflow-feature-spec',
    'workflow-greenfield-init',
    'workflow-idea-to-pbi',
    'workflow-idea-to-spec',
    'workflow-refactor',
    'workflow-research',
    'workflow-review-changes',
    'workflow-code-to-spec',
    'workflow-spec-to-pbi',
    'workflow-spec-sync',
    'workflow-visualize',
    'workflow-seed-test-data',
    'workflow-write-integration-test'
];

// Ids removed by the rename — must never reappear as workflow keys.
const REMOVED_WORKFLOW_IDS = ['workflow-build-specs', 'workflow-product-discovery'];
// Step/skill ids renamed away — must never reappear as a sequence step.
// Checked by EXACT array-element match (NOT substring) so legitimate compound
// ids (code-review, code-simplifier, code-to-spec) are never false-flagged.
const REMOVED_STEP_IDS = ['cook', 'code'];

function loadWorkflowConfig() {
    return JSON.parse(fs.readFileSync(WORKFLOW_CONFIG_PATH, 'utf8'));
}

// Reusable detector — run against the real config (expect zero hits) AND a
// mutated in-memory fixture (expect a hit) to prove the guard is not vacuous.
function findRemovedIds(config) {
    const ids = Object.keys(config.workflows || {});
    const hits = [];
    for (const removed of REMOVED_WORKFLOW_IDS) {
        if (ids.includes(removed)) hits.push(`workflow-id:${removed}`);
    }
    for (const [wfId, wf] of Object.entries(config.workflows || {})) {
        for (const step of wf.sequence || []) {
            if (REMOVED_STEP_IDS.includes(step)) hits.push(`${wfId}.sequence:${step}`);
        }
    }
    return hits;
}

const renameFixGuardTests = [
    {
        // TC-RENAMEFIX-030 — F-5 / R-1: workflow-id set integrity + removed-id absence
        name: '[rename-guard] TC-RENAMEFIX-030 catalog holds exactly the current workflow-id set, no removed ids',
        fn: async () => {
            const config = loadWorkflowConfig();
            const ids = Object.keys(config.workflows);

            // Set equality vs the canonical current set (catches accidental add OR removal).
            assertEqual(
                ids.length,
                EXPECTED_WORKFLOW_IDS.length,
                `Expected ${EXPECTED_WORKFLOW_IDS.length} workflows, found ${ids.length}: [${ids.join(', ')}]`
            );
            for (const expected of EXPECTED_WORKFLOW_IDS) {
                assertTrue(ids.includes(expected), `Current workflow set must include "${expected}"`);
            }
            // Renamed-IN ids present (proves the rename actually landed).
            assertTrue(ids.includes('workflow-code-to-spec'), 'Renamed-in "workflow-code-to-spec" must be present');
            assertTrue(ids.includes('workflow-idea-to-spec'), 'Renamed-in "workflow-idea-to-spec" must be present');

            // Removed ids absent everywhere (config keys + sequences).
            const hits = findRemovedIds(config);
            assertEqual(hits.length, 0, `No removed id may reappear; found: ${hits.join(', ')}`);

            // Non-vacuity proof: a mutated in-memory fixture reintroducing removed ids MUST be detected.
            const fixture = JSON.parse(JSON.stringify(config));
            fixture.workflows['workflow-build-specs'] = { name: 'x', whenToUse: 'x', sequence: ['cook'] };
            const fixtureHits = findRemovedIds(fixture);
            assertTrue(
                fixtureHits.length >= 2,
                `Guard must FAIL (detect) when removed ids are reintroduced; detected: ${fixtureHits.join(', ')}`
            );
        }
    },
    {
        // TC-RENAMEFIX-032 — ported orphan Guard A (every sequence step resolves to a real skill)
        name: '[rename-guard] TC-RENAMEFIX-032 every sequence step resolves to a real skill',
        fn: async () => {
            const config = loadWorkflowConfig();

            // Guard A: every step is invoked as /<step>, so it must resolve to a real skill.
            // Assert each sequence step (base skill, sans arg/flag suffix) is a real
            // skill dir, so /<step> always points at an existing skill.
            const baseSkill = step => step.split(/[\s[]/)[0];
            for (const [wfId, wf] of Object.entries(config.workflows)) {
                for (const step of wf.sequence) {
                    const skillDir = path.join(PROJECT_ROOT, '.claude', 'skills', baseSkill(step), 'SKILL.md');
                    assertTrue(
                        fs.existsSync(skillDir),
                        `${wfId}: step "${step}" must resolve to a real skill (.claude/skills/${baseSkill(step)}/SKILL.md)`
                    );
                }
            }
        }
    }
];

// Export test suite
module.exports = {
    name: 'Workflow Config Schema Guards',
    tests: [
        ...deadModuleVerificationTests,
        ...renameFixGuardTests
    ]
};
