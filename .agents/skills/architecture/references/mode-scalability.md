# `$architecture --mode=scalability` — architecture scalability grade reference

> Loaded by `architecture/SKILL.md`'s Mode Dispatch when invoked as `$architecture --mode=scalability [init|audit] [scope]`. Formerly `/architecture-scalability-review`. This contract is the whole invocation: run it exactly as written, standalone or as a workflow step. `$ARGUMENTS` in this file means the invocation text after `--mode=scalability`. The `mode=init` / `mode=audit` tokens below are this mode's run type (passed as `init` / `audit` or `mode=init` / `mode=audit`); they are separate from the skill-level `--mode=scalability` that selected this file.

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval. Inside a workflow run, `$start-workflow` → Workflow-step mode bounds this rule.
> **[BLOCKING]** Before each step or sub-skill call, update todo tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

## Quick Summary

**Goal:** Grade a project or planned architecture against architecture + scalability criteria and produce an evidence-backed `/20` verdict (`STRONG` / `NEEDS WORK` / `HIGH RISK`) before scale or delivery decisions harden; route deep checks to owner skills.

**Summary:**
- **Purpose/ownership:** score 10 areas, apply G1-G7 and TVC, route sibling-owned depth, and emit one report; this skill owns the scorecard, not sibling checklists.
- **Ordered run:** (1) resolve `mode=init`/`mode=audit` + scope; (2) load context/evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2; (5) run G1-G7, then TVC; (6) emit the report under `tmp/reports/`; (7) validate sub-80/risk findings with `$why-review` (max 3 passes), or record the zero-risk skip.
- **Evidence/TVC:** every score needs `file:line`, command/artifact proof, or `N/A - reason`; otherwise score `0`. Resolve Unit/Integration/System/E2E applicability plus owner/root/data, full+focused commands, zero-match behavior, CI/simple Windows/macOS/Linux entry, unique run/data identity, and repeat proof; unresolved applicable fields block handoff.
- **Modes/advisories:** `init` scores planned greenfield evidence; `audit` scores existing evidence. Self-audit 11 red flags before emission; treat `— VERIFY` rows/section banners as unverified and confirm named sources or project docs. Technique + Scenario are advice-only and never change `/20`, verdict, or gates; new tools require user confirmation.

**Workflow (run in order):**

1. Resolve `mode=init` or `mode=audit` + target scope.
2. Load project context and evidence.
3. Read `references/scorecard.md`.
4. Score all 10 areas 0-2 with evidence.
5. Run pass/fail gates (G1-G7), then the non-scoring TVC.
6. Emit the architecture scalability review report under `tmp/reports/`.
7. When triggered, validate sub-80 grades/risk findings with `$why-review` (maximum 3 passes); otherwise record the zero-risk skip.

**Key Rules:**

- MUST ATTENTION every score carries `file:line`, command output, architecture-artifact evidence, or explicit `N/A - reason`; unproven criteria score `0`.
- MUST ATTENTION this skill owns the scorecard, not the deep review of every concern — route depth to the sibling skills named in the Ownership Matrix; NEVER duplicate their checklists.
- New Tech/Lib: `N/A` by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or another tool, present it for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning; `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## Contents

- [Quick Summary](#quick-summary)
- [When To Use](#when-to-use)
- [Scope And Modes](#scope-and-modes)
- [Required Context](#required-context)
- [Ownership Matrix](#ownership-matrix)
- [Workflow](#workflow)
- [Scorecard Validation Gate (why-review; required for any sub-80 grade or risk finding)](#scorecard-validation-gate-why-review-required-for-any-sub-80-grade-or-risk-finding)
- [Completion Criteria](#completion-criteria)
- [Mode protocols](#mode-protocols)
- [Closing Reminders](#closing-reminders)

## When To Use

- Greenfield/project-init flow after `architecture --mode=design`, before implementation planning hardens decisions.
- On demand for project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- Periodic architecture health check for a growing codebase.

NEVER use this as the every-change diff reviewer. Per-change regression checks belong in `architecture --mode=review`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit, run `$architecture --mode=full` (or `$start-workflow workflow-architecture-audit`); it fans out this skill, `architecture --mode=review`, and `production-readiness-review` as parallel sub-agents and synthesizes one report.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.
Use `planned` labels when implementation is absent. Score `2` only when the plan names enforceable mechanisms, not intent alone.
### `mode=audit`

Score an existing repository. Evidence must come from source, build/CI config, ADRs, reference docs, tests, dependency-boundary tooling, deployment/IaC files, and grep/read (an optional graph query may add hints).
Optional: when module-boundary coupling is hard to see by grep and `.code-graph/graph.db` exists, a graph query on key architecture files can add hints (it may be stale — verify by reading).

## Required Context

Read these before scoring:

- `docs/project-config.json`
- Under the reference-docs root (default `docs/project-reference`; a `docsRoots.projectReference.path` entry in `docs/project-config.json` overrides the path): `docs-index-reference.md`, `lessons.md`, `project-structure-reference.md`
- Relevant stack docs from the docs index, based on target scope
- Accepted ADRs under the ADR root (default `docs/adr/**`; a `docsRoots.adr.path` entry in `docs/project-config.json` overrides the path), when present
- Existing architecture, domain, CI, deployment, and observability artifacts in the target plan or repo

## Ownership Matrix

| Area | Cadence | This skill owns | Route depth to |
| --- | --- | --- | --- |
| Build & CI Scalability | init / audit | Score incremental builds, affected-only detection, cache strategy, parallel test/build strategy, monorepo quality gate posture | `linter-setup` for quality gates; `scaffold` for project foundation |
| Architecture Pattern / distributed-monolith | init / audit + every-change smell | Score modular monolith vs microservices fit and distributed-monolith risk | `architecture --mode=design` for design choices; `architecture --mode=review` for diff-level boundary drift |
| Module Isolation | init / audit + every-change boundary drift | Score bounded-context isolation and independent build/test/deploy expectations | `domain-analysis`, `architecture --mode=review` |
| Dependency Discipline | init / audit + every-change | Score explicit dependency directions and enforcement mechanisms | `architecture --mode=review`, `linter-setup` |
| Loose Coupling | init / audit + every-change | Score event-driven ownership and absence of avoidable sync coupling | `domain-analysis`, `architecture --mode=review` |
| Horizontal Scaling | init / audit + local hot-path review | Score system-level statelessness, load balancing, caching, async, partitioning, autoscaling, SPOF, latency/throughput limits | `performance-review`, `production-readiness-review` |
| DRY | init / audit + every-change duplication drift | Score strategic shared-platform, monorepo/shared-lib, and duplicated-knowledge posture | `architecture --mode=review`, `scaffold` |
| Abstraction / Easy-to-Change | init / audit + every-change conformance | Score swappable technical concerns, stable contracts, and interface boundaries where they reduce future change cost | `architecture --mode=design`, `architecture --mode=review`, `scaffold` |
| Clean Architecture | init / audit + every-change | Score dependency-rule fit, business logic placement, and architecture style enforcement | `architecture --mode=review`, `scaffold` |
| Observability & Delivery | init / audit + production readiness | Score monitoring, logging, metrics, DevOps/deployment, CI/CD, IaC, rollback posture | `production-readiness-review`, `linter-setup` |

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence; NEVER expand into the sibling's checklist.

## Workflow

Run in order; scorecard validation follows report emission when its trigger applies.

### Step 1: Resolve Mode And Scope

Determine mode (`mode=init` or `mode=audit`), target (repo, plan directory, service/module, or artifact set), evidence roots (source, CI/build, ADRs, reference docs, workflow outputs), and report slug (project/module name).
If mode is missing, infer from context:
- Greenfield/project-init/plan artifacts only -> `mode=init`
- Existing repo/source/config review -> `mode=audit`

### Step 2: Gather Evidence

Use narrow grep/glob searches first. For brownfield audits, collect:

- Build files and CI pipeline config
- Workspace/monorepo config, if present
- Dependency-boundary or architecture-rule tooling
- Module/service folder structure
- Message bus, event, API, and cross-context communication patterns
- Deployment, IaC, observability, and runtime config
- ADRs and architecture reports

Optional: when `.code-graph/graph.db` exists, a graph trace on key architecture/module-boundary files can hint at coupling grep misses (it may be stale — verify by reading). Continue with grep/file evidence when it is absent.

### Step 3: Score The 10 Areas

Read `references/scorecard.md`, then score each area:

- `0` = absent, contradicted, or unproven
- `1` = partially addressed, documented but weakly enforced, or implemented in only some areas
- `2` = designed and enforced with evidence

Total score: `/20`.

| Total | Verdict | Meaning |
| ---: | --- | --- |
| 17-20 | STRONG | Architecture/scalability posture is credible; address any non-blocking gaps. |
| 11-16 | NEEDS WORK | Material gaps exist; plan follow-up before growth or high-scale use. |
| 0-10 | HIGH RISK | Architecture/setup quality is not yet safe for scale; fix gates before major delivery. |

#### Technique Applicability (advisory — NON-SCORING)

After scoring, invoke `SYNC:scale-technique-gate`: derive the scale tier from users/RPS, SLO, data volume, tenancy, and topology with `file:line`/config/infra evidence + confidence; emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) for all 10 concern groups; advise on warranted gaps and flag unwarranted `OVER-ENGINEERED` techniques.

> **Advisory only — does NOT change the `/20` score or any verdict band.** A `MISSING-WARRANTED` technique is guidance, never a deduction; a correctly-lean small system stays a PASS. Full catalog → `.claude/docs/scale-technique-catalog.md`.

### Step 4: Run Pass/Fail Gates

Run these pass/fail overlays after scoring; they do not change `/20` math.

| Gate | Blocks STRONG when failing | Check |
| --- | --- | --- |
| G1 Evidence Integrity | yes | Any `2` score without evidence is downgraded; repeated unproven claims fail the gate. |
| G2 Build & CI Scalability | yes for init/audit scope with multi-module growth | Incremental/affected-only/caching strategy exists or a clear N/A rationale is documented. |
| G3 Distributed-Monolith Risk | yes | Chosen architecture avoids service/module split with shared DB, circular sync calls, or deploy-together-only coupling disguised as distribution. |
| G4 Boundary Enforcement | yes | Dependency direction and module boundaries are explicit and enforceable. |
| G5 Horizontal Scaling Bottlenecks | yes for high-scale target | Statelessness, bottlenecks, SPOF, resource ceilings, and async/back-pressure posture are known and owned. **Also required: a named ESCAPE HATCH out of a metastable high-load state** (shed at the edge / drain-or-truncate the queue / warm the cache / restart at lower concurrency) — retry storms, cold caches and queue backlog form a self-sustaining loop that OUTLIVES its trigger, so removing load does not recover the system. **And latency evidence with no stated load-generation method cannot support a Pass — grade G5 `Partial` at best and ask for the method** (per `references/scorecard.md:38`; do NOT discard the figure as missing evidence) — because a harness that waits for slow responses deletes the worst samples (coordinated omission), so its p99 is a lie. |
| G6 Reuse Without Coupling | no | Shared libraries/platform code reduce duplicated knowledge without leaking consumer domain concepts. |
| G7 Secrets And Sensitive Output | yes | Audit report redacts credentials and does not expose secrets found during inspection. |

Critical/high gate failures require an owner-accepted risk or follow-up plan before reporting STRONG.

### Testability & Verification Contract (TVC — non-scoring gate)

Run this cross-cutting setup gate after G1-G7 and before report emission. Consume architecture --mode=design plus scaffold/harness evidence; do not re-implement tier-specific child checklists.

1. Verify one row each for Unit, Integration/System, and E2E. Each row is `APPLICABLE` only with runner/framework/configuration/root evidence, or `N/A — {specific evidence}`. An E2E `N/A` must cite the verified absence of a browser runner/configuration/command, never the absence of a preferred tool.
2. For every applicable row, verify copy-ready full and focused commands, invalid/zero-match non-zero behavior, CI gate, simple Windows/macOS/Linux entry point where needed, owner, and exact result fields.
3. Verify the declared run identity and business-data suffix, supported public setup path, realistic valid data, idempotent/restart-safe reference setup, additive persistent-data policy, mutable-root/parallel-worker isolation, pacing/arrange barrier, and two consecutive no-reset full runs for each applicable persistent-state integration suite (one fresh green full run for other tiers). Missing or placeholder evidence is `BLOCKED`, not a guessed pass.
4. Emit `TVC: PASS | PARTIAL | BLOCKED` with the matrix, evidence, owner, and follow-up. `PASS` means every tier is resolved and every applicable field is evidenced; `PARTIAL` records the bounded gap without inventing a tier or command.

TVC is setup/verification status, not an eighth score area. It MUST NOT change any 0-2 grade, `/20` denominator or total, verdict band, G1-G7 status, or advisory matrix. `BLOCKED` prevents a `setup complete` claim and remains a report follow-up, not a score deduction.

### Step 5: Emit Report

Write `tmp/reports/architecture-scalability-review-{YYMMDD}-{HHmm}-{slug}.md`.

Report structure:

```markdown
# Architecture Scalability Review

**Mode:** init | audit
**Scope:** {project/module/artifacts}
**Date:** {date}
**Score:** {X}/20
**Verdict:** STRONG | NEEDS WORK | HIGH RISK

## Scorecard

| # | Area | Score | Evidence | Route / Owner |
| - | ---- | ----: | -------- | ------------- |

## Pass/Fail Gates

| Gate | Status | Evidence | Required follow-up |
| ---- | ------ | -------- | ------------------ |

## Testability & Verification Contract (non-scoring)

**Status:** `TVC: PASS | PARTIAL | BLOCKED`

| Tier | Applicability + evidence | Owner | Runner/config/root | Data + run identity | Full command | Focused/partial command | Zero-match behavior | CI / simple Windows/macOS/Linux entry point | Repeat proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Unit | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + fixture policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | {result or planned owner} |
| Integration/System | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + additive/public-path policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | `{two no-reset runs}` |
| E2E | `APPLICABLE` / `N/A — {evidence}` | {owner} | {runner/config/root} | {identity + reachable-data policy} | `{command}` | `{filter}` | `{non-zero behavior}` | {CI / command} | {result or evidence-backed N/A} |

This section is copied from the owner evidence and remains separate from the scorecard, G1-G7, and advisory outputs; do not infer `PASS` when the child report omits it.

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| ---- | ------------------- | ----------------- | --------- |

## Findings

### Critical / High
### Medium / Low

## New Tech/Lib Recommendations

List only user-confirmed recommendations or mark `N/A`.
```

## Scorecard Validation Gate (why-review; required for any sub-80 grade or risk finding)

> **Purpose:** A scorecard is a JUDGMENT. Validate it adversarially before handoff so a mis-scored area or inflated risk finding does not become ground truth. This gate validates findings only; standalone fix-loop repairs validated findings at the appropriate owner afterwards, then freshly reviews the complete scorecard and evidence.

**Trigger:** Any area below 80 or any risk/gap finding. Skip ONLY when every area is ≥80 with zero risk findings.

**Protocol:**

1. Read the finalized report from `tmp/reports/{skill}-{date}-{slug}.md` (or the exact path written).
2. Invoke `$why-review --validate-findings <report-path>`; verify every sub-80 grade/risk finding has `file:line` evidence and clears the finding-survival bar.
3. **If why-review demotes/removes a grade or finding:** update the scorecard, add `## Why-Review Validation Notes`, and cite what changed + why.
4. **If validation changes the scorecard:** reconcile the report in the current pass. Review-only/caller-owned audits return it without repairs. Standalone `--fix-loop` repairs authorized findings at their owning component, then freshly repeats this audit over the updated target. Retain all score/gate rules and the single shared three-round budget; at the cap, MEDIUM+ or missing required evidence asks for a bounded extension.

**Anti-bias (MANDATORY before emitting):** steel-man each grade one band better and one band worse; only a grade surviving both arguments ships. An unchallenged grade is not validated.

**Self-audit against the thinking red flags (MANDATORY before emitting):** run the 11 red flags in `.claude/docs/architecture-knowledge.md` §20.3 against every grade, gap and recommendation. The four that fire most often in a scorecard: **grading down for a scale you cannot evidence** · **recommending a tool before stating the requirement** · **"best practice" with no named forces** · **cannot say what your recommendation SACRIFICES**. Any hit invalidates the GRADE's reasoning — re-derive it from evidence or drop the finding; NEVER just reword it. — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.
- TVC has a resolved Unit/Integration/System/E2E matrix with evidence-backed applicability or N/A, commands, owners, data/run policy, and repeat proof.
- TVC remains non-scoring and does not alter the `/20` score, verdict band, G1-G7, or advisory semantics.

## Mode protocols

The protocols below apply to this mode only; their full text is inline so this reference is self-contained.

<!-- SYNC:engineering-foundation-gate -->

> **Engineering Foundation Gate** — Conditional, evidence-gated, profile-tiered: can the team build/run/test/change safely, repeatably, as it grows? Design companions: `scale-technique-gate` (techniques), `scenario-stress-eval` (scenario survival). **State OUTCOMES, never tools:** detect stack, research options, present 2–3, record user choice.
>
> 1. **Derive profile FIRST from evidence.** `Lifecycle` **G** greenfield (foundation being created) / **B** brownfield (foundation exists, under audit) · scale `T0`–`T3` (**reuse** `scale-technique-catalog.md`) · criticality `B0`–`B3` with its criticality-signal floor (**reuse** `scenario-stress-catalog.md`) · repo shape `R0` single module / `R1` few (2–5) / `R2` many modules, multi-team / `R3` monorepo estate · runtime surface. Cite `file:line`/config/CI + confidence. Unknown axis → state the assumption and take the **LOWER** tier; NEVER default to `T3`/`B3`/`R3`.
> 2. **Judge all 7 dimensions; none omitted.** Named owners supply depth:
>    - **F1 Reproducible environment** (ALL profiles — the floor) — Document clean-machine-to-running path; pin toolchains, lock dependencies, declare every external prerequisite and how to obtain/fake it; environment-inject config, never machine-implicit; deterministic build. → `scaffold` · `architecture --mode=scalability`
>    - **F2 Supported execution modes** (used/required modes only; no universal second mode) — document/exercise developer/test/deployment paths (host/container, local/managed, simulator/device), sharing config where possible. One mode fits → verify, comparison `N/A-by-profile`; invent no Docker/Compose/host path. Broken/irreproducible claimed or required modes are defects. → `scaffold` · `production-readiness-review`
>    - **F3 Environment-portable tests** (local+CI all profiles; production-shaped `T1+`/`B2+`) — the SAME suites run against local, CI and production-like targets, **parameterized by configuration, never by forked test code**. Missing capability → `ENVIRONMENT-BLOCKED`, never a silent pass; unsafe-in-production tests are excluded by an **enforced** mechanism. _"Runs in prod"_ means a safe, declared, **NON-MUTATING** subset. → `test-architecture-execution-contract` · `integration-test --mode=review`
>    - **F4 Test-strength proof** (wherever tests exist) — Prove tests **fail when code is wrong**, strongest first: (a) **automated fault injection** scoped to CHANGED code; (b) **deliberate defect-seeding drill — the universal fallback:** break the code behind a top invariant, run the suite, record **WHICH NAMED TEST went red**, restore — nothing red ⇒ write the killing test; (c) **assertion-intent audit:** flag assertions that survive an inverted implementation, check only non-nullness/type, re-assert the input, or assert infrastructure bookkeeping. **Line coverage is a DIAGNOSTIC, never a gate.** **Scope:** verify the PROJECT HAS a test-strength mechanism; PER-CHANGE enforcement belongs to `integration-test --mode=review` Gate 1's Mutation Probe Ledger. Report gaps once. → `harness-setup` · `integration-test --mode=review`
>    - **F5 Performance & scale-under-data** (`T1+`/`B2+` for a real tier; `T0`/`B0` = one documented largest-expected-volume check) — **MEASURE performance with a runnable check that CAN FAIL** and documented command; **realistic volume AND shape** (distribution, cardinality, skew); **named latency/throughput/memory budgets the run ASSERTS**; growth across **≥2 volumes ~10× apart**; resource exhaustion as a **tested, bounded** outcome (backpressure, paging or a clean error, not an OOM kill; no unbounded result-sets, accumulation or concurrency on the paths that matter). Label each number a regression signal or a capacity statement. → `performance-review` · `seed-test-data`
>    - **F6 Build & change scalability** (`R1+` declared style + boundaries; `R2+` computable affected set, enforced checks, measured incrementality) — build/test cost and blast radius **do NOT grow with the codebase**. Requires: a **COMPUTABLE** affected module set from declared inter-module dependencies; **measured** incrementality and caching; boundaries enforced **MECHANICALLY**; a **declared**, enforced architecture style; implementation behind abstraction so a technology swaps without touching business code; a fast scoped inner-loop check. **Scope:** cite existing `architecture --mode=scalability` **G2 Build & CI Scalability**/**G4** verdicts; do not re-score. → `architecture --mode=scalability` · `architecture --mode=review` (diff-level boundary drift) · `complexity-prevention`
>    - **F7 Mechanical quality harness** (format + lint + type/static analysis + build/test at ALL profiles; architecture-fitness `R1+`; dependency health + secret scanning wherever real data ships, unconditional at `B2+`; complexity/duplication + drift `R1+`/`T1+`) — **account for EVERY class or record it `N/A` with a reason:** formatting · lint/correctness · type & static analysis · complexity & duplication · **executable architecture-fitness** · dependency vulnerability & license · secret scanning · build/test gates plus the **F4** signal · documentation/config drift. Local and CI run the **SAME** command, configuration and version; checks **ENFORCE**, not warn; strictest reasonable defaults, loosened only with a recorded reason; cheap checks first. Brownfield adoption uses a **ratchet** — fail on NEW violations, tolerate the baseline — which counts as `PRESENT`. → `linter-setup` · `harness-setup` · `security-audit`
> 3. **One verdict per dimension:** `PRESENT` (proven by cited evidence) · `MISSING-WARRANTED` · `PARTIAL-WITH-PATH` (gap + concrete incremental step) · `N/A-by-profile` (below the warranting profile — **a correctly-lean project is a PASS, never a deficiency**) · `OVER-ENGINEERED` (present but unwarranted → advise AGAINST, name the carrying cost) · `UNVERIFIED` (could not be checked; **NEVER score an unverified dimension `PRESENT`**).
> 4. **Authority:** **CREATING** (greenfield init/scaffold/build-test-CI plan) → `MISSING-WARRANTED` is **BLOCKING**; warranted omissions need explicit decisions. **AUDITING** (brownfield/architecture/changes review) → **ADVISORY ONLY** matrix + prioritized adoption path; **NEVER mutate any score, `/20`, `/24`, verdict band, or gate PASS/FAIL**.
> 5. **Symmetric anti-over-engineering guard.** Do NOT demand a container mode of a single-author utility, a distributed load platform for a small internal service, affected-set computation for a single module, or overlapping analyzers for one defect class; module splits follow real module and team count, never aesthetics. Symmetrically, never UNDER-harden a `B2+` system merely because its traffic is low.
> 6. **Every brownfield finding names a smallest independently valuable next step.** Default ladder: pin the toolchain & commit the lockfile → one local command that CI also runs → ratchet the harness on (fail-on-new) → run the defect-seeding drill on the top invariants → repair the missing execution mode → seed a realistic volume and assert ONE budget → declare the style, then enforce dependency direction. Deviate on evidence and say why.
> 7. **Output — Foundation Readiness Matrix:** `dimension | warranted at this profile? | present? | verdict | evidence (file:line/config/CI) | smallest next step`, after the derived profile (per-axis evidence + confidence), before the adoption path (brownfield) or blocking list (greenfield). Full catalog → `.claude/docs/engineering-foundation-catalog.md`. **Drift-guard: profile axes, dimensions, verdicts and warranting tiers are AUTHORITATIVE in that catalog — update it FIRST, then re-run `.claude/scripts/inject_engineering_foundation_gate.py` to re-propagate. Scale tier stays single-sourced in `scale-technique-catalog.md`; business criticality in `scenario-stress-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` profile derived from evidence (lifecycle + `T` + `B` + `R`, lower tier when unknown) `- [ ]` all 7 dimensions judged, none omitted `- [ ]` matrix emitted with `file:line`/config/CI evidence `- [ ]` anti-over-engineering guard applied `- [ ]` authority confirmed — creating ⇒ blocking, auditing ⇒ advisory-only with no score mutation `- [ ]` every brownfield gap carries a smallest-next-step

<!-- /SYNC:engineering-foundation-gate -->

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md` (plans root default `plans`; a `docsRoots.plans.path` entry in `docs/project-config.json` overrides the path) → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
> 2. **Required sections:** Original Request, Purpose, Success Criteria (checkboxes; mark required vs optional), Constraints, Evidence Required, Iteration Log, Goal Satisfaction matrix.
> 3. **Before work:** read the active goal and map planned work to saved success criteria — execution serves the saved criteria, never chat memory alone.
> 4. **After execution/verification:** append an Iteration Log entry — result, evidence references (`file:line`, command output, report path), remaining gaps.
> 5. **Review gate:** emit a Goal Satisfaction matrix — `| Success Criterion | Evidence | Status |` with PASS/FAIL/BLOCKED. Overall PASS requires every required criterion PASS.
> 6. **Loop rule (retry):** required criterion FAIL → validate the gap is real → fix → re-review only the affected criteria. Stop cleanly when all required criteria PASS.
> 7. **Escalation rule (stop):** two consecutive iterations with no criterion progressing, or a blocker needing user input → mark the criterion BLOCKED with a user-facing reason and escalate. NEVER loop indefinitely.
> 8. **Skip rule:** tiny conversational tasks may skip the goal file ONLY with a recorded one-line reason. User-accepted gate skips are recorded in the goal file with reason and scope.
> 9. **Security:** NEVER store secrets, tokens, credentials, or private customer data in goal files — store evidence references and redact sensitive values.
>
> **Blocked until:** active goal resolved (or skip reason recorded) · saved success criteria read before edits · iteration evidence appended after execution · Goal Satisfaction matrix emitted before any PASS verdict.

<!-- /SYNC:goal-contract-satisfaction-loop -->

<!-- SYNC:review-principle-awareness -->

> **Review Applicability / Current-Principles Awareness** — Every review must first classify the change context (greenfield foundation, brownfield feature/refactor, test/docs/config/UI/infra, or actor-facing/machine surface) and take notice of the applicable current principles below. This is an evidence-gated applicability check, not a mandate to flag or build every item.
>
> **Detailed protocol routing — read/apply only when warranted:**
> - `SYNC:scale-ready-foundation` — greenfield foundation is blocking; big-feature brownfield fit/adapt/defer; architecture review is advisory when auditing. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`.
> - `SYNC:test-architecture-execution-contract` — assertion-bearing tests use the project's configured/native format, name the guarded intent/technical contract, and assert an owned outcome; GWT is one valid format. Detailed carriers: `integration-test`, `workflow-greenfield-init`, and the test-architecture review path.
> - `SYNC:ai-agent-as-user-access` — when an AI/machine actor or future contract is evidenced, inspect identity/delegation, capability boundaries, selected API/CLI/MCP/WebMCP/event/SDK surface, safety/consent, audit/observability, and native-format contract tests. Detailed carriers: `workflow-greenfield-init`, `workflow-big-feature`, `architecture --mode=review`.
> - `SYNC:design-system-check` — when UI changes, inspect the design-system and component-contract obligations; route visual/UX depth to the owning UI review.
>
> **Review behavior:** Check only principles applicable to the reviewed scope; record `APPLY-NOW`, `ADAPT-IN-SLICE`, `DEFER-AS-OPPORTUNITY`, `NOT-APPLICABLE`, `BLOCKED`, or `UNVERIFIED` with `file:line`/config/CI evidence, status/severity, owner/route, and next step/revisit trigger. Do not invent findings from a generic checklist, flag unrelated pre-existing gaps as regressions, silently expand the requested scope, or mutate a parent gate merely because advice exists.
>
> **Ownership:** `changes-review` coordinates the applicability pass and routes depth to the owning specialist (`architecture --mode=review`, `integration-test --mode=review`, `security-audit`, `performance-review`, `ui-design --mode=review`, `production-readiness-review`, or another matching review). A specialist reports its own lens and does not duplicate or override another review's verdict; existing brownfield gaps stay advisory unless new, safety-relevant, or explicitly in scope.
>
> **Required review note:** `context/scope | principle/protocol checked | evidence | status/verdict | severity | owner/route | next step/revisit trigger`.
>
> **BLOCKED when:** an applicable principle is required for safety/correctness but missing, unowned, or untestable. Otherwise record an evidence-backed `NOT-APPLICABLE`, advisory, `DEFER-AS-OPPORTUNITY`, or `UNVERIFIED` result according to the lifecycle and change context; creating a greenfield foundation remains subject to its own blocking protocol.

<!-- /SYNC:review-principle-awareness -->

<!-- SYNC:scale-technique-gate -->

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system *warrants* at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>    - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-audit owns WAF/DDoS
>    - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>    - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>    - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>    - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>    - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>    - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>    - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>    - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-audit owns
>    - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scale-technique-gate -->

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of *"is technique X present?"*, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Reuse the scale tier** derived by `SYNC:scale-technique-gate` (or derive it identically from evidence); **also derive business-criticality `B0`–`B3`** from specs/SLA/product docs + the domain, cite `file:line` + confidence. `B0` best-effort · `B1` important · `B2` business-critical · `B3` mission-critical/regulated. Unknown → state the assumption, do **NOT** default to `B3`/`T3`. **Criticality-signal floor (both-directions safety):** regulated / PII / financial / health data, money movement, auth/identity, or legal-compliance scope raises `B` to **at least `B2` even absent SLA/SLO docs**; anti-over-engineering lowers hardening ONLY when NO such signal is present. `B` (blast if it fails) and `T` (scale of load/data) are independent — a low-traffic payroll run is low-`T`, high-`B`.
> 2. **Select in-scope scenarios** — only those the system's `B`/`T` combination warrants (a `B0` internal PoC skips region-loss/DR entirely; a `B3`/`T0` regulated service still needs backups + DR by BUSINESS, not scale).
> 3. **Walk each in-scope scenario:** simulate the stimulus → trace the break path → name the failure signature → answer the self-heal/recovery question (auto-recover? MTTR? manual runbook?) → name the trade-off it forces. Families: traffic spike · sustained growth · data-volume growth · write/ingest burst · dependency down/slow · instance/node loss · zone/region loss · **data loss/corruption** · poison-message/retry-storm · cascading failure/backpressure · cold-start/deploy-blip · clock-skew/duplicate-delivery.
> 4. **Assign one verdict per scenario:** `WITHSTANDS` · `DEGRADES-GRACEFULLY` · `FAILS-HARD` (→ **advise only**) · `N/A-by-business` (not warranted → skip, not a gap) · `OVER-HARDENED` (resilience beyond business need → **advise AGAINST**, cite carrying cost).
> 5. **Anti-over-engineering guard (first-class):** a lean system whose business does not need HA/DR is a PASS; `OVER-HARDENED` flags resilience the business does not warrant. This guard is symmetric with the criticality-signal floor above — never under-harden a `B2`+ system just because its traffic is low.
> 6. **Output — Scenario Stress Matrix:** `scenario | in-scope (B/T)? | verdict | self-heal | trade-off | evidence (file:line/config/infra)`. Full catalog + Business×Scale in-scope baseline + verdict/tier tables → `.claude/docs/scenario-stress-catalog.md`. **ADVISORY-ONLY: NEVER mutate any `/20`, `/24`, verdict band, or gate pass/fail. Drift-guard: scenarios/verdicts/business-tiers are AUTHORITATIVE in the catalog — update it FIRST, then re-run `.claude/scripts/inject_scenario_stress_gate.py`. Scale tier stays single-sourced in `scale-technique-catalog.md`.**
>
> **BLOCKED until:** `- [ ]` scale tier + business-criticality (with criticality-signal floor) derived from evidence `- [ ]` in-scope scenarios selected `- [ ]` matrix emitted `- [ ]` over-hardening guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scenario-stress-eval -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Use one consequence-based scale across reviews, skills, agents, workflows and hosts. Choose the highest credible tier supported by evidence; never lower it to pass a round. Effort, cost, preference, annoyance, frequency alone and round-budget pressure do not determine severity.
>
> **Finding vs observation:** admit a finding only with an affected user/system/data/contract, shipped consequence, reachable supported trigger (caller, input, state or event sequence), evidence location and confidence percentage. Assess exposure/likelihood and reversibility/detectability before assigning a tier.
>
> **Keep as observations:** advice, preference, duplicates, unsupported concerns, unreachable paths, issues already reported by this change’s compiler/type checker/linter/tests, intended behavior changes, reasoned suppressions predating the change, and pre-existing issues neither touched nor made reachable. Review newly added suppressions. Observations/INFO do not reopen loops.
>
> | Tier | Consequence and boundary examples | Action |
> | --- | --- | --- |
> | CRITICAL | Immediate material security, safety or authority harm; auth bypass; secrets/PII exposure; irreversible destruction; data loss/corruption; critical-path silent failure. | Block immediately; escalate. |
> | HIGH | Material supported-path correctness, invariant, privacy/authority, public-contract or compatibility failure; likely user/downstream harm; missing proof for a behavior-changing fix. | Fix before PASS/merge. |
> | MEDIUM | Bounded consequential edge, resilience, observability, testability, maintainability or architectural gap; credible future defect. | Clear this round; escalate decisions needing an owner. A follow-up is not a clean pass. |
> | LOW | Proven non-blocking polish with no credible present correctness, security, privacy, authority, availability or data-integrity impact: wording, formatting, minor docs/conventions, optional cleanup, cosmetics. | Record/defer; alone never opens another round from round 2 or increases the budget. |
>
> **Consequence decision tree:** check binary gates separately, then select the first evidenced tier from CRITICAL → HIGH → MEDIUM → LOW. Missing evidence is **NOT VERIFIABLE**, not a fifth tier or a LOW fallback: name the missing proof. Unsettled reachability is NOT VERIFIABLE for potential MEDIUM+ impact and an observation for polish. Claims potentially affecting required behavior, security, privacy, authority, availability, data integrity or a gate remain evidence blockers until proved or explicitly owner-accepted with scope, rationale and residual risk. Owner acceptance does not make an open MEDIUM a clean pass or a failed gate pass.
>
> **Hard gates and rounds:** failed tests, required artifacts, security must-fix checks, generated parity and policy compliance block every round, independently of finding severity. The executable helper carries failures as synthetic CRITICAL blockers; reports name the gate and failure evidence. Default review budget is three rounds; unresolved findings or failed required checks at the cap ask the user for a bounded extension under `SYNC:review-policy`. Failed checks never pass by severity deferral.
>
> **Domain-vocabulary normalization and scores:**
> - `BLOCKED`/`HARD FAIL`/`FAIL` are local blocking verdicts, not automatic CRITICAL; classify by consequence while preserving the owning gate. `WARN` can be any tier; `PASS`/compliant is not a finding. INFO/advisory remains observational unless material consequence is evidenced.
> - UI `P0/P1/P2/P3/P4` start at CRITICAL/HIGH/MEDIUM/LOW/LOW; raise only with evidence. P0/P1 accessibility or task-completion floors remain blocking gates.
> - Criterion `0/1/2` → CRITICAL or HIGH (unmet readiness)/MEDIUM (partial consequential gap)/pass; polish is LOW, never forced to `0`.
> - Impact × likelihood: high impact/exposure → CRITICAL/HIGH; material impact with bounded exposure → HIGH/MEDIUM; low impact/exposure → LOW. Record both axes and justify the highest credible tier.
> - Aggregate scorecards and `/20` verdict bands stay separate; sub-80 areas prompt investigation, not automatic severity. Keep advisory deductions separate from blockers. Emit numeric SRE/readiness or impact/likelihood scores with consequence and normalized tier.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:test-architecture-execution-contract -->

> **Test Architecture & Execution Contract** — Treat testability as a setup/architecture acceptance condition. Identify the test types and execution modes required by the project contract and task risk (for example unit, integration/system, E2E, performance/scale). Record `APPLICABLE` only with evidence of a relevant runner/framework/configuration; otherwise record `N/A — <evidence>` and never fabricate coverage or impose a universal tier threshold.
>
> 0. **Make the protected intent explicit in the project's test format.** Every assertion-bearing test states the behavior or technical invariant it protects and makes its inputs, trigger, and owned outcome understandable. Use `Given / When / Then` when the project's spec/config selects it or it fits; otherwise keep the project's native organization (property/fuzz tests describe the input space and property; harness and mutation tests use their native contract). Do not rewrite a test solely to adopt a framework-wide syntax.
>    Link the case to the configured owner/case/scenario identity and its `intent` or `contracts` role when `specArtifacts` is valid; when absent, record `Business Intent / Invariant Guarded` (or the technical contract). A malformed declared profile blocks without fallback. One behavior per case. The final assertion proves the outcome the test owns, not only an internal call, delivery bookkeeping, or setup side effect. Fixture/runner glue is exempt only when it holds no assertion. Convert legacy brownfield cases when touched; a broader migration is a named owned opportunity, and a safety-critical case without clear phases is `BLOCKED`.
>
> 1. **Matrix before implementation:** for each required test type record applicability, owner, runner/framework, test root, fixture/data strategy, full command, focused/partial command, zero-match behavior, CI gate, a simple entry point when useful, each supported execution mode, and the environments the project promises to support.
> 1a. **E2E profile handoff:** also record the selected `surfaceIds[]`, the linked `localRun` owner, auth mode/reference, seed/data mode, browser runner/engine/headed setting, action-delay policy, evidence root/capture/redaction policy, and convergence cap. Missing fields stay explicit blockers or N/A; never fill them from generic browser defaults.
> 2. **Runnable scopes:** full and focused commands are copy-ready, fail on invalid or zero-match selections, report exact counts and exit status, and are safe to repeat. E2E uses the configured browser/service commands and the project's synchronization strategy.
> 2a. **E2E organization gate (when E2E is applicable):** reuse the configured/discovered test organization — fixtures, shared helpers, scoped locator handles, page objects, or another evidenced structure — and record its actual owners. A Page Object Model is one valid pattern, never a universal requirement.
> 2b. **E2E reuse and DRY gate:** keep shared lifecycle, locator, readiness, auth, data, and evidence behavior at the project's existing reusable owner and final outcome assertions in the test. Reuse or compose existing helpers before creating new ones, keep one canonical owner per selector/action/wait, and treat duplicated wrappers or setup as a review signal; extract when a shared owner reduces change cost without crossing project boundaries.
> 2c. **E2E test layering:** test reusable behavior at its actual owner where the harness supports it; feature tests cover user outcomes and local composition. Do not invent component tiers or lower-tier contract tests the project does not use.
> 2d. **E2E synchronization:** wait for observable readiness and outcome conditions with bounded runner-native waits or the configured helper, with useful timeout diagnostics; apply action delays only when the project contract specifies them, and never use fixed sleeps as readiness evidence.
> 3. **Fresh valid state (when mutable or shared state applies):** isolate each test/run through the project's supported setup and public paths. Use unique identities for shared mutable data, realistic valid data for the behavior under test, and idempotent/restart-safe setup when fixtures or seeders persist. Intentional accumulation is additive and integrity-checked; never hide contamination with destructive reset.
>    Run-scoped cleanup, when supported, is opt-in and idempotent: after evidence capture it removes only ephemeral resources owned by the current run — never persistent/additive data or another run's data, never a shared-state reset, never a substitute for no-reset proof.
> 4. **Isolation and fidelity:** isolate mutable/shared data and parallel workers; share only immutable/reference data. Use realistic input and observable arrange barriers where behavior depends on them. Do not widen retries or weaken assertions to make a scenario pass.
> 5. **Evidence gate:** report command, scope, identity/data mode, exact result, and repeat proof; for persistent-state suites, verify repeatability without destructive reset at the level the project gate requires. Line coverage is diagnostic only; use property/invariant, mutation, change, or behavior signals when the tooling supports them.
> 6. **Execution modes and environment reach:** exercise each mode and environment the project declares it supports (for example host/container or local/CI), parameterizing targets rather than maintaining needless forks; record unexercised declared capabilities as a gap. A production-shaped target applies only when the project requires it; tests that can reach production need an enforced safe scope and report `ENVIRONMENT-BLOCKED` when it is missing. Pin dependencies and declare external prerequisites where the reproducibility contract requires. Depth → `SYNC:engineering-foundation-gate` **F1/F2/F3**.
>
> **Ownership:** Architecture/harness defines the matrix; scaffold/workflow makes it runnable; test writers implement tier-specific cases; reviewers verify the contract; the runner reports; seed-data owners preserve uniqueness, idempotency, realism, and accumulation integrity. Missing required evidence blocks setup completion.

<!-- /SYNC:test-architecture-execution-contract -->

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> **Review/audit decisions:** apply `SYNC:review-decision-autonomy` before any user-choice or confirmation prompt below. Select the supported recommendation and record its rationale; round-limit extension, indispensable missing facts and operation authority retain their explicit boundaries.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `ask user question tool` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `ask user question tool` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:measured-capacity-engineering -->

> **Measured Capacity Engineering** — Apply when planning, building, testing or reviewing a hot path, cache, capacity claim or scaling decision. Preserve the hosting skill's authority, phase order, scores and gates; unrelated work skips this protocol. **Priorities:** model demand and the SLO, remove measured work safely, then prove capacity and recovery before adding infrastructure.
>
> 1. **Define capacity as a workload contract.** Record endpoint/journey mix, think time, reads/writes, payloads, data volume/skew, authentication, environment and latency/error targets. Distinguish active sessions, open connections, in-flight requests, offered RPS and achieved successful RPS. A benchmark's hardware price, user count or CPU limit is not a portable capacity guarantee; DAU requires a separate usage model.
> 2. **Choose and disclose the load model.** Use closed-loop users for journeys; use an open arrival-rate model when testing independently arriving demand. Closed loops can reduce offered traffic as latency rises. Report attempted/completed work, errors/timeouts and dropped iterations, verify generator headroom, and separate component tests from the full journey. Repeat controlled runs with realistic data, warm steady state, cold/expiry cache, sustained load and recovery as warranted; static evidence yields a verification plan, never an invented capacity result.
> 3. **Locate the limiting resource.** Correlate tail latency with queue/pool wait and per-process CPU, runtime stalls, memory/GC, database query plans and lock waits, disk and network. Co-located components compete for resources; high aggregate CPU alone does not identify its owner. Compare one hypothesis-changing optimization at a time under the same workload, then re-profile because the bottleneck can move.
> 4. **Reduce work before multiplying resources.** Bound/filter at the data source, verify query access paths, batch repeated calls, trim payloads and keep synchronous hot-path work small. Select the smallest evidenced fix; urgent capacity or availability requirements can justify scaling first. Read `.claude/skills/performance-review/references/performance-knowledge.md` §10.1 when designing a capacity experiment and §6.1 before selecting a cache layer.
> 5. **Place reuse at the earliest safe boundary.** Compare request/process, shared data and proxy/client caches by work avoided, hit rate, key cardinality, freshness and operating cost. Cache lookup must preserve authorization and all response-varying inputs; personalized data is private/bypassed unless isolation and authorization before every hit are proven. Bound bytes/entries, lifetime and refill concurrency; specify write invalidation, stale-data policy, cross-instance behavior and cold-cache fallback. Verify cross-user isolation and mutation visibility as well as speed.
> 6. **Budget overload and recovery.** Find the measured SLO boundary and keep justified headroom; no universal CPU percentage defines safety. Bound queues, concurrency, pools, retries and dependency demand across all replicas. Exercise cache loss, deploy/warmup and overload: verify bounded degradation/shedding and recovery after demand falls, without dropping correctness, authorization or durability to win a benchmark.
> 7. **Scale the evidenced owner incrementally.** Compare tuning/offload and vertical capacity with horizontal replicas or component separation; name state/session/cache coherence, shared dependency limits, availability and operational costs. A single-instance design can be efficient while failing an availability requirement. Choose distribution only for measured pressure or explicit business/availability needs, with an owner, revisit trigger and reversible next step.
>
> **Evidence output:** workload/SLO/environment | load model and offered/achieved demand | limiting-resource proof | before/after distributions and errors | cache correctness/cold-state proof (if applicable) | headroom/recovery | cost/trade-off and next scaling trigger. Record unavailable measurements explicitly. **Closing priorities:** model demand → reduce work safely → prove capacity/recovery; retain the hosting contract and never generalize anecdotal numbers.

<!-- /SYNC:measured-capacity-engineering -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `<plans root>/goals/{YYMMDD-HHmm}-{slug}/goal.md`, plans root default `plans` and overridable via a `docsRoots.plans.path` entry in `docs/project-config.json` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

**Review/audit invocations:** follow `SYNC:review-decision-autonomy` for every decision prompt; choose supported recommendations without asking, preserve round-extension approval and actual authority.

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **what does it SACRIFICE?** name the dimensions checked (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it MATERIAL enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `ask user question tool` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; never bury one as a Low-severity note, never decide it silently, and never let delivery or convergence pressure authorize a one-way door — an un-walked-back one-way door is the user's call, not the reviewer's.
- **MANDATORY — a context that cannot ask escalates BY HANDOFF, never by silence.** `ask user question tool` reaches only the main interactive agent, so a sub-agent or a terminal/verdict-only mode cannot ask. There the duty is REDIRECTED, not waived: still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, and **state the unconfirmed MATERIAL trade-off in your RETURNED verdict so the CALLER escalates it** (a note only in an on-disk report is not a handoff); never emit an unqualified PASS. If you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

<!-- SYNC:engineering-foundation-gate:reminder -->

**IMPORTANT MUST ATTENTION** evidence-backed lifecycle/scale/criticality/repo/runtime profile; unknowns take lower tiers. Judge all 7 outcomes: **F1** reproducible build/run/test · **F2** exercise supported/required modes; dual modes only when warranted · **F3** applicable local/CI/production-shaped test portability · **F4** test-strength proof; no universal mutation tool · **F5** measured performance at warranted scale/risk · **F6** build/change scalability at meaningful module boundaries · **F7** stack/profile-fit mechanical checks. Evidence-backed `N/A-by-profile` is valid; prevent over-engineering. Creation blocks warranted omissions; brownfield advises without score changes, with smallest next steps. Catalog: `.claude/docs/engineering-foundation-catalog.md`; update first, re-run `inject_engineering_foundation_gate.py`.

<!-- /SYNC:engineering-foundation-gate:reminder -->

<!-- SYNC:review-principle-awareness:reminder -->

**IMPORTANT MUST ATTENTION** Every review first checks the change context and routes only applicable principles to their detailed protocols: scale-ready foundation, test intent in the project's native format (GWT is one option), AI-agent-as-user access, and UI/component design when relevant. Record evidence-backed apply/adapt/defer/N/A/block/unverified status with owner and next step; do not invent unrelated findings or expand scope.

<!-- /SYNC:review-principle-awareness:reminder -->

<!-- SYNC:measured-capacity-engineering:reminder -->

**MUST ATTENTION** capacity work: model demand/SLO and distinguish sessions from RPS/in-flight work; disclose load model and offered vs achieved demand; reduce measured work at a safe owner; preserve cache authorization/freshness/bounds; prove cold-state, overload recovery and justified headroom before scaling. Static review returns a verification plan, not invented throughput. Retain the hosting skill's scores, gates and authority.

<!-- /SYNC:measured-capacity-engineering:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Grade a project or planned architecture against architecture + scalability criteria and produce an evidence-backed `/20` verdict (`STRONG` / `NEEDS WORK` / `HIGH RISK`) before scale or delivery decisions harden; route deep checks to owner skills.
**IMPORTANT MUST ATTENTION scorecard scope:** assess all 10 areas — Build & CI Scalability, Architecture Pattern/distributed-monolith, Module Isolation, Dependency Discipline, Loose Coupling, Horizontal Scaling, DRY, Abstraction/Easy-to-Change, Clean Architecture, and Observability & Delivery — then route sibling-owned depth instead of duplicating it.
**IMPORTANT MUST ATTENTION main steps (same order):** (1) resolve `mode=init`/`mode=audit` + scope; (2) load project context + evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2 with evidence; (5) run G1-G7, then TVC; (6) emit the report under `tmp/reports/`; (7) validate sub-80/risk findings with `$why-review` (maximum 3 passes), or record the zero-risk skip.
**IMPORTANT MUST ATTENTION modes/gates:** `mode=init` scores planned greenfield evidence; `mode=audit` scores existing evidence. Every score needs proof or explicit `N/A - reason`; unproven criteria score `0`. `TVC: BLOCKED` prevents a `setup complete` claim but never changes `/20`.
**IMPORTANT MUST ATTENTION** Testability contract: resolve evidence-backed Unit/Integration/System/E2E rows, owner/root/data, copy-ready full/focused commands, zero-match failures, CI/simple Windows/macOS/Linux entry, unique run identity, and repeat proof before claiming setup, review, or test completion.
**IMPORTANT MUST ATTENTION advisory boundaries:** derive scale and business-criticality from evidence; Technique and Scenario matrices advise only and NEVER mutate `/20`, verdict, or G1-G7. Engineering Foundation `MISSING-WARRANTED` blocks when creating a foundation and stays advisory when auditing. A correctly-lean system is a PASS; new Tech/Lib recommendations require user confirmation.
**IMPORTANT MUST ATTENTION** self-audit every grade, gap, and recommendation against the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 BEFORE emitting. A scale deduction without evidence, tool-first recommendation, unnamed forces/sacrifice, or `— VERIFY` source is re-derived or dropped, NEVER reworded.
**IMPORTANT MUST ATTENTION** G5 requires a named ESCAPE HATCH from a metastable high-load state (shed / drain / warm / restart at lower concurrency). NEVER accept a latency number without its load-generation method; coordinated omission can delete the worst samples.
**IMPORTANT MUST ATTENTION trade-offs:** ALWAYS ask the 3 trade-off questions before every verdict, score, finding, or recommendation; name sacrifice, weigh gain vs cost, decide materiality, and confirm material choices with the user or hand them off. A material unconfirmed trade-off can NEVER be an unqualified PASS.

**Anti-Rationalization:**

| Evasion | Rebuttal |
| --- | --- |
