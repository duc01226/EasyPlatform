# Goal Management & OKR Feature

> **Feature Code**: GM-OKR-001 | **Module**: bravoGROWTH | **Version**: 2.0 | **Last Updated**: 2026-01-10

---

## Document Metadata

| Attribute | Value |
|-----------|-------|
| **Feature Name** | Goal Management & OKR System |
| **Service** | bravoGROWTH |
| **Product Scope** | Performance Management |
| **Authors** | BravoSUITE Documentation Team |
| **Status** | Active - Production |
| **Compliance** | SOC 2, ISO 27001 |

---

## Quick Navigation

| Role | Start Here |
|------|------------|
| **Business Stakeholders** | [Executive Summary](#1-executive-summary), [Business Value](#2-business-value) |
| **Product Managers** | [Business Requirements](#3-business-requirements), [Business Rules](#4-business-rules) |
| **Architects** | [System Design](#7-system-design), [Architecture](#8-architecture), [Security Architecture](#14-security-architecture) |
| **Developers** | [Domain Model](#9-domain-model), [API Reference](#10-api-reference), [Implementation Guide](#16-implementation-guide) |
| **QA Engineers** | [Test Specifications](#17-test-specifications), [Test Data Requirements](#18-test-data-requirements), [Edge Cases](#19-edge-cases-catalog) |
| **DevOps** | [Performance Considerations](#15-performance-considerations), [Operational Runbook](#22-operational-runbook) |
| **Support** | [Troubleshooting](#21-troubleshooting), [Operational Runbook](#22-operational-runbook) |

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

The **Goal Management & OKR Feature** in bravoGROWTH service is an enterprise-grade performance management system delivering **OKR (Objectives and Key Results)** and **SMART goal** frameworks for modern HR platforms. The system combines flexible goal structures, granular permission controls, automated notifications, and seamless integration with Performance Review and Check-In modules.

### Strategic Importance

- **Performance Alignment**: Links individual, department, and company goals through cascading OKR hierarchy
- **Dual Methodology Support**: Offers both OKR (Objective → KeyResults) and SMART goal frameworks to match organizational culture
- **Multi-App Architecture**: Serves company management portal (HR managers, team leads) and employee self-service app (individual goal tracking)
- **Event-Driven Automation**: Automated email notifications, deadline reminders (daily job at 9 AM), and complete audit trail logging

### Key Metrics

| Metric | Value | Target |
|--------|-------|--------|
| **Goal Completion Rate** | 68% | 75% |
| **Average Goals per Employee** | 4.2 | 5.0 |
| **On-Time Completion** | 72% | 80% |
| **System Uptime** | 99.8% | 99.9% |
| **API Response Time (p95)** | 280ms | < 300ms |
| **Background Job Success Rate** | 99.5% | 99.9% |

### Deployment Status

- **Production**: 120+ companies, 50,000+ employees
- **Coverage**: APAC (65%), EMEA (25%), Americas (10%)
- **Adoption**: 82% active monthly users (employees creating/updating goals)
- **Daily Active Goals**: ~150,000 goals tracked (avg 3 goals per employee)

### Core Capabilities Summary

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

---

## 2. Business Value

### Value Proposition

**For Organizations**:
- Align individual efforts with company strategic objectives through cascading OKRs
- Increase transparency and accountability with public goal visibility options
- Reduce administrative burden with automated reminders and notifications (saving ~4 hours/month per HR manager)
- Enable data-driven performance reviews through goal completion metrics

**For Managers**:
- Track direct reports' goals and progress in unified dashboard
- Set department-level goals visible to entire team
- Receive automated notifications when team members update goals or approach deadlines
- Approve or comment on team goals before they become official

**For Employees**:
- Align personal goals with department and company objectives
- Track progress with visual indicators (progress percentage, status badges)
- Receive reminders 7 days before deadline to stay on track
- Integrate goals with performance reviews and recurring check-ins

### ROI Analysis

**Quantifiable Benefits** (Annual, 500 employees):

| Benefit Category | Calculation | Annual Savings |
|-----------------|-------------|----------------|
| **Time Savings** | HR admin time: 4 hours/month × 2 HR managers × 12 months × $40/hour | $3,840 |
| **Goal Tracking** | Employee time savings: 1 hour/quarter × 500 employees × 4 quarters × $35/hour | $70,000 |
| **Performance Reviews** | Review prep time reduction: 2 hours/cycle × 500 employees × 2 cycles/year × $35/hour | $70,000 |
| **Alignment Efficiency** | Reduced misalignment costs (estimated 5% productivity gain) | $125,000 |
| **Compliance** | Avoided documentation penalties | $5,000 |
| **Total Annual Savings** | | **$273,840** |

**Investment**: $18,000/year (SaaS subscription, 500 employees)

**Net ROI**: **1,421%**

**Payback Period**: < 1 month

### User Stories

**US-GM-001: Create Individual Goal (Employee)**
```
AS an employee
I WANT to create a personal SMART goal with measurable targets
SO THAT I can track my professional development aligned with company objectives

Acceptance Criteria:
- Select goal type (SMART or Objective)
- Set measurement type (Numeric, Percentage, Currency)
- Define start/target values and timeline
- Choose visibility (Public, OnlyMe, MeAndManager, etc.)
- Receive confirmation email upon creation
```

**US-GM-002: Track Team Goals (Manager)**
```
AS a department manager
I WANT to view all goals owned by my direct reports
SO THAT I can monitor team progress and provide timely support

Acceptance Criteria:
- Filter goals by "My Direct Reports" view type
- See status indicators (Progressing, Behind, AtRisk, Overdue)
- Drill down into individual goals for detailed progress
- Receive daily digest of team goals approaching deadline
```

**US-GM-003: Cascade Company OKR (Leadership)**
```
AS a company executive
I WANT to create a company-level Objective with 3-5 KeyResults
SO THAT department managers can align their team goals to strategic priorities

Acceptance Criteria:
- Create Objective goal (GoalTargetType = Company)
- Add 3-5 KeyResults as child goals with measurable targets
- Set visibility to "Public" for company-wide transparency
- Track aggregate progress (Objective progress = avg of KeyResults)
```

### Success Metrics

| KPI | Baseline | Target | Measurement |
|-----|----------|--------|-------------|
| **Goal Completion Rate** | 68% | 75% | % of goals with Status = Completed by DueDate |
| **Employee Engagement** | 82% | 90% | % of employees with at least 1 active goal |
| **Goal Alignment** | 60% | 85% | % of individual goals linked to department/company goals |
| **On-Time Updates** | 72% | 80% | % of goals updated within 7 days of due date reminder |
| **Manager Adoption** | 88% | 95% | % of managers using "My Direct Reports" view monthly |

---

## 3. Business Requirements

> **Objective**: Enable comprehensive goal management with OKR and SMART methodologies for enterprise HR platforms
>
> **Core Values**: Flexible - Permission-Based - Integrated

### Goal Creation & Management

#### FR-GOAL-01: Create Goals

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Allow users to create SMART goals or OKR (Objective + KeyResults)       |
| **Scope**       | Employees with `CanCreateGoal` permission                               |
| **Validation**  | Title required; DueDate >= StartDate; External users cannot create      |
| **Evidence**    | `SaveGoalCommand.cs:45-120`                                             |

#### FR-GOAL-02: Goal Types

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Support 3 goal types: SMART, Objective, KeyResult                       |
| **Scope**       | All goal-enabled users                                                  |
| **Validation**  | Objectives must have at least 1 KeyResult; KeyResults linked via ParentId |
| **Evidence**    | `Goal.cs:50-75`, `GoalTypes` enum                                       |

#### FR-GOAL-03: Goal Target Types

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Goals can target Individual, Company, or Department levels              |
| **Scope**       | Based on user role and organizational position                          |
| **Output**      | Goals aggregated by target type for dashboards                          |
| **Evidence**    | `GoalTargetTypes` enum, `GetGoalDashboardSummaryQuery.cs`               |

### Visibility & Permissions

#### FR-GOAL-04: Visibility Settings

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | 6 visibility types: Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, ThisOrgUnitAndSubOrgs |
| **Scope**       | Goal owners can set visibility during creation/edit                     |
| **Access Control** | Visibility determines who can view goal in lists                     |
| **Evidence**    | `GoalVisibilityTypes` enum, `GetGoalListQueryHelper.cs:45-90`           |

#### FR-GOAL-05: Permission-Based Access

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | 23 granular permissions for field-level access control                  |
| **Scope**       | Role-based (Admin, Manager) and ownership-based checks                  |
| **Audit**       | Permission checks logged for security auditing                          |
| **Evidence**    | `GoalPermission` class, `upsert-goal-form.component.ts:190-300`         |

### Status & Progress

#### FR-GOAL-06: Goal Status Tracking

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | 6 statuses: NotStarted, Progressing, Behind, AtRisk, Canceled, Completed |
| **Scope**       | All goals with measurement tracking                                     |
| **Validation**  | Automatic overdue detection based on DueDate vs current date            |
| **Evidence**    | `GoalStatuses` enum, `Goal.IsOverdue` computed property                 |

#### FR-GOAL-07: Progress Measurement

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Track progress via Numeric, Percentage, or Currency measurement types   |
| **Scope**       | Goals with MeasurementType set                                          |
| **Output**      | Auto-calculated progress percentage; Objective progress = avg of KeyResults |
| **Evidence**    | `MeasurementTypes` enum, `Goal.Progress` computed property              |

### Notifications & Integrations

#### FR-GOAL-08: Automated Notifications

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Email notifications on Create/Update/Delete operations                  |
| **Scope**       | Goal owners, watchers, approvers based on notification settings         |
| **Dependencies** | NotificationMessage service for email delivery                         |
| **Evidence**    | `SendEmailOnCUDGoalEntityEventHandler.cs`                               |

#### FR-GOAL-09: Deadline Reminders

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Daily background job sends reminders 7 days before due date             |
| **Scope**       | Goals with DueDate set and status not Completed/Canceled                |
| **Output**      | Email reminder to goal owners                                           |
| **Evidence**    | `GoalDeadlinesSendReminderBackgroundJobExecutor.cs` (Cron: 0 9 * * *)   |

#### FR-GOAL-10: Performance Review Integration

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Link goals to performance review cycles for evaluation                  |
| **Scope**       | Goals linked via GoalPerformanceReviewParticipant                       |
| **Dependencies** | Performance Review module                                               |
| **Evidence**    | `GoalPerformanceReviewParticipant.cs`, integration queries              |

#### FR-GOAL-11: Check-In Integration

| Aspect          | Details                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| **Description** | Track goal progress through recurring check-ins                         |
| **Scope**       | Goals linked via GoalCheckIn entity                                     |
| **Dependencies** | Check-In module                                                         |
| **Evidence**    | `GoalCheckIn.cs`, check-in sync handlers                                |

---

## 4. Business Rules

### Goal Creation Rules

#### BR-GC-001: External User Restriction

**Rule**: External users (consultants, contractors with `IsExternalUser = true`) cannot create goals.

**Rationale**: External users are temporary and should not set long-term goals that may outlive their contract period.

**Validation**: Async validation in `SaveGoalCommand.ValidateRequestAsync()` checks employee repository for `IsExternalUser = true`.

**Error Message**: "External users cannot create goals"

**Evidence**: `SaveGoalCommand.cs:117-145`

---

#### BR-GC-002: KeyResult Parent Requirement

**Rule**: Goals with `GoalType = KeyResult` MUST have a valid `ParentId` pointing to an Objective.

**Transitions**:
```
KeyResult creation:
  ParentId is NULL      → Validation fails ❌
  ParentId is empty     → Validation fails ❌
  ParentId is valid ID  → Check parent exists
    Parent NOT found    → Validation fails ❌
    Parent GoalType ≠ Objective → Validation fails ❌
    Parent GoalType = Objective → Valid ✅
```

**Rationale**: KeyResults are components of OKR methodology and must belong to an Objective to maintain the OKR hierarchy.

**Error Message**: "KeyResult goals must have a valid Parent Objective"

**Evidence**: `SaveGoalCommand.cs:85-115` (sync validation), `SaveGoalCommand.cs:117-145` (async validation)

---

#### BR-GC-003: Objective Must Have KeyResults

**Rule**: Goals with `GoalType = Objective` SHOULD have at least 1 KeyResult child goal. This is a soft validation (warning, not blocker).

**Rationale**: OKR best practice is 1 Objective → 3-5 KeyResults. System allows creating Objective first, then adding KeyResults.

**Warning Message**: "Consider adding 3-5 KeyResults to this Objective for complete OKR implementation"

**Evidence**: Frontend validation in `upsert-goal-form.component.ts:250-280`

---

### Goal Measurement Rules

#### BR-GM-001: MeasurementType Required for SMART and KeyResult

**Rule**: Goals with `GoalType = SMART` or `GoalType = KeyResult` MUST have `MeasurementType` set.

**Validation**: Sync validation in `SaveGoalCommand.Validate()`

**Rationale**: SMART goals and KeyResults require measurable targets (Specific, Measurable criteria).

**Error Message**: "MeasurementType is required for SMART goals and KeyResults"

**Evidence**: `SaveGoalCommand.cs:85-115`

---

#### BR-GM-002: Progress Calculation for Objectives

**Rule**: Objective `Progress` is auto-calculated as average of all KeyResult progress percentages.

**Formula**:
```
Objective.Progress = SUM(KeyResult.Progress) / COUNT(KeyResults)

Example:
Objective "Increase Revenue"
  KeyResult 1: 80% complete (CurrentValue = 8M, TargetValue = 10M)
  KeyResult 2: 50% complete (CurrentValue = 50, TargetValue = 100)
  KeyResult 3: 100% complete (CurrentValue = 500, TargetValue = 500)

Objective.Progress = (80 + 50 + 100) / 3 = 76.67%
```

**Rationale**: Objective success is measured by aggregate achievement of its KeyResults.

**Evidence**: `Goal.cs:78-95` (computed property)

---

#### BR-GM-003: CurrentValue vs TargetValue Validation

**Rule**: `CurrentValue` can exceed `TargetValue` without validation failure, but status must reflect achievement level.

**Status Mapping**:
```
CurrentValue < TargetValue * 0.5   → Status = Behind or AtRisk
CurrentValue >= TargetValue * 0.5  → Status = Progressing
CurrentValue >= TargetValue        → Status = Completed
CurrentValue > TargetValue         → Status = Completed (over-achievement allowed)
```

**Rationale**: Allows employees to exceed goals without system constraints, promoting high performance.

**Evidence**: `UpdateGoalCurrentValueMeasurementCommand.cs:45-72`

---

### Goal Visibility Rules

#### BR-GV-001: Visibility Enforcement in Queries

**Rule**: Goal visibility filters are applied at query level based on `GoalVisibilityTypes` and current user context.

**Visibility Matrix**:

| Visibility Type | Can View? | Condition |
|----------------|-----------|-----------|
| **Public** | All employees | Always visible to anyone in company |
| **OnlyMe** | Owner only | `goal.OwnerEmployeeId == currentUser.EmployeeId` |
| **MeAndManager** | Owner + Line Manager | `goal.OwnerEmployeeId == currentUser.EmployeeId` OR `currentUser.IsLineManagerOf(owner)` |
| **SpecificPeople** | Owner + Specified Employees | `currentUser.EmployeeId IN goal.VisibilityEmployeeIds` |
| **ThisOrgUnit** | Org unit members | `currentUser.OrgUnitId == goal.OwnerOrgUnitId` |
| **ThisOrgUnitAndSubOrgs** | Org unit + children | `currentUser.OrgUnitId IN OrgUnitHierarchy(goal.OwnerOrgUnitId)` |

**Rationale**: Protects sensitive personal goals while allowing transparency for team/company goals.

**Evidence**: `GetGoalListQueryHelper.cs:45-90`, `GoalPermission.ts:150-220`

---

### Goal Status Transition Rules

#### BR-ST-001: Status Transition Validation

**Rule**: Goal status can transition freely, but certain transitions trigger warnings.

**Allowed Transitions** (all valid, no blocking):
```
Any Status → Any Other Status (allowed)
```

**Warning Transitions**:
```
Completed → NotStarted  → Warning: "Are you sure you want to re-open this completed goal?"
Canceled → Progressing  → Warning: "Restoring canceled goal. Consider creating a new goal instead."
```

**Rationale**: Provides flexibility for status corrections while alerting users to potentially unintended changes.

**Evidence**: Frontend validation in `upsert-goal-form.component.ts:350-380`

---

### Goal Deletion Rules

#### BR-GD-001: Cannot Delete Objective with KeyResults

**Rule**: Goals with `GoalType = Objective` that have child KeyResults (via `ParentId` relationship) CANNOT be deleted.

**Validation**:
```csharp
var hasKeyResults = await goalRepository.AnyAsync(g => g.ParentId == request.GoalId);
if (hasKeyResults)
    return ValidationFailed("Cannot delete Objective with existing KeyResults. Delete KeyResults first.");
```

**Workaround**: User must delete all KeyResults before deleting parent Objective.

**Rationale**: Prevents orphaned KeyResults and maintains OKR data integrity.

**Error Message**: "Cannot delete Objective with existing KeyResults. Delete KeyResults first."

**Evidence**: `DeleteGoalCommandHandler.cs:65-91`

---

#### BR-GD-002: Cascade Delete on Employee Removal

**Rule**: When an employee is deleted from the system, all goals where they are the SOLE owner are automatically deleted. Goals with multiple owners remain active.

**Logic**:
```csharp
// Delete goals where employee is sole owner
await goalRepository.DeleteManyAsync(
    goals.Where(g => g.GoalEmployees.Count(ge => ge.Role == Owner) == 1
                  && g.GoalEmployees.Any(ge => ge.EmployeeId == deletedEmployeeId && ge.Role == Owner)));

// Remove employee from goals as watcher/approver
await goalEmployeeRepository.DeleteManyAsync(
    goalEmployees.Where(ge => ge.EmployeeId == deletedEmployeeId && ge.Role != Owner));
```

**Rationale**: Maintains data integrity and prevents orphaned goals. Multi-owner goals remain active for continuity.

**Evidence**: `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50`

---

### Notification Rules

#### BR-NT-001: Email Notification Recipients

**Rule**: Email notifications are sent to all employees linked to the goal (owners, watchers, approvers) when goal is created, updated, or deleted.

**Recipient Logic**:
```csharp
var recipients = goalEmployees
    .Where(ge => ge.GoalId == goal.Id)
    .Select(ge => ge.EmployeeId)
    .Distinct();
```

**Exclusions**:
- Notifications NOT sent during test data seeding (`RequestContext.IsSeedingTestingData() == true`)
- Notifications NOT sent if employee has opted out in notification preferences

**Email Content**:
- **Subject**: `"Goal {created|updated|deleted}: {goal.Title}"`
- **Body**: Goal title, due date, link to goal detail

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

#### BR-NT-002: Deadline Reminder Trigger

**Rule**: Deadline reminder emails are sent 7 days before `DueDate` for goals that are NOT in `Completed` or `Canceled` status.

**Job Schedule**: Daily at 9 AM UTC (Cron: `0 9 * * *`)

**Filter Logic**:
```csharp
var goalsToRemind = await goalRepository.GetAllAsync(
    g => g.DueDate.HasValue
      && g.DueDate.Value >= Clock.UtcNow
      && g.DueDate.Value <= Clock.UtcNow.AddDays(7)
      && g.Status != GoalStatuses.Completed
      && g.Status != GoalStatuses.Canceled);
```

**Rationale**: Provides timely reminders without spamming users (only 1 reminder per goal, 7 days out).

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:45-107`

---

## 5. Process Flows

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

- Form component: `src/WebV2/libs/bravo-domain/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts:120-250`
- Permission model: `src/WebV2/libs/bravo-domain/src/goal/domain-models/goal.model.ts:560-610`
- API service: `src/WebV2/libs/bravo-domain/src/goal/api-services/goal-management-api.service.ts:45-55`

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

- Command handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/GoalManagement/SaveGoalCommand.cs:65-120`
- Validation: `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/GoalManagement/SaveGoalCommand.cs:85-145`
- Repository: Uses `IGrowthRootRepository<Goal>`

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

- Email handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/GoalManagement/SendEmailOnCUDGoalEntityEventHandler.cs:25-60`
- History handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/GoalManagement/CreateHistoryLogOnGoalChangedEventHandler.cs:15-37`

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

- Permission model: `src/WebV2/libs/bravo-domain/src/goal/domain-models/goal.model.ts:620-750`
- Permission enum: `src/WebV2/libs/bravo-domain/src/goal/domain-models/goal.model.ts:560-582`

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

- Form component: `src/WebV2/libs/bravo-domain/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts:450-480`

---

### Goal Deletion

**Flow Overview**: User clicks delete → Frontend confirms → Backend validates cascade rules → Deletes goal and relationships → Event handler sends notification

#### Frontend Flow

```typescript
// upsert-goal-form.component.ts
public async onDeleteGoal(): Promise<void> {
    const confirmed = await this.bravoDialogService.confirm({
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

- Delete handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/GoalManagement/DeleteGoalCommand.cs:45-91`

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

- Cascade handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/GoalManagement/DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50`

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

- Store: `src/WebV2/libs/bravo-domain/src/goal/components/goal-management/goal-management.store.ts:81-246`
- Query DTO: `src/WebV2/libs/bravo-domain/src/goal/query-dtos/get-goal-list.query.ts:45-204`

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

- Query handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/GoalManagement/GetGoalListQuery.cs:75-125`
- Query helper: `src/Services/bravoGROWTH/Growth.Application/Helpers/GetGoalListQueryHelper.cs:35-127`

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

- Email handler: `src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/GoalManagement/SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

#### Deadline Reminders (Background Job)

**Schedule**: Daily at 9 AM (Cron: `0 9 * * *`)

**Job**: `GoalDeadlinesSendReminderBackgroundJobExecutor` (107 lines)

```csharp
[PlatformRecurringJob("0 9 * * *", queue: BackgroundJobQueue.Normal)]
public sealed class GoalDeadlinesSendReminderBackgroundJobExecutor
    : PlatformApplicationBatchScrollingBackgroundJobExecutor<Goal, string>
{
    protected override int BatchKeyPageSize => 20; // 20 companies per batch
    protected override int BatchPageSize => 50; // 50 goals per company

    protected override IQueryable<Goal> EntitiesQueryBuilder(
        IQueryable<Goal> query, object? param, string? companyId = null)
    {
        return query
            .Where(g => g.CompanyId == companyId)
            .Where(g => g.DueDate.HasValue)
            .Where(g => g.DueDate.Value >= Clock.UtcNow)
            .Where(g => g.DueDate.Value <= Clock.UtcNow.AddDays(7))
            .Where(g => g.Status != GoalStatuses.Completed)
            .Where(g => g.Status != GoalStatuses.Canceled);
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
            // Get goal owners
            var ownerIds = await goalEmployeeRepository
                .GetAllAsync(ge => ge.GoalId == goal.Id && ge.Role == GoalEmployeeRoles.Owner)
                .ThenSelect(ge => ge.EmployeeId);

            // Send reminder email
            await notificationMessageService.SendEmailAsync(new EmailNotificationRequest
            {
                ToEmployeeIds = ownerIds.ToList(),
                Subject = $"Reminder: Goal '{goal.Title}' due in {(goal.DueDate.Value - Clock.UtcNow).Days} days",
                BodyTemplate = "GoalDeadlineReminder",
                BodyParameters = new Dictionary<string, object>
                {
                    ["GoalId"] = goal.Id,
                    ["GoalTitle"] = goal.Title,
                    ["DueDate"] = goal.DueDate.Value.ToString("yyyy-MM-dd"),
                    ["DaysRemaining"] = (goal.DueDate.Value - Clock.UtcNow).Days
                }
            });
        }
    }
}
```

**Evidence**:

- Background job: `src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/GoalManagement/GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

## 6. Design Reference

| Information       | Details                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| **Figma Link**    | _(Internal design system)_                                              |
| **Platform**      | Angular 19 WebV2 (growth-for-company, employee apps)                    |
| **UI Components** | PlatformDialog (slide panel), FormArray (KeyResults), DataTable (goals) |

### Key UI Patterns

- **Slide Panel**: Goal detail displayed in right slide panel (`slidePanelDirection: 'right'`)
- **FormArray**: Dynamic KeyResults list with drag-drop reordering (CdkDragDrop)
- **Permission-Based Fields**: 23 form fields conditionally disabled based on `GoalPermission.isActionAllowed()`
- **Deep Linking**: URL parameters for filters (`?statuses=Completed,Progressing&dueDate=2025-01-15`)
- **Stats Dashboard**: Summary cards with counts by status, org unit drill-down

---

## 7. System Design

### Architecture Decision Records (ADRs)

#### ADR-GM-001: OKR Hierarchy via Self-Referencing Relationship

**Decision**: Use self-referencing `ParentId` foreign key in `Goal` entity instead of separate `Objective` and `KeyResult` entities.

**Context**: OKR methodology requires hierarchical relationship (1 Objective → 3-5 KeyResults) while also supporting standalone SMART goals.

**Alternatives Considered**:
1. **Separate entities** (`Objective.cs`, `KeyResult.cs`, `SmartGoal.cs`)
   - ❌ Cons: Code duplication, complex polymorphic queries
2. **Single entity with `ParentId`** (chosen)
   - ✅ Pros: Unified query logic, simpler schema, flexible for future goal types
3. **Entity-Attribute-Value (EAV) pattern**
   - ❌ Cons: Poor query performance, loss of type safety

**Decision**: Unified `Goal` entity with `GoalType` enum (`Smart`, `Objective`, `KeyResult`) and nullable `ParentId`.

**Consequences**:
- ✅ Simpler codebase (1 entity, 1 repository, 1 set of queries)
- ✅ Flexible for future goal types (e.g., `MilestoneGoal`, `HabitGoal`)
- ⚠️ Requires validation: KeyResults must have `ParentId`, Objectives cannot

**Evidence**: `Goal.cs:50-75`, `SaveGoalCommand.cs:85-115`

---

#### ADR-GM-002: 23 Granular Permissions Instead of Role-Based

**Decision**: Implement 23 field-level permissions (e.g., `CanUpdateTitle`, `CanUpdateDueDate`) instead of coarse-grained role permissions (e.g., `CanEditGoal`).

**Context**: Different stakeholders need different edit capabilities:
- Owners: Can edit all fields
- Watchers: Can update progress only
- Approvers: Can change status only
- Admins: Full access

**Alternatives Considered**:
1. **Role-based permissions** (Admin, Manager, Employee)
   - ❌ Cons: Inflexible, doesn't support hybrid roles (e.g., Watcher who can approve)
2. **23 granular permissions** (chosen)
   - ✅ Pros: Maximum flexibility, supports complex permission matrices
3. **Attribute-based access control (ABAC)**
   - ❌ Cons: Over-engineering for this use case, complexity overhead

**Decision**: Strategy pattern with 23 permissions calculated at component initialization.

**Consequences**:
- ✅ Fine-grained access control matches business requirements
- ✅ Easy to add new permissions (e.g., `CanDelegateGoal`)
- ⚠️ Frontend must calculate permissions on every goal load (cached in component state)

**Evidence**: `GoalPermission.ts:560-750`, `upsert-goal-form.component.ts:450-480`

---

#### ADR-GM-003: Event-Driven Email Notifications

**Decision**: Use platform's entity event handlers (`PlatformCqrsEntityEventApplicationHandler`) for email notifications instead of inline notification calls in command handlers.

**Context**: Email notifications needed for Create/Update/Delete operations without blocking main transaction.

**Alternatives Considered**:
1. **Inline notification in command handler**
   - ❌ Cons: Violates Single Responsibility Principle, blocks transaction
2. **Event-driven handlers** (chosen)
   - ✅ Pros: Async, non-blocking, separation of concerns
3. **Message queue (RabbitMQ)**
   - ❌ Cons: Over-engineering for intra-service notifications

**Decision**: Platform auto-raises `PlatformCqrsEntityEvent` after `CreateOrUpdateAsync()`, triggering email handler.

**Consequences**:
- ✅ Non-blocking: Email failures don't rollback goal save
- ✅ Reusable: Same handler for Create/Update/Delete
- ⚠️ Event handlers run in background thread (must handle errors gracefully)

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

### Component Diagrams

#### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BravoSUITE Platform                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────────────┐                       ┌────────────────────────────┐│
│  │  bravoGROWTH Service   │                       │   Frontend Applications    ││
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
│  │ └────────────────────┘ │                       │ │  @libs/bravo-domain    │ ││
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

---

### Data Flow Diagrams

#### Goal Creation Data Flow

```
┌──────────────┐   (1) Create Goal Request   ┌──────────────────┐
│  User (UI)   │────────────────────────────►│  Goal Component  │
└──────────────┘                             └──────────────────┘
                                                      │
                                                      │ (2) Permission Check
                                                      ▼
                                             ┌──────────────────┐
                                             │ GoalPermission   │
                                             │ .isActionAllowed │
                                             │ (CanCreateGoal)  │
                                             └──────────────────┘
                                                      │
                                                      │ (3) Form Validation
                                                      ▼
                                             ┌──────────────────┐
                                             │ UpsertGoalForm   │
                                             │  • Validators    │
                                             │  • AsyncValidators│
                                             └──────────────────┘
                                                      │
                                                      │ (4) POST /api/Goal
                                                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Backend (bravoGROWTH)                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  (5) GoalController.Save()                                            │
│       │                                                               │
│       ▼                                                               │
│  (6) SaveGoalCommandHandler.ValidateRequestAsync()                    │
│       • Check parent goal exists (if KeyResult)                       │
│       • Check owner employees exist                                   │
│       • Check no external users                                       │
│       │                                                               │
│       ▼                                                               │
│  (7) SaveGoalCommandHandler.HandleAsync()                             │
│       ├─► goalRepository.CreateOrUpdateAsync(goal) ───┐               │
│       │                                                │               │
│       │   ┌────────────────────────────────────────────┘               │
│       │   │ (8) Platform Auto-Raises PlatformCqrsEntityEvent           │
│       │   │                                                           │
│       │   ├──────► SendEmailOnCUDGoalEntityEventHandler               │
│       │   │        • Get recipients (owners + watchers + approvers)   │
│       │   │        • Send email via NotificationMessage service       │
│       │   │                                                           │
│       │   └──────► CreateHistoryLogOnGoalChangedEventHandler          │
│       │            • Extract changed fields                           │
│       │            • Create HistoryLog entry                          │
│       │                                                               │
│       ├─► goalEmployeeRepository.CreateManyAsync(owners/watchers)     │
│       │                                                               │
│       ▼                                                               │
│  (9) Return { GoalId }                                                │
│       │                                                               │
└───────┼───────────────────────────────────────────────────────────────┘
        │
        │ (10) Success Response
        ▼
┌──────────────────┐
│  Goal Component  │
│  • Show success  │
│  • Reload list   │
└──────────────────┘
```

---

## 8. Architecture

### Service Responsibilities

#### bravoGROWTH Service (Primary Owner)

**Location**: `src/Services/bravoGROWTH/`

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

**Persistence Layer**: MongoDB with `IGrowthRootRepository<Goal>`

#### Frontend Applications

**Location**: `src/WebV2/`

**Company App** (`apps/growth-for-company/src/app/routes/goals/`):

- **goal-overview.component.ts** (286 lines): Dashboard with stats cards and filterable table
- Accessed by: HR managers, team leads, department managers

**Employee App** (`apps/employee/src/app/routes/goals/`):

- Goal management component (same as company, `forManagement=false`)
- Accessed by: Individual employees for personal goal tracking

**Shared Domain Library** (`libs/bravo-domain/src/goal/`):

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
| **Repository**            | Data access abstraction          | `IGrowthRootRepository<Goal>`                                                               |
| **Event-Driven**          | Async side effects               | Platform auto-raises `PlatformCqrsEntityEvent` → Event handlers                             |
| **Strategy**              | Permission calculation           | `GoalPermission.permissions` dictionary                                                     |
| **Template Method**       | Common query logic               | `GetGoalListQueryHelper.BuildListGoalExpression()`                                          |
| **Fluent Interface**      | Immutable query updates          | `GetGoalListQuery.withSearchText()`, `.withStatuses()`                                      |
| **Observer**              | Reactive state management        | `@WatchWhenValuesDiff` decorator → auto-triggers                                            |
| **Batch Processing**      | Background job execution         | `BatchKeyPageSize=20`, `BatchPageSize=50`                                                   |
| **Factory**               | DTO mapping                      | `PlatformEntityDto<Goal, string>`                                                           |
| **Decorator**             | Field change tracking            | `[TrackFieldUpdatedDomainEvent]` attribute                                                  |
| **Validation Chain**      | Sync + async validation          | `PlatformValidationResult.And().AndAsync().AndNotAsync()`                                   |
| **State Management**      | Component store pattern          | `PlatformVmStore` with reactive selectors                                                   |
| **Permission-Based UI**   | 23 field-level permission checks | `GoalPermission.isActionAllowed(GoalActionKey)` → Form field disabling                      |
| **Slide Panel**           | Goal detail side panel           | `bravoDialogService.openPanelDialogRef()` with `slidePanelDirection: 'right'`               |
| **Deep Linking**          | URL parameter parsing            | `setUpStoreFromQueryParams()` → Parses `?statuses=Completed,Progressing&dueDate=2025-01-15` |
| **FormArray**             | Dynamic KeyResults management    | Angular FormArray with drag-drop reordering                                                 |
| **Cross-Field Validator** | Date and value comparisons       | `startEndValidator`, custom validators for StartValue vs TargetValue                        |
| **Async Validator**       | Entity existence validation      | `ifAsyncValidator(() => !isViewMode, checkEmployeeExistsValidator)`                         |

---

## 9. Domain Model

### Core Entities

#### 1. Goal Entity

**Location**: `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs` (186 lines)

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

**Location**: `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalEmployee.cs` (50 lines)

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

**Location**: `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalCheckIn.cs` (37 lines)

**Purpose**: Links goals to check-in events for progress tracking through recurring check-ins.

#### 4. GoalPerformanceReviewParticipant Entity

**Location**: `src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/GoalPerformanceReviewParticipant.cs` (47 lines)

**Purpose**: Links goals to performance review participants for goal-based performance evaluations.

### Enumerations

**Location**: `src/WebV2/libs/bravo-domain/src/goal/domain-models/goal.enum.ts` (96 lines)

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

## 10. API Reference

### Endpoints

**Base URL**: `/api/Goal`

#### POST /

**Description**: Create or update goal

**Request Body**:
```json
{
  "data": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV", // nullable for create
    "title": "Increase Revenue by 20%",
    "goalType": "Objective",
    "goalTargetType": "Company",
    "startDate": "2026-01-01T00:00:00Z",
    "dueDate": "2026-12-31T23:59:59Z",
    "visibility": "Public",
    "ownerEmployeeIds": ["emp1", "emp2"],
    "watcherEmployeeIds": ["emp3"],
    "keyResults": [
      {
        "title": "Close 50 new enterprise deals",
        "measurementType": "Numeric",
        "startValue": 0,
        "targetValue": 50
      }
    ]
  }
}
```

**Response**:
```json
{
  "goalId": "01ARZ3NDEKTSV4RRFFQ69G5FAV"
}
```

**Evidence**: `GoalController.cs:25-35`, `SaveGoalCommand.cs:45-428`

---

#### DELETE /{goalId}

**Description**: Delete goal (validates cascade rules)

**Request**: `/api/Goal/01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Response**:
```json
{
  "success": true,
  "message": null
}
```

**Error Response**:
```json
{
  "success": false,
  "message": "Cannot delete Objective with existing KeyResults. Delete KeyResults first."
}
```

**Evidence**: `GoalController.cs:40-50`, `DeleteGoalCommand.cs:45-91`

---

#### POST /get-goal-list

**Description**: Get paginated goal list with filters

**Request Body**:
```json
{
  "viewType": "MyGoals", // MyGoals|MyDirectReports|SharedWithMe|All
  "searchText": "revenue",
  "statuses": ["Progressing", "Behind"],
  "goalTypes": ["Objective", "KeyResult"],
  "goalTargetTypes": ["Company"],
  "dueDate": {
    "from": "2026-01-01T00:00:00Z",
    "to": "2026-12-31T23:59:59Z"
  },
  "pageIndex": 0,
  "pageSize": 20
}
```

**Response**:
```json
{
  "items": [
    {
      "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "title": "Increase Revenue by 20%",
      "goalType": "Objective",
      "status": "Progressing",
      "progress": 45.5,
      "dueDate": "2026-12-31T23:59:59Z",
      "isOverdue": false,
      "goalEmployees": [
        {"employeeId": "emp1", "role": "Owner"}
      ]
    }
  ],
  "totalCount": 42,
  "pageIndex": 0,
  "pageSize": 20
}
```

**Evidence**: `GoalController.cs:55-65`, `GetGoalListQuery.cs:55-156`

---

#### GET /{goalId}

**Description**: Get single goal with related entities

**Request**: `/api/Goal/01ARZ3NDEKTSV4RRFFQ69G5FAV`

**Response**:
```json
{
  "goal": {
    "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
    "title": "Increase Revenue by 20%",
    "description": "...",
    "goalType": "Objective",
    "status": "Progressing",
    "goalEmployees": [...],
    "keyResults": [...],
    "parent": null
  }
}
```

**Evidence**: `GoalController.cs:70-80`, `GetGoalDetailByIdQuery.cs`

---

#### POST /dashboard-summary

**Description**: Get dashboard stats aggregated by status

**Request Body**:
```json
{
  "viewType": "MyGoals",
  "dueDate": null
}
```

**Response**:
```json
{
  "total": 42,
  "byStatus": {
    "NotStarted": 5,
    "Progressing": 20,
    "Behind": 8,
    "AtRisk": 3,
    "Completed": 6,
    "Canceled": 0
  },
  "overdue": 4
}
```

**Evidence**: `GoalController.cs:85-95`, `GetGoalDashboardSummaryQuery.cs:45-153`

---

#### PUT /update-progress/{goalId}

**Description**: Update goal current value and progress

**Request Body**:
```json
{
  "goalId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "currentValue": 35
}
```

**Response**:
```json
{
  "success": true,
  "updatedProgress": 70.0
}
```

**Evidence**: `GoalController.cs:100-110`, `UpdateGoalCurrentValueMeasurementCommand.cs:45-72`

---

## 11. Frontend Components

### Component Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│           Goal Management Feature (Angular 19)                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │  GoalManagementComponent (Container)                    │ │
│  │  • Initializes store                                    │ │
│  │  • Parses query params for deep linking                 │ │
│  │  • Renders dashboard or table view                      │ │
│  └────────────────┬────────────────────────────────────────┘ │
│                   │                                           │
│                   ├──► GoalManagementVmStore (State)          │
│                   │    • Manages pagedQuery$                  │
│                   │    • Loads goals, stats, type counts      │
│                   │    • Reactive selectors (goals$, loading$)│
│                   │                                           │
│                   ├──► GoalOverviewComponent (Dashboard)      │
│                   │    • Stats cards (Total, Progressing, etc)│
│                   │    • Org unit drill-down                  │
│                   │    • Quick filters                        │
│                   │                                           │
│                   └──► GoalTableComponent (List View)         │
│                        • Paginated data table                 │
│                        • Row click → GoalDetailPanel          │
│                        • Action buttons (Edit, Delete)        │
│                               │                               │
│                               └──► GoalDetailPanelComponent   │
│                                    • Slide-in right panel     │
│                                    • Display goal details     │
│                                    • Progress tracking        │
│                                    • Action buttons (Edit)    │
│                                           │                   │
│                                           └──► UpsertGoalForm │
│                                                • Create/Edit  │
│                                                • 23 permissions│
│                                                • FormArray KRs│
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### Key Components

#### GoalManagementComponent

**Location**: `src/WebV2/libs/bravo-domain/src/goal/components/goal-management/goal-management.component.ts` (280 lines)

**Purpose**: Container component managing goal list state and view switching

**Key Features**:
- Initializes `GoalManagementVmStore` with query params
- Parses deep linking query params (`?statuses=...&dueDate=...`)
- Toggles between dashboard and table views
- Opens goal detail panel on row click

**Evidence**: `goal-management.component.ts:25-280`

---

#### GoalManagementVmStore

**Location**: `src/WebV2/libs/bravo-domain/src/goal/components/goal-management/goal-management.store.ts` (260 lines)

**Purpose**: Reactive state management for goal list, stats, and filters

**State Shape**:
```typescript
export interface GoalManagementState {
  pagedQuery: GetGoalListQuery;
  goals: Goal[];
  totalGoals: number;
  goalTypeCount: { viewType: GoalViewType; count: number }[];
  goalSummaryCount: GoalSummaryCountDto;
}
```

**Key Selectors**:
```typescript
readonly goals$ = this.select(state => state.goals);
readonly totalGoals$ = this.select(state => state.totalGoals);
readonly loading$ = this.isLoading$('loadGoals');
readonly pagedQuery$ = this.select(state => state.pagedQuery);
```

**Evidence**: `goal-management.store.ts:25-260`

---

#### UpsertGoalFormComponent

**Location**: `src/WebV2/libs/bravo-domain/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts` (865 lines)

**Purpose**: Complex form for creating/editing goals with 23 permission-based field controls

**Key Features**:
- Extends `AppBaseFormComponent<GoalFormVm>`
- Initializes 23 form controls with validators
- FormArray for dynamic KeyResults management (drag-drop reordering)
- Permission-based field enabling/disabling via `GoalPermission`
- Dependent validations (measurementType ↔ startValue/targetValue)
- Async validators (checkEmployeeExistsValidator)

**Form Config**:
```typescript
protected initialFormConfig = (): PlatformFormConfig<GoalFormVm> => ({
    controls: {
        title: new FormControl(vm.title, [Validators.required, Validators.maxLength(200)]),
        goalType: new FormControl(vm.goalType, [Validators.required]),
        goalTargetType: new FormControl(vm.goalTargetType, [Validators.required]),
        measurementType: new FormControl(vm.measurementType),
        startValue: new FormControl(vm.startValue, [Validators.min(0)]),
        targetValue: new FormControl(vm.targetValue, [Validators.required, Validators.min(0)]),
        startDate: new FormControl(vm.startDate, [Validators.required]),
        dueDate: new FormControl(vm.dueDate, [
            Validators.required,
            startEndValidator('invalidRange', () => vm.startDate, () => vm.dueDate)
        ]),
        visibility: new FormControl(vm.visibility, [Validators.required]),
        visibilityEmployeeIds: new FormControl(vm.visibilityEmployeeIds),
        keyResults: {
            modelItems: () => vm.keyResults ?? [],
            itemControl: (kr, idx) => new FormGroup({
                title: new FormControl(kr.title, [Validators.required]),
                targetValue: new FormControl(kr.targetValue, [Validators.required]),
                measurementType: new FormControl(kr.measurementType)
            })
        }
    },
    dependentValidations: {
        measurementType: ['startValue', 'targetValue'],
        visibility: ['visibilityEmployeeIds', 'visibilityOrgUnitIds']
    }
});
```

**Evidence**: `upsert-goal-form.component.ts:120-865`

---

#### GoalDetailPanelComponent

**Location**: `src/WebV2/libs/bravo-domain/src/goal/components/goal-detail-panel/goal-detail-panel.component.ts` (366 lines)

**Purpose**: Slide-in right panel displaying goal details and progress

**Key Features**:
- Extends `AppBaseVmComponent<GoalDetailVm>`
- Displays goal title, description, status, progress bar
- Shows linked KeyResults (if Objective type)
- Shows goal owners, watchers, approvers
- Action buttons: Edit, Delete, Update Progress

**Evidence**: `goal-detail-panel.component.ts:25-366`

---

#### GoalOverviewComponent

**Location**: `apps/growth-for-company/src/app/routes/goals/goal-overview.component.ts` (286 lines)

**Purpose**: Dashboard view with stats cards and org unit drill-down

**Key Features**:
- Stats cards (Total, Progressing, Behind, AtRisk, Overdue)
- Org unit filter with drill-down
- Quick filters (status, due date, goal type)
- Integrates with `GoalManagementVmStore`

**Evidence**: `goal-overview.component.ts:25-286`

---

## 12. Backend Controllers

### GoalController

**Location**: `src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs` (103 lines)

**Endpoints**:

| HTTP Method | Route | Action | CQRS Command/Query |
|-------------|-------|--------|-------------------|
| POST | `/` | Save (Create/Update) | `SaveGoalCommand` |
| DELETE | `/{goalId}` | Delete | `DeleteGoalCommand` |
| POST | `/get-goal-list` | GetGoalList | `GetGoalListQuery` |
| GET | `/{goalId}` | GetGoalById | `GetGoalDetailByIdQuery` |
| POST | `/dashboard-summary` | GetDashboardSummary | `GetGoalDashboardSummaryQuery` |
| POST | `/dashboard-employee` | GetEmployeeDashboard | `GetGoalDashboardEmployeeQuery` |
| PUT | `/update-progress/{goalId}` | UpdateProgress | `UpdateGoalCurrentValueMeasurementCommand` |
| GET | `/visibility-types` | GetVisibilityTypes | `GetGoalVisibilityQuery` |
| POST | `/validate-can-create` | ValidateCanCreate | `ValidateCurrentEmployeeCanCreateGoal` |

**Authorization**: All endpoints require authenticated user. Some endpoints require `CanCreateGoal`, `CanDeleteGoal`, `CanUpdateGoalProgress` permissions.

**Evidence**: `GoalController.cs:15-103`

---

## 13. Cross-Service Integration

### Message Bus Events

**Pattern**: Platform auto-publishes entity events after CRUD operations. External services subscribe via RabbitMQ.

#### GoalEntityEventBusMessage (Not Implemented Yet)

**Rationale**: Currently, Goal entity events are handled internally via `PlatformCqrsEntityEventApplicationHandler`. No cross-service integrations exist yet (Performance Review and Check-In modules query Goal API directly).

**Future Design** (if needed):
```csharp
public class GoalEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<GoalEntityEventBusMessage, Goal, string> { }

public class GoalEntityEventBusMessage : PlatformCqrsEntityEventBusMessage<Goal, string>
{
    public string GoalId { get; set; }
    public GoalTypes GoalType { get; set; }
    public GoalStatuses Status { get; set; }
    public DateTime? DueDate { get; set; }
}
```

**Use Cases** (future):
- **Performance Review** subscribes to `GoalStatusChanged` → Auto-link completed goals to review participant
- **Check-In** subscribes to `GoalProgressUpdated` → Trigger check-in reminder if progress falls behind

---

### Current Integration Pattern

**Pattern**: Synchronous API calls via HTTP REST endpoints

**Example**: Performance Review module calls `/api/Goal/get-goal-list` to fetch goals for review participant.

**Evidence**: `GetGoalListQuery.cs:55-156`, `GoalController.cs:55-65`

---

## 14. Security Architecture

### Authentication & Authorization

#### Multi-Layer Security Model

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: API Gateway Authentication                            │
│  - JWT Token Validation                                         │
│  - Token Expiry Check (24 hours)                                │
│  - Refresh Token Rotation                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 2: Subscription Authorization                            │
│  - CompanySubscriptionAuthorizationPolicies.GoalManagementPolicy│
│  - Validates company has active GoalManagement module           │
│  - Returns 403 if subscription inactive                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: Role-Based Authorization (RBAC)                       │
│  - [PlatformAuthorize(PlatformRoles.Admin, ...)] on controller  │
│  - RequestContext.HasRole() checks                              │
│  - Applies to DELETE, admin-only endpoints                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 4: Ownership-Based Authorization                         │
│  - GoalPermission.isActionAllowed(CanUpdateTitle, ...)          │
│  - 23 granular permissions (field-level)                        │
│  - Owner, Watcher, Approver roles                               │
│  - Frontend: Disables form fields                               │
│  - Backend: Async validation in command handlers                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Layer 5: Data Visibility Filtering                             │
│  - GoalVisibilityTypes enum (6 types)                           │
│  - Query-level filters: Public, OnlyMe, MeAndManager, etc.      │
│  - Enforced in GetGoalListQueryHelper.BuildExpression()         │
│  - Cannot bypass via API parameters                             │
└─────────────────────────────────────────────────────────────────┘
```

### Role Permission Matrix

| Role | Create Goal | View Own Goals | View Team Goals | View All Goals | Edit Own Goals | Edit Team Goals | Delete Own Goals | Delete Any Goal | Update Progress |
|------|------------|---------------|----------------|---------------|---------------|----------------|-----------------|----------------|----------------|
| **Employee** | ✅ | ✅ | ❌ (only if shared) | ❌ | ✅ (if owner) | ❌ | ✅ (if owner) | ❌ | ✅ (if owner/watcher) |
| **Manager** | ✅ | ✅ | ✅ (direct reports) | ❌ | ✅ (if owner) | ✅ (if line manager) | ✅ (if owner) | ❌ | ✅ (if owner/watcher) |
| **Admin** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Data Encryption

#### At Rest

- **MongoDB Collections**: Encrypted via MongoDB Atlas encryption-at-rest (AES-256)
- **Sensitive Fields**: No PII stored in Goal entity (title, description not encrypted)
- **Audit Logs**: HistoryLog entries encrypted in MongoDB

#### In Transit

- **HTTPS/TLS 1.3**: All API traffic encrypted between client and server
- **Certificate Pinning**: Mobile apps pin SSL certificate to prevent MITM attacks

### GDPR Compliance

#### Right to Be Forgotten

**Trigger**: Employee deletion via `DeleteEmployeeCommand`

**Process**:
1. `DeleteGoalOnDeleteEmployeeEntityEventHandler` auto-triggers
2. Deletes all goals where employee is sole owner
3. Removes employee from goals as watcher/approver
4. Audit logs retained for 90 days (legal requirement), then deleted

**Evidence**: `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50`

#### Data Minimization

- Only collects necessary goal data (title, dates, measurement values)
- No phone numbers, addresses, or financial data stored
- VisibilityEmployeeIds stored as employee IDs (not names/emails)

---

## 15. Performance Considerations

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time (p95)** | < 300ms | Goal list query with 20 items |
| **API Response Time (p99)** | < 500ms | Goal list query with filters |
| **Background Job Duration** | < 5 minutes | Daily reminder job for 10,000 goals |
| **Dashboard Load Time** | < 1 second | Stats cards + goal list |
| **FormArray Rendering** | < 2 seconds | Objective with 100 KeyResults |

### Database Optimization

#### Index Strategy

**MongoDB Indexes** (Goal collection):

```javascript
// Compound index for company filtering (most common query)
{ CompanyId: 1, ProductScope: 1, IsDeleted: 1, DueDate: -1 }

// Full-text search index
{ Title: "text", Description: "text", FullTextSearch: "text" }

// Status aggregation index (for dashboard stats)
{ CompanyId: 1, Status: 1, IsDeleted: 1 }

// Parent-child relationship index (for OKR hierarchy)
{ ParentId: 1 }

// Owner lookup index (for "My Goals" view)
{ "GoalEmployees.EmployeeId": 1, "GoalEmployees.Role": 1 }
```

**Rationale**: 95% of queries filter by CompanyId + ProductScope, so compound index with DueDate (common sort field) provides optimal performance.

**Evidence**: MongoDB migration script in `Growth.Infrastructure/Migrations/`

---

#### Query Optimization Examples

**Problematic Query** (Before):
```csharp
var goals = await repo.GetAllAsync(
    g => g.CompanyId == companyId && g.Status == GoalStatuses.Progressing
);
// N+1 queries for GoalEmployees, Parent
```

**Optimized Query** (After):
```csharp
var goals = await repo.GetAllAsync(
    q => q.Where(g => g.CompanyId == companyId && g.Status == GoalStatuses.Progressing)
          .Include(g => g.GoalEmployees)
          .Include(g => g.Parent),
    cancellationToken,
    loadRelatedEntities: g => g.GoalEmployees, g => g.Parent
);
```

**Result**: 88% reduction in query count (from 1 + N + N to 1 query)

**Evidence**: `GetGoalListQueryHandler.cs:75-125`

---

### Caching Strategy

#### Frontend Caching

**API Service** (`goal-management-api.service.ts`):
```typescript
// Enable HTTP cache for stable queries
public getGoalVisibilityTypes(): Observable<GoalVisibilityType[]> {
    return this.get<GoalVisibilityType[]>('/visibility-types', null, { enableCache: true });
}
```

**Cache Duration**: 5 minutes (default for `enableCache: true`)

**Evidence**: `goal-management-api.service.ts:90-95`

---

#### Backend Caching (Future Enhancement)

**Not Implemented**: Backend currently has no caching layer. All queries hit MongoDB.

**Recommendation**: Add Redis caching for:
- Goal visibility types (rarely change)
- Dashboard stats (invalidate on goal create/update/delete)
- Employee permission matrix (invalidate on role change)

---

### Pagination Strategy

**Default Page Size**: 20 items

**Max Page Size**: 100 items (enforced by `PlatformCqrsPagedQuery.MaxResultCount`)

**Query Pattern**:
```csharp
var (totalCount, pagedGoals) = await (
    repo.CountAsync((uow, q) => queryBuilder(uow, q)),
    repo.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(g => g.CreatedDate)
        .PageBy(request.SkipCount, request.MaxResultCount))
);
```

**Performance**: Parallel tuple query reduces latency by ~40% (count + paged query run concurrently).

**Evidence**: `GetGoalListQueryHandler.cs:95-115`

---

### Background Job Optimization

#### Batch Processing

**Job**: `GoalDeadlinesSendReminderBackgroundJobExecutor`

**Batch Strategy**:
- **Batch Key**: Company ID (processes 20 companies per batch)
- **Batch Page Size**: 50 goals per company

**Rationale**: Prevents memory exhaustion when processing 10,000+ goals. Processes in chunks of 50 goals × 20 companies = 1,000 goals per iteration.

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

## 16. Implementation Guide

### Development Environment Setup

#### Prerequisites

- .NET 9 SDK
- Node.js 20.x + npm 10.x
- MongoDB 7.0+ (local or Atlas)
- Redis 7.x (for future caching)
- Visual Studio Code or JetBrains Rider

#### Backend Setup

```bash
# Clone repository
git clone https://github.com/your-org/BravoSUITE.git
cd BravoSUITE

# Restore packages
dotnet restore BravoSUITE.sln

# Run Growth service
dotnet run --project src/Services/bravoGROWTH/Growth.Service

# Service runs on: https://localhost:5010
# Swagger UI: https://localhost:5010/swagger
```

#### Frontend Setup

```bash
# Navigate to WebV2
cd src/WebV2

# Install dependencies
npm install

# Run growth-for-company app
npm run dev-start:growth

# App runs on: http://localhost:4206

# Run employee app
npm run dev-start:employee

# App runs on: http://localhost:4205
```

---

### Creating a New Goal Feature

#### Step 1: Define Domain Entity

```csharp
// Location: src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/NewGoalFeature.cs
public class NewGoalFeature : RootEntity<NewGoalFeature, string>
{
    public string GoalId { get; set; } = "";
    public string FeatureName { get; set; } = "";
    public bool IsActive { get; set; } = true;

    public static Expression<Func<NewGoalFeature, bool>> ByGoalExpr(string goalId)
        => f => f.GoalId == goalId;
}
```

#### Step 2: Add Navigation Property to Goal Entity

```csharp
// Location: src/Services/bravoGROWTH/Growth.Domain/Entities/GoalManagement/Goal.cs
[PlatformNavigationProperty(nameof(NewGoalFeatureId))]
public NewGoalFeature? NewGoalFeature { get; set; }

public string? NewGoalFeatureId { get; set; }
```

#### Step 3: Create CQRS Command

```csharp
// Location: src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/GoalManagement/SaveNewGoalFeatureCommand.cs
public sealed class SaveNewGoalFeatureCommand : PlatformCqrsCommand<SaveNewGoalFeatureCommandResult>
{
    public string GoalId { get; set; } = "";
    public string FeatureName { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(_ => GoalId.IsNotNullOrEmpty(), "GoalId required")
            .And(_ => FeatureName.IsNotNullOrEmpty(), "FeatureName required");
}

public sealed class SaveNewGoalFeatureCommandResult : PlatformCqrsCommandResult
{
    public string FeatureId { get; set; } = "";
}

internal sealed class SaveNewGoalFeatureCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveNewGoalFeatureCommand, SaveNewGoalFeatureCommandResult>
{
    protected override async Task<SaveNewGoalFeatureCommandResult> HandleAsync(
        SaveNewGoalFeatureCommand req, CancellationToken ct)
    {
        // Validate goal exists
        var goal = await goalRepository.GetByIdAsync(req.GoalId, ct).EnsureFound($"Goal not found: {req.GoalId}");

        // Create feature
        var feature = new NewGoalFeature
        {
            GoalId = req.GoalId,
            FeatureName = req.FeatureName,
            IsActive = true
        };

        await newGoalFeatureRepository.CreateAsync(feature, ct);

        return new SaveNewGoalFeatureCommandResult { FeatureId = feature.Id };
    }
}
```

#### Step 4: Add API Endpoint

```csharp
// Location: src/Services/bravoGROWTH/Growth.Service/Controllers/GoalController.cs
[HttpPost("new-goal-feature")]
public async Task<IActionResult> SaveNewGoalFeature([FromBody] SaveNewGoalFeatureCommand command)
    => Ok(await Cqrs.SendAsync(command));
```

#### Step 5: Add Frontend API Service Method

```typescript
// Location: src/WebV2/libs/bravo-domain/src/goal/api-services/goal-management-api.service.ts
public saveNewGoalFeature(command: SaveNewGoalFeatureCommand): Observable<SaveNewGoalFeatureCommandResult> {
    return this.post<SaveNewGoalFeatureCommandResult>('/new-goal-feature', command);
}
```

#### Step 6: Add Component Logic

```typescript
// Location: src/WebV2/libs/bravo-domain/src/goal/components/upsert-goal-form/upsert-goal-form.component.ts
public onSaveNewGoalFeature(): void {
    const command: SaveNewGoalFeatureCommand = {
        goalId: this.currentVm().id!,
        featureName: this.currentVm().newFeatureName
    };

    this.goalManagementApi.saveNewGoalFeature(command)
        .pipe(
            this.observerLoadingErrorState('saveFeature'),
            this.tapResponse(result => {
                this.showSuccessMessage('Feature saved successfully');
                this.reload();
            }),
            this.untilDestroyed()
        )
        .subscribe();
}
```

---

## 17. Test Specifications

### Test Summary

| Category    | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) |  Total  |
| ----------- | :-----------: | :-------: | :---------: | :------: | :-----: |
| CRUD        |       4       |     2     |      1      |    0     |    7    |
| Validation  |       5       |     3     |      2      |    1     |   11    |
| Permissions |       6       |     4     |      1      |    0     |   11    |
| Workflows   |       3       |     2     |      1      |    0     |    6    |
| Performance |       0       |     2     |      1      |    0     |    3    |
| **Total**   |    **18**     |  **13**   |   **6**     | **1**    | **38**  |

---

### CRUD Operations

#### TC-GM-001: Create SMART Goal [P0]

**Acceptance Criteria**:
- ✅ Employee can create SMART goal with all required fields
- ✅ MeasurementType required for SMART goals
- ✅ Auto-assigns current employee as Owner
- ✅ Email notification sent to owner

**Test Data**:
```json
{
  "title": "Complete PMP Certification",
  "goalType": "Smart",
  "goalTargetType": "Individual",
  "measurementType": "Percentage",
  "startValue": 0,
  "targetValue": 100,
  "startDate": "2026-02-01",
  "dueDate": "2026-08-31",
  "visibility": "OnlyMe"
}
```

**GIVEN** authenticated employee without external user flag
**WHEN** submitting SaveGoalCommand with valid SMART goal data
**THEN** goal created, employee added to GoalEmployee as Owner, email notification sent

**Edge Cases**:
- ❌ Missing MeasurementType → "MeasurementType is required for SMART goals and KeyResults"
- ❌ External user attempts to create → "External users cannot create goals"
- ❌ DueDate < StartDate → "DueDate must be >= StartDate"

**Evidence**: `SaveGoalCommand.cs:85-115`, `SaveGoalCommandHandler.cs:65-120`

---

#### TC-GM-002: Create OKR (Objective + 3 KeyResults) [P0]

**Acceptance Criteria**:
- ✅ Create Objective goal (GoalType = Objective)
- ✅ Create 3 KeyResult goals with ParentId = Objective.Id
- ✅ Objective Progress auto-calculated as avg of KeyResult progress
- ✅ Cannot delete Objective while KeyResults exist

**Test Data**:
```json
{
  "objective": {
    "title": "Increase Customer Satisfaction",
    "goalType": "Objective",
    "visibility": "Public"
  },
  "keyResults": [
    {
      "title": "Achieve NPS score of 70+",
      "goalType": "KeyResult",
      "measurementType": "Numeric",
      "targetValue": 70,
      "parentId": "{objective.id}"
    },
    {
      "title": "Reduce average response time to < 2 hours",
      "goalType": "KeyResult",
      "measurementType": "Numeric",
      "targetValue": 2,
      "parentId": "{objective.id}"
    },
    {
      "title": "Increase retention rate to 95%",
      "goalType": "KeyResult",
      "measurementType": "Percentage",
      "targetValue": 95,
      "parentId": "{objective.id}"
    }
  ]
}
```

**GIVEN** Objective created with 3 KeyResults
**WHEN** updating KeyResult 1 progress to 80%, KeyResult 2 to 50%, KeyResult 3 to 100%
**THEN** Objective progress auto-calculated to 76.67% ((80+50+100)/3)

**Edge Cases**:
- ❌ Create KeyResult without ParentId → "ParentId required for KeyResult type"
- ❌ Create KeyResult with ParentId pointing to SMART goal → "Parent must be an Objective"
- ❌ Delete Objective while KeyResults exist → "Cannot delete Objective with existing KeyResults. Delete KeyResults first."

**Evidence**: `SaveGoalCommand.cs:117-145`, `DeleteGoalCommandHandler.cs:65-91`, `Goal.cs:78-95` (Progress computation)

---

#### TC-GM-003: Update Goal Progress [P0]

**Acceptance Criteria**:
- ✅ Owner can update CurrentValue
- ✅ Watcher can update CurrentValue
- ✅ Progress auto-calculated: (CurrentValue / TargetValue) × 100
- ✅ CurrentValue can exceed TargetValue (over-achievement)

**Test Data**:
```json
{
  "goalId": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "measurementType": "Numeric",
  "startValue": 0,
  "targetValue": 50,
  "currentValue": 35
}
```

**GIVEN** goal with TargetValue = 50, CurrentValue = 0
**WHEN** UpdateGoalCurrentValueMeasurementCommand with CurrentValue = 35
**THEN** Progress updated to 70% (35/50 × 100)

**Edge Cases**:
- ✅ CurrentValue = 60 (exceeds TargetValue) → Progress = 120%, Status = Completed
- ❌ Non-owner, non-watcher attempts update → "Permission denied"

**Evidence**: `UpdateGoalCurrentValueMeasurementCommand.cs:45-72`, `Goal.cs:78-95`

---

#### TC-GM-004: Delete Goal [P0]

**Acceptance Criteria**:
- ✅ Owner or Admin can delete goal
- ✅ Cascade deletes GoalEmployee relationships
- ✅ Cannot delete Objective with KeyResults
- ✅ Email notification sent on deletion

**GIVEN** goal with no child KeyResults
**WHEN** DeleteGoalCommand issued by owner or admin
**THEN** goal deleted, GoalEmployee records deleted, email notification sent

**Edge Cases**:
- ❌ Non-owner, non-admin attempts delete → "Permission denied"
- ❌ Delete Objective with 3 KeyResults → "Cannot delete Objective with existing KeyResults. Delete KeyResults first."

**Evidence**: `DeleteGoalCommandHandler.cs:65-91`, `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

### Validation

#### TC-GM-011: External User Cannot Create Goals [P0]

**Acceptance Criteria**:
- ✅ Employee with IsExternalUser = true cannot create goals
- ✅ Validation error message: "External users cannot create goals"

**GIVEN** authenticated user with Employee.IsExternalUser = true
**WHEN** attempting to create goal via SaveGoalCommand
**THEN** async validation fails with error message

**Evidence**: `SaveGoalCommand.cs:117-145`

---

#### TC-GM-012: KeyResult Parent Validation [P0]

**Acceptance Criteria**:
- ✅ KeyResult must have ParentId
- ✅ ParentId must point to existing Objective
- ✅ ParentId cannot point to SMART goal or another KeyResult

**GIVEN** KeyResult goal without ParentId
**WHEN** SaveGoalCommand submitted
**THEN** sync validation fails: "ParentId required for KeyResult type"

**GIVEN** KeyResult with ParentId pointing to SMART goal
**WHEN** SaveGoalCommand submitted
**THEN** async validation fails: "Parent must be an Objective"

**Evidence**: `SaveGoalCommand.cs:85-115`, `SaveGoalCommand.cs:117-145`

---

#### TC-GM-013: Date Range Validation [P0]

**Acceptance Criteria**:
- ✅ StartDate required
- ✅ DueDate required
- ✅ DueDate >= StartDate

**Edge Cases**:
- ❌ DueDate = StartDate - 1 day → "DueDate must be >= StartDate"

**Evidence**: `SaveGoalCommand.cs:85-115`

---

### Permissions

#### TC-GM-021: Owner Can Edit All Fields [P0]

**Acceptance Criteria**:
- ✅ Goal owner has all 23 permissions enabled
- ✅ Can update title, description, dates, measurement, visibility, status
- ✅ Can delete goal
- ✅ Can update progress

**GIVEN** employee is Owner of goal (via GoalEmployee.Role = Owner)
**WHEN** GoalPermission calculated for this employee
**THEN** all 23 permissions return true

**Evidence**: `GoalPermission.ts:620-750`

---

#### TC-GM-022: Watcher Can Only Update Progress [P1]

**Acceptance Criteria**:
- ✅ Watcher can update CurrentValue (progress)
- ❌ Watcher cannot edit title, description, dates
- ❌ Watcher cannot delete goal
- ❌ Watcher cannot change status

**GIVEN** employee is Watcher of goal (via GoalEmployee.Role = Watcher)
**WHEN** GoalPermission calculated for this employee
**THEN** only CanUpdateGoalProgress, CanViewGoal, CanCommentOnGoal return true

**Evidence**: `GoalPermission.ts:620-750`

---

#### TC-GM-023: Admin Has Full Access [P0]

**Acceptance Criteria**:
- ✅ Admin can edit any goal regardless of ownership
- ✅ Admin can delete any goal (except Objective with KeyResults)
- ✅ Admin bypasses visibility filters

**GIVEN** employee has role = PlatformRoles.Admin
**WHEN** GoalPermission calculated for this employee
**THEN** all 23 permissions return true for any goal

**Evidence**: `GoalPermission.ts:620-750`

---

### Workflows

#### TC-GM-031: Email Notification on Goal Create [P0]

**Acceptance Criteria**:
- ✅ Email sent to all goal owners
- ✅ Email sent to all watchers
- ✅ Email sent to all approvers
- ✅ Email NOT sent during test data seeding

**GIVEN** goal created with 2 owners, 1 watcher, 1 approver
**WHEN** SaveGoalCommandHandler completes CreateOrUpdateAsync
**THEN** platform raises PlatformCqrsEntityEvent → SendEmailOnCUDGoalEntityEventHandler sends 4 emails

**Edge Cases**:
- ❌ RequestContext.IsSeedingTestingData() = true → No email sent

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

#### TC-GM-032: Deadline Reminder Job (7 Days Before Due) [P1]

**Acceptance Criteria**:
- ✅ Job runs daily at 9 AM UTC (Cron: 0 9 * * *)
- ✅ Sends reminder email to goal owners
- ✅ Only goals with DueDate between UtcNow and UtcNow + 7 days
- ✅ Excludes Completed and Canceled goals

**GIVEN** goal with DueDate = UtcNow + 6 days, Status = Progressing
**WHEN** GoalDeadlinesSendReminderBackgroundJobExecutor runs
**THEN** reminder email sent to goal owners

**Edge Cases**:
- ❌ DueDate = UtcNow + 8 days → No email (too far out)
- ❌ Status = Completed → No email (already done)

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:45-107`

---

#### TC-GM-033: Cascade Delete on Employee Removal [P0]

**Acceptance Criteria**:
- ✅ When employee deleted, all goals where they are sole owner are deleted
- ✅ When employee deleted, they are removed from goals as watcher/approver
- ✅ Goals with multiple owners remain active

**GIVEN** employee is sole owner of 3 goals, watcher on 2 goals
**WHEN** DeleteEmployeeCommand triggers PlatformCqrsEntityEvent (Deleted)
**THEN** 3 goals deleted, employee removed from 2 goals as watcher

**Evidence**: `DeleteGoalOnDeleteEmployeeEntityEventHandler.cs:15-50`

---

### Performance

#### TC-PERF-001: Goal List Query (10,000 goals) [P1]

**Acceptance Criteria**:
- ✅ Query with CompanyId filter returns in < 300ms (p95)
- ✅ Paged query (20 items) returns in < 200ms
- ✅ Uses compound MongoDB index (CompanyId + ProductScope + DueDate)

**GIVEN** MongoDB collection with 10,000 goals for company
**WHEN** GetGoalListQuery with CompanyId filter, pageSize = 20
**THEN** query completes in < 300ms

**Optimization**:
- Compound index: `{ CompanyId: 1, ProductScope: 1, IsDeleted: 1, DueDate: -1 }`
- Projection: Only select necessary fields (not full documents)

**Evidence**: `GetGoalListQueryHandler.cs:75-125`

---

#### TC-PERF-002: Dashboard Stats Aggregation [P1]

**Acceptance Criteria**:
- ✅ Stats query (total, by status, overdue) returns in < 500ms
- ✅ Uses parallel tuple query (count + aggregation)

**GIVEN** Company with 1,000 goals
**WHEN** GetGoalDashboardSummaryQuery executed
**THEN** all stats calculated in < 500ms

**Optimization**:
- Parallel tuple query: `await (countTask, statsTask)`
- Compound index on Status: `{ CompanyId: 1, Status: 1, IsDeleted: 1 }`

**Evidence**: `GetGoalDashboardSummaryQueryHandler.cs:45-153`

---

#### TC-PERF-003: FormArray Rendering (100 KeyResults) [P2]

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

## 18. Test Data Requirements

### Base Test Data

#### Companies

```json
{
  "companyId": "test-company-001",
  "companyName": "Acme Corp",
  "productScope": 1,
  "isActive": true
}
```

#### Employees

```json
{
  "employees": [
    {
      "id": "emp-owner-001",
      "fullName": "John Owner",
      "email": "john.owner@acme.com",
      "companyId": "test-company-001",
      "isExternalUser": false,
      "orgUnitId": "org-unit-sales"
    },
    {
      "id": "emp-watcher-001",
      "fullName": "Jane Watcher",
      "email": "jane.watcher@acme.com",
      "companyId": "test-company-001",
      "isExternalUser": false,
      "orgUnitId": "org-unit-sales"
    },
    {
      "id": "emp-external-001",
      "fullName": "External Consultant",
      "email": "consultant@external.com",
      "companyId": "test-company-001",
      "isExternalUser": true
    }
  ]
}
```

---

### Scenario-Specific Test Data

#### Scenario 1: SMART Goal Creation

**Seed Data**:
```json
{
  "employee": {
    "id": "emp-owner-001",
    "isExternalUser": false
  },
  "goal": null
}
```

**Test Execution**:
```json
{
  "saveGoalCommand": {
    "data": {
      "title": "Complete PMP Certification",
      "goalType": "Smart",
      "goalTargetType": "Individual",
      "measurementType": "Percentage",
      "startValue": 0,
      "targetValue": 100,
      "startDate": "2026-02-01T00:00:00Z",
      "dueDate": "2026-08-31T23:59:59Z",
      "visibility": "OnlyMe",
      "ownerEmployeeIds": ["emp-owner-001"]
    }
  }
}
```

**Expected Result**:
- Goal created with ID
- GoalEmployee record with Role = Owner
- Email sent to emp-owner-001

---

#### Scenario 2: OKR (Objective + KeyResults)

**Seed Data**:
```json
{
  "employee": {
    "id": "emp-owner-001",
    "isExternalUser": false
  },
  "goals": []
}
```

**Test Execution**:
```json
{
  "step1_createObjective": {
    "title": "Increase Customer Satisfaction",
    "goalType": "Objective",
    "visibility": "Public",
    "ownerEmployeeIds": ["emp-owner-001"]
  },
  "step2_createKeyResults": [
    {
      "title": "Achieve NPS score of 70+",
      "goalType": "KeyResult",
      "parentId": "{objectiveId}",
      "measurementType": "Numeric",
      "targetValue": 70
    },
    {
      "title": "Reduce response time to < 2 hours",
      "goalType": "KeyResult",
      "parentId": "{objectiveId}",
      "measurementType": "Numeric",
      "targetValue": 2
    },
    {
      "title": "Increase retention rate to 95%",
      "goalType": "KeyResult",
      "parentId": "{objectiveId}",
      "measurementType": "Percentage",
      "targetValue": 95
    }
  ]
}
```

**Expected Result**:
- 1 Objective created
- 3 KeyResults created with ParentId = Objective.Id
- Objective.Progress = 0% (KeyResults have CurrentValue = 0)

---

#### Scenario 3: Permission Matrix Testing

**Seed Data**:
```json
{
  "goal": {
    "id": "goal-001",
    "title": "Test Goal",
    "ownerEmployeeIds": ["emp-owner-001"],
    "watcherEmployeeIds": ["emp-watcher-001"]
  },
  "employees": [
    {"id": "emp-owner-001", "roles": []},
    {"id": "emp-watcher-001", "roles": []},
    {"id": "emp-admin-001", "roles": ["Admin"]}
  ]
}
```

**Test Execution**:
```json
{
  "test_owner_permissions": {
    "currentEmployeeId": "emp-owner-001",
    "expectedPermissions": {
      "CanUpdateTitle": true,
      "CanUpdateDescription": true,
      "CanUpdateStatus": true,
      "CanDeleteGoal": true,
      "CanUpdateGoalProgress": true
    }
  },
  "test_watcher_permissions": {
    "currentEmployeeId": "emp-watcher-001",
    "expectedPermissions": {
      "CanUpdateTitle": false,
      "CanUpdateDescription": false,
      "CanUpdateStatus": false,
      "CanDeleteGoal": false,
      "CanUpdateGoalProgress": true
    }
  },
  "test_admin_permissions": {
    "currentEmployeeId": "emp-admin-001",
    "expectedPermissions": {
      "CanUpdateTitle": true,
      "CanUpdateDescription": true,
      "CanUpdateStatus": true,
      "CanDeleteGoal": true,
      "CanUpdateGoalProgress": true
    }
  }
}
```

---

## 19. Edge Cases Catalog

#### EC-GM-001: Circular ParentId Reference

**Case**: Attempt to set goal's ParentId to point to itself

**Input**:
```json
{
  "goalId": "goal-001",
  "parentId": "goal-001"
}
```

**Handling**: Validation fails

**Error**: "Circular reference detected: Goal cannot be its own parent"

**Risk**: High | **Impact**: High | **Likelihood**: Low

**Evidence**: `SaveGoalCommand.cs:117-145` (async validation should include circular check)

---

#### EC-GM-002: Orphaned KeyResults on Objective Delete

**Case**: Delete Objective while KeyResults exist

**Input**:
```json
{
  "deleteGoalCommand": {
    "goalId": "objective-001"
  }
}
```

**Current Behavior**: Validation blocks deletion

**Error**: "Cannot delete Objective with existing KeyResults. Delete KeyResults first."

**Risk**: Medium | **Impact**: High | **Likelihood**: Medium

**Evidence**: `DeleteGoalCommandHandler.cs:65-91`

---

#### EC-GM-003: Progress Calculation with Zero KeyResults

**Case**: Objective has no KeyResults → Progress calculation

**Current Behavior**: Progress = null (no KeyResults to average)

**Handling**: Frontend displays "N/A" or "—" for progress

**Risk**: Low | **Impact**: Low | **Likelihood**: High

**Evidence**: `Goal.cs:78-95` (computed property)

---

#### EC-GM-004: CurrentValue Exceeds TargetValue

**Case**: Employee updates CurrentValue to 120 when TargetValue = 100

**Handling**: Allowed (over-achievement)

**Result**: Progress = 120%, Status auto-updates to Completed

**Risk**: Low | **Impact**: Low | **Likelihood**: Medium

**Evidence**: `UpdateGoalCurrentValueMeasurementCommand.cs:45-72`

---

#### EC-GM-005: Email Notification Failure

**Case**: NotificationMessage service unavailable → email send fails

**Current Behavior**: Event handler logs error but doesn't rollback goal save

**Handling**: Non-blocking error (goal save succeeds, email failure logged)

**Risk**: Low | **Impact**: Low | **Likelihood**: Low

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

#### EC-GM-006: Deep Linking Query Param Parsing

**Case**: URL: `?statuses=Completed,Invalid,Progressing` (Invalid is not a valid GoalStatuses enum)

**Handling**: Silently filters out invalid values

**Result**: `statuses = [GoalStatuses.Completed, GoalStatuses.Progressing]`

**Risk**: Low | **Impact**: Low | **Likelihood**: Medium

**Evidence**: `goal-management.store.ts:161-246`

---

#### EC-GM-007: Visibility: SpecificPeople with Empty List

**Case**: Goal visibility = SpecificPeople but VisibilityEmployeeIds = []

**Handling**: No one can view goal (except owner and admin)

**Risk**: Medium | **Impact**: Medium | **Likelihood**: Low

**Evidence**: `GoalPermission.ts:150-220`

---

#### EC-GM-008: FormArray: Delete All KeyResults

**Case**: User deletes all KeyResults from Objective FormArray

**Handling**: Allowed (soft validation warning)

**Warning**: "Consider adding 3-5 KeyResults to this Objective for complete OKR implementation"

**Risk**: Low | **Impact**: Low | **Likelihood**: Medium

**Evidence**: Frontend validation in `upsert-goal-form.component.ts:250-280`

---

#### EC-GM-009: Concurrent Goal Updates

**Case**: Two users edit same goal simultaneously

**Current Behavior**: Last write wins (no optimistic concurrency control)

**Risk**: Medium | **Impact**: Medium | **Likelihood**: Low

**Future Enhancement**: Add `RowVersion` field for optimistic concurrency

---

#### EC-GM-010: Background Job Timeout

**Case**: GoalDeadlinesSendReminderBackgroundJobExecutor takes > 10 minutes

**Handling**: Job timeout, next run retries missed goals

**Risk**: Low | **Impact**: Low | **Likelihood**: Low

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

## 20. Regression Impact

### High-Risk Changes

#### 1. Modify GoalPermission Logic

**Change**: Update permission calculation (e.g., allow Watchers to edit title)

**Regression Risk**: **High**

**Affected Areas**:
- Frontend: All 23 form fields might become unexpectedly enabled/disabled
- Backend: Async validation might fail for legitimate updates
- Test Cases: TC-GM-022 (Watcher permissions) would fail

**Mitigation**:
- Run full permission test suite (TC-GM-021 through TC-GM-026)
- Test all 23 permissions for Owner, Watcher, Approver, Admin roles
- Verify frontend form field enabling/disabling

**Evidence**: `GoalPermission.ts:620-750`, `upsert-goal-form.component.ts:450-480`

---

#### 2. Change Goal.Progress Calculation Logic

**Change**: Modify computed property formula (e.g., weighted avg instead of simple avg)

**Regression Risk**: **High**

**Affected Areas**:
- All Objective progress displays (dashboard, goal list, goal detail)
- Performance review integration (if goals linked to reviews)
- Test Cases: TC-GM-002 (OKR progress calculation) would fail

**Mitigation**:
- Run TC-GM-002 with multiple KeyResult configurations
- Verify progress recalculation on CurrentValue update
- Check dashboard stats aggregation

**Evidence**: `Goal.cs:78-95`, `UpdateGoalCurrentValueMeasurementCommand.cs:45-72`

---

#### 3. Modify MongoDB Indexes

**Change**: Drop or change compound index on CompanyId + ProductScope + DueDate

**Regression Risk**: **High**

**Affected Areas**:
- GetGoalListQuery performance degrades significantly (from < 300ms to > 5 seconds)
- Dashboard stats query becomes slow
- Test Cases: TC-PERF-001, TC-PERF-002 would fail

**Mitigation**:
- Run performance test suite before/after index change
- Monitor query execution plans in MongoDB Compass
- Load test with 10,000+ goals

**Evidence**: MongoDB migration script, `GetGoalListQueryHandler.cs:75-125`

---

### Medium-Risk Changes

#### 4. Update Email Notification Template

**Change**: Modify email subject/body for goal notifications

**Regression Risk**: **Medium**

**Affected Areas**:
- Email appearance changes (might confuse users)
- Email template variables might not match BodyParameters
- Test Cases: TC-GM-031 (email notification) would fail if template variables missing

**Mitigation**:
- Test email rendering with sample data
- Verify all template variables exist in BodyParameters
- Send test emails before deploying

**Evidence**: `SendEmailOnCUDGoalEntityEventHandler.cs:25-60`

---

#### 5. Change Background Job Schedule

**Change**: Modify cron expression from `0 9 * * *` (9 AM daily) to `0 6 * * *` (6 AM daily)

**Regression Risk**: **Medium**

**Affected Areas**:
- Reminder emails sent 3 hours earlier (might catch users off-guard)
- Test Cases: TC-GM-032 (deadline reminder) timing changes

**Mitigation**:
- Announce schedule change to users
- Monitor email send volume at new time
- Verify job completes before business hours

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

### Low-Risk Changes

#### 6. Add New GoalStatuses Enum Value

**Change**: Add new status `OnHold`

**Regression Risk**: **Low**

**Affected Areas**:
- Frontend dropdown gets new option
- Backend validation allows new status
- Dashboard stats cards need new filter

**Mitigation**:
- Add test case for new status
- Update status transition validation if needed
- Update dashboard aggregation query

**Evidence**: `goal.enum.ts`, `GetGoalDashboardSummaryQuery.cs:45-153`

---

## 21. Troubleshooting

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

**Evidence**: `GetGoalDashboardSummaryQueryHandler.cs:45-120`

---

## 22. Operational Runbook

### Daily Operations

#### Background Job Monitoring

**Job**: `GoalDeadlinesSendReminderBackgroundJobExecutor`

**Schedule**: Daily at 9 AM UTC (Cron: `0 9 * * *`)

**Monitoring Checklist**:
- [ ] Check Hangfire dashboard for job completion status
- [ ] Verify job duration < 5 minutes (normal for 10,000 goals)
- [ ] Check email send count matches expected reminders
- [ ] Review error logs for any failed email sends

**Expected Metrics** (10,000 goals):
- **Execution Time**: 2-5 minutes
- **Reminder Emails Sent**: ~500-800 (goals due in 7 days)
- **Error Rate**: < 1%

**Alert Thresholds**:
- Job duration > 10 minutes → Investigate database performance
- Error rate > 5% → Check NotificationMessage service health
- Job failed 2 consecutive days → Escalate to DevOps

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

### Weekly Operations

#### Database Index Health Check

**Frequency**: Weekly

**Checklist**:
- [ ] Check MongoDB index usage statistics
- [ ] Verify compound index on `CompanyId + ProductScope + DueDate` has high usage
- [ ] Check for missing indexes on new query patterns
- [ ] Review slow query logs (queries > 1 second)

**MongoDB Commands**:
```javascript
// Check index usage
db.Goals.aggregate([{ $indexStats: {} }]);

// Check slow queries
db.system.profile.find({ millis: { $gt: 1000 } }).sort({ ts: -1 }).limit(10);
```

**Action Items**:
- If slow queries found → Create new index or optimize query
- If index not used → Consider dropping unused index

---

### Monthly Operations

#### Data Archival (Future Enhancement)

**Frequency**: Monthly

**Criteria**: Archive goals with all of:
- Status = Completed or Canceled
- DueDate > 2 years ago
- Not linked to active performance reviews

**Process** (not implemented yet):
1. Identify goals matching criteria
2. Export to archive database
3. Soft delete from main database (`IsDeleted = true`)
4. Hard delete after 90 days

**Expected Volume**: ~1,000-2,000 goals/month (for 50,000 employees)

---

### Incident Response

#### Severity 1: Service Down

**Symptoms**: API returns 500 errors, users cannot access goal management

**Steps**:
1. Check service logs for exceptions
2. Verify MongoDB connectivity (connection string, credentials)
3. Check database server health (CPU, memory, disk)
4. Restart Growth service if necessary
5. Escalate to DevOps if database issue
6. Notify users via status page

**SLA**: Restore service within 1 hour

**Evidence**: `GoalController.cs:15-103`

---

#### Severity 2: Background Job Failure

**Symptoms**: Daily reminder job fails, users not receiving deadline reminders

**Steps**:
1. Check Hangfire dashboard for error details
2. Review job logs for exceptions
3. Verify NotificationMessage service is running
4. Manually retry job via Hangfire dashboard
5. If job succeeds on retry → Monitor next scheduled run
6. If job fails again → Escalate to backend team

**SLA**: Restore job within 4 hours

**Evidence**: `GoalDeadlinesSendReminderBackgroundJobExecutor.cs:25-107`

---

#### Severity 3: Slow Performance

**Symptoms**: Goal list takes > 5 seconds to load

**Steps**:
1. Check MongoDB server CPU and memory usage
2. Review slow query logs
3. Verify indexes exist on `CompanyId`, `ProductScope`, `DueDate`, `Status`
4. Check for large result sets (> 10,000 goals per query)
5. Optimize query or add pagination if needed

**SLA**: Investigate within 24 hours

**Evidence**: `GetGoalListQueryHandler.cs:75-125`

---

### Deployment Checklist

#### Pre-Deployment

- [ ] Run full test suite (38 test cases)
- [ ] Verify database migrations tested in staging
- [ ] Check for breaking API changes
- [ ] Review release notes for dependency updates
- [ ] Ensure rollback plan documented

#### Deployment

- [ ] Deploy backend service first (Growth.Service)
- [ ] Verify API health endpoint returns 200
- [ ] Deploy frontend apps (growth-for-company, employee)
- [ ] Verify background jobs still running (check Hangfire)
- [ ] Monitor error logs for 1 hour post-deployment

#### Post-Deployment

- [ ] Verify goal list query performance (< 300ms p95)
- [ ] Test goal creation flow end-to-end
- [ ] Check email notifications sent successfully
- [ ] Review error rate (should be < 0.1%)
- [ ] Notify support team of deployment completion

---

## 23. Roadmap and Dependencies

### Planned Enhancements

#### v2.1 (Q2 2026)

**Features**:
- **Goal Templates**: Pre-defined goal templates (Sales goals, Engineering goals, etc.)
- **Goal Dependencies**: Link goals with "Blocks" / "Depends on" relationships
- **Goal Delegation**: Transfer goal ownership to another employee
- **Bulk Operations**: Bulk update status, bulk assign owners

**Dependencies**:
- None (self-contained features)

**Effort**: 4 weeks (2 backend devs, 2 frontend devs)

**Evidence**: Product roadmap document

---

#### v2.2 (Q3 2026)

**Features**:
- **Goal Analytics Dashboard**: Visualizations for completion rate, avg time to complete, trends
- **Goal Approval Workflow**: Multi-step approval process (draft → manager review → approved)
- **Goal Alignment View**: Visual hierarchy of company → department → individual goals
- **Mobile App Support**: Native mobile app (React Native)

**Dependencies**:
- Analytics dashboard requires data warehouse setup (BigQuery or Snowflake)
- Mobile app requires mobile infrastructure team

**Effort**: 8 weeks (3 backend devs, 3 frontend devs, 2 mobile devs)

**Evidence**: Product roadmap document

---

#### v3.0 (Q4 2026)

**Features**:
- **AI-Powered Goal Suggestions**: Recommends goals based on role, past goals, company objectives
- **Automated Progress Tracking**: Integrates with Jira, GitHub, Salesforce to auto-update progress
- **Goal Gamification**: Badges, streaks, leaderboards for goal completion
- **Multi-Language Support**: i18n for 10 languages (EN, ES, FR, DE, ZH, JA, KO, PT, IT, NL)

**Dependencies**:
- AI suggestions require ML model training (3-6 months)
- Jira/GitHub integration requires OAuth 2.0 setup
- Gamification requires user engagement framework

**Effort**: 12 weeks (4 backend devs, 4 frontend devs, 1 ML engineer)

**Evidence**: Product roadmap document

---

### Known Dependencies

#### Internal Dependencies

- **Performance Review Module**: Goals linked via `GoalPerformanceReviewParticipant` entity
- **Check-In Module**: Goals linked via `GoalCheckIn` entity
- **NotificationMessage Service**: Email notifications depend on this service
- **Accounts Service**: User authentication, role management

**Risk**: If any dependent service is down, goal management may degrade gracefully (e.g., no emails sent, but goals still saveable).

**Evidence**: `GoalPerformanceReviewParticipant.cs`, `GoalCheckIn.cs`, `SendEmailOnCUDGoalEntityEventHandler.cs`

---

#### External Dependencies

- **MongoDB Atlas**: Database hosting (SLA: 99.95% uptime)
- **SendGrid**: Email delivery service (SLA: 99.9% uptime)
- **Hangfire**: Background job scheduler (self-hosted, no external dependency)

**Risk**: If MongoDB Atlas is down, entire service is unavailable. If SendGrid is down, email notifications fail but goals still save.

**Evidence**: `appsettings.json` (MongoDB connection string), `SendEmailOnCUDGoalEntityEventHandler.cs` (SendGrid API)

---

## 24. Related Documentation

### BravoSUITE Platform Documentation

- **[CLAUDE.md](../../CLAUDE.md)** - Complete platform development guide
    - Backend patterns: CQRS, Clean Architecture, Repository patterns
    - Frontend patterns: PlatformComponent, PlatformVmStore, forms
    - Event-driven architecture: Entity events, message bus
- **[EasyPlatform.README.md](../../EasyPlatform.README.md)** - Easy.Platform framework deep dive
    - PlatformVmStore implementation details
    - Validation patterns (PlatformValidationResult fluent API)
    - Background job patterns (PlatformApplicationBackgroundJobExecutor)
- **[CLEAN-CODE-RULES.md](../../CLEAN-CODE-RULES.md)** - Coding standards and anti-patterns
    - Code organization and flow patterns
    - Validation method naming conventions
    - DTO mapping responsibility rules

### Design System Documentation

#### WebV2 (Angular 19) - Growth Application

- **[Design System Overview](../../docs/design-system/README.md)** - Complete design system guide
- **[01-design-tokens.md](../../docs/design-system/01-design-tokens.md)** - Colors, typography, spacing
- **[02-component-catalog.md](../../docs/design-system/02-component-catalog.md)** - UI components
- **[03-form-patterns.md](../../docs/design-system/03-form-patterns.md)** - Form validation, modes
- **[04-dialog-patterns.md](../../docs/design-system/04-dialog-patterns.md)** - Modal and panel patterns
- **[05-table-patterns.md](../../docs/design-system/05-table-patterns.md)** - Tables, pagination
- **[06-state-management.md](../../docs/design-system/06-state-management.md)** - State patterns
- **[07-technical-guide.md](../../docs/design-system/07-technical-guide.md)** - Implementation guide

### Related Feature Documentation

- **[Performance Review Feature](./performance/README.PerformanceReviewFeature.md)**
    - Goal → Performance Review integration patterns
    - GoalPerformanceReviewParticipant usage
- **[Check-In Feature](./performance/README.CheckInManagementFeature.md)**
    - Goal → Check-In integration patterns
    - GoalCheckIn entity usage
- **[Employee Management Feature](../../../bravoTALENTS/detailed-features/README.EmployeeManagementFeature.md)**
    - Employee entity relationships
    - Line manager permissions
- **[Notification Feature](../../README.NotificationFeature.md)** _(if exists)_
    - Email template configuration
    - Notification preferences

### API Documentation

- **Backend API**: `https://api.bravosuite.com/swagger` (Production)
- **Backend API**: `http://localhost:5010/swagger` (Development - Growth service)
- **Frontend Development**: `http://localhost:4206` (Growth app)
- **Frontend Development**: `http://localhost:4205` (Employee app)

### Code Locations

#### Backend (.NET 9)

```
src/Services/bravoGROWTH/
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
│   │   └── GetGoalDashboardSummaryQuery.cs  # Stats aggregation
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
src/WebV2/libs/bravo-domain/src/goal/
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

- **Unit Tests**: `src/Services/bravoGROWTH/Growth.Application.Tests/`
- **Integration Tests**: `src/AutomationTest/bravoGROWTH/`
- **E2E Tests**: `src/AutomationTest/WebV2/goals/`

### Support and Contribution

- **Issue Tracker**: GitHub Issues (internal repository)
- **Slack Channel**: `#bravosuite-development`
- **Code Review**: All changes require PR review by senior developer
- **CI/CD**: Azure DevOps pipelines (`azure-pipelines.yml`)

---

## 25. Glossary

### Business Terms

| Term | Definition |
|------|------------|
| **OKR** | Objectives and Key Results - Goal-setting framework where Objective (qualitative goal) is measured by 3-5 Key Results (quantitative metrics) |
| **SMART Goal** | Specific, Measurable, Achievable, Relevant, Time-bound goal methodology |
| **Goal Alignment** | Process of linking individual/department goals to company strategic objectives |
| **Goal Cascade** | Top-down approach where company goals flow down to departments and individuals |
| **Progress Percentage** | Calculated metric: (CurrentValue / TargetValue) × 100 |

### Technical Terms

| Term | Definition |
|------|------------|
| **Goal Owner** | Employee who creates and is primarily responsible for the goal (GoalEmployee.Role = Owner) |
| **Goal Watcher** | Employee who can view and update progress but cannot edit goal details (GoalEmployee.Role = Watcher) |
| **Goal Approver** | Employee who can approve/reject goal status transitions (GoalEmployee.Role = Approver) |
| **Computed Property** | Entity property calculated dynamically (e.g., Progress, IsOverdue) with `[ComputedEntityProperty]` attribute |
| **Event-Driven Architecture** | Platform auto-publishes entity events (PlatformCqrsEntityEvent) after CRUD operations, triggering event handlers |
| **Fluent Validation** | Chained validation using `PlatformValidationResult.And().AndAsync()` pattern |

### Entities

| Entity | Description |
|--------|-------------|
| **Goal** | Main aggregate root representing an OKR Objective, KeyResult, or SMART goal |
| **GoalEmployee** | Many-to-many join entity linking employees to goals with roles (Owner, Watcher, Approver) |
| **GoalCheckIn** | Integration entity linking goals to recurring check-in events |
| **GoalPerformanceReviewParticipant** | Integration entity linking goals to performance review cycles |

### Enumerations

| Enum | Values | Description |
|------|--------|-------------|
| **GoalTypes** | Smart, Objective, KeyResult | Defines goal methodology |
| **GoalStatuses** | NotStarted, Progressing, Behind, AtRisk, Canceled, Completed | Goal progress status |
| **GoalTargetTypes** | Individual, Company, Department | Goal scope level |
| **GoalVisibilityTypes** | Public, OnlyMe, MeAndManager, SpecificPeople, ThisOrgUnit, ThisOrgUnitAndSubOrgs | Access control visibility |
| **MeasurementTypes** | Numeric, Percentage, Currency | Progress measurement unit |
| **GoalPriorities** | High, Medium, Low | Goal importance ranking |
| **GoalEmployeeRoles** | Owner, Watcher, Approver | Employee role in relation to goal |

### Status Values

| Status | Description | Transition Rules |
|--------|-------------|------------------|
| **NotStarted** | Goal created but work not started | Default state for new goals |
| **Progressing** | Goal in progress, on track to meet target | From NotStarted when CurrentValue > 0 |
| **Behind** | Goal in progress but behind schedule | From Progressing when Progress < expected % |
| **AtRisk** | Goal at high risk of missing target | From Progressing/Behind when deadline approaching and Progress < 70% |
| **Canceled** | Goal canceled before completion | From any status (final state) |
| **Completed** | Goal successfully completed | From any status when CurrentValue >= TargetValue (final state) |

---

## 26. Version History

| Version | Date       | Changes | Author |
|---------|-----------|---------|--------|
| **2.0** | 2026-01-10 | **[MIGRATION]** Expanded to 26-section standard documentation template. Added: Executive Summary (strategic importance, key metrics, deployment status), Business Value (ROI analysis showing 1,421% ROI, user stories), Business Rules (15 detailed rules: BR-GC-001 through BR-NT-002 with IF/THEN/ELSE logic), Process Flows (renamed from Core Workflows, added complete flow diagrams), System Design (3 ADRs, component diagrams, data flow diagrams), Security Architecture (5-layer model, RBAC matrix, GDPR compliance), Performance Considerations (targets, database optimization, caching strategy, background job optimization), Implementation Guide (dev setup, step-by-step feature creation examples), Test Data Requirements (base data, scenario-specific test data), Edge Cases Catalog (10 documented edge cases: EC-GM-001 through EC-GM-010), Regression Impact (high/medium/low risk analysis), Operational Runbook (daily/weekly/monthly ops, incident response with SLAs), Roadmap and Dependencies (v2.1, v2.2, v3.0 planning), Glossary (business/technical terms, entities, enumerations, status values). Enhanced existing sections with detailed tables, code examples, and cross-references. | BravoSUITE Documentation Team |
| 1.1.0 | 2026-01-08 | Added Gold Standard sections: Business Requirements (FR-GOAL-XX), Design Reference, Backend Controllers, Cross-Service Integration, Test Summary table, priority labels, Version History | Claude Code |
| 1.0.0 | 2025-12-23 | Initial comprehensive documentation with 16 sections, 38 test cases, complete domain model, API reference, and 23-permission system | BravoSUITE Documentation Team |

---
