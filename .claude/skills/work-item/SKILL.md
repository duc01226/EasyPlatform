---
name: work-item
version: 1.1.0
description: '[Project Management] Use when a workflow step or the user asks for task refinement, story slicing, HTML mockups, draft challenges, artifact review or readiness checks via --mode={refine|story|mockup|challenge|review|dor}.'
---

> **[BLOCKING] Mode routing — detect FIRST.** An explicit `--mode=refine`, `--mode=story`, `--mode=mockup`, `--mode=challenge`, `--mode=review` or `--mode=dor` selects that mode. With no mode, show the [Mode Dispatch](#mode-dispatch) table and stop: ask nothing, guess nothing, run nothing. Formerly `/refine`, `/story`, `/pbi-mockup`, `/pbi-challenge`, `/artifact-review`, `/dor-gate`: those slash commands no longer exist, and each mode works called directly with no workflow. Read the mode file in full before anything else.

> **Renamed:** formerly `/pbi` — now `/work-item`. The old name no longer resolves as a slash command. Modes are unchanged; the record this skill writes is a task, and `--type=pbi` is now `--type=task`.

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Inspect exact selected owners and declared spec/task/subtask dependencies before refinement/story decisions and after their actual successful save. Retain all selected-mode interview, validation and readiness gates; diagnostic concerns never approve readiness or acceptance. Only the primary saving owner records one checkpoint with the actual inherited producer/context. Read-only review and failed saves supply no saved observation. Continue untracked; disclose partial/unavailable concerns and secondary pending reasons.
>
> **Work record shape:** Task and story files are work records owned by `/task-track`. Read [Records another skill authors](../task-track/references/integration-guide.md#records-another-skill-authors) before a mode writes or edits one: `status: draft` on generation, no assignee, integer `priority`, labels in `priority_label`, and tracker-owned fields of a tracked record change only through `/task-track`.

## Quick Summary

For UI-bearing artifact reviews, read `references/review-type-design.md` → **Shared UI protocol bodies** at the review mode's UI gate; its **Design-only UI/UX principles** apply only to `--type=design`. Non-UI reviews keep their own rubric without loading UI depth.

> **Review modes:** For review/audit work, standalone defaults to `--review-only` (`--report-only` alias); `--fix-loop` enables review → validate → authorized fix → fresh re-review, default cap 3. `--fix-loop --loop-owner=caller` returns a read-only pass to the caller that owns fixes/re-review. Create triage, review, validation and re-review todo tasks first; apply the carried `review-policy` contract for LOW deferral and user-approved bounded extensions. Non-review modes and terminal findings validation keep their own dispatch.

**Goal:** Run one selected task mode to refine an initiative, slice stories, create a mockup, challenge a draft, review artifacts, or check readiness to plan.

**Summary:** Select `--mode=refine|story|mockup|challenge|review|dor` → read that mode in full → execute its gates and output → offer its user-chosen follow-up. No mode or an unknown value prints the table and stops. Review produces a SHA-256-bound report that challenge/DoR may reuse only under the shared coverage contract.

**Workflow:** Dispatch → load selected contract → resolve project roots → run mode → verify its output and completion gates → hand back.

**Key Rules:**

- **[BLOCKING]** No mode, or an unknown mode value, prints the table below and stops. Never infer a mode from the artifact, the flags or the conversation.
- **[BLOCKING]** Read the selected mode's reference in full FIRST; its rules, gates and reminders are the only instructions for the invocation — why: each mode's gates (scope gate, validated-fix loop, DoR criteria) are not restated here.
- Keep mode-specific flags (`--type`, `--reuse`, `--explore`, `--source`); ignore flags belonging to another mode. Run exactly one mode; offer follow-ups through its Next Steps and let the user decide. Resolve artifact/spec/design roots from `docs/project-config.json` at runtime.

## Contents

- [Quick Summary](#quick-summary)
- [Mode Dispatch](#mode-dispatch)
- [The `--reuse` contract](#the---reuse-contract)
- [Closing Reminders](#closing-reminders)

## Mode Dispatch

Detect the mode from the invocation arguments before any other work; do not load a mode file the invocation did not select.

| Mode | Purpose | Read in full FIRST |
| --- | --- | --- |
| _(none)_ | Show this table and stop — no question, no default mode | — |
| `--mode=refine [initiative \| task \| requirement text]` | Initiative refinement: initiatives to tasks, problem-hypothesis validation, the interview, acceptance criteria, estimates. Formerly `/refine` | `references/mode-refine.md` |
| `--mode=story [task path]` | User stories from tasks: slicing features, breaking down requirements into INVEST stories. Formerly `/story` | `references/mode-story.md` |
| `--mode=mockup [--source=<path>] [--explore]` | Interactive HTML mockup from a task, story or spec artifact; `--explore` offers 1-3 design directions behind a scope gate. Formerly `/pbi-mockup` | `references/mode-mockup.md` |
| `--mode=challenge [task path] [--reuse=<report \| task-review>]` | Dev BA PIC review of a task draft: an AI-assisted challenge of each draft by a different reviewer. Formerly `/pbi-challenge` | `references/mode-challenge.md` |
| `--mode=review [--type={task\|story\|spec-tests\|design}] [artifact path]` | Artifact quality review before handoff: per-type checklist (a Feature Spec reviews as `spec-tests` with its §1-7 section), M1-M7 gate, validated-fix loop with full re-review. Formerly `/artifact-review` | `references/mode-review.md` |
| `--mode=dor [task path] [--reuse=<report \| task-review>]` | Readiness check of a task and, once sliced, its stories (8 DoR criteria, story rows, M1-M7 gates) before planning. Formerly `/dor-gate` | `references/mode-dor.md` |

The selected reference owns every gate, flag, output, report path, round cap and reminder. `challenge` is cross-person review; `review` owns type scoring and validated-fix re-review; `dor` owns the eight readiness criteria and the story rows. Mockup's scope gate, journey report and design-authority read precede generation; run it in the main session when user questions are required.

### Conditional detail references

Read these only after the selected mode's full reference, at the step it names:

- `--mode=review`: read only the resolved type's [task](references/review-type-task.md), [story](references/review-type-story.md), [test-spec](references/review-type-spec-tests.md), or [design](references/review-type-design.md) checklist and output template before scoring.
- `--mode=mockup --explore`: read [design directions](references/mockup-explore-directions.md) when offering directions behind the scope gate.
- `--mode=mockup`: read [interactive demo](references/mockup-interactive-demo.md) when the mode requests its demo contract.

## The `--reuse` contract

`--mode=review --type=task` is the producer; `--mode=challenge` and `--mode=dor` are the consumers. The contract lives once in `.claude/skills/shared/m1-m7-gates.md` → "Reusing an earlier verdict"; the consumer modes restate only their own consumer-owned checks.

- **Symbolic id.** A workflow passes `--reuse=task-review`; it resolves to the report written by that run's `work-item --mode=review --type=task` step (path recorded in the run report; unresolvable means no `--reuse`). A caller may instead pass the report path.
- **Identity.** The report header records the task path and the SHA-256 of the task file's bytes; size and mtime are never an identity. A mismatch, unreadable digest or unresolvable report turns reuse off for the whole run, per task.
- **Coverage map.** Only the criteria the map lists (M1-M5/M7 verdicts and the releasable-outcome / full-flow row) may be cited from the report. Consumer-owned checks are NEVER reusable: DoR — story template, GIVEN/WHEN/THEN with 3+ scenarios and an auth scenario, dependency Type and Status columns, UI design ready, effort points, AI pre-review presence; challenge — the vagueness-token check and AC coverage.
- **Verdicts.** A reused FAIL stays FAIL. A standalone run (no `--reuse`) evaluates every criterion.

<!-- SYNC:review-decision-autonomy:reminder -->

**MUST ATTENTION** Decide supported review choices and recommendations, record the rationale, and finish without routine user questions. Keep round-limit extension, indispensable facts and actual action authority; preserve source coverage, validation, tests, read-only boundaries and budgets. Review decisions do not accept open risks or make a failed gate pass.

<!-- /SYNC:review-decision-autonomy:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Run one selected task mode to refine an initiative, slice stories, create a mockup, challenge a draft, review artifacts, or check readiness to plan.

**IMPORTANT MUST ATTENTION Main steps:** dispatch → read selected contract → resolve roots → execute mode gates → verify output → offer user-chosen follow-up.

- **MUST ATTENTION** detect `--mode=` FIRST; no mode or an unknown mode prints the Mode Dispatch table, asks nothing and runs nothing — why: a guessed mode runs the wrong gates on a real artifact.
- **MUST ATTENTION** read `references/mode-<x>.md` in full before any work; it owns every rule, flag, gate, report path and round cap.
- **MUST ATTENTION** honor the `--reuse` contract: SHA-256 identity, per-task binding, coverage map only, consumer-owned checks always evaluated, a reused FAIL stays FAIL.
- **MUST ATTENTION** one mode per invocation; follow-ups are offered by the mode's own Next Steps and chosen by the user.

**Anti-Rationalization:**

| Evasion | Required action |
| --- | --- |
| “The artifact implies a mode” | Use explicit `--mode`; absent/unknown prints the table and stops. |
| “Reuse means skip the checklist” | Check SHA-256 identity and coverage map; always evaluate consumer-owned checks. |

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `review-decision-autonomy` — Choose supported review decisions and ask before extending the round budget; running any review or audit skill or mode → .claude/skills/shared/protocols/review-decision-autonomy.md
- `review-policy` — Review-only or a three-round fix loop with explicit extension and fresh post-fix evidence; deciding round eligibility, blocking findings or review state → .claude/skills/shared/protocols/review-policy.md

<!-- PROTOCOL-GUIDES:END -->



<!-- SYNC:review-policy:reminder -->

**MUST ATTENTION** Triage all targets, plan and create review/validation/fix/fresh re-review tasks first. Review-only reports without edits; fix-loop freshly reviews every repair under one fixing owner. Default cap three rounds: disclose deferred LOWs, ask and wait before a bounded extension for MEDIUM+ or failed required checks. Preserve scope, coverage and actual operation authority.

<!-- /SYNC:review-policy:reminder -->
