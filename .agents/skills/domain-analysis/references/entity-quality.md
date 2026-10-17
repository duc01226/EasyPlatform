# Domain Entity Quality

Read when planning, implementing, fixing or reviewing new or changed domain entities, value objects, aggregates, or their write/load/event paths. Skip unrelated work. This reference owns the shared decisions and quality criteria; review-mode orchestration stays in `mode-review.md`.

**Purpose:** preserve valid business state through every entry path while keeping the next domain change local and provable.

**Critical rules:** establish project/paradigm fit; give every invariant an enforcing owner; prove successful and rejected operations. Patterns are tools, not compliance targets.

## Contents

- [Applicability](#applicability)
- [Feedforward and execution](#feedforward-and-execution)
- [Quality dimensions](#quality-dimensions)
- [Proof and completion gate](#proof-and-completion-gate)
- [Sources](#sources)
- [Closing reminders](#closing-reminders)

## Applicability

- Inspect intent, specs, architecture and source. Trigger on changes to identity, business fields, invariants, relationships, behavior, lifecycle, creation/load, consistency boundaries, persistence or domain events. Include indirect writes from handlers, imports, jobs and adapters; a domain-folder filename is neither necessary nor sufficient.
- Distinguish entity identity from value semantics and persistence/transport representation. A DTO, ORM row or configuration record alone does not justify a rich domain model.
- Detect OO-mutable, immutable/type-driven or event-sourced modeling per affected aggregate. Apply only relevant dimensions; record N/A with evidence. Use the project's functional/module-owned invariants when it does not use tactical DDD. Simple CRUD remains simple.
- Preserve accepted architecture and business intent. A demonstrated defect needs a reachable consequence; a different style, absent pattern or arbitrary size threshold is not a finding.

## Feedforward and execution

Record only applicable decisions in the existing plan/checklist or, for a direct fix/change, a brief pre-edit note. Do not create another planning artifact or reopen settled decisions.

| Decision | Required result before implementation |
| --- | --- |
| Classification and fit | Entity/VO/root or simpler model; context, paradigm and existing pattern evidence. |
| Invariants and failures | Named rules, enforcing owner, allowed transitions, rejection result and valid-state preservation. |
| Consistency and concurrency | Aggregate/transaction boundary; cross-instance enforcement and conflict/retry behavior where contention is possible. |
| Creation, load and evolution | Valid construction, historical reconstitution, compatibility/data-change effects and deletion rules. |
| Events and dependencies | Side-effect owner, dispatch/commit boundary, delivery/replay guarantees and contract ownership when events exist. |
| Proof | Guarding spec/case and test owner; positive, rejection, boundary and applicable concurrency/replay assertions. Future tests are obligations, never fabricated evidence. |

Planning names each decision, responsible module/file when known, and its acceptance gate. Resolve material domain/data/architecture choices before editing; leave bounded source discovery with an owner and stop condition. Implementation follows those decisions, checks bypass paths and writes protecting tests. Review checks the same record against current source and executing assertions; missing required proof stays open. A caller-owned specialist supplies one pass, not a nested review loop.

## Quality dimensions

Use the applicable rows as focused lenses. Derive additional concerns from actual domain rules and failure paths; do not manufacture requirements.

| Dimension | Quality check and common failure to prevent |
| --- | --- |
| **Identity and equality** | Identity is stable across the entity's lifecycle and representations; equality/hash semantics agree, including new/unassigned IDs. Immutable VOs compare by domain value, not reference. A storage key does not by itself make a value an entity. |
| **Language and context** | Names express business intent and one coherent responsibility. Different contexts may model the same word differently; translate at boundaries. Keep consumer-specific domain rules out of generic infrastructure. Do not force a shared base or one universal entity across contexts. |
| **Invariant ownership** | State the always-true rule and its authoritative enforcing owner. Creation and every relevant write path preserve it. Boundary validation protects untrusted inputs; it does not replace domain enforcement. A field-format/range rule may also be a domain invariant. Cross-instance uniqueness/quotas need an atomic database/coordination mechanism, not a check-then-write race. |
| **Behavior and failure atomicity** | Operations express intent, validate before committing mutation and reject invalid transitions without partial state or leaked side effects. Expected failures use the project's consistent exception/result convention; neither mechanism is universally mandatory. Avoid ignored booleans or silent coercion when they conceal a meaningful failure. |
| **Encapsulation and values** | Mutable OO models control changes to state/children/collections; immutable models return valid replacements; event-sourced models evolve through valid events. Prevent writable aliases that bypass invariants. Use VOs when their semantics reduce repeated rules, not for every primitive or every group of fields. |
| **Aggregate boundaries** | Group data by genuinely atomic business invariants and ownership, not tables, object graphs or UI screens. Keep loads and contention bounded. Prefer independent references/IDs across aggregates where they preserve separation; a justified local transaction or ORM navigation is not automatically a defect. Cross-context writes must respect the owning contract. |
| **Concurrency and retries** | Protect contended updates with a fitting version/CAS, lock, serializable transaction, constraint or reservation. The mechanism must cover all members affecting the invariant. Test conflicting writers, duplicate requests and bounded retries; prevent lost updates, double effects and in-memory-only global invariants. |
| **Construction and reconstitution** | Public creation cannot produce invalid state. Load/replay preserves historical meaning without re-running time-sensitive creation policies or causing new business side effects. A separate factory/constructor is useful only when semantics differ; framework-required hydration hooks are legitimate. Handle corrupt/old state explicitly instead of silently repairing it. |
| **Lifecycle and deletion** | Define legal transitions, repeated-operation semantics and dependent-data rules. Deletion/archiving protects references, audit and retention obligations actually required by the domain. Inject clock/identity boundaries where nondeterminism affects rules. Use correct money precision, units and time semantics where applicable. |
| **Domain and integration events** | Events state meaningful facts with stable value payloads. Internal handlers may execute before commit when their work intentionally shares the transaction; unrelated/external effects must not escape a rolled-back operation. Publish durable integration facts after commit using outbox or an equivalent atomic handoff when delivery guarantees require it. Define ordering, idempotency, failure recovery and schema evolution; replay must not repeat external effects. |
| **Persistence and dependencies** | Keep business rules independent of volatile infrastructure when the architecture provides that seam. Preserve required ORM mapping/hydration behavior and database constraints. Repositories protect actual aggregate write boundaries when used; read projections may bypass them. No mandatory repository, inheritance tree, async method or event for every entity. |
| **Scale and change safety** | Bound collection loads, queries and fan-out on relevant paths; inspect indexing and contention for the evidenced workload. Keep authorization/tenant isolation at all required boundaries without scattering it through unrelated domain types. Assess old/new writers, stored data and published contracts before changing identity, fields or events. |
| **Tests and specification** | Link changed rules to the configured canonical owner/case and executing assertions. Cover valid/invalid construction, failed mutation preserving state, lifecycle boundaries, equality/aliasing, reconstitution, and contention/retry/replay when applicable. Use properties for input-wide invariants and boundary counterexamples; examples alone cannot establish an all-input rule. Preserve the native format/profile and historical healthy behavior. |

## Proof and completion gate

Use one compact record per changed model or coherent rule set:

`surface | context/paradigm | invariant/decision | owner | applicable check | spec/test evidence or planned proof | PASS / N/A / OPEN`

Before handoff: applicable decisions are settled; bypass paths preserve the rules; success and rejection outcomes are proved; relevant compatibility/concurrency/event risks are addressed; spec/test/doc drift is reconciled. Planning may name future proof; implementation completion requires actual verification. Resolve valid `specArtifacts` profiles before choosing case carriers; malformed declarations block, absent profiles use the strict default.

For findings, cite the reachable trigger, consequence, `file:line` and severity under the shared rubric. Unsupported suspicion is not a defect. Unavailable required evidence remains OPEN/NOT VERIFIABLE, never PASS. Respect the caller's review-only boundary and existing review/fix budget.

## Sources

- [Fowler: entity identity and value semantics](https://martinfowler.com/bliki/EvansClassification.html).
- [Fowler: aggregate consistency boundaries](https://martinfowler.com/bliki/DDD_Aggregate.html).
- [Microsoft: domain invariants and failure atomicity](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-model-layer-validations).
- [Microsoft: domain event transaction timing](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/domain-events-design-implementation).

## Closing reminders

Establish fit; enforce each invariant at its real owner; prove success and valid-state preservation on rejection. Plan the decisions before writing, implement through all relevant paths, and review against the same evidence. Load this depth only for applicable domain work.
