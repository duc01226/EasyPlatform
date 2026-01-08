---
name: business-feature-docs
description: Create or update EasyPlatform business feature documentation in docs/business-features/{Module}/. Use when asked to document a feature, create module docs, update feature documentation, or add detailed feature specs. Triggers on "feature docs", "business feature documentation", "module documentation", "document feature", "update feature docs".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, TodoWrite
---

# EasyPlatform Business Feature Documentation

Generate comprehensive business feature documentation following the **GOLD STANDARD** template pattern.

**GOLD STANDARD Reference**: `docs/business-features/bravoTALENTS/detailed-features/README.EmployeeSettingsFeature.md`
**Template File**: `docs/templates/detailed-feature-docs-template.md`

---

## Output Structure

All documentation MUST be placed in the correct folder structure:

```
docs/
├── BUSINESS-FEATURES.md              # Master index (UPDATE if new module)
└── business-features/
    ├── {Module}/                     # Module folder
    │   ├── README.md                 # Complete module documentation
    │   ├── INDEX.md                  # Navigation hub
    │   ├── API-REFERENCE.md          # Endpoint documentation
    │   ├── TROUBLESHOOTING.md        # Issue resolution guide
    │   └── detailed-features/
    │       └── README.{FeatureName}.md  # Deep dive for complex features
    └── ...
```

---

## MANDATORY 15-SECTION STRUCTURE

All feature documentation in `detailed-features/` MUST follow this section order:

| # | Section | Purpose |
|---|---------|---------|
| 1 | Overview | Feature purpose, key capabilities |
| 2 | Business Requirements | FR-{MOD}-XX format with evidence tables |
| 3 | Design Reference | Figma links, screenshots, UI patterns |
| 4 | Architecture | ASCII diagrams, service responsibilities |
| 5 | Domain Model | Entities, enumerations, value objects |
| 6 | Core Workflows | Step-by-step flows with key files |
| 7 | API Reference | Endpoints, request/response examples |
| 8 | Frontend Components | Component hierarchy and paths |
| 9 | Backend Controllers | Controller actions mapping |
| 10 | Cross-Service Integration | Message bus events |
| 11 | Permission System | Role permission matrix |
| 12 | Test Specifications | TC-{MOD}-XXX with summary table |
| 13 | Troubleshooting | Symptoms/Causes/Resolution format |
| 14 | Related Documentation | Links to related features |
| 15 | Version History | Versioned changelog |

---

## Phase 1: Module Detection & Context Gathering

### Step 1.1: Identify Target Module

Determine which module the feature belongs to by:
1. User explicitly specifies module name
2. Feature name/domain implies module
3. Search codebase for feature-related entities/commands

### Step 1.2: Read Existing Documentation

Before creating new docs, read existing structure:
```
1. Read docs/BUSINESS-FEATURES.md (master index)
2. Read docs/business-features/{Module}/INDEX.md (if exists)
3. Read docs/business-features/{Module}/README.md (if exists)
4. Identify what already exists vs what needs creation/update
```

### Step 1.3: Codebase Analysis

Gather evidence from source code:
- **Entities**: `src/Services/{Module}/{Module}.Domain/Entities/`
- **Commands**: `src/Services/{Module}/{Module}.Application/UseCaseCommands/`
- **Queries**: `src/Services/{Module}/{Module}.Application/UseCaseQueries/`
- **Controllers**: `src/Services/{Module}/{Module}.Service/Controllers/`
- **Frontend**: `src/BravoWeb/apps/bravo-{module}/` or `src/BravoWeb/libs/apps-domains/`

---

## Phase 2: Key Format Examples

### Business Requirements (FR-XX)

```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | {What this requirement enables}                      |
| **Scope**       | {Who can use / affected entities}                    |
| **Validation**  | {Business rules and constraints}                     |
| **Evidence**    | `{FilePath}:{LineRange}`                             |
```

### Test Specifications (TC-XX)

**Test Summary Table (MANDATORY)**:
```markdown
| Category               | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
| ---------------------- | :-----------: | :-------: | :---------: | :------: | :---: |
| {Category1}            | {N}           | {N}       | {N}         | {N}      | {N}   |
| **Total**              | **{N}**       | **{N}**   | **{N}**     | **{N}**  | **{N}**|
```

**Test Case Format**:
```markdown
#### TC-{MOD}-001: {Test Name} [P0]

**Acceptance Criteria**:
- ✅ {Passing criteria 1}
- ✅ {Passing criteria 2}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases**:
- ❌ {Invalid scenario} → {Expected error/behavior}

**Evidence**: `{FilePath}:{LineRange}`
```

### Troubleshooting Format

```markdown
#### {Issue Title}

**Symptoms**: {Observable problem}

**Causes**:
1. {Cause 1}
2. {Cause 2}

**Resolution**:
- {Step 1}
- {Step 2}

### Diagnostic Queries

```sql
SELECT * FROM [{Schema}].[{Table}]
WHERE CompanyId = '{companyId}';
```
```

### Permission System Format

```markdown
| Role | View | Create | Edit | Delete | Special |
|------|:----:|:------:|:----:|:------:|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access |
| HR Manager | ✅ | ✅ | ✅ | ❌ | Company scope |
| Employee | ✅ | ❌ | ❌ | ❌ | Own data only |
```

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

### EVIDENCE_CHAIN_VALIDATION
- Every feature claim MUST have code reference with file path and line numbers
- Read actual source files before documenting
- Never assume behavior without code evidence

### ACCURACY_CHECKPOINT
Before writing any documentation:
- "Have I read the actual code?"
- "Are my line number references accurate?"
- "Can I provide a code snippet as evidence?"

---

## Quality Checklist

- [ ] All 15 mandatory sections present in correct order
- [ ] Business Requirements use FR-{MOD}-XX format
- [ ] Test Summary table with P0-P3 counts
- [ ] Test cases use TC-{MOD}-XXX format with GIVEN/WHEN/THEN
- [ ] Acceptance criteria use ✅/❌ markers
- [ ] Edge cases documented with expected errors
- [ ] Troubleshooting uses Symptoms/Causes/Resolution format
- [ ] Permission matrix present
- [ ] Version History table at end
- [ ] All code references verified with actual files
- [ ] ASCII diagrams for architecture
- [ ] Master index (BUSINESS-FEATURES.md) updated
