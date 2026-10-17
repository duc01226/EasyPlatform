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
        name: '[routing-opt-in] workflows.json has no competing global detection settings',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            assertTrue(data.settings === undefined, 'portability.workflowAutoDetect must be the single routing switch');
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
        name: '[workflow-context] every workflow has non-empty preActions.injectContext',
        fn: async () => {
            const fs = require('fs');
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const missing = Object.entries(data.workflows).filter(([, w]) => {
                const context = w?.preActions?.injectContext;
                return typeof context !== 'string' || context.trim().length === 0;
            });
            assertTrue(
                missing.length === 0,
                `Every workflow requires non-empty preActions.injectContext, missing: ${missing.map(([id]) => id).join(', ')}`
            );
        }
    },
    {
        name: '[workflow-e2e] pre-action covers unified authoring and green source routes',
        fn: async () => {
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const workflow = data.workflows?.['workflow-e2e'];
            const context = workflow?.preActions?.injectContext || '';
            for (const source of ['changes', 'recording', 'update-ui', 'prompt', 'context', 'whole']) {
                assertContains(context, source, `workflow-e2e pre-action must describe --source=${source}`);
            }
            assertContains(context, 'e2e-test --mode=verify --fix-loop', 'every source must hand off to the convergence loop');
            assertContains(context, 'conditional authoring', 'workflow-e2e must describe the conditional authoring phase');
            assertContains(context, 'same-scope reruns', 'workflow-e2e must preserve same-scope convergence');
            for (const requiredFile of [
                '.claude/skills/e2e-test/references/mode-verify.md',
                '.claude/skills/workflow-e2e/SKILL.md'
            ]) {
                assertTrue(
                    workflow?.preActions?.readFiles?.includes(requiredFile),
                    `workflow-e2e pre-action must read ${requiredFile}`
                );
            }
        }
    },
    {
        name: '[review-guidance] workflow-review-changes injectContext includes multilingual UI sync check',
        fn: async () => {
            const configPath = path.resolve(__dirname, '..', '..', '..', 'workflows.json');
            const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const text = data.workflows?.['workflow-review-changes']?.preActions?.injectContext || '';
            assertContains(text, 'MULTILINGUAL UI SYNC CHECK', 'workflow-review-changes should include multilingual UI sync guidance');
        }
    }
];

// prompt-context-assembler.cjs and workflow-router.cjs were both removed in the
// inject-hook removal (Claude/Codex skill parity) — their prompt-injection / catalog
// smoke tests were dropped with them. The workflow catalog is now static in CLAUDE.md
// `## Workflow & Skills Catalog`; no UserPromptSubmit hook remains in this suite.

// ============================================================================
// Framework Rename Regression Guards
//   cook → feature-implement, code → plan --mode=execute,
//   workflow-build-specs → workflow-code-to-spec,
//   workflow-product-discovery → workflow-idea-to-spec → workflow-initiative-to-spec,
//   workflow-idea-to-pbi → workflow-initiative-to-task,
//   workflow-spec-to-pbi → workflow-spec-to-task, idea → initiative, pbi → work-item,
//   workflow-initiative-to-task + workflow-initiative-to-spec + workflow-spec-to-task → workflow-planned-work (P41)
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
    'workflow-implement-spec',
    'workflow-greenfield-init',
    'workflow-planned-work',
    'workflow-refactor',
    'workflow-research',
    'workflow-review-changes',
    'workflow-architecture-audit',
    'workflow-code-to-spec',
    'workflow-spec-to-mockup',
    'workflow-spec-sync',
    'workflow-seed-test-data',
    'workflow-integration-test'
];

// Ids removed by the rename — must never reappear as workflow keys.
const REMOVED_WORKFLOW_IDS = ['workflow-build-specs', 'workflow-product-discovery', 'workflow-idea-to-pbi', 'workflow-idea-to-spec', 'workflow-spec-to-pbi',
    'workflow-initiative-to-task', 'workflow-initiative-to-spec', 'workflow-spec-to-task'];
// Step/skill ids renamed away — must never reappear as a sequence step.
// Checked by EXACT array-element match (NOT substring) so legitimate compound
// ids (code-quality-review, code-simplifier, code-to-spec) are never false-flagged.
const REMOVED_STEP_IDS = ['cook', 'code', 'idea', 'pbi'];

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
            for (const renamedIn of ['workflow-planned-work']) {
                assertTrue(ids.includes(renamedIn), `Renamed-in "${renamedIn}" must be present`);
            }

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
            const baseSkill = step => {
                // Variant-aware workflow sequences may carry an identity wrapper
                // (`{ id, skill }`) while legacy/default sequences remain strings.
                // Validate the resolved skill name uniformly instead of crashing
                // the guard on a valid structured step.
                const raw = typeof step === 'string' ? step : step?.skill;
                return typeof raw === 'string' ? raw.split(/[\s[]/)[0] : '';
            };
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

// ============================================================================
// Guided workflow data: step roles, outcome gates, intent (GWF, P12)
//   Invariant: a quality gate is data the runner cannot skip — `gate` steps carry
//   no applicability, `optional` steps always carry when + skipReason, `role` has
//   one owner (the occurrence object), and every outcome gate is provable from
//   the steps the workflow actually runs. Fixtures are in-memory registries with
//   a synthetic skill set, so these cases never read this repository's corpus.
// ============================================================================

const os = require('os');
const { spawnSync } = require('child_process');
const { assertDeepEqual, assertThrows } = require('../lib/assertions.cjs');
const { childEnv } = require('../lib/hook-runner.cjs');

const SCRIPTS_DIR = path.resolve(__dirname, '..', '..', '..', 'scripts');
const MANIFEST_PATH = path.join(SCRIPTS_DIR, 'lib', 'workflow-manifest.cjs');
const SCHEMA_PATH = path.resolve(__dirname, '..', '..', '..', 'workflows.schema.json');
const GWF_SKILLS = ['investigate', 'plan', 'test', 'workflow-review-changes', 'workflow-end'];

function gwfRegistry(entry) {
    return {
        version: '1.0.0',
        workflows: {
            'wf-guided': {
                name: 'Guided fixture',
                description: 'Fixture',
                whenToUse: 'Fixture',
                preActions: { injectContext: 'Fixture context' },
                sequence: ['investigate', 'workflow-end'],
                ...entry
            }
        }
    };
}

function gwfResolve(entry, mode) {
    const { resolveWorkflowManifest } = require(MANIFEST_PATH);
    const options = { availableSkills: GWF_SKILLS };
    if (mode !== undefined) options.mode = mode;
    return resolveWorkflowManifest(gwfRegistry(entry), 'wf-guided', options);
}

const annotatedEntry = () => ({
    intent: 'Ship the change with tests green under {SPEC_ROOT} and the review converged.',
    outcomeGates: [
        { id: 'tests-pass', satisfiedBy: ['test'] },
        { id: 'review-converged', satisfiedBy: ['workflow-review-changes'] },
        { id: 'run-closed', satisfiedBy: ['workflow-end'], when: 'A spec under {SPEC_ROOT} changed' }
    ],
    sequence: [
        { id: 'scope', skill: 'investigate', role: 'optional', applicability: { when: 'Scope is unclear', skipReason: 'Scope already traced' } },
        'plan',
        { id: 'verify', skill: 'test', role: 'gate' },
        { id: 'review', skill: 'workflow-review-changes', role: 'gate' },
        { id: 'close', skill: 'workflow-end', role: 'gate' }
    ]
});

const guidedWorkflowTests = [
    {
        name: '[guided-workflow] TC-GWF-001 an optional step without applicability.when is rejected',
        fn: () => {
            // Given an optional occurrence with no applicability
            const bare = { sequence: [{ id: 'scope', skill: 'investigate', role: 'optional' }, 'workflow-end'] };
            // When validated, Then it is rejected; an incomplete applicability is rejected too
            assertThrows(() => gwfResolve(bare), /Optional step scope requires applicability/);
            const halfApplicability = { sequence: [{ id: 'scope', skill: 'investigate', role: 'optional', applicability: { when: 'Scope is unclear' } }, 'workflow-end'] };
            assertThrows(() => gwfResolve(halfApplicability), /when and skipReason are required/);
            // And the same step with when + skipReason is accepted as optional
            const complete = { sequence: [{ id: 'scope', skill: 'investigate', role: 'optional', applicability: { when: 'Scope is unclear', skipReason: 'Scope traced' } }, 'workflow-end'] };
            assertEqual(gwfResolve(complete).occurrences[0].role, 'optional');
        }
    },
    {
        name: '[guided-workflow] TC-GWF-002 a gate step carrying applicability is rejected, including as a conditional barrier member',
        fn: () => {
            // Given a gate occurrence that declares applicability
            const skippableGate = { sequence: ['investigate', { id: 'close', skill: 'workflow-end', role: 'gate', applicability: { when: 'Sometimes', skipReason: 'Never mind' } }] };
            // When validated, Then it is rejected: a gate can never become skippable
            assertThrows(() => gwfResolve(skippableGate), /Gate step close cannot carry applicability/);
            // Given a gate listed as a conditional barrier member (the resolver would synthesize applicability)
            const conditionalGate = {
                sequence: [{ id: 'verify', skill: 'test', role: 'gate' }, { id: 'review', skill: 'workflow-review-changes' }, 'workflow-end'],
                parallelGroups: [{ id: 'checks', members: ['verify', 'review'], conditionalMembers: ['verify'], barrier: true }]
            };
            // Then it is rejected as well
            assertThrows(() => gwfResolve(conditionalGate), /Gate step verify cannot be a conditional barrier member/);
            // And an unknown role value is rejected
            assertThrows(() => gwfResolve({ sequence: [{ id: 'close', skill: 'workflow-end', role: 'required' }] }), /Invalid role for close/);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-003 outcomeGates naming a skill not in the sequence are rejected',
        fn: () => {
            // Given a gate whose satisfiedBy lists a skill the workflow never runs
            const entry = annotatedEntry();
            entry.outcomeGates[0] = { id: 'tests-pass', satisfiedBy: ['test', 'integration-test --mode=verify'] };
            // When validated, Then it is rejected with the missing skill named
            assertThrows(() => gwfResolve(entry), /Outcome gate tests-pass names a skill not in the sequence of wf-guided: integration-test --mode=verify/);
            // And an unknown gate ID, a duplicate gate and an empty satisfiedBy are rejected
            const unknownId = annotatedEntry(); unknownId.outcomeGates[0].id = 'looks-good';
            assertThrows(() => gwfResolve(unknownId), /Invalid outcome gate ID/);
            const duplicate = annotatedEntry(); duplicate.outcomeGates.push({ id: 'tests-pass', satisfiedBy: ['test'] });
            assertThrows(() => gwfResolve(duplicate), /Duplicate outcome gate in wf-guided: tests-pass/);
            const empty = annotatedEntry(); empty.outcomeGates[0].satisfiedBy = [];
            assertThrows(() => gwfResolve(empty), /needs satisfiedBy skills/);
            // Given variants: each listed skill must exist in some mode, and every mode must run one of them
            const variants = {
                outcomeGates: [{ id: 'tests-pass', satisfiedBy: ['test'] }],
                defaultMode: 'full',
                variants: {
                    full: { sequence: [{ id: 'verify', skill: 'test', role: 'gate' }, { id: 'close', skill: 'workflow-end' }] },
                    lite: { sequence: [{ id: 'close', skill: 'workflow-end' }] }
                }
            };
            assertEqual(gwfResolve(variants).outcomeGates[0].id, 'tests-pass');
            assertThrows(() => gwfResolve(variants, 'lite'), /Outcome gate tests-pass has no satisfying step in wf-guided\/lite/);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-004 the workflow reader returns each step role, the outcome gates and the intent',
        fn: () => {
            // Given a clean temp project holding only the reader, the manifest and an annotated registry
            const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gwf-reader-'));
            try {
                const scripts = path.join(dir, '.claude', 'scripts');
                fs.mkdirSync(path.join(scripts, 'codex'), { recursive: true });
                fs.mkdirSync(path.join(scripts, 'lib'), { recursive: true });
                fs.copyFileSync(path.join(SCRIPTS_DIR, 'codex', 'read-workflow-entry.mjs'), path.join(scripts, 'codex', 'read-workflow-entry.mjs'));
                for (const lib of ['workflow-manifest.cjs', 'project-root.cjs']) {
                    fs.copyFileSync(path.join(SCRIPTS_DIR, 'lib', lib), path.join(scripts, 'lib', lib));
                }
                for (const skill of GWF_SKILLS) {
                    fs.mkdirSync(path.join(dir, '.claude', 'skills', skill), { recursive: true });
                    fs.writeFileSync(path.join(dir, '.claude', 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\n`);
                }
                fs.writeFileSync(path.join(dir, '.claude', 'workflows.json'), JSON.stringify(gwfRegistry(annotatedEntry())));
                const isolated = { HOME: dir, USERPROFILE: dir, TMPDIR: dir, TEMP: dir, TMP: dir, CLAUDE_PROJECT_DIR: undefined };
                // When the reader runs as a process
                const result = spawnSync(process.execPath, [path.join(scripts, 'codex', 'read-workflow-entry.mjs'), 'wf-guided'], {
                    cwd: dir, encoding: 'utf8', env: childEnv(isolated), timeout: 30000
                });
                // Then each step carries its role, the workflow its gates and intent, with routed tokens resolved
                assertEqual(result.status, 0, result.stderr);
                const entry = JSON.parse(result.stdout);
                assertDeepEqual(entry.occurrences.map(step => [step.skill, step.role]), [
                    ['investigate', 'optional'], ['plan', 'core'], ['test', 'gate'], ['workflow-review-changes', 'gate'], ['workflow-end', 'gate']
                ]);
                assertDeepEqual(entry.outcomeGates, [
                    { id: 'tests-pass', satisfiedBy: ['test'], when: null },
                    { id: 'review-converged', satisfiedBy: ['workflow-review-changes'], when: null },
                    { id: 'run-closed', satisfiedBy: ['workflow-end'], when: 'A spec under docs/specs changed' }
                ]);
                assertEqual(entry.intent, 'Ship the change with tests green under docs/specs and the review converged.');
            } finally {
                fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
            }
        }
    },
    {
        name: '[guided-workflow] TC-GWF-005 an unannotated step reads as core; an unannotated workflow has no gates',
        fn: () => {
            // Given today's shape: a legacy string step, an object step without role, one with applicability
            const manifest = gwfResolve({
                sequence: ['investigate', { id: 'draft', skill: 'plan' }, { id: 'maybe-test', skill: 'test', applicability: { when: 'Code changed', skipReason: 'No code' } }, 'workflow-end']
            });
            // When read, Then every role defaults to core and the workflow-level fields are empty
            assertDeepEqual(manifest.occurrences.map(step => step.role), ['core', 'core', 'core', 'core']);
            assertDeepEqual(manifest.outcomeGates, []);
            assertEqual(manifest.intent, null);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-052 role has one owner: rejected under stepMeta, accepted on the occurrence',
        fn: () => {
            // Given a stepMeta entry carrying role
            const onStepMeta = { sequence: [{ id: 'close', skill: 'workflow-end' }], stepMeta: { close: { role: 'gate' } } };
            // When validated, Then it is rejected as an unknown stepMeta field
            assertThrows(() => gwfResolve(onStepMeta), /Unknown stepMeta close field: role/);
            // And the same role on the occurrence object is accepted
            assertEqual(gwfResolve({ sequence: [{ id: 'close', skill: 'workflow-end', role: 'gate' }] }).occurrences[0].role, 'gate');
            // And the shipped schema declares role on Occurrence only, never on StepMeta
            const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')).definitions;
            assertDeepEqual(schema.Occurrence.properties.role.enum, ['gate', 'core', 'optional']);
            assertEqual(schema.StepMeta.additionalProperties, false);
            assertTrue(!Object.prototype.hasOwnProperty.call(schema.StepMeta.properties, 'role'), 'StepMeta must not declare role');
        }
    },
    {
        name: '[guided-workflow] intent is one non-empty line when declared',
        fn: () => {
            // Given intents that are empty, blank or span lines
            for (const intent of ['', '   ', 'Ship it.\nThen more.', 42]) {
                // When validated, Then each is rejected
                assertThrows(() => gwfResolve({ intent }), /Invalid intent for wf-guided/);
            }
            // And a one-line intent is surfaced verbatim
            assertEqual(gwfResolve({ intent: 'Fix the reported defect at its root cause.' }).intent, 'Fix the reported defect at its root cause.');
            // And the shipped schema accepts the same one-line shape and keeps intent optional for now
            const entrySchema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8')).definitions.WorkflowEntry;
            const pattern = new RegExp(entrySchema.properties.intent.pattern);
            assertTrue(pattern.test('Fix the bug.') && !pattern.test(' ') && !pattern.test('a\nb'), 'intent pattern must accept one line only');
            assertTrue(!entrySchema.required.includes('intent'), 'intent stays optional until every workflow declares it');
        }
    }
];

// ============================================================================
// Annotated registry: every shipped workflow states its intent and outcome gates (GWF, P14)
//   Invariant: the registry that ships with `.claude/` tells the runner what each
//   workflow must achieve and which quality results can never flex. Each detector
//   runs against the shipped registry (expect no gaps) AND a mutated in-memory copy
//   (expect a gap), so a guard that stops detecting fails instead of passing silently.
// ============================================================================

const TEST_RUNNING_SKILLS = ['test'];
// `integration-test` and `e2e-test` run tests only through their `--mode=verify` invocation.
const TEST_RUNNING_INVOCATIONS = ['integration-test --mode=verify', 'e2e-test --mode=verify'];
const isInvocation = (command, invocation) => command === invocation || command.startsWith(`${invocation} `);
// A step object that runs the integration-test verification (its `--mode=verify` invocation).
const isIntegrationVerify = step => Boolean(step) && step.skill === 'integration-test' && /(^|\s)--mode=verify(\s|$)/.test(step.args || '');
// Steps that write code or tests: a workflow running one changes behavior, so it owes tests-pass
// even when it has no dedicated test step (BR-GWF-15).
const CODE_WRITING_INVOCATIONS = ['plan --mode=execute'];
const CODE_WRITING_SKILLS = ['fix', 'seed-test-data', 'integration-test', 'e2e-test', 'code-simplifier', 'scaffold'];
const CHANGE_REVIEW_SKILLS = ['workflow-review-changes', 'changes-review'];
const ALWAYS_GATE_SKILLS = ['workflow-review-changes', 'test'];
// Workflows built to run nested inside another: their close is conditional and the parent's close checks their gates (BR-GWF-01)
const NESTED_BUILT_WORKFLOWS = ['workflow-review-changes', 'workflow-e2e'];
const HEAVY_WRAPPERS = ['workflow-feature', 'workflow-bugfix', 'workflow-refactor', 'workflow-big-feature'];
const FLEX_VERBS = [/\bskip/i, /\bmerg/i, /\bsimplif/i, /\breorder/i];
const STEP_CONTRACT_POINTER = /^\*\*Step contract:\*\*/;

const cloneConfig = config => JSON.parse(JSON.stringify(config));
// A mutation that edits gates or step order would trip the phase rules (BR-GWF-19) before the check under test runs:
// drop the phases of the entry and of every mode, so the copy tests only the property it mutates.
const withoutPhases = entry => {
    delete entry.phases;
    for (const variant of Object.values(entry.variants || {})) delete variant.phases;
    return entry;
};
const commandOf = occurrence => (occurrence.args ? `${occurrence.skill} ${occurrence.args}` : occurrence.skill);

// Every resolved mode of one workflow; resolution itself proves each satisfiedBy skill exists.
function manifestsOf(config, workflowId) {
    const { resolveAllWorkflowManifests } = require(MANIFEST_PATH);
    return resolveAllWorkflowManifests(config, workflowId, { rootDir: PROJECT_ROOT });
}

function findAnnotationGaps(config) {
    const gaps = [];
    for (const [id, workflow] of Object.entries(config.workflows)) {
        if (typeof workflow.intent !== 'string' || !workflow.intent.trim() || /[\r\n]/.test(workflow.intent)) gaps.push(`${id}: intent`);
        if (!Array.isArray(workflow.outcomeGates) || workflow.outcomeGates.length === 0) {
            gaps.push(`${id}: outcomeGates`);
            continue;
        }
        if (!workflow.outcomeGates.some(gate => gate.id === 'run-closed')) gaps.push(`${id}: run-closed`);
        try {
            manifestsOf(config, id);
        } catch (error) {
            gaps.push(`${id}: ${error.message}`);
        }
    }
    return gaps;
}

function findMissingFloorGates(config) {
    const gaps = [];
    for (const [id, workflow] of Object.entries(config.workflows)) {
        // Gates of every resolved mode: entry-level gates plus each variant's own.
        const gateIds = new Set(manifestsOf(config, id).flatMap(manifest => manifest.outcomeGates.map(gate => gate.id)));
        const skills = new Set(manifestsOf(config, id).flatMap(manifest => manifest.occurrences.map(step => step.skill)));
        const invocations = manifestsOf(config, id).flatMap(manifest => manifest.occurrences.map(commandOf));
        const writesCodeByInvocation = invocations.some(command => CODE_WRITING_INVOCATIONS.some(code => command === code || command.startsWith(`${code} `)));
        const runsTestsByInvocation = invocations.some(command => TEST_RUNNING_INVOCATIONS.some(invocation => isInvocation(command, invocation)));
        const runsOrChangesTests = writesCodeByInvocation || runsTestsByInvocation || [...TEST_RUNNING_SKILLS, ...CODE_WRITING_SKILLS].some(skill => skills.has(skill));
        if (runsOrChangesTests && !gateIds.has('tests-pass')) gaps.push(`${id}: tests-pass`);
        if (CHANGE_REVIEW_SKILLS.some(skill => skills.has(skill)) && !gateIds.has('review-converged')) gaps.push(`${id}: review-converged`);
    }
    return gaps;
}

function findGateRoleGaps(config) {
    const gaps = [];
    for (const id of Object.keys(config.workflows)) {
        for (const manifest of manifestsOf(config, id)) {
            // The gates of THIS mode: entry-level gates plus the variant's own.
            const gates = manifest.outcomeGates;
            const closeIsConditional = gates.some(gate => gate.id === 'run-closed' && gate.when);
            // BR-GWF-01: only a workflow built to run nested may make its close conditional; its parent's close checks its gates
            if (closeIsConditional && !NESTED_BUILT_WORKFLOWS.includes(id)) gaps.push(`${id}/${manifest.mode}: conditional close outside a nested-built workflow`);
            const label = `${id}/${manifest.mode}`;
            for (const step of manifest.occurrences) {
                if (ALWAYS_GATE_SKILLS.includes(step.skill) && step.role !== 'gate') gaps.push(`${label}: ${commandOf(step)} is ${step.role}`);
                const conditionalClose = closeIsConditional && step.applicability.when !== 'always';
                if (step.skill === 'workflow-end' && step.role !== 'gate' && !conditionalClose) gaps.push(`${label}: ${commandOf(step)} is ${step.role}`);
            }
            // An unconditional outcome gate must be provable by a step the runner can never skip.
            for (const gate of gates.filter(g => !g.when)) {
                const { satisfierMatches } = require(MANIFEST_PATH);
                const provers = manifest.occurrences.filter(step => gate.satisfiedBy.some(satisfier => satisfierMatches(satisfier, step)) && step.role === 'gate');
                if (provers.length === 0) gaps.push(`${label}: ${gate.id} has no gate step`);
            }
        }
    }
    return gaps;
}

function rawOccurrences(config) {
    const steps = [];
    for (const [id, workflow] of Object.entries(config.workflows)) {
        const sequences = [workflow.sequence || [], ...Object.values(workflow.variants || {}).map(variant => variant.sequence || [])];
        for (const step of sequences.flat()) if (step && typeof step === 'object') steps.push({ id, step });
    }
    return steps;
}

function findRoleApplicabilityGaps(config) {
    const gaps = [];
    for (const { id, step } of rawOccurrences(config)) {
        const applicability = step.applicability || {};
        const complete = typeof applicability.when === 'string' && applicability.when.trim() && typeof applicability.skipReason === 'string' && applicability.skipReason.trim();
        if (step.role === 'optional' && !complete) gaps.push(`${id}: optional ${step.id} lacks when/skipReason`);
        if (step.role === 'gate' && step.applicability !== undefined) gaps.push(`${id}: gate ${step.id} carries applicability`);
    }
    return gaps;
}

// The root-cause trace is `investigate --mode=debug`; a plain `investigate` is the read-only code-flow trace and proves nothing.
const ROOT_CAUSE_SATISFIER = 'investigate --mode=debug';
const isRootCauseInvestigation = step => step.skill === 'investigate' && /(^|\s)--mode=debug(\s|$)/.test(step.args || '');

function findRootCauseGaps(config) {
    const gaps = [];
    for (const id of Object.keys(config.workflows)) {
        const occurrences = manifestsOf(config, id).flatMap(manifest => manifest.occurrences);
        if (!occurrences.some(step => step.skill === 'fix')) continue;
        // The gate may be entry-level or declared by a variant; read it from the resolved modes.
        const gate = manifestsOf(config, id).flatMap(manifest => manifest.outcomeGates).find(g => g.id === 'root-cause-traced');
        if (!gate || !gate.satisfiedBy.includes(ROOT_CAUSE_SATISFIER)) {
            gaps.push(`${id}: root-cause-traced by ${ROOT_CAUSE_SATISFIER}`);
            continue;
        }
        // An unconditional root-cause gate needs a gate investigation. A conditional one (for example
        // "a verify run reported a failing test") may be proved by an optional investigation whose own
        // run condition carries that trigger — a gate step never carries a run condition (BR-GWF-01).
        const investigations = occurrences.filter(isRootCauseInvestigation);
        const conditionalProver = step => Boolean(gate.when) && step.role === 'optional' && step.applicability.when !== 'always';
        if (investigations.length === 0 || investigations.some(step => step.role !== 'gate' && !conditionalProver(step))) gaps.push(`${id}: investigation step is not a gate`);
        if (investigations.some(step => /on-failure/.test(step.args) && step.role === 'gate')) gaps.push(`${id}: on-failure investigation must be optional, not a gate`);
    }
    return gaps;
}

// A code-changing clean-up step must come before the checks that prove the change (BR-GWF-14):
// every `test` run after it, and a review after it, or the evidence describes code that no longer ships.
const CODE_REWRITE_SKILLS = new Set(['code-simplifier']);
const REVIEW_SKILLS = new Set(['changes-review', 'why-review', 'workflow-review-changes']);

function findPostCheckRewrites(config) {
    const gaps = [];
    for (const id of Object.keys(config.workflows)) {
        for (const manifest of manifestsOf(config, id)) {
            const skills = manifest.occurrences.map(step => step.skill);
            skills.forEach((skill, index) => {
                if (!CODE_REWRITE_SKILLS.has(skill)) return;
                const later = skills.slice(index + 1);
                if (skills.slice(0, index).includes('test')) gaps.push(`${id}: ${skill} runs after a test run`);
                if (!later.some(next => REVIEW_SKILLS.has(next))) gaps.push(`${id}: no review after ${skill}`);
            });
        }
    }
    return gaps;
}

function readWrapper(workflowId) {
    return fs.readFileSync(path.join(PROJECT_ROOT, '.claude', 'skills', workflowId, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
}

// Rows of the wrapper's "Gates and Optional Steps" table as `command=role`.
function wrapperRoleRows(text) {
    const section = text.split('\n## Gates and Optional Steps\n')[1];
    if (!section) return null;
    const body = section.split('\n## ')[0];
    return [...body.matchAll(/^\|\s*`\/([^`]+)`\s*\|\s*(gate|optional)\s*\|/gm)].map(match => `${match[1]}=${match[2]}`);
}

function expectedRoleRows(config, workflowId) {
    const [manifest] = manifestsOf(config, workflowId);
    return manifest.occurrences.filter(step => step.role !== 'core').map(step => `${commandOf(step)}=${step.role}`);
}

// Lines that restate the flex rules: three or more of skip/merge/simplify/reorder together, granted
// on a logged reason or intent. A blanket "NEVER skip, reorder, or merge" banner is not a copy.
function flexRuleCopies(text) {
    return text.split('\n').filter(line => FLEX_VERBS.filter(verb => verb.test(line)).length >= 3 && /\breason|\bintent/i.test(line));
}

// Lines that forbid the flex the Step Execution Protocol grants: "NEVER … reorder/drop/skip … a step"
// or "steps … must never be skipped". Gate wording ("`gate` steps … NEVER skipped", "never skip
// mandatory steps") and skill-internal anchors ("NEVER skip Step 0", "Main steps (… NEVER skip)",
// "skill steps in declared order") are not claims about
// the flexible steps, so they pass.
const STRICT_ORDER_CLAIMS = [
    /\b(?:never|must not|do not)\b[^.;:\n]{0,40}?\b(?:improvis|reorder|drop|omit|skip)\w*[^.;:\n]{0,30}?\bsteps?\b(?!\s*\d)/gi,
    /\bsteps?\b[^.;:\n]{0,30}?\b(?:never|must not)\b[^.;:\n]{0,20}?\b(?:reorder|drop|omit|skip)/gi
];
function strictOrderClaims(text) {
    return text.split('\n').filter(line => STRICT_ORDER_CLAIMS.some(pattern =>
        [...line.matchAll(pattern)].some(match => !/gate|mandatory|required|main steps|skill steps/i.test(line.slice(Math.max(0, match.index - 12), match.index + match[0].length)))
    ));
}

// The canonical `SYNC:workflow-registry-binding` body, as the propagation tool reads it.
function registryBindingBody() {
    const text = fs.readFileSync(path.join(PROJECT_ROOT, '.claude', 'skills', 'shared', 'sync-inline-versions.md'), 'utf8').replace(/\r\n/g, '\n');
    const match = /^## SYNC:workflow-registry-binding\s*\n([\s\S]*?)(?=\n---\s*\n|\n## SYNC:)/m.exec(text);
    return match ? match[1] : '';
}

// Every declared step list (the flat `sequence` and each variant's) as skill names.
function declaredStepLists(config) {
    const skillOf = step => (typeof step === 'string' ? step.split(/\s+/, 1)[0] : step && step.skill);
    const lists = [];
    for (const [id, workflow] of Object.entries(config.workflows)) {
        if (Array.isArray(workflow.sequence)) lists.push([id, workflow.sequence.map(skillOf)]);
        for (const [mode, variant] of Object.entries(workflow.variants || {})) lists.push([`${id}/${mode}`, (variant.sequence || []).map(skillOf)]);
    }
    return lists;
}

// The session report (watzup) closes every mode and runs only on its stated condition (BR-GWF-18); the
// close-tail check owns its position.
function findMandatorySessionReports(config) {
    const gaps = [];
    for (const id of Object.keys(config.workflows)) {
        for (const manifest of manifestsOf(config, id)) {
            const last = manifest.occurrences[manifest.occurrences.length - 1];
            if (!last || last.skill !== 'watzup') continue;
            if (last.role !== 'optional' || last.applicability.when === 'always') gaps.push(`${id}/${manifest.mode}: watzup is ${last.role}`);
        }
    }
    return gaps;
}

function findMissingCloseTail(config) {
    return declaredStepLists(config)
        .filter(([, skills]) => skills.length < 2 || skills[skills.length - 2] !== 'workflow-end' || skills[skills.length - 1] !== 'watzup')
        .map(([label]) => label);
}

const annotatedRegistryTests = [
    {
        name: '[guided-workflow] TC-GWF-057 every shipped workflow declares a one-line intent and resolvable outcome gates',
        fn: () => {
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When every workflow is checked for intent, a non-empty gate list and a provable run-closed gate
            const gaps = findAnnotationGaps(config);
            // Then all workflows are annotated
            assertEqual(Object.keys(config.workflows).length, EXPECTED_WORKFLOW_IDS.length, 'the annotated set must be the full workflow set');
            assertDeepEqual(gaps, [], `every workflow needs intent + outcomeGates: ${gaps.join('; ')}`);
            // And the guard detects a workflow that loses its intent, its gates, or names an absent satisfier
            const mutated = cloneConfig(config);
            delete mutated.workflows['workflow-bugfix'].intent;
            mutated.workflows['workflow-refactor'].outcomeGates = [];
            mutated.workflows['workflow-e2e'].outcomeGates.push({ id: 'review-converged', satisfiedBy: ['workflow-review-changes'] });
            const found = findAnnotationGaps(mutated);
            assertTrue(found.some(gap => gap.startsWith('workflow-bugfix: intent')), `missing intent must be detected: ${found.join('; ')}`);
            assertTrue(found.some(gap => gap.startsWith('workflow-refactor: outcomeGates')), `empty gates must be detected: ${found.join('; ')}`);
            assertTrue(found.some(gap => gap.startsWith('workflow-e2e: Outcome gate review-converged names a skill not in the sequence')), `an unprovable gate must be detected: ${found.join('; ')}`);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-011 a workflow that runs tests or changes code declares tests-pass; one that reviews its changes declares review-converged',
        fn: () => {
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When each workflow's steps are compared with its gates, Then none misses the test or review floor
            assertDeepEqual(findMissingFloorGates(config), [], 'test-running, code-changing and change-reviewing workflows must declare their floor gates');
            // And every code-changing heavy workflow declares both
            for (const id of HEAVY_WRAPPERS) {
                const gateIds = config.workflows[id].outcomeGates.map(gate => gate.id);
                assertTrue(gateIds.includes('tests-pass') && gateIds.includes('review-converged'), `${id} must declare tests-pass and review-converged`);
            }
            // And dropping a floor gate is detected, including tests-pass on a code-changing workflow with no test step
            const mutated = cloneConfig(config);
            const drop = (id, gateId) => {
                withoutPhases(mutated.workflows[id]);
                mutated.workflows[id].outcomeGates = mutated.workflows[id].outcomeGates.filter(gate => gate.id !== gateId);
            };
            drop('workflow-feature', 'tests-pass');
            drop('workflow-review-changes', 'tests-pass');
            drop('workflow-seed-test-data', 'review-converged');
            assertDeepEqual(findMissingFloorGates(mutated), [
                'workflow-feature: tests-pass',
                'workflow-review-changes: tests-pass',
                'workflow-seed-test-data: review-converged'
            ]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-012 feature and bugfix gate spec sync on a behavior change; refactor declares no spec gate',
        fn: () => {
            // Given the shipped feature, bugfix and refactor workflows
            const config = loadWorkflowConfig();
            for (const id of ['workflow-feature', 'workflow-bugfix']) {
                // When their gates are read, Then spec-synced is declared with a behavior-change condition
                const gate = config.workflows[id].outcomeGates.find(g => g.id === 'spec-synced');
                assertTrue(gate !== undefined, `${id} must declare spec-synced`);
                assertTrue(/behavior/i.test(gate.when || '') && /changed/i.test(gate.when || ''), `${id} spec-synced must be conditional on a behavior change, got: ${gate.when}`);
            }
            // And a behavior-preserving refactor carries no spec gate
            assertTrue(!config.workflows['workflow-refactor'].outcomeGates.some(g => g.id === 'spec-synced'), 'workflow-refactor must not declare spec-synced');
        }
    },
    {
        name: '[guided-workflow] TC-GWF-013 review, test and close steps are gates, and every unconditional outcome gate has a gate step',
        fn: () => {
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When roles are resolved per mode, Then no review/test/close step can flex and every fixed gate is provable
            assertDeepEqual(findGateRoleGaps(config), [], 'gate roles are incomplete');
            // And bugfix, which has no test step, fixes its tests-pass step instead
            const [bugfix] = manifestsOf(config, 'workflow-bugfix');
            assertEqual(bugfix.occurrences.find(isIntegrationVerify).role, 'gate');
            // And demoting a test step or the step proving tests-pass is detected
            const mutated = cloneConfig(config);
            mutated.workflows['workflow-feature'].sequence.find(step => step.skill === 'test').role = 'core';
            mutated.workflows['workflow-bugfix'].sequence.find(isIntegrationVerify).role = 'core';
            const found = findGateRoleGaps(mutated);
            assertTrue(found.includes('workflow-feature/default: test --proven=@verify is core'), `a core test step must be detected: ${found.join('; ')}`);
            assertTrue(found.includes('workflow-bugfix/default: tests-pass has no gate step'), `an unprovable tests-pass must be detected: ${found.join('; ')}`);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-014 every shipped optional step carries when and skipReason; no gate step carries applicability',
        fn: () => {
            // Given every occurrence object in every sequence and variant
            const config = loadWorkflowConfig();
            // When roles and applicability are read, Then every optional step can be skipped only with a stated reason
            assertDeepEqual(findRoleApplicabilityGaps(config), [], 'optional/gate applicability is inconsistent');
            assertTrue(rawOccurrences(config).some(({ step }) => step.role === 'optional'), 'the shipped registry must declare optional steps');
            // And a registry edit that drops a skip reason, or makes a gate skippable, is detected
            const mutated = cloneConfig(config);
            const optional = mutated.workflows['workflow-feature'].sequence.find(step => step.role === 'optional' && step.skill === 'demo-guide');
            delete optional.applicability.skipReason;
            mutated.workflows['workflow-refactor'].sequence.find(step => step.id === 'refactor-test').applicability = { when: 'Sometimes', skipReason: 'Never' };
            assertDeepEqual(findRoleApplicabilityGaps(mutated), [
                'workflow-feature: optional feature-demo-guide lacks when/skipReason',
                'workflow-refactor: gate refactor-test carries applicability'
            ]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-062 a bug-fixing workflow requires a root-cause trace from a gate investigation step',
        fn: () => {
            // Given the shipped workflows whose steps fix a defect
            const config = loadWorkflowConfig();
            // When their gates and roles are read, Then each declares root-cause-traced from a gate `investigate --mode=debug` step
            assertDeepEqual(findRootCauseGaps(config), [], 'bug-fixing workflows need a root-cause gate');
            // And the test-repair variant, whose only investigator and fixer is the `integration-test --mode=verify --fix-loop`
            // step, states the on-failure condition on the gate and has no workflow-level investigate/fix step
            const green = config.workflows['workflow-integration-test'].variants.green.outcomeGates.find(g => g.id === 'root-cause-traced');
            assertTrue(Boolean(green && green.when), 'an on-failure investigation needs a conditional root-cause gate');
            assertTrue(green.satisfiedBy.includes('integration-test --mode=verify'), 'the loop step owns the per-failure root-cause trail');
            const greenManifest = manifestsOf(config, 'workflow-integration-test').find(manifest => manifest.mode === 'green');
            const greenSkills = greenManifest.occurrences.map(step => step.skill);
            assertTrue(greenManifest.occurrences.some(isIntegrationVerify), 'the loop step is in the sequence');
            assertTrue(!greenManifest.occurrences.some(isRootCauseInvestigation) && !greenSkills.includes('fix'),
                `the loop owns investigation and fixes; a workflow-level step would start a second fix loop, got: ${greenSkills.join(', ')}`);
            // And an investigation step marked optional under an unconditional gate, or a workflow-level fix step
            // added without an `investigate --mode=debug` satisfier for its root-cause gate, is detected
            const mutated = cloneConfig(config);
            const investigate = mutated.workflows['workflow-bugfix'].sequence.find(isRootCauseInvestigation);
            investigate.role = 'optional';
            investigate.applicability = { when: 'Cause unknown', skipReason: 'Cause known' };
            assertDeepEqual(findRootCauseGaps(mutated), ['workflow-bugfix: investigation step is not a gate']);
            const regrown = cloneConfig(config);
            delete regrown.workflows['workflow-integration-test'].variants.green.phases;
            regrown.workflows['workflow-integration-test'].variants.green.sequence.splice(2, 0, {
                id: 'green-fix', skill: 'fix', args: '[on-failure]', role: 'optional',
                applicability: { when: 'A verify run reported a failing test.', skipReason: 'Every verify run was green.' }
            });
            assertDeepEqual(findRootCauseGaps(regrown), [`workflow-integration-test: root-cause-traced by ${ROOT_CAUSE_SATISFIER}`]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-073 the session report step runs when asked for; otherwise the close gives the summary',
        fn: () => {
            // Business Intent / Invariant Guarded: every run still ends with a summary the developer can act on,
            // without a second full report nobody asked for (BR-GWF-18).
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When each mode's last step is read, Then the session report step is optional with a run condition
            assertDeepEqual(findMandatorySessionReports(config), []);
            // And a report step made unconditional in one workflow is detected
            const mutated = cloneConfig(config);
            const refactor = mutated.workflows['workflow-refactor'].sequence;
            refactor[refactor.length - 1] = { id: refactor[refactor.length - 1].id, skill: 'watzup' };
            assertDeepEqual(findMandatorySessionReports(mutated), ['workflow-refactor/default: watzup is core']);
            // And the close step gives the recap, or a handoff when nothing was built, whenever the report step does not run
            const end = readWrapper('workflow-end');
            for (const phrase of ['An optional `/watzup` whose `applicability.when` does not hold counts as not following.', 'print instead a short **handoff**']) {
                assertTrue(end.includes(phrase), `workflow-end lost: ${phrase}`);
            }
        }
    },
    {
        name: '[guided-workflow] never-skipped quality bars rest on gate steps; feature-spec reviews the final spec',
        fn: () => {
            // Business Intent / Invariant Guarded: a bar a workflow declares never skipped is a registry gate step, so no
            // logged deviation can drop it (BR-GWF-01); a review gate judges content no later step rewrites (BR-GWF-14).
            // Given the shipped registry
            const config = loadWorkflowConfig();
            const roleOf = (workflow, id) => (config.workflows[workflow].sequence.find(step => typeof step !== 'string' && step.id === id) || {}).role;
            // When the declared never-skipped steps are read, Then each is a gate
            const required = [
                ['workflow-big-feature', 'architecture-scalability-gate'], ['workflow-big-feature', 'architecture-rationale-review'], ['workflow-big-feature', 'big-feature-e2e'],
                ['workflow-greenfield-init', 'architecture-scalability-gate'], ['workflow-greenfield-init', 'architecture-rationale-review'],
                ['workflow-greenfield-init', 'greenfield-foundation-review'], ['workflow-greenfield-init', 'greenfield-review'], ['workflow-greenfield-init', 'final-test'],
            ];
            const notGates = required.filter(([workflow, id]) => roleOf(workflow, id) !== 'gate').map(([workflow, id]) => `${workflow}:${id}`);
            assertDeepEqual(notGates, []);
            // And feature-spec's review gate runs after clarify and sync, the steps that edit the spec it reviews
            const order = config.workflows['workflow-feature-spec'].sequence.map(step => typeof step === 'string' ? step : step.id);
            const at = id => order.indexOf(id);
            assertTrue(at('feature-spec-clarification') < at('feature-spec-spec-review') && at('feature-spec-sync') < at('feature-spec-spec-review'),
                `feature-spec reviews before the spec stops changing: ${order.join(' -> ')}`);
        }
    },
    {
        name: '[guided-workflow] the independent challenge is optional in every planned-work chain, while the fresh-context task review and DoR are never optional',
        fn: () => {
            // Business Intent / Invariant Guarded: a small, low-risk task with no second reviewer skips the cross-person challenge, but the
            // fresh-context task review (its rows 10-12: module, feasibility, cross-cutting) and the DoR gate still judge every task (P41 B3).
            // Given the shipped registry
            const config = loadWorkflowConfig();
            const occurrences = (workflow, mode) => (mode ? config.workflows[workflow].variants[mode] : config.workflows[workflow]).sequence.filter(step => typeof step !== 'string');
            for (const [workflow, mode] of [['workflow-planned-work', 'idea-to-tasks'], ['workflow-planned-work', 'spec-to-tasks'], ['workflow-big-feature'], ['workflow-greenfield-init']]) {
                // When its challenge occurrence is read, Then it is optional with the second-reviewer-or-risk condition
                const challenge = occurrences(workflow, mode).find(step => step.skill === 'work-item' && /--mode=challenge/.test(step.args || ''));
                assertTrue(challenge && challenge.role === 'optional', `${workflow}: the challenge must be optional`);
                assertTrue(/second reviewer/.test(challenge.applicability.when) && /size M or larger/.test(challenge.applicability.when), `${workflow}: challenge condition: ${challenge.applicability.when}`);
                assertTrue(/rows 10-12/.test(challenge.applicability.skipReason), `${workflow}: the skip names the task-review rows that carry the checks`);
                // And the fresh-context task review that carries its checks, and the DoR that follows it, are never optional
                const review = occurrences(workflow, mode).find(step => step.skill === 'work-item' && /--mode=review --type=task\b/.test(step.args || ''));
                assertTrue(review && review.role !== 'optional', `${workflow}${mode ? ` (${mode})` : ''}: the task review must not be optional`);
                const dor = occurrences(workflow, mode).find(step => step.skill === 'work-item' && /--mode=dor/.test(step.args || ''));
                assertTrue(dor && dor.role !== 'optional', `${workflow}${mode ? ` (${mode})` : ''}: DoR must not be optional`);
            }
            // And the planning chains keep the task review as a gate (big-feature and greenfield run it as a core step)
            for (const [mode, id] of [['idea-to-tasks', 'idea-to-tasks-task-review'], ['spec-to-tasks', 'spec-to-tasks-task-review']]) {
                assertTrue(occurrences('workflow-planned-work', mode).find(step => step.id === id).role === 'gate', `${mode}: the task review must stay a gate`);
            }
        }
    },
    {
        name: '[guided-workflow] the merged planned-work workflow keeps every step and role of the three workflows it replaced, one mode each',
        fn: () => {
            // Business Intent / Invariant Guarded: merging initiative-to-task, initiative-to-spec and spec-to-task into one workflow
            // drops no step, argument or gate: each mode equals, by content, the workflow it replaced (P41 D8).
            const config = loadWorkflowConfig();
            const expected = {
                'idea-to-tasks': [
                    'web-research --chain=deep-dive [optional]',
                    'brainstorm [optional]',
                    'initiative [core]',
                    'spec [mode=discovery] [optional]',
                    'work-item --mode=review [optional]',
                    'domain-analysis [optional]',
                    'why-review [optional]',
                    'spec [mode=draft] [optional]',
                    'spec [mode=tests] [optional]',
                    'work-item --mode=review --type=spec-tests [optional]',
                    'spec [mode=clarify] [optional]',
                    'scenario [optional]',
                    'plan [optional]',
                    'work-item --mode=refine [core]',
                    'work-item --mode=review --type=task --fix-loop [gate]',
                    'work-item --mode=challenge --reuse=task-review [optional]',
                    'work-item --mode=story [core]',
                    'work-item --mode=dor --reuse=task-review [gate]',
                    'prioritize [optional]',
                    'design-spec [optional]',
                    'work-item --mode=review --type=design [optional]',
                    'work-item --mode=mockup --explore [optional]',
                    'docs-manager --mode=update [optional]',
                    'feature-presentation [optional]',
                    'workflow-end [gate]',
                    'watzup [optional]',
                ],
                'idea-to-spec': [
                    'web-research --chain=deep-dive [optional]',
                    'brainstorm [optional]',
                    'spec [mode=discovery] [optional]',
                    'scenario [optional]',
                    'domain-analysis [optional]',
                    'why-review [optional]',
                    'initiative [optional]',
                    'spec [mode=draft] [core]',
                    'spec [mode=tests] [core]',
                    'work-item --mode=review --type=spec-tests --fix-loop [gate]',
                    'design-spec [optional]',
                    'work-item --mode=review --type=design [optional]',
                    'spec [mode=clarify] [gate]',
                    'why-review [optional]',
                    'docs-manager --mode=update [optional]',
                    'feature-presentation [optional]',
                    'workflow-end [gate]',
                    'watzup [optional]',
                ],
                'spec-to-tasks': [
                    'investigate [core]',
                    'spec [mode=index] [optional]',
                    'domain-analysis [optional]',
                    'why-review [optional]',
                    'spec [mode=clarify] [gate]',
                    'scenario [optional]',
                    'plan [optional]',
                    'work-item --mode=refine [core]',
                    'work-item --mode=review --type=task --fix-loop [gate]',
                    'work-item --mode=challenge --reuse=task-review [optional]',
                    'work-item --mode=story [core]',
                    'work-item --mode=dor --reuse=task-review [gate]',
                    'prioritize [optional]',
                    'design-spec [optional]',
                    'work-item --mode=review --type=design [optional]',
                    'work-item --mode=mockup --explore [optional]',
                    'docs-manager --mode=update [optional]',
                    'feature-presentation [optional]',
                    'workflow-end [gate]',
                    'watzup [optional]',
                ],
            };
            const entry = config.workflows['workflow-planned-work'];
            // Given the merged workflow, When each mode is read by content, Then it equals the workflow it replaced
            const tuples = workflow => Object.fromEntries(Object.entries(workflow.variants).map(([mode, variant]) => [mode, variant.sequence.map(step => `${step.skill}${step.args ? ' ' + step.args : ''} [${step.role || 'core'}]`)]));
            assertDeepEqual(tuples(entry), expected);
            assertEqual(entry.defaultMode, 'idea-to-tasks');
            // And each step keeps the condition it had before the merge: a digest of (skill, args, role, applicability) per mode,
            // recorded when the merge was checked against the replaced workflows (the only difference: the challenge's approved B3
            // condition in idea-to-tasks and spec-to-tasks). A changed `when`
            // or `skipReason` turns this red: review it against BR-GWF-20, then record the new digest.
            const conditions = workflow => Object.fromEntries(Object.entries(workflow.variants).map(([mode, variant]) => [mode,
                require('crypto').createHash('sha256').update(JSON.stringify(variant.sequence.map(step => [step.skill, step.args || '', step.role || 'core', step.applicability || null]))).digest('hex').slice(0, 16)]));
            assertDeepEqual(conditions(entry), { 'idea-to-tasks': 'a353904706bc8301', 'idea-to-spec': '8211254ab42c0f6a', 'spec-to-tasks': '22b8f788eccd8618' });
            // And a mode that drops a step is detected
            const mutated = cloneConfig(config);
            mutated.workflows['workflow-planned-work'].variants['spec-to-tasks'].sequence.splice(1, 1);
            assertTrue(JSON.stringify(tuples(mutated.workflows['workflow-planned-work'])) !== JSON.stringify(expected), 'a dropped step must fail the comparison');
        }
    },
    {
        name: '[guided-workflow] greenfield hands its first slice to implement-spec without losing a gate',
        fn: () => {
            // Business Intent / Invariant Guarded: splitting greenfield keeps every gate it had: plan approval, the foundation review and the
            // converging change review of the foundation stay in the foundation, and the first slice's review, verify, test and near-end E2E run in workflow-implement-spec (P41 D7).
            const config = loadWorkflowConfig();
            const greenfield = config.workflows['workflow-greenfield-init'];
            const gateSkills = greenfield.sequence.filter(step => step.role === 'gate').map(step => `${step.skill}${step.args ? ' ' + step.args : ''}`);
            for (const gate of ['plan --mode=validate', 'architecture --mode=full', 'workflow-review-changes --tests=defer', 'test', 'workflow-end']) assertTrue(gateSkills.includes(gate), `greenfield lost its gate ${gate}`);
            // And the foundation's review-converged rests on the converging change review (its receipt), never on the read-only architecture diagnostic
            assertDeepEqual(greenfield.outcomeGates.find(gate => gate.id === 'review-converged').satisfiedBy, ['workflow-review-changes']);
            // And it reviews the finished foundation (BR-GWF-14): after scaffold, the foundation review and the reference docs, before the final test
            const at = id => greenfield.sequence.findIndex(step => step.id === id);
            const foundationOrder = ['greenfield-scaffold', 'greenfield-foundation-review', 'greenfield-foundation-docs', 'greenfield-review', 'final-test'].map(at);
            assertTrue(foundationOrder.every((index, position) => index >= 0 && (position === 0 || index > foundationOrder[position - 1])), `the foundation change review must follow the foundation and precede the final test: ${foundationOrder.join(', ')}`);
            assertDeepEqual(greenfield.outcomeGates.map(gate => gate.id).sort(), ['plan-approved', 'review-converged', 'run-closed', 'tests-pass']);
            assertTrue(greenfield.preActions.injectContext.includes('/workflow-implement-spec'), 'greenfield names its hand-off');
            // And implement-spec's greenfield-slice mode owns the first slice's build tail, with its near-end E2E a gate
            assertTrue(greenfield.preActions.injectContext.includes('/workflow-implement-spec --mode=greenfield-slice'), 'greenfield names the exact hand-off mode');
            const implement = config.workflows['workflow-implement-spec'].variants['greenfield-slice'].sequence;
            const byId = id => implement.find(step => step.id === id) || {};
            const SLICE_GATES = ['implement-spec-review', 'implement-spec-integration-verify', 'implement-spec-e2e', 'implement-spec-test', 'implement-spec-end'];
            const sliceGateGaps = cfg => SLICE_GATES.filter(id => ((cfg.workflows['workflow-implement-spec'].variants['greenfield-slice'].sequence.find(step => step.id === id) || {}).role) !== 'gate');
            assertDeepEqual(sliceGateGaps(config), [], 'every first-slice gate is a gate in greenfield-slice');
            assertTrue(/workflow-greenfield-init/.test(byId('implement-spec-plan').applicability.when), 'the plan step re-plans only when no approved plan was handed off or the slice changed');
            assertTrue(/persists state/.test(byId('implement-spec-seed-test-data').applicability.when), 'seed data runs when the product persists state');
            // And demoting the slice's E2E gate is detected
            const demoted = cloneConfig(config);
            demoted.workflows['workflow-implement-spec'].variants['greenfield-slice'].sequence.find(step => step.id === 'implement-spec-e2e').role = 'optional';
            assertDeepEqual(sliceGateGaps(demoted), ['implement-spec-e2e'], 'a demoted first-slice E2E must be detected');
            const order = implement.map(step => step.id);
            assertTrue(order.indexOf('implement-spec-integration-verify') < order.indexOf('implement-spec-e2e') && order.indexOf('implement-spec-e2e') < order.indexOf('implement-spec-test'), 'E2E runs after the verify and before the final test');
        }
    },
    {
        name: '[guided-workflow] every workflow mode declares phases that list each step once, in order, with every outcome gate tied to a phase exit',
        fn: () => {
            // Business Intent / Invariant Guarded: one todo per phase never hides a step or a gate (P41 D6): the resolver accepts a mode only when
            // its phases cover every occurrence once in order and each outcome gate is the exit of exactly one phase.
            const config = loadWorkflowConfig();
            const { resolveAllWorkflowManifests } = require(path.resolve(__dirname, '..', '..', '..', 'scripts', 'lib', 'workflow-manifest.cjs'));
            const missing = [];
            for (const id of Object.keys(config.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(config, id, { rootDir: path.resolve(__dirname, '..', '..', '..', '..') })) {
                    if (!manifest.phases.length) missing.push(`${id}/${manifest.mode}`);
                    assertDeepEqual(manifest.phases.flatMap(phase => phase.steps), manifest.occurrences.map(step => step.id));
                    assertDeepEqual(manifest.phases.flatMap(phase => phase.exit).sort(), manifest.outcomeGates.map(gate => gate.id).sort());
                }
            }
            assertDeepEqual(missing, [], 'every mode declares phases');
            // And a phase list that drops a step is rejected by the resolver
            const mutated = cloneConfig(config);
            mutated.workflows['workflow-bugfix'].phases[0].steps.pop();
            let rejected = false;
            try { resolveAllWorkflowManifests(mutated, 'workflow-bugfix', { rootDir: path.resolve(__dirname, '..', '..', '..', '..') }); } catch { rejected = true; }
            assertTrue(rejected, 'a phase list that drops a step must be rejected');
        }
    },
    {
        name: '[guided-workflow] TC-GWF-068 no workflow rewrites code after the test run or review that proves it',
        fn: () => {
            // Given the shipped workflows
            const config = loadWorkflowConfig();
            // When the recommended order of each sequence is read, Then every clean-up rewrite precedes the test run and is reviewed
            assertDeepEqual(findPostCheckRewrites(config), [], 'a clean-up rewrite runs after the checks that prove the change');
            // And a sequence that moves the clean-up behind its test and review gates is detected
            const mutated = cloneConfig(config);
            delete mutated.workflows['workflow-seed-test-data'].phases;
            const sequence = mutated.workflows['workflow-seed-test-data'].sequence;
            sequence.splice(sequence.findIndex(step => (typeof step === 'string' ? step : step.skill) === 'docs-manager'), 0, { id: 'seed-code-simplifier', skill: 'code-simplifier' });
            assertDeepEqual(findPostCheckRewrites(mutated), [
                'workflow-seed-test-data: code-simplifier runs after a test run',
                'workflow-seed-test-data: no review after code-simplifier'
            ]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-015 the heavy wrappers list exactly their gate and optional steps and point to the step contract once',
        fn: () => {
            // Given the shipped registry and the four heavy workflow wrappers
            const config = loadWorkflowConfig();
            for (const id of HEAVY_WRAPPERS) {
                // When the wrapper's summary table is read
                const text = readWrapper(id);
                const rows = wrapperRoleRows(text);
                // Then it lists every gate and optional step in sequence order with the registry role
                assertTrue(rows !== null, `${id} must carry a "Gates and Optional Steps" section`);
                assertDeepEqual(rows, expectedRoleRows(config, id), `${id} summary table drifted from workflows.json roles`);
                // And it points to the step contract in exactly one line
                assertEqual(text.split('\n').filter(line => STEP_CONTRACT_POINTER.test(line)).length, 1, `${id} must point to the step contract once`);
            }
            // And a registry role change the table does not follow is detected
            const mutated = cloneConfig(config);
            mutated.workflows['workflow-refactor'].sequence.find(step => step.skill === 'workflow-end').role = 'core';
            assertTrue(
                JSON.stringify(wrapperRoleRows(readWrapper('workflow-refactor'))) !== JSON.stringify(expectedRoleRows(mutated, 'workflow-refactor')),
                'the drift guard must notice a role the table does not list'
            );
        }
    },
    {
        name: '[guided-workflow] TC-GWF-061 no workflow surface copies the flex rules or forbids the flex they grant',
        fn: () => {
            // Given every workflow wrapper and the compact routing catalog
            const { buildWorkflowSkillsCatalog } = require(path.join(SCRIPTS_DIR, 'lib', 'workflow-skills-catalog.cjs'));
            const surfaces = EXPECTED_WORKFLOW_IDS.map(id => [id, readWrapper(id)]);
            surfaces.push(['routing catalog', buildWorkflowSkillsCatalog({ rootDir: PROJECT_ROOT, compact: true })]);
            for (const [label, text] of surfaces) {
                // When each surface is read, Then it restates no flex rule and points to the owner at most once
                assertDeepEqual(flexRuleCopies(text), [], `${label} must not copy the flex rules`);
                assertTrue(text.split('\n').filter(line => STEP_CONTRACT_POINTER.test(line)).length <= 1, `${label} must carry at most one pointer line`);
            }
            // And no wrapper, the flex-rule owner, or the canonical registry-binding body contradicts the owner
            // by forbidding a reorder, drop or skip of a workflow step
            const contradictionSurfaces = [
                ...EXPECTED_WORKFLOW_IDS.map(id => [id, readWrapper(id)]),
                ['start-workflow', readWrapper('start-workflow')],
                ['SYNC:workflow-registry-binding', registryBindingBody()]
            ];
            assertTrue(registryBindingBody().includes('`sequence`'), 'the canonical workflow-registry-binding body must be readable');
            for (const [label, text] of contradictionSurfaces) {
                assertDeepEqual(strictOrderClaims(text), [], `${label} must point to the Step Execution Protocol, not forbid step flex`);
            }
            // And a pasted rule line, or the old strict-order registry row, is detected
            assertEqual(flexRuleCopies('Core steps may be skipped, merged, simplified or reordered with a logged reason.').length, 1);
            assertEqual(strictOrderClaims('> | `sequence` | the ordered step list | Execute 1:1. NEVER improvise, reorder, add, or drop a step. |').length, 1);
            assertEqual(strictOrderClaims('Steps must never be reordered.').length, 1);
            // And gate wording and numbered skill-internal anchors are not mistaken for a step-flex ban
            assertDeepEqual(strictOrderClaims([
                '2. **`gate` steps ALWAYS run and are NEVER skipped, merged away, simplified away or reordered** (BR-GWF-01).',
                '`gate` steps never skip.',
                '- Confirm mode via `ask user question tool` BEFORE any action — NEVER skip Step 0',
                '- NEVER skip mandatory workflow or skill gates.',
                'preserve evidence, and never batch or skip mandatory steps.',
                '**IMPORTANT MUST ATTENTION — Main steps (execute in order, NEVER skip/merge):** detect → analyze'
            ].join('\n')), []);
        }
    },
    {
        name: '[guided-workflow] every workflow and every variant closes with workflow-end then watzup',
        fn: () => {
            // Business Intent / Invariant Guarded: every run ends the same way — the close check, then the
            // handoff summary — whichever workflow or mode was selected.
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When each flat sequence and each variant sequence is read, Then all end workflow-end -> watzup
            assertDeepEqual(findMissingCloseTail(config), []);
            assertTrue(declaredStepLists(config).some(([label]) => label.includes('/')), 'variant sequences must be checked too');
            // And a missing watzup (variant) or a watzup moved ahead of workflow-end (flat) is detected
            const mutated = cloneConfig(config);
            const synthesis = mutated.workflows['workflow-research'].variants.synthesis.sequence;
            synthesis.splice(synthesis.findIndex(step => step.skill === 'watzup'), 1);
            const flat = mutated.workflows['workflow-spec-sync'].sequence;
            const [watzup] = flat.splice(flat.findIndex(step => (typeof step === 'string' ? step : step.skill) === 'watzup'), 1);
            flat.splice(flat.length - 1, 0, watzup);
            assertDeepEqual(findMissingCloseTail(mutated), ['workflow-research/synthesis', 'workflow-spec-sync']);
        }
    }
];

// ============================================================================
// Lean spec-supplied route (P15, BR-GWF-04/05/09)
//   Invariant: `workflow-implement-spec` is shorter than the feature route only where
//   the requested behavior is already specified — it keeps every gate, reconciles
//   behavior and test evidence once before the review,
//   stops at its gap review when the spec lacks the requested behavior, and is chosen
//   by "the requested behavior is already written in a canonical spec", never by a
//   spec file merely existing. Each detector runs on the shipped registry (expect no
//   gap) AND an in-memory mutation (expect a gap).
// ============================================================================

const LEAN_ROUTE_ID = 'workflow-implement-spec';
const LEAN_ROUTE_SEQUENCE = [
    'investigate',
    'spec [mode=clarify]',
    'plan',
    'plan --mode=execute',
    'seed-test-data',
    'integration-test',
    'spec [mode=sync]',
    'workflow-review-changes --tests=defer',
    'integration-test --mode=verify',
    'workflow-e2e --source=context',
    'test --proven=@verify',
    'workflow-end',
    'watzup'
];
const LEAN_ROUTE_GATE_SKILLS = ['workflow-review-changes', 'test', 'workflow-end'];
const isLeanRouteGate = step => LEAN_ROUTE_GATE_SKILLS.includes(step.skill) || isIntegrationVerify(step);
const LEAN_ROUTE_OUTCOME_GATES = ['tests-pass', 'review-converged', 'spec-synced', 'run-closed'];
const LEAN_ROUTE_PREDICATE = 'requested behavior is already written in a canonical spec';
const FEATURE_ROUTE_PREDICATES = ['no canonical spec yet', 'does not contain the requested behavior', 'update the spec first'];
// The catalog build reads this repository's registry and skill tree, so it is an authoring-repo self-check.
const LEAN_CATALOG_SKIP = require('../lib/framework-repo-guard.cjs').isFrameworkRepo(PROJECT_ROOT)
    ? false
    : 'asserts the framework repo workflow registry only';

const stepSkill = step => (typeof step === 'string' ? step.split(/\s+/, 1)[0] : step && step.skill);
// The full invocation of a step (`skill args`): `spec` serves several roles, so the mode is part of the identity.
const stepCommand = step => (typeof step === 'string' ? step.trim() : [step.skill, step.args].filter(Boolean).join(' '));

function findLeanRouteShapeGaps(config) {
    const workflow = config.workflows[LEAN_ROUTE_ID];
    if (!workflow) return [`${LEAN_ROUTE_ID}: missing`];
    const gaps = [];
    const [manifest] = manifestsOf(config, LEAN_ROUTE_ID);
    const steps = manifest.occurrences.map(commandOf);
    if (JSON.stringify(steps) !== JSON.stringify(LEAN_ROUTE_SEQUENCE)) gaps.push(`sequence: ${steps.join(' -> ')}`);
    for (const step of manifest.occurrences) {
        // Conditional by design: the sync (behavior difference), test authoring for cases execute left uncovered, seed data and the
        // near-end E2E (explicit request or a greenfield first slice, P41 D7) and the session report.
        const expected = isLeanRouteGate(step) ? 'gate' : ['spec [mode=sync]', 'integration-test', 'seed-test-data', 'workflow-e2e --source=context', 'watzup'].includes(commandOf(step)) ? 'optional' : 'core';
        if (step.role !== expected) gaps.push(`role: ${commandOf(step)} is ${step.role}, expected ${expected}`);
    }
    const gates = workflow.outcomeGates || [];
    for (const id of LEAN_ROUTE_OUTCOME_GATES) if (!gates.some(gate => gate.id === id)) gaps.push(`outcome gate: ${id}`);
    const testsPass = gates.find(gate => gate.id === 'tests-pass');
    if (testsPass && JSON.stringify(testsPass.satisfiedBy) !== JSON.stringify(['integration-test --mode=verify', 'test'])) gaps.push('outcome gate: tests-pass satisfiers');
    const specSynced = gates.find(gate => gate.id === 'spec-synced');
    if (specSynced && !/behavior differs/i.test(specSynced.when || '')) gaps.push('outcome gate: spec-synced is not conditional on a behavior difference');
    if (workflow.activation !== 'auto') gaps.push(`activation: ${workflow.activation}`);
    return gaps;
}

function findLeanSpecSyncGaps(config) {
    const gaps = [];
    // Every resolved mode (default and greenfield-slice): the sync step is found by its ID, never by its skill,
    // because `spec` also runs the gap review earlier in the route
    for (const manifest of manifestsOf(config, LEAN_ROUTE_ID)) {
        const sequence = manifest.occurrences;
        const prefix = `${manifest.mode}: spec sync`;
        const index = sequence.findIndex(step => step.id === 'implement-spec-sync');
        if (index < 0) { gaps.push(`${prefix}: missing`); continue; }
        const step = sequence[index];
        if (commandOf(step) !== 'spec [mode=sync]') gaps.push(`${prefix}: command ${commandOf(step)}`);
        if (step.role !== 'optional') gaps.push(`${prefix}: role ${step.role}`);
        const applicability = step.applicability || {};
        if (!/behavior differs from the supplied spec/i.test(applicability.when || '')) gaps.push(`${prefix}: when`);
        if (!/behavior and canonical case-to-test evidence still match the supplied spec/i.test(applicability.skipReason || '')) gaps.push(`${prefix}: skipReason`);
        const integrationIndex = sequence.findIndex(other => commandOf(other) === 'integration-test');
        if (!(integrationIndex >= 0 && integrationIndex < index)) gaps.push(`${prefix}: not after integration-test authoring`);
        if (!(index < sequence.findIndex(other => other.skill === 'workflow-review-changes'))) gaps.push(`${prefix}: not before workflow-review-changes`);
    }
    return gaps;
}

function findRoutePredicateGaps(config) {
    const gaps = [];
    const lean = config.workflows[LEAN_ROUTE_ID].whenToUse;
    const feature = config.workflows['workflow-feature'].whenToUse;
    if (!lean.includes(LEAN_ROUTE_PREDICATE)) gaps.push('lean: predicate');
    for (const predicate of FEATURE_ROUTE_PREDICATES) if (!feature.includes(predicate)) gaps.push(`feature: ${predicate}`);
    if (feature.includes(LEAN_ROUTE_PREDICATE)) gaps.push('feature: claims the lean predicate');
    for (const predicate of FEATURE_ROUTE_PREDICATES.slice(0, 2)) if (lean.includes(predicate)) gaps.push(`lean: claims ${predicate}`);
    // Neither route may be keyed on a spec merely existing; only an explicit "never just because" negation may name it.
    for (const [label, text] of [['lean', lean], ['feature', feature]]) {
        for (const match of text.matchAll(/\b(?:a|the) spec(?: file)? exists\b/gi)) {
            if (!/never just because\s*$/i.test(text.slice(0, match.index))) gaps.push(`${label}: keyed on a spec existing`);
        }
    }
    return gaps;
}

function findSpecGapEscalationGaps(config) {
    const gaps = [];
    const workflow = config.workflows[LEAN_ROUTE_ID];
    // Every resolved mode runs the gap review between investigate and plan
    const outOfOrder = manifestsOf(config, LEAN_ROUTE_ID).some(manifest => {
        const commands = manifest.occurrences.map(commandOf);
        const gapReview = commands.indexOf('spec [mode=clarify]');
        return !(commands.indexOf('investigate') < gapReview && gapReview >= 0 && gapReview < commands.indexOf('plan'));
    });
    if (outOfOrder) gaps.push('gap review does not run between investigate and plan');
    const context = workflow.preActions.injectContext;
    for (const phrase of ['vague, contradictory, or missing behavior stops before /plan', 'routes to user clarification or workflow-feature']) {
        if (!context.includes(phrase)) gaps.push(`injectContext: ${phrase}`);
    }
    return gaps;
}

const leanRouteTests = [
    {
        name: '[guided-workflow] TC-GWF-017 the lean route keeps its gap review, conditional reconciliation, static review, and final verification gates',
        fn: () => {
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When the lean route resolves, Then its order, roles, outcome gates and auto tier are exactly as specified
            assertDeepEqual(findLeanRouteShapeGaps(config), []);
            // And a demoted test check, a dropped spec gate, or a reordered step is detected
            const mutated = cloneConfig(config);
            const lean = mutated.workflows[LEAN_ROUTE_ID];
            // The shape is read from the resolved default mode, so the mutation reshapes that mode (and drops every mode's phases)
            const leanDefault = lean.variants ? lean.variants.default : lean;
            withoutPhases(lean);
            leanDefault.sequence.find(isIntegrationVerify).role = 'core';
            lean.outcomeGates = lean.outcomeGates.filter(gate => gate.id !== 'spec-synced');
            [leanDefault.sequence[2], leanDefault.sequence[3]] = [leanDefault.sequence[3], leanDefault.sequence[2]];
            const found = findLeanRouteShapeGaps(mutated);
            assertTrue(found.includes('role: integration-test --mode=verify is core, expected gate'), `a demoted gate must be detected: ${found.join('; ')}`);
            assertTrue(found.includes('outcome gate: spec-synced'), `a dropped outcome gate must be detected: ${found.join('; ')}`);
            assertTrue(found.some(gap => gap.startsWith('sequence: ')), `a reordered step must be detected: ${found.join('; ')}`);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-018 the lean route reconciles once after test authoring and before the static review',
        fn: () => {
            // Given the shipped lean route
            const config = loadWorkflowConfig();
            // When its spec sync occurrence is read, Then it is optional, conditioned, and placed after test authoring but before review
            assertDeepEqual(findLeanSpecSyncGaps(config), []);
            // And a spec sync moved after the review, or made unconditional, is detected
            const mutated = cloneConfig(config);
            const lean = withoutPhases(mutated.workflows[LEAN_ROUTE_ID]);
            const sequence = (lean.variants ? lean.variants.default : lean).sequence;
            const [sync] = sequence.splice(sequence.findIndex(step => step.id === 'implement-spec-sync'), 1);
            sequence.splice(sequence.findIndex(step => step.skill === 'test'), 0, sync);
            sync.role = 'core';
            delete sync.applicability;
            assertDeepEqual(findLeanSpecSyncGaps(mutated), [
                'default: spec sync: role core',
                'default: spec sync: when',
                'default: spec sync: skipReason',
                'default: spec sync: not before workflow-review-changes'
            ]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-022 the feature and lean routes split on whether the requested behavior is already written in a canonical spec',
        fn: () => {
            // Given the feature and lean route whenToUse texts
            const config = loadWorkflowConfig();
            // When both predicates are read, Then each covers only its side and neither is keyed on a spec merely existing
            assertDeepEqual(findRoutePredicateGaps(config), []);
            // And a lean predicate keyed on spec existence, or a feature predicate without "update the spec first", is detected
            const mutated = cloneConfig(config);
            mutated.workflows[LEAN_ROUTE_ID].whenToUse = 'User wants to implement a feature when a spec exists';
            mutated.workflows['workflow-feature'].whenToUse = mutated.workflows['workflow-feature'].whenToUse.replace('update the spec first', 'build it');
            assertDeepEqual(findRoutePredicateGaps(mutated), ['lean: predicate', 'feature: update the spec first', 'lean: keyed on a spec existing']);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-044 a spec that lacks the requested behavior routes to the feature route; the lean route stops at its gap review',
        fn: () => {
            // Given a request whose capability spec lacks the requested behavior
            const config = loadWorkflowConfig();
            // When the routing texts are read, Then the feature route covers it with "update the spec first"
            assertTrue(FEATURE_ROUTE_PREDICATES.every(predicate => config.workflows['workflow-feature'].whenToUse.includes(predicate)),
                'the feature route must cover a spec without the requested behavior');
            // And the lean route runs its gap review before planning and stops there, escalating to the feature route
            assertDeepEqual(findSpecGapEscalationGaps(config), []);
            // And a lean route without the gap review, or without the stop rule, is detected
            const mutated = cloneConfig(config);
            const lean = withoutPhases(mutated.workflows[LEAN_ROUTE_ID]);
            for (const mode of [lean, ...Object.values(lean.variants || {})]) mode.sequence = mode.sequence.filter(step => stepCommand(step) !== 'spec [mode=clarify]');
            lean.preActions.injectContext = lean.preActions.injectContext.replace('stops before /plan', 'continues to /plan');
            assertDeepEqual(findSpecGapEscalationGaps(mutated), [
                'gap review does not run between investigate and plan',
                'injectContext: vague, contradictory, or missing behavior stops before /plan'
            ]);
        }
    },
    {
        name: '[guided-workflow] TC-GWF-043 the lean route is registered and the routing catalog builds and lists it',
        skip: LEAN_CATALOG_SKIP,
        fn: () => {
            // Given this repository's registry with the lean route
            const { buildWorkflowSkillsCatalog } = require(path.join(SCRIPTS_DIR, 'lib', 'workflow-skills-catalog.cjs'));
            // When the full and the compact catalog are built, Then neither throws and both list the lean route
            for (const compact of [false, true]) {
                const catalog = buildWorkflowSkillsCatalog({ rootDir: PROJECT_ROOT, compact });
                assertContains(catalog, `| \`${LEAN_ROUTE_ID}\` |`, `the ${compact ? 'compact' : 'full'} catalog must list the lean route`);
            }
            // And the pinned workflow-id set includes it
            assertTrue(EXPECTED_WORKFLOW_IDS.includes(LEAN_ROUTE_ID), 'EXPECTED_WORKFLOW_IDS must pin the lean route');
            // And the same registry without the lean route's injectContext fails the build instead of routing silently
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ck-gwf-043-'));
            try {
                const mutated = loadWorkflowConfig();
                delete mutated.workflows[LEAN_ROUTE_ID].preActions.injectContext;
                fs.mkdirSync(path.join(tmp, '.claude'), { recursive: true });
                fs.writeFileSync(path.join(tmp, '.claude', 'workflows.json'), JSON.stringify(mutated));
                assertThrows(() => buildWorkflowSkillsCatalog({ rootDir: tmp, compact: true }), /workflow-implement-spec is missing required non-empty preActions\.injectContext/);
            } finally {
                fs.rmSync(tmp, { recursive: true, force: true });
            }
        }
    }
];


// ============================================================================
// Verify-last order (SYNC:verify-last-order): a code-changing workflow builds, reviews STATICALLY, then runs
// its tests once. The review defers tests to the later verify step; no test-running step may precede it
// (the refactor baseline run, taken before the change, is the one declared exception).
// ============================================================================

const VERIFY_LAST_WORKFLOWS = [
    'workflow-feature', 'workflow-bugfix', 'workflow-refactor', 'workflow-implement-spec',
    'workflow-big-feature', 'workflow-greenfield-init'
];
// A step that runs tests: the `test` skill or the `--mode=verify` invocation of `integration-test` / `e2e-test`.
const isVerifyLastRun = step => step.skill === 'test' || TEST_RUNNING_INVOCATIONS.some(invocation => isInvocation(commandOf(step), invocation));
const PRE_CHANGE_BASELINE_IDS = new Set(['refactor-baseline-test']);

function findVerifyLastGaps(config) {
    const gaps = [];
    for (const id of VERIFY_LAST_WORKFLOWS) {
        // Every mode: a variant such as implement-spec's greenfield-slice keeps the same order (P41 D7)
        const manifests = manifestsOf(config, id);
        for (const manifest of manifests) {
            const label = manifests.length > 1 ? `${id}/${manifest.mode}` : id;
            const steps = manifest.occurrences;
            // The review is the step that satisfies review-converged (workflow-review-changes in every code-changing workflow today)
            const reviewGate = manifest.outcomeGates.find(gate => gate.id === 'review-converged');
            const reviewIndex = reviewGate ? steps.findIndex(step => reviewGate.satisfiedBy.some(invocation => isInvocation(commandOf(step), invocation))) : -1;
            if (reviewIndex < 0) {
                gaps.push(`${label}: no step satisfies review-converged`);
                continue;
            }
            if (steps[reviewIndex].skill === 'workflow-review-changes' && !/(^|\s)--tests=defer(\s|$)/.test(steps[reviewIndex].args || '')) gaps.push(`${label}: review does not defer tests`);
            steps.forEach((step, index) => {
                if (index < reviewIndex && isVerifyLastRun(step) && !PRE_CHANGE_BASELINE_IDS.has(step.id)) {
                    gaps.push(`${label}: ${commandOf(step)} runs tests before the review`);
                }
            });
            if (!steps.some((step, index) => index > reviewIndex && isVerifyLastRun(step))) gaps.push(`${label}: no verify step after the review`);
        }
    }
    return gaps;
}

const verifyLastTests = [
    {
        name: '[guided-workflow] TC-GWF-069 code-changing workflows review statically first and run their tests once, after the review',
        fn: () => {
            // Given the shipped registry
            const config = loadWorkflowConfig();
            // When each code-changing workflow's order is read, Then the review defers tests and every verify step follows it
            assertDeepEqual(findVerifyLastGaps(config), [], 'review must precede every test run and defer its own');
            // And a verify step moved ahead of the review, or a review that runs its own tests, is detected
            const mutated = cloneConfig(config);
            delete mutated.workflows['workflow-feature'].phases;
            const sequence = mutated.workflows['workflow-feature'].sequence;
            const [verify] = sequence.splice(sequence.findIndex(step => stepCommand(step) === 'integration-test --mode=verify'), 1);
            sequence.splice(sequence.findIndex(step => step.skill === 'workflow-review-changes'), 0, verify);
            delete sequence.find(step => step.skill === 'workflow-review-changes').args;
            const found = findVerifyLastGaps(mutated);
            assertTrue(found.includes('workflow-feature: review does not defer tests'), `a review that runs tests must be detected: ${found.join('; ')}`);
            assertTrue(found.includes('workflow-feature: integration-test --mode=verify runs tests before the review'), `a verify before the review must be detected: ${found.join('; ')}`);
            // And a non-default mode is checked too: greenfield-slice's review that stops deferring its tests is detected
            const slice = cloneConfig(config);
            const lean = withoutPhases(slice.workflows['workflow-implement-spec']);
            lean.variants['greenfield-slice'].sequence.find(step => step.skill === 'workflow-review-changes').args = '';
            assertTrue(findVerifyLastGaps(slice).includes('workflow-implement-spec/greenfield-slice: review does not defer tests'), 'the greenfield-slice mode must be checked');
        }
    },
    {
        name: '[guided-workflow] TC-GWF-070 the review workflow defers its test run only on request; standalone keeps proving tests',
        fn: () => {
            // Given the review workflow skill
            const text = fs.readFileSync(path.join(PROJECT_ROOT, '.claude', 'skills', 'workflow-review-changes', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
            // Then --tests=defer is documented, defaults to prove, and drops --prove-tests
            assertContains(text, '`--tests={prove|defer}`');
            assertContains(text, '`--tests=prove` is default for standalone review');
            assertContains(text, 'without `--prove-tests`');
            // And the registry still keeps the review's own test prover for the standalone default
            const config = loadWorkflowConfig();
            const prover = config.workflows['workflow-review-changes'].sequence.find(step => step.id === 'integration-tests-review');
            assertEqual(prover.skill, 'integration-test');
            assertEqual(prover.args, '--mode=review --prove-tests --fix-loop --loop-owner=caller');
        }
    }
];

// Export test suite
module.exports = {
    name: 'Workflow Config Schema Guards',
    tests: [
        ...deadModuleVerificationTests,
        ...renameFixGuardTests,
        ...guidedWorkflowTests,
        ...annotatedRegistryTests,
        ...leanRouteTests,
        ...verifyLastTests
    ]
};
