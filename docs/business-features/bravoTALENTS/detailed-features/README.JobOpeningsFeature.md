# Job Openings Management Feature Documentation

**Module**: bravoTALENTS
**Feature**: Job Openings Management
**Version**: 1.0.0
**Last Updated**: 2026-01-23
**Document Owner**: Talent Management Team

---

## Quick Navigation by Role

| Role | Start Here | Audience | Key Sections |
|------|------------|----------|--------------|
| **Product Owner** | [Executive Summary](#executive-summary) | Business | [Business Value](#business-value), [Success Metrics](#success-metrics) |
| **Business Analyst** | [Business Requirements](#business-requirements) | Business | [Business Rules](#business-rules), [Process Flows](#process-flows) |
| **Developer** | [Architecture](#architecture) | Technical | [Domain Model](#domain-model), [API Reference](#api-reference) |
| **QA/QC** | [Test Specifications](#test-specifications) | Technical | [Edge Cases](#edge-cases-catalog), [Test Data](#test-data-requirements) |

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

### Feature Overview

Job Openings Management enables recruiters to create hiring rounds for specific job positions, track the lifecycle from active recruitment through successful hire or closure. Each opening links to a job position and hiring process, allowing recruiters to assign candidate applications to specific openings and track which opening resulted in a successful hire.

### Business Impact

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Hiring Round Visibility | Manual tracking via spreadsheets | Real-time dashboard | 100% |
| Time to Identify Position Fill | Days (manual reconciliation) | Instant (status update) | ~95% |
| Candidate-Opening Assignment | Email/Notes based | System-linked | 100% |

### Key Decisions Made

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Auto-generated Opening Codes | Unique identifier per company prevents duplicates | Manual entry only (rejected - error prone) |
| Three-state Status Model | Simple lifecycle covers all business scenarios | Five-state model (rejected - overcomplicated) |
| Link to Hiring Process | Enables pipeline stage assignment for applications | Independent pipeline per opening (rejected - redundant) |

### Success Metrics

| Metric | Target | Measurement Method | Owner |
|--------|--------|-------------------|-------|
| Opening Code Uniqueness | 100% | DB constraint validation | Platform Team |
| Successful Hire Tracking | 100% of hires linked | Report query | Recruitment Team |
| User Adoption | 80% active companies | Usage analytics | Product Team |

---

## Business Value

### Value Proposition

Recruiters often manage multiple hiring rounds for the same position (e.g., Q1 vs Q2 hiring, different locations). Without Job Openings, tracking which applications belong to which hiring round requires manual spreadsheets. This feature provides systematic tracking of hiring rounds with clear lifecycle states and candidate assignment.

### User Stories

#### US-JO-01: Create Job Opening

**As a** Recruiter
**I want to** create a job opening for a specific position
**So that** I can track applications for this hiring round separately

**Acceptance Criteria**:
- [x] Can set start date and optional target end date
- [x] Can link to existing job position
- [x] Can link to hiring process/pipeline
- [x] Auto-generates unique opening code (JO-YYYY-NNN)
- [x] Can specify team and locations

**Evidence**: `JobOpening.cs:14-95`

#### US-JO-02: Assign Application to Opening

**As a** Recruiter
**I want to** assign candidate applications to a job opening
**So that** I can track which opening the candidate is being considered for

**Acceptance Criteria**:
- [x] Can link application from candidate card
- [x] Can select pipeline stage when linking
- [x] Can remove link from application
- [x] Opening tracks total applicant count

**Evidence**: `LinkJobOpeningToApplicationCommand.cs:1-243`

#### US-JO-03: Mark Opening as Hired

**As a** Recruiter
**I want to** mark an opening as hired when a candidate is selected
**So that** I can track which candidate filled the position

**Acceptance Criteria**:
- [x] Captures successful candidate and application info
- [x] Records hire date and who made the decision
- [x] Status changes to "Hired"
- [x] Cannot mark Hired opening as Hired again

**Evidence**: `JobOpening.cs:103-122`

---

## Business Requirements

### Requirement Categories

| Category | Count | Priority Distribution |
|----------|-------|----------------------|
| Opening CRUD | 4 | P0: 4, P1: 0, P2: 0 |
| Status Management | 3 | P0: 2, P1: 1, P2: 0 |
| Application Linking | 2 | P0: 2, P1: 0, P2: 0 |
| Filtering/Search | 2 | P0: 1, P1: 1, P2: 0 |

### Opening CRUD

#### FR-JO-01: Create Job Opening [P0]

| Aspect | Details |
|--------|---------|
| **Description** | Create a new hiring round for a job position |
| **Actor** | Recruiter, HR Manager |
| **Trigger** | User clicks "Create Job Opening" |
| **Preconditions** | Company exists, user has permission |
| **Postconditions** | Opening created with status Active |
| **Validation Rules** | Code unique per company, StartDate required |
| **Error Handling** | Duplicate code → validation error |
| **Evidence** | `SaveJobOpeningCommand.cs:1-121` |

#### FR-JO-02: Edit Job Opening [P0]

| Aspect | Details |
|--------|---------|
| **Description** | Modify opening details (dates, team, locations) |
| **Actor** | Recruiter, HR Manager |
| **Preconditions** | Opening exists |
| **Scope** | Cannot change CompanyId |
| **Evidence** | `SaveJobOpeningCommand.cs:1-121` |

#### FR-JO-03: Delete Job Opening [P0]

| Aspect | Details |
|--------|---------|
| **Description** | Remove opening from system |
| **Preconditions** | Opening has no linked applications |
| **Error Handling** | Has applications → prevent deletion |
| **Evidence** | `DeleteJobOpeningCommand.cs:1-81` |

#### FR-JO-04: List Job Openings [P0]

| Aspect | Details |
|--------|---------|
| **Description** | Paginated list with filtering |
| **Filters** | Status, Team, Location, Hiring Process, Search text |
| **Evidence** | `GetJobOpeningListQuery.cs:1-163` |

---

## Business Rules

### Rule Catalog

| Rule ID | Rule Name | Category | Enforcement |
|---------|-----------|----------|-------------|
| BR-JO-01 | Unique Opening Code | Data Integrity | Backend |
| BR-JO-02 | Status Transition Guards | Lifecycle | Backend |
| BR-JO-03 | Delete Only If No Applicants | Data Protection | Backend |
| BR-JO-04 | Hired Requires Application Info | Data Completeness | Backend |

### BR-JO-01: Unique Opening Code

**Statement**: Opening code must be unique within a company.

**Condition**:
```
IF Opening with same Code exists in Company
THEN reject save with "Opening code already exists"
ELSE allow save
```

**Examples**:
- ✅ Valid: Company A has JO-2026-001, Company B creates JO-2026-001 (different companies)
- ❌ Invalid: Company A creates JO-2026-001 twice → "Opening code already exists"

**Evidence**: `CheckDuplicateOpeningCodeQuery.cs:1-88`

### BR-JO-02: Status Transition Guards

**Statement**: Status changes follow specific state machine rules.

**Transitions**:
```
Active → Hired (via MarkAsHired)
Active → Closed (via Close)
Closed → Active (via Reopen)
Hired → Active (via MarkAsUnHired)
```

**Examples**:
- ✅ Valid: Active opening closed with reason
- ❌ Invalid: Closed opening marked as Hired → "Job opening must be Active to mark as Hired"

**Evidence**: `JobOpening.cs:98-175`

### BR-JO-03: Delete Only If No Applicants

**Statement**: Opening cannot be deleted if applications are linked.

**Evidence**: `DeleteJobOpeningCommand.cs:45-60`

---

## Process Flows

### Flow Diagram: Job Opening Lifecycle

```
┌──────────┐    ┌──────────┐    ┌──────────────┐
│  Create  │───▶│  Active  │───▶│    Hired     │
└──────────┘    └────┬─────┘    └──────────────┘
                     │                 │
                     ▼                 │ (MarkAsUnHired)
              ┌──────────┐             │
              │  Closed  │◀────────────┘
              └────┬─────┘
                   │ (Reopen)
                   ▼
              ┌──────────┐
              │  Active  │
              └──────────┘
```

### Process Steps: Create and Assign Opening

| Step | Actor | Action | System Response | Next Step |
|------|-------|--------|-----------------|-----------|
| 1 | Recruiter | Opens Job Openings page | Shows list of openings | 2 |
| 2 | Recruiter | Clicks "Create Opening" | Opens form dialog | 3 |
| 3 | Recruiter | Fills details, selects job/pipeline | Validates input | 4 |
| 4 | System | Generates unique code | Saves opening | 5 |
| 5 | Recruiter | Views candidate card | Shows "Assign to Opening" button | 6 |
| 6 | Recruiter | Selects opening and stage | Links application to opening | End |

---

## Design Reference

### Screen Inventory

| Screen | Purpose | Key Components | Figma Node |
|--------|---------|----------------|------------|
| Job Opening List | View/manage openings | Filter panel, List table, Action menu | TBD |
| Job Opening Form | Create/edit opening | Form fields, Job selector, Pipeline selector | TBD |
| Assignment Dialog | Link application to opening | Opening dropdown, Stage selector | TBD |
| Close Dialog | Close with reason | Reason input, Confirm button | TBD |

### UI States

| State | Trigger | Visual Treatment |
|-------|---------|------------------|
| Loading | API call in progress | Skeleton loader |
| Empty | No openings exist | Empty state with "Create First Opening" CTA |
| Error | API failure | Error banner with retry |
| Success | Save/Close/Delete complete | Toast notification |

---

## System Design

### Architecture Decision Records (ADRs)

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| ADR-001 | Store Opening in Candidate Service | Accepted | 2026-01-08 |

#### ADR-001: Store Opening in Candidate Service

**Context**: Job Openings relate to both Jobs and Candidates. Could live in Job.Service or Candidate.Service.

**Decision**: Store in Candidate.Service as the primary consumer is candidate management workflow.

**Consequences**: Job data (name) must be fetched via lookup for display. Application linking is direct.

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Candidate.Service                             │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │JobOpeningController│──▶│ Command Handler │──▶│ Repository   │  │
│  └─────────────────┘   └─────────────────┘   └───────────────┘  │
│         │                       │                     │          │
│         ▼                       ▼                     ▼          │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │ Validation      │   │  Entity Event   │   │   MongoDB     │  │
│  │ Pipeline        │   │  Handler        │   │ JobOpenings   │  │
│  └─────────────────┘   └─────────────────┘   └───────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Service Responsibilities

| Service | Responsibility | Key Classes |
|---------|---------------|-------------|
| Candidate.Domain | JobOpening entity, status enum | `JobOpening.cs`, `JobOpeningStatus.cs` |
| Candidate.Application | CQRS commands/queries | `JobOpenings/Commands/`, `JobOpenings/Queries/` |
| Candidate.Service | REST API controller | `JobOpeningController.cs` |

### Design Patterns Applied

| Pattern | Usage | Location | Evidence |
|---------|-------|----------|----------|
| CQRS | Command/Query separation | `JobOpenings/Commands/`, `JobOpenings/Queries/` | All command files |
| Repository | Data access | `IJobOpeningRepository.cs` | `IJobOpeningRepository.cs:1-17` |
| Entity Events | Side effects | `UseCaseEvents/` | `SyncRelatedDataOnSaveJobOpeningEntityEventHandler.cs:1-58` |
| Fluent DTO | Enrichment pattern | `JobOpeningDto.cs` | `JobOpeningDto.cs:183-241` |

---

## Domain Model

### Entity Relationship Diagram

```
┌─────────────────────────────┐       ┌─────────────────────────────┐
│         JobOpening          │       │        Application          │
├─────────────────────────────┤       ├─────────────────────────────┤
│ Id: string (PK)             │──────▶│ Id: string (PK)             │
│ CompanyId: string           │       │ JobOpeningId: string (FK)   │
│ Code: string (unique/co)    │       │ CandidateId: string         │
│ Status: JobOpeningStatus    │       │ ...                         │
│ StartDate: DateTime         │       └─────────────────────────────┘
│ TargetEndDate: DateTime?    │
│ JobId: string?              │       ┌─────────────────────────────┐
│ HiringProcessId: string?    │       │  SuccessfulApplicationInfo  │
│ LocationIds: List<string>   │       ├─────────────────────────────┤
│ Team: string?               │◀──────│ CandidateId: string         │
│ SuccessfulApplicationInfo?  │       │ ApplicationId: string       │
│ CreatedDate: DateTime       │       │ HiredDate: DateTime         │
│ CreatedByUserId: string?    │       │ HiredBy: string?            │
└─────────────────────────────┘       └─────────────────────────────┘
```

### JobOpening

**Location**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/JobOpening.cs`

| Property | Type | Required | Description | Validation |
|----------|------|----------|-------------|------------|
| Id | string | Yes | Unique identifier (ULID) | Auto-generated |
| CompanyId | string | Yes | Company scope | Must exist |
| Code | string | Yes | Unique code within company | Auto-gen or unique check |
| Status | JobOpeningStatus | Yes | Lifecycle state | Enum value |
| StartDate | DateTime | Yes | When opening becomes active | Required |
| TargetEndDate | DateTime? | No | Target fill date | Optional |
| JobId | string? | No | Linked job position | Optional |
| HiringProcessId | string? | No | Linked hiring pipeline | Optional |
| LocationIds | List<string> | No | Position locations | Optional |
| Team | string? | No | Department/team | Optional |
| SuccessfulApplicationInfo | ValueObject? | No | Hire details when Hired | Set on MarkAsHired |

**Evidence**: `JobOpening.cs:14-95`

### Enumerations

#### JobOpeningStatus

**Location**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/JobOpeningStatus.cs`

| Value | Code | Description | Usage |
|-------|------|-------------|-------|
| 1 | Active | Actively accepting applications | Default on creation |
| 2 | Hired | Position filled with successful candidate | Via MarkAsHired |
| 3 | Closed | Closed without hiring | Via Close |

**Evidence**: `JobOpeningStatus.cs:1-25`

### Value Objects

#### SuccessfulApplicationInfo

**Location**: `src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/SuccessfulApplicationInfo.cs`

| Property | Type | Validation | Description |
|----------|------|------------|-------------|
| CandidateId | string | Required | Hired candidate |
| ApplicationId | string | Required | Winning application |
| HiredDate | DateTime | Required | When hired |
| HiredBy | string? | Optional | Who made decision |

**Evidence**: `SuccessfulApplicationInfo.cs:1-46`

---

## API Reference

### Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/job-opening/list` | Get paginated list | Bearer |
| GET | `/api/job-opening/{id}` | Get by ID | Bearer |
| POST | `/api/job-opening` | Create/Update | Bearer |
| DELETE | `/api/job-opening/{id}` | Delete opening | Bearer |
| POST | `/api/job-opening/close` | Close opening | Bearer |
| POST | `/api/job-opening/reopen` | Reopen opening | Bearer |
| POST | `/api/job-opening/link-to-application` | Link application | Bearer |
| GET | `/api/job-opening/check-duplicate-code` | Check code exists | Bearer |

### GET /api/job-opening/list

**Description**: Get paginated list of job openings with filtering

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| jobIds | string[] | No | - | Filter by job IDs |
| statuses | JobOpeningStatus[] | No | - | Filter by statuses |
| teams | string[] | No | - | Filter by teams |
| locationIds | string[] | No | - | Filter by locations |
| hiringProcessIds | string[] | No | - | Filter by pipelines |
| searchText | string | No | - | Search code/job name |
| skipCount | int | No | 0 | Pagination offset |
| maxResultCount | int | No | 20 | Page size (max 100) |
| includeDetails | bool | No | false | Include display names |

**Response** (200 OK):
```typescript
interface GetJobOpeningListQueryResult {
  items: JobOpeningDto[];
  totalCount: number;
}
```

**Evidence**: `GetJobOpeningListQuery.cs:1-163`

### POST /api/job-opening

**Description**: Create or update a job opening

**Request Body**:
```typescript
interface SaveJobOpeningCommand {
  jobOpening: {
    id?: string;           // null for create
    code: string;          // Required, unique per company
    startDate: Date;       // Required
    targetEndDate?: Date;  // Optional
    jobId?: string;        // Optional
    hiringProcessId?: string; // Optional
    locationIds?: string[]; // Optional
    team?: string;         // Optional
  };
}
```

**Response** (200 OK):
```typescript
interface SaveJobOpeningCommandResult {
  jobOpening: JobOpeningDto;
}
```

**Evidence**: `SaveJobOpeningCommand.cs:1-121`

### POST /api/job-opening/link-to-application

**Description**: Link or unlink a job opening to a candidate application

**Request Body**:
```typescript
interface LinkJobOpeningToApplicationCommand {
  candidateId: string;      // Required
  applicationId: string;    // Required
  jobOpeningId?: string;    // null to unlink
  defaultStageId?: string;  // Pipeline stage to set
}
```

**Evidence**: `LinkJobOpeningToApplicationCommand.cs:1-243`

---

## Frontend Components

### Component Hierarchy

```
CandidatesPageComponent (Container)
├── CandidateFiltersComponent
│   └── FilterPanelComponent (bravo-common)
├── CandidateListPagingComponent
│   └── CandidateQuickCardV2Component
│       ├── JobOpeningAssignmentDialogComponent
│       └── JobOpeningRemovalDialogComponent
└── CloseJobOpeningDialogComponent (jobs module)
```

### Component Inventory

| Component | Type | Purpose | Path |
|-----------|------|---------|------|
| JobOpeningAssignmentDialog | Dialog | Assign application to opening | `candidates/.../job-opening-assignment-dialog/` |
| JobOpeningRemovalDialog | Dialog | Confirm unlink application | `candidates/.../job-opening-removal-dialog/` |
| CloseJobOpeningDialog | Dialog | Close opening with reason | `jobs/components/close-job-opening-dialog/` |
| FilterPanelComponent | Shared | Reusable filter panel | `bravo-common-lib/src/components/filter-panel/` |

### State Management

**Store**: Redux-style NgRx in `candidates/_store/`

| Action | Trigger | API Call | Updates |
|--------|---------|----------|---------|
| LoadCandidateFilters | Page init | GET /filters | Filter options including openings |
| LinkJobOpening | Dialog submit | POST /link-to-application | Candidate card state |

**Evidence**: `candidates.action.ts:1-15`, `candidates.effect.ts:1-22`

### Models

**Location**: `src/Web/bravoTALENTSClient/src/app/shared/models/job-opening.model.ts`

- `JobOpening` - Main model class with computed properties
- `JobOpeningStatus` - Enum matching backend
- `JobOpeningStatusHelper` - Status display helpers
- `GetJobOpeningListQuery` - List query with fluent builders
- `SaveJobOpeningCommand` - Save command
- `LinkJobOpeningToApplicationCommand` - Link command
- `CloseJobOpeningCommand` - Close command
- `ReopenJobOpeningCommand` - Reopen command

**Evidence**: `job-opening.model.ts:1-422`

---

## Backend Controllers

### JobOpeningController

**Location**: `src/Services/bravoTALENTS/Candidate.Service/Controllers/JobOpeningController.cs`

| Action | Method | Route | Command/Query |
|--------|--------|-------|---------------|
| GetList | GET | `/list` | GetJobOpeningListQuery |
| GetById | GET | `/{id}` | GetJobOpeningByIdQuery |
| Save | POST | `/` | SaveJobOpeningCommand |
| Delete | DELETE | `/{id}` | DeleteJobOpeningCommand |
| Close | POST | `/close` | CloseJobOpeningCommand |
| Reopen | POST | `/reopen` | ReopenJobOpeningCommand |
| LinkToApplication | POST | `/link-to-application` | LinkJobOpeningToApplicationCommand |
| CheckDuplicateCode | GET | `/check-duplicate-code` | CheckDuplicateOpeningCodeQuery |

**Evidence**: `JobOpeningController.cs:1-106`

---

## Cross-Service Integration

### Message Bus Events

| Event | Producer | Consumer(s) | Purpose |
|-------|----------|-------------|---------|
| JobEntityEventBusMessage | Job.Service | Candidate.Service | Sync job updates to openings |

### Event Handler

**SyncJobOpeningsOnJobEntityEventHandler**: When a Job is updated/deleted, updates related JobOpenings.

**Evidence**: `SyncJobOpeningsOnJobEntityEventHandler.cs:1-74`

---

## Security Architecture

### Authorization

All endpoints require Bearer token authentication.

#### Role Permissions Matrix

| Role | View List | Create | Edit | Delete | Close/Reopen | Link Application |
|------|:----:|:------:|:----:|:------:|:----:|:----:|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| HR Manager | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recruiter | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |

### Data Protection

- **Company Isolation**: All queries scoped by CompanyId from RequestContext
- **Soft Delete**: Openings track CreatedByUserId and ModifiedByUserId for audit

---

## Performance Considerations

### Optimization Strategies

| Strategy | Implementation | Impact |
|----------|---------------|--------|
| MongoDB Indexes | Compound index on CompanyId + Status | Fast filtered queries |
| Pagination | Max 100 items per request | Consistent response times |
| Optional Details | `includeDetails` flag | Reduce joins when not needed |

### Database Indexes

**Location**: `20260108000000_EnsureJobOpeningCollectionIndexes.cs`

- Index on `CompanyId` (for company scoping)
- Index on `CompanyId, Status` (for filtered lists)
- Index on `CompanyId, Code` (for uniqueness check)

**Evidence**: `20260108000000_EnsureJobOpeningCollectionIndexes.cs:1-19`

---

## Implementation Guide

### Prerequisites

- [x] MongoDB collection `JobOpenings` created
- [x] Migration `20260108000000_EnsureJobOpeningCollectionIndexes` applied
- [x] Migration `20260122000000_MigrateJobRequiredSkillsToGlobalDropdown` applied

### Key Implementation Files

**Backend**:
- `Candidate.Domain/AggregatesModel/JobOpening/` - Entity and value objects
- `Candidate.Application/JobOpenings/` - Commands, queries, DTOs
- `Candidate.Persistance/Repositories/JobOpeningRepository.cs` - Repository
- `Candidate.Service/Controllers/JobOpeningController.cs` - API controller

**Frontend**:
- `shared/models/job-opening.model.ts` - TypeScript models
- `shared/services/job-opening-api.service.ts` - API service
- `candidates/.../job-opening-assignment-dialog/` - Assignment dialog
- `candidates/.../job-opening-removal-dialog/` - Removal dialog

---

## Test Specifications

### Test Summary

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | Total |
|----------|:-------------:|:---------:|:-----------:|:-----:|
| CRUD Operations | 2 | 0 | 0 | 2 |
| Status Transitions | 3 | 0 | 0 | 3 |
| Application Linking | 3 | 1 | 0 | 4 |
| **Total** | **8** | **1** | **0** | **9** |

### CRUD Test Specs

#### TC-JO-001: Create Job Opening [P0]

**Objective**: Verify job opening creation with valid data

**GIVEN** a logged-in recruiter
**WHEN** they submit a valid job opening form
**THEN** opening is created with Active status and generated code

**Evidence**: `SaveJobOpeningCommand.cs:48-75`

#### TC-JO-002: Duplicate Code Prevention [P0]

**Objective**: Verify duplicate codes are rejected

**GIVEN** an opening with code "JO-2026-001" exists
**WHEN** user tries to create another with same code
**THEN** validation error "Opening code already exists"

**Evidence**: `CheckDuplicateOpeningCodeQuery.cs:35-50`

### Status Transition Test Specs

#### TC-JO-003: Close Active Opening [P0]

**Objective**: Verify active opening can be closed with reason

**GIVEN** an Active job opening
**WHEN** recruiter closes with reason "Position cancelled"
**THEN** status changes to Closed, reason is stored

**Evidence**: `JobOpening.cs:145-157`

#### TC-JO-004: Reopen Closed Opening [P0]

**Objective**: Verify closed opening can be reopened

**GIVEN** a Closed job opening
**WHEN** recruiter reopens it
**THEN** status changes to Active, reason is cleared

**Evidence**: `JobOpening.cs:162-174`

#### TC-JO-005: Mark as Hired [P0]

**Objective**: Verify successful hire tracking

**GIVEN** an Active job opening with linked application
**WHEN** recruiter marks as hired with candidate info
**THEN** status is Hired, SuccessfulApplicationInfo populated

**Evidence**: `JobOpening.cs:103-122`

---

### Application Linking Test Specs

#### TC-JO-006: Link Application to Opening [P0]

**Objective**: Verify application can be linked to job opening

**GIVEN** an Active job opening and unlinked application
**WHEN** recruiter links application to opening with stage selection
**THEN** application.JobOpeningId is set, pipeline stage updated

**Evidence**: `LinkJobOpeningToApplicationCommand.cs:100-180`

---

#### TC-JO-007: Unlink Application from Opening [P1]

**Objective**: Verify application can be unlinked

**GIVEN** an application linked to a job opening
**WHEN** recruiter unlinks (jobOpeningId = null)
**THEN** application.JobOpeningId cleared, activity logged

**Evidence**: `LinkJobOpeningToApplicationCommand.cs:182-220`

---

#### TC-JO-008: Prevent Linking to Filled Opening [P0]

**Objective**: Verify cannot link to Hired opening

**GIVEN** a job opening with status Hired (already filled)
**WHEN** user tries to link a new application
**THEN** validation error "This job opening has already been filled with a successful candidate"

**Evidence**: `LinkJobOpeningToApplicationCommand.cs:90-99`

---

#### TC-JO-009: Delete Opening with Applications [P0]

**Objective**: Verify deletion blocked when applications linked

**GIVEN** job opening with 3 linked applications
**WHEN** recruiter attempts deletion
**THEN** validation error prevents deletion

**Evidence**: `DeleteJobOpeningCommand.cs:45-60`

---

## Test Data Requirements

### Test Data Sets

| Data Set | Purpose | Records |
|----------|---------|---------|
| Valid Openings | Happy path testing | 10 per status |
| Edge Case Openings | Boundary testing | 5 |

### Sample Test Data

```json
{
  "validOpening": {
    "code": "JO-2026-001",
    "startDate": "2026-01-01",
    "targetEndDate": "2026-03-31",
    "jobId": "job-123",
    "hiringProcessId": "pipeline-456",
    "locationIds": ["loc-1", "loc-2"],
    "team": "Engineering"
  }
}
```

---

## Edge Cases Catalog

### Input Validation Edge Cases

| ID | Scenario | Input | Expected | Error |
|----|----------|-------|----------|-------|
| EC-01 | Empty code | `""` | Auto-generate code | - |
| EC-02 | Code too long | 100+ chars | Validation error | Code too long |
| EC-03 | Past start date | Yesterday | Allowed | - |

### Business Logic Edge Cases

| ID | Scenario | Condition | Expected Behavior |
|----|----------|-----------|-------------------|
| EC-10 | Delete with applicants | Opening has 5 applications | Prevent deletion |
| EC-11 | Close already closed | Status = Closed | Validation error |
| EC-12 | Reopen Active | Status = Active | Validation error |

---

## Regression Impact

### Affected Areas

| Area | Impact Level | Regression Tests Required |
|------|-------------|--------------------------|
| Candidate Cards | High | Assignment/removal dialogs |
| Candidate Filters | Medium | Filter by opening |
| Pipeline Stage Assignment | Medium | Stage selection on link |

---

## Troubleshooting

### Common Issues

#### Opening Code Not Generating

**Symptoms**: Code field empty after save

**Root Cause**: Auto-generation logic not triggered

**Resolution**: Check if Code was explicitly set to empty string vs null

#### Application Not Linking

**Symptoms**: Link action succeeds but no change visible

**Root Cause**: Missing store update or stale data

**Resolution**: Verify NgRx action dispatched, check reducer

---

## Operational Runbook

### Health Checks

| Check | Endpoint | Expected |
|-------|----------|----------|
| Job Opening API | `/api/job-opening/list?maxResultCount=1` | 200 OK |

### Diagnostic Queries

```javascript
// MongoDB: Find openings without applications
db.JobOpenings.find({
  status: 1, // Active
  totalApplicants: 0
})

// Find openings for company
db.JobOpenings.find({ companyId: "xxx" }).sort({ createdDate: -1 })
```

---

## Roadmap and Dependencies

### Upstream Dependencies

| Dependency | Type | Status | Impact if Delayed |
|------------|------|--------|-------------------|
| Job.Service | Feature | Complete | Cannot link to jobs |
| Hiring Process | Feature | Complete | Cannot assign pipeline |

### Future Enhancements

| Enhancement | Priority | Target Version | Effort |
|-------------|----------|----------------|--------|
| Job Opening Dashboard | Medium | v2.1 | M |
| Bulk Opening Management | Low | v2.2 | L |
| Opening Templates | Low | v2.3 | M |

---

## Related Documentation

- [Candidate Management Feature](recruitment/README.CandidateManagementFeature.md)
- [Hiring Process Management](README.HiringProcessManagementFeature.md)
- [Recruitment Pipeline Feature](README.RecruitmentPipelineFeature.md)
- [Backend Patterns](../../../../docs/claude/backend-patterns.md)
- [Frontend Patterns](../../../../docs/claude/frontend-patterns.md)

---

## Glossary

| Term | Definition | Context |
|------|------------|---------|
| Job Opening | A hiring round for a specific job position | Core entity |
| Hiring Process | Pipeline/workflow for processing candidates | Linked entity |
| Application | A candidate's submission for a job | Linked to opening |
| SuccessfulApplicationInfo | Details of the winning candidate/application | Value object |

---

## Version History

| Version | Date | Author | Changes | Review Status |
|---------|------|--------|---------|---------------|
| 1.0.1 | 2026-01-23 | Claude Code | Added TC-JO-006 to TC-JO-009 Application Linking test specs | Draft |
| 1.0.0 | 2026-01-23 | Claude Code | Initial documentation | Draft |

---

_Last Updated: 2026-01-23_
_Generated following BravoSUITE Documentation Standards v2.0_
