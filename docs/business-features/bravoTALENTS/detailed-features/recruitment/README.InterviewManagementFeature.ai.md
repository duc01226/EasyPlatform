# Interview Management Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.InterviewManagementFeature.md](./README.InterviewManagementFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Service | Candidate.Service |
| Database | MongoDB (primary) |
| Schema | Interview aggregates (InterviewSchedule, Interview, InterviewType) |

### File Locations

```
Entities:    src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Interviews/
Commands:    src/Services/bravoTALENTS/Candidate.Application/UseCaseCommands/Interviews/
Queries:     src/Services/bravoTALENTS/Candidate.Application/UseCaseQueries/Interviews/
Controllers: src/Services/bravoTALENTS/Candidate.Service/Controllers/InterviewsController.cs
Frontend:    src/WebV2/apps/employee/src/app/**/interview-*/
```

---

## Domain Model

### Root Aggregate: InterviewSchedule

```csharp
InterviewSchedule : RootEntity<InterviewSchedule, string>
├── Id: string (ULID)
├── CandidateId: string
├── ApplicationId: string
├── JobId: string
├── JobTitle: string
├── Subject: string
├── StartTime: DateTime (UTC)
├── EndTime: DateTime (UTC)
├── SentDate: DateTime?
├── CreatedByUserId: string
├── ModifiedByUserId: string
├── OrganizationalUnitId: string
├── Interviews: List<Interview>
├── UpcomingReminderEmailSent: bool
├── DoneInterviewEmailSent: bool
├── InSecondsUtcTimeOffset: double (timezone)
├── ExternalCalendarEventInfo: ExternalCalendarEventInfo
├── InterviewPrepTemplateId: string
└── ApplicationExtId: string
```

### Interview Child Entity

```csharp
Interview {
  Id: string
  DurationInMinutes: int
  FromTime: DateTime (UTC)
  ToTime: DateTime (UTC)
  AssessmentType: string
  Interviewers: string[] (emails)
  Location: string
  Result: InterviewResult
  Comment: string
  TypeId: string
  Description: string
}
```

### Configuration Entities

```csharp
InterviewType {
  Id: string
  Name: string (Phone, Video, Panel, Behavioral, Technical)
}

InterviewEmailTemplate {
  Id: string
  Subject: string
  Body: string (with {{Placeholder}} syntax)
  Type: string (Interview, Cancel, Reminder)
  Attachments: List<Attachment>
}

InterviewPrepTemplate {
  Id: string
  Content: string
  JobId: string (optional)
}
```

### Value Objects

```csharp
ExternalCalendarEventInfo {
  EventId: string
  LinkUrl: string
  Provider: string (Outlook, Google, etc.)
}

ExternalCalendarIntegration {
  LocationName: string
  LocationEmail: string
  IsOnlineMeeting: bool
}

Interviewer (simple) {
  Email: string
}
```

### Enums

```csharp
InterviewResult: NoResult(0) | Failed(1) | Passed(2)
```

### Key Expressions

```csharp
// Company + organizational unit filter
public static Expression<Func<InterviewSchedule, bool>> OfCompanyExpr(string companyId)
    => s => s.OrganizationalUnitId == orgUnitId;

// Candidate filter
public static Expression<Func<InterviewSchedule, bool>> ByCandidateExpr(string candidateId)
    => s => s.CandidateId == candidateId;

// Date range filter
public static Expression<Func<InterviewSchedule, bool>> ByDateRangeExpr(DateTime from, DateTime to)
    => s => s.StartTime >= from && s.EndTime <= to;
```

---

## API Contracts

### Commands

```
POST /api/interviews/schedule-interview
├── Request:  ScheduleInterviewCommand { candidateId, applicationId, jobId, jobTitle,
│             fromTime, interviews[], isSentEmail, timeZone, sendToExternalCalendar }
├── Response: { id, candidateId, scheduleDate, interviews[], externalCalendarEventInfo }
├── Handler:  ScheduleInterviewCommandHandler.cs
└── Evidence: ScheduleInterviewCommand.cs, ScheduleInterviewCommandHandler.cs:68-100

PUT /api/interviews/{id}
├── Request:  UpdateInterviewScheduleCommand { id, jobTitle, fromTime, toTime,
│             interviews[], isSentEmail, timeZone }
├── Response: { id, success: bool, message }
├── Handler:  UpdateInterviewScheduleCommandHandler.cs
└── Evidence: InterviewsController.cs:82-87

DELETE /api/interviews/{id}
├── Handler:  CancelInterviewScheduleCommandHandler.cs
└── Evidence: InterviewsController.cs:89-93

POST /api/interviews/{id}/review
├── Request:  UpdateInterviewResultCommand { interviewId, result, comment }
├── Response: HTTP 200 OK
└── Evidence: InterviewsController.cs:103-107

POST /api/interviews/validate
├── Request:  ValidateInterviewScheduleQuery { candidateId, jobId, fromTime,
│             toTime, interviews[] }
├── Response: { isValid: bool, errors: string[] }
└── Evidence: InterviewsController.cs:95-100
```

### Queries

```
GET /api/interviews
├── Params:   candidateId?, jobId?, fromDate?, toDate?, skip, take
├── Response: { items: InterviewScheduleDto[], totalCount: int }
├── Handler:  GetInterviewSchedulesQuery
└── Evidence: InterviewsController.cs:58-62

GET /api/interviews/{id}
├── Response: { id, candidateId, applicationId, jobId, jobTitle, startTime, endTime,
│             interviews[], createdByUserId, createdDate }
├── Handler:  GetInterviewDetailQuery
└── Evidence: InterviewsController.cs:64-68

GET /api/interviews/interview-detail
├── Params:   interviewScheduleId, interviewId
├── Response: { interviewSchedule, interview, candidate, job }
└── Evidence: InterviewsController.cs:70-74

GET /api/interview-types
├── Response: List<InterviewTypeDto>
└── Evidence: InterviewTypesController.cs:20-24

GET /api/organizational-unit/interviewers/{organizationalUnitId}
├── Response: List<{ email: string }>
└── Evidence: OrganizationInterviewersController.cs:26-30

POST /api/organizational-unit/delete-interviewer/{organizationalUnitId}
├── Request:  { email: string }
├── Response: HTTP 200 OK
└── Evidence: OrganizationInterviewersController.cs:32-39

POST /api/interviews/get-meeting-rooms
├── Request:  { companyId, from, to, timeZone, timeZoneName }
├── Response: { meetingRooms: [{ id, name, capacity, availableSlots[] }] }
└── Evidence: InterviewsController.cs:109-123
```

### DTOs

```csharp
InterviewScheduleDto : PlatformEntityDto<InterviewSchedule, string>
├── Id: string?
├── CandidateId: string
├── ApplicationId: string
├── JobId: string
├── JobTitle: string
├── Subject: string
├── StartTime: DateTime
├── EndTime: DateTime
├── Interviews: List<InterviewDto>
├── ExternalCalendarEventInfo: ExternalCalendarEventInfoDto
└── MapToEntity(): InterviewSchedule

InterviewDto {
  Id: string
  DurationInMinutes: int
  FromTime: DateTime
  ToTime: DateTime
  AssessmentType: string
  Interviewers: string[]
  Location: string
  Result: int (InterviewResult enum)
  Comment: string
}
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-IM-001 | Schedule must contain >= 1 interview | `ScheduleInterviewCommand.cs:Validate()` |
| BR-IM-002 | StartTime < EndTime (schedule level) | `ErrorMessage.cs:35` |
| BR-IM-003 | Each interview requires >= 1 interviewer | `ErrorMessage.cs:33` - InterviewerRequired |
| BR-IM-004 | Users can only schedule within their org unit | `Authorization checks in handler` |
| BR-IM-05a | Interview results immutable after submission | `UpdateInterviewResultCommand.cs` validation |
| BR-IM-05b | Admin can override immutability (audit logged) | `UpdateInterviewResultCommand.cs` |
| BR-IM-06 | Calendar sync: ExternalCalendarEventInfo required if enabled | `ScheduleInterviewCommandHandler.cs:84-91` |
| BR-IM-07 | Email notifications sent immediately on schedule creation | `SendInterviewEmailNotificationBackgroundJobExecutor.cs` |
| BR-IM-08 | All times stored in UTC in database | `InterviewSchedule.cs` conversion logic |
| BR-IM-09 | Interviewers scoped to organizational unit | `GetInterviewersQuery.cs` filtering |
| BR-IM-10 | Schedules modifiable only until 1 hour before start | `UpdateInterviewScheduleCommandHandler.cs` business logic |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => CandidateId.IsNotNullOrEmpty(), "CandidateId required")
        .And(_ => JobId.IsNotNullOrEmpty(), "JobId required")
        .And(_ => StartTime < EndTime, "StartTime must be before EndTime")
        .And(_ => Interviews.Count > 0, "At least one interview required")
        .And(_ => Interviews.All(i => i.Interviewers?.Count > 0), "Each interview requires interviewers");

// Async validation in handler
await validation
    .AndAsync(r => candidateRepo.GetByIdAsync(r.CandidateId, ct).EnsureFoundAsync("Candidate not found"))
    .AndAsync(r => jobRepo.GetByIdAsync(r.JobId, ct).EnsureFoundAsync("Job not found"))
    .AndNotAsync(r => IsConflictingScheduleAsync(r, ct), "Interviewer conflict detected");
```

---

## Service Boundaries

### Produces Events

```
InterviewScheduleSavedEventBusMessage
├── Triggers: ScheduleInterviewCommand, UpdateInterviewScheduleCommand
├── Payload: { InterviewScheduleId, CandidateId, Action("Created"|"Updated"), CreatedDate }
├── Consumers:
│   ├── EmailNotificationConsumer → sends emails to candidate/interviewers
│   ├── ExternalCalendarConsumer → syncs to Outlook/Google Calendar
│   └── ActivityHistoryConsumer → records audit trail
└── Evidence: ScheduleInterviewCommandHandler.cs, message bus configuration

InterviewScheduleSavedCreatedHistoryActivityEventBusMessage
├── Triggers: After schedule creation/update
├── Payload: Activity audit data with before/after snapshots
└── Consumer: InterviewScheduleSavedCreatedHistoryActivityEventBusConsumer

EmailSendInterviewEmailToCandidateRequestBusMessage
├── Triggers: Schedule/update/cancel/reminder workflows
├── Payload: { CandidateEmail, Subject, Body, InterviewScheduleId, TemplateType }
└── Consumer: Email notification service
```

### Consumes Events (If Any)

```
Employee.Service events (cross-service sync)
├── Candidate creation/updates → validate InterviewSchedule.CandidateId
├── Job creation/updates → validate InterviewSchedule.JobId
└── Org unit changes → filter schedules by updated org unit
```

### Cross-Service Data Flow

```
Candidate.Service ──publish──▶ [RabbitMQ] ──consume──▶ NotificationService
                                          ──consume──▶ CalendarIntegrationService
                                          ──consume──▶ ActivityHistoryService
```

---

## Critical Paths

### Create Interview Schedule

```
1. Validate input (BR-IM-01 to BR-IM-04)
   ├── CandidateId, ApplicationId, JobId required
   ├── StartTime < EndTime (BR-IM-02)
   ├── >= 1 interview (BR-IM-01)
   ├── Each interview has >= 1 interviewer (BR-IM-03)
   └── User within org unit scope (BR-IM-04)
2. Check candidate exists → fail: return 404
3. Check job exists → fail: return 404
4. Generate schedule ID (ULID)
5. Create InterviewSchedule aggregate with Interviews child entities
6. Convert times to UTC (BR-IM-08)
7. Save via repository.CreateAsync()
8. Publish InterviewScheduleSavedEventBusMessage
   ├── Triggers email notifications (BR-IM-07)
   ├── Syncs to external calendar if enabled (BR-IM-06)
   └── Records activity history
9. Return ScheduleInterviewCommandResult with ID
```

### Update Interview Schedule

```
1. Load existing schedule → not found: throw
2. Validate changes
   ├── Time range still valid (BR-IM-02)
   ├── Interviewers still assigned (BR-IM-03)
   └── Not within 1 hour of start time (BR-IM-10)
3. Update InterviewSchedule properties
4. Update Interview child entities
5. Save via repository.UpdateAsync()
6. Publish InterviewScheduleSavedEventBusMessage (Action="Updated")
7. Return success response
```

### Cancel Interview Schedule

```
1. Load schedule by ID → not found: 404
2. Check authorization: user owns schedule or admin
3. Delete via repository.DeleteAsync()
4. Publish cancellation event → consumers handle cleanup
   ├── Send cancellation emails
   ├── Release calendar event
   └── Record history entry
5. Return 200 OK
```

### Submit Interview Feedback (Result)

```
1. Load schedule and interview → not found: 404
2. Validate result value in InterviewResult enum (0, 1, or 2)
3. Check immutability (BR-IM-05a)
   ├── If already has result: warn user, require admin confirmation
   └── Else: proceed
4. Update interview.Result and interview.Comment
5. Save schedule → publishes update event
6. Return success
```

### Validate Interview Schedule (Pre-submission)

```
1. Accept ScheduleInterviewCommand or UpdateInterviewScheduleCommand
2. Run all validation rules (BR-IM-01 to BR-IM-10)
3. Check for interviewer conflicts (same person double-booked)
4. Check meeting room availability if specified
5. Return { isValid: bool, errors: string[] }
6. Frontend shows validation errors before submission
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-IM-001 | Create with valid data | Schedule + interviews created, event published |
| TC-IM-002 | Invalid time range (start >= end) | Returns error: StartTimeMustBeEarlierThanEndTime |
| TC-IM-003 | Missing required fields | Returns specific validation errors |
| TC-IM-004 | Update existing schedule | Interviews modified, event published |
| TC-IM-005 | Cancel schedule | Deleted, cancellation event published |
| TC-IM-006 | Get list with filters | Paginated, sorted by date desc |
| TC-IM-007 | Get detail by ID | Complete schedule data returned |
| TC-IM-008 | Validate pre-submission | Reports conflicts/errors |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Missing interviewer email | Validation error: InterviewerRequired | `ErrorMessage.cs:33` |
| Candidate not found | Validation error: CandidateNotFound | `CandidateNotFound` check |
| Job not found | Validation error: JobNotFound | `JobNotFound` check |
| Past date scheduling | Should be allowed (backend doesn't restrict) | No past-date validation |
| Timezone conversion (EST to UTC) | Times stored as UTC offset seconds | `InSecondsUtcTimeOffset` field |
| Interview result immutability | Warn if changing result, require admin | `BR-IM-05` logic |
| Interviewer double-booking | Pre-validation check recommended | Not enforced at entity level |
| Empty description field | Allowed (nullable string) | `Description` optional |

### P1 Additional Tests

| Scenario | Test |
|----------|------|
| Calendar sync enabled | ExternalCalendarEventInfo populated |
| Calendar sync disabled | ExternalCalendarEventInfo null |
| Email notification flag false | No emails sent to interviewers |
| Multiple interviews in schedule | All interviews saved with correct times |
| Update within 1-hour window | Returns warning/blocked | BR-IM-10 |
| Admin override immutability | Records audit entry | Admin flow |

---

## Implementation Patterns

### Create Command Pattern

```csharp
public sealed class ScheduleInterviewCommand : PlatformCqrsCommand<ScheduleInterviewCommandResult>
{
    public string CandidateId { get; set; } = "";
    public string ApplicationId { get; set; } = "";
    public string JobId { get; set; } = "";
    public string JobTitle { get; set; } = "";
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public List<InterviewInput> Interviews { get; set; } = [];
    public bool IsSentEmail { get; set; }
    public double TimeZone { get; set; }
    public bool SendToExternalCalendar { get; set; }
    public InterviewEmailTemplate? InterviewEmail { get; set; }
    public ExternalCalendarIntegration? ExternalCalendarIntegration { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(_ => CandidateId.IsNotNullOrEmpty(), "CandidateId required")
            .And(_ => JobId.IsNotNullOrEmpty(), "JobId required")
            .And(_ => StartTime < EndTime, "StartTime must be before EndTime")
            .And(_ => Interviews.Count > 0, "At least one interview required")
            .And(_ => Interviews.All(i => i.Interviewers?.Count > 0), "Interviewers required");
}

public sealed class ScheduleInterviewCommandResult : PlatformCqrsCommandResult
{
    public InterviewScheduleDto Schedule { get; set; } = null!;
}

internal sealed class ScheduleInterviewCommandHandler :
    PlatformCqrsCommandApplicationHandler<ScheduleInterviewCommand, ScheduleInterviewCommandResult>
{
    protected override async Task<ScheduleInterviewCommandResult> HandleAsync(
        ScheduleInterviewCommand req, CancellationToken ct)
    {
        // Validate candidate exists
        var candidate = await candidateRepo.GetByIdAsync(req.CandidateId, ct)
            .EnsureFound($"Candidate not found: {req.CandidateId}");

        // Validate job exists
        var job = await jobRepo.GetByIdAsync(req.JobId, ct)
            .EnsureFound($"Job not found: {req.JobId}");

        // Create aggregate
        var schedule = new InterviewSchedule
        {
            Id = Ulid.NewUlid().ToString(),
            CandidateId = req.CandidateId,
            ApplicationId = req.ApplicationId,
            JobId = req.JobId,
            JobTitle = req.JobTitle,
            Subject = $"Interview - {req.JobTitle}",
            StartTime = req.StartTime,
            EndTime = req.EndTime,
            CreatedByUserId = RequestContext.UserId(),
            OrganizationalUnitId = RequestContext.CurrentOrgUnit(),
            InSecondsUtcTimeOffset = req.TimeZone * 3600, // Convert minutes to seconds
            Interviews = req.Interviews.Select(i => new Interview
            {
                Id = Ulid.NewUlid().ToString(),
                DurationInMinutes = i.DurationInMinutes,
                FromTime = i.FromTime,
                ToTime = i.ToTime,
                AssessmentType = i.AssessmentType,
                Interviewers = i.Interviewers?.ToArray() ?? Array.Empty<string>(),
                Location = i.Location,
                TypeId = i.TypeId,
                Description = i.Description
            }).ToList()
        };

        // Optional: sync to external calendar
        if (req.SendToExternalCalendar && req.ExternalCalendarIntegration != null)
        {
            var calendarResult = await externalCalendarService.CreateEventAsync(
                schedule, req.ExternalCalendarIntegration, ct);
            schedule.ExternalCalendarEventInfo = calendarResult;
        }

        // Save to repository
        await repository.CreateAsync(schedule, ct);

        return new ScheduleInterviewCommandResult
        {
            Schedule = new InterviewScheduleDto(schedule)
        };
    }
}
```

### Query Pattern

```csharp
public sealed class GetInterviewSchedulesQuery :
    PlatformCqrsPagedQuery<GetInterviewSchedulesQueryResult, InterviewScheduleDto>
{
    public string? CandidateId { get; set; }
    public string? JobId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

internal sealed class GetInterviewSchedulesQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetInterviewSchedulesQuery, GetInterviewSchedulesQueryResult>
{
    protected override async Task<GetInterviewSchedulesQueryResult> HandleAsync(
        GetInterviewSchedulesQuery req, CancellationToken ct)
    {
        var qb = repository.GetQueryBuilder((uow, q) => q
            .Where(s => s.OrganizationalUnitId == RequestContext.CurrentOrgUnit())
            .WhereIf(req.CandidateId.IsNotNullOrEmpty(), s => s.CandidateId == req.CandidateId)
            .WhereIf(req.JobId.IsNotNullOrEmpty(), s => s.JobId == req.JobId)
            .WhereIf(req.FromDate.HasValue, s => s.StartTime >= req.FromDate)
            .WhereIf(req.ToDate.HasValue, s => s.EndTime <= req.ToDate));

        var (total, items) = await (
            repository.CountAsync((uow, q) => qb(uow, q), ct),
            repository.GetAllAsync(
                (uow, q) => qb(uow, q)
                    .OrderByDescending(s => s.StartTime)
                    .PageBy(req.SkipCount, req.MaxResultCount), ct)
        );

        return new GetInterviewSchedulesQueryResult(items, total, req);
    }
}
```

---

## Usage Notes

### When to Use This File

- Implementing new interview features or APIs
- Fixing bugs in scheduling or validation
- Understanding data flow and command/query structure
- Code generation for new handlers or components
- Understanding test requirements and validation rules

### When to Use Full Documentation

- Business requirements deep dive
- Stakeholder presentations and process flows
- Comprehensive regression testing planning
- Troubleshooting production issues
- Understanding UI/UX workflows

---

*Generated from comprehensive documentation. For full details, see [README.InterviewManagementFeature.md](./README.InterviewManagementFeature.md)*
