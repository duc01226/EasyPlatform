---
name: workflow-implement-spec
description: '[Workflow] Implement behavior already captured in a canonical spec or test-case set, with scope held, reviewed changes and verified tests. Spec gaps use workflow-feature.'
disable-model-invocation: false
---

> Codex compatibility note:
> - Invoke `$skill-name`: load the registered `.agents/skills/<name>/SKILL.md` and execute it with Codex tools; no separate `Skill` tool or Claude mode switch is needed. Author `.claude/**`; mirrors are generated.
> - Track steps before execution and keep progress/evidence current. Explicit skill requests execute their protocol. Use the native question tool for required questions.
> - Map foreign tool names to available host capabilities. A name mismatch needs no approval; an actually unavailable required capability stops with its step/evidence and a user question before adaptation.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Preserve protocol order unless the user approves a deviation. Workflows use `$start-workflow`: gates stay fixed; other steps may flex with logged reasons and evidence.
<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-implement-spec` together with this skill. Call [`$start-workflow workflow-implement-spec`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$investigate`](../investigate/SKILL.md) (core) → [`$spec [mode=clarify]`](../spec/SKILL.md) (core) → [`$plan`](../plan/SKILL.md) (core) → [`$plan --mode=execute`](../plan/SKILL.md) (core) → [`$seed-test-data`](../seed-test-data/SKILL.md) (optional; conditional) → [`$integration-test`](../integration-test/SKILL.md) (optional; conditional) → [`$spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`$workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`$integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`$workflow-e2e --source=context`](../workflow-e2e/SKILL.md) (optional; conditional) → [`$test --proven=@verify`](../test/SKILL.md) (gate) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Specify (1) → Plan (1) → Build (4; exit spec-synced) → Review (1; exit review-converged) → Verify (3; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:4a87d18a9bc48695dbbddc7f9130b82f2c63ad73d5b8b466c0f59de4c58190e2 -->
- Mode `greenfield-slice`: [`$investigate`](../investigate/SKILL.md) (core) → [`$spec [mode=clarify]`](../spec/SKILL.md) (core) → [`$plan`](../plan/SKILL.md) (optional; conditional) → [`$plan --mode=execute`](../plan/SKILL.md) (core) → [`$seed-test-data`](../seed-test-data/SKILL.md) (optional; conditional) → [`$integration-test`](../integration-test/SKILL.md) (optional; conditional) → [`$spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`$workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`$integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`$workflow-e2e --source=context`](../workflow-e2e/SKILL.md) (gate) → [`$test --proven=@verify`](../test/SKILL.md) (gate) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Specify (1) → Plan (1) → Build (4; exit spec-synced) → Review (1; exit review-converged) → Verify (3; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:greenfield-slice fingerprint:d657cccd3935fbf443ac766ba8730e9373cec5ff63e0b951c537122c06854d2c -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Implement already-specified behavior within the supplied baseline, proven by green tests, converged review and reconciled spec evidence.

**Summary:** The supplied spec replaces feature discovery, spec-authoring and test-spec rounds. Triage → investigate → clarify gaps → plan → execute (code and tests together) → optional seed data → missing integration tests → sync changed behavior/evidence → review statically → verify integration tests → E2E (when asked for; always in `greenfield-slice`) → test remaining tiers → close → hand off.

**Workflow:** Activate `$start-workflow workflow-implement-spec` with the user's prompt; follow the registry and step contracts below.

**Key Rules:** Implement the supplied spec without re-authoring it or growing scope. Missing behavior routes to `workflow-feature`, which updates the spec first; other gaps stop for clarification before planning. Keep every phase within `spec_baseline`; review runs inline and tests run last.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Size & Kind Triage (first action)](#size--kind-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Gates and Optional Steps](#gates-and-optional-steps)
- [Orchestration Freedom](#orchestration-freedom)
- [Memory & Reporting](#memory--reporting)
- [Fix Path & Loop Bounds](#fix-path--loop-bounds)
- [Closing Reminders](#closing-reminders)

## Size & Kind Triage (first action)

Classify the target before choosing depth; record it in the run report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300.
- **Kind**: behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service · test-only · tooling/config.
- **Risk**: irreversible · data · security · cross-module. Escalate depth on risk and ambiguity, not file count alone.

Depth by band:

- **XS/S** — a short investigation and a short plan (a few tasks, each traced to the spec baseline); work inline. The plan step asks for plan approval only when the run's request does not already authorize the scope.
- **M, or any public-contract, data/schema or security kind** — full investigation and one lean plan that keeps every section; user-owned decisions go through the validation chain `$plan` runs inside this workflow (`plan` → Standalone Validation Chain; the route lists no separate validate step), which applies the answers in the same step.
- **L/XL** — partition the build, the integration tests and the review into bounded batches per module or TC group, one report per batch; the plan names the batches.

At every size, `$spec [mode=clarify]` checks the supplied spec against the request before `$plan`, through its EXISTING-SPEC gap-review profile (`spec/references/mode-clarify.md`), and `$plan` uses its light spec-supplied profile: the supplied spec is the scope and its cases are the scenario evidence, so it writes no scope-brief or scenario file.

## Required Quality Gates

- **Tests pass** (`tests-pass`) — `$integration-test --mode=verify` (incl. the mutation check) ran green in THIS run, once, after the static review, and `$test --proven=@verify` ran every tier that verify report does not cover; every implemented TC has a test that names its `Business Intent / Invariant Guarded` and would fail if that intent broke
- **Review converged** (`review-converged`) — nested `$workflow-review-changes` ran inline in the main session and converged — validated blocking findings fixed and the fixed state re-reviewed
- **Spec synced** (`spec-synced`, when behavior or evidence mappings changed) — `$spec [mode=sync]` reconciled the supplied spec with implemented behavior and actual case-to-test evidence after test authoring and before review; when review fixes invalidate that reconciliation, repeat only that scoped sync before final verification
- **Run closed** (`run-closed`) — `$workflow-end` checked every gate
- **No guessed behavior** — the gap review passed, or the route stopped per the escalation rule below
- **Scope held** — the workflow records the supplied `spec_baseline`; plan phases and acceptance evidence stay within it
- **Greenfield first slice** — `$workflow-greenfield-init` hands its first slice off as `$workflow-implement-spec --mode=greenfield-slice`. That mode skips `$plan` while the approved plan the foundation handed off still covers the slice and its spec (its registry `when` is false; cite the plan and its Validation Summary), runs seed data when the product persists state, and makes the near-end `$workflow-e2e --source=context` a gate

> **[ESCALATION — BLOCKING]** `$spec [mode=clarify]` runs as a gap review of the supplied spec against the request. When the spec is vague or contradictory, or the requested behavior is not in the supplied spec, STOP before `$plan` and ask the user to clarify the spec or switch to `workflow-feature`, which updates the spec first. Never guess the missing behavior and never drop it silently. A spec with one open question is clarified before planning.

> **[PLAN SCOPE ANCHOR]** Before `$plan`, the workflow report records the supplied spec path and revision as `spec_baseline`. `$plan` names it as governing intent and keeps every phase and acceptance gate within that baseline. A requirement the baseline lacks is recorded as `Proposed additions — owner approval required` and becomes a question, never an accepted plan phase.

## Gates and Optional Steps

**Step contract:** Read `$start-workflow` → Step Execution Protocol for gate/core/optional execution and deviation logging. The table follows `.claude/workflows.json` → `workflow-implement-spec`; apply the triage above.

| Step                       | Role     | Earns its cost when                                                           | Proves / feeds                |
| -------------------------- | -------- | ----------------------------------------------------------------------------- | ----------------------------- |
| `$investigate`             | core     | always — read the supplied spec and the affected code; find 3+ local examples | gap-review input              |
| `$spec [mode=clarify]`            | core     | always — the EXISTING-SPEC gap review                                         | no guessed behavior           |
| `$plan`                    | core     | always; light spec-supplied profile, with its own validation interview        | `spec_baseline`, traced tasks |
| `$plan --mode=execute`            | core     | always                                                                        | the change and its tests, written together per phase |
| `$seed-test-data`          | optional | `default`: the change adds entities or flows that need realistic development data · `greenfield-slice`: the product persists state, or its tests or demo need seeded data | development data for manual QC |
| `$integration-test`        | optional | a test case still has no executing test after the execute step               | tests for the remaining TCs   |
| `$spec [mode=sync]`        | optional | behavior or canonical case-to-test evidence/mappings changed                  | spec-synced                   |
| `$workflow-review-changes --tests=defer` | gate     | always                                                                        | review-converged              |
| `$integration-test --mode=verify` | gate     | always                                                                        | tests-pass — the one verify, with the mutation check |
| `$workflow-e2e --source=context` | optional (`default`) · gate (`greenfield-slice`) | `default`: the user explicitly asks for E2E work · `greenfield-slice`: always | near-end E2E evidence, or an evidence-backed `N/A` / `ENVIRONMENT-BLOCKED` |
| `$test --proven=@verify` | gate | always | tests-pass — runs only the tiers this run's verify report does not cover |
| `$workflow-end`            | gate     | always                                                                        | run-closed — prints the recap when `$watzup` does not run |
| `$watzup`                  | optional | a session report was requested, or several workflows need one handoff         | consolidated session report   |

> **Conditional steps:**
>
> - `$integration-test` runs after the execute step only for test cases still without an executing test. Skip reason: "Every test case already has an executing test written by the execute step."
> - `$spec [mode=sync]` runs after the tests exist when behavior differs or canonical case-to-test evidence/mappings changed, and before the nested review. Skip reason: "Behavior and canonical case-to-test evidence still match the supplied spec, so no reconciliation is needed."
> - `$seed-test-data` runs after the execute step when the change adds entities or flows that need development data (`greenfield-slice`: when the product persists state). Skip reason: "The implemented behavior adds no entity or flow that needs new development data." (`greenfield-slice`: "The product persists no state, and its tests and demo need no seeded data.")
> - `$workflow-e2e --source=context` (`default` only; a gate in `greenfield-slice`) runs on an explicit E2E request. Skip reason: "No explicit E2E request was found in the user prompt; the optional E2E handoff is disabled by default."
> - `$plan` (`greenfield-slice` only) runs when no approved plan was handed off, or the slice or its spec changed since approval. Skip reason: "The approved implementation plan workflow-greenfield-init handed off still covers this slice and its spec; cite its path and its Validation Summary."
> - `$watzup` runs on a request for a session report or when several workflows or prompts need one handoff. Skip reason: "workflow-end printed the recap, or the short handoff when nothing was built, and every applicable outcome gate passed."

Keep this verifier-parsed chain equal to the registry; roles determine permitted flex:

**IMPORTANT MANDATORY Steps:** $investigate -> $spec [mode=clarify] -> $plan -> $plan --mode=execute -> $seed-test-data -> $integration-test -> $spec [mode=sync] -> $workflow-review-changes --tests=defer -> $integration-test --mode=verify -> $workflow-e2e --source=context -> $test --proven=@verify -> $workflow-end -> $watzup

**On-demand skill (not a registry step):** `$investigate --mode=debug` — a test fails and its cause is unknown.

## Orchestration Freedom

Choose inline/sub-agent execution, parallel waves, batching and ordering at equal quality, preserving these dependencies:

- the gap review precedes `$plan`; a change exists before it is reviewed or tested; tests run once, last, after the static review (`--tests=defer`); a fix made by the verify step re-runs `$workflow-review-changes --tests=defer`, and a fix made by that re-review re-runs the verify (`SYNC:verify-last-order`);
- `$plan --mode=execute` writes each phase's code and tests together, and `$integration-test` (when its condition holds) adds the executing tests still missing, before the single conditional `$spec [mode=sync]` reconciliation; the sync precedes review, and only that scoped sync repeats before final verification when review fixes invalidate it;
- the nested `$workflow-review-changes` runs inline in the main session — it owns the session's review→fix→re-review loop, and its own reviewers run as sub-agents;
- a gap-review question to the user is never parallelized with later work;
- `$workflow-end` runs last, then `$watzup` when its condition holds.

## Memory & Reporting

- One phase task per phase, one row per selected step or L/XL batch; skipped steps keep tasks closed with logged deviations.
- Write the run report FIRST under `tmp/reports/` — triage result, `spec_baseline`, gate evidence, deviations — and append per step or batch; re-read it and the current task list after compaction.
- Sub-agent briefs carry the supplied spec path, `spec_baseline`, resolved reference-doc paths and report-writing as their first deliverable.

## Fix Path & Loop Bounds

- Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass when the fixes were non-trivial.
- A failing test gets a root-cause verdict before either the source or the test is edited; never weaken an assertion to force green. A test that contradicts the supplied spec is adjudicated against the spec, never silently rewritten.
- Re-run `$plan` only when a material scope or contract decision invalidates the saved plan; ordinary implementation discovery stays with the executor.
- The nested review keeps the framework loop bounds: round 1 exits on zero open validated findings (LOW deferral); round 2 exits on zero CRITICAL/HIGH/MEDIUM with LOW-only findings deferred; cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; escalate with `ask user question tool` on no progress.

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

**IMPORTANT MUST ATTENTION Goal:** Implement already-specified behavior within the supplied baseline, proven by green tests, converged review and reconciled spec evidence.
**IMPORTANT MUST ATTENTION Main steps:** triage → investigate → clarify gaps → plan → execute (code and tests together) → missing integration tests → sync changed behavior/evidence → review statically → verify integration tests → E2E (when asked for; always in `greenfield-slice`) → test remaining tiers → close → hand off.
**IMPORTANT MUST ATTENTION** a vague, contradictory or incomplete spec stops the route before `$plan` — the user clarifies the spec or switches to `workflow-feature`.
**IMPORTANT MUST ATTENTION** the workflow records the supplied baseline before planning; every plan phase and acceptance gate stays within it, and anything beyond it needs owner approval.
**IMPORTANT MUST ATTENTION** gates never flex: tests green in THIS run · nested `$workflow-review-changes` converged inline · spec synced before the review when behavior differs · `$workflow-end` last.
**IMPORTANT MUST ATTENTION** triage size, kind and risk first; depth follows risk, and every deviation is logged with evidence.
