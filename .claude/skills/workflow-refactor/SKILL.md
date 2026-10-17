---
name: workflow-refactor
version: 1.0.0
description: "[Workflow] Restructure existing code while preserving observable behavior, proven by baseline and final tests plus change review."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-refactor` together with this skill. Call [`/start-workflow workflow-refactor`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate`](../investigate/SKILL.md) (core) → [`/integration-test`](../integration-test/SKILL.md) (optional; conditional) → [`/test`](../test/SKILL.md) (gate) → [`/plan`](../plan/SKILL.md) (core) → [`/plan --mode=validate`](../plan/SKILL.md) (optional; conditional) → [`/plan --mode=execute`](../plan/SKILL.md) (core) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (optional; conditional) → [`/spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`/workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`/integration-test --mode=verify`](../integration-test/SKILL.md) (optional; conditional) → [`/test --proven=@verify`](../test/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (3) → Plan (2) → Build (4) → Review (1; exit review-converged) → Verify (2; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:213ee934c5defd17dd9e8fc3cfa6f65b1546b085f18ead5475d9d8d643c35b6f -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** Restructure existing code without changing its observable behavior, proven by the same test scope green before and after the change plus a converged change review — cheap on a small local cleanup, thorough on a wide or risky restructure.

**Use this** to restructure, reorganize, rename, extract, simplify or pay down technical debt while behavior stays fixed. A change the user wants to behave differently is a feature (`workflow-feature`) or a bugfix (`workflow-bugfix`); a single trivial rename in one file fits a direct edit plus test and review.

**Key rules:**

- **MUST** triage size, kind and risk FIRST — the triage picks which recommended skills run and how deep.
- **MUST** prove behavior preservation: the affected test scope is green BEFORE any change (baseline gate) and green AFTER it (final gate); cover untested touched behavior with characterization tests written before the baseline run, so that one run proves them green on the unrefactored tree.
- **MUST** search 3+ local examples of the target pattern before planning and follow the project's architecture, code hierarchy and naming from `docs/project-config.json` → `workflowPatterns`.
- **NEVER** change an assertion or expected value to make a refactor pass — that is a behavior change and needs the user's approval.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Size & Kind Triage (first action)](#size--kind-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Gates and Optional Steps](#gates-and-optional-steps)
- [Orchestration Freedom](#orchestration-freedom)
- [Memory, Reporting and Fix Path](#memory-reporting-and-fix-path)
- [Activation](#activation)
- [Closing Reminders](#closing-reminders)

## Size & Kind Triage (first action)

Classify the refactor before choosing steps and record the result in the workflow report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300 (mechanical renames can reach thousands).
- **Kind** (all that apply): local cleanup · extract/move/rename · cross-module restructure · public contract/API surface · data/schema/persistence · security-sensitive · performance-driven · dead-code removal · test-only · tooling/config.
- **Risk:** irreversible, data, security, cross-module. Escalate depth on risk and ambiguity, not on file count alone.

| Triage result | Typical route through the recommended skills |
| --- | --- |
| XS/S, one module, no contract/data surface | investigate → baseline test → short plan (the plan's light profile) → execute → review → test → close |
| M, or cross-module | keep one lean plan; add characterization tests, before the baseline run, where the investigation shows a coverage gap |
| L/XL, public contract/data/security, or ambiguous target structure | add `/plan --mode=validate`; execute in bounded batches per module with one report per batch, baseline and final test per batch plus a full-scope final run |

## Required Quality Gates

Non-negotiable — `/workflow-end` checks each against its evidence before the run closes:

1. **Baseline green** (`/test`, gate, before any change) — the test command, scope and pass summary for the code the refactor touches, including any characterization tests written just before it. A red existing test stops the refactor: report it, or route the failure to `workflow-bugfix`; never refactor on a red base. A red characterization test written in this run gets a five-way verdict first: a test-authoring fault is corrected and re-run once on the unrefactored tree; a real defect stops the refactor like an existing test.
2. **Touched behavior is guarded** — every behavior the refactor touches has a test that would fail if it changed; otherwise characterization tests are written before the baseline run, which proves them green on the unrefactored code. For lifecycle/state logic, tests assert persisted transitions and invalid-transition rejection.
3. **Behavior preserved** (`/test --proven=@verify`, gate, after the change and after review fixes) — the baseline scope plus any characterization tests run green in THIS run, through `/integration-test --mode=verify` when it runs (it owns the mutation check) and `/test` for every tier that verify report does not cover; when the verify step does not run, the main session owns any mutation check. Test code changed only mechanically (imports, renamed symbols, moved paths).
4. **Review converged** (`/workflow-review-changes`, gate, INLINE in the main session) — validated blocking findings fixed and the fixed state re-reviewed.
5. **Run closed** — `/workflow-end` (top-level only).

Specs normally do not change in a refactor; the spec steps below run only when a preserved invariant lacks a TC (`/spec [mode=tests]`) or canonical specs or TCs point at code or tests the refactor moved (`/spec [mode=sync]`). Any observable behavior, public contract or docs/spec boundary change means the work is no longer a pure refactor — stop and confirm with the user, then run the spec/test/docs sync that change requires.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; this table summarizes this workflow's `intent`, `outcomeGates` and step roles from `.claude/workflows.json`, in its recommended default order.

| Step | Role | Runs when / earns its cost | Proves |
| --- | --- | --- | --- |
| `/investigate` | core | always in practice — scope, callers, 3+ local pattern examples | scope and target pattern |
| `/integration-test` | optional | touched behavior has no test that would fail if it changed — written before the baseline run | characterization tests |
| `/test` | gate | always — BEFORE any change, on the affected scope plus any characterization tests (one pre-change run) | baseline green |
| `/plan` | core | always in practice; XS/S keeps it to files, steps, rollback (light profile) | refactor plan |
| `/plan --mode=validate` | optional | size L+, or an ambiguous target structure or scope | plan confirmed |
| `/plan --mode=execute` | core | always in practice — small verifiable increments | the change |
| `/spec [mode=tests]` | optional | a preserved invariant lacks a TC; moved or renamed paths go to the spec sync | TCs match |
| `/work-item --mode=review --type=spec-tests` | optional | TC content changed beyond evidence paths | TC quality |
| `/spec [mode=sync]` | optional | specs/TCs reference moved or renamed code/test paths | specs match |
| `/workflow-review-changes --tests=defer` | gate | always — INLINE in the main session | review converged |
| `/integration-test --mode=verify` | optional | integration tests written or changed in this run, or core logic moved — after the review; owns the mutation check | integration tests green, mutants killed |
| `/test --proven=@verify` | gate | always — after the change and review fixes, baseline scope; runs only the tiers this run's verify report does not cover | behavior preserved |
| `/workflow-end` | gate | always | run closed — prints the recap when `/watzup` does not run |
| `/watzup` | optional | a session report was requested, or several workflows need one handoff | consolidated session report |

Outcome gates: tests pass · review converged · run closed.

A recommended step the triage shows would do no real work is not run; record it through the Step Execution Protocol with its evidence.

**Ad hoc skills (not registry steps):** `/investigate` again before removing "unused" code — grep evidence, confidence ≥80%, cross-module/service check · `/performance-review` for a performance-driven refactor (below) · `/code-simplifier` for a clean-up pass, only before the review and final test so they cover its result.

> **[PERFORMANCE-SDD ROUTE]** A performance-driven refactor (query optimization, caching, fewer allocations, throughput) runs `/performance-review` for benchmark evidence — SLA, baseline, measurement command — while preserving observable behavior and functional no-regression checks. A pure behavior-preserving optimization adds no new TCs when the invariant-preservation evidence and the final `/test` gate cover it; a changed SLA, performance constraint, state timing boundary, public contract or docs/spec boundary still requires spec, test and docs sync.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and order — optimize wall-clock and token cost at equal quality. Fixed constraints (data dependencies):

- Characterization tests are written before the baseline run; that one baseline run proves them and the existing tests green on the unrefactored code before `/plan --mode=execute` changes it.
- A change exists before it is reviewed or tested; a spec sync runs before the review that checks it; the review is static (`--tests=defer`) and the verify and final test run after it; a fix made by the verify step re-runs `/workflow-review-changes --tests=defer` (`SYNC:verify-last-order`); when `/integration-test --mode=verify` does not run, the main session owns any mutation check; `/workflow-end` runs last.
- `/workflow-review-changes` runs INLINE in the main session — never as a sub-agent — and owns the test-quality review and the docs/domain-entity reference refresh; do not repeat them here.
- Gates awaiting user approval (plan validation, a behavior-change decision) are never parallelized.

Recommended: XS/S work inline without sub-agents; L/XL mechanical changes applied per module batch with a bounded report each, then one full-scope final test.

## Memory, Reporting and Fix Path

- **Tasks:** one phase task per phase, one row per selected step or batch so nothing is lost after compaction; child skills expand their phases under the parent row.
- **Report first:** create `tmp/reports/workflow-refactor-{YYMMDD}-{HHmm}-{slug}.md` before the first finding; append triage, baseline evidence, pattern examples, batch results and deviations per step; re-read it and `TaskList` after compaction. Sub-agent briefs make report-writing their first deliverable.
- **Fix path:** validate a finding (evidence-backed, reproducible) before fixing it; fix at the owning layer; re-run the reviewer or test that raised it, plus a holistic pass when fixes were non-trivial. A failing test after the change means the refactor changed behavior until proven otherwise — adjudicate it before editing either side.
- **Loop bounds:** round 1 exits on zero open validated findings (LOW deferral); from round 2 only CRITICAL/HIGH/MEDIUM block and LOW-only findings are deferred; cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; no progress → escalate via `ask user question tool`.

## Activation

Activate the `workflow-refactor` workflow: run `/start-workflow workflow-refactor` with the user's prompt as context. Apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; project conventions come from `docs/project-config.json` and the docs index.

Recommended default order (roles in the table above):

**IMPORTANT MANDATORY Steps:** /investigate -> /integration-test -> /test -> /plan -> /plan --mode=validate -> /plan --mode=execute -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /test --proven=@verify -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->


<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** restructure existing code without changing its observable behavior, proven by the same test scope green before and after plus a converged change review.

- **MUST ATTENTION** triage size, kind and risk FIRST; run only the recommended skills the triage shows do real work, and log every deviation with evidence.
- **MUST ATTENTION** characterization tests for any touched behavior no test guards are written first; the one baseline `/test` (gate) proves them and the existing scope green BEFORE any change; the final `/test` (gate) green on the same scope AFTER the change.
- **MUST ATTENTION** search 3+ local examples and follow the project's `workflowPatterns`; removing "unused" code needs `/investigate` evidence.
- **NEVER** edit an assertion or expected value to make the refactor pass; a behavior change needs the user's approval and the spec/test/docs sync it implies. `/workflow-review-changes` runs INLINE in the main session; close with `/workflow-end`.
