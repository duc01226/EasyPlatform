---
name: workflow-bugfix
version: 1.0.0
description: "[Workflow] Investigate and fix bugs, crashes or regressions at the root cause, with reviewed changes and regression tests that prove the fix."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-bugfix` together with this skill. Call [`/start-workflow workflow-bugfix`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/investigate --mode=debug`](../investigate/SKILL.md) (gate) → [`/spec [mode=amend]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=mockup --explore`](../work-item/SKILL.md) (optional; conditional) → [`/plan`](../plan/SKILL.md) (optional; conditional) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (optional; conditional) → [`/integration-test`](../integration-test/SKILL.md) (gate) → [`/fix`](../fix/SKILL.md) (core) → [`/spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`/workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`/integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`/workflow-e2e --source=context`](../workflow-e2e/SKILL.md) (optional; conditional) → [`/demo-guide`](../demo-guide/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1; exit root-cause-traced) → Specify (2) → Plan (3) → Build (3; exit spec-synced) → Review (1; exit review-converged) → Verify (3; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:90e61d1135f1f9baaed4b0f6bc586cfc905ee2a7f98ac59a3836cfbeab38cbcf -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

> **Work tracking:** Keep the project's tracked work current in the same change, as its root instructions (`CLAUDE.md` or `AGENTS.md`) say. When the project uses the portable tracker (`taskTracking.mode` is `observe` or `linked`), read [the linked work integration guide](../task-track/references/integration-guide.md) at capture, start, saved-work, verification, handoff and close-out checkpoints. Use the actual linked producer and exact items; retain the primary outcome and record optional upkeep once through the common owner. Continue untracked when no link exists; acceptance remains explicit.

## Quick Summary

**Goal:** Fix a reported defect at the root cause its end-to-start trace proves, guarded by a regression test that fails without the fix and passes with it — cheap on a small local bug, thorough on a wide or risky one.

**Use this** for a bug, error, crash, regression or stale/incorrect output whose cause is unknown or whose reach is wide. A known one-line cause in one module fits a custom-simple route (investigate → regression test + fix → review → verify). A request that changes intended behavior is a feature (`workflow-feature`); a behavior-preserving restructure is `workflow-refactor`.

**Key rules:**

- **MUST** triage size, kind and risk FIRST — the triage picks which recommended skills run and how deep.
- **MUST** trace the root cause end-to-start before any fix, classify Code Bug vs Spec Bug before any regression test, and prove the regression test catches the bug (RED with the fix reverted) and passes with it (GREEN) in the single verify.
- **MUST** fix at the layer that owns the violated invariant; converge the change review; sync the spec when a canonical spec or specified behavior changed.
- **NEVER** encode the buggy behavior into a spec or test, and NEVER weaken a test to turn it green.

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

Classify the defect before choosing steps and record the result in the workflow report:

- **Size** (guidance, not a law): **XS** 1–3 files / ≤100 changed lines · **S** ≤15 files · **M** ≤60 · **L** ≤300 · **XL** >300.
- **Kind** (all that apply): behavior bug · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · performance · UI surface · test-only · tooling/config · cross-module/cross-service.
- **Risk:** irreversible, data, security, cross-module. Escalate depth on risk and ambiguity, not on file count alone.

| Triage result | Typical route through the recommended skills |
| --- | --- |
| XS/S, one owning layer, Code Bug, no contract/data/security | investigate → regression test + fix → review → verify (mutation check = RED proof) → close; `/fix` plans inline; spec steps only when a canonical spec covers the area |
| M, or a Spec Bug, or several TCs | add `/plan`; add the spec-tests review when the TC change is more than one regression case |
| L/XL, cross-module, contract/data/security, or ambiguous cause | full sequence; make `/plan` capture the decisions, owners, risks and final gates; partition verification and review per module |

## Required Quality Gates

Non-negotiable — `/workflow-end` checks each against its evidence before the run closes:

1. **Root cause traced** (`/investigate --mode=debug`, gate) — end-to-start trace from the observed final state through reader → storage/projection → writer → consumer/job → producer, every feeder path, a hypothesis matrix with the environment weighed as a competing cause, the owning fix layer and a forward convergence proof, all with `file:line`.
2. **Code Bug vs Spec Bug classified** before any regression TC or test (gate below), with a preservation note: `current behavior → expected behavior → unchanged behavior to preserve → regression evidence`.
3. **Regression guard RED → GREEN** — the `/integration-test` step (gate) writes a test that reproduces the bug before `/fix`, without running it; `/fix` adjusts that test when the fix changes its seams; the verify step's mutation check reverts `/fix` and the test FAILS (RED), with the fix it PASSES (GREEN). A test that passes without the fix does not catch the bug. Each regression test names its `Business Intent / Invariant Guarded`; lifecycle/state logic asserts state before/after and invalid-transition rejection. A reproducing test that cannot run here is `ENVIRONMENT-BLOCKED` and escalated, never assumed green.
4. **Tests pass** (`/integration-test --mode=verify`, gate) — every behavior the fix changed is covered by tests that ran green in THIS run.
5. **Spec synced** — when a canonical spec or test-case artifact governs the affected area and behavior or a public contract changed, or that spec lacked the case the bug exposed. No canonical spec governs the area → the gate is N/A: record that fact with the searched paths and offer `/spec` as a follow-up.
6. **Review converged** (`/workflow-review-changes`, gate, INLINE in the main session) — validated blocking findings fixed and the fixed state re-reviewed over the whole package (spec + tests + fix).
7. **Goal satisfied and run closed** — the Goal Satisfaction matrix (PASS/FAIL/BLOCKED) maps root cause and RED/GREEN evidence to the saved success criteria; `/workflow-end` closes the run (top-level only).

> **[BLOCKING] Code Bug vs Spec Bug Gate** (the bugfix instance of `SYNC:spec-drift-adjudication` in `shared/sdd-artifact-contract.md`):
>
> - **Code Bug** (= CODE-WRONG) — the canonical spec describes intended behavior and the code diverged → regression TCs for the intended behavior, then fix the code.
> - **Spec Bug** (= SPEC-STALE) — the spec documents the wrong behavior and the code implements it faithfully → correct the canonical spec first via `/spec [mode=amend]`, then TCs for the corrected behavior.
> - **Ambiguous** — ask the user or product owner which behavior is intended before writing TCs.
>
> Reconcile to canonical intent; never normalize the divergence to whichever side currently passes.

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; the registry (`.claude/workflows.json` → `workflow-bugfix`, delivered in the Tier-2 output) owns each step's role and its `applicability` (`when` / `skipReason`, recorded verbatim on skip). This table adds only what the registry does not state — what each step proves and where a step is non-obvious — in the recommended default order.

| Step | Role | Proves · note |
| --- | --- | --- |
| `/investigate --mode=debug` | gate | root cause traced — owns discovery and root cause |
| `/spec [mode=amend]` | optional | spec states intent |
| `/work-item --mode=mockup --explore` | optional | selected mockup before planning — see below |
| `/plan` | optional | fix plan; it validates the material decisions it leaves open inside its step, which is the plan approval |
| `/spec [mode=tests]` | optional | regression TC |
| `/work-item --mode=review --type=spec-tests` | optional | TC quality |
| `/integration-test` | gate | guard written — write the regression test that reproduces the bug, before the fix (not run here) |
| `/fix` | core | the change, at the owning layer; adjusts the pre-written regression test when the fix changes its seams (not run here) |
| `/spec [mode=sync]` | optional | spec synced |
| `/workflow-review-changes --tests=defer` | gate | review converged — INLINE in the main session |
| `/integration-test --mode=verify` | gate | tests pass — the one verify, after the review: full suite + mutation check (RED proof) |
| `/workflow-e2e --source=context` | optional | E2E evidence |
| `/demo-guide` | optional | demo path |
| `/workflow-end` | gate | run closed — prints the recap when `/watzup` does not run |
| `/watzup` | optional | consolidated session report on request or across several workflows |

**New-UI Explore Mockup (conditional, BEFORE `/plan`).** Only when the fix is large (size M+) and creates completely new user-facing UI like a feature — a new page/view, component or dialog — run `/work-item --mode=mockup --explore`, passing the investigation report (or the amended spec) as `--source`. `work-item --mode=mockup` Step 0 owns the scope gate (asked first, before any analysis or drafting) and the direction pick; both run in the main session only. A fix inside existing UI skips it with the registry `skipReason`.

Without `/plan`, `/fix` plans inline and the investigation report records the fix layer, blast radius and rollback.

Outcome gates: root cause traced · tests pass · spec synced (when a canonical spec governs the area and behavior or a public contract changed, or that spec lacked the case the bug exposed) · review converged · run closed.

A recommended step the triage shows would do no real work is not run; record it through the Step Execution Protocol with its evidence.

**Ad hoc skills (not registry steps):** `/performance-review` for a performance bug (below) · `/investigate` for an "unused code" removal decision (grep evidence, confidence ≥80%, cross-module check) · `/spec` (ui-intent) beside the spec sync when user-facing behavior changed — refresh the Feature Spec §6 interaction surface (View Inventory, Key UI States, the click-path the bug touched) and link the governing design spec; state the skip reason for a backend-only fix.

> **[PERFORMANCE-SDD ROUTE]** A performance bug (latency, throughput, memory, query speed, load behavior) runs `/performance-review` with SLA/benchmark evidence: target metric, baseline, measurement command and acceptable regression budget. Performance scope never bypasses functional no-regression checks — run them when behavior can change — and a changed SLA, performance constraint or behavior boundary updates specs and docs.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and order — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate and pick (`work-item --mode=mockup` Step 0) never run inside a delegated sub-agent. Fixed constraints (data dependencies):

- The root-cause trace exists before any fix plan, regression TC or fix; the RED proof is the verify step's mutation check (revert the fix, the regression test must fail) — no separate RED run.
- A change exists before it is reviewed or tested; the spec sync runs before the review that checks it; tests run once, last, after the static review (`--tests=defer`); a fix made by the verify step re-runs `/workflow-review-changes --tests=defer`, and a fix made by that re-review re-runs the verify (`SYNC:verify-last-order`); `/workflow-end` runs last.
- `/workflow-review-changes` runs INLINE in the main session — never as a sub-agent — and owns the test-quality review, the docs/domain-entity reference refresh and experience acceptance; do not repeat them here.
- Gates awaiting user approval (Ambiguous classification, plan approval) are never parallelized.

Recommended: XS/S work inline without sub-agents; independent read-only investigations (feeder paths, hypotheses) as one parallel wave; L/XL verification and review partitioned into bounded batches per module with one report per batch.

## Memory, Reporting and Fix Path

- **Tasks:** one phase task per phase, one row per selected step or aspect so nothing is lost after compaction; child skills expand their phases under the parent row.
- **Report first:** create `tmp/reports/workflow-bugfix-{YYMMDD}-{HHmm}-{slug}.md` before the first finding; append triage, trace, RED/GREEN evidence and deviations per step; re-read it and `TaskList` after compaction. Sub-agent briefs make report-writing their first deliverable.
- **Goal Contract:** resolve the active goal at start per `SYNC:goal-contract-satisfaction-loop` (active plan `goal.md` → `goals/{YYMMDD-HHmm}-{slug}/goal.md` under the plans root, default `plans/`, relocated by `docsRoots.plans.path` in `docs/project-config.json` → create from the bug report); pass the same goal file to every child step; emit the Goal Satisfaction matrix before `/workflow-end`.
- **Spec context:** when the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) holds a spec for the affected module, read its rules and contracts before investigating.
- **Fix path:** validate a finding (evidence-backed, reproducible) before fixing it; fix at the owning layer; re-run the reviewer or test that raised it, plus a holistic pass when fixes were non-trivial. When the bug touches a `[HARD]` rule or invariant, regression TCs add invariant/property cases whose bar is a killed mutant, not line coverage, and each behavior-changing finding updates BOTH spec and tests.
- **Loop bounds:** round 1 exits on zero open validated findings (LOW deferral); from round 2 only CRITICAL/HIGH/MEDIUM block and LOW-only findings are deferred; cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; no progress → escalate via `ask user question tool`. Single-occurrence review steps converge inside their own skill loop.

## Activation

Activate the `workflow-bugfix` workflow: run `/start-workflow workflow-bugfix` with the user's prompt as context. Apply the shared SDD Artifact Contract from `shared/sdd-artifact-contract.md` in the active skills root; project conventions come from `docs/project-config.json` and the docs index. Code-extracted specs and TCs stay reference-only until canonical review accepts them.

Recommended default order (roles in the table above):

**IMPORTANT MANDATORY Steps:** /investigate --mode=debug -> /spec [mode=amend] -> /work-item --mode=mockup --explore -> /plan -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /integration-test -> /fix -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /workflow-e2e --source=context -> /demo-guide -> /workflow-end -> /watzup

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `end-to-start-debugger-trace` — Walk backward from the observed end state through every feeder path before fixing; investigating non-trivial bugs or failed verification, changing code behavior, or tracing unclear code flow → .claude/skills/shared/protocols/end-to-start-debugger-trace.md
- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `ui-intent-layer` — Tech-agnostic UI intent layer in every UI-bearing spec; writing a spec for a feature with a user interface → .claude/skills/shared/protocols/ui-intent-layer.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:end-to-start-debugger-trace:reminder -->

**IMPORTANT MUST ATTENTION** for non-trivial bugs, failed verification, regression fixes, behavior-changing code or unclear code flow, trace backward from the observed output through every feeder path before fixing. Establish hypotheses, the authoritative invariant owner and forward proof; retain validation at untrusted boundaries. Ordinary artifact review or graph lookup alone does not trigger a debugging workflow.

<!-- /SYNC:end-to-start-debugger-trace:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:ui-intent-layer:reminder -->

- **MANDATORY** For UI-bearing specs, author/maintain the tech-agnostic interaction-surface layer (views with information priority now/later/not-here and container role + navigation map + observable states + user-action flows), resolving it through the configured profile's intent/evidence roles and logical IDs; an unresolved owner, role, ID, carrier, or link stays `UNKNOWN`/`BLOCKED`. **Strict portable fallback — only when neither config nor local references declares a native artifact contract:** trace each flow to the default `US-`/`OP-`/`BR-` IDs and record the companion artifact in the `design_spec:`/`mockup:` frontmatter keys. Name ZERO frameworks/routes/CSS/component classes; skip ONLY for backend-only features with a stated reason.

<!-- /SYNC:ui-intent-layer:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify every finding Critical/High/Medium/Low by consequence using the affected asset, shipped impact, exposure, reversibility, evidence location, and confidence; Critical/High/MEDIUM remain actionable under the round bar, while LOW is recorded/deferred from round 2 onward.
- **MANDATORY** A finding names a reachable trigger path (caller, input, state or event that reaches the defect) and a consequence; an unreachable concern is an observation, and unsettled reachability is `NOT VERIFIABLE` only when the concern would be MEDIUM or higher (an observation otherwise) — never a speculative LOW.
- **MANDATORY** Keep binary gates separate from severity: a failed test, security must-fix, required artifact, or parity check blocks at every round and is never relabeled LOW.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->

<!-- SYNC:environment-fault-hypothesis:reminder -->

**MUST ATTENTION** environment-fault gate: a bug, failed test, error, or odd output is NOT proof of a code defect. Sweep environment preconditions (versions, deps/install state, config & env vars, services, ports/network/clock, permissions, leftover state) and resource/transience suspects (RAM, CPU, disk, handles, network, timeouts) as a competing hypothesis, cite the discriminator you ran, and fix an environment cause in the environment — never by editing code or weakening a test. "Flaky" is a symptom, not a verdict.

<!-- /SYNC:environment-fault-hypothesis:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** fix the defect at the root cause its end-to-start trace proves, guarded by a regression test that fails without the fix and passes with it.

- **MUST ATTENTION** triage size, kind and risk FIRST; run only the recommended skills the triage shows do real work, and log every deviation with evidence.
- **MUST ATTENTION** root cause before fix: `/investigate --mode=debug` (gate) produces the trace, feeder paths, hypothesis matrix, owning fix layer and forward convergence proof; classify Code Bug vs Spec Bug before any regression test.
- **MUST ATTENTION** regression guard: the `/integration-test` step (gate) writes the regression test before `/fix` without running it, and `/fix` adjusts it when the fix changes its seams; the one `/integration-test --mode=verify` (gate, after the static review) proves it FAILS with the fix reverted by hand-edit (never `git checkout`/`restore`/`stash`) and PASSES with it in this run; NEVER encode buggy behavior or weaken a test to go green.
- **MUST ATTENTION** `/workflow-review-changes` runs INLINE in the main session and converges the whole package; sync the spec when a canonical spec or specified behavior changed; emit the Goal Satisfaction matrix and close with `/workflow-end`.
