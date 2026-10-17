/**
 * E2E-Test Modes Merge Test Suite
 *
 * The e2e-test skill owns two roles: default E2E test authoring (select, generate, update) and
 * `--mode=verify` (verify an existing configured E2E scope with exact runner evidence: a report-only
 * default pass, or with `--fix-loop` the bounded convergence engine that `workflow-e2e` calls). The
 * verify body lives in `e2e-test/references/mode-verify.md`; `e2e-test/SKILL.md` detects the mode first
 * and carries a BLOCKING "read the mode file in full FIRST" line, so default authoring never loads the
 * verify body. The mode has no skill folder of its own.
 *
 * Coverage:
 *   TC-E2M-001 — mode detection sits at the top; the verify mode has a BLOCKING read line and an existing reference.
 *   TC-E2M-002 — default authoring text stays free of the verify and fix-loop bodies.
 *   TC-E2M-003 — the verify mode keeps the report-only default, --fix-loop, --visual-review, the runner-evidence
 *                contract, the convergence pointer and the four delimited fix-loop regions.
 *   TC-E2M-004 — the old skill folder stays deleted; workflow-e2e converges through `e2e-test --mode=verify --fix-loop`.
 *   TC-E2M-005 — mode-only protocols live as inline bodies in the mode reference, never as guide lines in e2e-test/SKILL.md.
 *   TC-E2M-006 — no live source names the removed skill (allow-list: the "formerly" lines and the report filename prefix).
 *   TC-E2M-007 — the description keeps the step-skill form and advertises the verify mode and its flags.
 *   TC-E2M-008 — the shared E2E contracts and report-only callers route to the verify mode by its new name.
 *
 * Portability: every row asserts this framework repository's own skills and registry and is skipped in any
 * other project (framework-repo signal). Paths use node:path; nothing is OS-specific.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { isFrameworkRepo } = require('../lib/framework-repo-guard.cjs');
const { resolveAllWorkflowManifests } = require('../../../scripts/lib/workflow-manifest.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own e2e-test skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const skill = () => read(SKILLS, 'e2e-test', 'SKILL.md');
const modeVerify = () => read(SKILLS, 'e2e-test', 'references', 'mode-verify.md');

// The removed skill name, assembled so this file never contains the literal token it guards against.
const REMOVED = 'e2e-test' + '-verify';

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

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/e2e-test-modes-merge.test.cjs'
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

/** A line that names the removed skill but is an allowed mention. */
function allowedMention(rel, line) {
    if (rel === '.claude/skills/e2e-test/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/e2e-test/references/mode-verify.md' && line.includes('tmp/reports/' + REMOVED + '-{YYMMDD-HHmm}')) return true;
    return false;
}

const tests = [
    {
        name: 'TC-E2M-001 e2e-test keeps the verify mode with a BLOCKING read-first line and its reference file',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            assert.match(text, /## Mode Dispatch/);
            assert.match(text, /\*\*\[BLOCKING\]\*\* When `--mode=verify`, read `references\/mode-verify\.md` in full FIRST/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'e2e-test', 'references', 'mode-verify.md')), 'references/mode-verify.md exists');
            // The removed slash command resolves through a prominent "formerly" mapping
            assert.match(text, /former `\/[a-z0-9-]+`: that slash command no longer exists/);
            // Report-only callers never pass the loop flag
            assert.match(text, /report-only callers never pass `--fix-loop`/);
        }
    },
    {
        name: 'TC-E2M-002 default authoring text does not carry the verify or fix-loop bodies',
        skip: SKIP,
        fn: () => {
            const text = skill();
            const verifyOnly = ['## Step 0 — Resolve scope and evidence contract', '## Step 3 — Run one report-only verification attempt', '## Required output', '## Mode: Fix-Loop (`--fix-loop`)', '### Step FL-4 — Run a bounded convergence round', 'Round Integrity Check', '<!-- FIX-LOOP-MODE:START -->'];
            for (const marker of verifyOnly) {
                assert.ok(!text.includes(marker), `e2e-test/SKILL.md must not inline mode text: ${marker}`);
                assert.ok(modeVerify().includes(marker), `mode-verify.md holds ${marker}`);
            }
            // Default authoring still runs its own contract
            assert.match(text, /## Framework Detection \(SECOND STEP\)/);
            assert.match(text, /spawn the `e2e-runner` sub-agent|Spawn `e2e-runner` sub-agent/);
            assert.match(text, /## Workflow Modes/);
        }
    },
    {
        name: 'TC-E2M-003 --mode=verify keeps the report-only default, --fix-loop, --visual-review, the runner-evidence contract and the four delimited regions',
        skip: SKIP,
        fn: () => {
            const text = modeVerify();
            // Report-only default pass: one review pass, no repairs
            assert.match(text, /The default pass is report-only/);
            assert.match(text, /Do not repair failures in this default pass/);
            assert.match(text, /One review pass maximum/);
            assert.match(text, /`PASS`, `NOT-APPLICABLE`, `ENVIRONMENT-BLOCKED`, or `UNVERIFIED`/);
            // The opt-in loop and its flags
            assert.match(text, /--fix-loop/);
            assert.match(text, /--visual-review=\{true\|false\}/);
            assert.match(text, /There is no framework-wide screenshot default/);
            assert.match(text, /A user-supplied false value cannot waive a project-required visual gate/);
            assert.match(text, /NEVER self-invoke with the flag/);
            // Runner-evidence contract: exact counts, run identity, fixed scope
            assert.match(text, /## Required output/);
            assert.match(text, /exact counts\/exit status/);
            assert.match(text, /run the configured full command for the fixed scope/);
            // Shared convergence skeleton read from its single owner
            assert.match(text, /MUST ATTENTION READ `\.claude\/skills\/shared\/verify-convergence-loop\.md` before round 1/);
            // Round budget defaults
            assert.match(text, /consecutive-green requirement \(default 1\)/);
            assert.match(text, /round cap \(default 3\)/);
            // The four delimited --fix-loop regions stay paired
            assert.equal(text.split('<!-- FIX-LOOP-MODE:START -->').length - 1, 4, 'four mode openers');
            assert.equal(text.split('<!-- FIX-LOOP-MODE:END -->').length - 1, 4, 'four mode closers');
            // The shared E2E quality protocol is read first
            assert.match(text, /\.claude\/skills\/shared\/e2e-quality-protocol\.md/);
        }
    },
    {
        name: 'TC-E2M-004 the removed skill folder stays deleted and workflow-e2e converges through `e2e-test --mode=verify --fix-loop`',
        skip: SKIP,
        fn: () => {
            assert.ok(!fs.existsSync(path.join(SKILLS, REMOVED)), `${REMOVED} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            assert.ok(!raw.includes(REMOVED), `workflows.json must not mention ${REMOVED}`);
            const manifests = resolveAllWorkflowManifests(document, 'workflow-e2e', { rootDir: REPO_ROOT });
            assert.equal(manifests.length >= 1, true);
            const converge = manifests[0].occurrences.find(step => step.id === 'e2e-converge');
            assert.ok(converge, 'the convergence occurrence exists');
            assert.equal(converge.skill, 'e2e-test');
            assert.equal(converge.args, '--mode=verify --fix-loop');
            assert.equal(converge.role, 'gate');
            const gate = document.workflows['workflow-e2e'].outcomeGates.find(item => item.id === 'tests-pass');
            assert.deepEqual(gate.satisfiedBy, ['e2e-test --mode=verify']);
            // The pre-action reads the mode reference, which exists
            for (const file of document.workflows['workflow-e2e'].preActions.readFiles) {
                assert.ok(fs.existsSync(path.join(REPO_ROOT, ...file.split('/'))), `workflow-e2e readFiles names an existing file: ${file}`);
            }
            assert.ok(document.workflows['workflow-e2e'].preActions.readFiles.includes('.claude/skills/e2e-test/references/mode-verify.md'));
            // Every e2e-test step in the registry passes a mode the skill supports
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const step of manifest.occurrences.filter(item => item.skill === 'e2e-test')) {
                        assert.match(step.args.trim(), /^(|--mode=verify(?: --fix-loop)?)$/, `${id}/${step.id}: unsupported e2e-test arguments "${step.args}"`);
                    }
                }
            }
        }
    },
    {
        name: 'TC-E2M-005 mode-only protocols live as inline bodies in the mode reference, never as guide lines in e2e-test/SKILL.md',
        skip: SKIP,
        fn: () => {
            const skillTags = guideTags(skill());
            const text = modeVerify();
            const bodyOf = tag => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            for (const tag of ['environment-fault-hypothesis', 'incremental-persistence']) {
                assert.ok(bodyOf(tag), `mode-verify carries the full ${tag} body`);
                assert.ok(!skillTags.includes(tag), `e2e-test/SKILL.md must not carry a guide for ${tag}`);
            }
            assert.deepEqual(guideTags(text), [], 'mode-verify carries no guide entry');
            assert.ok(!text.includes('Root-carried protocols'), 'mode-verify carries no retired pointer line');
            const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
            assert.equal(opens.length, closes.length, 'fences balanced');
            // The shared visual contract stays a guide line of the surviving skill, with its reminder in the mode
            assert.ok(skillTags.includes('e2e-visual-design-contract'), 'e2e-test/SKILL.md keeps the e2e-visual-design-contract guide');
            assert.ok(text.includes('<!-- SYNC:e2e-visual-design-contract:reminder -->'), 'mode-verify keeps the visual-contract reminder');
            for (const tag of skillTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
        }
    },
    {
        name: 'TC-E2M-006 no live source names the removed skill',
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
            assert.deepEqual(offenders, [], 'replace each with `e2e-test --mode=verify`');
            const formerly = skill().split('\n').filter(line => line.includes(REMOVED));
            assert.ok(formerly.length >= 1 && formerly.every(line => /former/i.test(line)), 'e2e-test/SKILL.md names the removed command only as "formerly"');
        }
    },
    {
        name: 'TC-E2M-007 the description keeps the step-skill form and advertises the verify mode and its flags',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(skill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Testing\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=verify/);
            assert.match(description, /--fix-loop/);
            assert.match(description, /--visual-review=\{true\|false\}/);
            assert.match(description, /E2E/);
        }
    },
    {
        name: 'TC-E2M-008 the shared E2E contracts and report-only callers route to the verify mode by its new name',
        skip: SKIP,
        fn: () => {
            const quality = read(SKILLS, 'shared', 'e2e-quality-protocol.md');
            assert.match(quality, /\| `e2e-test --mode=verify` \| Report-only inspection and one configured verification invocation/);
            assert.match(quality, /\| `e2e-test --mode=verify --fix-loop` \| Full-scope convergence, repair, and fresh reruns/);
            const capture = read(SKILLS, 'shared', 'ui-state-capture-protocol.md');
            assert.match(capture, /\| `e2e-test --mode=verify` \| Report-only: verifies the manifest exists/);
            assert.match(capture, /\| `e2e-test --mode=verify --fix-loop` \| Runs the round, reconciles manifest vs records/);
            // changes-review Phase 3.9 invokes the default pass report-only, never the loop
            const reviewer = read(SKILLS, 'changes-review', 'SKILL.md');
            assert.match(reviewer, /Invoke `\/e2e-test --mode=verify` report-only/);
            assert.doesNotMatch(reviewer, /\/e2e-test --mode=verify --fix-loop/);
            // The shared convergence contract names the loop mode once for both tiers
            assert.match(read(SKILLS, 'shared', 'verify-convergence-loop.md'), /`e2e-test --mode=verify --fix-loop`/);
        }
    }
];

module.exports = { name: 'e2e-test-modes-merge', tests };
