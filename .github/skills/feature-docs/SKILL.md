---
name: feature-docs
description: Use when generating comprehensive feature documentation with verified test cases and code evidence.
---

# Feature Documentation for EasyPlatform

Generate comprehensive feature documentation following the **GOLD STANDARD** template pattern.

**GOLD STANDARD Reference**: `docs/business-features/bravoTALENTS/detailed-features/README.EmployeeSettingsFeature.md`
**Template File**: `docs/templates/detailed-feature-docs-template.md`

---

## MANDATORY SECTION ORDER

All feature documentation MUST follow this section order:

1. **Overview** - Feature purpose and key capabilities
2. **Business Requirements** - FR-{MOD}-XX format with evidence tables
3. **Design Reference** - Figma links, screenshots, UI patterns
4. **Architecture** - ASCII diagrams, service responsibilities
5. **Domain Model** - Entities, enumerations, value objects
6. **Core Workflows** - Step-by-step flows with key files
7. **API Reference** - Endpoints, request/response examples
8. **Frontend Components** - Component hierarchy and paths
9. **Backend Controllers** - Controller actions mapping
10. **Cross-Service Integration** - Message bus events
11. **Permission System** - Role permission matrix
12. **Test Specifications** - TC-{MOD}-XXX with summary table
13. **Troubleshooting** - Symptoms/Causes/Resolution format
14. **Related Documentation** - Links to related features
15. **Version History** - Versioned changelog

---

## Key Format Examples

**Business Requirements (FR-XX)**:
```markdown
#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                                 |
| --------------- | --------------------------------------- |
| **Description** | {What this requirement enables}         |
| **Scope**       | {Who can use / affected entities}       |
| **Evidence**    | `{FilePath}:{LineRange}`                |
```

**Test Summary Table (MANDATORY)**:
```markdown
| Category               | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
| ---------------------- | :-----------: | :-------: | :---------: | :------: | :---: |
| {Category1}            | {N}           | {N}       | {N}         | {N}      | {N}   |
| **Total**              | **{N}**       | **{N}**   | **{N}**     | **{N}**  | **{N}**|
```

**Test Case Format (TC-XX)**:
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

---

## Verification Passes

1. **First Pass**: Verify all code references exist
2. **Second Pass**: Random sampling verification
3. **Cross-reference**: Verify internal links work

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
