# Business Features Documentation Guide

> How to create comprehensive feature documentation for BravoSUITE modules

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Documentation Workflow](#documentation-workflow)
- [Required Sections](#required-sections)
- [Investigation Protocol](#investigation-protocol)
- [Writing Guidelines](#writing-guidelines)
- [Quality Checklist](#quality-checklist)
- [Common Pitfalls](#common-pitfalls)
- [Template Reference](#template-reference)
- [Documentation Compliance Status](#documentation-compliance-status)

---

## Overview

This guide establishes standards for creating feature documentation in BravoSUITE. Following these guidelines ensures consistency, completeness, and maintainability across all module documentation.

### Documentation Locations

| Type            | Location                                             | Example                                                 |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| Module Overview | `docs/business-features/{Module}/README.md`          | `bravoTALENTS/README.md`                                |
| Feature Details | `docs/business-features/{Module}/detailed-features/` | `detailed-features/README.EmployeeManagementFeature.md` |
| API Reference   | `docs/business-features/{Module}/API-REFERENCE.md`   | `bravoTALENTS/API-REFERENCE.md`                         |
| Troubleshooting | `docs/business-features/{Module}/TROUBLESHOOTING.md` | `bravoTALENTS/TROUBLESHOOTING.md`                       |
| Index           | `docs/business-features/{Module}/INDEX.md`           | Navigation hub                                          |

---

## Prerequisites

Before starting documentation:

1. **Identify the correct codebase location**
   - Check both `src/Web/` (legacy Angular) and `src/WebV2/` (Angular 19)
   - Verify backend service in `src/Services/{Module}/`

2. **Gather user-provided keywords**
   - Component selectors (e.g., `app-employee-list`)
   - Feature names
   - API endpoint patterns

3. **Find reference template**
   - Use existing detailed feature docs as templates
   - Recommended: `docs/business-features/bravoGROWTH/detailed-features/README.GoalManagementFeature.md`

---

## Documentation Workflow

### Phase 1: Discovery (30%)

```
1. Glob search all keywords → Find actual file locations
2. Read component files → Understand UI structure
3. Read HTTP service → Inventory all API methods
4. Read backend controllers → Map endpoints to handlers
5. Compare with existing docs → Identify gaps
```

### Phase 2: Writing (50%)

```
1. Domain Model → Entities, enums, relationships
2. Architecture → High-level diagram
3. Components → Hierarchy and details
4. Workflows → Step-by-step flows
5. API Reference → Complete endpoint list
6. Permission System → Roles and matrix
7. Test Specifications → Priority-ordered test cases
```

### Phase 3: Verification (20%)

```
1. Cross-check keywords → All documented?
2. Cross-check API methods → All covered?
3. Cross-check workflows → All major paths documented?
4. Verify ALL test case evidence → See below
5. Update version history → Track changes
```

---

## [CRITICAL] Mandatory Code Evidence Rule

**EVERY test case MUST have verifiable code evidence.** This is non-negotiable.

### Evidence Format

```markdown
**Evidence**: `{RelativeFilePath}:{LineNumber}` or `{RelativeFilePath}:{StartLine}-{EndLine}`
```

### Valid vs Invalid Evidence

| ✅ Valid | ❌ Invalid |
|----------|-----------|
| `ErrorMessage.cs:83` | `{FilePath}:{LineRange}` (template placeholder) |
| `Handler.cs:42-52` | `SomeFile.cs` (missing line numbers) |
| `interviews.service.ts:115-118` | "Based on CQRS pattern" (vague reference) |

### Evidence Verification Checklist

Before completing documentation:

- [ ] **Every test case has Evidence field** with `file:line` format
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Edge case errors match** constants from `ErrorMessage.cs`
- [ ] **No template placeholders** remain in final document

### Evidence Sources by Test Type

| Test Type | Primary Evidence Source |
|-----------|------------------------|
| Validation errors | `{Module}.Application/Common/Constants/ErrorMessage.cs` |
| Entity operations | `{Entity}.cs`, `{Command}Handler.cs` |
| Permission checks | `CanAccess()`, `[PlatformAuthorize]` |
| Frontend behavior | `*.service.ts`, `*.component.ts` |

---

## Required Sections

### Mandatory Sections

| Section                   | Purpose                                      | Priority |
| ------------------------- | -------------------------------------------- | -------- |
| **Overview**              | Feature summary, key locations, capabilities | P1       |
| **Architecture**          | High-level diagram, layer relationships      | P1       |
| **Domain Model**          | Entities, enums, relationships               | P1       |
| **Frontend Components**   | Hierarchy, key components with details       | P1       |
| **API Service**           | HTTP service methods table                   | P1       |
| **Backend Controllers**   | Endpoints with handlers                      | P1       |
| **Core Workflows**        | Step-by-step flow descriptions               | P1       |
| **Permission System**     | Roles, policies, permission matrix           | P2       |
| **API Reference**         | Complete endpoint documentation              | P2       |
| **Test Specifications**   | Priority-ordered test cases                  | P2       |
| **Related Documentation** | Links to related docs                        | P3       |
| **Version History**       | Change tracking                              | P3       |

### Section Templates

#### Overview Section

```markdown
## Overview

The **{Feature Name}** enables {user role} to {capability description}.
This feature is hosted in **{frontend app}** and calls **{backend service}**.

### Key Locations

| Layer           | Location                                   |
| --------------- | ------------------------------------------ |
| **Frontend**    | `src/{Web                                  | WebV2}/{app}/` |
| **Backend**     | `src/Services/{Module}/{Service}/`         |
| **Application** | `src/Services/{Module}/{App}.Application/` |

### Key Capabilities

- **{Capability 1}**: {Description}
- **{Capability 2}**: {Description}
```

#### Domain Model Section

```markdown
## Domain Model

### Core Entities

#### {Entity} Entity

| Field     | Type     | Description       |
| --------- | -------- | ----------------- |
| `Id`      | `string` | Unique identifier |
| `{Field}` | `{Type}` | {Description}     |

### Enums

#### {EnumName}
```

Value1 = 1   # Description
Value2 = 2   # Description

```

### Entity Relationships

```

+------------------+       +------------------+
|    Entity A      |<------|    Entity B      |
+------------------+  1:N  +------------------+

```
```

#### Permission Matrix Section

```markdown
## Permission System

### Permission Matrix

| Action    | Admin | Manager | User  |
| --------- | :---: | :-----: | :---: |
| View List |   ✅   |    ✅    |   ✅   |
| Create    |   ✅   |    ✅    |   ❌   |
| Update    |   ✅   | ✅ (own) |   ❌   |
| Delete    |   ✅   |    ❌    |   ❌   |
```

#### Test Specification Section

```markdown
## Test Specifications

### Priority 1: Core Functionality

#### TC-{MODULE}-001: {Test Name}

**Acceptance Criteria**:
- ✅ {Positive criterion}
- ✅ {Positive criterion}

**Test Data**:
```json
{
  "field": "value"
}
```

**Edge Cases**:

- ❌ {Negative case} → {Expected result}

**Evidence**: `{file.cs}:{line}`, `{component.ts}:{line}`

```

---

## Investigation Protocol

### Code Discovery Rules

1. **Search scope priority**:
   ```

   User keywords → Glob in src/ → Narrow to specific folder

   ```

2. **If keywords not found**:
   - Expand search to entire `src/` folder
   - Check both `src/Web/` and `src/WebV2/`
   - Keywords are reliable; search scope is likely wrong

3. **Read order**:
   ```

   Components → HTTP Service → Controllers → Handlers

   ```

### Feature Discovery Patterns

| Look For                 | Where                      | Reveals                 |
| ------------------------ | -------------------------- | ----------------------- |
| Column configurations    | Component `buildColumns()` | Hidden display features |
| List type arrays         | Component properties       | Multiple data views     |
| Form controls            | Component `FormGroup`      | Input validations       |
| API method signatures    | HTTP service               | Complete operation set  |
| Authorization attributes | Controllers                | Permission requirements |

### Cross-Reference Checklist

- [ ] All user keywords documented?
- [ ] All HTTP service methods covered?
- [ ] All controller endpoints mapped?
- [ ] All entity event handlers listed?
- [ ] All message bus consumers documented?

---

## Writing Guidelines

### Conciseness Rules

1. **Tables over paragraphs** for structured data
2. **Code blocks** for schemas and examples
3. **Diagrams** for flows and relationships
4. **Lists** for step-by-step processes

### Naming Conventions

| Element         | Format              | Example                    |
| --------------- | ------------------- | -------------------------- |
| Test Case ID    | `TC-{MODULE}-{NNN}` | `TC-EM-001`                |
| Section Anchors | kebab-case          | `#permission-system`       |
| File References | `file.ext:line`     | `EmployeeController.cs:87` |

### Code Reference Format

```markdown
**Evidence**: `src/Services/.../Handler.cs:45-120`
```

### Workflow Documentation Format

```markdown
### {Workflow Name}

**Entry Point**: {Component or trigger}

**Flow**:
```

1. {Step description}
2. {Step description}
   - {Sub-step}
   - {Sub-step}
3. Backend: {Handler} executes
4. {Result}

```

**Key Files**:
- Component: `path/to/component.ts:line`
- Service: `path/to/service.ts:line`
- Handler: `path/to/handler.cs:line`
```

---

## Quality Checklist

### Before Submission

- [ ] All 10+ keywords from user covered
- [ ] Domain Model section complete (entities + enums + relationships)
- [ ] Permission matrix includes all roles and actions
- [ ] Test specifications ordered by priority (P1-P8)
- [ ] API methods categorized and complete
- [ ] Version history updated
- [ ] Line count reasonable (1000+ for detailed features)

### Metrics to Track

| Metric      | Minimum | Good | Excellent |
| ----------- | ------- | ---- | --------- |
| Total Lines | 500     | 1000 | 1500+     |
| Test Cases  | 5       | 10   | 15+       |
| Entities    | 2       | 4    | 6+        |
| API Methods | 10      | 20   | 30+       |
| Workflows   | 3       | 5    | 8+        |

---

## Common Pitfalls

### Discovery Phase

| Pitfall                | Symptom             | Solution                                   |
| ---------------------- | ------------------- | ------------------------------------------ |
| Wrong folder search    | Keywords not found  | Search full `src/`, not just `src/WebV2/`  |
| Missing features       | Doc incomplete      | Read actual component code, not interfaces |
| Incomplete API docs    | Methods missing     | Read HTTP service file completely          |
| Wrong module placement | Doc in wrong folder | Match backend service ownership            |

### Writing Phase

| Pitfall              | Symptom               | Solution                           |
| -------------------- | --------------------- | ---------------------------------- |
| Missing domain model | No entity reference   | Add entities, enums, relationships |
| No permission matrix | Unclear authorization | Add role-based matrix table        |
| Unordered test specs | Random test listing   | Order by priority P1-P8            |
| Missing evidence     | Claims without proof  | Add `file:line` references         |

### Verification Phase

| Pitfall       | Symptom                | Solution                  |
| ------------- | ---------------------- | ------------------------- |
| Keyword gaps  | User keywords missing  | Cross-check each keyword  |
| API gaps      | Methods not documented | Compare with HTTP service |
| Workflow gaps | Major flows missing    | Trace from UI to database |

---

## Template Reference

### Recommended Template

Use `docs/business-features/bravoGROWTH/detailed-features/README.GoalManagementFeature.md` as reference for:

- Test Specification format (TC-XX-XXX)
- Domain Model structure
- Permission Matrix layout

### Section Order

```
1. Title + Description
2. Table of Contents
3. Overview
4. Architecture
5. Domain Model
6. Frontend Components
7. API Service
8. Backend Controllers
9. Core Workflows
10. Event Handlers & Consumers
11. Permission System
12. API Reference
13. Test Specifications
14. Related Documentation
15. Version History
```

---

## Documentation Compliance Status

> **Last Audit**: 2026-01-08

### Compliance Matrix

| Document | Module | Test Format | Evidence | Status | Action Required |
|----------|--------|-------------|----------|--------|-----------------|
| GoalManagementFeature.md | bravoGROWTH | TC-GM-* ✅ | Complete ✅ | **COMPLIANT** | None |
| KudosFeature.md | bravoGROWTH | TC-KD-* ✅ | Complete ✅ | **COMPLIANT** | None |
| EmployeeManagementFeature.md | bravoTALENTS | TC-EM-* ✅ | Complete ✅ | **COMPLIANT** | None (Converted 2026-01-08) |
| EmployeeSettingsFeature.md | bravoTALENTS | TC-ES-* ✅ | Complete ✅ | **COMPLIANT** | None |
| JobBoardIntegrationFeature.md | bravoTALENTS | TC-JBI-* ✅ | Complete ✅ | **COMPLIANT** | None (Converted 2026-01-08) |
| RecruitmentPipelineFeature.md | bravoTALENTS | TC-RP-* ✅ | Complete ✅ | **COMPLIANT** | None (Fixed 2026-01-08) |

### Legend

- **TC-XX-NNN**: Standard test case ID format (compliant)
- **TS-XX-NNN**: BDD scenario ID format (non-compliant - missing Evidence)
- **Evidence Complete**: All test cases have `file:line` references
- **Evidence Gaps**: Some test cases missing line numbers in Evidence

### Priority Actions

1. ~~**HIGH**: Convert EmployeeManagementFeature.md and JobBoardIntegrationFeature.md test specs to TC format with Evidence~~ ✅ COMPLETED 2026-01-08
2. **LOW**: Periodic re-audit to maintain compliance

---

## Quick Start Checklist

```markdown
[ ] 1. Glob search all user keywords
[ ] 2. Verify file locations (Web vs WebV2)
[ ] 3. Read template doc (GoalManagementFeature.md)
[ ] 4. Read all keyword components
[ ] 5. Read HTTP service for API methods
[ ] 6. Read current doc (if exists)
[ ] 7. Write Domain Model section
[ ] 8. Write Permission System section
[ ] 9. Write Test Specifications section
[ ] 10. Verify all keywords documented
[ ] 11. Update version history
```

---

## Version History

| Version | Date       | Changes                     |
| ------- | ---------- | --------------------------- |
| 1.2.0   | 2026-01-08 | Converted EmployeeManagementFeature.md and JobBoardIntegrationFeature.md from BDD to TC format; All 6 docs now COMPLIANT |
| 1.1.1   | 2026-01-08 | Fixed Evidence line numbers in RecruitmentPipelineFeature.md; Updated compliance matrix |
| 1.1.0   | 2026-01-08 | Added Documentation Compliance Status section with audit results for 7 detailed-features docs |
| 1.0.0   | 2026-01-03 | Initial documentation guide |

---

**Last Updated**: 2026-01-08
**Location**: `docs/business-features/`
**Maintained By**: BravoSUITE Documentation Team
