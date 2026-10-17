/**
 * Docs-Manager Modes Merge Test Suite
 *
 * The docs-manager skill owns two modes that were separate skills: `--mode=update` (sync the docs a
 * code, spec or test change impacts: triage, impact-scoped project-context sync, the `/spec` chain,
 * demo guide, report) and `--mode=init` (first-time initialization or reconciliation of the whole
 * project reference-doc set from project config). Each body lives in
 * `docs-manager/references/mode-<x>.md`; `docs-manager/SKILL.md` detects the mode first and carries a
 * BLOCKING "read the mode file in full FIRST" line per mode, so neither mode loads the other's body.
 * The `docs-manager` agent is a separate artifact that drives `--mode=update`.
 *
 * Coverage:
 *   TC-DMM-001 — SKILL.md detects the mode first, carries one BLOCKING read line per mode with an existing
 *                reference, maps the removed slash commands, and shows the table (asks nothing) with no mode.
 *   TC-DMM-002 — SKILL.md stays free of both mode bodies; the bodies live in their references.
 *   TC-DMM-003 — update keeps scope, canonical owners, intent gates, impact-scoped freshness,
 *                stamp discipline, caller flags and the evidence report path.
 *   TC-DMM-004 — init keeps config validation, the always-on vs task-specific split, the BLOCKING per-target
 *                applicability read, the no-routine-question rule.
 *   TC-DMM-005 — the removed skill folders stay deleted and no workflow step references them; every workflow
 *                occurrence of docs-manager passes a mode the skill supports.
 *   TC-DMM-006 — a gate satisfied by `docs-manager --mode=update` needs that invocation (fixture workflows;
 *                portable) and every live gate naming docs-manager names that mode.
 *   TC-DMM-007 — mode-only protocols live as inline bodies in the mode references, never in SKILL.md.
 *   TC-DMM-008 — no live source names the removed skills (allow-list: the "formerly" line and the report
 *                filename prefix `tmp/reports/docs-update-…`).
 *   TC-DMM-009 — the description keeps the step-skill form and advertises both modes and both old intents.
 *   TC-DMM-010 — the agent and the skill coexist under one name; the agent drives `--mode=update` and its
 *                stamp rule points at the existing mode reference.
 *   TC-DMM-011 — the setup entry list names docs-manager, never a removed skill.
 *
 * Portability: TC-DMM-006's fixture rows run on in-memory registries. Every other row asserts this
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
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own docs-manager skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skillText = () => read(SKILLS, 'docs-manager', 'SKILL.md');
const modeUpdate = () => read(SKILLS, 'docs-manager', 'references', 'mode-update.md');
const modeInit = () => read(SKILLS, 'docs-manager', 'references', 'mode-init.md');

// The removed skill names, assembled so this file never contains the literal tokens it guards against.
const REMOVED = ['docs' + '-update', 'docs' + '-init'];
const MODES = ['update', 'init'];

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
const resolveFixture = (entry) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['docs-manager', 'test'] });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/docs-manager-modes-merge.test.cjs'
]);
const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.code-graph', 'tmp', 'temp', 'plans']);
const REMOVED_TOKEN = new RegExp(`(?<![\\w-])(?:${REMOVED.join('|')})(?![\\w-])`);
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
    if (rel === '.claude/skills/docs-manager/SKILL.md' && /former/i.test(line)) return true;
    // The report filename the update mode keeps so its output path stays identical (`tmp/reports/<name>-{stamp}.md`).
    const rest = line.split('tmp/reports/' + REMOVED[0]).join('');
    return !REMOVED.some(name => rest.includes(name));
}

const tests = [
    {
        name: 'TC-DMM-001 docs-manager detects the mode first, carries one BLOCKING read-first line per mode with its reference, and shows the table (asks nothing) with no mode',
        skip: SKIP,
        fn: () => {
            // Given the docs-manager skill
            const text = skillText();
            // Then mode routing comes before the first content section and names both modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const mode of MODES) assert.match(text, new RegExp(`--mode=${mode}`), `--mode=${mode} is documented`);
            // And each mode has a mandatory full-read line naming an existing reference
            for (const mode of MODES) {
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`), `mandatory read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'docs-manager', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            // And the removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z-]+` and `\/[a-z-]+`: those slash commands no longer exist/);
            // And no mode shows the table and stops: nothing is asked, nothing runs, init needs the explicit flag
            assert.match(text, /No mode flag and no natural-language request matching the `update` Intent column: show the \[Mode Dispatch\]\(#mode-dispatch\) table and stop — ask nothing and run nothing/);
            assert.match(text, /`init` is selected only by an explicit `--mode=init`/);
            // And the banner and the Key Rules state ONE routing rule: a natural-language update request selects update (never init); the table-and-stop applies only without one
            assert.match(text, /A natural-language request that matches the `update` Intent column selects `update`; `init` is selected only by an explicit `--mode=init`\. No mode flag and no such request: show the \[Mode Dispatch\]/);
            assert.doesNotMatch(text, /\bNo mode: show/i, 'no unconditional "No mode: show the table" statement may contradict natural-language update routing');
            assert.doesNotMatch(text, /no mode shows the mode table and stops/, 'the closing reminder is conditioned on the update-intent request');
            assert.doesNotMatch(text, /ask user question tool/, 'the dispatcher asks no question');
        }
    },
    {
        name: 'TC-DMM-002 docs-manager/SKILL.md carries neither mode body; both live in their references',
        skip: SKIP,
        fn: () => {
            const text = skillText();
            const updateOnly = ['## Scope and inputs', '## Ownership and update boundaries', '## Context quality gates', '## Stamp discipline', '## Existing demo-guide relevance'];
            const initOnly = ['## Step 1: Validate Project Config', '## Step 2: Detect Placeholder vs Populated', '## Step 4: M1-M5/M7 Compliance Gate (BLOCKING)'];
            for (const marker of [...updateOnly, ...initOnly]) assert.ok(!text.includes(marker), `SKILL.md must not inline mode text: ${marker}`);
            for (const marker of updateOnly) assert.ok(modeUpdate().includes(marker), `mode-update.md holds ${marker}`);
            for (const marker of initOnly) assert.ok(modeInit().includes(marker), `mode-init.md holds ${marker}`);
            // And the two bodies stay separate: a mode never embeds the other's headings
            for (const marker of initOnly) assert.ok(!modeUpdate().includes(marker), `mode-update.md must not hold init text: ${marker}`);
            for (const marker of updateOnly) assert.ok(!modeInit().includes(marker), `mode-init.md must not hold update text: ${marker}`);
        }
    },
    {
        name: 'TC-DMM-003 update preserves scope, canonical owners, freshness and intent gates without prescribing an itinerary',
        skip: SKIP,
        fn: () => {
            const text = modeUpdate();
            // Guard the decisions a future agent must make, not a phase/task count.
            for (const owner of ['/scan --target=<key>', '/project-config', '/spec', '/spec [mode=tests]', '/spec [mode=sync]', '/spec [mode=index]', '/tech-spec', '/demo-guide']) {
                assert.ok(text.includes(owner), `canonical owner is discoverable: ${owner}`);
            }
            for (const verdict of ['FRESH', 'PATCHED', 'RESCAN REQUIRED', 'UNVERIFIED', 'NOT-APPLICABLE', 'DEFERRED']) assert.ok(text.includes(verdict), verdict);
            assert.match(text, /explicit `changed_files` → caller `base` diff → default working-tree diff/);
            assert.match(text, /outside every context-patching brief\/write set/);
            assert.match(text, /unchecked content is never `FRESH`/);
            assert.match(text, /An impact-scoped pass MUST NOT add, update, or move `Last scanned`/);
            assert.match(text, /A verify pass that changes nothing writes nothing/);
            assert.match(text, /`\[HARD\]` rule blocks until resolved or explicitly owner-accepted/);
            assert.match(text, /every test `TestSpec` annotation must resolve to the canonical registry/);
            assert.match(text, /every scoped artifact has a result/);
            for (const flag of ['modules', 'changed_files', 'base', 'mode', 'tc_mode', 'freshness', 'phases', 'skip_phases']) assert.ok(text.includes('`' + flag + '`'), flag);
            assert.ok(text.includes('tmp/reports/' + REMOVED[0] + '-{YYMMDD}-{HHMM}.md'));
            assert.match(text, /The `mode=update` caller flag \(no dashes\) only overrides `\/spec` mode detection/);
            assert.doesNotMatch(text, /Create ALL 9|TaskCreate|## Phase \d|dispatch the parallel wave/);
            assert.match(skillText(), /`mode=update` \(no dashes[^)]*\) only overrides `\/spec` mode detection and never selects a skill mode/);
        }
    },
    {
        name: 'TC-DMM-004 --mode=init keeps config validation, the always-on vs task-specific split, the BLOCKING per-target applicability read, no routine question',
        skip: SKIP,
        fn: () => {
            const text = modeInit();
            assert.match(text, /## Step 1: Validate Project Config/);
            assert.match(text, /`docs\/project-config\.json` \(or its configured path\) is OPTIONAL/);
            assert.match(text, /`lessons\.md` and `docs-index-reference\.md` are project-init-owned always-on inputs/);
            assert.match(text, /\[BLOCKING\] read the head of its own file `\.claude\/skills\/scan\/references\/targets\/<key>\.md` \(its `applies when` and `skip when` lines\)/);
            assert.match(text, /Run clearly applicable selected scans without a routine user-choice gate/);
            assert.match(text, /Do not interrupt an otherwise clear initialization to ask which applicable configured scans to run/);
            assert.match(text, /Do not invent a verifier command/);
            // The mode delegates to scan and never hand-authors generated output
            assert.match(text, /do not hand-create generated scan output/);
        }
    },
    {
        name: 'TC-DMM-005 the removed skill folders stay deleted, no workflow step references them, and every workflow occurrence of docs-manager passes a supported mode',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            assert.ok(fs.existsSync(path.join(SKILLS, 'docs-manager', 'SKILL.md')), 'docs-manager skill exists');
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const dispatch = skillText();
            let modeSteps = 0;
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences) {
                        skills.add(occurrence.skill);
                        if (occurrence.skill !== 'docs-manager') continue;
                        const mode = /^--mode=([a-z]+)$/.exec(occurrence.args.trim());
                        assert.ok(mode, `${id}/${manifest.mode}/${occurrence.id}: docs-manager needs an explicit --mode, got "${occurrence.args}"`);
                        assert.ok(dispatch.includes(`\`--mode=${mode[1]}`), `${id}/${occurrence.id}: docs-manager has no --mode=${mode[1]}`);
                        modeSteps += 1;
                    }
                }
            }
            for (const name of REMOVED) assert.ok(!skills.has(name), `no resolved workflow step runs ${name}`);
            assert.ok(modeSteps >= 10, `tripwire: the registry runs docs-manager --mode=update as a step in many workflows (${modeSteps})`);
        }
    },
    {
        name: 'TC-DMM-006 a gate satisfied by "docs-manager --mode=update" needs that invocation, not any docs-manager step; live gates name the update mode',
        fn: () => {
            const gate = args => [{ id: 'spec-synced', satisfiedBy: [args] }];
            const update = { id: 'u', skill: 'docs-manager', args: '--mode=update' };
            const init = { id: 'i', skill: 'docs-manager', args: '--mode=init' };
            // Given a sequence with an update step, the gate resolves
            const ok = resolveFixture({ sequence: [init, update], outcomeGates: gate('docs-manager --mode=update') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['docs-manager --mode=update']);
            // And a workflow with only an init step cannot prove it
            assert.throws(() => resolveFixture({ sequence: [init], outcomeGates: gate('docs-manager --mode=update') }), /names a skill not in the sequence/);
            // And a bare skill name still matches every occurrence of that skill
            assert.doesNotThrow(() => resolveFixture({ sequence: [init], outcomeGates: gate('docs-manager') }));
            // And every live gate that names docs-manager names the update mode
            if (!SKIP) {
                const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
                let named = 0;
                for (const id of Object.keys(document.workflows)) {
                    // Entry gates and each mode's own gates: a merged workflow (planned-work) keeps its gates per mode
                    const workflow = document.workflows[id];
                    const liveGates = [...(workflow.outcomeGates || []), ...Object.values(workflow.variants || {}).flatMap(variant => variant.outcomeGates || [])];
                    for (const liveGate of liveGates) {
                        for (const satisfier of liveGate.satisfiedBy) {
                            if (!/^docs-manager\b/.test(satisfier)) continue;
                            named += 1;
                            assert.equal(satisfier, 'docs-manager --mode=update', `${id}/${liveGate.id} must name the update mode`);
                        }
                    }
                }
                assert.ok(named >= 2, `tripwire: live gates name docs-manager --mode=update (${named})`);
            }
        }
    },
    {
        name: 'TC-DMM-007 mode-only protocols live as inline bodies in the mode references, never in docs-manager/SKILL.md',
        skip: SKIP,
        fn: () => {
            const skill = skillText();
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const updateOnly = [];
            const initOnly = [];
            for (const [label, text, tags] of [['mode-update', modeUpdate(), updateOnly], ['mode-init', modeInit(), initOnly]]) {
                for (const tag of tags) {
                    assert.ok(bodyOf(text, tag), `${label} carries the full ${tag} body`);
                    assert.ok(!skill.includes(`SYNC:${tag}`), `docs-manager/SKILL.md must not carry ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `${label} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `${label} carries no retired pointer line`);
                // And its SYNC fences stay balanced (bodies and reminders)
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `${label} fences balanced`);
            }
            // The dispatcher holds no guide and no pointer line (the universal bundle is hook-delivered)
            assert.deepEqual(guideTags(skill), [], 'docs-manager/SKILL.md carries no protocol guide');
            assert.equal((skill.match(/Root-carried protocols/g) || []).length, 0, 'no retired pointer line');
            // And the update reminders survive
            const reminders = (modeUpdate().match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length;
            assert.equal(reminders, 0, 'update is self-contained intent guidance without mode-only protocol copies');
        }
    },
    {
        name: 'TC-DMM-008 no live source names the removed skills',
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
                        if (REMOVED_TOKEN.test(line) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `docs-manager --mode=update` / `docs-manager --mode=init`');
            // The allow-list is live: docs-manager/SKILL.md names the removed commands only as "formerly" (or as the report filename prefix)
            const named = skillText().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(named.some(line => /former/i.test(line)), 'docs-manager/SKILL.md maps the removed commands with a "formerly" line');
            assert.ok(named.every(line => allowedMention('.claude/skills/docs-manager/SKILL.md', line)), 'docs-manager/SKILL.md names the removed commands only as "formerly" or as the report filename prefix');
        }
    },
    {
        name: 'TC-DMM-009 docs-manager description keeps the step-skill form and advertises both modes and both old intents',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skillText());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Documentation\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=update/);
            assert.match(description, /--mode=init/);
            // Routing keywords of both former descriptions survive
            assert.match(description, /documentation (?:update|sync)/);
            assert.match(description, /(?:impacted by|after) code\/spec\/test changes/);
            assert.match(description, /reference-doc (?:set from project-config|initialization and reconciliation)/);
        }
    },
    {
        name: 'TC-DMM-010 the docs-manager agent and skill coexist under one name; the agent drives --mode=update and its stamp rule points at the existing mode reference',
        skip: SKIP,
        fn: () => {
            const agentPath = path.join(REPO_ROOT, '.claude', 'agents', 'docs-manager.md');
            assert.ok(fs.existsSync(agentPath), 'the docs-manager agent exists');
            const agent = read(agentPath);
            const frontmatter = /^---\n([\s\S]*?)\n---/.exec(agent);
            assert.ok(frontmatter, 'agent frontmatter');
            assert.match(frontmatter[1], /^name: docs-manager$/m);
            assert.match(frontmatter[1], /^skills: docs-manager$/m);
            // The agent description keeps its routing phrase and says which skill mode it drives
            assert.match(frontmatter[1], /Use when managing technical documentation/);
            assert.match(frontmatter[1], /Drives `\/docs-manager --mode=update`/);
            assert.match(agent, /Connected contracts:\n- `docs-manager`\n/);
            // The stamp rule names a file that exists
            const stamp = agent.split('\n').find(line => /Stamp discipline:/.test(line));
            assert.ok(stamp, 'the agent keeps its stamp rule');
            const target = /`(\.claude\/skills\/docs-manager\/references\/mode-update\.md)`/.exec(stamp);
            assert.ok(target && fs.existsSync(path.join(REPO_ROOT, ...target[1].split('/'))), 'the stamp rule points at the mode-update reference');
            // The skill tells the two artifacts apart
            assert.match(skillText(), /The `docs-manager` sub-agent \(`subagent_type="docs-manager"`\) is an agent, not this skill; it drives `\/docs-manager --mode=update`/);
        }
    },
    {
        name: 'TC-DMM-011 the setup entry list names docs-manager, never a removed skill',
        skip: SKIP,
        fn: () => {
            const profiles = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'config', 'skill-profiles.json'), 'utf8'));
            const entry = profiles.entrySkills.skills;
            assert.ok(entry.includes('docs-manager'), 'docs-manager is a setup entry skill');
            for (const name of REMOVED) assert.ok(!entry.includes(name), `${name} is not an entry skill`);
        }
    }
];

module.exports = { name: 'docs-manager-modes-merge', tests };
