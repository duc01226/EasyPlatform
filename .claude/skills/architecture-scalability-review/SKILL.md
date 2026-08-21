---
name: architecture-scalability-review
version: 1.1.0
description: '[Architecture] Use when grading project architecture and scalability quality for greenfield init or brownfield audit: build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery.'
---

## Quick Summary

**Goal:** Grade a project or planned architecture against the full architecture + scalability quality scorecard, routing deep checks to the existing owner skills instead of duplicating them — so the project earns an evidence-backed `/20` verdict (STRONG / NEEDS WORK / HIGH RISK) before scale or delivery hardens the decisions.

**Summary:**

- This skill is the scorecard OWNER, not the deep owner — it scores 10 areas 0-2 (`/20`), then routes sibling-owned depth (architecture-design/review, domain-analysis, performance-review, production-readiness-review, security-review, linter-setup, scaffold) via the Ownership Matrix; NEVER expand into a sibling's checklist.
- Scoring is evidence-gated — `file:line`/command/artifact proof or explicit `N/A - reason`, else `0`; then 7 pass/fail gates (G1-G7) overlay the score without changing the `/20` math.
- Before emitting, self-audit every grade against the 11 thinking red flags (`architecture-knowledge.md` §20.3) — a deduction for unevidenced scale, a tool named before the requirement, or a recommendation whose sacrifice you cannot state is re-derived or dropped, NEVER reworded. **A `— VERIFY` row or section banner in `architecture-knowledge.md` §3/§8/§9/§10 is UNVERIFIED** — it can never be the sole basis for a deduction; confirm against the named source or the project's own docs.
- Two conditional advisory gates ride along — Technique Applicability + Scenario Stress — emitting guidance ONLY; NEVER mutate the `/20` score, verdict band, or gate pass/fail.
- Runs in `mode=init` (planned greenfield architecture) or `mode=audit` (existing brownfield source/config/CI/ADR evidence).

**Workflow (run in order):**

1. Resolve `mode=init` or `mode=audit` + target scope.
2. Load project context and evidence.
3. Read `references/scorecard.md`.
4. Score all 10 areas 0-2 with evidence.
5. Run pass/fail gates (G1-G7).
6. Emit the architecture scalability review report under `plans/reports/`.

**Key Rules:**

- MUST ATTENTION every score carries `file:line`, command output, architecture-artifact evidence, or explicit `N/A - reason`; unproven criteria score `0`.
- MUST ATTENTION this skill owns the scorecard, not the deep review of every concern — route depth to the sibling skills named in the Ownership Matrix; NEVER duplicate their checklists.
- New Tech/Lib: `N/A` by default. If the audit recommends Nx, Turborepo, Bazel, a new message broker, a new observability stack, or any other tool, present it for user confirmation before implementation.
- `mode=init` scores planned architecture from greenfield artifacts before implementation planning; `mode=audit` scores an existing brownfield project from real source, config, CI, docs, and ADR evidence.

## When To Use

- Greenfield/project-init flow after `architecture-design`, before implementation planning hardens decisions.
- On demand against an existing repository when the user asks to review project quality, architecture scalability, distributed-monolith risk, module boundaries, build scalability, or setup quality.
- Periodic architecture health check for a growing codebase.

NEVER use this as the every-change diff reviewer. Per-change regression checks belong in `architecture-review`, `performance-review`, `production-readiness-review`, and other sibling reviewers already wired into `workflow-review-changes`.

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `/architecture-review-full` (or `/start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## Scope And Modes

### `mode=init`

Score intended architecture before implementation exists. Evidence may include architecture reports, ADRs, tech-stack decisions, domain-analysis outputs, build/CI plans, deployment plans, and scaffold handoff tables.

Use `planned` evidence labels when implementation is not yet present. Score `2` only when the plan names enforceable mechanisms, not intent alone.

### `mode=audit`

Score an existing repository. Evidence must come from source files, build config, CI config, ADRs, reference docs, tests, dependency-boundary tooling, deployment/IaC files, and graph/grep commands.

If `.code-graph/graph.db` exists, run at least one graph command on key architecture files before concluding.

## Required Context

Read these before scoring:

- `docs/project-config.json`
- `docs/project-reference/docs-index-reference.md`
- `docs/project-reference/lessons.md`
- `docs/project-reference/project-structure-reference.md`
- Relevant stack docs from the docs index, based on target scope
- Accepted ADRs under `docs/adr/**`, when present
- Existing architecture, domain, CI, deployment, and observability artifacts in the target plan or repo

## Ownership Matrix

| Area                                        | Cadence                                       | This skill owns                                                                                                                | Route depth to                                                                                |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Build & CI Scalability                      | init / audit                                  | Score incremental builds, affected-only detection, cache strategy, parallel test/build strategy, monorepo quality gate posture | `linter-setup` for quality gates; `scaffold` for project foundation                           |
| Architecture Pattern / distributed-monolith | init / audit + every-change smell             | Score modular monolith vs microservices fit and distributed-monolith risk                                                      | `architecture-design` for design choices; `architecture-review` for diff-level boundary drift |
| Module Isolation                            | init / audit + every-change boundary drift    | Score bounded-context isolation and independent build/test/deploy expectations                                                 | `domain-analysis`, `architecture-review`                                                      |
| Dependency Discipline                       | init / audit + every-change                   | Score explicit dependency directions and enforcement mechanisms                                                                | `architecture-review`, `linter-setup`                                                         |
| Loose Coupling                              | init / audit + every-change                   | Score event-driven ownership and absence of avoidable sync coupling                                                            | `domain-analysis`, `architecture-review`                                                      |
| Horizontal Scaling                          | init / audit + local hot-path review          | Score system-level statelessness, load balancing, caching, async, partitioning, autoscaling, SPOF, latency/throughput limits   | `performance-review`, `production-readiness-review`                                           |
| DRY                                         | init / audit + every-change duplication drift | Score strategic shared-platform, monorepo/shared-lib, and duplicated-knowledge posture                                         | `architecture-review`, `scaffold`                                                             |
| Abstraction / Easy-to-Change                | init / audit + every-change conformance       | Score swappable technical concerns, stable contracts, and interface boundaries where they reduce future change cost            | `architecture-design`, `architecture-review`, `scaffold`                                      |
| Clean Architecture                          | init / audit + every-change                   | Score dependency-rule fit, business logic placement, and architecture style enforcement                                        | `architecture-review`, `scaffold`                                                             |
| Observability & Delivery                    | init / audit + production readiness           | Score monitoring, logging, metrics, DevOps/deployment, CI/CD, IaC, rollback posture                                            | `production-readiness-review`, `linter-setup`                                                 |

When a concern belongs to a sibling, record a one-line route pointer and continue scoring from evidence. NEVER expand into the sibling's full checklist.

## Workflow

### Step 1: Resolve Mode And Scope

Determine:

- Mode: `mode=init` or `mode=audit`
- Target: current repo, plan directory, specific service/module, or architecture artifact set
- Evidence roots: source paths, CI/build files, ADRs, reference docs, workflow outputs
- Report slug: project/module name

If mode is missing, infer from context:

- Greenfield/project-init/plan artifacts only -> `mode=init`
- Existing repo/source/config review -> `mode=audit`

### Step 2: Gather Evidence

Use narrow grep/glob searches first. For brownfield audits, collect at least:

- Build files and CI pipeline config
- Workspace/monorepo config, if present
- Dependency-boundary or architecture-rule tooling
- Module/service folder structure
- Message bus, event, API, and cross-context communication patterns
- Deployment, IaC, observability, and runtime config
- ADRs and architecture reports

Run graph trace on key architecture or module-boundary files when `.code-graph/graph.db` exists. If the graph lacks relevant files, record that limitation and continue with grep/file evidence.

### Step 3: Score The 10 Areas

Read `references/scorecard.md` and score each area:

- `0` = absent, contradicted, or unproven
- `1` = partially addressed, documented but weakly enforced, or implemented in only some areas
- `2` = designed and enforced with evidence

Total score: `/20`.

| Total | Verdict    | Meaning                                                                                |
| ----: | ---------- | -------------------------------------------------------------------------------------- |
| 17-20 | STRONG     | Architecture/scalability posture is credible; address any non-blocking gaps.           |
| 11-16 | NEEDS WORK | Material gaps exist; plan follow-up before growth or high-scale use.                   |
|  0-10 | HIGH RISK  | Architecture/setup quality is not yet safe for scale; fix gates before major delivery. |

#### Technique Applicability (advisory — NON-SCORING)

After scoring, invoke `SYNC:scale-technique-gate`: derive the system's scale tier from evidence (users/RPS, SLO, data volume, tenancy, topology — cite `file:line`/config/infra + confidence), then emit the **Technique Applicability Matrix** (`technique | tier-warranted? | present? | verdict | advice | evidence`) across the 10 concern groups. Surface warranted-but-missing techniques as advice AND flag `OVER-ENGINEERED` techniques the tier does not warrant (anti-over-engineering).

> **Advisory only — does NOT change the `/20` score or any verdict band.** A `MISSING-WARRANTED` technique is guidance, never a deduction; a correctly-lean small system stays a PASS. Full catalog → `.claude/docs/scale-technique-catalog.md`.

### Step 4: Run Pass/Fail Gates

Run these gates after scoring. Gates are pass/fail overlays and do not change the `/20` math.

| Gate                              | Blocks STRONG when failing                        | Check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Evidence Integrity             | yes                                               | Any `2` score without evidence is downgraded; repeated unproven claims fail the gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| G2 Build & CI Scalability         | yes for init/audit scope with multi-module growth | Incremental/affected-only/caching strategy exists or a clear N/A rationale is documented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| G3 Distributed-Monolith Risk      | yes                                               | Chosen architecture avoids service/module split with shared DB, circular sync calls, or deploy-together-only coupling disguised as distribution.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| G4 Boundary Enforcement           | yes                                               | Dependency direction and module boundaries are explicit and enforceable.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| G5 Horizontal Scaling Bottlenecks | yes for high-scale target                         | Statelessness, bottlenecks, SPOF, resource ceilings, and async/back-pressure posture are known and owned. **Also required: a named ESCAPE HATCH out of a metastable high-load state** (shed at the edge / drain-or-truncate the queue / warm the cache / restart at lower concurrency) — retry storms, cold caches and queue backlog form a self-sustaining loop that OUTLIVES its trigger, so removing load does not recover the system. **And latency evidence with no stated load-generation method cannot support a Pass — grade G5 `Partial` at best and ask for the method** (per `references/scorecard.md:38`; do NOT discard the figure as missing evidence) — because a harness that waits for slow responses deletes the worst samples (coordinated omission), so its p99 is a lie. |
| G6 Reuse Without Coupling         | no                                                | Shared libraries/platform code reduce duplicated knowledge without leaking consumer domain concepts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| G7 Secrets And Sensitive Output   | yes                                               | Audit report redacts credentials and does not expose secrets found during inspection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Critical/high gate failures require an owner-accepted risk or follow-up plan before reporting STRONG.

### Step 5: Emit Report

Write:

`plans/reports/architecture-scalability-review-{YYMMDD}-{HHmm}-{slug}.md`

Report structure:

```markdown
# Architecture Scalability Review

**Mode:** init | audit
**Scope:** {project/module/artifacts}
**Date:** {date}
**Score:** {X}/20
**Verdict:** STRONG | NEEDS WORK | HIGH RISK

## Scorecard

| #   | Area | Score | Evidence | Route / Owner |
| --- | ---- | ----: | -------- | ------------- |

## Pass/Fail Gates

| Gate | Status | Evidence | Required follow-up |
| ---- | ------ | -------- | ------------------ |

## Cadence Matrix

| Area | Init/on-demand home | Every-change home | Rationale |
| ---- | ------------------- | ----------------- | --------- |

## Findings

### Critical / High

### Medium / Low

## New Tech/Lib Recommendations

List only user-confirmed recommendations or mark `N/A`.
```

## Scorecard Validation Gate (why-review, MANDATORY when the scorecard has any sub-80 grade or risk finding)

> **Purpose:** A scorecard is a JUDGMENT. Validate it adversarially before emitting it so a mis-scored area or an inflated risk finding does not ship as ground truth. This gate validates findings only — it routes any fix to the owning sibling review, it does NOT self-converge a fix-loop.

**Trigger:** Any area graded below 80, or any risk/gap finding. Skip ONLY when every area scored ≥80 with zero risk findings.

**Protocol:**

1. Read the finalized scorecard report from `plans/reports/{skill}-{date}-{slug}.md` (or the exact report path written).
2. Invoke `/why-review --validate-findings <report-path>` — verify each sub-80 grade and each risk finding has `file:line` evidence and clears why-review's finding-survival bar.
3. **If why-review demotes/removes any grade or finding:** update the scorecard with the revised grade/severity and add a `## Why-Review Validation Notes` section citing what changed and why.
4. **If the scorecard changed after validation:** re-run this gate — maximum 2 validation passes — until the remaining grades/findings are validated. No fix-loop: this skill grades and routes fixes to siblings; it never restarts a full review over its own fixes.

**Anti-bias (MANDATORY before emitting):** steel-man each grade — argue the score should be one band better AND one band worse; a grade that survives its own steel-man ships. A scorecard whose grades were never challenged is not validated.

**Self-audit against the thinking red flags (MANDATORY before emitting):** run the 11 red flags in `.claude/docs/architecture-knowledge.md` §20.3 against every grade, gap and recommendation. The four that fire most often in a scorecard: **grading down for a scale you cannot evidence** · **recommending a tool before stating the requirement** · **"best practice" with no named forces** · **cannot say what your recommendation SACRIFICES**. Any hit invalidates the GRADE's reasoning — re-derive it from evidence or drop the finding; NEVER just reword it. — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.

## Completion Criteria

- All 10 areas are scored.
- Every score has evidence or explicit `N/A - reason`.
- All gates have `pass`, `partial`, `fail`, or `N/A - reason`.
- Cadence matrix maps each area to init/on-demand and every-change homes.
- Sibling deep checks are routed, not duplicated.

<!-- SYNC:scale-technique-gate -->

> **Scalability & Production-Readiness Technique Gate** — CONDITIONAL, evidence-gated, scale-tiered. Judge which system-design techniques a system _warrants_ at its scale — flag warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight ones. **ADVICE-ONLY: emit the matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
>
> 1. **Derive the scale tier FIRST — from evidence, never assumed.** Read users/RPS, SLO/latency targets, data volume, tenancy, topology from config/infra/specs; cite `file:line` + confidence. Tiers: `T0` internal/single-instance · `T1` small SaaS (<10k users) · `T2` high-scale (10k–1M) · `T3` massive/multi-region (millions+). Unknown tier → state assumption, do NOT default to T3.
> 2. **Judge each concern group only at/above its warranting tier** (member techniques → owning review skill for depth):
>     - Traffic & Edge — Rate Limiting, Load Balancing, Reverse Proxy, API Gateway, CDN, Edge Caching, WAF, DDoS (T1+; CDN/WAF T2+) → security-review owns WAF/DDoS
>     - Caching & Data Access — Caching, Cache Invalidation, DB Indexing, Query Optimization, N+1, Connection Pooling (T1+) → performance-review owns depth
>     - Data Scaling & Consistency — Read Replicas, Sharding, Partitioning, Replication, CAP, Eventual Consistency, Locks, Leader Election (T2+; sharding/multi-region T3) → performance-review
>     - Async & Messaging — Message Queues, Pub/Sub, Event-Driven, Saga, DLQ, Distributed Transactions, Backpressure, Webhooks, WebSockets/SSE (T2+)
>     - Resilience — Circuit Breakers, Timeouts, Retries, Backoff, Idempotency, Health Checks, Liveness/Readiness, Failover, Graceful Degradation (T1+) → production-readiness-review
>     - Scaling & Compute — Autoscaling, Horizontal/Vertical Scaling, Serverless Limits, Cold Starts, Cron Jobs, Thread Safety, GC/Memory Leaks (T1+; autoscaling T2+)
>     - Deployment & Release — CI/CD, Docker, Kubernetes, Blue-Green/Canary/Rolling, Rollbacks, Feature Flags, IaC/Terraform/Helm, Build Caching (CI/CD T0+; K8s/canary T2+)
>     - Observability — Monitoring, Logging, Distributed Tracing, Metrics, Alerting, SLOs/SLIs, Error Budgets (T1+; tracing/error-budgets T2+) → production-readiness-review
>     - Security & Compliance — Secrets Management, IAM, OAuth, JWT Rotation, TLS, Encryption at Rest/Transit, CORS, CSRF, SQLi, XSS, SSRF (T0+) → security-review owns
>     - DR & Infra — Backups, Disaster Recovery, Multi-Region, Chaos Engineering, Schema Versioning, DB Migrations, Cost Optimization (backups T1+; DR/multi-region/chaos T3) → production-readiness-review
> 3. **Assign one of 4 verdicts per warranted technique:** `PRESENT` · `MISSING-WARRANTED` (→ **advise only** — guidance, NOT a score/gate lever) · `N/A-by-scale` (below warranting tier) · `OVER-ENGINEERED` (present but unwarranted at this tier → advise AGAINST).
> 4. **Anti-over-engineering guard (first-class):** do NOT recommend K8s, sharding, multi-region, service mesh, event sourcing, or distributed transactions below their warranting tier. A correctly-lean small system is a PASS, never a gap.
> 5. **Output — Technique Applicability Matrix:** `technique | tier-warranted? | present? | verdict | advice | evidence (file:line/config/infra)`. Full grouped catalog + per-tier baseline → `.claude/docs/scale-technique-catalog.md`. Hosting reviews surface this matrix WITHOUT changing any `/20`, `/24`, verdict band, or PASS/FAIL (per user decision 2026-07-06). **Drift-guard: tier thresholds & per-technique warranting tiers are AUTHORITATIVE in `.claude/docs/scale-technique-catalog.md` — the inline tier summary above is a condensed pointer; on any tier/technique change, update the catalog FIRST, then re-run `.claude/scripts/inject_scale_technique_gate.py` to re-propagate this block.**
>
> **BLOCKED until:** `- [ ]` tier derived from evidence (not assumed) `- [ ]` matrix emitted `- [ ]` over-engineering guard applied `- [ ]` advisory-only (no score/verdict mutation) confirmed

<!-- /SYNC:scale-technique-gate -->

<!-- SYNC:scenario-stress-eval -->

> **Scenario Stress & Resilience Evaluation** — CONDITIONAL, evidence-gated, business-criticality-aware. The top-down companion to `SYNC:scale-technique-gate`: instead of _"is technique X present?"_, put the system UNDER concrete failure/load scenarios and judge whether it SURVIVES, SELF-HEALS, and whether its BUSINESS needs it to. **ADVICE-ONLY: emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.**
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

<!-- SYNC:goal-contract-satisfaction-loop -->

> **Goal Contract Satisfaction Loop** — Persist the user goal in an external file, execute against it, and loop review/fix until every saved required criterion passes or a blocker escalates. Bounded closed loop — NEVER open-ended autonomous exploration.
>
> 1. **Resolve the active goal** (in order): active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create a new Goal Contract from the current user request (template: `.claude/templates/goal-contract-template.md`).
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

<!-- SYNC:trade-off-interrogation-gate -->

> **Trade-Off Interrogation Gate** — ALWAYS ask these THREE questions before ANY verdict, score, finding, or recommendation — about the thing under review AND about every recommendation YOU make. — why: naming a benefit without its price is an endorsement, not a review; the costliest trade-offs are the ones nobody wrote down.
>
> 1. **Is there any trade-off?** Name what it SACRIFICES. "None" / "pure win" is an unfinished analysis, NOT an answer — to claim none, state which dimensions you checked and why each is unaffected: future change cost · complexity · performance/latency · memory/cost · coupling · reversibility · migration burden · operational load · blast radius · security posture · testability · team skill/ramp · delivery time · UX.
> 2. **Is it worth it?** Weigh gain against sacrifice EXPLICITLY — what is gained (with a metric) · what it costs · WHO pays · WHEN it comes due — then emit **WORTH IT / NOT WORTH IT / UNCLEAR**. "Better" with no metric and no cost FAILS this question. NOT WORTH IT → withdraw or replace the recommendation, never keep it as-is.
> 3. **Is the trade-off material enough to CONFIRM WITH THE USER?** A material trade-off is the user's call, never yours. **MATERIAL** when ANY holds: irreversible / one-way door (data migration, public contract, storage format, vendor lock-in) · cost shifted onto someone else (another team, ops/on-call, future maintainer, end user) · one quality attribute traded for another (correctness↔speed, security↔convenience, latency↔cost, simplicity↔flexibility) · a boundary crossed (client↔server tier, service contract, event contract, shared library) · a high-consequence path (auth, money, data integrity, breaking change, High/Medium residual risk) · the worth-it verdict is UNCLEAR.
>
> **MATERIAL → STOP and confirm via `AskUserQuestion` BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it via `AskUserQuestion` on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Re-read files after context changes.** Context compaction, resume, or long-running work can make memory stale; verify current files before acting.
> **Verify generated content against source evidence.** AI hallucinates APIs, names, claims, and document facts. Check the relevant source before documenting or referencing.
> **Check downstream references before deleting or renaming.** Removing an artifact can stale docs, generated mirrors, configs, and callers; map references first.
> **Trace the full impact chain after edits.** Changing a definition can miss derived outputs and consumers. Follow the affected chain before declaring done.
> **Verify ALL affected outputs, not just the first.** One green check is not all green checks; validate every output surface the change can affect.
> **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Before changing or reporting a constant, limit, flag, cutoff, wording, or pattern, read nearby context and history, the CALLER's ordering, and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Assert the outcome your system owns, not the intermediate state your infrastructure owns.** When verifying async work, assert the final business state — never the delivery/retry bookkeeping held in shared infrastructure that any co-running process can write. Such a check passes when run alone and flakes the moment anything else shares that infrastructure.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Grade project architecture & scalability quality on the evidence-backed scorecard — build/CI scalability, distributed-monolith risk, module isolation, dependency discipline, loose coupling, horizontal scaling, DRY, abstraction, clean architecture, observability, and delivery — routing sibling-owned depth (security, performance, production-readiness) rather than duplicating it.

**IMPORTANT MUST ATTENTION main steps (run in order):** (1) resolve `mode=init`/`mode=audit` + scope; (2) load project context + evidence; (3) read `references/scorecard.md`; (4) score all 10 areas 0-2 with evidence; (5) run pass/fail gates G1-G7; (6) emit the report under `plans/reports/`.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Scale-Technique Gate (advisory):** Derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. **ADVICE-ONLY — surface the Technique Applicability Matrix as guidance; NEVER mutate the scorecard score, a verdict band, or a pass/fail gate.**

**IMPORTANT MUST ATTENTION** every score carries `file:line`/config/infra evidence or an explicit `N/A - reason`; confidence >80% to act, <60% do NOT recommend — NEVER present a guess as fact.
**IMPORTANT MUST ATTENTION** the Technique Applicability Matrix is ADVISORY guidance only — advise on warranted-but-missing gaps AND advise AGAINST over-engineering below tier, but it NEVER changes the scorecard score, a verdict band, or a gate result (per user decision 2026-07-06).
**IMPORTANT MUST ATTENTION** anti-over-engineering is first-class — a correctly-lean small system is a PASS, never a gap; do NOT recommend Kubernetes, sharding, multi-region, or service mesh below their warranting tier.
**IMPORTANT MUST ATTENTION** self-audit every grade, gap and recommendation against the 11 thinking red flags (`.claude/docs/architecture-knowledge.md` §20.3) BEFORE emitting — a deduction for a scale you cannot evidence, a tool named before the requirement, "best practice" with no named forces, or a recommendation whose SACRIFICE you cannot state is re-derived from evidence or dropped, NEVER reworded — why: an unevidenced deduction reads as rigour and sends the team to fix a problem they do not have.
**IMPORTANT MUST ATTENTION** G5 requires a named ESCAPE HATCH out of a metastable high-load state (shed / drain / warm / restart at lower concurrency) — a self-sustaining retry-cache-queue loop OUTLIVES its trigger, so load removal alone does not recover the system; and NEVER accept a latency number without knowing how the load was generated (coordinated omission deletes the worst samples).
