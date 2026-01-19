<!-- AI-Agent Context Document v1.0 -->
<!-- Companion to: README.ExampleFeature1.md (Goal Management - 3000+ lines) -->

# Goal Management - AI Context

**Module**: TextSnippet.Growth | **Feature**: GoalManagement | **Updated**: 2026-01-11

---

## 1. Context

| Aspect | Value |
|--------|-------|
| **Purpose** | OKR/SMART goal tracking with hierarchy (Objectives → KeyResults), check-ins, reviews |
| **Entities** | Goal, GoalEmployee, GoalCheckIn, GoalPerformanceReviewParticipant |
| **Service** | TextSnippet.Growth.Service |
| **DB** | MongoDB |
| **Users** | Employees (own goals), Managers (team), Admins (company-wide) |
| **Ops** | CRUD + progress tracking + deadline reminders |
| **Integration** | Performance Review, Check-In, Employee, Notification services |

---

## 2. File Locations

| Layer | Path |
|-------|------|
| **Entities** | `Growth.Domain/Entities/GoalManagement/` |
| **Commands** | `Growth.Application/UseCaseCommands/GoalManagement/` |
| **Queries** | `Growth.Application/UseCaseQueries/GoalManagement/` |
| **Events** | `Growth.Application/UseCaseEvents/GoalManagement/` |
| **Jobs** | `Growth.Application/BackgroundJobs/GoalManagement/` |
| **Controller** | `Growth.Service/Controllers/GoalController.cs` |
| **FE Page** | `bravo-growth/pages/goal-management/goal-management.component.ts` |
| **FE Store** | `bravo-growth/pages/goal-management/goal-management.store.ts` |
| **FE Form** | `bravo-growth/pages/goal-management/upsert-goal-form/upsert-goal-form.component.ts` |
| **API** | `growth-domain/services/goal-management.api.service.ts` |
| **Models** | `growth-domain/models/goal.model.ts` |

---

## 3. Domain Model

### Goal Entity

| Prop | Type | Constraints | Notes |
|------|------|-------------|-------|
| Id | string | ULID | PK |
| CompanyId | string | Required | Tenant |
| ProductScope | string | Required | Filter |
| Title | string | Required, Max 500 | Name |
| Description | string? | Max 4000 | Rich text |
| GoalType | enum | Required | Objective=1, KeyResult=2 |
| Status | enum | Required | NotStarted=0, Progressing=1, Completed=2, AtRisk=3, Behind=4, Canceled=5 |
| VisibilityType | enum | Required | OwnerOnly=0, Managers=1, Employees=2, Team=3, Department=4, Company=5 |
| MeasurementType | enum | Required | Numeric=0, Percentage=1, Currency=2, Binary=3 |
| TargetValue | decimal | Required | Target |
| CurrentValue | decimal | Default 0 | Progress |
| Progress | decimal | Computed | `CurrentValue / TargetValue * 100` |
| DueDate | DateTime | Required | Deadline |
| ParentId | string? | FK | Objective ref (KeyResults) |
| OwnerId | string | Required, FK | Primary owner |

### GoalEmployee (Join)

| Prop | Type | Values |
|------|------|--------|
| GoalId | string | FK |
| EmployeeId | string | FK |
| GoalEmployeeRole | enum | Owner=0, Watcher=1, Approver=2, Contributor=3 |

### Key Expressions

```csharp
OfCompanyExpr(cId) => g => g.CompanyId == cId;
FilterStatusExpr(statuses) => g => statuses.ToHashSet().Contains(g.Status);
SearchColumns() => [g => g.Title, g => g.Description, g => g.FullTextSearch];
AccessibleByEmployeeExpr(eId, isMgr) => g => g.GoalEmployees!.Any(ge => ge.EmployeeId == eId) || (isMgr && g.VisibilityType >= Managers);
```

---

## 4. API Contracts

| Method | Endpoint | Handler | Auth |
|--------|----------|---------|------|
| GET | `/api/Goal` | GetGoalListQuery | User+ |
| GET | `/api/Goal/{id}` | GetGoalDetailByIdQuery | User+ |
| GET | `/api/Goal/dashboard-summary` | GetGoalDashboardSummaryQuery | User+ |
| POST | `/api/Goal` | SaveGoalCommand | User+ |
| DELETE | `/api/Goal/{id}` | DeleteGoalCommand | Owner/Admin |
| POST | `/api/Goal/update-current-value` | UpdateGoalCurrentValueMeasurementCommand | Owner/Admin |
| POST | `/api/Goal/get-goals-by-employees` | GetGoalsByEmployeeIdsQuery | Manager+ |

### SaveGoalCommand

```typescript
{ data: { id?: string, companyId, title, description?, goalType, status, visibilityType, measurementType, targetValue, currentValue, dueDate, parentId?, ownerId, goalEmployees: GoalEmployeeDto[], keyResults?: SaveGoalCommand[] } } → { data: GoalDto }
```

### GetGoalListQuery

```typescript
{ companyId, productScope, statuses?, goalTypes?, viewTypes?, searchText?, dueDateFrom?, dueDateTo?, skip?, take? } → { items: GoalDto[], totalCount, statusCounts: { status, count }[] }
```

---

## 5. Business Rules

| ID | Rule | Evidence |
|----|------|----------|
| BR-01 | Title required, max 500 | `SaveGoalCommand.cs:Validate()` |
| BR-02 | DueDate required, future for new | `SaveGoalCommand.cs:ValidateRequestAsync()` |
| BR-03 | KeyResult requires ParentId → Objective | `SaveGoalCommand.cs:L85-95` |
| BR-04 | Owner exists in same company | `SaveGoalCommandHandler.cs:L78-95` |
| BR-05 | Cannot delete if linked to active Perf Review | `DeleteGoalCommand.cs:L65-80` |
| BR-06 | CurrentValue ≤ TargetValue (Numeric) | `Goal.cs:ValidateEntity()` |

### State Transitions

| From | Event | To | Condition |
|------|-------|----|-----------|
| NotStarted | Start | Progressing | CurrentValue > 0 |
| Progressing | Complete | Completed | CurrentValue ≥ TargetValue |
| Progressing | At risk | AtRisk | Manual / DueDate < 7d |
| Any | Cancel | Canceled | Owner/Admin |

### Permissions

| Perm | Who |
|------|-----|
| CanEdit | Owner, Admin |
| CanDelete | Owner, Admin |
| CanUpdateProgress | Owner, Contributor, Admin |
| CanViewDetails | Owner, Watcher, Approver, Manager (visibility), Admin |

---

## 6. Patterns

### Required

| Pattern | Implementation |
|---------|----------------|
| Repository | `IPlatformQueryableRootRepository<Goal, string>` |
| Validation | `PlatformValidationResult` fluent |
| Side Effects | Event handlers in `UseCaseEvents/GoalManagement/` |
| DTO Mapping | `GoalDto.MapToEntity()`, `MapToNewEntity()` |
| CQRS | Command + Result + Handler in single file |
| Navigation | `[PlatformNavigationProperty]` for GoalEmployees, Parent, Children |
| Search | `IPlatformFullTextSearchPersistenceService` + `SearchColumns()` |

### Anti-Patterns

| ❌ Wrong | ✅ Correct |
|---------|-----------|
| Email in SaveGoalCommandHandler | `SendEmailOnCUDGoalEntityEventHandler` |
| Direct Employee DB access | Message bus consumer |
| Manual subscription cleanup | `.pipe(this.untilDestroyed())` |
| Throw ValidationException | `PlatformValidationResult` |

---

## 7. Integration

### Event Handlers

| Handler | Trigger | Purpose |
|---------|---------|---------|
| `SendEmailOnCUDGoalEntityEventHandler` | Goal C/U/D | Email notifications |
| `CreateHistoryLogOnGoalChangedEventHandler` | Field changed | Audit trail |
| `DeleteGoalOnDeleteEmployeeEntityEventHandler` | Employee deleted | Cascade cleanup |

### Background Jobs

| Job | Cron | Purpose |
|-----|------|---------|
| `GoalDeadlinesSendReminderBackgroundJobExecutor` | `0 3 * * *` | Deadline reminders (7d window) |

### Message Bus

```csharp
// Producer
GoalEntityEventProducer : PlatformCqrsEntityEventBusMessageProducer<GoalEventBusMessage, Goal, string>

// Consumer
EmployeeEventConsumer.HandleLogicAsync(msg) {
  if (msg.Payload.CrudAction == Deleted)
    await goalRepo.DeleteManyAsync(g => g.OwnerId == msg.Payload.EntityData.Id);
}
```

---

## 8. Security

### Authorization Matrix (23 Permissions - GoalActionKey)

| Perm Key | Owner | Watcher | Approver | Mgr | Admin |
|----------|:-----:|:-------:|:--------:|:---:|:-----:|
| ViewGoalList | ✅ | ✅ | ✅ | ✅ | ✅ |
| ViewGoalDetail | ✅ | ✅ | ✅ | ✅ | ✅ |
| CreateGoal | ✅ | ❌ | ❌ | ✅ | ✅ |
| EditGoal | ✅ | ❌ | ❌ | ❌ | ✅ |
| DeleteGoal | ✅ | ❌ | ❌ | ❌ | ✅ |
| UpdateProgress | ✅ | ❌ | ❌ | ❌ | ✅ |
| AddKeyResult | ✅ | ❌ | ❌ | ❌ | ✅ |
| ManageWatchers | ✅ | ❌ | ❌ | ❌ | ✅ |

### Visibility

```csharp
VisibilityExpr(eId, cId, isMgr) => g => g.GoalEmployees!.Any(ge => ge.EmployeeId == eId) || (isMgr && g.VisibilityType >= Managers) || g.VisibilityType == Company;
```

---

## 9. Test Scenarios

### Critical (P0)

| ID | Scenario | GIVEN/WHEN/THEN |
|----|----------|-----------------|
| TC-01 | Create Objective | Valid SaveGoalCommand (GoalType=Objective) / POST /api/Goal / 200 + new goal |
| TC-02 | Create KeyResult | Command with ParentId → Objective / POST / 200, linked |
| TC-03 | Delete cascades | Objective + 3 KeyResults / DELETE Objective / All 4 soft-deleted |
| TC-04 | Perm denied | Goal owned by A / B edits / 403 |
| TC-05 | Email on create | Goal created / Event fires / SendEmailOnCUDGoalEntityEventHandler sends |

### Integration (P1)

| ID | Scenario | Evidence |
|----|----------|----------|
| TC-INT-01 | Goal → Perf Review link | `GoalPerformanceReviewParticipant.cs` |
| TC-INT-02 | Goal → Check-In link | `GoalCheckIn.cs` |
| TC-INT-03 | Deadline reminder | `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:40-180` |

---

## 10. Quick Reference

### Backend Ops

```csharp
// Get with navigation
await goalRepo.GetByIdAsync(id, ct, g => g.GoalEmployees, g => g.Parent, g => g.Children);

// Query + filter + search
var qb = goalRepo.GetQueryBuilder((uow, q) => q
    .Where(Goal.OfCompanyExpr(cId))
    .WhereIf(statuses.Any(), Goal.FilterStatusExpr(statuses))
    .PipeIf(search.IsNotNullOrEmpty(), q => searchService.Search(q, search, Goal.SearchColumns())));

// Parallel queries
var (total, items, statusCounts) = await (
    goalRepo.CountAsync((uow, q) => qb(uow, q), ct),
    goalRepo.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(g => g.DueDate).PageBy(skip, take), ct),
    goalRepo.GetAllAsync((uow, q) => qb(uow, q).GroupBy(g => g.Status).Select(g => new { Status = g.Key, Count = g.Count() }), ct));

// Create/Update
var goal = dto.NotHasSubmitId()
    ? dto.MapToNewEntity().With(g => g.CreatedBy = RequestContext.UserId())
    : await goalRepo.GetByIdAsync(dto.Id, ct).Then(g => dto.UpdateToEntity(g));
await goal.ValidateAsync(goalRepo, ct).EnsureValidAsync();
await goalRepo.CreateOrUpdateAsync(goal, ct);
```

### Frontend Store

```typescript
// Load
loadGoals = this.effectSimple(() => this.api.getList(this.currentState().pagedQuery).pipe(
    this.observerLoadingErrorState('loadGoals'),
    this.tapResponse(r => this.updateState({ goals: r.items, totalCount: r.totalCount, statusCounts: r.statusCounts }))
));

// Setup from params
setUpStoreFromQueryParams(p: GoalQueryParams) {
    this.updateState({ pagedQuery: { ...this.currentState().pagedQuery, statuses: p.statuses?.split(',').map(s => s as GoalStatuses), viewTypes: p.goalViewType ? [p.goalViewType] : undefined } });
    this.loadGoals();
}
```

### Decision Tree

```
Goal task?
├── New field → Goal.cs + GoalDto + SaveGoalCommand + FE model
├── Validation → SaveGoalCommand.Validate() / ValidateRequestAsync()
├── Progress → UpdateGoalCurrentValueMeasurementCommand
├── Email → SendEmailOnCUDGoalEntityEventHandler
├── Permission → GoalPermission.ts + calculatePermissions()
├── Query filter → GetGoalListQueryHandler + static expr
└── Scheduled → BackgroundJobs/GoalManagement/
```

---

_Full documentation: [README.ExampleFeature1.md](README.ExampleFeature1.md)_
