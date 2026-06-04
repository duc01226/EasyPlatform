---
name: review-domain-entities
description: '[DDD Quality] Use when you need to review domain entities and value objects for DDD design quality.'
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

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
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

**Goal:** Detect DDD design quality violations in domain entities and value objects across any technology stack — adapting to project-specific patterns via config/reference docs discovery — so domain entities and value objects preserve invariants, aggregate boundaries, and discovered DDD conventions.

**Summary:**

- Phase 0 is the gate: discover the project's real entity/VO base classes, validation API, and domain exception type FIRST — discovered conventions override every generic DDD rule, and wrong base classes mean the wrong checklist.
- Run the mandatory high-signal grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, and write every grep result to the report immediately.
- Apply the per-file checklist A–L (entity-vs-VO classification, VO immutability/structural equality, anemic-model detection, aggregate-by-ID, navigation serialization safety, ubiquitous language) — append findings per file, never batch.
- Findings drive a validation-first loop: validate via why-review (Phase 5 gate) before any fix, then restart a full review after validated fixes; a clean pass ENDS the review and every finding needs `file:line` evidence at confidence >80%.

**Workflow:**

1. **Phase 0** — Discover project stack + entity patterns + blast radius **(MANDATORY FIRST)**
2. **Phase 1** — Collect entity files; run mandatory grep patterns; create report
3. **Phase 2** — Entity-by-entity DDD review (universal checklist + project-specific rules)
4. **Phase 3** — Holistic synthesis in the current review pass; fresh context only after validated fixes or explicit high-risk synthesis trigger
5. **Phase 4** — Final report: critical issues, health score, recommendations

**Key Rules:**

- MUST ATTENTION discover project base classes in Phase 0 — NEVER assume generic patterns apply
- MUST ATTENTION run mandatory grep patterns in Phase 1 BEFORE reading individual files
- A clean review pass ENDS the review. When findings exist, validate them before fixing; do not spend a fresh-context pass re-reviewing the same findings before validation/fix.
- NEVER report finding without `file:line` evidence

**Severity Classification:**

| Severity | Action      | Definition                                                 |
| -------- | ----------- | ---------------------------------------------------------- |
| CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass |
| HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation |
| MEDIUM   | Should fix  | Design debt, maintainability, likely future bug            |
| LOW      | Nice to fix | Convention, documentation, minor clarity                   |

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

**Create task tracking tasks for all phases NOW before doing anything else:**

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

| Convention              | Discovered Value                     |
| ----------------------- | ------------------------------------ |
| Entity base class(es)   | `{class names with file:line}`       |
| VO base class(es)       | `{class names with file:line}`       |
| Validation API          | `{how validation done}`              |
| Domain exception type   | `{exception class used}`             |
| Navigation/FK pattern   | `{annotation + FK property pattern}` |
| Persistence annotations | `{ORM annotations}`                  |

If project reference docs exist → read them and extract: service-specific base class requirements, documented anti-patterns, naming conventions, cross-service rules.

### 0.2 Determine Entity File Scope

Apply mode-appropriate command from Mode Detection table, adapted to discovered stack.

### 0.3 Blast Radius Analysis

```bash
# When .code-graph/graph.db exists
python .claude/scripts/code_graph trace <entity-file> --direction both --json --node-mode file
```

Record: entity file count, downstream consumers, risk level. Use to prioritize review order (highest-impact first).

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

---

## Phase 3: Holistic Synthesis + Fresh-Context Gate

After all Phase 2 files are reviewed, synthesize cross-entity DDD concerns in the current report. Do not spawn a fresh sub-agent only because findings exist. Findings must go through the why-review validation gate before any fix.

Spawn a fresh `code-reviewer` sub-agent only when one of these conditions is true:

- A validated-finding fix cycle has already changed the entity review target and this is the full re-review restart.
- The user/workflow explicitly requests an independent high-risk synthesis pass for broad entity-model changes.
- Phase 2 produced contradictory evidence that cannot be resolved in the current session without an independent read.

When a fresh-context pass is triggered, build the Agent call dynamically — set Target Files and Reference Docs from Phase 0/1 discoveries:

```
spawn_agent({
  description: "Fresh full DDD entity review after validated fixes or explicit high-risk trigger",
  agent_type: "code-reviewer",
  prompt: `
## Task
Review domain entity and value object files holistically for DDD design quality:
- Domain model coherence: entities vs VOs correctly classified across entire model?
- Aggregate boundary consistency across service/module?
- Anemic domain model: business logic consistently in entity or scattered in handlers?
- Navigation property hygiene across entire domain layer
- Ubiquitous language consistency across all entities
- Missed cross-entity interactions

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
5. Anemic model: entity has no domain methods + handlers contain all logic → CRITICAL violation.

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
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 3 full invocations with no progress, escalate via a direct user question
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
2. Invoke `$why-review` skill with arg: `validate findings in plans/reports/{skill}-{date}-{slug}.md — verify each finding has file:line proof, steel-man each rejected interpretation, and stress-test severity classifications`
3. Read the validation verdict path returned by why-review, expected as `plans/reports/why-review-validate-{date}.md`
4. **If why-review demotes/removes any finding:** UPDATE own finalized report with revised severities, remove false positives, and add a `## Why-Review Validation Notes` section citing what changed and why
5. **If why-review confirms all findings:** Append `## Why-Review Validation` line to own report stating "All N findings re-validated against actual code; no severity changes."

**Skip conditions (record explicit reason if skipping):**

- Verdict is unconditional PASS with zero findings → log "Skipped — no findings to validate"
- Why-review skill itself is the active context (avoid recursion)

**Why this exists:** AI sub-agent reports inherit confirmation bias — the orchestrator absorbs severity claims as ground truth. The 2026-05-09 review incident produced 5 Highs; adversarial validation demoted 3 of them. Codify this as standard practice.

---

## Next Steps

MUST ATTENTION use a direct user question after completing to present:

- **`$fix` (Recommended if FAIL)** — Fix critical and high-priority issues
- **`$scan --target=domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`$integration-test`** — Add integration tests for newly-enforced invariants
- **`$docs-update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

---

> **[IMPORTANT]** task tracking for ALL phases BEFORE starting. Mark each completed immediately.

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
| `$review-domain-entities` (default)     | **changes**      | Changed domain entity files from `git diff`     |
| `$review-domain-entities changes`       | **changes**      | Changed domain entity files                     |
| `$review-domain-entities scan`          | **scan**         | All entity/VO files in domain layer directories |
| `$review-domain-entities scan <module>` | **scan-service** | Entities in named module only                   |

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
> **Assume existing values are intentional — ask WHY before changing.** Before changing a constant, limit, flag, wording, or pattern, read nearby context and history.
> **Surface ambiguity before acting — don't pick silently.** Multiple valid interpretations require an explicit question or stated assumption with risk.
> **Keep shared guidance role-relevant.** Universal guidance must help every receiving skill or agent; code-specific obligations belong only in code-specific protocols.

<!-- /SYNC:ai-mistake-prevention -->

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
> 2. Required docs by trigger: always `docs/project-reference/lessons.md`; doc lookup `docs-index-reference.md`; review `code-review-rules.md`; backend/CQRS/API `backend-patterns-reference.md`; domain/entity `domain-entities-reference.md`; frontend/UI `frontend-patterns-reference.md`; styles/design `scss-styling-guide.md` + `design-system/design-system-canonical.md`; integration tests `integration-test-reference.md`; E2E `e2e-test-reference.md`; feature docs/specs `feature-spec-reference.md` + `spec-system-reference.md` + `spec-principles.md`; behavior/public-contract/spec-test-code sync `workflow-spec-test-code-cycle-reference.md`; derived spec index/ERD/reimplementation guides `spec-system-reference.md` + source Feature Specs under `docs/specs/`; architecture/new area `project-structure-reference.md`.
> 3. Read every required doc. If `docs/project-config.json`, the docs index, `lessons.md`, `CLAUDE.md`, `AGENTS.md`, or any task-required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route (`$project-config`, `$docs-init`, `$scan-all`, `$scan --target=<key>`, `$claude-md-init`) before ordinary project-specific work. If Codex mirrors or `AGENTS.md` are missing/stale, ask the user to run `$sync-codex`; do not auto-run it.
> 4. Before target work, state: `Reference docs read: ... | Not applicable: ...`.
>
> **Ready when:** scope evaluated, required docs checked/read or setup route completed, `lessons.md` confirmed, citation emitted.

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

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `$why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
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
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues. If the same validated finding repeats for 3 full invocations with no progress, or a fix requires product/owner input, escalate via a direct user question.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - No arbitrary sub-agent-round cap replaces the clean-review requirement; use the 3 repeated-no-progress blocker rule only to avoid infinite spinning
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Context Re-Review** — Eliminate orchestrator confirmation bias after fixes by restarting the full review with isolated sub-agents where applicable.
>
> **Why:** The main agent knows what it (or `$feature-implement`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a validated-finding fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: validate findings → fix → full review restart from the first phase.
>
> **How:**
>
> 1. Start a NEW full review invocation/task breakdown; when that protocol calls for agents, spawn NEW `spawn_agent` tool calls — use `code-reviewer` agent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior full review found zero issues (no fixes = nothing new to verify)
> - NEVER skip the full review restart after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `spawn_agent` call
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via a direct user question
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

- **MANDATORY** After task-tracking bootstrap and before target/source work, read required project-reference docs and cite `Reference docs read: ...`.
- **MANDATORY** Always include `lessons.md`; project conventions override generic defaults.
- **MANDATORY** If project config, root instruction files, or any required reference doc is missing or stale, auto-run `$project-init` or the narrow lower-level route before ordinary project-specific work.

<!-- /SYNC:project-reference-docs-guide:reminder -->

<!-- SYNC:nested-task-creation:reminder -->

- **MANDATORY** Parent workflow rows do not replace child phase tracking; expand phases and link the parent when nested.
- **MANDATORY** Orchestrators pre-expand child skill phases before invocation; use `[N.M] $skill-name — phase` prefixes and one-`in_progress` discipline.

<!-- /SYNC:nested-task-creation:reminder -->

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

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

**Top-3 (primacy-recency — these 3 are also at file top):**

- **MANDATORY MUST ATTENTION** Phase 0 project discovery FIRST — discovered base classes / validation API / domain exception type override ALL generic rules. NEVER apply generic DDD patterns without verifying the project's real entity/VO base classes — why: wrong base classes = wrong checklist, every downstream finding is then noise.
- **MANDATORY MUST ATTENTION** NEVER report any finding without `file:line` evidence — confidence >80% to report, 60-80% verify first, <60% DO NOT recommend — why: AI sub-agent reports inherit confirmation bias; unproven findings inflate severity downstream.
- **MANDATORY MUST ATTENTION** validate findings before fixing (Phase 5 why-review gate); after validated fixes restart the FULL review before declaring PASS — a clean review pass ENDS the review — why: every fix invalidates the prior verdict.

**Evidence + process gates:**

- **MANDATORY MUST ATTENTION** run mandatory Phase 1 grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, and write EVERY grep result to the report immediately — why: highest-signal violations surface fastest and batched writes lose findings on context loss.
- **MANDATORY MUST ATTENTION** bootstrap task tracking for ALL phases before any work; mark one task `in_progress`, mark `completed` immediately after evidence; on context loss call the current task list first — never duplicate — why: phase tracking survives compaction, memory does not.
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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using task tracking; add a final "Analyze AI mistakes & lessons learned" review task.

> **Closing reminder — Easy to Change is the success metric.** Every finding, test, refactor, and abstraction must answer one question: _does this make the next change cheaper or more expensive?_ If it doesn't reduce future change cost, reject it. Coupling, hidden state, duplicated knowledge, and unclear intent are the real enemies — call them out by name.

**Anti-Rationalization:**

| Evasion                                        | Rebuttal                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| "Generic DDD rule fits, skip Phase 0"          | Discovered base classes override generic rules — verify the project's real entity/VO base FIRST or every finding is noise. |
| "Finding is obvious, skip evidence"            | No `file:line` proof = no finding. Confidence <60% → DO NOT recommend.                                                     |
| "Clean enough, skip the re-review after fixes" | Every fix invalidates the prior verdict — restart the full review until a clean pass ENDS it.                              |
| "Looks anemic, flag it"                        | Inspect callers + base class first — pattern fit, not pattern resemblance, decides anemic vs. correct delegation.          |
| "Invariant enforced in code, that's coverage"  | Dual-Feedback: spec must NAME it AND a property TC must GUARD it — code-only is INCOMPLETE.                                |
| "Many entities, review them inline"            | 10+ files → parallel sub-agents; persist per-file findings to `plans/reports/` or they vanish on budget cutoff.            |

**IMPORTANT MUST ATTENTION** Phase 0 discovery FIRST (base classes override generic rules) · NEVER report a finding without `file:line` evidence at confidence >80% · validate findings before fixing, then restart the full review — a clean pass ENDS it.

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
6. **EXECUTE:** Advance per the **Workflow Step Advancement & Parallel Phases** rule in your context instructions — model-driven; a sub-agent completion advances a step identically to an inline call; a parallel-phase group is an all-return barrier (advance only after ALL members return, never serialize it)

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
- **Grep ALL removed names after extraction/refactoring.** Primary file "done" ≠ secondary files clean. Grep entire scope for every removed symbol before declaring complete.
- **Assume existing values are intentional — ask WHY before changing.** Pattern-matching as "wrong" skips context. Before changing any constant/limit/flag: read comments, git blame, surrounding code.
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
- **Keep domain concepts out of generic/shared/infrastructure layers.** Reusable layer (shared library, framework, infra module) must reference NO consumer-specific domain concept — tenant/customer/product IDs, business entities, feature rules. Leak compiles + runs → passes review silently while coupling the "reusable" layer to one consumer. Keep shared type domain-free; push domain fields/logic down into the consumer via subclass/composition. — why: a layer coupled to one consumer's domain is no longer reusable.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
