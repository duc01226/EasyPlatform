# Goal Management & OKR Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.GoalManagementFeature.md](./README.GoalManagementFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoGROWTH |
| Service | Growth.Service (MongoDB) |
| Database | MongoDB |
| Feature Code | GM-OKR-001 |
| Full Docs | [README.GoalManagementFeature.md](./README.GoalManagementFeature.md) |

### File Locations

```
Entities:
├── Goal.cs:                    src/Services/bravoGROWTH/Growth.Domain/Entities/Goal.cs
├── GoalEmployee.cs:            src/Services/bravoGROWTH/Growth.Domain/Entities/GoalEmployee.cs
├── GoalCheckIn.cs:             src/Services/bravoGROWTH/Growth.Domain/Entities/GoalCheckIn.cs
└── GoalPerformanceReviewParticipant.cs: src/Services/bravoGROWTH/Growth.Domain/Entities/GoalPerformanceReviewParticipant.cs

Commands:     src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/GoalManagement/
Queries:      src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/GoalManagement/
Events:       src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/GoalManagement/
Controllers:  src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs
Frontend:     src/WebV2/libs/bravo-domain/src/goal/
```

---

## Domain Model

### Entities

```
Goal : RootEntity<Goal, string>
├── Id: string (ULID)
├── CompanyId: string
├── ProductScope: string
├── Title: string (required)
├── Description: string?
├── GoalType: GoalTypes (SMART | Objective | KeyResult)
├── GoalTargetType: GoalTargetTypes (Individual | Company | Department)
├── Status: GoalStatuses (NotStarted | Progressing | Behind | AtRisk | Canceled | Completed)
├── Priority: GoalPriorities (Low | Medium | High)
├── StartDate: DateTime
├── DueDate: DateTime?
├── MeasurementType: MeasurementTypes? (Numeric | Percentage | Currency)
├── StartValue: decimal? (default 0)
├── CurrentValue: decimal?
├── TargetValue: decimal?
├── Progress: decimal (computed: CurrentValue/TargetValue*100 or Objective=avg of KeyResults)
├── OwnerEmployeeIds: List<string>
├── GoalEmployees: List<GoalEmployee> (owners, watchers, approvers)
├── GoalCheckIns: List<GoalCheckIn>?
├── GoalPerformanceReviewParticipants: List<GoalPerformanceReviewParticipant>?
├── ParentId: string? (for KeyResults linking to parent Objective)
├── Visibility: GoalVisibilityTypes (Public | OnlyMe | MeAndManager | SpecificPeople | ThisOrgUnit | ThisOrgUnitAndSubOrgs)
├── VisibilityEmployeeIds: List<string>? (for SpecificPeople visibility)
├── VisibilityOrgUnitIds: List<string>? (for ThisOrgUnit visibility)
├── IsOverdue: bool (computed: DueDate < Now && Status != Completed)
├── CreatedDate: DateTime
├── CreatedBy: string
└── LastModified: DateTime

GoalEmployee : RootEntity<GoalEmployee, string>
├── Id: string
├── GoalId: string
├── EmployeeId: string
├── Role: GoalEmployeeRoles (Owner | Watcher | Approver)
└── CreatedDate: DateTime

GoalCheckIn : RootEntity<GoalCheckIn, string>
├── Id: string
├── GoalId: string
├── CheckInId: string (link to CheckIn feature)
└── SyncedDate: DateTime

GoalPerformanceReviewParticipant : RootEntity<GoalPerformanceReviewParticipant, string>
├── Id: string
├── GoalId: string
├── PerformanceReviewId: string
└── LinkedDate: DateTime
```

### Enums

```
GoalTypes: SMART | Objective | KeyResult
GoalStatuses: NotStarted | Progressing | Behind | AtRisk | Canceled | Completed
GoalTargetTypes: Individual | Company | Department
GoalVisibilityTypes: Public | OnlyMe | MeAndManager | SpecificPeople | ThisOrgUnit | ThisOrgUnitAndSubOrgs
MeasurementTypes: Numeric | Percentage | Currency
GoalPriorities: Low | Medium | High
GoalEmployeeRoles: Owner | Watcher | Approver
GoalViewTypes: MyGoals | MyDirectReports | SharedWithMe | All
GoalDueStatus: PastDue | UpComing
```

### Key Expressions

```csharp
public static Expression<Func<Goal, bool>> OfCompanyExpr(string productScope, string companyId)
    => g => g.ProductScope == productScope && g.CompanyId == companyId;

public static Expression<Func<Goal, bool>> FilterByStatusesExpr(List<GoalStatuses> statuses)
    => g => statuses.Contains(g.Status);

public static Expression<Func<Goal, bool>> FilterByGoalTypesExpr(List<GoalTypes> types)
    => g => types.Contains(g.GoalType);

public static Expression<Func<Goal, bool>> FilterByOwnerEmployeeIdsExpr(List<string> employeeIds)
    => g => g.GoalEmployees.Any(ge => employeeIds.Contains(ge.EmployeeId) && ge.Role == Owner);

public static Expression<Func<Goal, bool>> IsOverdueExpr()
    => g => g.DueDate.HasValue && g.DueDate.Value < Clock.UtcNow && g.Status != Completed;

public static Expression<Func<Goal, object?>>[] DefaultFullTextSearchColumns()
    => [g => g.Title, g => g.Description];
```

---

## API Contracts

### Commands

```
POST /api/goal
├── Request:  SaveGoalCommand { id?, title, description, goalType, goalTargetType,
│                               startDate, dueDate, measurementType?, startValue?, targetValue?,
│                               priority, status, visibility, visibilityEmployeeIds?,
│                               ownerEmployeeIds, keyResults? }
├── Response: SaveGoalCommandResult { goalId: string }
├── Handler:  SaveGoalCommandHandler (validates, creates/updates, syncs GoalEmployee)
└── Evidence: SaveGoalCommand.cs:85-145

DELETE /api/goal/{goalId}
├── Request:  DeleteGoalCommand { goalId }
├── Response: DeleteGoalCommandResult { success: bool, message: string? }
├── Handler:  DeleteGoalCommandHandler (validates no child KeyResults, deletes)
└── Evidence: DeleteGoalCommand.cs:45-91

POST /api/goal/update-progress/{goalId}
├── Request:  UpdateGoalCurrentValueMeasurementCommand { currentValue }
├── Response: UpdateGoalCurrentValueMeasurementCommandResult
├── Handler:  Updates CurrentValue, auto-calculates progress percentage
└── Evidence: UpdateGoalCurrentValueMeasurementCommand.cs:45-72
```

### Queries

```
GET /api/goal/{goalId}
├── Response: GoalDto { id, title, status, progress, dueDate, ... }
├── Handler:  GetGoalByIdQuery
└── Evidence: GetGoalByIdQuery.cs

POST /api/goal/get-goal-list
├── Request:  GetGoalListQuery { viewType, searchText?, statuses[], goalTypes[],
│                                 priorities[], ownerEmployeeIds[], dueDate, pageIndex, pageSize }
├── Response: GetGoalListQueryResult { items: GoalDto[], totalCount, pageIndex }
├── Handler:  GetGoalListQueryHandler (builds complex filtered query with FTS)
└── Evidence: GetGoalListQuery.cs:55-156

POST /api/goal/dashboard-summary
├── Request:  GetGoalDashboardSummaryQuery
├── Response: { totalGoals, completedCount, overdueCount, byStatus{}, byGoalType{} }
├── Handler:  GetGoalDashboardSummaryQueryHandler (aggregates stats)
└── Evidence: GetGoalDashboardSummaryQuery.cs
```

### DTOs

```
GoalDto : PlatformEntityDto<Goal, string>
├── Id: string
├── Title: string
├── Description: string?
├── GoalType: GoalTypes
├── Status: GoalStatuses
├── Progress: decimal
├── DueDate: DateTime?
├── OwnerNames: string[] (denormalized from GoalEmployee)
├── IsOverdue: bool (computed)
├── Visibility: GoalVisibilityTypes
└── MapToEntity(): Goal

SaveGoalCommand : PlatformCqrsCommand<SaveGoalCommandResult>
├── Data: GoalDto
├── MapToNewGoal(): Goal (auto-generate ID)
└── UpdateGoal(existing: Goal): Goal

GoalEmployeeDto
├── EmployeeId: string
├── EmployeeName: string
├── Role: GoalEmployeeRoles
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-GC-001 | External users (IsExternalUser=true) cannot create goals | `SaveGoalCommand.cs:117-145` |
| BR-GC-002 | KeyResult MUST have valid ParentId (Objective goal type) | `SaveGoalCommand.cs:85-115` (sync), `ValidateRequestAsync` (async) |
| BR-GC-003 | Objective SHOULD have >= 1 KeyResult (soft warning) | Frontend validation in `upsert-goal-form.component.ts:250-280` |
| BR-GM-001 | MeasurementType required for SMART and KeyResult goals | `SaveGoalCommand.cs:85-115` |
| BR-GM-002 | Objective.Progress = SUM(KeyResult.Progress) / COUNT(KeyResults) | `Goal.cs:78-95` |
| BR-GM-003 | CurrentValue can exceed TargetValue without validation failure | `UpdateGoalCurrentValueMeasurementCommand.cs:45-72` |
| BR-GV-001 | Visibility filters applied at query level (Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, ThisOrgUnitAndSubOrgs) | `GetGoalListQueryHelper.cs:45-90` |
| BR-ST-001 | Status transitions all allowed; some trigger warnings (Completed→NotStarted) | Frontend: `upsert-goal-form.component.ts:350-380` |
| BR-GD-001 | Cannot delete Objective with existing KeyResults (ParentId relationship) | `DeleteGoalCommandHandler.cs:65-91` |
| BR-GD-002 | Cascade delete goals when employee removed (if sole owner); remove from other goals | `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50` |
| BR-NT-001 | Email notifications sent to all GoalEmployee recipients (owners, watchers, approvers) | `SendEmailOnCUDGoalEntityEventHandler.cs:25-60` |
| BR-NT-002 | Deadline reminders sent 7 days before DueDate for non-Completed/Canceled goals; Cron: 0 9 * * * | `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:45-107` |

### Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Data.Title.IsNotNullOrEmpty(), "Title is required")
        .And(_ => Data.StartDate.HasValue, "StartDate is required")
        .And(_ => Data.DueDate.HasValue, "DueDate is required")
        .And(_ => Data.DueDate >= Data.StartDate, "DueDate must be >= StartDate")
        .And(_ => Data.MeasurementType.HasValue || Data.GoalType == Objective, "MeasurementType required")
        .And(_ => Data.GoalType != KeyResult || Data.ParentId.IsNotNullOrEmpty(), "ParentId required");

// Async validation in handler
await validation
    .AndAsync(r => parentGoalRepo.GetByIdAsync(r.Data.ParentId).Then(p =>
        p?.GoalType == Objective ? Valid() : Invalid("Parent must be Objective")))
    .AndNotAsync(r => employeeRepo.AnyAsync(e => e.IsExternalUser && r.Data.OwnerEmployeeIds.Contains(e.Id)),
        "External users cannot create goals");
```

---

## Service Boundaries

### Produces Events (Future Implementation)

```
GoalEntityEventBusMessage → [Employee, Growth, Candidate, Insights]
├── Producer: GoalEntityEventBusMessageProducer.cs (auto-generated)
├── Triggers: Create, Update, Delete on Goal
├── Not Implemented Yet: Event consumers not created; planned for v2.1
└── Payload: Goal entity + CrudAction
```

### Consumes Events

```
Employee.EmployeeEntityEventBusMessage ← Employee.Service
├── Consumer: DeleteGoalOnDeleteEmployeeEntityEventHandler
├── Action: Cascade delete goals when employee removed
└── Idempotent: Yes (no retry logic needed)
```

### Cross-Service Dependencies

```
bravoGROWTH (Goal Management)
├── Depends On:
│   ├── Employee.Service (for owner/watcher/approver validation)
│   ├── Performance Review (optional link via GoalPerformanceReviewParticipant)
│   └── Check-In (optional link via GoalCheckIn)
└── Produces:
    └── Goal change events (not yet consumed by other services)
```

---

## Critical Paths

### Create Goal

```
1. Frontend validates permissions
   ├─ GoalPermission.isActionAllowed(CanCreateGoal)
   └─ If denied, throw "Insufficient permissions"

2. Form validation (sync + async)
   ├─ Title required
   ├─ Dates: StartDate <= DueDate
   ├─ ParentId required if KeyResult type
   ├─ Parent goal exists if ParentId set
   └─ Async: Owner employees exist, no external users

3. Backend SaveGoalCommandHandler
   ├─ Create or load goal entity
   ├─ Set ProductScope, CompanyId, CreatedBy from RequestContext
   ├─ goalRepository.CreateOrUpdateAsync() → Auto-raises PlatformCqrsEntityEvent<Goal>
   ├─ Sync GoalEmployee (owners, watchers, approvers)
   └─ Return SaveGoalCommandResult { goalId }

4. Auto-triggered event handlers (parallel):
   ├─ SendEmailOnCUDGoalEntityEventHandler → Send notification emails
   └─ CreateHistoryLogOnGoalChangedEventHandler → Log field changes
```

### Update Goal

```
1. Load goal by ID
   └─ If not found: EnsureFound() throws 404

2. Validate permissions
   ├─ Owner can edit: Title, Description, StartDate, DueDate, Measurement, Visibility, Owners
   ├─ Watcher/Approver can edit: Status (if Approver), Progress
   └─ Admin can edit all fields

3. Update entity properties (merge with DTO)

4. Save via goalRepository.UpdateAsync()
   └─ Auto-raises event → Handlers send notifications + create history log

5. Sync GoalEmployee relationships (add/remove watchers/approvers)
```

### Update Goal Progress

```
1. Load goal by ID
2. Validate: CanUpdateGoalProgress permission
3. Update CurrentValue
4. Auto-calculate Progress = (CurrentValue / TargetValue) * 100
5. Save → Publish event (skip email notification for progress updates)
```

### Delete Goal

```
1. Load goal with related entities (GoalEmployees, GoalCheckIns, GoalPerfReviews)
2. Validate: NOT (GoalType == Objective AND has KeyResults via ParentId)
   └─ If validation fails: "Cannot delete Objective with existing KeyResults"
3. goalRepository.DeleteAsync() → Auto-raises Deleted event
4. Event handler sends notification to all GoalEmployees
```

### Daily Deadline Reminder Job (9 AM UTC)

```
1. Query goals where:
   ├─ DueDate.HasValue
   ├─ DueDate >= Now AND DueDate <= Now+7days
   ├─ Status != Completed AND Status != Canceled
   └─ Not already reminded (check LastReminderSentDate if stored)

2. For each goal, get all owner/watcher EmployeeIds

3. Send bulk email notification:
   └─ Subject: "Reminder: Goal '{Title}' due in {daysRemaining} days"

4. Mark reminder sent (prevents duplicate sends)
```

---

## Service Architecture

### bravoGROWTH Service Components

```
Growth.Domain
├── Entities: Goal, GoalEmployee, GoalCheckIn, GoalPerformanceReviewParticipant
└── Value Objects: (none; enums only)

Growth.Application
├── Commands:
│   ├── SaveGoalCommand + SaveGoalCommandHandler
│   ├── DeleteGoalCommand + DeleteGoalCommandHandler
│   └── UpdateGoalCurrentValueMeasurementCommand
├── Queries:
│   ├── GetGoalByIdQuery + GetGoalByIdQueryHandler
│   ├── GetGoalListQuery + GetGoalListQueryHandler
│   └── GetGoalDashboardSummaryQuery
├── Events:
│   ├── SendEmailOnCUDGoalEntityEventHandler
│   ├── CreateHistoryLogOnGoalChangedEventHandler
│   └── DeleteGoalOnDeleteEmployeeEntityEventHandler (consumes Employee.Deleted)
├── Background Jobs:
│   └── GoalDeadlinesSendReminderBackgroundJobExecutor (Cron: 0 9 * * *)
└── Repositories:
    ├── IGrowthRootRepository<Goal>
    ├── IGrowthRootRepository<GoalEmployee>
    └── IGrowthRootRepository<GoalCheckIn>

Growth.Service
├── Controllers: GoalController
│   ├── POST /api/goal → SaveGoal
│   ├── DELETE /api/goal/{id} → DeleteGoal
│   ├── POST /api/goal/get-goal-list → GetGoalList
│   ├── GET /api/goal/{id} → GetGoal
│   ├── POST /api/goal/dashboard-summary → GetDashboardSummary
│   └── PUT /api/goal/update-progress/{id} → UpdateProgress
└── Permissions: GoalPermission class (23 granular permissions)
```

### Frontend Components (Angular 19)

```
src/WebV2/libs/bravo-domain/src/goal/
├── Components:
│   ├── goal-management/goal-management.component.ts (main list page)
│   ├── goal-management/goal-management.store.ts (PlatformVmStore)
│   ├── upsert-goal-form/upsert-goal-form.component.ts (create/edit modal)
│   ├── goal-detail-panel/goal-detail-panel.component.ts (read-only details)
│   └── goal-overview/goal-overview.component.ts (dashboard stats)
├── Stores:
│   ├── goal-management.store.ts (PlatformVmStore with caching)
│   └── goal-detail.store.ts (single goal detail)
├── API Services:
│   └── goal-management-api.service.ts (extends PlatformApiService)
├── Domain Models:
│   ├── goal.model.ts (GoalPermission class, enums)
│   ├── goal-dto.ts
│   └── query-dtos/ (GetGoalListQuery, etc.)
└── Utilities:
    └── goal-helpers.ts (permission, status, progress helpers)
```

---

## Permission System (23 Granular Permissions)

| Permission | Allowed Roles | Notes |
|-----------|-----------------|-------|
| CanCreateGoal | All employees (except external) | Checked at form load |
| CanViewGoal | Owner, Watcher, Approver, Admin, or via Visibility rules | Applied at query level |
| CanDeleteGoal | Owner, Admin | Cannot delete if Objective with KeyResults |
| CanUpdateTitle | Owner, Admin | |
| CanUpdateDescription | Owner, Admin | |
| CanUpdateGoalType | Never (immutable) | Set at creation |
| CanUpdateGoalTargetType | Owner, Admin | |
| CanUpdatePriority | Owner, Admin | |
| CanUpdateStatus | Owner, Approver, Admin | |
| CanUpdateStartDate | Owner, Admin | |
| CanUpdateDueDate | Owner, Admin | |
| CanUpdateMeasurement | Owner, Admin | |
| CanUpdateVisibility | Owner, Admin | |
| CanUpdateOwners | Owner, Admin | |
| CanUpdateWatchers | Owner, Admin | |
| CanUpdateApprovers | Owner, Admin | |
| CanUpdateKeyResults | Owner, Admin | FormArray for Objective only |
| CanUpdateLinkedReviews | Owner, Admin | Planned integration |
| CanUpdateLinkedCheckIns | Owner, Admin | Planned integration |
| CanUpdateGoalProgress | Owner, Watcher, Admin | Update CurrentValue |
| CanApproveGoal | Approver, Admin | Status changes |
| CanCommentOnGoal | Anyone who can view | Planned feature |
| CanShareGoal | Owner, Admin | Planned feature |

---

## Test Focus Areas

| Priority | Test Case | Evidence |
|----------|-----------|----------|
| **P0** | TC-GM-001: Create SMART goal with valid data | Entity created, event published |
| **P0** | TC-GM-002: Create OKR (Objective + 3 KeyResults) | Hierarchy maintained, progress calculated |
| **P0** | TC-GM-004: Delete goal | Deleted, notification sent |
| **P0** | TC-GM-011: External user cannot create goal | Validation error: "External users cannot create goals" |
| **P0** | TC-GM-012: KeyResult parent validation | Fails if ParentId not valid Objective |
| **P0** | TC-GM-013: Date range validation (StartDate <= DueDate) | Validation error raised |
| **P0** | TC-GM-021: Owner can edit all fields | All 16 field update permissions granted |
| **P0** | TC-GM-022: Watcher can only update progress | CanUpdateGoalProgress=true, others disabled |
| **P0** | TC-GM-023: Admin has full access | All 23 permissions granted |
| **P0** | TC-GM-031: Email notification on goal create | Email sent to owners + watchers |
| **P0** | TC-GM-033: Cascade delete on employee removal | Goals deleted if sole owner, removed from others |
| **P1** | TC-GM-032: Deadline reminder job (7 days before due) | Job runs at 9 AM, sends email |
| **P1** | TC-PERF-001: Goal list query (10,000 goals) | Returns in < 500ms with pagination |
| **P1** | TC-PERF-002: Dashboard stats aggregation | Stats load in < 300ms |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Create goal without title | Validation error: "Title required" | `SaveGoalCommand.cs:85-115` |
| KeyResult without parent objective | Validation error: "Parent must be Objective" | `SaveGoalCommand.cs:117-145` |
| Delete Objective with 3 KeyResults | Fails: "Delete KeyResults first" | `DeleteGoalCommandHandler.cs:65-91` |
| CurrentValue > TargetValue | Status = Completed (allowed) | `Goal.cs` status logic |
| Email notification fails | Job continues, error logged, retry next cycle | Event handler error handling |
| Deep linking with invalid query params | Params ignored, defaults applied | `goal-management.store.ts:161-246` |
| Visibility=SpecificPeople with empty list | Query returns no visible results | `GetGoalListQueryHelper.cs:45-90` |
| Concurrent updates to same goal | Last write wins (no optimistic lock) | MongoDB update behavior |
| Background job timeout | Job continues from last completed batch | `GoalDeadlinesSendReminderBackgroundJobExecutor.cs` |

---

## Usage Notes

### When to Use This File

- Implementing new features in Goal Management (progress tracking, integration, etc.)
- Fixing bugs related to goals, permissions, or visibility
- Understanding API contracts and validation rules quickly
- Code review context and permission verification
- Adding new permissions or status values

### When to Use Full Documentation

- Understanding business requirements and OKR methodology
- Stakeholder communication and feature roadmaps
- Comprehensive test planning with all 30+ test cases
- Troubleshooting production issues
- Performance tuning and optimization
- Writing detailed implementation guides

---

*Generated from comprehensive documentation. For full details, see [README.GoalManagementFeature.md](./README.GoalManagementFeature.md)*
