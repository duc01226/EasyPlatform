---
name: scan-domain-entities
version: 2.0.0
description: '[Documentation] Scan project and populate/sync docs/project-reference/domain-entities-reference.md with domain entities, data models, DTOs, aggregate boundaries, cross-service entity sync, and ER diagrams.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks per file read. Prevents context loss from long files. Simple tasks: ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources, admit uncertainty, self-check output, cross-reference independently. Certainty without evidence = root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

**Prerequisites:** **MUST ATTENTION READ** before executing:

<!-- SYNC:scan-and-update-reference-doc -->

> **Scan & Update Reference Doc** — Surgical updates only, NEVER full rewrite.
>
> 1. **Read existing doc** first — understand structure and manual annotations
> 2. **Detect mode:** Placeholder (headings only) → Init. Has content → Sync.
> 3. **Scan codebase** (grep/glob) for current patterns
> 4. **Diff** findings vs doc — identify stale sections only
> 5. **Update ONLY** diverged sections. Preserve manual annotations.
> 6. **Update metadata** (date, version) in frontmatter/header
> 7. **NEVER** rewrite entire doc. **NEVER** remove sections without evidence obsolete.

<!-- /SYNC:scan-and-update-reference-doc -->

<!-- SYNC:output-quality-principles -->

> **Output Quality** — Token efficiency without sacrificing quality.
>
> 1. No inventories/counts — stale instantly
> 2. No directory trees — use 1-line path conventions
> 3. No TOCs — AI reads linearly
> 4. One example per pattern — only if non-obvious
> 5. Lead with answer, not reasoning
> 6. Sacrifice grammar for concision in reports
> 7. Unresolved questions at end

<!-- /SYNC:output-quality-principles -->

## Quick Summary

**Goal:** Scan project codebase → populate `docs/project-reference/domain-entities-reference.md` with domain entities, data models, DTOs, aggregate boundaries, cross-service entity sync maps, and Mermaid ER diagrams. (content auto-injected by hook — check for [Injected:...] header before reading)

**Workflow:**

1. **Classify** — Detect architecture type and framework before scanning
2. **Scan** — Parallel sub-agents discover entities, DTOs, relationships, cross-service sync
3. **Report** — Write findings incrementally to report file
4. **Generate** — Build/update reference doc from report
5. **Fresh-Eyes** — Round 2 verification + coverage report

**Key Rules:**

- Generic — works with any framework (.NET, Node.js, Java, Python, game engines)
  **MUST ATTENTION** detect BOTH framework AND architecture type before sub-agents launch
- For microservices: unify cross-service entities (owner vs consumer)
- Detail level: summary + key properties (IDs, FKs, status fields) — NOT full property listing

---

# Scan Domain Entities

## Phase 0: Classify Architecture & Framework

**Before any other step**, run in parallel:

1. Read `docs/project-reference/domain-entities-reference.md`
    - Detect mode: Init (placeholder) or Sync (populated)
    - In Sync mode: extract entity catalog sections → skip re-scanning up-to-date services

2. Detect framework from project files:

| Indicator                             | Framework   | Entity Patterns to Search                                                |
| ------------------------------------- | ----------- | ------------------------------------------------------------------------ |
| `.csproj`                             | .NET        | `Entity`, `AggregateRoot`, `ValueObject`, `IEntity`, `BaseEntity`        |
| `package.json` + ORM                  | Node.js     | Mongoose `Schema`, TypeORM `@Entity`, Prisma `model`, Sequelize `define` |
| `pom.xml` / `build.gradle`            | Java/Kotlin | JPA `@Entity`, Spring Data, Hibernate, `@Table`                          |
| `requirements.txt` / `pyproject.toml` | Python      | Django `models.Model`, SQLAlchemy, Pydantic `BaseModel`                  |
| `*.proto`                             | Protobuf    | `message` definitions (cross-service contracts)                          |

3. Detect architecture type:

| Signal                                                   | Architecture     | Sub-Agents                                         |
| -------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| Multiple service directories with separate domain layers | Microservices    | Run all 4 agents including Agent 4 (cross-service) |
| Single domain layer                                      | Monolith         | Run Agents 1-3, skip Agent 4                       |
| Single deployment, bounded contexts                      | Modular monolith | Run Agents 1-3, analyze module boundaries          |

4. Load service paths from `docs/project-config.json` `modules[]` if available.

**Evidence gate:** Confidence <60% on framework detection → report uncertainty, DO NOT proceed with framework-specific scan.

## Phase 1: Plan

Create `TaskCreate` entries for each sub-agent, each service/module to scan, and the coverage report step. **Do not start Phase 2 without tasks created.**

## Phase 2: Execute Scan (Parallel Sub-Agents)

Launch **3-4 general-purpose sub-agents** in parallel. Each MUST:

- Write findings incrementally after each service/file — NEVER batch at end
- Cite `file:line` for every entity example
- Confidence: >80% document; 60-80% note as "observed (unverified)"; <60% omit

All findings → `plans/reports/scan-domain-entities-{YYMMDD}-{HHMM}-report.md`

### Agent 1: Domain Entities & Aggregates

**Think:** What is the entity hierarchy in this project? Which classes are aggregate roots vs leaf entities vs value objects? What are the key business properties (IDs, status, foreign keys)? Where is domain logic placed?

- Grep for entity base class inheritance (framework-specific from Phase 0)
- Find aggregate root classes
- Find value objects
- Find enum types used as entity properties
- For each entity: note key properties (ID, FKs, status/state fields, timestamps)
- Record file paths with line numbers

### Agent 2: DTOs, ViewModels & Application Layer Models

**Think:** How does data flow from entities to consumers? Who owns the mapping — the DTO, the handler, or a mapper service? Where is the mapping defined?

- Grep for DTO classes (`*Dto`, `*DTO`, `*ViewModel`, `*Response`, `*Request`)
- Find command/query objects that carry entity data
- Identify DTO-to-Entity mapping patterns (who owns mapping, method names)
- Note which DTOs map to which entities

### Agent 3: Database Schemas & Persistence

**Think:** How are entities persisted? What indexes exist? What databases are used per service? Where is schema evolution handled?

- Find database collection/table definitions
- Find migration files that create/alter entity tables
- Find index definitions on entities
- Identify database technology per service (MongoDB, SQL Server, PostgreSQL)
- Find seed data files

### Agent 4: Cross-Service Entity Sync (microservices only — skip otherwise)

**Think:** Which entities cross service boundaries? Who owns them? How are they synced — via events, via direct API calls, or via shared database (the last being an anti-pattern)?

- Grep for integration event classes (`*IntegrationEvent`, `*Event`, `*Message`)
- Find message bus consumers that sync entity data across services
- Identify shared contracts/DTOs between services
- Map: which entity originates in which service, which services consume it
- Find event handler classes that create/update projected entities

## Phase 3: Analyze & Generate

Read full report. Apply fresh-eyes protocol:

**Round 1 (main agent):** Build section drafts from report findings.

**Round 2 (fresh sub-agent, zero memory):**

- Does every entity in the catalog have a real `file:line` reference? (Glob verify)
- Do class names in examples match actual class definitions? (Grep verify)
- Coverage gap report: which services have NO entities found?
- Are cross-service sync entries accurate (right owner, right consumer)?

### Target Sections

| Section                      | Content                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| **Entity Catalog**           | Table per service/module: entity name, key properties (IDs, FKs, status), base class, `file:line` |
| **Entity Relationships**     | Mermaid ER diagram per service — key relationships only                                           |
| **Cross-Service Entity Map** | Table: entity, owner service, consumer services, sync event, direction                            |
| **DTO Mapping**              | Table: DTO class → Entity class, mapping approach, `file:line`                                    |
| **Aggregate Boundaries**     | Which entities form aggregates, aggregate root identification                                     |
| **Naming Conventions**       | Detected naming patterns (suffixes, prefixes, namespace conventions)                              |
| **Coverage Report**          | Services scanned / entities found / services with NO entities (gaps)                              |

### Entity Catalog Format

```markdown
### {ServiceName} Entities

| Entity   | Key Properties                | Base Class | Relationships | File                   |
| -------- | ----------------------------- | ---------- | ------------- | ---------------------- |
| Employee | Id, CompanyId, UserId, Status | EntityBase | 1:N Goals     | `path/Employee.cs:L15` |
```

**Detail level:** Summary + key properties only — IDs, FKs, status/state, important business fields. Do NOT list every property.

### Mermaid ER Diagram Guidelines

- One diagram per service/bounded context (keep readable)
- One cross-service diagram showing entity sync flows
- Show only key relationships, not every FK

## Phase 4: Write & Verify

1. Write updated doc with `<!-- Last scanned: YYYY-MM-DD -->` at top
2. Surgical update only — preserve unchanged sections
3. Verify (Glob check): ALL entity file paths exist — not just 5
4. Verify (Grep check): class names in catalog match actual class definitions
5. Coverage report: list services with no entities found (flag as gap)
6. Report: sections updated / unchanged / coverage gaps / violations

---

<!-- SYNC:scan-and-update-reference-doc:reminder -->

**IMPORTANT MUST ATTENTION** read existing doc first, scan codebase, diff, surgical update only. Never rewrite entire doc.

<!-- /SYNC:scan-and-update-reference-doc:reminder -->
<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** output quality: no counts/trees/TOCs, 1 example per pattern, lead with answer.

<!-- /SYNC:output-quality-principles:reminder -->
<!-- SYNC:ai-mistake-prevention -->

> **AI Mistake Prevention** — Failure modes to avoid:
>
> **Verify AI-generated content against actual code.** AI hallucinates entity class names, property names, relationship types. Grep to confirm existence before documenting.
> **Trace full dependency chain after edits.** Always trace full chain.
> **Holistic-first — resist nearest-attention trap.** List EVERY precondition before forming hypothesis.
> **Surface ambiguity before coding.** NEVER pick silently.

<!-- /SYNC:ai-mistake-prevention -->
<!-- SYNC:critical-thinking-mindset:reminder -->

**MUST ATTENTION** apply critical thinking — every claim needs traced proof, confidence >80% to act. Anti-hallucination: never present guess as fact.

<!-- /SYNC:critical-thinking-mindset:reminder -->
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

**IMPORTANT MUST ATTENTION** break work into small `TaskCreate` tasks BEFORE starting — one per sub-agent, one per service
**IMPORTANT MUST ATTENTION** detect BOTH framework AND architecture type in Phase 0 — sub-agents depend on both
**IMPORTANT MUST ATTENTION** cite `file:line` for every entity example — NEVER fabricate class names or property names
**IMPORTANT MUST ATTENTION** sub-agents write findings incrementally after each service — NEVER batch at end
**IMPORTANT MUST ATTENTION** coverage report is mandatory — list services with NO entities found
**IMPORTANT MUST ATTENTION** Round 2 fresh-eyes is non-negotiable — validates `file:line` and class names

**Anti-Rationalization:**

| Evasion                                          | Rebuttal                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| "Framework obvious, skip Phase 0 detection"      | Phase 0 is BLOCKING — entity patterns depend on detected framework           |
| "Architecture type obvious from directory names" | Verify from actual service structure — names are not evidence                |
| "Verified 5 paths, that's enough"                | Glob-verify ALL entity paths — 5 is insufficient                             |
| "Cross-service agent not needed (monolith)"      | Confirm monolith from Phase 0 evidence before skipping Agent 4               |
| "Coverage report not needed"                     | Coverage report is a required section — list services with no entities found |
| "Round 2 not needed for small scan"              | Main agent rationalizes own entity discoveries. Fresh-eyes mandatory.        |

**[TASK-PLANNING]** Before acting, analyze task scope and break into small todo tasks and sub-tasks using TaskCreate.
