---
# Module Discovery Metadata (Required for /idea, /refine auto-context)
# AI agents parse this frontmatter to match user keywords to modules
# See: docs/business-features/TextSnippet/README.md for real example
module: {ModuleName}              # Primary module identifier (e.g., TextSnippet)
aliases: []                       # Alternative names: [shortname, abbreviation]
keywords:                         # Domain terms users might say when creating ideas
  - {keyword1}
  - {keyword2}
features:                         # Sub-feature keywords (e.g., "task" in TextSnippet)
  - {feature1}
entities:                         # Domain entity class names for inspection
  - {Entity1}
domain_path: src/{App}/{App}.{Module}.Domain  # Path for entity inspection
api_prefix: /api/{Controller}     # API route prefix
status: active                    # active | deprecated | draft
---

<!-- Template: v2.1 | 26 Sections | ~1000 lines -->
<!-- Stakeholders: PO, BA, Dev, Architect, QA, QC, DevOps -->
<!-- AI Companion: Always generate README.{FeatureName}.ai.md alongside this doc -->
<!-- AI Template: docs/templates/detailed-feature-docs-template.ai.md -->

# {FeatureName} Feature Documentation

**Module**: {Module}
**Feature**: {FeatureName}
**Version**: {Version}
**Last Updated**: {Date}

---

## Quick Navigation by Role

| Role | Priority Sections | Key Concerns |
|------|------------------|--------------|
| **Product Owner** | Executive Summary, Business Value, Roadmap | ROI, scope, timeline, dependencies |
| **Business Analyst** | Business Requirements, Business Rules, Process Flows | Requirements traceability, acceptance criteria |
| **Developer** | Architecture, Domain Model, API Reference, Implementation Guide | Code patterns, integration points |
| **Tech Architect** | System Design, Architecture, Cross-Service Integration, Performance | System design, scalability, tech debt |
| **QA Engineer** | Test Specifications, Test Data Requirements, Edge Cases Catalog | Test coverage, automation feasibility |
| **QC Analyst** | All sections | Evidence verification, documentation accuracy |
| **DevOps** | Operational Runbook, Troubleshooting, Performance | Deployment, monitoring, incident response |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Business Value](#2-business-value)
3. [Business Requirements](#3-business-requirements)
4. [Business Rules](#4-business-rules)
5. [Process Flows](#5-process-flows)
6. [Design Reference](#6-design-reference)
7. [System Design](#7-system-design)
8. [Architecture](#8-architecture)
9. [Domain Model](#9-domain-model)
10. [API Reference](#10-api-reference)
11. [Frontend Components](#11-frontend-components)
12. [Backend Controllers](#12-backend-controllers)
13. [Cross-Service Integration](#13-cross-service-integration)
14. [Security Architecture](#14-security-architecture)
15. [Performance Considerations](#15-performance-considerations)
16. [Implementation Guide](#16-implementation-guide)
17. [Test Specifications](#17-test-specifications)
18. [Test Data Requirements](#18-test-data-requirements)
19. [Edge Cases Catalog](#19-edge-cases-catalog)
20. [Regression Impact](#20-regression-impact)
21. [Troubleshooting](#21-troubleshooting)
22. [Operational Runbook](#22-operational-runbook)
23. [Roadmap and Dependencies](#23-roadmap-and-dependencies)
24. [Related Documentation](#24-related-documentation)
25. [Glossary](#25-glossary)
26. [Version History](#26-version-history)

---

## 1. Executive Summary

> **One-line summary**: {Brief statement describing the feature in business terms}

### Feature Overview

| Aspect | Details |
|--------|---------|
| **Purpose** | {What problem this feature solves} |
| **Target Users** | {Who uses this feature} |
| **Status** | {Development/Released/Beta} |
| **Release** | {Version where available} |

### Key Capabilities

- {Capability 1} - Evidence: `{FilePath}:{LineRange}`
- {Capability 2} - Evidence: `{FilePath}:{LineRange}`
- {Capability 3} - Evidence: `{FilePath}:{LineRange}`

### Success Metrics

| Metric | Target | Current | Measurement Method |
|--------|--------|---------|-------------------|
| {KPI 1 - e.g., API response time} | {Target - e.g., <500ms} | {Current} | {How measured} |
| {KPI 2 - e.g., User adoption rate} | {Target - e.g., >80%} | {Current} | {How measured} |
| {KPI 3 - e.g., Error rate} | {Target - e.g., <1%} | {Current} | {How measured} |

---

## 2. Business Value

### Value Proposition

| Value Type | Description | Impact | Quantification |
|------------|-------------|--------|----------------|
| Revenue | {Revenue impact} | {H/M/L} | {$ or % if available} |
| Efficiency | {Time/cost savings} | {H/M/L} | {Hours/costs saved} |
| User Experience | {UX improvement} | {H/M/L} | {NPS/satisfaction improvement} |
| Compliance | {Regulatory/audit benefit} | {H/M/L} | {Risk reduction} |
| Competitive | {Market advantage} | {H/M/L} | {Differentiation} |

### ROI Analysis

| Investment | Return | Timeline |
|------------|--------|----------|
| Development: {effort estimate} | {Expected return} | {Payback period} |

### Stakeholder Benefits

| Stakeholder | Benefit | Evidence |
|-------------|---------|----------|
| {Stakeholder 1 - e.g., HR Manager} | {Specific benefit} | {User feedback/metrics} |
| {Stakeholder 2 - e.g., Employee} | {Specific benefit} | {User feedback/metrics} |

---

## 3. Business Requirements

> **Objective**: {Business goal statement}

### Functional Requirements

#### FR-{MOD}-01: {Requirement Title}

| Aspect | Details |
|--------|---------|
| **Description** | {What this requirement enables} |
| **Scope** | {Who can use / affected entities} |
| **Validation** | {Business rules and constraints} |
| **Priority** | {P0/P1/P2/P3} |
| **Evidence** | `{FilePath}:{LineRange}` |

#### FR-{MOD}-02: {Requirement Title}

| Aspect | Details |
|--------|---------|
| **Description** | {What this requirement enables} |
| **Dependencies** | {Prerequisites or related requirements} |
| **Output** | {Expected outcome} |
| **Priority** | {P0/P1/P2/P3} |
| **Evidence** | `{FilePath}:{LineRange}` |

### User Stories

#### US-{MOD}-01: {Story Title}

**As a** {role}
**I want** {goal/desire}
**So that** {benefit/value}

**Acceptance Criteria**:
- [ ] AC-01: {Criterion} - Evidence: `{FilePath}:{LineRange}`
- [ ] AC-02: {Criterion} - Evidence: `{FilePath}:{LineRange}`

**Related Requirements**: FR-{MOD}-01, FR-{MOD}-02
**Priority**: {P0/P1/P2/P3}

### Non-Functional Requirements

| NFR ID | Category | Requirement | Target | Evidence |
|--------|----------|-------------|--------|----------|
| NFR-01 | Performance | {Requirement} | {Target} | `{File}:{Line}` |
| NFR-02 | Security | {Requirement} | {Target} | `{File}:{Line}` |
| NFR-03 | Availability | {Requirement} | {Target} | `{File}:{Line}` |

---

## 4. Business Rules

### Validation Rules

| Rule ID | Rule | Condition | Action | Evidence |
|---------|------|-----------|--------|----------|
| BR-{MOD}-01 | {Rule name} | {When condition} | {Then action} | `{File}:{Line}` |
| BR-{MOD}-02 | {Rule name} | {When condition} | {Then action} | `{File}:{Line}` |

### State Transitions

```
┌──────────┐    {event}     ┌──────────┐    {event}    ┌──────────┐
│  Draft   │───────────────▶│  Active  │──────────────▶│ Archived │
└──────────┘                └──────────┘               └──────────┘
                                 │
                                 │ {event}
                                 ▼
                            ┌──────────┐
                            │ Suspended│
                            └──────────┘
```

| From State | Event | To State | Conditions | Evidence |
|------------|-------|----------|------------|----------|
| Draft | Activate | Active | {Conditions} | `{File}:{Line}` |
| Active | Archive | Archived | {Conditions} | `{File}:{Line}` |

### Calculation Rules

| Rule | Formula | Example | Evidence |
|------|---------|---------|----------|
| {Calculation name} | {Formula} | {Example calculation} | `{File}:{Line}` |

---

## 5. Process Flows

### Primary Workflow: {Workflow Name}

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   User   │───▶│Controller│───▶│ Handler  │───▶│Repository│
│  Action  │    │          │    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                      │
                                      ▼
                               ┌──────────┐    ┌──────────┐
                               │  Event   │───▶│ External │
                               │ Handler  │    │ Service  │
                               └──────────┘    └──────────┘
```

**Steps**:
1. **Trigger**: {What initiates the workflow}
2. **Validation**: {What validation occurs}
3. **Processing**: {What happens during processing}
4. **Side Effects**: {What entity events trigger}
5. **Result**: {What is returned/produced}

**Key Files**:
- `{Command}.cs:{LineRange}` - Command handler
- `{EventHandler}.cs:{LineRange}` - Side effects

### Alternative Flows

| Scenario | Trigger | Flow Variation | Outcome |
|----------|---------|----------------|---------|
| {Scenario 1} | {Trigger} | {How flow differs} | {Result} |
| {Scenario 2} | {Trigger} | {How flow differs} | {Result} |

### Error Flows

| Error Condition | Detection Point | Recovery Action | Evidence |
|-----------------|-----------------|-----------------|----------|
| {Error 1} | {Where detected} | {Recovery steps} | `{File}:{Line}` |
| {Error 2} | {Where detected} | {Recovery steps} | `{File}:{Line}` |

---

## 6. Design Reference

| Information | Details |
|-------------|---------|
| **Figma Link** | {Link to Figma designs} |
| **Screenshots** | {Path to screenshots in docs/} |
| **Design System** | {Reference to design system used} |

### UI Patterns

| Pattern | Usage | Component |
|---------|-------|-----------|
| {Pattern 1 - e.g., SlideIn Form} | {Where used} | {Component name} |
| {Pattern 2 - e.g., Data Grid} | {Where used} | {Component name} |

### Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|----------------|
| Mobile | <768px | {Changes} |
| Tablet | 768-1024px | {Changes} |
| Desktop | >1024px | {Changes} |

---

## 7. System Design

### Technical Decisions Log

| Decision | Date | Options Considered | Chosen | Rationale | Evidence |
|----------|------|-------------------|--------|-----------|----------|
| {Decision 1} | {Date} | {Option A, B} | {Chosen} | {Why} | `{File}:{Line}` |
| {Decision 2} | {Date} | {Option A, B} | {Chosen} | {Why} | `{File}:{Line}` |

### Technical Debt

| Item | Severity | Impact | Remediation Plan | Evidence |
|------|----------|--------|------------------|----------|
| {Debt item 1} | H/M/L | {Impact} | {Plan} | `{File}:{Line}` |
| {Debt item 2} | H/M/L | {Impact} | {Plan} | `{File}:{Line}` |

### Scalability Considerations

| Aspect | Current Capacity | Growth Plan | Evidence |
|--------|-----------------|-------------|----------|
| {Database queries} | {Current} | {Plan} | `{File}:{Line}` |
| {Message throughput} | {Current} | {Plan} | `{File}:{Line}` |

### Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Backend | .NET | 9.0 | API, Business Logic |
| Frontend | Angular | 19 | UI Components |
| Database | {MongoDB/SQL Server} | {Version} | Data Persistence |
| Cache | Redis | {Version} | Session/Cache |
| Message Bus | RabbitMQ | {Version} | Cross-service events |

---

## 8. Architecture

### Service Architecture

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

### Layer Responsibilities

| Layer | Responsibility | Key Classes |
|-------|---------------|-------------|
| {Module}.Domain | Entities, validation, expressions | `{Entity}.cs` |
| {Module}.Application | CQRS handlers, business logic | `{Command}Handler.cs` |
| {Module}.Service | REST API, request routing | `{Controller}.cs` |

### Design Patterns Used

| Pattern | Usage | Evidence |
|---------|-------|----------|
| CQRS | Commands/Queries separation | `UseCaseCommands/`, `UseCaseQueries/` |
| Repository | Data access abstraction | `I{Module}RootRepository<T>` |
| Entity Events | Side effects handling | `UseCaseEvents/` |
| Unit of Work | Transaction management | `IPlatformUnitOfWorkManager` |

---

## 9. Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────┐       ┌─────────────────────────┐
│     {MainEntity}        │       │    {RelatedEntity}      │
├─────────────────────────┤       ├─────────────────────────┤
│ Id: string              │◀──────│ {MainEntity}Id: string  │
│ CompanyId: string       │       │ Id: string              │
│ {Property}: {Type}      │       │ {Property}: {Type}      │
└─────────────────────────┘       └─────────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────────┐
│    {ChildEntity}        │
├─────────────────────────┤
│ Id: string              │
│ ParentId: string        │
└─────────────────────────┘
```

### Entities

#### {MainEntity}

**Location**: `src/Services/{Module}/{Module}.Domain/Entities/{Entity}.cs`

| Property | Type | Description | Constraints |
|----------|------|-------------|-------------|
| Id | string | Unique identifier (ULID) | Required |
| CompanyId | string | Company scope | Required |
| {Property} | {Type} | {Description} | {Constraints} |

### Enumerations

#### {EnumName}

**Location**: `src/Services/{Module}/{Module}.Domain/Enums/{EnumName}.cs`

| Value | Code | Description |
|-------|------|-------------|
| 0 | None | {Description} |
| 1 | {Value1} | {Description} |

### Value Objects

#### {ValueObjectName}

| Property | Type | Description |
|----------|------|-------------|
| {Property} | {Type} | {Description} |

---

## 10. API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth Policy | Rate Limit |
|--------|----------|-------------|-------------|------------|
| GET | `/api/{Controller}` | {Description} | {Policy} | {Limit} |
| POST | `/api/{Controller}` | {Description} | {Policy} | {Limit} |
| PUT | `/api/{Controller}/{id}` | {Description} | {Policy} | {Limit} |
| DELETE | `/api/{Controller}/{id}` | {Description} | {Policy} | {Limit} |

### Request/Response Schemas

#### GET /api/{Controller}

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| companyId | string | Yes | Company identifier |
| {param} | {type} | {Yes/No} | {Description} |

**Response** (200 OK):
```typescript
interface {Query}Response {
  items: {Dto}[];
  totalCount: number;
}
```

**Error Responses**:
| Code | Condition | Response |
|------|-----------|----------|
| 400 | Invalid parameters | `{ error: "message" }` |
| 401 | Unauthorized | `{ error: "Unauthorized" }` |
| 404 | Not found | `{ error: "Not found" }` |

#### POST /api/{Controller}

**Request Body**:
```typescript
interface {Command}Request {
  // Command properties
  name: string;
  {property}: {type};
}
```

**Response** (200 OK):
```typescript
interface {Command}Response {
  entity: {Dto};
}
```

---

## 11. Frontend Components

### Component Hierarchy

```
{FeaturePage}Component (Container)
├── {FeatureHeader}Component
├── {FeatureList}Component
│   ├── {FeatureItem}Component
│   └── {FeatureFilter}Component
└── {FeatureForm}Component (SlideIn)
    ├── Form Controls
    └── {FeatureFormActions}Component
```

### Component Catalog

| Component | Type | Purpose | Path |
|-----------|------|---------|------|
| {Page}Component | Container | Main page | `apps/{app}/src/...` |
| {List}Component | Presentational | Data list | `apps/{app}/src/...` |
| {Form}Component | Form | Create/Edit | `apps/{app}/src/...` |

### State Management

| Store | State Shape | Key Selectors |
|-------|-------------|---------------|
| {Feature}Store | `{ items: [], loading: boolean }` | `items$`, `isLoading$` |

### Component Dependencies

```
{FeaturePage}Component
├── {FeatureStore} (State)
├── {FeatureApiService} (API)
└── {SharedModule} (Common components)
```

---

## 12. Backend Controllers

### {Feature}Controller

**Location**: `src/Services/{Module}/{Module}.Service/Controllers/{Feature}Controller.cs`

| Action | HTTP Method | Route | Command/Query | Evidence |
|--------|-------------|-------|---------------|----------|
| GetAll | GET | `/` | Get{Entity}ListQuery | `{File}:{Line}` |
| GetById | GET | `/{id}` | Get{Entity}ByIdQuery | `{File}:{Line}` |
| Save | POST | `/` | Save{Entity}Command | `{File}:{Line}` |
| Delete | DELETE | `/{id}` | Delete{Entity}Command | `{File}:{Line}` |

### Command Handlers

| Handler | Command | Purpose | Evidence |
|---------|---------|---------|----------|
| Save{Entity}CommandHandler | Save{Entity}Command | Create/Update | `{File}:{Line}` |
| Delete{Entity}CommandHandler | Delete{Entity}Command | Soft/Hard delete | `{File}:{Line}` |

### Query Handlers

| Handler | Query | Purpose | Evidence |
|---------|-------|---------|----------|
| Get{Entity}ListQueryHandler | Get{Entity}ListQuery | Paginated list | `{File}:{Line}` |
| Get{Entity}ByIdQueryHandler | Get{Entity}ByIdQuery | Single entity | `{File}:{Line}` |

---

## 13. Cross-Service Integration

### Message Bus Events

| Event | Producer | Consumer(s) | Purpose | Evidence |
|-------|----------|-------------|---------|----------|
| {Entity}EntityEventBusMessage | {Module}.Service | {Other}.Service | Sync data | `{File}:{Line}` |

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

### Integration Dependencies

| Dependency | Type | Purpose | Failure Impact |
|------------|------|---------|----------------|
| {Service} | Sync API | {Purpose} | {Impact} |
| {Service} | Async Event | {Purpose} | {Impact} |

### Data Synchronization

| Source | Target | Sync Method | Frequency | Evidence |
|--------|--------|-------------|-----------|----------|
| {Module} | {OtherModule} | Event-driven | Real-time | `{File}:{Line}` |

---

## 14. Security Architecture

### Authentication

| Method | Usage | Configuration |
|--------|-------|---------------|
| JWT Bearer | API authentication | `{ConfigFile}` |
| OAuth 2.0 | External integrations | `{ConfigFile}` |

### Authorization Matrix

| Role | View | Create | Edit | Delete | Special Permissions |
|------|:----:|:------:|:----:|:------:|---------------------|
| Admin | ✅ | ✅ | ✅ | ✅ | Full access |
| Manager | ✅ | ✅ | ✅ | ❌ | Company scope |
| User | ✅ | ❌ | ❌ | ❌ | Own data only |

### Permission Checks

**Backend**:
```csharp
// Evidence: {Controller}.cs:{LineNumber}
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
```

**Frontend**:
```typescript
// Evidence: {component}.ts:{LineNumber}
@if (hasRole(PlatformRoles.Admin)) { ... }
```

### Data Protection

| Data Type | Protection | Evidence |
|-----------|------------|----------|
| PII | Encrypted at rest | `{File}:{Line}` |
| Credentials | Hashed (BCrypt) | `{File}:{Line}` |
| Audit logs | Tamper-proof | `{File}:{Line}` |

---

## 15. Performance Considerations

### Performance Targets

| Metric | Target | Current | Measurement |
|--------|--------|---------|-------------|
| API Response Time (p95) | <500ms | {Current} | APM |
| Database Query Time | <100ms | {Current} | Query logs |
| Page Load Time | <2s | {Current} | RUM |

### Optimization Strategies

| Strategy | Implementation | Evidence |
|----------|----------------|----------|
| Query optimization | Indexed queries | `{File}:{Line}` |
| Caching | Redis cache | `{File}:{Line}` |
| Pagination | Server-side paging | `{File}:{Line}` |

### Database Indexes

| Collection/Table | Index | Purpose | Evidence |
|------------------|-------|---------|----------|
| {Entity} | CompanyId, Status | List queries | `{File}:{Line}` |
| {Entity} | Code (unique) | Lookup | `{File}:{Line}` |

### Caching Strategy

| Cache Key Pattern | TTL | Invalidation | Evidence |
|-------------------|-----|--------------|----------|
| `{prefix}:{id}` | 5min | On update | `{File}:{Line}` |

---

## 16. Implementation Guide

### Prerequisites

- [ ] {Prerequisite 1 - e.g., Database migration applied}
- [ ] {Prerequisite 2 - e.g., Configuration values set}
- [ ] {Prerequisite 3 - e.g., Dependencies installed}

### Configuration

| Setting | Environment Variable | Default | Description |
|---------|---------------------|---------|-------------|
| {Setting1} | `{ENV_VAR}` | {Default} | {Description} |
| {Setting2} | `{ENV_VAR}` | {Default} | {Description} |

### Development Setup

```bash
# Step 1: {Description}
{command}

# Step 2: {Description}
{command}

# Step 3: {Description}
{command}
```

### Code Examples

**Creating a new entity**:
```csharp
// Evidence: {File}:{Line}
var command = new Save{Entity}Command { Name = "Example" };
var result = await _cqrs.SendAsync(command);
```

**Querying entities**:
```csharp
// Evidence: {File}:{Line}
var query = new Get{Entity}ListQuery { CompanyId = companyId };
var result = await _cqrs.SendAsync(query);
```

---

## 17. Test Specifications

### Test Summary

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total |
|----------|:-------------:|:---------:|:-----------:|:--------:|:-----:|
| Unit Tests | {N} | {N} | {N} | {N} | {N} |
| Integration Tests | {N} | {N} | {N} | {N} | {N} |
| E2E Tests | {N} | {N} | {N} | {N} | {N} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | **{N}** |

### Test Environment

| Environment | URL | Purpose | Data |
|-------------|-----|---------|------|
| Development | localhost:5000 | Unit tests | Mocked |
| Staging | staging.example.com | Integration | Anonymized |
| UAT | uat.example.com | E2E | Test scenarios |

### Test Cases

#### TC-{MOD}-001: {Test Name} [P0]

**Acceptance Criteria**:
- ✅ {Passing criteria 1}
- ✅ {Passing criteria 2}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Test Data**:
```json
{
  "field1": "value1"
}
```

**Evidence**: `{FilePath}:{LineRange}`

#### TC-{MOD}-002: {Test Name} [P1]

**Acceptance Criteria**:
- ✅ {Passing criteria}

**GIVEN** {initial context}
**WHEN** {action performed}
**THEN** {expected outcome}

**Evidence**: `{FilePath}:{LineRange}`

---

## 18. Test Data Requirements

### Test Data Sets

| Data Set | Purpose | Setup Command | Cleanup |
|----------|---------|---------------|---------|
| {Dataset 1} | {Purpose} | `{command}` | {Cleanup method} |
| {Dataset 2} | {Purpose} | `{command}` | {Cleanup method} |

### Test Data Fixtures

```json
// {FixtureName}.json
{
  "{entities}": [
    {
      "id": "{test-id-1}",
      "name": "Test Entity 1",
      "companyId": "{test-company-id}"
    }
  ]
}
```

### Data Dependencies

| Test | Required Data | Source |
|------|---------------|--------|
| TC-{MOD}-001 | {Data requirements} | {Fixture/Seed} |
| TC-{MOD}-002 | {Data requirements} | {Fixture/Seed} |

---

## 19. Edge Cases Catalog

### Input Validation Edge Cases

| ID | Scenario | Input | Expected Behavior | Evidence |
|----|----------|-------|-------------------|----------|
| EC-01 | Empty string | `""` | Validation error | `{File}:{Line}` |
| EC-02 | Max length | `{256 chars}` | Truncate/Error | `{File}:{Line}` |
| EC-03 | Special chars | `<script>` | Sanitized | `{File}:{Line}` |
| EC-04 | Unicode | `日本語` | Accepted | `{File}:{Line}` |

### Business Logic Edge Cases

| ID | Scenario | Condition | Expected Behavior | Evidence |
|----|----------|-----------|-------------------|----------|
| EC-10 | {Scenario} | {Condition} | {Behavior} | `{File}:{Line}` |
| EC-11 | {Scenario} | {Condition} | {Behavior} | `{File}:{Line}` |

### Concurrency Edge Cases

| ID | Scenario | Condition | Expected Behavior | Evidence |
|----|----------|-----------|-------------------|----------|
| EC-20 | Simultaneous updates | Two users edit same record | Last-write-wins / Conflict | `{File}:{Line}` |
| EC-21 | Race condition | {Condition} | {Behavior} | `{File}:{Line}` |

---

## 20. Regression Impact

### Affected Areas

| Area | Impact | Risk Level | Mitigation |
|------|--------|------------|------------|
| {Feature 1} | {How affected} | H/M/L | {Mitigation steps} |
| {Feature 2} | {How affected} | H/M/L | {Mitigation steps} |

### Regression Test Suite

| Test Suite | Coverage | Run Time | Priority |
|------------|----------|----------|----------|
| Unit Tests | {%} | {Time} | P0 |
| Integration | {%} | {Time} | P1 |
| E2E | {%} | {Time} | P2 |

### Breaking Changes

| Change | Impact | Migration Required | Evidence |
|--------|--------|-------------------|----------|
| {Change 1} | {Impact} | Yes/No | `{File}:{Line}` |

---

## 21. Troubleshooting

### Common Issues

#### {Issue Title 1}

**Symptoms**: {Observable problem description}

**Causes**:
1. {Cause 1}
2. {Cause 2}

**Resolution**:
1. {Step 1}
2. {Step 2}
3. {Verification}

#### {Issue Title 2}

**Symptoms**: {Observable problem}

**Causes**:
1. {Cause 1}

**Resolution**:
1. {Resolution steps}

### Diagnostic Queries

```sql
-- Check {entity} records for company
SELECT * FROM [{Schema}].[{Table}]
WHERE CompanyId = '{companyId}'
ORDER BY CreatedDate DESC;

-- Find orphaned records
SELECT * FROM [{Schema}].[{Table}]
WHERE ParentId NOT IN (SELECT Id FROM [{Schema}].[{ParentTable}]);
```

### Log Analysis

| Log Pattern | Meaning | Action |
|-------------|---------|--------|
| `[ERROR] {Pattern}` | {What it means} | {What to do} |
| `[WARN] {Pattern}` | {What it means} | {What to do} |

---

## 22. Operational Runbook

### Deployment Checklist

- [ ] Database migrations applied
- [ ] Configuration values verified
- [ ] Health checks passing
- [ ] Smoke tests executed
- [ ] Rollback plan ready

### Monitoring

| Metric | Alert Threshold | Dashboard | Escalation |
|--------|-----------------|-----------|------------|
| Error Rate | >1% | {Dashboard URL} | {Team} |
| Latency p95 | >1s | {Dashboard URL} | {Team} |
| Queue Depth | >1000 | {Dashboard URL} | {Team} |

### Health Checks

| Endpoint | Expected Response | Frequency |
|----------|-------------------|-----------|
| `/health` | 200 OK | 30s |
| `/health/ready` | 200 OK | 30s |

### Rollback Procedure

1. {Step 1}
2. {Step 2}
3. {Verification step}

### Incident Response

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| P0 (Critical) | 15 min | On-call → Lead → Manager |
| P1 (High) | 1 hour | On-call → Lead |
| P2 (Medium) | 4 hours | Team queue |

---

## 23. Roadmap and Dependencies

### Current Phase

| Phase | Status | Target Date | Owner |
|-------|--------|-------------|-------|
| {Phase 1} | ✅ Complete | {Date} | {Owner} |
| {Phase 2} | 🔄 In Progress | {Date} | {Owner} |
| {Phase 3} | ⏳ Planned | {Date} | {Owner} |

### Dependencies

| Dependency | Type | Status | Blocker? | Owner |
|------------|------|--------|----------|-------|
| {Dependency 1} | Internal | {Status} | Yes/No | {Owner} |
| {Dependency 2} | External | {Status} | Yes/No | {Owner} |

### Future Enhancements

| Enhancement | Priority | Effort | Business Value |
|-------------|----------|--------|----------------|
| {Enhancement 1} | P1 | {Effort} | {Value} |
| {Enhancement 2} | P2 | {Effort} | {Value} |

---

## 24. Related Documentation

### Internal Documentation

- [{Related Feature 1}](README.{RelatedFeature1}.md)
- [{Module} API Reference](../API-REFERENCE.md)
- [{Module} Troubleshooting](../TROUBLESHOOTING.md)

### Architecture References

- [Backend Patterns](../../../../docs/claude/backend-patterns.md)
- [Frontend Patterns](../../../../docs/claude/frontend-patterns.md)
- [System Architecture](../../../../docs/claude/architecture.md)

### External Resources

- [{External Doc 1}]({URL})
- [{External Doc 2}]({URL})

---

## 25. Glossary

| Term | Definition | Context |
|------|------------|---------|
| CQRS | Command Query Responsibility Segregation - pattern separating read and write operations | Backend architecture |
| Entity Event | Automatic notification triggered when data changes | Cross-service sync |
| DTO | Data Transfer Object - structure for API data exchange | API layer |
| {Domain Term} | {Definition for non-technical stakeholders} | {Where used} |
| {Acronym} | {Full form and meaning} | {Where used} |

---

## 26. Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| {X.0.0} | {Date} | {Major changes} | {Name} |
| {X.X.0} | {Date} | {Minor changes} | {Name} |
| 1.0.0 | {Date} | Initial documentation | {Name} |

---

## Evidence Verification Protocol

### Verification Summary

| Category | Total Claims | Verified | Stale | Missing | Last Verified |
|----------|-------------|----------|-------|---------|---------------|
| Business Requirements | {N} | {N} | {N} | {N} | {Date} |
| Architecture | {N} | {N} | {N} | {N} | {Date} |
| Test Specifications | {N} | {N} | {N} | {N} | {Date} |
| **Total** | **{N}** | **{N}** | **{N}** | **{N}** | |

### Evidence Verification Table

| Claim ID | Claim | File | Documented Lines | Actual Lines | Status | Verified By |
|----------|-------|------|-----------------|--------------|--------|-------------|
| FR-{MOD}-01 | {Claim} | `{File}` | L{X}-{Y} | L{X}-{Y} | ✅ Verified | {Name/Date} |
| TC-{MOD}-001 | {Claim} | `{File}` | L{X}-{Y} | L{X}-{Y} | ✅ Verified | {Name/Date} |

### Status Markers
- ✅ Verified - Line numbers match actual source
- ⚠️ Stale - Line numbers shifted, content still exists
- ❌ Missing - Referenced code no longer exists

### Audit Trail

| Date | Action | Reviewer | Notes |
|------|--------|----------|-------|
| {Date} | Initial verification | {Name} | {Notes} |
| {Date} | Quarterly review | {Name} | {Notes} |

---

_Last Updated: {Date}_
