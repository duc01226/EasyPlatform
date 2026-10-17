---
name: workflow-feature-spec
version: 2.0.0
description: "[Workflow] Create or revise the canonical spec for one capability in the configured format, with reviewed cases and reconciled test evidence."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-feature-spec` together with this skill. Call [`/start-workflow workflow-feature-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate`](../investigate/SKILL.md) (core) → [`/plan`](../plan/SKILL.md) (optional; conditional) → [`/spec`](../spec/SKILL.md) (gate) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/spec [mode=clarify]`](../spec/SKILL.md) (optional; conditional) → [`/spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests --fix-loop`](../work-item/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (2) → Specify (6; exit review-converged, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:539a2d78b16029662989229827386015d0a49ad41b7681802e1875762a786031 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** create or update ONE canonical feature/spec artifact for one capability at its configured path — scoped by evidence, planned to the depth the change needs, reconciled with its test/evidence cases, reviewed, and docs-synced. **MUST ATTENTION** resolve the configured artifact profile before writing anything.

**Summary:** Triage and resolve ownership → investigate → plan (M+) → author or update the spec → cases → confirm open decisions → case-to-test sync → spec-tests review of the final cases and §1-7 → derived docs → close. Depth varies with risk; the authored spec, the converged review and the close remain required, and decisions and evidence are reconciled whenever the change touches them.

**Use it when** the user asks to write or revise the business spec for a capability. **Use a sibling instead when:** only a raw idea exists → `workflow-planned-work` (`idea-to-spec`); the spec must be derived from or re-synced with existing code across capabilities → `workflow-code-to-spec`; code changes are the goal → `workflow-feature` / `workflow-implement-spec`.

**IMPORTANT MANDATORY Steps:** /investigate -> /plan -> /spec -> /spec [mode=tests] -> /spec [mode=clarify] -> /spec [mode=sync] -> /work-item --mode=review --type=spec-tests --fix-loop -> /docs-manager --mode=update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged to the run's deviation log. The list above is the recommended default order; the triage below decides which recommendations earn their cost.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [1. Triage (FIRST action)](#1-triage-first-action)
- [2. Required Quality Gates](#2-required-quality-gates)
- [3. Execution Notes](#3-execution-notes)
- [4. Orchestration Freedom](#4-orchestration-freedom)
- [5. Memory, Reporting and Fix Path](#5-memory-reporting-and-fix-path)
- [Closing Reminders](#closing-reminders)

## 1. Triage (FIRST action)

Classify the change from the request plus the investigate evidence, and record it in the run report:

| Band     | Signal                                                  | Default depth                                                                      |
| -------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **XS**   | one rule, one case, or wording in an existing spec      | changes listed in the task list (no plan step); clarify only for an unconfirmed non-obvious decision           |
| **S**    | a few sections/cases of one existing spec, clear intent | changes listed in the task list; `/spec [mode=clarify]` confirms the non-obvious decisions                     |
| **M**    | new spec, restructure, UI intent, or many rules/states  | one lean plan (validated inside its step) + spec tests + the spec-tests review + clarify on open decisions                 |
| **L/XL** | several capabilities or buckets                         | split: one spec per capability; route whole-bucket work to `workflow-code-to-spec` |

**Kinds:** behavior change (cases/evidence must be reconciled) · public contract · UI surface (interaction-intent role) · parent/child features (cross-references) · docs-only wording. Escalate depth on ambiguity and risk, not length.

## 2. Required Quality Gates

Items marked **(gate)** are registry `gate` steps or outcome gates and hold in every run; the others hold whenever their step runs.

- **Artifact profile resolved** — Read `docs/project-config.json` (`specRoots.business.path`, `workflowPatterns.featureDocTemplate`, `docsRoots.projectReference.path`, `specArtifacts`), the configured template, local `spec-system-reference.md` and `spec-principles.md`; the report names the canonical path, section roles and carriers. A malformed or conflicting contract is BLOCKED — never a silent fallback.
- **Decisions confirmed** — `/spec [mode=clarify]` confirmed every non-obvious, conflicting or high-impact decision the change encodes with the user; when it does not run, every encoded decision is obvious or already confirmed in the decision log.
- **Spec synced** (`spec-synced`, gate when test cases or their links to executing tests changed; the `/spec` authoring step is a gate in every run) — the explicit spec chain: `/spec` authors or updates the spec, `/spec [mode=tests]` reconciles the cases when behavior, a rule, a public contract or test evidence changed, and `/spec [mode=sync]` re-links changed cases to their executing tests and proves the gate; the artifact satisfies the applicable **M1-M7** mandates (tech-agnostic intent prose, business-visible cases). Every case names its **Business Intent / Invariant Guarded** and would fail if that intent broke.
- **Review converged** (`review-converged`, gate) — `/work-item --mode=review --type=spec-tests --fix-loop` converged on the final cases and spec body §1-7 this run authored or changed (after clarify and sync), with the M1-M7 gate: a spec diff gets the spec rubric, not the code-review workflow.
- **Docs synced** — `/docs-manager --mode=update` refreshed the derived indexes or reference docs that embed the spec, when one does.
- **Run closed** (`run-closed`, gate) — `/workflow-end` checked every outcome gate (top-level runs only).

**Profile rules.** The native profile or local artifact contract owns paths, section roles, identifiers, ownership and test/evidence carriers; generate only project-declared derived outputs. Keep intent roles tech-agnostic; put permitted technical detail only in declared contract/evidence roles. The portable form — `{SPEC_ROOT}/{Bucket}/README.{Feature}.md`, tech-free Sections 1–7 with the inline §5 Mermaid ERD and §6.2–§6.5 interaction intent for UI features, Section 8 `TC-{FEATURE}-{NNN}` cases with user-visible GIVEN/WHEN/THEN, Business Intent / Invariant Guarded, `Evidence: [Source: namespace/service/id]`, `CoveredBy` and status — applies only when neither exists. Cross-reference parent/child artifacts as the contract defines them (portable form: each sub-feature references its parent). Unknown mapping or missing required coverage is BLOCKED/UNKNOWN, never PASS or NOT-APPLICABLE; never create a README, section or ID registry the native contract does not define.

## 3. Execution Notes

- `/investigate` checks the existing spec, related code and test evidence; `/plan` names the section/case changes for M+ bands (XS/S list them in the task list).
- `/spec` runs without a mode argument and infers it from the request and repository state (an existing spec → update; from code → init; a new provisional spec → draft). Each later spec step is its own task with its own evidence.
- `/spec [mode=clarify]` is the run's decision interview; it reads the decision log first and asks only what it leaves open.

## 4. Orchestration Freedom

You choose inline vs sub-agent, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed data dependencies only: the spec change, its cases, the clarified decisions and the case-to-test links all land before the review, so the review judges the final content; a review finding that needs a user decision goes back through `/spec [mode=clarify]` (its decision log keeps earlier answers) and the changed content is reviewed again; fixes are re-verified after they land; `/workflow-end` runs last; user-approval gates are never parallelized. XS/S work runs inline without sub-agents.

## 5. Memory, Reporting and Fix Path

- One phase task per phase, one row per selected step; write the run report under `tmp/reports/` FIRST and append per step; re-read it and `TaskList` after compaction.
- Findings are validated before fixing; fix in the owning spec role; re-run the review that raised them. Review loop: round 1 exits on zero open findings (LOW deferral); round 2 on zero CRITICAL/HIGH/MEDIUM with LOWs recorded as deferred; cap 3 review rounds; escalate via `ask user question tool` on no progress.
- Define success criteria before the first edit (the sections, cases and decisions that must exist) and loop until each is observably true.

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

**IMPORTANT MUST ATTENTION Goal:** one canonical feature/spec artifact in the configured native format — planned to the depth the triage needs, cases reconciled, reviewed and docs-synced.

**MUST ATTENTION Main steps:** triage/profile → investigate → plan (M+) → author/update the spec → cases → confirm open decisions → case-to-test sync → spec-tests review → derived docs → close.

- **MUST ATTENTION** triage FIRST; it sets plan depth and which optional spec steps earn their cost.
- **MUST ATTENTION** resolve the artifact profile before writing; the portable eight-section/`TC-{FEATURE}-{NNN}` form applies only when no native profile or local contract exists; unknown mappings stay BLOCKED.
- **MUST ATTENTION** the gates always hold: `/spec` authored the change with applicable M1-M7, `/work-item --mode=review --type=spec-tests --fix-loop` converged on the final cases and changed §1-7, `/workflow-end` closed; non-obvious decisions are user-confirmed through `/spec [mode=clarify]`.
- **MUST ATTENTION** every case names the business intent or invariant it guards and would fail if that intent broke.
- **MUST ATTENTION** one phase task per phase, one row per selected step; the report in `tmp/reports/` is written first and re-read after compaction.
