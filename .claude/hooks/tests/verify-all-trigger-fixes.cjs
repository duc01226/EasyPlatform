#!/usr/bin/env node
/**
 * Workflow Catalog Verification — v2.0 AI-native detection.
 *
 * Replaces exhaustive regex trigger tests (v1.x) with catalog completeness
 * and heuristic verification. In v2.0, the AI reads the catalog and decides
 * which workflow to activate — no regex matching needed.
 *
 * Coverage:
 *   1. All workflows have required v2.0 fields (whenToUse, sequence, name) + uniqueness
 *   2. buildWorkflowCatalog includes all workflow IDs (alphabetical sort fix)
 *   3. shouldInjectCatalog heuristic behavior
 *   4. Override / skip mechanisms
 *   5. Catalog output quality (alphabetical sort, descriptions)
 *   6. All workflows activatable via /workflow:start simulation
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { shouldInjectCatalog, buildWorkflowCatalog } = require('../lib/wr-detect.cjs');
const { loadWorkflowConfig } = require('../lib/wr-config.cjs');
const { createState, loadState, clearState } = require('../lib/workflow-state.cjs');
const { buildWorkflowInstructions } = require('../lib/wr-output.cjs');

const rawConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../workflows.json'), 'utf8'));
const config = loadWorkflowConfig();

// Isolated session for state-based tests (Section 6)
process.env.CLAUDE_SESSION_ID = 'catalog-verify-' + Date.now();

let passed = 0;
let failed = 0;
const failures = [];

function assert(section, desc, condition, details) {
    if (condition) {
        passed++;
    } else {
        failed++;
        failures.push({ section, desc, details: details || 'assertion failed' });
    }
}

function assertEqual(section, desc, actual, expected) {
    if (actual === expected) {
        passed++;
    } else {
        failed++;
        failures.push({ section, desc, details: `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}` });
    }
}

console.log('══════════════════════════════════════════════════');
console.log('  Workflow Catalog Verification (v2.0)');
console.log('  AI-native detection — catalog completeness');
console.log('══════════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════
// 1. SCHEMA COMPLIANCE — all workflows have v2.0 fields
// ═══════════════════════════════════════════════════
console.log('  [1] Schema Compliance...');

const workflows = rawConfig.workflows || {};
const workflowIds = Object.keys(workflows);

assert('schema', 'workflows.json has workflows', workflowIds.length > 0);
assertEqual('schema', 'version is 2.0.0', rawConfig.version, '2.0.0');

for (const id of workflowIds) {
    const wf = workflows[id];
    assert('schema', `${id}: has name`, typeof wf.name === 'string' && wf.name.length > 0, `name missing or empty`);
    assert('schema', `${id}: has whenToUse`, typeof wf.whenToUse === 'string' && wf.whenToUse.length > 0, `whenToUse missing or empty`);
    assert('schema', `${id}: has sequence`, Array.isArray(wf.sequence) && wf.sequence.length > 0, `sequence missing or empty`);
    assert('schema', `${id}: has confirmFirst`, typeof wf.confirmFirst === 'boolean', `confirmFirst missing`);
    assert('schema', `${id}: no triggerPatterns`, wf.triggerPatterns === undefined, `triggerPatterns should be removed in v2.0`);
    assert('schema', `${id}: no excludePatterns`, wf.excludePatterns === undefined, `excludePatterns should be removed in v2.0`);
    assert('schema', `${id}: no priority`, wf.priority === undefined, `priority should be removed in v2.0`);
}

// Verify whenToUse descriptions are unique (no duplicates that would confuse AI)
const whenToUseTexts = workflowIds.map(id => ({ id, text: workflows[id].whenToUse }));
const seen = new Map();
for (const { id, text } of whenToUseTexts) {
    const normalized = text.toLowerCase().trim();
    if (seen.has(normalized)) {
        assert('schema', `${id}: unique whenToUse`, false, `duplicate of "${seen.get(normalized)}"`);
    } else {
        seen.set(normalized, id);
        assert('schema', `${id}: unique whenToUse`, true);
    }
}

console.log(`  [1] Schema Compliance: done (${workflowIds.length} workflows)\n`);

// ═══════════════════════════════════════════════════
// 2. CATALOG OUTPUT — all workflows present and sorted
// ═══════════════════════════════════════════════════
console.log('  [2] Catalog Output...');

const catalog = buildWorkflowCatalog(config);
assert('catalog', 'catalog not empty', catalog.length > 0);

// Verify all workflow IDs appear in catalog
for (const id of workflowIds) {
    assert('catalog', `${id}: appears in catalog`, catalog.includes(`**${id}**`), `workflow ID not found in catalog output`);
}

// Verify alphabetical sorting (catalog lines start with **id**, not "- **")
const catalogLines = catalog.split('\n').filter(l => l.startsWith('**'));
const catalogIds = catalogLines.map(l => {
    const match = l.match(/\*\*([^*]+)\*\*/);
    return match ? match[1] : '';
});
assert('catalog', 'catalogIds extracted (not empty)', catalogIds.length > 0, `expected workflow IDs from catalog but got ${catalogIds.length}`);
const sortedIds = [...catalogIds].sort();
assertEqual('catalog', 'workflows sorted alphabetically', JSON.stringify(catalogIds), JSON.stringify(sortedIds));

// Verify whenToUse descriptions appear
for (const id of workflowIds) {
    const wf = workflows[id];
    // Check that at least part of whenToUse appears in catalog
    const shortDesc = wf.whenToUse.substring(0, 30);
    assert('catalog', `${id}: whenToUse in catalog`, catalog.includes(shortDesc), `whenToUse text not found`);
}

console.log(`  [2] Catalog Output: done\n`);

// ═══════════════════════════════════════════════════
// 3. HEURISTIC — shouldInjectCatalog behavior
// ═══════════════════════════════════════════════════
console.log('  [3] Heuristic...');

// Qualifying prompts (>= 15 chars, not slash command, not quick:)
const qualifyingPrompts = [
    'implement a new auth feature',
    'fix the login bug please',
    'refactor the auth module',
    'how does authentication work',
    'update the documentation',
    'review the code changes',
    'design the settings page',
    'prepare for release v2',
    'security audit of the API',
    'optimize database queries'
];

for (const prompt of qualifyingPrompts) {
    assert('heuristic', `qualifies: "${prompt.substring(0, 30)}..."`,
        shouldInjectCatalog(prompt, config), `should inject catalog`);
}

// Short prompts (< 15 chars) — should NOT inject
const shortPrompts = ['hi', 'hello', 'ok', 'yes', 'thanks', 'no', 'hi there', 'test', 'help me'];
for (const prompt of shortPrompts) {
    assert('heuristic', `short skip: "${prompt}"`,
        !shouldInjectCatalog(prompt, config), `should not inject for short prompt`);
}

// Slash commands — should NOT inject
const slashPrompts = ['/plan the feature', '/cook:auto implement', '/fix the bug', '/test run all'];
for (const prompt of slashPrompts) {
    assert('heuristic', `slash skip: "${prompt}"`,
        !shouldInjectCatalog(prompt, config), `should not inject for slash command`);
}

// Quick: prefix — should NOT inject
const quickPrompts = ['quick: fix this', 'quick: implement something', 'Quick: add feature'];
for (const prompt of quickPrompts) {
    assert('heuristic', `quick: skip: "${prompt.substring(0, 25)}"`,
        !shouldInjectCatalog(prompt, config), `should not inject for quick: prefix`);
}

// Empty/whitespace — should NOT inject
assert('heuristic', 'empty string', !shouldInjectCatalog('', config));
assert('heuristic', 'whitespace only', !shouldInjectCatalog('   ', config));

console.log(`  [3] Heuristic: done\n`);

// ═══════════════════════════════════════════════════
// 4. COMMAND MAPPING — all sequence steps have mappings
// ═══════════════════════════════════════════════════
console.log('  [4] Command Mapping...');

const commandMapping = rawConfig.commandMapping || {};
const allSteps = new Set();
for (const wf of Object.values(workflows)) {
    for (const step of wf.sequence) {
        allSteps.add(step);
    }
}

for (const step of allSteps) {
    assert('mapping', `${step}: has command mapping`,
        commandMapping[step] !== undefined,
        `step "${step}" used in a workflow but has no commandMapping entry`);
    if (commandMapping[step]) {
        assert('mapping', `${step}: has claude command`,
            typeof commandMapping[step].claude === 'string',
            `commandMapping[${step}].claude missing`);
    }
}

console.log(`  [4] Command Mapping: done (${allSteps.size} unique steps)\n`);

// ═══════════════════════════════════════════════════
// 5. SETTINGS — v2.0 config structure
// ═══════════════════════════════════════════════════
console.log('  [5] Settings...');

const settings = rawConfig.settings || {};
assert('settings', 'enabled is boolean', typeof settings.enabled === 'boolean');
assert('settings', 'allowOverride is boolean', typeof settings.allowOverride === 'boolean');
if (settings.allowOverride) {
    assert('settings', 'overridePrefix is string', typeof settings.overridePrefix === 'string');
}
assert('settings', 'no supportedLanguages (removed in v2.0)', settings.supportedLanguages === undefined,
    'supportedLanguages should be removed in v2.0');

console.log(`  [5] Settings: done\n`);

// ═══════════════════════════════════════════════════
// 6. ALL WORKFLOWS ACTIVATABLE — /workflow:start simulation
// ═══════════════════════════════════════════════════
console.log('  [6] All Workflows Activatable via /workflow:start...');

for (const id of workflowIds) {
    const wf = workflows[id];

    // Step 1: Create state (simulates handleWorkflowStart)
    try { clearState(); } catch (_) { }
    const state = createState({
        workflowId: id,
        workflowName: wf.name,
        sequence: wf.sequence,
        originalPrompt: `test activation of ${id}`,
        commandMapping: rawConfig.commandMapping
    });
    assert('activate', `${id}: state created`, state !== null, 'createState returned null');
    assertEqual('activate', `${id}: state.workflowId`, state?.workflowId, id);
    assertEqual('activate', `${id}: state.currentStep`, state?.currentStep, 0);
    assertEqual('activate', `${id}: state.sequence length`, state?.sequence?.length, wf.sequence.length);

    // Step 2: Build instructions (simulates output after activation)
    const activation = { workflow: wf, workflowId: id };
    const instructions = buildWorkflowInstructions(activation, config);
    assert('activate', `${id}: instructions not empty`, instructions.length > 0, 'empty instructions');
    assert('activate', `${id}: instructions contain workflow name`,
        instructions.includes(wf.name), `missing "${wf.name}" in instructions`);
    assert('activate', `${id}: instructions contain MUST FOLLOW`,
        instructions.includes('MUST FOLLOW'), 'missing MUST FOLLOW in instructions');
    assert('activate', `${id}: instructions contain [Workflow] todos`,
        instructions.includes('[Workflow]'), 'missing [Workflow] todo template');

    // Step 3: Verify state persisted (loadState roundtrip)
    const loaded = loadState();
    assert('activate', `${id}: state persists after creation`, loaded !== null, 'loadState returned null');
    assertEqual('activate', `${id}: persisted workflowId`, loaded?.workflowId, id);
}

// Cleanup
try { clearState(); } catch (_) { }

console.log(`  [6] All Workflows Activatable: done (${workflowIds.length} workflows)\n`);

// ═══════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════
console.log('══════════════════════════════════════════════════');
if (failures.length > 0) {
    console.log(`\n  FAILURES (${failures.length}):\n`);
    for (const f of failures) {
        console.log(`  [${f.section}] ${f.desc}`);
        console.log(`    ${f.details}\n`);
    }
}
console.log(`  RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`);
console.log('══════════════════════════════════════════════════');

process.exit(failed > 0 ? 1 : 0);
