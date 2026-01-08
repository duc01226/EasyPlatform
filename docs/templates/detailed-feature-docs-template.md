# {FeatureName} Feature Documentation

**Module**: {Module}
**Feature**: {FeatureName}
**Version**: {Version}
**Last Updated**: {Date}

---

## Table of Contents

1. [Overview](#overview)
2. [Business Requirements](#business-requirements)
3. [Design Reference](#design-reference)
4. [Architecture](#architecture)
5. [Domain Model](#domain-model)
6. [Core Workflows](#core-workflows)
7. [API Reference](#api-reference)
8. [Frontend Components](#frontend-components)
9. [Backend Controllers](#backend-controllers)
10. [Cross-Service Integration](#cross-service-integration)
11. [Permission System](#permission-system)
12. [Test Specifications](#test-specifications)
13. [Troubleshooting](#troubleshooting)
14. [Related Documentation](#related-documentation)
15. [Version History](#version-history)

---

## Overview

> **Objective**: {Brief statement of feature purpose}
>
> **Core Values**: {Key principles - e.g., Configurable - Secure - Scalable}

### Key Capabilities

- {Capability 1 with code reference}
- {Capability 2 with code reference}

---

## Business Requirements

> **Objective**: {Business goal statement}
>
> **Core Values**: {Guiding principles}

### {Category Name}

#### FR-{MOD}-01: {Requirement Title}

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | {What this requirement enables}                      |
| **Scope**       | {Who can use / affected entities}                    |
| **Validation**  | {Business rules and constraints}                     |
| **Evidence**    | `{FilePath}:{LineRange}`                             |

#### FR-{MOD}-02: {Requirement Title}

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | {What this requirement enables}                      |
| **Dependencies**| {Prerequisites or related requirements}              |
| **Output**      | {Expected outcome}                                   |
| **Evidence**    | `{FilePath}:{LineRange}`                             |

### {Another Category}

#### FR-{MOD}-03: {Requirement Title}

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | {Requirement description}                            |
| **Access Control** | {Who can perform this action}                     |
| **Audit**       | {What is logged/tracked}                             |
| **Evidence**    | `{FilePath}:{LineRange}`                             |

---

## Design Reference

| Information       | Details                                              |
| ----------------- | ---------------------------------------------------- |
| **Figma Link**    | {Link to Figma designs if available}                 |
| **Screenshots**   | {Path to screenshots in docs/}                       |
| **UI Components** | {List of key UI component types used}                |

### Key UI Patterns

- {Pattern 1}: {Description}
- {Pattern 2}: {Description}

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         {Module}.Service                         │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Controller  │──▶│ Command Handler │──▶│   Repository    │   │
│  └─────────────┘   └─────────────────┘   └─────────────────┘   │
│         │                   │                     │             │
│         │                   ▼                     │             │
│         │          ┌─────────────────┐           │             │
│         │          │  Entity Event   │           │             │
│         │          │    Handler      │           │             │
│         │          └────────┬────────┘           │             │
└─────────────────────────────┼────────────────────┼─────────────┘
                              │                    │
                              ▼                    ▼
                    ┌─────────────────┐   ┌─────────────────┐
                    │   Message Bus   │   │     MongoDB     │
                    │   (RabbitMQ)    │   │   / SQL Server  │
                    └─────────────────┘   └─────────────────┘
```

### Service Responsibilities

| Service | Responsibility |
|---------|---------------|
| {Module}.Domain | Business entities, validation rules, domain expressions |
| {Module}.Application | CQRS commands/queries, business logic handlers |
| {Module}.Service | REST API controllers, request routing |

### Design Patterns

| Pattern | Usage | Evidence |
|---------|-------|----------|
| CQRS | Commands/Queries separation | `UseCaseCommands/`, `UseCaseQueries/` |
| Repository | Data access abstraction | `I{Module}RootRepository<T>` |
| Entity Events | Side effects handling | `UseCaseEvents/` |

---

## Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│     {MainEntity}        │       │    {RelatedEntity}      │
├─────────────────────────┤       ├─────────────────────────┤
│ Id: string              │──────▶│ Id: string              │
│ CompanyId: string       │       │ {MainEntity}Id: string  │
│ {Property}: {Type}      │       │ {Property}: {Type}      │
└─────────────────────────┘       └─────────────────────────┘
```

### {MainEntity}

**Location**: `src/Services/{Module}/{Module}.Domain/Entities/{Entity}.cs`

| Property | Type | Description |
|----------|------|-------------|
| Id | string | Unique identifier (ULID) |
| CompanyId | string | Company scope |
| {Property} | {Type} | {Description} |

### Enumerations

#### {EnumName}

| Value | Code | Description |
|-------|------|-------------|
| 0 | None | {Description} |
| 1 | {Value1} | {Description} |
| 2 | {Value2} | {Description} |

### Value Objects

#### {ValueObjectName}

| Property | Type | Description |
|----------|------|-------------|
| {Property} | {Type} | {Description} |

---

## Core Workflows

### Workflow 1: {Workflow Name}

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  User    │───▶│Controller│───▶│ Handler  │───▶│Repository│
│ Action   │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐
                               │  Event   │
                               │ Handler  │
                               └──────────┘
```

**Steps**:
1. **Trigger**: {What initiates the workflow}
2. **Validation**: {What validation occurs}
3. **Processing**: {What happens during processing}
4. **Side Effects**: {What entity events trigger}
5. **Result**: {What is returned/produced}

**Key Files**:
- `{Command}.cs` - Command handler
- `{EventHandler}.cs` - Side effects

---

## API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/{Controller}` | {Description} | {Policy} |
| POST | `/api/{Controller}` | {Description} | {Policy} |
| PUT | `/api/{Controller}/{id}` | {Description} | {Policy} |
| DELETE | `/api/{Controller}/{id}` | {Description} | {Policy} |

### Request/Response Examples

#### GET /api/{Controller}

**Request Query**:
```typescript
interface {Query}Request {
  companyId: string;
  // Additional filters
}
```

**Response**:
```typescript
interface {Query}Response {
  items: {Dto}[];
  totalCount: number;
}
```

#### POST /api/{Controller}

**Request Body**:
```typescript
interface {Command}Request {
  // Command properties
}
```

**Response**:
```typescript
interface {Command}Response {
  entity: {Dto};
}
```

---

## Frontend Components

### Component Hierarchy

```
{FeaturePage}Component (Container)
├── {FeatureList}Component
│   ├── {FeatureItem}Component
│   └── {FeatureFilter}Component
└── {FeatureForm}Component (SlideIn)
    └── Form controls
```

### Key Components

| Component | Type | Purpose | Path |
|-----------|------|---------|------|
| {Page}Component | Container | Main page | `apps/bravo-{module}/.../` |
| {List}Component | Presentational | List display | `apps/bravo-{module}/.../` |
| {Form}Component | Form | Create/Edit | `apps/bravo-{module}/.../` |

---

## Backend Controllers

### {Feature}Controller

**Location**: `src/Services/{Module}/{Module}.Service/Controllers/{Feature}Controller.cs`

| Action | Method | Route | Command/Query |
|--------|--------|-------|---------------|
| Get | GET | `/` | {GetQuery} |
| Save | POST | `/` | {SaveCommand} |
| Delete | DELETE | `/{id}` | {DeleteCommand} |

---

## Cross-Service Integration

### Message Bus Events

| Event | Producer | Consumer | Purpose |
|-------|----------|----------|---------|
| {Entity}EntityEventBusMessage | {Module}.Service | {OtherModule}.Service | Sync {entity} data |

### Event Flow

```
{Module}.Service                     {OtherModule}.Service
     │                                      │
     │  1. Entity Created/Updated           │
     ▼                                      │
┌─────────────────┐                         │
│ EntityEvent     │                         │
│ BusProducer     │─────RabbitMQ───────────▶│
└─────────────────┘                         ▼
                                    ┌─────────────────┐
                                    │ EntityEvent     │
                                    │ Consumer        │
                                    └─────────────────┘
```

---

## Permission System

### Role Permissions

| Role | View | Create | Edit | Delete | Special |
|------|:----:|:------:|:----:|:------:|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access |
| HR Manager | ✅ | ✅ | ✅ | ❌ | Company scope |
| Employee | ✅ | ❌ | ❌ | ❌ | Own data only |

### Permission Checks

**Backend Authorization**:
```csharp
// Evidence: {Controller}.cs:{LineNumber}
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.HrManager)]
```

**Frontend Authorization**:
```typescript
// Evidence: {component}.ts:{LineNumber}
@if (hasRole(PlatformRoles.Admin)) { ... }
```

---

## Test Specifications

### Test Summary

| Category               | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
| ---------------------- | :-----------: | :-------: | :---------: | :------: | :---: |
| {Category1}            | {N}           | {N}       | {N}         | {N}      | {N}   |
| {Category2}            | {N}           | {N}       | {N}         | {N}      | {N}   |
| {Category3}            | {N}           | {N}       | {N}         | {N}      | {N}   |
| **Total**              | **{N}**       | **{N}**   | **{N}**     | **{N}**  | **{N}**|

---

### {Category1} Test Specs

#### TC-{MOD}-001: {Test Name} [P0]

**Acceptance Criteria**:
- ✅ {Passing criteria 1}
- ✅ {Passing criteria 2}
- ✅ {Passing criteria 3}

**Preconditions**:
- {Precondition 1}
- {Precondition 2}

**Test Data**:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Test Steps**:
| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | {Action} | {Expected} |
| 2 | {Action} | {Expected} |

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases**:
- ❌ {Invalid scenario 1} → {Expected error/behavior}
- ❌ {Invalid scenario 2} → {Expected error/behavior}

**Evidence**: `{FilePath}:{LineRange}`, `{FilePath2}:{LineRange}`

---

#### TC-{MOD}-002: {Test Name} [P0]

**Acceptance Criteria**:
- ✅ {Passing criteria}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases**:
- ❌ {Invalid scenario} → {Expected behavior}

**Evidence**: `{FilePath}:{LineRange}`

---

#### TC-{MOD}-003: {Test Name} [P1]

**Acceptance Criteria**:
- ✅ {Passing criteria}

**Test Scenario**:
1. {Step 1}
2. {Step 2}
3. {Step 3}

**Evidence**: `{FilePath}:{LineRange}`

---

### {Category2} Test Specs

#### TC-{MOD}-004: {Test Name} [P1]

**Acceptance Criteria**:
- ✅ {Passing criteria}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Evidence**: `{FilePath}:{LineRange}`

---

## Troubleshooting

### Common Issues

#### {Issue Title 1}

**Symptoms**: {Observable problem description}

**Causes**:
1. {Cause 1}
2. {Cause 2}
3. {Cause 3}

**Resolution**:
- {Step-by-step resolution 1}
- {Step-by-step resolution 2}
- {Verification step}

#### {Issue Title 2}

**Symptoms**: {Observable problem description}

**Causes**:
1. {Cause 1}
2. {Cause 2}

**Resolution**:
- {Resolution step 1}
- {Resolution step 2}

### Diagnostic Queries

```sql
-- Check {entity} records for company
SELECT * FROM [{Schema}].[{Table}]
WHERE CompanyId = '{companyId}'
ORDER BY CreatedDate DESC;

-- Find {specific issue}
SELECT * FROM [{Schema}].[{Table}]
WHERE {Condition};
```

### Log Locations

| Service | Log Path | Key Log Patterns |
|---------|----------|------------------|
| {Module}.Service | `logs/{module}-service-*.log` | `[{Feature}]`, `[ERROR]` |

---

## Related Documentation

- [{Related Feature 1}](README.{RelatedFeature1}.md)
- [{Module} API Reference](../API-REFERENCE.md)
- [Backend Patterns - Entity Events](../../../../docs/claude/backend-patterns.md#entity-event-handlers)
- [Backend Patterns - Cross-Service Communication](../../../../docs/claude/backend-patterns.md#cross-service-communication)
- [BravoSUITE Architecture](../../../../docs/claude/architecture.md)

---

## Version History

| Version | Date       | Changes                                        |
| ------- | ---------- | ---------------------------------------------- |
| {X.0.0} | {Date}     | {Major changes description}                    |
| {X.X.0} | {Date}     | {Minor changes description}                    |
| 1.0.0   | {Date}     | Initial documentation                          |

---

_Last Updated: {Date}_
