'use strict';

/**
 * Plan-speed contract — plans stay concise, executable and verify on the settled tree.
 *
 * Business intent: a plan records decisions, affected owners, bounded execution-time discovery, risks and
 * final gates without replaying implementation. It carries no per-phase test/review/close phases or test
 * run; tests are written with implementation, static review runs after all implementation, and verification
 * runs once on the settled tree (`SYNC:verify-last-order`).
 * Invariants guarded:
 *   - plan/SKILL.md § Plan Artifact Contract: decision/boundary altitude, bounded discovery, one artifact,
 *     metadata-gated waves and verify-last final gates;
 *   - plan/references/mode-execute.md (plan --mode=execute): Step 3 = static review, Step 4 = the one verify, both once over the whole
 *     changeset; workflow-nested runs stop after implementation;
 *   - plan/references/mode-review.md: checks verify-last order and real dependency boundaries in each complete pass;
 *   - the verify-last protocol reaches every owner skill and the review workflow defers its tests.
 *
 * Portability: reads only files that ship inside `.claude/`, resolved from this file's own
 * location. It spawns no process and reads no environment, home-dir, project config or git state,
 * so it holds unchanged in any adopting project on Windows, macOS and Linux.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SKILLS_DIR = path.resolve(__dirname, '..', '..', '..', 'skills');
const CLAUDE_DIR = path.dirname(SKILLS_DIR);

const read = rel => fs.readFileSync(path.join(SKILLS_DIR, ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');
const readClaude = rel => fs.readFileSync(path.join(CLAUDE_DIR, ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');

/** Body of the `## {heading}` section, up to the next level-2 heading. */
function section(text, heading) {
    const start = text.indexOf(`\n## ${heading}`);
    assert.ok(start >= 0, `section "## ${heading}" must exist`);
    const next = text.indexOf('\n## ', start + 4);
    return text.slice(start, next < 0 ? text.length : next);
}

const PLAN_SECTION = 'Plan Artifact Contract';

const tests = [
    {
        name: 'TC-PSC-001 plan skill keeps decision-and-boundary altitude with bounded discovery',
        fn: () => {
            // Given the plan artifact contract
            const body = section(read('plan/SKILL.md'), PLAN_SECTION);
            // Then each phase carries decisions, owners, bounded discovery and an observable gate
            assert.match(body, /Decisions already fixed/);
            assert.match(body, /Areas\/owners/);
            assert.match(body, /Discovery before edit[\s\S]*bounded source questions[\s\S]*stop condition/);
            assert.match(body, /Acceptance\/quality gate[\s\S]*observable evidence/);
            // And method-level implementation replay is explicitly rejected
            assert.match(body, /Do not decompose into line edits, symbol-by-symbol instructions[\s\S]*per-file pseudo-implementation/);
        }
    },
    {
        name: 'TC-PSC-002 plan skill uses few real phases and metadata-gated parallelism',
        fn: () => {
            const body = section(read('plan/SKILL.md'), PLAN_SECTION);
            assert.match(body, /Use the fewest phases that express real dependency or ownership boundaries/);
            assert.match(body, /`PAR` with a disjoint write set, or `SEQ` with the exact dependency/);
            assert.match(body, /Split only for a real dependency, independently verifiable outcome, or disjoint write ownership/);
            assert.match(body, /List phase waves only when `PAR` phases have proven disjoint write sets/);
        }
    },
    {
        name: 'TC-PSC-003 plan skill has one compact artifact and verify-last gates',
        fn: () => {
            const plan = read('plan/SKILL.md');
            assert.match(plan, /Write `plan\.md` under the configured plans root\. Use this compact shape/);
            assert.match(plan, /After every implementation phase: run static\/type\/compile checks only when useful; no test suite, mutation run, or review/);
            assert.match(plan, /After all implementation: run one whole-change static review with tests deferred/);
            assert.match(plan, /Then run the full affected test suite once plus required mutation\/red proof/);
            assert.equal(fs.existsSync(path.join(SKILLS_DIR, 'plan', 'references', 'engine-plan-organization.md')), false,
                'the removed implementation-heavy plan engine must not return');
        }
    },
    {
        name: 'TC-PSC-004 plan --mode=execute reviews statically first, then verifies once; nested runs leave both to the parent workflow',
        fn: () => {
            // Given the plan skill's execute mode
            const text = read('plan/references/mode-execute.md');
            // When a multi-phase run executes
            // Then per phase only compile runs, no test run of any kind
            assert.match(text, /\*\*Multi-phase run\*\*[^\n]*per phase, run only type-check\/compile — no test run of any kind/);
            // And Step 3 (static review) and Step 4 (the one verify) run once after the last wave over the whole changeset
            assert.match(text, /Step 3 and Step 4 run ONCE after the last wave, over the whole changeset/);
            assert.match(section(text, 'Step 3: Code Review (static)'), /multi-phase run: once, after the last wave, over the whole changeset[\s\S]*runs NO test suite/);
            const verify = section(text, 'Step 4: Verify (tests + mutation check, once)');
            assert.match(verify, /ONCE over the whole changeset \(multi-phase run: once, after Step 3\)/);
            // And the verify owns the mutation check and re-runs the review only when it edited something
            assert.match(verify, /main session runs the mutation check[^\n]*on every changed core-logic line/);
            assert.match(verify, /if fixing in this step edited ANY source or test file, re-run Step 3/);
            // And the review comes before the verify in the file's own order
            assert.ok(text.indexOf('## Step 3: Code Review (static)') < text.indexOf('## Step 4: Verify (tests + mutation check, once)'), 'Step 3 review precedes Step 4 verify');
            // And the --approval=off flag bullet carries the same batching
            assert.match(text, /`--approval=off` → Step 5[^\n]*after the last phase, run Step 3 and Step 4 once over the whole changeset/);
            // And a one-phase run keeps its per-phase gates
            assert.match(text, /A one-phase run is unchanged\./);
            // And inside a parent workflow it runs Steps 0-2 and 6 only — the parent's review and verify are Steps 3-4
            const nested = section(text, 'Workflow-Nested Mode');
            assert.match(nested, /Run Steps 0–2[^\n]*and Step 6/);
            assert.match(nested, /SKIP Step 3 \(`code-reviewer`\), Step 4 \(`tester`\) and Step 5 \(approval\)/);
        }
    },
    {
        name: 'TC-PSC-005 plan --mode=review checks verify-last order and dependency-shaped phases',
        fn: () => {
            // Given the plan skill's review-mode one-pass core review
            const text = read('plan/references/mode-review.md');
            // Then it guards both the final verification order and phase/dependency ceremony
            assert.match(text, /Verify-last \| Are tests authored with implementation and executed only after all implementation and static review\?/);
            assert.match(text, /Dependency order \| Do phases reflect real dependencies or disjoint ownership rather than ceremony\?/);
            assert.match(text, /In review-only, run the full domain pass once and hand off/);
            assert.match(text, /one shared three-round budget and the LOW\/extension rules/);
            assert.match(text, /caller-owned leaves never start another loop or edit/);
        }
    },
    {
        name: 'TC-PSC-006 the verify-last protocol is defined once and reaches every owner skill and the review workflow',
        fn: () => {
            // Given the shipped protocol projection
            const protocol = read('shared/protocols/verify-last-order.md');
            // Then it orders build, static review, one verify with mutation check, fix-and-re-run, conditional re-review
            assert.match(protocol, /Build[\s\S]*Review and fix, static[\s\S]*Verify once[\s\S]*Fix and re-run until green[\s\S]*Re-review only if step 4 edited anything/);
            assert.match(protocol, /Green counts only on the final tree/);
            // And the verify <-> re-review alternation is bounded, and the mutation check never uses destructive git
            assert.match(protocol, /alternation is capped at 3 turns[^\n]*escalates via `ask user question tool`/);
            assert.match(protocol, /NEVER `git checkout`, `restore`, `reset` or `stash` on the working tree/);
            // And the skills that run tests on their own initiative defer to the single verify
            assert.match(read('integration-test/SKILL.md'), /Verify-last exception[\s\S]*WRITES the tests and does NOT run them/);
            assert.match(read('code-simplifier/SKILL.md'), /verify statically instead[\s\S]*run none/);
            // And every owner skill carries it (guide line or inline body)
            for (const skill of ['plan', 'feature-implement', 'fix', 'test', 'integration-test',
                'workflow-review-changes', 'workflow-feature', 'workflow-bugfix', 'workflow-refactor',
                'workflow-implement-spec', 'workflow-big-feature', 'workflow-greenfield-init', 'start-workflow']) {
                assert.match(read(`${skill}/SKILL.md`), /verify-last-order/, `${skill} must reference the verify-last protocol`);
            }
            // And the plan skill's execute mode keeps the verify-last order in its own reference
            assert.match(read('plan/references/mode-execute.md'), /SYNC:verify-last-order/, 'plan --mode=execute must reference the verify-last protocol');
            // And the review workflow can defer its own test run to the parent's single verify
            assert.match(read('workflow-review-changes/SKILL.md'), /`--tests=prove` is default for standalone review/);
            assert.match(read('workflow-review-changes/SKILL.md'), /`--tests=defer` keeps this review static and assigns execution to the parent's later verification step; propagate it to child reviews/);
            // And the close refuses a green run older than the last edit
            assert.match(read('workflow-end/SKILL.md'), /green run must be on the final tree/);
        }
    },
    {
        name: 'TC-PSC-007 the verify-last gaps found in review stay closed: refactor pre-change run, mutation safety and evidence, approval trigger, fix order, final-gate mapping',
        fn: () => {
            // Given the canonical protocol
            const protocol = read('shared/protocols/verify-last-order.md');
            // Then a refactor may run its characterization tests once on the unrefactored tree
            assert.match(protocol, /ONE targeted run of any characterization tests written before the code moves/);
            // And the mutation check snapshots the file, proves a clean restore, and never uses destructive git
            assert.match(protocol, /copy the file to `tmp\/` and restore from that copy[^\n]*clean diff/);
            assert.match(protocol, /NEVER `git checkout`, `restore`, `reset` or `stash`/);
            // And the main session owns the mutation check when no editing verify step runs
            assert.match(protocol, /the main session when no such step runs/);
            // And integration-test carries the same characterization exception
            assert.match(read('integration-test/SKILL.md'), /characterization tests written BEFORE a refactor moves code are proven green on the unrefactored tree before it moves — inside `workflow-refactor` by its one baseline run \(this skill does not run them again\), elsewhere by ONE targeted run/);
            // And the mutation result is part of the verify report and of the close evidence
            assert.match(read('integration-test/references/mode-verify.md'), /mutation-check result \(mutants killed n\/n/);
            assert.match(read('workflow-end/SKILL.md'), /cite the mutation-check result/);
            // And the approval prompt at the close keys on a nested plan --mode=execute in the task list, never on the deviation log
            assert.match(read('workflow-end/SKILL.md'), /ran nested in this run[^\n]*NOT the deviation log/);
            // And standalone /fix orders the verify after the reviews in every place it states the order
            const fix = read('fix/SKILL.md');
            const fixLine = re => fix.split('\n').find(line => re.test(line)) || '';
            assert.match(fixLine(/^- \*\*No-flag spine:\*\*/), /verify once/, 'fix no-flag spine states the verify-once step');
            assert.match(fixLine(/\*\*Final standalone order:\*\*/), /verify once/, 'fix final standalone order states the verify-once step');
            assert.match(fixLine(/^> \*\*Standalone Review Gate/), /verify once/, 'fix standalone review gate states the verify-once step');
            assert.match(fixLine(/standalone \(not `nested=true`[^)]*\) self-assembles the spine/), /verify once/, 'fix closing reminder states the verify-once step');
            // And the numbered standalone todo spine ends with the verify-once item after the reviews
            assert.match(fixLine(/^> 6\. \*\*Verify once\*\*/), /final todo, after every review[^\n]*regression tests once, then the mutation check/, 'fix numbered spine has a verify-once item');
            // And the review-fix step re-runs its tests only when no later verify step exists
            assert.match(fix, /NOT run here when the caller has a later verify step or passes `--tests=defer`[^\n]*re-run the affected tests/);
            // And the custom-simple route examples put the review before the test
            assert.doesNotMatch(read('start-workflow/SKILL.md'), /investigate → fix → test → changes-review/);
            assert.doesNotMatch(read('shared/workflow-first-gate.md'), /investigate → fix → test → changes-review/);
            // And plan --mode=execute maps the plan's final gate phase onto Steps 3-4 instead of running a second review/verify in Step 2
            assert.match(read('plan/references/mode-execute.md'), /ONE final gate phase[^\n]*never a second run inside Step 2/);
        }
    },
    {
        name: 'TC-PSC-008 development guidance cannot reintroduce micro-phases or per-phase verification',
        fn: () => {
            const rules = readClaude('docs/development-rules.md');
            const body = section(rules, 'Task Decomposition & Iterative Quality');
            assert.match(body, /fewest outcome phases/);
            assert.match(body, /Do not force file-count, hour, or method-level slices/);
            assert.match(body, /review the settled whole change, then run the affected tests once at the final verify gate/);
            assert.doesNotMatch(body, /<=5 files|<=3h|No phase >5 files|plan → implement → review → fix → verify/);
        }
    }
];

module.exports = { name: 'plan-speed-contract', tests };
