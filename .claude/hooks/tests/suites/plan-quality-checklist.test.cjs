/**
 * Plan Quality Checklist Test Suite
 *
 * Business intent: a plan must list, for THIS task, every quality gate and concern that must be verified
 * and satisfied before the work is done, so the executor, reviewer and user hold the work to one explicit,
 * checkable bar. Default plan creation writes the `## Quality Gates & Concerns Checklist` section before
 * the phases; `--mode=review` audits it; `--mode=validate` probes it; `--mode=execute` walks it before
 * reporting done. One reference (`plan/references/plan-quality-checklist.md`) owns the rule.
 *
 * Coverage:
 *   TC-PQC-001 — default plan text requires the section, all six columns, open concerns, NO-rows with a
 *                reason and per-phase gate references, with a BLOCKING read line for the owner reference.
 *   TC-PQC-002 — the owner reference keeps the column shape, the candidate sweep, the row quality bar and
 *                the three mode duties.
 *   TC-PQC-003 — review mode audits the checklist: missing / generic / evidence-less / omitted-gate
 *                findings with severities, inside default read-only or caller-owned fix-loop contracts.
 *   TC-PQC-004 — validate mode probes the checklist with critical questions and keeps the interview.
 *   TC-PQC-005 — execute mode walks the checklist before completion and a FAIL or unverified applicable
 *                row blocks; the flags and approval gate are unchanged.
 *   TC-PQC-006 — the canonical plan-quality / plan-granularity protocols carry the checklist and every
 *                inlined body copy equals the canonical text.
 *
 * Portability: reads only files shipped inside `.claude/`, resolved from this file's location; no process,
 * env, project config or git state, so it holds in any adopting project on Windows, macOS and Linux.
 */

'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const CLAUDE_DIR = path.resolve(__dirname, '..', '..', '..');
const SKILLS = path.join(CLAUDE_DIR, 'skills');
const read = (...parts) => fs.readFileSync(path.join(...parts), 'utf8').replace(/\r\n/g, '\n');
const planSkill = () => read(SKILLS, 'plan', 'SKILL.md');
const planRef = (name) => read(SKILLS, 'plan', 'references', name);
const checklistRef = () => planRef('plan-quality-checklist.md');

const HEADING = '## Quality Gates & Concerns Checklist';
const COLUMNS = ['#', 'Gate / concern', 'Applies? (YES/NO + one-line why)', 'How it will be verified', 'Evidence expected (command, test name, report path, file:line)', 'Owner phase'];

/** Body of a `## {heading}` (level-2) section up to the next level-2 heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}`);
    assert.ok(start >= 0, `section "## ${heading}" must exist`);
    const next = text.indexOf('\n## ', start + 4);
    return text.slice(start, next < 0 ? text.length : next);
}

/** Text of the `SYNC:{tag}` block body (between the canonical `## SYNC:{tag}` heading and the next rule). */
function canonicalBody(tag) {
    const text = read(SKILLS, 'shared', 'sync-inline-versions.md');
    const start = text.indexOf(`\n## SYNC:${tag}\n`);
    assert.ok(start >= 0, `canonical SYNC:${tag} exists`);
    const end = text.indexOf('\n---\n', start);
    return text.slice(start + `\n## SYNC:${tag}\n`.length, end).trim();
}

const tests = [
    {
        name: 'TC-PQC-001 default plan creation requires the task-derived Quality Gates & Concerns Checklist before the phases',
        fn: () => {
            // Given the default plan skill text
            const text = planSkill();
            const contract = section(text, 'Plan Artifact Contract');
            // Then the contract requires the section, placed before the phases
            assert.ok(contract.includes(HEADING), 'contract names the checklist section heading');
            assert.ok(contract.indexOf('Quality Gates & Concerns Checklist') < contract.indexOf('Execution phases'), 'the checklist comes before the execution phases');
            // And every column of the row shape is present
            for (const column of COLUMNS.slice(1)) assert.ok(contract.includes(column), `contract keeps column: ${column}`);
            // And open concerns, deliberate NO rows, derivation from evidence and per-phase gate references are required
            assert.match(contract, /### Open concerns and risks/);
            assert.match(contract, /`NO — <reason>`/);
            assert.match(contract, /not boilerplate/);
            assert.match(contract, /each phase cites the gate numbers it owns/);
            // And a BLOCKING read line points to the owner reference, which exists
            assert.match(contract, /\*\*\[BLOCKING\]\*\* Read `references\/plan-quality-checklist\.md` in full before writing this section/);
            assert.ok(fs.existsSync(path.join(SKILLS, 'plan', 'references', 'plan-quality-checklist.md')), 'owner reference exists');
            // And the self-check and closing reminders keep the gate
            assert.match(section(text, 'Self-Check Before Handoff'), /\*\*Checklist:\*\*[^\n]*not generic/);
            assert.match(text, /\*\*MUST ATTENTION\*\* write a task-specific `## Quality Gates & Concerns Checklist` before the phases/);
            // And default creation stays free of the mode bodies (standalone-safe: it only gained the section)
            assert.ok(!text.includes('Finding validation and verdict'), 'default plan text carries no review body');
            assert.match(text, /Plan creation never runs `--mode=review`/);
        }
    },
    {
        name: 'TC-PQC-002 the owner reference keeps the row shape, candidate sweep, quality bar and the three mode duties',
        fn: () => {
            const text = checklistRef();
            // Given the heading and the six-column table header
            assert.ok(text.includes(HEADING), 'reference names the section heading');
            assert.ok(text.includes(`| ${COLUMNS.join(' | ')} |`), 'the six-column header is pinned verbatim');
            // Then the candidate sweep covers the concerns a task can trigger
            for (const concern of ['Correctness and root cause', 'Tests:', 'Review:', 'Spec/doc sync', 'Security, privacy, authorization', 'Performance and scale',
                'Data integrity, migration, rollback', 'Backward compatibility and public contracts', 'Cross-module and cross-service consumers', 'UI/UX and accessibility',
                'AI-feature gates', 'Observability and operability', 'Portability', 'Standalone behavior', 'Maintainability', 'Project-specific gates']) {
                assert.ok(text.includes(concern), `candidate sweep lists: ${concern}`);
            }
            // And non-applicable rows stay listed with a reason and every YES row is checkable
            assert.match(text, /A NO row stays listed so the omission is deliberate/);
            assert.match(text, /Every YES row names a verification method/);
            assert.match(text, /"Be careful"[^\n]*are not methods/);
            // And the section lives in the plan before the phases, with open concerns and gate numbers
            assert.match(text, /### Open concerns and risks/);
            assert.match(text, /Phases reference the gate numbers they own/);
            // And the reference carries all three mode duties under one owner
            for (const duty of ['**Review (`--mode=review`):**', '**Validate (`--mode=validate`):**', '**Execute (`--mode=execute`):**']) assert.ok(text.includes(duty), `mode duty present: ${duty}`);
        }
    },
    {
        name: 'TC-PQC-003 --mode=review flags a missing, generic, evidence-less or gate-omitting checklist with rubric severities, with default read-only and bounded fix-loop ownership',
        fn: () => {
            const review = planRef('mode-review.md');
            // The concise review loads the authoritative rubric instead of duplicating it.
            assert.match(review, /its Review duty owns the defect classes and severities/);
            assert.match(review, /\*\*\[BLOCKING\]\*\* Read `references\/plan-quality-checklist\.md` in full before the core review/);
            const owner = checklistRef();
            for (const defect of [/section is missing/, /generic, meaning the same rows regardless of task/, /YES row with no verification method or evidence/, /omits a gate the task clearly triggers/]) {
                assert.match(owner, defect, `authoritative review duty retains ${defect}`);
            }
            // And the owner reference states the same severities once
            const duty = checklistRef();
            assert.match(duty, /missing \(at least MEDIUM\)/);
            assert.match(duty, /HIGH when the concern is high-risk/);
            assert.match(duty, /a behavior change with no test row is HIGH/);
            // Checklist quality remains enforced in either mode, with one fixing owner.
            assert.match(review, /Review-only and caller-owned leaves keep the target read-only/);
            assert.match(review, /one shared three-round budget and the LOW\/extension rules/);
            assert.match(review, /caller-owned leaves never start another loop or edit/);
            assert.match(review, /Fix-loop repairs validated findings, then repeats the complete review/);
        }
    },
    {
        name: 'TC-PQC-004 --mode=validate probes the checklist with critical questions and keeps the ask user question tool interview',
        fn: () => {
            const validate = planRef('mode-validate.md');
            // Given the question-generation step
            assert.match(validate, /Quality-gates probes \(BLOCKING — read `references\/plan-quality-checklist\.md` in full first/);
            // Then it asks which gate is most likely to fail, what evidence would change a verdict, what was marked NO too quickly
            assert.match(validate, /which gate is most likely to fail/);
            assert.match(validate, /what evidence would change a verdict/);
            assert.match(validate, /which NO row was marked too quickly/);
            assert.match(validate, /which open concern has no settling step/);
            // And the probes are genuine decisions with options, inside the configured question range
            assert.match(validate, /each with 2-4 concrete options/);
            assert.match(validate, /Count these inside the `questions` range/);
            // And the interview shape is unchanged
            assert.match(validate, /Use `ask user question tool` — NEVER skip or auto-answer/);
            assert.match(validate, /Group related questions \(max 4 per tool call\)/);
            // And a plan with no checklist: the question is asked, but the answer is RECORDED in the Validation Summary, never an edit of the plan
            assert.match(validate, /Validate never edits the plan beyond `## Validation Summary`: record the answer there — "add now" becomes an action item routed to `\/plan`/);
            assert.match(checklistRef(), /validate records the answer in `## Validation Summary`[^\n]*never edits the plan body/);
        }
    },
    {
        name: 'TC-PQC-005 --mode=execute walks every checklist row before done and a FAIL or unverified applicable row blocks completion',
        fn: () => {
            const execute = planRef('mode-execute.md');
            const step4 = execute.slice(execute.indexOf('## Step 4: Verify'), execute.indexOf('\n---\n', execute.indexOf('## Step 4: Verify')));
            const walkStart = execute.indexOf('\n## Checklist Walk (own step');
            assert.ok(walkStart >= 0, 'the walk is its own level-2 section, not a clause inside Step 4');
            const walk = execute.slice(walkStart, execute.indexOf('\n---\n', walkStart));
            // Given the walk is its own step, Step 4 (skipped when nested) does not carry it
            assert.doesNotMatch(step4, /Checklist walk/i, 'Step 4 holds no checklist walk');
            assert.ok(walkStart > execute.indexOf('## Step 4: Verify') && walkStart < execute.indexOf('## Step 5: User Approval'), 'the walk sits between Step 4 and Step 5');
            // And it runs in BOTH standalone and workflow-nested runs, and under --tests=off
            assert.match(walk, /runs in EVERY run — after Step 4 in a standalone run, after Step 2 in a workflow-nested run \(Steps 3–5 skipped\) — and under `--tests=off`/);
            assert.match(execute, /Run Steps 0–2 \(detect, read, implement code \+ its tests\), the \[Checklist Walk\]\(#checklist-walk-own-step--standalone-and-workflow-nested\)/, 'the nested-mode bullet runs the walk');
            // Then it reads the owner reference, records PASS / FAIL / N/A with evidence per applicable row
            assert.match(walk, /\*\*\[BLOCKING\]\*\* read `references\/plan-quality-checklist\.md` in full before the walk/);
            assert.match(walk, /`PASS` \/ `FAIL` \/ `N\/A` with the evidence observed/);
            // And a FAIL or an applicable row with no evidence blocks completion
            assert.match(walk, /A FAIL, or an applicable row with no evidence, blocks completion/);
            // And nested runs carry parent-owned rows forward as PENDING-PARENT with the evidence expected, and the parent's closing step closes them
            assert.match(walk, /`PENDING-PARENT: <step> — evidence expected: <the row's evidence>`/);
            assert.match(walk, /`workflow-end` step 0 reads the plan's checklist and closes each `PENDING-PARENT` row/);
            assert.match(walk, /`DEFERRED-BY-PLAN/, 'a standalone --tests=off run has no parent to close its rows');
            assert.doesNotMatch(execute, /owned by <parent step>/, 'no row is stamped with an owner that nothing reads');
            // And finalize and the blocking-gate list repeat the block, with no parallel extra numbered step
            assert.match(execute, /the Checklist Walk has no FAIL or unverified applicable row/);
            assert.doesNotMatch(execute, /the Step 4 checklist walk/);
            assert.match(execute, /every applicable Quality Gates & Concerns Checklist row PASS with evidence \(FAIL or unverified blocks completion\)/);
            assert.doesNotMatch(execute, /\n## Step 7/);
            // And the walk is scoped to the phase being run: execute runs ONE phase per run, so a row owned by a LATER phase can never have
            // evidence yet and is DEFERRED (not a FAIL, not blocking); the final phase must find none left unresolved
            assert.match(walk, /rows of the plan's `## Quality Gates & Concerns Checklist` owned by the CURRENT or an EARLIER phase/);
            assert.match(walk, /a row owned by a LATER phase is recorded `DEFERRED-BY-PLAN: phase <n>` \(not a FAIL, not blocking\), and the final phase finds none left unresolved/);
            assert.doesNotMatch(walk, /walk every row of the plan's/, 'the walk no longer walks every row regardless of phase');
            const step6 = execute.slice(execute.indexOf('## Step 6: Finalize'));
            assert.match(step6, /a `PENDING-PARENT` or `DEFERRED-BY-PLAN` row is carried, not unverified/, 'Step 6 names both carried dispositions');
            // And the walk is a seeded task in the standalone list and the TaskCreate initialization
            assert.match(execute, /the \*\*Checklist Walk\*\* \(own task, after Step 4\)/, 'standalone task list seeds the walk');
            assert.match(execute, /and the \*\*Checklist Walk\*\* task \(between Step 4 and Step 5/, 'TaskCreate initialization seeds the walk');
            // And the owner reference states the same duty once
            assert.match(checklistRef(), /walk the rows owned by the CURRENT phase and every EARLIER phase \(phase-less and global rows only when the final phase runs\)/);
            assert.match(checklistRef(), /a row owned by a LATER phase is recorded `DEFERRED-BY-PLAN: phase <n>`[^.]*not a FAIL, not blocking[^.]*final phase's run must find no `DEFERRED-BY-PLAN: phase <n>` row from an earlier phase left unresolved/);
            assert.match(checklistRef(), /the walk is its own step that runs in standalone AND workflow-nested runs/);
            assert.match(checklistRef(), /`PENDING-PARENT: <step> — evidence expected: …`; the parent workflow's closing step \(`workflow-end` step 0\)/);
            // And workflow-end reads the plan's checklist as OPTIONAL evidence only (no new gate when no checklist exists)
            const workflowEnd = read(SKILLS, 'workflow-end', 'SKILL.md');
            assert.match(workflowEnd, /\*\*Plan checklist rows\*\* \(optional evidence input, only when a `\/plan --mode=execute` occurrence ran nested in this run AND its `plan\.md` carries a `## Quality Gates & Concerns Checklist`; otherwise record `N\/A — no plan checklist` and add no gate\)/);
            assert.match(workflowEnd, /`PENDING-PARENT: <step> — evidence expected: …`/);
            // And a nested run covers ONE phase, so unfinished later phases surface at close instead of passing silently:
            // workflow-end step 0 names unresolved DEFERRED-BY-PLAN phase rows and refuses to close (like missing gate evidence);
            // no checklist -> no change; the execute duty in the owner reference states the same
            assert.match(workflowEnd, /still recorded `DEFERRED-BY-PLAN: phase <n>` at close: name them as `unfinished plan phases: <n…>` and treat them like missing gate evidence — the close is refused and surfaced via `ask user question tool`/, 'workflow-end step 0 refuses to close over unfinished plan phases');
            assert.match(workflowEnd, /Continue the remaining phases[^\n]*Accept as-is — I will record the reason/, 'the unfinished-phase question offers continue or accept-with-reason');
            assert.match(workflowEnd, /No plan checklist → record `N\/A — no plan checklist` for this scan too/, 'no checklist -> no change');
            assert.match(checklistRef(), /refuses to close while any `DEFERRED-BY-PLAN: phase <n>` row is still unresolved \(named as `unfinished plan phases: <n…>`/, 'the Execute duty mirrors the workflow-end rule');
            // And the flags, approval gate and verify-last order are unchanged
            assert.match(walk, /never changes `--approval`\/`--tests`\/`--parallel`, and adds no per-phase test run/);
            assert.match(execute, /## Step 5: User Approval ⏸ BLOCKING GATE/);
            assert.match(execute, /\*\*Stop and wait\*\* - do not proceed until user responds/);
        }
    },
    {
        name: 'TC-PQC-006 the plan-quality and plan-granularity protocols carry the checklist and every copy equals the canonical text',
        fn: () => {
            const quality = canonicalBody('plan-quality');
            // Given the canonical plan-quality protocol
            assert.match(quality, /13\. \*\*Quality gates & concerns checklist:\*\* Before the phases, write `## Quality Gates & Concerns Checklist`/);
            assert.match(quality, /list non-applicable gates as `NO — <reason>`/);
            assert.match(quality, /plan-quality-checklist\.md/);
            const granularity = canonicalBody('plan-granularity');
            assert.match(granularity, /acceptance\/quality gate citing the plan's checklist gate numbers it owns/);
            // Then the published projection equals the canonical body
            assert.equal(read(SKILLS, 'shared', 'protocols', 'plan-quality.md').trim(), quality, 'protocol file equals canonical plan-quality');
            assert.equal(read(SKILLS, 'shared', 'protocols', 'plan-granularity.md').trim(), granularity, 'protocol file equals canonical plan-granularity');
            // And the full-body carrier (planner agent) equals it too
            const planner = read(CLAUDE_DIR, 'agents', 'planner.md');
            const fenced = (tag) => {
                const open = `<!-- SYNC:${tag} -->`;
                const start = planner.indexOf(open);
                const end = planner.indexOf(`<!-- /SYNC:${tag} -->`);
                assert.ok(start >= 0 && end > start, `planner carries SYNC:${tag}`);
                return planner.slice(start + open.length, end).trim();
            };
            assert.equal(fenced('plan-quality'), quality, 'planner plan-quality body equals canonical');
            assert.equal(fenced('plan-granularity'), granularity, 'planner plan-granularity body equals canonical');
        }
    }
];

module.exports = { name: 'plan-quality-checklist', tests };
