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

## Key Format Examples

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

## Anti-Hallucination Protocols

### EVIDENCE_CHAIN_VALIDATION
- Every feature claim MUST have code reference with file path and line numbers
- Read actual source files before documenting
- Never assume behavior without code evidence

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
