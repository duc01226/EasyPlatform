# Quality Gates & Concerns Checklist — owner contract for `/plan` and its review, validate and execute modes

> Single owner of this rule. Default plan creation writes the section; `--mode=review` audits it, `--mode=validate` interrogates it, `--mode=execute` walks it before completion. Those modes point here and never restate it.

## Purpose

A plan that lists phases but never lists what must be TRUE before the work is done lets the executor, reviewer and user each guess the bar. The checklist makes the bar explicit, task-specific and checkable: every quality gate and concern this task triggers, who proves it, and with what evidence. — why: an unlisted gate is silently skipped, and a generic list is ignored.

## Section shape (in `plan.md`, before the phases)

Heading: `## Quality Gates & Concerns Checklist`. One table, one row per gate or concern:

| # | Gate / concern | Applies? (YES/NO + one-line why) | How it will be verified | Evidence expected (command, test name, report path, file:line) | Owner phase |
| --- | --- | --- | --- | --- | --- |

Below the table, `### Open concerns and risks`: each unknown that could break a gate, the gate numbers it threatens, and the planned way to settle it (a named discovery step, a spike, a user decision, an owner to ask) — never "be careful".

Phases reference the gate numbers they own (`Gates: G3, G5`); every applicable row names an owner phase and every phase's acceptance line cites its gates. Number rows `G1…Gn` so references stay stable.

## Deriving the rows (task + repository evidence, never boilerplate)

Start from the task and the evidence you already gathered (config, references, lessons, code read), then run the candidate sweep below. Each candidate becomes a row: `YES — <why this task triggers it>` or `NO — <why it cannot apply>`. A NO row stays listed so the omission is deliberate and reviewable. Add task-specific rows the sweep does not name.

Candidate sweep (consider every one):

- Correctness and root cause (bugs: cause owner proven, preservation inventory, RED proof)
- Tests: new/changed behavior, regression, edge and boundary, error paths, intent-named tests that fail when the rule breaks
- Review: `changes-review` / `why-review` as the route requires
- Spec/doc sync: specs, reference docs, catalogs, generated mirrors
- Security, privacy, authorization
- Performance and scale: bounded loops/queries/results, 10× growth
- Data integrity, migration, rollback
- Backward compatibility and public contracts
- Cross-module and cross-service consumers (producers, consumers, shared contracts)
- UI/UX and accessibility (when a user-facing surface changes)
- AI-feature gates (when a model call, prompt, agent, tool, retrieval or eval changes)
- Observability and operability
- Portability (Windows, macOS, Linux; no hardcoded paths or shell assumptions)
- Standalone behavior of skills/tools (each mode/tool works called directly)
- Maintainability: one owner per rule, next plausible change and its edit-site count
- Project-specific gates named by `docs/project-config.json`, its reference docs and `lessons.md` for the touched paths

## Row quality bar

- Every YES row names a verification method that can be executed or inspected and the exact evidence that proves it (a command, a named test, a report path, a `file:line` already known). Future assertions are a stated test obligation, never a fabricated `file:line`.
- "Be careful", "ensure quality", "handle edge cases" are not methods. Rewrite as an observable check or mark NOT VERIFIABLE with the open concern that settles it.
- No two tasks share the same checklist: rows, reasons and evidence are derived from THIS task. A trivial task has a short list, not a padded one.
- The checklist never schedules per-phase test or review runs: verification rows point at the single final verify gate (`SYNC:verify-last-order`) or the static review.

## Mode duties (read only your mode's duty)

- **Review (`--mode=review`):** a finding when the section is missing (at least MEDIUM); generic, meaning the same rows regardless of task (MEDIUM); has a YES row with no verification method or evidence (MEDIUM); or omits a gate the task clearly triggers (HIGH when the concern is high-risk — security/data loss/public contract/authorization/irreversible migration/accessibility on a UI change — else MEDIUM; a behavior change with no test row is HIGH). Severity follows the severity rubric; cite the plan location and the triggering task evidence. Read-only, one round: report the finding, never edit the plan.
- **Validate (`--mode=validate`):** probe the checklist with critical questions: which gate is most likely to fail and why; what evidence would change a PASS/NO verdict; which row was marked NO too quickly; which open concern has no settling step. Questions stay genuine choices via `ask user question tool`. A plan with no checklist gets one question (add a task-derived checklist now, or accept the exemption); validate records the answer in `## Validation Summary` — "add now" as an action item routed to `/plan` — and never edits the plan body.
- **Execute (`--mode=execute`):** the walk is its own step that runs in standalone AND workflow-nested runs. Before reporting done, walk the rows owned by the CURRENT phase and every EARLIER phase (phase-less and global rows only when the final phase runs) and record `PASS` / `FAIL` / `N/A` with the evidence observed; a row owned by a LATER phase is recorded `DEFERRED-BY-PLAN: phase <n>` (owner phase named — not a FAIL, not blocking), and the final phase's run must find no `DEFERRED-BY-PLAN: phase <n>` row from an earlier phase left unresolved. A FAIL or an applicable walked row with no evidence blocks completion until fixed at the owner and re-proved; `N/A` needs the plan's NO reason still to hold. A nested run carries rows whose proof belongs to a parent step as `PENDING-PARENT: <step> — evidence expected: …`; the parent workflow's closing step (`workflow-end` step 0) reads the plan's checklist and closes each such row `PASS` or `FAIL`, and refuses to close while any `DEFERRED-BY-PLAN: phase <n>` row is still unresolved (named as `unfinished plan phases: <n…>`; the user continues those phases or accepts them as-is with a recorded reason). A standalone `--tests=off` run records rows proved by the skipped verify as `DEFERRED-BY-PLAN`. A plan with no checklist section gets a minimal one derived now, recorded in the completion report, before the walk.
