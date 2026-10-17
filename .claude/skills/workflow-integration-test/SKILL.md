---
name: workflow-integration-test
version: 1.0.0
description: "[Workflow] Write and verify spec-traced integration tests, or diagnose and fix failing suites to repeatable green. --mode={write|green}."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-integration-test` together with this skill. Call [`/start-workflow workflow-integration-test`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `write`: [`/investigate`](../investigate/SKILL.md) (core) → [`/spec [mode=tests]`](../spec/SKILL.md) (optional; conditional) → [`/work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (optional; conditional) → [`/integration-test`](../integration-test/SKILL.md) (core) → [`/integration-test --mode=review`](../integration-test/SKILL.md) (gate) → [`/integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`/spec [mode=sync]`](../spec/SKILL.md) (gate) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Specify (2) → Build (1) → Review (1; exit review-converged) → Verify (3; exit tests-pass, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:write fingerprint:f60054694803176457053fb6122fb63beecefb5dbeba82481818f38f21c7a43b -->
- Mode `green`: [`/investigate`](../investigate/SKILL.md) (optional; conditional) → [`/integration-test --mode=verify --fix-loop`](../integration-test/SKILL.md) (gate) → [`/spec [mode=sync]`](../spec/SKILL.md) (optional; conditional) → [`/docs-manager --mode=update`](../docs-manager/SKILL.md) (optional; conditional) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (1) → Verify (3; exit tests-pass, root-cause-traced, spec-synced) → Close (2; exit run-closed)
<!-- workflow-mode:green fingerprint:665a489c4f94b4944c71892329539b9fa76ca8a66f931432dd9252b8ce2e5a15 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `/start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Get integration behavior proven through one workflow with two variants chosen by `--mode`: `write` (default) authors or updates spec-traced integration tests and proves them green with real assertion value; `green` drives a red, flaky or unproven suite to a truthful, repeatable green by fixing each failure at its owning layer.

**Python readiness:** when the selected runner requires Python, read `integration-test/references/mode-verify.md` → **Persistent Python readiness** before verification. Repair missing Python on Windows, macOS and Linux through that policy; reuse a compatible installation and prove discovery from a fresh shell before tests.

**Use when:** `write` — covering untested or changed behavior with integration tests, converting existing cases into test code, or auditing and stabilising an existing suite. `green` — a suite or a named test is red, flaky, or must be proven repeatably green. To reconcile specs and tests after a code change, use `/workflow-spec-sync`; for case authoring with no test code, run `/spec [mode=tests]` directly. Formerly `/workflow-write-integration-test` (`--mode=write`) and `/workflow-integration-test-green` (`--mode=green`).

**IMPORTANT MANDATORY Steps:** resolve the `workflow-integration-test` manifest variant for `--mode` first (default `write`), then create one task per phase with a row per returned occurrence (default: /investigate -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /integration-test -> /integration-test --mode=review -> /integration-test --mode=verify -> /spec [mode=sync] -> /docs-manager --mode=update -> /workflow-end -> /watzup)

Variant step chains (each equals the registry variant of that name; gates and optional steps are declared there and restated in the variant reference):

- `write`: /investigate -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /integration-test -> /integration-test --mode=review -> /integration-test --mode=verify -> /spec [mode=sync] -> /docs-manager --mode=update -> /workflow-end -> /watzup
- `green`: /investigate -> /integration-test --mode=verify --fix-loop -> /spec [mode=sync] -> /docs-manager --mode=update -> /workflow-end -> /watzup

**Step contract:** steps follow `/start-workflow` → Step Execution Protocol — `gate` steps always run, a step that runs invokes its `Skill` tool, and every other deviation is logged. NEVER batch-complete validation gates.

Activate the `workflow-integration-test` workflow. Run `/start-workflow workflow-integration-test` (add `--mode=green` for the green variant) with the user's prompt as context. The resolved variant is a complete sequence: execute that manifest and never a hand-swapped list.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Mode Selection — FIRST Action](#mode-selection--first-action)
- [Variant `write`](#variant-write)
- [Variant `green`](#variant-green)
- [Closing Reminders](#closing-reminders)

## Mode Selection — FIRST Action

Pick the variant from the prompt (or an explicit `--mode=`) BEFORE creating tasks and record it, with the resolver fingerprint, in the workflow report. Every variant closes through `/workflow-end`, which checks the variant's own outcome gates.

| `--mode` | Pick it when | Deliverable | Outcome gates (registry) |
| --- | --- | --- | --- |
| **write** (default) | The prompt asks to write, add, update, convert or audit integration tests, cover changed or untested behavior, or generate tests from specs or feature docs; also when the prompt only says "integration tests" — state the assumption. | New or updated spec-traced integration tests, one one-pass review report, green runner evidence, synced cases | `spec-synced` · `review-converged` (one completed pass) · `tests-pass` · `run-closed` |
| **green** | The prompt says tests are failing, red, flaky or intermittent, asks to make them pass, drive the suite to green, or prove the suite repeatably green. An audit that turns up many failures hands the red suite to this variant. | A suite, or the named target, repeatably green with every failure adjudicated and fixed at its owning layer | `tests-pass` · `root-cause-traced` (when a verify run reported a failing test) · `spec-synced` (when a fix changed tested behavior or a test case) · `run-closed` |

## Variant `write`

**[BLOCKING]** When `--mode=write` (default) resolves, read `.claude/skills/workflow-integration-test/references/variant-write.md` in full FIRST — its triage, quality gates, recommended-skills table, orchestration limits, Test Architecture Contract handoff, reporting and loop bounds are the contract for this variant.

## Variant `green`

**[BLOCKING]** When `--mode=green` resolves, read `.claude/skills/workflow-integration-test/references/variant-green.md` in full FIRST — its triage, quality gates, recommended-skills table, inline-loop rules, Test Architecture Contract handoff, reporting and loop bounds are the contract for this variant.

---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `environment-fault-hypothesis` — Weigh the environment as a competing cause, with a named discriminator; judging a bug report, failing test, error or unexpected output → .claude/skills/shared/protocols/environment-fault-hypothesis.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `integration-test-execution-discipline` — How integration tests are written, reviewed, run, diagnosed and cleared; working in the integration-test skill family → .claude/skills/shared/protocols/integration-test-execution-discipline.md
- `real-world-fidelity-testing` — Integration, E2E and system tests exercise real boundaries; authoring, reviewing or repairing integration, E2E or system tests → .claude/skills/shared/protocols/real-world-fidelity-testing.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `severity-rubric` — One consequence-based Critical, High, Medium, Low scale for every finding and gate; classifying a finding or deciding whether a review round passes → .claude/skills/shared/protocols/severity-rubric.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `task-tracking-external-report` — Task breakdown before the work and report files written incrementally; starting any multi-step skill, plan or review → .claude/skills/shared/protocols/task-tracking-external-report.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `test-failure-fault-adjudication` — Decide whether the source or the test is at fault before editing either; a test fails → .claude/skills/shared/protocols/test-failure-fault-adjudication.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `tmp/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->


<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** `write` — write or update integration tests traced to canonical cases, complete one bounded review pass, and prove them green under the configured repeat policy; `green` — drive the resolved scope to a truthful, repeatable green: adjudicate, fix at the owner, review each fix, re-verify, then sync what the fixes made stale.

- **MUST ATTENTION** select `--mode` and read that variant's reference in full FIRST, then triage (size, kind, case state for `write`; scope and failure load for `green`) — why: depth follows risk, not test count, and a variant's gates live in its reference.
- **MUST ATTENTION** a failing test gets ONE written five-way Fault Verdict (`SOURCE-WRONG` · `TEST-WRONG` · `TEST-NOT-OPTIMAL` · `ENVIRONMENT-BLOCKED` · `AMBIGUOUS`) BEFORE any edit; NEVER force green — no weakened or removed assertions, skips, widened assertion timeouts, retried assertions, or narrowed scope — why: a weakened assertion protects nothing.
- **MUST ATTENTION** never claim verification without runner output; every pass/fail claim cites the command, exact counts and exit status.
- **MUST ATTENTION** `write`: read the production and test source BEFORE writing any assertion; every test names the invariant it protects and asserts an outcome the system owns — NEVER smoke-only. `green`: run the fix-loop and the skills it drives INLINE, and review every round's fix diff.
- **MUST ATTENTION** bootstrap the phase tasks, one row per selected occurrence, before triage; record final consistency and lessons-learned checks under closure, write the report FIRST and cite `file:line` evidence.

**[TASK-PLANNING]** Resolve the variant, create all occurrence tasks with `TaskCreate`, then run its triage and execute the selected steps.
