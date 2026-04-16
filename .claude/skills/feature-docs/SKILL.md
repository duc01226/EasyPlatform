---
name: feature-docs
version: 3.0.0
description: '[Documentation] Create or update business feature documentation in docs/business-features/{Module}/. Generates 17-section docs (no code details, business logic only) with verified test case evidence. Triggers on: feature docs, business feature documentation, module documentation, document feature, update feature docs, quick feature docs, feature readme, single file docs, verified documentation.'
---

> **[IMPORTANT]** Use `TaskCreate` to break ALL work into small tasks BEFORE starting — including tasks for each file read. This prevents context loss from long files. For simple tasks, AI MUST ATTENTION ask user whether to skip.

## Quick Summary

**Goal:** Generate comprehensive 17-section business feature documentation with mandatory code evidence for all test cases.

**Workflow:**

1. **Detect & Gather** — Auto-detect modules from git changes OR user-specified module, read existing docs
2. **Investigate Code** — Grep/glob codebase to gather evidence (`file:line` format) for every test case
3. **Write Documentation** — Follow exact 17-section structure, place in `docs/business-features/{Module}/`
4. **Verification** — 3-pass system: evidence audit, domain model verification, cross-reference audit

**Key Rules:**

- EVERY test case MUST ATTENTION have verifiable code evidence (`FilePath:LineNumber`), no exceptions
- Output must have exactly 17 sections matching the master template
- Always update CHANGELOG.md and Version History (Section 17) when modifying docs
- When writing Section 15 test cases: include an `IntegrationTest` field pointing to the test file and method name. Format: `IntegrationTest: Orders/OrderCommandIntegrationTests.cs::{MethodName}`. If no integration test exists yet, set `Status: Untested`.
- Verify every TC-{FEATURE}-{NNN} in Section 15 has a corresponding `[Trait("TestSpec", "TC-{FEATURE}-{NNN}")]` in the integration test codebase. If missing, flag as `Status: Untested`.
- If third verification pass finds >5 issues, HALT and re-run verification

**Be skeptical. Apply critical thinking, sequential thinking. Every claim needs traced proof, confidence percentages (Idea should be more than 80%).**

- `docs/project-reference/domain-entities-reference.md` — Domain entity catalog, relationships, cross-service sync (read when task involves business entities/models) (content auto-injected by hook — check for [Injected: ...] header before reading)

## Project Pattern Discovery

Before implementation, search your codebase for project-specific patterns:

- Search for: `business-features`, `detailed-features`, `feature-docs-template`
- Look for: existing feature doc folders, 17-section templates

> **MANDATORY IMPORTANT MUST ATTENTION** Read the `feature-docs-reference.md` companion doc for project-specific patterns and code examples.
> If file not found, continue with search-based discovery above.

# Feature Documentation Generation & Verification

Generate comprehensive feature documentation following project conventions and folder structure.

**GOLD STANDARD References**:

Search your codebase for existing feature docs to use as reference:

```bash
find docs/business-features -name "README.*.md" -type f | head -5
```

**Template File**: `docs/templates/detailed-feature-docs-template.md`

---

## [CRITICAL] MANDATORY CODE EVIDENCE RULE

**EVERY test case MUST ATTENTION have verifiable code evidence.** This is non-negotiable.

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

All documentation MUST ATTENTION be placed in the correct folder structure:

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

All feature documentation MUST ATTENTION follow this section order:

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

## Phase 1: Module Detection & Context Gathering

### Step 1.0: Auto-Detect Modules from Git Changes (Default)

When no module or feature is explicitly specified, automatically detect affected modules from git changes:

1. Run `git diff --name-only HEAD` (captures both staged and unstaged changes)
2. If no uncommitted changes, run `git diff --name-only HEAD~1` (last commit)
3. Extract unique module names from changed file paths using the Module Mapping table
4. For each detected module, check if a business feature doc exists in `docs/business-features/{Module}/`
5. If docs exist → proceed to **Phase 1.5 (Update Mode)** for each module
6. If no docs exist → skip (do not create docs from scratch without explicit user request)
7. If no service-layer files changed (e.g., only `.claude/`, `docs/`, config files) → report "No business feature docs impacted" and exit

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

Determine which module the feature belongs to by:

1. User explicitly specifies module name
2. Feature name/domain implies module (search codebase to verify mapping)
3. Search codebase for feature-related entities/commands
4. **Auto-detected from git diff** (Step 1.0 above) — used when invoked as a workflow step without explicit module

### Step 1.2: Read Existing Documentation

Before creating new docs, read existing structure:

1. Read `docs/BUSINESS-FEATURES.md` (master index)
2. Read `docs/business-features/{Module}/INDEX.md` (if exists)
3. Read `docs/business-features/{Module}/README.md` (if exists)
4. Identify what already exists vs what needs creation/update

### Step 1.3: Codebase Analysis

Gather evidence from source code:

- **Entities**: `src/Services/{Module}/{Module}.Domain/Entities/`
- **Commands**: `src/Services/{Module}/{Module}.Application/UseCaseCommands/`
- **Queries**: `src/Services/{Module}/{Module}.Application/UseCaseQueries/`
- **Controllers**: `src/Services/{Module}/{Module}.Service/Controllers/`
- **Frontend**: `{frontend-apps-dir}/{app-name}/` or `{frontend-libs-dir}/{domain-lib}/`

### Step 1.4: Feature Analysis

Build knowledge model in `.ai/workspace/analysis/[feature-name].md`.

#### Discovery Areas

1. **Domain Entity Discovery**: Entities, value objects, enums
2. **Workflow Discovery**: Commands, Queries, Event Handlers, Background Jobs
3. **API Discovery**: Controllers, endpoints, DTOs
4. **Frontend Discovery**: Components, Services, Stores
5. **Cross-Service Discovery**: Message Bus messages, producers, consumers

---

## Phase 1.5: Update Mode (when updating existing docs)

When UPDATING an existing business feature document (not creating from scratch):

### Step 1.5.1: Diff Analysis

1. Identify the source of changes (git diff, branch comparison, commit history)
2. Categorize changes by type: backend entity, command, query, frontend component, i18n, etc.
3. Map each change to impacted documentation sections (use table below)

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

**CRITICAL**: When documenting ANY new functionality, you MUST ATTENTION update:

- **Section 15 (Test Specifications)**: Add test cases (TC-{FEATURE}-{NNN}) for new features with GIVEN/WHEN/THEN format. Test data, edge cases, and regression impact are included inline within each test case. Each TC entry should include:

    ```markdown
    #### TC-GM-001: Create SMART Goal Successfully

    **Priority**: P0-Critical
    **Status**: Tested | Untested
    **Business Rules**: BR-GM-001, BR-GM-003
    **IntegrationTest**: `Orders/OrderCommandIntegrationTests.cs::SaveOrder_WhenValidData_ShouldCreateSuccessfully`
    **Evidence**: `{Service}.Application/{Feature}/Commands/Save{Feature}Command.cs:42-68`

    **Edge Cases**:

    - {Invalid scenario} -> {Expected error/behavior}
    ```

**Failure to update Section 15 is a blocking quality issue.**

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

```markdown
#### TC-{FEATURE}-001: {Test Name} [P0]

**Acceptance Criteria**:

- {Passing criteria 1}
- {Passing criteria 2}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases**:

- {Invalid scenario} → {Expected error/behavior}

**Evidence**: `{FilePath}:{LineRange}`
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

---

## Note: AI Companion Files Deprecated

As of 2026-04-07, `.ai.md` companion files are no longer generated. Single `README.{Feature}.md` is the only output. The 17-section template at `docs/templates/detailed-feature-docs-template.md` is the authoritative source.

### Key Principles (v3.0)

- **No code details** in docs -- no file paths, no C# types, no API shapes in sections 1-14, 16
- **Evidence only in Section 15** (Test Specifications) -- `file:line` references
- **Commands cross-reference BR-XXX** -- each command lists which business rules it validates
- **Max 1200 lines** per doc (target 500-800)
- **YAML frontmatter** required: module, service, feature_code, entities[], status, last_updated

---

## Phase 3: Master Index Update

After creating/updating module docs, update `docs/BUSINESS-FEATURES.md`:

1. Read current content
2. Verify module is listed in the "Detailed Module Documentation" table
3. Add link if missing:
    ```markdown
    | **{Module}** | [Description] | [View Details](./business-features/{Module}/README.md) |
    ```

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

Before writing any documentation:

- "Have I read the actual code that implements this?"
- "Are my line number references accurate and current?"
- "Can I provide a code snippet as evidence?"

### TEST CASE EVIDENCE VERIFICATION

**For EVERY test case:**

1. Read the Evidence file at claimed line number
2. Verify: Does code at that line support test assertion?
3. Check Edge Cases: Find error constants in `ErrorMessage.cs`
4. Fix immediately if line numbers wrong

---

## Phase 3.5: Verification (3 Passes)

### First Pass - Test Case Evidence Audit (Section 15)

**For EVERY test case in documentation:**

1. **Read the Evidence file** at the claimed line number
2. **Verify match**: Does the code at that line support the test assertion?
3. **Check Edge Cases**: Find error message constants in `ErrorMessage.cs`
4. **Fix immediately** if line numbers are wrong

### Second Pass - Domain Model Verification

- Read EACH entity file referenced in Domain Model section (Section 5)
- Verify property names and business meanings are accurate (no C# types -- use business meaning column)
- Check enum values exist in actual source
- Remove any documented properties not found in source

### Third Pass - Cross-Reference Audit

- Document has exactly 17 sections in correct order
- Test Summary counts match actual test case count in Section 15
- All internal links work
- No template placeholders remain (`{FilePath}`, `{LineRange}`)
- ErrorMessage.cs constants match edge case messages
- YAML frontmatter is present and complete

**CRITICAL**: If ANY pass finds hallucinated content, re-investigate and fix before completing.

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
- [ ] **Max 1200 lines** total document length
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

## Related

- `documentation`
- `feature-implementation`

---

## Next Steps

**MANDATORY IMPORTANT MUST ATTENTION — NO EXCEPTIONS** after completing this skill, you MUST ATTENTION use `AskUserQuestion` to present these options. Do NOT skip because the task seems "simple" or "obvious" — the user decides:

- **"/tdd-spec (Recommended)"** — Generate/update test specs for documented features
- **"/test-specs-docs"** — Sync test specs to dashboard
- **"Skip, continue manually"** — user decides

---

## Closing Reminders

- **IMPORTANT MUST ATTENTION** break work into small todo tasks using `TaskCreate` BEFORE starting
- **IMPORTANT MUST ATTENTION** search codebase for 3+ similar patterns before creating new code
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim (confidence >80% to act)
- **IMPORTANT MUST ATTENTION** add a final review todo task to verify work quality
  **MANDATORY IMPORTANT MUST ATTENTION** READ the following files before starting:
  <!-- SYNC:evidence-based-reasoning:reminder -->
- **IMPORTANT MUST ATTENTION** cite `file:line` evidence for every claim. Confidence >80% to act, <60% = do NOT recommend.
      <!-- /SYNC:evidence-based-reasoning:reminder -->
