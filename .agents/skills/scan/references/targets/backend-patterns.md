# Scan Target: backend-patterns

> One entry of the scan target registry — index, selection rules, path roots and the custom-doc contract are in `../targets.md` (read it first). The `$scan --target=backend-patterns` host (`../../SKILL.md`) loads this file for that run only.

- **doc:** `<ref>/backend-patterns-reference.md`
- **applies when:** server-side API, service, persistence, messaging, or migration code/config exists; record only patterns present in this project.
- **skip when:** no server-side application or service code is evidenced, even if a backend framework appears only in a dependency list or roadmap.
- **description:** `[Documentation] Use when recording evidenced server-side code organization, data access, validation, messaging, and persistence patterns.`
- **sub-agents:** up to 4 conditional branches — data access/persistence; request, business-logic, and validation flow; async/integration boundaries; evidence-based quality review (**only for branches present in the project; quality review follows discovery**).

### Phase 0 detection — capability and mode gate

Step 1 — Read the selected output and its configured template/sections. Detect Init (placeholder) or Sync (populated); in Sync mode preserve local sections and recheck evidence for staleness rather than assuming existing content is current.

Step 2 — Identify server-side languages, frameworks, services, persistence, and test organization from valid project config and actual source/manifests. Treat config as a search hint, verify it against source, and support frameworks not listed in examples below. Never stop solely because a stack is unfamiliar.

Use repository manifests, entry points, route/controller handlers, storage clients, queries, migrations, job/event registrations, and configured module paths as evidence. Record only capabilities actually found; examples such as repositories, CQRS, ORM, event handlers, and background jobs are search lenses, not required architecture.

Step 3 — Resolve configured service/module paths when declared, then verify the paths exist. If a supported code graph is available, use it for relevant call chains; otherwise trace callers and dependencies directly from source.

**Evidence gate:** If framework identity remains uncertain, report `UNKNOWN` and continue only with generic, source-evidenced observations. Do not invent framework-specific conventions or block an otherwise useful generic scan.

Phase 1 — resolve intended conventions from declared owners and enforcing evidence, distinguishing legacy observations: request flow, business-rule ownership, data access and transaction boundaries, validation/error behavior, async messaging/jobs, migrations, configuration, and authorization. Mark absent capabilities `NOT APPLICABLE`; do not recommend or require a pattern merely because it is common.

### Sub-agent Think scopes

**Agent 1: Data Access & Persistence** (only when present)
- **Think:** How does this project read/write data, enforce ownership, and define transaction boundaries? Which layer owns queries, mapping, and persistence concerns?
- Scan targets: actual repositories, query/command modules, ORM or query-builder use, data mappers, entities/models/records, transaction and unit-of-work boundaries, migrations, and schema definitions. Do not assume a repository, ORM, base class, or layer hierarchy.

**Agent 2: Request, Business Logic & Validation Flow** (only when present)
- **Think:** How does an input travel through the application? Where are business rules, validation, errors, authorization, and response mapping owned?
- Scan targets: actual routes/controllers/handlers/actions, request validation and error formats, business-rule placement, result/response types, authorization boundaries, and observed command/query separation when used. Treat CQRS, pipelines, decorators, and particular validation libraries as optional implementation choices.

**Agent 3: Async & Integration Boundaries** (only when present)
- **Think:** Which operations cross process, service, queue, or time boundaries? How are failures, retries, ordering, idempotency, and ownership handled?
- Scan targets: verified event/message producers and consumers, scheduled/background work, external service calls, middleware or cross-cutting pipelines, dependency registration, and migration behavior. Preserve producer/consumer and contract evidence; do not infer an event-driven or microservice architecture from a queue dependency alone.

**Agent 4: Evidence-Based Quality Review** (only after applicable discovery)
- **Think:** Does the observed implementation violate a documented local rule, declared architecture boundary, correctness/security invariant, or an evidenced consumer contract?
- Review only those risks. Do not classify a pattern as an anti-pattern because it differs from a preferred architecture. Cite each finding; when the project has a severity rubric, apply it; otherwise describe impact and confidence without inventing severity labels.

### Target Sections

Use the output sections declared by the selected reference-doc profile/template. If none are declared, organize the reference around the capabilities found: request flow; business-rule and data ownership; persistence/transactions; validation/errors/security; async/external boundaries; configuration/deployment; and actionable constraints. Omit areas with no evidence, and never create required headings for absent patterns.

### Content Rules / exceptions
- Cite actual source and config paths for every convention. Include short code excerpts only when they clarify a pattern and the local output contract allows them.
- Compare observed patterns to project documentation, explicit invariants, and actual consumers. Do not grade architecture by assuming CQRS, repositories, ORM, OOP, DDD, microservices, or a specific layering model is always best.
- Keep scan/audit findings in the report; describe necessary rationale, trade-offs, and actionable constraints in terms of the project's scale, boundaries, and change needs. Apply local severity/format conventions when they exist; otherwise report evidence and impact directly.
- Keep output sections aligned with the selected local template and the shared `output-quality-principles`.

### Special slivers
- **Conditional branches:** delegate only applicable, independent scans; run the evidence-based quality review after its applicable discoveries.
- Record an anti-pattern only when it violates an evidenced local rule, consumer contract, or correctness/security invariant.
- When a supported project graph is available, use it for relevant call chains; otherwise verify callers and dependencies directly from source.

### Anti-Rationalization rows

| Evasion | Rebuttal |
| --- | --- |
| "The stack is unfamiliar, stop the scan" | Record unknown framework details and continue with generic facts that source evidence supports |
| "A familiar pattern is always the right architecture" | Document the choice the project actually makes; evaluate alternatives only against local constraints and evidence |
| "Search only the patterns named in this guide" | Derive search terms from manifests, entry points, dependencies, config, and source |
| "Doc has content, skip re-read" | Show section list extracted from doc as proof of re-read |
| "Examples look right" | Glob-verify ALL file paths + Grep-verify ALL class names — looking right ≠ verified |
| "Round 2 review not needed for small scan" | Main agent rationalizes own mistakes. Fresh sub-agent is non-negotiable. |

### prompt-enhance
`$prompt-enhance <ref>/backend-patterns-reference.md`
