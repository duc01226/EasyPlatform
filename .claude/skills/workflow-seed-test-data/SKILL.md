---
name: workflow-seed-test-data
version: 1.1.0
description: "[Workflow] Build or extend idempotent, environment-gated development/QC seeders with realistic data, change review and verified tests."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-seed-test-data` together with this skill. Call [`/start-workflow workflow-seed-test-data`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate`](../investigate/SKILL.md) (optional; conditional) → [`/seed-test-data`](../seed-test-data/SKILL.md) (core) → [`/experience-review`](../experience-review/SKILL.md) (optional; conditional) → [`/changes-review --fix-loop`](../changes-review/SKILL.md) (gate) → [`/test`](../test/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Build (1) → Review (2; exit review-converged) → Verify (2; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:3e1dcf670f2e0686885f5c9d1d5a96e5beee77a171b518f487153a2dedc1096b -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Add or extend idempotent, command-based seeders that create realistic QC happy-path data for a feature area — environment-gated, count-configurable, restart-safe — proven by tests that ran green in this run, a converged review and, when the data is observable, an inspection of the seeded state itself.

**Use this** for seeders, dev/QC dummy data and realistic first-init data. Use `/seed-test-data --mode=review` alone for a read-only seeder audit, and `workflow-integration-test` / `workflow-e2e` when the deliverable is a test rather than seeded data.

**IMPORTANT MANDATORY Steps:** /investigate -> /seed-test-data -> /experience-review -> /changes-review --fix-loop -> /test -> /docs-manager --mode=update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

> **[CRITICAL] Read Project Config Gate:** before writing any seeder code, read the seeder context group in `docs/project-config.json` (for example `Data Seeders`) and `seed-test-data-reference.md` in the project-reference docs root (default `docs/project-reference/`; `docsRoots.projectReference.path` overrides). A seeder written without the project's base class, env-gate key, count key and DI scope pattern is wrong by construction.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Size & Kind Triage (FIRST action)](#size--kind-triage-first-action)
- [Required Quality Gates (non-negotiable)](#required-quality-gates-non-negotiable)
- [Recommended Skills](#recommended-skills)
- [Orchestration Freedom](#orchestration-freedom)
- [Memory & Reporting](#memory--reporting)
- [Fix Path & Loop Bounds](#fix-path--loop-bounds)
- [Closing Reminders](#closing-reminders)

## Size & Kind Triage (FIRST action)

Classify before choosing steps and record the result in the run report:

- **Size** — XS: enhance one existing seeder (count, one scenario; 1–3 files) · S: new seeder for one feature area · M: several feature areas or seeders · L/XL: seeding across modules/services with a dependency chain of pre-existing data.
- **Kind** — new / enhance / fix seeder · observable data (a QC/operator sees it through an app, API, CLI or artifact) · cross-module or cross-service commands · seeder that encodes a domain rule (a required precondition, status or relationship).
- **Risk** — escalate on anything that could run outside development, shared or persistent environments, cross-service data ownership, or ambiguous target counts.

The triage selects which recommended skills run and how deep; it never removes a gate.

## Required Quality Gates (non-negotiable)

| Gate                                                                                           | Evidence that proves it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seeder invariants                                                                              | `file:line` proof for each: (1) environment gate is the FIRST check — development or config-enabled only, never production; (2) count read from the configured key, never hardcoded (small default; zero → no-op); (3) idempotent — count existing BEFORE seeding and loop from `existing_count` to `target_count`, never from `0` (restart-safe); (4) domain entities written only through application-layer commands, never direct repository/DB writes, never duplicated command logic; (5) the project's scoped DI mechanism per iteration, never one scope across iterations |
| `tests-pass`                                                                                   | `/test` ran green in THIS run against the final seeder code, after the review fixes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `review-converged`                                                                             | `/changes-review --fix-loop` over the final diff: validated blocking findings fixed, the fixed state re-reviewed and the review receipt issued                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Seeded data observed (when observable)                                                         | `/experience-review` record over the seeded state: `OBSERVED` / `JUDGED` / `HUMAN-ACCEPTED` / `UNVERIFIED` / `ENVIRONMENT-BLOCKED` / `NOT-APPLICABLE`; a seeder exit code is not evidence                                                                                                                                                                                                                                                                                                                                                                                         |
| Spec/docs synced (when a seeder encodes a domain rule or changes documented dev-data coverage) | The rule lands in the spec (and in tests where testable), never as a seeder-only fix; `/docs-manager --mode=update` result, or its registry skip reason                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `run-closed`                                                                                   | `/workflow-end` (top-level only) verifies every gate above                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

## Recommended Skills

| Skill                              | Earns its cost when                                                                                             | Proves / feeds                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/investigate` (conditional)       | Size M or larger, cross-module or cross-service, or conventions and command chain not yet evidenced             | Target seeder path (or "none — create new"), 3+ sibling seeders, command signatures, required inputs, validation, side effects, pre-existing data chain |
| `/seed-test-data`                  | Always — it makes the change                                                                                    | Seeder invariants — its self-audit runs the convention checklist; nested here, its own fresh-review loop hands the final review to the gate below      |
| `/experience-review` (conditional) | The seeded data reaches a configured or likely observable surface                                               | Seeded data observed                                                                                                                                    |
| `/changes-review --fix-loop` (gate) | Always — converges the final diff and issues the review receipt                                                | `review-converged`, seeder-invariant and convention compliance                                                                                          |
| `/test` (gate)                     | Always                                                                                                          | `tests-pass`                                                                                                                                            |
| `/docs-manager --mode=update` (conditional) | Seeder configuration keys, a domain rule or documented seed coverage changed                           | Spec/docs synced                                                                                                                                        |
| `/workflow-end` (gate)             | Always (top-level run); prints the recap when `/watzup` does not run                                           | `run-closed`                                                                                                                                            |
| `/watzup` (conditional)            | A session report was requested, or several workflows or prompts need one handoff                               | Consolidated session report                                                                                                                             |

Skipping a recommended skill is fine when triage shows it does no real work; log it as a deviation (`intent-skip` / `when-false`) with evidence.

**Conditional step note — `/investigate`** runs when (registry, verbatim): The seeder area is size M or larger, cross-module or cross-service, or its conventions and command chain are not already evidenced; the seed-test-data skill still reads three comparable seeders itself. Skip reason (registry, verbatim): A size XS or S seeder in an area whose conventions the seed-test-data skill discovers itself.

**Conditional step note — `/docs-manager --mode=update`** runs when (registry, verbatim): Seeder configuration keys, a domain rule or documented seed coverage changed. Skip reason (registry, verbatim): No configuration key, domain rule or documented seed coverage changed.

**Conditional step note — `/watzup`** runs when (registry, verbatim): The user asked for a session report or an HTML wrap-up, or the session spanned several workflows or prompts that need one consolidated handoff. Skip reason (registry, verbatim): workflow-end printed the recap, or the short handoff when nothing was built, and every applicable outcome gate passed.

**Conditional step note — `/experience-review`** runs when: the seeded data reaches a configured `experienceVerification` surface whose `reviewOn` trigger intersects the change, or the seeder creates or changes data a QC/operator actually observes through a running application, API, CLI, or generated artifact; when the latter holds without usable configuration, run the skill and record `ENVIRONMENT-BLOCKED` — never invent a runner. A relevant surface that cannot be run or inspected is `ENVIRONMENT-BLOCKED`, never PASS. Skip reason (registry, verbatim): After inspecting docs/project-config.json and the seeder diff, no configured or likely observable surface consumes the seeded data; record NOT-APPLICABLE with evidence citing the inspected paths.

It sits before `/changes-review --fix-loop` because a seeder's deliverable is observed data: the review proves the seeder obeys the rules, the inspection proves the scenarios are the ones QC needs. No clean-up rewrite follows it, so it observes the final seeder code; a review fix lands under the re-verification rule below. It runs its own bounded remediation loop (`--rounds=N`, default 3), never rewrites an expectation or acceptance criterion to close a gap, and reports unresolved defects at the cap as `NOT-CONVERGED`, routed back to `/seed-test-data`.

## Orchestration Freedom

You choose inline vs sub-agent, batching and ordering, optimizing wall-clock and token cost at equal quality. Fixed constraints only: the seeder exists before it is observed, tested or reviewed; convention checks stay in the seeder's self-audit and the `/changes-review --fix-loop` gate, so no clean-up rewrite runs after the checks that prove the final code; fixes are re-verified after they land; `/workflow-end` runs last; gates awaiting user approval never run in parallel. Recommended: XS/S inline; M+ one seeder or feature area per batch with one report per batch, ordered by the data dependency chain (prerequisite data first).

## Memory & Reporting

- One phase task per phase, one row per selected step (and per seeder batch for M+) so nothing is lost after compaction.
- Write the run report under `tmp/reports/` FIRST and append per step and batch; re-read it and `TaskList` after compaction.
- Sub-agent briefs carry the resolved config/reference paths, make report writing their first deliverable, and return only the summary envelope.

## Fix Path & Loop Bounds

Validate each finding (evidence-backed, reproducible) before fixing. A failing test follows the test-investigation protocol before either side changes. Fix at the owning layer: a seeder that violates an invariant is fixed in the seeder; a command that rejects valid inputs or breaks a domain rule is a product defect — trace its root cause and route it, never work around it in the seeder. Re-run the test or reviewer that raised the finding, plus a holistic pass when fixes were non-trivial. Use `/plan` only when the fix set is large, cross-module or ambiguous.

Review loop: round 1 zero open findings (LOW deferral) converges; round 2 converges on zero CRITICAL/HIGH/MEDIUM with LOWs deferred; cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; no progress → escalate via `ask user question tool`.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** idempotent, command-based QC happy-path seeders for a feature area, proven by green tests, a converged review and — when observable — an inspection of the seeded data.

- **MUST ATTENTION** read the project-config seeder context group and `seed-test-data-reference.md` BEFORE writing any seeder code; match the project's existing seeder convention exactly.
- **MUST ATTENTION** environment gate FIRST; count from config; loop from `existing_count` to `target_count`, never from `0`; scoped DI per iteration.
- **MUST ATTENTION** NEVER write domain entities through a repository/DB directly — application-layer commands only; a domain rule a seeder encodes belongs in the spec.
- **MUST ATTENTION** a seeder exit code is not evidence — run `/experience-review` when the data is observable, record `ENVIRONMENT-BLOCKED` (never PASS) when it cannot be inspected, and skip only with an evidence-backed `NOT-APPLICABLE`.
- **MUST ATTENTION** triage first, write the report under `tmp/reports/` first, keep one phase task per phase, one row per selected step; `/test` and `/changes-review` always run on the final code and `/workflow-end` runs last.
