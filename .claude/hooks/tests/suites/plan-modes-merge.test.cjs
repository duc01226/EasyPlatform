/**
 * Plan Modes Merge Test Suite
 *
 * The plan skill owns four roles: default plan creation, `--mode=review` (one evidence-backed
 * review pass of an existing plan), `--mode=validate` (critical-questions interview) and
 * `--mode=execute` (code and test an existing plan), plus the `--mode={ci|cro}` intakes. Each merged
 * mode body lives in `plan/references/mode-<x>.md`; `plan/SKILL.md` detects the mode first and carries
 * a BLOCKING "read the mode file in full FIRST" line, so default plan creation never inlines a mode
 * body. A standalone plan creation loads one reference, the validate mode, after the plan is saved, to
 * run its validation chain. The three modes have no skill folder of their own.
 *
 * Coverage:
 *   TC-PMM-001 — plan keeps the three merged modes, each with its mandatory read line and a reference file.
 *   TC-PMM-002 — default plan text stays free of the three mode bodies.
 *   TC-PMM-003 — the review mode keeps default read-only and bounded fix-loop ownership, read-only boundary, verdicts and the Goal
 *                Satisfaction matrix.
 *   TC-PMM-004 — the validate mode keeps the mandatory ask user question tool interview, briefs the
 *                user before the first question, asks every material decision as a decision card in
 *                rounds, and keeps the plan.md-only Validation Summary.
 *   TC-PMM-005 — the old skill directories stay deleted and no workflow step references them.
 *   TC-PMM-006 — every workflow occurrence of `plan` passes a mode the skill supports.
 *   TC-PMM-007 — a gate satisfied by `plan --mode=validate` needs that invocation, not any plan step
 *                (fixture workflows; portable).
 *   TC-PMM-008 — mode-only protocol guides live in the mode reference, never in plan/SKILL.md.
 *   TC-PMM-009 — no live source names the removed skills (allow-list: the "formerly" lines and the
 *                review report filename prefix).
 *   TC-PMM-010 — plan's description keeps the step-skill form and advertises the merged modes.
 *   TC-PMM-011 — the execute mode keeps every flag with its default, the three BLOCKING gates, the
 *                verify-last order and the no-implicit-Git rule.
 *   TC-PMM-012 — a standalone plan creation chains into the validation interview as the
 *                `plan.validation.mode` setting directs (shipped default auto), applies the answers
 *                and shows its edits; a workflow plan step runs the same chain when its workflow lists
 *                no validate step, and closes without the review question; a workflow with its own
 *                validate step, a calling skill, an off setting, a declined request and a context that
 *                cannot reach the user never start it; the intake modes and the planner agent state
 *                the same hand-off.
 *
 * Portability: TC-PMM-007 runs on in-memory fixture registries. Every other row asserts this
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
const SKIP = isFrameworkRepo(REPO_ROOT) ? false : 'asserts the framework repo\'s own plan skill and workflow registry (framework-repo signal)';

const SKILLS = path.join(REPO_ROOT, '.claude', 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const planSkill = () => read(SKILLS, 'plan', 'SKILL.md');
const modeReview = () => read(SKILLS, 'plan', 'references', 'mode-review.md');
const modeValidate = () => read(SKILLS, 'plan', 'references', 'mode-validate.md');
const modeExecute = () => read(SKILLS, 'plan', 'references', 'mode-execute.md');

// The removed skill names, assembled so this file never contains the literal token it guards against.
const REMOVED = ['plan' + '-review', 'plan' + '-validate', 'plan' + '-execute'];

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
const resolveFixture = (entry, mode) => resolveWorkflowManifest(fixtureDocument(entry), 'fixture', { availableSkills: ['plan', 'spec'], ...(mode ? { mode } : {}) });

const LIVE_SOURCE_ROOTS = ['.claude', 'docs/specs', 'docs/project-reference', 'README.md'];
// Generated catalogs are rebuilt from the skill folders; history stays in ADRs and release notes.
const SCAN_EXCLUDED = new Set([
    '.claude/SKILLS.yaml',
    '.claude/scripts/skills_data.yaml',
    '.claude/hooks/tests/suites/plan-modes-merge.test.cjs'
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
    if (rel === '.claude/skills/plan/SKILL.md' && /former/i.test(line)) return true;
    if (rel === '.claude/skills/plan/SKILL.md' && /do not resolve\.$/.test(line) && REMOVED.every(name => line.includes('`/' + name + '`'))) return true;
    if (rel === '.claude/skills/plan/references/mode-review.md' && line.includes('tmp/reports/' + REMOVED[0] + '-{YYMMDD}')) return true;
    return false;
}

const tests = [
    {
        name: 'TC-PMM-001 plan keeps the review, validate and execute modes, each with a BLOCKING read-first line and its reference file',
        skip: SKIP,
        fn: () => {
            // Given the plan skill
            const text = planSkill();
            // Then mode detection comes before the first content section and lists all four modes
            const routing = text.indexOf('Mode routing');
            assert.ok(routing > 0 && routing < text.indexOf('## Quick Summary'), 'mode detection sits at the top, before the Quick Summary');
            for (const mode of ['review', 'validate', 'execute', 'ci', 'cro']) assert.match(text, new RegExp(`--mode=${mode}`), `--mode=${mode} is documented`);
            // And each of the two merged modes has a mandatory full-read line naming an existing reference
            for (const mode of ['review', 'validate', 'execute']) {
                assert.match(text, new RegExp(`\\*\\*\\[BLOCKING\\]\\*\\* When \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`), `mandatory read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'plan', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            // And the two intake modes carry their own BLOCKING full-read line naming an existing reference (the table column alone is not a read instruction)
            for (const mode of ['ci', 'cro']) {
                assert.match(text, new RegExp(`when \`--mode=${mode}\`, read \`references/mode-${mode}\\.md\` in full FIRST`, 'i'), `read line for ${mode}`);
                assert.ok(fs.existsSync(path.join(SKILLS, 'plan', 'references', `mode-${mode}.md`)), `references/mode-${mode}.md exists`);
            }
            assert.match(text, /\*\*\[BLOCKING\]\*\* When `--mode=ci`, read/, 'the intake read line is BLOCKING');
            // And the removed slash commands resolve through a prominent "formerly" mapping
            assert.match(text, /`\/plan-review`, `\/plan-validate` and `\/plan-execute` do not resolve/);
        }
    },
    {
        name: 'TC-PMM-002 default plan text does not carry the review, validate or execute mode bodies',
        skip: SKIP,
        fn: () => {
            // Given the default plan skill text (what a plain /plan loads)
            const text = planSkill();
            // Then none of the mode-only contract markers appear in it
            const reviewOnly = ['## Modes and Round Ownership', '## Report and Handoff', '## Finding Validation and Verdict', '## Simplified Why-Review Pass'];
            const validateOnly = ['## Phase 0: Detect Plan Type', 'Phase 0.5: Applicability / Plan Gate', 'Follow-up rules', '### Step 4: Interview User'];
            const executeOnly = ['## Step 4: Verify (tests + mutation check, once)', '## Pre-Implementation Granularity Gate', '### Step 2 Wave Dispatch', '## Spec-Loop Gate', '## Step 5: User Approval'];
            for (const marker of [...reviewOnly, ...validateOnly, ...executeOnly]) assert.ok(!text.includes(marker), `plan/SKILL.md must not inline mode text: ${marker}`);
            // And the mode bodies do live in their reference files
            for (const marker of reviewOnly) assert.ok(modeReview().includes(marker), `mode-review.md holds ${marker}`);
            for (const marker of validateOnly) assert.ok(modeValidate().includes(marker), `mode-validate.md holds ${marker}`);
            for (const marker of executeOnly) assert.ok(modeExecute().includes(marker), `mode-execute.md holds ${marker}`);
            // And default plan creation still runs its own contract
            assert.match(text, /Write `plan\.md` under the configured plans root/);
        }
    },
    {
        name: 'TC-PMM-003 --mode=review supports default read-only and bounded fix-loop ownership, verdicts and the Goal Satisfaction matrix',
        skip: SKIP,
        fn: () => {
            const text = modeReview();
            assert.match(text, /Standalone defaults to review-only/);
            assert.match(text, /Review-only and caller-owned leaves keep the target read-only/);
            assert.match(text, /one shared three-round budget and the LOW\/extension rules/);
            assert.match(text, /caller-owned leaves never start another loop or edit/);
            assert.match(text, /validate findings, repair at the owner, then freshly review the settled target/);
            assert.match(text, /Review-only stops after the validated report/);
            assert.doesNotMatch(text, /ONE ROUND MAXIMUM per invocation|Never fix the plan|Another review requires a new explicit invocation/i);
            // Every verdict and the Goal Satisfaction matrix survive
            for (const verdict of ['PASS', 'PASS_WITH_NOTES', 'CHANGES_REQUESTED', 'BLOCKED']) assert.ok(text.includes(`\`${verdict}\``), `verdict ${verdict}`);
            assert.match(text, /Goal Satisfaction matrix/);
            // And the parent skill states the cap at the point of dispatch
            assert.match(planSkill(), /standalone defaults to `--review-only`/);
            assert.match(planSkill(), /`--fix-loop --loop-owner=caller` returns a read-only pass/);
        }
    },
    {
        name: 'TC-PMM-004 --mode=validate keeps the mandatory ask user question tool interview and the plan.md-only Validation Summary',
        skip: SKIP,
        fn: () => {
            const text = modeValidate();
            assert.match(text, /MUST ATTENTION use `ask user question tool` — NEVER auto-decide on behalf of user/);
            assert.match(text, /Completing without asking ≥1 question = violation/);
            assert.match(text, /NEVER modify phase files/);
            assert.match(text, /## Validation Summary/);
            assert.match(text, /Bugfix detection is BLOCKING/);
            assert.match(text, /Option 4 selected → return BLOCKED status/);
            // The questions range sizes a round and never caps the interview; a thin plan gets no filler question
            assert.match(text, /MAX is the most questions in one round, and rounds continue until every material decision is asked/);
            assert.match(text, /never invent a filler question/);
            // The user is briefed on the plan before the first question, and every question is a decision card
            assert.match(text, /### Step 3\.5: Brief the User \(BLOCKING — before the first question\)/);
            // The briefing names every part the user needs to judge the plan
            const briefing = text.slice(text.indexOf('### Step 3.5: Brief the User'), text.indexOf('### Step 4: Interview User'));
            for (const part of ['Goal', 'What will be done', 'Scope', 'Decisions already taken', 'Assumptions', 'Risks', 'Proof', 'State', 'This interview']) {
                assert.ok(briefing.includes(`- **${part}** — `), `briefing part ${part}`);
            }
            assert.match(briefing, /Never ask a question whose context the briefing or its own card does not supply/);
            // Every worked card shows the fields the rule asks for
            for (const card of text.split('```').filter(block => block.includes('\nDeciding: '))) {
                for (const field of ['Why it matters: ', 'Plan assumes now: ', 'Reversible: ']) assert.ok(card.includes('\n' + field), `worked card carries ${field.trim()}`);
            }
            assert.match(text, /for each option state what it gives, what it costs and what or who it affects/);
            assert.match(text, /give the reason plus what would change the recommendation/);
            assert.match(text, /record every unasked card as an unconfirmed assumption in the Validation Summary/);
            // No sentence may bring back a cap on the whole interview or the retired hard-constraint wording
            assert.doesNotMatch(text, /hard constraints|never go below min|bounded user questions|never exceed MAX/i);
            assert.doesNotMatch(text, /\b(at most|no more than|a maximum of|never (ask|exceed) more than|stop after)\b[^\n]*\b(in total|overall|for the whole interview|across the interview|per interview)\b/i);
            assert.doesNotMatch(text, /stop the interview (once|after|when) MAX/i);
            assert.match(text, /Tell the user how many decisions remain, then ask the next round until none remains/);
            // Every worked example that marks a recommendation puts it first, as the card rule says
            const cardExamples = text.split('```').filter(block => /\nOptions[^\n]*:\n/.test(block) && block.includes('(Recommended)'));
            assert.ok(cardExamples.length >= 2, 'the reference keeps worked examples that mark a recommendation');
            for (const example of cardExamples) {
                const options = example.split('\n').filter(l => /^\d+\. /.test(l));
                assert.ok(options[0].includes('(Recommended)'), `recommended option comes first in: ${options[0]}`);
            }
            assert.match(text, /\*\*"\/feature-implement \(Recommended\)"\*\*/);
        }
    },
    {
        name: 'TC-PMM-005 the removed skill folders stay deleted and no workflow step references them',
        skip: SKIP,
        fn: () => {
            for (const name of REMOVED) assert.ok(!fs.existsSync(path.join(SKILLS, name)), `${name} must not exist as a skill folder`);
            const raw = fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8');
            const document = JSON.parse(raw);
            for (const name of REMOVED) assert.ok(!raw.includes(name), `workflows.json must not mention ${name}`);
            const skills = new Set();
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const { skill } of manifest.occurrences) skills.add(skill);
                }
            }
            for (const name of REMOVED) assert.ok(!skills.has(name), `no resolved workflow step runs ${name}`);
            assert.ok(skills.has('plan'), 'tripwire: the registry still runs the plan skill');
        }
    },
    {
        name: 'TC-PMM-006 every workflow occurrence of plan passes a mode the plan skill supports',
        skip: SKIP,
        fn: () => {
            const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, '.claude', 'workflows.json'), 'utf8'));
            const dispatch = planSkill();
            let modeSteps = 0;
            for (const id of Object.keys(document.workflows)) {
                for (const manifest of resolveAllWorkflowManifests(document, id, { rootDir: REPO_ROOT })) {
                    for (const occurrence of manifest.occurrences.filter(step => step.skill === 'plan')) {
                        const args = occurrence.args.trim();
                        if (!args) continue;
                        const mode = /^--mode=([a-z]+)$/.exec(args);
                        assert.ok(mode, `${id}/${manifest.mode}/${occurrence.id}: unsupported plan arguments "${args}"`);
                        assert.ok(dispatch.includes(`\`--mode=${mode[1]}`), `${id}/${occurrence.id}: plan has no --mode=${mode[1]}`);
                        modeSteps += 1;
                    }
                }
            }
            assert.ok(modeSteps >= 12, `tripwire: the registry runs the merged modes as plan steps (${modeSteps})`);
        }
    },
    {
        name: 'TC-PMM-007 a gate satisfied by "plan --mode=validate" needs that invocation, not any plan step',
        fn: () => {
            const gate = args => [{ id: 'plan-approved', satisfiedBy: [args] }];
            const plain = { id: 'p', skill: 'plan' };
            const validate = { id: 'v', skill: 'plan', args: '--mode=validate' };
            // Given a sequence with a validate step, the gate resolves
            const ok = resolveFixture({ sequence: [plain, validate], outcomeGates: gate('plan --mode=validate') });
            assert.deepEqual(ok.outcomeGates[0].satisfiedBy, ['plan --mode=validate']);
            // And a workflow with plan steps but no validate step cannot prove the gate
            assert.throws(() => resolveFixture({ sequence: [plain], outcomeGates: gate('plan --mode=validate') }), /names a skill not in the sequence/);
            // And a different mode does not satisfy it
            assert.throws(() => resolveFixture({ sequence: [plain, { id: 'r', skill: 'plan', args: '--mode=review' }], outcomeGates: gate('plan --mode=validate') }), /names a skill not in the sequence/);
            // And a mode variant that drops the validate step fails for that mode
            const variants = {
                defaultMode: 'full',
                variants: { full: { sequence: [plain, validate] }, lean: { sequence: [plain] } },
                outcomeGates: gate('plan --mode=validate')
            };
            assert.equal(resolveFixture(variants, 'full').mode, 'full');
            assert.throws(() => resolveFixture(variants, 'lean'), /has no satisfying step in fixture\/lean/);
            // And a bare skill name still matches every occurrence of that skill
            assert.doesNotThrow(() => resolveFixture({ sequence: [plain], outcomeGates: gate('plan') }));
        }
    },
    {
        name: 'TC-PMM-008 mode-only protocols live as inline bodies in the mode reference, never in plan/SKILL.md; default plan keeps its own guides',
        skip: SKIP,
        fn: () => {
            const planText = planSkill();
            const planTags = guideTags(planText);
            const reviewText = modeReview();
            const validateText = modeValidate();
            const executeText = modeExecute();
            const bodyOf = (text, tag) => text.includes(`<!-- SYNC:${tag} -->`) && text.includes(`<!-- /SYNC:${tag} -->`);
            const reviewOnly = ['category-review-thinking', 'graph-assisted-investigation', 'severity-rubric', 'trade-off-interrogation-gate'];
            const validateOnly = ['sequential-thinking-protocol', 'task-tracking-external-report', 'understand-code-first'];
            const executeOnly = ['design-distinctiveness-gate', 'design-review-checklist', 'end-to-start-debugger-trace', 'severity-rubric', 'source-test-drift-check', 'ui-copywriting', 'understand-code-first'];
            // Each mode-only tag is an inline body in its reference and absent from the default skill
            for (const [label, text, tags] of [['mode-review', reviewText, reviewOnly], ['mode-validate', validateText, validateOnly], ['mode-execute', executeText, executeOnly]]) {
                for (const tag of tags) {
                    assert.ok(bodyOf(text, tag), `${label} carries the full ${tag} body`);
                    assert.ok(!planText.includes(`SYNC:${tag}`) && !planTags.includes(tag), `plan/SKILL.md must not carry ${tag}`);
                }
                // A references file keeps full bodies and no guide entry or retired pointer line
                assert.deepEqual(guideTags(text), [], `${label} carries no guide entry`);
                assert.ok(!text.includes('Root-carried protocols'), `${label} carries no retired pointer line`);
            }
            // The review mode's AI-feature depth is one conditional pointer, never a body or a guide line
            assert.match(reviewText, /\*\*AI surface\?\*\* Only if the plan creates or changes a model call[^\n]*\.claude\/skills\/shared\/protocols\/ai-engineering-gate\.md[^\n]*otherwise skip this line/);
            assert.ok(!reviewText.includes('SYNC:ai-engineering-gate') && !planText.includes('ai-engineering-gate'), 'default plan creation pays nothing for the AI floor');
            // And plan keeps every protocol the modes share with plan creation
            for (const tag of ['core-engineering-principles', 'evidence-based-reasoning', 'goal-contract-satisfaction-loop', 'plan-granularity', 'plan-quality', 'verify-last-order', 'cross-service-check']) {
                assert.ok(planTags.includes(tag), `plan/SKILL.md carries ${tag}`);
            }
            for (const tag of planTags) assert.ok(fs.existsSync(path.join(SKILLS, 'shared', 'protocols', `${tag}.md`)), `projection file for ${tag}`);
            // And every mode's SYNC fences stay balanced (bodies and reminders)
            for (const [label, text] of [['mode-review', reviewText], ['mode-validate', validateText], ['mode-execute', executeText]]) {
                const opens = text.match(/<!-- SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                const closes = text.match(/<!-- \/SYNC:[a-z-]+(?::reminder)? -->/g) || [];
                assert.equal(opens.length, closes.length, `${label} fences balanced`);
            }
            const reminders = text => (text.match(/<!-- SYNC:[a-z-]+:reminder -->/g) || []).length;
            assert.ok(reminders(validateText) >= 7, `tripwire: the validate reminders survive (${reminders(validateText)})`);
            assert.ok(reminders(executeText) >= 9, `tripwire: the execute reminders survive (${reminders(executeText)})`);
        }
    },
    {
        name: 'TC-PMM-009 no live source names the removed skills',
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
            assert.deepEqual(offenders, [], 'replace each with `plan --mode=review` / `plan --mode=validate`');
            // The allow-list is live: each allowed mention still exists and is the only one in its file
            const formerly = planSkill().split('\n').filter(line => REMOVED.some(name => line.includes(name)));
            assert.ok(formerly.length >= 1 && formerly.every(line => allowedMention('.claude/skills/plan/SKILL.md', line)), 'plan/SKILL.md names the removed commands only as "formerly"');
        }
    },
    {
        name: 'TC-PMM-010 plan description keeps the step-skill form and advertises the three merged modes',
        skip: SKIP,
        fn: () => {
            const match = /^description: '([^']*)'$/m.exec(planSkill());
            assert.ok(match, 'single-quoted frontmatter description');
            const description = match[1];
            assert.match(description, /^\[Planning\] Use when a workflow step or the user asks for \S/);
            assert.ok(description.length <= 250, `description is ${description.length} chars, over 250`);
            assert.match(description, /--mode=review/);
            assert.match(description, /\bvalidate\b/);
            assert.match(description, /\bexecute\b/);
            assert.match(description, /--mode=ci[^\n]*--mode=cro/);
        }
    },
    {
        name: 'TC-PMM-011 --mode=execute keeps every flag with its default, the BLOCKING gates, the verify-last order and the no-implicit-Git rule',
        skip: SKIP,
        fn: () => {
            const text = modeExecute();
            // Every flag, default off: no flags = the full spine run sequentially
            assert.match(text, /\| `--approval=\{on\\\|off\}` \| `on` \|/);
            assert.match(text, /\| `--tests=\{on\\\|off\}` \| `on` \|/);
            assert.match(text, /\| `--parallel=\{auto\\\|on\\\|off\}` \| `off` \|/);
            assert.match(text, /No flags = full 7-step spine/);
            assert.match(text, /Step 2 is SEQUENTIAL by default; wave fan-out is OPT-IN/);
            // The BLOCKING gates and the ordered spine survive
            assert.match(text, /## Step 5: User Approval ⏸ BLOCKING GATE/);
            assert.match(text, /Tests must be 100% passing with the mutation check clean, run ONCE after the static review/);
            assert.match(text, /\*\*Stop and wait\*\* - do not proceed until user responds/);
            for (let step = 0; step <= 6; step += 1) assert.match(text, new RegExp(`\\n## Step ${step}: `), `Step ${step} exists`);
            // Parallel metadata gating: a derived write set is never trusted under auto
            assert.match(text, /NEVER derives a write set from the plan's prose|NEVER derive write sets optimistically/);
            assert.match(text, /`--parallel=auto` fans out ONLY when every in-scope phase carries the `## Parallel Execution` block/);
            // Finishing never implies Git authority
            assert.match(text, /never authorize staging, committing, or pushing/);
            // Nested runs leave review and verify to the parent workflow
            assert.match(text, /Run Steps 0–2[^\n]*and Step 6/);
            // The parent skill states the flags and their defaults at the point of dispatch
            assert.match(planSkill(), /owns the `--approval`, `--tests` and `--parallel` flags \(no flag is set by default/);
        }
    },
    {
        name: 'TC-PMM-012 a plan creation reviews itself once, then chains into the validation interview as the setting directs, standalone or in a workflow with no validate step; a workflow with its own validate step, calling-skill, off, declined and no-user runs never start the interview, and inside a workflow the plan approval is always asked',
        skip: SKIP,
        fn: () => {
            // Given the chain section of the default plan skill, placed after the self-check
            const text = planSkill();
            const selfCheck = text.indexOf('\n## Self-Check Before Handoff\n');
            const start = text.indexOf('\n## Standalone Validation Chain\n');
            const guides = text.indexOf('<!-- PROTOCOL-GUIDES:START -->', start);
            assert.ok(selfCheck >= 0 && start > selfCheck && guides > start, 'the chain exists and follows the self-check');
            const chain = text.slice(start, guides);
            // Then the setting decides how it starts: auto runs it, prompt asks first, off skips it
            // The effective value is read through the settings loader, so a personal or checkout layer can turn it off
            assert.match(chain, /as the effective `plan\.validation\.mode` setting directs/);
            assert.match(chain, /merges the user, project and checkout settings files \(the later one wins\)/);
            assert.ok(chain.includes("require('./.claude/hooks/lib/ck-config-loader.cjs').loadConfig().plan.validation.mode"), 'the chain names the loader call');
            assert.equal(typeof require(path.join(REPO_ROOT, '.claude', 'hooks', 'lib', 'ck-config-loader.cjs')).loadConfig, 'function', 'that loader call exists');
            assert.doesNotMatch(chain, /framework settings file `\.claude\/\.ck\.json`/, 'the chain never reads the tracked file alone');
            assert.match(chain, /`auto` runs the interview without asking, `prompt` first asks one question, `Validate this plan with an interview now\?`, and `off` skips the interview/);
            // And the shipped default is auto, so a standalone plan validates without a question first
            const loader = read(REPO_ROOT, '.claude', 'hooks', 'lib', 'ck-config-loader.cjs');
            assert.match(loader, /validation: \{\s*mode: "auto"/);
            assert.equal(JSON.parse(read(REPO_ROOT, '.claude', '.ck.json')).plan.validation.mode, 'auto');
            assert.match(read(REPO_ROOT, '.claude', 'hooks', 'session-init.cjs'), /"CK_VALIDATION_MODE", validation\.mode \|\| "auto"/);
            // And every place that states the default agrees with the loader: the settings help and the option catalogue
            const help = read(REPO_ROOT, '.claude', 'scripts', 'ck-help.py');
            assert.match(help, /"mode": "auto",\s+\/\/ "auto" \| "prompt" \| "off"/);
            assert.match(help, /mode: \\"auto\\"` - [^\n]*\(default\)/);
            assert.doesNotMatch(help, /mode: \\"(prompt|off)\\"` - [^\n]*\(default\)/);
            assert.doesNotMatch(help, /Max questions to ask/);
            assert.match(help, /"maxQuestions": 8,\s+\/\/ Size of one question round, not a cap/);
            assert.match(help, /`maxQuestions` sizes one question round; rounds continue until every material decision is asked/);
            assert.doesNotMatch(help, /Always run validation interview|interview to confirm decisions\)"\),\n\s+\("Execute plan"/);
            assert.match(help, /\("Validate again", "`\/plan --mode=validate` \(only after a skipped interview or a changed plan\)"\)/);
            assert.match(read(REPO_ROOT, '.claude', 'scripts', 'lib', 'config-option-describes.cjs'), /default auto; read as the merged effective value/);
            // And it reads the validate reference in full; the interview body stays there
            assert.match(chain, /\*\*\[BLOCKING\]\*\* Read `references\/mode-validate\.md` in full and run its interview on the plan just saved/);
            assert.ok(!chain.includes('### Step 4: Interview User'), 'the chain does not inline the interview');
            // And plan creation, the plan's author, applies the answers and shows what it changed
            assert.match(chain, /edits `plan\.md` and any phase file for each action item the answers created/);
            assert.match(chain, /lists every edit under `### Applied Changes` there/);
            // And an edit that opens a new material decision is asked, never settled by the agent, and the chain never restarts itself
            assert.match(chain, /shows that list in the conversation/);
            assert.match(chain, /ask it as a further round through the same reference before closing, and repeat until applying answers creates no new one; never settle it yourself/);
            assert.match(chain, /re-check the Self-Check Before Handoff bullets once; do not start this chain again/);
            assert.match(chain, /keeps the plan `BLOCKED`: report it, never settle it by assumption/);
            // And the exits sit under a "do not start" heading, each one named
            const exitsAt = chain.indexOf('\nCheck these exits first, in this order. Do not start the chain when:\n');
            assert.ok(exitsAt > 0, 'the exit list has its heading');
            assert.doesNotMatch(chain, /Start the chain only when/i, 'the exit list is never inverted');
            assert.ok(exitsAt < chain.indexOf('1. **[BLOCKING]** Read `references/mode-validate.md`'), 'the exits are stated before the steps they guard');
            assert.match(chain, /an answer of no to the `prompt` question counts/);
            assert.match(chain, /From the project root, read the effective value/);
            const exits = chain.slice(exitsAt);
            assert.match(exits, /- \*\*A workflow owns this run and lists its own `\/plan --mode=validate` step\*\* — that step decides/);
            // A workflow with no validate step runs the chain inside its plan step, so the answers are applied there, and closes without the review question
            assert.match(exits, /When the workflow lists no validate step, run this chain inside the workflow too, so the answers are applied in this same step/);
            assert.match(chain, /3\. \*\*Close\*\* — return the plan path and summary with the review and validation results; ask no further question, standalone or inside a workflow/);
            // Inside a workflow the interview asks only open material decisions; with none open the plan records it and returns
            assert.match(exits, /Inside a workflow the interview asks only the material decisions the plan leaves open that the run's decision log does not already hold; an unapproved Plan Gate \(`Human approval: REQUIRED`\) counts as one, and its question is the plan approval\. With none open, write `Validation: not needed — no open material decision`/);
            // And no setting or decline skips the Plan Gate approval inside a workflow
            assert.match(exits, /Inside a workflow plan step this exit skips the decision interview only: an unapproved Plan Gate still gets its one approval question/);
            assert.match(exits, /- \*\*Another skill runs plan creation as one of its own steps\*\* — that skill owns what follows the plan/);
            assert.match(exits, /- \*\*The setting is `off`, or the request explicitly declines validation\*\* \(an answer of no to the `prompt` question counts\) — write `Validation: SKIPPED/);
            // And a context with no user channel records PENDING in the plan, hands back, and the receiving session resumes the chain
            assert.match(exits, /write `Validation: PENDING` under `## Validation Summary` in `plan\.md`/);
            assert.match(exits, /`Validation: PENDING — run the Standalone Validation Chain of the plan skill on <plan-path>`[^\n]*never self-answer it/);
            // The receiving session starts the chain from its top, so the setting and the exits apply to it too
            assert.match(exits, /runs this chain from its first paragraph for that plan, so the setting and these exits apply/);
            // The off-or-declined exit is listed before the no-user exit: a sub-agent under `off` records SKIPPED, not PENDING
            assert.ok(exits.indexOf('**The setting is `off`') < exits.indexOf('**This context cannot reach the user**'), 'off is checked before the no-user hand-back');
            // And both invocation contexts agree with the chain
            assert.match(text, /\*\*Workflow invocation:\*\*[^\n]*Run the validation interview only when the workflow lists no `\/plan --mode=validate` step of its own; when it does, that parent step owns validation/);
            assert.match(text, /\*\*Standalone invocation:\*\*[^\n]*run the \[Self-Review Pass\]\(#self-review-pass\); then run the \[Standalone Validation Chain\]\(#standalone-validation-chain\) as the `plan\.validation\.mode` setting directs/);
            assert.match(text, /the chain's own exits cover a plan that another skill creates as one of its steps/);
            // And review and execute stay separate invocations that creation never starts
            assert.match(text, /`--mode=review` and `--mode=execute` are separate invocations over an existing plan; plan creation never chains into them/);
            // And the validate reference knows the chained entry: the plan path, what the mode setting governs, and no second closing prompt
            const validate = modeValidate();
            assert.match(validate, /1\. Chained from a standalone plan creation → use the plan path that creation just saved/);
            assert.match(validate, /\*\*Chained from a standalone plan creation:\*\* present none of the options below/);
            assert.match(validate, /which applies the action items and closes with no further question\. A workflow plan step that runs the chain counts as chained/);
            assert.match(validate, /inside a workflow the setting never skips the Plan Gate approval question/);
            assert.match(validate, /decides only whether a standalone plan creation starts this interview/);
            assert.match(validate, /A direct `--mode=validate` invocation and a `\/plan --mode=validate` workflow step always run it/);
            assert.match(validate, /a workflow plan step that runs the chain counts as one \(`plan\/SKILL\.md` → Standalone Validation Chain/);
            assert.ok(validate.includes("require('./.claude/hooks/lib/ck-config-loader.cjs').loadConfig().plan.validation"), 'the range is read as the effective merged value');
            // A decision with one reading is recorded as an unasked assumption with its evidence, never as confirmed
            assert.match(validate, /is not asked: record it under `### Assumptions Not Asked` with that evidence/);
            assert.doesNotMatch(validate, /is not asked: record it under `### Confirmed Decisions`/);
            for (const line of validate.split('\n').filter(l => l.includes('offer implement/refine/skip'))) {
                assert.match(line, /direct invocation only/, 'every summary that offers next steps exempts the chained run');
            }
            // And the intake modes and the planner agent state the same hand-off
            for (const mode of ['mode-ci.md', 'mode-cro.md']) {
                assert.match(read(SKILLS, 'plan', 'references', mode), /standalone follows the Standalone Validation Chain in `plan\/SKILL\.md`, setting and exits included, after its Self-Review Pass, and asks no further review question/);
            }
            const planner = read(REPO_ROOT, '.claude', 'agents', 'planner.md');
            const owed = planner.split('\n').filter(l => /standalone (invocation )?follows the Standalone Validation Chain in `plan\/SKILL\.md`, setting and exits included/i.test(l));
            assert.equal(owed.length, 3, 'the summary, the handoff step and the closing reminder all point at the chain, with its setting and exits');
            assert.match(planner, /hand back `Validation: PENDING — run the Standalone Validation Chain of the plan skill on <plan-path>`/);
            assert.doesNotMatch(planner, /owes the (automatic )?validation interview/i, 'the planner never restates the chain without its setting');
            assert.doesNotMatch(planner, /Invoke only when the caller selected this gate/);
            // And a workflow plan step reviews its own plan too, unless its workflow lists its own plan review (round 5 M1):
            // the workflow branch of the invocation context, the post-save step and the planner agent all say so
            assert.match(text, /\*\*Workflow invocation:\*\*[^\n]*Run the \[Self-Review Pass\]\(#self-review-pass\) unless the workflow lists its own `\/plan --mode=review` step/);
            assert.match(text, /Persist the plan path and a short summary, then run the \[Self-Review Pass\]\(#self-review-pass\); its own list says when it is skipped/);
            assert.match(planner, /workflow invocation runs the same Self-Review Pass unless the workflow lists its own `\/plan --mode=review` step, then returns to its parent/);
            // And a calling skill that plans as its own step keeps its own contract
            assert.match(read(SKILLS, 'project-config', 'SKILL.md'), /recon → `\/plan` → execute/);
        }
    }
];

module.exports = { name: 'plan-modes-merge', tests };
