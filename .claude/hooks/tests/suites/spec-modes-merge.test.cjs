/**
 * Spec Modes Merge Test Suite
 *
 * The spec skill owns the authoring/test/sync modes (`draft`, `init`, `update`, `audit`, `amend`,
 * `tests`, `sync`) plus three modes that were separate skills: `discovery` (pre-spec landscape and
 * scope gate), `clarify` (completeness vs the system and a BLOCKING user-confirmation gate) and
 * `index` (derived navigation aids). Each merged body lives in `spec/references/mode-<x>.md`;
 * `spec/SKILL.md` detects the mode first and carries a BLOCKING "read the mode file in full FIRST"
 * line, so the authoring modes never load a merged body. The three modes have no skill folder.
 *
 * Coverage:
 *   TC-SMM-001 — spec keeps the three merged modes, each with its mandatory read line and a reference file.
 *   TC-SMM-002 — the authoring body of spec/SKILL.md stays free of the three mode bodies.
 *   TC-SMM-003 — discovery keeps its BLOCKING scope gate, the `--investigation=` input and the optional graph hint.
 *   TC-SMM-004 — clarify keeps its BLOCKING user-confirmation gate, BLOCKED-on-unanswered rule and catalog.
 *   TC-SMM-005 — index keeps derived-only output, the scope/action/destination confirmation and the no-op write guard.
 *   TC-SMM-006 — the removed skill folders stay deleted and no workflow step references them.
 *   TC-SMM-007 — every workflow occurrence of `spec` with a mode passes a mode the skill supports.
 *   TC-SMM-008 — mode-only protocols live as inline bodies in the mode references, never in spec/SKILL.md.
 *   TC-SMM-009 — no live source names the removed skills (allow-list: the "formerly" lines and report filename prefixes).
 *   TC-SMM-010 — spec's description keeps the step-skill form and advertises the merged modes.
 *   TC-SMM-011 — an outcome gate satisfied by `spec [mode=sync]` is not provable by a discovery/clarify/index step
 *                (fixture workflows; portable) and the live gates that can see those steps name the sync mode.
 *
 * Portability: TC-SMM-011's fixture rows run on in-memory registries. Every other row asserts this
 * framework repository's own skills and registry and is skipped in any other project (framework-repo
 * signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own spec skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const specSkill = () => read(SKILLS, 'spec', 'SKILL.md');
const reference = mode => read(SKILLS, 'spec', 'references', `mode-${mode}.md`);

// The removed skill names, assembled so this file never contains the literal token it guards against.
const REMOVED = ['spec' + '-discovery', 'spec' + '-clarify', 'spec' + '-index'];
const MERGED_MODES = ['discovery', 'clarify', 'index'];
const SUPPORTED_MODES = ['draft', 'init', 'update', 'audit', 'amend', 'tests', 'sync', ...MERGED_MODES];

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

const fixtureDocument = (entry) => ({ version: '1', workflows: { fixture: entry } });
const resolveFixture = (entry) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['spec', 'test'] });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/spec-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const SCAN_EXTENSIONS = new Set(['.md', '.cjs', '.mjs', '.js', '.py', '.json', '.yaml', '.yml', '.html', '.toml']);

function* walk(rel) {
    const abs = path.join(REPO_ROOT, ...rel.split('/'));
    if (!fs.existsSync(abs)) return;
    const stat = fs.statSync(abs);
    if (stat.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(abs))) yield rel;
        return;
    }
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

/** A line that names a removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    // The "formerly /<old>" mapping so the old names resolve.
    if (rel === '.claude/skills/spec/SKILL.md' && /former/i.test(line)) return true;
    // Report filenames the modes keep so their output paths stay identical (`<name>-{slug}…`).
    if (rel.startsWith('.claude/skills/spec/references/mode-')) {
        const rest = line.replace(new RegExp(`(?:${REMOVED.join('|')})-\\{`, 'g'), '');
        return !REMOVED.some(name => rest.includes(name));
    }
    return false;
}

const tests = [
    {
        name: 'TC-SMM-001 spec keeps the discovery, clarify and index modes, each with a BLOCKING read-first line and its reference file',
        skip: SKIP,
        fn: () => {
            // Given the spec skill
            const text = specSkill();
            // Then mode routing comes before the first content section and lists all three merged modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const mode of MERGED_MODES) assert.ok(text.includes(`[mode=${mode}]`), `[mode=${mode}] is documented`);
            // And each merged mode has a mandatory full-read line naming an existing reference
            for (const mode of MERGED_MODES) {
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`\\[mode=${mode}\\]\`, read \`references/mode-${mode}\\.md\` in full FIRST`), `mandatory read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'spec', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            // And the removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z-]+`, `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
            // And the existing authoring references are untouched siblings
            for (const file of ['author.md', 'tests.md', 'sync.md', 'clarify-interview.md']) assert.ok(fs.existsSync(path.join(SKILLS, 'spec', 'references', file)), `${file} exists`);
        }
    },
    {
        name: 'TC-SMM-002 the spec authoring body does not carry the discovery, clarify or index mode bodies',
        skip: SKIP,
        fn: () => {
            // Given the spec skill text (what an authoring mode loads)
            const text = specSkill();
            // Then none of the mode-only contract markers appear in it
            const markers = {
                discovery: ['### Step 0.5: Declare the Discovery Wave', '## Phase 0: Classify Corpus & Short-Circuit', '### Step 5: Scope-Decision Gate (BLOCKING `ask user question tool`)'],
                clarify: ['## Phase 0: Profile and Spec-Context Detection (run FIRST)', '## Why This Skill Exists', '## Artifact and Case Profile Gate (BLOCKING)'],
                index: ['## Step 0 — Project Context and Scope Gate (MANDATORY)', '## Step 3 — Stamp & Write', '## Ownership Boundary (NON-NEGOTIABLE)']
            };
            for (const mode of MERGED_MODES) {
                for (const marker of markers[mode]) {
                    assert.ok(!text.includes(marker), `spec/SKILL.md must not inline mode text: ${marker}`);
                    assert.ok(reference(mode).includes(marker), `mode-${mode}.md holds ${marker}`);
                }
            }
            // And the authoring modes still run their own contract
            assert.match(text, /## Applicability and Decomposition Gate \(before any authoring or mutation\)/);
            assert.match(text, /Section 8 is the canonical TC registry/);
        }
    },
    {
        name: 'TC-SMM-003 discovery keeps the BLOCKING scope gate, the --investigation= input, the optional graph hint and inline execution',
        skip: SKIP,
        fn: () => {
            const text = reference('discovery');
            assert.match(text, /### Step 5: Scope-Decision Gate \(BLOCKING `ask user question tool`\)/);
            assert.match(text, /NEVER auto-pick — OVERLAPS detection is the whole reason this skill exists/);
            assert.match(text, /\*\*Optional input `--investigation=<report path>`\*\*/);
            assert.match(text, /delegate to `\/investigate` ONLY for keyword slices the report does not cover/);
            assert.match(text, /\*\*Optional graph hint\*\* — when grep and reading alone may not reveal a high-risk blast radius and `\.code-graph\/graph\.db` exists/);
            assert.match(text, /INLINE execution — the step 5 user gate is BLOCKING and only works inline/);
            assert.match(text, /Greenfield \/ empty-corpus short-circuit/);
            for (const relation of ['EXTENDS', 'OVERLAPS', 'DEPENDS-ON', 'AFFECTED', 'UNRELATED']) assert.ok(text.includes(`**${relation}`), `relationship ${relation}`);
            // The report paths stay identical so downstream consumers keep resolving them
            assert.ok(text.includes('research/spec' + '-discovery-{slug}.md'), 'plans-root report path');
            assert.ok(text.includes('tmp/reports/spec' + '-discovery-{YYMMDD}-{HHmm}-{slug}.md'), 'fallback report path');
            // The parent states the optional input and the inline gate at the point of dispatch
            assert.match(specSkill(), /keeps `--investigation=<report path>` as its optional input/);
        }
    },
    {
        name: 'TC-SMM-004 clarify keeps the BLOCKING user-confirmation gate, BLOCKED on unanswered intent and the interview catalog',
        skip: SKIP,
        fn: () => {
            const text = reference('clarify');
            assert.match(text, /\*\*Clarification gate \(BLOCKING user-confirmation tool\)\*\*/);
            assert.match(text, /NEVER silently pick a non-obvious decision/);
            assert.match(text, /preserve the unresolved questions and return `BLOCKED`\/`NEEDS-CLARIFICATION`; NEVER mutate the artifact, infer a choice, or emit `CLARIFIED`/);
            assert.match(text, /\*\*Runs INLINE, not as a sub-agent\*\*/);
            for (const label of ['OBVIOUS', 'NON-OBVIOUS', 'CONFLICTS']) assert.ok(text.includes(`**${label}**`), `classification ${label}`);
            assert.match(text, /\/why-review --validate-findings/);
            for (const verdict of ['CLARIFIED', 'NEEDS-AUTHORING-FIX', 'BLOCKED / NEEDS-CLARIFICATION']) assert.ok(text.includes(verdict), `verdict ${verdict}`);
            // The catalog it loads sits beside the mode body and its budget defaults survive
            assert.ok(text.includes('[`references/clarify-interview.md`](./clarify-interview.md)'), 'catalog link resolves beside the mode body');
            // Every markdown link to the catalog resolves relative to references/ (the catalog is a sibling): none may add a second references/ hop
            assert.ok(!text.includes('](./references/clarify-interview.md)'), 'a catalog link must not point at ./references/ from inside references/');
            const catalog = read(SKILLS, 'spec', 'references', 'clarify-interview.md');
            for (const budget of ['`5-10`', '`4-8`', '`3-6`']) assert.ok(catalog.includes(budget), `budget default ${budget}`);
            // The parent states the BLOCKED rule at the point of dispatch
            assert.match(specSkill(), /returns `BLOCKED`\/`NEEDS-CLARIFICATION` when the user cannot answer — never infer a decision/);
        }
    },
    {
        name: 'TC-SMM-005 index keeps derived-only output, the pre-read scope/action/destination confirmation and the no-op write guard',
        skip: SKIP,
        fn: () => {
            const text = reference('index');
            assert.match(text, /Output is \*\*DERIVED and regenerable\*\*/);
            assert.match(text, /regenerate via \/spec \[mode=index\]; do NOT hand-edit/);
            assert.match(text, /use `ask user question tool` to confirm scope and output\. Do not read canonical source bodies until the user confirms/);
            assert.match(text, /doc-stamp-guard\.cjs --check/);
            assert.match(text, /A regeneration that produces the same content writes NOTHING/);
            assert.match(text, /## Ownership Boundary \(NON-NEGOTIABLE\)/);
            // The index/audit choice moved from `mode` to `action` so it cannot collide with spec's own modes
            assert.match(text, /`action=index\|audit` or the `--audit` flag/);
            assert.match(text, /\| \*\*Action\*\* ★/);
            // The parent separates the derived-aid audit from the spec audit mode
            assert.match(specSkill(), /never the spec `audit` mode/);
        }
    },
    {
        name: 'TC-SMM-006 the removed skill folders stay deleted and no workflow step references them',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const commands = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill, args } of manifest.occurrences) {
                        assert.ok(!REMOVED.includes(skill), `${id}/${manifest.mode}: a step still runs ${skill}`);
                        commands.add(args ? `${skill} ${args}` : skill);
                    }
                }
            }
            for (const mode of MERGED_MODES) assert.ok(commands.has(`spec [mode=${mode}]`), `tripwire: the registry still runs spec [mode=${mode}]`);
        }
    },
    {
        name: 'TC-SMM-007 every workflow occurrence of spec with a mode passes a mode the spec skill supports',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = specSkill();
            let modeSteps = 0;
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences.filter(step => step.skill === 'spec')) {
                        const args = occurrence.args.trim();
                        if (!args) continue;
                        const mode = /^\[mode=([a-z]+)\]$/.exec(args);
                        assert.ok(mode, `${id}/${manifest.mode}/${occurrence.id}: unsupported spec arguments "${args}"`);
                        assert.ok(SUPPORTED_MODES.includes(mode[1]), `${id}/${occurrence.id}: spec has no mode ${mode[1]}`);
                        assert.ok(dispatch.includes(`\`${mode[1]}\``), `${id}/${occurrence.id}: spec/SKILL.md does not document mode ${mode[1]}`);
                        modeSteps += 1;
                    }
                }
            }
            assert.ok(modeSteps >= 20, `tripwire: the registry runs spec modes as steps (${modeSteps})`);
        }
    },
    {
        name: 'TC-SMM-008 mode-only protocols live as inline bodies in the mode references, never in spec/SKILL.md',
        skip: SKIP,
        fn: () => {
            const specText = specSkill();
            const specTags = guideTags(specText);
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const modeOnly = {
                discovery: ['graph-assisted-investigation', 'incremental-persistence', 'rationalization-prevention', 'subagent-return-contract', 'task-tracking-external-report'],
                clarify: ['review-protocol-injection', 'severity-rubric', 'task-tracking-external-report', 'understand-code-first'],
                index: []
            };
            for (const mode of MERGED_MODES) {
                const text = reference(mode);
                for (const tag of modeOnly[mode]) {
                    assert.ok(bodyOf(text, tag), `mode-${mode} carries the full ${tag} body`);
                    assert.ok(!specText.includes(`SYNC:${tag}`) && !specTags.includes(tag), `spec/SKILL.md must not carry ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `mode-${mode} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `mode-${mode} carries no retired pointer line`);
                // Every SYNC fence stays balanced (bodies and reminders)
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `mode-${mode} fences balanced`);
            }
            // And spec keeps the protocols it shares with the merged modes as its own guides
            for (const tag of ['cross-service-check', 'evidence-based-reasoning']) assert.ok(specTags.includes(tag), `spec/SKILL.md carries ${tag}`);
            for (const tag of specTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
        }
    },
    {
        name: 'TC-SMM-009 no live source names the removed skills',
        skip: SKIP,
        fn: () => {
            const offenders = [];
            let scanned = 0;
            for (const root of LIVE_SOURCE_ROOTS) {
                for (const rel of walk(root)) {
                    if (SCAN_EXCLUDED.has(rel)) continue;
                    scanned += 1;
                    const lines = fs.readFileSync(path.join(REPO_ROOT, ...rel.split('/')), 'utf8').split(/\r?\n/);
                    lines.forEach((line, index) => {
                        if (REMOVED.some(name => line.includes(name)) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `spec [mode=discovery]` / `spec [mode=clarify]` / `spec [mode=index]`');
            // The allow-list is live: spec/SKILL.md names the removed commands only as "formerly"
            const formerly = specSkill().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(formerly.length >= 1 && formerly.every(line => /former/i.test(line)), 'spec/SKILL.md names the removed commands only as "formerly"');
        }
    },
    {
        name: 'TC-SMM-010 spec description keeps the step-skill form and advertises the three merged modes',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(specSkill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Documentation\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            for (const mode of ['discovery', 'clarify', 'index']) assert.match(description, new RegExp(`\\b${mode}\\b`), `description advertises ${mode}`);
            for (const intent of [/canonical feature specs/, /test scenarios/, /discovery[^;]*overlaps/, /clarify[^;]*decisions/, /index[^.]*navigation\/ERD/]) {
                assert.match(description, intent, `description retains routing intent ${intent}`);
            }
        }
    },
    {
        name: 'TC-SMM-011 a gate satisfied by "spec [mode=sync]" needs that invocation, not any spec step',
        fn: () => {
            const gate = satisfier => [{ id: 'spec-synced', satisfiedBy: [satisfier] }];
            const clarify = { id: 'c', skill: 'spec', args: '[mode=clarify]' };
            const discovery = { id: 'd', skill: 'spec', args: '[mode=discovery]' };
            const index = { id: 'i', skill: 'spec', args: '[mode=index]' };
            const sync = { id: 's', skill: 'spec', args: '[mode=sync]' };
            // Given a sequence with a sync step, the gate resolves
            const ok = resolveFixture({ sequence: [discovery, clarify, sync], outcomeGates: gate('spec [mode=sync]') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['spec [mode=sync]']);
            // And a workflow whose spec steps are only discovery, clarify or index cannot prove the gate
            assert.throws(() => resolveFixture({ sequence: [discovery, clarify, index], outcomeGates: gate('spec [mode=sync]') }), /names a skill not in the sequence/);
            // And a bare `spec` satisfier would be met by any of them, which is why the live gates name the mode
            assert.doesNotThrow(() => resolveFixture({ sequence: [clarify], outcomeGates: gate('spec') }));
        }
    },
    {
        name: 'TC-SMM-011b live workflows that run discovery or clarify steps prove spec-synced with spec [mode=sync]',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const checked = [];
            for (const [id, entry] of Object.entries(document.workflows)) {
                const steps = entry.variants ? Object.values(entry.variants).flatMap(variant => variant.sequence) : entry.sequence;
                const runsMergedMode = steps.some(step => {
                    const text = typeof step === 'string' ? step : `${step.skill} ${step.args || ''}`;
                    return /^spec\s+\[mode=(discovery|clarify|index)\]/.test(text.trim());
                });
                const gate = (entry.outcomeGates || []).find(candidate => candidate.id === 'spec-synced');
                if (!runsMergedMode || !gate) continue;
                const names = gate.satisfiedBy.filter(satisfier => satisfier === 'spec' || satisfier.startsWith('spec '));
                // A workflow may satisfy the gate through another skill (docs-manager --mode=update); when it names spec, it names the sync mode
                assert.ok(names.every(satisfier => satisfier === 'spec [mode=sync]'), `${id}: spec-synced must be satisfied by "spec [mode=sync]", found ${names.join(', ')}`);
                checked.push(id);
            }
            assert.ok(checked.length >= 4, `tripwire: the gate check saw the workflows that run these modes (${checked.join(', ')})`);
        }
    }
];

module.exports = { name: 'spec-modes-merge', tests };
