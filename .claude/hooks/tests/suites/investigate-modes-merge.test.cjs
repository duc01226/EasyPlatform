/**
 * Investigate Modes Merge Test Suite
 *
 * The investigate skill owns three roles: the default read-only code-flow investigation,
 * `--mode=explain` (developer narrative, inline in SKILL.md) and `--mode=debug` (root-cause
 * investigation of a bug: reproduce, end-to-start trace, hypothesis matrix, `/why-review` gate).
 * The debug body lives in `investigate/references/mode-debug.md`; `investigate/SKILL.md` detects the
 * mode first and carries a BLOCKING "read the mode file in full FIRST" line, so the default flow never
 * loads the debug body. The debug mode has no skill folder of its own.
 *
 * Coverage:
 *   TC-IMM-001 — investigate keeps the debug mode with its mandatory read line, reference file and
 *                "formerly" mapping; mode detection sits before the Quick Summary.
 *   TC-IMM-002 — default investigate text stays free of the debug body; the body lives in the reference.
 *   TC-IMM-003 — the debug mode keeps its investigation-only contract: Phase 0 routing, the
 *                five-way fault verdict, the `/why-review` gate with its round cap, the confidence
 *                table, the end-to-start trace and the standalone next-step question.
 *   TC-IMM-004 — mode-only protocols live as full inline bodies equal to canonical in the reference,
 *                never as guide lines, and investigate/SKILL.md does not carry them.
 *   TC-IMM-005 — the removed skill folder stays deleted and no workflow step or gate references it.
 *   TC-IMM-006 — every workflow occurrence of `investigate` passes a mode the skill supports, and the
 *                bug-fixing workflows run the debug mode as their root-cause gate.
 *   TC-IMM-007 — a gate satisfied by `investigate --mode=debug` needs that invocation, not any
 *                investigate step (fixture workflows; portable).
 *   TC-IMM-008 — no live source names the removed skill (allow-list: the "formerly" line and the
 *                report filename prefix).
 *   TC-IMM-009 — investigate's description keeps the step-skill form and advertises both intents.
 *   TC-IMM-010 — `/fix` names the merged invocation as its root-cause prerequisite and the debugger
 *                agent connects to `investigate`, not to the removed skill.
 *
 * Portability: TC-IMM-007 runs on in-memory fixture registries. Every other row asserts this
 * framework repository's own skills and registry and is skipped in any other project (framework-repo
 * signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests, resolveWorkflowManifest } = require('../../../scripts/lib/workflow-manifest.cjs');
const { extractSyncBody, normalizeEol } = require('../../../scripts/lib/extract-sync-block.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own investigate skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const investigateSkill = () => read(SKILLS, 'investigate', 'SKILL.md');
const modeDebug = () => read(SKILLS, 'investigate', 'references', 'mode-debug.md');

// The removed skill name, assembled so this file never contains the literal token it guards against.
const REMOVED = 'debug' + '-investigate';
// Report files keep the historical prefix so report paths (and `/fix`'s evidence glob) stay identical.
const REPORT_PREFIX = 'tmp/reports/' + REMOVED + '-';

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

/** The text between the paired SYNC fences of `tag` in `text`, or null. */
function carrierBody(text, tag) {
    const open = `<!-- SYNC:${tag} -->`;
    const close = `<!-- /SYNC:${tag} -->`;
    const from = text.indexOf(open);
    const to = text.indexOf(close);
    if (from < 0 || to < from) return null;
    return text.slice(from + open.length, to);
}
const norm = (text) => normalizeEol(text).trim();

const fixtureDocument = (entry) => ({ version: '1', workflows: { fixture: entry } });
const resolveFixture = (entry, mode) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['investigate', 'fix'], ...(mode ? { mode } : {}) });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/investigate-modes-merge.test.cjs'
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
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        if (entry.isDirectory() && SCAN_EXCLUDED_DIRS.has(entry.name)) continue;
        yield* walk(`${rel}/${entry.name}`);
    }
}

/** A line that names the removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (line.split(REPORT_PREFIX).join('').includes(REMOVED) === false) return true;
    if (rel === '.claude/skills/investigate/SKILL.md' && /former/i.test(line)) return true;
    return false;
}

const tests = [
    {
        name: 'TC-IMM-001 investigate keeps the debug mode with a BLOCKING read-first line, its reference file and the "formerly" mapping',
        skip: SKIP,
        fn: () => {
            // Given the investigate skill
            const text = investigateSkill();
            // Then mode detection comes before the first content section and names both modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            assert.match(text, /--mode=debug/);
            assert.match(text, /--mode=explain/);
            // And the debug mode has a mandatory full-read line naming an existing reference
            assert.match(text, /\*\*\[BLOCKING\]\*\* When `--mode=debug`, read `references\/mode-debug\.md` in full FIRST/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'investigate', 'references', 'mode-debug.md')), 'references/mode-debug.md exists');
            // And the removed slash command resolves through a prominent "formerly" mapping
            assert.match(text, /is the former `\/debug-investigate`/);
            // And the dispatch table lists the modes
            assert.match(text, /## Mode Dispatch/);
            assert.match(text, /\| `--mode=debug \[bug description\]` \|[^\n]*\| `references\/mode-debug\.md` \|/);
        }
    },
    {
        name: 'TC-IMM-002 default investigate text does not carry the debug mode body',
        skip: SKIP,
        fn: () => {
            // Given the default investigate skill text (what a plain /investigate loads)
            const text = investigateSkill();
            // Then none of the debug-only contract markers appear in it
            const debugOnly = [
                '## Phase 0: Classify and Route (BLOCKING)',
                '### Phase 0.5: Fault Adjudication',
                '## Phase 3: Trace End-to-Start',
                '## Phase 4: Confirm Ownership and Completeness',
                '## Phase 5: Root Cause Validation (`/why-review` Gate)',
                '## Phase 6: Report and Hand Off'
            ];
            for (const marker of debugOnly) assert.ok(!text.includes(marker), `investigate/SKILL.md must not inline debug text: ${marker}`);
            // And the debug body does live in its reference file
            for (const marker of debugOnly) assert.ok(modeDebug().includes(marker), `mode-debug.md holds ${marker}`);
            // And default investigation still runs its own contract and the explain mode stays inline
            assert.match(text, /## Phase 0: Scope Classification/);
            assert.match(text, /## Mode: Explain \(Developer Narrative\)/);
            assert.match(text, /### Logical-ID Extraction & Business-Intent Rule/);
        }
    },
    {
        name: 'TC-IMM-003 --mode=debug keeps the investigation-only contract, the fault verdicts, the why-review gate and the standalone next-step question',
        skip: SKIP,
        fn: () => {
            const text = modeDebug();
            // Investigation-only: never patches, hands the confirmed cause to /fix
            assert.match(text, /Never patch here/i);
            assert.match(text, /Investigate and recommend; `\/fix` implements/);
            // Phase 0 is BLOCKING and routes the specialist agents
            assert.match(text, /## Phase 0: Classify and Route \(BLOCKING\)/);
            for (const agent of ['debugger', 'performance-optimizer', 'security-auditor']) assert.ok(text.includes(`\`${agent}\``), `routes ${agent}`);
            // Failing/flaky integration test: read the protocol, never invoke it, emit ONE of five verdicts before any trace
            assert.match(text, /Read `\.claude\/skills\/integration-test\/references\/mode-review\.md`[^\n]*apply it; NEVER invoke `\/integration-test --mode=review` here/);
            for (const verdict of ['TEST-WRONG', 'TEST-NOT-OPTIMAL', 'SOURCE-WRONG', 'ENVIRONMENT-BLOCKED', 'AMBIGUOUS']) assert.ok(text.includes(`**${verdict}**`), `verdict ${verdict}`);
            assert.match(text, /STOP and ask the user or canonical owner/);
            // End-to-start trace with the hypothesis matrix
            assert.match(text, /## Phase 3: Trace End-to-Start/);
            assert.match(text, /Classify hypotheses as primary, contributing, ruled out, latent or unknown/);
            assert.match(text, /Walk origin → observed end state forward, mapping each cause to a correction and each correction to tests\/proof/);
            // The why-review gate runs in the SAME main session with a two-round cap
            assert.match(text, /SAME session and SAME main agent; do NOT delegate this gate/);
            assert.match(text, /Two rounds without PASS:\*\* STOP and escalate through `ask user question tool`/);
            // Confidence thresholds survive
            assert.match(text, /\| <60%\s+\| Insufficient evidence\s+\| Gather evidence; report only the unconfirmed hypothesis and named gaps, never a root-cause verdict \|/);
            // Standalone completion asks for the next step; never auto-decides
            assert.match(text, /\*\*Standalone next steps:\*\* Use `ask user question tool`; never auto-continue/);
            assert.match(text, /Skip this choice ONLY for `nested=true`[^\n]*an abandoned\/existing row alone does not qualify/);
            // The dependency-tracing section keeps its graph queries (whether the graph is required is the graph policy's call, not this mode's)
            assert.match(text, /\*\*Optional graph advice:\*\*/);
            assert.match(text, /code_graph query callers_of <function> --json/);
            assert.match(text, /code_graph trace <suspect-file> --direction both --json/);
            // The report keeps the filename prefix that /fix's evidence gate recognizes
            assert.ok(text.includes(REPORT_PREFIX + '{YYMMDD}-{slug}.md'), 'report path prefix kept');
            // And the parent skill states the gate at the point of dispatch
            assert.match(investigateSkill(), /Workflow invocation \(for example `workflow-bugfix`\) returns the validated root cause to the parent/);
        }
    },
    {
        name: 'TC-IMM-004 mode-only protocols live as inline bodies equal to canonical in the mode reference, never in investigate/SKILL.md',
        skip: SKIP,
        fn: () => {
            const skillText = investigateSkill();
            const skillTags = guideTags(skillText);
            const refText = modeDebug();
            const canonical = normalizeEol(fs.readFileSync(path.join(SKILLS, 'shared', 'sync-inline-versions.md'), 'utf8'));
            const debugOnly = ['evidence-based-reasoning', 'incremental-persistence', 'red-flag-stop-conditions', 'subagent-return-contract', 'test-failure-fault-adjudication'];
            for (const tag of debugOnly) {
                const body = carrierBody(refText, tag);
                assert.ok(body, `mode-debug carries the full ${tag} body`);
                assert.equal(norm(body), norm(extractSyncBody(canonical, tag)), `${tag} body equals canonical`);
                assert.ok(!skillText.includes(`<!-- SYNC:${tag} -->`) && !skillTags.includes(tag), `investigate/SKILL.md must not carry ${tag}`);
            }
            // The skill-protocol verifier requires the trace gate inline where the debug flow runs; the skill keeps its guide (valid split)
            const traceBody = carrierBody(refText, 'end-to-start-debugger-trace');
            assert.ok(traceBody, 'mode-debug carries the full end-to-start-debugger-trace body');
            assert.equal(norm(traceBody), norm(extractSyncBody(canonical, 'end-to-start-debugger-trace')), 'trace body equals canonical');
            // A references file keeps full bodies and no guide entry or retired pointer line
            assert.deepEqual(guideTags(refText), [], 'mode-debug carries no guide entry');
            assert.ok(!refText.includes('Root-carried protocols'), 'mode-debug carries no retired pointer line');
            // And investigate keeps the protocols the debug mode shares with the default flow
            for (const tag of ['cross-service-check', 'end-to-start-debugger-trace', 'environment-fault-hypothesis', 'fix-layer-accountability', 'root-cause-debugging', 'sequential-thinking-protocol', 'source-test-drift-check', 'task-tracking-external-report', 'understand-code-first']) {
                assert.ok(skillTags.includes(tag), `investigate/SKILL.md carries ${tag}`);
            }
            for (const tag of skillTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
            // And every SYNC fence in the reference stays balanced
            const opens = refText.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            const closes = refText.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            assert.equal(opens.length, closes.length, 'mode-debug fences balanced');
            assert.equal(opens.length, debugOnly.length + 1, 'mode-debug carries exactly its own protocols plus the trace gate');
        }
    },
    {
        name: 'TC-IMM-005 the removed skill folder stays deleted and no workflow step or gate references it',
        skip: SKIP,
        fn: () => {
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED)), `${REMOVED} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            assert.ok(!raw.includes(REMOVED), `workflows.json must not mention ${REMOVED}`);
            const document = JSON.parse(raw);
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill } of manifest.occurrences) skills.add(skill);
                    for (const gate of manifest.outcomeGates) assert.ok(!gate.satisfiedBy.some(satisfier => satisfier.startsWith(REMOVED)), `${id}: gate ${gate.id} names ${REMOVED}`);
                }
            }
            assert.ok(!skills.has(REMOVED), `no resolved workflow step runs ${REMOVED}`);
            assert.ok(skills.has('investigate'), 'tripwire: the registry still runs the investigate skill');
        }
    },
    {
        name: 'TC-IMM-006 every workflow occurrence of investigate passes a mode the skill supports; bug-fixing workflows run the debug mode as their root-cause gate',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = investigateSkill();
            let debugSteps = 0;
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences.filter(step => step.skill === 'investigate')) {
                        const args = (occurrence.args || '').trim();
                        if (!args) continue;
                        const mode = /^--mode=([a-z]+)$/.exec(args);
                        assert.ok(mode, `${id}/${manifest.mode}/${occurrence.id}: unsupported investigate arguments "${args}"`);
                        assert.ok(dispatch.includes(`\`--mode=${mode[1]}`), `${id}/${occurrence.id}: investigate has no --mode=${mode[1]}`);
                        if (mode[1] === 'debug') debugSteps += 1;
                    }
                }
            }
            assert.ok(debugSteps >= 2, `tripwire: the registry runs the debug mode as investigate steps (${debugSteps})`);
            // The bug-fixing workflow proves root-cause-traced with a GATE step running the debug mode
            for (const id of ['workflow-bugfix']) {
                const [manifest] = resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT });
                const gate = manifest.outcomeGates.find(entry => entry.id === 'root-cause-traced');
                assert.ok(gate && gate.satisfiedBy.includes('investigate --mode=debug'), `${id}: root-cause-traced is satisfied by investigate --mode=debug`);
                const prover = manifest.occurrences.find(step => step.skill === 'investigate' && step.args === '--mode=debug');
                assert.ok(prover && prover.role === 'gate', `${id}: the debug-mode investigate step is a gate`);
            }
        }
    },
    {
        name: 'TC-IMM-007 a gate satisfied by "investigate --mode=debug" needs that invocation, not any investigate step',
        fn: () => {
            const gate = satisfier => [{ id: 'root-cause-traced', satisfiedBy: [satisfier] }];
            const plain = { id: 'i', skill: 'investigate' };
            const debug = { id: 'd', skill: 'investigate', args: '--mode=debug' };
            // Given a sequence with a debug-mode step, the gate resolves
            const ok = resolveFixture({ sequence: [plain, debug, 'fix'], outcomeGates: gate('investigate --mode=debug') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['investigate --mode=debug']);
            // And a workflow with only plain investigate steps cannot prove the gate
            assert.throws(() => resolveFixture({ sequence: [plain, 'fix'], outcomeGates: gate('investigate --mode=debug') }), /names a skill not in the sequence/);
            // And a different mode does not satisfy it
            assert.throws(() => resolveFixture({ sequence: [plain, { id: 'e', skill: 'investigate', args: '--mode=explain' }], outcomeGates: gate('investigate --mode=debug') }), /names a skill not in the sequence/);
            // And a mode variant that drops the debug step fails for that mode
            const variants = {
                defaultMode: 'full',
                variants: { full: { sequence: [plain, debug] }, lean: { sequence: [plain] } },
                outcomeGates: gate('investigate --mode=debug')
            };
            assert.equal(resolveFixture(variants, 'full').mode, 'full');
            assert.throws(() => resolveFixture(variants, 'lean'), /has no satisfying step in fixture\/lean/);
            // And a bare skill name still matches every occurrence of that skill
            assert.doesNotThrow(() => resolveFixture({ sequence: [plain], outcomeGates: gate('investigate') }));
        }
    },
    {
        name: 'TC-IMM-008 no live source names the removed skill',
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
                        if (line.includes(REMOVED) && !allowedMention(rel, line)) offenders.push(`${rel}:${index + 1}`);
                    });
                }
            }
            assert.ok(scanned > 500, `tripwire: the scan covers the framework sources (${scanned} files)`);
            assert.deepEqual(offenders, [], 'replace each with `investigate --mode=debug`');
            // The allow-list is live: the skill names the removed command only as "formerly"
            const formerly = investigateSkill().split('\n').filter(line => line.includes(REMOVED));
            assert.ok(formerly.length >= 1 && formerly.every(line => /former/i.test(line)), 'investigate/SKILL.md names the removed command only as "formerly"');
            // And the report prefix stays recognized by /fix's evidence gate
            assert.ok(read(SKILLS, 'fix', 'SKILL.md').includes(REPORT_PREFIX + '*.md'), 'fix accepts the debug report prefix as same-session evidence');
        }
    },
    {
        name: 'TC-IMM-009 investigate description keeps the step-skill form and advertises both intents',
        skip: SKIP,
        fn: () => {
            const match = /^description: '((?:[^']|'')*)'$/m.exec(investigateSkill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1].replace(/''/g, '\'');
            assert.match(description, /^\[Fix & Debug\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            // Both routing intents: code-flow trace and the bug root cause
            assert.match(description, /code-flow (?:trace|investigation)/);
            assert.match(description, /--mode=debug/);
            assert.match(description, /root cause/);
            assert.match(description, /--mode=explain/);
        }
    },
    {
        name: 'TC-IMM-010 /fix names the merged invocation as its root-cause prerequisite and the debugger agent connects to investigate',
        skip: SKIP,
        fn: () => {
            const fix = read(SKILLS, 'fix', 'SKILL.md');
            assert.match(fix, /Root-Cause Prerequisite Gate \(BLOCKING\):\*\* no code edit until `\/investigate --mode=debug` traced THIS problem in THIS session/);
            assert.match(fix, /not satisfied → run `\/investigate --mode=debug` first/);
            const debuggerAgent = read(REPO_ROOT, '.claude', 'agents', 'debugger.md');
            const connections = /<!-- AGENT-SKILL-CONNECTIONS:START -->([\s\S]*?)<!-- AGENT-SKILL-CONNECTIONS:END -->/.exec(debuggerAgent);
            assert.ok(connections, 'debugger agent carries its skill connections block');
            assert.deepEqual([...connections[1].matchAll(/^- `([a-z-]+)`$/gm)].map(entry => entry[1]), ['investigate']);
            // The shared fault-adjudication protocol sends the reader to the merged invocation
            assert.match(read(SKILLS, 'shared', 'protocols', 'test-failure-fault-adjudication.md'), /then `\/investigate --mode=debug` and trace end-to-start before editing/);
        }
    }
];

module.exports = { name: 'investigate-modes-merge', tests };
