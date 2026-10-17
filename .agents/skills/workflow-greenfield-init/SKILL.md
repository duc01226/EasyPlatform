---
name: workflow-greenfield-init
description: '[Workflow] Take a new product from idea through architecture, an approved plan and scaffolding to a reviewed, tested foundation; hand the first slice to workflow-implement-spec.'
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

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-greenfield-init` together with this skill. Call [`$start-workflow workflow-greenfield-init`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`$initiative`](../initiative/SKILL.md) (core) → [`$web-research --chain=deep-dive`](../web-research/SKILL.md) (optional; conditional) → [`$market-analysis`](../market-analysis/SKILL.md) (optional; conditional) → [`$business-evaluation`](../business-evaluation/SKILL.md) (optional; conditional) → [`$spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`$domain-analysis`](../domain-analysis/SKILL.md) (core) → [`$tech-stack-research`](../tech-stack-research/SKILL.md) (core) → [`$architecture --mode=design`](../architecture/SKILL.md) (core) → [`$architecture --mode=scalability`](../architecture/SKILL.md) (gate) → [`$why-review`](../why-review/SKILL.md) (gate) → [`$security-audit --report-only`](../security-audit/SKILL.md) (optional; conditional) → [`$performance-review --report-only`](../performance-review/SKILL.md) (optional; conditional) → [`$scenario`](../scenario/SKILL.md) (optional; conditional) → [`$plan`](../plan/SKILL.md) (core) → [`$plan --mode=review`](../plan/SKILL.md) (core) → [`$work-item --mode=refine`](../work-item/SKILL.md) (core) → [`$work-item --mode=review --type=task`](../work-item/SKILL.md) (core) → [`$work-item --mode=challenge --reuse=task-review`](../work-item/SKILL.md) (optional; conditional) → [`$work-item --mode=story`](../work-item/SKILL.md) (core) → [`$work-item --mode=dor --reuse=task-review`](../work-item/SKILL.md) (core) → [`$work-item --mode=mockup`](../work-item/SKILL.md) (optional; conditional) → [`$spec [mode=tests]`](../spec/SKILL.md) (core) → [`$work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (core) → [`$spec [mode=clarify]`](../spec/SKILL.md) (optional; conditional) → [`$plan`](../plan/SKILL.md) (core) → [`$plan --mode=review`](../plan/SKILL.md) (core) → [`$plan --mode=validate`](../plan/SKILL.md) (gate) → [`$scaffold`](../scaffold/SKILL.md) (optional; conditional) → [`$harness-setup`](../harness-setup/SKILL.md) (optional; conditional) → [`$architecture --mode=full`](../architecture/SKILL.md) (gate) → [`$scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure`](../scan-all/SKILL.md) (core) → [`$workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`$test`](../test/SKILL.md) (gate) → [`$workflow-end`](../workflow-end/SKILL.md) (gate) → [`$watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (7) → Plan (20; exit plan-approved) → Build (2) → Review (3; exit review-converged) → Verify (1; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:2fbbb8165740c63216fe828020ab3929f771abd7510c82ec864398cf02515379 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`$sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Workflow steps follow the guided contract in `$start-workflow` → Step Execution Protocol: `gate` steps are fixed; other steps may flex with a logged reason.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** take a brand-new product from idea to a reviewed, tested, right-sized foundation, an approved implementation plan and a reviewed first-slice spec — researched only as deep as the idea needs, then modeled, architected, planned and scaffolded with evidence — and hand the first slice to `$workflow-implement-spec`, which builds it. You act as solution architect.

**Use when** no codebase exists yet (planning artifacts may). Existing codebase with a large or ambiguous feature → `workflow-big-feature`. Planned work or spec only, no build → `workflow-planned-work` (`--from=idea --to=tasks` or `--to=spec`). The first slice is built by `$workflow-implement-spec` after this workflow closes.

**Confirmation gate:** `activation: confirm`. When the AI routes here on its own, it MUST first ask the route gate's one workflow question — this full workflow with its current step count, a slimmer custom initialization route listing its steps, or direct execution — recommending the full workflow only when no leaner route would satisfy the request. An explicit user request for this workflow needs no question. Route mode `auto` asks the same question, recommending the full workflow first; route mode `off` starts it only on an explicit request.

**Workflow:** triage → discover & model (idea, triaged research, domain, stack, architecture + gates) → plan & planned work (PLAN₁, releasable tasks, stories, test specs, PLAN₂, `$plan --mode=validate`) → foundation (scaffold with its linters and harness, foundation review, reference docs, the converging change review of the foundation) → prove the foundation (the final `$test` on the scaffold harness) → close with the hand-off: `$workflow-implement-spec` builds the first slice with the approved plan.

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count.
- MUST ATTENTION self-routing stops at the workflow question: show the full workflow's step count, the lighter custom route and direct execution before activation — why: greenfield inception is intentionally comprehensive and may be unnecessary for a bounded project setup.
- MUST ATTENTION business and domain before technology — never ask for the tech stack upfront.
- MUST ATTENTION the foundation matrix, the AI-agent-access decision and the Test Architecture & Execution Contract block the hand-off until complete.
- NEVER skip mandatory workflow or skill gates; cite evidence for every claim, confidence >80% to act.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Size & Kind Triage (FIRST action)](#size--kind-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Gates and Optional Steps](#gates-and-optional-steps)
- [Recommended Skills by Phase](#recommended-skills-by-phase)
- [Workflow-Specific Contracts](#workflow-specific-contracts)
- [Orchestration Freedom](#orchestration-freedom)
- [Memory & Reporting](#memory--reporting)
- [Fix Path & Loop Bounds](#fix-path--loop-bounds)
- [Step Chain](#step-chain)
- [Closing Reminders](#closing-reminders)

## Size & Kind Triage (FIRST action)

Classify before choosing steps and write the result to the run report; it answers every optional step's `when`.

- **Scale** — prototype/internal tool (S: one team, known domain, low stakes) · product (M/L: external users, business case) · platform (XL: several products, teams or tenants). Scale sets research depth, the performance review and the foundation's weight; never force heavyweight architecture onto a small target.
- **UI surface** — none → skip `$work-item --mode=mockup` and the design gate; `$scan-all` reports its `ui-system` target `SKIPPED`.
- **Market research** — commercial product, unfamiliar domain or missing owner facts → `$web-research --chain=deep-dive` (runs the source deep dive inside); a market to size → `$market-analysis` (reads that evidence base); value not yet accepted → `$business-evaluation`. A mandated internal tool with owner-supplied facts skips all three.
- **Criticality** — auth, secrets, money, PII, regulated data or network exposure → architecture `$security-audit`; product/platform scale or declared latency/throughput/volume needs → architecture `$performance-review`; both join the `architecture-gates` barrier.
- **`isLargeIdea`** `= multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedTaskThatMustSplit`, evaluated before any spec, task, story or plan. True → the owning task/spec carries the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`), its stable slice IDs flow into stories, mock-ups and the task presentation, and `$scenario` runs when the scope needs adversarial analysis. False → record `Decomposition Applicability: EXEMPT` with reason and owner. Ordinary runs never write the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); only an explicit roadmap request enters the standalone roadmap skill, and a supplied roadmap is read-only context.
- **Test tiers** — which of Unit, Integration/System and E2E apply; this sets what the foundation's final `$test` covers and which tiers the first slice's `$workflow-implement-spec --mode=greenfield-slice` run writes and verifies.

## Required Quality Gates

Each outcome gate names the evidence that proves it:

- **`plan-approved`** — `$plan --mode=validate` passed on the reviewed PLAN₂, the plan that executes, with explicit evidence; no inferred decision auto-approved.
- **`tests-pass`** — the final `$test` reports commands, exact results and exit status for the scaffold's harness and smoke tests per applicable tier, green in THIS run. The first slice's behavior is tested in `$workflow-implement-spec`, which owns its verify, mutation check and near-end E2E.
- **`review-converged`** — the nested `$workflow-review-changes --tests=defer` converged on the foundation (scaffold, harness and reference docs) after the foundation review `$architecture --mode=full`, whose BLOCKED/WARN findings are fixed first; its review receipt is the evidence.
- **`run-closed`** — `$workflow-end` checked every outcome gate.

This skill adds quality bars that hold in every run. Foundation reviewed rests on the registry `gate` steps `$architecture --mode=full` and `$workflow-review-changes --tests=defer`; Foundation decided, the Test Architecture & Execution Contract, Releasable tasks and the Hand-off are content bars no deviation removes. A bar that names a blocking condition holds its handoff until met.

- **Foundation decided (before PLAN₁ completes)** — `SYNC:scale-ready-foundation` applicability matrix (architecture, actors/authorization, dependency/license, real infrastructure boundaries, execution modes, CI/operations, UI when applicable) plus the `SYNC:ai-agent-as-user-access` decision, or an explicit evidence-backed omission; carried into scaffold, harness, foundation review and plans.
- **Test Architecture & Execution Contract (before the hand-off)** — emitted during `$architecture --mode=design`; every tier `APPLICABLE` with runner, owner, copy-ready full and focused commands, zero-match behavior, CI gate and unique run/data identity, or `N/A — <evidence>`. A missing field blocks the hand-off. PLAN₂ carries the integration-test structure, data setup and CI it defines.
- **Releasable tasks** — every task passes `.claude/skills/shared/releasable-task-contract.md`: one actor-facing outcome, foundation work attached as enabling work, UI tasks with the connected multi-view mock-app flow.
- **Foundation reviewed** — the foundation review `$architecture --mode=full` (`greenfield-foundation-review`) runs after scaffold and before the hand-off with its BLOCKED/WARN findings fixed, and the nested `$workflow-review-changes --tests=defer` (`greenfield-review`) then reviews the scaffolded code, harness and reference docs to convergence, its tests deferred to the final `$test`; the architecture review's trade-off interrogation and Step 5 `$why-review` validation are the pre-coding rationale check over the planned and scaffolded foundation (`mode=init`).
- **Hand-off** — `$workflow-end` prints the next command: `$workflow-implement-spec --mode=greenfield-slice` with the first slice's spec, test cases and the approved PLAN₂. That mode skips its own plan step while the approved plan still covers the slice (a registry `when-false` skip citing the plan and its Validation Summary), seeds data when the product persists state, and runs its near-end `$workflow-e2e --source=context` as a gate, which records an evidence-backed `N/A` or `ENVIRONMENT-BLOCKED` when no surface applies.

## Gates and Optional Steps

**Step contract:** `$start-workflow` owns how gate, core and optional steps run; this list summarizes the non-core roles in `.claude/workflows.json`, whose `when`/`skipReason` text is recorded verbatim on skip.

- **Gates (always):** the `architecture-gates` barrier core (`$architecture --mode=scalability` ∥ the rationale `$why-review`) · `$plan --mode=validate` (after the PLAN₂ review) · the foundation review `$architecture --mode=full` · the foundation change review `$workflow-review-changes --tests=defer` · the final `$test` · `$workflow-end`.
- **Optional — research:** `$web-research --chain=deep-dive` (research needed) · `$market-analysis` (a market to size; when skipped, `$business-evaluation` marks market figures N/A) · `$business-evaluation` (value undecided) · `$spec [mode=discovery]` (existing specs or code).
- **Optional — design and planned work:** `$security-audit --report-only` (criticality) · `$performance-review --report-only` (scale or declared need) — the two conditional members of the `architecture-gates` barrier · `$scenario` (`isLargeIdea` or adversarial risk) · `$work-item --mode=mockup` (UI) · `$spec [mode=clarify]` (open spec decisions).
- **Optional — foundation:** `$scaffold` (applicable planned foundations are missing/unsuitable) · `$harness-setup` (scaffold skipped, so linters and harness still need setting up) · `$watzup` (a requested session report or a multi-workflow handoff; `$workflow-end` prints the recap and the hand-off).
- **Core:** everything else, including `$domain-analysis`, `$tech-stack-research` and the `$scan-all` reference-doc refresh; each runs by default.

## Recommended Skills by Phase

- **Discovery** — `$initiative` always (problem, actors, non-goals, triage); per triage `$web-research --chain=deep-dive` → `$market-analysis` (reads the evidence base, searches only its named gaps) → `$business-evaluation` → option set with confidence, go/no-go — one research validation with the user and one go/no-go confirmation.
- **Domain** — `$domain-analysis` (ERD + bounded contexts) → entities, invariants, ownership; the design-rationale `$why-review` in the `architecture-gates` barrier challenges its decisions.
- **Architecture** — `$tech-stack-research` (top 3 options per layer) → `$architecture --mode=design` (foundation matrix, test contract; consumes the confirmed stack decisions instead of asking again) → `architecture-gates` barrier (scalability, design rationale, triaged security and performance reviews) → `$scenario` per triage. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) advise right-sizing in both directions and never change a verdict.
- **PLAN₁** — `plan-architecture` → its review → reviewed architecture plan, written once over architecture artifacts the barrier has already reviewed (risk-review findings included).
- **Planned work** — `$work-item --mode=refine` → task review → `$work-item --mode=challenge` → `$work-item --mode=story` → `$work-item --mode=dor` → `$work-item --mode=mockup` (UI) → releasable, DoR-ready tasks. Challenge is optional: it runs when a second reviewer is available or the task is M+ or risky, and then before the stories are cut, so its revisions land first; `$work-item --mode=dor` also checks the stories (its rows ST1-ST4 are the story-review checks, M1-M7 included). The workflow passes `--reuse=task-review` to `$work-item --mode=challenge` and `$work-item --mode=dor` (they re-evaluate only the criteria the `$work-item --mode=review --type=task` report did not cover; drop the flag after any task edit; standalone runs evaluate every check).
- **PLAN₂** — `test-spec-initial` → its review → `$spec [mode=clarify]` → `plan-implementation` → its review → `$plan --mode=validate` → `plan-approved` on the ready-to-start plan that executes.
- **Foundation** — `$scaffold` (runs `$linter-setup` → `$harness-setup` itself) or, when scaffold was skipped, `$harness-setup` (its Phase C runs `$linter-setup` for missing sensors) → `$architecture --mode=full` foundation review → `$scan-all --targets=…` → `$workflow-review-changes --tests=defer` → reviewed foundation, reference docs.
- **Prove** — the final `$test` runs the scaffold's harness and smoke tests once, after the foundation review and the foundation change review.
- **Close** — `$workflow-end` checks every outcome gate and prints the hand-off to `$workflow-implement-spec --mode=greenfield-slice` → `$watzup` (only on a requested report or a multi-workflow handoff).

## Workflow-Specific Contracts

- **Decisions** — 2–4 options with confidence % and evidence per major decision; validate each phase's decisions with the user via `ask user question tool` before building on them (the research phase once, as a whole, plus one go/no-go when a business case ran); never self-approve a one-way door. Save artifacts to the plan directory per step.
- **Occurrence names** — repeated skills are distinct tasks: PLAN₁ `plan-architecture` (system design, boundaries, tech choices) · PLAN₂ `plan-implementation` (stories, test specs, phased tasks, and the integration-test structure, data setup and CI the Test Architecture & Execution Contract defines) · design rationale review `architecture-rationale-review` · foundation review `greenfield-foundation-review` · `test-spec-initial`.
- **Scaffold** — map each applicable planned foundation requirement to a suitable existing owner or a missing/unsuitable boundary. Run scaffold only for uncovered requirements; create only plan-selected justified abstractions, not a mandatory interface/base layer. Skip evidence: "All applicable planned foundation requirements are covered by suitable existing owners and reused." Scaffold owns `$linter-setup` → `$harness-setup`; when skipped, harness-setup retains its missing-sensor setup duties.
- **Reference docs** — after the foundation review's fixes, one `$scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure` derives the project-reference docs (default `docs/project-reference/`; `docsRoots.projectReference.path` in `docs/project-config.json` overrides) from the reviewed foundation, refreshing only the listed targets that apply (`ui-system` only with a UI stack), so feature work reads accurate references from day one. A later fix that changes the foundation re-runs the affected target before the hand-off.
- **E2E** — runs in `$workflow-implement-spec --mode=greenfield-slice` for the first slice, where `implement-spec-e2e` is a gate; this workflow records the applicable surfaces in the Test Architecture & Execution Contract.
- **Delegated build** — `$workflow-implement-spec` owns the first slice's build, spec sync, nested `$workflow-review-changes` (production-readiness security, domain-entity quality, integration-test coverage, docs) and verify; this workflow reviews only the foundation and does not repeat them for the slice.
- **Architecture quality** — `$architecture --mode=scalability` runs in init mode (build/CI scalability, architecture pattern, module isolation, dependency discipline, coupling, horizontal scaling, observability).

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. Fixed constraints only: the scaffold exists before the foundation review, and the review's fixes land before the final `$test`, which runs once, last (`SYNC:verify-last-order`); a test fix re-runs the foundation change review `$workflow-review-changes --tests=defer` over the settled tree (`SYNC:verify-last-order`), and a review fix re-runs the final `$test`; `$workflow-end` runs last; gates awaiting user approval are never parallelized. S prototypes run mostly inline; L/XL foundations partition into bounded batches per module, one report per batch.

Declared all-return barrier — advance only after every member returns:

- **`architecture-gates`** — four members over the finished `$architecture --mode=design` artifacts, launched in ONE message: `$architecture --mode=scalability` as a fresh read-only `architect` sub-agent; the design-rationale `$why-review` INLINE in FULL mode so its Trade-Off questions reach the user — it also challenges the domain and research decisions the design rests on; and the two conditional members selected by triage, `$security-audit --report-only` (`security-auditor`) and `$performance-review --report-only` (`performance-optimizer`), each writing only its report, asking nothing and editing nothing. A skipped conditional member counts as returned. After the barrier, validate the risk-review findings with the user; PLAN₁ folds them in and surfaces any security-vs-performance conflict instead of resolving it silently. A scalability risk on a passed decision becomes a WARN carried into `$scenario` and PLAN₁; a why-review FAIL or a user answer that changes a decision blocks `$scenario` until the design is revised and the barrier re-runs.

## Memory & Reporting

- One phase task per phase, one row per selected step, named by occurrence; the run report under `tmp/reports/` is written FIRST (triage, then a section per phase) and appended per step or batch.
- After compaction, re-read the report and the current task list before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Validate findings (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero open validated findings (LOW deferral); from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; no progress → `ask user question tool`.

## Step Chain

Registry sequence — the recommended default order, mirroring `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** $initiative -> $web-research --chain=deep-dive -> $market-analysis -> $business-evaluation -> $spec [mode=discovery] -> $domain-analysis -> $tech-stack-research -> $architecture --mode=design -> $architecture --mode=scalability -> $why-review -> $security-audit --report-only -> $performance-review --report-only -> $scenario -> $plan -> $plan --mode=review -> $work-item --mode=refine -> $work-item --mode=review --type=task -> $work-item --mode=challenge --reuse=task-review -> $work-item --mode=story -> $work-item --mode=dor --reuse=task-review -> $work-item --mode=mockup -> $spec [mode=tests] -> $work-item --mode=review --type=spec-tests -> $spec [mode=clarify] -> $plan -> $plan --mode=review -> $plan --mode=validate -> $scaffold -> $harness-setup -> $architecture --mode=full -> $scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure -> $workflow-review-changes --tests=defer -> $test -> $workflow-end -> $watzup

Activate the `workflow-greenfield-init` workflow. Run `$start-workflow workflow-greenfield-init` with the user's prompt as context.

> **Supported mode:** use the default `workflow-greenfield-init` sequence resolved from `workflows.json`. Optional steps apply by triage through the step contract; no separate trimmed mode exists.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `scale-ready-foundation` — Scale-ready foundation and brownfield fit; running greenfield init or a big feature → .claude/skills/shared/protocols/scale-ready-foundation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `test-architecture-execution-contract` — Testability as an architecture condition: required test types and execution modes; setting up or reviewing a test architecture → .claude/skills/shared/protocols/test-architecture-execution-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

<!-- SYNC:test-architecture-execution-contract:reminder -->

**MUST ATTENTION** Each assertion-bearing test names the behavior or technical contract it protects and asserts an outcome it owns. Use the project's configured/native test format — Given/When/Then is one valid format, never a framework-wide requirement. When `specArtifacts` is valid, link configured owner/case/variant identity and `intent/contracts` evidence; when absent, name the guarded business intent or technical contract. A malformed declared profile BLOCKS without fallback. Broad test-format migration → assign an owner and next step, never rewrite cases outside scope.

**MUST ATTENTION** Before implementation record evidence-backed applicability for the test types and modes the task/project contract requires: copy-ready full and focused commands where available, zero-match behavior, a useful platform-appropriate entry point, supported execution modes and environments, state-isolation requirements, exact results, and repeat evidence where persistent state makes it relevant. Exercise claimed modes; report a missing required capability as `ENVIRONMENT-BLOCKED`. Never invent production targets or impose a test format. Browser/UI E2E uses the configured runner's waits or project helper for observable readiness and outcomes; apply action pacing only where the project contract specifies it. Reuse the project's evidenced test organization — require a POM, base class, or component taxonomy only when the project actually selects it.

<!-- /SYNC:test-architecture-execution-contract:reminder -->

<!-- SYNC:scale-ready-foundation:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality; smallest fitting architecture; preserve brownfield decisions. Make applicable module/auth/external-boundary/dependency/execution/CI-operations/UI contracts explicit. Verify supported run/test modes; require dual host/container only when supported/required. Greenfield warranted omissions block handoff; brownfield gaps need owner/trigger/next step or evidenced `NOT-APPLICABLE`/`BLOCKED`. Require no absent Docker/database/UI/distributed capability.

<!-- /SYNC:scale-ready-foundation:reminder -->

<!-- SYNC:ai-agent-as-user-access:reminder -->

**IMPORTANT MUST ATTENTION** Greenfield strongly recommends treating AI agents as first-class non-human actors from inception; choose evidence-backed API/CLI/MCP/WebMCP/event/SDK surfaces over one application capability core with authorization, consent, schemas, idempotency, audit, contract tests in the project's native format (GWT is one option), and observability. Big feature and architecture review are optional/advisory: inspect evidence, adapt, defer as an owned opportunity, record `NOT-APPLICABLE`, or block safety gaps; never build every surface or assume agent = administrator.

<!-- /SYNC:ai-agent-as-user-access:reminder -->

<!-- SYNC:session-goal-ledger:reminder -->

- **MANDATORY** Session goal ledger per the `Task Planning Rules`: pin `Original goal:`, keep `User prompts this session: P1…Pn`, and map the result to every prompt before claiming done; full text: `.claude/skills/shared/protocols/session-goal-ledger.md`.

<!-- /SYNC:session-goal-ledger:reminder -->
<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** idea → approved plan, reviewed first-slice spec and a reviewed, tested, right-sized foundation, then the hand-off to `$workflow-implement-spec`, with only the ceremony the triage justifies and no gate skipped.

- **IMPORTANT MUST ATTENTION** triage FIRST (scale, UI, market, criticality, `isLargeIdea`, test tiers) and record it; every skipped optional step logs its registry `skipReason` with evidence.
- **IMPORTANT MUST ATTENTION** before the first `$plan` completes: `SYNC:scale-ready-foundation` matrix and the `SYNC:ai-agent-as-user-access` decision; before the hand-off: a complete Test Architecture & Execution Contract — a missing field blocks it.
- **IMPORTANT MUST ATTENTION** every task passes `.claude/skills/shared/releasable-task-contract.md` — no standalone technical/foundation task; UI tasks carry the connected mock-app flow.
- **IMPORTANT MUST ATTENTION** gates always run: the `architecture-gates` barrier core, `$plan --mode=validate` (on the reviewed PLAN₂), the foundation review `$architecture --mode=full`, the foundation change review `$workflow-review-changes --tests=defer`, the final `$test`, `$workflow-end`; the first slice's build, review, verify and near-end E2E run in `$workflow-implement-spec` after the hand-off.
- **IMPORTANT MUST ATTENTION** business and domain before technology; validate each phase's decisions with the user and never self-approve a one-way door; cite evidence for every claim, confidence >80% to act.
