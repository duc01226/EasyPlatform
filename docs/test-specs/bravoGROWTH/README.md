# bravoGROWTH - Comprehensive Test Specifications (Enhanced with Code Evidence)

**Module**: bravoGROWTH (Performance & OKR Management)
**Generated**: 2025-12-30
**Enhanced**: 2025-12-30 with code evidence
**Coverage**: Goal Management, Check-In, Performance Review, Time & Attendance, Form Templates, Kudos, Permissions

---

## Table of Contents

1. [Goal Management Test Specs](#1-goal-management-test-specs)
2. [Check-In Test Specs](#2-check-in-test-specs)
3. [Performance Review Test Specs](#3-performance-review-test-specs)
4. [Time & Attendance Test Specs](#4-time--attendance-test-specs)
5. [Form Templates Test Specs](#5-form-templates-test-specs)
6. [Permission & Authorization Test Specs](#6-permission--authorization-test-specs)
7. [Cross-Service Integration Test Specs](#7-cross-service-integration-test-specs)
8. [Background Job Integration Test Specs](#8-background-job-integration-test-specs)
9. [Kudos Test Specs](#9-kudos-test-specs)
10. [Integration Test Implementation Index](#10-integration-test-implementation-index)

---

## 1. Goal Management Test Specs

### 1.1 Goal Creation Tests

#### TC-GM-001: Create SMART Goal Successfully

**Priority**: P0-Critical

**Preconditions**:
- User has `EmployeePolicy` authorization
- Company has active Goal subscription
- User is not an external user

**Test Steps** (Given-When-Then):
```gherkin
Given user is authenticated with EmployeePolicy role
  And company subscription includes Goal feature
  And user is viewing goal creation form
When user fills in required fields:
  - Title: "Reduce customer churn by 15%"
  - GoalType: "Smart"
  - MeasurementType: "Percentage"
  - TargetValue: 8.5
  - CurrentValue: 10
  - TargetDate: "2025-12-31"
  And user submits the form
Then goal is created with status "Draft"
  And goal.CompanyId == RequestContext.CurrentCompanyId()
  And notification email sent to goal owner
  And goal visible in dashboard
```

**Acceptance Criteria**:
- ✅ Form validates all required fields (Title, GoalType, TargetDate)
- ✅ Backend creates Goal entity in database
- ✅ Goal assigned to current employee as owner
- ✅ Notification event triggered via entity event handler
- ✅ Frontend refreshes goal list after creation
- ❌ External users cannot create goals (returns validation error)
- ❌ Missing required fields shows validation error

**Test Data**:
```json
{
  "title": "Reduce customer churn by 15%",
  "description": "Achieve 85% retention rate",
  "goalType": "Smart",
  "measurementType": "Percentage",
  "targetValue": 85,
  "currentValue": 100,
  "startDate": "2025-01-01",
  "targetDate": "2025-12-31",
  "visibility": "MeAndManager",
  "ownerEmployeeIds": ["emp123"]
}
```

**Edge Cases**:
- ❌ TargetDate < CurrentDate → Allow (goals can have past dates)
- ❌ MeasurementType=Percentage with TargetValue=150 → Validation error
- ❌ Empty Title → Validation error: "Title is required"
- ✅ Very long title (255 chars) → Success
- ✅ Special characters in title → Success

**Evidence**:

- **Controller**: `Growth.Service/Controllers/GoalController.cs:L20-21, L33-37`
  - Authorization policies: `EmployeePolicy`, `GoalPolicy`
  - Endpoint: `POST /api/Goal` → `SaveGoalManagement(SaveGoalCommand)`

- **Command**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L17-25`
  - Command definition with `GoalDto Data` property

- **Command Handler**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L48-58, L64-126`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | DTO | `src/Services/bravoGROWTH/Growth.Application/EntityDtos/GoalManagement/GoalDto.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-form/goal-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/goal.service.ts` |

<details>
<summary>Code Snippet: External User Validation</summary>

```csharp
// SaveGoalCommandHandler.cs:L48-58
protected override async Task<PlatformValidationResult<SaveGoalCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveGoalCommand> requestSelfValidation,
    CancellationToken cancellationToken
)
{
    return await requestSelfValidation.AndNotAsync(
        request =>
            employeeRepository.AnyAsync(p => request.Data.OwnerEmployeeIds.Contains(p.Id) && p.IsExternalUser == true, cancellationToken),
        "External users can't create a goal"
    );
}
```
</details>

<details>
<summary>Code Snippet: Goal Creation Logic</summary>

```csharp
// SaveGoalCommandHandler.cs:L64-77
var toSaveGoalEntity = request.Data.NotHasSubmitId()
    ? request.Data
        .MapToNewEntity()
        .EnsureCanBeSaved(
            await RequestContext.CurrentEmployee(),
            PlatformCqrsEntityEventCrudAction.Created,
            RequestContext)
        .With(x => x.CompanyId = RequestContext.CurrentCompanyId())
        .WithIf(
            x => !x.ChildGoals.IsNullOrEmpty(),
            x => x.ChildGoals!.ForEach(i =>
            {
                i.CompanyId = RequestContext.CurrentCompanyId();
            }))
    : // ... update logic
```
</details>

---

#### TC-GM-002: Create OKR with Multiple Key Results

**Priority**: P1-High

**Preconditions**:
- User has EmployeePolicy
- Goal creation form with FormArray for KeyResults is available

**Test Steps** (Given-When-Then):
```gherkin
Given user creates new goal with GoalType="Objective"
When user adds 3 KeyResults via dynamic form:
  - KR1: "Achieve 10,000 sign-ups" (Numeric, target=10000)
  - KR2: "Reach 85% user satisfaction" (Percentage, target=85)
  - KR3: "Deploy v2.0 with <5% bugs" (Numeric, target=5)
  And user reorders KeyResults: KR3, KR1, KR2
  And user submits form
Then parent Objective created with 3 child KeyResults
  And ChildGoals array contains all KeyResults in new order
  And ParentGoal reference set on each KeyResult
  And Objective.Progress auto-calculated as average of KR progress
```

**Acceptance Criteria**:
- ✅ FormArray allows dynamic add/remove of KeyResult rows
- ✅ Drag-drop reordering changes display order
- ✅ Backend creates 1 Objective + 3 KeyResults with parent-child links
- ✅ Child goals inherit CompanyId from parent
- ✅ Progress calculation: (KR1.progress + KR2.progress + KR3.progress) / 3
- ❌ Objective without KeyResults → Validation error
- ❌ Creating without child goals fails with "At least 1 KeyResult required"

**Test Data**:
```json
{
  "title": "Launch Product V2 Successfully",
  "goalType": "Objective",
  "keyResults": [
    {
      "title": "Deploy v2.0 with <5% bugs",
      "measurementType": "Numeric",
      "targetValue": 5
    },
    {
      "title": "Achieve 10,000 sign-ups",
      "measurementType": "Numeric",
      "targetValue": 10000
    },
    {
      "title": "Reach 85% user satisfaction",
      "measurementType": "Percentage",
      "targetValue": 85
    }
  ]
}
```

**Evidence**:

- **Controller**: `Growth.Service/Controllers/GoalController.cs:L33-37`
- **Command**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L73-77, L104-120`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | DTO | `src/Services/bravoGROWTH/Growth.Application/EntityDtos/GoalManagement/GoalDto.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-form/goal-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/goal.service.ts` |

<details>
<summary>Code Snippet: Child Goals Handling</summary>

```csharp
// SaveGoalCommand.cs:L73-77
.WithIf(
    x => !x.ChildGoals.IsNullOrEmpty(),
    x => x.ChildGoals!.ForEach(i =>
    {
        i.CompanyId = RequestContext.CurrentCompanyId();
    }))

// SaveGoalCommand.cs:L104-120
var toSaveGoals = toSaveGoalEntity.ChildGoals != null
    ? new List<Goal> { toSaveGoalEntity }.Concat(toSaveGoalEntity.ChildGoals).ToList()
    : [toSaveGoalEntity];

// Delete key result goals that has been deleted when updating objective goal
if (toSaveGoalEntity.GetRemovedChildGoals().Any())
{
    var toDeleteChildGoals = toSaveGoalEntity.GetRemovedChildGoals()
        .SelectList(toDeleteChildGoal => toDeleteChildGoal.AddDeleteChildGoalDomainEvent(toSaveGoalEntity));

    await goalRepository.DeleteManyAsync(
        toDeleteChildGoals,
        cancellationToken: cancellationToken);
}

// Update goal and its child goal
await goalRepository.CreateOrUpdateManyAsync(toSaveGoals, cancellationToken: cancellationToken);
```
</details>

---

#### TC-GM-003: Goal Visibility Control

**Priority**: P1-High

**Preconditions**:
- Goal exists with creator as owner
- Multiple users with different roles exist

**Test Steps** (Given-When-Then):
```gherkin
Given goal created with Visibility="OnlyMe"
When Goal.OnlyMe visibility is applied
Then only owner can view goal
  And line manager cannot view goal
  And other employees cannot view goal
  And admin can override and view goal

When visibility changed to "MeAndManager"
Then owner + manager can view
  And other employees cannot view

When visibility changed to "Public"
Then all employees can view goal

When visibility set to "SpecificPeople" with [User123, User456]
Then only specified users + owner can view
```

**Acceptance Criteria**:
- ✅ OnlyMe → Only owner visible
- ✅ MeAndManager → Owner + manager visible
- ✅ ThisOrgUnit → Owner's department visible
- ✅ ThisOrgUnitAndSubOrgs → Department + sub-departments visible
- ✅ SpecificPeople → Listed users + owner visible
- ✅ Public → All employees visible
- ✅ Admin bypasses visibility checks
- ❌ Non-authorized user attempting view returns 403 Forbidden

**Evidence**:

- **Controller**: `Growth.Service/Controllers/GoalController.cs:L64-68`
- **Command**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L100-102`
- **Queries**:
  - `Growth.Application/UseCaseQueries/Goals/GetGoalVisibilityQuery.cs` (visibility calculation)
  - `Growth.Application/UseCaseQueries/Goals/GetGoalListQuery.cs` (filtering with visibility)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Goals/GetGoalVisibilityQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalVisibility.cs` |

<details>
<summary>Code Snippet: Visibility Update</summary>

```csharp
// SaveGoalCommand.cs:L100-102
await toSaveGoalEntity
    .AutoUpdateGoalTarget(RequestContext.CurrentCompanyId())
    .PipeAction(goal => request.Data.UpdateToSaveGoalVisibilities(goal, organizationRepository, employeeRepository, isUpdate: request.Data.HasSubmitId()));
```
</details>

---

#### TC-GM-004: Update Goal Progress

**Priority**: P1-High

**Preconditions**:
- Goal exists with measurement tracking enabled
- User is goal owner or manager
- Goal status is Active

**Test Steps** (Given-When-Then):
```gherkin
Given goal with CurrentValue=10, TargetValue=20 exists
When user updates CurrentValue to 15
  And user updates Status to "Progressing"
  And user submits update
Then goal.Measurement.CurrentValue == 15
  And goal.Status == "Progressing"
  And goal.IsUpdatedCurrentValue == true
  And if goal is KeyResult, parent Objective marked as updated
  And notification sent to watchers
```

**Acceptance Criteria**:
- ✅ Current value updated correctly
- ✅ Progress percentage calculated: (15-10)/(20-10) * 100 = 50%
- ✅ Status transitions tracked: Draft → Progressing → Completed
- ✅ CompletedDate set when Status changes to Completed
- ✅ CompletedDate cleared when Status changes from Completed
- ✅ KeyResult update marks parent Objective as updated
- ❌ Invalid goal ID → 404 Not Found
- ❌ Non-owner/non-manager attempting update → 403 Forbidden

**Test Data**:
```json
{
  "goalId": "goal123",
  "currentValue": 15,
  "status": "Progressing"
}
```

**Evidence**:

- **Controller**: `Growth.Service/Controllers/GoalController.cs:L45-50`
- **Command**: `Growth.Application/UseCaseCommands/Goals/UpdateGoalCurrentValueMeasurementCommand.cs:L15-25, L55-85`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/UpdateGoalCurrentValueMeasurementCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-progress/goal-progress.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/goal.service.ts` |

<details>
<summary>Code Snippet: Progress Update with Parent Marking</summary>

```csharp
// UpdateGoalCurrentValueMeasurementCommand.cs:L15-24
public sealed class UpdateGoalCurrentValueMeasurementCommand : PlatformCqrsCommand<UpdateGoalCurrentValueMeasurementCommandResult>
{
    public GoalUpdateCurrentValue Data { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this
            .ValidateNot(Data.GoalId.IsNullOrEmpty, "Goal Id is required")
            .Of<IPlatformCqrsRequest>();
    }
}

// UpdateGoalCurrentValueMeasurementCommand.cs:L61-78
var goal = await goalRepository.GetByIdAsync(request.Data.GoalId, cancellationToken, p => p.ParentGoal, p => p.GoalEmployees)
    .Then(goal => goal.EnsureCanUpdateGoalProgressMeasurementOrDeleted(currentEmployee, RequestContext))
    .WithIf(
        x => x.Measurement != null && x.Measurement!.CurrentValue != request.Data.CurrentValue,
        x =>
        {
            x.Measurement!.CurrentValue = request.Data.CurrentValue;
            x.IsUpdatedCurrentValue = true;
        })
    .With(x => x.Status = request.Data.Status)
    .WithIf(
        x => (!x.CompletedDate.HasValue && x.Status == GoalStatuses.Completed) || (x.CompletedDate.HasValue && x.Status != GoalStatuses.Completed),
        x => x.CompletedDate = !x.CompletedDate.HasValue && x.Status == GoalStatuses.Completed ? Clock.Now : null);

if (goal.GoalType == GoalTypes.KeyResult && goal.ParentGoal != null)
    goal.ParentGoal.IsUpdatedCurrentValue = true;
```
</details>

---

#### TC-GM-005: Delete Goals

**Priority**: P1-High

**Preconditions**:
- Goals exist and not linked to active performance review
- User has delete permission (owner or admin)

**Test Steps** (Given-When-Then):
```gherkin
Given 3 goals selected for deletion
When user submits delete request with goal IDs
Then system validates goals are not in active review
  And soft-delete executed (IsDeleted=true)
  And cascade delete removes associated visibilities
  And cascade delete removes GoalEmployee records
  And if Objective deleted, all child KeyResults deleted
  And deletion audited to audit log
  And notification sent to owner and watchers
```

**Acceptance Criteria**:
- ✅ Bulk delete multiple goals in single request
- ✅ Soft delete preserves historical data
- ✅ GoalVisibility records cascade deleted
- ✅ Child goals of Objective cascade deleted
- ✅ Deleted goals excluded from all subsequent queries
- ❌ Delete goal linked to active PerformanceReview → Error "Goal is in review"
- ❌ Non-owner attempting delete → 403 Forbidden

**Test Data**:
```json
{
  "ids": ["goal123", "goal456", "goal789"]
}
```

**Evidence**:

- **Controller**: `Growth.Service/Controllers/GoalController.cs:L58-62`
- **Command**: `Growth.Application/UseCaseCommands/Goals/DeleteGoalCommand.cs:L15-59`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/DeleteGoalCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalVisibility.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-list/goal-list.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/goal.service.ts` |

<details>
<summary>Code Snippet: Cascade Delete Logic</summary>

```csharp
// DeleteGoalCommand.cs:L39-58
public override async Task HandleNoResult(DeleteGoalCommand request, CancellationToken cancellationToken)
{
    var currentEmployee = await RequestContext.CurrentEmployee();
    var toDeleteGoals = await goalRepository
        .GetAllAsync(predicate: x => request.Ids.Contains(x.Id), cancellationToken, p => p.ChildGoals, p => p.GoalEmployees)
        .Then(p => p.EnsureFoundAllBy(
            p => p.Id,
            request.Ids,
            notFoundIds => $"Not found goal with ids: {PlatformJsonSerializer.Serialize(notFoundIds)}"));

    await toDeleteGoals.ParallelAsync(async goal =>
    {
        await goal
            .EnsureCanUpdateGoalProgressMeasurementOrDeleted(currentEmployee, RequestContext)
            .SetParentGoal(goalRepository, cancellationToken);
    });

    await goalVisibilityRepository.DeleteManyAsync(x => request.Ids.Contains(x.GoalId), cancellationToken: cancellationToken);
    await goalRepository.DeleteManyAsync(toDeleteGoals, cancellationToken: cancellationToken);
}
```
</details>

---

### 1.2 Goal List & Filtering Tests

#### TC-GM-006: Filter Goals by Status and Date

**Priority**: P2-Medium

**Test Steps**: [Same as original]

**Evidence**:
- **Queries**:
  - `Growth.Application/UseCaseQueries/Goals/GetGoalListQuery.cs` (filtering)
  - `Growth.Application/UseCaseQueries/Goals/GetGoalListQueryHelper.cs` (filter expression building)
- **Controller**: `Growth.Service/Controllers/GoalController.cs:L52-56`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Goals/GetGoalListQuery.cs` |
| Backend | Helper | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Goals/GetGoalListQueryHelper.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-list/goal-list.component.ts` |

---

#### TC-GM-007: Goal Dashboard Summary

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/GoalController.cs:L82-86`
- **Query**: `Growth.Application/UseCaseQueries/Goals/GetGoalDashboardSummaryQuery.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Goals/GetGoalDashboardSummaryQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-dashboard/goal-dashboard.component.ts` |

---

## 2. Check-In Test Specs

### 2.1 Check-In Scheduling Tests

#### TC-CI-001: Schedule Check-In Series

**Priority**: P1-High

**Preconditions**:
- User has LeaderOrLineManagerPolicy role
- Company has CheckIn subscription
- Target employee is not external user
- Organizer != Target employee

**Test Steps** (Given-When-Then):
```gherkin
Given manager navigates to Schedule Check-In
When manager fills in:
  - CheckingEmployeeId: current manager's ID
  - TargetEmployeeId: team member's ID
  - Frequency: "Weekly"
  - StartDate: "2025-01-06"
  - IsTitleAutogenerated: true
  - DefaultTitle: "Weekly 1:1 with {EmployeeName}"
  And selects 2 discussion point templates
  And submits form
Then CheckInSeriesSetting created
  And first CheckInEvent generated with next Monday date
  And CheckInEvent.Title auto-generated with language string
  And notification sent to both organizer and participant
```

**Acceptance Criteria**:
- ✅ Organizer != participant (same person validation)
- ✅ DefaultTitle is required
- ✅ First check-in event auto-generated
- ✅ Frequency determines next date calculation
- ✅ Auto-generated title uses employee name and product scope language
- ✅ Discussion points linked to check-in event
- ❌ Target is external user → Validation error
- ❌ Organizer == Target → Validation error: "Cannot be same person"

**Test Data**:
```json
{
  "checkingEmployeeId": "mgr123",
  "targetEmployeeId": "emp456",
  "frequency": "Weekly",
  "startDate": "2025-01-06",
  "defaultTitle": "Weekly 1:1",
  "isTitleAutogenerated": true,
  "newDiscussionPoints": [
    { "title": "Goals Progress", "description": "Review OKR progress" },
    { "title": "Challenges", "description": "Discuss blockers" }
  ]
}
```

**Evidence**:

- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L16-17, L29-33`
  - Authorization: `EmployeePolicy`, `CheckInPolicy`
  - Endpoint: `POST /api/CheckIn` → `SaveCheckInManagement(SaveCheckInCommand)`

- **Command**: `Growth.Application/UseCaseCommands/CheckIn/SaveCheckInCommand.cs:L17-27, L58-68, L110-142`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/SaveCheckInCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInSeriesSetting.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-form/check-in-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/check-in.service.ts` |

<details>
<summary>Code Snippet: Same Person Validation</summary>

```csharp
// SaveCheckInCommand.cs:L21-26
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Data.CheckingEmployeeId != Data.TargetEmployeeId, "The organizer and the participant cannot be the same person.")
        .And(_ => Data.DefaultTitle != null, "DefaultTitle is required");
}
```
</details>

<details>
<summary>Code Snippet: External User Validation</summary>

```csharp
// SaveCheckInCommand.cs:L58-68
protected override async Task<PlatformValidationResult<SaveCheckInCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCheckInCommand> requestSelfValidation,
    CancellationToken cancellationToken
)
{
    return await requestSelfValidation.AndAsync(
        request =>
            employeeRepository.AnyAsync(p => p.Id == request.Data.TargetEmployeeId && p.IsExternalUser == false, cancellationToken),
        "External users can't be participants in scheduled check-ins."
    );
}
```
</details>

<details>
<summary>Code Snippet: Auto-Generated Check-In Event</summary>

```csharp
// SaveCheckInCommand.cs:L110-142
private async Task<CheckInEvent> CreateCheckInEvent(CheckInSeriesSetting checkInSetting, CancellationToken cancellationToken)
{
    var currentEmployee = await RequestContext.CurrentEmployee();
    var targetEmployee = await employeeRepository.GetByIdAsync(
        checkInSetting.TargetEmployeeId,
        cancellationToken,
        p => p.User);

    var (nextCheckInDate, nextCheckInTitle) = CheckInEvent.GetNextCheckInDate(checkInSetting)
        .GetWith(nextCheckInDate => checkInSetting.IsTitleAutogenerated
            ? CheckInEvent.GenerateCheckInTitleMapToLanguageString(
                nextCheckInDate.GetValueOrDefault(),
                targetEmployee.User?.FirstName ?? "",
                targetEmployee.User?.LastName ?? "",
                (ProductScopes)targetEmployee.ProductScope)
            : null);

    var (toSaveCheckInEvent, toSaveNextCheckInEvent) = new CheckInEvent(checkInSetting.With(p => p.TargetEmployee = targetEmployee), null)
        .ValidateCheckInParticipants(currentEmployee.Id)
        .EnsureValid()
        .GetWith(toSaveCheckInEvent => nextCheckInDate != null
            ? toSaveCheckInEvent.CreateNextCheckInEvent(
                    nextCheckInDate.Value,
                    nextCheckInTitle)
                .With(p => p.AddDomainEvent(new CheckInEvent.CreateDomainEventInfo { IgnoreSendEmailNotification = true }))
            : null);

    await checkInEventRepository.CreateManyAsync(
        toSaveNextCheckInEvent != null ? [toSaveCheckInEvent, toSaveNextCheckInEvent] : [toSaveCheckInEvent],
        cancellationToken: cancellationToken);

    return toSaveCheckInEvent;
}
```
</details>

---

#### TC-CI-002: Create One-Time Check-In

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L29-33`
- **Command**: `Growth.Application/UseCaseCommands/CheckIn/SaveCheckInCommand.cs:L70-108`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/SaveCheckInCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-form/check-in-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/check-in.service.ts` |

---

#### TC-CI-003: Update Check-In Status

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L63-67`
- **Command**: `Growth.Application/UseCaseCommands/CheckIn/UpdateCheckInStatusCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/UpdateCheckInStatusCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-detail/check-in-detail.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/check-in.service.ts` |

---

#### TC-CI-004: Record Check-In Notes

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L41-45, L69-73`
- **Commands**:
  - `Growth.Application/UseCaseCommands/CheckIn/UpdateCheckInCommand.cs`
  - `Growth.Application/UseCaseCommands/CheckIn/PartialUpdateCheckInCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/UpdateCheckInCommand.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/PartialUpdateCheckInCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-detail/check-in-detail.component.ts` |

---

#### TC-CI-005: Delete Check-In

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L75-80`
  - Authorization: `LeaderOrLineManagerPolicy` (manager-only)
- **Command**: `Growth.Application/UseCaseCommands/CheckIn/DeleteCheckInCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/DeleteCheckInCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInSeriesSetting.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-list/check-in-list.component.ts` |

---

### 2.2 Check-In Dashboard Tests

#### TC-CI-006: Team Check-In Dashboard

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L95-100`
- **Query**: `Growth.Application/UseCaseQueries/CheckIns/GetDirectReportCheckInsDashboardQuery.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/CheckIns/GetDirectReportCheckInsDashboardQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/check-in/check-in-dashboard/check-in-dashboard.component.ts` |

---

## 3. Performance Review Test Specs

### 3.1 Review Event Creation Tests

#### TC-PR-001: Create Performance Review Event

**Priority**: P0-Critical

**Preconditions**:
- User has HrManagerOrPerformanceReviewAdminPolicy role
- Company has PerformanceReview subscription
- Dates don't overlap with existing review cycles

**Test Steps** (Given-When-Then):
```gherkin
Given HR opens Performance Review creation
When HR fills in:
  - Title: "2025 Annual Performance Review"
  - ReviewType: "360"
  - StartDate: "2025-04-01"
  - EndDate: "2025-05-31"
  - ParticipantScope: "All employees"
  - PrimaryReviewers: "Direct managers"
  - AssessmentTemplates: ["Core Competencies", "Leadership"]
When HR submits
Then PerformanceReviewEvent created with status "Planning"
  And participant selection wizard triggered
  And system validates reviewer availability
  And no overlap with existing active reviews
```

**Acceptance Criteria**:
- ✅ Required fields validated: Title, StartDate, EndDate, ReviewType
- ✅ EndDate >= StartDate
- ✅ No overlapping review cycles (checked at database level)
- ✅ Event status starts as "Planning"
- ✅ Assessment templates selected and linked
- ❌ Review title not unique → Allow (same company can have multiple with same name)
- ❌ Overlapping date range → Validation error: "Review already running during this period"

**Test Data**:
```json
{
  "title": "2025 Annual Performance Review",
  "reviewType": "360",
  "startDate": "2025-04-01",
  "endDate": "2025-05-31",
  "status": "Planning",
  "participantScope": "AllEmployees",
  "primaryReviewers": "DirectManagers",
  "assessmentTemplateIds": ["template1", "template2"]
}
```

**Evidence**:

- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L20-22, L44-49`
  - Authorization: `EmployeePolicy`, `PerformanceReviewPolicy`
  - Endpoint: `POST /api/PerformanceReview/save-event` → `SavePerformanceReviewEvent(SavePerformanceReviewEventCommand)`

- **Command**: `Growth.Application/UseCaseCommands/PerformanceReview/SavePerformanceReviewEventCommand.cs`
- **Query (Overlap Check)**: `Growth.Application/UseCaseQueries/PerformanceReviews/CheckOverlapPerformanceReviewQuery.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/SavePerformanceReviewEventCommand.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/PerformanceReviews/CheckOverlapPerformanceReviewQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/review-event-form/review-event-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/performance-review.service.ts` |

---

#### TC-PR-002: Add Participants to Review

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L128-132` (assuming endpoint exists)
- **Command**: `Growth.Application/UseCaseCommands/PerformanceReview/AddParticipantIntoPerformanceReviewEventCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/AddParticipantIntoPerformanceReviewEventCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewParticipant.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/participant-management/participant-form.component.ts` |

---

#### TC-PR-003: Answer Performance Assessment

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L154-158`
  - Endpoint: `POST /api/PerformanceReview/assessment/answer-assessment`
- **Command**: `Growth.Application/UseCaseCommands/PerformanceReview/AnswerPerformanceReviewAssessmentCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/AnswerPerformanceReviewAssessmentCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewAssessment.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/assessment-form/assessment-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/performance-review.service.ts` |

---

#### TC-PR-004: Final Assessment & Feedback

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L95-99`
  - Endpoint: `POST /api/PerformanceReview/assessment/save-final-assessment`
- **Command**: `Growth.Application/UseCaseCommands/PerformanceReview/SavePerformanceReviewFinalAssessmentCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/SavePerformanceReviewFinalAssessmentCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewAssessment.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewParticipant.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/final-assessment/final-assessment.component.ts` |

---

#### TC-PR-005: Calibration Session

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L64-68`
- **Query**: `Growth.Application/UseCaseQueries/PerformanceReviews/GetPerformanceReviewCalibrationAssessmentsQuery.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/PerformanceReviews/GetPerformanceReviewCalibrationAssessmentsQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewAssessment.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/calibration/calibration.component.ts` |

---

#### TC-PR-006: Delete Performance Review Event

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L141-146`
  - Authorization: `HrManagerOrPerformanceReviewAdminPolicy` (HR/admin only)
- **Command**: `Growth.Application/UseCaseCommands/PerformanceReview/DeletePerformanceReviewEventCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/DeletePerformanceReviewEventCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewEvent.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/performance-review/review-event-list/review-event-list.component.ts` |

---

## 4. Time & Attendance Test Specs

### 4.1 Timesheet Tests

#### TC-TM-001: View Employee Timesheet

**Priority**: P1-High

**Evidence**:

- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs:L18, L42-63`
  - Authorization: `TimeManagementPolicy` (subscription), `HrOrLeaderOrLineManagerPolicy` (role)
  - Endpoint: `POST /api/TimeSheet` → `GetEmployeeWithTimeLogsList(GetEmployeeWithTimeLogsListQuery)`
  - **Caching**: Cache enabled with cache key parts and tags (L47-59)

- **Query**: `Growth.Application/UseCaseQueries/TimeManagement/GetEmployeeWithTimeLogsListQuery.cs`
- **Cache Provider**: `Growth.Application/Caching/GetEmployeeWithTimeLogsListQueryCacheKeyProvider.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/TimeManagement/GetEmployeeWithTimeLogsListQuery.cs` |
| Backend | Cache Provider | `src/Services/bravoGROWTH/Growth.Application/Caching/GetEmployeeWithTimeLogsListQueryCacheKeyProvider.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeLog.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/time-management/timesheet/timesheet.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/timesheet.service.ts` |

---

#### TC-TM-002: Add Time Log for Employee

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs:L65-70`
  - Authorization: `HrOrLeaderOrLineManagerPolicy`
- **Command**: `Growth.Application/UseCaseCommands/TimeManagement/AddTimeLogToEmployeeCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/TimeManagement/AddTimeLogToEmployeeCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeLog.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/time-management/timelog-form/timelog-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/timesheet.service.ts` |

---

#### TC-TM-003: Configure Timesheet Settings

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs` (settings endpoint)
- **Command**: `Growth.Application/UseCaseCommands/TimeManagement/SaveTimeSheetSettingCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/TimeManagement/SaveTimeSheetSettingCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeSheetSetting.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/time-management/settings/timesheet-settings.component.ts` |

---

#### TC-TM-004: Timesheet Export & Reporting

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs` (export endpoint)
- **Query**: `Growth.Application/UseCaseQueries/TimeManagement/ExportTimeSheetQuery.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/TimeManagement/ExportTimeSheetQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeLog.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/time-management/timesheet/timesheet.component.ts` |

---

#### TC-TM-005: Bulk Import Timesheet

**Priority**: P3-Low

**Evidence**:
- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs`
- **Command**: `Growth.Application/UseCaseCommands/TimeManagement/BulkImportTimeSheetCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/TimeManagement/BulkImportTimeSheetCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeLog.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/time-management/import/timesheet-import.component.ts` |

---

### 4.2 Leave Request Tests

#### TC-TM-006: Request Leave

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/LeaveRequestController.cs`
- **Commands**: Leave request commands in `Growth.Application/UseCaseCommands/LeaveRequest/`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/LeaveRequestController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/LeaveRequest/SaveLeaveRequestCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/LeaveManagement/LeaveRequest.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/leave-management/leave-request-form/leave-request-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/leave-request.service.ts` |

---

#### TC-TM-007: Remaining Leave Balance

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/RemainingLeaveController.cs`
- **Queries**: `Growth.Application/UseCaseQueries/RemainingLeave/`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/RemainingLeaveController.cs` |
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/RemainingLeave/GetRemainingLeaveQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/LeaveManagement/RemainingLeave.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/leave-management/leave-balance/leave-balance.component.ts` |

---

## 5. Form Templates Test Specs

### 5.1 Form Template Management Tests

#### TC-FT-001: Create Form Template

**Priority**: P1-High

**Evidence**:

- **Controller**: `Growth.Service/Controllers/FormTemplateController.cs:L20-21, L55-59`
  - Authorization: `EmployeePolicy`, `PerformanceReviewPolicy`
  - Endpoint: `POST /api/FormTemplate/save-template`

- **Command**: `Growth.Application/UseCaseCommands/FormTemplate/SaveFormTemplateCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/FormTemplateController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/FormTemplate/SaveFormTemplateCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/FormTemplate/FormTemplate.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/form-template/template-form/template-form.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/form-template.service.ts` |

---

#### TC-FT-002: Clone Form Template

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/FormTemplateController.cs:L61-65`
- **Command**: `Growth.Application/UseCaseCommands/FormTemplate/CloneFormTemplateCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/FormTemplateController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/FormTemplate/CloneFormTemplateCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/FormTemplate/FormTemplate.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/form-template/template-list/template-list.component.ts` |
| Frontend | Service | `src/WebV2/libs/bravo-domain/src/lib/growth/form-template.service.ts` |

---

#### TC-FT-003: Reorder Questions and Sections

**Priority**: P2-Medium

**Evidence**:
- **Controller**: `Growth.Service/Controllers/FormTemplateController.cs`
- **Command**: `Growth.Application/UseCaseCommands/FormTemplate/ReorderFormTemplateItemsCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/FormTemplateController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/FormTemplate/ReorderFormTemplateItemsCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/FormTemplate/FormTemplate.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/form-template/template-builder/template-builder.component.ts` |

---

#### ~~TC-FT-004~~ → TC-FT-017: Delete Form Template

**Priority**: P2-Medium
**Note**: Renumbered from TC-FT-004 to TC-FT-017. Code uses TC-FT-004 for "Duplicate Code Behavior" test. See Section 10.9 for details.
**Test File**: `Growth.IntegrationTests/FormTemplates/DeleteFormTemplateCommandIntegrationTests.cs` (TC-FT-017..019)

**Evidence**:
- **Controller**: `Growth.Service/Controllers/FormTemplateController.cs:L67-70`
- **Command**: `Growth.Application/UseCaseCommands/FormTemplate/DeleteFormTemplateCommand.cs`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/FormTemplateController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/FormTemplate/DeleteFormTemplateCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/FormTemplate/FormTemplate.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/form-template/template-list/template-list.component.ts` |

---

## 6. Permission & Authorization Test Specs

### 6.1 Role-Based Access Control Tests

#### TC-PERM-001: Goal Creator Permissions

**Priority**: P0-Critical

**Evidence**:
- **Handler Validation**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L48-58` (permission checks)
- **Frontend**: `src/WebV2/apps/bravo-growth-for-company/` (permission logic in Angular components)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Frontend | Component | `src/WebV2/apps/bravo-growth-for-company/src/app/goal-management/goal-form/goal-form.component.ts` |

---

#### TC-PERM-002: Manager Permissions for Team Goals

**Priority**: P1-High

**Evidence**:
- **Query with Visibility**: `Growth.Application/UseCaseQueries/Goals/GetGoalListQuery.cs`
- **Authorization Policy**: `CompanyRoleAuthorizationPolicies.LeaderOrLineManagerPolicy`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Query | `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/Goals/GetGoalListQuery.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalVisibility.cs` |
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |

---

#### TC-PERM-003: Admin Override Permissions

**Priority**: P0-Critical

**Evidence**:
- **Controller Auth**: All controllers use `CompanyRoleAuthorizationPolicies`
- **Handler**: Admin bypass logic in command handlers (no permission checks for admin)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |

---

#### TC-PERM-004: Check-In Access Control

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/CheckInController.cs:L75-80`
  - Delete endpoint restricted to `LeaderOrLineManagerPolicy`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/CheckIn/DeleteCheckInCommand.cs` |
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |

---

#### TC-PERM-005: Performance Review Reviewer Access

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/PerformanceReviewController.cs:L20-22`
  - Base policies: `EmployeePolicy`, `PerformanceReviewPolicy`
- **Assessment Queries**: Reviewer filtering in assessment query handlers

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/AnswerPerformanceReviewAssessmentCommand.cs` |
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewAssessment.cs` |

---

#### TC-PERM-006: Timesheet Approval Workflow

**Priority**: P1-High

**Evidence**:
- **Controller**: `Growth.Service/Controllers/TimeSheetController.cs:L18, L34, L41, L65`
  - Authorization policies per endpoint: `HrOrLeaderOrLineManagerPolicy`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/TimeManagement/AddTimeLogToEmployeeCommand.cs` |
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanyRoleAuthorizationPolicies.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/TimeLog.cs` |

---

### 6.2 Subscription Policy Tests

#### TC-SUB-001: Feature Access with Subscription

**Priority**: P0-Critical

**Evidence**:

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanySubscriptionAuthorizationPolicies.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/CheckInController.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs` |
| Backend | Controller | `src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs` |

<details>
<summary>Code Snippet: Subscription Policies Across Controllers</summary>

```csharp
// GoalController.cs:L20-21
[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
[Authorize(Policy = CompanySubscriptionAuthorizationPolicies.GoalPolicy)]

// CheckInController.cs:L16-17
[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
[Authorize(Policy = CompanySubscriptionAuthorizationPolicies.CheckInPolicy)]

// PerformanceReviewController.cs:L20-22
[Authorize(Policy = CompanyRoleAuthorizationPolicies.EmployeePolicy)]
[Authorize(Policy = CompanySubscriptionAuthorizationPolicies.PerformanceReviewPolicy)]

// TimeSheetController.cs:L18
[Authorize(Policy = CompanySubscriptionAuthorizationPolicies.TimeManagementPolicy)]
```
</details>

---

#### TC-SUB-002: Feature Disabled Mid-Cycle

**Priority**: P2-Medium

**Evidence**:
- **Platform Middleware**: Subscription policy enforcement in Easy.Platform
- **Soft Block**: Data preserved, access blocked via authorization policies

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Authorization | `src/Platform/Easy.Platform/Application/Authorization/CompanySubscriptionAuthorizationPolicies.cs` |
| Backend | Middleware | `src/Platform/Easy.Platform/Application/Middleware/` |

---

## 7. Cross-Service Integration Test Specs

### 7.1 Message Bus Integration Tests

#### TC-INTEG-001: Goal Created Event Published

**Priority**: P1-High

**Evidence**:
- **Command Handler**: `Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs:L120`
  - `CreateOrUpdateManyAsync` auto-triggers `PlatformCqrsEntityEvent<Goal>`
- **Entity Event Handlers**: `Growth.Application/UseCaseEvents/Goals/` (notification handlers)
- **Platform Framework**: `Easy.Platform.Domain.Events` (auto-publishing)

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |
| Backend | Event Handler | `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/Goals/` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Platform | `src/Platform/Easy.Platform/Domain/Events/PlatformCqrsEntityEvent.cs` |

---

#### TC-INTEG-002: Employee Deleted Cascade

**Priority**: P1-High

**Evidence**:
- **Consumer**: `Growth.Application/MessageBusConsumers/DeleteGoalOnDeleteEmployeeEntityEventHandler.cs` (or similar)
- **Event Bus**: RabbitMQ message bus configured in `Easy.Platform`

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Consumer | `src/Services/bravoGROWTH/Growth.Application/MessageBusConsumers/` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Platform | `src/Platform/Easy.Platform/Infrastructure/MessageBus/` |

---

#### TC-INTEG-003: Organization Structure Changes

**Priority**: P2-Medium

**Evidence**:
- **Cross-Service**: Message bus integration with bravoTALENTS
- **Visibility Recalculation**: Dynamic visibility based on org unit membership

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Consumer | `src/Services/bravoGROWTH/Growth.Application/MessageBusConsumers/` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalVisibility.cs` |
| Backend | Command | `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/Goals/SaveGoalCommand.cs` |

---

### 7.2 Data Consistency Tests

#### TC-INTEG-004: Goal-CheckIn Linkage

**Priority**: P2-Medium

**Evidence**:
- **Domain Entities**:
  - `Growth.Domain/Entities/GoalManagement/Goal.cs`
  - `Growth.Domain/Entities/CheckIn/CheckInEvent.cs`
- **Relationship Entity**: `GoalCheckIn` entity for bidirectional reference

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/CheckInEvent.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/CheckIn/GoalCheckIn.cs` |

---

#### TC-INTEG-005: Goal-PerformanceReview Linkage

**Priority**: P2-Medium

**Evidence**:
- **Domain Entities**:
  - `Growth.Domain/Entities/GoalManagement/Goal.cs`
  - `Growth.Domain/Entities/PerformanceReview/`
- **Relationship Entity**: `GoalPerformanceReviewParticipant` entity

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewParticipant.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/GoalPerformanceReviewParticipant.cs` |

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Test environment with clean database
- [ ] Mock data seeded for all test scenarios
- [ ] Authentication/authorization configured
- [ ] Message bus (RabbitMQ) operational
- [ ] Email service mocked or captured

### Unit Test Requirements
- [ ] Validation logic tests
- [ ] Entity event handler tests
- [ ] Command handler logic tests
- [ ] Query handler filtering tests
- [ ] Permission/authorization logic tests

### Integration Test Requirements
- [ ] API endpoint tests (happy path and errors)
- [ ] Database transaction tests
- [ ] Message bus event publishing/consuming
- [ ] Cross-service communication tests
- [ ] Caching behavior tests

### Performance Test Requirements
- [ ] Dashboard queries with 1000+ goals
- [ ] Bulk operations (delete 100 goals)
- [ ] Concurrent timesheet submissions
- [ ] Concurrent assessment submissions
- [ ] Cache effectiveness measurement

### Regression Test Requirements
- [ ] All previous releases' test cases
- [ ] Known issue test cases
- [ ] Edge cases from production incidents

---

## Code Evidence Summary

### File Locations

**Backend (C#)**:
- **Controllers**: `src/Services/bravoGROWTH/Growth.Service/Controllers/`
- **Commands**: `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/`
- **Queries**: `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/`
- **Entities**: `src/Services/bravoGROWTH/Growth.Domain/Entities/`
- **DTOs**: `src/Services/bravoGROWTH/Growth.Application/EntityDtos/`
- **Event Handlers**: `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/`

**Frontend (Angular 19)**:
- **Components**: `src/WebV2/apps/bravo-growth-for-company/src/app/`
- **Services**: `src/WebV2/libs/bravo-domain/src/lib/growth/`
- **Models**: `src/WebV2/libs/bravo-domain/src/lib/growth/models/`

### Authorization Policies Used

| Policy | Purpose | Controllers |
|--------|---------|-------------|
| `EmployeePolicy` | Base employee access | Goal, CheckIn, PerformanceReview, FormTemplate |
| `LeaderOrLineManagerPolicy` | Manager actions | CheckIn (delete), TimeSheet |
| `HrOrLeaderOrLineManagerPolicy` | HR/Manager actions | TimeSheet, TimeLog |
| `HrManagerOrPerformanceReviewAdminPolicy` | HR/Admin only | PerformanceReview (delete) |
| `GoalPolicy` | Goal subscription | Goal |
| `CheckInPolicy` | CheckIn subscription | CheckIn |
| `PerformanceReviewPolicy` | Performance Review subscription | PerformanceReview, FormTemplate |
| `TimeManagementPolicy` | Time & Attendance subscription | TimeSheet |

---

## Unresolved Questions

1. **Goal Hierarchy Circular Reference**: How deep can goal parent-child hierarchy go? Is there a validation to prevent circular references (Goal A → Goal B → Goal A)?

2. **CheckIn Frequency Customization**: Beyond Weekly/Bi-weekly/Monthly, can companies define custom frequencies (e.g., every 3 weeks)?

3. **Performance Review Overlap Prevention**: The CheckOverlapPerformanceReviewQuery prevents overlaps. What's the exact logic? (1) Start date overlap, (2) Any day overlap, (3) Participant conflict?

4. **TimeSheet Cycle Locking**: Once a timesheet cycle is locked, can exceptions be made? (e.g., HR override to add missing entry)?

5. **Form Template Versioning**: Are form template versions tracked? If existing review uses Template v1 and it's updated, does review continue using v1 or update to v2?

6. **Leave Balance Carryover**: How does yearly leave carryover work across fiscal/calendar years? Is there a carryover limit?

7. **Assessment Unlock Behavior**: When calibration unlocks an assessment, what data is preserved vs. reset? Can reviewer submit different values?

8. **Goal Visibility Inheritance**: Do child KeyResults inherit parent Objective visibility or have independent visibility?

9. **External User Restrictions**: Besides goal and check-in creation, what other operations are blocked for external users?

10. **Multi-language Form Templates**: Are form question translations stored per language or selected at review creation time?

---

## 8. Background Job Integration Test Specs

### 8.1 Overview

Background job integration tests verify recurring/scheduled jobs through the real `IPlatformApplicationBackgroundJobScheduler` pipeline. Tests seed prerequisite data, execute the job via the scheduler (not direct invocation), and assert DB state changes.

**Test Pattern for Paged/BatchScrolling Executors**: These jobs internally call `scheduler.Schedule()` to enqueue child processing pages. To force inline execution in tests, pass explicit `Skip/Take` (paged) or `BatchKey` (batch scrolling) parameters via `ExecuteBackgroundJobWithParamAsync`.

**Test Files**: `Growth.IntegrationTests/BackgroundJobs/`

### 8.2 Kudos Quota Reset Tests

#### TC-BG-001: Kudos Quota Reset Updates Outdated Quotas

**Priority**: P1-High

**Preconditions**:
- KudosUserQuota exists with `CurrentWeekStart` < current week start
- KudosCompanySetting exists for the company with `DefaultWeeklyQuota`

**Test Steps**:
```gherkin
Given a KudosUserQuota with CurrentWeekStart from last week and WeeklyQuotaUsed = 3
When KudosQuotaResetBackgroundJobExecutor is executed via scheduler
Then KudosUserQuota.WeeklyQuotaUsed should be 0
  And KudosUserQuota.CurrentWeekStart should be updated to current week
  And KudosUserQuota.LastResetDate should be set
```

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | BG Job | `src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/Kudos/KudosQuotaResetBackgroundJobExecutor.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/Kudos/KudosUserQuota.cs` |
| Test | Integration | `src/Services/bravoGROWTH/Growth.IntegrationTests/BackgroundJobs/KudosQuotaResetIntegrationTests.cs` |

---

#### TC-BG-002: Kudos Quota Reset Skips Current-Week Quotas

**Priority**: P1-High

**Test Steps**:
```gherkin
Given a KudosUserQuota with CurrentWeekStart = current week and WeeklyQuotaUsed = 2
When KudosQuotaResetBackgroundJobExecutor is executed via scheduler
Then KudosUserQuota.WeeklyQuotaUsed should remain 2 (unchanged)
  And KudosUserQuota.CurrentWeekStart should remain unchanged
```

---

### 8.3 Auto-Activate Performance Review Event Tests

#### TC-BG-003: Auto-Activate Published PR Event When StartDate Reached

**Priority**: P1-High

**Preconditions**:
- PerformanceReviewEvent exists with Status = Published and StartDate <= today
- Company has active Performance Review subscription license

**Test Steps**:
```gherkin
Given a PerformanceReviewEvent with Status = Published and StartDate = yesterday
When AutoActivePerformanceReviewEventBackgroundJobExecutor is executed via scheduler
Then PerformanceReviewEvent.Status should be Active
```

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | BG Job | `src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/PerformanceReviews/AutoActivePerformanceReviewEventBackgroundJobExecutor.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/Event/PerformanceReviewEvent.cs` |
| Test | Integration | `src/Services/bravoGROWTH/Growth.IntegrationTests/BackgroundJobs/AutoActivePREventIntegrationTests.cs` |

---

#### TC-BG-004: Auto-Activate Skips Events With Future StartDate

**Priority**: P1-High

**Test Steps**:
```gherkin
Given a PerformanceReviewEvent with Status = Published and StartDate = 7 days from now
When AutoActivePerformanceReviewEventBackgroundJobExecutor is executed via scheduler
Then PerformanceReviewEvent.Status should remain Published
```

---

### 8.4 Auto-Update Next Check-In Employee Tests

#### TC-BG-005: Updates Employee.NextCheckInDate From Upcoming CheckInEvents

**Priority**: P1-High

**Preconditions**:
- CheckInEvent exists with CheckInDate >= today for a target employee
- Employee.NextCheckInDate is null (cleared for test verification)

**Test Steps**:
```gherkin
Given an Employee with NextCheckInDate = null
  And a CheckInEvent with future CheckInDate for that Employee
When AutoUpdateNextCheckInEmployeeBackgroundJobExecutor is executed via scheduler
Then Employee.NextCheckInDate should be set to a date >= today
```

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | BG Job | `src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/CheckIns/AutoUpdateNextCheckInEmployeeBackgroundJobExecutor.cs` |
| Backend | Entity | `src/Services/bravoGROWTH/Growth.Domain/Entities/Employee.cs` |
| Test | Integration | `src/Services/bravoGROWTH/Growth.IntegrationTests/BackgroundJobs/AutoUpdateNextCheckInIntegrationTests.cs` |

---

### 8.5 Goal Deadline Reminder Tests (Notification-Only)

#### TC-BG-006: Goal Deadline Reminder Executes Without Error

**Priority**: P2-Medium

**Test Steps**:
```gherkin
Given the system has employees (with or without due-soon goals)
When GoalDeadlinesSendReminderBackgroundJobExecutor is executed via scheduler
Then the job completes without throwing an exception
```

**Note**: This is a notification-only job — it sends emails but does not modify DB state. Success is verified by execution completing without error.

**Related Files**:

| Layer | Type | File Path |
|-------|------|-----------|
| Backend | BG Job | `src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/Goals/GoalDeadlinesSendReminderBackgroundJobExecutor.cs` |
| Test | Integration | `src/Services/bravoGROWTH/Growth.IntegrationTests/BackgroundJobs/GoalDeadlineReminderIntegrationTests.cs` |

---

## 9. Kudos Test Specs

### 9.1 Send Kudos Tests

#### TC-KD-001: Send Kudos to Valid Recipient Creates Transaction

**Priority**: P0-Critical
**Test File**: `Growth.IntegrationTests/Kudos/SendKudosCommandIntegrationTests.cs`
**Known Issue**: May fail with RowVersionConflictException due to EF Core optimistic concurrency on KudosUserQuota entity.

#### TC-KD-002: Send Single Kudo Creates Transaction With Quantity One

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/SendKudosCommandIntegrationTests.cs`

#### TC-KD-003: Send Kudos With Missing Message Fails Validation

**Priority**: P1-High — Verifies `Message is required` validation rule.
**Test File**: `Growth.IntegrationTests/Kudos/SendKudosCommandIntegrationTests.cs`

#### TC-KD-004: Send Kudos to Self Fails Validation

**Priority**: P1-High — Verifies self-recipient prevention.
**Test File**: `Growth.IntegrationTests/Kudos/SendKudosCommandIntegrationTests.cs`

### 9.2 Kudos Interaction Tests

#### TC-KD-005: Comment on Kudos Transaction Persists

**Priority**: P1-High — Creates transaction, adds comment, verifies DB state.
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

#### TC-KD-006: Comment With Empty Content Succeeds (Documents Validation Bug)

**Priority**: P2-Medium — Documents that CommentTransactionCommand.Validate() checks TransactionId twice instead of Comment field.
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

#### TC-KD-007: Reaction on Transaction Persists

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

#### TC-KD-008: Reaction on Comment Persists

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

#### TC-KD-009: Delete Own Comment Removes From DB

**Priority**: P0-Critical
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

#### TC-KD-010: Delete Own Transaction Removes From DB

**Priority**: P0-Critical
**Test File**: `Growth.IntegrationTests/Kudos/KudosInteractionIntegrationTests.cs`

### 9.3 Kudos Company Setting Tests

#### TC-KD-011: Save New Company Setting Creates Successfully

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/SaveKudosCompanySettingCommandIntegrationTests.cs`

#### TC-KD-012: Update Existing Company Setting Updates Fields

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/SaveKudosCompanySettingCommandIntegrationTests.cs`

#### TC-KD-013: Invalid Quota Value Fails Validation

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/SaveKudosCompanySettingCommandIntegrationTests.cs`

#### TC-KD-014: Quota Exceeds Max Fails Validation

**Priority**: P1-High
**Test File**: `Growth.IntegrationTests/Kudos/SaveKudosCompanySettingCommandIntegrationTests.cs`

---

## 10. Integration Test Implementation Index

Complete mapping of all TC-XXX test spec codes to their integration test implementations.

**Total: 162 TC codes across 46 test files in 7 domains + 3 new delete template tests**

### 10.1 Goal Management (TC-GM: 24 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-GM-001 | CreateGoal_WhenValidIndividualGoal_ShouldCreateSuccessfully | GoalCommandIntegrationTests.cs |
| TC-GM-002 | CreateObjectiveGoal_WhenWithMultipleKeyResults_ShouldCreateHierarchySuccessfully | GoalCommandIntegrationTests.cs |
| TC-GM-003 | SaveGoalCommand_WhenUpdatingMeasurement_ShouldCalculateProgress | GoalCommandIntegrationTests.cs |
| TC-GM-004 | SaveGoalCommand_WhenProgressReaches100Percent_ShouldAutoComplete | GoalCommandIntegrationTests.cs |
| TC-GM-005 | ExecuteWithServicesAsync_ShouldAllowDirectRepositoryAccess | GoalCommandIntegrationTests.cs |
| TC-GM-006 | CreateOKRHierarchy_WhenMultiLevel_ShouldEstablishParentChildRelationships | GoalCommandIntegrationTests.cs |
| TC-GM-007 | CreateGoal_WhenDueDateBeforeStartDate_ShouldStillCreate | GoalCommandIntegrationTests.cs |
| TC-GM-008 | SaveGoalCommand_WhenMissingTitle_ShouldStillCreate | GoalCommandIntegrationTests.cs |
| TC-GM-009 | SaveGoalCommand_WhenCreatingWithParentId_ShouldEstablishParentChild | GoalCommandIntegrationTests.cs |
| TC-GM-010 | SaveGoalCommand_WhenUpdatingExistingGoal_ShouldPreserveIdAndUpdateFields | GoalCommandIntegrationTests.cs |
| TC-GM-011 | GetGoalListQuery_WhenAdminUser_ShouldAccessAllGoals | GoalQueryIntegrationTests.cs |
| TC-GM-012 | GetGoalListQuery_WhenGoalsExist_ShouldReturnResults | GoalQueryIntegrationTests.cs |
| TC-GM-013 | DeleteGoal_WhenSingleGoal_ShouldDeleteFromDatabase | DeleteGoalCommandIntegrationTests.cs |
| TC-GM-014 | DeleteGoal_WhenMultipleGoalIds_ShouldDeleteAll | DeleteGoalCommandIntegrationTests.cs |
| TC-GM-015 | DeleteGoal_WhenObjectiveWithKeyResults_ShouldCascadeDeleteChildren | DeleteGoalCommandIntegrationTests.cs |
| TC-GM-016 | UpdateGoalCurrentValueMeasurement_WhenPartialProgress_ShouldUpdateValueAndStatus | UpdateGoalCurrentValueMeasurementCommandIntegrationTests.cs |
| TC-GM-017 | UpdateGoalCurrentValueMeasurement_When100Percent_ShouldAutoCompleteGoal | UpdateGoalCurrentValueMeasurementCommandIntegrationTests.cs |
| TC-GM-018 | UpdateGoalCurrentValueMeasurement_WhenObjectiveWithKeyResults_ShouldRecalculateParentProgress | UpdateGoalCurrentValueMeasurementCommandIntegrationTests.cs |
| TC-GM-019 | GetGoalOwnerQuery_WhenSearching_ShouldReturnPagedEmployees | GoalDashboardQueryIntegrationTests.cs |
| TC-GM-020 | GetGoalOwnerQuery_WithSelectedIds_ShouldReturnSelectedItems | GoalDashboardQueryIntegrationTests.cs |
| TC-GM-021 | GetGoalVisibilityQuery_WhenSearching_ShouldReturnPagedResults | GoalDashboardQueryIntegrationTests.cs |
| TC-GM-022 | GetGoalListQuery_Should_Return_Goals_With_Proper_Filtering | GoalListQueryIntegrationTests.cs |
| TC-GM-023 | GetGoalListQuery_Should_Handle_Date_Range_Filtering | GoalListQueryIntegrationTests.cs |
| TC-GM-024 | GetGoalListQuery_Should_Support_Employee_And_Organization_Filtering | GoalListQueryIntegrationTests.cs |

### 10.2 Check-Ins (TC-CI: 21 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-CI-001 | CreateCheckIn_WhenValidTargetEmployee_ShouldCreateSuccessfully | CheckInIntegrationTests.cs |
| TC-CI-002 | CreateCheckIn_WhenInvalidTargetEmployee_ShouldFailValidation | CheckInIntegrationTests.cs |
| TC-CI-003 | CreateCheckIn_WhenConcurrentCommands_ShouldHandleGracefully | CheckInIntegrationTests.cs |
| TC-CI-004 | CreateCheckIn_WhenHrManager_ShouldRespectPermissions | CheckInIntegrationTests.cs |
| TC-CI-005 | CreateCheckIn_WithDifferentFrequencies_ShouldAllBeValid | CheckInIntegrationTests.cs |
| TC-CI-006 | CreateCheckIn_WithDiscussionPoints_ShouldCreateWithPoints | CheckInIntegrationTests.cs |
| TC-CI-007 | SaveCheckIn_WhenOrganizerEqualsParticipant_ShouldFailValidation | CriticalCheckInManagementIntegrationTests.cs |
| TC-CI-008 | SaveCheckIn_WhenMissingDefaultTitle_ShouldFailValidation | CriticalCheckInManagementIntegrationTests.cs |
| TC-CI-009 | DeleteCheckIn_WhenSingleCheckIn_ShouldDeleteEvent | DeleteCheckInCommandIntegrationTests.cs |
| TC-CI-010 | DeleteCheckIn_WhenSeriesAndFollowing_ShouldDeleteFutureEvents | DeleteCheckInCommandIntegrationTests.cs |
| TC-CI-011 | DeleteCheckIn_WhenDifferentUser_ShouldStillDeleteSuccessfully | DeleteCheckInCommandIntegrationTests.cs |
| TC-CI-012 | PartialUpdateCheckIn_WhenAddingDiscussionPoints_ShouldPersist | PartialUpdateCheckInCommandIntegrationTests.cs |
| TC-CI-013 | PartialUpdateCheckIn_WhenAddingNotes_ShouldPersistWithOwner | PartialUpdateCheckInCommandIntegrationTests.cs |
| TC-CI-014 | PartialUpdateCheckIn_WhenDeletingNote_ShouldRemoveFromDb | PartialUpdateCheckInCommandIntegrationTests.cs |
| TC-CI-015 | PartialUpdateCheckIn_WhenReplacingDiscussionPoints_ShouldOverwrite | PartialUpdateCheckInCommandIntegrationTests.cs |
| TC-CI-016 | UpdateCheckInStatus_WhenIncompleteToCompleted_ShouldWrapUp | UpdateCheckInStatusCommandIntegrationTests.cs |
| TC-CI-017 | UpdateCheckInStatus_WhenAlreadyCompleted_ShouldStillAllowRevert | UpdateCheckInStatusCommandIntegrationTests.cs |
| TC-CI-018 | UpdateCheckInStatus_WhenCompletedAndTriedToPartialUpdate_ShouldLockEdits | UpdateCheckInStatusCommandIntegrationTests.cs |
| TC-CI-019 | GetMyCheckInDashboardQuery_WhenExecuted_ShouldReturnDashboardMetrics | CheckInQueryIntegrationTests.cs |
| TC-CI-020 | GetMyCheckInDashboardSummaryQuery_WhenExecuted_ShouldReturnSummaryCounts | CheckInQueryIntegrationTests.cs |
| TC-CI-021 | GetMyCheckInListOverviewQuery_WhenExecuted_ShouldReturnPagedResults | CheckInQueryIntegrationTests.cs |

### 10.3 Performance Reviews (TC-PR: 20 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-PR-001..011 | PerformanceReviewIntegrationTests (11 tests) | PerformanceReviewIntegrationTests.cs |
| TC-PR-012 | DeletePREvent_WhenDraftStatus_ShouldDeleteSuccessfully | DeletePerformanceReviewEventCommandIntegrationTests.cs |
| TC-PR-013 | DeletePREvent_WhenPublishedWithFutureStartDate_ShouldDeleteSuccessfully | DeletePerformanceReviewEventCommandIntegrationTests.cs |
| TC-PR-014 | DeletePREvent_WhenActiveStatus_ShouldFailValidation | DeletePerformanceReviewEventCommandIntegrationTests.cs |
| TC-PR-015 | DeletePREvent_WhenClosedStatus_ShouldFailValidation | DeletePerformanceReviewEventCommandIntegrationTests.cs |
| TC-PR-016..017 | RemovePerformanceReviewParticipantInfos (2 tests) | RemovePerformanceReviewParticipantInfosCommandIntegrationTests.cs |
| TC-PR-018..020 | PerformanceReviewQuery (3 tests) | PerformanceReviewQueryIntegrationTests.cs |

### 10.4 Time Management (TC-TM: 58 tests)

| TC Code | Tests | Test File |
|---------|-------|-----------|
| TC-TM-001..006 | SaveLeaveRequest (6 tests) | SaveLeaveRequestCommandIntegrationTests.cs |
| TC-TM-007..011 | SaveAttendanceRequest (5 tests) | SaveAttendanceRequestCommandIntegrationTests.cs |
| TC-TM-012..014 | AddTimeLog (3 tests) | AddTimeLogToEmployeeCommandIntegrationTests.cs |
| TC-TM-015..018 | SaveLeaveRequestFullPipeline (4 tests) | SaveLeaveRequestFullPipelineIntegrationTests.cs |
| TC-TM-019..020 | EmployeeRemainingBalance (2 tests) | EmployeeRemainingBalanceCommandIntegrationTests.cs |
| TC-TM-021..022 | SaveCompanyHolidayPolicy (2 tests) | SaveCompanyHolidayPolicyCommandIntegrationTests.cs |
| TC-TM-023..024 | SaveTimeSheetSetting (2 tests) | SaveTimeSheetSettingCommandIntegrationTests.cs |
| TC-TM-025..027 | SaveWorkingShift (3 tests) | SaveWorkingShiftCommandIntegrationTests.cs |
| TC-TM-028..030 | ChangeTimesheetRequestStatus (3 tests) | ChangeTimesheetRequestStatusCommandIntegrationTests.cs |
| TC-TM-031..036 | TimeLogManagement (6 tests) | TimeLogManagementIntegrationTests.cs |
| TC-TM-037..039 | ChangeAttendanceRequestStatus (3 tests) | ChangeAttendanceRequestStatusCommandIntegrationTests.cs |
| TC-TM-040..043 | ChangeLeaveRequestStatus (4 tests) | ChangeLeaveRequestStatusCommandIntegrationTests.cs |
| TC-TM-044..047 | SaveRequestType (4 tests) | SaveRequestTypeCommandIntegrationTests.cs |
| TC-TM-048..050 | TimeManagementQuery (3 tests) | TimeManagementQueryIntegrationTests.cs |
| TC-TM-051..058 | TimeManagementEmployeeQuery (8 tests) | TimeManagementEmployeeQueryIntegrationTests.cs |

### 10.5 Form Templates (TC-FT: 19 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-FT-001 | SaveFormTemplate_WhenNewDraft_ShouldCreateSuccessfully | SaveFormTemplateCommandIntegrationTests.cs |
| TC-FT-002 | SaveFormTemplate_WhenUpdatingDraft_ShouldUpdateFields | SaveFormTemplateCommandIntegrationTests.cs |
| TC-FT-003 | SaveFormTemplate_WhenMissingName_ShouldFailValidation | SaveFormTemplateCommandIntegrationTests.cs |
| TC-FT-004 | SaveFormTemplate_WhenDuplicateCode_ShouldStillCreate | SaveFormTemplateCommandIntegrationTests.cs |
| TC-FT-005 | ChangeStatus_WhenDraftToPublished_ShouldUpdateSuccessfully | ChangeFormTemplateStatusCommandIntegrationTests.cs |
| TC-FT-006 | ChangeStatus_WhenPublishedToArchived_ShouldUpdateSuccessfully | ChangeFormTemplateStatusCommandIntegrationTests.cs |
| TC-FT-007 | ChangeStatus_WhenArchivedToDraft_ShouldSucceedIfNotInUse | ChangeFormTemplateStatusCommandIntegrationTests.cs |
| TC-FT-008 | CloneTemplate_WhenSourceHasQuestions_ShouldCreateCopyWithAllContent | CloneFormTemplateCommandIntegrationTests.cs |
| TC-FT-009 | CloneTemplate_WhenSourceIsPublished_ShouldCloneAsDraft | CloneFormTemplateCommandIntegrationTests.cs |
| TC-FT-010 | SaveQuestion_WhenValidLikertScaleQuestion_ShouldAddToTemplate | FormTemplateQuestionIntegrationTests.cs |
| TC-FT-011 | SaveQuestion_WhenValidTextQuestion_ShouldAddToTemplate | FormTemplateQuestionIntegrationTests.cs |
| TC-FT-012 | DeleteQuestion_WhenExists_ShouldRemoveFromTemplate | FormTemplateQuestionIntegrationTests.cs |
| TC-FT-013 | SaveQuestionSection_WhenValid_ShouldCreateSection | FormTemplateQuestionIntegrationTests.cs |
| TC-FT-014 | DeleteQuestionSection_WhenExists_ShouldRemoveSection | FormTemplateQuestionIntegrationTests.cs |
| TC-FT-015 | ReorderItems_WhenSwappingPositions_ShouldUpdateOrder | ReorderFormTemplateItemsCommandIntegrationTests.cs |
| TC-FT-016 | ReorderItems_WhenTemplateIsPublished_ShouldStillSucceed | ReorderFormTemplateItemsCommandIntegrationTests.cs |
| TC-FT-017 | DeleteFormTemplate_WhenUnusedDraft_ShouldDeleteSuccessfully | DeleteFormTemplateCommandIntegrationTests.cs |
| TC-FT-018 | DeleteFormTemplate_WhenNotFound_ShouldThrowNotFoundException | DeleteFormTemplateCommandIntegrationTests.cs |
| TC-FT-019 | DeleteFormTemplate_WhenLinkedToPREvent_ShouldFailValidation | DeleteFormTemplateCommandIntegrationTests.cs |

### 10.6 Kudos (TC-KD: 14 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-KD-001 | SendKudos_WhenValidRecipient_ShouldCreateTransaction | SendKudosCommandIntegrationTests.cs |
| TC-KD-002 | SendKudos_WhenSingleKudo_ShouldCreateTransactionWithQuantityOne | SendKudosCommandIntegrationTests.cs |
| TC-KD-003 | SendKudos_WhenMissingMessage_ShouldFailValidation | SendKudosCommandIntegrationTests.cs |
| TC-KD-004 | SendKudos_WhenSelfRecipient_ShouldFailValidation | SendKudosCommandIntegrationTests.cs |
| TC-KD-005 | CommentTransaction_WhenValidComment_ShouldPersist | KudosInteractionIntegrationTests.cs |
| TC-KD-006 | CommentTransaction_WhenEmptyContent_ShouldStillSucceed | KudosInteractionIntegrationTests.cs |
| TC-KD-007 | ReactionTransaction_WhenValidReaction_ShouldPersist | KudosInteractionIntegrationTests.cs |
| TC-KD-008 | ReactionComment_WhenValidReaction_ShouldPersist | KudosInteractionIntegrationTests.cs |
| TC-KD-009 | DeleteComment_WhenOwnComment_ShouldDelete | KudosInteractionIntegrationTests.cs |
| TC-KD-010 | DeleteTransaction_WhenOwner_ShouldDelete | KudosInteractionIntegrationTests.cs |
| TC-KD-011 | SaveCompanySetting_WhenNewSetting_ShouldCreateSuccessfully | SaveKudosCompanySettingCommandIntegrationTests.cs |
| TC-KD-012 | SaveCompanySetting_WhenUpdating_ShouldUpdateExisting | SaveKudosCompanySettingCommandIntegrationTests.cs |
| TC-KD-013 | SaveCompanySetting_WhenInvalidQuota_ShouldFailValidation | SaveKudosCompanySettingCommandIntegrationTests.cs |
| TC-KD-014 | SaveCompanySetting_WhenQuotaExceedsMax_ShouldFailValidation | SaveKudosCompanySettingCommandIntegrationTests.cs |

### 10.7 Background Jobs (TC-BG: 6 tests)

| TC Code | Test Method | Test File |
|---------|------------|-----------|
| TC-BG-001 | KudosQuotaReset_WhenQuotaIsOutdated_ShouldResetWeeklyUsed | KudosQuotaResetIntegrationTests.cs |
| TC-BG-002 | KudosQuotaReset_WhenQuotaIsCurrent_ShouldNotModify | KudosQuotaResetIntegrationTests.cs |
| TC-BG-003 | AutoActivePR_WhenStartDateReached_ShouldChangeStatusToActive | AutoActivePREventIntegrationTests.cs |
| TC-BG-004 | AutoActivePR_WhenStartDateInFuture_ShouldRemainPublished | AutoActivePREventIntegrationTests.cs |
| TC-BG-005 | AutoUpdateNextCheckIn_WhenUpcomingEventExists_ShouldUpdateEmployeeDate | AutoUpdateNextCheckInIntegrationTests.cs |
| TC-BG-006 | GoalDeadlineReminder_WhenExecuted_ShouldCompleteWithoutError | GoalDeadlineReminderIntegrationTests.cs |

### 10.8 Coverage Summary

| Domain | Implemented | Spec-Only (No Test) | Total |
|--------|------------|-------------------|-------|
| Goal Management (TC-GM) | 24 | 0 | 24 |
| Check-Ins (TC-CI) | 21 | 0 | 21 |
| Performance Reviews (TC-PR) | 20 | 0 | 20 |
| Time Management (TC-TM) | 58 | 0 | 58 |
| Form Templates (TC-FT) | 19 | 0 | 19 |
| Kudos (TC-KD) | 14 | 0 | 14 |
| Background Jobs (TC-BG) | 6 | 0 | 6 |
| Permissions (TC-PERM) | 0 | 6 | 6 |
| Cross-Service (TC-SUB/INTEG) | 0 | 7 | 7 |
| **Total** | **162** | **13** | **175** |

### 10.9 Namespace Notes

- **TC-FT-004**: In code = "Duplicate Code Behavior" test. Previously listed in README Section 5 as "Delete Form Template" — renumbered to TC-FT-017.
- **TC-TM vs TC-TS**: Feature docs use TC-TS prefix for time management; this README and all test code use TC-TM. TC-TM is canonical.
- **TC-PERM / TC-SUB / TC-INTEG**: Spec-only entries in sections 6-7; no integration test implementations yet. These require cross-service infrastructure (message bus, permission middleware).

---

**End of Enhanced Test Specifications Document**

Generated: 2025-12-30
Enhanced: 2025-12-30 with code evidence
Last Updated: 2026-02-28
