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

- **Phase 0 (gate):** discover the project's real entity/VO base classes, validation API, domain exception type + blast radius FIRST — discovered conventions override every generic DDD rule. — why: wrong base classes = wrong checklist, every downstream finding is noise.
- **Phase 1:** create the report, run the mandatory high-signal grep patterns (hidden `validate()` overrides, leaked persistence/business logic, missing identity markers) BEFORE reading individual files, write every grep result immediately, categorize files (root/entity/VO/unknown).
- **Phase 2:** per-file checklist A–L (entity-vs-VO classification, base-class compliance, VO immutability/structural equality, anemic-model detection, domain invariants, invariant→property-TC Dual-Feedback, aggregate-by-ID, navigation serialization safety, domain events, query expressions, ubiquitous language, OOP) — append findings per file, NEVER batch.
- **Phase 3 → 4:** holistic cross-entity synthesis in the current pass, then final report with health score (`100 − (CRIT×25 + HIGH×10 + MED×3 + LOW×1)`); 10+ entity files → switch to parallel `code-reviewer` sub-agents automatically.
- **Phase 5 (validation-first loop):** validate via `/why-review` gate before any fix, fix only validated findings, then restart the FULL review; a clean pass ENDS the review. Every finding needs `file:line` at confidence >80%. Close with `AskUserQuestion` next-steps.

**Workflow:**

1. **Phase 0** — Discover project stack + entity/VO base classes + validation API + domain exception type + blast radius **(MANDATORY FIRST)**
2. **Phase 1** — Create report; run mandatory grep patterns BEFORE per-file reads; write results immediately; categorize files
3. **Phase 2** — Entity-by-entity DDD review (per-file checklist A–L + project-specific rules); append per file, never batch
4. **Phase 3** — Holistic cross-entity synthesis in the current pass; fresh-context sub-agent only after validated fixes or explicit high-risk trigger
5. **Phase 4** — Final report: critical issues, health score, refactoring priority, recommendations
6. **Phase 5** — Why-Review self-validation gate (MANDATORY when findings exist) → validate → fix validated → restart full review until clean → `AskUserQuestion` next-steps
7. **Scale rule** — 10+ entity files → parallel `code-reviewer` sub-agents, then consolidate

**Key Rules:**

- MUST ATTENTION discover project base classes in Phase 0 — NEVER assume generic patterns apply — why: wrong base classes = wrong checklist.
- MUST ATTENTION run mandatory grep patterns in Phase 1 BEFORE reading individual files — why: highest-signal violations surface fastest and seed the report.
- MUST ATTENTION validate findings via the Phase 5 `/why-review` gate before any fix, then restart the full review after validated fixes — a clean pass ENDS the review — why: every fix invalidates the prior verdict and AI reports inherit confirmation bias.
- NEVER report a finding without `file:line` evidence at confidence >80% — why: unproven findings inflate severity downstream.
- MUST ATTENTION append findings per file and persist to `plans/reports/` incrementally; 10+ entity files → parallel sub-agents — why: batched writes vanish on context/budget cutoff.

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
4. Repeat only after another validated-finding fix cycle; if the same blocker repeats across 3 full invocations with no progress, escalate via `AskUserQuestion`
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

> **Validated-Finding Fix + Full Re-Review Loop** — Re-review is triggered by a validated finding fix cycle, not by a round number. Review purpose: `review → validate findings → fix validated findings → full re-review` until a complete review pass finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> _aka **Self-Review Convergence Loop**._ The name is historical — there is **NO 2-round cap**; "double-round-trip" only means a validated-finding fix cycle forces at least one fresh re-review. It runs until a clean pass, bounded by the **5-round ceiling** below.
>
> **Round cap — 5 rounds MAX (a ceiling, NEVER a target).** A clean pass ENDS the loop immediately at ANY round — round 1 included; the cap never obliges you to keep spinning. Hitting round 5 with validated findings still open → **STOP and escalate via `AskUserQuestion`** with the still-open findings listed; NEVER emit a silent "good enough" PASS on cap exhaustion, and NEVER let the cap substitute for the clean-review requirement. The 3-repeated-no-progress blocker rule stays an EARLIER exit — escalate at whichever trips first.
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
> - **Issues found (FAIL, or any non-zero findings)** → run the active review skill's findings-validation gate first; for review skills the default gate is `/why-review --validate-findings <report-path>`. Fix only validated findings, then restart the full review protocol from the beginning with a fresh task breakdown.
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
> **Loop termination:** After each full re-review, repeat the same decision: clean → END; issues → validate findings → fix → restart from the first review phase. Continue until a complete review pass finds zero issues, **capped at 5 rounds**. Escalate via `AskUserQuestion` at whichever comes first: the same validated finding repeats for 3 full invocations with no progress · a fix requires product/owner input · round 5 completes with validated findings still open. NEVER loop past 5 rounds, and NEVER convert cap exhaustion into a PASS.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER fix unvalidated findings; validate first using the caller's validation gate
> - Every surviving finding must additionally clear the **finding-survival bar** defined in why-review's Findings Validation Routine (a deliberately higher bar than the generic act-gate — "keep this finding?" is a stricter question than "act on this evidence?"); a finding below the bar is demoted or dropped, not kept
> - NEVER skip the full re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration that uses sub-agents spawns NEW Agent calls
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - The 5-round cap NEVER replaces the clean-review requirement — it bounds runaway looping, it does not authorize shipping an un-clean review; a clean pass ends the loop early at any round, and cap exhaustion escalates rather than passes
> - Enforce the round cap of 5 alongside the 3 repeated-no-progress blocker rule; both are escalation triggers, neither is a completion criterion
> - Track recursive invocation count and repeated blockers in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

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
> - Continue until a complete full review pass has zero findings; if the same blocker repeats 3 times with no progress, escalate via `AskUserQuestion`
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
- **MANDATORY** enforce the **round cap of 5 — a ceiling, NEVER a target**: a clean pass ends the loop immediately at any round (round 1 included), and round 5 completing with validated findings still open → **STOP & escalate via `AskUserQuestion`**, never a silent PASS. The 3-repeated-no-progress blocker rule is an earlier exit — escalate at whichever trips first. NEVER loop open-ended.

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

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using `TaskCreate`; add a final "Analyze AI mistakes & lessons learned" review task.

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
