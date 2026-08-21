---
name: architecture-review
description: '[Code Quality] Use when reviewing architecture compliance for layers, messaging, service boundaries, CQRS, repos, entity events, and data/consistency/tenancy boundaries. Universal architecture laws, coupling taxonomy and the anti-pattern catalog live in `.claude/docs/architecture-knowledge.md` (project docs always outrank it).'
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

**Goal:** Ensure changes preserve architecture boundaries, ownership, message flow, and generated artifact integrity before handoff — validating changed code against layers, service boundaries, message flow, CQRS, repositories, entity events, frontend architecture, generated artifacts, recorded architecture decisions (ADRs), and quality tooling.

**Summary:**

- **Purpose:** validate a changeset against architecture rules the project records in its OWN reference docs; classify every finding PASS/WARN/BLOCKED with `file:line` proof; self-validate before handoff — one reviewer in the `workflow-review-changes` pipeline.
- **Main phases — run in order:** Phase 0 load architecture rules → Phase 1 determine scope → Phase 2 blast radius (if `graph.db`) → Phase 3 architecture review (13 categories) → Phase 4 finalize compliance report → Phase 5 `$why-review` self-validation gate → Next Steps ask the user directly.
- **The 13 Phase-3 categories — review EVERY applicable one, serially:** 0 quality-tooling baseline · 1 clean-architecture layers · 2 message-bus patterns · 3 CQRS compliance · 4 repository patterns · 5 service-pattern era (legacy vs modern) · 6 entity event handlers · 7 service boundaries · 8 frontend architecture (frontend files only) · 9 ADR / recorded-decision conformance · 10 spec-loop discipline (property-TC + dual-feedback) · 11 scalability & coupling regression (diff-scoped; BLOCKED/WARN) · **12 data, consistency & tenancy boundaries (dual-write, idempotency, isolation level + write skew, unfenced lock, breaking migration, tenant isolation, dataset writer ownership; BLOCKED/WARN)**. Per category: `Think:` derivation → doc rule → source evidence → `file:line` proof + grep 3+ counterexamples → verdict. NEVER scan categories in parallel; codebase convention wins over a suspected violation. — why: skipping a category silently drops the violation class it uniquely covers.
- **Workload-first scalability gate:** before judging a scale technique, prove read/write ratio · sustained/peak load · query shapes · data growth · burst/hot-key skew · geography · latency/consistency budgets; then check the reversible ladder (measure/tune → vertical and/or stateless horizontal from headroom + availability → read/write tactics → partition/shard LAST). Missing evidence means INFO/route, never a scale violation. — why: architecture review must catch regressions without penalizing a lean system for scale it does not have.
- Phase 0 is non-negotiable and first: load the project architecture docs (`backend-patterns-reference.md`, `project-structure-reference.md`, `frontend-patterns-reference.md`, `code-review-rules.md`) — every rule and base-class/symbol name comes from those docs, NEVER general knowledge; the framework names in Categories 2–8 are illustrative only.
- **Universal reasoning comes from `.claude/docs/architecture-knowledge.md`** (coupling taxonomy + four coupling dimensions, distributed-monolith signature, module-design principles §4, isolation levels + coordination primitives §8-§9, ~100-entry anti-pattern catalog, symptom→root-cause triage, judgment checklists §20) — use it to RECOGNIZE a defect class, then prove it with `file:line`. **The project's own reference docs and accepted ADRs OUTRANK that catalog on every conflict — NEVER flag a deviation from the catalog as a project violation.** An anti-pattern match is a HYPOTHESIS until evidence plus the damaged quality attribute are both named. — why: pattern-shape matching without project grounding is exactly the guess-as-fact failure this skill exists to prevent.
- Stay in lane: deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/test findings instead of expanding them. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
- Read-only until validated: **self-audit every draft finding against the 11 thinking red flags (`architecture-knowledge.md` §20.3) FIRST** — a finding whose sacrifice/trade-off you cannot name, or that rests on "best practice", is demoted or deleted, never reworded — then run the Phase 5 `$why-review` self-validation gate before handoff; fixes happen only in the validated fix loop, and every fix restarts a full review from Phase 0. Write findings to `plans/reports/arch-review-{date}-{slug}.md`.

**Default scope:** All uncommitted changes (staged + unstaged). Override: specify files, directories, services, or full codebase.

> **MANDATORY MUST ATTENTION** Plan tasks to READ architecture docs BEFORE reviewing:
>
> 1. `docs/project-reference/backend-patterns-reference.md` — CQRS, messaging, repos, validation, entity events, layer rules **(READ FIRST — primary rules source)**
> 2. `docs/project-reference/project-structure-reference.md` — service map, layer structure, DB ownership
> 3. `docs/project-reference/frontend-patterns-reference.md` — component hierarchy, store, API patterns **(frontend files only)**
> 4. `docs/project-reference/code-review-rules.md` — anti-patterns, conventions
>
> Not found → search: "architecture documentation", "service patterns", "messaging patterns". Rules come from docs — NOT general knowledge.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project architecture docs (rules come from docs, NEVER general knowledge)
2. **Phase 1: Determine Scope** — Changed files (default) or user-specified scope
3. **Phase 2: Blast Radius** — Run `$graph-blast-radius` if `graph.db` exists
4. **Phase 3: Architecture Review** — Check each file serially against all 13 applicable categories (0 tooling → 12 data, consistency & tenancy)
5. **Phase 4: Finalize** — Generate compliance report with PASS/BLOCKED/WARN verdicts
6. **Phase 5: Why-Review Self-Validation Gate** — Adversarially validate own findings via `$why-review` before handoff (MANDATORY when any finding exists)
7. **Next Steps** — ask the user directly: `$code-simplifier` / `$code-review` / skip

**Key Rules (top 3 critical first):**

- MUST ATTENTION read project architecture docs in Phase 0 BEFORE reviewing — rules come from docs, NEVER general knowledge.
- Every violation needs `file:line` proof + grep 3+ counterexamples before flagging — NEVER speculate.
- MUST ATTENTION review one category at a time: doc rule → source evidence → verdict — NEVER scan categories simultaneously.
- Write findings to `plans/reports/arch-review-{date}-{slug}.md`.
- BLOCKED = must fix before merge | WARN = review and decide | PASS = compliant.
- Review is read-only until `$why-review --validate-findings` confirms findings; fixes happen only in the validated fix loop or downstream plan/feature-implement, and every fix restarts a full architecture review from Phase 0 with a fresh task breakdown.

## Your Mission

<task>
$ARGUMENTS
</task>

## First Principle — Easy to Change

> **Success metric: future change cost.** DRY, SRP, abstraction, patterns, naming, layering, tests exist to make next change cheaper.

Before applying any rule, ask: **does this lower or raise future change cost?**

- Reject "best practices" raising cost: premature abstraction, speculative generality, leaky indirection, ceremony without payoff. — why: cost added now with no payoff is debt, not quality.
- Name real enemies: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Prefer simple reversible design over sophisticated rigid design. — why: reversible decisions cost less to undo when wrong.
- If downstream rule raises change cost, this principle wins.

---

## Quality Tooling Principle — Tech-Stack Adaptive

> Architecture review includes automated quality guardrails. Without stack-appropriate linting, formatting, type checks, static analysis, dependency/security-review scanning, CI enforcement, defects depend on reviewer memory.

Evaluate detected stacks, not fixed tool list:

- Detect stacks from project-reference docs, manifests, lock files, build files, CI before recommending tools.
- Per production stack, verify formatter/style config, linter/code analyzer, compiler/type-check strictness, dependency/vulnerability scanning, tests/coverage, CI/pre-commit enforcement.
- Prefer official or ecosystem-standard tooling; local docs absent/stale → check current official docs before recommending setup.
- MUST ATTENTION recommend enforceable best practice only: installed but unwired tool = WARN; production source with no relevant automated quality gate = BLOCKED.
- Identify missing capability first; map to local equivalent before prescribing new tooling. — why: prescribing a tool that duplicates an existing gate adds noise, not coverage.

---

## Review Mindset (NON-NEGOTIABLE)

Skeptical. Every claim needs traced proof, confidence >80%.

- NEVER flag violations without reading actual code + tracing dependency — READ the code, trace the import chain, then flag.
- Every finding MUST include `file:line` evidence.
- Before flagging pattern violation: grep 3+ existing examples — codebase convention wins.
- Question: "Actually a violation, or an established exception?"

## Ownership & Handoff (own vs delegate)

This skill = one reviewer in a multi-reviewer pipeline — `workflow-review-changes` runs it beside the siblings below. Review ONLY what this skill owns; route the rest so findings are not double-reported across reviewers.

| This skill OWNS (deep-review here)                                                                                      | Delegate to sibling (one-line pointer only — do NOT deep-review)                                                     |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Layer boundaries, dependency direction, business-logic placement                                                        | —                                                                                                                    |
| Messaging patterns, CQRS structure, repository patterns, service-pattern era, entity event handlers, service boundaries | —                                                                                                                    |
| Frontend ARCHITECTURE (base classes, store/effect, API-service base, subscription teardown, CSS-class presence)         | Visual/SCSS/responsive/z-index quality → `ui-review`                                                                 |
| Quality-tooling baseline, generated-artifact integrity, ADR / recorded-decision conformance                             | —                                                                                                                    |
| Architecture-level auth PLACEMENT (a gate exists at the boundary)                                                       | OWASP, secrets, dependency/supply-chain, authz-matrix depth → `security-review`                                      |
| Structural soundness of a hot path (no obvious N+1 introduced by the diff)                                              | Query plans, indexing depth, latency/throughput budgets → `performance-review`                                       |
| —                                                                                                                       | Domain entity / value-object DDD design quality → `domain-entities-review`                                           |
| —                                                                                                                       | Integration-test assertion quality, coverage, traceability → `integration-test-review`                               |
| —                                                                                                                       | Runtime production-readiness of service/API changes (observability wiring, rollback) → `production-readiness-review` |

When a finding clearly belongs to a sibling, record one-line `→ route to {skill}` pointer and move on — NEVER expand it. — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **MUST ATTENTION:** Read project docs BEFORE reviewing. Rules come from docs, NEVER general knowledge.

- read `docs/project-reference/backend-patterns-reference.md` — extract messaging naming, layer rules, CQRS patterns, repo rules, entity event handler patterns, validation patterns
- read `docs/project-reference/project-structure-reference.md` — extract service map, layer structure, DB ownership
- frontend files in scope → read `docs/project-reference/frontend-patterns-reference.md`
- read `docs/project-reference/code-review-rules.md` — extract anti-patterns + review rules directly

**Universal reasoning layer (secondary, never authoritative):** consult `.claude/docs/architecture-knowledge.md` for the coupling taxonomy + four coupling dimensions, the distributed-monolith detection signature, the ~100-entry anti-pattern catalog, and the symptom→root-cause triage matrix. Use it to RECOGNIZE a defect class the project docs do not name explicitly. **Honor its provenance markers in §3/§8/§9/§10:** a row or section banner marked `— VERIFY` is an UNVERIFIED assertion — it may seed a hypothesis, but NEVER quote it as the authority for a finding; confirm against the named source (or the project's own docs) first.

> **MUST ATTENTION — precedence is absolute.** Project reference docs and accepted ADRs > the knowledge catalog > general knowledge. **NEVER report a deviation from the catalog as a project violation**, and NEVER let a catalog entry override an established, grepped codebase convention. Every catalog-derived observation is a HYPOTHESIS until you have BOTH `file:line`/config/topology evidence AND the named quality attribute it damages — otherwise record it as INFO or drop it. — why: universal patterns applied as project rules generate confident false positives, the most expensive output this skill can produce.

## Phase 1: Determine Scope

**Default (no override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

- Collect file list to review.
- Categorize: backend (.cs), frontend (.ts/.html), config, docs, other.
- Filter to architecture-relevant files (skip pure docs, configs, tests unless architecture-relevant).

## Phase 2: Blast Radius (if graph.db exists)

- `.code-graph/graph.db` exists → call `$graph-blast-radius` skill.
- Record: impacted file count, cross-service impact, risk level.
- Prioritize review by highest-impact files first.
- Graph unavailable → note "Graph not available — skipping blast radius" and proceed.

Per changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

Flag MESSAGE_BUS consumers or event handlers impacted by changes.

## Phase 3: Architecture Review

Create report: `plans/reports/arch-review-{date}-{slug}.md`

Per file in scope, evaluate against ALL applicable categories. Skip categories not applicable to file type.

MUST ATTENTION review serially. Per applicable category: read docs/source evidence → derive risk with `Think:` → grep 3+ examples/counterexamples → record PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence into one undifferentiated pass and drops findings.

> **Portability note (MUST ATTENTION):** Framework symbols, base-class names, directory conventions in Categories 2–8 below are **illustrative examples** — authoritative form comes from Phase 0 reference docs (`backend-patterns-reference.md`, `frontend-patterns-reference.md`, `project-structure-reference.md`); verify code against those docs. On any stack, map each example to project's equivalent as named in its own reference docs, flag deviations from project's **actual** convention — NEVER from these literal names. Same discipline as Category 5: read project docs at review time; NEVER treat a hardcoded name as universal.

---

### Category 0: Quality Tooling Baseline — Severity: BLOCKED/WARN

**Think:** Can project automatically catch style, type, complexity, security, dependency, boundary regressions for detected stacks?

- Detect production stacks via `docs/project-config.json`, relevant docs, manifests, lock files, build files, CI.
- Inventory gates: formatter, linter, code/static analyzer, compiler/type checker, dependency audit/SCA/SBOM, SAST, test/coverage, architecture/dependency-boundary checks, pre-commit, CI/build.
- Verify stack-appropriate coverage: `.editorconfig`/language analyzers, JavaScript/TypeScript linting, UI template linting when supported, formatter config, dependency vulnerability scans, semantic security analysis.
- BLOCKED when production stack lacks runnable lint/static-analysis/type-check command and equivalent enforced gate, or CI/build references missing/broken quality command.
- WARN when tooling local-only, not wired into CI/build/pre-commit, partial for active production code, broadly/unexplainedly suppressed, unclear on generated-code exclusions, or stale for stack.
- **Scope to the change (MUST ATTENTION):** On normal change-level review, _pre-existing_ tooling gap unrelated to diff is WARN with single note — NEVER BLOCK whole review on standing, change-unrelated condition. Reserve BLOCKED for: new stack/service introduced by this change with no gate, change itself removing/breaking existing gate, or explicit full-codebase/greenfield audit scope. — why: change review that BLOCKs on unrelated standing gap produces noise that buries regression the diff actually introduced.
- Before recommending tools, find current official/ecosystem setup and cite it; recommend capabilities first, tools second.

**Fitness-function enforcement (architectural rules must be EXECUTABLE):** an architectural rule not automatically verified is a SUGGESTION and will be violated within a quarter. Check whether the project's own recorded architectural rules have a machine check — and whether THIS change adds a rule with no check:

| Rule the project records         | Fitness function expected (any equivalent counts)                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Layer / dependency direction     | Architecture test in CI (ArchUnit / NetArchTest / dependency-cruiser / import-linter / lint boundary rules) |
| No module cycles                 | Cycle detection failing the build                                                                           |
| Domain purity                    | Assertion that the domain package imports no framework/ORM/HTTP namespace                                   |
| API / event schema compatibility | OpenAPI-or-protobuf diff gate · schema-registry backward-compat check · consumer contract tests             |
| Multi-tenant isolation           | Test asserting a cross-tenant query returns zero rows (see Category 12)                                     |
| Resilience                       | "Every outbound call has a timeout" lint or test                                                            |
| Performance / bundle budget      | Latency-or-size assertion in the pipeline                                                                   |

- **WARN** when a recorded architectural rule has NO machine check and relies on review discipline alone. **BLOCKED** when this change REMOVES or disables an existing architecture/boundary check, or introduces a new enforced-by-prose-only boundary while the project already has a fitness-function mechanism available.
- Existing violation backlog is fine if it is a RATCHET (new violations blocked, count only decrements) — a "cleanup later" comment with no gate is WARN.

**Violation format:**

```
BLOCKED: {stack} has no enforced lint/static-analysis/type-check quality gate ({evidenceFile}:{line})
WARN: recorded architecture rule "{rule}" has no fitness function — enforced by review discipline only ({docFile}:{line})
```

---

### Category 1: Clean Architecture Layers — Severity: BLOCKED

**Think:** What layer is this file in? What layers can it legally import from? Does any import break inward-only flow (Service/API → Application → Domain ← Persistence)?

- Read `docs/project-config.json` → `architectureRules.layerBoundaries` for project-specific rules.
- Determine layer from file path: Domain/, Application/, Persistence/, Service/.
- Scan configured language's import/include statements — flag imports from forbidden layers.
- MUST ATTENTION verify business logic in correct layer: Entity/Domain > Service/Application > Controller/Component.
- NEVER allow direct infrastructure access from Domain — keep repo interfaces in Domain, implementations in Persistence. — why: Domain depending on infrastructure inverts the dependency rule and couples core logic to a swappable detail.
- NEVER allow business logic in API/Controller layer — push it down to Entity/Domain or Application.
- **Module cycles (BLOCKED):** a cycle in the module/package dependency graph means the two modules ARE one deployable unit whatever the folder structure says. Detect with the graph (`trace --direction both`) or the project's dependency tool; flag any NEW cycle the diff introduces. — why: an unbroken cycle makes independent testing, release and extraction impossible, and it never gets easier to cut later.
- **Domain purity (BLOCKED):** the domain layer MUST NOT import ORM attributes, HTTP types, SQL, serialization or framework namespaces. Grep the changed domain files for the infrastructure namespaces named in `backend-patterns-reference.md`.
- **Shared/infra layer domain leak (BLOCKED):** a generic/shared/infrastructure layer MUST reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. **This leak compiles, runs, and passes functional tests while silently coupling the "reusable" layer to one consumer.** Fix by keeping the shared type domain-free and pushing domain fields down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable, and every later consumer inherits the wrong abstraction.
- **Cohesion / dumping ground (WARN):** a new or growing `Utils`/`Common`/`Shared`/`Helpers`/`Managers` module that everything imports is coincidental cohesion — it becomes the coupling hub and the cycle source. Test: "how many DIFFERENT reasons would make me edit this file?" More than one actor ⇒ split.
- **Pass-through layer (WARN):** a layer that only forwards calls unchanged (sinkhole) adds cost with no responsibility — collapse it or give it a real job.
- **Shallow module / pass-through method (WARN):** a new type whose public interface is nearly as large as its implementation, or a method that only forwards to the next layer with no added responsibility, earns nothing — it is interface cost with no hidden complexity. Judge module VALUE as _functionality hidden ÷ interface surface_: many tiny one-method classes ("classitis") raise total complexity while looking modular. Prefer pulling the complexity DOWNWARD into one deep module over spreading it across N call sites. — why: reviewers count classes and read it as modularity, so this defect is the one that survives review and then makes every future change touch five files.
- **DIP placement (WARN, BLOCKED when the project's docs require it):** dependency inversion is only real when the **interface lives in the domain/policy package** and the adapter package depends inward. An interface declared beside its single implementation in the infrastructure package is a naming convention, not inversion — grep where the changed port/interface is DECLARED, not merely where it is used. — why: an interface in the infra package leaves the dependency arrow pointing the wrong way while the code reads as clean architecture.
- **Wrong-abstraction extraction (WARN):** a diff that MERGES two code paths that look alike but change for DIFFERENT reasons creates a shared module with two actors. Duplication is cheaper than the wrong abstraction — require three real occurrences sharing the same reason to change (**rule of three**) before extracting. Verify against the project's own strategic-DRY decision before flagging. — why: a premature abstraction is defended by everyone who depends on it, so its cost compounds while duplication's cost stays linear.

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
BLOCKED: {filePath}:{line} introduces module cycle {A} → {B} → {A}
BLOCKED: shared/infra {filePath}:{line} references consumer domain concept {concept} — shared layer must stay domain-free
```

---

### Category 2: Message Bus Patterns — Severity: BLOCKED/WARN

**Think:** Does this message correctly name its type (event vs request)? Does it extend the right base class? Is producer/consumer relationship correctly oriented — does the leader service own the event?

**Naming (BLOCKED):**

- Event messages + request messages MUST follow project's bus-message naming convention — encode owning service + feature + action, with distinct suffix distinguishing event-kind from request-kind messages. Resolve exact convention + suffixes from `backend-patterns-reference.md`.
- Grep existing examples in source for current stack's message-naming pattern before flagging — codebase convention wins.

**Base classes (BLOCKED):** Verify against bus base types named in `backend-patterns-reference.md` (Phase 0); concrete names are illustrative examples.

- Bus messages MUST extend project's trackable/payload bus-message base — see `backend-patterns-reference.md`.
- Consumers MUST extend project's message-bus consumer base — see `backend-patterns-reference.md`.
- Producers MUST extend project's event-bus-message producer base — see `backend-patterns-reference.md`.

**Upstream/Downstream (BLOCKED):**

- Leader service owns entity data → defines event message for it.
- Follower services consume events — NEVER produce events about data they don't own. — why: producing events about non-owned data forks the source of truth across services.
- NO circular listening: A→B + B→A for same data = boundary violation.
- Consumers MUST implement project's cross-message dependency-wait primitive for cross-message data dependencies — see `backend-patterns-reference.md`.

**Ordered delivery (WARN):**

- Messages requiring ordered processing MUST set project's ordered-delivery / sub-queue partition key to meaningful value (resolve concrete API from `backend-patterns-reference.md`).
- Unordered messages leave it unset / null.

**Reliable publication — dual write (BLOCKED):**

- **NEVER write the database and publish a message as two independent operations.** Any changed flow that commits state AND publishes MUST go through the project's inbox/outbox mechanism or CDC (verify the project's inbox/outbox enablement config — see `backend-patterns-reference.md`). — why: **dual write fails silently in both directions** — DB commits + publish fails ⇒ downstream never learns and diverges forever; publish succeeds + DB rolls back ⇒ phantom downstream data referencing a row that does not exist. Neither failure appears in tests or logs.
- **Consumer idempotency (BLOCKED):** exactly-once DELIVERY is impossible, so at-least-once is what the bus gives you. Every changed consumer MUST be idempotent — dedup on message ID with a TTL, a version/sequence check that discards backward transitions, or a naturally idempotent write (`SET status = 'paid'`, never `balance += x`). Grep the handler for the project's dedup primitive. — why: a non-idempotent consumer produces duplicate side effects — double charge, double email, double shipment — only under redelivery, which is exactly when nobody is watching.
- **Poison message + queue bounds (WARN):** capped retries with exponential backoff **and jitter**, then DLQ; DLQ depth monitored. Flag unbounded queues, uncapped/infinite retry, and unjittered retry (synchronizes into a thundering herd). A DLQ nobody watches is data loss with extra steps.
- **Command-in-event-costume (WARN):** an "event" with exactly ONE permitted consumer that MUST handle it, whose failure means the business flow failed, is a command misnamed as an event — you pay async debugging difficulty AND keep the sync coupling. Flag the naming, route the redesign to `domain-analysis`.
- **Raw-row events (WARN):** publishing internal DB rows/columns as the event contract (CDC with no mapping layer) freezes your schema as a public contract by Hyrum's Law — consumers then depend on columns you can never rename.
- **Durability acknowledgement weakened (BLOCKED when a diff lowers it, WARN when newly introduced):** a change to producer ack mode, replication factor, or min-in-sync-replicas that accepts data loss on leader failure. `acks=1` loses the message when the leader dies before replication; **`acks=all` waits for every replica CURRENTLY in the ISR, so `min.insync.replicas` is the FLOOR that decides whether a shrunken ISR rejects the write or accepts it with no error** — with `min.insync=1` a healthy 3-replica ISR still waits for 3, but durability DEGRADES to `acks=1` the moment the ISR shrinks to the leader alone. Check BOTH values together, never one alone, and flag the degradation path rather than asserting an unconditional equivalence. — why: the config reads as durable while the guarantee is not, and the loss appears only during the failover nobody rehearsed.
- **Ordering/replay assumption unmet (WARN):** a changed consumer that assumes global ordering when the broker gives ordering only per partition key, or that assumes replay is available on a consume-and-gone queue. Verify the required ordering scope (global / per-entity / none) and replay window against the project's broker config. Queue-vs-log semantics → `.claude/docs/architecture-knowledge.md` §10.

**Also verify:**

- NEVER direct cross-service DB access — MUST use message bus. — why: direct DB reach couples services and bypasses ownership boundaries.
- last-sync-timestamp field on message used for conflict resolution in consumers (resolve concrete field from `backend-patterns-reference.md`).
- Event schema changes are backward-compatible (a rolling deploy runs old and new consumers simultaneously) — a breaking schema change with no versioning or compatibility gate is BLOCKED.

**Violation format:**

```
BLOCKED: {filePath}:{line} writes DB then publishes without outbox/CDC — dual write, silent divergence on partial failure
BLOCKED: {filePath}:{line} consumer is not idempotent — no dedup/version check under at-least-once delivery
```

---

### Category 3: CQRS Compliance — Severity: BLOCKED/WARN

**Think:** Is Command+Result+Handler in one file? Is validation using fluent API (not exceptions)? Does DTO own mapping, not the handler? Are side effects in event handlers, not command handlers?

**File organization (BLOCKED):**

- Command + Result + Handler MUST be in ONE file under the command folder for the feature _(resolve concrete folder from project's structure reference / `docs/project-config.json`; e.g. `{command-folder}/{Feature}/`)_
- Query + Result + Handler MUST be in ONE file under the query folder for the feature _(resolve concrete folder from project's structure reference / `docs/project-config.json`; e.g. `{query-folder}/{Feature}/`)_

**Validation (BLOCKED):**

- MUST use project's validation-result fluent API — NEVER throw exceptions for validation; return validation result instead — verify exact type + method names in `backend-patterns-reference.md`. — why: exceptions for expected-invalid input conflate control flow with errors and skip the validation pipeline.
- Sync validation in command's validate hook, async in request-validation hook — see `backend-patterns-reference.md` for hook names.

**DTO mapping (BLOCKED):**

- DTOs MUST own entity mapping via project's DTO base mapping methods — NEVER map in command handlers; map in the DTO instead — see `backend-patterns-reference.md` for method names.

**Side effects (BLOCKED):**

- NEVER put side effects (notifications, sync, cascade updates) in command handlers — place them in Entity Event Handlers instead. — why: side effects in the handler couple the command to downstream concerns and cascade failures.
- Side effects go in Entity Event Handlers under project's event-handler folder _(resolve from project's structure reference / `docs/project-config.json`; e.g. `{event-handler-folder}/`)_
- Each handler = one independent concern (failures don't cascade).

---

### Category 4: Repository Patterns — Severity: BLOCKED

**Think:** Is this using a service-specific repo interface, not the generic one? Are complex queries extracted to RepositoryExtensions?

- MUST use project's service-specific repository abstraction — NEVER the generic root-repository base directly; per-service naming scheme defined in `backend-patterns-reference.md`. — why: the generic base leaks unbounded query surface and erases per-service boundaries.
- Complex queries MUST use project's repository-extension pattern with static expressions _(e.g. `RepositoryExtensions`)_
- All query filter/FK/sort columns MUST have database indexes.

**Violation format:**

```
BLOCKED: {filePath}:{line} uses the generic root-repository base instead of the service-specific repository — see backend-patterns-reference.md for the required naming
```

---

### Category 5: Service Pattern Era (Legacy vs Modern Split) — Severity: BLOCKED (new services) / WARN (existing)

**Think:** When project distinguishes legacy vs modern service patterns (e.g., auth scheme, telemetry stack, permission model, language-version syntax), is this a new service (must follow modern) or an existing legacy service (expect legacy patterns)? Is the modern pattern partially mixed into a legacy service without full migration?

**New services — BLOCKED if any legacy-only pattern used.** Identify project's modern-pattern checklist from injected reference docs (e.g., `project-structure-reference.md`, ADRs, scaffolding templates) and verify every item.

**Existing legacy services — WARN if modern patterns partially mixed without full migration.** Flag legacy patterns only when partial mixing creates inconsistency; in their own consistent context they are expected, NOT violations.

**Determining era:** Read project's reference docs at review time — service-pattern era assignments are project-specific and listed authoritatively there. NEVER hardcode service names in this skill. — why: hardcoded service names rot the moment the project renames or adds a service, and break portability to other repos.

---

### Category 6: Entity Event Handlers — Severity: BLOCKED/WARN

**Think:** Are side effects defined inline in command handlers (wrong) or in project's event-handler folder (correct)? Does each handler have a single concern?

**Location (BLOCKED):**

- Entity event handlers MUST be in project's event-handler folder _(resolve from project's structure reference / `docs/project-config.json`; e.g. `{event-handler-folder}/`)_
- NEVER inline side effects in command handlers — move them to a dedicated entity event handler. — why: inline side effects couple the command to downstream concerns and cascade failures.

**Implementation (BLOCKED):**

- MUST extend project's entity-event application-handler base — see `backend-patterns-reference.md`.
- MUST implement CRUD-action filter hook — see `backend-patterns-reference.md` for hook name.
- One handler = one independent concern.

**Naming (WARN):**

- Convention: `{Action}On{Trigger}EntityEventHandler`
- Grep existing examples before flagging.

**Producer patterns (BLOCKED):**

- Bus message producers MUST extend project's event-bus-message producer base — see `backend-patterns-reference.md`.
- MUST implement message-build + action-filter hooks — see `backend-patterns-reference.md` for hook names.

---

### Category 7: Service Boundaries — Severity: BLOCKED

**Think:** Does any code reach directly into another service's database or project reference? All cross-service data flow MUST go through the message bus.

- NEVER direct DB access to another service's database — route through the message bus. — why: direct DB reach couples services and bypasses ownership boundaries.
- NEVER `using` reference to another service's domain/persistence project — depend on shared message contracts instead.
- Cross-service communication via message bus only (event bus or request bus).
- Shared data through shared message projects, NOT direct references.
- Verify service-to-DB mapping from `project-structure-reference.md`.
- **One writer per dataset (BLOCKED):** every dataset has exactly ONE owning service/module that writes it. Many READERS are fine — via API, replica, or published event stream. Flag any change that adds a second writer to a dataset owned elsewhere. — why: shared write access is shared coupling with NO contract; the data then diverges and no layer owns correctness.
- **Shared domain library (WARN):** a change making many services depend on one shared _domain_ library forces lockstep deploys — that is deployment + semantic coupling, not reuse. Small duplicated DTOs are cheaper; share only genuinely generic technical utilities. Verify against the project's own strategic-DRY decision before flagging.
- **Entity-shaped boundaries (WARN):** a new service/module named for a NOUN (`UserService`, `ProductService`) doing CRUD signals boundaries drawn around data instead of capabilities — it guarantees real use cases must synchronously traverse many services. Flag the smell; route the re-modeling to `domain-analysis`.

**Violation format:**

```
BLOCKED: {filePath}:{line} references {otherService} domain/persistence directly — must use message bus
BLOCKED: {filePath}:{line} writes {dataset} owned by {otherService} — second writer, no contract
```

---

### Category 8: Frontend Architecture (if frontend files in scope) — Severity: BLOCKED/WARN

**Think:** Are components extending the right base class? Is state going through the store? Are subscriptions properly cleaned up?

Verify against `frontend-patterns-reference.md` (Phase 0, frontend files); concrete names are illustrative examples.

- Components MUST extend project's component base classes (BLOCKED) — see `frontend-patterns-reference.md`.
- State MUST use project's view-model store + reactive-effect pattern — NEVER manual signals or direct HTTP client (BLOCKED); route state through the store — see `frontend-patterns-reference.md`.
- API services MUST extend project's API-service base (BLOCKED) — see `frontend-patterns-reference.md`.
- All subscriptions MUST use project's auto-teardown operator — NEVER manual unsubscribe (BLOCKED). — why: manual unsubscribe is forgotten on early-return paths and leaks subscriptions — see `frontend-patterns-reference.md`.
- All template elements MUST carry project's CSS-naming-convention classes (WARN) — see `frontend-patterns-reference.md`.
- Logic in lowest layer: Model > Service > Component (WARN).

> **Boundary with `$ui-review`:** This category owns frontend ARCHITECTURE — base classes, view-model store / reactive-effect pattern, API-service base, subscription teardown, layer placement, CSS-naming-class presence. VISUAL/styling quality — long-content overflow, responsive multi-screen flex, flex-vs-fixed sizing, z-index discipline, SCSS/CSS detail — owned by `$ui-review`, which `$changes-review` invokes as its UI dimension when frontend changes present. Flag missing base classes / store / teardown here; defer SCSS-quality depth + visual-layout findings to ui-review to avoid double-reporting.

---

### Category 9: ADR / Recorded-Decision Conformance (if `docs/adr/**` or recorded ADRs exist) — Severity: BLOCKED/WARN

**Think:** Does any changed file contradict a binding decision recorded in an _accepted_ ADR — a rejected library/technology, a forbidden dependency direction, a recorded quality-attribute/NFR budget, a banned pattern — without a superseding ADR?

> This category closes design→review loop: `$architecture-design` emits ADRs + fitness-function choices; this category verifies changed code still conforms to them. Checks CONFORMANCE only — NEVER re-runs deep performance or security analysis (those route to siblings in the Ownership & Handoff matrix).

- Locate recorded decisions: `docs/adr/**` (or ADR location named in project's reference docs). Read only ADRs with `Status: Accepted` — skip `Superseded`/`Proposed`/`Rejected`.
- Extract each accepted ADR's binding constraints: chosen vs rejected options, layer/dependency rules, NFR targets (latency/throughput/availability/RPO-RTO), banned patterns.
- Per changed file, check conformance against those constraints — grep the diff for reintroduced rejected options or forbidden references; cite `file:line`.
- **BLOCKED** when change contradicts an accepted ADR's binding decision and no superseding ADR exists. Correct way to change a recorded decision = new superseding ADR (per `docs/adr/0001` lifecycle), NEVER a silent violation in the diff. — why: silent ADR violations erode the decision record and let rejected options creep back unreviewed.
- **WARN** when change drifts from a recorded guideline, or is NFR-impacting against a recorded budget — flag it and route depth check to `performance-review`/`security-review`.
- **New one-way door with NO ADR (WARN, or BLOCKED when the project mandates ADRs):** when the diff makes a decision that is expensive to REVERSE and no ADR records it, flag it. One-way doors: a new data model or primary-key strategy · a tenancy-model change · a consistency-model change on a read path · a NEW sync-vs-async choice at a boundary · a new public API or event contract · a new service boundary · a new cloud-primitive lock-in · an auth/identity model change · a data residency or retention decision. — why: an unrecorded irreversible decision cannot be enforced by this category later, and the next engineer relitigates or silently breaks it.
- No ADRs exist → record "No recorded ADRs — conformance N/A" and skip (this category NEVER blocks a project that has chosen not to keep ADRs). Do NOT retroactively demand ADRs for pre-existing decisions on a change-level review — scope to what the diff decides.

**Violation format:**

```
BLOCKED: {filePath}:{line} contradicts {adr-id} ("{decision}") with no superseding ADR
WARN: {filePath}:{line} makes a hard-to-reverse decision ({decision}) with no recorded ADR
```

---

### Category 10: Spec-Loop Discipline (applies across all categories) — Severity: BLOCKED/WARN

**Think:** Does each behavior-affecting architecture finding feed BOTH the spec and a guarding test, or only the code? Does any [HARD] rule or cross-boundary invariant ship with no property TC?

- BLOCKED when a `[HARD]` architecture rule or cross-boundary invariant (layer contract, message-ownership rule, CQRS/repo invariant, service-boundary guarantee) has **no universally-quantified property TC + boundary counter-case** — an example-only test does not guard a rule that must hold for ALL inputs.
- Every behavior-affecting architecture finding MUST carry a **Dual-Feedback row** (spec axis + test axis): the spec NAMES the changed contract/invariant AND a test GUARDS it — blank either axis = INCOMPLETE; NEVER record an architecture finding as code-only.
- Review the whole package — spec + tests + structural diff — NOT the structural diff alone; loop until zero new spec-loop gaps remain, each cycle enriching the spec. — why: a boundary change that compiles but is never asserted regresses silently the next time a sibling service is touched.

**Violation format:**

```
BLOCKED: {filePath}:{line} [HARD] {rule/invariant} has no property TC (spec axis: {present/blank} | test axis: {present/blank})
```

---

### Category 11: Scalability & Coupling Regression — Severity: BLOCKED/WARN

> **Diff-scoped regression guard, NOT a project audit.** This category catches architecture/scalability regressions a change _introduces_; it does NOT re-grade the whole system. Init/on-demand grading of all 10 scorecard areas is owned by `architecture-scalability-review`. Cross-cutting spec-loop discipline (Category 10) also applies to findings from this category. Cross-references Category 7 (service boundaries) and Category 9 (ADR / recorded-decision conformance).

**Think:** Does this diff introduce a new **sync cross-context** call, shared-DB reach, statefulness, or copy-pasted cross-context logic that regresses module isolation, loose coupling, or horizontal scaling — turning a clean boundary into **distributed-monolith** coupling?

**Workload evidence gate (before any scalability verdict):** derive read/write ratio · sustained/peak RPS/events · dominant query/write shapes · dataset size/growth · payload size · burst duration · hot-key/tenant skew · user regions · p95/p99 + SLO/RPO/RTO · consistency/staleness budget. If the project records none, state `scale profile unknown`, keep technique observations INFO/advisory, and route measurement depth to `performance-review`/`production-readiness-review` — NEVER invent a high-scale requirement.

**Judge the FOUR coupling dimensions SEPARATELY — low code coupling proves nothing on its own:**

| Dimension                    | Question                                                                        | Evidence to pull                                     |
| ---------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Code**                     | Who imports whom? Any cycle?                                                    | Import graph / `trace --direction both`              |
| **Temporal (runtime)**       | Must both be UP at once? A sync chain makes your SLO the PRODUCT of the chain's | Call graph across the boundary, sync vs async        |
| **Semantic (contract)**      | Does a change in their MEANING force a change in mine?                          | Shared schema, shared entity/domain lib, shared enum |
| **Operational (deployment)** | Must these ship TOGETHER? If yes they ARE one service                           | Release coordination, shared version pin             |

> **Distributed-monolith signature (BLOCKED when the diff moves the system toward it):** LOW code coupling + HIGH temporal + semantic + deployment coupling. Concrete detection: services that must release together · a shared database or shared entity/domain library · a request synchronously traversing ≥4 services · one team blocked by another's deploy · "we roll back all services together." — why: it pays every distributed cost and buys none of the benefits; it is the most expensive and most common modern architecture failure, and every diff that deepens it makes the exit harder.

- **BLOCKED** when a change adds a NEW forbidden cross-context dependency, a circular context dependency, or a direct **sync cross-context** call where the recorded architecture requires an event/message or an owned contract (producer calling consumer directly — "I call you" instead of "you listen to me").
- **BLOCKED** when the diff adds a NEW outbound network call, lock or long query with **no timeout** — a missing timeout is the single most common resilience defect, and the dangerous dependency failure is SLOW, not down: it exhausts your pool while every health check stays green. Also flag uncapped or unjittered retries on the new call, and retries on a NON-idempotent operation.
- **BLOCKED** when the diff deepens a synchronous chain to ≥4 hops, or adds a sync hop to a path the recorded architecture requires to be async. Availability MULTIPLIES down a sync chain (five 99.9% deps ⇒ ~99.5%) and latency SUMS.
- **WARN** for a new connascence of **Value** or **Timing** ACROSS a boundary (two services that must change a value together, or that depend on execution order). That is a BOUNDARY error, not a bug to patch — either the invariant belongs in one transactional boundary, or it must be made eventual ON PURPOSE with a designed compensating action. Route the redesign to `domain-analysis`.
- **BLOCKED** when a change makes a previously **stateless**/scalable path stateful in a way that breaks horizontal scaling — in-memory session/cache assumed node-local, sticky-instance state, a new SPOF, or unbounded fan-out on a hot path — where the ADR/scale budget requires statelessness.
- **BLOCKED** when a change contradicts a recorded availability target by adding a single-instance load balancer/cache/queue/database or failover path with no redundant authority/health routing. **WARN** when a new replicated topology omits its sync/async/quorum acknowledgement, promotion authority, RPO/RTO, or multi-primary conflict rule. — why: replication without failure semantics is a copy, not a high-availability design.
- **WARN** when a diff changes public work from synchronous completion to queued/background processing but still reports success as completed, with no accepted/pending/succeeded/failed state, status lookup/callback, or terminal-failure owner. — why: fast acknowledgement is not completed work; hiding this creates false success and invisible backlog.
- **WARN** when a new cache/CDN path has no authoritative source, cache policy, invalidation/TTL+purge strategy, cache-key dimensions (`Vary`, identity/tenant/permission), max size/eviction, or warranted stampede/hot-key/cold-start protection. Route hit-rate/query depth to `performance-review`; keep cross-tenant key omission in Category 12. — why: caching moves load and consistency obligations; it does not erase them.
- **WARN** when a change jumps to partitioning/sharding, multi-region writes, or another datastore without evidence that query/index/pool tuning, caching, available vertical headroom, and read replicas/read models cannot meet the target. Require query-aligned distribution, hotspot analysis, resharding and cross-shard transaction/query consequences; route benchmark depth to `performance-review`. — why: sharding is the hardest database scale choice to reverse.
- **WARN** for **cross-context duplication** (copy-pasted domain rule/util across contexts — a DRY regression), a new shared-DB read across a boundary, or a distributed-monolith smell with weaker evidence; record the smell and route the deep fix.
- **Detect-only smells → route, do NOT deep-analyze here:** local hot-path/query/N+1 latency → `performance-review`; rollout/capacity/SRE/runtime readiness → `production-readiness-review`; bounded-context / aggregate re-modeling → `domain-analysis`; auth/secret/tenant-boundary coupling → `security-review`. This category flags the regression at `file:line`; the sibling owns the depth. — why: a diff reviewer that re-runs full capacity/DDD analysis blows its context and duplicates the sibling's job.
- Behavior-affecting findings carry a Dual-Feedback row (spec axis + test axis) per Category 10 — a coupling/scaling regression that changes a contract MUST enrich BOTH the spec AND a guarding test, never code-only.

**Violation format:**

```
BLOCKED: {filePath}:{line} new sync cross-context call to {context} — recorded architecture requires event/message (route deep coupling design to domain-analysis)
WARN: {filePath}:{line} cross-context duplication of {rule/util} — DRY regression (route shared-lib decision to architecture-scalability-review / scaffold)
```

**Technique applicability (advisory — INFO, does NOT alter this category's verdict):** When the diff touches a scale-sensitive surface, invoke `SYNC:scale-technique-gate` — derive the scale tier from evidence, then emit the Technique Applicability Matrix as an **INFO/advisory** block noting warranted-but-missing techniques and any `OVER-ENGINEERED` ones. This is guidance only: it is NEVER a BLOCKED/WARN finding, does NOT change the Category 11 severity, and does NOT feed the Phase 4 verdict table. A `MISSING-WARRANTED` technique is advice to consider, not a regression. Full catalog → `.claude/docs/scale-technique-catalog.md`.

---

### Category 12: Data, Consistency & Tenancy Boundaries — Severity: BLOCKED/WARN

> **Diff-scoped, and the LEAST reversible category.** Data outlives every service, framework and team: a defect here is a future data migration, a silent divergence, or a cross-tenant breach — never a simple refactor. Skip ONLY when the diff touches no persistence, no consistency boundary, no message consumer and no tenant-scoped data. Overlaps by design with Category 2 (dual write / idempotency at the messaging layer) and Category 7 (dataset writer ownership) — record the finding ONCE in the category that owns the mechanism, and cross-reference.

**Think:** Does this diff write state and publish without atomicity? Can it be replayed safely? **Is the isolation level named, and is every check-then-act invariant actually protected?** Does any lock or leadership claim carry a fencing token? Does every query and cache key carry the tenant? Does a schema change survive a rolling deploy? Is any read path newly stale with no declared budget? Does replication/failover preserve the stated RPO, and does the storage substrate match the access pattern?

**Consistency & atomicity (BLOCKED):**

- **Dual write** — state committed to the DB _and_ a message/webhook/second-store write performed as two independent operations, with no outbox/CDC. Cross-reference Category 2. — why: it diverges silently in both directions and no test catches it.
- **Non-idempotent consumer or mutation** — a changed message handler or unsafe endpoint with no dedup key, version check, or naturally idempotent write, under at-least-once delivery or client retry. Cross-reference Category 2.
- **Cross-network transaction** — a database transaction held OPEN across an HTTP/RPC/queue call. Locks held during I/O convert one slow dependency into a database-wide stall.
- **2PC/XA introduced across services** — flag it; the correct shape is saga + outbox + compensation. And a compensation must be a NEW BUSINESS FACT (`RefundIssued`), not a pretend rollback of a real-world side effect.
- **Unprotected check-then-act (write skew / lost update)** — a changed path that READS state, decides, then WRITES based on that read, inside a transaction at Read Committed or snapshot isolation, with no protecting mechanism. **Neither Read Committed nor snapshot isolation prevents write skew**: two concurrent transactions both pass the check and both write. The change is correct only if it uses ONE of: a DB **constraint** (unique/check/exclusion) · `SELECT … FOR UPDATE` on the rows read · **Serializable** isolation _with_ app-side handling of serialization failures · a single atomic conditional write (`UPDATE … WHERE version = n` / `WHERE stock > 0`). Grep the changed handler for the project's transaction/isolation primitive and 3+ existing examples before flagging. Anomaly table → `.claude/docs/architecture-knowledge.md` §8. — why: this is the classic on-call data-corruption bug — it passes every single-user test and fires only under production concurrency.
- **Range invariant guarded by row locks** — an invariant over rows that DO NOT YET EXIST (no double-booking, no overlapping interval, at most N per tenant) cannot be protected by locking the rows you read. Requires a constraint, an exclusion index, a materializing lock row, or Serializable. NEVER accept "we check before inserting" as protection.
- **Unfenced distributed lock / leader election** — a changed flow that takes a distributed lock or relies on leadership without a **monotonic fencing token the storage layer rejects when stale**, a stated lease duration, and defined behaviour when the lease expires mid-operation. A GC or VM pause makes a dead holder believe it is still the holder ⇒ split brain. Also flag consensus/quorum cluster SIZING: quorum is `⌊N/2⌋+1`, so an even-sized cluster tolerates no more failures than the odd size below it (4 tolerates 1, same as 3) while paying an extra node and a larger quorum, and a **2-node cluster tolerates ZERO** failures — strictly worse than 1 node. Flag the wasted/harmful sizing; NEVER claim an even-sized cluster cannot reach a majority or make progress. — why: an unfenced lock fails exactly once — under the pause, at peak, writing corrupted state — and it looks correct in every test.
- **Wall-clock ordering or expiry (WARN, BLOCKED when correctness depends on it)** — ordering distributed events, resolving conflicts, or computing lock/lease expiry from a wall clock (`now()`, request timestamps from another host). Use per-entity versions/sequences, logical/Lamport or vector clocks, an HLC, or a bounded-uncertainty clock; measure elapsed time with a MONOTONIC clock. Also flag a new multi-leader/multi-region write path with no named conflict-resolution rule. — why: clocks in a distributed system disagree without bound, so "latest timestamp wins" silently discards writes.

**Staleness (WARN):**

- A newly eventually-consistent read path with **no declared, monitored staleness budget** — unbounded, unmeasured lag IS the defect.
- A read-after-write path newly routed to a replica with no **read-your-writes** guarantee (sticky read / read-from-primary / version token). Most user-visible "consistency bugs" are this, not missing linearizability.
- A replication/failover change with no declared acknowledgement semantics or data-loss window: synchronous replication buys lower RPO with write latency/availability cost; asynchronous replication buys latency with lag/failover loss risk; quorum must name read/write thresholds; multi-primary must name conflict resolution. Route runtime failover drills to `production-readiness-review`.

**Tenant isolation (BLOCKED — treat as a security-adjacent defect):**

- A tenant-scoped query, repository method, projection, background job, export or report with **no tenant predicate**, where the project's mechanism (row-level security / ORM global filter / mandatory repository base) does not automatically apply it. **One missing `WHERE tenant_id = ?` is a cross-tenant breach that passes every functional test.**
- `tenant_id` (or user/role/price) taken from a **client-supplied field** rather than the authenticated principal. Cross-reference `security-review` for authz depth — this category owns only the BOUNDARY placement.
- A cache, memo, or shared in-memory map keyed WITHOUT the tenant/identity/permission dimension. **Cache-key omission is a recurring cross-tenant leak vector that no functional test detects.**
- **WARN** when a tenant-isolation change lands with no test asserting a cross-tenant read returns ZERO rows (the fitness function from Category 0).

**Migrations & schema (BLOCKED):**

- A **breaking schema change in one deploy** — column/table dropped or renamed, type narrowed, or NOT NULL added without a default — while the deployment strategy is rolling/canary. Both versions run simultaneously; this breaks old pods and makes rollback impossible. The required shape is **expand–contract**: add nullable → dual write → backfill → switch reads → stop writing old → drop, in separate deploys.
- A migration that is not forward-only/idempotent, or that blocks writes on a large table with no online/batched strategy.

**Data-access structure (WARN — route depth to `performance-review`):**

- Unbounded query with no DB-side filter or pagination on a path whose result set grows with data (OOM and latency both scale with the table). **Check row COUNT before row SIZE** — pushing the filter to the DB beats projecting columns.
- Deep `OFFSET` pagination where keyset/cursor is available; a new query filter/FK/sort column with no index; analytics query newly added against the OLTP primary.
- Composite index whose ordered prefix does not match the changed filter/join/sort shape, or an added index with no write-cost/plan evidence. Route plan/selectivity depth to `performance-review`.
- Distributed cache treated as source of truth (data unrecoverable after eviction/restart), a new unbounded cache, or a cache with no invalidation/consistency contract.
- A new denormalized copy with no named mechanism keeping it correct.
- A new shard/partition key with no evidence of uniform distribution + query alignment, no hot-key/whale-tenant analysis, or no resharding plan; sharding added before earlier scaling rungs are proven insufficient.
- Large immutable blobs/media/backups placed in the transactional database/block volume without access-pattern justification or object-storage comparison; database files placed on object storage without a database-supported abstraction. Block storage fits DB/filesystem random I/O; object storage fits keyed blobs and archival scale; shared file storage fits required filesystem semantics. — why: application data type and physical storage substrate are different decisions.

**Lifecycle (WARN):**

- New PII/PHI/PCI-class field with no classification, retention, residency or deletion story — retrofitting erasure into a denormalized or event-sourced store is brutally expensive, and erasure conflicts with immutable event stores by design.
- New public identifier exposing an internal sequential PK (enumerable, leaks volume).

**Violation format:**

```
BLOCKED: {filePath}:{line} writes {store} then publishes {message} without outbox/CDC — dual write
BLOCKED: {filePath}:{line} tenant-scoped query has no tenant predicate and no enforced filter — cross-tenant read possible
BLOCKED: {filePath}:{line} cache key omits tenant/identity dimension ({key}) — cross-tenant leak
BLOCKED: {migrationFile}:{line} drops/renames {column} in one deploy under rolling release — use expand–contract
BLOCKED: {filePath}:{line} check-then-act at {isolationLevel} with no constraint/FOR UPDATE/Serializable/conditional write — write skew possible
BLOCKED: {filePath}:{line} distributed lock taken with no fencing token or lease-expiry handling — split brain possible
WARN: {filePath}:{line} orders/expires distributed events by wall clock — use versions/sequences or a logical clock
WARN: {filePath}:{line} new eventually-consistent read path with no declared staleness budget or SLI
WARN: {filePath}:{line} adds sharding before earlier scaling rungs are proven insufficient or without a reshard/hot-key plan
WARN: {filePath}:{line} cache/CDN path has no authoritative source + invalidation/key/eviction contract
```

**MUST ATTENTION** every Category-12 finding still obeys the evidence gate: read the actual query/handler/migration, grep 3+ existing examples of the project's tenant-filter and outbox primitives, and confirm the mechanism is NOT already applied automatically at a lower layer before flagging. — why: projects that enforce tenancy in a repository base or via row-level security will show no predicate at the call site and are CORRECT — flagging those is the highest-noise false positive available in this category.

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

| Verdict     | Condition                                       |
| ----------- | ----------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge     |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide |
| **PASS**    | 0 BLOCKED, 0 WARN — architecture compliant      |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Services affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Architecture Health Summary

- Quality Tooling Baseline: {PASS/WARN/BLOCKED}
- Clean Architecture: {PASS/WARN/BLOCKED}
- Messaging Patterns: {PASS/WARN/BLOCKED}
- CQRS Compliance: {PASS/WARN/BLOCKED}
- Repository Patterns: {PASS/WARN/BLOCKED}
- Service Pattern Era: {PASS/WARN/BLOCKED}
- Entity Event Handlers: {PASS/WARN/BLOCKED}
- Service Boundaries: {PASS/WARN/BLOCKED}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
- ADR / Recorded-Decision Conformance: {PASS/WARN/BLOCKED/N/A}
- Spec-Loop Discipline (property-TC + dual-feedback): {PASS/WARN/BLOCKED}
- Scalability & Coupling Regression (4 coupling dimensions): {PASS/WARN/BLOCKED}
- Data, Consistency & Tenancy Boundaries: {PASS/WARN/BLOCKED/N/A}
- Technique applicability (advisory — INFO, does NOT alter verdict): {matrix summary or N/A-by-scale}
```

> The "Technique applicability" line is **advisory/INFO only** — it reports the scale-tier technique matrix as guidance and NEVER changes any category severity or the Phase 4 verdict.

---

## Architecture Boundary Check (Automated)

Per changed file:

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries`
2. Determine layer — match file path against each rule's `paths` glob patterns
3. Scan imports — grep for configured language's import/include statements
4. Check violations — import path contains layer name in `cannotImportFrom` = violation
5. Exclude framework — skip files matching `architectureRules.excludePatterns`
6. BLOCK on violation: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

`architectureRules` absent from project-config.json → skip silently.

---

## Systematic Review Protocol (10+ changed files)

1. **Categorize** — Group files by service/layer/concern.
2. **Parallel Sub-Agents** — Launch one `architect` sub-agent per category with architecture-specific checklist.
3. **Synchronize** — Collect findings, cross-reference service boundaries.
4. **Consolidate** — Single holistic report with per-category verdicts.

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff — catch over-flagged Highs, false positives, severity inflation at source, not downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `$why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **why-review demotes/removes any finding →** UPDATE own finalized report with revised severities, remove false positives, add `## Why-Review Validation Notes` section citing what changed + why.
5. **why-review confirms all findings →** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Self-audit your OWN findings FIRST (before invoking why-review):** run the 11 thinking red flags in `.claude/docs/architecture-knowledge.md` §20.3 against each draft finding and each recommendation. The four that fire most often in this skill: **you cannot name what your recommendation SACRIFICES** · **you say "best practice" instead of naming the forces it balances** · **you flagged a scale problem you cannot evidence** · **you are treating a two-way door as irreversible**. Any hit invalidates the REASONING — demote or delete the finding, do not reword it. — why: a finding that survives only because it sounds authoritative consumes the team's fix budget and trains them to ignore the report.

**Skip conditions (record explicit reason if skipping):**

- Verdict unconditional PASS with zero findings → log "Skipped — no findings to validate".
- Why-review skill itself is active context (avoid recursion).

**Why this exists:** AI sub-agent reports inherit confirmation bias — orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3. Codified as standard practice.

---

## Next Steps

**MANDATORY — NO EXCEPTIONS:** After completing, use ask the user directly to present:

- **"$code-simplifier" (Recommended)** — Simplify and refine code
- **"$code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

> **Combined audit:** For a whole-project architecture + compliance + production-readiness audit in one pass, run `$architecture-review-full` (or `$start-workflow workflow-architecture-audit`) — it fans out this skill, `architecture-scalability-review`, and `production-readiness-review` as parallel sub-agents and synthesizes one consolidated report.

## AI Agent Integrity Gate (NON-NEGOTIABLE)

Before reporting ANY work done:

1. **Grep every removed name.** Extraction/rename/delete → grep confirms 0 dangling refs across ALL file types.
2. **Ask WHY before changing.** Existing values intentional until proven otherwise — NEVER "fix" without traced rationale.
3. **Verify ALL outputs.** One build passing ≠ all builds passing — check every affected stack.
4. **Evaluate pattern fit.** Copying nearby code? Verify preconditions match — same scope, lifetime, base class, constraints.
5. **New artifact = wired artifact.** Created something? Prove registered, imported, reachable by all consumers.

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting. Simple tasks: ask user whether to skip.

<!-- OVERRIDE:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle, or when the user/workflow explicitly requests an independent high-risk architecture synthesis pass. A review pass that finds issues triggers validation first; it does NOT trigger a fresh-context pass over the same findings before validation/fix.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn a NEW `spawn_agent` tool call — use `architect` agent_type for architecture reviews (see Sub-Agent Type Override above)
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns a NEW `spawn_agent` call
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full review restart after a validated fix cycle — every fix invalidates the prior verdict
> - Continue until a complete full review pass has zero findings; if the same blocker repeats across 2 full invocations with no progress, escalate by asking the user directly
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /OVERRIDE:fresh-context-review -->

## Sub-Agent Type Override

> **MANDATORY:** Architecture reviews spawn `architect` sub-agent, NOT `code-reviewer`.
> Keep `agent_type: "architect"` from canonical template below; NEVER revert to `code-reviewer`.
> **Rationale:** `architect` carries cross-service impact analysis, ADR creation, multi-service security/performance context that `code-reviewer` lacks for architecture-level decisions.

<!-- OVERRIDE:review-protocol-injection -->

> **Review Protocol Injection** — Every fresh sub-agent review prompt MUST embed 11 protocol blocks VERBATIM. The template below has ALL 11 bodies already expanded inline. Copy the template wholesale into the Agent call's `prompt` field at runtime, replacing only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific values. Do NOT touch the embedded protocol sections.
>
> **Why inline expansion:** Placeholder markers would force file-read indirection at runtime. AI compliance drops significantly behind indirection (see `SYNC:shared-protocol-duplication-policy`). Therefore the template carries all 11 protocol bodies pre-embedded.

### Subagent Type Selection

- `architect` — ALWAYS for architecture reviews (cross-service, ADR, security/performance at system level)
- `code-reviewer` — for code quality reviews only (NOT architecture)

### Canonical Agent Call Template (Copy Verbatim)

```
spawn_agent({
  description: "Fresh Round {N} review",
  agent_type: "architect",
  prompt: `
## Task
{review-specific task — e.g., "Review all uncommitted changes for code quality" | "Review plan files under {plan-dir}" | "Review integration tests in {path}"}

## Round
Round {N}. You have ZERO memory of prior rounds. Re-read all target files from scratch via your own tool calls. Do NOT trust anything from the main agent beyond this prompt.

## Protocols (follow VERBATIM — these are non-negotiable)

### Spec ↔ Tests ↔ Code Triangulation
DO THIS FIRST — before any per-protocol check below. The review target is the WHOLE PACKAGE, not the diff alone: load the behavior's spec (§3 ACs / §4 BRs / §8 TCs), its tests, and the changed code TOGETHER, and reason about their mutual consistency BEFORE judging any one in isolation.
1. Locate all three faces: the Feature Spec section(s) governing the changed behavior, the tests that guard it, and the production code that implements it. A missing face is itself a finding (SPEC-GAP / TEST-GAP / DEAD-SPEC).
2. Triangulate pairwise — every disagreement is a finding; classify which face is wrong:
   - code vs spec: behavior the code does that no §3/§4/§8 rule describes → CODE-EXTRA or SPEC-STALE; a [HARD] §4 rule or §5 invariant with no enforcing code path → CODE-WRONG.
   - tests vs spec: a §8 TC with no test, or a test asserting behavior no TC/rule names → TEST-GAP or SPEC-SILENT.
   - tests vs code: a changed code path with no covering test → TEST-GAP; a test that still passes against a deliberately broken invariant → WEAK-TEST (apply the mutation thinking in Bug Detection).
3. Hidden-rule capture: any invariant the code enforces but the spec never states (SPEC-SILENT) MUST be surfaced as a finding to add into §3/§4/§8 AND guarded with a test — the enrichment loop, never a silent pass.
4. Only after the three faces agree — or every disagreement is logged as a finding — proceed to the per-protocol checks below; when enrichment adds spec/test content, re-review the package against the enriched spec.
NEVER mark review PASS while any spec/test/code face disagrees without a logged finding. The diff is the entry point; the package is the unit of judgment.

### Evidence-Based Reasoning
Speculation is FORBIDDEN. Every claim needs proof.
1. Cite file:line, grep results, or framework docs for EVERY claim
2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
3. Cross-service validation required for architectural changes
4. "I don't have enough evidence" is valid and expected output
BLOCKED until: Evidence file path (file:line) provided; Grep search performed; 3+ similar patterns found; Confidence level stated.
Forbidden without proof: "obviously", "I think", "should be", "probably", "this is because".
If incomplete → output: "Insufficient evidence. Verified: [...]. Not verified: [...]."

### Bug Detection
MUST check categories 1-4 for EVERY review. Never skip.
1. Null Safety: Can params/returns be null? Are they guarded? Optional chaining gaps? .find() returns checked?
2. Boundary Conditions: Off-by-one (< vs <=)? Empty collections handled? Zero/negative values? Max limits?
3. Error Handling: Try-catch scope correct? Silent swallowed exceptions? Error types specific? Cleanup in finally?
4. Resource Management: Connections/streams closed? Subscriptions unsubscribed on destroy? Timers cleared? Memory bounded?
5. Concurrency (if async): Missing await? Race conditions on shared state? Stale closures? Retry storms?
6. Stack-Specific: Check the configured language/runtime pitfalls and framework-specific failure modes discovered from local code.
Classify: CRITICAL (crash/corrupt) → FAIL | HIGH (incorrect behavior) → FAIL | MEDIUM (edge case) → WARN | LOW (defensive) → INFO.

### Design Patterns Quality
Priority checks for every code change:
1. DRY via OOP: Same-suffix classes (*Entity, *Dto, *Service) MUST share base class. 3+ similar patterns → extract to shared abstraction.
2. Right Responsibility: Logic in LOWEST layer (Entity > Domain Service > Application Service > Controller). Never business logic in controllers.
3. SOLID: Single responsibility (one reason to change). Open-closed (extend, don't modify). Liskov (subtypes substitutable). Interface segregation (small interfaces). Dependency inversion (depend on abstractions).
4. After extraction/move/rename: Grep ENTIRE scope for dangling references. Zero tolerance.
5. YAGNI gate: NEVER recommend patterns unless 3+ occurrences exist. Don't extract for hypothetical future use.
Anti-patterns to flag: God Object, Copy-Paste inheritance, Circular Dependency, Leaky Abstraction.

### Logic & Intention Review
Verify WHAT code does matches WHY it was changed.
1. Change Intention Check: Every changed file MUST serve the stated purpose. Flag unrelated changes as scope creep.
2. Happy Path Trace: Walk through one complete success scenario through changed code.
3. Error Path Trace: Walk through one failure/edge case scenario through changed code.
4. Acceptance Mapping: If plan context available, map every acceptance criterion to a code change.
5. Tests Verify Intent: For test/spec changes, verify tests name the protected business rule or invariant and would fail if that intent breaks.
6. Migration Test Exclusion: Do not write tests for migration code. Schema/data migrations are one-time execution paths, not core application logic.
NEVER mark review PASS without completing both traces (happy + error path).

### Test Spec Verification
Map changed code to test specifications.
1. Identify the project's test/spec format from existing docs, test-case files, BDD feature files, or spec folders.
2. Every changed code path MUST map to a corresponding test case/spec (or flag as "needs test case").
3. New functions/endpoints/handlers → flag for test spec creation.
4. Migration files are excluded from test/spec creation; schema/data migrations are one-time execution paths, not core application logic.
5. If spec evidence fields exist, verify they point to actual code (file:line, not stale references).
6. Verify each meaningful test case names the business intent/invariant; flag behavior-only cases that only mirror implementation details.
7. Auth/data changes → verify corresponding authorization and data-state test cases exist.
8. If no specs exist for a changed path → log the gap and recommend the project's test-spec workflow.
NEVER skip test mapping. Untested code paths are the #1 source of production bugs.

### Behavioral Delta Matrix
MANDATORY for any bugfix review. Produce input-state × pre-fix × post-fix × delta table BEFORE writing verdict.
- Minimum 3 rows; include at least one row OUTSIDE the original bug report.
- Any "REGRESSION" delta → review returns FAIL until a preservation test is added.
- Narrative descriptions do NOT substitute for the matrix.
Example rows (external-record sync fix):
| Input                 | Pre-fix | Post-fix                  | Delta      |
| --------------------- | ------- | ------------------------- | ---------- |
| Record exists (valid) | Reused  | Always recreated → orphan | REGRESSION |
| Record missing (404)  | Error   | Recreated                 | Fixed      |

### Fix-Layer Accountability
NEVER fix at the crash site. Trace the full flow, fix at the owning layer. The crash site is a SYMPTOM, not the cause.
MANDATORY before ANY fix:
1. Trace full data flow — Map the complete path from data origin to crash site across ALL layers (storage → backend → API → frontend → UI). Identify where bad state ENTERS, not where it CRASHES.
2. Identify the invariant owner — Which layer's contract guarantees this value is valid? Fix at the LOWEST layer that owns the invariant, not the highest layer that consumes it.
3. One fix, maximum protection — If fix requires touching 3+ files with defensive checks, you are at the wrong layer — go lower.
4. Verify no bypass paths — Confirm all data flows through the fix point. Check for direct construction skipping factories, clone/spread without re-validation, raw data not wrapped in domain models, mutations outside the model layer.
BLOCKED until: Full data flow traced (origin → crash); Invariant owner identified with file:line evidence; All access sites audited (grep count); Fix layer justified (lowest layer that protects most consumers).
Anti-patterns (REJECT): "Fix it where it crashes" (crash site ≠ cause site, trace upstream); "Add defensive checks at every consumer" (scattered defense = wrong layer); "Both fix is safer" (pick ONE authoritative layer).

### Rationalization Prevention
AI skips steps via these evasions. Recognize and reject:
- "Too simple for a plan" → Simple + wrong assumptions = wasted time. Plan anyway.
- "I'll test after" → RED before GREEN. Write/verify test first.
- "Already searched" → Show grep evidence with file:line. No proof = no search.
- "Just do it" → Still need task tracking. Skip depth, never skip tracking.
- "Just a small fix" → Small fix in wrong location cascades. Verify file:line first.
- "Code is self-explanatory" → Future readers need evidence trail. Document anyway.
- "Combine steps to save time" → Combined steps dilute focus. Each step has distinct purpose.

### Graph-Assisted Investigation
MANDATORY when .code-graph/graph.db exists.
HARD-GATE: MUST run at least ONE graph command on key files before concluding any investigation.
Pattern: Grep finds files → trace --direction both reveals full system flow → Grep verifies details.
- Investigation/Scout: trace --direction both on 2-3 entry files
- Fix/Debug: callers_of on buggy function + tests_for
- Feature/Enhancement: connections on files to be modified
- Code Review: tests_for on changed functions
- Blast Radius: trace --direction downstream
CLI: python .claude/scripts/code_graph {command} --json. Use --node-mode file first (10-30x less noise), then --node-mode function for detail.

### Understand Code First
HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
1. Search 3+ similar patterns (grep/glob) — cite file:line evidence.
2. Read existing files in target area — understand structure, base classes, conventions.
3. Run python .claude/scripts/code_graph trace <file> --direction both --json when .code-graph/graph.db exists.
4. Map dependencies via connections or callers_of — know what depends on your target.
5. Write investigation to .ai/workspace/analysis/ for non-trivial tasks (3+ files).
6. Re-read analysis file before implementing — never work from memory alone.
7. NEVER invent new patterns when existing ones work — match exactly or document deviation.
BLOCKED until: Read target files; Grep 3+ patterns; Graph trace (if graph.db exists); Assumptions verified with evidence.

## Reference Docs (READ before reviewing)
- docs/project-reference/code-review-rules.md
- {skill-specific reference docs — e.g., integration-test-reference.md for integration-test-review; backend-patterns-reference.md for backend reviews; frontend-patterns-reference.md for frontend reviews}

## Target Files
{explicit file list OR "run git diff to see uncommitted changes" OR "read all files under {plan-dir}"}

## Output
Write a structured report to plans/reports/{review-type}-round{N}-{date}.md with sections:
- Status: PASS | FAIL
- Issue Count: {number}
- Critical Issues (with file:line evidence)
- High Priority Issues (with file:line evidence)
- Medium / Low Issues
- Cross-cutting findings

Return the report path and status to the main agent.
Every finding MUST have file:line evidence. Speculation is forbidden.
`
})
```

### Rules

- DO copy the template wholesale — including all 11 embedded protocol sections
- DO replace only the `{placeholders}` in Task / Round / Reference Docs / Target Files / Output sections with context-specific content
- DO choose `architect` agent_type for architecture reviews — do NOT revert to `code-reviewer` (see Sub-Agent Type Override above)
- DO NOT paraphrase, summarize, or skip any protocol section
- DO NOT pass file contents inline — the sub-agent reads via its own tool calls so it has a fresh context
- DO NOT reference protocols by file path or tag name — the bodies are already embedded above
- DO NOT introduce placeholder markers for the protocols — they must stay literally expanded

<!-- /OVERRIDE:review-protocol-injection -->

> **Critical Purpose:** Architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.
> **External Memory:** Complex/lengthy work → write findings to `plans/reports/`. Prevents context loss, serves as deliverable.
> **Evidence Gate:** MANDATORY — every finding requires `file:line` proof + confidence percentage (>80% act, <80% verify first).

<!-- SYNC:graph-assisted-investigation -->

> **Graph-Assisted Investigation** — MANDATORY when `.code-graph/graph.db` exists.
>
> **HARD-GATE:** MUST ATTENTION run at least ONE graph command on key files before concluding any investigation.
>
> **Pattern:** Grep finds files → `trace --direction both` reveals full system flow → Grep verifies details
>
> | Task                | Minimum Graph Action                         |
> | ------------------- | -------------------------------------------- |
> | Investigation/Scout | `trace --direction both` on 2-3 entry files  |
> | Fix/Debug           | `callers_of` on buggy function + `tests_for` |
> | Feature/Enhancement | `connections` on files to be modified        |
> | Code Review         | `tests_for` on changed functions             |
> | Blast Radius        | `trace --direction downstream`               |
>
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call the current task list first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** the current task list done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `$project-init` or the narrow route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `$sync-codex` (never auto-run it).
> 3. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 4. Read every required doc, then before target work state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, `docs/project-config.json` consulted, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

<!-- /SYNC:project-reference-docs-guide -->

<!-- SYNC:task-tracking-external-report -->

> **Task Tracking & External Report Persistence** — Bootstrap this before execution; then run project-reference doc prefetch before target/source work.
>
> 1. Create a small task breakdown before target file reads, grep, edits, or analysis. On context loss, inspect the current task list first.
> 2. Mark one task `in_progress` before work and `completed` immediately after evidence; never batch transitions.
> 3. For plan/review work, create `plans/reports/{skill}-{YYMMDD}-{HHmm}-{slug}.md` before first finding.
> 4. Append findings after each file/section/decision and synthesize from the report file at the end.
> 5. Final output cites `Full report: plans/reports/{filename}`.
>
> **Blocked until:** task breakdown exists, report path declared for plan/review work, first finding persisted before the next finding.

<!-- /SYNC:task-tracking-external-report -->

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

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **3-round ceiling** below.
>
> **Round cap — 3 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 3 with blocking findings still open (severity floor applied) → **STOP and escalate by asking the user directly** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
>
> **Severity floor — from round 3, LOW stops blocking.** The exit bar tightens by round, so the loop converges on consequence instead of spinning on polish:

> Define one predicate everywhere: `blocking_findings(round, findings)` returns all validated findings in rounds 1–2 and only validated CRITICAL/HIGH/MEDIUM findings in round 3+. A binary gate (test-green, security must-fix, required artifact) is exempt only when its owning invariant explicitly says so.
>
> | Round | Exit bar — loop ENDS when the fresh full review has…                      | Must be fixed to continue      |
> | ----- | ------------------------------------------------------------------------- | ------------------------------ |
> | 1-2   | zero validated findings at ANY severity                                   | CRITICAL · HIGH · MEDIUM · LOW |
> | 3+    | zero validated CRITICAL / HIGH / MEDIUM findings — **LOW-only is a PASS** | CRITICAL · HIGH · MEDIUM only  |
>
> From round 3 onward LOW findings are **NOT required to be fixed**: a round whose validated findings are ALL LOW **ENDS the loop immediately** — do not open another round for them. Severity tiers are `SYNC:severity-rubric` (CRITICAL block-merge · HIGH must-fix · MEDIUM should-fix · LOW nice-to-fix); rounds 1-2 are unchanged, so an easy LOW still gets fixed early when it is cheap.
>
> **Severity-floor rules:**
>
> - **Never silently drop a deferred LOW.** Every unfixed LOW is listed in the final report under `## Deferred LOW Findings (severity floor, round ≥3)` with file, line, and description, so the owner can schedule it. Dropping it from the report is a protocol violation, not a clean pass.
> - **Never re-tier a finding to trigger the exit.** Downgrading a real CRITICAL/HIGH/MEDIUM to LOW so the loop can end is a FALSE PASS. Severity is set by consequence per `SYNC:severity-rubric` before the round bar is applied — never after, and never with the exit in view. — why: a floor that can be reached by relabeling is not a floor.
> - **The floor bounds the loop, not the standard.** It ends _iteration_; it never authorizes shipping a known CRITICAL/HIGH/MEDIUM, and it never lowers the finding-survival bar that admits a finding in the first place.
> - **The floor never applies to a hard gate.** Test-green gates (a suite must actually pass), security must-fix gates, and any gate whose criterion is binary rather than severity-rated are unaffected — a failing test is a failure, not a LOW finding.
>
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `$why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `$why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `spawn_agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared → END; blocking findings remain → validate findings → fix → restart from the first review phase. Rounds 1-2 clear on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop** (deferred LOWs go in the report). Capped at **3 rounds**. Escalate by asking the user directly at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 3 completes with CRITICAL/HIGH/MEDIUM still open. NEVER loop past 3 rounds, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - From round 3 on, a round whose validated findings are ALL LOW ENDS the loop — never open round N+1 to fix LOW alone; list those LOWs as deferred instead
> - NEVER re-tier a CRITICAL/HIGH/MEDIUM down to LOW to reach the round-3 exit — severity is assigned by consequence before the bar is applied
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The 3-round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early at any round, and cap exhaustion escalates rather than passes
> - Enforce the round cap of 3 alongside the 2 repeated-no-progress blocker rule; both are escalation triggers, neither is a completion criterion
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed, plus `## Deferred LOW Findings (severity floor, round ≥3)` whenever the loop ended on the round-3+ bar with LOWs still open.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:sub-agent-selection -->

> **Sub-Agent Selection** — Full routing contract: `.claude/skills/shared/sub-agent-selection-guide.md`
> **Rule:** Route specialized domains (architecture, security, performance, DB, E2E, integration-test, git) to the matching specialist agent (see guide above) — NEVER use `code-reviewer` for these. — why: `code-reviewer` lacks each domain's checklist, so specialized issues slip through.

<!-- /SYNC:sub-agent-selection -->

<!-- SYNC:source-test-drift-check -->

> **Source/test drift check.** For coding, fix, debug, investigation, test, or review work: when source behavior changes, inspect affected unit/integration/E2E tests and decide from evidence whether tests should change to match intended behavior or the source change is an unintended bug to fix. Do not write tests for migration code; schema/data migrations are one-time execution paths, not core application logic.

<!-- /SYNC:source-test-drift-check -->

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

<!-- SYNC:systematic-review-batching -->

> **Systematic Review Batching (map-reduce)** — When a changeset is large, do NOT review files one-by-one. Partition into size-capped batches, fire one specialized sub-agent per batch in parallel, then reduce. This bounds EVERY context — each batch agent AND the orchestrator — so coverage stays complete as file count grows.
>
> **Trigger ladder (one ordered escalation — not competing thresholds):**
>
> 1. **< 10 changed files** → sequential per-file review (default; no batching).
> 2. **≥ 10 changed files** → switch to systematic parallel mode. Announce: `"Detected {N} changed files. Switching to systematic parallel review protocol."` Then: categorize → size-capped batches → flat consolidation.
> 3. **categories > 6 OR files > 40** → additionally insert the hierarchical synthesis tier (below). Everything from rung 2 still applies.
>
> **Step 1 — Categorize.** Group changed files into logical categories derived from the project's actual structure (not forced). Category is the _concern axis_; orient with these examples, derive what fits the repository:
>
> | Category Type       | Example Groupings                                                     |
> | ------------------- | --------------------------------------------------------------------- |
> | Agent/Tooling       | AI scripts, hooks, skill definitions, workflow configs, linting rules |
> | Root config/docs    | Root README, project config, CI/CD pipeline configs                   |
> | Reference docs      | Architecture docs, patterns references, setup guides                  |
> | Feature/domain docs | Business feature documentation, spec files, ADRs                      |
> | Backend logic       | Service/handler/controller source (infer from project structure)      |
> | Frontend logic      | UI component/state/API source (infer from project structure)          |
> | Data/Schema         | Migrations, schema files, seed data                                   |
> | Tests               | Unit, integration, E2E test files                                     |
> | Infrastructure      | Docker, k8s, CI/CD, cloud manifests                                   |
>
> **Step 2 — Size-capped batches.** One sub-agent per batch of **≤8 files OR ≤2000 diff-lines**, whichever hits first. Category stays the concern axis, but any category exceeding a cap splits into multiple size-capped batches (30 backend files → 4 batches). Size caps — not category caps — make "many files" safe: a category cap alone lets one giant category blow a single agent's context.
>
> **Step 2a — Sub-agent type per batch** (match the batch's dominant concern):
>
> - Code logic (any stack) → `code-reviewer`
> - Security-sensitive changes → `security-auditor`
> - Performance-critical paths → `performance-optimizer`
> - Docs, plans, specs, configs, infra → `general-purpose`
>
> Each batch sub-agent receives: its full file list; `SYNC:category-review-thinking` as its primary thinking model — derive each category's concerns from first principles, NOT a fixed checklist (if the consuming skill does not carry that block, apply category-first thinking directly); project reference docs relevant to its concern (discover via `*patterns*`, `*conventions*`, `*style-guide*`); cross-reference verification instructions (counts, tables, links). All batch agents run in parallel and write findings to `plans/reports/` (per `SYNC:task-tracking-external-report`); reducers read from disk, never from memory.
>
> **Step 3 — Reduce.**
>
> - **Flat reduction (rung 2, ≤6 categories AND ≤40 files):** the orchestrator collects each batch report, cross-references counts/tables/contracts ACROSS batches, detects gaps visible only across categories (feature in code but missing from docs; new API endpoint with no client call), and consolidates into one categorized holistic report.
> - **Hierarchical reduction (rung 3, > 6 categories OR > 40 files):** insert a mid-tier — each concern gets ONE synthesizer agent that reads only its own batch reports and emits a single concern-synthesis. The orchestrator reads the **concern-syntheses (~5)**, never the raw batch reports — keeping the reducer's context O(#concerns), not O(#files).
>     - **Cross-concern interaction pass (mandatory at rung 3 — closes the synthesis-tier blind spot):** concern-siloed synthesis can drop an interaction spanning two concerns AND two batches (tainted source in data-layer/batch 7 → sink in api/batch 3). So: (a) each concern-synthesizer MUST emit an explicit **"cross-concern interaction candidates"** list — entities/symbols/contracts it touched that plausibly bind to another concern (shared DTOs, event names, table/collection names, exported symbols); (b) the orchestrator MUST run the Step-3 cross-reference/gap step **over those candidate lists across all concern-syntheses**, not only within a batch, before concluding. Without this pass the tier trades completeness for context-bounding on exactly the large diffs it targets.
>
> **Step 4 — Holistic assessment.** With all findings combined, judge: overall coherence as a unified intent; cross-category sync (docs match code? contracts match callers?); risk areas where categories interact; missing doc/spec updates for changed artifacts.
>
> **No silent truncation.** If any cap forces sampling or a batch is dropped for budget, ANNOUNCE the dropped/sampled scope explicitly — bounded coverage must never read as complete coverage.

<!-- /SYNC:systematic-review-batching -->

<!-- SYNC:severity-rubric -->

> **Severity Rubric** — Classify every finding by consequence, not by how easy it is to fix. One scale across all reviews so a "High" means the same thing everywhere.
>
> | Severity | Action      | Definition                                                                |
> | -------- | ----------- | ------------------------------------------------------------------------- |
> | CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass, security hole |
> | HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation                |
> | MEDIUM   | Should fix  | Design debt, maintainability, likely future bug                           |
> | LOW      | Nice to fix | Convention, documentation, minor clarity                                  |
>
> **Score-based skills** map their numeric scale onto these tiers — do not invent a parallel vocabulary:
>
> - **0-2 criterion scoring** (e.g. production-readiness-review): `0` = CRITICAL/HIGH (criterion unmet, blocks production readiness), `1` = MEDIUM (partial, should fix), `2` = pass (no finding).
> - **Two-axis scoring** (e.g. performance-review, impact × likelihood): map the resulting cell to the nearest tier — high-impact + high-likelihood → CRITICAL/HIGH; low-impact OR low-likelihood → MEDIUM/LOW.
>
> A finding's tier drives the gate: CRITICAL/HIGH must be resolved or explicitly accepted by the owner before PASS; MEDIUM/LOW may ship with a tracked follow-up.

<!-- /SYNC:severity-rubric -->

<!-- SYNC:category-review-thinking -->

> **Category Review Thinking** — A thinking framework for reviewing any category of changed files. NOT a fixed checklist — derive concerns from domain knowledge; the examples are starting points only. Your knowledge of the category exceeds any list here — trust it.
>
> **Step 1 — Understand the category's role.** What is this category responsible for in the overall system? What invariants must it uphold? What are its consumer contracts (who depends on it, what do they expect)?
>
> **Step 2 — Read project conventions for this category.** Search for reference docs, style guides, ADRs, or READMEs specific to this area. Grep 3+ existing similar files — extract naming conventions, structural patterns, shared base classes. If no docs exist, derive conventions empirically from existing code.
>
> **Step 3 — Derive concerns from first principles.** Apply all that are relevant; expand beyond this list based on the actual category:
>
> - **Correctness:** Does the logic match the intent? Trace happy path AND error path.
> - **Boundary contracts:** Are interfaces/APIs/events/protocols honored? No implicit coupling introduced?
> - **Project conventions:** Does new code follow the patterns found in Step 2? Evidence-confirmed, not assumed.
> - **Security:** Auth enforced at every entry point? Input validated at boundaries? No secrets in the diff?
> - **Performance:** Unbounded operations? N+1 patterns? Blocking calls in async context? Unindexed queries?
> - **Maintainability:** DRY? Single responsibility? Complexity within reason? Names reveal intent?
> - **Test coverage:** Are the changed paths covered by tests? Are existing tests still valid after the change?
> - **Documentation:** Do related docs, specs, or READMEs reflect the changes?
>
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a task tracking sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
>
> **Illustrative concern examples by category type** (not exhaustive — trust your knowledge beyond this):
>
> - _Server-side logic:_ handler/service structure conventions, validation layer placement, side-effect isolation, cross-service boundary enforcement, data-access layer separation, error propagation strategy
> - _Client-side logic:_ component lifecycle management, resource cleanup (subscriptions, listeners, timers), state management patterns, API integration layer separation, reactive stream composition
> - _Data/Schema:_ migration reversibility (rollback script), lock impact on table volume, backfill idempotency, index coverage for query patterns, deployment ordering
> - _Configuration:_ present in ALL environments? No secrets in diff? App fails fast if config missing (not silently null)? Documented in setup guide?
> - _Infrastructure:_ dev/prod parity? No hardcoded dev values (localhost, debug flags)? Pinned image/dependency versions? CI/CD secret requirements documented?
> - _Styles/Assets:_ follows project naming conventions? Uses design variables/tokens (no hardcoded magic values)? Correct scope (no global side effects from component styles)?
> - _Documentation:_ accurate? Links valid? Examples still match current code/behavior? Covers new scenarios?
> - _Tests:_ assertions verify specific outcomes (not just "no exception")? Idempotent (repeatable N times)? Covers edge cases, not just happy path?
> - _Security artifacts:_ all code paths reach the gate? Negative tests exist (unauthorized denied)? Both enforcement AND display control updated?
> - _Build/Tooling:_ rule changes apply consistently? No exceptions that silently swallow violations? Impact on CI runtime documented?

<!-- /SYNC:category-review-thinking -->

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
> **MATERIAL → STOP and confirm by asking the user directly BEFORE the verdict stands** — state the trade-off, both options, what each sacrifices, and your recommendation. **NOT material →** record it inline with a one-line justification and proceed.
>
> **Non-asking execution contexts — ESCALATE BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. When you are running in such a context, the obligation is **redirected, never waived** — do ALL of: (a) complete questions 1 and 2 normally; (b) decide materiality and record it in the Trade-Off Assessment row with `confirmed? = NO — cannot ask from this context`; (c) **name the unconfirmed MATERIAL trade-off explicitly in your returned summary/verdict so the CALLER (or parent orchestrator) escalates it by asking the user directly on your behalf** — a material trade-off mentioned only inside a report file on disk is NOT a handoff; (d) do not emit an unqualified PASS — mark the verdict as carrying an unconfirmed material trade-off, so the caller's gate stays closed until the user answers. The caller inherits the escalation duty the moment it reads your return.
>
> This carve-out is about **reachability, not convenience**: it applies ONLY where the tool genuinely cannot reach the user (spawned sub-agent, terminal validate/verdict-only mode, non-interactive/headless run). It is NEVER a licence to skip the question, to self-approve a one-way door, or to downgrade materiality because asking is inconvenient — if you CAN ask, you MUST ask.
>
> **Emit a Trade-Off Assessment row** per reviewed decision and per recommendation: `| decision | sacrifices | gain (metric) | who pays, when | WORTH IT/NOT/UNCLEAR | material? | confirmed? |`.
>
> **BLOCKED until:** trade-off named (or dimensions-checked justification given) · worth-it verdict emitted · materiality decided · every MATERIAL trade-off either confirmed with the user OR — in a non-asking context — handed off in the returned verdict for the caller to confirm. A MATERIAL trade-off that is neither confirmed nor handed off can NEVER be PASS, and NEVER gets buried as a Low-severity note.
>
> **NEVER** answer "no trade-off" without checking · decide a material trade-off silently on the user's behalf · let convergence/delivery pressure authorize walking through a one-way door · bundle several material trade-offs into one vague "proceed?".

<!-- /SYNC:trade-off-interrogation-gate -->

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:sequential-thinking-protocol:reminder -->

**MUST ATTENTION** apply sequential-thinking — multi-step Thought N/M, REVISION/BRANCH/HYPOTHESIS markers, confidence % closer; see `$sequential-thinking` skill.

<!-- /SYNC:sequential-thinking-protocol:reminder -->

<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — verify generated content against evidence, trace downstream references before deleting or renaming, verify all affected outputs, re-read files after context loss, and surface ambiguity before acting.

<!-- /SYNC:ai-mistake-prevention:reminder -->

<!-- SYNC:task-tracking-external-report:reminder -->

- **MANDATORY** Bootstrap task tracking before target work; transition one task at a time.
- **MANDATORY** Persist plan/review findings to `plans/reports/` incrementally and synthesize from disk.

<!-- /SYNC:task-tracking-external-report:reminder -->

<!-- SYNC:project-reference-docs-guide:reminder -->

- **MANDATORY** Before investigating, planning, or coding, read `docs/project-config.json` (the project map: modules/paths, run-commands, conventions, architecture/workflow rules) + the required project-reference docs, and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project config + conventions override generic framework defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- SYNC:systematic-review-batching:reminder -->

- **MANDATORY** Large changeset → batch by size cap (≤8 files OR ≤2000 diff-lines), one parallel sub-agent per batch; never review many files one-by-one.
- **MANDATORY** > 6 categories OR > 40 files → add the hierarchical synthesis tier; each concern-synthesizer emits cross-concern interaction candidates and the orchestrator runs the cross-concern pass before concluding.

<!-- /SYNC:systematic-review-batching:reminder -->

<!-- SYNC:severity-rubric:reminder -->

- **MANDATORY** Classify findings Critical/High/Medium/Low by consequence; Critical/High block PASS until fixed or owner-accepted.
- **MANDATORY** Score-based skills (sre 0-2, perf two-axis) map onto the same four tiers — no parallel severity vocabulary.

<!-- /SYNC:severity-rubric:reminder -->

<!-- SYNC:category-review-thinking:reminder -->

- **MANDATORY** Derive review categories from file language + directory semantics + change nature; create a sub-task per category.
- **MANDATORY** Derive each category's concerns from first principles with `file:line` evidence — never a fixed checklist.

<!-- /SYNC:category-review-thinking:reminder -->

<!-- SYNC:scale-technique-gate:reminder -->

**IMPORTANT MUST ATTENTION** scale-technique gate: derive the scale tier from evidence FIRST (T0 internal · T1 <10k · T2 10k–1M · T3 millions+), then judge each warranted technique `PRESENT`/`MISSING-WARRANTED`/`N/A-by-scale`/`OVER-ENGINEERED`. Advise on warranted-but-missing gaps AND advise AGAINST unwarranted heavyweight techniques (anti-over-engineering). **ADVICE-ONLY — emit the Technique Applicability Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scale-technique-catalog.md` (authoritative for tier thresholds & per-technique warranting tiers — on any change update the catalog FIRST, then re-run `inject_scale_technique_gate.py`).

<!-- /SYNC:scale-technique-gate:reminder -->

<!-- SYNC:scenario-stress-eval:reminder -->

**IMPORTANT MUST ATTENTION** scenario-stress gate: reuse the scale tier `T0`–`T3` AND derive business-criticality `B0`–`B3` from evidence first — apply the **criticality-signal floor** (regulated/PII/financial/health data · money movement · auth/identity · legal-compliance → at least `B2` even absent SLA docs; do NOT default to `B3`). Select only the scenarios the `B`/`T` combination warrants, then walk each (simulate → trace → failure signature → self-heal/MTTR → trade-off) and assign `WITHSTANDS`/`DEGRADES-GRACEFULLY`/`FAILS-HARD`/`N/A-by-business`/`OVER-HARDENED`. Anti-over-engineering is first-class (a lean system that needs no HA/DR is a PASS) AND symmetric (never under-harden a `B2`+ system for low traffic). **ADVICE-ONLY — emit the Scenario Stress Matrix as guidance; NEVER mutate any score, verdict band, or gate pass/fail.** Full catalog → `.claude/docs/scenario-stress-catalog.md` (authoritative for scenarios/verdicts/business-tiers — on any change update the catalog FIRST, then re-run `inject_scenario_stress_gate.py`; scale tier stays single-sourced in `scale-technique-catalog.md`).

<!-- /SYNC:scenario-stress-eval:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `$why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: rounds 1-2 exit on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **round cap of 3 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 3 completing with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate by asking the user directly**, never a silent PASS. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm by asking the user directly BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** ask the user directly reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

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

**IMPORTANT MUST ATTENTION Goal:** Ensure changes preserve architecture boundaries, ownership, message flow, and generated artifact integrity before handoff — validating changed code against layers, service boundaries, message flow, CQRS, repositories, entity events, frontend architecture, generated artifacts, recorded architecture decisions (ADRs), and quality tooling.

**Protocols in force (concise digest of the SYNC/shared blocks this skill carries):**

- **Graph-Assisted Investigation:** Run one graph command on key files when graph.db exists.
- **Nested Task Creation:** Child skill expands visible phase tasks; link parent when nested.
- **Project Reference Docs Guide:** Read required project-reference docs before target work; `lessons.md` always.
- **Task Tracking External Report:** Bootstrap tasks; persist plan/review findings to `plans/reports/` incrementally.
- **Critical Thinking Mindset:** Traced proof per claim, confidence >80%; NEVER present guess as fact.
- **Sequential Thinking Protocol:** Multi-step Thought N/M with REVISION/BRANCH/HYPOTHESIS markers and confidence closer.
- **Evidence-Based Reasoning:** Cite `file:line` for every claim; <60% confidence = do NOT recommend.
- **Double-Round-Trip Review:** Validate findings, fix, full re-review until a clean pass.
- **Sub-Agent Selection:** Route specialized domains to the matching specialist agent, NEVER `code-reviewer`.
- **Source/Test Drift Check:** Source behavior changes → inspect affected tests; decide fix vs update.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Systematic Review Batching:** Large changeset → size-capped parallel batches, then reduce; NEVER one-by-one.
- **Severity Rubric:** Classify by consequence Critical/High/Medium/Low; Critical/High block PASS.
- **Category Review Thinking:** Derive each category's concerns from first principles with evidence, NEVER a checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**IMPORTANT MUST ATTENTION** read project architecture docs in Phase 0 BEFORE reviewing — every rule and base-class/symbol name comes from `backend-patterns-reference.md` / `project-structure-reference.md` / `frontend-patterns-reference.md` / `code-review-rules.md`, NEVER general knowledge — why: hardcoded framework names rot on rename and break portability to other repos.
**IMPORTANT MUST ATTENTION** every violation requires `file:line` proof + confidence >80% (60-80% verify first, <60% do NOT recommend); grep 3+ existing counterexamples before flagging — codebase convention wins. NEVER speculate — instead state "Insufficient evidence. Verified: [...]. Not verified: [...]."
**IMPORTANT MUST ATTENTION** review serially, one category at a time (Cat 0 tooling baseline → Cat 12 data, consistency & tenancy): doc rule → source evidence → `Think:` derivation → PASS/WARN/BLOCKED. NEVER scan categories simultaneously — why: parallel scanning collapses per-category evidence and drops findings.
**IMPORTANT MUST ATTENTION** Phase 3 has 13 categories — review EVERY applicable one, NEVER stop early: 0 quality-tooling (+fitness functions) · 1 clean-architecture layers (+module cycles, domain purity, shared-layer domain leak, shallow/pass-through modules, DIP interface placement) · 2 message-bus (+dual-write, consumer idempotency, durability acks) · 3 CQRS · 4 repositories · 5 service-pattern era · 6 entity event handlers · 7 service boundaries (+one writer per dataset) · 8 frontend architecture (frontend files only) · 9 ADR conformance (+unrecorded one-way door) · 10 spec-loop discipline · 11 scalability & coupling regression (+4 coupling dimensions, distributed-monolith signature, missing timeouts) · **12 data, consistency & tenancy boundaries (dual write, idempotency, isolation level + check-then-act/write skew, unfenced distributed lock, wall-clock ordering, breaking migration, tenant predicate + tenant-less cache key, staleness budget)** — why: a skipped category silently drops the violation class it uniquely covers.
**IMPORTANT MUST ATTENTION** judge coupling in FOUR separate dimensions — code, temporal (runtime), semantic (contract), operational (deployment). Low code coupling proves nothing: the distributed-monolith signature is low code coupling + high temporal + semantic + deployment coupling (services releasing together, shared DB or shared domain lib, sync chain ≥4 hops) — why: a diff that deepens it looks clean file-by-file and makes the exit permanently harder.
**IMPORTANT MUST ATTENTION** prove workload before technique — read/write ratio, peak load, query shapes, growth, hot-key skew, geography and consistency budgets — then judge measure/tune → vertical and/or stateless horizontal from headroom + availability → cache/CDN/read replicas or queue/LSM write path → partition/shard LAST. No evidence = INFO/route, NEVER a scale violation; a lean system that meets its targets is compliant.
**IMPORTANT MUST ATTENTION** the highest-consequence defect classes are invisible to functional tests — dual write without an outbox, a non-idempotent consumer under at-least-once delivery, a missing tenant predicate or tenant-less cache key, a breaking migration under rolling deploy, a missing timeout on a new outbound call, **an unprotected check-then-act at Read Committed / snapshot isolation (write skew)**, and **a distributed lock with no fencing token (split brain)**. Check each explicitly on any diff that touches persistence, messaging, migrations, locking or tenant-scoped data — why: every one of them passes a green test suite and surfaces first in production as divergence, duplicate charges, cross-tenant leaks, failed rollbacks, pool exhaustion, or corrupted state under concurrency.
**IMPORTANT MUST ATTENTION** self-audit your OWN draft findings against the 11 thinking red flags (`.claude/docs/architecture-knowledge.md` §20.3) BEFORE Phase 5 — a finding whose SACRIFICE you cannot name, one resting on "best practice", one asserting a scale problem with no evidence, or one treating a two-way door as irreversible is DEMOTED or DELETED, never reworded — why: a finding that survives on authoritative tone alone consumes the team's fix budget and teaches them to ignore the report.
**IMPORTANT MUST ATTENTION** judge a module by _functionality hidden ÷ interface surface_, and check WHERE a port interface is DECLARED — shallow one-method types, pass-through methods and an interface sitting beside its single implementation in the infrastructure package all read as clean architecture while adding cost or leaving the dependency arrow pointing outward — why: reviewers count classes and interfaces as modularity, so these are the defects that pass review and then make every change touch five files.
**IMPORTANT MUST ATTENTION** universal architecture knowledge (`.claude/docs/architecture-knowledge.md`) is a RECOGNITION aid, never authority — project reference docs and accepted ADRs OUTRANK it, an anti-pattern match is a HYPOTHESIS until `file:line`/config/topology evidence AND the damaged quality attribute are both named, and a grepped codebase convention beats any catalog entry — why: catalog-shaped false positives are confident, plausible, and the most expensive output this skill can produce.
**IMPORTANT MUST ATTENTION** follow the phase order Phase 0 → 1 → 2 → 3 → 4 → 5 → Next Steps; Phase 5 `$why-review` self-validation is MANDATORY whenever any finding exists, and Next Steps MUST present `$code-simplifier` / `$code-review` / skip by asking the user directly — why: the AI repeatedly forgets the validation gate and stops at Phase 4, shipping unvalidated severities downstream.
**IMPORTANT MUST ATTENTION** break work into small tasks using task tracking BEFORE starting; mark one `in_progress`/`completed` at a time; on context loss call the current task list first — why: resume existing tasks, never duplicate after compaction.
**IMPORTANT MUST ATTENTION** stay in lane — deep-review only what this skill OWNS (layers, messaging/CQRS/repos/service boundaries, entity events, frontend architecture, quality tooling, generated artifacts, ADRs); record a one-line `→ route to {sibling}` pointer for security/performance/DDD/UI/integration-test findings instead of expanding them — why: duplicated findings across reviewers inflate severity counts and bury issues each reviewer uniquely owns.
**IMPORTANT MUST ATTENTION** framework symbols/base-class/directory names in Categories 2–8 are illustrative examples only — map each to the repository's actual convention as named in its own Phase 0 reference docs; flag deviations from the project's REAL convention, NEVER from these literal names.
**IMPORTANT MUST ATTENTION** scope tooling/ADR/spec-loop severity to the change — a pre-existing gap unrelated to the diff is WARN with one note, reserve BLOCKED for a new stack/service with no gate, a change removing an existing gate, an accepted-ADR contradiction with no superseding ADR, or a `[HARD]` rule/invariant with no property TC — why: blocking on standing change-unrelated conditions buries the regression the diff actually introduced.
**IMPORTANT MUST ATTENTION** review the WHOLE package (spec + tests + structural diff), not the diff alone — every behavior-affecting architecture finding carries a Dual-Feedback row (spec NAMES the contract/invariant AND a test GUARDS it); blank either axis = INCOMPLETE — why: a boundary change that compiles but is never asserted regresses silently when a sibling service is next touched.
**IMPORTANT MUST ATTENTION** run at least ONE graph command on key files when `.code-graph/graph.db` exists (grep → `trace --direction both` → verify) — why: trace reveals cross-service blast radius grep alone cannot.
**IMPORTANT MUST ATTENTION** evaluate pattern fit before flagging — copying-nearby ≠ matching preconditions; verify same scope, lifetime, base class, constraints, established-exception status before calling a deviation a violation.
**IMPORTANT MUST ATTENTION** review is read-only until validated — NEVER fix code in this skill; after ANY finding run the Phase 5 `$why-review --validate-findings` self-validation gate BEFORE handoff, and every validated fix restarts a full review from Phase 0 with a fresh task breakdown — why: AI reports inherit confirmation bias; adversarial validation demotes false-positive Highs at the source.
**IMPORTANT MUST ATTENTION** write findings to `plans/reports/arch-review-{date}-{slug}.md` incrementally and synthesize from disk; use ask the user directly to present next steps (`$code-simplifier` / `$code-review` / skip) after completing review — why: long reviews exhaust context before a final batch write, losing findings.

**Anti-Rationalization:**

| Evasion                                                  | Rebuttal                                                                                                                                                                                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Too simple for architecture review"                     | Simple code hides layer violations. Apply all phases.                                                                                                                                                                              |
| "Already read the docs"                                  | Show the extracted `file:line` rule — no recall = no read.                                                                                                                                                                         |
| "I know this framework's base classes"                   | Resolve from Phase 0 reference docs — literal names are illustrative; the project's convention wins.                                                                                                                               |
| "Just flag obvious violations"                           | Gray areas matter most. Apply `Think:` to every applicable category.                                                                                                                                                               |
| "Found a violation, I'll just fix it"                    | Read-only skill. Validate via `$why-review` first, then route the fix; every fix restarts review from Phase 0.                                                                                                                     |
| "Tests pass, so the data path is fine"                   | Dual write, non-idempotent consumers, missing tenant predicates, breaking migrations, write skew and unfenced locks ALL pass green suites. Check Category 12 explicitly.                                                           |
| "It's inside a transaction, so it's atomic"              | Name the ISOLATION LEVEL **and the engine**. Read Committed permits write skew and lost update; snapshot isolation permits write skew, plus lost update on any engine whose `REPEATABLE READ` is not true first-committer-wins SI. |
| "It takes a distributed lock, so it's exclusive"         | Not without a fencing token. A GC/VM pause makes a dead holder believe it still holds the lock.                                                                                                                                    |
| "More small classes/interfaces means better modularity"  | Judge functionality hidden ÷ interface surface. Classitis and pass-through methods raise total complexity.                                                                                                                         |
| "These two blocks look the same — extract them"          | Same shape ≠ same reason to change. Rule of three, and the wrong abstraction costs more than duplication.                                                                                                                          |
| "It's just one more service call"                        | Judge all 4 coupling dimensions. A new sync hop multiplies availability and may deepen a distributed monolith.                                                                                                                     |
| "The catalog says this is an anti-pattern"               | The catalog RECOGNIZES; the project's docs, ADRs and grepped conventions DECIDE. No evidence + no damaged attribute = no finding.                                                                                                  |
| "Data/migration concerns belong to the DBA"              | They are the least reversible decisions in the diff. Category 12 owns the boundary; route only query-plan depth to `performance-review`.                                                                                           |
| "This finding is clearly someone else's domain, skip it" | Record a one-line `→ route to {sibling}` pointer — surfacing the route is owned here; expanding it is not.                                                                                                                         |
| "Graph not needed here"                                  | Run ONE trace. 5 seconds → full blast radius revealed.                                                                                                                                                                             |
| "Skill reviews only changed files"                       | Default scope, not a limit. User can override.                                                                                                                                                                                     |

---

> **Closing reminder — Easy to Change is the success metric.** Every finding,
> test, refactor, and abstraction must answer one question: _does this make
> the next change cheaper or more expensive?_ If it doesn't reduce future
> change cost, reject it. Coupling, hidden state, duplicated knowledge, and
> unclear intent are the real enemies — call them out by name.

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
