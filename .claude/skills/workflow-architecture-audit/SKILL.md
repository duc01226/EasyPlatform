---
name: workflow-architecture-audit
version: 1.0.0
description: "[Workflow] Audit project architecture, scalability and production readiness without changing code; deliver one consolidated health report."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-architecture-audit` together with this skill. Call [`/start-workflow workflow-architecture-audit`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate`](../investigate/SKILL.md) (optional; conditional) → [`/architecture --mode=full --defer=validate`](../architecture/SKILL.md) (gate) → [`/why-review`](../why-review/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Review (3; exit review-converged) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:d2ba3c5cc58b73dc512e13ce20df04a43946c7d9cc7d817ae131c88480e0107a -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Audit architecture, scalability and production readiness without changing code; deliver ONE validated Architecture Health Report with follow-up owners.

**Summary:** Triage scope/size/risk → map scope when needed → run the three-face `architecture --mode=full --defer=validate` engine inline → validate its `FINISHED` report once with `/why-review`, face by face → update contradictory docs when applicable → close with the handoff. Retain three sub-scores, the worst-case combined verdict and merged advisory Technique Applicability and Scenario Stress matrices.

**Use when:** project/path architecture health, production readiness or scalability/coupling audit. **Adjacent requests:** single-change compliance → `/architecture --mode=review`; standalone consolidated report without run closure → `/architecture --mode=full`; change-set review → `workflow-review-changes`.

**IMPORTANT MANDATORY Steps:** /investigate -> /architecture --mode=full --defer=validate -> /why-review -> /docs-manager --mode=update -> /workflow-end -> /watzup

**Workflow:** The parsed chain above follows `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

**Key Rules:** Keep source/config read-only, validate findings with evidence, and route fixes to follow-up owners. Advisory matrices never change scores, verdicts or gates.

Activate with `/start-workflow workflow-architecture-audit`, passing the user's prompt as context.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Scope & Size Triage (first action)](#scope--size-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Recommended Skills](#recommended-skills)
- [Orchestration](#orchestration)
- [Memory & Reporting](#memory--reporting)
- [Findings & Fix Path](#findings--fix-path)
- [Closing Reminders](#closing-reminders)

## Scope & Size Triage (first action)

Record target scope, size and risk at the top of the workflow report before choosing depth. Escalate on risk and ambiguity; size bands guide depth.

| Axis                  | Values                                                                             | Effect                                                                                                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Scope                 | whole project · current diff · specific path · greenfield foundation (`mode=init`) | Passed to `architecture --mode=full` scope resolution; ask only when the prompt names none.                                                                                                                                                   |
| Size (files in scope) | **XS** 1–3 · **S** ≤15 · **M** ≤60 · **L** ≤300 · **XL** >300                      | XS/S with a pinned scope: `/investigate` has no work to do, keep child briefs narrow. M: defaults. L/XL: `/investigate` maps modules and hotspots first; the reviewers batch per module (`systematic-review-batching`), one report per batch. |
| Risk                  | production-critical path · data integrity · security/PII · multi-service seams     | Raise depth: full-scope reviewers, explicit cross-service seam checks, and name specialist follow-ups (`/security-audit`, `/performance-review`) in the handoff.                                                                             |

## Required Quality Gates

Before `/workflow-end`, verify every gate with evidence:

- Consolidated report finished (`review-converged`) — The `architecture --mode=full --defer=validate` report at status `FINISHED`: `Faces merged: 3/3`, three sub-scores, the worst-case combined verdict, the merged advisory matrices, and `Validation: deferred to <occurrence-id>` naming the workflow's `/why-review` gate.
- Report validated once — The workflow-level `/why-review` record over the FINISHED report: it walks each face's findings (`file:line` proof, severity), then scope (nothing in-scope missed, nothing out-of-scope pulled in), verdict rollup, dedup completeness and cross-face severity consistency, and appends its Why-Review Fix Notes or Validation section. When it demotes or restores a finding, the report is fixed in place.
- Evidence bar — Every finding carries `file:line` proof and a confidence; findings below 60% are flagged and never recommended.
- Read-only — This workflow edits no source or config. Every validated finding names its follow-up owner: `/plan` for large or cross-module fixes, a feature or refactor workflow otherwise.
- Advisory stays advisory — The technique and scenario matrices and any coverage gaps never change a sub-score, the combined verdict, or a gate.
- Docs truthful (when applicable) — When the audit finds project docs contradicting the code, `/docs-manager --mode=update` ran and its non-trivial doc diff received its own `/why-review`.
- Run closed (`run-closed`) — `/workflow-end` ran last.

## Recommended Skills

- `/investigate` (optional) — The prompt does not pin the audit scope to an explicit path or the current diff, or the scope is medium or larger (more than about 15 files) so modules, boundaries and hotspots must be mapped before the reviewers fan out. Skip reason: The prompt pins a small audit scope to an explicit path or the current diff, so `architecture --mode=full` resolves the scope itself without a separate map. · Evidence: Scope map for the engine and for the final scope check.
- `/architecture --mode=full --defer=validate` (gate) — Always. · Evidence: Three non-overlapping faces (`architecture --mode=scalability`, `architecture --mode=review`, `production-readiness-review`), progressive dedup synthesis, finalized verdict → `review-converged`. `--defer=validate` skips the engine's own Step 5 findings validation and hands it to the next gate (`.claude/skills/architecture/references/mode-full.md` → `--defer=validate`).
- `/why-review` (gate) — Always, after the report is `FINISHED`. · Evidence: The run's one findings validation: it walks each face exactly as the engine's Step 5 describes, then validates the report level, so the merged findings are validated once, never twice.
- `/docs-manager --mode=update` (optional) — The validated audit found project documentation (reference docs, project config, README, ADR status) that contradicts the audited code. Skip reason: The validated audit found no project documentation contradicting the audited code, and a read-only audit leaves no diff for docs-manager --mode=update to sync. · Evidence: Docs truthful.
- `/workflow-end` (gate) — Always, last. · Evidence: `run-closed`.
- `/watzup` (optional) — The user asked for a session report or an HTML wrap-up, or the session spanned several workflows or prompts that need one consolidated handoff. Skip reason: workflow-end printed the recap, or the short handoff when nothing was built, and every applicable outcome gate passed. · Evidence: Session report. Without it, the verdict, sub-scores and follow-up owner per finding live in the `FINISHED` report, and `/workflow-end` prints the short handoff.

## Orchestration

Choose inline vs sub-agent, batching and ordering for equal quality at lower time/token cost. Registry `stepMeta` defaults: `/investigate` and `/docs-manager --mode=update` delegated; engine and `/why-review` inline.

Fixed constraints:

- Run `architecture --mode=full` INLINE: it owns the three-reviewer fan-out and all-return barrier; a sub-agent cannot fan out further. No workflow-level parallel groups.
- `/why-review` runs only on the `FINISHED` report. `/docs-manager --mode=update` runs after `/why-review`. `/workflow-end` runs last.

Recommended: XS/S → inline `/investigate` or engine scope resolution; L/XL → provide a module partition for bounded reviewer batches.

## Memory & Reporting

- Create one phase task per phase, one row per selected step. The engine pre-expands its own phases under the parent row.
- Create the workflow report FIRST at `tmp/reports/workflow-architecture-audit-{YYMMDD}-{HHmm}-{slug}.md`: triage, per-step evidence, deviations, and the path of the engine's consolidated report (`tmp/reports/architecture-full-review-{date}-{slug}.md`). Append after each step.
- Sub-agent briefs make report writing their first deliverable and return only the `subagent-return-contract` envelope.
- After compaction, re-read `TaskList`, the workflow report, and the consolidated report's status line before continuing.

## Findings & Fix Path

- Repair the report only, through the workflow-level `/why-review` that validates it (the engine defers its own validation to that gate). Source fixes belong to follow-up workflows.
- Validate findings through `/why-review` with evidence. Hand off each with owner, severity and confidence: `/plan` for large, cross-module or ambiguous fixes; feature/refactor workflow for bounded fixes.
- Loop bounds for the report-level `/why-review`: round 1 exits on zero open findings; from round 2 the bar is zero CRITICAL/HIGH/MEDIUM, with LOWs deferred and listed; cap 3 review rounds; escalate via `ask user question tool` when a round makes no progress.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Audit architecture, scalability and production readiness without changing code; deliver ONE validated Architecture Health Report with follow-up owners.

**MUST ATTENTION Main steps:** triage → map scope when needed → inline `architecture --mode=full --defer=validate` → one `/why-review` validation of the `FINISHED` report → `/docs-manager --mode=update` for contradictory docs → `/workflow-end` with its handoff → `/watzup` only when a session report is wanted. Verify all gates before closure.

- **MUST ATTENTION** triage scope, size and risk FIRST and record them. Depth follows the triage: a small pinned scope does not need a separate `/investigate` map, and L/XL targets batch per module.
- **MUST ATTENTION** run `architecture --mode=full` INLINE (it owns the fan-out and the all-return barrier), then the `/why-review` gate over the `FINISHED` report. Every finding carries `file:line` proof and a confidence.
- **NEVER** apply source fixes in this workflow. Route each validated finding to `/plan` or a feature/refactor workflow; the advisory matrices never move a score or the verdict.
- **MUST ATTENTION** write the workflow report first, append per step, and re-read it with `TaskList` after compaction. `/workflow-end` runs last.

| Evasion | Required action |
| --- | --- |
| "Engine PASS is enough" | Validate the `FINISHED` report at workflow level, including zero-open-finding PASS. |
| "Fix it during the audit" | Repair reports only; route source fixes to follow-up owners. |

**Protocols in force (digest; the guide entries above point to the full text):** Nested Task Creation · Incremental Persistence · Sub-Agent Return Contract · Session Goal Ledger · Workflow Registry Binding.
