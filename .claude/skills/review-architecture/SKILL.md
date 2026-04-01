---
name: review-architecture
version: 1.0.0
description: '[Code Quality] Review architecture compliance — clean architecture layers, messaging patterns, service boundaries, CQRS, v1/v2 service patterns, repository usage, entity event handlers. Default: changed files only.'
allowed-tools: Read, Grep, Glob, Bash, Write, TaskCreate, TaskUpdate, Agent, AskUserQuestion
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ask user whether to skip.

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs `file:line` proof. Confidence: >95% recommend freely, 80-94% with caveats, <80% DO NOT recommend — gather more evidence. Cross-service validation required for architectural changes.
> MUST READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` for full protocol and checklists.

> **Critical Purpose:** Ensure architecture compliance — no layer violations, no messaging anti-patterns, no service boundary breaches, no pattern drift.

> **External Memory:** For complex or lengthy work (research, analysis, scan, review), write intermediate findings and final results to a report file in `plans/reports/` — prevents context loss and serves as deliverable.

> **Evidence Gate:** MANDATORY IMPORTANT MUST — every claim, finding, and recommendation requires `file:line` proof or traced evidence with confidence percentage (>80% to act, <80% must verify first).

## Quick Summary

**Goal:** Validate that code changes comply with project architecture rules — clean architecture, messaging, service boundaries, CQRS, v1/v2, repositories, entity event handlers.

**Default scope:** All uncommitted changes (staged + unstaged). User can override scope via prompt (e.g., specific files, directories, services, or full codebase).

> **MANDATORY IMPORTANT MUST** Plan ToDo Task to READ the following project-specific reference docs BEFORE reviewing:
>
> 1. `docs/project-reference/backend-patterns-reference.md` — CQRS, messaging, repositories, validation, entity events, layer rules **(READ FIRST — primary architecture rules source)**
> 2. `docs/project-reference/project-structure-reference.md` — service map, layer structure, database ownership
> 3. `docs/project-reference/adr-service-pattern-v1-v2-split.md` — v1 legacy vs v2 standard (Growth), auth/permissions/observability differences
> 4. `docs/project-reference/frontend-patterns-reference.md` — component hierarchy, store, API service patterns **(READ only if frontend files in scope)**
> 5. `docs/project-reference/code-review-rules.md` — anti-patterns, conventions **(content may be auto-injected by hook — check for [Injected: ...] header before reading)**
>
> If any file not found, search for: architecture documentation, service patterns, messaging patterns.
>
> These docs contain the **project-specific** architecture rules. This skill is a generic checklist — the rules come from the docs above.

**Workflow:**

1. **Phase 0: Load Architecture Rules** — Read project-specific architecture docs listed above
2. **Phase 1: Determine Scope** — Get changed files (default) or use user-specified scope
3. **Phase 2: Blast Radius** — Run `/graph-blast-radius` if graph.db exists
4. **Phase 3: Architecture Review** — Check each file against architecture rules
5. **Phase 4: Finalize** — Generate architecture compliance report with PASS/BLOCKED/WARN verdicts

**Key Rules:**

- Report-driven: write findings to `plans/reports/arch-review-{date}-{slug}.md`
- BLOCKED = hard stop (must fix before merge)
- WARN = flag for attention (review and decide)
- PASS = compliant
- Be skeptical — every violation needs `file:line` proof + grep for 3+ counterexamples before flagging
- This skill does NOT fix code — it only reviews and reports

## Your Mission

<task>
$ARGUMENTS
</task>

## Review Mindset (NON-NEGOTIABLE)

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- Do NOT flag violations without reading the actual code and tracing the dependency
- Every finding must include `file:line` evidence
- Before flagging a pattern violation, grep for 3+ existing examples — the codebase convention wins
- Question: "Is this actually a violation, or is it an established exception?"

## Phase 0: Load Architecture Rules (MANDATORY FIRST)

> **IMPORTANT MANDATORY MUST:** Read project-specific architecture docs BEFORE reviewing any code. The rules come from these docs, not from general knowledge.

- [ ] Read `docs/project-reference/backend-patterns-reference.md` — extract messaging naming conventions, layer rules, CQRS patterns, repository rules, entity event handler patterns, validation patterns
- [ ] Read `docs/project-reference/project-structure-reference.md` — extract service map, layer structure, database ownership
- [ ] Read `docs/project-reference/adr-service-pattern-v1-v2-split.md` — extract v1/v2 differences, which services are v1 vs v2
- [ ] If frontend files in scope: Read `docs/project-reference/frontend-patterns-reference.md`
- [ ] Note: `code-review-rules.md` is auto-injected by hook on Skill invocation — check conversation context before reading

After reading, you now have the **project-specific rules** to validate against. Do NOT rely on general architecture knowledge — use what the docs say.

## Phase 1: Determine Scope

**Default (no user override):** Review all uncommitted changes.

```bash
git status          # List changed files
git diff            # Staged + unstaged changes
git diff --cached   # Staged only
```

**User-specified scope:** If user specifies files, directories, services, or "full codebase" — use that instead.

- [ ] Collect list of files to review
- [ ] Categorize files: backend (.cs), frontend (.ts/.html), config, docs, other
- [ ] Filter to architecture-relevant files only (skip pure docs, configs, tests unless architecture-relevant)

## Phase 2: Blast Radius (if graph.db exists)

> **Graph-Assisted Investigation** — When `.code-graph/graph.db` exists, MUST run at least ONE graph command on key files before concluding.
> MUST READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` for full protocol and checklists.

- [ ] If `.code-graph/graph.db` exists: Call `/graph-blast-radius` skill
- [ ] Record: impacted files count, cross-service impact, risk level
- [ ] Use results to prioritize review (highest-impact files first)
- [ ] If graph not available: note "Graph not available — skipping blast radius" and proceed

For each changed file with downstream impact:

```bash
python .claude/scripts/code_graph trace <changed-file> --direction downstream --json
```

Flag any MESSAGE_BUS consumers or event handlers impacted by changes.

## Phase 3: Architecture Review

Create report file: `plans/reports/arch-review-{date}-{slug}.md`

For EACH file in scope, evaluate against ALL applicable categories below. Skip categories that don't apply to the file type.

---

### Category 1: Clean Architecture Layers — Severity: BLOCKED

**What to check:** Dependency direction violations. Dependencies MUST flow inward only: Service/API → Application → Domain ← Persistence.

**How to check:**

1. Read `docs/project-config.json` → `architectureRules.layerBoundaries` for project-specific layer rules
2. For each file, determine its layer from path (Domain/, Application/, Persistence/, Service/)
3. Scan `using` (C#) or `import` (TS) statements
4. Flag any import from a layer that is forbidden for the current layer

**Violation format:**

```
BLOCKED: {layer} layer file {filePath}:{line} imports from {forbiddenLayer} layer ({importStatement})
```

**Also check:**

- [ ] Business logic in correct layer? (Entity/Domain > Service/Application > Controller/Component)
- [ ] No business logic in API/Controller layer (should delegate to Application layer)
- [ ] No direct infrastructure access from Domain layer (repositories are interfaces in Domain, implementations in Persistence)

---

### Category 2: Message Bus Patterns — Severity: BLOCKED/WARN

**What to check:** Naming conventions, base classes, producer/consumer patterns, upstream/downstream rules.

**How to check (rules from backend-patterns-reference.md):**

**Naming (BLOCKED if wrong):**

- Event messages: `{ServiceName}{Feature}{Action}EventBusMessage`
- Request messages: `{ConsumerServiceName}{Feature}RequestBusMessage`
- Grep for existing examples to verify naming convention: `grep -r "EventBusMessage" --include="*.cs"`

**Base classes (BLOCKED if wrong):**

- All bus messages MUST extend `PlatformTrackableBusMessage` or `PlatformBusMessage<TPayload>`
- Consumers MUST extend `PlatformApplicationMessageBusConsumer<TMessage>`
- Producers MUST extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`

**Upstream/Downstream (BLOCKED if violated):**

- Leader service owns entity data and defines EventBusMessage
- Follower services consume events — they do NOT produce events about data they don't own
- NO circular listening: if A→B events exist, B→A events for same data = boundary violation
- Consumers MUST implement dependency waiting with `TryWaitUntilAsync` when depending on data from other messages

**SubQueuePrefix (WARN if missing for ordered messages):**

- Messages requiring ordered processing MUST override `SubQueuePrefix()` with a meaningful key
- Messages not requiring ordering should return `null`

**Also check:**

- [ ] No direct cross-service database access (MUST use message bus)
- [ ] `LastMessageSyncDate` used for conflict resolution in consumers
- [ ] Inbox/Outbox pattern used for reliable delivery (check `EnableInboxEventBusMessage`)

---

### Category 3: CQRS Compliance — Severity: BLOCKED/WARN

**What to check:** Command/Query handler patterns, validation, DTO mapping.

**How to check (rules from backend-patterns-reference.md):**

**File organization (BLOCKED):**

- Command + Result + Handler MUST be in ONE file under `UseCaseCommands/{Feature}/`
- Query + Result + Handler MUST be in ONE file under `UseCaseQueries/{Feature}/`

**Validation (BLOCKED):**

- MUST use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`)
- NEVER throw exceptions for validation — return validation result
- Sync validation in `command.Validate()`, async validation in `ValidateRequestAsync()`

**DTO mapping (BLOCKED):**

- DTOs MUST own mapping via `MapToEntity()` or `MapToObject()`
- NEVER map in command handlers — mapping belongs in DTO/Command class

**Side effects (BLOCKED):**

- NEVER put side effects (notifications, sync, cascade updates) in command handlers
- Side effects go in Entity Event Handlers under `UseCaseEvents/`
- Each handler = one independent concern (failures don't cascade)

---

### Category 4: Repository Patterns — Severity: BLOCKED

**What to check:** Service-specific repository usage.

**How to check (rules from backend-patterns-reference.md):**

- MUST use service-specific repository: `I{ServiceName}PlatformRootRepository<TEntity>` (e.g., `IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>`)
- NEVER use generic `IPlatformRootRepository<T>` directly
- Complex queries MUST use `RepositoryExtensions` with static expressions
- All query filter/FK/sort columns MUST have database indexes

**Violation format:**

```
BLOCKED: {filePath}:{line} uses generic IPlatformRootRepository instead of service-specific I{Service}RootRepository
```

---

### Category 5: V1/V2 Service Pattern — Severity: BLOCKED (new services) / WARN (existing)

**What to check:** Service startup patterns, auth, permissions, observability.

**How to check (rules from adr-service-pattern-v1-v2-split.md):**

**For NEW services (BLOCKED if v1 pattern used):**

- MUST use multi-scheme auth (JWT Bearer + Azure AD Teams)
- MUST use `UsePermissionProviderClaimGenerationByProductScope()`
- MUST use OpenTelemetry via Aspire (NO ApplicationInsights)
- MUST use modern C# collection syntax `[...]`

**For EXISTING v1 services (WARN if new v2 patterns mixed in without full migration):**

- Single JWT Bearer is expected — don't flag as violation
- `UsePermissionProviderClaimGeneration()` without params is expected
- Warn if ApplicationInsights is still present (being deprecated)

**How to determine v1 vs v2:**

- Growth service = v2 standard
- All other services = v1 legacy
- Check `project-structure-reference.md` for service list

---

### Category 6: Entity Event Handlers — Severity: BLOCKED/WARN

**What to check:** Side effect implementation patterns.

**How to check (rules from backend-patterns-reference.md):**

**Location (BLOCKED):**

- Entity event handlers MUST be in `UseCaseEvents/` directory
- NEVER inline side effects in command handlers

**Implementation (BLOCKED):**

- MUST extend `PlatformCqrsEntityEventApplicationHandler<TEntity>`
- MUST implement `HandleWhen()` to filter by CRUD action
- One handler = one independent concern

**Naming (WARN):**

- Convention: `{Action}On{Trigger}EntityEventHandler`
- Grep for existing examples before flagging

**Producer patterns (BLOCKED):**

- Entity event bus message producers MUST extend `PlatformCqrsEventBusMessageProducer<TEvent, TMessage>`
- MUST implement `BuildMessage()` and `HandleWhen()`

---

### Category 7: Service Boundaries — Severity: BLOCKED

**What to check:** Cross-service isolation.

**How to check:**

- [ ] No direct database access to another service's database (BLOCKED)
- [ ] No direct `using` reference to another service's domain/persistence project (BLOCKED)
- [ ] Cross-service communication via message bus only (event bus or request bus)
- [ ] Shared data goes through shared message projects, not direct references
- [ ] Each service owns its own database — verify from `project-structure-reference.md` service-to-DB mapping

**Violation format:**

```
BLOCKED: {filePath}:{line} references {otherService} domain/persistence directly — must use message bus
```

---

### Category 8: Frontend Architecture (if frontend files in scope) — Severity: BLOCKED/WARN

**What to check:** Component hierarchy, state management, API patterns.

**How to check (rules from frontend-patterns-reference.md):**

- [ ] Components MUST extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` (BLOCKED)
- [ ] State management MUST use `PlatformVmStore` + `effectSimple()` — no manual signals or direct HttpClient (BLOCKED)
- [ ] API services MUST extend `PlatformApiService` (BLOCKED)
- [ ] All subscriptions MUST use `.pipe(this.untilDestroyed())` — no manual unsubscribe (BLOCKED)
- [ ] All template elements MUST have BEM classes (WARN)
- [ ] Logic in lowest layer: Model > Service > Component (WARN)

---

## Phase 4: Finalize — Architecture Compliance Report

Update report with final sections:

### Verdict Scoring

Count findings by severity:

| Verdict     | Condition                                       |
| ----------- | ----------------------------------------------- |
| **BLOCKED** | 1+ BLOCKED findings — must fix before merge     |
| **WARN**    | 0 BLOCKED, 1+ WARN findings — review and decide |
| **PASS**    | 0 BLOCKED, 0 WARN — architecture compliant      |

### Report Structure

```markdown
# Architecture Review Report — {date}

## Scope

- Files reviewed: {count}
- Services affected: {list}
- Blast radius: {summary from Phase 2}

## Verdict: {PASS | WARN | BLOCKED}

## BLOCKED Findings (Must Fix)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Fix:** {what to change}

## WARN Findings (Review)

### {Category}: {description}

- **File:** {path}:{line}
- **Rule:** {rule from project doc}
- **Evidence:** {what was found}
- **Recommendation:** {suggested action}

## PASS Categories

- {list of categories that passed with no findings}

## Architecture Health Summary

- Clean Architecture: {PASS/WARN/BLOCKED}
- Messaging Patterns: {PASS/WARN/BLOCKED}
- CQRS Compliance: {PASS/WARN/BLOCKED}
- Repository Patterns: {PASS/WARN/BLOCKED}
- V1/V2 Compliance: {PASS/WARN/BLOCKED}
- Entity Event Handlers: {PASS/WARN/BLOCKED}
- Service Boundaries: {PASS/WARN/BLOCKED}
- Frontend Architecture: {PASS/WARN/BLOCKED/N/A}
```

---

## Architecture Boundary Check (Automated)

For each changed file, verify it does not import from a forbidden layer:

1. **Read rules** from `docs/project-config.json` → `architectureRules.layerBoundaries`
2. **Determine layer** — For each changed file, match its path against each rule's `paths` glob patterns
3. **Scan imports** — Grep the file for `using` (C#) or `import` (TS) statements
4. **Check violations** — If any import path contains a layer name listed in `cannotImportFrom`, it is a violation
5. **Exclude framework** — Skip files matching any pattern in `architectureRules.excludePatterns`
6. **BLOCK on violation** — Report as critical: `"BLOCKED: {layer} layer file {filePath} imports from {forbiddenLayer} layer ({importStatement})"`

If `architectureRules` is not present in project-config.json, skip this check silently.

---

## Systematic Review Protocol (for 10+ changed files)

> When 10+ files in scope, switch to parallel review:

1. **Categorize** — Group files by service/layer/concern
2. **Parallel Sub-Agents** — Launch one `code-reviewer` sub-agent per category with architecture-specific checklist
3. **Synchronize** — Collect findings, cross-reference service boundaries
4. **Consolidate** — Single holistic report with per-category verdicts

---

## Next Steps

**MANDATORY IMPORTANT MUST** after completing this skill, use `AskUserQuestion` to recommend:

- **"/code-simplifier" (Recommended)** — Simplify and refine code
- **"/code-review"** — Deep code quality review
- **"Skip, continue manually"** — user decides

## Closing Reminders

**MANDATORY IMPORTANT MUST** break work into small todo tasks using `TaskCreate` BEFORE starting.
**MANDATORY IMPORTANT MUST** validate decisions with user via `AskUserQuestion` — never auto-decide.
**MANDATORY IMPORTANT MUST** read project-specific architecture docs BEFORE reviewing — rules come from docs, not general knowledge.
**MANDATORY IMPORTANT MUST** add a final review todo task to verify work quality.
**MANDATORY IMPORTANT MUST** READ the following files before starting:

- **MUST** READ `.claude/skills/shared/evidence-based-reasoning-protocol.md` before starting
- **MUST** READ `.claude/skills/shared/graph-assisted-investigation-protocol.md` before starting
