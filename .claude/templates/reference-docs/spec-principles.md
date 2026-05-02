# Project Spec Principles

> **Spec-as-source-of-truth reference.** Every spec skill, workflow, review aligns with this document. In conflict: this document wins.

---

## Quick Summary

**Goal:** Define spec quality standards, structure, and AI-implementability requirements across project spec layers.

**Key Rules:**

- NEVER bypass canonical locations — QA dashboard is sync artifact, NEVER hand-edited
- NEVER use tech-specific types (C#, EF Core, RabbitMQ) in engineering spec A–E files
- MUST ATTENTION cite `[Source: file:line]` on every business rule and test case — no source = spec unverified
- MUST ATTENTION apply ambiguity test before marking spec implementation-complete
- Every feature doc MUST have at least one P0 (auth) TC and one P1 (core workflow) TC

---

## 1. Core Philosophy

### Spec-as-Source-of-Truth

Spec = authoritative description of what system does and why — independent of implementation. Code implements spec. Tests verify spec. If code and spec disagree, investigate spec first: may be stale, or code may be wrong.

Three maturity levels (Fowler/Thoughtworks 2025):

| Level              | Meaning                                              | Project Application          |
| ------------------ | ---------------------------------------------------- | ---------------------------- |
| **Spec-first**     | Spec guides initial dev; may drift afterward         | Minimum acceptable           |
| **Spec-anchored**  | Spec evolves alongside code; updated on every change | Target state                 |
| **Spec-as-source** | Humans edit specs only; code regenerated from spec   | Future AI-replatforming mode |

Projects using this template should target **Spec-anchored**. Engineering spec + feature docs are updated on every feature completion via `workflow-spec-driven-dev update` and `/docs-update`.

### Why Tech-Agnostic?

Spec tied to C# types or framework patterns has lifespan equal to current stack. Tech-agnostic spec survives stack migration, enables AI replatforming, readable by non-engineers. **Rule: new engineering team on different stack must implement system from spec alone.**

### Why Evidence-Tagged?

Every business rule and TC traces to `[Source: file:line]`. Anti-hallucination contract: without source evidence, spec may describe behavior code never implements. Evidence enables staleness detection — source file changed but spec unchanged = spec stale.

---

## 2. Spec Levels — The Hierarchy

```
Platform
  └── App Bucket or System Group
        └── Service / System  (growth, candidate, surveys, …)
              └── Module  (GoalManagement, KudosFeature, …)
                    └── Feature  (individual detailed-feature doc)
```

| Level                  | Canonical Location                       | Format                           | Depth                               | Owner Skill                 |
| ---------------------- | ---------------------------------------- | -------------------------------- | ----------------------------------- | --------------------------- |
| **Service/System**     | `docs/specs/{app-bucket}/{system-name}/` | Tech-agnostic bundle (A–F files) | Architect-level, 4,000 lines/module | `spec-discovery`            |
| **Module**             | `docs/business-features/{Module}/`       | 17-section stakeholder doc       | Feature-level, 500–1,500 lines      | `feature-docs`              |
| **Test Case Registry** | Feature doc Section 15                   | TC-{FEAT}-{NNN} GWT entries      | Per-test, GIVEN/WHEN/THEN           | `tdd-spec`                  |
| **QA Dashboard**       | `docs/specs/{Module}/README.md`          | Aggregated TC dashboard          | Synced view, not canonical          | `tdd-spec [direction=sync]` |

**MUST ATTENTION:** Canonical locations NEVER bypassed. QA dashboard = sync artifact derived from Section 15, NEVER hand-edited. Engineering spec bundle = primary tech-agnostic layer. Business feature doc = primary stakeholder layer. Both coexist and kept in sync.

---

## 3. Essential Spec Sections

### Engineering Spec Bundle (A–F files per module)

Fixed-purpose files. NEVER duplicate across files.

| File                     | Phase    | Contents                                                               | Completeness Signal                                                        |
| ------------------------ | -------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `A-domain-model.md`      | Domain   | Entities, value objects, aggregates, attributes, lifecycle, invariants | All entities have purpose + attribute table + invariants                   |
| `A-domain-erd.md`        | Domain   | Mermaid `erDiagram` — all entities, relationships, cardinalities       | Every entity appears; every relationship has cardinality                   |
| `B-business-rules.md`    | Rules    | Validation rules, authorization rules, state machines, calculations    | Every operation has at least one rule group with `[Source]`                |
| `C-api-contracts.md`     | API      | Operations (transport, auth, idempotency, input/output/errors)         | Every public operation documented; every operation has error cases         |
| `D-events-jobs.md`       | Events   | Published events, consumed events, scheduled jobs                      | Every async path documented; idempotency stated                            |
| `E-user-journeys.md`     | Journeys | Actor, trigger, happy path, alternatives, outcome, acceptance criteria | Every primary user goal has GIVEN/WHEN/THEN acceptance criterion           |
| `README.md` (per module) | Summary  | 17-section summary linking to A–E files                                | Completeness table present; no `[UNVERIFIED]` items without exclusion note |

### Business Feature Doc (17 Sections)

All 17 sections mandatory. Hardest to get right:

| Section                           | What "Complete" Looks Like                                               | Common Gap                                                                 |
| --------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **5. Domain Model**               | Mermaid ERD + all entities with attribute tables + `[Source: file:line]` | ERD missing cross-module refs; no lifecycle states                         |
| **6. Business Rules**             | Every BR-XX rule group has `[Source: file:line]` after table             | Rules stated without source; error messages not verified against constants |
| **8. Commands & Operations**      | Each command lists which BR-XX rules it validates                        | Commands listed without rule cross-references                              |
| **12. Cross-Service Integration** | Every bus event (published + consumed) named with payload schema         | Bus events named by C# class name instead of business event name           |
| **13. Security & Permissions**    | Permission matrix per role for every operation                           | Missing unauthorized-access cases                                          |
| **15. Test Specifications**       | TC table summary + TC entries with GIVEN/WHEN/THEN + Evidence + Status   | Evidence missing; authorization TCs absent; only happy-path covered        |

---

## 4. Spec Completeness Criteria

Spec is **implementation-complete** when engineering team with no prior codebase knowledge can implement feature without guessing (adapted from arxiv:2602.00180, Augment Code SDD guide 2025).

### Implementation-Complete Checklist

- **Domain model** — every entity has purpose, attributes (with constraints), lifecycle states, invariants
- **Business rules** — every operation has at least one validation rule; every rule has error condition + message
- **State machines** — every entity with status/state has complete transitions table (from → trigger → guard → to)
- **API contracts** — every operation has transport, auth requirement, input schema, output schema, error cases
- **Cross-service events** — every async flow names event, payload, producer, consumer, idempotency handling
- **Authorization** — every operation states who can perform it and under what conditions
- **Edge cases** — at least one failure/validation scenario per operation documented

### Test-Complete Checklist

Spec is **test-complete** when all TCs can be derived without reading source code:

- **Every functional requirement** maps to at least one TC in Section 15
- **Every business rule** maps to at least one negative TC (rule violated → what happens)
- **Every authorization rule** maps to at least one auth TC (unauthorized access rejected per role)
- **Every state transition** maps to at least one TC (valid succeeds; invalid rejected)
- **Every integration event** maps to at least one TC (event published after trigger; consumer processes correctly)
- **Priority coverage** — at least one P0 TC per security/auth concern; P1 per core workflow
- **Preservation TCs** — for bugfixes, at least one TC per "healthy input" that must NOT regress

### AI-Implementability Checklist

Spec is **AI-implementable** when AI agent generates correct code without clarifying questions (arxiv:2602.00180, Addy Osmani 2025):

- **Unambiguous outcomes** — completion state described with observable, testable results (not "handle the case")
- **Explicit scope boundaries** — both in-scope and out-of-scope items stated
- **All constraints named** — performance SLAs, size limits, format requirements, uniqueness rules all explicit
- **Prior architectural decisions** — tech stack choices, existing patterns to follow, conventions to obey
- **No implementation-specific language** — no class names, framework types, or ORM constructs
- **Examples provided** — at least one concrete input/output example per operation
- **Error cases exhaustive** — all known error conditions named; no "handle errors appropriately" vagueness
- **Cross-service dependencies** — every external system dependency named with its contract

---

## 5. Tech-Agnostic Rules

Engineering spec bundle (A–E files) MUST survive full stack replacement. Business feature docs minimize tech references (exceptions: Section 8 Commands and Section 11 API Reference, which may use simplified API notation).

### Forbidden in Engineering Spec (A–E files)

| Forbidden                                | Use Instead                                                        |
| ---------------------------------------- | ------------------------------------------------------------------ |
| `Guid`, `int?`, `List<T>`, `string?`     | `string`, `number`, `boolean`, `date`, `list (of X)`, `optional X` |
| `OrderEntity`, `UserModel`               | `Order`, `User` (business name only)                               |
| `[Required]`, `@Column`, `@JsonProperty` | Capture in attribute constraint column                             |
| `IRepository<T>`, `DbContext`, `EF Core` | "data store", "persistence layer"                                  |
| `CQRS`, `Command Handler`, `MediatR`     | "command processor", "operation handler"                           |
| `RabbitMQ`, `MassTransit`, `Azure Bus`   | "message bus", "event bus"                                         |
| `JWT`, `OAuth`, `IdentityServer`         | "authentication token", "identity provider"                        |
| Framework file paths or class names      | Business operation names only                                      |

### Permitted in Business Feature Docs

Sections 8 and 11 may use:

- HTTP verbs and simplified URL paths (e.g., `POST /goals`)
- Business-level operation names (e.g., "Create Goal")
- Role names as defined in domain (e.g., "HR Manager", "Employee")

Still forbidden: C# types, ORM names, file paths, class names.

---

## 6. Test Coverage Mapping

| Spec Section                    | Mandatory TC Category                  | TC Format |
| ------------------------------- | -------------------------------------- | --------- |
| Section 4 (FR-XX / US-XX)       | Positive (happy path per FR)           | P1        |
| Section 6 (BR-XX rules)         | Negative (rule violation per BR)       | P1–P2     |
| Section 6 (invariants)          | Edge case (boundary conditions)        | P2        |
| Section 8 (Commands)            | CRUD operations                        | P0–P1     |
| Section 9 (Events)              | Event propagation, consumer processing | P1        |
| Section 12 (Cross-Service)      | Integration scenarios                  | P1        |
| Section 13 (Auth / Permissions) | Authorization (per role per operation) | P0        |
| Section 14 (Performance)        | Performance (SLA verification)         | P2–P3     |
| State machines (Section 5/6)    | State transition (valid + invalid)     | P1–P2     |
| Bugfix context                  | Preservation (regression guard)        | P0        |

### TC Priority Mapping

| Priority        | When Required                                                       |
| --------------- | ------------------------------------------------------------------- |
| **P0 Critical** | Security, auth checks, data integrity invariants, regression guards |
| **P1 High**     | Core happy-path per primary operation, event propagation            |
| **P2 Medium**   | Validation rules, secondary workflows, state transitions            |
| **P3 Low**      | UI polish, non-critical edge cases, performance benchmarks          |

MUST ATTENTION: Every feature doc MUST have at least one P0 (authorization) and one P1 (core workflow) TC.

---

## 7. AI Implementability — Spec-to-Code Contract

Based on Thoughtworks SDD analysis (2025), Google migration results (80% AI-authored code), arxiv SDD paper (2602.00180).

### Properties That Reduce Hallucination

1. **Determinism of intent** — one valid interpretation per requirement. Test: "Can two developers read this and reach same design?"
2. **Exhaustive error cases** — AI invents plausible errors if not specified. Every operation needs named failure modes.
3. **Cross-reference completeness** — if rule references another entity/operation, that target must also be specified.
4. **Scope closure** — explicitly state what feature does NOT do. AI expands scope without explicit boundaries.
5. **Concrete examples** — abstract constraints produce abstract code. One input/output example beats three paragraphs.

### The Ambiguity Test

Before marking spec implementation-complete: "Could two different engineers produce two different implementations from this spec, both claiming conformance?" If yes → add tiebreaker rule, constraint, or example.

### Spec Anti-Patterns That Cause AI Hallucination

| Anti-Pattern                          | Why It Causes Hallucination                                   | Fix                                                              |
| ------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| "Handle the error appropriately"      | AI invents error handling that may not match UX/domain intent | Name specific error code, message, HTTP status                   |
| "Validate the input"                  | AI adds or omits validation fields                            | List every validated field with rule and error condition         |
| "Standard auth required"              | AI assumes wrong auth model                                   | Name required role/permission explicitly                         |
| "Similar to X feature"                | AI imports irrelevant behavior from X                         | Specify independently; cross-references only for shared concepts |
| No invariants documented              | AI misses compound validity rules                             | State every "always true" condition entity enforces              |
| Attribute type uses language generics | AI infers wrong language                                      | Use business-language types only                                 |
| Missing state machine                 | AI invents transition rules                                   | Document every valid state transition explicitly                 |
| "Performance should be acceptable"    | AI ignores performance                                        | State specific SLA (e.g., "< 200ms p95")                         |

---

## 8. Living Spec Protocol

### The Sync Chain

```
Source Code
    ↓ read by spec-discovery / feature-docs
Engineering Spec (docs/specs/{app-bucket}/{system-name}/)   ← tech-agnostic, AI-grade
Business Feature Doc (docs/business-features/)              ← stakeholder-grade, TC canonical
    ↓ Section 15 read by tdd-spec [direction=sync]
QA Dashboard (docs/specs/{Module}/)                         ← read-only derived artifact
    ↓ TCs implemented by integration-test skill
{Module}.IntegrationTests/                                  ← actual test code
```

**Invariant:** Every layer derives from layer above. Edits flow downward only. NEVER hand-edit QA dashboard — sync from feature docs Section 15.

### When to Update Which Layer

| Trigger                               | Update                                                                  | Skill                             |
| ------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| New feature shipped                   | Engineering spec + feature doc + Section 15                             | `workflow-spec-driven-dev update` |
| Bug fixed                             | Feature doc Section 15 + add regression TC                              | `tdd-spec update`                 |
| Code refactor (behavior unchanged)    | Engineering spec only (API contracts, domain model if entities changed) | `spec-discovery update`           |
| New PBI groomed (not yet implemented) | Feature doc Section 15 (Status: Planned)                                | `tdd-spec TDD-first`              |
| Quarterly health check                | Audit both layers for staleness                                         | `workflow-spec-driven-dev audit`  |

### Staleness Detection

Spec stale when:

- `git log --since="{last_extracted}" -- {source_path}` returns changed files
- Changed files map to phase covered by spec (entity → Phase A, validator → Phase B, etc.)

Run `workflow-spec-driven-dev audit` quarterly or before major releases.

### Frontmatter Requirements

Every engineering spec file MUST contain:

```yaml
---
module: { module-name }
phase: A|B|C|D|E
last_extracted: { YYYY-MM-DD }
extraction_mode: init|update
---
```

Every business feature doc MUST contain:

```yaml
---
module: { Module }
service: { Service.Name }
feature_code: { FEATURE_CODE }
entities: [{ Entity1 }, { Entity2 }]
status: current|draft|deprecated
last_updated: { YYYY-MM-DD }
---
```

---

## 9. Anti-Patterns — What Makes a Spec Bad

### Vagueness Anti-Patterns

| Anti-Pattern               | Signal                                | Fix                                                                                        |
| -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Behavioral vagueness**   | "The system should handle X"          | "When X occurs, system returns error Y with message Z"                                     |
| **Permission vagueness**   | "Authorized users can access this"    | "Role: HR Manager with permission: employees.write.org"                                    |
| **Type vagueness**         | "A number field"                      | "A positive integer between 1 and 100, inclusive"                                          |
| **Relationship vagueness** | "A goal may have employees"           | "A Goal has zero-or-many GoalEmployees; each GoalEmployee references exactly one Employee" |
| **Trigger vagueness**      | "Event published when status changes" | "GoalStatusChangedEvent published when Goal.Status transitions from Active to Completed"   |

### Coupling Anti-Patterns

| Anti-Pattern               | Signal                                                                | Fix                                                                                        |
| -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Implementation leakage** | Spec mentions `CommandHandler`, `IRepository`, `DbContext`            | Use business terms only                                                                    |
| **Stack coupling**         | Spec mentions C# types, EF Core, RabbitMQ                             | Use type-agnostic descriptions                                                             |
| **File path reference**    | Spec mentions `Growth.Application/UseCaseCommands/SaveGoalCommand.cs` | Use `[Source: file:line]` only in evidence fields; business spec text uses operation names |
| **Caller-specific rules**  | Spec says "when called from seeder, skip validation"                  | Business rules are caller-agnostic; validation applies regardless of caller                |

### Completeness Anti-Patterns

| Anti-Pattern                  | Signal                                             | Fix                                                                  |
| ----------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| **Missing error cases**       | No negative TCs, no error codes                    | Every operation needs at least one error scenario                    |
| **Missing authorization TCs** | Only happy-path TCs                                | Add P0 TC for unauthorized access per role                           |
| **Untested invariants**       | Business rules exist but no TCs enforce them       | Map every BR-XX to at least one TC                                   |
| **Unverified evidence**       | `[UNVERIFIED]` items left in spec                  | Re-investigate source code; either cite or explicitly exclude        |
| **Happy-path only spec**      | Spec only describes success flow                   | Document all known failure states and what triggers them             |
| **Missing state machine**     | Entity has `Status` field but no transitions table | Extract all valid transitions from source; document guard conditions |

### Maintenance Anti-Patterns

| Anti-Pattern                    | Signal                                         | Fix                                                        |
| ------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| **Date-prefixed spec folders**  | `260419-surveys-app/`                          | Use stable paths; version history in SPEC-CHANGELOG.md     |
| **Hand-edited QA dashboard**    | `docs/specs/{Module}/` edited directly         | ALWAYS sync from Section 15; NEVER edit dashboard manually |
| **Duplicate canonical sources** | TCs in both feature doc and engineering spec   | Feature doc Section 15 is ONE canonical TC registry        |
| **No CHANGELOG**                | No SPEC-CHANGELOG.md or CHANGELOG.md in module | Maintain change history; staleness audits depend on it     |

---

## 10. Format Templates

### Phase A — Entity Block

```markdown
### {EntityName}

- **Purpose:** [one sentence — what business concept this represents]
- **Identity:** [auto-generated / natural key: field name]
- **Attributes:**
  | Name | Type | Required | Constraint | Business Meaning |
  | ---- | ---- | -------- | ---------- | ---------------- |
- **Lifecycle:** [states list] OR [append-only / immutable]
- **Invariants:** [list of rules always enforced — plain language]
- **Domain Events:** [events published when entity changes state]
  [Source: path/to/entity-file:line_range]
```

Allowed types: `string`, `number`, `boolean`, `date`, `list`, `map`, `enum (values: …)`, `optional string`, etc.

### Phase B — Business Rule Block

```markdown
### BR-{MOD}-{NN}: {Rule Group Name}

| Field/Operation | Rule | Error Condition | Error Message |
| --------------- | ---- | --------------- | ------------- |

[Source: path/to/validator:line_range]
```

### Phase C — Operation Block

```markdown
### {OperationName}

- **Purpose:** [one sentence]
- **Transport:** [HTTP POST /path | scheduled | message consumer | CLI]
- **Auth Required:** yes/no | Role: [role] | Permission: [permission]
- **Idempotent:** yes/no — [why]
- **Input:**
  | Field | Type | Required | Constraint | Description |
  | ----- | ---- | -------- | ---------- | ----------- |
- **Output (success):**
  | Field | Type | Description |
  | ----- | ---- | ----------- |
- **Errors:**
  | Code | Condition | Retryable |
  | ---- | --------- | --------- |
  [Source: path/to/controller:line_range]
```

### Phase D — Integration Event Block

```markdown
### {EventName} [Published | Consumed]

- **Trigger:** [what causes this]
- **Producer:** [module or system] ← for consumed events
- **Payload:**
  | Field | Type | Description |
  | ----- | ---- | ----------- |
- **Ordering:** guaranteed / best-effort
- **Idempotency:** [how duplicate delivery handled]
- **Failure handling:** [retry / dead-letter / discard]
  [Source: path/to/publisher-or-consumer:line_range]
```

### Phase E — User Journey Block

```markdown
### Journey: {JourneyName}

- **Actor:** [role or user type]
- **Trigger:** [what starts this journey]
- **Happy Path:**
    1. [Step 1]
    2. [Step 2]
- **Alternative Paths:** [conditions and branches]
- **Outcome:** [what actor achieves]
- **Acceptance Criteria (GIVEN/WHEN/THEN):** - GIVEN [precondition] WHEN [action] THEN [observable outcome] - GIVEN [precondition] WHEN [invalid action] THEN [error outcome]
  [Source: path/to/tests-or-ui:line_range]
```

### Test Case Block (Section 15 in Feature Doc)

````markdown
#### TC-{FEATURE}-{NNN}: {Descriptive Test Name} [P{0-3}]

**Objective:** {What this test verifies}

**Preconditions:**

- {Setup requirement}

**Test Steps:**

```gherkin
Given {initial state}
And {additional context}
When {action}
Then {expected outcome}
And {additional verification}
```
````

**Acceptance Criteria:**

- ✅ {Success behavior}
- ❌ {Failure behavior}

**Test Data:**

```json
{ "field": "value" }
```

**Edge Cases:**

- {Boundary condition} → {Expected outcome}

**Evidence:** `{FilePath}:{LineRange}` or `TBD (pre-implementation)`
**IntegrationTest:** `{TestProject}/{TestFile}.cs::{MethodName}` or `Untested`
**Status:** Tested | Untested | Planned

````

### Engineering Spec File Frontmatter

```yaml
---
module: {module-name}
phase: A|B|C|D|E
last_extracted: {YYYY-MM-DD}
extraction_mode: init|update
---
````

### Business Feature Doc Frontmatter

```yaml
---
module: { Module }
service: { Service.Name }
feature_code: { FEATURE_CODE }
entities: [{ Entity1 }, { Entity2 }]
status: current|draft|deprecated
last_updated: { YYYY-MM-DD }
---
```

---

## Sources

- Thoughtworks: [Spec-Driven Development — Unpacking 2025's Key Practice](https://www.thoughtworks.com/insights/blog/agile-engineering-practices/spec-driven-development-unpacking-2025-new-engineering-practices)
- arxiv: [Spec-Driven Development: From Code to Contract in the Age of AI Coding Assistants](https://arxiv.org/html/2602.00180v1)
- Martin Fowler: [Exploring Gen AI — SDD Tools (Kiro, spec-kit, Tessl)](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- Martin Fowler: [SpecificationByExample](https://martinfowler.com/bliki/SpecificationByExample.html)
- Addy Osmani: [How to Write a Good Spec for AI Agents](https://addyosmani.com/blog/good-spec/)
- Augment Code: [What Is Spec-Driven Development?](https://www.augmentcode.com/guides/what-is-spec-driven-development)
- Project internal: `docs/project-reference/spec-system-reference.md`, spec skill files

---

## Closing Reminders

**IMPORTANT MUST ATTENTION** NEVER bypass canonical locations — QA dashboard NEVER hand-edited; always synced from feature doc Section 15
**IMPORTANT MUST ATTENTION** NEVER use tech-specific types (C# types, EF Core, RabbitMQ) in engineering spec A–E files
**IMPORTANT MUST ATTENTION** MUST cite `[Source: file:line]` on every business rule and TC — no source = spec unverified
**IMPORTANT MUST ATTENTION** apply ambiguity test before marking spec implementation-complete: two engineers, one implementation
**IMPORTANT MUST ATTENTION** every feature doc MUST have at least one P0 (auth) TC and one P1 (core workflow) TC
**IMPORTANT MUST ATTENTION** spec anti-patterns cause AI hallucination — vague error handling, missing state machines, missing invariants all produce incorrect generated code
