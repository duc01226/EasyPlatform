# Timesheet Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.TimesheetFeature.md](./README.TimesheetFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoGROWTH |
| Services | Growth.Service (SQL Server), Growth.Persistence (EF Core) |
| Database | SQL Server with PostgreSQL support |
| Feature Code | TS-LM-001 |
| Status | Production |

### File Locations

```
Entities:    src/Services/bravoGROWTH/Growth.Domain/Entities/TimeManagement/
Commands:    src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/TimeManagement/
Queries:     src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/TimeManagement/
Controllers: src/Services/bravoGROWTH/Growth.Service/Controllers/TimeSheetController.cs
             src/Services/bravoGROWTH/Growth.Service/Controllers/LeaveRequestController.cs
Events:      src/Services/bravoGROWTH/Growth.Application/UseCaseEvents/TimeManagement/
BackgroundJobs: src/Services/bravoGROWTH/Growth.Application/BackgroundJobs/TimeManagement/
Frontend:    src/WebV2/apps/growth-for-company/src/app/timesheet/
             src/WebV2/apps/employee/src/app/time-and-leave/
API Service: src/WebV2/libs/bravo-domain/src/growth/api-services/
```

---

## Domain Model

### Entities

```
TimeSheetRequest : RootEntity<TimeSheetRequest, string>
├── Id: string (ULID)
├── UserId: string (Employee)
├── EmployeeId: string
├── CompanyId: string
├── LogDate: DateTime
├── LogTimes: List<TimeOnly>
├── Status: RequestStatus (New|Approved|Rejected|Abandon)
├── ApproverId: string
├── ApprovedBy: string
├── RejectedBy: string
├── Reason: string
├── RejectReasons: List<string>
├── Attachments: Dictionary
├── WatcherIds: List<string>
├── TimeZone: string (default: UTC)
└── CreatedDate/LastUpdatedDate: DateTime

LeaveRequest : RootEntity<LeaveRequest, string>
├── Id: string (ULID)
├── UserId: string (Employee)
├── EmployeeId: string
├── CompanyId: string
├── FromDate: DateTime
├── ToDate: DateTime
├── TotalDays: double
├── RequestTypeId: string
├── Status: RequestStatus
├── ApproverId: string (Assigned approver)
├── ApprovedBy: string
├── RejectedBy: string
├── RejectReasons: List<string>
├── Reason: string
├── CancelReason: string
├── TakenLeaveDaysInfo: TakenLeaveDaysInfo
├── BackupPersonIds: List<string>
├── WatcherIds: List<string>
├── StatusChangedBy: RequestStatusChangedBy? (User vs System)
├── AutoApprovalProcessResult: AutoApprovalProcessResult? (Processed/Failed)
├── MoreInfoMailText: string
├── TimeZone: string
├── Attachments: Dictionary
└── CreatedDate/LastUpdatedDate: DateTime

TimeSheetCycle : RootEntity<TimeSheetCycle, string>
├── Id: string (ULID)
├── CompanyId: string
├── StartDate: DateTime
├── EndDate: DateTime
├── IsBlocked: bool (Locks submissions)
├── LockReminderEmailSentCount: int
├── VerifyReminderEmailSentCount: int
└── HasScheduleAutoLockCycle: bool

TimeLog : RootEntity<TimeLog, string>
├── Id: string (ULID)
├── EmployeeId: string
├── LogDate: DateTime
├── CheckIn: TimeOnly
├── CheckOut: TimeOnly
├── LogDetails: List<TimeLogDetail>
└── TimeLogRequests: List<TimeLogRequest> (Link to Leave/Timesheet)

TimeSheetSetting : RootEntity<TimeSheetSetting, string>
├── Id: string (ULID)
├── CompanyId: string
├── CycleSetting: CycleSetting
├── Reminders: List<Reminder>
├── Notification: Notification
├── AutoLock: AutoLock
├── TimeZone: string
└── FeatureActivated: bool
```

### Value Objects

```
RequestStatus : Enum
├── New = 0
├── Approved = 1
├── Rejected = 2
└── Abandon = 3

AutoApprovalProcessResult : Enum
├── NotProcess = 0
└── Processed = 1

RequestStatusChangedBy : Enum
├── User = 0
└── System = 1

TakenLeaveDaysInfo {
  CarryOver: double          // From carryover
  Current: double            // From current cycle
  PreviousCycle: double      // From previous cycle
  MilestoneAward: double     // From seniority awards
}

CycleSetting {
  Type: string               // "Monthly"
  StartDay: int              // 1-31
  BalanceResetType: string   // "Monthly", "Yearly"
}

AutoLock {
  IsEnable: bool             // = true
  SendAfterDays: int         // = 2 (lock after N days)
  LockTime: TimeOnly
  LastCheckToTriggerLockTimeSheetCycle: DateTime?
}

Reminder {
  Type: string               // "Lock", "Verify"
  SendBefore: int            // Days before lock
  NotifyTo: List<string>     // User IDs
}

Notification {
  IsNotifyWhenUnlock: bool
  IsNotifyWhenLock: bool
  NotifyUserIds: List<string>
}
```

### Key Expressions

```csharp
// Company filter
public static Expression<Func<TimeSheetRequest, bool>> OfCompanyExpr(string companyId)
    => r => r.CompanyId == companyId;

public static Expression<Func<LeaveRequest, bool>> OfCompanyExpr(string companyId)
    => l => l.CompanyId == companyId;

// Status filter
public static Expression<Func<LeaveRequest, bool>> WithStatusExpr(RequestStatus status)
    => l => l.Status == status;

// Date range
public static Expression<Func<LeaveRequest, bool>> InDateRangeExpr(DateTime from, DateTime to)
    => l => l.FromDate >= from && l.ToDate <= to;
```

---

## API Contracts

### TimeSheet Controller Commands

```
POST /api/TimeSheet/toggle-time-sheet-cycle
├── Request:  { cycleId, isBlocked }
├── Response: NoContent
├── Handler:  ToggleTimeSheetCycleCommand
└── Evidence: ToggleTimeSheetCycleCommand.cs

POST /api/TimeSheet/add-time-log-for-employee
├── Request:  { employeeId, logDate, checkIn, checkOut, details[] }
├── Response: AddTimeLogCommandResult { id, logId }
├── Handler:  AddTimeLogToEmployeeCommand
└── Evidence: AddTimeLogToEmployeeCommand.cs

POST /api/TimeSheet/save-setting
├── Request:  { companyId, cycleSetting, reminders[], autoLock, timezone }
├── Response: SaveTimeSheetSettingCommandResult { setting }
├── Handler:  SaveTimeSheetSettingCommand
└── Evidence: SaveTimeSheetSettingCommand.cs

POST /api/TimeSheet/export-file
├── Request:  { companyId, fromDate, toDate, employeeIds[] }
├── Response: Excel file blob (Blob)
├── Handler:  ExportTimeSheetQuery
└── Evidence: ExportTimeSheetQuery.cs

POST /api/TimeSheet/import-from-file
├── Request:  FormData { file: IFormFile }
├── Response: BulkImportTimeSheetCommandResult { importedCount, failedCount }
├── Handler:  BulkImportTimeSheetCommand
└── Evidence: BulkImportTimeSheetCommand.cs
```

### TimeSheet Controller Queries

```
GET /api/TimeSheet/time-sheet-cycle
├── Query:    PlatformPagedQueryDto
├── Response: List<TimeSheetCycleDto>
├── Handler:  GetTimeSheetCycleListQuery
└── Evidence: GetTimeSheetCycleListQuery.cs

POST /api/TimeSheet/ (GetEmployeeWithTimeLogsList)
├── Query:    { companyId, skipCount?, maxResultCount?, searchText? }
├── Response: PaginatedResult<EmployeeWithTimeLogsDto>
├── Handler:  GetEmployeeWithTimeLogsListQuery
└── Evidence: GetEmployeeWithTimeLogsListQuery.cs

GET /api/TimeSheet/validate/check-time-sheet-cycle-blocked
├── Query:    { date }
├── Response: CheckTimeSheetCycleBlockedQueryResult { isBlocked }
├── Handler:  CheckTimeSheetCycleBlockedQuery
└── Evidence: CheckTimeSheetCycleBlockedQuery.cs

GET /api/TimeSheet/get-locking-timesheet-cycle-status
├── Query:    { fromDate, toDate }
├── Response: Dictionary<DateTime, bool> (date -> isBlocked)
├── Handler:  GetLockingTimeSheetCycleStatusQuery
└── Evidence: GetLockingTimeSheetCycleStatusQuery.cs

GET /api/TimeSheet/get-setting-of-current-company
├── Response: TimeSheetSettingDto
├── Handler:  GetTimeSheetSettingOfCurrentCompanyQuery
└── Evidence: GetTimeSheetSettingOfCurrentCompanyQuery.cs
```

### LeaveRequest Controller Commands

```
POST /api/LeaveRequest/
├── Request:  { id?, userId, fromDate, toDate, requestTypeId, reason, approverId, attachments[] }
├── Response: SaveLeaveRequestCommandResult { entity: LeaveRequestDto }
├── Handler:  SaveLeaveRequestCommand
└── Evidence: SaveLeaveRequestCommand.cs

POST /api/LeaveRequest/change-status
├── Request:  { id, status, reason? }
├── Response: ChangeLeaveRequestStatusCommandResult { entity }
├── Handler:  ChangeLeaveRequestStatusCommand
└── Evidence: ChangeLeaveRequestStatusCommand.cs

POST /api/LeaveRequest/export-file
├── Request:  { fromDate?, toDate?, statusList[] }
├── Response: Excel file blob
├── Handler:  ExportLeaveRequestsQuery
└── Evidence: ExportLeaveRequestsQuery.cs
```

### LeaveRequest Controller Queries

```
GET /api/LeaveRequest/
├── Query:    { companyId, skipCount?, maxResultCount? }
├── Response: GetLeaveRequestListQueryResult { items[], totalCount }
├── Handler:  GetLeaveRequestListQuery
└── Evidence: GetLeaveRequestListQuery.cs

GET /api/LeaveRequest/for-employee
├── Query:    { skipCount?, maxResultCount?, status? }
├── Response: PaginatedResult<LeaveRequestDto>
├── Handler:  GetLeaveRequestListForEmployeeQuery
└── Evidence: GetLeaveRequestListForEmployeeQuery.cs

GET /api/LeaveRequest/detail
├── Query:    { id }
├── Response: LeaveRequestDto
├── Handler:  GetLeaveRequestQuery
└── Evidence: GetLeaveRequestQuery.cs

GET /api/LeaveRequest/validate/check-overlap
├── Query:    { fromDate, toDate, requestTypeId, excludeId? }
├── Response: CheckOverlapLeaveRequestQueryResult { hasOverlap, conflicts[] }
├── Handler:  CheckOverlapLeaveRequestQuery
└── Evidence: CheckOverlapLeaveRequestQuery.cs

GET /api/LeaveRequest/calculate-total-date
├── Query:    { fromDate, toDate, requestTypeId }
├── Response: GetValidRequestDatesTotalResult { totalDays, workDays }
├── Handler:  GetValidRequestDatesTotalQuery
└── Evidence: GetValidRequestDatesTotalQuery.cs

GET /api/LeaveRequest/latest-request-watcher-backup
├── Response: GetLatestLeaveRequestWatcherAndBackupInfoQueryInfoResult { watchers[], backupPersons[] }
├── Handler:  GetLatestLeaveRequestWatcherAndBackupInfoQuery
└── Evidence: GetLatestLeaveRequestWatcherAndBackupInfoQuery.cs
```

### DTOs

```
TimeSheetRequestDto : PlatformEntityDto<TimeSheetRequest, string>
├── Id: string?
├── UserId: string
├── EmployeeId: string
├── LogDate: DateTime
├── LogTimes: List<string>
├── Status: RequestStatus
├── ApproverId: string
├── ApprovedBy: string
├── Reason: string
└── MapToEntity(): TimeSheetRequest

LeaveRequestDto : PlatformEntityDto<LeaveRequest, string>
├── Id: string?
├── UserId: string
├── FromDate: DateTime
├── ToDate: DateTime
├── TotalDays: double
├── RequestTypeId: string
├── Status: RequestStatus
├── ApproverId: string
├── Reason: string
├── TakenLeaveDaysInfo: TakenLeaveDaysInfo
├── BackupPersonIds: List<string>
└── MapToEntity(): LeaveRequest

TimeSheetSettingDto : PlatformEntityDto<TimeSheetSetting, string>
├── Id: string?
├── CompanyId: string
├── CycleSetting: CycleSetting
├── Reminders: List<Reminder>
├── AutoLock: AutoLock
├── FeatureActivated: bool
└── MapToEntity(): TimeSheetSetting
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-TS-001 | Timesheet cycle must be active and not locked for submissions | `SaveTimeSheetRequestCommand.cs:Validate()` |
| BR-TS-002 | LogDate must be within active timesheet cycle date range | `TimeSheetRequest.ValidateCanBeSavedAsync()` |
| BR-TS-003 | No overlapping time logs (CheckIn < CheckOut) | `AddTimeLogToEmployeeCommand.cs` |
| BR-TS-004 | Timesheet cycle end date must be >= start date | `TimeSheetCycle.cs:Validate()` |
| BR-TS-005 | No overlapping timesheet cycles per company | `SaveTimeSheetCycleCommand.cs` |
| BR-LR-001 | FromDate must be <= ToDate | `SaveLeaveRequestCommand.cs:Validate()` |
| BR-LR-002 | Cannot overlap with existing approved/pending requests | `CheckOverlapLeaveRequestQuery.cs` |
| BR-LR-003 | Leave type (RequestType) must exist | `SaveLeaveRequestCommand.cs` |
| BR-LR-004 | Assigned approver must exist in company | `SaveLeaveRequestCommand.cs` |
| BR-LR-005 | Approver cannot be the requestor (self-approval blocked) | `SaveLeaveRequestCommand.cs` |
| BR-LR-006 | TotalDays calculated: (ToDate - FromDate + 1) * workDayFactor | `LeaveRequest.CalculateTotalDays()` |
| BR-LR-007 | Leave balance must be sufficient for approval | `ChangeLeaveRequestStatusCommand.cs` |
| BR-LR-008 | Cannot approve/reject already completed status | `ChangeLeaveRequestStatusCommand.cs` |
| BR-LR-009 | Auto-approval only if: Status=New, CreatedDate>=MaximumDay, sufficient balance | `AutoHandlePendingLeaveRequestsForApprovalProcessBackgroundJob.cs` |
| BR-LR-010 | Cycle locked → no new submissions allowed | `CheckTimeSheetCycleBlockedQuery.cs` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => FromDate.HasValue && ToDate.HasValue, "Date range required")
        .And(_ => FromDate <= ToDate, "Invalid date range")
        .And(_ => RequestTypeId.IsNotNullOrEmpty(), "Leave type required")
        .And(_ => ApproverId.IsNotNullOrEmpty(), "Approver required");

// Async validation in handler
await validation
    .AndAsync(r => repo.GetByIdAsync(r.RequestTypeId, ct).EnsureFoundAsync(), "Leave type not found")
    .AndNotAsync(r => repo.AnyAsync(LeaveRequest.DuplicateExpr(r.UserId, r.FromDate, r.ToDate), ct), "Overlapping request exists")
    .AndAsync(r => CheckApproverExistsAsync(r.ApproverId, ct), "Approver not found");
```

---

## Service Boundaries

### Produces Events

```
TimeSheetRequestCreatedEvent
├── Triggered: Employee submits timesheet request
├── Consumed by: NotificationService (email to approver)
└── Publisher: TimeSheetRequest entity

TimeSheetRequestStatusChangedEvent
├── Triggered: Manager approves/rejects timesheet
├── Consumed by: NotificationService, LeaveBalanceService
└── Publisher: TimeSheetRequest entity

LeaveRequestCreatedEvent
├── Triggered: Employee creates leave request
├── Consumed by: NotificationService (email to approver), AuditService
└── Publisher: LeaveRequest entity

LeaveRequestStatusChangedEvent
├── Triggered: Request approved/rejected/abandoned
├── Consumed by: NotificationService, EmployeeRemainingLeaveService
└── Publisher: LeaveRequest entity

TimeSheetCycleLockedEvent
├── Triggered: HR manager locks cycle
├── Consumed by: AutoApprovalBackgroundJob, NotificationService
└── Publisher: TimeSheetCycle entity

EmployeeRemainingLeaveUpdatedEvent
├── Triggered: Leave balance changes (approval/cancellation)
├── Consumed by: Dashboard, ReportingServices
└── Publisher: EmployeeRemainingLeave entity
```

### Message Bus Integration

```
Growth.Service ──publish──▶ [RabbitMQ] ──consume──▶ Notification.Service
                                      ──consume──▶ Analytics.Service
                                      ──consume──▶ Payroll.Service (auto-approval)
```

### Background Jobs

```
AutoHandlePendingLeaveRequestsForApprovalProcessBackgroundJob
├── Schedule: Every 6 hours (0 */6 * * *)
├── Process: Auto-approve pending requests if MaximumDay elapsed + sufficient balance
├── Handler: ApproveLeaveRequestCommand (system actor)
└── Handler: UpdateEmployeeRemainingLeaveCommand

TimeSheetScheduleSendScheduleLockingReminderEmailBackgroundJobExecutor
├── Schedule: N days before cycle lock
├── Process: Send reminder emails to managers/employees
└── Updates: LockReminderEmailSentCount

TimeSheetScheduleSendScheduleVerificationReminderEmailBackgroundJobExecutor
├── Schedule: After cycle locked
├── Process: Send verification reminders
└── Updates: VerifyReminderEmailSentCount
```

---

## Critical Paths

### Create/Submit TimeSheet Request

```
1. Validate input
   ├── BR-TS-002: LogDate within active cycle
   └── BR-TS-001: Cycle not locked
2. Check cycle status
   ├── Query: GetTimeSheetCycleByDateQuery()
   └── Fail: CycleBlocked → 403 Forbidden
3. Generate ID → Ulid.NewUlid()
4. Create entity with Status=New, audit fields
5. Save via repository.CreateAsync()
6. Publish TimeSheetRequestCreatedEvent
   └── Handler: SendNotificationOnCreateTimeSheetEventHandler
       └── Email: Approver notification
7. Return: TimeSheetRequestDto
```

### Approve TimeSheet Request

```
1. Load existing → not found: EnsureFound()
2. Validate current status != Approved/Rejected
3. Validate approver authorization (User=RequestContext.UserId())
4. Update entity:
   ├── Status = Approved
   ├── ApprovedBy = RequestContext.UserId()
   ├── ApprovedDate = DateTime.UtcNow
   └── Clear RejectReasons
5. Save via repository.UpdateAsync()
6. Publish TimeSheetRequestStatusChangedEvent
   └── Handler: SendNotificationOnApproveTimeSheetEventHandler
       └── Email: Requester + watchers notification
7. Return: StatusChangedResult
```

### Create Leave Request

```
1. Validate input
   ├── BR-LR-001: FromDate <= ToDate
   ├── BR-LR-003: RequestType exists
   ├── BR-LR-004: Approver exists in company
   └── BR-LR-005: Approver != Requestor
2. Check overlap
   ├── Query: CheckOverlapLeaveRequestQuery(FromDate, ToDate, RequestTypeId)
   ├── Fail: HasOverlap → Return validation error
   └── Evidence: `CheckOverlapLeaveRequestQuery.cs`
3. Calculate TotalDays
   ├── Formula: (ToDate - FromDate + 1) * workDayFactor
   └── Method: LeaveRequest.CalculateTotalDays()
4. Generate ID → Ulid.NewUlid()
5. Create entity with:
   ├── Status = New
   ├── TotalDays = calculated
   ├── AutoApprovalProcessResult = null
   └── StatusChangedBy = null (user created)
6. Save via repository.CreateAsync()
7. Publish LeaveRequestCreatedEvent
   └── Handler: SendNotificationOnCreateLeaveRequestEventHandler
       └── Email: Approver notification + approval link
8. Return: SaveLeaveRequestCommandResult { Id, Status }
```

### Approve Leave Request with Balance Deduction

```
1. Load existing → not found: 404
2. Validate:
   ├── Status = New (cannot re-approve)
   ├── User authorization (approver or HR manager)
   └── BR-LR-007: Sufficient balance available
3. Deduct from EmployeeRemainingLeave
   ├── Query: GetEmployeeRemainingLeaveQuery()
   ├── Deduction breakdown (TakenLeaveDaysInfo):
   │   ├── CarryOver: deduct first
   │   ├── Current: deduct second
   │   ├── PreviousCycle: deduct third
   │   └── MilestoneAward: deduct last
   └── Update: EmployeeRemainingLeave.AvailableBalance -= TotalDays
4. Update LeaveRequest:
   ├── Status = Approved
   ├── ApprovedBy = RequestContext.UserId()
   ├── TakenLeaveDaysInfo = deduction breakdown
   └── StatusChangedBy = RequestStatusChangedBy.User
5. Save: repository.UpdateAsync()
6. Publish LeaveRequestStatusChangedEvent
   ├── Handler: SendNotificationOnApproveLeaveRequestEventHandler
   │   └── Email: Requester notification
   └── Handler: UpdateEmployeeRemainingLeaveEventHandler
       └── Sync balance to reporting
7. Return: ChangeLeaveRequestStatusCommandResult
```

### Auto-Approval Background Job (Every 6 Hours)

```
1. Query pending requests:
   ├── Status = New
   ├── CreatedDate >= MaximumDay ago (e.g., 2 days)
   └── AutoApprovalProcessResult IS NULL
2. For each request:
   ├── Check leave balance sufficient
   │   └── If insufficient: Skip, set AutoApprovalProcessResult=Failed
   ├── Call: ChangeLeaveRequestStatusCommand(Status=Approved, changedBy=System)
   ├── Deduct from balance (same as manual approval)
   ├── Set: AutoApprovalProcessResult = Processed
   └── Publish: LeaveRequestStatusChangedEvent
3. Publish summary event for logging
4. Send batch notification email to approved employees
5. Return: {Approved=123, Failed=5, Skipped=12}
```

### Lock TimeSheet Cycle

```
1. Load cycle → not found: 404
2. Validate: Only HrManager role
3. Update cycle:
   ├── IsBlocked = true
   └── HasScheduleAutoLockCycle = true
4. Save via repository.UpdateAsync()
5. Publish TimeSheetCycleLockedEvent
   ├── Handler: SendCycleLockNotificationEventHandler
   │   └── Email: All employees/managers
   └── Handler: TriggerAutoApprovalJobEventHandler
       └── Auto-approve pending requests if deadline passed
6. Query all pending requests for cycle
   ├── Find: TimeSheetRequest.Status=New & LogDate in cycle
   └── Auto-approve eligible ones
7. Return: NoContent (204)
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-TS-001 | Create timesheet request with valid cycle | Entity created, event published, approver notified |
| TC-TS-002 | Create when cycle locked | Returns BR-TS-001 validation error |
| TC-TS-003 | Create with LogDate outside cycle | Returns BR-TS-002 validation error |
| TC-TS-004 | Approve request as assigned approver | Status=Approved, approver notified |
| TC-TS-005 | Approve as non-approver | Returns 403 Forbidden |
| TC-LR-001 | Create leave request with valid data | Entity created, event published, approver notified |
| TC-LR-002 | Create with overlapping request | Returns BR-LR-002 validation error |
| TC-LR-003 | Create with invalid leave type | Returns BR-LR-003 validation error |
| TC-LR-004 | Approve with sufficient balance | Status=Approved, balance deducted, event published |
| TC-LR-005 | Approve with insufficient balance | Returns BR-LR-007 validation error |
| TC-LR-006 | Auto-approval background job | Processes eligible requests, deducts balance, notifies |
| TC-CY-001 | Lock cycle | IsBlocked=true, submissions blocked, auto-approval triggered |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Leave request fromDate = toDate (1 day) | TotalDays = 1 | `LeaveRequest.CalculateTotalDays()` |
| ToDate = fromDate + 7 (cross-weekend) | Deduct only workdays | `WorkdayCalculationService.cs` |
| Multiple overlapping requests same date | All return overlap error | `CheckOverlapLeaveRequestQuery.cs` |
| Approver is self | Validation error BR-LR-005 | `SaveLeaveRequestCommand.Validate()` |
| Balance becomes negative after approval | Reject approval BR-LR-007 | `ChangeLeaveRequestStatusCommand.cs` |
| Out-of-order event messages | Later timestamp processed | `Consumer:LastMessageSyncDate check` |
| Concurrent cycle lock attempts | Last-write-wins or optimistic lock | `TimeSheetCycle.Version` |
| Request created before cycle exists | BR-TS-002 fails on submission | `GetTimeSheetCycleByDateQuery()` |

---

## Usage Notes

### When to Use This File

- Implementing timesheet/leave management features
- Fixing bugs in timesheet request flow
- Understanding API contracts quickly
- Code review context for time management changes
- Debugging cross-service synchronization issues

### When to Use Full Documentation

- Understanding complete business requirements
- Stakeholder presentations and demos
- Comprehensive test planning
- Troubleshooting production incidents
- Understanding UI/UX flows and employee experience

---

*Generated from comprehensive documentation. For full details, see [README.TimesheetFeature.md](./README.TimesheetFeature.md)*
