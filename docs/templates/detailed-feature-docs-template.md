# {FeatureName} Feature Documentation

**Module**: {Module}
**Feature**: {FeatureName}
**Version**: {Version}
**Last Updated**: {Date}
**Document Owner**: {TeamName}

---

## Quick Navigation by Role

| Role | Start Here | Key Sections |
|------|------------|--------------|
| **Product Owner** | [Executive Summary](#executive-summary) | [Business Value](#business-value), [Success Metrics](#success-metrics), [Roadmap](#roadmap-and-dependencies) |
| **Business Analyst** | [Business Requirements](#business-requirements) | [Business Rules](#business-rules), [Process Flows](#process-flows), [Acceptance Criteria](#acceptance-criteria) |
| **Developer** | [Architecture](#architecture) | [Domain Model](#domain-model), [API Reference](#api-reference), [Implementation Guide](#implementation-guide) |
| **Technical Architect** | [System Design](#system-design) | [Integration Patterns](#cross-service-integration), [Performance](#performance-considerations), [Security](#security-architecture) |
| **QA/QC** | [Test Specifications](#test-specifications) | [Test Data](#test-data-requirements), [Edge Cases](#edge-cases-catalog), [Regression](#regression-impact) |

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Business Value](#business-value)
3. [Business Requirements](#business-requirements)
4. [Business Rules](#business-rules)
5. [Process Flows](#process-flows)
6. [Design Reference](#design-reference)
7. [System Design](#system-design)
8. [Architecture](#architecture)
9. [Domain Model](#domain-model)
10. [API Reference](#api-reference)
11. [Frontend Components](#frontend-components)
12. [Backend Controllers](#backend-controllers)
13. [Cross-Service Integration](#cross-service-integration)
14. [Security Architecture](#security-architecture)
15. [Performance Considerations](#performance-considerations)
16. [Implementation Guide](#implementation-guide)
17. [Test Specifications](#test-specifications)
18. [Test Data Requirements](#test-data-requirements)
19. [Edge Cases Catalog](#edge-cases-catalog)
20. [Regression Impact](#regression-impact)
21. [Troubleshooting](#troubleshooting)
22. [Operational Runbook](#operational-runbook)
23. [Roadmap and Dependencies](#roadmap-and-dependencies)
24. [Related Documentation](#related-documentation)
25. [Glossary](#glossary)
26. [Version History](#version-history)

---

## Executive Summary

> **For: Product Owners, Stakeholders, Leadership**

### Feature Overview

{2-3 sentences describing what this feature does and why it matters}

### Business Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| {KPI 1} | {Value} | {Value} | {%} |
| {KPI 2} | {Value} | {Value} | {%} |

### Key Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| {Decision 1} | {Why} | {Options rejected} |

### Success Metrics

| Metric | Target | Measurement Method | Owner |
|--------|--------|-------------------|-------|
| {Metric 1} | {Target} | {How measured} | {Team} |
| {Metric 2} | {Target} | {How measured} | {Team} |

---

## Business Value

> **For: Product Owners, Business Stakeholders**

### Value Proposition

{What problem does this solve? What opportunity does it capture?}

### User Stories

#### US-{MOD}-01: {Story Title}

**As a** {role}
**I want to** {action}
**So that** {benefit}

**Acceptance Criteria**:
- [ ] {Criterion 1}
- [ ] {Criterion 2}

**Evidence**: `{FilePath}:{LineRange}`

### ROI Analysis

| Investment | Value | Timeline |
|------------|-------|----------|
| Development effort | {X} person-days | {Dates} |
| Expected benefit | {Quantified value} | {When realized} |
| Break-even | {When} | - |

---

## Business Requirements

> **For: Business Analysts, Product Owners**

### Requirement Categories

| Category | Count | Priority Distribution |
|----------|-------|----------------------|
| {Category 1} | {N} | P0: {n}, P1: {n}, P2: {n} |
| {Category 2} | {N} | P0: {n}, P1: {n}, P2: {n} |

### {Category Name}

#### FR-{MOD}-01: {Requirement Title} [P0]

| Aspect | Details |
|--------|---------|
| **Description** | {What this requirement enables} |
| **Actor** | {Who performs this action} |
| **Trigger** | {What initiates this} |
| **Preconditions** | {What must be true before} |
| **Postconditions** | {What is true after} |
| **Scope** | {Boundaries and limitations} |
| **Validation Rules** | {Business rules and constraints} |
| **Error Handling** | {What happens on failure} |
| **Evidence** | `{FilePath}:{LineRange}` |

#### FR-{MOD}-02: {Requirement Title} [P1]

| Aspect | Details |
|--------|---------|
| **Description** | {Requirement description} |
| **Dependencies** | FR-{MOD}-01 |
| **Data Requirements** | {What data is needed} |
| **Output** | {Expected outcome} |
| **Evidence** | `{FilePath}:{LineRange}` |

---

## Business Rules

> **For: Business Analysts, Developers, QA**

### Rule Catalog

| Rule ID | Rule Name | Category | Enforcement |
|---------|-----------|----------|-------------|
| BR-{MOD}-01 | {Name} | {Category} | Backend/Frontend/Both |
| BR-{MOD}-02 | {Name} | {Category} | Backend/Frontend/Both |

### BR-{MOD}-01: {Rule Name}

**Statement**: {Clear, unambiguous rule statement}

**Condition**:
```
IF {condition}
THEN {action}
ELSE {alternative action}
```

**Examples**:
- ✅ Valid: {Example of rule being satisfied}
- ❌ Invalid: {Example of rule violation} → "{Error message}"

**Evidence**: `{FilePath}:{LineRange}`

---

## Process Flows

> **For: Business Analysts, Developers, QA**

### Flow Diagram: {Process Name}

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Start   │───▶│  Step 1  │───▶│  Step 2  │───▶│   End    │
└──────────┘    └──────────┘    └────┬─────┘    └──────────┘
                                     │
                              ┌──────▼──────┐
                              │  Alt Path   │
                              └─────────────┘
```

### Process Steps

| Step | Actor | Action | System Response | Next Step |
|------|-------|--------|-----------------|-----------|
| 1 | {Actor} | {Action} | {Response} | 2 |
| 2 | System | {Action} | {Response} | 3 or Alt |

### Decision Points

| Decision | Condition | Yes Path | No Path |
|----------|-----------|----------|---------|
| D1 | {Condition} | Step X | Step Y |

---

## Design Reference

> **For: Developers, UI/UX Designers**

### Figma Designs

| Screen/Component | Figma Link | Node ID | Status |
|------------------|------------|---------|--------|
| {Main screen} | [Link]({URL}) | `{node-id}` | Implemented |
| {Modal/Dialog} | [Link]({URL}) | `{node-id}` | Implemented |
| {Component} | [Link]({URL}) | `{node-id}` | Implemented |

### Design Metadata

| Information | Details |
|-------------|---------|
| **Figma File** | [{File name}]({Figma file URL}) |
| **Screenshots** | `docs/assets/{feature}/` |
| **Design System** | {Components used from design system} |
| **Responsive Breakpoints** | Mobile: 320px, Tablet: 768px, Desktop: 1024px+ |

### Screen Inventory

| Screen | Purpose | Key Components | Accessibility | Figma Node |
|--------|---------|----------------|---------------|------------|
| {Screen 1} | {Purpose} | {Components} | WCAG 2.1 AA | `{node-id}` |

### UI States

| State | Trigger | Visual Treatment | Figma Node |
|-------|---------|------------------|------------|
| Loading | API call in progress | Skeleton loader | `{node-id}` |
| Empty | No data available | Empty state illustration | `{node-id}` |
| Error | API failure | Error banner with retry | `{node-id}` |
| Success | Operation complete | Toast notification | `{node-id}` |

---

## System Design

> **For: Technical Architects, Senior Developers**

### Architecture Decision Records (ADRs)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | {Decision title} | Accepted | {Date} |

#### ADR-001: {Decision Title}

**Context**: {What is the issue that we're seeing that is motivating this decision?}

**Decision**: {What is the change that we're proposing?}

**Consequences**: {What becomes easier or harder because of this change?}

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         {Module}.Service                         │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Controller  │──▶│ Command Handler │──▶│   Repository    │   │
│  └─────────────┘   └─────────────────┘   └─────────────────┘   │
│         │                   │                     │             │
│         ▼                   ▼                     ▼             │
│  ┌─────────────┐   ┌─────────────────┐   ┌─────────────────┐   │
│  │ Validation  │   │  Entity Event   │   │    Database     │   │
│  │  Pipeline   │   │    Handler      │   │   (MongoDB)     │   │
│  └─────────────┘   └────────┬────────┘   └─────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Message Bus   │
                    │   (RabbitMQ)    │
                    └─────────────────┘
```

### Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| API | .NET 9 / ASP.NET Core | Platform standard |
| Database | MongoDB / SQL Server | {Reason for choice} |
| Messaging | RabbitMQ | Cross-service communication |
| Frontend | Angular 19 | Platform standard |

---

## Architecture

> **For: Developers, Technical Architects**

### Service Responsibilities

| Service | Responsibility | Key Classes |
|---------|---------------|-------------|
| {Module}.Domain | Business entities, validation rules | `{Entity}.cs` |
| {Module}.Application | CQRS commands/queries, handlers | `UseCaseCommands/` |
| {Module}.Service | REST API controllers | `Controllers/` |

### Design Patterns Applied

| Pattern | Usage | Location | Evidence |
|---------|-------|----------|----------|
| CQRS | Command/Query separation | `UseCaseCommands/`, `UseCaseQueries/` | `{File}:{Line}` |
| Repository | Data access abstraction | `I{Module}RootRepository<T>` | `{File}:{Line}` |
| Entity Events | Side effects handling | `UseCaseEvents/` | `{File}:{Line}` |

### Data Flow

```
Request → Controller → Validation → Handler → Repository → Database
                                      │
                                      ▼
                              Entity Event → Message Bus → Consumers
```

---

## Domain Model

> **For: Developers, Business Analysts**

### Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│     {MainEntity}        │       │    {RelatedEntity}      │
├─────────────────────────┤       ├─────────────────────────┤
│ Id: string (PK)         │──────▶│ Id: string (PK)         │
│ CompanyId: string (FK)  │       │ {MainEntity}Id: string  │
│ {Property}: {Type}      │       │ {Property}: {Type}      │
│ CreatedDate: DateTime   │       │ CreatedDate: DateTime   │
└─────────────────────────┘       └─────────────────────────┘
```

### {MainEntity}

**Location**: `src/Services/{Module}/{Module}.Domain/Entities/{Entity}.cs`

| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| Id | string | Yes | Unique identifier (ULID) | Auto-generated |
| CompanyId | string | Yes | Company scope | Must exist |
| {Property} | {Type} | {Yes/No} | {Description} | {Rules} |

**Evidence**: `{Entity}.cs:{LineRange}`

### Enumerations

#### {EnumName}

**Location**: `src/Services/{Module}/{Module}.Domain/Enums/{EnumName}.cs`

| Value | Code | Description | Usage |
|-------|------|-------------|-------|
| 0 | None | Default state | Initial creation |
| 1 | {Value1} | {Description} | {When used} |

**Evidence**: `{EnumName}.cs:{LineRange}`

### Value Objects

#### {ValueObjectName}

| Property | Type | Validation | Description |
|----------|------|------------|-------------|
| {Property} | {Type} | {Rules} | {Description} |

---

## API Reference

> **For: Developers, Integration Partners**

### Endpoints Summary

| Method | Endpoint | Description | Auth | Rate Limit |
|--------|----------|-------------|------|------------|
| GET | `/api/{Controller}` | {Description} | Bearer | 100/min |
| POST | `/api/{Controller}` | {Description} | Bearer | 50/min |
| PUT | `/api/{Controller}/{id}` | {Description} | Bearer | 50/min |
| DELETE | `/api/{Controller}/{id}` | {Description} | Bearer | 20/min |

### GET /api/{Controller}

**Description**: {What this endpoint does}

**Authorization**: `[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.HrManager)]`

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| companyId | string | Yes | - | Filter by company |
| pageSize | int | No | 20 | Items per page (max 100) |
| skipCount | int | No | 0 | Items to skip |

**Request Example**:
```http
GET /api/{Controller}?companyId=xxx&pageSize=20
Authorization: Bearer {token}
```

**Response** (200 OK):
```typescript
interface {Query}Response {
  items: {Dto}[];
  totalCount: number;
}
```

**Error Responses**:

| Status | Code | Message | When |
|--------|------|---------|------|
| 400 | VALIDATION_FAILED | {Message} | Invalid input |
| 401 | UNAUTHORIZED | Token required | Missing/invalid token |
| 403 | FORBIDDEN | Access denied | Insufficient permissions |
| 404 | NOT_FOUND | {Resource} not found | Resource doesn't exist |

**Evidence**: `{Controller}.cs:{LineRange}`

### POST /api/{Controller}

**Description**: {What this endpoint does}

**Request Body**:
```typescript
interface {Command}Request {
  name: string;        // Required, max 200 chars
  description?: string; // Optional, max 2000 chars
}
```

**Response** (200 OK):
```typescript
interface {Command}Response {
  entity: {Dto};
}
```

**Evidence**: `{SaveCommand}.cs:{LineRange}`

---

## Frontend Components

> **For: Frontend Developers**

### Component Hierarchy

```
{FeaturePage}Component (Container)
├── {FeatureHeader}Component
├── {FeatureList}Component
│   ├── {FeatureItem}Component
│   └── {FeatureFilter}Component
└── {FeatureForm}Component (SlideIn)
    ├── {FormSection1}Component
    └── {FormSection2}Component
```

### Component Inventory

| Component | Type | Purpose | Store | Path |
|-----------|------|---------|-------|------|
| {Page}Component | Container | Main page | {Feature}Store | `apps/bravo-{module}/.../` |
| {List}Component | Presentational | List display | - | `apps/bravo-{module}/.../` |
| {Form}Component | Form | Create/Edit | - | `apps/bravo-{module}/.../` |

### State Management

**Store**: `{Feature}Store extends PlatformVmStore<{Feature}Vm>`

| State Property | Type | Description |
|----------------|------|-------------|
| items | {Entity}[] | List of entities |
| selectedItem | {Entity} | null | Currently selected |
| loading | boolean | Loading state |

| Effect | Trigger | API Call | Updates |
|--------|---------|----------|---------|
| loadItems | Component init | GET /api/{Controller} | items |
| saveItem | Form submit | POST /api/{Controller} | items |

**Evidence**: `{Feature}.store.ts:{LineRange}`

---

## Backend Controllers

> **For: Backend Developers**

### {Feature}Controller

**Location**: `src/Services/{Module}/{Module}.Service/Controllers/{Feature}Controller.cs`

| Action | Method | Route | Command/Query | Authorization |
|--------|--------|-------|---------------|---------------|
| Get | GET | `/` | {GetQuery} | Admin, HrManager |
| GetById | GET | `/{id}` | {GetByIdQuery} | Admin, HrManager |
| Save | POST | `/` | {SaveCommand} | Admin |
| Delete | DELETE | `/{id}` | {DeleteCommand} | Admin |

**Evidence**: `{Feature}Controller.cs:{LineRange}`

---

## Cross-Service Integration

> **For: Technical Architects, Backend Developers**

### Message Bus Events

| Event | Producer | Consumer(s) | Purpose | Retry Policy |
|-------|----------|-------------|---------|--------------|
| {Entity}EntityEventBusMessage | {Module}.Service | {Other}.Service | Sync {entity} | 3x exponential |

### Event Flow Diagram

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

### Event Payload

```csharp
public class {Entity}EntityEventBusMessage : PlatformBusMessage<{Entity}EntityEventBusMessagePayload>
{
    // Payload properties
}
```

**Evidence**: `{Entity}EntityEventBusMessageProducer.cs:{LineRange}`

### Integration Contracts

| Contract | Format | Schema Location | Version |
|----------|--------|-----------------|---------|
| {Entity}EventPayload | JSON | `docs/schemas/` | 1.0 |

---

## Security Architecture

> **For: Technical Architects, Security Team**

### Authentication

| Aspect | Implementation | Evidence |
|--------|---------------|----------|
| Auth Method | JWT Bearer Token | `Startup.cs:{Line}` |
| Token Issuer | Auth0 / IdentityServer | Config |
| Token Lifetime | 1 hour | Config |

### Authorization

#### Role Permissions Matrix

| Role | View | Create | Edit | Delete | Special |
|------|:----:|:------:|:----:|:------:|---------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access |
| HR Manager | ✅ | ✅ | ✅ | ❌ | Company scope |
| Manager | ✅ | ❌ | ✅ | ❌ | Team scope |
| Employee | ✅ | ❌ | ❌ | ❌ | Own data only |

**Evidence**: `{Controller}.cs:{LineRange}` - `[PlatformAuthorize(...)]`

### Data Protection

| Data Type | Classification | Protection | Evidence |
|-----------|---------------|------------|----------|
| PII | Confidential | Encrypted at rest | `{File}:{Line}` |
| Financial | Restricted | Row-level security | `{File}:{Line}` |

### Security Checklist

- [ ] Input validation on all endpoints
- [ ] SQL/NoSQL injection prevention
- [ ] XSS prevention in frontend
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

---

## Performance Considerations

> **For: Technical Architects, DevOps**

### Performance Requirements

| Metric | Target | Current | Evidence |
|--------|--------|---------|----------|
| API Response Time (p95) | < 200ms | {Value} | APM Dashboard |
| Page Load Time | < 2s | {Value} | Lighthouse |
| Database Query Time | < 50ms | {Value} | Query logs |

### Optimization Strategies

| Strategy | Implementation | Impact |
|----------|---------------|--------|
| Caching | Redis for list queries | -60% DB load |
| Pagination | Max 100 items/page | Consistent response |
| Indexing | Compound index on CompanyId + Status | -80% query time |

### Scalability Considerations

| Aspect | Current Capacity | Scale Strategy |
|--------|-----------------|----------------|
| Concurrent Users | 1000 | Horizontal pod scaling |
| Data Volume | 10M records | Sharding by CompanyId |
| Message Throughput | 1000 msg/sec | RabbitMQ clustering |

---

## Implementation Guide

> **For: Developers**

### Prerequisites

- [ ] Feature flag `{FEATURE_FLAG_NAME}` enabled
- [ ] Database migration `{MigrationName}` applied
- [ ] Message bus queue `{QueueName}` created
- [ ] Environment variables configured

### Step-by-Step Implementation

1. **Create Entity** (`{Module}.Domain/Entities/`)
   - Extend `RootEntity<T, TKey>`
   - Add validation expressions
   - **Evidence**: Pattern in `{ExistingEntity}.cs`

2. **Create Command** (`{Module}.Application/UseCaseCommands/{Feature}/`)
   - Command + Result + Handler in single file
   - Use `PlatformValidationResult` for validation
   - **Evidence**: Pattern in `{ExistingCommand}.cs`

3. **Create Controller** (`{Module}.Service/Controllers/`)
   - Extend `PlatformBaseController`
   - Add authorization attributes
   - **Evidence**: Pattern in `{ExistingController}.cs`

### Code Templates

```csharp
// Command Template - Location: UseCaseCommands/{Feature}/Save{Entity}Command.cs
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}
```

---

## Test Specifications

> **For: QA Engineers, Developers**

### Test Summary

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
|----------|:-------------:|:---------:|:-----------:|:--------:|:-----:|
| {Category1} | {N} | {N} | {N} | {N} | {N} |
| {Category2} | {N} | {N} | {N} | {N} | {N} |
| Integration | {N} | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** |

### Test Coverage Requirements

| Component | Unit Test | Integration Test | E2E Test |
|-----------|:---------:|:----------------:|:--------:|
| {Entity} | ✅ Required | ✅ Required | ❌ Optional |
| {Command} | ✅ Required | ✅ Required | ✅ Required |
| {Controller} | ❌ Optional | ✅ Required | ✅ Required |

---

### {Category1} Test Specs

#### TC-{MOD}-001: {Test Name} [P0]

**Objective**: {What this test validates}

**Preconditions**:
- {Precondition 1}
- {Precondition 2}

**Acceptance Criteria**:
- ✅ {Passing criteria 1}
- ✅ {Passing criteria 2}
- ✅ {Passing criteria 3}

**Test Data**:
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

**Test Steps**:

| Step | Action | Expected Result | Actual Result |
|------|--------|-----------------|---------------|
| 1 | {Action} | {Expected} | {Placeholder} |
| 2 | {Action} | {Expected} | {Placeholder} |

**BDD Format**:

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Edge Cases**:
- ❌ {Invalid scenario 1} → "{Exact error message from ErrorMessage.cs}"
- ❌ {Invalid scenario 2} → "{Exact error message from ErrorMessage.cs}"

**Evidence**: `{FilePath}:{LineRange}`

---

## Test Data Requirements

> **For: QA Engineers**

### Test Data Sets

| Data Set | Purpose | Records | Refresh Frequency |
|----------|---------|---------|-------------------|
| {DataSet1} | Happy path testing | 100 | Weekly |
| {DataSet2} | Edge case testing | 50 | On demand |

### Sample Test Data

```json
{
  "validEntity": {
    "id": "01HXYZ...",
    "name": "Test Entity",
    "companyId": "test-company-id"
  },
  "invalidEntity": {
    "id": "",
    "name": "",
    "companyId": "non-existent"
  }
}
```

### Data Dependencies

| Test | Depends On | Setup Method |
|------|------------|--------------|
| TC-{MOD}-001 | Company exists | Seed script |
| TC-{MOD}-002 | User has role | Test fixture |

---

## Edge Cases Catalog

> **For: QA Engineers, Developers**

### Input Validation Edge Cases

| ID | Scenario | Input | Expected | Error Code |
|----|----------|-------|----------|------------|
| EC-01 | Empty name | `""` | Validation error | NAME_REQUIRED |
| EC-02 | Name too long | 201 chars | Validation error | NAME_TOO_LONG |
| EC-03 | Invalid characters | `<script>` | Sanitized | - |

### Business Logic Edge Cases

| ID | Scenario | Condition | Expected Behavior |
|----|----------|-----------|-------------------|
| EC-10 | Concurrent edit | Two users edit same | Last write wins |
| EC-11 | Delete in use | Entity referenced | Prevent deletion |

### Integration Edge Cases

| ID | Scenario | Failure Point | Recovery |
|----|----------|--------------|----------|
| EC-20 | Message bus down | Publish fails | Retry with backoff |
| EC-21 | Consumer timeout | Processing slow | Dead letter queue |

---

## Regression Impact

> **For: QA Engineers**

### Affected Areas

| Area | Impact Level | Regression Tests Required |
|------|-------------|--------------------------|
| {Module}.{Feature} | High | Full suite |
| {Module}.{RelatedFeature} | Medium | Subset |
| {OtherModule}.{Consumer} | Low | Integration only |

### Regression Test Suite

| Suite | Tests | Est. Duration | Frequency |
|-------|-------|---------------|-----------|
| {Feature} Core | 25 | 15 min | Every commit |
| {Feature} Integration | 10 | 30 min | PR merge |
| Full Regression | 100 | 2 hours | Release |

---

## Troubleshooting

> **For: Support Team, DevOps, Developers**

### Common Issues

#### {Issue Title 1}

**Symptoms**: {Observable problem description}

**Root Cause**: {Technical explanation}

**Diagnosis Steps**:
1. Check logs: `{Log pattern to search}`
2. Verify data: `{Query or check}`
3. Confirm config: `{Setting to verify}`

**Resolution**:
- {Step-by-step resolution 1}
- {Step-by-step resolution 2}

**Prevention**: {How to prevent recurrence}

### Diagnostic Queries

```sql
-- Check {entity} records for company
SELECT * FROM [{Schema}].[{Table}]
WHERE CompanyId = '{companyId}'
ORDER BY CreatedDate DESC;

-- Find orphaned records
SELECT * FROM [{Schema}].[{Table}]
WHERE {ForeignKey} NOT IN (SELECT Id FROM [{RelatedTable}]);
```

### Log Patterns

| Pattern | Meaning | Action |
|---------|---------|--------|
| `[ERROR] {Feature}` | Feature error | Check stack trace |
| `[WARN] Validation failed` | Input rejected | Review request |

---

## Operational Runbook

> **For: DevOps, On-Call Engineers**

### Health Checks

| Check | Endpoint | Expected | Alert Threshold |
|-------|----------|----------|-----------------|
| API Health | `/health` | 200 OK | 3 consecutive failures |
| DB Connection | `/health/db` | 200 OK | 1 failure |

### Monitoring Dashboards

| Dashboard | Purpose | Link |
|-----------|---------|------|
| {Feature} Overview | Key metrics | {Grafana link} |
| Error Rates | Error tracking | {Sentry link} |

### Incident Response

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| P1 (Critical) | 15 min | On-call → Team Lead → Manager |
| P2 (High) | 1 hour | On-call → Team Lead |
| P3 (Medium) | 4 hours | On-call |

### Recovery Procedures

#### Procedure: {Recovery Name}

**When**: {Trigger condition}

**Steps**:
1. {Step 1}
2. {Step 2}
3. Verify: {Verification step}

---

## Roadmap and Dependencies

> **For: Product Owners, Project Managers**

### Feature Dependencies

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  {Feature}  │────▶│{Dependency1}│────▶│{Dependency2}│
└─────────────┘     └─────────────┘     └─────────────┘
      │
      ▼
┌─────────────┐
│ {Consumer}  │
└─────────────┘
```

### Upstream Dependencies

| Dependency | Type | Status | Impact if Delayed |
|------------|------|--------|-------------------|
| {Dep 1} | Feature | Complete | Blocks development |
| {Dep 2} | Infrastructure | In Progress | Blocks deployment |

### Downstream Consumers

| Consumer | Type | Integration Date | Contact |
|----------|------|------------------|---------|
| {Consumer 1} | Internal | {Date} | {Team} |
| {Consumer 2} | External | {Date} | {Partner} |

### Future Enhancements

| Enhancement | Priority | Target Version | Effort |
|-------------|----------|----------------|--------|
| {Enhancement 1} | High | v2.0 | M |
| {Enhancement 2} | Medium | v2.1 | L |

---

## Related Documentation

> **For: All Stakeholders**

### Internal Documentation

- [{Related Feature 1}](README.{RelatedFeature1}.md)
- [{Module} API Reference](../API-REFERENCE.md)
- [Backend Patterns](../../../../docs/claude/backend-patterns.md)
- [Frontend Patterns](../../../../docs/claude/frontend-patterns.md)

### External References

- [Platform Framework Docs](../../../../EasyPlatform.README.md)
- [Design System](../../../../docs/design-system/)

---

## Glossary

> **For: All Stakeholders**

| Term | Definition | Context |
|------|------------|---------|
| {Term 1} | {Definition} | {When used} |
| {Term 2} | {Definition} | {When used} |
| CQRS | Command Query Responsibility Segregation | Architecture pattern |
| ULID | Universally Unique Lexicographically Sortable Identifier | Entity IDs |

---

## Version History

> **For: All Stakeholders**

| Version | Date | Author | Changes | Review Status |
|---------|------|--------|---------|---------------|
| {X.0.0} | {Date} | {Author} | {Major changes} | Approved |
| {X.X.0} | {Date} | {Author} | {Minor changes} | Approved |
| 1.0.0 | {Date} | {Author} | Initial documentation | Approved |

---

## Appendix: Evidence Verification Checklist

> **For: Documentation Authors**

### Mandatory Evidence Rules

- [ ] **EVERY test case has Evidence field** with `file:line` format
- [ ] **No template placeholders** remain (`{FilePath}`, `{LineRange}`)
- [ ] **Line numbers verified** by reading actual source files
- [ ] **Edge case errors match** constants from `ErrorMessage.cs`
- [ ] **Test Summary counts match** actual number of test cases
- [ ] **All entity properties verified** against source code
- [ ] **All enum values verified** against actual definitions

### Anti-Hallucination Protocol

Before writing ANY section:

1. ✅ "Have I read the actual code that implements this?"
2. ✅ "Are my line number references accurate and current?"
3. ✅ "Can I provide a code snippet as evidence?"
4. ✅ "Did I verify error messages against ErrorMessage.cs?"

---

_Last Updated: {Date}_
_Generated following BravoSUITE Documentation Standards v2.0_
