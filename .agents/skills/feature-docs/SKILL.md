---
name: feature-docs
description: '[Documentation] Create or update business feature documentation. Modes: init (zero-docs → full extraction from source code), update (code change → section-impact sync), audit (staleness detection). Generates 17-section docs with Mermaid ERD, source citations, verified test case evidence. Triggers on: feature docs, business feature documentation, module documentation, document feature, update feature docs.'
---

> Codex compatibility note:
>
> - Invoke repository skills with `$skill-name` in Codex; this mirrored copy rewrites legacy Claude `/skill-name` references.
> - Prefer the `plan-hard` skill for planning guidance in this Codex mirror.
> - Task tracker mandate: BEFORE executing any workflow or skill step, create/update task tracking for all steps and keep it synchronized as progress changes.
> - User-question prompts mean to ask the user directly in Codex.
> - Ignore Claude-specific mode-switch instructions when they appear.
> - Strict execution contract: when a user explicitly invokes a skill, execute that skill protocol as written.
> - Do not skip, reorder, or merge protocol steps unless the user explicitly approves the deviation first.
> - For workflow skills, execute each listed child-skill step explicitly and report step-by-step evidence.
> - If a required step/tool cannot run in this environment, stop and ask the user before adapting.

<!-- CODEX:PROJECT-REFERENCE-LOADING:START -->

## Codex Project-Reference Loading (No Hooks)

Codex does not receive Claude hook-based doc injection.
When coding, planning, debugging, testing, or reviewing, open project docs explicitly using this routing.

**Always read:**

- `docs/project-reference/docs-index-reference.md` (routes to the full `docs/project-reference/*` catalog)
- `docs/project-reference/lessons.md` (always-on guardrails and anti-patterns)

**Situation-based docs:**

- Backend/CQRS/API/domain/entity changes: `backend-patterns-reference.md`, `domain-entities-reference.md`, `project-structure-reference.md`
- Frontend/UI/styling/design-system: `frontend-patterns-reference.md`, `scss-styling-guide.md`, `design-system/README.md`
- Spec/test-case planning or TC mapping: `feature-docs-reference.md`
- Integration test implementation/review: `integration-test-reference.md`
- E2E test implementation/review: `e2e-test-reference.md`
- Code review/audit work: `code-review-rules.md` plus domain docs above based on changed files

Do not read all docs blindly. Start from `docs-index-reference.md`, then open only relevant files for the task.

<!-- CODEX:PROJECT-REFERENCE-LOADING:END -->

> **[IMPORTANT]** Use task tracking to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

<!-- SYNC:critical-thinking-mindset -->

> **Critical Thinking Mindset** — Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
> **Anti-hallucination:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.

<!-- /SYNC:critical-thinking-mindset -->

## Quick Summary

**[IMPORTANT] task tracking** — Break ALL work into small tasks BEFORE starting. For simple tasks, ask user whether to skip.

**Goal:** Generate comprehensive 17-section business feature docs with mandatory code evidence for all test cases.

**Modes:**

| Mode     | Trigger                                      | Input                      | Output                               |
| -------- | -------------------------------------------- | -------------------------- | ------------------------------------ |
| `init`   | No `docs/business-features/{Module}/` exists | Full source code           | Complete 17-section doc from scratch |
| `update` | Docs exist + code changed                    | Git diff / explicit module | Section-impact-mapped updates        |
| `audit`  | Explicit `--audit` flag or user request      | Source + existing docs     | Staleness report per section         |

**Workflow:**

1. **Detect & Gather** — Auto-detect modules from git changes OR user-specified module, read existing docs
2. **Investigate Code** — Grep/glob codebase for evidence (`file:line`) for every test case
3. **Write Documentation** — Follow exact 17-section structure, place in `docs/business-features/{Module}/`
4. **Verification** — 4-pass system: evidence audit, domain model, cross-reference, AI-implementability

**Key Rules:**

- **[BLOCKING]** Read `docs/project-reference/spec-principles.md` — spec quality standards, AI-implementability criteria, tech-agnostic rules (read Section 4 completeness checklists before Phase 3.5 verification)
- **[BLOCKING]** EVERY test case MUST have verifiable code evidence (`FilePath:LineNumber`) — no exceptions
- Output MUST have exactly 17 sections matching master template
- ALWAYS update CHANGELOG.md and Version History (Section 17) when modifying docs
- Section 15 TCs: include `IntegrationTest` field → `IntegrationTest: Orders/OrderCommandIntegrationTests.cs::{MethodName}`. No test yet → `Status: Untested`
- Verify every TC-{FEATURE}-{NNN} has `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]` in integration tests. Missing → `Status: Untested`
- Third verification pass finds >5 issues → HALT, re-run verification

> `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (Codex has no hook injection — open this file directly before proceeding)

## Project Pattern Discovery

Before implementation, search codebase for project-specific patterns:

- Search: `business-features`, `detailed-features`, `feature-docs-template`
- Look for: existing feature doc folders, 17-section templates

> **[BLOCKING]** Read `feature-docs-reference.md` for project-specific patterns. If not found, use search-based discovery.

<!-- SYNC:cross-service-check -->

> **Cross-Service Check** — Microservices/event-driven: MANDATORY before concluding investigation, plan, spec, or feature doc. Missing downstream consumer = silent regression.
>
> | Boundary            | Grep terms                                                                      |
> | ------------------- | ------------------------------------------------------------------------------- |
> | Event producers     | `Publish`, `Dispatch`, `Send`, `emit`, `EventBus`, `outbox`, `IntegrationEvent` |
> | Event consumers     | `Consumer`, `EventHandler`, `Subscribe`, `@EventListener`, `inbox`              |
> | Sagas/orchestration | `Saga`, `ProcessManager`, `Choreography`, `Workflow`, `Orchestrator`            |
> | Sync service calls  | HTTP/gRPC calls to/from other services                                          |
> | Shared contracts    | OpenAPI spec, proto, shared DTO — flag breaking changes                         |
> | Data ownership      | Other service reads/writes same table/collection → Shared-DB anti-pattern       |
>
> **Per touchpoint:** owner service · message name · consumers · risk (NONE / ADDITIVE / BREAKING).
>
> **BLOCKED until:** Producers scanned · Consumers scanned · Sagas checked · Contracts reviewed · Breaking-change risk flagged

<!-- /SYNC:cross-service-check -->

# Feature Documentation Generation & Verification

Generate feature docs following project conventions.

**GOLD STANDARD:** Search existing feature docs: `find docs/business-features -name "README.*.md" -type f | head -5`

**Template:** `docs/templates/detailed-feature-docs-template.md`

---

## [CRITICAL] MANDATORY CODE EVIDENCE RULE

**EVERY test case MUST ATTENTION have verifiable code evidence — non-negotiable.**

### Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Valid vs Invalid Evidence

| Valid                           | Invalid                             |
| ------------------------------- | ----------------------------------- |
| `ErrorMessage.cs:83`            | `{FilePath}:{LineRange}` (template) |
| `Handler.cs:42-52`              | `SomeFile.cs` (no line)             |
| `interviews.service.ts:115-118` | "Based on CQRS pattern" (vague)     |

---

## Output Structure

All documentation MUST be placed in correct folder structure:

```
docs/
├── BUSINESS-FEATURES.md              # Master index (UPDATE if new module)
├── templates/
│   └── detailed-feature-docs-template.md  # MASTER TEMPLATE
└── business-features/
    ├── {Module}/                     # One folder per service/module in your project
    │   ├── README.md                 # Complete module documentation
    │   ├── INDEX.md                  # Navigation hub
    │   ├── API-REFERENCE.md          # Endpoint documentation
    │   ├── TROUBLESHOOTING.md        # Issue resolution guide
    │   └── detailed-features/
    │       └── README.{FeatureName}.md     # Comprehensive (17-section, max 1200 lines)
    └── ...
```

### Module Mapping

Search your codebase to discover the module-to-folder mapping:

```bash
# Find all service directories
ls -d src/Services/*/

# Find all existing feature doc modules
ls -d docs/business-features/*/
```

Map each module code to its folder name and service path. Example pattern:

| Module Code | Folder Name | Service Path              |
| ----------- | ----------- | ------------------------- |
| {Module1}   | `{Module1}` | `src/Services/{Module1}/` |
| {Module2}   | `{Module2}` | `src/Services/{Module2}/` |

---

## MANDATORY 17-SECTION STRUCTURE

All feature documentation MUST follow this section order:

| #   | Section                              | Audience       |
| --- | ------------------------------------ | -------------- |
| 1   | Header + Metadata (YAML frontmatter) | All            |
| 2   | Glossary                             | All            |
| 3   | Executive Summary                    | PO, BA         |
| 4   | Business Requirements                | BA, Dev        |
| 5   | Domain Model                         | Dev, Architect |
| 6   | Business Rules                       | BA, Dev        |
| 7   | Process Flows                        | BA, Dev        |
| 8   | Commands & Operations                | Dev            |
| 9   | Events & Background Jobs             | Dev            |
| 10  | UI Pages                             | Dev, UX        |
| 11  | API Reference (Simplified)           | Dev            |
| 12  | Cross-Service Integration            | Architect      |
| 13  | Security & Permissions               | Dev, Architect |
| 14  | Performance Considerations           | Dev, Architect |
| 15  | Test Specifications                  | QA, Dev        |
| 16  | Troubleshooting                      | Dev, QA        |
| 17  | Version History                      | All            |

### Stakeholder Quick Navigation

| Audience                | Sections                                                             |
| ----------------------- | -------------------------------------------------------------------- |
| **Product Owner**       | Executive Summary, Business Requirements                             |
| **Business Analyst**    | Business Requirements, Business Rules, Process Flows, Domain Model   |
| **Developer**           | Domain Model, Commands & Operations, API Reference, Events, UI Pages |
| **Technical Architect** | Domain Model, Cross-Service Integration, Security, Performance       |
| **QA/QC**               | Test Specifications, Business Rules, Troubleshooting                 |
| **UX Designer**         | UI Pages, Process Flows                                              |

---

## Step 0 — Mode Detection (MANDATORY FIRST)

**Before any extraction, detect mode:**

1. Check `docs/business-features/{Module}/` exists (or `--audit` flag)
2. If auto-detected module, check entire `docs/business-features/` tree
3. Present detected mode via a direct user question before proceeding — NEVER auto-start

**Mode routing:**

| Condition                                    | Mode       | Next Step                          |
| -------------------------------------------- | ---------- | ---------------------------------- |
| `docs/business-features/{Module}/` NOT found | **INIT**   | → Mode: INIT                       |
| `docs/business-features/{Module}/` exists    | **UPDATE** | → Phase 1.5 (existing update mode) |
| `--audit` flag OR user requests audit        | **AUDIT**  | → Mode: AUDIT                      |

> **Scale gate for INIT mode (workflow context only):** If `workflow-spec-driven-dev` is the caller AND module_count ≥ 4 → MUST spawn sub-agents (one per module) in ONE message. When feature-docs is invoked STANDALONE for a single module, no scale gate applies — single-module init is always single-session.

---

### Mode: INIT (New Feature Doc) — Full Extraction from Zero

When no docs exist, run spec-discovery-style extraction before formatting into 17-section docs.

#### Step 1-INIT.1: Holistic Scout

Map module's codebase before reading any file in detail:

1. Run `git ls-files src/Services/{Module}/` (or relevant path) — full file inventory
2. Identify: entity files, command files, query files, controller files, event handler files, frontend components
3. Build **Module Extraction Map**:
    - Entity layer: list all entity/aggregate files
    - Validation layer: list all validator files
    - Command layer: list all command handler files
    - API layer: list all controller files
    - Event layer: list all event handler + bus consumer files
    - Frontend: list all component + service + store files

#### Step 1-INIT.1.5: Use Case Enumeration [BLOCKING — MUST complete before Step 2 / Phase A]

**Goal:** Count ALL operations before planning extraction tasks. This number is the minimum TC count for Section 15.

**Write-side entry points:**

```bash
# CQRS command handlers
grep -r "ICommandHandler\|CommandHandler\b" src/Services/{Module}/ --include="*.cs" -l
# REST/MVC mutating endpoints
grep -r "\[HttpPost\]\|\[HttpPut\]\|\[HttpPatch\]\|\[HttpDelete\]" src/Services/{Module}/ --include="*.cs" -l
# Event consumers / background jobs
grep -r "IConsumer\|EventHandler\|IMessageConsumer\|BackgroundJob\|IHostedService" src/Services/{Module}/ --include="*.cs" -l
```

**Read-side entry points:**

```bash
# CQRS query handlers
grep -r "IQueryHandler\|QueryHandler\b" src/Services/{Module}/ --include="*.cs" -l
# REST/MVC GET endpoints
grep -r "\[HttpGet\]" src/Services/{Module}/ --include="*.cs" -l
```

**Actor/Role Discovery (feeds Phase E + Section 13):**

```bash
# Permission attributes and role guards
grep -r "\[Authorize\]\|RequirePermission\|IsInRole\|HasPermission" src/Services/{Module}/ --include="*.cs" -l
# Role/permission enums
grep -r "enum.*Role\|enum.*Permission" src/Services/{Module}/ --include="*.cs" -n | head -20
# Frontend route guards (if applicable)
grep -r "canActivate\|AuthGuard\|RoleGuard\|PermissionGuard" src/{frontend-root}/ --include="*.ts" -l 2>/dev/null | grep -i {module} | head -5
```

**Use Case Inventory Output:**

| Layer    | Write Ops (N) | Read Ops (M) | Event-Driven (K) | Background (J) |  Total  | Actor Roles       |
| -------- | :-----------: | :----------: | :--------------: | :------------: | :-----: | ----------------- |
| {Module} |       N       |      M       |        K         |       J        | N+M+K+J | [roles from grep] |

**[GATE — BLOCKING before Phase A extraction]:**

- Grand Total (N+M+K+J) = minimum Section 15 TC count
- If Grand Total ≥ 20: MUST split extraction into operation groups (≤20 ops each). Create one task tracking per group before starting any extraction phase.
- Actor catalog must list ≥1 role or flag as "No roles found — verify auth attributes manually"

#### Step 1-INIT.2: Domain Model Extraction (Phase A)

For each entity in Entity layer:

1. Read entity file
2. Extract: name, purpose (1 sentence), attributes (name, required, constraint, business meaning), lifecycle states, invariants
3. Identify relationships: FK fields, navigation properties, collection fields → cardinality
4. Write entity description with `[Source: file:line]`
5. Collect all entities for ERD generation

**ERD Generation (mandatory after all entities extracted):**

- Generate Mermaid `erDiagram` block
- Tech-agnostic types only: `string`, `number`, `boolean`, `date`, `list`, `map`
- Mark aggregate roots with `%% [AGGREGATE: ...]`
- Cross-module references as stubs: `%% [CROSS-REF: module-name]`
- Save ERD in `.ai/workspace/analysis/{Module}-erd.md` for Section 5

#### Step 1-INIT.3: Business Rules Extraction (Phase B)

For each validator/command handler in Validation layer:

1. Read file, extract validation rules (field → rule → error condition → error message)
2. Extract authorization rules (operation → who can perform → condition)
3. Extract state machine transitions if entity has lifecycle states
4. Write with `[Source: file:line]` per rule group

#### Step 1-INIT.4: API Contracts Extraction (Phase C)

For each application-layer entry point — read in this priority order:

1. **CQRS command handlers** (`UseCaseCommands/`) — one entry per handler class. Extract: handler name → business operation name (tech-agnostic), command fields, validation rules referenced, output type.
2. **CQRS query handlers** (`UseCaseQueries/`) — one entry per handler class. Extract: operation name, filter parameters, return shape, pagination.
3. **Event consumers** (`UseCaseEvents/`) — one entry per consumer. Extract: event consumed, side effects produced, output state changes.
4. **Background jobs** — one entry per job. Extract: schedule/trigger, operation performed, side effects.
5. **REST controllers** — supplementary only (HTTP adapter layer). Extract: HTTP method + path + auth required + DTO shape for operations NOT already covered by handlers above.

Write operation description in business language only — no C# type names or class names. Write with `[Source: file:line]` per entry.

**MUST: Every operation in Use Case Inventory (Step 1-INIT.1.5) → exactly one Phase C entry.** After Phase C: count entries. If count < Grand Total from inventory → create fill tasks before Phase D.

#### Step 1-INIT.4.5: Graph Trace for Cross-Service Scope (before Section 12)

Before extracting events and cross-service integrations, run graph analysis to discover ALL consumers and producers:

```bash
# Trace cross-service flow from the primary entity file
python .claude/scripts/code_graph trace src/Services/{Module}/{Module}.Domain/Entities/{PrimaryEntity}.cs --direction both --json

# Find all files connected to the primary service entry point
python .claude/scripts/code_graph connections src/Services/{Module}/{Module}.Service/Controllers/{PrimaryController}.cs --json
```

**If `.code-graph/graph.db` is unavailable:** Fall back to grepping for `IBusMessage`, `IConsumer`, `[IntegrationEvent]` patterns:

```bash
grep -rn "IBusMessage\|IConsumer\|IntegrationEvent" src/Services/{Module}/ --include="*.cs"
```

Use graph output to enumerate: outbound events (produces), inbound events (consumes), cross-service commands. Feed all findings into Section 12 and Section 9.

#### Step 1-INIT.5: Events & Jobs Extraction (Phase D)

For each event handler and bus consumer:

1. Extract: event name, trigger, payload fields, ordering guarantee
2. Background jobs: schedule, purpose, side effects, abort condition
3. Write with `[Source: file:line]`

#### Step 1-INIT.6: User Journey Synthesis (Phase E)

**Sources — all three required:**

1. **Backend operations** (from Phase C): every write op → one user story; every read/query with filter params → one search/list/view story
2. **UI routes and screens**: each distinct route/page in frontend module = one screen story
3. **Actor catalog** (from Step 1-INIT.1.5): every actor MUST appear in ≥1 story

**User Story format (MANDATORY for every story):**

> "As a {actor from actor catalog}, I want to {action verb + object}, so that {business outcome}."

**Story template:**

```markdown
## Journey: {JourneyName}

- **User Story:** As a {actor}, I want to {action}, so that {outcome}.
- **Actor:** {exact role name from actor catalog}
- **Operation Type:** write | read | event-driven | background | ui-screen
- **Trigger:** {what starts this journey}
- **Preconditions:** {what must already exist}
- **Happy Path:** 1. {Step 1} ...
- **Alternative Paths:** {Condition A} → {what happens}
- **Outcome:** {what actor achieves}
- **Acceptance Criteria:**
    - GIVEN {precondition} WHEN {action} THEN {outcome}
      [Source: path/to/handler-or-component.ext:line_range]
```

**Per-phase E completeness checklist (BLOCKING before proceeding to Step 1-INIT.7):**

- [ ] Journey count ≥ Phase C entry count (Grand Total from Use Case Inventory)
- [ ] Every actor in actor catalog appears in ≥1 journey
- [ ] Every UI route discovered has ≥1 screen story
- [ ] Every GET/query with filter params has a search/list/view story
- [ ] Every story uses "As a / I want / So that" format
- [ ] Every story has `[Source: file:line]`

#### Step 1-INIT.7: Transform to 17-Section Format

After extraction is complete, format the extracted content into the 17-section structure:

| Extracted Phase    | Target Section                                                       |
| ------------------ | -------------------------------------------------------------------- |
| Phase A entities   | Section 5 (Domain Model) — with ERD + `[Source: file:line]`          |
| Phase B rules      | Section 6 (Business Rules) + Section 4 (Business Requirements FR-XX) |
| Phase C operations | Section 8 (Commands) + Section 11 (API Reference)                    |
| Phase D events     | Section 9 (Events & Background Jobs) + Section 12 (Cross-Service)    |
| Phase E journeys   | Section 10 (UI Pages) + Section 15 (Test Specs with TC-XX IDs)       |
| Auth rules         | Section 13 (Security & Permissions)                                  |

**[BLOCKING] Section 15 Readiness Gate** — Before writing Section 15, verify foundational sections are complete:

| Section           | Required for TC writing?           | Check                                 |
| ----------------- | ---------------------------------- | ------------------------------------- |
| S4 Business Reqs  | Yes — TCs map to FR-XX             | ≥1 FR-XX entry present                |
| S6 Business Rules | Yes — TCs reference BR-XX          | ≥1 BR-XX with error condition present |
| S8 Commands       | Yes — TCs need operation targets   | ≥1 command entry present              |
| S13 Security      | Yes — TCs must include auth checks | Permission matrix present             |

If 2 or more of these sections are missing or empty → use a direct user question to ask user whether to proceed with placeholder TCs or halt and complete foundational sections first.

**[BLOCKING] Section 15 Quantity Gate (runs after Readiness Gate):**

Before writing any TCs, verify the planned TC count covers the Use Case Inventory:

| Check                | Required                            | Planned | Status    |
| -------------------- | ----------------------------------- | ------- | --------- |
| CRUD/Core TCs        | ≥ Write Ops (N) from inventory      | {n}     | PASS/FAIL |
| Read/View TCs        | ≥ Read Ops with filters (M)         | {n}     | PASS/FAIL |
| Event/Background TCs | ≥ Event-Driven (K) + Background (J) | {n}     | PASS/FAIL |
| Permission TCs       | ≥ actor count × 2                   | {n}     | PASS/FAIL |
| **Total**            | ≥ Grand Total (N+M+K+J)             | {n}     | PASS/FAIL |

If any row FAILS or planned count < Grand Total: split TC generation into operation-group batches (≤20 ops per task tracking). Do NOT write TCs until all batch tasks are planned and the total is ≥ Grand Total.

**[REQUIRED] TC ID Collision Prevention:**

```bash
grep -n "TC-{FEATURE}-" docs/business-features/{Module}/detailed-features/README.*.md 2>/dev/null | sort | tail -10
```

Note the highest existing ID before assigning new ones. See `.claude/skills/shared/tc-format.md` — Decade-Based Numbering for range rules.

> **[REQUIRED] Doc Network Step (INIT mode — INSERT; UPDATE mode — VERIFY):**
>
> **INIT mode:** Before completing INIT, **insert** a `## Related Documentation` section into the feature doc.
> Place it immediately after the frontmatter header (before Section 1 content).
> Note: This step fires late in the INIT workflow — retroactively insert at the document top before saving.
>
> **UPDATE mode:** Do NOT re-insert this section if it already exists — instead **verify** that the links are current
> (paths match current module structure, no broken references). If the section is missing from an older doc, add it now.
>
> ```markdown
> ## Related Documentation
>
> | Type              | Path                                                         | Description                                              |
> | ----------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
> | Engineering Spec  | `docs/specs/{app-bucket}/{system-name}/`                     | Tech-agnostic spec bundle (create via $spec-discovery)   |
> | QA Test Dashboard | `docs/specs/{Module}/README.md`                              | All TCs, execution status, integration test traceability |
> | Integration Tests | `src/Services/{ServiceName}/{ServiceName}.IntegrationTests/` | Test code; linked by [Trait("TestSpec", "TC-...")]       |
> | Parent Feature    | _(if sub-feature)_                                           |                                                          |
> | Child Features    | _(if this doc is a parent)_                                  |                                                          |
> ```
>
> Fill in `{app-bucket}`, `{system-name}`, `{Module}`, `{ServiceName}` from the current module context.
> Use `(not yet created)` for paths that don't exist yet — they serve as navigational intent markers.
>
> **Why:** This section is the navigation hub for all consumers of this feature area. Without it,
> every AI session must scan the entire docs tree to find related artifacts.

---

### Mode: AUDIT (Staleness Detection)

When audit mode is triggered:

1. Read `docs/business-features/{Module}/detailed-features/README.{Feature}.md` frontmatter → `last_updated`
2. Run `git log --since="{last_updated}" --name-only -- src/Services/{Module}/`
3. If changed files found → flag sections using Phase 1.5 impact mapping table
4. Output `docs/business-features/{Module}/AUDIT-{date}.md`:

    ```markdown
    # Feature Doc Audit — {date}

    ## {FeatureName}

    | Section                    | Status     | Changed Source Files            | Action              |
    | -------------------------- | ---------- | ------------------------------- | ------------------- |
    | Section 5 (Domain Model)   | ⚠️ STALE   | EntityX.cs (changed 2026-04-18) | Re-extract entities |
    | Section 6 (Business Rules) | ✅ Current | —                               | —                   |
    ```

---

## Phase 1: Module Detection & Context Gathering

### Step 1.0: Auto-Detect Modules from Git Changes (Default)

When no module specified, auto-detect from git changes:

1. `git diff --name-only HEAD` (staged + unstaged); if none → `git diff --name-only HEAD~1`
2. Extract unique module names using Module Mapping table
3. For each module: check if `docs/business-features/{Module}/` exists
4. Docs exist → **Phase 1.5 (Update Mode)**; missing → skip (no scratch creation without user request)
5. Only `.claude/`, `docs/`, config files changed → report "No business feature docs impacted" and exit

**Path-to-Module Detection Rules:**

Search your codebase to build the path-to-module mapping. Common patterns:

| Changed File Path Pattern                           | Detected Module                   |
| --------------------------------------------------- | --------------------------------- |
| `src/Services/{Module}/**`                          | {Module}                          |
| `{frontend-apps-dir}/{app-name}/**`                 | {Module} (map app name to module) |
| `{frontend-libs-dir}/{domain-lib}/src/{feature}/**` | {Module} (map feature to module)  |

Build a project-specific mapping by examining:

```bash
ls -d src/Services/*/
ls -d {frontend-apps-dir}/*/
```

### Step 1.1: Identify Target Module

Module source priority: (1) user-specified → (2) domain-implied (grep to verify) → (3) auto-detected from git diff (Step 1.0)

### Step 1.2: Read Existing Documentation

1. `docs/BUSINESS-FEATURES.md` (master index)
2. `docs/business-features/{Module}/INDEX.md` (if exists)
3. `docs/business-features/{Module}/README.md` (if exists)

### Step 1.3: Codebase Analysis

Grep evidence from source:

- **Entities**: `{Module}.Domain/Entities/`
- **Commands**: `{Module}.Application/UseCaseCommands/`
- **Queries**: `{Module}.Application/UseCaseQueries/`
- **Controllers**: `{Module}.Service/Controllers/`
- **Frontend**: `{frontend-apps-dir}/{app}/` or `{frontend-libs-dir}/{lib}/`

### Step 1.4: Feature Analysis

Build knowledge model in `.ai/workspace/analysis/[feature-name].md`. Discover: entities/enums, commands/queries/events/jobs, controllers/DTOs, frontend components, cross-service bus messages.

---

## Phase 1.5: Update Mode (when updating existing docs)

When UPDATING existing feature docs (not from scratch):

#### Step 1.5.0: Sync Engineering Spec (if `docs/specs/{app-bucket}/{system-name}/` exists)

1. Check `docs/specs/{app-bucket}/{system-name}/` exists
2. If found: note overlapping modules from git diff + spec registry
3. Flag output: "Engineering spec sync required for modules: {list}" — do NOT trigger spec-discovery directly (separation of concerns)

### Step 1.5.1: Diff Analysis

1. Identify source (git diff, branch, commit)
2. Categorize changes: entity, command, query, frontend, i18n
3. Map each change to impacted sections (table below)

### Step 1.5.2: Section Impact Mapping

| Change Type            | Impacted Sections                                               |
| ---------------------- | --------------------------------------------------------------- |
| New entity property    | 4 (Business Requirements), 5 (Domain Model), 11 (API Reference) |
| New API endpoint       | 11 (API Reference), 13 (Security & Permissions)                 |
| New frontend component | 10 (UI Pages)                                                   |
| New filter/query       | 4 (Business Requirements), 11 (API Reference)                   |
| Any new functionality  | **15 (Test Specifications)** — MANDATORY                        |
| Any change             | 3 (Executive Summary), 17 (Version History) — ALWAYS UPDATE     |

### Step 1.5.3: Mandatory Test Coverage (Section 15)

**CRITICAL**: When documenting ANY new functionality, MUST update:

- **Section 15 (Test Specifications)**: Add test cases (TC-{FEATURE}-{NNN}) for new features.

> **[BLOCKING] TC Format:** Use canonical format in `.claude/skills/shared/tc-format.md`. NEVER use abbreviated flat GIVEN/WHEN/THEN — use full template with all required fields (Objective, Preconditions, GWT steps, Acceptance Criteria, Test Data, Edge Cases, Evidence, IntegrationTest, Status). Section 15 owned exclusively by `$tdd-spec` — feature-docs populates only during INIT. Existing TCs MUST NOT be overwritten during UPDATE mode.

> **[BLOCKING] TC ID Collision Prevention:** Before assigning new TC IDs, check highest existing ID:
>
> ```bash
> grep -n "TC-{FEATURE}-" docs/business-features/{Module}/detailed-features/README.*.md | sort | tail -5
> ```
>
> Assign next sequential ID. See `.claude/skills/shared/tc-format.md` — Decade-Based Numbering section for range rules.

**Failure to update Section 15 = blocking quality issue.**

### Step 1.5.4: CHANGELOG Entry

Always create/update `CHANGELOG.md` entry under `[Unreleased]` following Keep a Changelog format.

---

## Phase 2: Documentation Generation

Generate at `docs/business-features/{Module}/detailed-features/README.{FeatureName}.md`.

### Key Format Examples

**Business Requirements (FR-XX)**:

```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                           |
| --------------- | --------------------------------- |
| **Description** | {What this requirement enables}   |
| **Scope**       | {Who can use / affected entities} |
| **Evidence**    | `{FilePath}:{LineRange}`          |
```

**User Stories (US-XX)**:

```markdown
#### US-{MOD}-01: {Story Title}

**As a** {role}
**I want** {goal/desire}
**So that** {benefit/value}

**Acceptance Criteria**:

- [ ] AC-01: {Criterion with evidence reference}
- [ ] AC-02: {Criterion with evidence reference}

**Related Requirements**: FR-{MOD}-01, FR-{MOD}-02
**Evidence**: `{FilePath}:{LineRange}`
```

**Test Summary Table (MANDATORY)**:

```markdown
| Category    | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) |  Total  |
| ----------- | :-----------: | :-------: | :---------: | :------: | :-----: |
| {Category1} |      {N}      |    {N}    |     {N}     |   {N}    |   {N}   |
| **Total**   |    **{N}**    |  **{N}**  |   **{N}**   | **{N}**  | **{N}** |
```

**Test Case Format (TC-XX)**:

> **[BLOCKING] Canonical TC format authority:** `.claude/skills/shared/tc-format.md` — always use for full TC template. Below is the minimum required format for feature docs Section 15.

```markdown
#### TC-{FEATURE}-001: {Test Name} [P0]

**Objective:** {One sentence: what behavior this TC verifies}

**Preconditions:**

- {Required system state}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Acceptance Criteria:**

- Success: {observable outcome}
- Failure: {error condition + message}

**Test Data:** `{ "field": "value" }`

**Edge Cases:**

- {Invalid scenario} → {Expected error/behavior}

**Evidence:** `{FilePath}:{LineRange}`
**IntegrationTest:** `{TestFile}.cs::{MethodName}` (or `Untested`)
**Status:** Tested | Untested | Planned
```

**Troubleshooting Format**:

```markdown
#### {Issue Title}

**Symptoms**: {Observable problem}

**Causes**:

1. {Cause 1}
2. {Cause 2}

**Resolution**:

- {Step 1}
- {Step 2}
```

**Permission Matrix**:

```markdown
| Role  | View | Create | Edit | Delete | Special     |
| ----- | :--: | :----: | :--: | :----: | ----------- |
| Admin |  ✅  |   ✅   |  ✅  |   ✅   | Full access |
```

### Domain Model ERD (MANDATORY in Section 5)

Every feature doc MUST include a Mermaid `erDiagram` in Section 5:

```mermaid
erDiagram
    {EntityA} {
        string id PK
        string name
        string status
    }
    {EntityB} {
        string id PK
        string entityAId FK
    }
    {EntityA} ||--o{ {EntityB} : "contains"
```

**ERD rules (same as spec-discovery standard):**

- Tech-agnostic types only: `string`, `number`, `boolean`, `date`, `list`, `map`
- No C# class names or ORM types
- Mark aggregate roots: `%% [AGGREGATE: EntityName]`
- Cross-module stubs: `%% [CROSS-REF: module-name]`

`[Source: path/to/entity-files:line_range]` required after the ERD block.

**Business Rules (Section 6) Format:**

Each rule group MUST include `[Source: file:line]`:

```markdown
### BR-{MOD}-01: {Rule Group Name}

| Field/Operation | Rule         | Error Condition | Error Message      |
| --------------- | ------------ | --------------- | ------------------ |
| {field}         | {constraint} | {when violated} | {message constant} |

[Source: {Service}/{Layer}/{File}.cs:{line_range}]
```

---

## Note: AI Companion Files Deprecated

No `.ai.md` companion files. Single `README.{Feature}.md` only output. Template: `docs/templates/detailed-feature-docs-template.md` (authoritative).

### Key Principles (v4.0)

- **No code details** in sections 1-14, 16 — no file paths, no C# types, no API shapes
- **Evidence only in Section 15** — `file:line` references
- **Commands MUST cross-reference BR-XXX** — each command lists business rules validated
- **Max 1500 lines** per doc (target 500-800). When approaching limit, split into sub-features:
    1. Create `README.{FeatureName}-Part1.md` and `README.{FeatureName}-Part2.md`
    2. Keep Domain Model (S5) + Business Rules (S6) in Part1; secondary ops/edge cases → Part2
    3. Preserve TC ID continuity — both parts share `TC-{FEATURE}-` prefix; NEVER renumber
    4. Add cross-references: each part includes "**See also:** README.{FeatureName}-Part{N}.md" in header
    5. Update `INDEX.md` and `BUSINESS-FEATURES.md` to link both parts
- **YAML frontmatter** required: module, service, feature_code, entities[], status, last_updated
- **Audit mode produces AUDIT-{date}.md** — NEVER modifies existing docs
- **Init mode uses spec-discovery extraction phases** — all entities, rules, APIs MUST be read from source before writing

---

## Phase 3: Master Index Update

After creating/updating module docs, update `docs/BUSINESS-FEATURES.md`:

1. Read current content
2. Verify module is listed in the "Detailed Module Documentation" table
3. Add link if missing:
    ```markdown
    | **{Module}** | [Description] | [View Details](./business-features/{Module}/README.md) |
    ```

### Step 3.5: Update Module CHANGELOG.md

After every feature-docs run (init or update), append to `docs/business-features/{Module}/CHANGELOG.md`:

```markdown
## [Unreleased] — {date}

### Updated

- {FeatureName}: updated sections {list of section numbers} — triggered by {git ref or user request}
- Reason: {brief description of change}
```

Create `docs/business-features/{Module}/CHANGELOG.md` if it does not exist.

---

## Anti-Hallucination Protocols

<!-- SYNC:evidence-based-reasoning -->

> **Evidence-Based Reasoning** — Speculation is FORBIDDEN. Every claim needs proof.
>
> 1. Cite `file:line`, grep results, or framework docs for EVERY claim
> 2. Declare confidence: >80% act freely, 60-80% verify first, <60% DO NOT recommend
> 3. Cross-service validation required for architectural changes
> 4. "I don't have enough evidence" is valid and expected output
>
> **BLOCKED until:** `- [ ]` Evidence file path (`file:line`) `- [ ]` Grep search performed `- [ ]` 3+ similar patterns found `- [ ]` Confidence level stated
>
> **Forbidden without proof:** "obviously", "I think", "should be", "probably", "this is because"
> **If incomplete →** output: `"Insufficient evidence. Verified: [...]. Not verified: [...]."`

<!-- /SYNC:evidence-based-reasoning -->

### DOCUMENTATION_ACCURACY_CHECKPOINT

Before writing documentation, verify:

- Read actual code implementing this?
- Line number references accurate and current?
- Code snippet as evidence available?

### TEST CASE EVIDENCE VERIFICATION

**EVERY test case:**

1. Read Evidence file at claimed line number
2. Verify: code at line supports test assertion
3. Check Edge Cases: find error constants in `ErrorMessage.cs`
4. Fix immediately if line numbers wrong

---

## Phase 3.5: Verification (4 Passes)

### First Pass — Test Case Evidence Audit (Section 15)

**EVERY test case:**

1. Read Evidence file at claimed line number
2. Verify: code at line supports test assertion?
3. Check Edge Cases: find error constants in `ErrorMessage.cs`
4. Fix immediately if line numbers wrong

### Second Pass — Domain Model Verification

- Read EACH entity file referenced in Section 5
- Verify property names and business meanings accurate (no implementation types — use business meaning column)
- Check enum values exist in actual source
- Remove documented properties not found in source

### Third Pass — Cross-Reference Audit

- 17 sections present in correct order
- Test Summary counts match actual TC count in Section 15
- All internal links work
- No template placeholders remain (`{FilePath}`, `{LineRange}`)
- ErrorMessage constants match edge case messages
- YAML frontmatter present and complete

**CRITICAL: ANY pass finds hallucinated content → re-investigate and fix before completing.**

### Fourth Pass — AI-Implementability Check

Flag items requiring implementation assumptions:

- **S4 (Functional Requirements):** Every FR-XX needs explicit success AND failure outcome. Vague FR → INCOMPLETE.
- **S6 (Business Rules):** Every BR-XX needs: trigger condition, rule content, error message, `[Source: file:line]`. Missing field → flag.
- **S8 (Commands/Operations):** Every command references ≥1 BR-XX validated. Commands with no BR reference → flag.
- **S13 (Authorization):** Permission matrix with explicit role × action × condition cells. Blank cells → flag.
- **Concrete examples:** ≥1 example (input + expected output) per core operation. Abstract-only → LOW.

If >3 INCOMPLETE items → HALT, present gap list via ask the user directly before completing.

_Reference: `docs/project-reference/spec-principles.md` Section 4 (AI-Implementability Checklist)._

---

## Quality Checklist

### Structure

- [ ] Documentation placed in correct folder structure
- [ ] README.md follows template format (17 sections)
- [ ] **YAML frontmatter** present with module, service, feature_code, entities[]
- [ ] INDEX.md created with navigation links
- [ ] Master index (BUSINESS-FEATURES.md) updated
- [ ] Stakeholder navigation table present
- [ ] CHANGELOG.md updated with entry under `[Unreleased]`
- [ ] **Max 1500 lines** total document length (if approaching limit, follow split procedure in Key Principles)
- [ ] **No code details** in sections 1-14, 16 (no file paths, no C# types)
- [ ] **Commands reference BR-XXX** IDs they validate

### Test Case Evidence (MANDATORY)

- [ ] **EVERY test case has Evidence field** with `file:line` format
- [ ] **No template placeholders** remain (`{FilePath}`, `{LineRange}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Edge case errors match** constants from `ErrorMessage.cs`
- [ ] **Test Summary counts match** actual number of test cases in Section 15

### Anti-Hallucination

- [ ] All entity properties verified against source code
- [ ] All enum values verified against actual enum definitions
- [ ] No invented methods, properties, or models
- [ ] All code snippets copied from actual files

### Section 5 (Domain Model)

- [ ] Mermaid `erDiagram` present with all entities
- [ ] ERD uses only tech-agnostic types
- [ ] `[Source: file:line]` after each entity definition and after ERD block
- [ ] Aggregate roots marked with `%% [AGGREGATE: ...]`

### Section 6 (Business Rules)

- [ ] `[Source: file:line]` present after each rule group table
- [ ] Error messages verified against `ErrorMessage.cs` or equivalent constants file

### Init Mode Checklist

- [ ] Phase A extraction complete before ERD generated
- [ ] Phase B extraction complete before Section 6 written
- [ ] Phase C extraction complete before Sections 8 and 11 written
- [ ] Phase D extraction complete before Section 9 written
- [ ] Phase E extraction complete before Sections 10 and 15 written
- [ ] CHANGELOG.md created for module

### Completeness Gates (Init Mode)

- [ ] [C-gate] Phase C entry count ≥ Grand Total from Use Case Inventory (Step 1-INIT.1.5)
- [ ] [E-gate] Phase E journey count ≥ Phase C entry count
- [ ] [Actor-gate] Every actor in actor catalog appears in ≥1 Phase E journey
- [ ] [TC-gate] Section 15 TC count ≥ Grand Total from Use Case Inventory
- [ ] [Source-gate] Every Phase C entry and every Phase E journey has `[Source: file:line]`

## Related

- `documentation`
- `feature-implementation`

---

## Workflow Recommendation

> **MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS:** If you are NOT already in a workflow, you MUST ATTENTION use a direct user question to ask the user. Do NOT judge task complexity or decide this is "simple enough to skip" — the user decides whether to use a workflow, not you:
>
> 1. **Activate `tdd-feature` workflow** (Recommended) — scout → investigate → domain-analysis → tdd-spec → tdd-spec-review → plan → plan-review → plan-validate → why-review → cook → review-domain-entities → integration-test → integration-test-review → integration-test-verify → test → workflow-review-changes → sre-review → changelog → docs-update → watzup → workflow-end
> 2. **Execute `$feature-docs` directly** — run this skill standalone

---

## Next Steps

**[BLOCKING]** After completing, use a direct user question to present options. Do NOT skip — user decides:

- **"$tdd-spec (Recommended)"** — Generate/update test specs for documented features
- **"$tdd-spec [direction=sync]"** — Sync test specs to dashboard
- **"Skip, continue manually"** — user decides

---

## Related Skills

| Skill                        | Relationship                                                                      | When to Call                                                                                        |
| ---------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `$spec-discovery`            | **Producer** — extracts engineering spec bundle that feeds this skill's INIT mode | Run spec-discovery first when creating docs for the first time; use its output as Section 12 source |
| `$tdd-spec`                  | **Consumer** — reads Section 15 to generate/validate TCs                          | After creating/updating feature docs, call tdd-spec to populate or review Section 15                |
| `$tdd-spec-review`           | **Reviewer** — audits TC coverage in Section 15                                   | After tdd-spec, to validate TC completeness and GIVEN/WHEN/THEN quality                             |
| `$tdd-spec [direction=sync]` | **Dashboard** — syncs `docs/specs/{Module}/README.md` from Section 15             | After tdd-spec update, to keep QA dashboard current                                                 |
| `$integration-test`          | **End consumer** — generates test code from TCs in Section 15                     | After tdd-spec, to produce actual integration test files                                            |
| `$docs-update`               | **Orchestrator** — calls this skill as Phase 2                                    | Run $docs-update for full chain sync; it calls $feature-docs internally                             |
| `$review-changes`            | **Trigger** — detects feature doc staleness                                       | Calls $docs-update when business doc is stale relative to code changes                              |

## Standalone Chain

> **When called outside a workflow**, follow this chain to keep all spec layers in sync.
> Skip steps already done in the same session.

```
feature-docs (you are here)
  │
  ├─ BEFORE this skill (if doc doesn't exist yet):
  │    [REQUIRED] → $spec-discovery [init mode]
  │          Extracts engineering spec bundle. Provides basis for Sections 1-14 accuracy.
  │          Skip if: feature docs updating existing content, or small feature with no domain model.
  │
  ├─ AFTER this skill:
  │
  ├─ [REQUIRED] → $tdd-spec [CREATE or UPDATE mode]
  │     Section 15 is incomplete without explicit tdd-spec run.
  │     CREATE: new feature doc just created → write TCs from spec.
  │     UPDATE: existing doc updated → update TCs to match changed behavior.
  │
  ├─ [REQUIRED] → $tdd-spec-review
  │     Validates TC coverage, GIVEN/WHEN/THEN completeness, no duplicate TC codes.
  │
  ├─ [REQUIRED] → $tdd-spec [direction=sync]
  │     Syncs Section 15 TCs to QA dashboard at docs/specs/{Module}/README.md.
  │
  ├─ [RECOMMENDED] → $integration-test [from-changes or from-prompt mode]
  │     Generates/updates integration test files from changed TCs.
  │
  └─ [RECOMMENDED] → $docs-update
        If code changes triggered this doc update, run $docs-update for full chain including
        spec-discovery (Phase 2.5) and tdd-spec (Phase 3).
```

### Doc Network Principle

> **[REQUIRED]** Every feature doc managed by this skill must have a `## Related Documentation` section:
>
> **INIT mode:** INSERT the section (place immediately after frontmatter, before Section 1 content)
> **UPDATE mode:** VERIFY the section exists and links are current; add it if missing from an older doc
>
> Do not re-add if already present. Check before marking this skill complete.

Template to insert or verify in `docs/business-features/{Module}/README.md`:

```markdown
## Related Documentation

| Type              | Link                                                                              | Description                                                    |
| ----------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Engineering Spec  | [docs/specs/{app-bucket}/{system-name}/](../../specs/{app-bucket}/{system-name}/) | Tech-agnostic spec bundle (domain model, rules, API contracts) |
| QA Test Dashboard | [docs/specs/{Module}/README.md](../../specs/{Module}/README.md)                   | All TCs, execution status, integration test links              |
| Integration Tests | `src/Services/{ServiceName}/{ServiceName}.IntegrationTests/`                      | Test code linked to TCs via [Trait("TestSpec", "TC-...")]      |
| Related Modules   | _(list any cross-module dependencies here)_                                       |                                                                |
```

Fill in `{app-bucket}`, `{system-name}`, `{Module}`, `{ServiceName}` from context.
If `docs/specs/{app-bucket}/{system-name}/` does not exist yet, write: `(spec bundle not yet created — run $spec-discovery init)`.

This section enables:

- Humans navigating from business doc → engineering detail → test evidence
- `$docs-update` detecting when spec bundle was updated but business doc wasn't
- Future AI sessions knowing what exists without a full scan

<!-- SYNC:evidence-based-reasoning:reminder -->

**IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.

<!-- /SYNC:evidence-based-reasoning:reminder -->
<!-- SYNC:ai-mistake-prevention -->

**AI Mistake Prevention** — Failure modes to avoid on every task:

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
<!-- SYNC:ai-mistake-prevention:reminder -->

**MUST ATTENTION** apply AI mistake prevention — holistic-first debugging, fix at responsible layer, surface ambiguity before coding, re-read files after compaction.

<!-- /SYNC:ai-mistake-prevention:reminder -->

## Closing Reminders

- **IMPORTANT MUST ATTENTION [BLOCKING]** Break work into small task tracking tasks BEFORE starting — do NOT write single line of output without task list
- **IMPORTANT MUST ATTENTION [BLOCKING]** EVERY test case MUST have verifiable code evidence (`FilePath:LineNumber`) — no exceptions
- **IMPORTANT MUST ATTENTION [BLOCKING]** Run Use Case Enumeration (Step 1-INIT.1.5) BEFORE any extraction — minimum TC count derives from this inventory
- **IMPORTANT MUST ATTENTION [BLOCKING]** Existing TCs MUST NOT be overwritten during UPDATE mode — Section 15 owned by `$tdd-spec` after INIT
- **IMPORTANT MUST ATTENTION [REQUIRED]** 17 sections MUST match master template in exact order
- **IMPORTANT MUST ATTENTION [REQUIRED]** ALWAYS update CHANGELOG.md and Section 17 (Version History) when modifying docs
- **IMPORTANT MUST ATTENTION [REQUIRED]** Search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION [REQUIRED]** Add final review task to verify work quality

**[TASK-PLANNING]** MUST ATTENTION analyze task scope and break into small todo tasks/sub-tasks via task tracking before acting.

---

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:START -->

## Hookless Prompt Protocol Mirror (Auto-Synced)

Source: `.claude/hooks/lib/prompt-injections.cjs` + `.claude/.ck.json`

## [WORKFLOW-EXECUTION-PROTOCOL] [BLOCKING] Workflow Execution Protocol — MANDATORY IMPORTANT MUST CRITICAL. Do not skip for any reason.

1. **DETECT:** Match prompt against workflow catalog
2. **ANALYZE:** Find best-match workflow AND evaluate if a custom step combination would fit better
3. **ASK (REQUIRED FORMAT):** Use a direct user question with this structure:
    - Question: "Which workflow do you want to activate?"
    - Option 1: "Activate **[BestMatch Workflow]** (Recommended)"
    - Option 2: "Activate custom workflow: **[step1 → step2 → ...]**" (include one-line rationale)
4. **ACTIVATE (if confirmed):** Call `$workflow-start <workflowId>` for standard; sequence custom steps manually
5. **CREATE TASKS:** task tracking for ALL workflow steps
6. **EXECUTE:** Follow each step in sequence
   **[CRITICAL-THINKING-MINDSET]** Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence >80% to act.
   **Anti-hallucination principle:** Never present guess as fact — cite sources for every claim, admit uncertainty freely, self-check output for errors, cross-reference independently, stay skeptical of own confidence — certainty without evidence root of all hallucination.
   **AI Attention principle (Primacy-Recency):** Put the 3 most critical rules at both top and bottom of long prompts/protocols so instruction adherence survives long context windows.

## Learned Lessons

# Lessons Learned

> **[CRITICAL]** Hard-won project debugging/architecture rules. MUST ATTENTION apply BEFORE forming hypothesis or writing code.

## Quick Summary

**Goal:** Prevent recurrence of known failure patterns — debugging, architecture, naming, AI orchestration, environment.

**Top Rules (apply always):**

- MUST ATTENTION verify ALL preconditions (config, env, DB names, DI regs) BEFORE code-layer hypothesis
- MUST ATTENTION fix responsible layer — NEVER patch symptom sites with caller-specific defensive code
- MUST ATTENTION use `ExecuteInjectScopedAsync` for parallel async + repo/UoW — NEVER `ExecuteUowTask`
- MUST ATTENTION name by PURPOSE not CONTENT — adding member forces rename = abstraction broken
- MUST ATTENTION persist sub-agent findings incrementally after each file — NEVER batch at end
- MUST ATTENTION Windows bash: verify Python alias (`where python`/`where py`) — NEVER assume `python`/`python3` resolves

---

## Debugging & Root Cause Reasoning

- [2026-04-11] **Holistic-first: verify environment before code.** Failure → list ALL preconditions (config, env vars, DB names, endpoints, DI regs, credentials, permissions, data prerequisites) → verify each via evidence (grep/cat/query) BEFORE code-layer hypothesis. Worst rabbit holes: diving nearest layer while bug sits elsewhere — e.g., hours debugging "sync timeout", real cause: test appsettings pointing wrong DB. Cheapest check first.
- [2026-04-01] **Ask "whose responsibility?" before fixing.** Trace: bug in caller (wrong data) or callee (wrong handling)? Fix responsible layer — NEVER patch symptom site masking real issue.
- [2026-04-01] **Trace data lifecycle, not error site.** Follow data: creation → transformation → consumption. Bug usually where data created wrong, not consumed.
- [2026-04-01] **Code is caller-agnostic.** Functions/handlers/consumers don't know who invokes them. Comments/guards/messages describe business intent — NEVER reference specific callers (tests, seeders, scripts).

## Architecture Invariants

- [2026-03-31] **ParallelAsync + repo/UoW MUST use `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask`.** `ExecuteUowTask` creates new UoW but reuses outer DI scope (same DbContext) — parallel iterations sharing non-thread-safe DbContext silently corrupt data. `ExecuteInjectScopedAsync` creates new UoW + new DI scope (fresh repo per iteration).
- [2026-03-31] **Bus message naming MUST include service name prefix — core services NEVER consume feature events.** Prefix declares schema ownership (`AccountUserEntityEventBusMessage` = Accounts owns). Core services (Accounts, Communication) are leaders. Feature services (Growth, Talents) sending to core MUST use `{CoreServiceName}...RequestBusMessage` — never define own event for core to consume.

## Naming & Abstraction

- [2026-04-12] **Name PURPOSE not CONTENT — "OrXxx" anti-pattern.** `HrManagerOrHrOrPayrollHrOperationsPolicy` names set members, not what it guards. Add role → rename = broken abstraction. **Rule:** names express DOES/GUARDS, not CONTAINS. **Test:** adding/removing member forces rename? YES = content-driven = bad → rename to purpose (e.g., `HrOperationsAccessPolicy`). **Nuance:** "Or" fine in behavioral idioms (`FirstOrDefault`, `SuccessOrThrow`) — expresses HAPPENS, not membership.

## Environment & Tooling

- [2026-04-20] **Windows bash: NEVER assume `python`/`python3` resolves — verify alias first.** Python may not be in bash PATH under those names. Check: `where python` / `where py`. Prefer `py` (Windows Python Launcher) for one-liners, `node` if JS alternative exists.

> Test-specific lessons → `docs/project-reference/integration-test-reference.md` Lessons Learned section. Production-code anti-patterns → `docs/project-reference/backend-patterns-reference.md` Anti-Patterns section. Generic debugging/refactoring reminders → System Lessons in `.claude/hooks/lib/prompt-injections.cjs`.

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** holistic-first: verify ALL preconditions (config, env, DB names, endpoints, DI regs) BEFORE code-layer hypothesis — cheapest check first
- **IMPORTANT MUST ATTENTION** fix responsible layer — NEVER patch symptom site; trace caller (wrong data) vs callee (wrong handling), fix root owner
- **IMPORTANT MUST ATTENTION** parallel async + repo/UoW → ALWAYS `ExecuteInjectScopedAsync`, NEVER `ExecuteUowTask` (shared DbContext = silent data corruption)
- **IMPORTANT MUST ATTENTION** bus message prefix = schema ownership; feature services NEVER define events for core services — use `{CoreServiceName}...RequestBusMessage`
- **IMPORTANT MUST ATTENTION** name by PURPOSE — adding/removing member forces rename = broken abstraction
- **IMPORTANT MUST ATTENTION** sub-agents MUST write findings after each file/section — NEVER batch all findings into one final write
- **IMPORTANT MUST ATTENTION** Windows bash: NEVER assume `python`/`python3` resolves — run `where python`/`where py` first, use `py` launcher or `node`

## [LESSON-LEARNED-REMINDER] [BLOCKING] Task Planning & Continuous Improvement — MANDATORY. Do not skip.

Break work into small tasks (task tracking) before starting. Add final task: "Analyze AI mistakes & lessons learned".

**Extract lessons — ROOT CAUSE ONLY, not symptom fixes:**

1. Name the FAILURE MODE (reasoning/assumption failure), not symptom — "assumed API existed without reading source" not "used wrong enum value".
2. Generality test: does this failure mode apply to ≥3 contexts/codebases? If not, abstract one level up.
3. Write as a universal rule — strip project-specific names/paths/classes. Useful on any codebase.
4. Consolidate: multiple mistakes sharing one failure mode → ONE lesson.
5. **Recurrence gate:** "Would this recur in future session WITHOUT this reminder?" — No → skip `$learn`.
6. **Auto-fix gate:** "Could `$code-review`/`/simplify`/`$security`/`$lint` catch this?" — Yes → improve review skill instead.
7. BOTH gates pass → ask user to run `$learn`.
   **[TASK-PLANNING] [MANDATORY]** BEFORE executing any workflow or skill step, create/update task tracking for all planned steps, then keep it synchronized as each step starts/completes.

<!-- CODEX:SYNC-PROMPT-PROTOCOLS:END -->
