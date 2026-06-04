> The `spec` skill (`../SKILL.md`) loads this body for `[mode=init|update|audit|amend]` — the Feature Spec authoring + §8-shell modes. The shared M1-M6 contract, SYNC blocks, and prompt-enhance scaffolding live ONCE in the host SKILL.md; this body carries only the authoring procedure.

## Project Pattern Discovery

Before implementation, search codebase for project-specific patterns:

- Search: `specs`, `feature specs`, `feature-spec-template`
- Look for: existing feature doc folders, 8-section tech-free templates

> **[BLOCKING]** Read `feature-spec-reference.md` for project-specific patterns. If not found, use search-based discovery.

# Feature Documentation Generation & Verification

Generate feature docs following project conventions.

**GOLD STANDARD:** Search existing feature docs: `find docs/specs -name "README.*.md" -type f | head -5`

**Template:** `docs/templates/detailed-feature-spec-template.md`

---

## [CRITICAL] MANDATORY CODE EVIDENCE RULE

**EVERY test case MUST ATTENTION have verifiable code evidence — non-negotiable.**

### Evidence Format

Evidence is a **stack-portable abstract anchor** — never a donor physical code coordinate or repository-root path:

```markdown
**Evidence**: `[Source: {namespace}/{service}/{id}]`
```

Namespace ∈ `operation | event | component | schema | requirement | rule | constraint | test`. Service = owning module (lowercased). Id = the artifact concept with code suffixes stripped. Physical coordinates are recoverable only via the provenance sidecar. Full contract: `shared/tc-format.md`.

### Valid vs Invalid Evidence

| Valid                                       | Invalid                                 |
| ------------------------------------------- | --------------------------------------- |
| `[Source: operation/orders/CreateOrder]`    | physical code coordinates               |
| `[Source: component/orders/Order]`          | `{namespace}/{service}/{id}` (template) |
| `[Source: event/accounts/AccountUserSaved]` | "Based on CQRS pattern" (vague)         |

> **Carrier-field only:** the abstract anchor (and the `IntegrationTest` test link) appear ONLY inside the `**Evidence**` / `IntegrationTest` fields — never in a test case's behavioral description, which stays tech-agnostic (`spec-principles.md §3`). `IntegrationTest` is the lone exception that keeps physical `{TestFile}::{MethodName}` link(s) — it may list **several** covering tests, since one business TC maps to many tests (operational QA glue; see `tc-format.md` → TC ↔ Test Code Cardinality).

---

## Output Structure

All documentation MUST be placed in correct folder structure:

```
docs/
├── templates/
│   └── detailed-feature-spec-template.md  # MASTER TEMPLATE
└── specs/
    ├── {Module}/                     # One folder per service/module in your project
    │   ├── INDEX.md                  # Navigation hub
    │   └── README.{FeatureName}.md   # Tech-free Feature Spec (8-section; body ≤1200 / file ≤1800 lines)
    └── ...
```

### Module Mapping

Search your codebase to discover the module-to-folder mapping:

```bash
# Find all service / module source directories (resolve {services-root} from the project structure reference / docs/project-config.json)
ls -d {services-root}/*/

# Find all existing feature doc modules
ls -d docs/specs/*/
```

Map each module code to its folder name and service path. Example pattern:

| Module Code | Folder Name | Service Path                 |
| ----------- | ----------- | ---------------------------- |
| {Module1}   | `{Module1}` | `{services-root}/{Module1}/` |
| {Module2}   | `{Module2}` | `{services-root}/{Module2}/` |

---

## MANDATORY 8-SECTION TECH-FREE STRUCTURE

All feature documentation MUST follow this section order. The doc is **tech-free** — zero technical terms in prose (no API routes, command/handler names, message-bus/event-contract schemas, code, or file paths). Code is the technical source of truth; the doc owns the business truth. Technical sections (Commands, Events-as-contracts, API Reference, Cross-Service, Performance, Troubleshooting) are NOT spec-doc content and are removed.

| #   | Section                            | Audience    |
| --- | ---------------------------------- | ----------- |
| 1   | Overview                           | All         |
| 2   | Glossary                           | All         |
| 3   | User Stories & Acceptance Criteria | PO, BA, QA  |
| 4   | Business Rules                     | BA, Dev, QA |
| 5   | Domain Model                       | BA, Dev     |
| 6   | Process Flows                      | BA, QA      |
| 7   | Permissions & Roles                | BA, Dev     |
| 8   | Test Specifications                | QA, Dev     |

Plus YAML frontmatter (header/metadata). Domain events appear in Section 5 / Section 6 only as business-meaningful occurrences, never as bus/message schemas.

### Stakeholder Quick Navigation

| Audience             | Sections                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Product Owner**    | Overview, User Stories & Acceptance Criteria                                                                |
| **Business Analyst** | User Stories & Acceptance Criteria, Business Rules, Process Flows, Domain Model                             |
| **QA/QC**            | Test Specifications, Acceptance Criteria, Business Rules                                                    |
| **Developer / AI**   | Domain Model, Test Specifications (+ the hidden `[Source:]` carriers); the technical contract lives in code |

---

## Step 0 — Mode Detection (MANDATORY FIRST)

**Before any extraction, detect mode:**

1. Check `docs/specs/{Bucket}/` exists (or `--audit` flag)
2. If auto-detected module, check entire `docs/specs/` tree
3. Present detected mode via a direct user question before proceeding — NEVER auto-start

**Mode routing:**

| Condition                                         | Mode       | Next Step                                              |
| ------------------------------------------------- | ---------- | ------------------------------------------------------ |
| `docs/specs/{Bucket}/` NOT found                  | **INIT**   | → Mode: INIT                                           |
| `docs/specs/{Bucket}/` exists                     | **UPDATE** | → Phase 1.5 (existing update mode)                     |
| `[mode=amend]` arg (bugfix caller) AND doc exists | **AMEND**  | → Mode: AMEND (scoped: regression TC + AC adjust only) |
| `--audit` flag OR user requests audit             | **AUDIT**  | → Mode: AUDIT                                          |

> **Scale gate for INIT mode (workflow context only):** If `workflow-spec-driven-dev` is the caller AND module_count ≥ 4 → MUST spawn sub-agents (one per module) in ONE message. When `spec` is invoked STANDALONE for a single module, no scale gate applies — single-module init is always single-session.

> **Mode: AMEND (bugfix scope — NOT a re-author).** Triggered by `spec [mode=amend]` from the bugfix workflow (inserted after `debug-investigate`, before `plan`). The Feature Spec already exists; a bug fix changes a narrow slice of behavior. Do the MINIMUM — touch only the sections the bug touches:
>
> 1. **§4 Business Rules** — if the bug violated or mis-stated a rule, correct ONLY that rule's wording (preserve its `BR-{FC}-NNN` ID verbatim, keep its [HARD]/[SOFT] tag). If the spec documented the _buggy_ behavior (Spec Bug per the bugfix SPEC-BUG GATE), fix the rule to the intended behavior.
> 2. **§3 Acceptance Criteria** — adjust ONLY the AC the fix changes; add a new `AC-{FC}-NN` if the fix guarantees a new behavior. Preserve existing AC IDs.
> 3. **§8 Test Specifications** — add the regression `TC-{FC}-NNN` guarding the fix (GIVEN bug repro / WHEN fixed path / THEN correct outcome) + its `IntegrationTest: {File}::{Method}` once the regression test exists (Status `Untested` until it lands).
> 4. Do NOT re-extract the domain model, re-scout the whole module, or rewrite §1/§2/§5/§6/§7.
>
> Scale doc work to change size — full INIT/UPDATE extraction is FORBIDDEN in AMEND.

---

### Mode: INIT (New Feature Doc) — Full Extraction from Zero

When no docs exist, run spec-index-style extraction before folding into the 8-section tech-free Feature Spec.

> **Resolve the project's layout before extracting.** Read the project's structure reference and project config to discover
> the module source root, layer/folder conventions, file globs, and framework markers (endpoint attributes, handler types,
> event/consumer types). The **extraction strategy is stack-agnostic** — inventory files → enumerate use-cases/operations →
> trace cross-service flow → fold into the 8 tech-free sections. The `{...}` placeholders and concrete commands shown below
> are illustrative; substitute the values discovered for the current stack. The emitted Feature Spec stays tech-free regardless (M1).

#### Step 1-INIT.1: Holistic Scout

Map module's codebase before reading any file in detail:

1. Run `git ls-files {module-source-root}/` (resolve `{module-source-root}` from the project structure reference / `docs/project-config.json`) — full file inventory
2. Identify: entity files, command files, query files, controller files, event handler files, frontend components
3. Build **Module Extraction Map**:
    - Entity layer: list all entity/aggregate files
    - Validation layer: list all validator files
    - Command layer: list all command handler files
    - API layer: list all controller files
    - Event layer: list all event handler + bus consumer files
    - Frontend: list all component + service + store files

#### Step 1-INIT.1.5: Use Case Enumeration [BLOCKING — MUST complete before Step 2 / Phase A]

**Goal:** Count ALL operations before planning extraction tasks. This number is the minimum TC count for Section 8 (Test Specifications).

**Write-side entry points:**

```bash
# Command handlers (CQRS write side) — grep your stack's command-handler marker
#   (e.g. a CommandHandler/ICommandHandler type, a MediatR request handler, or a use-case class)
grep -r "{command-handler-marker}" {module-source-root}/ --include="{backend-source-glob}" -l
# Mutating HTTP endpoints — grep your web framework's create/update/delete route markers
#   (e.g. POST/PUT/PATCH/DELETE attributes or route decorators)
grep -r "{mutating-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Event consumers / background jobs — grep your stack's consumer + scheduled-job markers
grep -r "{event-consumer-and-job-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
```

**Read-side entry points:**

```bash
# Query handlers (CQRS read side) — grep your stack's query-handler marker
grep -r "{query-handler-marker}" {module-source-root}/ --include="{backend-source-glob}" -l
# Read HTTP endpoints — grep your web framework's GET route markers
grep -r "{read-endpoint-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
```

**Actor/Role Discovery (feeds Phase E + Section 7 Permissions & Roles):**

```bash
# Authorization markers (permission checks + role guards) — substitute your stack's auth markers
grep -r "{authorization-markers}" {module-source-root}/ --include="{backend-source-glob}" -l
# Role / permission enumerations
grep -r "{role-and-permission-enum-markers}" {module-source-root}/ --include="{backend-source-glob}" -n | head -20
# Frontend route guards (if applicable) — substitute your UI framework's route-guard markers
grep -r "{route-guard-markers}" {frontend-root}/ --include="{frontend-source-glob}" -l 2>/dev/null | grep -i {module} | head -5
```

**Use Case Inventory Output:**

| Layer    | Write Ops (N) | Read Ops (M) | Event-Driven (K) | Background (J) |  Total  | Actor Roles       |
| -------- | :-----------: | :----------: | :--------------: | :------------: | :-----: | ----------------- |
| {Module} |       N       |      M       |        K         |       J        | N+M+K+J | [roles from grep] |

**[GATE — BLOCKING before Phase A extraction]:**

- Grand Total (N+M+K+J) = minimum Section 8 (Test Specifications) TC count
- If Grand Total ≥ 20: MUST split extraction into operation groups (≤20 ops each). Create one task tracking per group before starting any extraction phase.
- Actor catalog must list ≥1 role or flag as "No roles found — verify auth attributes manually"

#### Step 1-INIT.2: Domain Model Extraction (Phase A)

For each entity in Entity layer:

1. Read entity file
2. Extract: name, purpose (1 sentence), attributes (name, required, constraint, business meaning), lifecycle states, invariants
3. Identify relationships: FK fields, navigation properties, collection fields → cardinality
4. Write entity description with `[Source: component/{service}/{Entity}]` abstract anchor (physical coords → provenance sidecar)
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
4. Write with `[Source: rule/{service}/{RuleName}]` abstract anchor per rule group

#### Step 1-INIT.4: API Contracts Extraction (Phase C)

For each application-layer entry point — read in this priority order:

1. **CQRS command handlers** (the command-handler folder) — one entry per handler class. Extract: handler name → business operation name (tech-agnostic), command fields, validation rules referenced, output type.
2. **CQRS query handlers** (the query-handler folder) — one entry per handler class. Extract: operation name, filter parameters, return shape, pagination.
3. **Event consumers** (the event-handler folder) — one entry per consumer. Extract: event consumed, side effects produced, output state changes.
4. **Background jobs** — one entry per job. Extract: schedule/trigger, operation performed, side effects.
5. **REST controllers** — supplementary only (HTTP adapter layer). Extract: HTTP method + path + auth required + DTO shape for operations NOT already covered by handlers above.

Write operation description in business language only — no language/framework type names or class names. Write with `[Source: operation/{service}/{Operation}]` abstract anchor per entry.

**MUST: Every operation in Use Case Inventory (Step 1-INIT.1.5) → exactly one Phase C entry.** After Phase C: count entries. If count < Grand Total from inventory → create fill tasks before Phase D.

#### Step 1-INIT.4.5: Graph Trace for Cross-Service Scope (before Domain Model events)

Before capturing domain events as occurrences, run graph analysis to discover ALL consumers and producers:

```bash
# Trace cross-service flow from the primary entity/model file
python .claude/scripts/code_graph trace {path-to-primary-entity-file} --direction both --json

# Find all files connected to the primary service entry point (e.g. the primary controller/endpoint file)
python .claude/scripts/code_graph connections {path-to-primary-controller-file} --json
```

**If `.code-graph/graph.db` is unavailable:** Fall back to grepping for the project's message/event markers (bus-message, consumer, integration-event types — see the project's message-bus reference):

```bash
grep -rn "{message-bus-and-event-markers}" {module-source-root}/ --include="{backend-source-glob}"
```

Use graph output to enumerate: outbound events (produces), inbound events (consumes), cross-service reactions. Feed all findings into **Section 5 (Domain Model)** as business-meaningful occurrences (e.g. "Order Placed" → owner notified, order becomes active) and into **Section 8 (Test Specifications)** as integration test cases — NEVER as bus/message/payload schemas (those live in code).

#### Step 1-INIT.5: Events & Jobs Extraction (Phase D)

For each event handler and bus consumer:

1. Extract: event name, trigger, payload fields, ordering guarantee
2. Background jobs: schedule, purpose, side effects, abort condition
3. Write with `[Source: event/{service}/{Event}]` abstract anchor (use `operation/{service}/{Job}` for background jobs)

> **Working notes only — NOT doc prose.** Payload fields / ordering guarantees / schedules captured here are extraction notes. They fold into **Section 5 (Domain Model)** as business-meaningful occurrences (what happens, who reacts, the business outcome) and **Section 8** integration Test Specs — NEVER into prose as bus/message/payload schemas (those are the code's responsibility). See Step 1-INIT.7.

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
      [Source: operation/{service}/{Operation}]
```

**Per-phase E completeness checklist (BLOCKING before proceeding to Step 1-INIT.7):**

- [ ] Journey count ≥ Phase C entry count (Grand Total from Use Case Inventory)
- [ ] Every actor in actor catalog appears in ≥1 journey
- [ ] Every UI route discovered has ≥1 screen story
- [ ] Every GET/query with filter params has a search/list/view story
- [ ] Every story uses "As a / I want / So that" format
- [ ] Every story has `[Source: operation/{service}/{Operation}]` abstract anchor

#### Step 1-INIT.7: Transform to 8-Section Tech-Free Format

After extraction is complete, fold the extracted content into the 8 business sections. Technical artifacts (commands/handlers, API routes, message/event contracts, UI component names) are the code's responsibility and are NOT written into the doc — they only _inform_ the business sections and test cases below:

| Extracted Phase    | Target Section(s)                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Phase A entities   | Section 5 (Domain Model) — relationships + business-meaning columns, plain types + `[Source: component/{service}/{Entity}]`           |
| Phase B rules      | Section 4 (Business Rules, BR-XX) + Section 3 (the acceptance criteria they constrain)                                                |
| Phase C operations | Section 3 (User Stories & AC — the business need behind each operation) + Section 8 (Test Specs) — **NOT** a Commands/API section     |
| Phase D events     | Section 5 (Domain Model — as business-meaningful occurrences) + Section 8 (integration Test Specs) — **NEVER** as bus/message schemas |
| Phase E journeys   | Section 6 (Process Flows) + Section 3 (User Stories & AC) + Section 8 (Test Specs)                                                    |
| Auth rules         | Section 7 (Permissions & Roles — business RBAC matrix, no auth-implementation detail)                                                 |

**[BLOCKING] Section 8 Readiness Gate** — Before writing Section 8 (Test Specifications), verify foundational sections are complete:

| Section                | Required for TC writing?             | Check                                 |
| ---------------------- | ------------------------------------ | ------------------------------------- |
| S3 User Stories & AC   | Yes — each TC proves an AC-XX        | ≥1 US-XX with AC-XX present           |
| S4 Business Rules      | Yes — TCs reference BR-XX            | ≥1 BR-XX with error condition present |
| S5 Domain Model        | Yes — TCs assert entity/field state  | ≥1 entity with business-meaning cols  |
| S7 Permissions & Roles | Yes — TCs must include access checks | Role-permission matrix present        |

If 2 or more of these sections are missing or empty → use a direct user question to ask user whether to proceed with placeholder TCs or halt and complete foundational sections first.

**[BLOCKING] Section 8 Quantity Gate (runs after Readiness Gate):**

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
grep -n "TC-{FEATURE}-" docs/specs/{Bucket}/README.*.md 2>/dev/null | sort | tail -10
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
> | Type                 | Path                           | Description                                                                                                                  |
> | -------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
> | Spec Index (derived) | `docs/specs/{Bucket}/INDEX.md` | DERIVED navigation catalog over the Feature Specs (regenerate via $spec-index) — §8 in this doc is the canonical TC registry |
> | Integration Tests    | `{configured-test-path}/`      | Test code; linked to TCs by the configured test-spec annotation (key `TestSpec`)                                             |
> | Parent Feature       | _(if sub-feature)_             |                                                                                                                              |
> | Child Features       | _(if this doc is a parent)_    |                                                                                                                              |
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

1. Read `docs/specs/{Bucket}/README.{Feature}.md` frontmatter → `last_updated`
2. Run `git log --since="{last_updated}" --name-only -- {module-source-root}/`
3. If changed files found → flag sections using Phase 1.5 impact mapping table
4. Output `docs/specs/{Bucket}/AUDIT-{date}.md`:

    ```markdown
    # Feature Doc Audit — {date}

    ## {FeatureName}

    | Section                    | Status     | Changed Source Files         | Action              |
    | -------------------------- | ---------- | ---------------------------- | ------------------- |
    | Section 5 (Domain Model)   | ⚠️ STALE   | EntityX (changed 2026-04-18) | Re-extract entities |
    | Section 4 (Business Rules) | ✅ Current | —                            | —                   |
    ```

---

## Phase 1: Module Detection & Context Gathering

### Step 1.0: Auto-Detect Modules from Git Changes (Default)

When no module specified, auto-detect from git changes:

1. `git diff --name-only HEAD` (staged + unstaged); if none → `git diff --name-only HEAD~1`
2. Extract unique module names using Module Mapping table
3. For each module: check if `docs/specs/{Bucket}/` exists
4. Docs exist → **Phase 1.5 (Update Mode)**; missing → skip (no scratch creation without user request)
5. Only `.claude/`, `docs/`, config files changed → report "No business feature docs impacted" and exit

**Path-to-Module Detection Rules:**

Search your codebase to build the path-to-module mapping. Common patterns:

| Changed File Path Pattern                               | Detected Module                   |
| ------------------------------------------------------- | --------------------------------- |
| `{services-root}/{Module}/**`                           | {Module}                          |
| `{frontend-apps-dir}/{app-name}/**`                     | {Module} (map app name to module) |
| `{configured-ui-source-root}/{domain-lib}/{feature}/**` | {Module} (map feature to module)  |

Build a project-specific mapping by examining:

```bash
ls -d {services-root}/*/
ls -d {frontend-apps-dir}/*/
```

### Step 1.1: Identify Target Module

Module source priority: (1) user-specified → (2) domain-implied (grep to verify) → (3) auto-detected from git diff (Step 1.0)

### Step 1.2: Read Existing Documentation

1. `docs/project-reference/feature-spec-reference.md`
2. `docs/specs/{Bucket}/INDEX.md` (if exists)
3. Existing `docs/specs/{Bucket}/README.*.md` Feature Specs (if any)

### Step 1.3: Codebase Analysis

Grep evidence from source:

- **Entities**: the module's entity/model folder
- **Commands**: the module's command-handler folder
- **Queries**: the module's query-handler folder
- **Controllers**: the module's controller / endpoint folder
- **Frontend**: `{frontend-apps-dir}/{app}/` or `{frontend-libs-dir}/{lib}/`

### Step 1.4: Feature Analysis

Build knowledge model in `.ai/workspace/analysis/[feature-name].md`. Discover: entities/enums, commands/queries/events/jobs, controllers/DTOs, frontend components, cross-service bus messages.

---

## Phase 1.5: Update Mode (when updating existing docs)

When UPDATING existing feature docs (not from scratch):

#### Step 1.5.0: Check Derived Spec Artifacts

1. Check the fixed Feature Spec root `docs/specs/{Bucket}/` for the impacted app bucket
2. Note overlapping Feature Specs and derived bucket indexes/ERDs from git diff + spec registry
3. Flag output: "Derived spec artifact refresh may be required for: {list}" — do NOT trigger spec-index directly (separation of concerns)

### Step 1.5.1: Diff Analysis

1. Identify source (git diff, branch, commit)
2. Categorize changes: entity, command, query, frontend, i18n
3. Map each change to impacted sections (table below)

### Step 1.5.2: Section Impact Mapping

| Change Type              | Impacted Sections                                                             |
| ------------------------ | ----------------------------------------------------------------------------- |
| New entity property      | 5 (Domain Model), 4 (Business Rules if it adds a constraint)                  |
| New capability/operation | 3 (User Stories & AC), 4 (Business Rules), 6 (Process Flows if a new journey) |
| New access/role rule     | 7 (Permissions & Roles)                                                       |
| New filter/query         | 3 (User Stories & AC — a view/search story)                                   |
| Any new functionality    | **8 (Test Specifications)** — MANDATORY                                       |
| Any change               | 1 (Overview) — only if scope shifts                                           |

### Step 1.5.3: Mandatory Test Coverage (Section 8 — Test Specifications)

**CRITICAL**: When documenting ANY new functionality, MUST update:

- **Section 8 (Test Specifications)**: Add test cases (TC-{FEATURE}-{NNN}) for new features.

> **[BLOCKING] TC Format:** Use canonical format in `.claude/skills/shared/tc-format.md`. NEVER use abbreviated flat GIVEN/WHEN/THEN — use full template with all required fields (Objective, Preconditions, GWT steps, Acceptance Criteria, Test Data, Edge Cases, Evidence, IntegrationTest, Status). Section 8 owned exclusively by `spec [mode=tests]` — the author modes populate it only during INIT. Existing TCs MUST NOT be overwritten during UPDATE mode.

> **[BLOCKING] TC ID Collision Prevention:** Before assigning new TC IDs, check highest existing ID:
>
> ```bash
> grep -n "TC-{FEATURE}-" docs/specs/{Bucket}/README.*.md | sort | tail -5
> ```
>
> Assign next sequential ID. See `.claude/skills/shared/tc-format.md` — Decade-Based Numbering section for range rules.

**Failure to update Section 8 = blocking quality issue.**

---

## Phase 2: Documentation Generation

Generate at `docs/specs/{Bucket}/README.{FeatureName}.md`.

### Key Format Examples

**Business Requirements (FR-XX)**:

```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                                |
| --------------- | -------------------------------------- |
| **Description** | {What this requirement enables}        |
| **Scope**       | {Who can use / affected entities}      |
| **Evidence**    | `[Source: {namespace}/{service}/{id}]` |
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
**Evidence**: `[Source: {namespace}/{service}/{id}]`
```

**Test Summary Table (MANDATORY)**:

```markdown
| Category    | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) |  Total  |
| ----------- | :-----------: | :-------: | :---------: | :------: | :-----: |
| {Category1} |      {N}      |    {N}    |     {N}     |   {N}    |   {N}   |
| **Total**   |    **{N}**    |  **{N}**  |   **{N}**   | **{N}**  | **{N}** |
```

**Test Case Format (TC-XX)**:

> **[BLOCKING] Canonical TC format authority:** `.claude/skills/shared/tc-format.md` — always use for full TC template. Below is the minimum required format for feature docs Section 8 (Test Specifications).

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

**Evidence:** `[Source: {namespace}/{service}/{id}]`
**IntegrationTest:** one or more covering tests for the configured test environment — `{TestFile}::{MethodName}` (comma-separated **on one line** when several cover this TC), a test-filter expression (e.g. `TestSpec=TC-{FEATURE}-{NNN}`), or `Untested`
**Status:** Tested | Untested | Planned
```

**Permission Matrix** (Section 7 — Permissions & Roles):

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

**ERD rules (same as spec-index standard):**

- Tech-agnostic types only: `string`, `number`, `boolean`, `date`, `list`, `map`
- No implementation class names or ORM types
- Mark aggregate roots: `%% [AGGREGATE: EntityName]`
- Cross-module stubs: `%% [CROSS-REF: module-name]`

`[Source: component/{service}/{Entity}]` abstract anchor required after the ERD block.

**Business Rules (Section 4) Format:**

Each rule group MUST include `[Source: rule/{service}/{RuleName}]`:

```markdown
### BR-{MOD}-01: {Rule Group Name}

| Field/Operation | Rule         | Error Condition | Error Message      |
| --------------- | ------------ | --------------- | ------------------ |
| {field}         | {constraint} | {when violated} | {message constant} |

[Source: rule/{service}/{RuleName}]
```

---

## Note: AI Companion Files Deprecated

No `.ai.md` companion files. Single `README.{Feature}.md` only output. Template: `docs/templates/detailed-feature-spec-template.md` (authoritative).

### Key Principles (v4.0)

- **No code details** in sections 1-7 — no file paths, no source-code types, no API/command/handler/message names
- **Evidence only in Section 8** — `[Source: namespace/service/id]` abstract-anchor references in the per-TC hidden carrier
- **Acceptance criteria MUST cross-reference BR-{FC}-NN** — each AC names the business rules it enforces
- **Size caps** — body (sections 1-7) ≤1200 lines, whole file ≤1800 (hard). **Split** the capability when body>1200 OR TCs>40 (or when two distinct module-level capabilities emerge):
    1. Create `README.{FeatureName}-Part1.md` and `README.{FeatureName}-Part2.md`
    2. Keep Business Rules (S4) + Domain Model (S5) in Part1; secondary stories/edge cases → Part2
    3. Preserve TC ID continuity — both parts share `TC-{FEATURE}-` prefix; NEVER renumber
    4. Add cross-references: each part includes "**See also:** README.{FeatureName}-Part{N}.md" in header
    5. Flag that derived spec artifacts must be refreshed so `$spec-index` can relink both parts
- **YAML frontmatter** required: module, service, feature_code, entities[], status, last_updated
- **Audit mode produces AUDIT-{date}.md** — NEVER modifies existing docs
- **Init mode uses spec-index extraction phases** — all entities, rules, APIs MUST be read from source before writing

---

## Phase 3: Derived Artifact Refresh Flag

After creating/updating Feature Specs, do **not** edit `docs/specs/{Bucket}/INDEX.md` directly. Flag that derived spec artifacts may need refresh:

1. Record the bucket(s) affected by the Feature Spec change.
2. State: "Derived spec artifact refresh may be required for: {bucket list}."
3. Leave regeneration to `$spec-index`, which owns `INDEX.md` and other derived navigation aids.

## Anti-Hallucination Protocols

### DOCUMENTATION_ACCURACY_CHECKPOINT

Before writing documentation, verify:

- Read actual code implementing this?
- Line number references accurate and current?
- Code snippet as evidence available?

### TEST CASE EVIDENCE VERIFICATION

**EVERY test case:**

1. Read Evidence file at claimed line number
2. Verify: code at line supports test assertion
3. Check Edge Cases: find error constants in the configured error-constants location, if the project defines one
4. Fix immediately if line numbers wrong

---

## Phase 3.5: Verification (4 Passes)

### First Pass — Test Case Evidence Audit (Section 8)

**EVERY test case:**

1. Read Evidence file at claimed line number
2. Verify: code at line supports test assertion?
3. Check Edge Cases: find error constants in the configured error-constants location, if the project defines one
4. Fix immediately if line numbers wrong

### Second Pass — Domain Model Verification

- Read EACH entity file referenced in Section 5
- Verify property names and business meanings accurate (no implementation types — use business meaning column)
- Check enum values exist in actual source
- Remove documented properties not found in source

### Third Pass — Cross-Reference Audit

- 8 tech-free sections present in correct order (no technical terms in prose)
- Test Summary counts match actual TC count in Section 8
- All internal links work
- No template placeholders remain (`{namespace}`, `{service}`, `{id}`)
- ErrorMessage constants match edge case messages
- YAML frontmatter present and complete

**CRITICAL: ANY pass finds hallucinated content → re-investigate and fix before completing.**

### Fourth Pass — AI-Implementability Check

Flag items requiring implementation assumptions:

- **S3 (User Stories & Acceptance Criteria):** Every US-XX has ≥1 AC-XX with explicit success AND failure outcome in Given/When/Then. Vague AC → INCOMPLETE.
- **S4 (Business Rules):** Every BR-XX needs: trigger condition, rule content, error message, `[Source: rule/{service}/{RuleName}]`. Missing field → flag.
- **S3↔S4 linkage:** Every acceptance criterion that enforces a constraint references the BR-XX it enforces. AC with an unstated rule → flag.
- **S7 (Permissions & Roles):** Permission matrix with explicit role × action × condition cells. Blank cells → flag.
- **Concrete examples:** ≥1 example (input + expected output) per core operation. Abstract-only → LOW.

If >3 INCOMPLETE items → HALT, present gap list via ask the user directly before completing.

_Reference: `docs/project-reference/spec-principles.md` Section 4 (AI-Implementability Checklist)._

### M5 — Rebuild-From-Scratch Test

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria. Before completing, answer this for the whole doc:

> **Could a team with zero knowledge of this codebase re-implement the identical business behavior on ANY stack — using §1-8 prose alone, with `[Source:]` evidence stripped out?**

If the answer is NO because the prose depends on framework/product/language wording, class or file references, or a single hidden interpretation → the doc FAILS M5 (and likely M1/M2/M4). Rework the offending sections into tech-agnostic, single-interpretation business behavior before marking complete.

---

## Quality Checklist

### Mandate Compliance (M1-M6)

See `.claude/skills/shared/sdd-artifact-contract.md` → "AI-SDD Mandates (M1-M6)" for BLOCKING criteria.

- [ ] **Mandate Quality Check:** §1-8 prose contains ZERO banned tech terms (`spec-principles.md` §3.2) and NO code identifiers (class/method names, file paths, namespaces) outside evidence carriers (M1/M2)
- [ ] Every FR / BR / operation carries a logical ID (FR-/BR-/OP-/TC-) AND a separate `[Source: namespace/service/id]` abstract-anchor evidence carrier (never physical code coordinates or repository-root paths) — `[Source:]` retained, not folded into prose (M3)
- [ ] Every requirement is testable with one interpretation and named success/failure outcomes (M4)
- [ ] Rebuild-From-Scratch Test answered YES — doc is re-implementable on any stack from §1-8 prose alone (M5)

### Structure

- [ ] Documentation placed in `docs/specs/{Bucket}/README.{FeatureName}.md`
- [ ] Feature Spec follows template format (8 tech-free sections, in order)
- [ ] **YAML frontmatter** present with module, service, feature_code, entities[]
- [ ] Derived spec artifact refresh flagged for `$spec-index` when Feature Specs were created, renamed, split, or deleted
- [ ] Stakeholder navigation table present
- [ ] **Size caps** — body (sections 1-7) ≤1200 lines, whole file ≤1800 (hard); split when body>1200 OR TCs>40 (follow split procedure in Key Principles)
- [ ] **No code details** in sections 1-7 (no file paths, no source-code types, no command/handler/API/message names)
- [ ] **Acceptance criteria reference BR-{FC}-NN** IDs they enforce

### Test Case Evidence (MANDATORY)

- [ ] **EVERY test case has Evidence field** with `[Source: namespace/service/id]` abstract-anchor format (never `file:line`)
- [ ] **No template placeholders** remain (`{namespace}`, `{service}`, `{id}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Edge case errors match** constants from the configured error-constants location, if one exists
- [ ] **Test Summary counts match** actual number of test cases in Section 8

### Anti-Hallucination

- [ ] All entity properties verified against source code
- [ ] All enum values verified against actual enum definitions
- [ ] No invented methods, properties, or models
- [ ] All code snippets copied from actual files

### Section 5 (Domain Model)

- [ ] Mermaid `erDiagram` present with all entities
- [ ] ERD uses only tech-agnostic types
- [ ] `[Source: component/{service}/{Entity}]` abstract anchor after each entity definition and after ERD block
- [ ] Aggregate roots marked with `%% [AGGREGATE: ...]`

### Section 4 (Business Rules)

- [ ] `[Source: rule/{service}/{RuleName}]` abstract anchor present after each rule group table
- [ ] Error messages verified against the configured error-constants location or equivalent constants file

### Init Mode Checklist

- [ ] Phase A extraction complete before Section 5 (Domain Model) written
- [ ] Phase B extraction complete before Section 4 (Business Rules) written
- [ ] Phase C extraction complete before Section 3 (User Stories & AC) + Section 8 (Test Specs) written
- [ ] Phase D extraction complete before Section 5 domain-event occurrences written
- [ ] Phase E extraction complete before Section 6 (Process Flows) + Section 8 (Test Specs) written

### Completeness Gates (Init Mode)

- [ ] [C-gate] Phase C entry count ≥ Grand Total from Use Case Inventory (Step 1-INIT.1.5)
- [ ] [E-gate] Phase E journey count ≥ Phase C entry count
- [ ] [Actor-gate] Every actor in actor catalog appears in ≥1 Phase E journey
- [ ] [TC-gate] Section 8 TC count ≥ Grand Total from Use Case Inventory
- [ ] [Source-gate] Every Phase C entry and every Phase E journey has `[Source: namespace/service/id]` abstract anchor

## Standalone Chain

> **When called outside a workflow**, follow this chain to keep all spec layers in sync.
> Skip steps already done in the same session.

```
spec [author mode] (you are here)
  │
  ├─ AFTER this skill:
  │
  ├─ [REQUIRED] → spec [mode=tests] (CREATE or UPDATE)
  │     Section 8 is incomplete without an explicit `spec [mode=tests]` run.
  │     CREATE: new feature doc just created → write TCs from spec.
  │     UPDATE: existing doc updated → update TCs to match changed behavior.
  │
  ├─ [REQUIRED] → $review-artifact --type=spec-tests
  │     Validates TC coverage, GIVEN/WHEN/THEN completeness, no duplicate TC codes.
  │
  ├─ [REQUIRED] → spec [mode=sync]
  │     Forward-syncs Section 8 TCs ↔ integration test code (§8 canonical; test code implements it).
  │
  ├─ [RECOMMENDED] → $integration-test [from-changes or from-prompt mode]
  │     Generates/updates integration test files from changed TCs.
  │
  └─ [RECOMMENDED] → $docs-update
        If code changes triggered this doc update, run $docs-update for full chain including
        spec-index (Phase 2.5) and spec [mode=tests] (Phase 3).
```

### Doc Network Principle

> **[REQUIRED]** Every feature doc managed by this skill must have a `## Related Documentation` section:
>
> **INIT mode:** INSERT the section (place immediately after frontmatter, before Section 1 content)
> **UPDATE mode:** VERIFY the section exists and links are current; add it if missing from an older doc
>
> Do not re-add if already present. Check before marking this skill complete.

Template to insert or verify in `docs/specs/{Bucket}/README.{FeatureName}.md`:

```markdown
## Related Documentation

| Type                 | Link                                                          | Description                                                                                                           |
| -------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Spec Index (derived) | [docs/specs/{Bucket}/INDEX.md](../../specs/{Bucket}/INDEX.md) | DERIVED navigation catalog over the Feature Specs (regenerate via $spec-index) — §8 here is the canonical TC registry |
| Integration Tests    | `{configured-test-path}/`                                     | Test code linked to TCs via the configured test-spec annotation (key `TestSpec`)                                      |
| Related Modules      | _(list any cross-module dependencies here)_                   |                                                                                                                       |
```

Fill in `{Bucket}`, `{FeatureName}`, `{Module}`, and `{ServiceName}` from context.

This section enables:

- Humans navigating from Feature Spec → bucket index → test evidence
- `$docs-update` detecting when a Feature Spec or bucket index is stale
- Future AI sessions knowing what exists without a full scan
