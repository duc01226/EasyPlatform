---
name: workflow-big-feature
version: 1.2.0
description: "[Workflow] Research, design, specify and implement a large, ambiguous or research-heavy feature in an existing codebase."
disable-model-invocation: false
---

<!-- WORKFLOW-CALLS:START -->
## Workflow Calls and Todo Bootstrap

Read [the registry](../../../.claude/workflows.json) → `workflows.workflow-big-feature` together with this skill. Call [`/start-workflow workflow-big-feature`](../start-workflow/SKILL.md) to resolve the selected mode, pre-actions and fingerprint.

**Todo FIRST:** before triage, analysis or step execution, create one todo per phase of the selected mode, in order, listing every occurrence of that phase as a line, including conditional/optional ones (a mode that declares no phases gets one todo per occurrence); preserve occurrence IDs, roles and barrier groups. Use native todo tools or an equivalent persistent ledger. Then mark the first todo `in_progress`; close each step line with its run or skip evidence, and complete a phase todo only when every line is closed and its applicable exit gates hold.
Mode selection and registry loading prepare tracking; any 'first action' below means the first substantive action after this bootstrap.

**Call each step skill:** read its linked SKILL.md and execute its protocol through the active host with the registry args. Reading or naming a skill alone is not execution. Required gates and core/optional flex follow the linked start-workflow Step Execution Protocol; keep this skill's quality gates, loops and evidence requirements.

**Conditions:** load each occurrence's registry `applicability.when` and `skipReason` verbatim, and record its run/skip evidence through the linked start-workflow protocol. Do not silently omit a todo or turn a conditional skill into an unconditional call; close, in one batch at triage, the todos whose condition is already false there. Declared parallel groups retain their all-return barrier.

Explicit step-skill calls by mode (registry order; roles and conditions remain owned by the registry):

- Mode `default`: [`/initiative`](../initiative/SKILL.md) (core) → [`/web-research --chain=deep-dive`](../web-research/SKILL.md) (optional; conditional) → [`/market-analysis`](../market-analysis/SKILL.md) (optional; conditional) → [`/business-evaluation`](../business-evaluation/SKILL.md) (optional; conditional) → [`/spec [mode=discovery]`](../spec/SKILL.md) (optional; conditional) → [`/domain-analysis`](../domain-analysis/SKILL.md) (optional; conditional) → [`/tech-stack-research`](../tech-stack-research/SKILL.md) (optional; conditional) → [`/architecture --mode=design`](../architecture/SKILL.md) (core) → [`/architecture --mode=scalability`](../architecture/SKILL.md) (gate) → [`/why-review`](../why-review/SKILL.md) (gate) → [`/scenario`](../scenario/SKILL.md) (optional; conditional) → [`/plan`](../plan/SKILL.md) (optional; conditional) → [`/plan --mode=review`](../plan/SKILL.md) (optional; conditional) → [`/work-item --mode=refine`](../work-item/SKILL.md) (core) → [`/work-item --mode=review --type=task`](../work-item/SKILL.md) (core) → [`/work-item --mode=challenge --reuse=task-review`](../work-item/SKILL.md) (optional; conditional) → [`/work-item --mode=story`](../work-item/SKILL.md) (core) → [`/work-item --mode=dor --reuse=task-review`](../work-item/SKILL.md) (core) → [`/work-item --mode=mockup --explore`](../work-item/SKILL.md) (optional; conditional) → [`/spec`](../spec/SKILL.md) (core) → [`/spec [mode=tests]`](../spec/SKILL.md) (core) → [`/work-item --mode=review --type=spec-tests`](../work-item/SKILL.md) (core) → [`/spec [mode=clarify]`](../spec/SKILL.md) (optional; conditional) → [`/plan`](../plan/SKILL.md) (core) → [`/plan --mode=review`](../plan/SKILL.md) (core) → [`/plan --mode=validate`](../plan/SKILL.md) (gate) → [`/scaffold`](../scaffold/SKILL.md) (optional; conditional) → [`/architecture --mode=review`](../architecture/SKILL.md) (optional; conditional) → [`/scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure`](../scan-all/SKILL.md) (optional; conditional) → [`/plan --mode=execute`](../plan/SKILL.md) (core) → [`/seed-test-data`](../seed-test-data/SKILL.md) (optional; conditional) → [`/integration-test`](../integration-test/SKILL.md) (optional; conditional) → [`/spec [mode=sync]`](../spec/SKILL.md) (core) → [`/workflow-review-changes --tests=defer`](../workflow-review-changes/SKILL.md) (gate) → [`/integration-test --mode=verify`](../integration-test/SKILL.md) (gate) → [`/workflow-e2e --source=context`](../workflow-e2e/SKILL.md) (gate) → [`/test --proven=@verify`](../test/SKILL.md) (gate) → [`/workflow-end`](../workflow-end/SKILL.md) (gate) → [`/watzup`](../watzup/SKILL.md) (optional; conditional)
  Phase todos: Discover (7) → Plan (19; exit plan-approved) → Build (7; exit spec-synced) → Review (1; exit review-converged) → Verify (3; exit tests-pass) → Close (2; exit run-closed)
<!-- workflow-mode:default fingerprint:868d064f02f288fa695c52aa75760e556cbe347e8f162f373b3b719277cc90a0 -->

Regenerate this block with `node .claude/scripts/lib/workflow-skill-contract.cjs --write` after registry edits; [`/sync-codex`](../sync-codex/SKILL.md) refreshes it before mirroring.
<!-- WORKFLOW-CALLS:END -->

## Quick Summary

**Goal:** ship a large, ambiguous or research-heavy feature in an existing codebase as a bounded, independently releasable actor-facing outcome — researched only as deep as the idea needs, then designed, specified, planned, built, reviewed and closed with evidence.

**Use when** scope or value is unclear, several outcomes or modules are involved, or research must precede the build decision. A clear, bounded change across modules → `workflow-feature`. An existing spec that only needs building → `workflow-implement-spec`. Greenfield → `workflow-greenfield-init`.

**Confirmation gate:** `activation: confirm`. When the AI routes here on its own, it MUST first ask the route gate's one workflow question — this full workflow with its current step count, a slimmer custom route listing its steps, or direct execution — recommending the full workflow only when no leaner route would satisfy the request. An explicit user request for this workflow needs no question. Route mode `auto` asks the same question, recommending the full workflow first; route mode `off` starts it only on an explicit request.

**Workflow:**

1. **Triage** — size, kind, risk and `isLargeIdea`; select the research/design depth (below).
2. **Research & design** — only the stages the triage selects; architecture is always designed and gated.
3. **Specify & plan** — releasable tasks, stories, Feature Spec, test specs, PLAN₁ (large idea or several slices), PLAN₂, `/plan --mode=validate` before any code.
4. **Build & prove** — optional foundation, implementation, integration tests, spec sync, inline review, near-end E2E, `/test`, `/workflow-end`.

**Key Rules:**

- MUST ATTENTION triage FIRST and record it in the run report; escalate depth on risk and ambiguity, not file count alone.
- MUST ATTENTION self-routing stops at the workflow question: show the big-workflow step count, the lighter custom route and direct execution before activation — why: this workflow intentionally spends much more time and context than a bounded feature route.
- MUST ATTENTION gate steps always run; `core`/`optional` steps follow the Step Execution Protocol and every deviation is logged with evidence.
- MUST ATTENTION research that runs is validated with the user once, and a business case that runs gets one go/no-go confirmation; every claim cites evidence, confidence >80% to act.
- NEVER skip mandatory workflow or skill gates.

## Contents

- [Workflow Calls and Todo Bootstrap](#workflow-calls-and-todo-bootstrap)
- [Quick Summary](#quick-summary)
- [Size & Kind Triage (FIRST action)](#size--kind-triage-first-action)
- [Required Quality Gates](#required-quality-gates)
- [Gates and Optional Steps](#gates-and-optional-steps)
- [Recommended Skills by Phase](#recommended-skills-by-phase)
- [Market Analysis Applicability (conditional)](#market-analysis-applicability-conditional)
- [New-UI Explore Mockup (before the implementation plan)](#new-ui-explore-mockup-before-the-implementation-plan)
- [Architecture Gates Parallel Phase (`architecture --mode=scalability` + design-rationale `/why-review`)](#architecture-gates-parallel-phase-architecture---modescalability--design-rationale-why-review)
- [Workflow-Specific Contracts](#workflow-specific-contracts)
- [Orchestration Freedom](#orchestration-freedom)
- [Memory & Reporting](#memory--reporting)
- [Fix Path & Loop Bounds](#fix-path--loop-bounds)
- [Step Chain](#step-chain)
- [Closing Reminders](#closing-reminders)

## Size & Kind Triage (FIRST action)

Classify before choosing steps; write the result to the run report.

- **Size band** (guidance): XS 1–3 files · S ≤15 · M ≤60 · L ≤300 · XL >300. A big feature is usually M or larger; an XS/S result with clear intent is likely `workflow-feature` work — say so and ask once before continuing.
- **Kind(s):** behavior change · public contract/API · data/schema/migration · security-sensitive (auth, secrets, money, PII) · UI surface · infra/CI · cross-module/cross-service.
- **Risk:** irreversible, data, security, cross-module. Risk or ambiguity raises depth; file count alone does not.
- **`isLargeIdea`** `= multipleIndependentOutcomes || ambiguousOrResearchHeavy || releaseScopeDecomposition || oversizedTaskThatMustSplit`, evaluated before any spec, task, story or plan. True → the owning artifacts carry the complete `large_idea_decomposition` block (`outcome_slices`, `dependencies_order`, `non_goals`, `risks_evidence`, `deferred_work_owner`) and its slice IDs flow downstream. False → record `Decomposition Applicability: EXEMPT` with reason and owner. Ordinary runs never write the product-roadmap artifact (default `docs/product-roadmap.md`; `docsRoots.productRoadmap.path` in `docs/project-config.json` overrides); only an explicit roadmap request enters the standalone roadmap skill, and a supplied roadmap is read-only context.
- **Existing specs:** when the business spec root (default `docs/specs/`; `specRoots.business.path` in `docs/project-config.json` overrides) holds a spec for the affected area, read its ERD, business rules and API contracts before research.
- **Depth selection:** the triage answers each optional step's registry `when` (Tier-2 output); log each skip with its evidence.

## Required Quality Gates

- Plan approved (`plan-approved`) — `/plan --mode=validate` passed on PLAN₂ with explicit evidence; no inferred decision auto-approved
- Spec synced when behavior or a public contract changed (`spec-synced`) — `/spec [mode=sync]` output; spec ↔ test specs ↔ test code agree, each invariant mapped to Section 8 TC IDs
- Tests pass (`tests-pass`) — changed behavior covered by tests that ran green in THIS run (`/integration-test --mode=verify` or the final `/test --proven=@verify`)
- Review converged (`review-converged`) — nested `/workflow-review-changes` converged: validated blocking findings fixed and the fixed state re-reviewed
- Run closed (`run-closed`) — `/workflow-end` checked every outcome gate

This skill adds three quality bars that hold in every run. Architecture gated and Near-end E2E rest on registry `gate` steps (the `architecture-gates` barrier members and `/workflow-e2e --source=context`); Releasable tasks is a content bar no deviation removes.

- Architecture gated — the `architecture-gates` barrier returned both reports and they were reconciled (below)
- Releasable tasks — every task is one independently releasable actor-facing outcome (technical work is enabling work under it; UI tasks carry the full connected mock-app flow, or a recorded `Mockup: SKIPPED by user` from the pre-generation scope gate) per `.claude/skills/shared/releasable-task-contract.md`
- Near-end E2E — `/workflow-e2e --source=context` runs near the end of the run, or records evidence-backed `N/A` / `ENVIRONMENT-BLOCKED`

## Gates and Optional Steps

**Step contract:** `/start-workflow` owns how gate, core and optional steps run; the registry (`.claude/workflows.json` → `workflow-big-feature`, delivered in the Tier-2 output) owns every step's role and its `applicability` (`when` / `skipReason`, recorded verbatim on skip). This table lists the non-core roles.

| Step | Role |
| --- | --- |
| `/web-research --chain=deep-dive` | optional |
| `/market-analysis` | optional |
| `/business-evaluation` | optional |
| `/spec [mode=discovery]` | optional |
| `/domain-analysis` | optional |
| `/tech-stack-research` | optional |
| `/architecture --mode=scalability` | gate |
| `/why-review` | gate |
| `/scenario` | optional |
| `/plan` | optional |
| `/plan --mode=review` | optional |
| `/work-item --mode=challenge --reuse=task-review` | optional |
| `/work-item --mode=mockup --explore` | optional |
| `/spec [mode=clarify]` | optional |
| `/plan --mode=validate` | gate |
| `/scaffold` | optional |
| `/architecture --mode=review` | optional |
| `/scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure` | optional |
| `/seed-test-data` | optional |
| `/integration-test` | optional |
| `/workflow-review-changes --tests=defer` | gate |
| `/integration-test --mode=verify` | gate |
| `/workflow-e2e --source=context` | gate |
| `/test --proven=@verify` | gate |
| `/workflow-end` | gate |
| `/watzup` | optional |

Every other step is `core`: usually run, and it flexes under the step contract only when its outcome is already proven. The optional `/plan` pair is PLAN₁ (Two plans below); `/market-analysis` → Market Analysis Applicability below; `/work-item --mode=mockup --explore` → New-UI Explore Mockup below.

## Recommended Skills by Phase

- **Discovery** — `/initiative` · earns its cost when: always — pins problem, actors, non-goals · proves / feeds: triage, `isLargeIdea`
- **Research** — `/web-research --chain=deep-dive` (runs the source deep dive inside) → `/market-analysis` (reads the chain's evidence base and searches only its named gaps) → `/business-evaluation` · earns its cost when: the triage found external unknowns, an unsized market or an undecided business case · proves / feeds: evidence base, option set with confidence, go/no-go — one research validation with the user, one go/no-go confirmation
- **Domain** — `/spec [mode=discovery]`, `/domain-analysis` · earns its cost when: existing specs, entity changes · proves / feeds: ERD, invariant landscape, scope decision (NEW/EXTEND/SPLIT); the design-rationale `/why-review` in the `architecture-gates` barrier also challenges these domain decisions
- **Architecture** — `/tech-stack-research`, `/architecture --mode=design`, `architecture-gates` barrier, `/scenario` · earns its cost when: design and its gates always; research and scenario per triage · proves / feeds: scale-ready decision matrix, reconciled gate reports · reuse: `/architecture --mode=design` consumes the confirmed `/tech-stack-research` decisions instead of asking again, so the stack is settled in one interview
- **PLAN₁** — `/plan` → `/plan --mode=review` · earns its cost when: a large idea (`isLargeIdea`) or more than one releasable slice — a strategic plan of boundaries, data flow, tech choices and slice order · proves / feeds: reviewed strategic plan
- **Planned work** — `/work-item --mode=refine` → `/work-item --mode=review --type=task` → `/work-item --mode=challenge` → `/work-item --mode=story` → `/work-item --mode=dor` → `/work-item --mode=mockup --explore` · earns its cost when: always; the challenge only when a second reviewer is available or the task is M+ or risky; mock-up for UI only · proves / feeds: releasable tasks, DoR-ready stories · order: challenge runs before the stories are cut, so its revisions land first; `/work-item --mode=dor` also checks the stories (its rows ST1-ST4 are the story-review checks, M1-M7 included) · reuse: the workflow passes `--reuse=task-review` to `/work-item --mode=challenge` and `/work-item --mode=dor` (they re-evaluate only the criteria the `/work-item --mode=review --type=task` report did not cover; drop the flag after any task edit; standalone runs evaluate every check)
- **Spec** — `/spec` → `/spec [mode=tests]` → `/work-item --mode=review --type=spec-tests` → `/spec [mode=clarify]` · earns its cost when: always; clarify when decisions are open · proves / feeds: Feature Spec, TC IDs per invariant
- **PLAN₂** — `/plan` → `/plan --mode=review` → `/plan --mode=validate` · earns its cost when: always; the user approves the plan before scaffold or any other code · proves / feeds: ready-to-start plan, `plan-approved`
- **Foundation** — `/scaffold` → `/architecture --mode=review` (scoped to the scaffolded foundation) → `/scan-all --targets=…` · earns its cost when: base abstractions are missing; the review and the doc refresh run only when scaffold ran · proves / feeds: reviewed foundation, refreshed reference docs
- **Build** — `/plan --mode=execute` → `/seed-test-data` → `/integration-test` · earns its cost when: execute always (it writes each phase's code and its tests together); seed data per triage; `/integration-test` only for a test case still without an executing test · proves / feeds: code and tests written, not run
- **Close** — `/spec [mode=sync]` → `/workflow-review-changes --tests=defer` → `/integration-test --mode=verify` → `/workflow-e2e --source=context` → `/test --proven=@verify` → `/workflow-end` → `/watzup` · earns its cost when: always; `/watzup` only on a requested report or a multi-workflow handoff (`/workflow-end` prints the recap, or a short handoff when nothing was built) · proves / feeds: `spec-synced`, `review-converged`, `tests-pass`, `run-closed`

## Market Analysis Applicability (conditional)

Run condition (verbatim from the registry): The work has a commercial market and either this product's addressable market is not already sized or this feature changes that sizing.

Skip reason (verbatim from the registry): This scope has no commercial market to size (for example, an internal tool, migration, or infrastructure-only change), or this product's addressable market is already sized and unchanged by this feature.

Record the applicability evidence either way; when skipped because the market is already sized, cite the existing analysis. When it runs after `/web-research --chain=deep-dive`, it reads that evidence base first and searches only the gaps it names. When `/business-evaluation` runs after a skipped market analysis, it marks every market-sizing figure N/A with the exact skip reason and must not re-derive sizing. Skipping this occurrence never waives `/web-research --chain=deep-dive`, other selected research stages, or their required user confirmations.

## New-UI Explore Mockup (before the implementation plan)

The `/work-item --mode=mockup --explore` step runs its scope gate first (`work-item --mode=mockup` Step 0 owns the gate, the direction drafts and the pick — main session only, never a delegated sub-agent). Record `Mockup: SKIPPED by user` or the `Selection:` line in the plan or run report; PLAN₂'s UI Layout builds on the selected mockup. A task that only adjusts existing views records the explore exemption (all axes adopted) and builds one direction.

## Architecture Gates Parallel Phase (`architecture --mode=scalability` + design-rationale `/why-review`)

Declared as the `architecture-gates` all-return barrier. Both read the finished `/architecture --mode=design` artifacts; neither consumes the other.

1. Launch `/architecture --mode=scalability` as a fresh read-only `architect` sub-agent (brief: `architecture --mode=design`, domain-analysis and tech-stack-research artifact paths); it writes its scorecard to `tmp/reports/` and validates its own sub-80 findings.
2. Run the design-rationale `/why-review` INLINE in FULL mode so its Trade-Off Interrogation Gate can reach the user. It challenges the material research and domain decisions the design rests on as well as the architecture itself; the workflow has no separate domain rationale review.
3. Advance only after BOTH return. A scalability risk touching a passed decision becomes a WARN carried into `/scenario` and the plans; a why-review FAIL, or a user trade-off answer that changes a decision, blocks `/scenario` until the design is revised and both gates re-run.

## Workflow-Specific Contracts

- **Scale-ready foundation** — at `/architecture --mode=design`, before the first plan, apply `SYNC:scale-ready-foundation`: inspect the existing project and emit the applicability/decision matrix; carry accepted decisions into `/plan`, `/scaffold`, the foundation review and implementation. Scale-technique and scenario-stress checks (`.claude/docs/scale-technique-catalog.md`, `.claude/docs/scenario-stress-catalog.md`) are advisory right-sizing in both directions.
- **Brownfield bounds** — a gap needing broad refactoring keeps the task's actor journey bounded: `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE` or `BLOCKED` with evidence, owner, trigger and smallest next step; `BLOCKED` when the refactor is required for safety.
- **AI agent as user (optional)** — when evidence makes an agent a potential actor, apply `SYNC:ai-agent-as-user-access`: one capability core, only warranted machine surfaces, never agent = administrator.
- **Two plans** — PLAN₁ is strategic (after architecture) and optional. Run condition: The feature is a large idea (isLargeIdea) or spans more than one releasable slice, so a strategic plan must order the slices before the implementation plan. Skip reason: A single-slice feature: the architecture ADRs and decision matrix are the strategic record, and the implementation plan carries the rest. Its review runs only when PLAN₁ was written; skip reason: The strategic plan step was skipped, so there is no strategic plan to review. PLAN₂ is tactical (after the test-spec review: stories, test strategy, dependencies, phased tasks), always runs, and is the plan `/plan --mode=validate` approves. Name tasks `PLAN₁`/`PLAN₂` so the repeated `/plan` and `/plan --mode=review` occurrences stay distinct.
- **Foundation refresh** — when `/scaffold` ran, `/architecture --mode=review`, scoped to the scaffolded foundation, reviews it and BLOCKED/WARN findings are fixed before `/plan --mode=execute`; then one `/scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure` runs INLINE as a surgical REFRESH of the project-reference docs (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path), creating a doc only when missing. It refreshes only the listed targets that apply (`ui-system` only for a UI foundation). A later fix that changes the foundation re-runs the affected target before `/plan --mode=execute`.
- **Spec-driven tests** — read `spec-principles.md` in the project-reference docs root before `/work-item --mode=story` and test specs; map every invariant to Section 8 TC IDs; lifecycle flows assert persisted transitions and invalid-transition rejection. Every assertion-bearing test uses the project's native style (GWT when selected or idiomatic) and names the behavior or invariant it guards, so it fails when that intent breaks.
- **Decisions** — 2–4 options with confidence % for each major decision; evaluate the top 3 alternatives before adding a dependency; save artifacts to the plan directory per step.
- **Final `/test`** — the registry passes `--proven=@verify`, which names this run's `/integration-test --mode=verify` report, so only the tiers that report does not cover run; the gate still runs last, after E2E, and still reports the union.
- **Delegated tail** — the nested `/workflow-review-changes` owns security, performance and production-readiness review, the conditional domain-entity reference refresh and `docs-manager --mode=update`; this workflow does not repeat them. `/workflow-e2e --source=context` is a gate step that runs after it in every run.

## Orchestration Freedom

You choose inline vs sub-agent, parallel waves vs sequential, batching and ordering — optimize wall-clock and token cost at equal quality. **Main session only:** the mockup scope gate and pick (`work-item --mode=mockup` Step 0) never run inside a delegated sub-agent. Fixed constraints only: a change exists before it is reviewed or tested; spec sync runs before the review that checks it; tests run once, last, after the static review (`--tests=defer`) — a verify fix re-runs the review, a review fix re-runs the verify (`SYNC:verify-last-order`); `/workflow-end` runs last; `/workflow-review-changes` runs INLINE in the main session; the `architecture-gates` barrier returns in full before `/scenario`; gates awaiting user approval are never parallelized. Recommended: independent read-only research or review in one parallel wave; L/XL targets partitioned into bounded batches per module or outcome slice, one report per batch.

## Memory & Reporting

- One phase task per phase, one row per selected step, PLAN₁/PLAN₂ named explicitly; the run report under `tmp/reports/` is written FIRST and appended per step or batch.
- After compaction, re-read the report and `TaskList` before continuing.
- Sub-agent briefs make report writing their first deliverable and name the artifact paths they read.

## Fix Path & Loop Bounds

Findings are validated (evidence-backed, reproducible) before fixing; fix at the owning layer; re-run the reviewer or test that raised each finding, plus a holistic pass after non-trivial fixes. Plan ceremony for fixes only when the fix set is large, cross-module or ambiguous. Review loops: round 1 exits on zero open validated findings (LOW deferral); from round 2 only CRITICAL/HIGH/MEDIUM block (LOW deferred); cap 3 review rounds; failed checks block and at the three-round cap require explicit user-approved bounded extension; no progress → `ask user question tool`.

## Step Chain

Registry sequence — the recommended default order; this parity line mirrors `.claude/workflows.json`:

**IMPORTANT MANDATORY Steps:** /initiative -> /web-research --chain=deep-dive -> /market-analysis -> /business-evaluation -> /spec [mode=discovery] -> /domain-analysis -> /tech-stack-research -> /architecture --mode=design -> /architecture --mode=scalability -> /why-review -> /scenario -> /plan -> /plan --mode=review -> /work-item --mode=refine -> /work-item --mode=review --type=task -> /work-item --mode=challenge --reuse=task-review -> /work-item --mode=story -> /work-item --mode=dor --reuse=task-review -> /work-item --mode=mockup --explore -> /spec -> /spec [mode=tests] -> /work-item --mode=review --type=spec-tests -> /spec [mode=clarify] -> /plan -> /plan --mode=review -> /plan --mode=validate -> /scaffold -> /architecture --mode=review -> /scan-all --targets=ui-system,backend-patterns,integration-tests,project-structure -> /plan --mode=execute -> /seed-test-data -> /integration-test -> /spec [mode=sync] -> /workflow-review-changes --tests=defer -> /integration-test --mode=verify -> /workflow-e2e --source=context -> /test --proven=@verify -> /workflow-end -> /watzup

Activate the `workflow-big-feature` workflow. Run `/start-workflow workflow-big-feature` with the user's prompt as context.

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `ai-agent-as-user-access` — Treat an AI agent as a first-class machine actor with its own identity and authority; creating a greenfield system or reviewing actor-facing architecture → .claude/skills/shared/protocols/ai-agent-as-user-access.md
- `incremental-persistence` — Persist results per file or section while the work proceeds; a sub-agent or heavy step processes more than three files → .claude/skills/shared/protocols/incremental-persistence.md
- `measured-capacity-engineering` — Model demand, reduce measured work safely and prove capacity before scaling; planning, building, testing or reviewing hot paths, caches or capacity → .claude/skills/shared/protocols/measured-capacity-engineering.md
- `scale-ready-foundation` — Scale-ready foundation and brownfield fit; running greenfield init or a big feature → .claude/skills/shared/protocols/scale-ready-foundation.md
- `session-goal-ledger` — Keep the original goal and every user prompt of the session; running a long or multi-prompt session → .claude/skills/shared/protocols/session-goal-ledger.md
- `subagent-return-contract` — Sub-agents return a structured envelope and a report path, never an inline report; spawning a sub-agent → .claude/skills/shared/protocols/subagent-return-contract.md
- `verify-last-order` — Build all phases and write tests, review statically, then verify once with a mutation check; planning or running any code-changing task → .claude/skills/shared/protocols/verify-last-order.md
- `workflow-registry-binding` — Read the workflow registry entry and the workflow skill together, since they must agree; executing or editing a workflow → .claude/skills/shared/protocols/workflow-registry-binding.md

<!-- PROTOCOL-GUIDES:END -->

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

**IMPORTANT MUST ATTENTION Goal:** a bounded, independently releasable actor-facing outcome — researched only as deep as the triage requires, architecture-gated, specified, planned, built, reviewed and closed with evidence; ordinary runs never write the product-roadmap artifact.

- **IMPORTANT MUST ATTENTION** triage FIRST (size, kind, risk, `isLargeIdea`) and record it; optional research and design steps run only when their `when` holds, each deviation logged with evidence.
- **IMPORTANT MUST ATTENTION** gates always run: `/plan --mode=validate` (before scaffold), INLINE `/workflow-review-changes`, `/integration-test --mode=verify`, `/test`, `/workflow-end`; the `architecture-gates` barrier (`/architecture --mode=scalability` ∥ the rationale `/why-review`) and the near-end `/workflow-e2e --source=context` are gates too and stay in every run.
- **IMPORTANT MUST ATTENTION** every task passes `.claude/skills/shared/releasable-task-contract.md`; apply `SYNC:scale-ready-foundation` before the first plan; brownfield gaps become owned opportunities or explicit blockers, never silent refactors.
- **IMPORTANT MUST ATTENTION** research that runs is confirmed with the user once, and a business case gets one go/no-go confirmation; every claim cites `file:line` or source evidence, confidence >80% to act.
- **IMPORTANT MUST ATTENTION** tests name the invariant they guard and fail when it breaks; changed behavior is proven by tests that ran green in this run.
