# DDD Reference — domain-analysis

Read on demand by `domain-analysis` (SKILL.md → "DDD Reference") and by `--mode=review` (`references/mode-review.md` → Universal DDD Quick Reference: Entity vs Value Object, Aggregate Design, Anti-Patterns → Phase 2 A, B, C, F, K). Section → step map: Strategic Design → Steps 2, 4 · Entity vs Value Object, Entity Design, Aggregate Design, Repository Pattern → Step 3 · Domain Events → Step 5 · ERD Design → Step 6 · Anti-Patterns → Steps 3, 7.

## Contents

- [DDD Reference: Strategic Design](#ddd-reference-strategic-design)
- [DDD Reference: Entity vs Value Object](#ddd-reference-entity-vs-value-object)
- [DDD Reference: Entity Design](#ddd-reference-entity-design)
- [DDD Reference: Aggregate Design](#ddd-reference-aggregate-design)
- [DDD Reference: ERD Design](#ddd-reference-erd-design)
- [DDD Reference: Domain Events](#ddd-reference-domain-events)
- [DDD Reference: Repository Pattern](#ddd-reference-repository-pattern)
- [DDD Reference: Anti-Patterns Quick Reference](#ddd-reference-anti-patterns-quick-reference)
- [Closing Reminders](#closing-reminders)

## DDD Reference: Strategic Design

### Bounded Context Rules

| Signal | Action |
| --- | --- |
| Same term, different meaning across teams | Separate bounded contexts |
| Different data lifecycles for same concept | Separate contexts |
| Different invariants on same entity | Separate contexts |
| Team ownership conflict (Conway's Law) | Separate contexts |
| Shared DB table touched by two services | Extract shared kernel or introduce ACL |

**Ubiquitous Language Rules:**

- Every noun in codebase matches domain expert vocabulary exactly (not "User" when the domain says "Customer")
- Class/method/variable names reflect ubiquitous language — zero translation layers inside bounded context
- Developers say "we call it X but domain means Y" → model is wrong, fix it

### Context Map Pattern Decision Table

| Situation | Pattern |
| --- | --- |
| Two teams, joint success/failure, equal power | Partnership |
| Small shared code nucleus, joint governance acceptable | Shared Kernel |
| Downstream can influence upstream roadmap | Customer-Supplier |
| Downstream has no influence on upstream | Conformist |
| External/legacy system with hostile or polluting model | Anti-Corruption Layer (ACL) |
| One upstream, many downstream consumers | Open Host Service + Published Language |
| Integration cost exceeds integration value | Separate Ways |

**ACL — use when:** upstream is external, legacy, or third-party (Salesforce, SAP, Workday); upstream types NEVER cross ACL into domain model.

**Shared Kernel — avoid when:** teams cannot coordinate every change → use Customer-Supplier + Published Language.

## DDD Reference: Entity vs Value Object

### Decision Matrix

| Question | Decision |
| --- | --- |
| Does continuity of identity matter across time/representations? | Entity, even when accessed only through its parent. |
| Are equal-valued copies interchangeable in this domain? | Value object; protect immutable value semantics. |

Read `entity-quality.md` → **Identity and equality** and **Encapsulation and values** when classifying or designing entities/VOs. Storage keys, snapshots, field counts and retrieval shape alone do not decide classification.

## DDD Reference: Entity Design

### Identity Strategies

Read `entity-quality.md` → **Identity and equality**, **Lifecycle and deletion**, and **Scale and change safety** when choosing identity, construction, behavior or evolution. Preserve the project's ID contract; compare generation, uniqueness, contention, storage/index cost and exposure before changing it. No universal ID algorithm, base class, factory or event requirement.

### Domain Validation Layers

Read `entity-quality.md` → **Invariant ownership** and **Behavior and failure atomicity** when placing a rule. Domain and input validation can overlap; cross-instance invariants need real atomic enforcement. Use the project's failure convention and preserve valid state on rejection.

### Temporal (Bi-Temporal) Entities

Use valid-time and recorded-time separately only when retroactive corrections, audit or as-of queries require them. Specify timezone, precision and correction semantics; inject time where rules need deterministic proof.

## DDD Reference: Aggregate Design

Read `entity-quality.md` → **Aggregate boundaries** and **Concurrency and retries** when setting consistency boundaries. Size by atomic rules, ownership and measured contention/load, not table cardinality or fixed child counts. Prefer independent boundaries; document justified local transactions and their trade-offs rather than prohibiting every multi-root transaction.

## DDD Reference: ERD Design

### Cardinality Types

| Cardinality | Mermaid | When to Use |
| --- | --- | --- |
| 1:1 | `\|o--o\|` | Same-table extension, optional sub-type, shared lifecycle |
| 1:N | `\|o--{` | Parent-child, one entity owns many dependent records |
| M:N | `}o--o{` | Peer relationship; ALWAYS use explicit join/association entity |

**M:N rule:** Attributes (date joined, role) → explicit named join entity.

**1:1 decision:** Same concept + optional attributes → same table; different concepts with independent lifecycles → separate tables with FK.

### Normalization Targets

Use 1NF (atomic values/no repeated groups), 2NF for composite keys (no partial dependency), and 3NF for OLTP writes (no transitive dependency). Use BCNF when 3NF still has anomalies (every determinant a candidate key). Denormalize read models/projections/OLAP only with documented justification.

### Identifying vs Non-Identifying Relationships

| Type | FK in Child PK? | Child Existence |
| --- | --- | --- |
| Identifying | YES (FK is part of PK) | Child cannot exist without parent (line item without order) |
| Non-identifying | NO (FK is separate column) | Child can exist independently (order without warehouse) |

**Mapping to DDD:** database relationships are evidence to inspect, not proof of an aggregate boundary. Business invariants determine atomic ownership.

### ERD for Microservices

- Each bounded context has its OWN ERD — NEVER cross-service entity arrows
- Cross-service references shown as `ExternalEntityId (string/ULID)` — ID only, no relationship line
- Shared data shown as replicated/synced data note, NEVER shared table
- Event-sourced aggregates: ERD shows current state projection, not event stream

### ERD Anti-Patterns

| Anti-Pattern | Problem | Fix |
| --- | --- | --- |
| God table (50+ columns) | Every feature adds more columns | Extract sub-entities, decompose by bounded context |
| Cross-service FK | Direct FK across microservice schemas | Replicate needed data, use events to sync |
| Polymorphic association | `entityType + entityId` columns | Separate tables per concrete type or JSON column |
| EAV (Entity-Attribute-Value) | Key-value rows replacing typed columns | JSON column or explicit schema with migration |
| Implicit M:N (two FK cols, no PK) | Hard to add relationship attributes | Explicit join table with surrogate PK |
| Nullable FK everywhere | Unclear cardinality | Separate optional relationship into explicit table |

### ERD to Aggregate Mapping

Read `entity-quality.md` → **Aggregate boundaries** when mapping a relational model to domain ownership. Preserve distinct database, domain and integration representations; foreign-key shape alone cannot decide aggregates.

## DDD Reference: Domain Events

Read `entity-quality.md` → **Domain and integration events** when an event or side-effect path changes. Name meaningful facts, choose payload and schema ownership from consumer needs, and state transaction/delivery guarantees. Internal handlers can share a transaction; durable external publication follows committed facts through an atomic handoff when required. Do not force an event for every field update.

## DDD Reference: Repository Pattern

Read `entity-quality.md` → **Persistence and dependencies** when designing write/load boundaries. Use an existing repository only where it protects a real aggregate contract or change seam; read projections may use a separate query path. No mandatory repository per type, async method, custom base or extra Unit of Work.

## DDD Reference: Anti-Patterns Quick Reference

Read `entity-quality.md` → **Quality dimensions** when investigating anemic/god models, primitive obsession, exposed collections, lost updates, validation bypasses, unsafe replay/publication or leaking infrastructure. Prove the reachable consequence before a finding; use one invariant owner and the simplest model that protects it.

## Closing Reminders

Classify by business identity/value; size boundaries by atomic invariants; preserve valid state across all writes and loads. Use `entity-quality.md` only for relevant tactical work, and strategic/ERD sections only for their selected modeling task.
