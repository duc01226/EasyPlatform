---
name: review-domain-entities
version: 1.0.0
description: '[DDD Quality] Review domain entities and value objects for DDD design quality. Works with any framework/language. Dual mode: scan all entities OR review changed entity files.'
---

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:START -->

> **[BLOCKING]** Execute skill steps in declared order. NEVER skip, reorder, or merge steps without explicit user approval.
> **[BLOCKING]** Before each step or sub-skill call, update task tracking: set `in_progress` when step starts, set `completed` when step ends.
> **[BLOCKING]** Every completed/skipped step MUST include brief evidence or explicit skip reason.
> **[BLOCKING]** If Task tools are unavailable, create and maintain an equivalent step-by-step plan tracker with the same status transitions.

<!-- PROMPT-ENHANCE:STEP-TASK-ANCHOR:END -->

> **[IMPORTANT]** `TaskCreate` for ALL phases BEFORE starting. Mark each completed immediately.

> **CRITICAL RULES** — (1) MUST ATTENTION run Phase 0 project discovery FIRST — discovered conventions override ALL generic rules. (2) When Round 1 finds issues, NEVER declare PASS without fresh sub-agent Round 2 after fixing. Clean Round 1 ENDS the review. (3) NEVER report a finding without `file:line` evidence.

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
> **CLI:** `python .claude/scripts/code_graph {command} --json`. Use `--node-mode file` first (10-30x less noise), then `--node-mode function` for detail.

<!-- /SYNC:graph-assisted-investigation -->

<!-- SYNC:double-round-trip-review -->

> **Fix-Triggered Re-Review Loop** — Re-review is triggered by a FIX CYCLE, not by a round number. Review purpose: `review → if issues → fix → re-review` until a round finds no issues. **A clean review ENDS the loop — no further rounds required.**
>
> **Round 1:** Main-session review. Read target files, build understanding, note issues. Output findings + verdict (PASS / FAIL).
>
> **Decision after Round 1:**
>
> - **No issues found (PASS, zero findings)** → review ENDS. Do NOT spawn a fresh sub-agent for confirmation.
> - **Issues found (FAIL, or any non-zero findings)** → fix the issues, then spawn a fresh sub-agent for Round 2 re-review.
>
> **Fresh sub-agent re-review (after every fix cycle):** Spawn a NEW `Agent` tool call — never reuse a prior agent. Sub-agent re-reads ALL files from scratch with ZERO memory of prior rounds. See `SYNC:fresh-context-review` for the spawn mechanism and `SYNC:review-protocol-injection` for the canonical Agent prompt template. Each fresh round must catch:
>
> - Cross-cutting concerns missed in the prior round
> - Interaction bugs between changed files
> - Convention drift (new code vs existing patterns)
> - Missing pieces that should exist but don't
> - Subtle edge cases the prior round rationalized away
> - Regressions introduced by the fixes themselves
>
> **Loop termination:** After each fresh round, repeat the same decision: clean → END; issues → fix → next fresh round. Continue until a round finds zero issues, or **3 fresh-subagent rounds max**, then escalate to user via `AskUserQuestion`.
>
> **Rules:**
>
> - A clean Round 1 ENDS the review — no mandatory Round 2
> - NEVER skip the fresh sub-agent re-review after a fix cycle (every fix invalidates the prior verdict)
> - NEVER reuse a sub-agent across rounds — every iteration spawns a NEW Agent call
> - Main agent READS sub-agent reports but MUST NOT filter, reinterpret, or override findings
> - Max 3 fresh-subagent rounds per review — if still FAIL, escalate via `AskUserQuestion` (do NOT silently loop)
> - Track round count in conversation context (session-scoped)
> - Final verdict must incorporate ALL rounds executed
>
> **Report must include `## Round N Findings (Fresh Sub-Agent)` for every round N≥2 that was executed.**

<!-- /SYNC:double-round-trip-review -->

<!-- SYNC:fresh-context-review -->

> **Fresh Sub-Agent Review** — Eliminate orchestrator confirmation bias via isolated sub-agents.
>
> **Why:** The main agent knows what it (or `/cook`) just fixed and rationalizes findings accordingly. A fresh sub-agent has ZERO memory, re-reads from scratch, and catches what the main agent dismissed. Sub-agent bias is mitigated by (1) fresh context, (2) verbatim protocol injection, (3) main agent not filtering the report.
>
> **When:** ONLY after a fix cycle. A review round that finds zero issues ENDS the loop — do NOT spawn a confirmation sub-agent. A review round that finds issues triggers: fix → fresh sub-agent re-review.
>
> **How:**
>
> 1. Spawn a NEW `Agent` tool call — use `code-reviewer` subagent_type for code reviews, `general-purpose` for plan/doc/artifact reviews
> 2. Inject ALL required review protocols VERBATIM into the prompt — see `SYNC:review-protocol-injection` for the full list and template. Never reference protocols by file path; AI compliance drops behind file-read indirection (see `SYNC:shared-protocol-duplication-policy`)
> 3. Sub-agent re-reads ALL target files from scratch via its own tool calls — never pass file contents inline in the prompt
> 4. Sub-agent writes structured report to `plans/reports/{review-type}-round{N}-{date}.md`
> 5. Main agent reads the report, integrates findings into its own report, DOES NOT override or filter
>
> **Rules:**
>
> - SKIP fresh sub-agent when the prior round found zero issues (no fixes = nothing new to verify)
> - NEVER skip fresh sub-agent after a fix cycle — every fix invalidates the prior verdict
> - NEVER reuse a sub-agent across rounds — every fresh round spawns a NEW `Agent` call
> - Max 3 fresh-subagent rounds per review — escalate via `AskUserQuestion` if still failing; do NOT silently loop or fall back to any prior protocol
> - Track iteration count in conversation context (session-scoped, no persistent files)

<!-- /SYNC:fresh-context-review -->

---

**Prerequisites — MUST ATTENTION discover project-specific rules FIRST:**

> Read `docs/project-reference/` (entity reference, backend patterns, code review rules) and `CLAUDE.md`. Find entity/VO base classes, validation API, domain exception type, persistence annotations. Infer from 3+ existing entity files if no docs exist. NEVER apply generic rules that contradict discovered project conventions.

> **Evidence Gate:** Every finding requires `file:line` proof or grep result. Confidence >80% → report. <60% → state uncertainty explicitly.

---

## Mode Detection

**Determine mode BEFORE any other work:**

| Invocation                              | Mode             | Scope                                           |
| --------------------------------------- | ---------------- | ----------------------------------------------- |
| `/review-domain-entities` (default)     | **changes**      | Changed domain entity files from `git diff`     |
| `/review-domain-entities changes`       | **changes**      | Changed domain entity files                     |
| `/review-domain-entities scan`          | **scan**         | All entity/VO files in domain layer directories |
| `/review-domain-entities scan <module>` | **scan-service** | Entities in named module only                   |

**Entity file detection — adapt to discovered stack:**

```bash
# .NET / C#
git diff --name-only HEAD | grep -E "(Domain|Entities|ValueObjects|AggregatesModel).*\.cs$"
find src -path "*/Domain/*.cs" -o -path "*/Entities/*.cs" -o -path "*/ValueObjects/*.cs" | grep -v "obj\|bin\|Tests"

# Java / Spring
git diff --name-only HEAD | grep -E "domain/.*\.java$|entity/.*\.java$"
find src -path "*/domain/*.java" -o -path "*/entity/*.java" | grep -v "test\|Test"

# TypeScript / Node
git diff --name-only HEAD | grep -E "\.(entity|vo|value-object|aggregate)\.ts$"
find src -name "*.entity.ts" -o -name "*.vo.ts" -o -name "*.aggregate.ts" | grep -v "spec\|test"

# Python (Django / SQLAlchemy)
git diff --name-only HEAD | grep -E "(models|domain)/.*\.py$"
find src -path "*/domain/*.py" -o -path "*/models/*.py" | grep -v "test\|migration"
```

If no domain entity files match in changes mode → announce "No domain entity changes detected" and report clean.

---

## Quick Summary

**Goal:** Detect DDD design quality violations in domain entities and value objects across any technology stack. Adapts to project-specific patterns via config/reference docs discovery.

**Workflow:**

1. **Phase 0** — Discover project stack + entity patterns + blast radius **(MANDATORY FIRST)**
2. **Phase 1** — Collect entity files; run mandatory grep patterns; create report
3. **Phase 2** — Entity-by-entity DDD review (universal checklist + project-specific rules)
4. **Phase 3** — Fresh `code-reviewer` sub-agent holistic assessment (Round 2)
5. **Phase 4** — Final report: critical issues, health score, recommendations

**Key Rules:**

- MUST ATTENTION discover project base classes in Phase 0 — NEVER assume generic patterns apply
- MUST ATTENTION run mandatory grep patterns in Phase 1 BEFORE reading individual files
- Clean Round 1 ENDS the review. When issues are found, NEVER declare PASS without fresh sub-agent Round 2 after fixing.
- NEVER report finding without `file:line` evidence

**Severity Classification:**

| Severity | Action      | Definition                                                 |
| -------- | ----------- | ---------------------------------------------------------- |
| CRITICAL | Block merge | Silent runtime failure, data corruption, validation bypass |
| HIGH     | Must fix    | Incorrect behavior, invariant gap, architectural violation |
| MEDIUM   | Should fix  | Design debt, maintainability, likely future bug            |
| LOW      | Nice to fix | Convention, documentation, minor clarity                   |

---

## Phase 0: Project Discovery + Mode Detection + Blast Radius

> **MANDATORY FIRST STEP.** Phase 0 gates all other work — wrong base classes = wrong checklist.

**Create `TaskCreate` tasks for all phases NOW before doing anything else:**

- `[Phase 0] Project stack discovery + mode detection + blast radius` — in_progress **(FIRST)**
- `[Phase 1] Collect entity files + grep patterns + create report` — pending
- `[Phase 2] Entity-by-entity DDD review` — pending
- `[Phase 3] Fresh sub-agent holistic review (Round 2)` — pending
- `[Phase 4] Generate final findings` — pending

### 0.1 Discover Project Stack and Entity Conventions

```bash
# Check for project reference docs
ls docs/project-reference/ 2>/dev/null
ls docs/ 2>/dev/null | grep -i "entity\|domain\|backend\|pattern"

# Detect tech stack
find . -name "*.csproj" -o -name "pom.xml" -o -name "build.gradle" -o -name "package.json" | head -5

# Find entity/VO base classes actually used
grep -rn "class.*Entity\|class.*RootEntity\|class.*BaseEntity\|class.*AbstractEntity" src/ | head -10
grep -rn ": PlatformValueObject\|: ValueObject\|@ValueObject\|extends AbstractValueObject" src/ | head -5
grep -rn "@Entity\|@Document\|@Table\|@Aggregate" src/ | head -10
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

### Mandatory Grep Patterns

MUST ATTENTION run these BEFORE reading individual files — highest-signal violations detected in seconds.

```bash
# ─── .NET / C# ───────────────────────────────────────────────────────────
# CRITICAL: public new Validate() — hides base virtual, framework validation NEVER runs
grep -rn "public new.*Validate()" src/ --include="*.cs"

# CRITICAL: navigation properties missing serialization-ignore annotation
grep -rn "public.*Entity\|public.*List<[A-Z]\|public.*ICollection<[A-Z]" src/ \
    --include="*.cs" | grep -v "\[JsonIgnore\]\|//\|private\|static\|protected"

# HIGH: VO files with mutable public setters
find src -path "*/ValueObjects/*.cs" | xargs grep -n "{ get; set; }" 2>/dev/null

# HIGH: domain methods throwing wrong exception type
grep -rn "throw new ArgumentException\|throw new InvalidOperationException" \
    src/**/Domain/ --include="*.cs" | grep -v "//\|test\|Test"

# HIGH: business conditionals leaked into application layer
grep -rn "\.Status ==" src/**/Application/UseCaseCommands/ --include="*.cs" 2>/dev/null | head -20
grep -rn "if.*entity\.\|entity\.\w* = " src/**/Application/UseCaseCommands/ \
    --include="*.cs" | grep -v "CreatedBy\|Id =" | head -20

# HIGH: static query expressions in handlers (should be on entity)
grep -rn "Expression<Func<" src/**/Application/ --include="*.cs" \
    | grep -v "Extensions\|Helper\|Repository" | head -20


# ─── Java / Spring ───────────────────────────────────────────────────────
# CRITICAL: entity equals() by reference (default Object)
grep -rn "@Entity" src/ --include="*.java" | xargs grep -L "equals\|@EqualsAndHashCode"

# HIGH: @Entity without @Id field
grep -rn "class.*@Entity\|@Entity" src/ --include="*.java" | xargs grep -L "@Id"

# HIGH: business logic in service layer
grep -rn "entity\.set\|entity\.status\b" src/**/service/ --include="*.java" | head -20

# HIGH: VO with mutable setters
find src -path "*/valueobject*/*.java" -o -path "*/vo*/*.java" \
    | xargs grep -n "public.*set[A-Z]" 2>/dev/null


# ─── TypeScript / NestJS ─────────────────────────────────────────────────
# CRITICAL: entity equality by reference
grep -rn "class.*Entity" src/ --include="*.entity.ts" | xargs grep -L "equals\|id ==="

# HIGH: VO missing readonly properties
find src -name "*.vo.ts" -o -name "*.value-object.ts" \
    | xargs grep -n "^\s*public " | grep -v readonly | head -20

# HIGH: business logic in services
grep -rn "entity\.\w* =" src/**/services/ --include="*.ts" | grep -v "// \|id\b" | head -20


# ─── Python (Django / SQLAlchemy) ────────────────────────────────────────
# HIGH: Model methods doing direct DB access
grep -rn "\.objects\.\|\.query\." src/**/domain/ --include="*.py" | head -20

# HIGH: business conditions in views/commands
grep -rn "if.*\.status ==" src/**/application/ --include="*.py" | head -20
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

#### A. Entity vs Value Object Classification

> Entity = unique identity persisting across time. VO = defined by attributes, immutable, interchangeable when equal. NEVER swap roles.

- MUST ATTENTION verify: does class need unique persistent identity? No → suspect VO misclassification.
- MUST ATTENTION flag: "snapshot at point in time" (contact at referral, price at purchase, measurement at check-in) → MUST be VO, NEVER entity.
- CRITICAL if VO has primary key or repository → VO masquerading as entity.
- MEDIUM if entity has 3+ scalar fields always moving together → data clump → VO candidate.
- MEDIUM if entity is effectively stateless (no state changes after creation) → suspect VO.

#### B. Base Class Compliance

> NEVER assume base class — ALWAYS use discovered values from Phase 0. Project docs override generic rules.

- MUST ATTENTION verify aggregate root extends project's root entity base (from Phase 0 discovery).
- NEVER use root entity base for non-root child entities — child entities MUST NOT have their own repository.
- MUST ATTENTION verify VOs extend project's VO base class — NEVER plain POCO/POJO in domain.
- MUST ATTENTION verify audited entities extend audited base where audit trail required.
- MUST ATTENTION cross-check each entity's base class against service/module-specific requirements from reference docs.

#### C. Value Object Immutability and Equality

> Mutable VOs are a design contradiction — they imply identity through mutation, which entities have, not VOs.

- NEVER allow mutable properties on VO:
    - C#: MUST use `{ get; init; }` or `{ get; }` — NEVER `{ get; set; }`
    - Java: fields MUST be `final` — NEVER bare fields with setters
    - TypeScript: MUST be `readonly` — NEVER bare mutable fields
    - Python: MUST use `@dataclass(frozen=True)` or `__slots__` + no setters
- Parameterless/default constructor allowed when required for framework deserialization.
- MUST ATTENTION verify equality based on structural value — NEVER reference equality:
    - C#: `Equals()` + `GetHashCode()` + operators OR extends platform VO base
    - Java: `equals()` + `hashCode()` on fields — NEVER default `Object` methods
    - TypeScript: custom `equals()` method
- MUST ATTENTION verify `validate()` overridden when VO has constraints (format, range, required).
- MUST ATTENTION verify factory method exists for non-trivial construction: `Create()`, `New()`, `Of()`, `From*()`.
- NEVER put async operations, repository calls, or infrastructure dependencies inside VO.
- Conversion/implicit operator defined when VO wraps single primitive.

#### D. Encapsulation and Anemic Domain Model

> Anemic model = entity is data bag, all logic in handlers. Fix: move behavior to entity (lowest layer).

- MUST ATTENTION verify entity has at least ONE domain method when it has business rules — NEVER pure property bag.
- NEVER allow direct property assignment for state transitions from outside entity — MUST use domain methods (`changeStatus()`, `approve()`, `assign()`).
- MUST ATTENTION flag: same guard clause in 3+ handlers for same entity → extract to `ensureCan*()` on entity.
- MUST ATTENTION flag: handler doing multi-field mutation (`entity.a=x; entity.b=y; entity.c=z`) without validation → domain method candidate.
- MUST ATTENTION flag: business conditionals in application layer referencing single entity's state → move to entity guard.
- Entity behavior MUST be caller-agnostic — methods describe domain intent, NEVER reference who calls them.

**Detection signal:** `entity.property = value` assignments (non-audit) in application layer = anemic model signal.

#### E. Domain Invariants

> Invariants enforced only in application layer = domain can reach invalid state via any other entry point.

- MUST ATTENTION verify entity validates own invariants (via `validate()`, constructor guard, or factory) — NEVER handler-only enforcement.
- MUST ATTENTION verify pre-operation guards as `ensureCan*()` / `validateCan*()` methods on entity.
- NEVER throw raw language exceptions for domain violations — MUST use project's domain exception type (discovered Phase 0): `ArgumentException`, `IllegalArgumentException`, `Error`, `ValueError` all WRONG.
- Invariants from creation MUST be enforced in factory method or constructor.
- CRITICAL: `validate()` MUST NOT be hidden by same-name method without calling `super` → silent validation dead zone.

**Detection signal:** Search for `validate()` override not calling `super.validate()` or framework base validation.

#### F. Aggregate Design

> Aggregate = consistency boundary. All invariants must flow through root. Cross-aggregate coupling = transaction trap.

- NEVER give child entity its own repository — ONLY aggregate root has repository.
- NEVER reference another aggregate by object — MUST use ID only (`string productId` NOT `Product product`).
- NEVER expose mutable collection directly — aggregate root MUST use domain methods for collection mutations.
- MUST ATTENTION verify composite-key entities implement project's composite ID pattern (discovered Phase 0).
- MUST ATTENTION flag aggregates with >5 independent child entities with separate lifecycles → splitting candidate.
- Deletion of aggregate root MUST validate pre-conditions on children (orphan prevention).

#### G. Navigation / Relationship Properties

> Navigation properties serializing into each other = circular reference crash or infinite memory allocation.

- CRITICAL: ALL navigation properties MUST carry serialization-ignore annotation:
    - C#: `[JsonIgnore]`
    - Java: `@JsonIgnore` or `@JsonBackReference`
    - TypeScript: `@Exclude()` or manual DTO projection
- Navigation properties MUST be nullable/optional — not always loaded.
- FK ID MUST be stored as primitive alongside navigation — NEVER navigation-only reference.
- NEVER use navigation properties in domain logic without null guard.
- Prefer unidirectional navigation — bidirectional only when both directions actively used.

#### H. Domain Events

> Entity raises events → handlers react. NEVER inline side effects in entity domain methods.

- MUST ATTENTION verify meaningful state changes raise domain events — NEVER tracked only by polling DB.
- Events MUST be raised INSIDE entity domain methods — NEVER from handlers/services.
- Side effects MUST go to event handlers — NEVER inline in entity domain method.
- Domain event naming: `{Entity}{Action}Event` or `{Entity}{PastTense}Event` (e.g., `OrderShippedEvent`).
- Entity domain methods MUST remain focused: raise event + update own state. Nothing else.

#### I. Static Query Expressions

> Query logic belongs on entity (lowest layer) — duplication in repos/handlers = wrong layer.

- MUST ATTENTION verify reusable filter expressions defined as static methods on entity (or companion class) — NEVER duplicated in repos/handlers.
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

- MUST ATTENTION verify SRP: entity represents ONE domain concept — conflating two → flag for split.
- NEVER instantiate infrastructure inside entity (repositories, HTTP clients, loggers) — MUST receive as parameters.
- New behaviors MUST go via new event handlers — NEVER by modifying entity conditionals (Open/Closed).
- Capability traits added via focused interfaces — NEVER monolithic interface bundle (ISP).
- Entity subclasses MUST be substitutable for base — `base.method()` NEVER skipped in override (LSP).

---

## Phase 3: Holistic Fresh Sub-Agent Review (Round 2)

After all Phase 2 files reviewed, spawn fresh `code-reviewer` sub-agent. Sub-agent has **ZERO memory of Phase 2**.

**Build Agent call dynamically** — set Target Files and Reference Docs from Phase 0/1 discoveries:

```
Agent({
  description: "Fresh Round 2 — DDD entity holistic review",
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

## Round
Round 2. ZERO memory of prior rounds. Re-read all target files from scratch via own tool calls.

## Protocols (follow VERBATIM)

### Evidence-Based Reasoning
Every claim needs proof. Cite file:line or grep results. Confidence: >80% act, 60-80% verify first, <60% DO NOT report.
NEVER write: "obviously", "I think", "should be", "probably".

### Project-Specific Discovery (MANDATORY before any finding)
1. Check docs/project-reference/ for entity reference docs, backend patterns, code review rules
2. grep -rn "class.*Entity\|class.*BaseEntity\|class.*RootEntity" src/ | head -10
3. grep -rn "ValueObject\|@ValueObject\|AbstractValueObject" src/ | head -10
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
Write to plans/reports/domain-entities-round2-{date}.md:
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

1. Read sub-agent report
2. Integrate as `## Round 2 Findings (Fresh Sub-Agent)` in main report — NEVER filter or override
3. If FAIL: fix issues → spawn NEW Round 3 agent (NEVER reuse Round 2 agent)
4. Max 3 fresh rounds → escalate via `AskUserQuestion` if still failing
5. Final verdict MUST incorporate ALL rounds

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

## Medium Issues (should fix)

## Low / Informational

## Round 2 Findings (Fresh Sub-Agent)

{integrated — not filtered}

## Positive Observations

## Refactoring Priority (highest-impact first)

## Project-Specific Rules Applied

## Unresolved Questions
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

1. MUST ATTENTION announce: `"Detected {N} entity files. Switching to parallel DDD review protocol."`
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

## Next Steps

MUST ATTENTION use `AskUserQuestion` after completing to present:

- **`/fix` (Recommended if FAIL)** — Fix critical and high-priority issues
- **`/scan-domain-entities`** — Update domain-entities-reference.md (scan mode)
- **`/integration-test`** — Add integration tests for newly-enforced invariants
- **`/docs-update`** — Update feature docs if entity contracts changed
- **"Skip, continue manually"** — user decides

---

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:START -->

## Prompt-Enhance Closing Anchors

**IMPORTANT MUST ATTENTION** follow declared step order for this skill; NEVER skip, reorder, or merge steps without explicit user approval
**IMPORTANT MUST ATTENTION** for every step/sub-skill call: set `in_progress` before execution, set `completed` after execution
**IMPORTANT MUST ATTENTION** every skipped step MUST include explicit reason; every completed step MUST include concise evidence
**IMPORTANT MUST ATTENTION** if Task tools unavailable, maintain an equivalent step-by-step plan tracker with synchronized statuses

<!-- PROMPT-ENHANCE:STEP-TASK-CLOSING:END -->

<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid on every task:
>
> **Check downstream references before deleting.** Deleting components causes documentation and code staleness cascades. Map all referencing files before removal.
> **Verify AI-generated content against actual code.** AI hallucinates APIs, class names, and method signatures. Always grep to confirm existence before documenting or referencing.
> **Trace full dependency chain after edits.** Changing a definition misses downstream variables and consumers derived from it. Always trace the full chain.
> **Trace ALL code paths when verifying correctness.** Confirming code exists is not confirming it executes. Always trace early exits, error branches, and conditional skips — not just happy path.
> **When debugging, ask "whose responsibility?" before fixing.** Trace whether bug is in caller (wrong data) or callee (wrong handling). Fix at responsible layer — never patch symptom site.
> **Assume existing values are intentional — ask WHY before changing.** Before changing any constant, limit, flag, or pattern: read comments, check git blame, examine surrounding code.
> **Verify ALL affected outputs, not just the first.** Changes touching multiple stacks require verifying EVERY output. One green check is not all green checks.
> **Holistic-first debugging — resist nearest-attention trap.** When investigating any failure, list EVERY precondition first (config, env vars, DB names, endpoints, DI registrations, data preconditions), then verify each against evidence before forming any code-layer hypothesis.
> **Surgical changes — apply the diff test.** Bug fix: every changed line must trace directly to the bug. Don't restyle or improve adjacent code. Enhancement task: implement improvements AND announce them explicitly.
> **Surface ambiguity before coding — don't pick silently.** If request has multiple interpretations, present each with effort estimate and ask. Never assume all-records, file-based, or more complex path.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:understand-code-first:reminder -->

**MUST ATTENTION** discover project conventions (base classes, validation API, exception types) BEFORE applying checklist. Run graph trace when graph.db exists.

<!-- /SYNC:understand-code-first:reminder -->
<!-- SYNC:graph-assisted-investigation:reminder -->

**MUST ATTENTION** run at least ONE graph command on key entity files when graph.db exists. Pattern: grep → trace → verify.

<!-- /SYNC:graph-assisted-investigation:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **MANDATORY MUST ATTENTION** Phase 0 project discovery FIRST — discovered conventions override ALL generic rules. NEVER apply generic patterns without verifying project base classes.
- **MANDATORY MUST ATTENTION** run mandatory grep patterns in Phase 1 BEFORE reading individual files — fastest path to highest-signal violations.
- **MANDATORY MUST ATTENTION** when Round 1 finds issues, always spawn fresh sub-agent for Round 2 after fixing. Clean Round 1 ENDS the review.
- **MANDATORY MUST ATTENTION** NEVER report any finding without `file:line` evidence — confidence >80% to act.
- **MANDATORY MUST ATTENTION** NEVER throw raw language exceptions for domain violations — use project's domain exception type.
- **MANDATORY MUST ATTENTION** NEVER allow mutable properties on Value Objects — structural immutability is non-negotiable.

**[TASK-PLANNING]** Before acting, analyze task scope and systematically break it into small todo tasks and sub-tasks using TaskCreate.

> **[IMPORTANT]** Analyze how big the task is and break it into many small todo tasks systematically before starting — this is very important.
