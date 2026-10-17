# Scan Target: domain-entities

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `/scan --target=domain-entities` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/domain-entities-reference.md`
- **applies when:** business behavior, rules/invariants, or authoritative domain contracts and their model/data representations are evidenced in source or project-owned specifications.
- **skip when:** code contains only generic transport/data structures or no business-domain contract can be established.
- **description:** `[Documentation] Use when recording evidenced business-domain concepts, data ownership, relationships, and boundaries.`
- **sub-agents:** up to 4 conditional branches — business concepts and invariants; transfer/application representations; persistence/schema; cross-boundary ownership and flows. Dispatch only branches supported by evidence; none requires DDD, aggregates, or a service architecture.

### Phase 0 detection — business contract, representation, and ownership

Read the selected doc/template and valid project config. Establish a business-domain contract from behavior, invariants, canonical specifications, or model/schema evidence connected to real use. Separate business concepts from generic transport, persistence, and framework types; do not classify every class, table, or payload as a domain entity.

Discover representations and persistence formats from actual source, schemas, migrations, serialization contracts, and authoritative domain documentation. Verify configured paths before using them. Identify ownership boundaries only where code/config/contracts establish distinct owners or data flows; do not infer service boundaries from directory names or deployment count.

DDD terms such as entity, value object, aggregate, aggregate root, repository, and bounded context are valid only where source or authoritative project documentation uses and supports them. Otherwise use the project's own terms and describe observable identity, rules, relationships, and ownership. Unknown framework or architecture details do not block verified findings.

### Sub-agent Think scopes

**Agent 1: Business Concepts & Invariants** (run when business rules or model evidence exists)
- **Think:** Which business concepts, identities, states, and invariants are established by specifications or executable behavior? Where are they defined and enforced?
- Scan targets: business-focused specifications and source rules; model/schema declarations only when connected to behavior; state transitions, validation, permissions, and constraints. Do not require an entity base class, hierarchy, aggregate, or particular language construct.

**Agent 2: Transfer & Application Representations** (run when separate representations or transformations exist)
- **Think:** How is domain information represented as it crosses an application, API, persistence, event, or UI boundary? Which component owns each evidenced transformation?
- Scan targets: actual request/response, command/query, message, view, serialization, and mapping definitions; follow callers and consumers to establish direction and owner. Use suffixes only as search hints; do not assume a mapping layer.

**Agent 3: Storage & Persistence** (run only when domain data is persisted)
- **Think:** Which storage structures and constraints support evidenced domain behavior? How do schema evolution and data ownership work in this repository?
- Scan targets: actual table, collection, document, file, or other persistent schema; migration/evolution definitions; indexes and constraints; verified read/write call sites. Do not assume a relational database or per-service store.

**Agent 4: Ownership & Cross-Boundary Flows** (run only when an independent module/process, external contract, or cross-owner data flow is evidenced)
- **Think:** Which component owns the authoritative business data, and what happens when information crosses an evidenced boundary? How are updates, failures, and consistency handled?
- Scan targets: callers/providers, API or message contracts, event/message producers and consumers, replicated/read-model data, and storage readers/writers. This applies to independently owned modules, processes, or external systems whether deployment is distributed or in one application. Describe shared storage as observed; identify risk only when conflicting ownership or unsafe coupling is evidenced.

### Target Sections

Include only sections supported by evidence and useful to explain the project's business model. A domain contract need not use classes, entities, a database, DDD, or services.

| Section | Include when evidence supports it |
| --- | --- |
| **Business Concepts & Rules** | Concepts, identity/state, invariants, and authoritative source locations. Use the project's terms; distinguish behavior from data shape. |
| **Representations & Transformations** | Separate API/UI/application/persistence/event representations and verified mapping ownership. |
| **Persistence & Relationships** | Persisted structures, constraints, and relationships only where relevant to domain behavior; use a diagram only if it clarifies real relationships. |
| **Ownership & Boundary Flows** | Verified authority, readers/writers, and synchronization across actual module/process/external boundaries. |
| **Observed Conventions** | Intended naming/modeling practice from authoritative owners and compatible exemplars; label legacy observations separately. |
| **Evidence Limits** | Material unknown owners, undocumented behavior, or unverified relationships that cannot be settled from available evidence. |

### Content Rules / exceptions
- Every claim needs a source citation (`file:line` or canonical document section). Follow data from definition to the code that uses or enforces it before describing ownership or behavior.
- Do not force an entity catalog, service/module table, ER diagram, DTO map, aggregate boundary, or coverage count. Add a concise table/diagram only when the repository has the corresponding construct and the view improves navigation.
- Document only key properties that explain an invariant or relationship; omit exhaustive property lists and incidental storage fields.
- Name an aggregate/bounded context/value object only when project evidence establishes that concept. Never label shared storage, a single application, or a generic data model as an anti-pattern by category alone.

### Special slivers
- Skip the target when no business-domain contract can be established; generic transport, framework, and storage shapes alone are insufficient. Conversely, the absence of DDD vocabulary does not prove that business rules are absent.
- Run only branches for evidenced representations: storage, mapping, and cross-boundary analysis are optional and independently gated.
- Do not block on an unknown stack or architecture, and do not require proof that the application is monolithic before omitting cross-boundary analysis. Run that analysis whenever actual cross-owner flows exist.
- Resolve configured roots when present, verify them against repository evidence, and omit absent optional configuration without error.
- Sub-agent confidence thresholds are percentage-based: >80% document; 60–80% label as observed/unverified; <60% omit or state the uncertainty.
- Fresh-eyes verification checks every cited definition, relationship, mapping, and owner against source; verify cited paths and consumer/provider direction rather than counting entities or services.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "Every persisted class or table is a domain entity" | Trace it to business behavior or a canonical contract; generic transport and framework shapes are not enough. |
| "DDD vocabulary is absent, so there is no domain model" | Inspect business specifications, rules, state transitions, and actual use; report only concepts they establish. |
| "This is one deployable app, so there are no cross-boundary flows" | Check module ownership, external contracts, and data flows independently of deployment topology. |
| "The docs need an aggregate, service, or ER diagram section" | Use the project's actual concepts and include a diagram only when evidence and reader needs justify it. |
| "The framework or ownership is unfamiliar, so stop" | Record unknown dimensions and continue with verified rules, structures, and callers. |
| "Skip fresh-eyes verification after findings" | Recheck cited definitions and owner/consumer direction against source before reporting. |

### prompt-enhance
`/prompt-enhance <ref>/domain-entities-reference.md`
