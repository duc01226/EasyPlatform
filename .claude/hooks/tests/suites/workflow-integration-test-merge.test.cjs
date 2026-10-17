/**
 * Integration-Test Workflow Merge Test Suite
 *
 * One workflow, `workflow-integration-test`, owns two variants chosen by `--mode`: `write` (default: author
 * or update spec-traced integration tests and prove them green) and `green` (drive a red suite to a
 * truthful, repeatable green). The registry holds one complete sequence per variant; the workflow skill
 * documents the variant table and carries a BLOCKING read-first line per variant reference. The two
 * separate workflow skills and registry entries no longer exist.
 *
 * Coverage:
 *   TC-WIT-001 — the merged workflow exists with exactly the write and green variants, write is the default,
 *                and the two old registry entries and skill folders are gone.
 *   TC-WIT-002 — each variant keeps its exact step sequence, roles and applicability (write 10 steps, green 6;
 *                no barrier or step metadata; default activation tier).
 *   TC-WIT-003 — each variant keeps its own outcome gates; entry-level gates are the ones both share and every
 *                unconditional gate of a mode is provable by a gate step of that mode.
 *   TC-WIT-004 — the workflow skill's step lines equal the resolved manifest of every variant, and each
 *                variant has a BLOCKING read line and an existing reference.
 *   TC-WIT-005 — both old intents stay routable: routing keywords in the registry and the skill description,
 *                and both intents surface in the catalog hint.
 *   TC-WIT-006 — variant-level outcome gates: resolver rules (scoped to the selected mode, unique ids, provable).
 *   TC-WIT-007 — no live source names the removed workflow ids (allow-list: the "formerly" line).
 *   TC-WIT-008 — the variant references carry the old bodies' load-bearing rules and never a protocol guide
 *                line; the skill carries the union of both old protocol guide sets.
 *   TC-WIT-009 — integration consumers route to the merged workflow: verify-mode recommendation and agent roster.
 *
 * Portability: TC-WIT-006 runs on in-memory fixture registries. Every other row asserts this framework
 * repository's own skills and registry and is skipped in any other project (framework-repo signal). Paths
 * use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');
const { condenseWhenToUse } = require('../../../scripts/lib/workflow-skills-catalog.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own workflow registry and skills (framework-repo signal)';

const WORKFLOW_ID = 'workflow-integration-test';
const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const registry = () => JSON.parse(read(REPO_ROOT, '.claude', 'workflows.json'));
const entry = () => registry().workflows[WORKFLOW_ID];
const wrapper = () => read(SKILLS, WORKFLOW_ID, 'SKILL.md');
const reference = (mode) => read(SKILLS, WORKFLOW_ID, 'references', `variant-${mode}.md`);
const manifests = () => Object.fromEntries(resolveAllWorkflowManifests(registry(), WORKFLOW_ID, { rootDir: REPO_ROOT }).map(manifest => [manifest.mode, manifest]));
const commandOf = (occurrence) => (occurrence.args ? `${occurrence.skill} ${occurrence.args}` : occurrence.skill);

// The removed workflow ids, assembled so this file never contains the literal tokens it guards against.
const REMOVED = ['workflow-write' + '-integration-test', 'workflow-integration-test' + '-green'];
// The documentation step is owned by whichever docs skill the registry names; its slot is pinned, not the name.
const DOCS_SKILLS = new Set(['docs-manager']);

const WRITE_STEPS = ['investigate', 'spec [mode=tests]', 'work-item --mode=review --type=spec-tests', 'integration-test', 'integration-test --mode=review', 'integration-test --mode=verify', 'spec [mode=sync]', '<docs>', 'workflow-end', 'watzup'];
const GREEN_STEPS = ['investigate', 'integration-test --mode=verify --fix-loop', 'spec [mode=sync]', '<docs>', 'workflow-end', 'watzup'];

/** A manifest's commands with the documentation step collapsed to the `<docs>` placeholder. */
const shape = (manifest) => manifest.occurrences.map(occurrence => (DOCS_SKILLS.has(occurrence.skill) ? '<docs>' : commandOf(occurrence)));

/** Tags of the guide lines inside the PROTOCOL-GUIDES block(s) of `text`, in order. */
function guideTags(text) {
    const tags = [];
    for (const block of text.matchAll(/<!-- PROTOCOL-GUIDES:START -->([\s\S]*?)<!-- PROTOCOL-GUIDES:END -->/g)) {
        for (const line of block[1].split('\n')) {
            const match = /^- `([a-z0-9-]+)` — /.exec(line);
            if (match) tags.push(match[1]);
        }
    }
    return tags;
}

const normalizeChain = (chain) => chain.split(/\s*->\s*/).map(token => token.trim().replace(/^[/$]+/, '').replace(/[).,;:]+$/g, '').trim()).filter(Boolean);

const fixture = (entryFields) => ({
    version: '1.0.0',
    workflows: {
        fixture: {
            name: 'Fixture', description: 'Fixture', whenToUse: 'Fixture', preActions: { injectContext: 'Fixture context' },
            sequence: ['investigate'], ...entryFields
        }
    }
});
const FIXTURE_SKILLS = new Set(['investigate', 'spec', 'test', 'workflow-end']);
const resolveFixture = (entryFields, mode) => resolveWorkflowManifest(fixture(entryFields), 'fixture', { availableSkills: FIXTURE_SKILLS, ...(mode ? { mode } : {}) });
const variantFixture = (extra = {}) => ({
    defaultMode: 'full',
    outcomeGates: [{ id: 'run-closed', satisfiedBy: ['workflow-end'] }],
    variants: {
        full: {
            outcomeGates: [{ id: 'tests-pass', satisfiedBy: ['test'] }],
            sequence: [{ id: 'verify', skill: 'test', role: 'gate' }, { id: 'close', skill: 'workflow-end', role: 'gate' }]
        },
        lite: {
            outcomeGates: [{ id: 'spec-synced', satisfiedBy: ['spec'], when: 'The lite mode changed behavior' }],
            sequence: [{ id: 'sync', skill: 'spec', args: '[mode=sync]' }, { id: 'close', skill: 'workflow-end', role: 'gate' }]
        }
    },
    ...extra
});

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/workflow-integration-test-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans', '__pycache__']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const dirent of fs.readdirSync(abs, { withFileTypes: true })) {
        if (dirent.isDirectory() && SCAN_EXCLUDED_DIRS.has(dirent.name)) continue;
        yield* walk(`${rel}/${dirent.name}`);
    }
}

/** A line that names a removed workflow but is an allowed mention: the skill's own "formerly" mapping. */
const allowedMention = (rel, line) => rel === `.claude/skills/${WORKFLOW_ID}/SKILL.md` && /former/i.test(line);

const tests = [
    {
        name: 'TC-WIT-001 one workflow with exactly the write and green variants; write is the default; the old entries and skill folders are gone',
        skip: SKIP,
        fn: () => {
            const document = registry();
            const merged = document.workflows[WORKFLOW_ID];
            assert.ok(merged, 'the merged workflow is registered');
            assert.deepEqual(Object.keys(merged.variants).sort(), ['green', 'write']);
            assert.equal(merged.defaultMode, 'write', 'write is the usual intent when the user says "integration tests"');
            for (const removed of REMOVED) {
                assert.ok(!Object.hasOwn(document.workflows, removed), `${removed} must not be a registry key`);
                assert.ok(!fs.existsSync(path.join(SKILLS, removed)), `${removed} skill folder must stay deleted`);
            }
            assert.ok(fs.existsSync(path.join(SKILLS, WORKFLOW_ID, 'SKILL.md')));
            assert.equal(merged.activation, undefined, 'both old entries used the default activation tier');
            assert.equal(merged.preActions.readFiles[0], `.claude/skills/${WORKFLOW_ID}/SKILL.md`);
        }
    },
    {
        name: 'TC-WIT-002 each variant keeps its step sequence, roles and applicability; neither declares barriers or step metadata',
        skip: SKIP,
        fn: () => {
            const { write, green } = manifests();
            assert.deepEqual(shape(write), WRITE_STEPS);
            assert.deepEqual(shape(green), GREEN_STEPS);
            assert.equal(write.occurrences.length, 10);
            assert.equal(green.occurrences.length, 6);
            const roleOf = (manifest, command) => manifest.occurrences.find(occurrence => shape({ occurrences: [occurrence] })[0] === command).role;
            // write: gates are the review, verify, sync and close steps; the two case steps and the docs step are optional
            for (const command of ['integration-test --mode=review', 'integration-test --mode=verify', 'spec [mode=sync]', 'workflow-end']) assert.equal(roleOf(write, command), 'gate', `write ${command}`);
            for (const command of ['spec [mode=tests]', 'work-item --mode=review --type=spec-tests', '<docs>']) assert.equal(roleOf(write, command), 'optional', `write ${command}`);
            // green: the loop and the close are gates; the spec sync and docs steps are optional
            for (const command of ['integration-test --mode=verify --fix-loop', 'workflow-end']) assert.equal(roleOf(green, command), 'gate', `green ${command}`);
            for (const command of ['spec [mode=sync]', '<docs>']) assert.equal(roleOf(green, command), 'optional', `green ${command}`);
            // the loop owns investigation and fixes: no workflow-level debug or fix step, exactly one fix-loop step
            assert.ok(green.occurrences.every(occurrence => occurrence.skill !== 'fix' && !(occurrence.skill === 'investigate' && /--mode=debug/.test(occurrence.args))));
            // every optional step states when it runs and why it may be skipped
            for (const manifest of [write, green]) {
                for (const occurrence of manifest.occurrences.filter(item => item.role === 'optional')) {
                    assert.notEqual(occurrence.applicability.when, 'always');
                    assert.ok(occurrence.applicability.skipReason.length > 20, `${occurrence.id} carries a skipReason`);
                }
                assert.deepEqual(manifest.parallelGroups, []);
                assert.deepEqual(manifest.stepMeta, {});
            }
            // occurrence ids are mode-scoped and unique per mode
            for (const manifest of [write, green]) assert.equal(new Set(manifest.occurrences.map(item => item.id)).size, manifest.occurrences.length);
            assert.ok(write.occurrences.every(item => item.id.startsWith('write-')));
            assert.ok(green.occurrences.every(item => item.id.startsWith('green-')));
        }
    },
    {
        name: 'TC-WIT-003 each variant keeps its own outcome gates; every unconditional gate of a mode has a gate step in that mode',
        skip: SKIP,
        fn: () => {
            const { write, green } = manifests();
            const gateMap = manifest => Object.fromEntries(manifest.outcomeGates.map(gate => [gate.id, gate]));
            const w = gateMap(write);
            const g = gateMap(green);
            assert.deepEqual(Object.keys(w).sort(), ['review-converged', 'run-closed', 'spec-synced', 'tests-pass']);
            assert.deepEqual(Object.keys(g).sort(), ['root-cause-traced', 'run-closed', 'spec-synced', 'tests-pass']);
            // write: the review gate exists only here, and spec-synced always applies
            assert.deepEqual(w['review-converged'].satisfiedBy, ['integration-test --mode=review']);
            assert.equal(w['spec-synced'].when, null);
            assert.equal(g['review-converged'], undefined, 'the green variant never declared a review gate');
            // green: the root-cause gate is conditional on a failing verify run, and spec-synced on a fix that changed tested behavior
            assert.match(g['root-cause-traced'].when, /failing test/);
            assert.deepEqual(g['root-cause-traced'].satisfiedBy, ['integration-test --mode=verify']);
            assert.match(g['spec-synced'].when, /fix changed tested behavior/);
            assert.equal(w['root-cause-traced'], undefined, 'the write variant never declared a root-cause gate');
            // shared gates are identical in both modes
            for (const id of ['tests-pass', 'run-closed']) assert.deepEqual(w[id], g[id]);
            assert.deepEqual(w['tests-pass'].satisfiedBy, ['integration-test --mode=verify']);
            // the gates that both modes share live at entry level; the differing ones live in the variant
            const merged = entry();
            assert.deepEqual(merged.outcomeGates.map(gate => gate.id).sort(), ['run-closed', 'tests-pass']);
            assert.deepEqual(merged.variants.write.outcomeGates.map(gate => gate.id).sort(), ['review-converged', 'spec-synced']);
            assert.deepEqual(merged.variants.green.outcomeGates.map(gate => gate.id).sort(), ['root-cause-traced', 'spec-synced']);
            // a generate step never satisfies tests-pass: the satisfier names the verify mode
            for (const manifest of [write, green]) {
                for (const gate of manifest.outcomeGates.filter(item => !item.when)) {
                    const provers = manifest.occurrences.filter(occurrence => occurrence.role === 'gate' && gate.satisfiedBy.some(satisfier => {
                        const [skill, ...tokens] = satisfier.split(/\s+/);
                        const have = new Set((occurrence.args || '').split(/\s+/).filter(Boolean));
                        return occurrence.skill === skill && tokens.every(token => have.has(token));
                    }));
                    assert.ok(provers.length > 0, `${manifest.mode}: ${gate.id} needs a gate step`);
                }
            }
        }
    },
    {
        name: 'TC-WIT-004 the skill step lines equal every resolved variant; each variant has a BLOCKING read line and an existing reference',
        skip: SKIP,
        fn: () => {
            const text = wrapper();
            const resolved = manifests();
            // The default chain (the line the workflow verifier parses) is the default variant's sequence.
            const stepsLine = /IMPORTANT MANDATORY Steps:\*\*\s*(.+)$/m.exec(text);
            assert.ok(stepsLine, 'the skill carries the mandatory Steps line');
            const defaultChain = /\bdefault\s*:\s*([^)]*)\)\s*$/i.exec(stepsLine[1]);
            assert.ok(defaultChain, 'the Steps line ends with (default: <chain>)');
            assert.deepEqual(normalizeChain(defaultChain[1]), resolved[entry().defaultMode].sequence);
            // Every variant has its own chain line, equal to the resolved manifest of that variant.
            for (const mode of Object.keys(resolved)) {
                const line = new RegExp(`^- \`${mode}\`: (.+)$`, 'm').exec(text);
                assert.ok(line, `the skill lists the ${mode} variant chain`);
                assert.deepEqual(normalizeChain(line[1]), resolved[mode].sequence, `${mode} chain equals the resolved manifest`);
                // BLOCKING read line, then the file exists
                const readLine = new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${mode}\`[^\\n]*read \`\\.claude/skills/${WORKFLOW_ID}/references/variant-${mode}\\.md\` in full FIRST`).exec(text);
                assert.ok(readLine, `the skill carries the BLOCKING read-first line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, WORKFLOW_ID, 'references', `variant-${mode}.md`)));
            }
            // Variant selection sits above the variant sections and the flag is advertised in the frontmatter.
            assert.ok(text.indexOf('## Mode Selection') > 0 && text.indexOf('## Mode Selection') < text.indexOf('## Variant `write`'));
            assert.match(text, /^description: .*--mode=\{write\|green\}\./m);
            // The registry's pre-read pointer and the context both name this skill and both variant references.
            const context = entry().preActions.injectContext;
            for (const mode of Object.keys(resolved)) assert.ok(context.includes(`references/variant-${mode}.md`), `injectContext points to variant-${mode}.md`);
        }
    },
    {
        name: 'TC-WIT-005 both old intents stay routable: routing keywords in whenToUse and the skill description, and in the catalog hint',
        skip: SKIP,
        fn: () => {
            const merged = entry();
            const when = merged.whenToUse.toLowerCase();
            for (const phrase of [
                'write integration tests spec-first', 'convert test specs into test code', 'add test coverage to an untested feature',
                'make integration tests pass', 'fix failing integration tests', 'drive the integration test suite to green',
                'loop until all integration tests are green', 'diagnose and fix an intermittent or flaky integration test',
                'integration tests are red after a change', 'generate integration tests from existing test specs'
            ]) assert.ok(when.includes(phrase), `whenToUse keeps the routing phrase "${phrase}"`);
            // the catalog shows the first three clauses: one write intent and two green intents must all surface
            const hint = condenseWhenToUse(merged.whenToUse);
            assert.match(hint, /write integration tests/);
            assert.match(hint, /make integration tests pass/);
            assert.match(hint, /fix failing integration tests/);
            // the registry description names both variants and the flag
            assert.match(merged.description, /`write` \(default\)/);
            assert.match(merged.description, /`green`/);
            // the skill description keeps the routing keywords of both old descriptions
            const match = /^description: (["'])(.*)\1$/m.exec(wrapper());
            assert.ok(match, 'description uses a supported single-line YAML quote style');
            const description = match[2].toLowerCase();
            for (const intent of [/\[workflow\]/, /write/, /spec.traced integration tests/, /diagnose/, /fix failing suites/, /repeatable green/, /--mode=\{write\|green\}/]) {
                assert.match(description, intent, `description retains routing intent ${intent}`);
            }
            // the intent line covers both variants and stays one line
            assert.match(merged.intent, /\(write\)/);
            assert.match(merged.intent, /\(green\)/);
            assert.ok(!/[\r\n]/.test(merged.intent));
        }
    },
    {
        name: 'TC-WIT-006 variant outcome gates are added to the entry gates of the selected mode only, stay unique and must be provable',
        fn: () => {
            // Given a workflow with an entry-level gate and one gate per variant
            const full = resolveFixture(variantFixture());
            const lite = resolveFixture(variantFixture(), 'lite');
            // Then each mode resolves the entry-level gates followed by its own, and never the other mode's
            assert.deepEqual(full.outcomeGates.map(gate => gate.id), ['run-closed', 'tests-pass']);
            assert.deepEqual(lite.outcomeGates.map(gate => gate.id), ['run-closed', 'spec-synced']);
            assert.equal(lite.outcomeGates[1].when, 'The lite mode changed behavior');
            assert.notEqual(full.fingerprint, lite.fingerprint);
            // And a variant cannot redefine a gate the entry already declares
            const clash = variantFixture();
            clash.variants.full.outcomeGates = [{ id: 'run-closed', satisfiedBy: ['workflow-end'] }];
            assert.throws(() => resolveFixture(clash), /Duplicate outcome gate in fixture: run-closed/);
            // And a variant gate no step of its own mode can satisfy is rejected for that mode
            const unprovable = variantFixture();
            unprovable.variants.lite.outcomeGates = [{ id: 'tests-pass', satisfiedBy: ['test'] }];
            assert.doesNotThrow(() => resolveFixture(unprovable));
            assert.throws(() => resolveFixture(unprovable, 'lite'), /Outcome gate tests-pass has no satisfying step in fixture\/lite/);
            // And a variant gate naming a skill no mode runs is rejected
            const absent = variantFixture();
            absent.variants.full.outcomeGates = [{ id: 'tests-pass', satisfiedBy: ['plan'] }];
            assert.throws(() => resolveFixture(absent), /names a skill not in the sequence of fixture: plan/);
            // And an empty variant gate list, and gates on a workflow without variants, are rejected as malformed
            const empty = variantFixture();
            empty.variants.full.outcomeGates = [];
            assert.throws(() => resolveFixture(empty), /Invalid outcomeGates for fixture variant full: expected a non-empty array/);
            // And a workflow whose only gates are variant-level still resolves them
            const variantOnly = variantFixture();
            delete variantOnly.outcomeGates;
            assert.deepEqual(resolveFixture(variantOnly).outcomeGates.map(gate => gate.id), ['tests-pass']);
            // And the shipped schema declares the field on the variant, with the same item shape as the entry gates
            const schema = JSON.parse(read(REPO_ROOT, '.claude', 'workflows.schema.json')).definitions;
            assert.equal(schema.Variant.properties.outcomeGates.items.$ref, '#/definitions/OutcomeGate');
            assert.equal(schema.Variant.additionalProperties, false);
        }
    },
    {
        name: 'TC-WIT-007 no live source names the removed workflow ids (allow-list: the skill\'s "formerly" line)',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    read(REPO_ROOT, ...rel.split('/')).split('\n').forEach((line, index) => {
                        if (REMOVED.some(name => line.includes(name)) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.deepEqual(offenders, [], 'removed workflow ids still mentioned in live source');
            // the allow-listed line maps both old names to their modes so they still resolve
            const formerly = wrapper().split('\n').find(line => /former/i.test(line));
            assert.ok(formerly && REMOVED.every(name => formerly.includes(name)), 'the skill maps both old workflow names to their modes');
            assert.match(formerly, /--mode=write/);
            assert.match(formerly, /--mode=green/);
            // and the recorded step ids of the old entries are gone from the registry
            const registryText = read(REPO_ROOT, '.claude', 'workflows.json');
            for (const id of ['write-integration-test-spec-tests', 'integration-test-green-verify', 'integration-test-green-end']) assert.ok(!registryText.includes(id), `${id} must not remain`);
        }
    },
    {
        name: 'TC-WIT-008 the variant references keep the old bodies\' gates and carry no guide lines; the skill carries both old protocol guide sets',
        skip: SKIP,
        fn: () => {
            const write = reference('write');
            const green = reference('green');
            // write: triage, the gate list (one-pass review, tests green, cases synced) and the loop bounds
            assert.match(write, /## Triage — FIRST Action/);
            assert.match(write, /\*\*Review gate cleared once\*\* \(`review-converged`, gate `\/integration-test --mode=review`\)/);
            assert.match(write, /\*\*Tests green\*\* \(`tests-pass`, gate `\/integration-test --mode=verify`\)/);
            assert.match(write, /\*\*Cases synced\*\* \(`spec-synced`, gate `\/spec \[mode=sync\]`\)/);
            assert.match(write, /## Fix Path & Loop Bounds/);
            assert.match(write, /exactly one read-only review round/);
            // green: the loop, the no-fake-green integrity check, inline execution and the loop bounds
            assert.match(green, /## Triage — FIRST Action/);
            assert.match(green, /\*\*No fake green\*\* \(Round Integrity Check\)/);
            assert.match(green, /\*\*Inline, never a sub-agent:\*\*/);
            assert.match(green, /## Loop Bounds/);
            assert.match(green, /round cap 3 by default/);
            assert.match(green, /never start a second fix loop at workflow level/);
            // both name the report file with the mode placeholder, never a removed workflow id
            for (const [mode, text] of [['write', write], ['green', green]]) {
                assert.match(text, /tmp\/reports\/workflow-integration-test-\{mode\}-\{YYMMDD\}-\{HHmm\}-\{slug\}\.md/, `${mode} report path`);
                assert.ok(!text.includes('<!-- PROTOCOL-GUIDES'), `${mode} reference carries no guide block`);
                assert.deepEqual(guideTags(text), [], `${mode} reference carries no guide line`);
                assert.match(text, /## Closing Reminders/);
            }
            // the skill carries the union of the two old guide sets, each backed by its projection file
            const tags = guideTags(wrapper());
            for (const tag of [
                'environment-fault-hypothesis', 'incremental-persistence', 'integration-test-execution-discipline', 'real-world-fidelity-testing', 'session-goal-ledger', 'severity-rubric', 'subagent-return-contract',
                'task-tracking-external-report', 'test-architecture-execution-contract', 'test-failure-fault-adjudication', 'workflow-registry-binding'
            ]) {
                assert.ok(tags.includes(tag), `the skill keeps the ${tag} guide`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `${tag} projection exists`);
            }
            assert.deepEqual([...tags].sort(), tags, 'guide lines stay sorted');
            // and its reminders stay near the bottom, before the closing reminders
            const text = wrapper();
            for (const tag of ['goal-contract-satisfaction-loop', 'severity-rubric', 'environment-fault-hypothesis']) {
                assert.ok(text.indexOf(`<!-- SYNC:${tag}:reminder -->`) > text.indexOf('<!-- PROTOCOL-GUIDES:END -->'), `${tag} reminder follows the guide block`);
                assert.ok(text.indexOf(`<!-- SYNC:${tag}:reminder -->`) < text.indexOf('## Closing Reminders'), `${tag} reminder precedes the closing reminders`);
            }
        }
    },
    {
        name: 'TC-WIT-009 integration consumers route to the merged workflow: verify-mode recommendation and agent roster',
        skip: SKIP,
        fn: () => {
            const verify = read(SKILLS, 'integration-test', 'references', 'mode-verify.md');
            assert.match(verify, /RECOMMEND `\/workflow-integration-test --mode=green` whenever this run ends with ANY failure/);
            assert.match(verify, /verify step of `workflow-integration-test` \(both variants\)/);
            const agent = read(REPO_ROOT, '.claude', 'agents', 'integration-tester.md');
            assert.match(agent, /^- `workflow-integration-test`$/m);
            const matrix = read(REPO_ROOT, '.claude', 'scripts', 'agent_protocol_matrix.py');
            assert.match(matrix, /"integration-tester": \[\s*"integration-test",\s*"workflow-integration-test",\s*\]/);
            // sibling workflow skills point at the merged workflow's modes
            assert.match(read(SKILLS, 'workflow-spec-sync', 'SKILL.md'), /`\/workflow-integration-test --mode=write`/);
            assert.match(read(SKILLS, 'workflow-spec-sync', 'SKILL.md'), /`\/workflow-integration-test --mode=green`/);
            assert.match(read(SKILLS, 'workflow-e2e', 'SKILL.md'), /`workflow-integration-test` \(`--mode=green` \/ `--mode=write`\)/);
            // the workflow verifier's goal-contract roster names the merged skill
            const verifier = read(REPO_ROOT, '.claude', 'scripts', 'codex', 'verify-workflow-cycle-compliance.mjs');
            assert.match(verifier, /"workflow-integration-test",\s*"workflow-code-to-spec"/);
        }
    }
];

module.exports = { name: 'workflow-integration-test-merge', tests };
