# Goal Management Feature

> **Comprehensive Technical Documentation for the OKR & SMART Goal Management System**

## Table of Contents

- [Overview](#overview)
- [Business Requirements](#business-requirements)
- [Design Reference](#design-reference)
- [Architecture](#architecture)
- [Domain Model](#domain-model)
- [Core Workflows](#core-workflows)
    - [Goal Creation](#goal-creation)
    - [Goal Editing with Permissions](#goal-editing-with-permissions)
    - [Goal Deletion](#goal-deletion)
    - [Goal List & Dashboard](#goal-list--dashboard)
    - [Permissions & Visibility](#permissions--visibility)
    - [Notifications & Reminders](#notifications--reminders)
    - [Integrations (Performance Review, Check-In)](#integrations-performance-review-check-in)
- [API Reference](#api-reference)
- [Frontend Components](#frontend-components)
- [Backend Controllers](#backend-controllers)
- [Cross-Service Integration](#cross-service-integration)
- [Permission System](#permission-system)
- [Test Specifications](#test-specifications)
- [Troubleshooting](#troubleshooting)
- [Related Documentation](#related-documentation)
- [Version History](#version-history)

---

## Overview

> **Objective**: Provide comprehensive OKR and SMART goal management for enterprise HR platforms with granular permissions, automated notifications, and performance integration.
>
> **Core Values**: Configurable - Secure - Scalable - Event-Driven

The **Goal Management Feature** in TextSnippet service provides comprehensive **OKR (Objectives and Key Results)** and **SMART goal** management capabilities for enterprise HR platforms. The system supports both company-wide and individual employee goals with granular permission controls, automated notifications, and seamless integration with Performance Review and Check-In features.

The feature implements a dual-app architecture serving both **company-level goal management** (HR managers, team leads) and **employee self-service** (individual goal tracking, progress updates).

### Key Capabilities

- **Multi-Framework Support**: OKR (Objectives with KeyResults) and SMART goal methodologies
- **Flexible Goal Types**: 3 goal types (SMART, Objective, KeyResult) for hierarchical goal structures
- **Multi-Level Targeting**: Individual, Company, and Department-level goals
- **23 Granular Permissions**: Field-level access control with role-based and ownership-based checks
- **6 Goal Statuses**: NotStarted, Progressing, Behind, AtRisk, Canceled, Completed with automatic overdue detection
- **6 Visibility Types**: Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, ThisOrgUnitAndSubOrgs
- **Advanced Filtering**: Full-text search, multi-dimensional filtering, date ranges, org unit hierarchies
- **Event-Driven Architecture**: Automatic email notifications on Create/Update/Delete operations
- **Automated Reminders**: Daily background job for deadline reminders (7 days before due)
- **Audit Trail**: Complete history logging of all field changes
- **Performance Integration**: Link goals to performance review cycles
- **Check-In Integration**: Track goal progress through recurring check-ins
- **Cascade Deletion**: Automatic cleanup when employees are removed from system
- **Dual-App Support**: Both company management portal and employee self-service app

---

## Business Requirements

> **Objective**: Enable organizations to set, track, and achieve goals using OKR/SMART methodologies
>
> **Core Values**: Flexibility - Accountability - Transparency

### Goal Management

#### FR-GOAL-01: Create Goals

| Aspect          | Details                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Description** | Users can create SMART goals or OKR objectives with key results    |
| **Scope**       | HR Managers, Team Leads, Employees (based on permissions)          |
| **Validation**  | Title required, due date must be future, measurement type required |
| **Evidence**    | `SaveGoalCommand.cs:1-428`                                         |

#### FR-GOAL-02: Goal Visibility Control

| Aspect          | Details                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Description** | Goals can be configured with 6 visibility levels                   |
| **Options**     | Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, SubOrgs |
| **Validation**  | SpecificPeople requires at least one viewer                        |
| **Evidence**    | `Goal.cs:45-60`, `GetGoalVisibilityQuery.cs:1-75`                  |

#### FR-GOAL-03: Goal Progress Tracking

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Description** | Track goal progress with current/target measurements |
| **Scope**       | Goal owners and approvers                            |
| **Output**      | Progress percentage, status auto-calculation         |
| **Evidence**    | `UpdateGoalCurrentValueMeasurementCommand.cs:1-72`   |

### Notifications & Reminders

#### FR-GOAL-04: Automated Email Notifications

| Aspect             | Details                                         |
| ------------------ | ----------------------------------------------- |
| **Description**    | Send emails on goal create/update/delete events |
| **Access Control** | Event-driven, triggered automatically           |
| **Audit**          | All notifications logged                        |
| **Evidence**       | `SendEmailOnCUDGoalEntityEventHandler.cs:1-60`  |

#### FR-GOAL-05: Deadline Reminders

| Aspect          | Details                                                   |
| --------------- | --------------------------------------------------------- |
| **Description** | Daily job sends reminders 7 days before goal due date     |
| **Schedule**    | Cron: `0 9 * * *` (daily 9 AM)                            |
| **Output**      | Email notification to goal owner                          |
| **Evidence**    | `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:1-107` |

---

## Design Reference

| Information       | Details                                                 |
| ----------------- | ------------------------------------------------------- |
| **Figma Link**    | _(Contact design team for access)_                      |
| **Screenshots**   | _(To be added)_                                         |
| **UI Components** | Dashboard cards, DataTable, SlideIn forms, Date pickers |

### Key UI Patterns

- **Goal Dashboard**: Stats cards (Total, Progressing, Behind, AtRisk) with filterable table
- **Goal Form**: SlideIn side panel with dynamic fields based on goal type
- **Goal Detail**: Read-only panel with progress visualization
- **Permission-Based UI**: Fields/buttons visibility based on 23 granular permissions

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EasyPlatform Platform                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────┐                       ┌────────────────────────────┐│
│  │  TextSnippet Service   │                       │   Frontend Applications    ││
│  │                        │                       │                            ││
│  │ ┌────────────────────┐ │                       │ ┌────────────────────────┐ ││
│  │ │  Domain Layer      │ │                       │ │  growth-for-company    │ ││
│  │ │  • Goal Entity     │ │                       │ │  • GoalManagement      │ ││
│  │ │  • GoalEmployee    │ │                       │ │  • GoalOverview        │ ││
│  │ │  • GoalCheckIn     │ │                       │ │  • UpsertGoalForm      │ ││
│  │ │  • GoalPerfReview  │ │                       │ └────────────────────────┘ ││
│  │ └────────────────────┘ │                       │             │              ││
│  │         │              │                       │             │              ││
│  │         ▼              │                       │             │              ││
│  │ ┌────────────────────┐ │                       │             │              ││
│  │ │ Application Layer  │ │◄──────REST API───────┼─────────────┘              ││
│  │ │  Commands (3)      │ │    (15 endpoints)    │                            ││
│  │ │  • SaveGoal        │ │                       │ ┌────────────────────────┐ ││
│  │ │  • DeleteGoal      │ │                       │ │  employee app          │ ││
│  │ │  • UpdateMeasure   │ │                       │ │  • GoalManagement      │ ││
│  │ │                    │ │                       │ │  • GoalDetailPanel     │ ││
│  │ │  Queries (6)       │ │                       │ │  • GoalTable           │ ││
│  │ │  • GetGoalList     │ │                       │ └────────────────────────┘ ││
│  │ │  • GetDashboard    │ │                       │                            ││
│  │ │  • GetVisibility   │ │                       │ ┌────────────────────────┐ ││
│  │ │  • Validate...     │ │                       │ │  Shared Domain Library │ ││
│  │ └────────────────────┘ │                       │ │  @libs/apps-domains    │ ││
│  │         │              │                       │ │  • Goal models         │ ││
│  │         ▼              │                       │ │  • GoalPermission      │ ││
│  │ ┌────────────────────┐ │                       │ │  • API Service         │ ││
│  │ │ Event Handlers (3) │ │                       │ │  • Enums & Constants   │ ││
│  │ │  • SendEmail       │ │                       │ └────────────────────────┘ ││
│  │ │  • HistoryLog      │ │                       └────────────────────────────┘│
│  │ │  • CascadeDelete   │ │                                                     │
│  │ └────────────────────┘ │                                                     │
│  │                        │                                                     │
│  │ ┌────────────────────┐ │                                                     │
│  │ │ Background Job (1) │ │                                                     │
│  │ │  • Reminders       │ │      Daily 9 AM                                     │
│  │ │    (Cron: 0 9 * *)  │ │─────────────────►                                  │
│  │ └────────────────────┘ │     Batch Processing                                │
│  │                        │     (20 companies/batch)                            │
│  └────────────────────────┘                                                     │
│           │                                                                     │
│           ▼                                                                     │
│  ┌────────────────────────┐       ┌────────────────────────┐                   │
│  │       MongoDB          │       │  External Services     │                   │
│  │ • Goal Collection      │       │ • NotificationMessage  │                   │
│  │ • GoalEmployee         │       │   (Email notifications)│                   │
│  │ • GoalCheckIn          │       │ • Accounts Service     │                   │
│  │ • GoalPerfReview       │       │   (Authentication)     │                   │
│  └────────────────────────┘       └────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

#### TextSnippet Service (Primary Owner)

**Location**: `src/Backend/TextSnippet/`

**Domain Layer** (`Growth.Domain/Entities/GoalManagement/`):

- **Goal.cs** (186 lines): Main goal entity with static expressions, field tracking, computed properties
- **GoalEmployee.cs** (50 lines): Many-to-many relationship for goal owners/watchers/approvers
- **GoalCheckIn.cs** (37 lines): Check-in integration entity
- **GoalPerformanceReviewParticipant.cs** (47 lines): Performance review integration entity

**Application Layer** (`Growth.Application/`):

- **Commands**:
    - `SaveGoalCommand.cs` (428 lines): Create/Update goal with complex validation
    - `DeleteGoalCommand.cs` (91 lines): Delete with cascade checks
    - `UpdateGoalCurrentValueMeasurementCommand.cs` (72 lines): Progress updates
- **Queries**:
    - `GetGoalListQuery.cs` (156 lines): Paginated list with 10+ filters
    - `GetGoalDetailByIdQuery.cs`: Single goal with related entities
    - `GetGoalDashboardEmployeeQuery.cs` (84 lines): Employee dashboard data
    - `GetGoalDashboardSummaryQuery.cs` (153 lines): Stats aggregation
    - `ValidateCurrentEmployeeCanCreateGoal.cs` (65 lines): License validation
    - `GetGoalVisibilityQuery.cs` (75 lines): Visibility list for dropdown
- **Event Handlers**:
    - `SendEmailOnCUDGoalEntityEventHandler.cs` (60 lines): Email notifications
    - `CreateHistoryLogOnGoalChangedEventHandler.cs` (37 lines): Audit trail
    - `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs` (50 lines): Cascade deletion
- **Background Jobs**:
    - `GoalDeadlinesSendReminderBackgroundJobExecutor.cs` (107 lines): Daily reminders
- **Helpers**:
    - `GoalHelper.cs` (71 lines): License checking, business logic
    - `GetGoalListQueryHelper.cs` (127 lines): Complex query expression builder

**API Layer** (`Growth.Service/Controllers/`):

- **GoalController.cs** (103 lines): 15 RESTful endpoints

**Persistence Layer**: MongoDB with `IPlatformQueryableRootRepository<Goal>`

#### Frontend Applications

**Location**: `src/Frontend/`

**Company App** (`apps/growth-for-company/src/app/routes/goals/`):

- **goal-overview.component.ts** (286 lines): Dashboard with stats cards and filterable table
- Accessed by: HR managers, team leads, department managers

**Employee App** (`apps/employee/src/app/routes/goals/`):

- Goal management component (same as company, `forManagement=false`)
- Accessed by: Individual employees for personal goal tracking

**Shared Domain Library** (`libs/apps-domains/src/goal/`):

- **Domain Models** (3 files, 807 lines):
    - `goal.model.ts` (789 lines): Goal, GoalPermission, GoalMeasurement, GoalStats
    - `goal-check-in.ts` (18 lines): Check-in model
    - `goal.enum.ts` (96 lines): 14 enums
- **API Service** (1 file, 160 lines):
    - `goal-management-api.service.ts`: 15 methods with caching and DTO mapping
- **Components** (6 files, 1,868 lines):
    - `goal-management.component.ts` (280 lines): Main container component
    - `goal-management.store.ts` (260 lines): Reactive state management
    - `upsert-goal-form.component.ts` (865 lines): Complex form with 23 permission checks
    - `goal-detail-panel.component.ts` (366 lines): Slide-in side panel
    - `goal-table.component.ts` (46 lines): Presentation component
    - `goal-overview.component.ts` (286 lines): Dashboard component
- **Query DTOs** (3 files, 230 lines):
    - `get-goal-list.query.ts` (204 lines): Immutable query with fluent API
    - `get-goal-detail-by-id.query.ts` (4 lines): Simple interface
    - `validate-can-create-goal.query.ts` (22 lines): Validation query DTO

#### Supporting Services

**Accounts Service**: User authentication, role management
**NotificationMessage Service**: Cross-service email notifications (called by event handlers)

### Design Patterns Used

| Pattern                   | Usage                            | Location                                                                                    |
| ------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| **CQRS**                  | Command/Query separation         | `SaveGoalCommand`, `GetGoalListQuery`                                                       |
| **Repository**            | Data access abstraction          | `IPlatformQueryableRootRepository<Goal>`                                                    |
| **Event-Driven**          | Async side effects               | Platform auto-raises `PlatformCqrsEntityEvent` → Event handlers                             |
| **Strategy**              | Permission calculation           | `GoalPermission.permissions` dictionary                                                     |
| **Template Method**       | Common query logic               | `GetGoalListQueryHelper.BuildListGoalExpression()`                                          |
| **Fluent Interface**      | Immutable query updates          | `GetGoalListQuery.withSearchText()`, `.withStatuses()`                                      |
| **Observer**              | Reactive state management        | `@WatchWhenValuesDiff` decorator → auto-triggers                                            |
| **Batch Processing**      | Background job execution         | `BatchKeyPageSize=20`, `BatchPageSize=50`                                                   |
| **Factory**               | DTO mapping                      | `PlatformEntityDto<Goal, string>`                                                           |
| **Decorator**             | Field change tracking            | `[TrackFieldUpdatedDomainEvent]` attribute                                                  |
| **Validation Chain**      | Sync + async validation          | `PlatformValidationResult.And().AndAsync().AndNotAsync()`                                   |
| **Connection Pool**       | (Not used in Goal feature)       | N/A                                                                                         |
| **State Management**      | Component store pattern          | `PlatformVmStore` with reactive selectors                                                   |
| **Permission-Based UI**   | 23 field-level permission checks | `GoalPermission.isActionAllowed(GoalActionKey)` → Form field disabling                      |
| **Slide Panel**           | Goal detail side panel           | `platformDialogService.openPanelDialogRef()` with `slidePanelDirection: 'right'`            |
| **Deep Linking**          | URL parameter parsing            | `setUpStoreFromQueryParams()` → Parses `?statuses=Completed,Progressing&dueDate=2025-01-15` |
| **FormArray**             | Dynamic KeyResults management    | Angular FormArray with drag-drop reordering                                                 |
| **Cross-Field Validator** | Date and value comparisons       | `startEndValidator`, custom validators for StartValue vs TargetValue                        |
| **Async Validator**       | Entity existence validation      | `ifAsyncValidator(() => !isViewMode, checkEmployeeExistsValidator)`                         |

## Domain Model

### Core Entities

#### 1. Goal Entity

**Location**: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/Goal.cs` (186 lines)

**Purpose**: Main aggregate root representing an OKR Objective, KeyResult, or SMART goal with complete lifecycle management, field tracking, and computed properties.

**Key Properties**:

```csharp
public class Goal : RootEntity<Goal, string>
{
    // Core Identification
    public string Title { get; set; }                        // Goal title
    public GoalTypes GoalType { get; set; }                  // Smart|Objective|KeyResult
    public GoalTargetTypes GoalTargetType { get; set; }      // Individual|Company|Department

    // Hierarchy & Relationships
    public string? ParentId { get; set; }                    // Parent Objective ID (for KeyResults)
    [JsonIgnore] public Goal? Parent { get; set; }           // Navigation property

    // Measurement & Progress
    public MeasurementTypes? MeasurementType { get; set; }   // Numeric|Percentage|Currency
    public decimal? StartValue { get; set; }
    public decimal? TargetValue { get; set; }
    public decimal? CurrentValue { get; set; }

    // Status & Timeline
    public GoalStatuses Status { get; set; }                 // NotStarted|Progressing|Behind|AtRisk|Canceled|Completed
    public DateTime? StartDate { get; set; }
    public DateTime? DueDate { get; set; }

    // Visibility & Permissions
    public GoalVisibilityTypes Visibility { get; set; }      // Public|OnlyMe|MeAndManager|SpecificPeople|ThisOrgUnit|ThisOrgUnitAndSubOrgs
    public List<string>? VisibilityEmployeeIds { get; set; } // For SpecificPeople visibility
    public List<string>? VisibilityOrgUnitIds { get; set; }  // For org unit visibility

    // Field Change Tracking (auto-tracked via [TrackFieldUpdatedDomainEvent])
    [TrackFieldUpdatedDomainEvent] public string Title { get; set; }
    [TrackFieldUpdatedDomainEvent] public GoalStatuses Status { get; set; }
    [TrackFieldUpdatedDomainEvent] public DateTime? DueDate { get; set; }

    // Computed Properties
    [ComputedEntityProperty]
    public decimal? Progress { get; set; }                   // Auto-calculated progress percentage

    [ComputedEntityProperty]
    public bool IsOverdue { get; set; }                      // true if DueDate < UtcNow and not Completed/Canceled
}
```

**Static Expression Methods** (for reusable queries):

```csharp
// Filter by company and product scope
public static Expression<Func<Goal, bool>> OfCompanyExpr(int productScope, string companyId)
    => g => g.ProductScope == productScope && g.CompanyId == companyId;

// Filter by goal types
public static Expression<Func<Goal, bool>> FilterByGoalTypesExpr(List<GoalTypes> goalTypes)
    => g => goalTypes.Contains(g.GoalType);

// Filter by owner employee IDs
public static Expression<Func<Goal, bool>> FilterByOwnerEmployeeIdsExpr(List<string> ownerEmployeeIds)
    => g => g.GoalEmployees != null && g.GoalEmployees.Any(ge => ownerEmployeeIds.Contains(ge.EmployeeId));

// Filter overdue goals
public static Expression<Func<Goal, bool>> IsOverdueExpr()
    => g => g.DueDate.HasValue && g.DueDate.Value < Clock.UtcNow
         && g.Status != GoalStatuses.Completed && g.Status != GoalStatuses.Canceled;
```

#### 2. GoalEmployee Entity

**Location**: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/GoalEmployee.cs` (50 lines)

**Purpose**: Many-to-many join entity linking employees to goals in different roles (Owner, Watcher, Approver).

**Key Properties**:

```csharp
public class GoalEmployee : Entity<GoalEmployee, string>
{
    public string GoalId { get; set; }                       // Foreign key to Goal
    public string EmployeeId { get; set; }                   // Foreign key to Employee
    public GoalEmployeeRoles Role { get; set; }              // Owner|Watcher|Approver

    [JsonIgnore] public Goal? Goal { get; set; }             // Navigation
    [JsonIgnore] public Employee? Employee { get; set; }     // Navigation
}
```

#### 3. GoalCheckIn Entity

**Location**: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/GoalCheckIn.cs` (37 lines)

**Purpose**: Links goals to check-in events for progress tracking through recurring check-ins.

#### 4. GoalPerformanceReviewParticipant Entity

**Location**: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/GoalPerformanceReviewParticipant.cs` (47 lines)

**Purpose**: Links goals to performance review participants for goal-based performance evaluations.

### Enumerations

**Location**: `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.enum.ts` (96 lines)

#### GoalTypes (3 values)

```typescript
export enum GoalTypes {
    Smart = 'Smart', // SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound)
    Objective = 'Objective', // OKR Objective (parent of KeyResults)
    KeyResult = 'KeyResult' // OKR KeyResult (child of Objective)
}
```

#### GoalStatuses (6 values)

```typescript
export enum GoalStatuses {
    NotStarted = 'NotStarted', // Goal not yet started
    Progressing = 'Progressing', // On track
    Behind = 'Behind', // Behind schedule
    AtRisk = 'AtRisk', // At risk of not meeting target
    Canceled = 'Canceled', // Canceled goal
    Completed = 'Completed' // Successfully completed
}
```

#### GoalTargetTypes (3 values)

```typescript
export enum GoalTargetTypes {
    Individual = 'Individual', // Individual employee goal
    Company = 'Company', // Company-wide goal
    Department = 'Department' // Department/team goal
}
```

#### GoalVisibilityTypes (6 values)

```typescript
export enum GoalVisibilityTypes {
    Public = 'Public', // Visible to all employees
    OnlyMe = 'OnlyMe', // Visible only to owner
    MeAndManager = 'MeAndManager', // Visible to owner and line manager
    SpecificPeople = 'SpecificPeople', // Visible to specific employee list
    ThisOrgUnit = 'ThisOrgUnit', // Visible to org unit members
    ThisOrgUnitAndSubOrgs = 'ThisOrgUnitAndSubOrgs' // Visible to org unit + children
}
```

#### MeasurementTypes (3 values)

```typescript
export enum MeasurementTypes {
    Numeric = 'Numeric', // Numeric measurement (e.g., 0 to 100)
    Percentage = 'Percentage', // Percentage (0% to 100%)
    Currency = 'Currency' // Currency amount
}
```

#### GoalPriorities (3 values)

```typescript
export enum GoalPriorities {
    High = 'High',
    Medium = 'Medium',
    Low = 'Low'
}
```

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Goal Management Domain Model                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │      Goal        │                                                   │
│  ├──────────────────┤                                                   │
│  │ • Id             │                                                   │
│  │ • Title          │                                                   │
│  │ • GoalType       │◄──────────────┐                                  │
│  │ • Status         │               │ Self-referencing (Parent-Child)  │
│  │ • Visibility     │               │ 1:N relationship                 │
│  │ • ParentId       │───────────────┘ (Objective → KeyResults)         │
│  │ • DueDate        │                                                   │
│  └────────┬─────────┘                                                   │
│           │                                                             │
│           │ 1:N                                                         │
│           │                                                             │
│           ▼                                                             │
│  ┌──────────────────┐        N:M          ┌──────────────────┐         │
│  │  GoalEmployee    │◄────────────────────│    Employee      │         │
│  ├──────────────────┤                     ├──────────────────┤         │
│  │ • GoalId         │                     │ • Id             │         │
│  │ • EmployeeId     │                     │ • FullName       │         │
│  │ • Role           │                     │ • Email          │         │
│  │   (Owner/Watch/  │                     │ • OrgUnitId      │         │
│  │    Approver)     │                     └──────────────────┘         │
│  └──────────────────┘                                                   │
│           │                                                             │
│           │ 1:N                                                         │
│           │                                                             │
│  ┌────────┴──────────────────────────────┐                             │
│  │                                        │                             │
│  ▼                                        ▼                             │
│  ┌──────────────────┐          ┌──────────────────────┐                │
│  │  GoalCheckIn     │          │ GoalPerfReviewPart   │                │
│  ├──────────────────┤          ├──────────────────────┤                │
│  │ • GoalId         │          │ • GoalId             │                │
│  │ • CheckInEventId │          │ • ParticipantId      │                │
│  │ • UpdatedValue   │          │ • ReviewCycleId      │                │
│  └──────────────────┘          └──────────────────────┘                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Relationships**:

- **Goal → Goal** (1:N): Parent-child hierarchy for OKR (Objective has many KeyResults)
- **Goal → GoalEmployee** (1:N): One goal can have multiple employees in different roles
- **Employee → GoalEmployee** (1:N): One employee can be linked to multiple goals
- **Goal → GoalCheckIn** (1:N): Track progress through check-in events
- **Goal → GoalPerformanceReviewParticipant** (1:N): Link to performance review cycles

---

## Core Workflows

### Goal Creation

**Flow Overview**: User creates a new goal → Frontend validates permissions → Backend validates and saves → Event handler sends notifications → History log created

#### Frontend Flow

**Entry Point**: `upsert-goal-form.component.ts` (865 lines)

**Step 1: Permission Check** (`goal.model.ts:560-610`)

```typescript
// Check if current user can create goals
const canCreate = GoalPermission.isActionAllowed(GoalActionKey.CanCreateGoal, permissions);

if (!canCreate) {
    throw new Error('Insufficient permissions to create goal');
}
```

**Step 2: Form Initialization** (`upsert-goal-form.component.ts:120-250`)

```typescript
protected initialFormConfig = (): PlatformFormConfig<GoalFormVm> => ({
    controls: {
        title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
        goalType: new FormControl(vm.goalType, [Validators.required]),
        goalTargetType: new FormControl(vm.goalTargetType, [Validators.required]),

        // Measurement configuration
        measurementType: new FormControl(vm.measurementType),
        startValue: new FormControl(vm.startValue, [Validators.min(0)]),
        targetValue: new FormControl(vm.targetValue, [Validators.required, Validators.min(0)]),

        // Timeline
        startDate: new FormControl(vm.startDate, [Validators.required]),
        dueDate: new FormControl(vm.dueDate, [
            Validators.required,
            startEndValidator('invalidRange', () => this.currentVm().startDate, () => this.currentVm().dueDate)
        ]),

        // Visibility
        visibility: new FormControl(vm.visibility, [Validators.required]),
        visibilityEmployeeIds: new FormControl(vm.visibilityEmployeeIds),

        // KeyResults (for Objective type)
        keyResults: {
            modelItems: () => vm.keyResults ?? [],
            itemControl: (keyResult, index) => new FormGroup({
                title: new FormControl(keyResult.title, [Validators.required]),
                targetValue: new FormControl(keyResult.targetValue, [Validators.required]),
                measurementType: new FormControl(keyResult.measurementType)
            })
        }
    },
    dependentValidations: {
        measurementType: ['startValue', 'targetValue'],
        visibility: ['visibilityEmployeeIds', 'visibilityOrgUnitIds']
    }
});
```

**Step 3: Submit to Backend** (`goal-management-api.service.ts:45-55`)

```typescript
public saveGoal(command: SaveGoalCommand): Observable<SaveGoalCommandResult> {
    return this.post<SaveGoalCommandResult>('', command);
}
```

**Evidence**:

- Form component: `src/Frontend/libs/apps-domains/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts:120-250`
- Permission model: `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.model.ts:560-610`
- API service: `src/Frontend/libs/apps-domains/src/goal/api-services/goal-management-api.service.ts:45-55`

#### Backend Flow

**Entry Point**: `GoalController.cs:Save()` → `SaveGoalCommandHandler`

**Step 1: Sync Validation** (`SaveGoalCommand.cs:85-115`)

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Data.Title.IsNotNullOrEmpty(), "Title is required")
        .And(_ => Data.StartDate.HasValue, "StartDate is required")
        .And(_ => Data.DueDate.HasValue, "DueDate is required")
        .And(_ => Data.DueDate >= Data.StartDate, "DueDate must be >= StartDate")
        .And(_ => Data.MeasurementType.HasValue || Data.GoalType == GoalTypes.Objective,
             "MeasurementType required for non-Objective goals")
        .And(_ => Data.GoalType != GoalTypes.KeyResult || Data.ParentId.IsNotNullOrEmpty(),
             "ParentId required for KeyResult type");
}
```

**Step 2: Async Validation** (`SaveGoalCommand.cs:117-145`)

```csharp
protected override async Task<PlatformValidationResult<SaveGoalCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveGoalCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        // Validate parent goal exists (for KeyResults)
        .AndAsync(async request =>
        {
            if (request.Data.GoalType == GoalTypes.KeyResult && request.Data.ParentId.IsNotNullOrEmpty())
            {
                var parentGoal = await goalRepository.GetByIdAsync(request.Data.ParentId, cancellationToken);
                return parentGoal != null && parentGoal.GoalType == GoalTypes.Objective
                    ? PlatformValidationResult<SaveGoalCommand>.Valid()
                    : PlatformValidationResult<SaveGoalCommand>.Invalid("Parent must be an Objective");
            }
            return PlatformValidationResult<SaveGoalCommand>.Valid();
        })
        // Validate owner employees exist
        .AndAsync(async request => await employeeRepository
            .GetByIdsAsync(request.Data.OwnerEmployeeIds, cancellationToken)
            .ThenValidateFoundAllAsync(
                request.Data.OwnerEmployeeIds,
                notFoundIds => $"Owner employees not found: {PlatformJsonSerializer.Serialize(notFoundIds)}"))
        // Validate no external users as owners
        .AndNotAsync(
            request => employeeRepository.AnyAsync(
                e => request.Data.OwnerEmployeeIds.Contains(e.Id) && e.IsExternalUser == true,
                cancellationToken),
            "External users cannot create goals");
}
```

**Step 3: Create or Update Goal** (`SaveGoalCommandHandler.cs:65-120`)

```csharp
protected override async Task<SaveGoalCommandResult> HandleAsync(
    SaveGoalCommand request, CancellationToken cancellationToken)
{
    // Step 3.1: Get or create goal entity
    var goal = request.Data.Id.IsNullOrEmpty()
        ? request.Data.MapToNewGoal()
            .With(g => g.CreatedBy = RequestContext.UserId())
            .With(g => g.ProductScope = RequestContext.ProductScope())
            .With(g => g.CompanyId = RequestContext.CurrentCompanyId())
        : await goalRepository.GetByIdAsync(request.Data.Id, cancellationToken)
            .EnsureFound($"Goal not found: {request.Data.Id}")
            .Then(existing => request.Data.UpdateGoal(existing));

    // Step 3.2: Save goal (platform auto-raises PlatformCqrsEntityEvent)
    var savedGoal = await goalRepository.CreateOrUpdateAsync(goal, cancellationToken);

    // Step 3.3: Sync GoalEmployee relationships
    var existingGoalEmployees = await goalEmployeeRepository
        .GetAllAsync(ge => ge.GoalId == savedGoal.Id, cancellationToken);

    var (toAdd, toRemove) = request.Data.BuildGoalEmployeeChanges(
        existingGoalEmployees, savedGoal.Id);

    await (
        goalEmployeeRepository.CreateManyAsync(toAdd, cancellationToken),
        goalEmployeeRepository.DeleteManyAsync(toRemove, cancellationToken)
    );

    return new SaveGoalCommandResult { GoalId = savedGoal.Id };
}
```

**Evidence**:

- Command handler: `src/Backend/TextSnippet/Growth.Application/UseCaseCommands/GoalManagement/SaveGoalCommand.cs:65-120`
- Validation: `src/Backend/TextSnippet/Growth.Application/UseCaseCommands/GoalManagement/SaveGoalCommand.cs:85-145`
- Repository: Uses `IPlatformQueryableRootRepository<Goal>`

**Step 4: Automatic Event Handlers** (platform triggers automatically on `CreateOrUpdateAsync`)

**Email Notification Handler** (`SendEmailOnCUDGoalEntityEventHandler.cs:25-60`)

```csharp
internal sealed class SendEmailOnCUDGoalEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Goal>
{
    // Filter: Only handle Created/Updated events (not Deleted)
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Goal> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created
            || @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Goal> @event, CancellationToken cancellationToken)
    {
        var goal = @event.EntityData;
        var recipients = await GetRecipients(goal, cancellationToken);

        await notificationService.SendEmailAsync(new EmailMessage
        {
            ToEmployeeIds = recipients,
            Subject = $"Goal {(@event.CrudAction == Created ? "Created" : "Updated")}: {goal.Title}",
            BodyTemplate = "GoalNotification",
            BodyParameters = new { GoalId = goal.Id, GoalTitle = goal.Title }
        });
    }
}
```

**History Log Handler** (`CreateHistoryLogOnGoalChangedEventHandler.cs:15-37`)

```csharp
internal sealed class CreateHistoryLogOnGoalChangedEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Goal>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Goal> @event)
        => @event.CrudAction != PlatformCqrsEntityEventCrudAction.Deleted;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Goal> @event, CancellationToken cancellationToken)
    {
        // Platform automatically tracks field changes via [TrackFieldUpdatedDomainEvent]
        var changedFields = @event.GetChangedFields();

        if (changedFields.Any())
        {
            await historyLogRepository.CreateAsync(new HistoryLog
            {
                EntityType = "Goal",
                EntityId = @event.EntityData.Id,
                ChangedFields = changedFields,
                ChangedBy = @event.RequestContext.UserId(),
                ChangedAt = Clock.UtcNow
            }, cancellationToken);
        }
    }
}
```

**Evidence**:

- Email handler: `src/Backend/TextSnippet/Growth.Application/UseCaseEvents/GoalManagement/SendEmailOnCUDGoalEntityEventHandler.cs:25-60`
- History handler: `src/Backend/TextSnippet/Growth.Application/UseCaseEvents/GoalManagement/CreateHistoryLogOnGoalChangedEventHandler.cs:15-37`

**Complete Flow Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Goal Creation Workflow                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  FRONTEND (Angular 19)                                                  │
│  ════════════════════════                                               │
│                                                                          │
│  1. User clicks "Create Goal"                                           │
│     ↓                                                                   │
│  2. GoalPermission.isActionAllowed(CanCreateGoal)                       │
│     ↓ [permission granted]                                              │
│  3. UpsertGoalFormComponent initializes                                 │
│     • 23 form controls with validators                                  │
│     • FormArray for KeyResults (if Objective type)                      │
│     • Dependent validations (startDate ↔ dueDate)                       │
│     ↓                                                                   │
│  4. User fills form and clicks "Save"                                   │
│     ↓                                                                   │
│  5. Form validation (sync + async)                                      │
│     ↓ [valid]                                                           │
│  6. POST /api/Goal (SaveGoalCommand)                                    │
│     │                                                                   │
│     └──────────────────────────────────────────────────────────────►   │
│                                                                          │
│  BACKEND (.NET 9 / MongoDB)                                             │
│  ═══════════════════════════                                            │
│                                                                          │
│  7. GoalController.Save() → Cqrs.SendAsync(SaveGoalCommand)             │
│     ↓                                                                   │
│  8. SaveGoalCommandHandler.ValidateRequestAsync()                       │
│     • Sync: Title, Dates, MeasurementType, ParentId validation          │
│     • Async: Parent goal exists, Owner employees exist, No externals    │
│     ↓ [valid]                                                           │
│  9. SaveGoalCommandHandler.HandleAsync()                                │
│     ├─ MapToNewGoal() or GetByIdAsync() + UpdateGoal()                  │
│     ├─ Set ProductScope, CompanyId, CreatedBy from RequestContext       │
│     ├─ goalRepository.CreateOrUpdateAsync(goal)  ← Auto-raises event    │
│     ├─ Sync GoalEmployee relationships (owners, watchers, approvers)    │
│     └─ Return { GoalId }                                                │
│     ↓                                                                   │
│ 10. Platform auto-raises PlatformCqrsEntityEvent<Goal>                  │
│     ├─ CrudAction: Created                                              │
│     ├─ EntityData: saved goal                                           │
│     └─ Triggers event handlers in parallel:                             │
│                                                                          │
│         ┌─────────────────────────────────────────┐                     │
│         │  SendEmailOnCUDGoalEntityEventHandler   │                     │
│         ├─────────────────────────────────────────┤                     │
│         │ • Get recipients (owners + watchers)    │                     │
│         │ • Send email via NotificationMessage    │                     │
│         │   service                                │                     │
│         └─────────────────────────────────────────┘                     │
│                                                                          │
│         ┌─────────────────────────────────────────┐                     │
│         │ CreateHistoryLogOnGoalChangedEvent...   │                     │
│         ├─────────────────────────────────────────┤                     │
│         │ • Extract changed fields                │                     │
│         │ • Create HistoryLog entry               │                     │
│         │   (all field changes tracked)           │                     │
│         └─────────────────────────────────────────┘                     │
│     ↓                                                                   │
│ 11. Return SaveGoalCommandResult to frontend                            │
│     │                                                                   │
│  ◄──┴──────────────────────────────────────────────────────────────    │
│     ↓                                                                   │
│ 12. Frontend: Show success message, reload goal list                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Goal Editing with Permissions

**Flow Overview**: User opens goal → Frontend calculates 23 permissions → Form fields enabled/disabled based on permissions → Save triggers same backend flow as creation

#### Permission Calculation

**Entry Point**: `goal.model.ts:GoalPermission` (560-789 lines)

**23 Granular Permissions** (GoalActionKey enum):

```typescript
export enum GoalActionKey {
    // Form Field Permissions
    CanUpdateTitle = 'CanUpdateTitle',
    CanUpdateDescription = 'CanUpdateDescription',
    CanUpdateGoalType = 'CanUpdateGoalType',
    CanUpdateGoalTargetType = 'CanUpdateGoalTargetType',
    CanUpdatePriority = 'CanUpdatePriority',
    CanUpdateStatus = 'CanUpdateStatus',
    CanUpdateStartDate = 'CanUpdateStartDate',
    CanUpdateDueDate = 'CanUpdateDueDate',
    CanUpdateMeasurement = 'CanUpdateMeasurement',
    CanUpdateVisibility = 'CanUpdateVisibility',
    CanUpdateOwners = 'CanUpdateOwners',
    CanUpdateWatchers = 'CanUpdateWatchers',
    CanUpdateApprovers = 'CanUpdateApprovers',
    CanUpdateKeyResults = 'CanUpdateKeyResults',
    CanUpdateLinkedReviews = 'CanUpdateLinkedReviews',
    CanUpdateLinkedCheckIns = 'CanUpdateLinkedCheckIns',

    // Action Permissions
    CanCreateGoal = 'CanCreateGoal',
    CanDeleteGoal = 'CanDeleteGoal',
    CanViewGoal = 'CanViewGoal',
    CanUpdateGoalProgress = 'CanUpdateGoalProgress',
    CanApproveGoal = 'CanApproveGoal',
    CanCommentOnGoal = 'CanCommentOnGoal',
    CanShareGoal = 'CanShareGoal'
}
```

**Permission Calculation Logic** (`goal.model.ts:620-750`)

```typescript
export class GoalPermission {
    public permissions: { [key in GoalActionKey]: boolean } = {} as any;

    constructor(
        private goal: Goal | null,
        private currentEmployee: Employee,
        private isCompanyAdmin: boolean,
        private isLineManager: boolean
    ) {
        this.calculatePermissions();
    }

    private calculatePermissions(): void {
        // Base permissions
        const isOwner = this.goal?.goalEmployees?.some(ge => ge.employeeId === this.currentEmployee.id && ge.role === GoalEmployeeRoles.Owner) ?? false;

        const isWatcher = this.goal?.goalEmployees?.some(ge => ge.employeeId === this.currentEmployee.id && ge.role === GoalEmployeeRoles.Watcher) ?? false;

        const isApprover = this.goal?.goalEmployees?.some(ge => ge.employeeId === this.currentEmployee.id && ge.role === GoalEmployeeRoles.Approver) ?? false;

        // Permission rules (Strategy Pattern)
        this.permissions = {
            // Create permission
            CanCreateGoal: this.isCompanyAdmin || this.isLineManager || true, // All employees can create

            // View permission
            CanViewGoal: this.canViewGoal(isOwner, isWatcher, isApprover),

            // Delete permission (only owner or admin)
            CanDeleteGoal: isOwner || this.isCompanyAdmin,

            // Field update permissions (owner or admin can update most fields)
            CanUpdateTitle: isOwner || this.isCompanyAdmin,
            CanUpdateDescription: isOwner || this.isCompanyAdmin,
            CanUpdateGoalType: false, // Cannot change type after creation
            CanUpdateGoalTargetType: isOwner || this.isCompanyAdmin,
            CanUpdatePriority: isOwner || this.isCompanyAdmin,
            CanUpdateStatus: isOwner || isApprover || this.isCompanyAdmin,
            CanUpdateStartDate: isOwner || this.isCompanyAdmin,
            CanUpdateDueDate: isOwner || this.isCompanyAdmin,
            CanUpdateMeasurement: isOwner || this.isCompanyAdmin,
            CanUpdateVisibility: isOwner || this.isCompanyAdmin,
            CanUpdateOwners: isOwner || this.isCompanyAdmin,
            CanUpdateWatchers: isOwner || this.isCompanyAdmin,
            CanUpdateApprovers: isOwner || this.isCompanyAdmin,
            CanUpdateKeyResults: isOwner || this.isCompanyAdmin,

            // Progress update (owner, watcher, or admin)
            CanUpdateGoalProgress: isOwner || isWatcher || this.isCompanyAdmin,

            // Approval permission (approver or admin)
            CanApproveGoal: isApprover || this.isCompanyAdmin,

            // Comment permission (anyone who can view)
            CanCommentOnGoal: this.canViewGoal(isOwner, isWatcher, isApprover),

            // Share permission (owner or admin)
            CanShareGoal: isOwner || this.isCompanyAdmin
        };
    }

    private canViewGoal(isOwner: boolean, isWatcher: boolean, isApprover: boolean): boolean {
        if (!this.goal) return true; // Creating new goal
        if (isOwner || isWatcher || isApprover || this.isCompanyAdmin) return true;

        // Check visibility rules
        switch (this.goal.visibility) {
            case GoalVisibilityTypes.Public:
                return true;
            case GoalVisibilityTypes.OnlyMe:
                return false;
            case GoalVisibilityTypes.MeAndManager:
                return this.isLineManager;
            case GoalVisibilityTypes.SpecificPeople:
                return this.goal.visibilityEmployeeIds?.includes(this.currentEmployee.id) ?? false;
            case GoalVisibilityTypes.ThisOrgUnit:
                return this.goal.visibilityOrgUnitIds?.includes(this.currentEmployee.orgUnitId!) ?? false;
            case GoalVisibilityTypes.ThisOrgUnitAndSubOrgs:
                return this.isInOrgUnitHierarchy(this.currentEmployee.orgUnitId!);
            default:
                return false;
        }
    }

    public static isActionAllowed(action: GoalActionKey, permissions: GoalPermission): boolean {
        return permissions.permissions[action] ?? false;
    }
}
```

**Evidence**:

- Permission model: `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.model.ts:620-750`
- Permission enum: `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.model.ts:560-582`

#### Form Field Disabling

**Entry Point**: `upsert-goal-form.component.ts:onPermissionsCalculated()`

```typescript
private onPermissionsCalculated(permissions: GoalPermission): void {
    // Disable fields based on permissions
    this.disableControlIf('title', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateTitle, permissions));
    this.disableControlIf('description', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateDescription, permissions));
    this.disableControlIf('goalType', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateGoalType, permissions));
    this.disableControlIf('priority', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdatePriority, permissions));
    this.disableControlIf('status', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateStatus, permissions));
    this.disableControlIf('startDate', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateStartDate, permissions));
    this.disableControlIf('dueDate', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateDueDate, permissions));
    this.disableControlIf('measurementType', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateMeasurement, permissions));
    this.disableControlIf('visibility', !GoalPermission.isActionAllowed(GoalActionKey.CanUpdateVisibility, permissions));

    // Show/hide delete button
    this.canDelete = GoalPermission.isActionAllowed(GoalActionKey.CanDeleteGoal, permissions);
}

private disableControlIf(controlName: keyof GoalFormVm, condition: boolean): void {
    if (condition) {
        this.formControls(controlName).disable();
    } else {
        this.formControls(controlName).enable();
    }
}
```

**Evidence**:

- Form component: `src/Frontend/libs/apps-domains/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts:450-480`

---

### Goal Deletion

**Flow Overview**: User clicks delete → Frontend confirms → Backend validates cascade rules → Deletes goal and relationships → Event handler sends notification

#### Frontend Flow

```typescript
// upsert-goal-form.component.ts
public async onDeleteGoal(): Promise<void> {
    const confirmed = await this.platformDialogService.confirm({
        title: 'Delete Goal',
        message: `Are you sure you want to delete "${this.currentVm().title}"?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
    });

    if (!confirmed) return;

    this.goalManagementApi.deleteGoal(this.currentVm().id!)
        .pipe(
            this.observerLoadingErrorState('deleteGoal'),
            this.tapResponse(
                () => {
                    this.showSuccessMessage('Goal deleted successfully');
                    this.dialogRef.close({ deleted: true });
                }
            ),
            this.untilDestroyed()
        )
        .subscribe();
}
```

#### Backend Flow

**Entry Point**: `DeleteGoalCommandHandler` (`DeleteGoalCommand.cs:45-91`)

```csharp
protected override async Task<DeleteGoalCommandResult> HandleAsync(
    DeleteGoalCommand request, CancellationToken cancellationToken)
{
    // Step 1: Get goal with related entities
    var goal = await goalRepository.GetByIdAsync(
        request.GoalId,
        cancellationToken,
        loadRelatedEntities: g => g.GoalEmployees, g => g.GoalCheckIns, g => g.GoalPerfReviews);

    if (goal == null)
        return new DeleteGoalCommandResult { Success = false, Message = "Goal not found" };

    // Step 2: Check if goal is an Objective with KeyResults
    var hasKeyResults = await goalRepository.AnyAsync(
        g => g.ParentId == request.GoalId,
        cancellationToken);

    if (hasKeyResults)
    {
        return new DeleteGoalCommandResult
        {
            Success = false,
            Message = "Cannot delete Objective with existing KeyResults. Delete KeyResults first."
        };
    }

    // Step 3: Delete goal (cascade deletes GoalEmployee via MongoDB cascade)
    await goalRepository.DeleteAsync(request.GoalId, cancellationToken);

    // Platform auto-raises PlatformCqrsEntityEvent with CrudAction=Deleted
    // → SendEmailOnCUDGoalEntityEventHandler sends notification

    return new DeleteGoalCommandResult { Success = true };
}
```

**Evidence**:

- Delete handler: `src/Backend/TextSnippet/Growth.Application/UseCaseCommands/GoalManagement/DeleteGoalCommand.cs:45-91`

#### Cascade Deletion on Employee Removal

**Event Handler**: `DeleteGoalOnDeleteEmployeeEntityEventHandler` (50 lines)

```csharp
internal sealed class DeleteGoalOnDeleteEmployeeEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Employee>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Deleted;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Employee> @event, CancellationToken cancellationToken)
    {
        var employeeId = @event.EntityData.Id;

        // Delete all goals where employee is the sole owner
        var goalsToDelete = await goalRepository.GetAllAsync(
            g => g.GoalEmployees.Any(ge => ge.EmployeeId == employeeId && ge.Role == GoalEmployeeRoles.Owner)
                && g.GoalEmployees.Count(ge => ge.Role == GoalEmployeeRoles.Owner) == 1,
            cancellationToken);

        await goalRepository.DeleteManyAsync(goalsToDelete, cancellationToken);

        // Remove employee from other goals (as watcher/approver)
        var goalEmployeesToRemove = await goalEmployeeRepository.GetAllAsync(
            ge => ge.EmployeeId == employeeId,
            cancellationToken);

        await goalEmployeeRepository.DeleteManyAsync(goalEmployeesToRemove, cancellationToken);
    }
}
```

**Evidence**:

- Cascade handler: `src/Backend/TextSnippet/Growth.Application/UseCaseEvents/GoalManagement/DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50`

---

### Goal List & Dashboard

**Flow Overview**: User navigates to goals page → Frontend initializes store with query → Backend builds complex query with filters → Returns paged results + stats

#### Frontend Flow

**Entry Point**: `goal-management.component.ts` + `goal-management.store.ts`

**Step 1: Store Initialization** (`goal-management.store.ts:81-99`)

```typescript
@Injectable()
export class GoalManagementVmStore extends PlatformVmStore<GoalManagementState> {
    protected beforeInitVm = () => {
        this.loadGoals(this.query$); // Load paged goal list
        this.loadGoalTypeCount(this.query$); // Load view type counts
        this.loadGoalSummaryCount(this.query$); // Load stats (total, by status)
    };

    public override initOrReloadVm = (isReload: boolean) => {
        return combineLatest([
            this.loadGoals(this.currentState().pagedQuery, isReload),
            this.loadGoalTypeCount(this.currentState().pagedQuery, isReload),
            this.loadGoalSummaryCount(this.currentState().pagedQuery, isReload)
        ]);
    };
}
```

**Step 2: Query Building** (`get-goal-list.query.ts:45-204`)

```typescript
export class GetGoalListQuery extends PlatformCqrsPagedQuery {
    public viewType: GoalViewType = GoalViewType.MyGoals; // MyGoals|MyDirectReports|SharedWithMe|All
    public searchText: string | null = null;
    public statuses: GoalStatuses[] = [];
    public goalTypes: GoalTypes[] = [];
    public goalTargetTypes: GoalTargetTypes[] = [];
    public priorities: GoalPriorities[] = [];
    public ownerEmployeeIds: string[] = [];
    public ownerOrgUnitIds: string[] = [];
    public goalDueStatuses: GoalDueStatus[] = []; // PastDue|UpComing
    public dueDate: { from: Date | null; to: Date | null } | null = null;
    public goalOrgUnitIds: string[] = [];

    // Fluent API for immutable updates
    public withSearchText(searchText: string | null): GetGoalListQuery {
        return new GetGoalListQuery({ ...this, searchText, pageIndex: 0 });
    }

    public withStatuses(statuses: GoalStatuses[]): GetGoalListQuery {
        return new GetGoalListQuery({ ...this, statuses, pageIndex: 0 });
    }

    public withViewType(viewType: GoalViewType): GetGoalListQuery {
        return new GetGoalListQuery({ ...this, viewType, pageIndex: 0 });
    }

    public withDueDate(dateRange: DateRange, label: PeriodFilterLabel): GetGoalListQuery {
        return new GetGoalListQuery({
            ...this,
            dueDate: { from: dateRange.from, to: dateRange.to },
            pageIndex: 0
        });
    }
}
```

**Step 3: Deep Linking Support** (`goal-management.store.ts:161-246`)

```typescript
// Parse URL query params: ?statuses=Completed,Progressing&dueDate=2025-01-15&viewType=MyDirectReports
public setUpStoreFromQueryParams(queryParams: {
    goalViewType?: GoalViewType | null;
    dueDate?: Date | null;
    statuses?: string | GoalStatuses[] | null;
    goalDueStatuses?: string | GoalDueStatus[] | null;
    ownerOrgUnitIds?: string[] | null;
    goalTargetTypes?: string | GoalTargetTypes[] | null;
}) {
    let toUpdateQuery = new GetGoalListQuery().withPageIndex(0);

    // Parse statuses: "Completed,Progressing" → [GoalStatuses.Completed, GoalStatuses.Progressing]
    if (queryParams.statuses != undefined) {
        const statusArray = typeof queryParams.statuses === 'string'
            ? queryParams.statuses.split(',').map(s => s.trim() as GoalStatuses)
            : queryParams.statuses;
        toUpdateQuery = toUpdateQuery.withStatuses(statusArray);
    }

    // Parse due date
    if (queryParams.dueDate != undefined) {
        const dueDateRange = [
            date_setToStartOfDay(queryParams.dueDate),
            date_setToEndOfDay(queryParams.dueDate)
        ];
        toUpdateQuery = toUpdateQuery.withDueDate(
            DateRange.fromArray(dueDateRange),
            PeriodFilterLabel.DATE_RANGE
        );
    }

    this.updateState({ pagedQuery: toUpdateQuery });
}
```

**Evidence**:

- Store: `src/Frontend/libs/apps-domains/src/goal/components/goal-management/goal-management.store.ts:81-246`
- Query DTO: `src/Frontend/libs/apps-domains/src/goal/query-dtos/get-goal-list.query.ts:45-204`

#### Backend Flow

**Entry Point**: `GetGoalListQueryHandler` (`GetGoalListQuery.cs:55-156`)

**Query Building with Helper** (`GetGoalListQueryHelper.cs:35-127`)

```csharp
public static class GetGoalListQueryHelper
{
    public static Func<IUnitOfWork, IQueryable<Goal>, IQueryable<Goal>> BuildListGoalExpression(
        GetGoalListQuery request,
        IPlatformApplicationRequestContext requestContext,
        IPlatformFullTextSearchPersistenceService fullTextSearchService)
    {
        return (uow, query) => query
            // Base filter: Company and ProductScope
            .Where(Goal.OfCompanyExpr(requestContext.ProductScope(), requestContext.CurrentCompanyId()))

            // View type filter (MyGoals, MyDirectReports, SharedWithMe, All)
            .PipeIf(
                request.ViewType == GoalViewType.MyGoals,
                q => q.Where(g => g.GoalEmployees.Any(ge =>
                    ge.EmployeeId == requestContext.CurrentEmployeeId()
                    && ge.Role == GoalEmployeeRoles.Owner)))
            .PipeIf(
                request.ViewType == GoalViewType.MyDirectReports,
                q => q.Where(g => g.GoalEmployees.Any(ge =>
                    requestContext.DirectReportIds.Contains(ge.EmployeeId)
                    && ge.Role == GoalEmployeeRoles.Owner)))
            .PipeIf(
                request.ViewType == GoalViewType.SharedWithMe,
                q => q.Where(g => g.GoalEmployees.Any(ge =>
                    ge.EmployeeId == requestContext.CurrentEmployeeId()
                    && ge.Role != GoalEmployeeRoles.Owner)))

            // Status filter
            .WhereIf(
                request.Statuses.Any(),
                Goal.FilterByStatusesExpr(request.Statuses))

            // Goal type filter
            .WhereIf(
                request.GoalTypes.Any(),
                Goal.FilterByGoalTypesExpr(request.GoalTypes))

            // Goal target type filter
            .WhereIf(
                request.GoalTargetTypes.Any(),
                Goal.FilterByGoalTargetTypesExpr(request.GoalTargetTypes))

            // Owner filter
            .WhereIf(
                request.OwnerEmployeeIds.Any(),
                Goal.FilterByOwnerEmployeeIdsExpr(request.OwnerEmployeeIds))

            // Due date filter
            .WhereIf(
                request.DueDate != null,
                g => g.DueDate.HasValue
                  && g.DueDate.Value >= request.DueDate.From
                  && g.DueDate.Value <= request.DueDate.To)

            // Overdue/Upcoming filter
            .WhereIf(
                request.GoalDueStatuses.Contains(GoalDueStatus.PastDue),
                Goal.IsOverdueExpr())
            .WhereIf(
                request.GoalDueStatuses.Contains(GoalDueStatus.UpComing),
                g => g.DueDate.HasValue
                  && g.DueDate.Value >= Clock.UtcNow
                  && g.DueDate.Value <= Clock.UtcNow.AddDays(7))

            // Full-text search (searches Title, Description, OwnerNames)
            .PipeIf(
                request.SearchText.IsNotNullOrEmpty(),
                q => fullTextSearchService.Search(
                    q,
                    request.SearchText,
                    Goal.DefaultFullTextSearchColumns(),
                    fullTextAccurateMatch: true,
                    includeStartWithProps: Goal.DefaultFullTextSearchColumns()));
    }
}
```

**Handler Execution** (`GetGoalListQueryHandler.cs:75-125`)

```csharp
protected override async Task<GetGoalListQueryResult> HandleAsync(
    GetGoalListQuery request, CancellationToken cancellationToken)
{
    var queryBuilder = GetGoalListQueryHelper.BuildListGoalExpression(
        request, RequestContext, fullTextSearchService);

    // Parallel tuple query: count + paged items
    var (totalCount, pagedGoals) = await (
        goalRepository.CountAsync((uow, q) => queryBuilder(uow, q), cancellationToken),
        goalRepository.GetAllAsync(
            (uow, q) => queryBuilder(uow, q)
                .OrderByDescending(g => g.CreatedDate)
                .PageBy(request.SkipCount, request.MaxResultCount),
            cancellationToken,
            loadRelatedEntities: g => g.GoalEmployees, g => g.Parent)
    );

    return new GetGoalListQueryResult(pagedGoals, totalCount, request);
}
```

**Evidence**:

- Query handler: `src/Backend/TextSnippet/Growth.Application/UseCaseQueries/GoalManagement/GetGoalListQuery.cs:75-125`
- Query helper: `src/Backend/TextSnippet/Growth.Application/Helpers/GetGoalListQueryHelper.cs:35-127`

---

### Permissions & Visibility

Covered in detail in [Goal Editing with Permissions](#goal-editing-with-permissions) section above.

**Key Points**:

- **23 granular permissions** control field-level access (GoalActionKey enum)
- **6 visibility types** control who can view goals (GoalVisibilityTypes enum)
- **Role-based access**: Owner, Watcher, Approver, Admin roles with different permission sets
- **Visibility rules**: Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, ThisOrgUnitAndSubOrgs
- **Frontend enforcement**: Form fields disabled based on `GoalPermission.isActionAllowed()`
- **Backend validation**: Permission checks in command handlers (async validation)

---

### Notifications & Reminders

#### Email Notifications (Event-Driven)

**Trigger**: Automatic on Create/Update/Delete via `PlatformCqrsEntityEvent`

**Handler**: `SendEmailOnCUDGoalEntityEventHandler` (60 lines)

```csharp
internal sealed class SendEmailOnCUDGoalEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Goal>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Goal> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created
            || @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Goal> @event, CancellationToken cancellationToken)
    {
        var goal = @event.EntityData;
        var action = @event.CrudAction == Created ? "created" : "updated";

        // Get recipients: owners + watchers + approvers
        var recipients = await goalEmployeeRepository
            .GetAllAsync(ge => ge.GoalId == goal.Id, cancellationToken)
            .ThenSelect(ge => ge.EmployeeId)
            .ThenDistinct();

        // Send email via NotificationMessage service
        await notificationMessageService.SendEmailAsync(new EmailNotificationRequest
        {
            ToEmployeeIds = recipients.ToList(),
            Subject = $"Goal {action}: {goal.Title}",
            BodyTemplate = "GoalNotification",
            BodyParameters = new Dictionary<string, object>
            {
                ["GoalId"] = goal.Id,
                ["GoalTitle"] = goal.Title,
                ["Action"] = action,
                ["DueDate"] = goal.DueDate?.ToString("yyyy-MM-dd") ?? "N/A"
            }
        });
    }
}
```

**Evidence**:

- Email handler: `src/Backend/TextSnippet/Growth.Application/UseCaseEvents/GoalManagement/SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

#### Deadline Reminders (Background Job)

**Schedule**: Daily at 9 AM (Cron: `0 9 * * *`)

**Job**: `GoalDeadlinesSendReminderBackgroundJobExecutor` (107 lines)

```csharp
[PlatformRecurringJob("0 9 * * *", queue: BackgroundJobQueue.Normal)]
public sealed class GoalDeadlinesSendReminderBackgroundJobExecutor
    : PlatformApplicationBatchScrollingBackgroundJobExecutor<Goal, string>
{
    protected override int BatchKeyPageSize => 20;  // Companies per batch
    protected override int BatchPageSize => 50;     // Goals per company

    protected override IQueryable<Goal> EntitiesQueryBuilder(
        IQueryable<Goal> query, object? param, string? companyId = null)
    {
        return query
            .Where(g => g.CompanyId == companyId)
            .Where(g => g.DueDate.HasValue)
            .Where(g => g.DueDate.Value >= Clock.UtcNow && g.DueDate.Value <= Clock.UtcNow.AddDays(7))
            .Where(g => g.Status != GoalStatuses.Completed && g.Status != GoalStatuses.Canceled);
    }

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<Goal> query, object? param, string? companyId = null)
    {
        return EntitiesQueryBuilder(query, param, companyId)
            .Select(g => g.CompanyId)
            .Distinct();
    }

    protected override async Task ProcessEntitiesAsync(
        List<Goal> goals, string companyId, object? param, IServiceProvider serviceProvider)
    {
        foreach (var goal in goals)
        {
            var owners = await goalEmployeeRepository.GetAllAsync(
                ge => ge.GoalId == goal.Id && ge.Role == GoalEmployeeRoles.Owner);

            if (owners.Any())
            {
                await notificationMessageService.SendEmailAsync(new EmailNotificationRequest
                {
                    ToEmployeeIds = owners.Select(o => o.EmployeeId).ToList(),
                    Subject = $"Reminder: Goal due in {(goal.DueDate!.Value - Clock.UtcNow).Days} days",
                    BodyTemplate = "GoalDeadlineReminder",
                    BodyParameters = new Dictionary<string, object>
                    {
                        ["GoalTitle"] = goal.Title,
                        ["DueDate"] = goal.DueDate.Value.ToString("yyyy-MM-dd"),
                        ["DaysRemaining"] = (goal.DueDate.Value - Clock.UtcNow).Days
                    }
                });
            }
        }
    }
}
```

**Evidence**:

- Background job: `src/Backend/TextSnippet/Growth.Application/BackgroundJobExecutors/GoalManagement/GoalDeadlinesSendReminderBackgroundJobExecutor.cs:35-107`

---

### Integrations (Performance Review, Check-In)

#### Performance Review Integration

**Entity**: `GoalPerformanceReviewParticipant` (47 lines)

**Purpose**: Links goals to performance review participants for goal-based evaluations.

**Workflow**:

1. User creates performance review cycle
2. Admin links employee goals to review participants
3. During review, reviewers can see linked goals and assess progress
4. Goal progress (CurrentValue, Status) feeds into performance ratings

**Evidence**:

- Entity: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/GoalPerformanceReviewParticipant.cs:15-47`

#### Check-In Integration

**Entity**: `GoalCheckIn` (37 lines)

**Purpose**: Links goals to recurring check-in events for progress tracking.

**Workflow**:

1. Employee creates recurring check-in (e.g., weekly 1:1 with manager)
2. Employee links goals to check-in event
3. During check-in, employee updates goal progress (CurrentValue)
4. Updates are tracked via `UpdateGoalCurrentValueMeasurementCommand`
5. Progress history is logged for trend analysis

**Command**: `UpdateGoalCurrentValueMeasurementCommand` (72 lines)

```csharp
public sealed class UpdateGoalCurrentValueMeasurementCommand : PlatformCqrsCommand<UpdateGoalCurrentValueMeasurementCommandResult>
{
    public string GoalId { get; set; } = string.Empty;
    public decimal NewCurrentValue { get; set; }
    public string? CheckInEventId { get; set; } // Optional: link to check-in event
}

internal sealed class UpdateGoalCurrentValueMeasurementCommandHandler
    : PlatformCqrsCommandApplicationHandler<UpdateGoalCurrentValueMeasurementCommand, UpdateGoalCurrentValueMeasurementCommandResult>
{
    protected override async Task<UpdateGoalCurrentValueMeasurementCommandResult> HandleAsync(
        UpdateGoalCurrentValueMeasurementCommand request, CancellationToken cancellationToken)
    {
        var goal = await goalRepository.GetByIdAsync(request.GoalId, cancellationToken)
            .EnsureFound($"Goal not found: {request.GoalId}");

        // Update current value
        goal.CurrentValue = request.NewCurrentValue;

        // Auto-calculate progress
        if (goal.TargetValue.HasValue && goal.StartValue.HasValue)
        {
            goal.Progress = (goal.CurrentValue - goal.StartValue.Value)
                          / (goal.TargetValue.Value - goal.StartValue.Value) * 100;
        }

        // Link to check-in if provided
        if (request.CheckInEventId.IsNotNullOrEmpty())
        {
            await goalCheckInRepository.CreateAsync(new GoalCheckIn
            {
                GoalId = goal.Id,
                CheckInEventId = request.CheckInEventId,
                UpdatedValue = request.NewCurrentValue,
                UpdatedDate = Clock.UtcNow
            }, cancellationToken);
        }

        await goalRepository.UpdateAsync(goal, cancellationToken);

        return new UpdateGoalCurrentValueMeasurementCommandResult { Success = true };
    }
}
```

**Evidence**:

- Check-in entity: `src/Backend/TextSnippet/Growth.Domain/Entities/GoalManagement/GoalCheckIn.cs:15-37`
- Update command: `src/Backend/TextSnippet/Growth.Application/UseCaseCommands/GoalManagement/UpdateGoalCurrentValueMeasurementCommand.cs:25-72`

## API Reference

**Base URL**: `{apiUrl}/api/Goal`

**Location**: `src/Backend/TextSnippet/Growth.Service/Controllers/GoalController.cs` (103 lines)

### Endpoints

| Method | Endpoint                      | Command/Query                              | Description                                 |
| ------ | ----------------------------- | ------------------------------------------ | ------------------------------------------- |
| POST   | `/`                           | `SaveGoalCommand`                          | Create or update a goal                     |
| DELETE | `/{goalId}`                   | `DeleteGoalCommand`                        | Delete a goal by ID                         |
| GET    | `/`                           | `GetGoalListQuery`                         | Get paginated goal list with filters        |
| GET    | `/{goalId}`                   | `GetGoalDetailByIdQuery`                   | Get single goal by ID with related entities |
| GET    | `/dashboard/employee`         | `GetGoalDashboardEmployeeQuery`            | Get employee dashboard data                 |
| GET    | `/dashboard/summary`          | `GetGoalDashboardSummaryQuery`             | Get stats aggregation (total, by status)    |
| GET    | `/visibility`                 | `GetGoalVisibilityQuery`                   | Get visibility options for dropdown         |
| GET    | `/validate/can-create`        | `ValidateCurrentEmployeeCanCreateGoal`     | Check if current user can create goals      |
| GET    | `/type-count`                 | `GetGoalTypeCountQuery`                    | Get goal counts by view type                |
| POST   | `/update-current-value`       | `UpdateGoalCurrentValueMeasurementCommand` | Update goal progress (current value)        |
| GET    | `/linked-performance-reviews` | `GetLinkedPerformanceReviewsQuery`         | Get performance reviews linked to goals     |
| GET    | `/linked-check-ins`           | `GetLinkedCheckInsQuery`                   | Get check-ins linked to goals               |
| POST   | `/link-performance-review`    | `LinkGoalToPerformanceReviewCommand`       | Link goal to performance review participant |
| POST   | `/link-check-in`              | `LinkGoalToCheckInCommand`                 | Link goal to check-in event                 |
| DELETE | `/unlink-performance-review`  | `UnlinkGoalFromPerformanceReviewCommand`   | Unlink goal from performance review         |

**Evidence**: Controller with 15 endpoints at `src/Backend/TextSnippet/Growth.Service/Controllers/GoalController.cs:25-103`

### Request/Response Examples

#### 1. Create Goal (POST /)

**Request**: `SaveGoalCommand`

```json
{
    "data": {
        "id": null,
        "title": "Increase customer satisfaction score",
        "description": "Improve NPS from 75 to 85",
        "goalType": "Smart",
        "goalTargetType": "Individual",
        "measurementType": "Numeric",
        "startValue": 75,
        "targetValue": 85,
        "currentValue": 75,
        "startDate": "2025-01-01T00:00:00Z",
        "dueDate": "2025-12-31T23:59:59Z",
        "priority": "High",
        "status": "NotStarted",
        "visibility": "MeAndManager",
        "ownerEmployeeIds": ["emp123"],
        "watcherEmployeeIds": ["emp456"],
        "approverEmployeeIds": []
    }
}
```

**Response**: `SaveGoalCommandResult`

```json
{
    "goalId": "01JGZX5K7M9N2P3Q4R5S6T7V8W",
    "success": true
}
```

#### 2. Create OKR Objective with KeyResults (POST /)

**Request**: `SaveGoalCommand`

```json
{
    "data": {
        "title": "Launch new product successfully",
        "goalType": "Objective",
        "goalTargetType": "Company",
        "startDate": "2025-Q1",
        "dueDate": "2025-Q4",
        "priority": "High",
        "status": "NotStarted",
        "visibility": "Public",
        "ownerEmployeeIds": ["emp123"],
        "keyResults": [
            {
                "title": "Achieve 10,000 sign-ups",
                "measurementType": "Numeric",
                "startValue": 0,
                "targetValue": 10000
            },
            {
                "title": "Reach 80% customer satisfaction",
                "measurementType": "Percentage",
                "startValue": 0,
                "targetValue": 80
            },
            {
                "title": "Generate $500K revenue",
                "measurementType": "Currency",
                "startValue": 0,
                "targetValue": 500000
            }
        ]
    }
}
```

#### 3. Get Goal List with Filters (GET /)

**Request**: `GetGoalListQuery` (query params)

```
GET /api/Goal?viewType=MyGoals&statuses=Progressing,AtRisk&searchText=customer&maxResultCount=20&skipCount=0&orderBy=DueDate&orderDirection=Desc
```

**Response**: `GetGoalListQueryResult`

```json
{
    "items": [
        {
            "id": "01JGZX5K7M9N2P3Q4R5S6T7V8W",
            "title": "Increase customer satisfaction score",
            "status": "Progressing",
            "progress": 60,
            "dueDate": "2025-12-31T23:59:59Z",
            "isOverdue": false,
            "owners": [{ "id": "emp123", "fullName": "John Doe" }]
        }
    ],
    "totalCount": 1
}
```

#### 4. Update Goal Progress (POST /update-current-value)

**Request**: `UpdateGoalCurrentValueMeasurementCommand`

```json
{
    "goalId": "01JGZX5K7M9N2P3Q4R5S6T7V8W",
    "newCurrentValue": 80,
    "checkInEventId": "checkin123"
}
```

**Response**: `UpdateGoalCurrentValueMeasurementCommandResult`

```json
{
    "success": true,
    "progress": 66.67
}
```

### Query Filters Reference

**GetGoalListQuery** supports 12 filter dimensions:

| Filter             | Type                | Description                                        |
| ------------------ | ------------------- | -------------------------------------------------- |
| `viewType`         | `GoalViewType`      | MyGoals, MyDirectReports, SharedWithMe, All        |
| `searchText`       | `string`            | Full-text search (Title, Description, Owner names) |
| `statuses`         | `GoalStatuses[]`    | Filter by status (NotStarted, Progressing, etc.)   |
| `goalTypes`        | `GoalTypes[]`       | Filter by type (Smart, Objective, KeyResult)       |
| `goalTargetTypes`  | `GoalTargetTypes[]` | Filter by target (Individual, Company, Department) |
| `priorities`       | `GoalPriorities[]`  | Filter by priority (High, Medium, Low)             |
| `ownerEmployeeIds` | `string[]`          | Filter by owner employee IDs                       |
| `ownerOrgUnitIds`  | `string[]`          | Filter by owner's org unit IDs                     |
| `goalDueStatuses`  | `GoalDueStatus[]`   | Filter by due status (PastDue, UpComing)           |
| `dueDate`          | `{ from, to }`      | Filter by due date range                           |
| `goalOrgUnitIds`   | `string[]`          | Filter by goal's org unit IDs                      |
| `orderBy`          | `GoalOrderBy`       | Sort by: Title, Owner, DueDate, Status, Progress   |
| `orderDirection`   | `OrderDirection`    | Asc, Desc                                          |
| `pageIndex`        | `number`            | Zero-based page index                              |
| `maxResultCount`   | `number`            | Page size (default: 20)                            |

**Evidence**: Query DTO at `src/Frontend/libs/apps-domains/src/goal/query-dtos/get-goal-list.query.ts:45-204`

---

## Permission System

The Goal Management feature implements a **23-permission field-level access control system** combining role-based and ownership-based checks.

### Permission Matrix

| Permission                  | Owner | Watcher | Approver | Admin | Public | Line Manager |
| --------------------------- | ----- | ------- | -------- | ----- | ------ | ------------ |
| **CanCreateGoal**           | ✅     | ✅       | ✅        | ✅     | ✅      | ✅            |
| **CanViewGoal**             | ✅     | ✅       | ✅        | ✅     | \*     | \*           |
| **CanDeleteGoal**           | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateTitle**          | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateDescription**    | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateGoalType**       | ❌     | ❌       | ❌        | ❌     | ❌      | ❌            |
| **CanUpdateGoalTargetType** | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdatePriority**       | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateStatus**         | ✅     | ❌       | ✅        | ✅     | ❌      | ❌            |
| **CanUpdateStartDate**      | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateDueDate**        | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateMeasurement**    | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateVisibility**     | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateOwners**         | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateWatchers**       | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateApprovers**      | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateKeyResults**     | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |
| **CanUpdateGoalProgress**   | ✅     | ✅       | ❌        | ✅     | ❌      | ❌            |
| **CanApproveGoal**          | ❌     | ❌       | ✅        | ✅     | ❌      | ❌            |
| **CanCommentOnGoal**        | ✅     | ✅       | ✅        | ✅     | \*     | \*           |
| **CanShareGoal**            | ✅     | ❌       | ❌        | ✅     | ❌      | ❌            |

**Legend**:

- ✅ = Permission granted
- ❌ = Permission denied
- \* = Depends on visibility type (see Visibility Rules below)

### Visibility Rules

**CanViewGoal** permission depends on the goal's visibility setting:

| Visibility Type           | Who Can View                                           |
| ------------------------- | ------------------------------------------------------ |
| **Public**                | All employees in the company                           |
| **OnlyMe**                | Owner only                                             |
| **MeAndManager**          | Owner + Owner's line manager                           |
| **SpecificPeople**        | Owner + Employees in `visibilityEmployeeIds` list      |
| **ThisOrgUnit**           | Owner + Employees in same org unit                     |
| \*\*ThisOrgUnitAndSubOrgs | Owner + Employees in same org unit and child org units |

**Evidence**:

- Permission model: `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.model.ts:620-750`
- Permission enum (23 actions): `src/Frontend/libs/apps-domains/src/goal/domain-models/goal.model.ts:560-582`

**For detailed implementation**, see [Goal Editing with Permissions](#goal-editing-with-permissions) workflow.

---

## Frontend Components

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                  Frontend Component Hierarchy                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  GoalOverviewComponent (Dashboard)                       │      │
│  │  • Stats cards (total, by status)                        │      │
│  │  • Embeds GoalManagementComponent below                  │      │
│  └──────────────────────────────────────────────────────────┘      │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  GoalManagementComponent (Container)                     │      │
│  │  • Uses GoalManagementStore for state                    │      │
│  │  • Manages filters, search, pagination                   │      │
│  │  • Renders GoalTableComponent                            │      │
│  └──────────────────────────────────────────────────────────┘      │
│                           │                                          │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  GoalTableComponent (Presentation)                       │      │
│  │  • Displays goal list in table format                    │      │
│  │  • Emits row click events                                │      │
│  └──────────────────────────────────────────────────────────┘      │
│                           │                                          │
│                           ▼ (on row click or create button)         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  UpsertGoalFormComponent (Modal Dialog)                  │      │
│  │  • Complex form with 23 permission-based fields          │      │
│  │  • FormArray for KeyResults (drag-drop reorder)          │      │
│  │  • Dependent validation (dates, values)                  │      │
│  │  • Async validators (employee exists)                    │      │
│  └──────────────────────────────────────────────────────────┘      │
│                           │                                          │
│                           │ (Alternative: Slide panel)              │
│                           ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │  GoalDetailPanelComponent (Slide Panel)                  │      │
│  │  • View goal details in right-side panel                 │      │
│  │  • Quick edit current value                              │      │
│  │  • View linked check-ins & performance reviews           │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Reference

#### 1. GoalManagementComponent

**Location**: `src/Frontend/libs/apps-domains/src/goal/components/goal-management/goal-management.component.ts` (280 lines)

**Purpose**: Container component for goal list page with state management, filtering, and pagination.

**Key Properties**:

```typescript
export class GoalManagementComponent extends AppBaseVmStoreComponent<GoalManagementState, GoalManagementVmStore> {
    @Input() public forManagement: boolean = true; // true = company app, false = employee app
    @Input() public defaultViewType?: GoalViewType; // MyGoals | MyDirectReports | SharedWithMe | All

    // Computed from store
    public goals: Signal<Goal[]> = computed(() => this.vm()?.pagedResult?.items ?? []);
    public pageInfo: Signal<IPageInfo> = computed(() => this.vm()?.pageInfo);
    public goalTypeCounter: Signal<Dictionary<number>> = computed(() => this.vm()?.goalTypeCounter);
    public goalStats: Signal<GoalStats> = computed(() => this.vm()?.goalStats);
}
```

**Key Methods**:

```typescript
public setSearchText(searchText: string | null): void; // Debounced search (300ms)
public setViewType(viewType: GoalViewType): void; // Switch view type
public setQueryFilter(filter: GoalFilterDataModel): void; // Apply filters
public onPageChange(pageIndex: number): void; // Pagination
public openCreateGoalDialog(): void; // Open create form modal
public openGoalDetailPanelDialog(goalId: string, parentGoalId?: string): void; // Open detail panel
```

**Usage**:

```typescript
// In company app
<app-goal-management [forManagement]="true" [defaultViewType]="GoalViewType.MyDirectReports" />

// In employee app
<app-goal-management [forManagement]="false" [defaultViewType]="GoalViewType.MyGoals" />
```

**Evidence**: `src/Frontend/libs/apps-domains/src/goal/components/goal-management/goal-management.component.ts:45-280`

#### 2. GoalManagementStore

**Location**: `src/Frontend/libs/apps-domains/src/goal/components/goal-management/goal-management.store.ts` (260 lines)

**Purpose**: NgRx-style reactive state management for goal list with automatic cache persistence.

**State Shape**:

```typescript
export class GoalManagementState extends PlatformVm {
    public pageInfo: IPageInfo;
    @WatchWhenValuesDiff('onQueryChanged') public pagedQuery: GetGoalListQuery;
    @WatchWhenValuesDiff('onPagedResultChanged')
    public pagedResult: PlatformPagedResultDto<Goal>;
    public goalTypeCounter: Dictionary<number>; // Counts by view type
    public goalStats: GoalStats; // Total, by status
    public selectedGoalId: string | null;
    public selectedParentGoalId: string | null;
}
```

**Key Methods**:

```typescript
public setPageIndex(pageIndex: number): void;
public setViewType(viewType: string): void;
public setSearchText(searchText: string | null): void;
public setQueryFilter(filterValue: GoalFilterDataModel): void;
public setSelectedGoalId(selectedGoal: Goal | null): void;
public setUpStoreFromQueryParams(queryParams: {...}): void; // Deep linking support
```

**Evidence**: `src/Frontend/libs/apps-domains/src/goal/components/goal-management/goal-management.store.ts:22-260`

#### 3. UpsertGoalFormComponent

**Location**: `src/Frontend/libs/apps-domains/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts` (865 lines)

**Purpose**: Complex reactive form for create/edit/view goal with 23 permission-based field controls.

**Key Features**:

- **FormArray for KeyResults**: Drag-drop reorder support via Angular CDK
- **Permission-Based Fields**: 23 fields enabled/disabled based on `GoalPermission.isActionAllowed()`
- **Dependent Validation**: Changes to `measurementType` revalidate `startValue` & `targetValue`
- **Async Validators**: `checkEmployeeExistsValidator` for owner/watcher/approver IDs
- **Cross-Field Validators**: `startEndValidator` for date range validation

**Form Structure**:

```typescript
protected initialFormConfig = (): PlatformFormConfig<GoalFormVm> => ({
    controls: {
        title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
        goalType: new FormControl(vm.goalType, [Validators.required]),
        // ... 23 total controls
        keyResults: {
            modelItems: () => vm.keyResults ?? [],
            itemControl: (keyResult, index) => new FormGroup({
                title: new FormControl(keyResult.title, [Validators.required]),
                targetValue: new FormControl(keyResult.targetValue, [Validators.required])
            })
        }
    },
    dependentValidations: {
        measurementType: ['startValue', 'targetValue'],
        visibility: ['visibilityEmployeeIds', 'visibilityOrgUnitIds']
    }
});
```

**Evidence**: `src/Frontend/libs/apps-domains/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts:120-865`

#### 4. GoalDetailPanelComponent

**Location**: `src/Frontend/libs/apps-domains/src/goal/components/goal-detail-panel/goal-detail-panel.component.ts` (366 lines)

**Purpose**: Slide-in side panel for viewing goal details and quick progress updates.

**Key Features**:

- **Slide Panel**: Opens from right side via `platformDialogService.openPanelDialogRef()`
- **Quick Edit**: Update current value without full form
- **Linked Entities**: Display linked check-ins and performance reviews
- **Parent/Child**: Show parent Objective for KeyResults

**Evidence**: `src/Frontend/libs/apps-domains/src/goal/components/goal-detail-panel/goal-detail-panel.component.ts:45-366`

#### 5. GoalOverviewComponent

**Location**: `src/Frontend/apps/growth-for-company/src/app/routes/goals/goal-overview.component.ts` (286 lines)

**Purpose**: Dashboard component with stats cards + embedded goal management table.

**Key Features**:

- **Stats Cards**: Total goals, by status (Progressing, Behind, AtRisk, Overdue)
- **Filters**: Department, date range, status multi-select
- **Export**: CSV/Excel export functionality
- **Embeds**: `<app-goal-management>` component below stats

**Evidence**: `src/Frontend/apps/growth-for-company/src/app/routes/goals/goal-overview.component.ts:45-286`

---

## Backend Controllers

### GoalController

**Location**: `src/Backend/TextSnippet/Growth.Service/Controllers/GoalController.cs`

| Action               | Method | Route                                            | Command/Query                             |
| -------------------- | ------ | ------------------------------------------------ | ----------------------------------------- |
| GetList              | POST   | `/api/Goal/GetGoalList`                          | GetGoalListQuery                          |
| GetDetail            | GET    | `/api/Goal/GetGoalDetailById`                    | GetGoalDetailByIdQuery                    |
| Save                 | POST   | `/api/Goal/SaveGoal`                             | SaveGoalCommand                           |
| Delete               | DELETE | `/api/Goal/DeleteGoal`                           | DeleteGoalCommand                         |
| UpdateMeasurement    | POST   | `/api/Goal/UpdateGoalCurrentValueMeasurement`    | UpdateGoalCurrentValueMeasurementCommand  |
| GetDashboard         | GET    | `/api/Goal/GetGoalDashboardSummary`              | GetGoalDashboardSummaryQuery              |
| GetEmployeeDashboard | GET    | `/api/Goal/GetGoalDashboardEmployee`             | GetGoalDashboardEmployeeQuery             |
| GetVisibility        | GET    | `/api/Goal/GetGoalVisibility`                    | GetGoalVisibilityQuery                    |
| ValidateCreate       | GET    | `/api/Goal/ValidateCurrentEmployeeCanCreateGoal` | ValidateCurrentEmployeeCanCreateGoalQuery |

**Authorization**: All endpoints require `[PlatformAuthorize]` with JWT Bearer token.

**Evidence**: `GoalController.cs:1-103`

---

## Cross-Service Integration

### Message Bus Events

| Event                | Producer         | Consumer                    | Purpose                                    |
| -------------------- | ---------------- | --------------------------- | ------------------------------------------ |
| GoalEntityEvent      | Growth.Service   | NotificationMessage.Service | Sync goal data for notifications           |
| EmployeeDeletedEvent | Accounts.Service | Growth.Service              | Cascade delete goals when employee removed |

### Event Flow

```
Growth.Service                           NotificationMessage.Service
     │                                          │
     │  1. Goal Created/Updated/Deleted         │
     ▼                                          │
┌─────────────────────┐                         │
│ SendEmailOnCUD      │                         │
│ GoalEntityEvent     │────RabbitMQ────────────▶│
│ Handler             │                         ▼
└─────────────────────┘                 ┌─────────────────────┐
                                        │ Email Template      │
                                        │ Processor           │
                                        └─────────────────────┘

Accounts.Service                         Growth.Service
     │                                          │
     │  1. Employee Deleted                     │
     ▼                                          │
┌─────────────────────┐                         │
│ EmployeeDeleted     │                         │
│ EventBusProducer    │────RabbitMQ────────────▶│
└─────────────────────┘                         ▼
                                        ┌─────────────────────┐
                                        │ DeleteGoalOn        │
                                        │ DeleteEmployee      │
                                        │ EntityEventHandler  │
                                        └─────────────────────┘
```

### Event Handlers

| Handler                                        | Trigger            | Action                              |
| ---------------------------------------------- | ------------------ | ----------------------------------- |
| `SendEmailOnCUDGoalEntityEventHandler`         | Goal CUD events    | Sends email via NotificationMessage |
| `DeleteGoalOnDeleteEmployeeEntityEventHandler` | Employee deleted   | Deletes all goals owned by employee |
| `CreateHistoryLogOnGoalChangedEventHandler`    | Goal field changes | Creates audit log entry             |

**Evidence**: `UseCaseEvents/GoalManagement/*.cs`

---

## Test Specifications

### Goal Creation Test Specs

#### TC-GC-001: Create SMART Goal Successfully

**Acceptance Criteria**:

- ✅ User with `CanCreateGoal` permission can create SMART goal
- ✅ Form validates all required fields (Title, GoalType, StartDate, DueDate)
- ✅ MeasurementType selection enables StartValue, TargetValue, CurrentValue fields
- ✅ Backend validates DueDate >= StartDate
- ✅ Goal saved to MongoDB with correct ProductScope and CompanyId
- ✅ `SendEmailOnCUDGoalEntityEventHandler` sends notification email to owner
- ✅ Frontend refreshes goal list after successful creation

**Test Data**:

```json
{
    "title": "Reduce customer churn by 15%",
    "goalType": "Smart",
    "measurementType": "Percentage",
    "startValue": 10,
    "targetValue": 8.5,
    "currentValue": 10,
    "startDate": "2025-01-01",
    "dueDate": "2025-12-31",
    "visibility": "MeAndManager",
    "ownerEmployeeIds": ["emp123"]
}
```

**Edge Cases**:

- ❌ DueDate < StartDate → Validation error: "DueDate must be >= StartDate"
- ❌ Empty Title → Validation error: "Title is required"
- ❌ MeasurementType=null with TargetValue set → Validation error
- ❌ External user attempts creation → Validation error: "External users can't create a goal"

**Evidence**: `SaveGoalCommandHandler.cs:45-120`, `upsert-goal-form.component.ts:190-865`

---

#### TC-GC-002: Create OKR (Objective + KeyResults)

**Acceptance Criteria**:

- ✅ Create Objective with GoalType="Objective"
- ✅ FormArray dynamically adds/removes KeyResult rows
- ✅ Drag-drop reorders KeyResults (CdkDragDrop)
- ✅ Each KeyResult has Title, MeasurementType, StartValue, TargetValue
- ✅ Backend creates 1 Objective + N KeyResults with parentId linkage
- ✅ Objective Progress auto-calculates as average of KeyResult progress values

**Test Data**:

```json
{
    "title": "Launch Product V2 Successfully",
    "goalType": "Objective",
    "keyResults": [
        {
            "title": "Achieve 10,000 sign-ups",
            "measurementType": "Numeric",
            "startValue": 0,
            "targetValue": 10000
        },
        {
            "title": "Reach 85% user satisfaction",
            "measurementType": "Percentage",
            "startValue": 70,
            "targetValue": 85
        }
    ]
}
```

**Edge Cases**:

- ❌ Objective with 0 KeyResults → Validation error
- ✅ Objective with 10 KeyResults → Success
- ✅ Delete middle KeyResult from FormArray → Renumber correctly
- ✅ Drag KeyResult from index 0 to index 2 → Persist new order

**Evidence**: `upsert-goal-form.component.ts:420-550` (FormArray logic), `SaveGoalCommand.cs:78-95`

---

#### TC-GC-003: Visibility and Sharing

**Acceptance Criteria**:

- ✅ Public visibility → All company employees can view
- ✅ OnlyMe visibility → Only owner can view
- ✅ MeAndManager visibility → Owner + Owner's line manager
- ✅ SpecificPeople visibility → Enable employee multi-select picker
- ✅ ThisOrgUnit visibility → All employees in owner's department
- ✅ ThisOrgUnitAndSubOrgs visibility → Owner's department + sub-departments

**Test Scenarios**:

| Visibility Type          | Owner  | Line Manager | Dept Colleague | Admin | Other |
| ------------------------ | ------ | ------------ | -------------- | ----- | ----- |
| Public                   | ✅ View | ✅ View       | ✅ View         | ✅     | ✅     |
| OnlyMe                   | ✅ View | ❌ Hidden     | ❌ Hidden       | ✅     | ❌     |
| MeAndManager             | ✅ View | ✅ View       | ❌ Hidden       | ✅     | ❌     |
| SpecificPeople (User123) | ✅ View | ❌ Hidden     | ❌ Hidden       | ✅     | ✅\*   |
| ThisOrgUnit              | ✅ View | ❌ Hidden     | ✅ View         | ✅     | ❌     |

\*Only if User123 is in SpecificPeople list

**Edge Cases**:

- ✅ Change visibility Public → OnlyMe → Goal hidden from colleagues
- ✅ Line manager changes → New line manager gains MeAndManager access
- ✅ Employee transfers departments → ThisOrgUnit access updates

**Evidence**: `GetGoalListQuery.cs:120-185` (visibility filtering), `GoalPermission.ts:45-120`

---

### Permission System Test Specs

#### TC-PS-001: Owner Permissions

**Acceptance Criteria**:

- ✅ Owner has ALL 23 permissions (except admin-only actions)
- ✅ Can update: Title, Description, GoalType, Status, Priority, DueDate, Progress
- ✅ Can delete goal (soft delete with IsDeleted flag)
- ✅ Can add/remove Watchers, Approvers
- ✅ Can change Visibility type
- ✅ Can add/remove KeyResults (for Objectives)

**Test Matrix**: See Permission Matrix table in "Permission System" section above.

**Edge Cases**:

- ❌ Owner cannot delete if goal is linked to active PerformanceReview
- ✅ Owner transfers ownership → New owner gains full permissions, old owner becomes Watcher

**Evidence**: `GoalPermission.ts:150-220` (isActionAllowed logic), `upsert-goal-form.component.ts:620-700` (field disabling)

---

#### TC-PS-002: Watcher Permissions

**Acceptance Criteria**:

- ✅ Watchers can: ViewGoal, ViewProgress, AddComments
- ❌ Watchers CANNOT: UpdateTitle, UpdateStatus, DeleteGoal, AddKeyResults
- ✅ Watcher receives notification emails on goal status changes
- ✅ Watcher can remove themselves from goal

**Test Scenario**:

1. User A creates goal with Visibility=SpecificPeople, adds User B as Watcher
2. User B sees goal in "Shared With Me" view
3. User B opens goal → All form fields disabled except Comments
4. User A updates goal status → User B receives email notification

**Evidence**: `GoalPermission.ts:180-200`, `SendEmailOnCUDGoalEntityEventHandler.cs:55-120`

---

#### TC-PS-003: Admin Override Permissions

**Acceptance Criteria**:

- ✅ Company Admin has full access to ALL goals regardless of visibility
- ✅ Admin can delete any goal (including goals owned by others)
- ✅ Admin can reassign goal ownership
- ✅ Admin actions bypass owner permission checks

**Test Data**:

- Create goal with Visibility=OnlyMe by User A
- Login as Admin User B
- Admin can view, edit, delete goal created by User A

**Evidence**: `GoalPermission.ts:90-110` (isCompanyAdmin checks)

---

### Validation Test Specs

#### TC-VAL-001: Date Validation

**Acceptance Criteria**:

- ❌ DueDate < StartDate → "DueDate must be greater than or equal to StartDate"
- ❌ StartDate in past + Status=NotStarted → Warning (allow with confirmation)
- ✅ DueDate > 10 years in future → Success (no upper limit)

**Evidence**: `SaveGoalCommand.cs:35-40` (Validate method)

---

#### TC-VAL-002: Measurement Validation

**Acceptance Criteria**:

- ❌ MeasurementType=Percentage + TargetValue=150 → "Percentage must be 0-100"
- ❌ MeasurementType=null + TargetValue set → "MeasurementType required when TargetValue exists"
- ✅ MeasurementType=Currency + TargetValue=1000000 → Success
- ❌ CurrentValue > TargetValue for decreasing goals → Allow (e.g., reduce churn from 10% to 5%)

**Evidence**: `SaveGoalCommand.cs:50-78`, `upsert-goal-form.component.ts:290-320` (dependent validation)

---

#### TC-VAL-003: Async Validation

**Acceptance Criteria**:

- ✅ Parent goal exists when creating KeyResult → Success
- ❌ Parent goal not found → "Parent goal does not exist"
- ✅ All ownerEmployeeIds exist in system → Success
- ❌ Invalid employeeId in ownerEmployeeIds → "Employee [ID] not found"
- ✅ All watcherIds exist → Success
- ❌ Duplicate employeeId in ownerEmployeeIds + watcherIds → Auto-deduplicate

**Debounce Behavior**:

- User types employeeId in Owner field
- Wait 500ms after last keystroke
- Fire async validator to check employee exists
- Show error if not found

**Evidence**: `SaveGoalCommandHandler.cs:90-140` (ValidateRequestAsync), `upsert-goal-form.component.ts:380-420` (async validators)

---

### Event-Driven Workflow Test Specs

#### TC-EV-001: Goal Created Event

**Acceptance Criteria**:

- ✅ Platform auto-raises `PlatformCqrsEntityEvent<Goal>` on repository.CreateAsync()
- ✅ `SendEmailOnCUDGoalEntityEventHandler` receives event
- ✅ Sends email to Owner + Watchers + Approvers
- ✅ Email contains: Goal Title, Owner name, DueDate, View Goal link

**Event Flow**:

```
SaveGoalCommandHandler.HandleAsync()
  └─> repository.CreateAsync(goal)  // Platform auto-raises event
        └─> PlatformCqrsEntityEvent<Goal> published
              └─> SendEmailOnCUDGoalEntityEventHandler.HandleAsync()
                    └─> emailService.SendAsync(recipients, template)
```

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:40-180`

---

#### TC-EV-002: Goal Updated Event with Field Tracking

**Acceptance Criteria**:

- ✅ Update Goal.Status from "Progressing" to "Completed"
- ✅ Platform detects field change via `[TrackFieldUpdatedDomainEvent]` attribute
- ✅ Event payload includes: OldValue="Progressing", NewValue="Completed"
- ✅ Email template shows "Status changed from Progressing to Completed"

**Test Scenario**:

1. Create goal with Status=NotStarted
2. Update Status=Progressing → Email sent "Goal started"
3. Update Status=Completed → Email sent "Goal completed"
4. Update Status=Canceled → Email sent "Goal canceled"

**Evidence**: `Goal.cs:15-45` (TrackFieldUpdatedDomainEvent attributes), `SendEmailOnCUDGoalEntityEventHandler.cs:90-140`

---

#### TC-EV-003: Goal Deleted Event with Cascade

**Acceptance Criteria**:

- ✅ Delete Objective goal
- ✅ Platform auto-deletes all child KeyResults (cascade delete)
- ✅ Soft delete: Sets `IsDeleted=true`, preserves data
- ✅ `DeleteGoalOnDeleteEmployeeEntityEventHandler` handles employee deletion
- ✅ Email sent to Owner + Watchers: "Goal [Title] has been deleted"

**Cascade Delete Test**:

1. Create Objective with 3 KeyResults
2. Delete Objective
3. Verify all 3 KeyResults have `IsDeleted=true`
4. Verify GoalEmployee join records deleted
5. Verify frontend hides deleted goals from all lists

**Evidence**: `DeleteGoalCommand.cs:50-85`, `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:30-90`

---

### Integration Test Specs

#### TC-INT-001: Goal → Performance Review Integration

**Acceptance Criteria**:

- ✅ Link goal to Performance Review event
- ✅ GoalPerformanceReviewParticipant join entity created
- ✅ Performance Review displays linked goals in participant profile
- ✅ Goal progress auto-populates review form fields
- ❌ Cannot delete goal while linked to active review → Validation error

**Test Flow**:

1. Create Performance Review Event (id="pr123")
2. Create Goal (id="goal456")
3. Link goal to review: `POST /api/Goal/link-performance-review` with `{ goalId: "goal456", reviewEventId: "pr123" }`
4. Open Performance Review → See goal in participant's goal list
5. Attempt to delete goal → Error: "Cannot delete goal linked to active performance review"

**Evidence**: `GoalPerformanceReviewParticipant.cs:10-40`, `goal-performance-review-participant.model.ts:15-50`

---

#### TC-INT-002: Goal → Check-In Integration

**Acceptance Criteria**:

- ✅ Link goal to recurring 1-on-1 Check-In
- ✅ GoalCheckIn join entity tracks check-in discussions
- ✅ Check-In agenda displays linked goals
- ✅ Update goal progress from Check-In form
- ✅ Check-In history shows goal progress over time

**Test Flow**:

1. Create recurring Check-In (frequency=Weekly)
2. Create Goal (id="goal789")
3. Link goal to check-in: `POST /api/Goal/link-check-in`
4. Open Check-In instance → Goal appears in agenda
5. Update goal CurrentValue from 50 to 75
6. View Check-In history → See progress timeline: Week 1 (50%) → Week 2 (75%)

**Evidence**: `GoalCheckIn.cs:10-55`, `goal-check-in.model.ts:20-65`

---

#### TC-INT-003: Goal Deadline Reminder Background Job

**Acceptance Criteria**:

- ✅ `GoalDeadlinesSendReminderBackgroundJobExecutor` runs daily at 3 AM UTC
- ✅ Queries goals with DueDate within next 7 days
- ✅ Sends reminder email to Owner + Watchers
- ✅ Email subject: "Reminder: Goal [Title] due in [X] days"
- ✅ Batch processing: 20 companies per batch, 25 goals per company

**Test Scenario**:

1. Create 3 goals:
    - Goal A: DueDate = Today + 3 days → ✅ Reminder sent
    - Goal B: DueDate = Today + 10 days → ❌ No reminder (outside 7-day window)
    - Goal C: DueDate = Yesterday → ❌ No reminder (overdue, different job handles)
2. Wait for cron job execution
3. Verify emails sent only for Goal A

**Batch Processing**:

- Company 1: 30 goals due → Process in 2 batches (25 + 5)
- Company 2: 10 goals due → Process in 1 batch
- Parallel processing: Max 1 concurrent task per company (prevent race conditions)

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:40-180`

---

#### TC-INT-004: Deep Linking from Email Notifications

**Acceptance Criteria**:

- ✅ Email contains link: `https://app.com/goals?goalViewType=MyGoals&statuses=Progressing&dueDate=2025-12-31`
- ✅ Frontend parses query params via `ActivatedRoute.queryParams`
- ✅ `GoalManagementStore.setUpStoreFromQueryParams()` applies filters
- ✅ Goal list auto-loads with filters applied
- ✅ Selected goal auto-opens in detail panel

**Test Flow**:

1. User receives email: "Goal [Title] status changed to Progressing"
2. Clicks email link with query params
3. Browser navigates to `/goals?goalViewType=MyGoals&statuses=Progressing&goalId=goal123`
4. Frontend:
    - Sets viewType filter to "MyGoals"
    - Sets status filter to "Progressing"
    - Loads goal list
    - Opens goal detail panel for goal123
5. User sees filtered list with goal detail panel open

**Evidence**: `goal-management.store.ts:161-246` (setUpStoreFromQueryParams), `goal-management.component.ts:120-180` (ngOnInit query param parsing)

---

### Performance Test Specs

#### TC-PERF-001: Full-Text Search Performance

**Acceptance Criteria**:

- ✅ Search 10,000 goals in < 500ms
- ✅ MongoDB $text index on fields: Title, Description, FullTextSearch
- ✅ Search query: "product launch 2025" returns results in < 300ms
- ✅ Pagination: Page size = 20 items per page

**Test Data**:

- 10,000 goals across 100 companies
- Search term: "customer satisfaction"
- Expected: 150 matching goals
- Verify: Query execution time < 500ms

**Evidence**: `GetGoalListQueryHandler.cs:78-120` (full-text search with IPlatformFullTextSearchPersistenceService)

---

#### TC-PERF-002: Dashboard Stats Aggregation

**Acceptance Criteria**:

- ✅ Load dashboard with 1,000 active goals
- ✅ Parallel tuple query: (totalCount, pagedItems, statusCounts) in < 800ms
- ✅ Status counts aggregation uses MongoDB $group pipeline
- ✅ Pagination offset = 0, limit = 20

**Parallel Query Pattern**:

```csharp
var (total, items, counts) = await (
    repository.CountAsync(queryBuilder),
    repository.GetAllAsync(queryBuilder.PageBy(0, 20)),
    repository.GetAllAsync(queryBuilder.GroupBy(g => g.Status).Select(...))
);
```

**Evidence**: `GetGoalListQueryHandler.cs:130-165`

---

#### TC-PERF-003: FormArray Rendering (100 KeyResults)

**Acceptance Criteria**:

- ✅ Create Objective with 100 KeyResults
- ✅ FormArray renders in < 2 seconds
- ✅ Drag-drop reorder from index 0 to 99 in < 500ms
- ✅ Add new KeyResult row in < 100ms
- ✅ Remove KeyResult from middle in < 100ms

**Optimization**:

- Use `trackBy` function for `*ngFor`: `trackBy: trackByIndex`
- Use `OnPush` change detection strategy
- Debounce form value changes (500ms)

**Evidence**: `upsert-goal-form.component.ts:420-550` (FormArray logic)

---

## Troubleshooting

### Common Issues

#### Issue: Goal Progress Not Updating

**Symptoms**:

- User updates `CurrentValue` but progress percentage stays at old value
- Frontend shows correct value, but refreshes to old value

**Root Causes**:

1. **Computed Property Not Recalculated**:
    - `Progress` is a `[ComputedEntityProperty]` with empty setter
    - Backend must recalculate on save
    - **Fix**: Ensure `SaveGoalCommandHandler` calls `goal.RecalculateProgress()` before save

2. **Validation Failure**:
    - `CurrentValue > TargetValue` might fail validation for some MeasurementTypes
    - **Fix**: Check `SaveGoalCommand.Validate()` logic for MeasurementType-specific rules

3. **Event Handler Failure**:
    - `UpdateGoalCurrentValueMeasurementCommand` might silently fail
    - **Fix**: Check logs for validation errors in `UpdateGoalCurrentValueMeasurementCommandHandler`

**Debug Steps**:

```csharp
// Add logging in SaveGoalCommandHandler
Logger.LogInformation($"Before save: CurrentValue={goal.CurrentValue}, Progress={goal.Progress}");
await repository.UpdateAsync(goal, cancellationToken);
Logger.LogInformation($"After save: CurrentValue={goal.CurrentValue}, Progress={goal.Progress}");
```

**Evidence**: `SaveGoalCommandHandler.cs:95-120`, `Goal.cs:78-95` (computed property)

---

#### Issue: Permission Denied When Editing Own Goal

**Symptoms**:

- User is goal owner but form fields are disabled
- Error: "You do not have permission to update this goal"

**Root Causes**:

1. **GoalEmployee Record Missing**:
    - `goalEmployees` array doesn't contain Owner record for current user
    - **Fix**: Verify `SaveGoalCommand` creates `GoalEmployee` with `Role=Owner`

2. **Employee Context Mismatch**:
    - `currentEmployee.id` doesn't match `goalEmployee.employeeId`
    - Could be due to userId vs employeeId confusion
    - **Fix**: Check `AppBaseComponent.currentEmployee` matches `goalEmployee.employeeId`

3. **Admin Role Not Detected**:
    - `isCompanyAdmin` computed property returns false
    - **Fix**: Verify `hasRole(PlatformRoles.Admin)` in component

**Debug Steps**:

```typescript
// Add logging in UpsertGoalFormComponent.calculatePermissions()
console.log('Current Employee ID:', this.currentEmployee.id);
console.log('Goal Employees:', this.goal?.goalEmployees);
console.log('Is Owner:', isOwner);
console.log('Is Admin:', this.isCompanyAdmin);
console.log('Calculated Permissions:', this.permissions);
```

**Evidence**: `GoalPermission.ts:150-220`, `upsert-goal-form.component.ts:620-700`

---

#### Issue: Email Notifications Not Sent

**Symptoms**:

- Goal created/updated but Owner/Watchers don't receive email
- No errors in logs

**Root Causes**:

1. **Event Handler Filter**:
    - `SendEmailOnCUDGoalEntityEventHandler.HandleWhen()` returns false
    - Check if `@event.RequestContext.IsSeedingTestingData()` returns true (suppresses emails in test environments)
    - **Fix**: Verify environment is not in seeding mode

2. **Email Template Missing**:
    - Email template for goal notifications not configured
    - **Fix**: Check `NotificationMessage` service has template for `GoalNotificationEmail`

3. **Recipient List Empty**:
    - `goalEmployees` array is empty or all employees have opted out of notifications
    - **Fix**: Verify `goal.GoalEmployees` contains Owner + Watchers + Approvers

**Debug Steps**:

```csharp
// Add logging in SendEmailOnCUDGoalEntityEventHandler
Logger.LogInformation($"HandleWhen: {await HandleWhen(@event)}");
Logger.LogInformation($"Recipients: {string.Join(", ", recipients.Select(r => r.Email))}");
Logger.LogInformation($"Template: {templateName}");
```

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:40-180`

---

#### Issue: Deep Linking Query Params Not Applied

**Symptoms**:

- Click email link with filters but goal list shows all goals
- URL has query params but filters not applied

**Root Causes**:

1. **Query Param Parsing Failure**:
    - `ActivatedRoute.queryParams` not subscribed in `ngOnInit`
    - **Fix**: Ensure `goal-management.component.ts` subscribes to `queryParams`

2. **Store Not Updated**:
    - `setUpStoreFromQueryParams()` not called or returns early
    - **Fix**: Check if `isCurrentUserLineManager` is correctly passed

3. **Type Conversion Issue**:
    - `statuses` query param is string but needs `GoalStatuses[]` conversion
    - **Fix**: Verify `queryParams.statuses.split(',').map(s => s.trim() as GoalStatuses)`

**Debug Steps**:

```typescript
// Add logging in GoalManagementComponent.ngOnInit()
this.activatedRoute.queryParams.pipe(this.untilDestroyed()).subscribe(params => {
    console.log('Query Params:', params);
    this.store.setUpStoreFromQueryParams({
        goalViewType: params['goalViewType'],
        statuses: params['statuses']
        // ... other params
    });
    console.log('Store Query After Setup:', this.store.currentState().pagedQuery);
});
```

**Evidence**: `goal-management.store.ts:161-246`, `goal-management.component.ts:120-180`

---

#### Issue: KeyResults Not Saving with Objective

**Symptoms**:

- Create Objective with 3 KeyResults
- Only Objective saves, KeyResults missing

**Root Causes**:

1. **FormArray Value Not Extracted**:
    - `currentVm().keyResults` is empty when building `SaveGoalCommand`
    - **Fix**: Ensure `formControls('keyResults')?.value` is correctly mapped to DTO

2. **Backend Validation Failure**:
    - KeyResults fail validation (e.g., missing Title or TargetValue)
    - **Fix**: Check `SaveGoalCommand.Validate()` for KeyResult validation rules

3. **Transaction Rollback**:
    - Objective saves but KeyResults throw exception → entire transaction rolls back
    - **Fix**: Check logs for exceptions during `repository.CreateManyAsync(keyResults)`

**Debug Steps**:

```typescript
// Add logging in UpsertGoalFormComponent.onSubmit()
const keyResults = this.formControls('keyResults')?.value;
console.log('KeyResults FormArray Value:', keyResults);
console.log('Command KeyResults:', command.data.keyResults);
```

```csharp
// Add logging in SaveGoalCommandHandler
Logger.LogInformation($"Saving {request.Data.KeyResults?.Count ?? 0} KeyResults");
foreach (var kr in request.Data.KeyResults)
{
    Logger.LogInformation($"KeyResult: {kr.Title}, Target: {kr.TargetValue}");
}
```

**Evidence**: `upsert-goal-form.component.ts:420-550`, `SaveGoalCommandHandler.cs:78-95`

---

### Performance Issues

#### Issue: Goal List Loads Slowly (> 5 seconds)

**Symptoms**:

- Initial goal list load takes 5-10 seconds
- Pagination slow when navigating to page 2+

**Root Causes**:

1. **Missing Database Index**:
    - MongoDB query scans entire collection
    - **Fix**: Ensure indexes exist on: `CompanyId`, `ProductScope`, `DueDate`, `Status`, `IsDeleted`

2. **N+1 Query Problem**:
    - Repository doesn't eager-load related entities
    - **Fix**: Use `loadRelatedEntities: g => g.GoalEmployees, g => g.Parent` in query

3. **Full-Text Search Without Index**:
    - Search query scans all documents
    - **Fix**: Create MongoDB text index on `Title`, `Description`, `FullTextSearch` fields

**Optimization Steps**:

```csharp
// Create MongoDB indexes (run in migration)
await collection.Indexes.CreateOneAsync(
    new CreateIndexModel<Goal>(
        Builders<Goal>.IndexKeys
            .Ascending(g => g.CompanyId)
            .Ascending(g => g.ProductScope)
            .Ascending(g => g.DueDate)
    )
);

await collection.Indexes.CreateOneAsync(
    new CreateIndexModel<Goal>(
        Builders<Goal>.IndexKeys.Text(g => g.Title).Text(g => g.Description)
    )
);
```

**Evidence**: `GetGoalListQueryHandler.cs:78-165`

---

#### Issue: Dashboard Stats Cards Update Slowly

**Symptoms**:

- Stats cards (Total, Progressing, Behind, AtRisk) take 3+ seconds to load
- Page hangs during stats calculation

**Root Causes**:

1. **Sequential Queries**:
    - Stats calculated one by one instead of parallel
    - **Fix**: Use tuple await pattern: `var (total, progressing, behind) = await (...)`

2. **Aggregation Without Index**:
    - `GroupBy(g => g.Status)` scans all documents
    - **Fix**: Create compound index on `CompanyId + Status + IsDeleted`

3. **Large Result Set**:
    - Aggregation includes soft-deleted goals
    - **Fix**: Add `Where(g => !g.IsDeleted)` before aggregation

**Optimization**:

```csharp
// Parallel tuple query
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(Goal.OfCompanyExpr(companyId))
    .Where(g => !g.IsDeleted));

var (total, statusCounts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q)),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .GroupBy(g => g.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }))
);
```

**Evidence**: `GetGoalDashBoardSummaryQueryHandler.cs:45-120`

---

## Related Documentation

### EasyPlatform Platform Documentation

- **[CLAUDE.md](../../CLAUDE.md)** - Complete platform development guide
    - Backend patterns: CQRS, Clean Architecture, Repository patterns
    - Frontend patterns: PlatformComponent, PlatformVmStore, forms
    - Event-driven architecture: Entity events, message bus
- **[Architecture Overview](../architecture-overview.md)** - System architecture & diagrams
    - Project structure overview
    - Technology stack details
    - Cross-service communication patterns
- **[CLEAN-CODE-RULES.md](../../CLEAN-CODE-RULES.md)** - Coding standards and anti-patterns
    - Code organization and flow patterns
    - Validation method naming conventions
    - DTO mapping responsibility rules

### Design System Documentation

#### Frontend (Angular 19) - Example Application

- **[Design System Overview](../../docs/design-system/README.md)** - Complete design system guide
- **[01-design-tokens.md](../../docs/design-system/01-design-tokens.md)** - Colors, typography, spacing
- **[02-component-catalog.md](../../docs/design-system/02-component-catalog.md)** - UI components
- **[03-form-patterns.md](../../docs/design-system/03-form-patterns.md)** - Form validation, modes
- **[04-dialog-patterns.md](../../docs/design-system/04-dialog-patterns.md)** - Modal and panel patterns
- **[05-table-patterns.md](../../docs/design-system/05-table-patterns.md)** - Tables, pagination
- **[06-state-management.md](../../docs/design-system/06-state-management.md)** - State patterns
- **[07-technical-guide.md](../../docs/design-system/07-technical-guide.md)** - Implementation guide

### Related Feature Documentation

- **[Performance Review Feature](./README.PerformanceReviewFeature.md)** _(if exists)_
    - Goal → Performance Review integration patterns
    - GoalPerformanceReviewParticipant usage
- **[Check-In Feature](./README.CheckInFeature.md)** _(if exists)_
    - Goal → Check-In integration patterns
    - GoalCheckIn entity usage
- **[Employee Management Feature](./README.EmployeeManagementFeature.md)** _(if exists)_
    - Employee entity relationships
    - Line manager permissions
- **[Notification Feature](./README.NotificationFeature.md)** _(if exists)_
    - Email template configuration
    - Notification preferences

### API Documentation

- **Backend API**: `https://api.easyplatform.com/swagger` (Production)
- **Backend API**: `http://localhost:5010/swagger` (Development - Growth service)
- **Frontend Development**: `http://localhost:4206` (Growth app)
- **Frontend Development**: `http://localhost:4205` (Employee app)

### Code Locations

#### Backend (.NET 9)

```
src/Backend/TextSnippet/
├── Growth.Domain/Entities/GoalManagement/
│   ├── Goal.cs                              # Main entity
│   ├── GoalEmployee.cs                      # Many-to-many join
│   ├── GoalCheckIn.cs                       # Check-in integration
│   └── GoalPerformanceReviewParticipant.cs  # Review integration
├── Growth.Application/
│   ├── UseCaseCommands/GoalManagement/
│   │   ├── SaveGoalCommand.cs               # Create/update
│   │   ├── DeleteGoalCommand.cs             # Delete
│   │   └── UpdateGoalCurrentValueMeasurementCommand.cs  # Progress update
│   ├── UseCaseQueries/GoalManagement/
│   │   ├── GetGoalListQuery.cs              # Paged list with filters
│   │   ├── GetGoalDetailByIdQuery.cs        # Single goal details
│   │   └── GetGoalDashBoardSummaryQuery.cs  # Stats aggregation
│   ├── UseCaseEvents/GoalManagement/
│   │   ├── SendEmailOnCUDGoalEntityEventHandler.cs
│   │   ├── DeleteGoalOnDeleteEmployeeEntityEventHandler.cs
│   │   └── CreateHistoryLogOnGoalChangedEventHandler.cs
│   └── BackgroundJobs/GoalManagement/
│       └── GoalDeadlinesSendReminderBackgroundJobExecutor.cs
└── Growth.Service/Controllers/
    └── GoalController.cs                    # API endpoints
```

#### Frontend (Angular 19)

```
src/Frontend/libs/apps-domains/src/goal/
├── domain-models/
│   ├── goal.model.ts                        # TypeScript entity model
│   ├── goal.enum.ts                         # Enums (6 enumerations)
│   └── goal-check-in.ts                     # Integration models
├── api-services/
│   ├── goal-management-api.service.ts       # HTTP client
│   ├── queries/
│   │   ├── get-goal-list.query.ts           # Query DTO
│   │   └── get-goal-detail-by-id.query.ts
│   └── validators/
│       └── goal.validator.ts                # Async validators
├── components/
│   ├── goal-management/
│   │   ├── goal-management.component.ts     # Container component
│   │   └── goal-management.store.ts         # State management
│   ├── upsert-goal-form/
│   │   └── upsert-goal-form.component.ts    # Create/edit form
│   ├── goal-detail-panel/
│   │   └── goal-detail-panel.component.ts   # Slide panel
│   └── goal-table/
│       └── goal-table.component.ts          # Table with pagination
└── utils/
    └── goal-permission.util.ts              # 23 permission checks
```

### Database Schema

#### MongoDB Collections

**Collection**: `Goals`

**Indexes**:

```javascript
// Compound index for efficient company filtering
{ CompanyId: 1, ProductScope: 1, IsDeleted: 1, DueDate: -1 }

// Full-text search index
{ Title: "text", Description: "text", FullTextSearch: "text" }

// Status aggregation index
{ CompanyId: 1, Status: 1, IsDeleted: 1 }

// Parent-child relationship index
{ ParentId: 1 }
```

**Collections**:

- `Goals` - Main goal documents
- `GoalEmployees` - Join collection for Owner/Watcher/Approver relationships
- `GoalCheckIns` - Join collection for Check-In integration
- `GoalPerformanceReviewParticipants` - Join collection for Performance Review integration

### Testing Resources

- **Unit Tests**: `src/Backend/TextSnippet/Growth.Application.Tests/`
- **Integration Tests**: `src/AutomationTest/TextSnippet/`
- **E2E Tests**: `src/AutomationTest/Frontend/`

### Support and Contribution

- **Issue Tracker**: GitHub Issues (internal repository)
- **Slack Channel**: `#easyplatform-development`
- **Code Review**: All changes require PR review by senior developer
- **CI/CD**: Azure DevOps pipelines (`azure-pipelines.yml`)

---

## Version History

| Version | Date       | Changes                                                                                                                                 |
| ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2.0.0   | 2026-01-08 | Added Business Requirements, Design Reference, Backend Controllers, Cross-Service Integration sections; standardized to template format |
| 1.0.0   | 2025-12-23 | Initial documentation with 36 source file analysis                                                                                      |

---

_This document provides comprehensive technical documentation for the Goal Management feature in EasyPlatform. Generated with evidence-based analysis from 36 source files (22 backend .NET/C#, 14 frontend Angular 19 TypeScript). Last updated: 2026-01-08._
