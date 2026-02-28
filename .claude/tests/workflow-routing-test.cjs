/**
 * Workflow Catalog & Schema Validation Test
 *
 * Validates the v2.0.0 workflow schema and catalog generation:
 * - Schema structure: all workflows have required fields (whenToUse, whenNotToUse, name, sequence)
 * - No deprecated fields: triggerPatterns, excludePatterns, priority removed
 * - Catalog generation: buildWorkflowCatalog produces compact, valid output
 * - Catalog injection: buildCatalogInjection includes detection instructions
 * - shouldInjectCatalog: correctly skips short prompts
 * - Command mapping completeness: all sequence steps resolve in commandMapping
 * - Workflow instruction builder: buildWorkflowInstructions produces valid output
 */
const path = require('path');
const fs = require('fs');

// Load workflows.json from project root (2 levels up from .claude/tests/)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, '.claude', 'workflows.json');

let workflowConfig;
try {
    workflowConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (e) {
    console.log('FAIL: Could not load .claude/workflows.json: ' + e.message);
    process.exit(1);
}

// Load catalog builder functions
const { buildWorkflowCatalog, buildCatalogInjection, buildWorkflowInstructions, shouldInjectCatalog, getStepDescription } = require(
    path.join(PROJECT_ROOT, '.claude', 'hooks', 'workflow-router.cjs')
);

const { getDefaultConfig } = require(path.join(PROJECT_ROOT, '.claude', 'hooks', 'lib', 'wr-config.cjs'));

const workflows = workflowConfig.workflows;
const commandMapping = workflowConfig.commandMapping;
const workflowIds = Object.keys(workflows);

let pass = 0;
let fail = 0;
const failures = [];

function assert(name, condition, detail) {
    if (condition) {
        pass++;
    } else {
        fail++;
        failures.push({ name, detail: detail || '' });
    }
}

// ============================================================
// SECTION 1: Schema Structure Validation
// Every workflow must have required v2.0.0 fields
// ============================================================

console.log('\n--- Section 1: Schema Structure ---');

assert('workflows.json has workflows object', workflows && typeof workflows === 'object' && workflowIds.length > 0, `Found ${workflowIds.length} workflows`);

assert('workflows.json has commandMapping object', commandMapping && typeof commandMapping === 'object', 'commandMapping exists');

assert('workflows.json has settings.enabled', workflowConfig.settings?.enabled === true, 'settings.enabled should be true');

for (const [id, wf] of Object.entries(workflows)) {
    assert(`${id}: has name`, typeof wf.name === 'string' && wf.name.length > 0, `name: ${wf.name || 'MISSING'}`);
    assert(
        `${id}: has whenToUse`,
        typeof wf.whenToUse === 'string' && wf.whenToUse.length > 0,
        `whenToUse: ${wf.whenToUse ? wf.whenToUse.substring(0, 50) + '...' : 'MISSING'}`
    );
    assert(
        `${id}: has whenNotToUse`,
        typeof wf.whenNotToUse === 'string' && wf.whenNotToUse.length > 0,
        `whenNotToUse: ${wf.whenNotToUse ? wf.whenNotToUse.substring(0, 50) + '...' : 'MISSING'}`
    );
    assert(`${id}: has sequence array`, Array.isArray(wf.sequence) && wf.sequence.length > 0, `sequence: [${wf.sequence?.join(', ') || 'MISSING'}]`);
    assert(`${id}: has confirmFirst boolean`, typeof wf.confirmFirst === 'boolean', `confirmFirst: ${wf.confirmFirst}`);
}

// ============================================================
// SECTION 2: No Deprecated Fields
// triggerPatterns, excludePatterns, priority must not exist
// ============================================================

console.log('\n--- Section 2: No Deprecated Fields ---');

const rawContent = fs.readFileSync(CONFIG_PATH, 'utf8');

assert('No triggerPatterns in workflows.json', !rawContent.includes('triggerPatterns'), 'triggerPatterns should be removed');
assert('No excludePatterns in workflows.json', !rawContent.includes('excludePatterns'), 'excludePatterns should be removed');
assert('No enableCheckpoints in workflows.json', !rawContent.includes('enableCheckpoints'), 'enableCheckpoints should be removed');
assert('No supportedLanguages in workflows.json', !rawContent.includes('supportedLanguages'), 'supportedLanguages should be removed');

for (const [id, wf] of Object.entries(workflows)) {
    assert(`${id}: no priority field`, wf.priority === undefined, `priority: ${wf.priority}`);
    assert(`${id}: no triggerPatterns field`, wf.triggerPatterns === undefined, 'triggerPatterns should not exist');
    assert(`${id}: no excludePatterns field`, wf.excludePatterns === undefined, 'excludePatterns should not exist');
}

// ============================================================
// SECTION 3: Command Mapping Completeness
// All sequence steps must resolve in commandMapping
// ============================================================

console.log('\n--- Section 3: Command Mapping ---');

const allSteps = new Set();
for (const [id, wf] of Object.entries(workflows)) {
    for (const step of wf.sequence) {
        allSteps.add(step);
        assert(`${id}: step "${step}" exists in commandMapping`, commandMapping[step] !== undefined, `Missing commandMapping for "${step}"`);
        if (commandMapping[step]) {
            assert(`${id}: step "${step}" has claude command`, typeof commandMapping[step].claude === 'string', `Missing claude command for "${step}"`);
        }
    }
}

// ============================================================
// SECTION 4: Catalog Build Function Tests
// buildWorkflowCatalog should produce valid compact catalog
// ============================================================

console.log('\n--- Section 4: Catalog Build ---');

const catalog = buildWorkflowCatalog(workflowConfig);

assert('Catalog is non-empty string', typeof catalog === 'string' && catalog.length > 0, `Catalog length: ${catalog.length}`);

// Every workflow with whenToUse should appear in catalog
for (const [id, wf] of Object.entries(workflows)) {
    if (wf.whenToUse) {
        assert(`Catalog contains "${id}" workflow`, catalog.includes(id) || catalog.includes(wf.name), `Workflow "${id}" (${wf.name}) not found in catalog`);
    }
}

// Catalog should include Use: / Not for: / Steps: format
assert('Catalog has "Use:" labels', catalog.includes('Use:'), 'Catalog should contain "Use:" labels');
assert('Catalog has "Not for:" labels', catalog.includes('Not for:'), 'Catalog should contain "Not for:" labels');
assert('Catalog has "Steps:" labels', catalog.includes('Steps:'), 'Catalog should contain "Steps:" labels');

// ============================================================
// SECTION 5: Catalog Injection Tests
// buildCatalogInjection includes detection instructions
// ============================================================

console.log('\n--- Section 5: Catalog Injection ---');

const injection = buildCatalogInjection(workflowConfig, false);

assert('Injection contains "Workflow Catalog"', injection.includes('Workflow Catalog'), 'Missing Workflow Catalog header');
assert(
    'Injection contains "Workflow Detection Instructions"',
    injection.includes('Workflow Detection Instructions'),
    'Missing Workflow Detection Instructions header'
);
assert('Injection references workflow-start', injection.includes('workflow-start'), 'Should reference /workflow-start for activation');
assert('Injection contains TaskCreate enforcement', injection.includes('TaskCreate') && injection.includes('MANDATORY'), 'Should include TaskCreate enforcement');
assert(
    'Injection contains MATCH/SELECT/ACTIVATE steps',
    injection.includes('MATCH') && injection.includes('SELECT') && injection.includes('ACTIVATE'),
    'Should include detection steps'
);

// Quick mode injection
const quickInjection = buildCatalogInjection(workflowConfig, true);
assert('Quick mode injection contains quick notice', quickInjection.includes('Quick mode'), 'Quick mode should show notice');

// ============================================================
// SECTION 6: shouldInjectCatalog Tests
// Short prompts (< 15 chars) should be skipped
// ============================================================

console.log('\n--- Section 6: shouldInjectCatalog ---');

assert('Skips "yes"', !shouldInjectCatalog('yes'), 'Should skip short prompt');
assert('Skips "ok"', !shouldInjectCatalog('ok'), 'Should skip short prompt');
assert('Skips "continue"', !shouldInjectCatalog('continue'), 'Should skip short prompt');
assert('Skips "go ahead"', !shouldInjectCatalog('go ahead'), 'Should skip short prompt');
assert('Skips empty', !shouldInjectCatalog(''), 'Should skip empty prompt');
assert('Skips "       "', !shouldInjectCatalog('       '), 'Should skip whitespace-only');
assert('Allows "fix this bug in the login form"', shouldInjectCatalog('fix this bug in the login form'), 'Should allow long prompt');
assert('Allows "implement new auth"', shouldInjectCatalog('implement new auth'), 'Should allow 15+ char prompt');
assert('Allows exactly 15 chars', shouldInjectCatalog('1234567890abcde'), 'Should allow exactly 15 chars');
assert('Skips 14 chars', !shouldInjectCatalog('1234567890abcd'), 'Should skip 14 chars');

// ============================================================
// SECTION 7: getStepDescription Tests
// Known steps should have descriptions
// ============================================================

console.log('\n--- Section 7: Step Descriptions ---');

const knownSteps = [
    'plan',
    'cook',
    'code',
    'test',
    'fix',
    'debug',
    'scout',
    'investigate',
    'code-review',
    'code-simplifier',
    'changelog',
    'docs-update',
    'watzup',
    'plan-review',
    'review-changes'
];

for (const step of knownSteps) {
    const desc = getStepDescription(step);
    assert(`Step "${step}" has description`, typeof desc === 'string' && desc.length > 0, `Description: ${desc}`);
    assert(`Step "${step}" desc is not fallback`, desc !== `Execute ${step}`, `Should have specific description, got: ${desc}`);
}

// Unknown step should use fallback
assert('Unknown step uses fallback', getStepDescription('unknown-step') === 'Execute unknown-step', `Got: ${getStepDescription('unknown-step')}`);

// ============================================================
// SECTION 8: Workflow Instructions Builder Tests
// buildWorkflowInstructions produces valid post-activation output
// ============================================================

console.log('\n--- Section 8: Workflow Instructions ---');

// Test with feature workflow
const featureWf = workflows.feature;
if (featureWf) {
    const instructions = buildWorkflowInstructions('feature', featureWf, workflowConfig);
    assert('Feature instructions contains "Workflow Activated"', instructions.includes('Workflow Activated'), 'Should have activation header');
    assert('Feature instructions contains sequence', instructions.includes('### Sequence'), 'Should have Sequence section');
    assert('Feature instructions contains TaskCreate template', instructions.includes('TaskCreate'), 'Should have TaskCreate template');
    assert('Feature instructions contains workflow name', instructions.includes(featureWf.name), `Should contain "${featureWf.name}"`);
    if (featureWf.confirmFirst) {
        assert(
            'Feature instructions contains confirmation notice',
            instructions.includes('Confirmation required'),
            'confirmFirst workflow should have confirmation notice'
        );
    }

    // Verify preActions section if present
    if (featureWf.preActions) {
        if (featureWf.preActions.activateSkill) {
            assert(
                'Feature instructions has Pre-Actions with activateSkill',
                instructions.includes('Pre-Actions') && instructions.includes(featureWf.preActions.activateSkill),
                'Should include activateSkill in Pre-Actions'
            );
        }
        if (featureWf.preActions.injectContext) {
            assert('Feature instructions has Workflow Context', instructions.includes('Workflow Context'), 'Should include Workflow Context section');
        }
    }
}

// Test with bugfix workflow
const bugfixWf = workflows.bugfix;
if (bugfixWf) {
    const instructions = buildWorkflowInstructions('bugfix', bugfixWf, workflowConfig);
    assert('Bugfix instructions contains "Workflow Activated"', instructions.includes('Workflow Activated'), 'Should have activation header');
    assert(
        'Bugfix instructions contains all sequence steps',
        bugfixWf.sequence.every(step => {
            const cmd = commandMapping[step]?.claude || `/${step}`;
            return instructions.includes(cmd);
        }),
        'All bugfix steps should be listed'
    );
}

// ============================================================
// SECTION 9: Default Config Validation
// getDefaultConfig should return valid v2.0.0 schema
// ============================================================

console.log('\n--- Section 9: Default Config ---');

const defaultConfig = getDefaultConfig();

assert('Default config has settings.enabled', defaultConfig.settings?.enabled === true, 'Default should be enabled');
assert('Default config has workflows', Object.keys(defaultConfig.workflows).length > 0, `Default has ${Object.keys(defaultConfig.workflows).length} workflows`);

for (const [id, wf] of Object.entries(defaultConfig.workflows)) {
    assert(`Default ${id}: has whenToUse`, typeof wf.whenToUse === 'string' && wf.whenToUse.length > 0, 'Default workflow should have whenToUse');
    assert(`Default ${id}: has whenNotToUse`, typeof wf.whenNotToUse === 'string' && wf.whenNotToUse.length > 0, 'Default workflow should have whenNotToUse');
    assert(`Default ${id}: no triggerPatterns`, wf.triggerPatterns === undefined, 'Default should not have triggerPatterns');
    assert(`Default ${id}: no excludePatterns`, wf.excludePatterns === undefined, 'Default should not have excludePatterns');
    assert(`Default ${id}: no priority`, wf.priority === undefined, 'Default should not have priority');
}

// ============================================================
// SECTION 10: Workflow Coverage Summary
// ============================================================

console.log('\n--- Section 10: Coverage Summary ---');

assert('All workflows tested', workflowIds.length > 0, `Tested ${workflowIds.length} workflows`);

// Check that high-value workflows exist
const expectedWorkflows = ['feature', 'bugfix', 'documentation', 'investigation'];
for (const expected of expectedWorkflows) {
    assert(`Expected workflow "${expected}" exists`, workflows[expected] !== undefined, `Workflow "${expected}" should exist`);
}

// ============================================================
// Results
// ============================================================

if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => {
        console.log(`  FAIL: ${f.name} - ${f.detail}`);
    });
}

console.log(`\nResults: ${pass} PASS, ${fail} FAIL out of ${pass + fail} tests`);
console.log(`Coverage: ${workflowIds.length} workflows validated`);

process.exit(fail > 0 ? 1 : 0);
