---
name: domain-entities-review
version: 2.0.0
description: '[DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

## Quick Summary

**Goal:** Detect DDD design quality violations in domain entities and value objects across any technology stack — adapting to project-specific patterns via config/reference docs discovery — so domain entities and value objects preserve invariants, aggregate boundaries, and discovered DDD conventions.

**Summary:** read-this-if-nothing-else digest — the skill's main steps in order:

- **Phase 0 (gate):** discover the project's real entity/VO base classes, validation API, domain exception type, failure-signalling convention, concurrency mechanism + blast radius FIRST, then **0.4 detect the modelling paradigm** (OO-mutable / type-driven-immutable / event-sourced) per aggregate — discovered conventions override every generic DDD rule. — why: wrong base classes = wrong checklist, and setter rules applied to an immutable or event-sourced model manufacture false findings.
- **Phase 1:** create the report, run the mandatory high-signal grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, write every grep result immediately, categorize files (root/entity/VO/unknown).
- **Phase 2:** per-file checklist **A–P** — A–L (entity-vs-VO classification, base-class compliance, VO immutability/structural equality, anemic-model detection, domain invariants, invariant→property-TC Dual-Feedback, aggregate-by-ID, navigation serialization safety, domain events, query expressions, ubiquitous language, OOP) plus **M** invariant-vs-validation ownership + failure signalling, **N** construction-vs-reconstitution, **O** event dispatch timing/outbox/domain-vs-integration contract, **P** aggregate concurrency + transaction boundary — append findings per file, NEVER batch.
- **Phase 3 → 4:** holistic cross-entity synthesis in the current pass, including **3.1 model-level dimensions** (bounded-context sharing; subdomain fit — judge whether a rich model is warranted BEFORE reporting anemia), then final report with health score (`100 − (CRIT×25 + HIGH×10 + MED×3 + LOW×1)`); 10+ entity files → switch to parallel `code-reviewer` sub-agents automatically.
- **Phase 5 (validation-first loop):** validate via `/why-review` gate before any fix, fix only validated findings, then restart the FULL review; a clean pass ENDS the review. Every finding needs `file:line` at confidence >80%. Close with `AskUserQuestion` next-steps.

**Workflow:**

1. **Phase 0** — Discover project stack + entity/VO base classes + validation API + domain exception type + failure-signalling convention + concurrency mechanism + blast radius, then **0.4 detect modelling paradigm per aggregate** **(MANDATORY FIRST)**
2. **Phase 1** — Create report; run mandatory grep patterns BEFORE per-file reads; write results immediately; categorize files
3. **Phase 2** — Entity-by-entity DDD review (per-file checklist **A–P** + project-specific rules); append per file, never batch
4. **Phase 3** — Holistic cross-entity synthesis in the current pass, incl. **3.1 model-level dimensions** (bounded-context sharing, subdomain fit); fresh-context sub-agent only after validated fixes or explicit high-risk trigger
5. **Phase 4** — Final report: critical issues, health score, refactoring priority, recommendations
6. **Phase 5** — Why-Review self-validation gate (MANDATORY when findings exist) → validate → fix validated → restart full review until clean → `AskUserQuestion` next-steps
7. **Scale rule** — 10+ entity files → parallel `code-reviewer` sub-agents, then consolidate

**Key Rules:**

- MUST ATTENTION discover project base classes in Phase 0 — NEVER assume generic patterns apply — why: wrong base classes = wrong checklist.
- MUST ATTENTION run mandatory grep patterns in Phase 1 BEFORE reading individual files — why: highest-signal violations surface fastest and seed the report.
- MUST ATTENTION validate findings via the Phase 5 `/why-review` gate before any fix, then restart the full review after validated fixes — a clean pass ENDS the review — why: every fix invalidates the prior verdict and AI reports inherit confirmation bias.
- NEVER report a finding without `file:line` evidence at confidence >80% — why: unproven findings inflate severity downstream.
- MUST ATTENTION append findings per file and persist to `plans/reports/` incrementally; 10+ entity files → parallel sub-agents — why: batched writes vanish on context/budget cutoff.
- MUST ATTENTION detect the modelling paradigm (0.4) before applying any setter/mutability rule, and judge subdomain fit (3.1) before reporting anemic model — NEVER flag a paradigm-appropriate or appropriately-simple design as a violation — why: uniform tactical DDD over CRUD is itself an anti-pattern, and rules written for mutable OO are meaningless against an immutable or event-sourced model.
- MUST ATTENTION treat invariant and validation as different questions with different owners (entity vs boundary), and keep failure signalling consistent with the Phase 0 convention — why: collapsing them buries UX checks in entities and parks business rules in bypassable validators.

**Severity Classification:**

| Severity | Action      | Definition                                                 |
| -------- | ----------- | ---------------------------------------------------------- |
| CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass |
| HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation |
| MEDIUM   | Should fix  | Design debt, maintainability, likely future bug            |
| LOW      | Nice to fix | Convention, documentation, minor clarity                   |

---

## Canonical Owner — Domain Entity Change Gate

> This skill is the **canonical owner** of `SYNC:domain-entity-change-gate`. `/plan`, `/plan-review`, and `/changes-review` inline that gate and route here for the full checklist, so a design planned under the gate is reviewed under the same rules. The gate's 6 decision points map to this skill as: classification → **A** · invariant ownership + failure signalling → **E/M** · aggregate boundary + concurrency → **F/P** · construction vs reconstitution → **N** · events → **H/O** · test obligation → **E2**; paradigm detection is **0.4** and subdomain fit is **3.1**.
>
> Do NOT apply the gate as a separate pass when running this skill — Phase 2 A–P **is** the gate, in full. Record `Gate is this skill's own body — A–P checklist owns it.` — why: a second pass over the same rules duplicates findings and inflates severity counts.
>
> Changing an entity rule here → update `.claude/skills/shared/sync-inline-versions.md` FIRST if the rule belongs to the gate's 6 decision points, then propagate to the three consumers. NEVER edit an inlined copy directly.

---

## First Principle — Easy to Change

> **Success metric of every coding decision = _future change cost_.**
> DRY, SRP, abstraction, design patterns, naming, layering, tests — every technique serves one goal: **make next change cheaper**.

Evaluating code, refactor, test, abstraction — ask: **does this make next change cheaper or more expensive?**

- Reject "best practices" raising change cost (premature abstraction, speculative generality, leaky indirection, ceremony without payoff).
- Name real enemies in findings: **coupling, hidden state, duplicated knowledge, unclear intent, irreversible decisions exposed too early**.
- Simpler design easy to change beats sophisticated design that isn't.

Apply this lens **before** invoking any specific rule, pattern, or checklist below — if a downstream rule raises change cost, this principle wins.

---

## Phase 0: Project Discovery + Mode Detection + Blast Radius

> **MANDATORY FIRST STEP.** Phase 0 gates all other work — wrong base classes = wrong checklist.

**Create `TaskCreate` tasks for all phases NOW before doing anything else:**

- `[Phase 0] Project stack discovery + mode detection + blast radius` — in_progress **(FIRST)**
- `[Phase 1] Collect entity files + grep patterns + create report` — pending
- `[Phase 2] Entity-by-entity DDD review` — pending
- `[Phase 3] Holistic synthesis and fresh-context gate` — pending
- `[Phase 4] Generate final findings` — pending

### 0.1 Discover Project Stack and Entity Conventions

```bash
# Check for project reference docs
ls docs/project-reference/ 2>/dev/null
ls docs/ 2>/dev/null | grep -i "entity\|domain\|backend\|pattern"

# Detect configured build/runtime markers from project config and project-reference docs
rg --files | rg "(project|package|build|config|settings|manifest)" | head -20

# Find entity/VO base classes actually used
rg "class.*Entity|class.*RootEntity|class.*BaseEntity|class.*AbstractEntity" {configured-source-roots} | head -10
rg "ValueObject|Aggregate|Entity" {configured-source-roots} | head -20
rg "{configured-entity-markers}" {configured-source-roots} | head -10
```

**Record in report (required before Phase 2):**

| Convention                    | Discovered Value                                               |
| ----------------------------- | -------------------------------------------------------------- |
| Entity base class(es)         | `{class names with file:line}`                                 |
| VO base class(es)             | `{class names with file:line}`                                 |
| Validation API                | `{how validation done}`                                        |
| Domain exception type         | `{exception class used}`                                       |
| Navigation/FK pattern         | `{annotation + FK property pattern}`                           |
| Persistence annotations       | `{ORM annotations}`                                            |
| Failure-signalling convention | `{throws domain exception \| returns Result/Either \| mixed}`  |
| Concurrency mechanism         | `{version/rowversion/etag field on roots, or none}`            |
| Modelling paradigm            | `{OO-mutable \| type-driven/immutable \| event-sourced}` (0.4) |

If project reference docs exist → read them and extract: service-specific base class requirements, documented anti-patterns, naming conventions, cross-service rules.

### 0.2 Determine Entity File Scope

Apply mode-appropriate command from Mode Detection table, adapted to discovered stack.

### 0.3 Blast Radius Analysis

```bash
# When .code-graph/graph.db exists
python .claude/scripts/code_graph trace <entity-file> --direction both --json --node-mode file
```

Record: entity file count, downstream consumers, risk level. Use to prioritize review order (highest-impact first).

### 0.4 Modelling Paradigm Detection (MUST ATTENTION — gates which per-file rules apply)

> Sections C/D/N assume a mutable OO entity. Applying them to an immutable or event-sourced model manufactures false findings — detect the paradigm BEFORE the checklist. — why: "no public setters" is a finding in OO code and meaningless in a model that has no setters by construction.

Detect from the domain source, NEVER assume:

| Paradigm                    | Detection signal                                                                                                                | Checklist adaptation                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OO-mutable** (default)    | Classes with private setters + state-changing methods                                                                           | Full A–P checklist as written                                                                                                                                                                                                                      |
| **Type-driven / immutable** | Sealed hierarchies, discriminated unions, records-only, `With*()`/copy-returning methods, smart constructors returning `Result` | Section C immutability applies to entities too; Section D reads "no state-mutating method returns void"; illegal-state-representability replaces runtime guards — flag a status enum + nullable per-status fields as the union that was never made |
| **Event-sourced**           | `apply`/`evolve`/`when` per event, `From(events)` / stream-fold reconstitution, no persisted state                              | Section C setter rules N/A; Section N reconstitution = the fold; Section O owns event-schema evolution; a CRUD-shaped event (`{Entity}Updated` with full payload) is a HIGH finding — it carries no business meaning                               |

- MUST ATTENTION record the detected paradigm in the report before Phase 2 and state which sections were adapted or marked N/A — why: an unrecorded adaptation reads as a skipped check.
- NEVER flag a paradigm-appropriate pattern as a violation of a rule written for another paradigm — verify against 0.4 first.
- Mixed paradigms per aggregate are legitimate (event-source one aggregate, not the system) — detect per aggregate, NEVER once per repo.

---

## Phase 1: Collect Files + Grep Patterns + Create Report

**Create report FIRST:** `plans/reports/domain-entities-review-{date}-{slug}.md`

Initialize with: Mode, Tech Stack, Discovered Conventions, Blast Radius Summary.

### Mandatory Search Intent

MUST ATTENTION run high-signal searches BEFORE reading individual files. Derive the actual roots, file globs, framework markers, and naming conventions from `docs/project-config.json` plus the repository's project-reference docs. Do not copy a source-root, extension, framework type, or folder name from this skill as if it were canonical.

Search for these intent categories with the configured source roots and discovered stack syntax:

- Validation methods that hide or bypass the base/domain validation path.
- Relationship/navigation fields that can serialize recursively or expose internal graph structure.
- Value objects with mutable public state or missing structural equality.
- Domain methods throwing low-context generic errors instead of configured domain/validation errors.
- Business conditionals and entity mutation leaking into a higher layer when the entity/value object owns the invariant.
- Query/filter expressions placed in handlers/services when the entity, repository extension, specification, or equivalent local pattern owns them.
- Entity classes missing identity markers required by the configured persistence framework.
- Domain models performing direct persistence, network, or infrastructure work.

Representative searches — substitute the markers and source roots discovered from `docs/project-config.json` / project-reference docs (never hardcode the examples):

```bash
# Validation methods that hide or bypass the base/domain validation path
rg "{configured-validation-markers}" {configured-domain-source-roots} | head -20

# Persistence/query-filter expressions or infrastructure work leaked into domain models
rg "{configured-persistence-or-query-markers}" {configured-domain-source-roots} | head -20

# Business conditions / entity mutation leaked above the owning domain layer
rg "{configured-business-condition-patterns}" {configured-application-source-roots} | head -20

# Entity classes missing the identity markers required by the configured persistence framework
rg "{configured-identity-markers}" {configured-domain-source-roots} | head -20
```

Write ALL grep results to report IMMEDIATELY.

### Categorize Files

| Category       | Definition                                               |
| -------------- | -------------------------------------------------------- |
| Aggregate Root | Has dedicated repository; aggregate entry point          |
| Entity         | Has identity; accessed/persisted through root            |
| Value Object   | Structural equality; must be immutable                   |
| Unknown        | Plain class in domain layer without clear classification |

---

## Phase 2: Entity-by-Entity DDD Review

For EACH entity/VO file: read file → append findings to report IMMEDIATELY. NEVER batch.

### Per-File Review Checklist

#### A. Entity vs Value Object Classification (MUST ATTENTION)

> Entity = unique identity persisting across time. VO = defined by attributes, immutable, interchangeable when equal. NEVER swap roles.

- verify: does class need unique persistent identity? No → suspect VO misclassification.
- flag: "snapshot at point in time" (contact at referral, price at purchase, measurement at check-in) → MUST be VO, NEVER entity.
- CRITICAL if VO has primary key or repository → VO masquerading as entity.
- MEDIUM if entity has 3+ scalar fields always moving together → data clump → VO candidate.
- MEDIUM if entity is effectively stateless (no state changes after creation) → suspect VO.

#### B. Base Class Compliance (MUST ATTENTION)

> NEVER assume base class — ALWAYS use discovered values from Phase 0. Project docs override generic rules.

- verify aggregate root extends project's root entity base (from Phase 0 discovery).
- NEVER use root entity base for non-root child entities — child entities MUST NOT have their own repository.
- verify VOs extend project's VO base class — NEVER plain POCO/POJO in domain.
- verify audited entities extend audited base where audit trail required.
- cross-check each entity's base class against service/module-specific requirements from reference docs.

#### C. Value Object Immutability and Equality (MUST ATTENTION)

> Mutable VOs are a design contradiction — they imply identity through mutation, which entities have, not VOs.

- NEVER allow mutable public state on value objects. Use the immutability mechanism idiomatic to the configured language/runtime.
- Parameterless/default constructor allowed when required for framework deserialization.
- verify equality based on structural value — NEVER reference equality. Use the equality mechanism idiomatic to the configured language/runtime or the repository's documented value-object base pattern.
- verify `validate()` overridden when VO has constraints (format, range, required).
- verify factory method exists for non-trivial construction: `Create()`, `New()`, `Of()`, `From*()`.
- NEVER put async operations, repository calls, or infrastructure dependencies inside VO.
- Conversion/implicit operator defined when VO wraps single primitive.

#### D. Encapsulation and Anemic Domain Model (MUST ATTENTION)

> Anemic model = entity is data bag, all logic in handlers. Fix: move behavior to entity (lowest layer).

- verify entity has at least ONE domain method when it has business rules — NEVER pure property bag.
- NEVER allow direct property assignment for state transitions from outside entity — MUST use domain methods (`changeStatus()`, `approve()`, `assign()`).
- flag: same guard clause in 3+ handlers for same entity → extract to `ensureCan*()` on entity.
- flag: handler doing multi-field mutation (`entity.a=x; entity.b=y; entity.c=z`) without validation → domain method candidate.
- flag: business conditionals in application layer referencing single entity's state → move to entity guard.
- Entity behavior MUST be caller-agnostic — methods describe domain intent, NEVER reference who calls them.

**Detection signal:** `entity.property = value` assignments (non-audit) in application layer = anemic model signal.

#### E. Domain Invariants (MUST ATTENTION)

> Invariants enforced only in application layer = domain can reach invalid state via any other entry point.

- verify entity validates own invariants (via `validate()`, constructor guard, or factory) — NEVER handler-only enforcement.
- verify pre-operation guards as `ensureCan*()` / `validateCan*()` methods on entity.
- NEVER throw raw language exceptions for domain violations — MUST use project's domain exception type (discovered Phase 0): `ArgumentException`, `IllegalArgumentException`, `Error`, `ValueError` all WRONG.
- Invariants from creation MUST be enforced in factory method or constructor.
- CRITICAL: `validate()` MUST NOT be hidden by same-name method without calling `super` → silent validation dead zone.

**Detection signal:** Search for `validate()` override not calling `super.validate()` or framework base validation.

#### E2. Spec-Loop Discipline — Invariant → Property-TC Mapping (MUST ATTENTION)

> Every §5 invariant you verify is a property the spec should name and a test should guard universally — an enforced invariant with no property test is one refactor away from silent regression.

- verify each entity/VO invariant maps to a **universally-quantified property TC** (holds for ALL valid inputs) plus a **boundary counter-case** — NEVER accept a single happy-path example as coverage for an invariant.
- flag any invariant with no guarding property TC as a **Dual-Feedback finding**: the spec must NAME the invariant AND a test must GUARD it — blank either axis = INCOMPLETE, NEVER report a behavior-affecting invariant finding as code-only.
- review the whole package (spec + tests + entity code), not the entity diff alone; loop until zero new invariant→property-TC gaps remain — each cycle enriches the spec.

**Detection signal:** an invariant enforced in the entity (constructor/`validate()`/`ensureCan*()`) with no corresponding property TC in the spec's Section 8 or test suite → Dual-Feedback gap.

#### F. Aggregate Design (MUST ATTENTION)

> Aggregate = consistency boundary. All invariants must flow through root. Cross-aggregate coupling = transaction trap.

- NEVER give child entity its own repository — ONLY aggregate root has repository.
- NEVER reference another aggregate by object — MUST use ID only (`string productId` NOT `Product product`).
- NEVER expose mutable collection directly — aggregate root MUST use domain methods for collection mutations.
- verify composite-key entities implement project's composite ID pattern (discovered Phase 0).
- flag aggregates with >5 independent child entities with separate lifecycles → splitting candidate.
- Deletion of aggregate root MUST validate pre-conditions on children (orphan prevention).

#### G. Navigation / Relationship Properties

> Navigation properties serializing into each other = circular reference crash or infinite memory allocation.

- CRITICAL: ALL navigation/relationship properties that can serialize recursively MUST use the configured serialization-ignore mechanism or an explicit DTO/projection boundary.
- Navigation properties MUST be nullable/optional — not always loaded.
- FK ID MUST be stored as primitive alongside navigation — NEVER navigation-only reference.
- NEVER use navigation properties in domain logic without null guard.
- Prefer unidirectional navigation — bidirectional only when both directions actively used.

#### H. Domain Events

> Entity raises events → handlers react. NEVER inline side effects in entity domain methods.

- verify meaningful state changes raise domain events — NEVER tracked only by polling DB.
- Events MUST be raised INSIDE entity domain methods — NEVER from handlers/services.
- Side effects MUST go to event handlers — NEVER inline in entity domain method.
- Domain event naming: `{Entity}{Action}Event` or `{Entity}{PastTense}Event` (e.g., `OrderShippedEvent`).
- Entity domain methods MUST remain focused: raise event + update own state. Nothing else.

#### I. Static Query Expressions

> Query logic belongs on entity (lowest layer) — duplication in repos/handlers = wrong layer.

- verify reusable filter expressions defined as static methods on entity (or companion class) — NEVER duplicated in repos/handlers.
- Expression naming: descriptive static method (e.g., `isActive()`, `filteredByDepartment()`).
- NEVER duplicate expressions across multiple repository or handler files.
- Query expressions MUST have corresponding database indexes (verify in migration/schema files).

#### J. Naming and Ubiquitous Language

> Technical names break the domain model. Entity names ARE the project's vocabulary.

- NEVER use technical class name suffixes: `Manager`, `Helper`, `Processor`, `Util`, `Handler`, `Service`.
- Domain methods MUST use domain verbs: `approve()`, `reject()`, `assign()`, `changeStatus()` — NEVER `process()`, `handle()`, `execute()`.
- Boolean properties MUST use `is*`/`has*`/`can*` prefix: `isActive`, `hasPermission`, `canBeDeleted`.
- Status/type enums MUST be co-located with owning entity — NEVER in shared `Enums/` catch-all folder.
- Method parameters MUST use domain nouns — NEVER `data`, `model`, `obj`, `input`, `payload`.

#### K. Code Smells

| Smell                    | Detection Signal                            | Severity                         |
| ------------------------ | ------------------------------------------- | -------------------------------- |
| **Fat Entity**           | >500 lines with unrelated concerns          | MEDIUM — split by domain concept |
| **Feature Envy**         | Method uses 5+ properties of another entity | HIGH — wrong responsibility      |
| **Data Clump**           | 3+ primitives always together               | MEDIUM — VO candidate            |
| **Primitive Obsession**  | Raw `string` for email/phone/money/ID       | MEDIUM — domain type opportunity |
| **Leaky Abstraction**    | Entity exposes persistence internals        | HIGH                             |
| **Collection Exposure**  | Public mutable collection returned directly | HIGH — domain method needed      |
| **Constructor Overload** | 5+ params without factory method            | MEDIUM                           |

#### L. OOP Principles

- verify SRP: entity represents ONE domain concept — conflating two → flag for split.
- NEVER instantiate infrastructure inside entity (repositories, HTTP clients, loggers) — MUST receive as parameters.
- New behaviors MUST go via new event handlers — NEVER by modifying entity conditionals (Open/Closed).
- Capability traits added via focused interfaces — NEVER monolithic interface bundle (ISP).
- Entity subclasses MUST be substitutable for base — `base.method()` NEVER skipped in override (LSP).

#### M. Invariant vs Validation Ownership + Failure Signalling (MUST ATTENTION)

> Two different questions wearing one word. **Invariant** = "can this state legally exist?" — owned by the entity, failure is a bug. **Validation** = "is this input acceptable right now?" — owned by the application boundary, failure is a user error. Collapsing them produces both classic defects at once: form validation buried in entities, and business rules parked in a bypassable `Validator`.

**Think:** for each rule the entity enforces, ask who is allowed to violate it. A user typo → boundary validation. A code path reaching an impossible state → entity invariant.

- flag input-shape checks inside the entity (required-field, max-length, format-for-UX, localized messages) → MEDIUM, belongs at the boundary — why: the entity now changes when the form changes.
- flag a business rule living ONLY in a `*Validator` / `*Rules` / handler guard while the entity permits the state → HIGH invariant gap — why: every other entry point reaches invalid state.
- NEVER accept a database constraint or trigger as the invariant's enforcement — it is a backstop; the model must state the rule — why: an opaque SQL error is not a domain contract and cannot be unit-tested.
- MUST ATTENTION verify failure signalling matches the convention discovered in Phase 0 — mixed exception/`Result` for the SAME class of failure is a HIGH finding — why: callers cannot know which to handle, so one path goes unhandled.
- Expected business outcomes (insufficient funds, slot taken) returning `Result`, unreachable-state guards throwing → correct split; flag the inverse (throwing for expected outcomes in a hot path, or `Result` for a "cannot happen") as MEDIUM.
- flag mutations returning bare `bool` → MEDIUM: loses WHY and is trivially ignored.
- flag silent clamping of bad input (`if (qty < 0) qty = 0`) → HIGH — why: hides a caller bug and persists wrong data with no signal.

**Detection signal:** business rule text appearing in BOTH a validator/handler and the entity, or appearing ONLY outside the entity.

#### N. Construction vs Reconstitution (MUST ATTENTION)

> Creating a new entity runs business rules and raises events. Loading an existing one from storage MUST do neither. One constructor serving both makes creation rules unenforceable without breaking loading.

**Think:** trace both paths separately — `new` from a command, and materialization by the ORM/stream fold. Ask what each is allowed to run.

- MUST ATTENTION verify a distinct reconstitution path exists (private/protected ctor, ORM materialization hook, or `From(events)` fold) separate from the creation factory — why: without it, creation invariants must be weakened until loading passes.
- CRITICAL if the load path raises domain events — loading N entities emits N phantom events — why: downstream handlers fire for things that did not happen.
- flag creation rules re-run on load (clock checks, uniqueness calls, `startsOn >= today`) → HIGH: historical rows fail to load once the rule tightens.
- MUST ATTENTION verify required data sits in the constructor/factory and optional data in methods — an entity constructible without a value it cannot exist without is a HIGH invariant gap.
- flag public parameterless constructor + public setters as the creation path → CRITICAL anemic entry point (paradigm-adjusted per 0.4; framework-required non-public ctors are fine).
- flag 5+ positional constructor params → MEDIUM: group into VOs FIRST, consider a builder only after.
- NEVER flag a framework-mandated non-public parameterless constructor as a violation — verify the discovered persistence convention first.

**Detection signal:** one public constructor referenced by both the command handler and the ORM/mapping configuration.

#### O. Event Dispatch Timing + Contract Boundary (MUST ATTENTION)

> Section H owns event **raising**. This owns what happens **after** — when they dispatch, who may consume them, and how they evolve. Wrong timing silently couples an unrelated handler's failure to the core write.

**Think:** follow one raised event to its consumer and ask what happens if the consumer throws, if the transaction rolls back, and if the event is delivered twice.

- CRITICAL if events dispatch synchronously INSIDE the write transaction — a handler failure rolls back the business operation — why: an unrelated feature can now break the core write.
- CRITICAL if events publish to a broker BEFORE the transaction commits — you announced a fact that may never have happened; require the transactional outbox (events persisted in the SAME transaction, relayed after commit).
- MUST ATTENTION verify the event buffer is cleared after dispatch — an uncleared buffer republishes on the next save (MEDIUM–HIGH by blast radius).
- MUST ATTENTION verify internal domain events are distinct from published integration events — flag an internal event placed on the bus as HIGH — why: consumers become coupled to your model's internal shape, permanently, and it can no longer be refactored.
- flag fat events carrying the whole aggregate → MEDIUM: violates least privilege and blocks schema evolution. Events carry IDs + the minimal meaningful payload.
- flag events named as commands (`SendEmail`, `UpdateStock`) → MEDIUM: an event states what happened; command-naming re-couples producer to consumer.
- flag handlers with no idempotency guard where delivery is at-least-once → HIGH.
- Event-sourced projects (0.4): MUST ATTENTION verify a versioning/upcasting strategy exists — why: a past event can never be changed, only upcast, and the first schema change without a plan has no rollback.

**Detection signal:** dispatch/publish call inside the same transaction scope as the repository save, or an integration-event type imported from the domain assembly.

#### P. Aggregate Concurrency + Transaction Boundary (MUST ATTENTION)

> Section F owns aggregate _shape_. This owns what makes "one aggregate per transaction" actually safe under concurrent load.

**Think:** two users act on the same aggregate at the same instant — what stops the second write from silently discarding the first?

- MUST ATTENTION verify aggregate roots carry an optimistic-concurrency token (version/rowversion/etag) when the discovered persistence layer supports one — absence is HIGH on any contended or money/data-integrity path — why: last-write-wins silently discards a committed decision.
- NEVER accept a concurrency token on a CHILD entity as the aggregate's token — the version belongs to the ROOT, because a change anywhere inside the aggregate is a change to the aggregate.
- flag a single transaction mutating 2+ aggregate roots → HIGH: lock-ordering and deadlock risk, and it blocks later service extraction. Route the second change through a domain event.
- flag an aggregate whose parts are routinely written by different users concurrently → MEDIUM sizing finding: the boundary is too big and produces concurrency failures on unrelated work.
- MUST ATTENTION check invariants claimed to span aggregates (uniqueness across all instances, "max N active per tenant") — these cannot live inside one aggregate; verify the owning mechanism (DB constraint + domain service, or a reservation pattern) exists and is stated — why: a set-based invariant enforced by an in-memory check races under concurrency and passes every single-threaded test.

**Detection signal:** repository save of two roots inside one unit-of-work scope, or a root type with no version/timestamp concurrency member.

---

## Phase 3: Holistic Synthesis + Fresh-Context Gate

After all Phase 2 files are reviewed, synthesize cross-entity DDD concerns in the current report. Do not spawn a fresh sub-agent only because findings exist. Findings must go through the why-review validation gate before any fix.

### 3.1 Model-Level Dimensions (MUST ATTENTION — judged over the whole model, NEVER per file)

Two concerns are invisible file-by-file and only appear when the model is viewed whole. Run one focused pass each.

**Dimension 1 — Bounded-context sharing.** **Think:** does one entity class serve two different businesses?

- MUST ATTENTION flag a single entity class consumed by two contexts with divergent rules (a `Customer` used by Sales, Support, AND Billing) → HIGH — why: the class accretes every context's fields and rules, becomes the god entity nobody can change, and no context owns it.
- The same word meaning different things per context is CORRECT, NEVER a duplication to eliminate — flag an attempt to unify them as a MEDIUM finding against the unifier.
- MUST ATTENTION verify a translation boundary exists where contexts meet (anti-corruption layer, mapper, published contract) — direct cross-context entity reuse is HIGH.
- flag domain concepts leaking into a shared/generic/infrastructure layer (tenant/customer/product IDs, business rules in a "reusable" base) → HIGH — why: a layer coupled to one consumer's domain is no longer reusable.

**Dimension 2 — Subdomain fit.** **Think:** does this code deserve a rich domain model at all?

- MUST ATTENTION judge fit BEFORE reporting anemic-model findings: a rich entity is correct in a **core** subdomain (complex, differentiating, changes often); Active Record or Transaction Script is CORRECT in supporting/generic subdomains and in pure CRUD.
- NEVER report "anemic model" against code whose subdomain has no invariants beyond required-field — that is CRUD, and the finding is noise — why: uniform tactical DDD over CRUD is itself an anti-pattern, adding ceremony and indirection with no invariant to protect.
- flag the inverse too: a **core** subdomain implemented as Transaction Script with business rules scattered across handlers → HIGH, this is where the rich model was owed.
- flag generic subdomains modelled in-house (auth, billing, email, scheduling) → MEDIUM: buy or adopt, do not model.
- MUST ATTENTION state the subdomain judgment and its evidence in the report — an anemic-model finding without it is unproven — why: "anemic" and "appropriately simple" look identical in a diff.

Spawn a fresh `code-reviewer` sub-agent only when one of these conditions is true:

- A validated-finding fix cycle has already changed the entity review target and this is the full re-review restart.
- The user/workflow explicitly requests an independent high-risk synthesis pass for broad entity-model changes.
- Phase 2 produced contradictory evidence that cannot be resolved in the current session without an independent read.

When a fresh-context pass is triggered, build the Agent call dynamically — set Target Files and Reference Docs from Phase 0/1 discoveries:

```
Agent({
  description: "Fresh full DDD entity review after validated fixes or explicit high-risk trigger",
  subagent_type: "code-reviewer",
  prompt: `
## Task
Review domain entity and value object files holistically for DDD design quality:
- Domain model coherence: entities vs VOs correctly classified across entire model?
- Aggregate boundary consistency across service/module?
- Anemic domain model: business logic consistently in entity or scattered in handlers?
- Navigation property hygiene across entire domain layer
- Ubiquitous language consistency across all entities
- Missed cross-entity interactions
- Bounded-context sharing: one entity class serving two contexts with divergent rules?
- Subdomain fit: does this model deserve rich entities, or is Active Record / Transaction Script correct here?
- Concurrency: do aggregate roots carry an optimistic-concurrency token? Any transaction mutating 2+ roots?
- Set-based invariants (uniqueness across all instances) — enforced by a real mechanism, or by a racy in-memory check?

## Review Mode
Fresh full review after a validated fix cycle or explicit high-risk trigger. ZERO memory of prior rounds. Re-read all target files from scratch via own tool calls.

## Protocols (follow VERBATIM)

### Evidence-Based Reasoning
Every claim needs proof. Cite file:line or grep results. Confidence: >80% act, 60-80% verify first, <60% DO NOT report.
NEVER write: "obviously", "I think", "should be", "probably".

### Project-Specific Discovery (MANDATORY before any finding)
1. Check docs/project-reference/ for entity reference docs, backend patterns, code review rules
2. grep -rn "class.*Entity\|class.*BaseEntity\|class.*RootEntity" <source-root>/ | head -10
3. grep -rn "ValueObject\|@ValueObject\|AbstractValueObject" <source-root>/ | head -10
4. Read discovered project reference docs — extract project-specific rules
5. NEVER flag violations contradicting discovered project conventions — verify against docs first

### Bug Detection for Domain Entities
Check every entity:
1. Null Safety: navigation properties guarded before use? Computed properties NPE-safe?
2. Boundary Conditions: empty collections in domain methods? Zero/negative invariants?
3. Error Handling: domain violations using project-specific exception type — NEVER raw language exceptions?
4. Aggregate Safety: child collections mutable bypassing domain methods?
5. Serialization Safety: navigation properties missing serialize-ignore annotation?

### DDD Design Patterns Quality
1. Entity = identity + lifecycle. VO = structural equality + immutable. NEVER swap roles.
2. Invariants enforced at entity level (lowest layer) — NEVER application layer only.
3. Aggregate: only root has repository; cross-aggregate = ID only; child mutations = domain method.
4. Domain events raised in entity — NEVER inline side effects in entity methods.
5. Anemic model: entity has no domain methods + handlers contain all logic → CRITICAL violation — BUT judge subdomain fit first: in a CRUD/supporting subdomain with no invariants, simple is CORRECT and "anemic" is a false finding.
6. Invariant vs validation: entity owns "can this state exist?"; the boundary owns "is this input acceptable?". A business rule living ONLY in a validator/handler = HIGH invariant gap. Input-shape/UX checks inside the entity = MEDIUM, wrong layer.
7. Failure signalling consistent with the project convention — mixed exception/`Result` for the same failure class = HIGH. NEVER raw language exceptions for domain violations.
8. Creation vs reconstitution are separate paths. Load path raising domain events = CRITICAL (N loaded entities emit N phantom events). Creation rules re-run on load = HIGH.
9. Event dispatch: synchronous in-transaction dispatch = CRITICAL (handler failure rolls back the business op); publish-before-commit = CRITICAL (announced a fact that may never have happened) — require the outbox. Internal domain events published as integration contracts = HIGH.
10. Concurrency: aggregate roots carry an optimistic-concurrency token (version on the ROOT, never on a child); a transaction mutating 2+ roots = HIGH.
11. Bounded contexts: one entity class shared across contexts with divergent rules = HIGH. The same word meaning different things per context is CORRECT — NEVER unify it.
12. Modelling paradigm: detect OO-mutable vs immutable/type-driven vs event-sourced BEFORE applying setter/mutability rules — NEVER flag a paradigm-appropriate pattern against a rule written for another paradigm.

### Fix-Layer Accountability
NEVER fix at crash site. Validation fails because handler skips entity validate()? → fix entity, not handler. Aggregate boundary violated? → fix entity relationship, not handler defensiveness.

### Graph-Assisted Investigation
When .code-graph/graph.db exists: run trace --direction both on 2-3 entity files.
CLI: python .claude/scripts/code_graph trace <file> --direction both --json --node-mode file

## Reference Docs
{insert docs discovered in Phase 0}
If none: read 3 existing entity files to infer project conventions before reviewing.

## Target Files
{insert entity/VO file list from Phase 1}

## Output
Write to plans/reports/domain-entities-rerun{N}-{date}.md:
- Status: PASS | FAIL
- Critical Issues (file:line evidence)
- High Priority Issues (file:line evidence)
- Cross-cutting DDD concerns
- Aggregate model coherence assessment
- Refactoring priority

Return report path and status. Every finding MUST have file:line evidence.
`
})
```

After sub-agent returns:

1. Read the sub-agent report
2. Integrate as `## Re-Review {N} Findings` in main report — NEVER filter or override
3. If findings remain: validate the new finding set before any additional fixes
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 2 full invocations with no progress, escalate via `AskUserQuestion`
5. Final verdict MUST incorporate every review pass that actually ran

---

## Phase 4: Final Report Generation

```markdown
## Domain Entities DDD Review — Final Report

**Mode:** {scan | changes}
**Tech Stack:** {discovered}
**Entity Base Classes:** {discovered from codebase}
**VO Base Classes:** {discovered from codebase}
**Scope / Date / Entity Count:** {values}

## Blast Radius Summary

Graph risk: {HIGH | MEDIUM | LOW | N/A} | Downstream consumers: {N}

## Health Score

{score}/100 — 100 - (CRITICAL×25 + HIGH×10 + MEDIUM×3 + LOW×1), min 0

## Critical Issues (block merge)

{severity} | {description} | {file:line} | {fix}

## High Priority Issues (must fix)

{severity} | {description} | {file:line} | {fix}

## Medium Issues (should fix)

{severity} | {description} | {file:line} | {fix}

## Low / Informational

{severity} | {description} | {file:line} | {fix}

## Re-Review Findings (if a fresh full re-review ran)

{integrated — not filtered}

## Positive Observations

{observation} | {evidence}

## Refactoring Priority (highest-impact first)

{priority} | {target} | {reason}

## Repository-Specific Rules Applied

{rule} | {evidence}

## Unresolved Questions

{question} | {owner/next step}
```

---

## Universal DDD Quick Reference

### Entity vs Value Object Decision Matrix

| Question                                      | YES →          | NO →             |
| --------------------------------------------- | -------------- | ---------------- |
| Needs unique persistent identity?             | Entity         | VO candidate     |
| Changes state after creation?                 | Entity         | VO candidate     |
| Snapshot at moment in time?                   | VO             | Entity candidate |
| Defined by attributes, not identity?          | VO             | Entity           |
| Two instances with same data interchangeable? | VO             | Entity           |
| Needs repository?                             | Aggregate Root | Entity or VO     |

### Invariant Enforcement Decision Table

| Location               | When to Use                                      |
| ---------------------- | ------------------------------------------------ |
| Constructor / Factory  | Invariants must hold from creation               |
| `validate()` override  | State invariants run before persistence          |
| `ensureCan*()` guard   | Operation preconditions (throw domain exception) |
| Before-delete hook     | Pre-delete constraints                           |
| Application layer ONLY | ← NEVER — always enforce in entity too           |

### Invariant vs Validation Decision Table

|               | **Invariant**                                  | **Validation**                        |
| ------------- | ---------------------------------------------- | ------------------------------------- |
| Question      | "Can this state legally exist?"                | "Is this input acceptable right now?" |
| Owner         | entity / aggregate                             | application boundary                  |
| Failure means | a bug, a broken model                          | a user error                          |
| Signalled as  | domain exception (or `Result` per convention)  | validation result / problem details   |
| Example       | order total always equals the sum of its lines | the email field is required           |

### Paradigm Adaptation Table (from Phase 0.4)

| Rule as written                    | OO-mutable    | Type-driven / immutable              | Event-sourced            |
| ---------------------------------- | ------------- | ------------------------------------ | ------------------------ |
| "No public setters" (D)            | applies       | N/A — nothing mutates                | N/A — no state to set    |
| "VO immutable" (C)                 | applies       | applies to entities too              | applies                  |
| "Reconstitution path separate" (N) | ORM ctor/hook | smart constructor                    | the event fold           |
| "Status enum + guards"             | correct       | **anti-pattern** — should be a union | replaced by event stream |
| "Events raised in entity" (H/O)    | applies       | applies                              | events ARE the state     |

### Aggregate Boundary Rules

```
CORRECT — cross-aggregate by ID:
  Entity A { string EntityBId; EntityB? entityB; }  ← ID + optional navigation

WRONG — cross-aggregate by object:
  Entity A { EntityB entityB; }  ← object reference = implicit coupling

CORRECT — child mutation via domain method:
  order.addLine(product, quantity);

WRONG — direct collection mutation:
  order.lines.add(new OrderLine(product, quantity));
```

### Code Smell Signals

```
Fat Entity:    file > 500 lines, > 20 properties → split by domain concept
Feature Envy:  method accesses 5+ properties of another entity → move to that entity
Data Clump:    3+ primitives always travel together → extract as Value Object
Primitive Obs: string email, string userId, decimal price → wrap in domain type
Anemic Model:  entity has 0 domain methods + all logic in handlers → move logic down
```

---

## Systematic Review Protocol (10+ Entity Files)

> **NON-NEGOTIABLE:** 10+ entity files in scope → switch to parallel sub-agents automatically.

1. announce: `"Detected {N} entity files. Switching to parallel DDD review protocol."`
2. Group by module/aggregate/type
3. Fire parallel `code-reviewer` sub-agents with `run_in_background: true` (one per group)
4. Each sub-agent: Phase 2 checklist + discovered project-specific rules → write to `plans/reports/domain-entities-{group}-round1-{date}.md`
5. Main agent consolidates: cross-aggregate violations, naming consistency, model coherence

---

## Output Summary Format

```
Domain Entities DDD Review

Health Score: {N}/100

Critical Issues: (block merge)
- {issue}: file:line — description + fix

High Priority: (must fix)
- {issue}: file:line — description + fix

Medium Issues: (should fix)
Positive Observations:
Unresolved Questions:

Report: plans/reports/domain-entities-review-{date}-{slug}.md
```

---

## Phase 5: Why-Review Self-Validation Gate (MANDATORY when findings exist)

> **Purpose:** Adversarial validation of own findings BEFORE handoff. Catches over-flagged Highs, false positives, and severity inflation at the source rather than letting them propagate downstream.

**Trigger:** Any finding produced (Critical, High, Medium, OR Low). Skip ONLY when the report's verdict is unconditional PASS with literally zero findings.

**Protocol:**

1. Read own finalized report from `plans/reports/{skill}-{date}-{slug}.md`
2. Invoke `/why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

MUST ATTENTION use `AskUserQuestion` after completing to present:

- **`/fix` (Recommended if FAIL)** — Fix critical and high-priority issues
- **`/scan --target=domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`/integration-test`** — Add integration tests for newly-enforced invariants
- **`/docs-update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** `TaskCreate` for ALL phases BEFORE starting. Mark each completed immediately.

> **CRITICAL RULES** — (1) MUST ATTENTION run Phase 0 project discovery FIRST — discovered conventions override ALL generic rules. (2) Validate findings before fixes; after validated fixes, restart a full review before declaring PASS. A clean review pass ENDS the review. (3) NEVER report a finding without `file:line` evidence.

---

**Prerequisites — MUST ATTENTION discover project-specific rules FIRST:**

> Read `docs/project-reference/` (entity reference, backend patterns, code review rules) and `CLAUDE.md`. Find entity/VO base classes, validation API, domain exception type, persistence annotations. Infer from 3+ existing entity files if no docs exist. NEVER apply generic rules that contradict discovered project conventions.

> **Evidence Gate:** Every finding requires `file:line` proof or grep result. Confidence >80% → report. <60% → state uncertainty explicitly.

---

## Mode Detection

**Determine mode BEFORE any other work:**

| Invocation                              | Mode             | Scope                                           |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| `/domain-entities-review` (default)     | **changes**      | Changed domain entity files from `git diff`     |
| `/domain-entities-review changes`       | **changes**      | Changed domain entity files                     |
| `/domain-entities-review scan`          | **scan**         | All entity/VO files in domain layer directories |
| `/domain-entities-review scan <module>` | **scan-service** | Entities in named module only                   |

**Entity file detection — adapt to discovered stack:**

```bash
git diff --name-only HEAD
rg --files {configured-source-roots}
```

Filter those results using the entity/value-object/aggregate naming conventions discovered from project config and project-reference docs. Never hardcode source roots, extensions, or framework folder names from this skill.

If no domain entity files match in changes mode → announce "No domain entity changes detected" and report clean.

---

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

<!-- SYNC:nested-task-creation -->

> **Nested Task Expansion Contract** — For workflow-step invocation, the `[Workflow] ...` row is only a parent container; the child skill still creates visible phase tasks.
>
> 1. Call `TaskList` first. If a matching active parent workflow row exists, set `nested=true` and record `parentTaskId`; otherwise run standalone.
> 2. Create one task per declared phase before phase work. When nested, prefix subjects `[N.M] $skill-name — phase`.
> 3. When nested, link the parent with `TaskUpdate(parentTaskId, addBlockedBy: [childIds])`.
> 4. Orchestrators must pre-expand a child skill's phase list and link the workflow row before invoking that child skill or sub-agent.
> 5. Mark exactly one child `in_progress` before work and `completed` immediately after evidence is written.
> 6. Complete the parent only after all child tasks are completed or explicitly cancelled with reason.
>
> **Blocked until:** `TaskList` done, child phases created, parent linked when nested, first child marked `in_progress`.

<!-- /SYNC:nested-task-creation -->

<!-- SYNC:project-reference-docs-guide -->

> **Project Reference Docs Gate** — Run after task-tracking bootstrap and before target/source file reads, grep, edits, or analysis. Project docs override generic framework assumptions.
>
> 1. Identify scope: file types, domain area, and operation.
> 2. **Read `docs/project-config.json` first — the project's machine-readable map.** It is the single source of truth for THIS repo (modules/paths, framework + search keywords, test/E2E/integration run-commands, design system, architecture rules, workflow patterns); ground exact paths, run-commands, and conventions on it **before investigating, planning, or coding** — never assume framework defaults (`CLAUDE.md` + reference docs are derived from it). If it — or the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any required reference doc — is missing or stale, auto-run `/project-init` or the narrow route (`/project-config`, `/docs-init`, `/scan-all`, `/scan --target=<key>`, `/claude-md-init`) first; if Codex mirrors or `AGENTS.md` are stale, ask the user to run `/sync-codex` (never auto-run it).
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

<!-- SYNC:understand-code-first -->

> **Understand Code First** — HARD-GATE: Do NOT write, plan, or fix until you READ existing code.
>
> 1. Search 3+ similar patterns (`grep`/`glob`) — cite `file:line` evidence
> 2. Read existing files in target area — understand structure, base classes, conventions
> 3. Run `python .claude/scripts/code_graph trace <file> --direction both --json` when `.code-graph/graph.db` exists
> 4. Map dependencies via `connections` or `callers_of` — know what depends on your target
> 5. Write investigation to `.ai/workspace/analysis/` for non-trivial tasks (3+ files)
> 6. Re-read analysis file before implementing — never work from memory alone. — why: long context drifts from the file; the file is ground truth
> 7. NEVER invent new patterns when existing ones work — match exactly or document deviation. — why: divergent patterns fragment the codebase and slow every future reader
>
> **BLOCKED until:** `- [ ]` Read target files `- [ ]` Grep 3+ patterns `- [ ]` Graph trace (if graph.db exists) `- [ ]` Assumptions verified with evidence

<!-- /SYNC:understand-code-first -->

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

<!-- SYNC:double-round-trip-review -->

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass clears the round's exit bar (see **Severity floor** below). **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **3-round ceiling** below.
>
> **Round cap — 3 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 3 with blocking findings still open (severity floor applied) → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 2-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
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
> **Universal scope (any new output/judgment):** any newly produced output or judgment gets **≥1 self-review**; any **new judgment** gets **≥1 `/why-review --validate-findings` pass**; anything flagged to re-check is re-checked **≥1 time** — before that output is treated as final. This loop is the default convergence contract for ANY work-producing skill, not review skills only.
>
> **Routing invariant (author-facing):** a skill that validates findings MUST route them through `/why-review --validate-findings` (the terminal validator) — NEVER fork an inline finding-validation. Routing through why-review is what makes the finding-survival bar and this loop apply; the `verify-review-validate-coverage` sensor enforces this exact route mechanically.
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **`blocking_findings(round, findings)` is non-empty** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
>
> **Fresh full re-review after every fix cycle:** Re-run the whole review protocol over the current full target. When sub-agents are part of that protocol, spawn NEW `Agent` calls — never reuse prior agents. Reviewers re-read ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh full review must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each full re-review, repeat the same decision against **that round's exit bar**: bar cleared → END; blocking findings remain → validate findings → fix → restart from the first review phase. Rounds 1-2 clear on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM, so a LOW-only round ENDS the loop** (deferred LOWs go in the report). Capped at **3 rounds**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 2 full invocations with no progress · a fix requires product/owner input · round 3 completes with CRITICAL/HIGH/MEDIUM still open. NEVER loop past 3 rounds, and NEVER convert cap exhaustion into a PASS.
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

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `/feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `Agent` tool calls — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Continue until a complete full review pass clears that round's exit bar per `SYNC:double-round-trip-review`: **rounds 1-2** → zero findings at any severity; **round 3+** → zero CRITICAL/HIGH/MEDIUM, so a round whose validated findings are ALL LOW ENDS the loop (list those LOWs as deferred instead of spawning another round). If the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
> - Track iteration count and repeated blockers in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

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
> **Step 4 — Create sub-tasks and execute.** For each identified concern: create a `TaskCreate` sub-task, work through it with `file:line` evidence, mark done. No findings without proof.
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

<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical + sequential thinking — every claim needs appropriate traced evidence (`file:line` for repo/code claims; source URL or artifact section for research, product, content, and docs claims); confidence >80% to act, <60% DO NOT recommend. Anti-hallucination: never present guess as fact, admit uncertainty freely, cross-reference independently, stay skeptical of own confidence.

<!-- /SYNC:critical-thinking-mindset:reminder -->

<!-- SYNC:understand-code-first:reminder -->

**MUST ATTENTION** discover project conventions (base classes, validation API, exception types) BEFORE applying checklist. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->

<!-- SYNC:evidence-based-reasoning:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
  <!-- /SYNC:evidence-based-reasoning:reminder -->

<!-- SYNC:graph-assisted-investigation:reminder -->

**MUST ATTENTION** run at least ONE graph command on key entity files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->

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
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `/project-init` or the narrow lower-level route before ordinary project-specific work.

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

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:double-round-trip-review:reminder -->

- **MANDATORY IMPORTANT MUST ATTENTION** execute the review loop (aka **Self-Review Convergence Loop**): review → validate findings → fix validated findings → full re-review. A complete review pass with zero findings ENDS the review. Any newly produced output/judgment gets ≥1 self-review; any new judgment gets ≥1 `/why-review --validate-findings` pass before it is treated as final.
- **MANDATORY** apply the **severity floor**: rounds 1-2 exit on zero findings at any severity; **from round 3 the bar is zero CRITICAL/HIGH/MEDIUM — LOW findings are no longer required to be fixed, so a LOW-only round ENDS the loop.** List every deferred LOW in the report; NEVER re-tier a real CRITICAL/HIGH/MEDIUM down to LOW to reach the exit, and NEVER apply the floor to a binary gate (test-green, security must-fix).
- **MANDATORY** enforce the **round cap of 3 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 3 completing with CRITICAL/HIGH/MEDIUM still open → **STOP & escalate via `AskUserQuestion`**, never a silent PASS. The 2-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

<!-- /SYNC:double-round-trip-review:reminder -->

<!-- SYNC:goal-contract-satisfaction-loop:reminder -->

- **MANDATORY** Resolve the active Goal Contract BEFORE work (active plan `goal.md` → `plans/goals/{YYMMDD-HHmm}-{slug}/goal.md` → create from current request) and read saved success criteria before editing.
- **MANDATORY** Append iteration evidence after execution; emit a Goal Satisfaction matrix (PASS/FAIL/BLOCKED) before reporting PASS; loop on validated FAIL; escalate repeated no-progress or blockers. NEVER store secrets in goal files.

<!-- /SYNC:goal-contract-satisfaction-loop:reminder -->

<!-- SYNC:trade-off-interrogation-gate:reminder -->

- **MANDATORY MUST ATTENTION ALWAYS ASK THE 3 TRADE-OFF QUESTIONS** — on the thing under review AND on every recommendation you make: (1) **is there any trade-off?** name what it SACRIFICES (change cost · complexity · perf · coupling · reversibility · migration · ops load · blast radius · security · testability · delivery time · UX) — "none"/"pure win" is an unfinished analysis, so state the dimensions checked; (2) **is it worth it?** gain (with a metric) vs cost, WHO pays, WHEN → emit **WORTH IT / NOT WORTH IT / UNCLEAR**; NOT WORTH IT → withdraw or replace it; (3) **is it material enough to confirm with the user?** irreversible/one-way door · cost shifted onto another team/ops/maintainer/user · one quality attribute traded for another · a tier/service/event/library boundary crossed · auth/money/data-integrity/breaking-change/High-or-Medium-risk path · verdict UNCLEAR → **STOP and confirm via `AskUserQuestion` BEFORE the verdict**.
- **MANDATORY** A MATERIAL trade-off with no user confirmation can NEVER be PASS; NEVER bury one as a Low-severity note, NEVER decide it silently, and NEVER let delivery or convergence pressure authorize a one-way door. — why: an un-walked-back one-way door is the user's call to make, not the reviewer's.
- **MANDATORY — non-asking contexts escalate BY HANDOFF, never by silence.** `AskUserQuestion` reaches only the main interactive agent: a sub-agent cannot ask the user, and a terminal/verdict-only mode asks nothing by design. There the duty is REDIRECTED, not waived — still name the trade-off, still decide materiality, record `confirmed? = NO — cannot ask from this context`, **state the unconfirmed MATERIAL trade-off in your RETURNED verdict/summary so the CALLER escalates it** (a note only in an on-disk report is not a handoff), and never emit an unqualified PASS. Applies ONLY where the user is genuinely unreachable (spawned sub-agent, terminal validate mode, headless run) — if you CAN ask, you MUST ask.

<!-- /SYNC:trade-off-interrogation-gate:reminder -->

<!-- SYNC:parallel-subagent-dispatch -->

> **Parallel Sub-Agent Dispatch** — Plan parallelism the moment a task breakdown exists, BEFORE executing it — running provably independent tasks sequentially wastes wall-clock. Applies to every multi-step job: workflow steps, planning, batch updates, investigation, research, scans, reviews, doc sync. **Plan execution is metadata-gated, NEVER default-parallel** — fan-out follows ONLY what the plan declares (`PAR`/`SEQ` tags + per-phase write set); an untagged plan runs sequentially — why: a derived write set cannot see cascade or generated writes.
>
> 1. **Tag every task `PAR` or `SEQ`.** `PAR` = inputs exclude every pending task's output AND write set disjoint from every other `PAR`. Else `SEQ` — MUST ATTENTION name the dependency forcing it.
> 2. **Group `PAR` into waves.** No edge between members. Two writers of one file NEVER share a wave. Read-only work (search, investigation, review, research) parallelizes freely.
> 3. **Declare before dispatch:** `Parallel plan: wave 1 = [...] · wave 2 = [...] · SEQ = [...] (reason)`.
> 4. **Spawn each wave in ONE message** — every `Agent` call in one response, NEVER dripped per turn. Route each task to its specialist (`.claude/skills/shared/sub-agent-selection-guide.md`); NEVER `code-reviewer` as catch-all.
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

**IMPORTANT MUST ATTENTION Goal:** Detect DDD design quality violations in domain entities/value objects across any stack — adapting to project-specific patterns via config/reference-doc discovery — so entities/VOs preserve invariants, aggregate boundaries, and discovered DDD conventions.

**Protocols in force — MUST ATTENTION (concise digest of the SYNC/shared blocks this skill carries):**

- **Source/Test Drift Check:** Source behavior change → inspect and reconcile affected tests.
- **AI Mistake Prevention:** verify generated content against evidence, trace downstream references, verify all affected outputs, re-read after context loss, surface ambiguity.
- **Nested Task Creation:** Workflow parent row NEVER replaces child phase tracking.
- **Project Reference Docs Guide:** Read required project-reference docs (incl. `lessons.md`) before target work.
- **Task Tracking & External Report:** Bootstrap tasks; persist review findings to `plans/reports/` incrementally.
- **Critical Thinking Mindset:** Traced `file:line` proof per claim; confidence >80% to act.
- **Understand Code First:** Discover conventions and grep 3+ patterns before applying checklist.
- **Graph-Assisted Investigation:** Run a graph trace on key entity files when graph.db exists.
- **Double Round-Trip Review:** Validate findings, fix, restart full re-review; clean pass ENDS loop.
- **Fresh Context Review:** Spawn fresh zero-memory sub-agent only after a validated-fix cycle.
- **Systematic Review Batching:** 10+ files → size-capped parallel batches, then reduce.
- **Severity Rubric:** Classify by consequence; Critical/High block PASS until resolved.
- **Category Review Thinking:** Derive each category's concerns from first principles — NEVER a fixed checklist.
- **Parallel Sub-Agent Dispatch:** Tag tasks PAR/SEQ, group PAR into disjoint-write-set waves, spawn each wave in ONE message, barrier before advancing.

**Top-3 (primacy-recency — these 3 are also at file top):**

- **MANDATORY MUST ATTENTION** Phase 0 project discovery FIRST — discovered base classes / validation API / domain exception type override ALL generic rules. NEVER apply generic DDD patterns without verifying the project's real entity/VO base classes — why: wrong base classes = wrong checklist, every downstream finding is then noise.
- **MANDATORY MUST ATTENTION** NEVER report any finding without `file:line` evidence — confidence >80% to report, 60-80% verify first, <60% DO NOT recommend — why: AI sub-agent reports inherit confirmation bias; unproven findings inflate severity downstream.
- **MANDATORY MUST ATTENTION** validate findings before fixing (Phase 5 why-review gate); after validated fixes restart the FULL review before declaring PASS — a clean review pass ENDS the review — why: every fix invalidates the prior verdict.

**Evidence + process gates:**

- **MANDATORY MUST ATTENTION** run mandatory Phase 1 grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, and write EVERY grep result to the report immediately — why: highest-signal violations surface fastest and batched writes lose findings on context loss.
- **MANDATORY MUST ATTENTION** bootstrap `TaskCreate` for ALL phases before any work; mark one task `in_progress`, mark `completed` immediately after evidence; on context loss call `TaskList` first — never duplicate — why: phase tracking survives compaction, memory does not.
- **MANDATORY MUST ATTENTION** read project-reference docs (`lessons.md`, entity/backend/code-review references) + `CLAUDE.md` and search 3+ existing entity files BEFORE applying any checklist — discovered conventions win — why: local conventions differ from generic framework defaults.
- **MANDATORY MUST ATTENTION** evaluate pattern FIT before copying a nearby entity pattern — verify the new context shares the same base class, scope, and lifetime — why: closest example ≠ matching preconditions.
- **MANDATORY MUST ATTENTION** run a graph trace on key entity files when `.code-graph/graph.db` exists, and inspect entity callers/usages before classifying anemic model or misplaced invariant — why: code existing ≠ code executing; the bug owner is the layer the data flows through.
- **MANDATORY MUST ATTENTION** append findings per file — NEVER batch; persist to `plans/reports/` incrementally and synthesize from disk — why: long sub-agents hit budget before a final batched write and lose everything.

**Domain rules (this skill's invariants):**

- **MANDATORY MUST ATTENTION** NEVER throw raw language exceptions for domain violations — use the project's discovered domain exception type — why: generic exceptions lose domain context and bypass the invariant contract.
- **MANDATORY MUST ATTENTION** NEVER allow mutable public state or reference equality on Value Objects — structural immutability + structural equality are non-negotiable — why: a mutable VO implies identity-through-mutation, which is an entity, not a VO.
- **MANDATORY MUST ATTENTION** enforce invariants at the entity (lowest layer) via constructor/factory/`validate()`/`ensureCan*()` — NEVER application-layer-only — why: any other entry point can then reach an invalid domain state.
- **MANDATORY MUST ATTENTION** NEVER give a child entity its own repository and NEVER reference another aggregate by object — ID only — why: only the aggregate root owns its consistency boundary; object references create implicit transaction coupling.
- **MANDATORY MUST ATTENTION** map every verified §5 invariant to a universally-quantified property TC + boundary counter-case (Dual-Feedback) — spec NAMES it AND a test GUARDS it — why: an enforced invariant with no property test is one refactor from silent regression.
- **MANDATORY MUST ATTENTION** treat 2+ violations of the same kind as a structural/architectural finding, not isolated style notes — why: repeated leaks reveal a missing pattern, not individual slips.
- **MANDATORY MUST ATTENTION** classify by consequence not fix-effort (CRITICAL/HIGH block PASS); 10+ entity files → switch to parallel `code-reviewer` sub-agents automatically — why: one "High" must mean the same everywhere, and serial review of many files exhausts context.
- **MANDATORY MUST ATTENTION** detect the modelling paradigm per aggregate (0.4) BEFORE applying any setter/mutability/reconstitution rule, and record which sections were adapted or marked N/A — NEVER flag a paradigm-appropriate pattern against a rule written for another paradigm — why: "no public setters" is a real finding in OO code and meaningless in a model that has none by construction.
- **MANDATORY MUST ATTENTION** judge subdomain fit (3.1) BEFORE reporting anemic model, and state the judgment with evidence — a rich model is owed in a CORE subdomain and is ceremony in CRUD — why: "anemic" and "appropriately simple" look identical in a diff, and uniform tactical DDD over CRUD is itself an anti-pattern.
- **MANDATORY MUST ATTENTION** separate invariant (entity owns "can this state exist?") from validation (boundary owns "is this input acceptable?"); a business rule living ONLY in a validator/handler is a HIGH invariant gap, and input-shape/UX checks inside the entity are MEDIUM wrong-layer — NEVER accept a DB constraint or trigger as the invariant's enforcement, it is a backstop — why: any other entry point reaches invalid state, and an opaque SQL error is not a domain contract.
- **MANDATORY MUST ATTENTION** keep failure signalling consistent with the Phase 0 convention — mixed exception/`Result` for the SAME failure class is HIGH; NEVER silently clamp bad input or return bare `bool` from a mutation — why: callers cannot know which to handle, so one path goes unhandled, and clamping persists wrong data with no signal.
- **MANDATORY MUST ATTENTION** verify creation and reconstitution are separate paths — the load path raising domain events is CRITICAL (N loaded entities emit N phantom events) and creation rules re-run on load is HIGH — why: without a separate path, creation invariants must be weakened until historical rows load.
- **MANDATORY MUST ATTENTION** NEVER allow synchronous in-transaction event dispatch (a handler failure rolls back the business operation) or publish-before-commit (announces a fact that may never have happened) — require the transactional outbox, clear the buffer after dispatch, and keep internal domain events distinct from published integration contracts — why: unrelated features must not be able to break the core write, and a published internal event couples every consumer to your model's shape permanently.
- **MANDATORY MUST ATTENTION** verify aggregate roots carry an optimistic-concurrency token on the ROOT (never on a child), flag any transaction mutating 2+ roots, and verify set-based invariants (uniqueness across all instances) have a real enforcing mechanism — why: last-write-wins silently discards a committed decision, and an in-memory uniqueness check races under concurrency while passing every single-threaded test.
- **MANDATORY MUST ATTENTION** flag one entity class shared across bounded contexts with divergent rules as HIGH, and NEVER treat the same word meaning different things per context as duplication to unify — verify a translation boundary exists where contexts meet — why: a unified cross-context entity accretes every context's rules until nobody owns it.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using `TaskCreate`; add a final "Analyze AI mistakes & lessons learned" review task.

> **Closing reminder — Easy to Change is the success metric.** Every finding, test, refactor, and abstraction must answer one question: _does this make the next change cheaper or more expensive?_ If it doesn't reduce future change cost, reject it. Coupling, hidden state, duplicated knowledge, and unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion                                           | Rebuttal                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Generic DDD rule fits, skip Phase 0"             | Discovered base classes override generic rules — verify the project's real entity/VO base FIRST or every finding is noise.                                                   |
| "Finding is obvious, skip evidence"               | No `file:line` proof = no finding. Confidence <60% → DO NOT recommend.                                                                                                       |
| "Clean enough, skip the re-review after fixes"    | Every fix invalidates the prior verdict — restart the full review until a clean pass ENDS it.                                                                                |
| "Looks anemic, flag it"                           | Inspect callers + base class first — pattern fit, not pattern resemblance, decides anemic vs. correct delegation.                                                            |
| "Invariant enforced in code, that's coverage"     | Dual-Feedback: spec must NAME it AND a property TC must GUARD it — code-only is INCOMPLETE.                                                                                  |
| "Many entities, review them inline"               | 10+ files → parallel sub-agents; persist per-file findings to `plans/reports/` or they vanish on budget cutoff.                                                              |
| "No setters here, model is fine"                  | Detect the paradigm (0.4) first — an immutable or event-sourced model has no setters BY CONSTRUCTION; the absence proves nothing until you know which model you are reading. |
| "Entity has no methods → anemic"                  | Judge subdomain fit (3.1) first. CRUD/supporting subdomain with no invariants → simple IS correct; the finding is noise.                                                     |
| "Rule is enforced, location is style"             | Location IS the rule. In a validator/handler it is bypassable by every other entry point — that is a HIGH invariant gap, not a preference.                                   |
| "Events are raised correctly, done"               | Raising is Section H. Section O owns WHEN they dispatch — in-transaction dispatch and publish-before-commit are CRITICAL regardless of how cleanly they were raised.         |
| "Single-threaded tests pass, concurrency is fine" | A set-based invariant checked in memory passes every single-threaded test and races in production. Verify the enforcing mechanism, not the test result.                      |

**IMPORTANT MUST ATTENTION** Phase 0 discovery FIRST (base classes override generic rules) · NEVER report a finding without `file:line` evidence at confidence >80% · validate findings before fixing, then restart the full review — a clean pass ENDS it.
