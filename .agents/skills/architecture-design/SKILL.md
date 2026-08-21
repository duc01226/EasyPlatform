---
name: architecture-design
description: '[Architecture] Use when designing solution architecture across backend, frontend, data & consistency, integration & APIs, deployment, monitoring, testing, and code quality. Architecture laws, style-selection triggers, coupling taxonomy, trade-off tables and the anti-pattern catalog live in `.claude/docs/architecture-knowledge.md`.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Subagent authorization: when a skill is user-invoked or AI-detected and its protocol requires subagents, that skill activation authorizes use of the required `spawn_agent` subagent(s) for that task.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex uses static project-reference loading instead of runtime-injected project docs.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-config.json` (project-specific paths, commands, modules, and workflow/test settings)
- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Missing/stale context route:** If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow setup route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.

**Situation-based docs:**

- Project structure/architecture/tech-stack/deployment/setup (any layer — backend, frontend, or infra): `project-structure-reference.md`
- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec authoring, `docs/specs/` pathing, or TC format: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`
- Behavior/public-contract changes or spec-test-code sync: `workflow-spec-test-code-cycle-reference.md` plus the spec docs above
- Derived spec indexes/ERDs/reimplementation guides: `spec-system-reference.md` and source Feature Specs under `docs/specs/`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** As solution architect, deliver a complete, evidence-backed, user-validated architecture decision report covering ALL concerns (backend, frontend, design patterns, library ecosystem, testing, CI/CD, deployment, monitoring, code quality, dependency management) — every concern researched with 3+ options, every recommendation carrying confidence % + cited evidence, every decision user-confirmed — so implementation proceeds on sound, owned architectural choices.

**Summary:**

- Decide mode FIRST (Step 1): greenfield researches every concern from scratch; brownfield reads reference docs + accepted ADRs, constrains research to existing stack — NEVER re-litigate a settled ADR-recorded decision without superseding-ADR rationale.
- **Rank every decision by REVERSIBILITY first (Step 2): one-way door (data model, tenancy, consistency model, service boundaries, public contracts, sync-vs-async) → ADR + user validation MANDATORY; two-way door → decide and move.** — why: architecture IS the set of decisions expensive to reverse; treating a one-way door as reversible is the costliest error this skill can make.
- Drive style choice with NUMBERS, not adjectives: quantify Step-2 quality-attribute scenarios (latency p95/p99, throughput, SLO, RPO/RTO, data growth, concurrency); pick **≤3 DRIVING attributes and name which ones you SACRIFICE**; any unknown target becomes explicit `Unresolved question`, never a silent guess.
- **Profile the workload before selecting a scaling technique:** read/write ratio · sustained/peak RPS · query shapes · data size/growth · burstiness/hot keys · consistency/staleness · user geography. Escalate through the smallest reversible rung: measure/tune → choose vertical and/or stateless horizontal scale from headroom + availability needs → read/write-specific tactics → partition/shard LAST. — why: a scalable product is a sequence of evidenced bottleneck removals, not a shopping list of distributed components.
- **Simplicity is the default; complexity must be BOUGHT with a measured requirement — modulith-first, distribute only against a named + measured extraction trigger (Step 3A).** Reason FROM `.claude/docs/architecture-knowledge.md` (laws, coupling taxonomy, style triggers, trade-off + anti-pattern catalogs) — never from familiarity or fashion.
- Every concern needs 3+ researched options with cited evidence (stars, last release, downloads, CVE scan) + confidence % — familiarity alone never sufficient grounds for a recommendation.
- **Interrogate before deciding, DESIGN IT TWICE, then self-audit:** run the 15-question pre-decision script (§20.1) on every one-way door (Step 2-2) · produce ≥2 MATERIALLY different candidates per one-way door before choosing (Step 3A) · run the 11 thinking red flags (§20.3) against your own draft before emitting. Prescribe the **TACTIC** (§2), never the product. — why: a first-idea design with no rejected alternative and no named falsifier is a belief, not a decision.
- Produce the two binding downstream contracts or the chain breaks: emit an ADR per hard-to-reverse decision (`architecture-review` Cat 9 enforces) and the Scaffold Handoff tool-choices table (`scaffold`/`harness-setup` consume), then run the MANDATORY Step-12 user-validation interview before confirming.
- **Main steps/tasks (run in order, track each):** 1 Load Context (+pick greenfield/brownfield mode) → 2 Derive Architecture Requirements (+workload profile/scaling ladder, reversibility ranking, ≤3 driving attributes, 6-part quality-attribute scenarios, 2-2 pre-decision interrogation, user-validate) → 3A Backend Styles (selection procedure incl. DESIGN IT TWICE + extraction triggers) → 3B Backend Design Patterns → **3C Data & Consistency Architecture** (store/substrate per access pattern, replication/failover, cache contract, consistency + staleness, transaction boundary, tenancy, partitioning, migrations, retention) → **3D Integration & API Architecture** (sync-vs-async + acceptance state, API/edge cache style, versioning, contract tests, outbox, idempotency, event granularity) → 4 Frontend Architecture (styles + patterns) → 4B UI System Architecture (styling/tokens/components/responsive, user-validate; skip if backend-only) → 5 Library Ecosystem Research (3 options/concern) → 6 Testing Architecture → 7 CI/CD & Deployment (+expand–contract migrations, backward AND forward compat) → 8 Observability & Monitoring (signal roles + sampling/cardinality) → 9 Code Quality + Scaffold Handoff table → 10 Dependency Risk Assessment → 11 Generate Report + emit ADRs → 12 User Validation Interview (8-12 questions, mark `confirmed`) → Next Steps + always-offer council escalation. — why: AI keeps forgetting the skill's own steps; this is the recovery anchor.

**Workflow (12 steps):**

1. **Load Context** — Read domain model, tech stack, business evaluation, refined PBI
2. **Derive Architecture Requirements** — Profile workload + ordered scaling ladder, rank reversibility, pick ≤3 driving attributes, quantify 6-part scenarios, run 2-2 pre-decision interrogation on every one-way door
3. **Backend Architecture** — 3A styles (selection procedure) · 3B design patterns · **3C data & consistency** · **3D integration & APIs**
4. **Frontend Architecture** — Research top 3 frontend architecture styles + design patterns
5. **Library Ecosystem Research** — Best-practice libraries per concern (validation, caching, logging, utils, etc.)
6. **Testing Architecture** — Unit, integration, E2E, performance testing frameworks + strategy
7. **CI/CD & Deployment** — Pipeline design, containerization, orchestration, IaC
8. **Observability & Monitoring** — Logging, metrics, tracing, alerting stack
9. **Code Quality & Clean Code** — Linters, analyzers, formatters, enforcement tooling
10. **Dependency Risk Assessment** — Package health, obsolescence risk, maintenance cost
11. **Generate Report** — Full architecture decision report with all recommendations
12. **User Validation** — Present findings, ask 8-12 questions, confirm all decisions

**Key Rules:**

- **MANDATORY IMPORTANT MUST ATTENTION** research minimum 3 options per architecture concern with web evidence
- **MANDATORY IMPORTANT MUST ATTENTION** include confidence % with evidence for every recommendation
- **MANDATORY IMPORTANT MUST ATTENTION** run user validation interview at end (never skip)
- Delegate to `solution-architect` agent for complex architecture decisions
- All claims must cite sources (URL, benchmark, case study, or codebase evidence)
- Base every recommendation on evidence, never on familiarity alone

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

---

## Inputs & Handoffs (consume vs produce)

Skill sits mid-workflow — consumes settled upstream decisions, produces artifacts downstream steps build on. Do NOT re-derive what upstream step already owns; do NOT leave downstream consumer without its needed artifact. — why: re-deriving settled decisions wastes effort and risks divergence from the recorded choice.

| Consumes (read, don't re-derive)                 | From                          | Produces (named deliverable)                                 | Consumed by                         |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------------------ | ----------------------------------- |
| Bounded contexts, aggregates, domain events, ERD | `domain-analysis`             | Architecture decision report (`{plan-dir}/research/...`)     | `plan`, `plan-execute`              |
| Confirmed languages/frameworks/databases         | `tech-stack-research`         | Confirmed decisions (`{plan-dir}/phase-02b-architecture.md`) | `plan`, `scaffold`                  |
| Expected scale, compliance, budget constraints   | `business-evaluation`         | Scaffold Handoff table (tooling + fitness rules)             | `scaffold`, `harness-setup`         |
| Existing stack/patterns/ADRs (brownfield)        | reference docs, `docs/adr/**` | ADRs for hard-to-reverse decisions (`docs/adr/`)             | `architecture-review` (conformance) |

If upstream artifact missing, capture minimum needed here and note gap — NEVER silently re-run full upstream analysis. — why: a silent re-run hides the missing-input gap that the owning step should resolve.

---

## Step 1: Load Context

> **Mode (decide first):** **Greenfield** (new project, e.g. via `workflow-greenfield-init`) → research every concern from scratch, full 3-options-per-concern. **Brownfield** (large feature in existing codebase, e.g. `workflow-big-feature`) → FIRST read project reference docs + accepted ADRs, constrain research to existing stack/patterns, propose changes only where new requirement genuinely outgrows them — NEVER re-litigate settled ADR-recorded decision without superseding-ADR rationale. — why: re-deciding a recorded choice churns the codebase and breaks downstream conformance checks.

Read artifacts from prior workflow steps (search `plans/` and `team-artifacts/`):

- Domain model / ERD (complexity, bounded contexts, aggregate count)
- Tech stack decisions (confirmed languages, frameworks, databases)
- Business evaluation (scale, constraints, compliance)
- Refined PBI (scope, acceptance criteria)
- Discovery interview (team skills, experience level)

Extract, summarize:

| Signal                  | Value        | Source           |
| ----------------------- | ------------ | ---------------- |
| Bounded contexts        | ...          | domain model     |
| Aggregate count         | ...          | domain model     |
| Cross-context events    | ...          | domain model     |
| Confirmed tech stack    | ...          | tech stack phase |
| Expected scale          | ...          | business eval    |
| Team architecture exp.  | ...          | discovery        |
| Compliance requirements | ...          | business eval    |
| Real-time needs         | Yes/No       | refined PBI      |
| Integration complexity  | Low/Med/High | domain model     |
| Deployment target       | ...          | business eval    |

---

## Step 2: Derive Architecture Requirements

> **Reason FROM the knowledge body, not from memory.** `.claude/docs/architecture-knowledge.md` is AUTHORITATIVE for architecture laws (CAP/PACELC, Conway, Amdahl, USL, Little, Gall, Hyrum, Parnas), the coupling taxonomy + four coupling dimensions, style-selection triggers, the trade-off cheat sheet, and the ~100-entry anti-pattern catalog. Read the sections relevant to this design before recommending. **Honor the catalog's provenance markers in §3/§8/§9/§10** — a row (or section banner) marked `— VERIFY` is an UNVERIFIED assertion, so cite it as a hypothesis to check against the named source **where one is named** (a `[model-knowledge]` row names none — check the project's own docs or a primary source instead), NEVER as settled fact in a recommendation. **The project's own reference docs and accepted ADRs OUTRANK that catalog on any conflict** — the catalog supplies universal reasoning, the project supplies binding convention. — why: universal names hardcoded as project rules rot against real repos.

### 2-0: Rank every decision by REVERSIBILITY (do this FIRST)

Architecture = the set of decisions **expensive to reverse**; everything cheap to reverse is design — leave it to implementers. Classify each decision BEFORE researching it, because the classification sets how much rigour it earns.

| Class            | Meaning                                                                  | Required treatment                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **One-way door** | Reversal costs a migration, a rewrite, or a breaking change to consumers | **ADR (Step 11) + user validation (Step 12) MANDATORY** — research 3+ options, name the rejected alternative AND the measurable revisit trigger |
| **Two-way door** | Reversal is a refactor inside one module                                 | Decide, record one line, move on — NEVER burn a validation question on it                                                                       |

**One-way doors (assume MANDATORY ADR unless proven otherwise):** data model + primary-key strategy · tenancy model · consistency model per read path · sync-vs-async at a boundary · public API/event contract · service boundary lines · cloud-primitive lock-in · auth/identity model · data residency + retention.

**MANDATORY IMPORTANT MUST ATTENTION** never treat a one-way door as a two-way door to save a step — why: an unreviewed irreversible decision is the single most expensive failure mode of this skill, and it surfaces months later as a migration.

Map signals to architecture constraints:

| Signal                      | Architecture Requirement                                  | Priority |
| --------------------------- | --------------------------------------------------------- | -------- |
| Many bounded contexts       | Clear module boundaries, context isolation                | Must     |
| High scale                  | Horizontal scaling, stateless services, caching strategy  | Must     |
| Complex domain              | Rich domain model, separation of domain from infra        | Must     |
| Cross-context events        | Event-driven communication, eventual consistency          | Must     |
| Small team                  | Low ceremony, fewer layers, convention over configuration | Should   |
| Compliance                  | Audit trail, immutable events, access control layers      | Must     |
| Real-time                   | Event sourcing or pub/sub, WebSocket/SSE support          | Should   |
| High integration complexity | Anti-corruption layers, adapter pattern, API gateway      | Should   |

### Quality-Attribute Scenarios (quantify — these drive the style choice)

Qualitative "Must/Should" cannot decide, e.g., modular monolith vs microservices. Capture **measurable** targets; ask user for any unknown by asking the user directly (guess acceptable only when labelled an assumption with confidence %). These targets become ADR-recorded budgets `architecture-review` Category 9 later checks changes against. — why: a style chosen without numbers is a guess, not an enforceable decision.

| Quality attribute     | Scenario (stimulus → measurable response)                                 | Target (fill in)   |
| --------------------- | ------------------------------------------------------------------------- | ------------------ |
| Latency               | p95 / p99 response time for the hottest read and write paths              | e.g. p99 < 300ms   |
| Throughput            | Sustained req/s and peak burst the system must absorb                     | e.g. 500 rps peak  |
| Availability / SLO    | Target uptime and error budget                                            | e.g. 99.9%         |
| Data durability (RPO) | Max acceptable data loss on failure                                       | e.g. ≤ 5 min       |
| Recovery (RTO)        | Max acceptable time to restore service                                    | e.g. ≤ 30 min      |
| Data-volume growth    | Row/document/event growth → storage, index, partition strategy            | e.g. 10M rows/yr   |
| Concurrency           | Concurrent users/sessions and contention hot spots                        | e.g. 2k concurrent |
| Compliance/retention  | Regulated data, retention window, residency, audit                        | e.g. GDPR, 7yr     |
| Cost unit economics   | `$/request`, `$/tenant`, `$/MAU` — and whether unit cost RISES with scale | e.g. <$0.002/req   |

Scenario template — **all SIX parts, none optional**: `[SOURCE: who/what triggers] [STIMULUS: the event] on [ARTIFACT: which component] under [ENVIRONMENT: the conditions] SHALL produce [RESPONSE] within [MEASURE: threshold + instrument]`. "Must be scalable" decides nothing; "5,000 concurrent checkout sessions at 400 rps SHALL complete p99 < 800 ms, ≤0.1% errors, verified by the CI k6 profile" selects a structure.

**MUST ATTENTION** a scenario missing SOURCE or ARTIFACT is untestable — you cannot write a fitness function for "the system" under "load", so name the actor and the component. — why: an unattributed scenario gets no owner, no test and no budget, so it is never verified and silently degrades.

**Rule:** any target left unknown is explicit `Unresolved question` (Step 11), NEVER a silent omission — an architecture chosen without scale numbers is a guess, not a decision.

### Workload Profile + Scaling Ladder (MANDATORY before technique selection)

Record `read:write ratio` · sustained/peak RPS or events/s · dominant query/write shapes · dataset size + growth · payload size · burst duration · hot-key/tenant skew · user regions · latency percentile targets · consistency/staleness tolerance. For every proposed scaling component, name the measured bottleneck it removes and the next bottleneck it creates.

| Order                    | Use when evidence shows                                                           | First tactic                                                                                 | Purchase price                                                                        |
| ------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Measure + tune        | Baseline unknown or slow path unprofiled                                          | Query/plan analysis, indexes, batching, pooling, compression                                 | Engineering time; lowest reversibility cost                                           |
| 2A. Vertical scale       | One node remains simplest and headroom exists                                     | More CPU/RAM/IOPS; tune runtime/database                                                     | Hardware ceiling; remaining SPOF without redundancy                                   |
| 2B. Horizontal app scale | Availability or aggregate compute requires replicas and the path can be stateless | Replicas + redundant load balancing + health checks                                          | Coordination, externalized state, deployment complexity                               |
| 4. Read-path scale       | High read ratio or global read latency                                            | Cache/CDN/read replicas/read models                                                          | Invalidation, lag, read-your-writes, cache-key correctness                            |
| 5. Write-path scale      | Bursty ingest or heavy work need not finish inline                                | Batching, durable queue + workers; LSM store for sustained write-heavy known-query workloads | Accepted ≠ completed, retries/idempotency/backpressure; compaction/read amplification |
| 6. Partition/shard       | Earlier rungs proven insufficient by capacity measurements                        | Query-aligned partition key + reshard plan                                                   | Cross-shard queries/transactions, hotspots, hard reversal                             |

**MANDATORY IMPORTANT MUST ATTENTION** NEVER jump to sharding, multi-region writes, or an extra datastore without evidence that earlier rungs cannot meet the quantified target — why: these are hard-to-reverse operational systems, not generic performance upgrades.

**Move each attribute with a TACTIC, not a product.** Once a target is unmet or at risk, select the mechanism from the tactics inventory in `.claude/docs/architecture-knowledge.md` §2 (availability · performance · modifiability · security · testability · usability) — "bulkhead a pool per dependency" is a design decision; "add Kubernetes" is a shopping list. — why: the tactic is portable across stacks and makes the trade-off legible, the product imports costs nobody asked for.

### 2-1: Pick ≤3 DRIVING attributes — and name what you SACRIFICE

Quality attributes CONFLICT, and that conflict IS the architecture: consistency↔availability · latency↔durability · flexibility↔simplicity · security↔usability · cost↔redundancy · performance↔modifiability.

**MANDATORY IMPORTANT MUST ATTENTION** name at most 3 DRIVING attributes and explicitly record which attributes are being SACRIFICED to buy them — a design claiming to maximize everything has decided nothing — why: unnamed sacrifices resurface as production surprises nobody agreed to.

| Field                   | Record                                                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Driving attributes (≤3) | ... + the quantified target for each (from the table above)                                                               |
| Explicitly sacrificed   | ... + the acceptable degradation, e.g. "search may lag ≤5 s"                                                              |
| Trade-off purchased     | Use the "buy this / pay with this" table in `.claude/docs/architecture-knowledge.md` §19 — state cost, never just benefit |

**Availability arithmetic (compute it, never assert it):** dependencies in a request path MULTIPLY — five 99.9% deps ⇒ ~99.5% (≈43 h/yr down). Redundancy in PARALLEL adds 9s **only when failure modes are genuinely independent**; shared config, control plane, DNS and the deploy pipeline are the usual hidden serial term. Ladder: 99% = 3.65 d/yr · 99.9% = 8.77 h · 99.95% = 4.38 h · 99.99% = 52.6 min · 99.999% = 5.26 min.

**Cost is a quality attribute, not a later phase.** Model unit economics now — an architecture whose UNIT cost RISES with scale fails eventually regardless of elegance. Biggest web-system drivers: egress + cross-AZ/cross-region traffic · idle over-provisioned compute · unbounded log/metric/trace retention and cardinality · per-request managed-service pricing at steady high volume · always-on non-prod. Serverless vs always-on **inverts with utilization** — model it, don't assume it.

**MANDATORY IMPORTANT MUST ATTENTION** validate derived requirements with user by asking the user directly before proceeding.

### 2-2: Pre-Decision Interrogation (MANDATORY for every one-way door from 2-0)

Answer the 15-question pre-decision script in `.claude/docs/architecture-knowledge.md` §20.1 for each one-way door BEFORE researching options. Record answers in the Step 11 report; any question answered "unknown" becomes an `Unresolved question`, never a silent gap.

The five that most often expose a wrong decision — never skip these:

| #   | Question                                                                                    | Why it changes the answer                                                                                  |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 3   | Is this a one-way or two-way door, and what makes it so?                                    | Sets how much rigour the decision earns; misclassification is this skill's most expensive failure          |
| 5-6 | Expected load NOW and at 10× — and **what breaks FIRST**?                                   | Names the actual bottleneck instead of the imagined one; 10×, never 1000×                                  |
| 8   | What is the consistency requirement PER read path, and what staleness is acceptable?        | Consistency is decided per path, never once globally                                                       |
| 14  | What existing thing could be used instead of building?                                      | Generic subdomains (auth, billing, notifications, search) are the top source of wasted architecture budget |
| 15  | **What would have to be TRUE for this to be the WRONG choice — and how would I detect it?** | Becomes the ADR's measurable revisit trigger                                                               |

**MANDATORY IMPORTANT MUST ATTENTION** a one-way door with no answer to question 15 is a BELIEF, not a decision — NEVER emit its ADR without a named falsifier and a measurable revisit trigger. — why: with no trigger nobody ever revisits it, so the decision outlives the constraints that justified it.

### Architecture & Scalability Scorecard Inputs (feeds `architecture-scalability-review`)

Record these decisions now so the init-time `architecture-scalability-review` scorecard (`mode=init`) can grade them later against **enforceable mechanisms, not intent**. Each row is a **design decision**, not a finding — capture the choice AND where it is enforced. Leave any unknown as explicit `Unresolved question` (Step 11), never a silent omission. — why: a scorecard can only grade decisions actually recorded with an enforcement home.

| Scorecard input                 | Design prompt (decide + record where enforced)                                                                                                                                                                                                                                                                                          | Enforcement handoff                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Build & CI scalability          | As the codebase grows, how are build/CI times kept bounded? Decide **incremental** builds, changed/**affected**-only detection, local + **remote cache** strategy, and CI test/build parallelism. Name the build-system fit (single-package vs monorepo tool such as Nx / Turborepo / Bazel) **as an evaluated option**, not a default. | Step 7 (CI/CD provider parallelism + caching)          |
| Horizontal scaling budgets      | From the Step 2 scale targets, decide **stateless** app nodes, load balancing, caching tiers, async/queue + back-pressure, DB scale plan (sharding/partitioning/replication), connection pooling, rate limits, and a **SPOF** scan of every single-instance dependency.                                                                 | ADR + Step 8 observability SLOs                        |
| Strategic DRY                   | Decide the **strategic DRY** / shared-knowledge strategy: monorepo, shared domain lib, custom platform / util lib — AND explicitly when NOT to share. Keep domain concepts OUT of generic/shared/infra layers (a shared layer coupled to one consumer's domain is no longer reusable).                                                  | Step 9 arch-rules + `scaffold` foundation              |
| Dependency-boundary enforcement | Decide explicit dependency directions between modules/contexts and the mechanism that enforces them (no circular deps).                                                                                                                                                                                                                 | Step 9 "Arch rules / fitness" handoff → `linter-setup` |

These inputs are graded at init/audit by `architecture-scalability-review`; per-change regressions are caught by `architecture-review`. Do NOT turn this step into an auditor — record decisions here and route grading to those skills.

---

## Step 3: Backend Architecture

### 3A: Architecture Styles

WebSearch top 3 backend architecture styles. Candidates:

| Style                       | Best For                                 | Research Focus                            |
| --------------------------- | ---------------------------------------- | ----------------------------------------- |
| **Clean Architecture**      | Complex domains, long-lived projects     | Dependency rule, testability, flexibility |
| **Hexagonal (Ports+Adapt)** | Integration-heavy, multiple I/O adapters | Port contracts, adapter isolation         |
| **Vertical Slice**          | Feature-focused teams, rapid delivery    | Slice isolation, code locality            |
| **Modular Monolith**        | Starting simple, eventual decomposition  | Module boundaries, migration path         |
| **Microservices**           | Large teams, independent deployment      | Service boundaries, operational overhead  |
| **CQRS + Event Sourcing**   | Audit-heavy, complex queries             | Read/write separation, event store        |
| **Layered (N-Tier)**        | Simple CRUD, small teams                 | Layer responsibilities, coupling risk     |

Full 16-style matrix with per-style _buys / costs / choose-when / avoid-when_ → `.claude/docs/architecture-knowledge.md` §5.

#### Style selection procedure (MANDATORY order — never shortcut)

1. Take the ≤3 quantified driving attributes from Step 2-1.
2. **ELIMINATE** every style that cannot meet them (state which attribute eliminated it).
3. **DESIGN IT TWICE** — produce ≥2 MATERIALLY different surviving candidate designs (not two spellings of one idea) and write what each SACRIFICES. — why: committing to the first idea that occurred to you is the most common architecture failure and the one nobody records; a second real candidate is what makes the first one a choice.
4. Among survivors take the **SIMPLEST** — not the most capable.
5. Emit an ADR (Step 11) naming the rejected alternative AND the **measurable trigger** that would revisit the choice.

**MANDATORY IMPORTANT MUST ATTENTION** design-it-twice applies to EVERY one-way door from 2-0, not only the style choice — data model, tenancy model, consistency model per read path, sync-vs-async at a boundary. NEVER emit a one-way-door ADR whose "Alternatives considered" section was written to justify a decision already made. — why: a retrofitted alternative is advocacy, not evaluation, and it hides the sacrifice the reviewer needs to see.

Styles COMPOSE — modular monolith + event-driven integration + 2-3 extracted services is the most common good real answer. Recommending a single pure style is usually a sign step 2 was skipped.

**MANDATORY IMPORTANT MUST ATTENTION — modulith-first default.** Default to a **modular monolith with CI-ENFORCED module boundaries** (architecture tests, Step 9) and extract services ONLY against a named, measured trigger from the table below. **Microservices are a destination reached under pressure, NEVER a starting point** — the 2025-2026 industry correction is documented: many organizations re-consolidated after debugging complexity, ops overhead and network latency outweighed autonomy gains. — why: distribution bought speculatively pays every distributed cost immediately and collects the benefit never.

| Legitimate extraction trigger (record BEFORE building)           | NOT a trigger (reject these)                      |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| Independent scaling profile ≥10x divergent                       | "The codebase feels big"                          |
| Different compliance / data-residency boundary                   | "Microservices are best practice"                 |
| Different availability requirement                               | A resume, a conference talk, or framework support |
| A team boundary PROVABLY blocked by shared deploys               | One slow endpoint (fix the endpoint)              |
| Genuinely different runtime need (GPU, language, memory profile) | A new team was hired                              |
| Fault isolation for a KNOWN-unreliable dependency                | The domain has many entities                      |

**MUST ATTENTION** verify platform maturity before recommending microservices: CI/CD, IaC, distributed tracing, on-call, and a platform team. Microservices without them is the most reliable predictor of a failed migration — recommend the modulith and say so explicitly.

**MUST ATTENTION** draw boundaries around **capabilities/behaviors** (`Checkout`, `Fulfilment`, `Pricing`), NEVER around **nouns/data** (`UserService`, `ProductService`). Entity-per-service guarantees every real use case must synchronously traverse many services — a distributed monolith produced by design. The unit of extraction is the **bounded context**, not the entity.

### 3B: Backend Design Patterns

Evaluate applicability per layer:

| Pattern             | Layer          | When to Apply                                     |
| ------------------- | -------------- | ------------------------------------------------- |
| **Repository**      | Data Access    | Abstract data store, enable testing               |
| **CQRS**            | Application    | Separate read/write models, complex queries       |
| **Mediator**        | Application    | Decouple handlers from controllers                |
| **Strategy**        | Domain/App     | Multiple interchangeable algorithms               |
| **Observer/Events** | Domain         | Cross-aggregate side effects                      |
| **Factory**         | Domain         | Complex object creation with invariants           |
| **Decorator**       | Cross-cutting  | Add behavior without modifying (logging, caching) |
| **Adapter**         | Infrastructure | Isolate external dependencies                     |
| **Specification**   | Domain         | Composable business rules, complex filtering      |
| **Unit of Work**    | Data Access    | Transaction management across repositories        |
| **Saga/Orchestr.**  | Cross-service  | Distributed transactions, compensating actions    |
| **Outbox**          | Messaging      | Reliable event publishing with DB transactions    |
| **Circuit Breaker** | Infrastructure | External service resilience                       |

Per recommended pattern document: **Apply to**, **Why**, **Example**, **Risk if skipped**.

**MUST ATTENTION** patterns are a VOCABULARY for a solution you already need, never a menu to shop from — applying patterns to demonstrate knowledge produces the _gas factory_ anti-pattern. The right number of patterns is the SMALLEST number that removes a DEMONSTRATED pain. Watch the chronically over-applied ones: Singleton (global mutable state → prefer one DI registration), Service Locator (hides dependencies from compiler and tests), CQRS on simple CRUD, event sourcing used as an audit log (an audit table is the right answer).

---

## Step 3C: Data & Consistency Architecture

> **Skip if:** the change touches no persistence, no consistency boundary, and no tenant-scoped data. Otherwise MANDATORY.

**Data outlives every service, framework and team — this is the MOST irreversible step in this skill.** Treat every row below as a one-way door (Step 2-0) until proven otherwise: each needs an ADR and a Step-12 validation question.

| Decision                                                      | Decide + record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Failure if skipped                                                                                                                                                                                             |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Store per access pattern**                                  | Pick each store from the ACCESS PATTERN, not familiarity: relational (relations/transactions/ad-hoc queries — **the correct default**) · document (aggregate-shaped reads) · key-value (lookup/session) · wide-column (huge writes, known queries) · graph (traversal) · time-series (append + rollups) · search (relevance/facets) · vector (semantic/ANN) · columnar (aggregation scans) · object storage (blobs). Each ADDITIONAL store needs its own justification — polyglot persistence costs per store (ops, backup, monitoring, expertise, and transactional impossibility across stores).                                                                                                                                                                                                                                                                                                                     | Golden-hammer: the wrong store makes the dominant query permanently expensive                                                                                                                                  |
| **One writer per dataset**                                    | Name the single owning module/service for every dataset. Many READERS are fine — via API, replica, or published event stream.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Shared write access is shared coupling with NO contract; data diverges and nobody owns correctness                                                                                                             |
| **NEVER integrate through the database**                      | External consumers get an API, an event stream, or at most a published view/replica — never your tables.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Fastest known path to a distributed monolith and to "we can never change this table"                                                                                                                           |
| **Consistency model per read path**                           | Per read path choose strong / causal / **session guarantees** (read-your-writes, monotonic reads) / eventual — and write the **STALENESS BUDGET** ("search index may lag ≤5 s") as a monitored SLI (Step 8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Unbounded, unmeasured lag IS the defect. Most user-visible "consistency bugs" are missing read-your-writes from a lagging replica, NOT missing linearizability                                                 |
| **Replication + failover semantics**                          | Name topology (single-primary/read replicas, quorum, or multi-primary), write acknowledgement, sync vs async replicas, failover authority, conflict policy, and RPO/RTO. Route lag-sensitive/read-after-write reads to the primary or use a version/sticky-read guarantee.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Replicas improve read capacity/availability, not write capacity; async failover can lose acknowledged writes, sync raises latency/lowers availability, multi-primary creates conflicts                         |
| **Isolation level + check-then-act protection**               | NAME the isolation level per critical write path — "we use transactions" says nothing about correctness. Read Committed permits **write skew** AND **lost update**; snapshot isolation permits **write skew** and — on any engine whose `REPEATABLE READ` is not true first-committer-wins SI — **lost update** too, so name the ENGINE as well as the level and protect every check-then-act invariant one of FOUR deliberate ways: a DB **constraint** (unique/check/exclusion — cheapest and most durable) · `SELECT … FOR UPDATE` on the rows read · **Serializable** + an app-side retry loop for serialization failures · a single atomic conditional write (`UPDATE … WHERE version = n`). An invariant spanning rows that DO NOT YET EXIST (no double-booking, no overlapping shift, at most N per tenant) cannot be protected by row locks. Full anomaly table → `.claude/docs/architecture-knowledge.md` §8. | Two concurrent transactions both pass their check and both write — the classic on-call corruption bug that passes every single-user test                                                                       |
| **Storage engine + index strategy**                           | Choose B-Tree (mixed read/write, ad-hoc queries, strong secondary indexes) vs LSM (write-heavy ingest with known query shapes — pay with compaction stalls in p99 and space amplification). Record the **WAL/fsync policy** as the durability↔latency knob the RPO depends on. Index rules: composite indexes obey the **leftmost-prefix** rule (`(a,b,c)` never serves `b` alone) · covering indexes remove the row fetch · every index slows writes, so index-per-query-shape has a ceiling · size the connection pool by Little's Law.                                                                                                                                                                                                                                                                                                                                                                              | An unpooled service DOSes its own database; a wrong engine makes the dominant workload permanently expensive; `fsync` settings chosen by default silently violate the stated RPO                               |
| **Storage substrate**                                         | Block storage for database/filesystem volumes needing low-latency random I/O · object storage for blobs/media/backups/log archives and cheap durable scale · shared file storage only when filesystem semantics are required. Record lifecycle tiering, access frequency, object size, durability, egress and mutation pattern.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | "User data uses block storage" confuses application model with physical substrate; large immutable blobs in the transactional database inflate backup, replication and query costs                             |
| **Distributed lock / leader election — fencing**              | If any flow takes a distributed lock or elects a leader, name the **fencing token** (monotonic, rejected by the storage layer when stale), the lease duration, and the behaviour when the lease expires mid-operation. Consensus (Raft/Paxos) needs a MAJORITY — a 2-node or even-sized cluster buys nothing — and stays OFF the hot path. **NEVER order distributed events, compute expiry, or resolve conflicts by wall clock** — use versions/sequences, logical/vector clocks, or HLC.                                                                                                                                                                                                                                                                                                                                                                                                                             | An unfenced lock fails exactly once — under a GC/VM pause, at peak, writing corrupted state — and looks correct in every test (split brain)                                                                    |
| **Transaction / aggregate boundary**                          | One aggregate per transaction; reference other aggregates **by ID only**; keep aggregates SMALL; cross-aggregate consistency is EVENTUAL via domain events. Money movement, uniqueness, inventory decrement and auth state stay **strong inside ONE aggregate/DB transaction**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Large aggregates cause lock contention; cross-aggregate transactions force 2PC or silent divergence                                                                                                            |
| **Cross-boundary transaction mechanism**                      | Local ACID (ALWAYS prefer) → saga + compensation → reservation/TCC. **AVOID 2PC/XA** in web-scale distributed systems. Compensations are NEW BUSINESS FACTS (`RefundIssued`), not technical rollbacks — design them as product decisions, and design for the intermediate state being USER-VISIBLE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | "We'll use a distributed transaction" is a non-answer that blocks on coordinator failure                                                                                                                       |
| **Tenancy model**                                             | Shared-schema `tenant_id` (**default for most B2B SaaS**) · schema-per-tenant · DB-per-tenant (regulated / residency / white-label / large enterprise) · hybrid tiering (pooled small + siloed whales — the mature scale-up shape).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Retrofitting tenancy is a full data migration                                                                                                                                                                  |
| **Tenant isolation ENFORCEMENT**                              | In a pooled model, name the LOWEST-layer mechanism: database **row-level security**, an ORM global filter/interceptor, or a mandatory repository base injecting tenant from the **authenticated principal** — plus a test asserting cross-tenant reads return zero rows (Step 6 + Step 9 fitness rule). **NEVER take `tenant_id` from a client-supplied field.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | One missing `WHERE tenant_id = ?` is a cross-tenant breach that passes every functional test                                                                                                                   |
| **Keys & partitioning**                                       | Prefer **time-ordered IDs (UUIDv7/ULID/Snowflake)** — sequential ints leak volume and are enumerable; UUIDv4 destroys index locality on write. NEVER expose an internal sequential PK publicly. Partition key must be uniformly distributed AND query-aligned; plan resharding (consistent hashing / virtual buckets) BEFORE needing it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Hot partitions (time-based ⇒ hot latest; tenant-based ⇒ whale tenants) and write amplification                                                                                                                 |
| **OLTP / OLAP separation**                                    | Analytics go to a replica, CDC, or warehouse — never the transactional primary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Reports saturating production is a top incident cause                                                                                                                                                          |
| **Denormalization / caching as a PURCHASE**                   | For each copy/cache, name authoritative source · policy (cache-aside/read-through/write-through/write-behind/refresh-ahead) · invalidation (TTL+jitter/event/versioned key/purge) · consistency window · max size/eviction. Design stampede/hot-key/cold-start protection (single-flight, early refresh, warm-up, LB slow-start). **NEVER cache authorization decisions or tenant data under a key omitting identity/tenant/permission.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Stale data, stampedes and hot keys move rather than remove load; cache-key omission leaks tenants; an unbounded cache OOMs; a system correct only while cache is warm has made an undocumented source of truth |
| **Migration strategy**                                        | **Expand–contract** (add nullable → dual write → backfill → switch reads → stop writing old → drop), forward-only, idempotent, non-blocking on large tables, deployable independently of the code using it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | A breaking migration in one deploy breaks old pods during a rolling deploy and makes rollback impossible                                                                                                       |
| **Lifecycle: classification, retention, residency, deletion** | Classify (PII/PHI/PCI/public), set retention + archival tiering + deletion (GDPR/CCPA erasure) + residency NOW.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Retrofitting deletion into an event-sourced or heavily-denormalized system is brutally expensive — and erasure conflicts with immutable event stores by design                                                 |
| **RPO / RTO per dataset**                                     | Set them PER DATASET (they drive topology and cost) and schedule a **restore drill**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | "We have backups" is a hypothesis; an undrilled DR plan has an RTO of "unknown"                                                                                                                                |

**MANDATORY IMPORTANT MUST ATTENTION** emit an ADR for the store choice, the tenancy model, the consistency model per read path, and the key strategy — these four are the least reversible decisions in the entire design — why: each one reversed later is a full data migration with downtime, not a refactor.

---

## Step 3D: Integration & API Architecture

> **Skip if:** no boundary is crossed — no external consumer, no second service, no message bus, no third-party integration. Otherwise MANDATORY.

| Decision                                             | Decide + record                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Failure if skipped                                                                                                                                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sync vs async per boundary**                       | **Synchronous** only when the caller genuinely cannot proceed without the answer (user-awaited QUERIES). **Asynchronous** for EFFECTS (notification, fan-out, work completable later). A sync chain deeper than 2-3 hops is an availability + latency defect — flatten, cache, or make it an event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Sync chains MULTIPLY availability (five 99.9% deps ⇒ 99.5%) and SUM latency                                                                                                                                    |
| **Async acceptance contract**                        | When work moves behind a queue, define the public state machine: `accepted` (`202`/job ID) → pending/running/succeeded/failed/cancelled; status lookup or callback; retry visibility; terminal failure ownership. User feedback MUST say accepted, not completed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Fast acknowledgement without completion semantics creates false success, invisible backlog, and unrecoverable business ambiguity                                                                               |
| **API style per consumer**                           | REST/HTTP+JSON (public, broad compat, HTTP caching) · GraphQL (client-driven queries, aggregation — needs depth/complexity limits + persisted queries + dataloader or it becomes a DoS and N+1 surface) · gRPC (low-latency internal, streaming, codegen) · webhooks (push to third parties — needs retries + signature verification) · WebSocket/SSE (real-time; SSE when one-way suffices).                                                                                                                                                                                                                                                                                                                                                                                            | Wrong style makes the dominant interaction chatty or uncacheable                                                                                                                                               |
| **Versioning + deprecation policy**                  | Version from **day one** (URL path versioning is the pragmatic default); version the CONTRACT, not every field; support ≥N-1 with a published deprecation policy + per-version usage telemetry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Versionless contracts mean any producer change breaks consumers — and you cannot tell who                                                                                                                      |
| **Contract-first + contract tests in CI**            | OpenAPI / protobuf / AsyncAPI as the source of truth; consumer-driven contract tests are what make independent deploys SAFE (Step 6 + Step 9 gate). Tolerant reader — unknown fields ignored, never fatal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Without contract tests, "independently deployable" is an aspiration, not a property                                                                                                                            |
| **Write-then-publish ⇒ transactional outbox or CDC** | **MANDATORY** whenever a flow writes the DB _and_ publishes. **NEVER two independent operations.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **Dual-write:** DB commits + publish fails ⇒ silent divergence; publish succeeds + DB rolls back ⇒ phantom downstream data                                                                                     |
| **Idempotency everywhere**                           | Exactly-once DELIVERY is impossible (Two Generals/FLP) ⇒ **effectively-once via idempotency**. Idempotency keys (with the stored RESULT + TTL) on all unsafe mutations; consumers dedup on message ID; prefer naturally idempotent operations (`SET status='paid'` over `balance += x`); optimistic concurrency via version/ETag. Assume **duplicate, out-of-order and delayed** arrival — carry a version/sequence and discard backward transitions.                                                                                                                                                                                                                                                                                                                                    | Duplicate side effects: double charge, double email, double shipment                                                                                                                                           |
| **Message taxonomy — never conflate**                | **Command** ("do this", one handler, may be rejected) vs **Event/fact** ("this happened", 0..N subscribers, cannot be rejected) vs query vs document message. An "event" with exactly one permitted consumer that MUST handle it, whose failure means the flow failed, is a **COMMAND in an event costume** — name it a command and own the coupling honestly.                                                                                                                                                                                                                                                                                                                                                                                                                           | You pay async debugging difficulty AND keep sync coupling                                                                                                                                                      |
| **Event granularity per stream**                     | Deliberate choice: thin/notification (ID only — restores temporal coupling + read load) vs fat/state-transfer (self-contained, leaks more model, bigger payloads) vs hybrid (thin event + queryable snapshot endpoint). **NEVER leak raw DB rows as events** — CDC without a mapping layer publishes your internal schema as a frozen public contract (Hyrum).                                                                                                                                                                                                                                                                                                                                                                                                                           | Consumers become coupled to columns you can then never rename                                                                                                                                                  |
| **Schema evolution**                                 | Versioned, registered, backward-compatible event schemas with a CI compatibility check. In event sourcing, event schemas are public contracts **forever**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | One producer change silently breaks every consumer                                                                                                                                                             |
| **Broker semantics — ordering, replay, durability**  | Decide the three properties BEFORE naming a vendor: required **ordering scope** (global / per-entity-key / none) · required **replay window** (queue = consume-and-gone; log = offset-based replay by many consumer groups) · **durability acknowledgement** (replication factor + min-in-sync-replicas + producer acks — `acks=1` accepts data loss on leader failure, and `acks=all` waits for the replicas CURRENTLY in the ISR — so `min.insync=1` still waits for a healthy 3-replica ISR but silently degrades to `acks=1` durability once the ISR shrinks to the leader alone). Log partition count is hard to raise without rekeying, and ordering on a key costs parallelism on that key. Health SLI: queue depth + oldest-message age, or **consumer lag** for a log.          | Vendor picked first ⇒ the one property you actually needed (ordering, replay, or durability) turns out to be the one that is expensive to change                                                               |
| **Load-balancing + rate-limiting algorithm**         | LB: **least-outstanding-requests is the best general default** (routes away from slow hosts automatically) · power-of-two-choices · consistent hashing only for cache/shard affinity (accept hot keys) · **slow-start for new instances** so a cold cache/JIT node is not handed full traffic. Rate limiting: **token bucket** for burst-tolerant public APIs · sliding-window counter for accuracy · **concurrency/in-flight limiter when per-request cost is unknown or highly variable** (it bounds the resource, not the count). Limit BY the protected dimension (tenant/principal/endpoint), never only by IP; always return `Retry-After`. Distributed enforcement needs a shared counter (new hot-path dependency) or per-node quota division (accept `N×` slack) — state which. | Round-robin ignores request cost and feeds a dying host; fixed-window limiters permit a 2× burst across the boundary; sticky sessions become the reason state was never externalized                           |
| **Queue hygiene**                                    | **Bounded** queues + DLQ + a redrive procedure + DLQ-depth alerting; capped exponential backoff **with jitter**; poison-message handling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | An unbounded queue converts a throughput problem into unbounded latency then OOM; a DLQ nobody watches is data loss with extra steps; unjittered retries synchronize into a thundering herd                    |
| **Resilience config on EVERY outbound call**         | Timeout (derived from the caller's remaining budget) on every network call, lock and query · capped jittered retries for idempotent ops ONLY · retry BUDGET as a % of traffic · circuit breaker with a defined fallback · bulkheads per dependency/tenant · load shedding at the edge by priority.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | **A missing timeout is the single most common resilience defect**; retry amplification turns a blip into an outage. The dangerous failure is SLOW, not down — it exhausts your resources while looking healthy |
| **Graceful degradation per feature**                 | Pre-decide the degraded mode per feature (stale data / hide module / read-only) — a PRODUCT decision, made now, not during the incident.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Undesigned degradation becomes a total outage                                                                                                                                                                  |
| **Trust boundary rules**                             | Validate at the boundary (allow-list); **NEVER trust client-supplied authorization data** — IDs, roles, prices, tenant IDs come from the authenticated principal. Machine-readable error contract (stable `code`, `message`, `details`, `traceId`; RFC 9457 problem+json is a good default) — NEVER leak stack traces. Propagate a correlation/trace ID through EVERY hop including async.                                                                                                                                                                                                                                                                                                                                                                                               | Broken access control is the #1 real-world risk; untraceable async hops make incidents unexplainable                                                                                                           |
| **Edge component responsibilities**                  | Gateway = TLS, routing, authn, rate limiting, quotas, versioning — **NEVER business logic**. CDN/edge = static + deliberately cacheable dynamic content; record push/pull origin strategy, `Cache-Control`, `Vary`/cache-key dimensions, TTL and purge/versioning. BFF only when a client genuinely needs owned aggregation; skip with one client or when GraphQL fills the role.                                                                                                                                                                                                                                                                                                                                                                                                        | Smart gateways duplicate domain rules; careless edge caching serves stale or personalized data to the wrong audience; missing cache policy shifts global latency/load back to origin                           |

**MANDATORY IMPORTANT MUST ATTENTION** every sync-vs-async choice at a boundary and every public API/event contract is a one-way door — ADR + Step-12 validation, no exceptions — why: consumers you cannot see will depend on both, and Hyrum's Law makes every observable behavior a contract you must then keep.

---

## Step 4: Frontend Architecture

### 4A: Architecture Styles

WebSearch top 3 frontend architecture styles. Candidates:

| Style                       | Best For                                                   | Research Focus                                  |
| --------------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| **MVVM**                    | Data-binding heavy, forms-over-data apps                   | ViewModel responsibility, two-way binding       |
| **MVC**                     | Server-rendered, traditional web apps                      | Controller routing, view separation             |
| **Component Architecture**  | Configured SPA/component framework                         | Component isolation, props/events, reuse        |
| **Reactive Store (Redux)**  | Complex state, multi-component sync                        | Single source of truth, immutable state         |
| **Signal-based Reactivity** | Fine-grained reactivity in frameworks that support signals | Granular updates without broad change detection |
| **Micro Frontends**         | Multiple teams, independent deployment                     | Module federation, routing, shared state        |
| **Feature-based Modules**   | Large monolith SPA, lazy loading                           | Feature boundaries, route-level splitting       |
| **Server Components (RSC)** | SEO, initial load performance                              | Server/client boundary, streaming               |

### 4B: Frontend Design Patterns

| Pattern                      | Layer       | When to Apply                                    |
| ---------------------------- | ----------- | ------------------------------------------------ |
| **Container/Presentational** | Component   | Separate logic from UI rendering                 |
| **Reactive Store**           | State       | Centralized state, cross-component communication |
| **Facade Service**           | Service     | Simplify complex API interactions                |
| **Adapter/Mapper**           | Data        | Transform API response to view model             |
| **Observer (RxJS)**          | Async       | Event streams, real-time data, debounce/throttle |
| **Strategy (renderers)**     | UI          | Conditional rendering strategies per entity type |
| **Composite (components)**   | UI          | Tree structures, recursive components            |
| **Command (undo/redo)**      | UX          | Form wizards, canvas editors, undoable actions   |
| **Lazy Loading**             | Performance | Route/module-level code splitting                |
| **Virtual Scrolling**        | Performance | Large lists, infinite scroll                     |

---

## Step 4B: UI System Architecture

> **Skip if:** Backend-only project, no frontend component.

Research, recommend project design system architecture. Use ask the user directly for each decision.

### 4B-1: Styling Approach

WebSearch top 3 styling approaches for confirmed frontend framework:

| Approach                         | Best For                                 | Research Focus                     |
| -------------------------------- | ---------------------------------------- | ---------------------------------- |
| **Utility-first (Tailwind CSS)** | Rapid prototyping, design enforcement    | JIT, custom config, design tokens  |
| **CSS Modules / Scoped CSS**     | Component isolation, no global conflicts | Naming, composition patterns       |
| **SCSS/SASS with BEM**           | Complex theming, token variables         | BEM methodology, mixin libraries   |
| **CSS-in-JS**                    | Dynamic styling, theme providers         | Runtime perf, SSR support          |
| **CSS Custom Properties**        | Native theming, framework-agnostic       | Browser support, fallback strategy |

### 4B-2: Design Token Strategy

| Decision         | Options                                                   | Default               |
| ---------------- | --------------------------------------------------------- | --------------------- |
| Token format     | CSS custom properties / JSON / SCSS variables             | CSS custom properties |
| Token categories | Color, spacing, typography, breakpoints, shadows, z-index | All                   |
| Token naming     | Semantic (`--color-primary`) vs Functional (`--btn-bg`)   | Semantic first        |
| Theming          | Light/dark toggle / Multi-brand / Single theme            | Single + dark mode    |

### 4B-3: Component Library Strategy

| Decision        | Options                                                                     | Default                    |
| --------------- | --------------------------------------------------------------------------- | -------------------------- |
| Library         | Build custom / Headless (Radix, Headless UI) / Full kit (MUI, Ant, PrimeNG) | Based on team and timeline |
| Component tiers | Common → Domain-Shared → Page (per ui-wireframe-protocol)                   | Standard 3-tier            |
| Documentation   | Storybook / Docusaurus / In-code only                                       | Based on team size         |

### 4B-4: Responsive Strategy

| Decision    | Options                                 | Default            |
| ----------- | --------------------------------------- | ------------------ |
| Approach    | Mobile-first / Desktop-first / Adaptive | Mobile-first       |
| Breakpoints | 320/768/1024/1280 / Custom              | Standard           |
| Grid system | CSS Grid / Flexbox / Framework grid     | CSS Grid + Flexbox |

**MANDATORY IMPORTANT MUST ATTENTION** validate all UI system decisions with user by asking the user directly before proceeding to Step 5.

---

## Step 5: Library Ecosystem Research

Per concern below, WebSearch top 3 library options for confirmed tech stack. Evaluate: maturity, community, bundle size, maintenance activity, license, learning curve.

> **MUST ATTENTION** never recommend a library from familiarity alone — every pick needs cited evidence (stars, release date, downloads, CVE scan). — why: familiarity bias ships unmaintained or insecure dependencies.

### Library Concerns Checklist

| Concern                     | What to Research                                            | Evaluation Criteria                            |
| --------------------------- | ----------------------------------------------------------- | ---------------------------------------------- |
| **Validation**              | Input validation, schema validation, form validation        | Type safety, composability, error messages     |
| **HTTP Client / API Layer** | REST client, GraphQL client, API code generation            | Interceptors, retry, caching, type generation  |
| **State Management**        | Global store, local state, server state caching             | DevTools, SSR support, bundle size             |
| **Utilities / Helpers**     | Date/time, collections, deep clone, string manipulation     | Tree-shakability, size, native alternatives    |
| **Caching**                 | In-memory cache, distributed cache, HTTP cache, query cache | TTL, invalidation, persistence                 |
| **Logging**                 | Structured logging, log levels, log aggregation             | Structured output, transports, performance     |
| **Error Handling**          | Global error boundary, error tracking, crash reporting      | Source maps, breadcrumbs, alerting integration |
| **Authentication / AuthZ**  | JWT, OAuth, RBAC/ABAC, session management                   | Standards compliance, SSO, token refresh       |
| **File Upload / Storage**   | Multipart upload, cloud storage SDK, image processing       | Streaming, resumable, size limits              |
| **Real-time**               | WebSocket, SSE, SignalR, Socket.io                          | Reconnection, scaling, protocol support        |
| **Internationalization**    | i18n, l10n, pluralization, date/number formatting           | ICU support, lazy loading, extraction tools    |
| **PDF / Export**            | PDF generation, Excel export, CSV                           | Server-side vs client-side, template support   |

### Per-Library Evaluation Template

```markdown
### {Concern}: Top 3 Options

| Criteria         | Option A          | Option B | Option C |
| ---------------- | ----------------- | -------- | -------- |
| GitHub Stars     | ...               | ...      | ...      |
| Last Release     | ...               | ...      | ...      |
| Bundle Size      | ...               | ...      | ...      |
| Weekly Downloads | ...               | ...      | ...      |
| License          | ...               | ...      | ...      |
| Maintenance      | Active/Slow/Stale | ...      | ...      |
| Learning Curve   | Low/Med/High      | ...      | ...      |

**Recommendation:** {Option} — Confidence: {X}%
```

---

## Step 6: Testing Architecture

Research best testing tools, strategy for confirmed tech stack:

| Testing Layer           | What to Research                                  | Top Candidates to Compare                    |
| ----------------------- | ------------------------------------------------- | -------------------------------------------- |
| **Unit Testing**        | Test runner, assertion library, mocking framework | Repository's configured unit-test stack      |
| **Integration Testing** | API testing, DB testing, service testing          | Supertest, TestContainers, WebAppFactory     |
| **E2E Testing**         | Browser automation, BDD, visual regression        | Playwright/Cypress/Selenium, SpecFlow        |
| **Performance Testing** | Load testing, stress testing, benchmarking        | k6/Artillery/JMeter/NBomber, BenchmarkDotNet |
| **Contract Testing**    | API contract validation between services          | Pact, Dredd, Spectral                        |
| **Mutation Testing**    | Test quality validation                           | Stryker, PITest                              |
| **Coverage**            | Code coverage collection, reporting, enforcement  | Istanbul/Coverlet, SonarQube                 |
| **Test Data**           | Factories, fixtures, seeders, fakers              | Bogus/AutoFixture/Faker.js                   |

### Test Strategy Template

```markdown
### Test Pyramid

- **Unit (70%):** {framework} — {what to test}
- **Integration (20%):** {framework} — {what to test}
- **E2E (10%):** {framework} — {what to test}

### Test-Strength Targets

- Line coverage (diagnostic only — NEVER fail the build on a coverage %): Unit: {X}% | Integration: {X}% | E2E: critical paths only
- Gate: mutation score ({tool}) in CI pipeline — fail build on surviving mutants / mutation-score regression, not on a line-coverage %
```

---

## Step 7: CI/CD & Deployment

Research deployment architecture, CI/CD tooling:

| Concern                 | What to Research                                     | Top Candidates to Compare             |
| ----------------------- | ---------------------------------------------------- | ------------------------------------- |
| **CI/CD Provider**      | Pipeline orchestration, parallelism, caching         | Repository's configured CI/CD tooling |
| **Containerization**    | Container runtime, image building, registry          | Docker/Podman, BuildKit, ACR/ECR/GHCR |
| **Orchestration**       | Container orchestration, service mesh, scaling       | Kubernetes/Docker Compose/ECS/Nomad   |
| **IaC (Infra as Code)** | Infrastructure provisioning, drift detection         | Terraform/Pulumi/Bicep/CDK            |
| **Artifact Management** | Package registry, versioning, vulnerability scanning | NuGet/npm/Artifactory/GitHub Packages |
| **Feature Flags**       | Progressive rollout, A/B testing, kill switches      | LaunchDarkly/Unleash/Flagsmith        |
| **Secret Management**   | Vault, key rotation, environment variables           | Azure KeyVault/HashiCorp Vault/SOPS   |
| **Database Migration**  | Schema versioning, rollback, seed data               | EF Migrations/Flyway/Liquibase/dbmate |

### Deployment Strategy Comparison

| Strategy          | Risk | Downtime | Complexity | Best For                 |
| ----------------- | ---- | -------- | ---------- | ------------------------ |
| **Blue-Green**    | Low  | Zero     | Medium     | Critical services        |
| **Canary**        | Low  | Zero     | High       | Gradual rollout          |
| **Rolling**       | Med  | Zero     | Low        | Stateless services       |
| **Recreate**      | High | Yes      | Low        | Dev/staging environments |
| **Feature Flags** | Low  | Zero     | Medium     | Feature-level control    |

### Release-safety rules (decide + record — these bind Step 3C/3D contracts to the pipeline)

| Rule                                                | Requirement                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decouple deploy from release**                    | Flags / canary with SLI gates + auto-rollback. A flag needs an EXPIRY date or it becomes permanent branching complexity                                                                                                                                                                      |
| **Backward AND forward compatible for one version** | **MANDATORY** — a rolling deploy runs both versions SIMULTANEOUSLY. Applies to APIs, event schemas AND database schemas alike                                                                                                                                                                |
| **Expand–contract migrations**                      | Add nullable → dual write → backfill → switch reads → stop writing old → drop. Forward-only, idempotent, non-blocking, deployed INDEPENDENTLY of the code using it. **NEVER a breaking schema change in one deploy**                                                                         |
| **One artifact, external config**                   | Build once, promote the same artifact across environments (12-factor); config and secrets injected per environment                                                                                                                                                                           |
| **Graceful shutdown**                               | Stop accepting → drain in-flight with a deadline → flush buffers/metrics → close pools → exit. Without it EVERY deploy sheds requests                                                                                                                                                        |
| **Liveness ≠ readiness**                            | Readiness reflects dependencies; **liveness must NOT** (or one dependency blip restarts the whole fleet). Add startup probes for slow boots                                                                                                                                                  |
| **Legacy replacement**                              | Strangler fig (facade + capability-by-capability routing) or branch by abstraction, with **parallel run / shadow compare** for high-risk replacements. **NEVER a big-bang rewrite** of a system you don't fully understand — you inherit all undocumented behavior as invisible requirements |
| **DORA as delivery SLIs**                           | Deploy frequency, lead time, change-failure rate, MTTR — measure outcomes, never proxy metrics (Goodhart)                                                                                                                                                                                    |

**MANDATORY IMPORTANT MUST ATTENTION** if the design changes a database schema or a published contract, the migration plan is part of THIS design, not an implementation detail deferred to `plan-execute` — why: a schema change designed without expand–contract makes the whole release irreversible.

---

## Step 8: Observability & Monitoring

| Concern                                   | What to Research                                                            | Top Candidates to Compare           |
| ----------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| **Structured Logging**                    | JSON schema, levels, trace/request/tenant correlation, redaction            | Serilog/NLog/Winston/Pino           |
| **Log Aggregation**                       | Durable centralized search, retention, sampling                             | ELK/Loki/Datadog/Seq                |
| **Metrics backend**                       | Counters/gauges/histograms, scrape/push model, cardinality cost             | Prometheus/App Insights/Datadog     |
| **Telemetry instrumentation + transport** | Vendor-neutral logs/metrics/traces, context propagation across sync + async | OpenTelemetry                       |
| **Distributed tracing backend**           | Trace storage/query, sampling, service graph                                | Jaeger/Zipkin/Tempo/vendor APM      |
| **Visualization**                         | Service + user-journey dashboards across data sources                       | Grafana/vendor dashboards           |
| **Alerting**                              | SLO burn-rate/symptom alerts, actionable routing + runbooks                 | PagerDuty/OpsGenie/Grafana Alerting |
| **Health Checks**                         | Liveness, readiness, startup probes                                         | Stack-native health framework       |
| **Uptime Monitoring**                     | External availability and SLA tracking                                      | UptimeRobot/Pingdom/Checkly         |

**MANDATORY IMPORTANT MUST ATTENTION** keep the signal roles distinct: Prometheus-class systems store/query metrics; log backends store logs; trace backends store traces; Grafana-class tools visualize; OpenTelemetry instruments and transports telemetry. Define RED/USE/golden signals, SLIs→SLOs→error budgets, sampling for routine volume, full-fidelity critical-operation telemetry, bounded retention/cardinality, PII redaction, and alerts only when actionable. — why: collecting everything without signal ownership creates cost and noise, not observability.

### Observability Decision: 3 Pillars

```markdown
### Recommended Observability Stack

| Pillar   | Tool   | Why         |
| -------- | ------ | ----------- |
| Logs     | {tool} | {rationale} |
| Metrics  | {tool} | {rationale} |
| Traces   | {tool} | {rationale} |
| Alerting | {tool} | {rationale} |
```

---

## Step 9: Code Quality & Clean Code Enforcement

Research, recommend tooling for automated code quality:

| Concern                    | What to Research                                   | Top Candidates to Compare                     |
| -------------------------- | -------------------------------------------------- | --------------------------------------------- |
| **Linter (Backend)**       | Static analysis, code style, bug detection         | Roslyn Analyzers/SonarQube/StyleCop/ReSharper |
| **Linter (Frontend)**      | JS/TS linting, accessibility, complexity           | ESLint/Biome/oxlint                           |
| **Formatter**              | Auto-formatting, consistent style                  | Prettier/dotnet-format/EditorConfig           |
| **Code Analyzer**          | Security scanning, complexity metrics, duplication | SonarQube/CodeClimate/Codacy                  |
| **Pre-commit Hooks**       | Git hooks, staged file validation                  | Husky+lint-staged/pre-commit/Lefthook         |
| **Editor Config**          | Cross-IDE consistency                              | .editorconfig/IDE-specific configs            |
| **Architecture Rules**     | Layer dependency enforcement, naming conventions   | ArchUnit/NetArchTest/Dependency-Cruiser       |
| **API Design Standards**   | OpenAPI validation, naming, versioning             | Spectral/Redocly/swagger-lint                 |
| **Commit Conventions**     | Commit message format, changelog generation        | Commitlint/Conventional Commits               |
| **Code Review Automation** | Automated PR review, suggestion bots               | Danger.js/Reviewdog/CodeRabbit                |

### Enforcement Strategy

```markdown
### Code Quality Gates

| Gate        | Tool   | Trigger        | Fail Criteria                                                                         |
| ----------- | ------ | -------------- | ------------------------------------------------------------------------------------- |
| Pre-commit  | {tool} | git commit     | Lint errors, format                                                                   |
| PR Check    | {tool} | Pull request   | Surviving mutants / mutation-score regression, issues (line-coverage diagnostic only) |
| CI Pipeline | {tool} | Push to branch | Build fail, test fail                                                                 |
| Scheduled   | {tool} | Weekly/nightly | Security vulns, debt                                                                  |
```

### Scaffold Handoff (MANDATORY — consumed by `$scaffold`)

After code-quality research, produce this handoff table in the architecture report. `$scaffold` reads it to generate actual config files — without it, scaffold cannot auto-configure quality tooling. — why: the handoff table is the only contract scaffold has for tool choices.

```markdown
### Scaffold Handoff — Tool Choices

| Concern              | Chosen Tool                                         | Config File | Rationale                                                    |
| -------------------- | --------------------------------------------------- | ----------- | ------------------------------------------------------------ |
| Linter (FE)          | {tool}                                              | {filename}  | {why}                                                        |
| Linter (BE)          | {tool}                                              | {filename}  | {why}                                                        |
| Formatter            | {tool}                                              | {filename}  | {why}                                                        |
| Pre-commit           | {tool}                                              | {filename}  | {why}                                                        |
| Arch rules / fitness | {tool: ArchUnit / NetArchTest / Dependency-Cruiser} | {filename}  | {layer + dependency rules and Step-2 NFR budgets to enforce} |
| Error handling       | {pattern}                                           | {files}     | {why}                                                        |
| Loading state        | {pattern}                                           | {files}     | {why}                                                        |
| Docker               | {compose pattern}                                   | {files}     | {why}                                                        |
```

**Also include:** Error handling strategy (4-layer pattern), loading state approach (global vs per-component), Docker profile structure. Specific tool choices → `docs/project-reference/` or `project-config.json`. The **Arch rules / fitness** row MUST encode Step-2 quality-attribute budgets and layer/dependency rules as executable checks — `harness-setup` wires these into CI so recorded ADR decisions stay enforced, not merely documented. — why: documented-but-unenforced budgets erode silently as code changes.

**Example patterns to scaffold (golden-path reference set):** the handoff MUST also name the worked, copy-me examples `$scaffold` emits under an isolated, production-excluded `examples/` tree — one per applicable pattern, using the scaffolded base abstractions, so the post-scaffold `$architecture-review-full` has real code to grade. Target set (≥ 11 when a UI is present; skip absent layers and log why):

```markdown
### Scaffold Handoff — Golden-Path Examples

| Layer    | Example patterns (one worked `*.example.*` each)                                                                                       |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Backend  | command · query · command/query handler · entity-with-invariants · value-object · repository (concrete) · domain event + event handler |
| Frontend | form component · list component · state store · API service _(only if a UI stack is present)_                                          |
| Tests    | one integration test exercising an example command/query on BOTH the happy path AND a failure path                                     |
```

Every example carries the `GOLDEN-PATH EXAMPLE — copy into src/ …; NOT compiled into the production build` header, contains NO secrets/real endpoints (placeholders only: `EXAMPLE_API_KEY`, `example.invalid`), and compiles/lints under the CI (non-production) target. — why: empty base abstractions are unverified skeletons; one worked example per pattern turns each into demonstrated, reviewable, copy-me usage.

---

## Step 10: Dependency Risk Assessment

Per recommended library/package, evaluate maintenance, obsolescence risk:

### Package Health Scorecard

| Criteria                  | Score (1-5) | How to Verify                                    |
| ------------------------- | ----------- | ------------------------------------------------ |
| **Last Release Date**     | ...         | npm/NuGet page — stale if >12 months             |
| **Open Issues Ratio**     | ...         | GitHub issues open vs closed                     |
| **Maintainer Count**      | ...         | Bus factor — single maintainer = high risk       |
| **Breaking Change Freq.** | ...         | Changelog — frequent major versions = churn cost |
| **Dependency Depth**      | ...         | `npm ls --depth` / dependency graph depth        |
| **Known Vulnerabilities** | ...         | Snyk/npm audit/GitHub Dependabot                 |
| **License Compatibility** | ...         | SPDX identifier — check viral licenses (GPL)     |
| **Community Activity**    | ...         | Monthly commits, PR merge rate, Discord/forums   |
| **Migration Path**        | ...         | Can swap to alternative if abandoned?            |
| **Framework Alignment**   | ...         | Official recommendation by framework team?       |

### Risk Categories

| Risk Level   | Criteria                                          | Action                                 |
| ------------ | ------------------------------------------------- | -------------------------------------- |
| **Low**      | Active, >3 maintainers, recent release, no CVEs   | Use freely                             |
| **Medium**   | 1-2 maintainers, release <6mo, minor CVEs patched | Use with monitoring plan               |
| **High**     | Single maintainer, >12mo stale, open CVEs         | Find alternative or plan exit strategy |
| **Critical** | Abandoned, unpatched CVEs, deprecated             | DO NOT USE — find replacement          |

### Dependency Maintenance Strategy

```markdown
### Recommended Practices

1. **Automated scanning:** {tool} (Dependabot/Renovate/Snyk) — weekly PR for updates
2. **Lock file strategy:** Commit lock files, pin major versions, allow patch auto-update
3. **Audit schedule:** Monthly `npm audit` / `dotnet list package --vulnerable`
4. **Vendor policy:** Max {N} dependencies per concern, prefer well-maintained alternatives
5. **Exit strategy:** For each High-risk dependency, document migration path to alternative
```

---

## Step 11: Generate Report

Write report to `{plan-dir}/research/architecture-design.md` with sections:

1. Executive summary (recommended architecture in 8-10 lines)
2. Architecture requirements table + **workload profile and ordered scaling ladder** + **reversibility ranking (one-way vs two-way doors)** + **≤3 driving attributes and what is SACRIFICED** + cost unit economics (from Step 2)
3. Backend architecture — style comparison **with the elimination rationale per rejected style + the recorded extraction trigger** + recommended patterns (Step 3A/3B)
4. **Data & consistency architecture — stores/substrates per access pattern, dataset writer ownership, replication/failover semantics, consistency model + staleness budget per read path, cache contract, transaction/aggregate boundaries, tenancy model + isolation enforcement mechanism, keys/partitioning, migration strategy, retention/residency, RPO/RTO per dataset (Step 3C)**
5. **Integration & API architecture — sync-vs-async per boundary, API style per consumer, versioning + deprecation policy, contract tests, outbox/CDC, idempotency strategy, event granularity + schema evolution, queue hygiene, resilience config, degradation modes (Step 3D)**
6. Frontend architecture — style comparison + recommended patterns (Step 4)
7. Library ecosystem — per-concern recommendations with alternatives (Step 5)
8. Testing architecture — pyramid, tools, coverage targets, **contract tests + tenant-isolation test** (Step 6)
9. CI/CD & deployment — pipeline design, deployment strategy, **expand–contract migration plan + rolling-deploy compatibility** (Step 7)
10. Observability stack — logs/metrics/traces/profiles/change-events, instrumentation/transport vs storage vs visualization roles, sampling/cardinality/retention, alerting + **the staleness/lag SLIs declared in Step 3C** (Step 8)
11. Code quality — enforcement gates, tooling, **fitness functions per architectural rule** (Step 9)
12. Dependency risk matrix — high-risk packages, mitigation (Step 10)
13. Architecture diagram (Mermaid — all layers, data flow, **trust boundaries and failure domains**)
14. **Cost model — `$/request` or `$/tenant`, the dominant drivers, and whether unit cost rises with scale**
15. Risk assessment for overall architecture — **including the anti-patterns deliberately accepted and why**
16. Unresolved questions

**MUST ATTENTION** every diagram needs a legend, a date and an owner — an undated diagram is a rumor. Show trust boundaries and failure domains explicitly: that is the entire point of drawing a deployment view.

### Emit ADRs for hard-to-reverse decisions (MANDATORY)

For each decision significant AND costly to reverse — **every one-way door classified in Step 2-0**: backend/frontend style, data model + key strategy, tenancy model, consistency model per read path, sync-vs-async at a boundary, public API/event contract, service boundary lines, auth/identity model, data residency + retention, messaging approach, a Step-2 quality-attribute budget, a rejected-with-reason alternative — write one ADR to `docs/adr/{NNNN}-{slug}.md` following the repo's existing ADR format (Status, Date, Context, Decision, Consequences [Positive/Negative/Neutral], Alternatives Considered, Related; see `docs/adr/0001-skill-lifecycle.md` for canonical shape). Start `Status: Proposed`; promote to `Accepted` after Step-12 user validation confirms it. These ADRs are the binding record `architecture-review` Category 9 checks changed code against — **a decision not written as an ADR cannot be enforced downstream.** Route ADR authoring through the `architect` sub-agent for cross-service/security/performance impact analysis.

**ADR minimum content — the two most-skipped fields are the most valuable:** Context (forces, constraints, quantified attributes) · Decision · **Alternatives considered WITH why each was rejected** (prevents relitigating, and later explains the constraint to whoever is tempted to break it) · Consequences (what we now CANNOT do easily) · Status · **Revisit trigger** (the measurement that would reopen this decision).

**MUST ATTENTION** an architectural rule NOT automatically verified is a SUGGESTION and will be violated within one quarter. Every ADR-recorded constraint that CAN be machine-checked MUST also land in the Step-9 Scaffold Handoff as an executable fitness rule (layer/dependency rules, no module cycles, domain purity, API + event schema compatibility, tenant-isolation test, "every outbound call has a timeout", bundle/latency budgets, cost-per-request regression). Pay existing architectural debt with a **RATCHET** — block new violations in CI, then decrement the existing count — never with a "cleanup sprint later" that never happens.

### Architecture Diagram Template

````markdown
```mermaid
graph TB
    subgraph "Frontend"
        UI[SPA / Micro Frontend]
        STORE[State Management]
    end
    subgraph "API Gateway"
        GW[Gateway / BFF]
    end
    subgraph "Backend Services"
        CMD[Commands / Handlers]
        QRY[Queries / Read Models]
        SVC[Domain Services]
        ENT[Entities / Aggregates]
    end
    subgraph "Infrastructure"
        DB[(Database)]
        CACHE[(Cache)]
        MSG[Message Bus]
        SEARCH[(Search Index)]
    end
    subgraph "Observability"
        LOG[Logging]
        METRIC[Metrics]
        TRACE[Tracing]
    end
    subgraph "CI/CD"
        PIPE[Pipeline]
        REG[Container Registry]
        K8S[Orchestration]
    end
    UI --> GW --> CMD & QRY
    CMD --> SVC --> ENT --> DB
    QRY --> CACHE & SEARCH
    ENT -.-> MSG
    CMD & QRY -.-> LOG & METRIC & TRACE
    PIPE --> REG --> K8S
```
````

---

## Step 12: User Validation Interview

**MANDATORY IMPORTANT MUST ATTENTION** present findings, ask 8-12 questions by asking the user directly:

### Required Questions

1. **Workload + driving attributes + sacrifices** — "The workload is {read/write ratio, peak load, growth, skew, geography}; the first expected bottleneck is {component}, so the scaling path is {ordered rungs}. I optimized for {≤3 attributes} and am SACRIFICING {list}. Correct priorities?"
2. **Backend architecture** — "I recommend {style}; I eliminated {alternatives} because {attribute}. The trigger that would make us extract services is {measurable trigger}. Agree?"
3. **Consistency model + staleness budget** _(one-way door)_ — "{read path} will be eventually consistent with a ≤{N}s staleness budget; {other path} stays strongly consistent. Acceptable to the business?"
4. **Tenancy + isolation** _(one-way door)_ — "Tenancy is {model}, isolation enforced by {mechanism}. Any tenant needing stronger isolation or its own residency?"
5. **Sync vs async boundaries** _(one-way door)_ — "{boundary} is async, so {effect} completes eventually and the user sees {intermediate state}. Acceptable UX?"
6. **Frontend architecture** — "I recommend {style} with {state management}. Agree?"
7. **Design patterns** — "Recommended backend patterns: {list}. Frontend patterns: {list}. Any to add/remove?"
8. **Key libraries** — "For {concern}, I recommend {lib} over {alternatives}. Agree?"
9. **Testing strategy** — "Test pyramid: {unit}%/{integration}%/{E2E}% using {frameworks}, plus contract tests at {boundaries}. Appropriate?"
10. **CI/CD + migration safety** — "Pipeline: {tool} with {deployment strategy}, schema changes via expand–contract. Fits your infra?"
11. **Observability** — "Monitoring stack: {logs}/{metrics}/{traces}, with {staleness/lag SLIs}. Sufficient?"
12. **Code quality + fitness functions** — "Enforcement: {linter + formatter + hooks + architecture tests}. Team ready for CI to BLOCK on boundary violations?"
13. **Dependency risk** — "Found {N} high-risk dependencies. Accept or find alternatives?"
14. **Cost + complexity check** — "Estimated {$/request or $/tenant}; {N} concerns addressed. Appropriate for team size and budget?"

Ask the **one-way-door questions first** — they are the ones the user actually owns. Two-way doors do not deserve a validation slot.

### Optional Deep-Dive Questions (pick 2-3)

- "Should we use event sourcing or traditional state-based persistence?" _(if the answer is "we want an audit log", the answer is an audit table)_
- "Monolith-first or start with service boundaries?"
- "Micro frontends or monolith SPA?"
- "How important is framework independence for this repository or system?"
- "Self-hosted observability or managed SaaS?"
- "Strict lint rules from day 1 or gradual adoption?"
- "What is the acceptable degraded mode when {critical dependency} is down — stale data, hidden feature, or read-only?"
- "RPO/RTO per dataset — how much data loss and downtime is genuinely acceptable, and who signs off on the restore drill?"
- "Is any data regulated or residency-bound in a way that forces per-tenant or per-region isolation?"

After user confirms, update report with final decisions, mark `status: confirmed`.

---

## Best Practices Audit (applied across all steps)

Validate architecture against these principles — flag violations in report. — why: an unflagged SOLID/DRY violation compounds into rework once code lands on the flaw.

| Principle                      | Check                                                                                                                                                                             | Status |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Single Responsibility (S)**  | Each class/module has one reason to change                                                                                                                                        | ✅/⚠️  |
| **Open/Closed (O)**            | Extensible without modifying existing code                                                                                                                                        | ✅/⚠️  |
| **Liskov Substitution (L)**    | Subtypes substitutable for base types                                                                                                                                             | ✅/⚠️  |
| **Interface Segregation (I)**  | No forced dependency on unused interfaces                                                                                                                                         | ✅/⚠️  |
| **Dependency Inversion (D)**   | High-level modules depend on abstractions, not concretions                                                                                                                        | ✅/⚠️  |
| **DRY**                        | No duplicated business logic across layers                                                                                                                                        | ✅/⚠️  |
| **KISS**                       | Simplest architecture that meets requirements                                                                                                                                     | ✅/⚠️  |
| **YAGNI**                      | No speculative layers or patterns for future needs                                                                                                                                | ✅/⚠️  |
| **Separation of Concerns**     | Clear boundaries between domain, application, infra                                                                                                                               | ✅/⚠️  |
| **IoC / Dependency Injection** | All dependencies injected, no `new` in business logic                                                                                                                             | ✅/⚠️  |
| **Technical Agnosticism**      | Domain layer has zero framework/infra dependencies                                                                                                                                | ✅/⚠️  |
| **Testability**                | Architecture supports unit + integration testing                                                                                                                                  | ✅/⚠️  |
| **12-Factor App**              | Config in env, stateless processes, port binding                                                                                                                                  | ✅/⚠️  |
| **Fail-Fast**                  | Validate early, fail with clear errors                                                                                                                                            | ✅/⚠️  |
| **Reversibility ranked**       | Every one-way door identified and ADR-backed (Step 2-0)                                                                                                                           | ✅/⚠️  |
| **Coupling — 4 dimensions**    | Code, temporal, semantic AND deployment coupling each judged separately; no distributed monolith (services that must release together, shared DB/domain lib, sync chains ≥4 deep) | ✅/⚠️  |
| **Cohesion**                   | Modules split by what CHANGES TOGETHER (Parnas volatility), never by technical layer or noun; no `Utils`/`Common`/`Shared` dumping ground                                         | ✅/⚠️  |
| **Conceptual integrity**       | One coherent paradigm — not two competing ones in one codebase                                                                                                                    | ✅/⚠️  |
| **Complexity is BOUGHT**       | Every layer, service, store and abstraction traced to a named quality attribute with a number                                                                                     | ✅/⚠️  |
| **Conservation of complexity** | Where complexity MOVED is stated (client / runbook / data layer), not claimed to have vanished                                                                                    | ✅/⚠️  |
| **Enforceability**             | Every architectural rule has a fitness function; none rely on review discipline alone                                                                                             | ✅/⚠️  |
| **Operability**                | Debuggable, monitorable, rollback-able — traces, structured logs, correlation IDs, graceful shutdown                                                                              | ✅/⚠️  |
| **Cost efficiency**            | Unit economics modeled; unit cost does not rise with scale                                                                                                                        | ✅/⚠️  |

---

## Output

```
{plan-dir}/research/architecture-design.md     # Full architecture analysis report
{plan-dir}/phase-02b-architecture.md           # Confirmed architecture decisions
docs/adr/{NNNN}-{slug}.md                       # One ADR per hard-to-reverse decision (see Step 11)
```

---

**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** validate EVERY architecture recommendation with user by asking the user directly — never auto-decide.
**MANDATORY IMPORTANT MUST ATTENTION** include confidence % and evidence citations for all claims.
**MANDATORY IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality.

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use ask the user directly to present these options. NEVER skip because the task seems "simple" or "obvious" — the user decides:

- **"$plan (Recommended)"** — Create implementation plan from architecture design
- **"$refine"** — If need to create PBIs first
- **"Skip, continue manually"** — user decides

### Council escalation (always-offer, second prompt)

After the existing `## Next Steps` prompt above resolves, present a **second**, independent ask the user directly call (NEVER merge into the first):

- **"Skip council — proceed (Recommended)"** — Continue with the architecture decision as-is. Recommended default.
- **"Escalate to $llm-council"** — Run 11 sub-agent council (5 advisors + 5 reviewers + chairman). Use when this architecture pick is hard to reverse and you need adversarial framing. Cheaper alternatives: `$why-review`, `$plan-validate` (run these first if you haven't).

## Anti-Rationalization (reject these excuses)

| Excuse the model tells itself                              | Reality                                                                                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| "I know this stack — skip the 3-options research"          | Familiarity ≠ evidence. Research 3+ options with cited proof per concern, every time.                                                                                    |
| "The architecture is obvious — skip user validation"       | Step 12 is MANDATORY. The user owns hard-to-reverse decisions; never auto-decide.                                                                                        |
| "No scale numbers given, I'll just pick a style"           | Missing target = explicit `Unresolved question`, never a silent guess. Quantify via Step-2 first.                                                                        |
| "It's a small feature — skip the ADR"                      | If a decision is significant AND costly to reverse, it needs an ADR or it cannot be enforced.                                                                            |
| "Brownfield, but my preferred style is better"             | NEVER re-litigate a settled ADR-recorded decision without a superseding-ADR rationale.                                                                                   |
| "I'll document the budget, enforcement is optional"        | Documented-but-unenforced budgets erode. Encode them as executable fitness checks for CI.                                                                                |
| "Microservices are the modern default"                     | Modulith-first. Distribution needs a named, MEASURED extraction trigger — and CI/CD + tracing + a platform team first.                                                   |
| "It's a data decision, the devs can sort it out"           | Data model, tenancy, consistency model and keys are the LEAST reversible decisions here (Step 3C). ADR + validate.                                                       |
| "We'll just write the DB then publish the event"           | That is a dual write. Outbox or CDC — no exceptions (Step 3D).                                                                                                           |
| "The queue guarantees exactly-once"                        | Exactly-once DELIVERY is impossible. Design idempotent consumers for duplicate + out-of-order arrival.                                                                   |
| "Eventual consistency is fine here"                        | Then state the STALENESS BUDGET and monitor it as an SLI. Unbounded, unmeasured lag IS the defect.                                                                       |
| "I'll add resilience/observability/cost later"             | They are quality attributes decided in THIS pass. Retrofitting them costs a redesign.                                                                                    |
| "One good design is enough — writing a second wastes time" | Design-it-twice (Step 3A) is what turns a first idea into a CHOICE. A one-way door with one candidate has not been decided.                                              |
| "We take a distributed lock, so it's safe"                 | An unfenced lock does not prevent split brain. Name the fencing token, the lease duration, and the expiry behaviour (Step 3C).                                           |
| "The ORM handles transactions"                             | Name the ISOLATION LEVEL. Read Committed and snapshot isolation both permit write skew — protect every check-then-act invariant explicitly (Step 3C).                    |
| "We'll use Kafka / Redis / Kubernetes for that"            | Prescribe the TACTIC, not the product (Step 2). Name the ordering/replay/durability property you need, then let that select the tool.                                    |
| "Best practice says…"                                      | Name the FORCES it balances and the constraints of the company it came from. "Best practice" with no named sacrifice is red flag #5 (`architecture-knowledge.md` §20.3). |

### Self-audit your OWN draft before emitting (MANDATORY)

Run the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 against this design and every recommendation in it. Any hit invalidates the REASONING, not just the wording — fix the decision, not the sentence. The three that most often fire in this skill: **technology picked before the requirement was stated** · **cannot name what the recommendation SACRIFICES** · **designing for a scale you cannot evidence**. — why: a design that fails its own self-audit will pass review on presentation quality and fail in production on the unexamined assumption.

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

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

- **IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
- **IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
- **IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
- **IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `spawn_agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
> 5. **Brief each sub-agent self-contained:** goal · scope + owned files · reference docs · return contract (summary + `Full report:` path, per SYNC:subagent-return-contract) · incremental persistence to `plans/reports/` (per SYNC:incremental-persistence).
> 6. **Barrier per wave.** Advance ONLY after EVERY member returns (a skipped conditional counts as returned). Merge, mark each task completed/skipped, THEN dispatch the next wave. Mutating steps wait for the barrier.
> 7. **One level deep.** A dispatched sub-agent executes its own brief; further fan-out stays the orchestrator's job unless that agent's `.claude/agents/*.md` definition authorizes it.
>
> **NEVER parallelize:** tasks sharing a write target · a task consuming a pending task's output · trivial single-file work (dispatch overhead > gain) · an order a skill or workflow explicitly fixes · gates awaiting user approval.
>
> **Blocked until:** MUST ATTENTION every task tagged PAR/SEQ with a named reason per SEQ · waves declared + write-set disjointness checked · each wave spawned in ONE message · barrier honored before the next wave.

<!-- /SYNC:parallel-subagent-dispatch -->

<!-- SYNC:parallel-subagent-dispatch:reminder -->

- **MANDATORY** After planning tasks, tag each PAR/SEQ and spawn every PAR wave as parallel sub-agents in ONE message — default parallel for workflows, batch updates, investigation, research, reviews; plan execution fans out ONLY on what the plan declares.
- **MANDATORY** Disjoint write sets per wave · all-return barrier before the next wave · specialist routing · sub-agents NEVER fan out further unless their own agent definition authorizes it.
  <!-- /SYNC:parallel-subagent-dispatch:reminder -->

<!-- SYNC:project-protocol-overlay -->

> **Project Protocol Overlay** — Before executing this skill, resolve any PROJECT overlay rules layered onto it: match this skill's name against the `Target` column of the project's skill-protocol index (`docs/project-reference/skill-protocols-reference.md` by default; a `referenceDocs` entry in `docs/project-config.json` overrides the path), taking the most specific matching tier ONLY — exact name > glob > `*`. **That precedence orders overlays against EACH OTHER, never against this skill.** Read ONLY the matched bodies, resolved as `<protocols-dir>/<Name>.md`; a row's Body link is display text, never a read path. A matched body that is missing or malformed is REPORTED and skipped — never reconstructed from the index Description. No index, or no match -> proceed with no overlay, silently. Full contract: `.claude/skills/project-skill-protocol/references/registry.md`.
>
> Overlays are **ADDITIVE ONLY**: they ADD rules on top of this skill's own protocol and NEVER replace, override, disable, or reinterpret a rule it already states — removing every overlay must return this skill to exactly its documented behavior. An overlay is a BRIEF, not an authority escalation: it can NEVER waive a workflow gate, git discipline, a review gate, or a user-confirmation gate. A genuine overlay-vs-skill conflict, or two equally-specific overlays that directly contradict -> surface both to the user; NEVER resolve silently.

<!-- /SYNC:project-protocol-overlay -->

<!-- SYNC:project-protocol-overlay:reminder -->

**MUST ATTENTION** resolve project protocol overlays for this skill BEFORE executing — most specific matching tier only (exact > glob > `*`, which ranks overlays against each other, NEVER against this skill), read only matched bodies at `<protocols-dir>/<Name>.md`; a missing or malformed body is reported, never reconstructed. Overlays are ADDITIVE ONLY (they never replace this skill's own rules) and are a brief, NEVER an authority escalation; an equal-specificity contradiction goes to the user.

<!-- /SYNC:project-protocol-overlay:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION Goal:** Deliver a complete, evidence-backed, user-validated architecture decision report — every concern researched with 3+ options, every recommendation carrying confidence % + cited evidence, every decision confirmed by the user — so implementation proceeds on sound, owned architectural choices.

**IMPORTANT MUST ATTENTION — Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Critical Thinking:** traced `file:line` proof per claim, confidence >80% to act.
- **Sequential Thinking:** multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS, confidence closer.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.

**MANDATORY IMPORTANT MUST ATTENTION** execute ALL 12 main steps in order, tracking each — 1 Load Context (+mode) · 2 Derive Requirements (+workload profile/scaling ladder, reversibility ranking, ≤3 driving attributes + sacrifices, 6-part quantified scenarios, 2-2 pre-decision interrogation, cost) · 3A Backend Styles (+selection procedure, modulith-first, extraction triggers) · 3B Backend Patterns · **3C Data & Consistency** (stores/substrates, replication/failover, cache contract, one writer, consistency + staleness, transaction boundary, tenancy, partitioning, migrations, retention, RPO/RTO) · **3D Integration & APIs** (sync-vs-async + acceptance state, API/edge cache style, versioning, contracts, outbox/CDC, idempotency, event granularity, queue hygiene, resilience, degradation) · 4 Frontend · 4B UI System (skip if backend-only) · 5 Library Ecosystem · 6 Testing · 7 CI/CD (+release-safety rules) · 8 Observability (signal roles + sampling/cardinality) · 9 Code Quality (+Scaffold Handoff table) · 10 Dependency Risk · 11 Generate Report (+ADRs) · 12 User Validation — NEVER skip, reorder, or merge a step without explicit user approval — why: the model keeps forgetting its own steps and silently drops mandatory gates.
**MANDATORY IMPORTANT MUST ATTENTION** rank every decision by REVERSIBILITY first — one-way doors (data model + keys, tenancy, consistency model per read path, sync-vs-async at a boundary, public API/event contract, service boundaries, auth model, residency + retention) get an ADR + a Step-12 validation question; two-way doors get a decision and momentum — why: an unreviewed irreversible decision surfaces months later as a migration, and that is this skill's most expensive failure mode.
**MANDATORY IMPORTANT MUST ATTENTION** reason FROM `.claude/docs/architecture-knowledge.md` (laws, quality-attribute TACTICS §2, coupling taxonomy + four coupling dimensions, module-design principles §4, style-selection triggers, isolation levels + coordination primitives §8-§9, trade-off cheat sheet, ~100-entry anti-pattern catalog, symptom→cause triage, judgment checklists §20) — but the project's OWN reference docs and accepted ADRs OUTRANK it on any conflict — why: universal reasoning must not be mistaken for binding project convention.
**MANDATORY IMPORTANT MUST ATTENTION** interrogate BEFORE deciding and self-audit BEFORE emitting: run the 15 pre-decision questions (§20.1) on every one-way door — including question 15, "what would make this the WRONG choice, and how would I detect it?", which becomes the ADR's revisit trigger — **DESIGN IT TWICE** (≥2 materially different candidates per one-way door), then run the 11 thinking red flags (§20.3) against your own draft. Prescribe the TACTIC (§2), never the product — why: a first-idea design with no rejected alternative and no named falsifier is a belief, and a recommendation whose sacrifice you cannot name fails its own audit.
**MANDATORY IMPORTANT MUST ATTENTION** name the ISOLATION LEVEL on every critical write path and protect every check-then-act invariant explicitly (constraint · `FOR UPDATE` · Serializable + retry · atomic conditional write) — Read Committed AND snapshot isolation both permit write skew; and any distributed lock/leader election MUST name its **fencing token**, lease duration and expiry behaviour — why: both defects pass every single-user test and corrupt data only under the concurrency production supplies.
**MANDATORY IMPORTANT MUST ATTENTION** simplicity is the default; every layer, service, extra data store and abstraction must be BOUGHT with a named, quantified quality attribute — modulith-first, and distribute ONLY against a measured extraction trigger (never "the codebase feels big", never "microservices are best practice") — why: distribution bought speculatively pays every distributed cost immediately and collects the benefit never.
**MANDATORY IMPORTANT MUST ATTENTION** name at most 3 DRIVING quality attributes AND the attributes being SACRIFICED, with the trade-off stated as "we accepted cost C to buy property P" — a design that claims to maximize everything has decided nothing — why: unnamed sacrifices resurface as production surprises nobody agreed to.
**MANDATORY IMPORTANT MUST ATTENTION** any write-then-publish flow gets a transactional outbox or CDC (never a dual write), every consumer and unsafe mutation is idempotent (exactly-once delivery is impossible), every outbound call has a timeout with capped jittered retries, and every queue is bounded with a monitored DLQ — why: these four are the load-bearing correctness requirements of any async system and their absence passes all functional tests.
**MANDATORY IMPORTANT MUST ATTENTION** in a pooled multi-tenant model, isolation is enforced at the LOWEST layer (row-level security / ORM global filter / mandatory repository base) with tenant derived from the authenticated principal, plus a test asserting cross-tenant reads return zero rows — NEVER developer discipline, NEVER a client-supplied `tenant_id` — why: one missing tenant predicate or tenant-less cache key is a cross-tenant breach that passes every functional test.
**MANDATORY IMPORTANT MUST ATTENTION** an architectural rule not automatically verified is a SUGGESTION and will be violated within a quarter — every machine-checkable ADR constraint MUST land in the Step-9 Scaffold Handoff as an executable fitness function, and existing debt is paid with a CI RATCHET, never a promised cleanup sprint — why: governance by review meeting loses to governance by executable check, every time.
**MANDATORY IMPORTANT MUST ATTENTION** research min 3 options per architecture concern with cited web evidence (stars, last release, downloads, CVE scan) — NEVER recommend from familiarity alone — why: familiarity bias ships unmaintained or insecure dependencies.
**MANDATORY IMPORTANT MUST ATTENTION** validate decisions with user by asking the user directly (Step 12) — NEVER auto-decide a hard-to-reverse choice — why: the user owns hard-to-reverse decisions; the architect proposes, the user confirms.
**MANDATORY IMPORTANT MUST ATTENTION** quantify Step-2 quality-attribute scenarios (latency p95/p99, throughput, SLO, RPO/RTO, growth, concurrency) — any unknown target becomes an explicit `Unresolved question`, NEVER a silent guess — why: a style chosen without numbers is a guess, not an enforceable decision.
**MANDATORY IMPORTANT MUST ATTENTION** profile workload before technology — read/write ratio, sustained/peak load, query shapes, growth, burst/hot-key skew, geography and staleness — then measure/tune → choose vertical and/or stateless horizontal from headroom + availability → read/write tactics → partition/shard LAST. NEVER recommend a distributed component without naming the measured bottleneck it removes and the trade-off it creates.
**MANDATORY IMPORTANT MUST ATTENTION** brownfield: FIRST read project reference docs + accepted ADRs, constrain research to the existing stack, and NEVER re-litigate a settled ADR-recorded decision without a superseding-ADR rationale — why: re-deciding a recorded choice churns the codebase and breaks downstream conformance checks.
**MANDATORY IMPORTANT MUST ATTENTION** search 3+ existing patterns/ADRs before proposing any new style or pattern; cite `file:line` (or URL/benchmark) evidence and a confidence % for EVERY claim — confidence >80% to recommend, <60% DO NOT recommend — why: speculation without proof is forbidden output.
**MANDATORY IMPORTANT MUST ATTENTION** evaluate fit before copying a nearby pattern — closest example ≠ matching preconditions; verify the new context shares the same scale, constraints, and boundaries — why: a pattern lifted into a mismatched context fails silently.
**MANDATORY IMPORTANT MUST ATTENTION** produce the two binding downstream contracts — one ADR per hard-to-reverse decision (`architecture-review` Cat 9 enforces) AND the Scaffold Handoff tool-choices table (`scaffold`/`harness-setup` consume) — a decision not written as an ADR or encoded as an executable fitness check cannot be enforced downstream — why: documented-but-unenforced budgets erode silently as code changes.
**MANDATORY IMPORTANT MUST ATTENTION** break work into small todo tasks using task tracking BEFORE starting; mark one `in_progress`, mark `completed` immediately after evidence lands; add a final review todo — why: external task state survives context compaction; memory does not.

**Anti-Rationalization (Closing — reject these excuses):**

| Excuse the model tells itself                        | Reality                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| "I know this stack — skip the 3-options research"    | Familiarity ≠ evidence. Research 3+ options with cited proof per concern, every time.                            |
| "The architecture is obvious — skip user validation" | Step 12 is MANDATORY. The user owns hard-to-reverse decisions; never auto-decide.                                |
| "No scale numbers given, I'll just pick a style"     | Missing target = explicit `Unresolved question`, never a silent guess. Quantify via Step-2 first.                |
| "Small feature — skip the ADR / fitness check"       | Significant AND costly-to-reverse → needs an ADR + executable fitness rule, or it cannot be enforced.            |
| "Brownfield, but my preferred style is better"       | NEVER re-litigate a settled ADR-recorded decision without a superseding-ADR rationale.                           |
| "Found a nearby pattern, just copy it"               | Evaluate fit first — same scale/constraints/boundaries? Closest ≠ matching. Verify before reusing.               |
| "Microservices are the modern default"               | Modulith-first. Distribution needs a named MEASURED trigger + CI/CD + tracing + a platform team.                 |
| "Split by entity — one service per aggregate"        | Entity-per-service guarantees a distributed monolith. Split by CAPABILITY / bounded context.                     |
| "Data details are an implementation concern"         | Data model, keys, tenancy and consistency model are the LEAST reversible decisions here (Step 3C).               |
| "Write the DB, then publish the event"               | Dual write. Outbox or CDC — no exceptions (Step 3D).                                                             |
| "The broker gives us exactly-once"                   | Impossible. Effectively-once = idempotent consumers + dedup; assume duplicate + out-of-order.                    |
| "Eventual consistency is fine here"                  | Then state the STALENESS BUDGET and monitor it as an SLI. Unmeasured lag IS the defect.                          |
| "Add resilience / observability / cost later"        | Quality attributes decided in THIS pass. Retrofitting each one costs a redesign.                                 |
| "Pattern X is best practice, so include it"          | A pattern without its precondition IS an anti-pattern. Name the demonstrated pain it removes.                    |
| "One good candidate is enough"                       | Design it TWICE. A one-way door with a single candidate was not decided — and its ADR alternatives are advocacy. |
| "The ORM handles transactions" / "we take a lock"    | Name the ISOLATION LEVEL and the FENCING TOKEN. Write skew and split brain pass every single-user test.          |
| "Use Kafka / Redis / K8s for that"                   | Prescribe the TACTIC (§2), not the product. Name the ordering/replay/durability property first.                  |

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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

<!-- SYNC:sequential-thinking-protocol -->

> **Sequential Thinking Protocol** — Structured multi-step reasoning for complex/ambiguous work. Use when planning, reviewing, debugging, or refining ideas where one-shot reasoning is unsafe.
>
> **Trigger when:** complex problem decomposition · adaptive plans needing revision · analysis with course correction · unclear/emerging scope · multi-step solutions · hypothesis-driven debugging · cross-cutting trade-off evaluation.
>
> **Format (explicit mode — visible thought trail):**
>
> 1. `Thought N/M: [aspect]` — one aspect per thought, state assumptions/uncertainty
> 2. `Thought N/M [REVISION of Thought K]: ...` — when prior reasoning invalidated; state Original / Why revised / Impact
> 3. `Thought N/M [BRANCH A from Thought K]: ...` — explore alternative; converge with decision rationale
> 4. `Thought N/M [HYPOTHESIS]: ...` then `[VERIFICATION]: ...` — test before acting
> 5. `Thought N/N [FINAL]` — only when verified, all critical aspects addressed, confidence >80%
>
> **Mandatory closers:** Confidence % stated · Assumptions listed · Open questions surfaced · Next action concrete.
>
> **Stop conditions:** confidence <80% on any critical decision → escalate by asking the user directly · ≥3 revisions on same thought → re-frame the problem · branch count >3 → split into sub-task.
>
> **Implicit mode:** apply methodology internally without visible markers when adding markers would clutter the response (routine work where reasoning aids accuracy).
>
> **Deep-dive:** see `$sequential-thinking` skill (`.claude/skills/sequential-thinking/SKILL.md`) for worked examples (API design, debugging, architecture), advanced techniques (spiral refinement, hypothesis testing, convergence), and meta-strategies (uncertainty handling, revision cascades).

<!-- /SYNC:sequential-thinking-protocol -->

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

**MANDATORY IMPORTANT MUST ATTENTION** use task tracking to break ALL work into small tasks BEFORE starting.
**MANDATORY IMPORTANT MUST ATTENTION** use ask the user directly at EVERY decision point — never assume user preferences.
**MANDATORY IMPORTANT MUST ATTENTION** research top 3 options per architecture concern, compare with evidence, present report with recommendation + confidence %.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST ATTENTION — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/.ck.json` + `.claude/skills/shared/sync-inline-versions.md` (`:full` blocks) + `.claude/scripts/lib/hookless-prompt-protocol.cjs`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

**Generic portability boundary:** Reusable skills and protocol text stay project-neutral; project-specific conventions are discovered from docs/project-config.json and docs/project-reference/. Apply shared AI-SDD from `shared/sdd-artifact-contract.md`. Read `docs/project-config.json` and `docs/project-reference/docs-index-reference.md`, then open the project reference docs named there. For spec, test-case, behavior-change, public-contract, or `docs/specs/` work, route through the local spec docs named by the docs index: `feature-spec-reference.md`, `spec-system-reference.md`, `spec-principles.md`, and `workflow-spec-test-code-cycle-reference.md` when specs/tests/code must stay synchronized. If either file or a required reference doc is missing or stale, auto-run `$project-init` (or the narrow lower-level route such as `$project-config`, `$docs-init`, `$scan-all`, or `$scan --target=<key>`) before ordinary project-specific work. Any supported AI tool may execute when this shared context and local docs are available.

1. **DETECT:** If the prompt starts with an explicit slash skill/workflow command, execute it directly. Otherwise match the prompt against the workflow catalog and skill list.
2. **ANALYZE:** Choose the best option: execute directly, invoke a skill, activate a standard workflow, or compose a custom step combination.
3. **AUTO-SELECT:** Pick the best option yourself. Do not ask the user to choose between direct execution, skill, standard workflow, or custom workflow.
4. **ACTIVATE:** For a selected workflow, call `$start-workflow <workflowId>`; for a selected skill, invoke that skill; for a custom workflow, sequence custom steps directly; for direct execution, proceed with the task.
5. **CREATE TASKS:** task tracking for ALL workflow/skill/custom steps before execution when the selected path has multiple steps.
6. **PARALLELIZE:** Before executing the task list, tag each task `PAR` (independent inputs + write set disjoint from every other `PAR` task) or `SEQ` (name the blocking dependency), group `PAR` tasks into waves, declare the wave plan, and spawn each wave's sub-agents in ONE message — all-return barrier per wave, fan-out one level deep unless a sub-agent's own definition authorizes further fan-out. Sequential-by-default is a defect when tasks are independent; do not parallelize shared write targets, output-consuming tasks, trivial single-file work, ordering a skill or workflow explicitly fixes, or user-approval gates.
7. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

## Shared AI-SDD Protocol Markers

Source: `.claude/skills/shared/sync-inline-versions.md`

## SYNC:ai-sdd-artifact-contract

> **AI-SDD Artifact Contract** — Shared spec-driven development rules stay portable and source-owned.
>
> 1. Keep reusable AI-SDD principles in `.claude`; put repository-specific paths, commands, owners, products, and formats in project config/reference docs.
> 2. Preserve cycle: `spec -> plan -> tasks -> implement -> verify -> update spec/docs`.
> 3. Trace every requirement or invariant through decision, task, TC/test, source evidence, and docs/spec update.
> 4. Treat code-to-spec extraction as reference-only until accepted by the canonical spec owner.
> 5. Any supported AI tool may plan, implement, review, or verify with synced context; using multiple tools is optional.
> 6. Update `.claude` source first, then sync generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`. — why: mirrors are generated artifacts; hand-edits are overwritten on the next sync
> 7. If `docs/project-config.json`, root instruction files, or a required project-reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.
>
> **Active reference:** `shared/sdd-artifact-contract.md` in the active skills root.

---

## SYNC:ai-sdd-artifact-contract:reminder

- **MANDATORY** Apply `shared/sdd-artifact-contract.md`; keep reusable AI-SDD in `.claude` and local rules in project docs.
- **MANDATORY** Code-to-spec extraction is reference-only until canonical acceptance; any supported AI tool may execute with synced context.
- **MANDATORY** Update `.claude` source before syncing generated mirrors; do not manually edit `.agents`, `.codex`, or `AGENTS.md`.
- **MANDATORY** Missing or stale project config, root instruction files, or required reference docs route project-specific work through `$project-init` or the narrow setup route automatically.
  **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`$code-simplifier`/`$security-review`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.
   **Goal-driven execution:** Define success criteria first, loop until verified, and stop only when observable checks pass.
   **Tests verify intent:** Tests must protect business rules/invariants and fail when the protected intent breaks, not only mirror current behavior.

## Common AI Mistake Prevention (System Lessons)

- **Re-read files after context compaction.** Edit requires prior Read in same context; compaction wipes read state. Re-read before editing.
- **Grep for old terms after bulk replacements.** AI over-trusts find/replace completeness. Grep full repo after bulk edits for missed refs in docs/configs/catalogs.
- **Check downstream references before deleting.** Deletions cascade doc/code staleness. Map referencing files before removal.
- **After memory loss, check existing state before creating new.** Compaction wipes prior-work memory. Query current state to resume — never blindly duplicate.
- **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, method signatures. Grep to confirm existence before documenting/referencing.
- **Trace full dependency chain after edits.** Changing a definition misses downstream consumers. Trace the full chain.
- **When renaming, grep ALL consumer file types.** Some file types silently ignore missing refs (no compile error). Search code, templates, configs, generated files.
- **Trace ALL code paths when verifying correctness.** Code existing ≠ code executing. Trace early exits, error branches, conditional skips — not just happy path.
- **Update docs that embed canonical data when source changes.** Docs inlining derived data (workflows, schemas, configs) go stale silently. Update all embedding docs alongside source.
- **Verify sub-agent results after context recovery.** Background agents may finish while parent compacted — grep-verify output, don't trust assumed completion.
- **Cross-check full target list against sub-agent assignments.** Parallel sub-agents by category miss boundary items. Reconcile union of assignments against target list before proceeding.
- **Sub-agents inherit knowledge only from their agent .md definition — use custom agent types, not built-in Explore.** Tool adoption = permission + knowledge + enforcement (numbered workflow step).
- **Persist sub-agent findings incrementally, not as a final batch.** Long sub-agents hit cutoffs before final write — findings lost. Instruct append-per-section to report file.
- **When debugging, ask "whose responsibility?" before fixing.** Trace caller (wrong data) vs callee (wrong handling). Fix at responsible layer — never patch symptom site.
- **Test failure → record a provisional verdict before trace/edit, then investigate.** Use the full five-way taxonomy: SOURCE-WRONG (production violates intent), TEST-WRONG (assertion/setup is stale), TEST-NOT-OPTIMAL (valid but fragile or low-signal test), ENVIRONMENT-BLOCKED (external state prevents a verdict), or AMBIGUOUS (intent/evidence cannot choose safely). Then trace root cause and triangulate against the governing spec (`docs/specs/**` if one exists) AND source. NEVER weaken an assertion, add a skip, relax a timeout, or change source merely to force green.
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing OR flagging one as a defect.** Pattern-matching as "wrong" skips context. Before changing or reporting any constant/limit/flag/cutoff: read comments, git blame, the CALLER's ordering (the guarantee that makes the value correct usually lives in code running immediately BEFORE the cited line), and 2+ sibling call sites of the same convention. A doc stating WHAT without WHY is missing rationale, not proof of a missing guard — and in a validation pass, an accurate `file:line` citation proves the transcription, never the defect.
- **Verify ALL affected outputs, not just the first.** One build green ≠ all green. Multi-stack changes (backend/frontend/tests/docs) require verifying EVERY output.
- **Evaluate fit before copying a nearby pattern.** Closest example ≠ matching preconditions — verify the new context shares the same constraints, base classes, scope, lifetime.
- **Holistic-first debugging — resist nearest-attention trap.** Don't dive into first plausible cause. List EVERY precondition (config, env vars, paths, DB, endpoints, creds, versions, DI, data). Verify each against evidence (grep/query — not reasoning). Ask "what would falsify this?" — if nothing, it's not a hypothesis. Most expensive failure: going deeper in "obvious" layer while bug sits in layer never questioned.
- **Surgical changes — apply the diff test (context-aware).** Two modes: (1) Bug fix → every line traces to the bug; no restyling; orphan cleanup only for imports YOUR changes made unused. (2) Review/enhancement → implement improvements AND announce as "Enhancement beyond main request: [what]". Never silently scope-creep. Diff test: "Would this line exist if I wasn't asked to do X?" — if no, delete or announce.
- **Surface ambiguity before coding — don't pick silently.** Multiple valid interpretations → present each with effort: "[Request] could mean (1) [N h], (2) [N h]. Which matters?" List scope/format/volume/constraints assumptions first. If simpler path exists, say so. Never silently pick.
- **[MANDATORY FIRST ACTION] ALWAYS activate a suitable skill or workflow BEFORE responding.** Match task against workflow catalog + skill list; invoke via skill invocation or `$start-workflow <workflowId>`. NEVER answer or write code before checking. Skip = protocol violation.
- **Why-Review adversarial mindset — apply when reviewing any plan, decision, or design.** Default SKEPTIC not VALIDATOR: steel-man a rejected alternative, invert each stated reason ("what does it sacrifice?"), stress-test top 2-3 assumptions, run pre-mortem ("ships, fails in 3 months — what breaks?"), surface 1-2 alternatives author missed. Section presence ≠ quality; quality = causal reasoning + concrete mitigations + evidence, not "it's better" or "monitor closely".
- **Front-load report-write in sub-agent prompts for large reviews.** Many-file sub-agents hit budget before final write — findings lost. Design prompts so: (1) report-write is first explicit deliverable, (2) append per-file/section (not batched), (3) scope bounded so reads don't exhaust budget. Truncated mid-sentence with no report file → spawn narrower scope, don't retry same prompt.
- **After context compaction, re-verify all prior phase outcomes before continuing.** Summaries describe intent, not environment state (git index, filesystem, processes). On resume, FIRST audit: git status, re-read modified files, verify filesystem. Every "completed" claim is an untested hypothesis until evidence confirms.
- **OOM/memory: check row count before row size.** Triage: (1) Unbounded query — no DB filter for trigger? Push filter to DB; eliminates OOM. (2) Large rows? Projection reduces proportionally. Row reduction > projection in ROI.
- **Assert the outcome your system OWNS, never the intermediate state your INFRASTRUCTURE owns.** When testing anything asynchronous (queue/broker delivery, retries, background jobs, caches, replication), assert the final business/entity state. NEVER assert the delivery bookkeeping — consume/send status, attempt counts, last-error, row existence or counts in a broker, scheduler, or outbox/inbox table. That bookkeeping lives in shared infrastructure that ANY co-running process (a peer worker, a second replica, a leftover local container) can write, usually under a deterministic shared key, so the assertion silently tests the developer's environment instead of the system: green when run alone, flaky the instant anything else shares that broker + database. Gate question for every assertion: "would this hold no matter WHICH process did the work?" — if no, assert the converged data state instead. Corollary: process-local fault injection and in-process telemetry cannot gate work any process may perform — use them as stress amplifiers (arm → bounded window → disarm → assert convergence), never as preconditions.
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
