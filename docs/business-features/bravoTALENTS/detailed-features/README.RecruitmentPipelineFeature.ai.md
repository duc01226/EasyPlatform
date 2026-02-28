# Recruitment Pipeline Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.RecruitmentPipelineFeature.md](./README.RecruitmentPipelineFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Services | Job.Service, Candidate.Service |
| Database | MongoDB |
| Schema | Job (MongoDB), Candidate (MongoDB) |

### File Locations

```
Entities:
├── Job.Domain/AggregatesModel/Job.cs
├── Candidate.Domain/AggregatesModel/Candidate.cs
├── Candidate.Domain/AggregatesModel/Application.cs
├── Candidate.Domain/AggregatesModel/InterviewSchedule.cs
├── Candidate.Domain/AggregatesModel/Offers/Offer.cs
└── Candidate.Domain/AggregatesModel/Pipeline.cs

Commands:
├── Job.Application/Job/Commands/CreateJobCommand/
├── Job.Application/ApplyPlatform/UseCaseCommands/UpdateJobStatusCommand.cs
├── Candidate.Application/ApplyPlatform/UseCaseCommands/CreateCandidateFromCvCommand.cs
├── Candidate.Application/ApplyPlatform/UseCaseCommands/MoveApplicationInPipelineCommand.cs
├── Candidate.Application/Candidates/Commands/AssignApplicationCommand/
├── Candidate.Application/Candidates/Commands/RejectApplicationCommand/
├── Candidate.Application/Interviews/Interviews/Commands/ScheduleInterview/
├── Candidate.Application/Interviews/Interviews/Commands/UpdateInterviewResult/
├── Candidate.Application/Offers/Commands/CreateOfferCommand/
└── Candidate.Application/Offers/Commands/UpdateOfferStatusCommand/

Controllers:
├── Job.Service/Controllers/JobController.cs
├── Candidate.Service/Controllers/CandidateController.cs
├── Candidate.Service/Controllers/InterviewController.cs
└── Candidate.Service/Controllers/OfferController.cs

Frontend:
├── src/Web/bravoTALENTSClient/src/app/jobs/
├── src/Web/bravoTALENTSClient/src/app/candidates/
├── src/Web/bravoTALENTSClient/src/app/interviews/
└── src/Web/bravoTALENTSClient/src/app/offers/
```

---

## Domain Model

### Entities

```
Job : RootEntity<Job, string>
├── Id: string (ULID)
├── Name: string
├── Status: JobStatus (Draft=1, Pending=2, Published=3, Closed=4, Completed=5)
├── Description: string (HTML)
├── JobType: JobType
├── PositionLevel: PositionLevel
├── Vacancies: int
├── LocationId: string
├── RequiredSkills: string[]
├── FromSalary, ToSalary: long?
├── CurrencyId: string
├── OrganizationalUnitId: string
├── Publications: List<JobPublication>
└── CreatedDate, ModifiedDate: DateTime

Candidate : RootEntity<Candidate, string>
├── Id: string (ULID)
├── FirstName, LastName: string
├── Email: string (unique per OrganizationalUnit)
├── PhoneNumber: string
├── DateOfBirth: DateTime?
├── Gender: Gender?
├── Address: Address
├── Applications: List<ApplicationEntity>
├── OwnedByUserIds: string[]
└── OrganizationalUnitId: string

ApplicationEntity : Entity<ApplicationEntity, string>
├── Id: string
├── JobId: string
├── AppliedDate: DateTime
├── CurrentPipelineStage: CurrentPipelineStage
├── PipelineStageHistories: List<PipelineStageHistory>
├── IsRejected: bool
├── RejectReason: string
├── CV: CV
├── Attachments: List<File>
└── AssignedHrId: string

Pipeline : Entity<Pipeline, string>
├── Id: string (ULID)
├── OrganizationalUnitId: string
└── Stages: IList<PipelineStage>

InterviewSchedule : RootEntity<InterviewSchedule, string>
├── Id: string (ULID)
├── CandidateId, ApplicationId, JobId: string
├── Subject, JobTitle: string
├── StartTime, EndTime: DateTime (UTC)
├── SentDate: DateTime?
├── CreatedByUserId, ModifiedByUserId: string
├── OrganizationalUnitId: string
├── Interviews: List<Interview>
├── ExternalCalendarEventInfo: ExternalCalendarEventInfo
└── InterviewPrepTemplateId: string

Offer : RootEntity<Offer, string>
├── Id: string (ULID)
├── CandidateId, ApplicationId, JobId: string
├── Position, ReportTo: string
├── Salary: decimal?
├── CurrencyId: string
├── Status: bool? (null=Pending, true=Accepted, false=Rejected)
├── StartDate, ExpirationDate, JoiningDate: DateTime
├── SentDate, CreatedDate, ModifiedDate: DateTime?
├── OrganizationalUnitId: string
└── Comment: string
```

### Value Objects

```
CurrentPipelineStage {
  PipelineId: string
  PipelineStageId: string
  PipelineStageName: string
  ModifiedDate: DateTime?
}

PipelineStageHistory {
  OrganizationalUnitId: string
  PipelineId: string
  PipelineStageId: string
  Name: string
  StageType: StageType
  ProcessDate: DateTime?
}

Interview {
  Id: string
  DurationInMinutes: int
  FromTime, ToTime: DateTime
  AssessmentType: string
  Interviewers: string[]
  Location: string
  Result: InterviewResult
  Comment: string
  TypeId: string
}
```

### Enums

```
StageType: Sourced(0) | New(1) | Lead(2) | Assessment(3) | Interviewing(4) | Shortlisted(5) | Offered(6) | Hired(7)

InterviewResult: NoResult(0) | Failed(1) | Passed(2)

JobStatus: Draft(1) | Pending(2) | Published(3) | Closed(4) | Completed(5)

Gender: Male | Female | Other | Unspecified

JobType: FullTime | PartTime | Contract | Temporary

PositionLevel: Intern | Junior | Mid | Senior | Lead | Manager | Director | Executive
```

### Key Static Expressions

```csharp
// Job uniqueness
public static Expression<Func<Job, bool>> OfCompanyExpr(string companyId)
    => j => j.OrganizationalUnitId == companyId;

// Candidate deduplication (email unique per org unit)
public static Expression<Func<Candidate, bool>> EmailExpr(string email, string orgUnitId)
    => c => c.Email == email && c.OrganizationalUnitId == orgUnitId;

// Published jobs accept applications
public static Expression<Func<Job, bool>> PublishedExpr()
    => j => j.Status == JobStatus.Published;
```

---

## API Contracts

### Job Commands

```
POST /api/Job
├── Request: { name, summary, description, jobType, vacancies, locationId, requiredSkills[], fromSalary, toSalary, currencyId }
├── Response: { id, name, status }
├── Handler: JobCreationCommandHandler
└── Evidence: Job.Application/Job/Commands/

PUT /api/Job/{id}
├── Request: { id, name, description, ... }
├── Handler: EditJobAdCommandHandler
└── Evidence: Job.Application/Job/Commands/

PUT /api/Job/{id}/status
├── Request: { id, status, ... }
├── Response: { id, previousStatus, newStatus }
├── Handler: UpdateJobStatusCommandHandler
├── Note: Status Draft → Published creates JobVersion backup (BR-02-002)
└── Evidence: Job.Application/ApplyPlatform/UseCaseCommands/UpdateJobStatusCommand.cs
```

### Candidate Commands

```
POST /api/Candidate
├── Request: { firstName, lastName, email, phoneNumber, dateOfBirth, ... }
├── Response: { id, firstName, lastName, email }
├── Handler: CreateCandidateCommandHandler
└── Evidence: Candidate.Application/Candidates/Commands/

POST /api/Candidate/upload-cv
├── Request: FormData with CV file
├── Response: { candidateId, name, email, skills[] }
├── Handler: CreateCandidateFromCvCommandHandler
├── Note: Auto-deduplicates by email (BR-03-002)
└── Evidence: Candidate.Application/ApplyPlatform/UseCaseCommands/CreateCandidateFromCvCommand.cs

POST /api/Application/assign
├── Request: { candidateId, jobId }
├── Response: { applicationId, candidateId, jobId, currentStage }
├── Handler: AssignApplicationCommandHandler
├── Note: Creates application in "New" stage
└── Evidence: Candidate.Application/Candidates/Commands/AssignApplicationCommand/

PUT /api/Application/move-stage
├── Request: { candidateId, applicationId, pipelineStageId, offerDate?, timeZone }
├── Response: { previousStage, currentStage }
├── Handler: MoveApplicationInPipelineCommandHandler
├── Critical: Offered → Hired publishes CandidateNewCandidateHiredEventBusMessage
└── Evidence: Candidate.Application/ApplyPlatform/UseCaseCommands/MoveApplicationInPipelineCommand.cs:140-156

PUT /api/Application/reject
├── Request: { applicationId, rejectReason, emailTemplate? }
├── Handler: RejectApplicationCommandHandler
└── Evidence: Candidate.Application/Candidates/Commands/RejectApplicationCommand/
```

### Interview Commands

```
POST /api/Interview
├── Request: { candidateId, applicationId, jobId, startTime, endTime, interviewers[], ... }
├── Response: { id, candidateId, startTime, endTime, interviews[] }
├── Handler: ScheduleInterviewCommandHandler
├── Validation: BR-04-001 (future time), BR-04-002 (no overlap), BR-04-003 (valid interviewers)
└── Evidence: Candidate.Application/Interviews/Interviews/Commands/ScheduleInterview/

PUT /api/Interview/{id}
├── Request: { id, startTime, endTime, interviewers[], ... }
├── Handler: UpdateInterviewScheduleCommandHandler
├── Validation: BR-04-004 (modifiable only before start)
└── Evidence: Candidate.Application/Interviews/Interviews/Commands/

PUT /api/Interview/{id}/result
├── Request: { interviewId, result, comment }
├── Handler: UpdateInterviewResultCommandHandler
└── Evidence: Candidate.Application/Interviews/Interviews/Commands/UpdateInterviewResult/
```

### Offer Commands

```
POST /api/Offer
├── Request: { candidateId, applicationId, jobId, position, reportTo, salary, startDate, expirationDate }
├── Response: { id, candidateId, position, salary, status }
├── Handler: CreateOfferCommandHandler
├── Validation: BR-05-001 (position & reportTo required), BR-05-002 (Shortlisted+ stage)
└── Evidence: Candidate.Application/Offers/Commands/CreateOfferCommand/

PUT /api/Offer/{id}/status
├── Request: { id, status, comment }
├── Response: { id, status, statusModifiedDate }
├── Handler: UpdateOfferStatusCommandHandler
├── Note: Acceptance triggers pipeline move to Offered stage
└── Evidence: Candidate.Application/Offers/Commands/UpdateOfferStatusCommand/
```

### DTOs

```csharp
Job.Domain public static Expression<Func<Job, bool>> OfCompanyExpr(string companyId)
    => j => j.OrganizationalUnitId == companyId;

CandidateDto : PlatformEntityDto<Candidate, string>
├── Id: string?
├── FirstName, LastName: string
├── Email: string
├── PhoneNumber: string
└── MapToEntity(): Candidate

ApplicationDto
├── Id: string?
├── JobId: string
├── CandidateId: string
├── AppliedDate: DateTime
├── CurrentStage: PipelineStageDto
└── History: List<PipelineStageHistoryDto>
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-01-001 | Pipeline stages must be sequential (no skipping) | `PipelineHelper.cs:11-34` |
| BR-01-002 | Rejected applications cannot move to new stages | `MoveApplicationInPipelineCommand.cs` |
| BR-01-003 | Pipeline history is append-only (audit compliance) | `PipelineStageHistory.cs` |
| BR-01-004 | Moving backward removes forward history | `PipelineHelper.AddPipelineStageToApplication()` |
| BR-02-001 | Only Draft/Pending jobs can be published | `UpdateJobStatusCommand.cs:Validate()` |
| BR-02-002 | Publishing creates immutable JobVersion backup | `UpdateJobStatusCommandHandler.cs` |
| BR-02-003 | Only Published jobs receive applications | `AssignApplicationCommand.cs:Validate()` |
| BR-02-004 | Closed jobs cannot be reopened to Published | `UpdateJobStatusCommand.cs:Validate()` |
| BR-03-001 | Email uniqueness per OrganizationalUnit | `Candidate.EmailExpr()` |
| BR-03-002 | CV upload deduplicates by email | `CreateCandidateFromCvCommand.cs` |
| BR-03-003 | Candidate can apply to multiple jobs | Schema design (List<Application>) |
| BR-03-004 | No duplicate applications to same job | `AssignApplicationCommand.cs:Validate()` |
| BR-04-001 | Interview start time must be future | `ScheduleInterviewCommand.cs:Validate()` |
| BR-04-002 | Interview rounds cannot overlap | `ScheduleInterviewCommand.cs:Validate()` |
| BR-04-003 | Interviewers must be valid users in OrgUnit | `ScheduleInterviewCommand.cs:Validate()` |
| BR-04-004 | Interview modifiable only before start time | `UpdateInterviewScheduleCommand.cs:Validate()` |
| BR-05-001 | Position and ReportTo required for offers | `CreateOfferCommand.cs:Validate()` |
| BR-05-002 | Offer only for Shortlisted+ stages | `CreateOfferCommand.cs:Validate()` |
| BR-05-003 | Accepted offer triggers pipeline move to Offered | `UpdateOfferStatusCommandHandler.cs` |
| BR-05-004 | Offer expiration after start date | `CreateOfferCommand.cs:Validate()` |
| BR-06-001 | Only Offered stage → Hired | `MoveApplicationInPipelineCommand.cs:Validate()` |
| BR-06-002 | Hire requires OfferDate set | `MoveApplicationInPipelineCommand.cs:140-156` |
| BR-06-003 | Hire publishes CandidateNewCandidateHiredEventBusMessage | `MoveApplicationInPipelineCommand.cs:140-156` |
| BR-06-004 | Hire enabled/disabled via isEnableConvertHiredCandidate config | `MoveApplicationInPipelineCommand.cs:140-156` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => JobId.IsNotNullOrEmpty(), "JobId required")
        .And(_ => CandidateId.IsNotNullOrEmpty(), "CandidateId required");

// Async validation in handler
await validation
    .AndAsync(r => repo.GetByIdAsync(r.CandidateId, ct).EnsureFoundAsync(), "Candidate not found")
    .AndNotAsync(r => repo.AnyAsync(ApplicationEntity.DuplicateExpr(r.JobId, r.CandidateId), ct), "Already applied");
```

---

## Service Boundaries

### Produces Events

```
CandidateNewCandidateHiredEventBusMessage ← Candidate.Service
├── Trigger: Offered → Hired stage transition
├── Payload: Candidate + Application + Offer data
├── Consumer: Employee.Service (creates employee record)
└── Location: Candidate.Application/ApplyPlatform/MessageBus/FreeFormatMessages/

JobSavedEventBusMessage ← Job.Service
├── Trigger: Job Create, Update, Status Change
├── Consumer: Candidate.Service (syncs job reference)
└── Idempotent: Yes (message deduplication)

InterviewScheduleSavedEventBusMessage ← Candidate.Service
├── Trigger: Schedule, Update, Cancel interview
└── Note: Used for async notifications

CandidateNewApplicationAddedEventBusMessage ← Candidate.Service
├── Trigger: New application created
└── Consumer: Notification service, Analytics
```

### Consumes Events

```
Job.Service consumes: (none - source of truth)

Candidate.Service consumes:
├── JobSavedEventBusMessage (sync job metadata)
└── From Job.Service via RabbitMQ

Employee.Service consumes:
├── CandidateNewCandidateHiredEventBusMessage
├── Action: Create employee record from candidate data
└── Idempotent: Yes (CandidateId deduplication)
```

### Data Sync Pattern

```
Job.Service (Source) ─publish──▶ [RabbitMQ]
   MongoDB: Job, JobVersion, JobAccessRight
                                      │
                                      ├─consume──▶ Candidate.Service (MongoDB)
                                      │
                                      └─consume──▶ Other services
```

---

## Critical Paths

### Job Creation Flow

```
1. Validate input
   ├── Name required (BR-*)
   └── Salary range valid if provided
2. Generate ID (if empty) → Ulid.NewUlid()
3. Create job with Status = Draft
4. Save via repository.CreateAsync()
5. Return JobDto
6. Publish JobSavedEventBusMessage
```

### Application Pipeline Movement

```
1. Load candidate + application
   └── Validate exists: EnsureFound()
2. Load pipeline + target stage
   └── Validate stage exists
3. Check business rules
   ├── BR-01-001: Sequential stages
   ├── BR-01-002: Cannot move rejected apps
   └── BR-02-003: Only to published jobs
4. Move stage via PipelineHelper.AddPipelineStageToApplication()
   ├── Update CurrentPipelineStage
   ├── Filter history (remove forward stages)
   └── Append new PipelineStageHistory
5. Check if Offered → Hired
   ├── BR-06-002: Require OfferDate
   ├── BR-06-004: Check isEnableConvertHiredCandidate config
   └── Publish CandidateNewCandidateHiredEventBusMessage
6. Save via repository.UpdateAsync()
```

### Interview Scheduling

```
1. Validate input
   ├── BR-04-001: StartTime must be future
   ├── BR-04-003: Interviewers valid in OrgUnit
   └── BR-04-002: Check for overlaps
2. Create InterviewSchedule with UTC times
3. Add Interview rounds with duration
4. Save via repository.CreateAsync()
5. Send calendar invites to interviewers + candidate
   └── Support Google Calendar + Outlook
6. Schedule reminder emails (24h, 1h before)
7. Publish InterviewScheduleSavedEventBusMessage
```

### Offer to Hire

```
1. Create Offer
   ├── BR-05-001: Position & ReportTo required
   ├── BR-05-002: Application must be Shortlisted+
   └── BR-05-004: ExpirationDate > StartDate
2. Save offer with Status = null (Pending)
3. Send email to candidate
4. Candidate accepts/rejects
5. UpdateOfferStatusCommand processes response
   ├── Sets Status = true/false
   └── If Accepted: Move application to Offered stage
6. HR moves to Hired via MoveApplicationInPipelineCommand
   ├── Triggers CandidateNewCandidateHiredEventBusMessage
   └── Employee.Service creates employee record
```

### Candidate Deduplication

```
1. CV Upload received
2. Query Candidate by Email + OrganizationalUnitId
   └── Use: Candidate.EmailExpr(email, orgUnitId)
3. If exists
   ├── Update candidate with CV data (merge)
   └── Add new Application if not duplicate (BR-03-004)
4. If not exists
   ├── Create new Candidate
   └── Create Application with Status = New
5. Return CandidateDto + Application info
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-RP-001 | Create job from template | Job created with status Draft |
| TC-RP-002 | Publish job | Status → Published, JobVersion created, JobSavedEvent published |
| TC-RP-003 | Assign candidate to published job | Application created with status New |
| TC-RP-004 | Move through pipeline sequentially | New → Lead → Assessment → ... → Offered |
| TC-RP-005 | Move Offered → Hired with config enabled | CandidateNewCandidateHiredEventBusMessage published, OfferDate set |
| TC-RP-006 | Schedule interview | InterviewSchedule created, calendar invites sent |
| TC-RP-007 | Create offer for Shortlisted+ | Offer created, email sent |
| TC-RP-008 | Accept offer | Status = true, triggers pipeline move to Offered |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Skip stage (New → Assessment) | Validation error (BR-01-001) | `PipelineHelper.cs` |
| Move rejected app | Validation error (BR-01-002) | `MoveApplicationInPipelineCommand.cs` |
| Duplicate CV email | Candidate merged, no duplicate created | `CreateCandidateFromCvCommand.cs` |
| Interview before publish | Validation error | `ScheduleInterviewCommand.cs:Validate()` |
| Offer without Position | Validation error (BR-05-001) | `CreateOfferCommand.cs:Validate()` |
| Hire without OfferDate | Skipped if config disabled (BR-06-004) | `MoveApplicationInPipelineCommand.cs:140-156` |
| Concurrent stage move | Last write wins | Repository optimistic concurrency |
| Out-of-order message | Skipped via LastMessageSyncDate | Consumer idempotency |

---

## Usage Notes

### When to Use This File

- Implementing pipeline movement features
- Adding job publishing logic
- Interview scheduling enhancements
- Offer management workflow
- Cross-service integration debugging
- Code review context

### When to Use Full Documentation

- Understanding business requirements
- Stakeholder communication
- Comprehensive test planning
- Troubleshooting production issues
- UI/UX flow design
- Performance optimization analysis

---

*Generated from comprehensive documentation. For full details, see [README.RecruitmentPipelineFeature.md](./README.RecruitmentPipelineFeature.md)*
