# Performance Review Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.PerformanceReviewFeature.md](./README.PerformanceReviewFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoGROWTH |
| Service | Growth.Service (MongoDB/SQL Server) |
| Database | MongoDB (primary), SQL Server (secondary) |
| Schema | PerformanceReview aggregate root |
| Full Docs | [README.PerformanceReviewFeature.md](./README.PerformanceReviewFeature.md) |

### File Locations

```
Domain Entities:
├── Root:        src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewEvent.cs
├── Assessment:  src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewAssessment.cs
├── Participant: src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewEventParticipantInfo.cs
└── Support:     src/Services/bravoGROWTH/Growth.Domain/Entities/PerformanceReview/PerformanceReviewCollaborator.cs

Commands:    src/Services/bravoGROWTH/Growth.Application/UseCaseCommands/PerformanceReview/
Queries:     src/Services/bravoGROWTH/Growth.Application/UseCaseQueries/PerformanceReviews/
Controller:  src/Services/bravoGROWTH/Growth.Service/Controllers/PerformanceReviewController.cs

Company UI: src/WebV2/apps/growth-for-company/src/app/routes/performance-reviews/
Employee UI: src/WebV2/apps/employee/src/app/routes/assessment-review/
Shared:     src/WebV2/apps/growth-for-company/src/app/shared/components/performance-reviews/
```

---

## Domain Model

### Entities

```
PerformanceReviewEvent : RootEntity<PerformanceReviewEvent, string>
├── Id: string (ULID)
├── CompanyId: string
├── Title: string
├── Status: PerformanceReviewStatus (Draft | Published | Active | Closed)
├── StartDate, EndDate: DateTime
├── SelfEvaluationDueDate, ManagerEvaluationDueDate, FinalEvaluationDueDate: DateTime?
├── Frequency: FrequencyTypes (OneTimeOnly | EveryOneMonth | EveryThreeMonths | etc.)
├── IsCalibration: bool (enables CalibrationEvaluation type)
├── AllowReviewerViewEmployeeSelfEvaluationImmediately: bool
├── AssessmentFormTemplateId, AssessmentTemplateId: string? (Internal OR External, not both)
├── PerformanceReviewCalendarId: string? (for recurring cycles)
├── Collaborators: ICollection<PerformanceReviewCollaborator>
├── Participants: ICollection<PerformanceReviewEventParticipantInfo>
└── Methods: Validate(), ValidateCanBeDeleted()

PerformanceReviewAssessment : RootEntity
├── Id: string (ULID)
├── PerformanceReviewEventId, EmployeeId, ReviewerId: string
├── Status: PerformanceReviewAssessmentStatus (NotStarted | Partial | InProgress | Completed)
├── Type: PerformanceReviewAssessmentTypes (SelfEvaluation | ManagerEvaluation | AdditionalEvaluation | CalibrationEvaluation | FinalEvaluation)
├── Results: List<PerformanceReviewAssessmentAnswer>
├── RetakeStatus: PerformanceReviewRetakeStatus (None | CanRetake | InProgress | Completed)
├── IsRetake, IsSkipped: bool
├── CompletedDate: DateTime?
├── Methods:
│   ├── CreateAssessmentsForEmployee()
│   ├── UpdateResults(answers, completedDate)
│   ├── HasSelfViewResultPermission()
│   └── ValidateHasViewPermission()
└── Questions: [Productivity, ForeignLanguages, Collaboration, LearningMindset, Openness, OverallAssessment]

PerformanceReviewEventParticipantInfo : RootEntity
├── Id: string (ULID)
├── EmployeeId, PerformanceReviewEventId: string
├── ReviewerId: string? (main reviewer)
├── Type: PerformanceReviewEventParticipantInfoTypes (Normal | Exception)
├── Employee: Employee?
├── Assessments: ICollection<PerformanceReviewAssessment>
└── AdditionalReviewers: ICollection<PrParticipantInfoAdditionalReviewer>

PerformanceReviewCollaborator
├── Id: string (Composite: {EventId}_{EmployeeId})
├── EmployeeId: string (HR admin)
├── PerformanceReviewEventId: string
└── Actions: List<CollaboratorPermissionAction> (ViewEvaluationResults | ExportEvaluationResults)

PerformanceReviewCalendar : RootEntity
├── Id: string (ULID)
├── CompanyId: string
├── Title, Frequency: FrequencyTypes
├── StartDate, EndDate: DateTime?
└── Status: PerformanceReviewStatus

PrParticipantInfoAdditionalReviewer
├── Id: string (ULID)
├── PerformanceReviewEventParticipantInfoId, AdditionalReviewerId: string
└── CreatedDate: DateTime

PerformanceReviewAssessmentAnswer
├── QuestionId: string (e.g., "productivity")
├── Answer: string (numeric 1-5)
└── Comment: string?
```

### Enums

```
PerformanceReviewStatus: Draft | Published | Active | Closed
PerformanceReviewAssessmentStatus: NotStarted | Partial | InProgress | Completed
PerformanceReviewAssessmentTypes: SelfEvaluation | ManagerEvaluation | FinalEvaluation | AdditionalEvaluation | CalibrationEvaluation
PerformanceReviewRetakeStatus: None | CanRetake | InProgress | Completed
PerformanceReviewEventParticipantInfoTypes: Normal | Exception
FrequencyTypes: OneTimeOnly | EveryOneMonth | EveryThreeMonths | EveryFourMonth | EverySixMonths | EveryYear
CollaboratorPermissionAction: ViewEvaluationResults | ExportEvaluationResults
```

### Key Expressions

```csharp
// Static question identifiers
PerformanceReviewAssessment.Questions.Productivity
PerformanceReviewAssessment.Questions.ForeignLanguages
PerformanceReviewAssessment.Questions.Collaboration
PerformanceReviewAssessment.Questions.LearningMindset
PerformanceReviewAssessment.Questions.Openness
PerformanceReviewAssessment.Questions.OverallAssessment
```

---

## API Contracts

### Commands

```
POST /api/PerformanceReview/save-performance-review-event
├── Request:  SavePerformanceReviewEventCommand { id?, title, startDate, endDate, selfEvaluationDueDate, managerEvaluationDueDate, finalEvaluationDueDate, frequency, isCalibration, assessmentFormTemplateId? }
├── Response: SavePerformanceReviewEventCommandResult { event: PerformanceReviewEventDto }
├── Handler:  SavePerformanceReviewEventCommandHandler.cs
└── Evidence: SavePerformanceReviewEventCommand.cs:14-186

POST /api/PerformanceReview/add-participant
├── Request:  AddParticipantIntoPerformanceReviewEventCommand { performanceReviewEventId, participants: [{ employeeId, reviewerId, additionalReviewerIds }] }
├── Response: AddParticipantIntoPerformanceReviewEventCommandResult { participantsAdded, assessmentsCreated }
├── Handler:  AddParticipantIntoPerformanceReviewEventCommandHandler.cs
└── Evidence: AddParticipantIntoPerformanceReviewEventCommand.cs:14-134

POST /api/PerformanceReview/answer-assessment
├── Request:  AnswerPerformanceReviewAssessmentCommand { assessmentId, answers: [{ questionId, answer, comment }], completedDate }
├── Response: AnswerPerformanceReviewAssessmentCommandResult { assessment: AssessmentDto }
├── Handler:  AnswerPerformanceReviewAssessmentCommandHandler.cs
└── Evidence: AnswerPerformanceReviewAssessmentCommand.cs

POST /api/PerformanceReview/answer-final-assessment
├── Request:  AnswerPerformanceReviewFinalAssessmentCommand { assessmentId, answers, completedDate }
├── Response: AnswerPerformanceReviewFinalAssessmentCommandResult
├── Handler:  AnswerPerformanceReviewFinalAssessmentCommandHandler.cs
└── Evidence: AnswerPerformanceReviewFinalAssessmentCommand.cs

POST /api/PerformanceReview/unlock-evaluation
├── Request:  UnlockPerformanceReviewEvaluationCommand { assessmentId }
├── Response: UnlockPerformanceReviewEvaluationCommandResult
├── Handler:  UnlockPerformanceReviewEvaluationCommandHandler.cs
└── Evidence: UnlockPerformanceReviewEvaluationCommand.cs:14-122

DELETE /api/PerformanceReview/delete-performance-review-event/{id}
├── Request:  DeletePerformanceReviewEventCommand { id }
├── Response: DeletePerformanceReviewEventCommandResult { success: bool }
├── Handler:  DeletePerformanceReviewEventCommandHandler.cs
└── Evidence: DeletePerformanceReviewEventCommand.cs:14-49

POST /api/PerformanceReview/change-reviewer
├── Request:  ChangeReviewerOfPerformanceReviewEventParticipantInfoCommand { participantInfoId, newReviewerId }
├── Response: Success/Error
└── Handler:  ChangeReviewerOfPerformanceReviewEventParticipantInfoCommandHandler.cs

POST /api/PerformanceReview/remove-participant
├── Request:  RemoveParticipantFromPerformanceReviewEventCommand { participantInfoId }
└── Handler:  RemoveParticipantFromPerformanceReviewEventCommandHandler.cs
```

### Queries

```
GET /api/PerformanceReview/get-performance-review-event/{id}
├── Response: GetPerformanceReviewEventQueryResult { event: PerformanceReviewEventDto }
├── Handler:  GetPerformanceReviewEventQueryHandler.cs
└── Evidence: GetPerformanceReviewEventQuery.cs:14-82

GET /api/PerformanceReview/get-employee-assessments
├── Query Params: eventId?, status?
├── Response: GetEmployeeAssessmentsQueryResult { assessments: [{ id, eventTitle, type, status, dueDate, canView, canEdit }] }
├── Handler:  GetEmployeePerformanceReviewAssessmentsQueryHandler.cs
└── Evidence: GetEmployeePerformanceReviewAssessmentsQuery.cs:14-125

GET /api/PerformanceReview/get-manager-assessments
├── Response: Manager's team assessments with direct reports
├── Handler:  GetManagerPerformanceReviewAssessmentsQueryHandler.cs
└── Evidence: GetManagerPerformanceReviewAssessmentsQuery.cs

GET /api/PerformanceReview/get-assessment-detail/{id}
├── Query Params: includeSelfEval?
├── Response: GetAssessmentDetailQueryResult { assessment, selfEvaluation? }
├── Handler:  GetPerformanceReviewAssessmentDetailQueryHandler.cs
└── Evidence: GetPerformanceReviewAssessmentDetailQuery.cs:14-187

POST /api/PerformanceReview/export
├── Request:  ExportPerformanceReviewQuery { eventId, exportType, filters }
├── Response: File stream (XLSX)
├── Handler:  ExportPerformanceReviewQueryHandler.cs
└── Evidence: ExportPerformanceReviewQuery.cs
```

### DTOs

```
PerformanceReviewEventDto : PlatformEntityDto<PerformanceReviewEvent, string>
├── Id: string?
├── Title: string
├── Status: string
├── StartDate, EndDate: DateTime
├── ParticipantsCount, CompletedCount: int
└── MapToEntity(): PerformanceReviewEvent

PerformanceReviewAssessmentDto
├── Id: string
├── Type: string
├── Status: string
├── Results: List<PerformanceReviewAssessmentAnswerDto>
└── CompletedDate: DateTime?

PerformanceReviewAssessmentAnswerDto
├── QuestionId: string
├── Answer: string
└── Comment: string?

ExportPerformanceReviewQuery
├── ExportType: ExportType (EvaluationResults | EvaluationsStatuses)
└── Response: XLSX byte array
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-PR-01 | Status transition strict: Draft→Published→Active→Closed (only Upcoming can delete) | `PerformanceReviewEvent.ValidateCanBeDeleted:108-113` |
| BR-PR-02 | Participants type: Normal (Draft/Published) OR Exception (Active) | `PerformanceReviewEventParticipantInfo.Type` enum |
| BR-PR-03 | Due date hierarchy: SelfEvalDate < ManagerEvalDate < FinalEvalDate | `SavePerformanceReviewEventCommand.Validate:45-67` |
| BR-PR-04 | Manager eval: viewable only if AllowReviewerViewEmployeeSelfEvaluationImmediately=true OR self-eval completed | `PerformanceReviewAssessment.ValidateHasViewPermission:299-360` |
| BR-PR-05 | Retake unlock: Only Completed assessments, cannot unlock if dependent assessment already completed | `UnlockPerformanceReviewEvaluationCommand.ValidateRequestAsync:87-122` |
| BR-PR-06 | Assessment questions: Productivity, ForeignLanguages, Collaboration, LearningMindset, Openness, OverallAssessment (all 1-5 rating) | `PerformanceReviewAssessment.Questions:483-491` |
| BR-PR-07 | Collaborator permissions: ViewEvaluationResults OR ExportEvaluationResults (granular access) | `PerformanceReviewCollaborator.Actions` property |
| BR-PR-08 | Self-view permission: Self-eval always viewable, Manager/Final viewable after completion | `PerformanceReviewAssessment.HasSelfViewResultPermission:282-297` |
| BR-PR-09 | Template exclusivity: Use Internal (AssessmentFormTemplateId) XOR External (AssessmentTemplateId), NOT both | `SavePerformanceReviewEventCommand` handler logic |
| BR-PR-10 | Frequency vs Calendar: OneTimeOnly has no calendar; Recurring creates/links PerformanceReviewCalendar | `PerformanceReviewEvent.Frequency` relationship |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Title.IsNotNullOrEmpty(), "Title required")
        .And(_ => StartDate < EndDate, "Invalid date range")
        .And(_ => SelfEvaluationDueDate < ManagerEvaluationDueDate, "Due date sequence");

// Async validation (handler)
await validation
    .AndAsync(r => repo.GetByIdAsync(r.Id, ct).EnsureFoundAsync(), "Event not found")
    .AndNotAsync(r => HasDependentAssessments(r.AssessmentId, ct), "Cannot unlock: dependent assessment completed");
```

---

## Service Boundaries

### Produces Events

```
PerformanceReviewEventEntityEventBusMessage → [Growth, Employee, Candidate]
├── Producer: PerformanceReviewEventEntityEventBusMessageProducer.cs (auto-generated)
├── Triggers: Create, Update, Delete on PerformanceReviewEvent
├── Payload: PerformanceReviewEventEntityEventBusMessagePayload
└── Consumption: Sync review cycles across services

PerformanceReviewAssessmentEntityEventBusMessage → [Growth, Employee, Candidate]
├── Triggers: Create, Update, Delete on PerformanceReviewAssessment
└── Payload: Assessment state changes
```

### Consumes Events

```
ExternalEntityEventBusMessage ← ExternalService
├── Consumer: Upsert{ExternalEntity}Consumer.cs (pattern)
├── Action: Sync external data (e.g., employee updates)
└── Idempotent: Yes (LastMessageSyncDate check)
```

### Cross-Service Data Flow

```
Growth.Service ──publish──▶ [RabbitMQ] ──consume──▶ Employee.Service (SQL Server)
(MongoDB)                                        ──consume──▶ Candidate.Service (MongoDB)
                                                 ──consume──▶ Other services
```

### Integration Points

- **Survey Service**: External assessment template queries (if using external templates)
- **Form Service**: Internal form template management
- **File Storage**: Guideline document uploads/downloads
- **Message Bus**: Cross-service event synchronization

---

## Critical Paths

### Create Performance Review Event

```
1. Validate input (BR-PR-01, BR-PR-03)
   ├── Title required
   ├── StartDate < EndDate
   └── Due date sequence: Self < Manager < Final
2. Check deletability constraints (if updating existing)
3. Generate ID if new → Ulid.NewUlid()
4. Create PerformanceReviewEvent with Status=Draft
5. If Frequency != OneTimeOnly: Create/link PerformanceReviewCalendar
6. Save via repository.CreateOrUpdateAsync()
7. Platform auto-publishes entity event → Consumers sync
```

### Add Participants & Auto-Generate Assessments

```
1. Load event by ID → validate event exists (not deleted)
2. For each participant:
   ├── Validate employee exists in company
   ├── Create PerformanceReviewEventParticipantInfo (Type = Normal or Exception)
   ├── Call PerformanceReviewAssessment.CreateAssessmentsForEmployee()
   │   ├── Generate SelfEvaluation (NotStarted)
   │   ├── Generate ManagerEvaluation (NotStarted)
   │   ├── If IsCalibration: Generate CalibrationEvaluation (NotStarted)
   │   ├── Generate additional reviewer assessments (NotStarted)
   │   └── Generate FinalEvaluation (NotStarted)
   └── Persist all assessments
3. Save via repository.CreateManyAsync(assessments)
4. Publish event → Consumers sync participant data
```

### Complete Assessment Workflow

```
1. Load assessment by ID → validate exists
2. Validate permission (BR-PR-04, BR-PR-08)
   ├── If self-eval: Only assessed employee
   ├── If manager-eval: Check AllowReviewerViewEmployeeSelfEvaluationImmediately
   └── If final-eval: Validate prior assessments completed
3. Call assessment.UpdateResults(answers, completedDate)
4. Set Status = Completed, RetakeStatus = None
5. Save via repository.UpdateAsync(assessment)
6. Publish event → Final eval becomes available
```

### Unlock & Retake Assessment

```
1. Load assessment → validate Status == Completed
2. Validate no dependent assessment already completed (BR-PR-05)
   └── Cannot unlock if Final evaluation already submitted
3. Set RetakeStatus = CanRetake, IsRetake = true
4. Save → Assessment available for re-completion
5. On re-submission: RetakeStatus = InProgress → Completed
```

### Export Results

```
1. Load event by ID → validate access (HRM, Admin, or Collaborator)
2. Get filtered participants/assessments per export type
3. If ExportType=EvaluationResults:
   ├── Create sheets: Overview, Ratings, Comments
   └── Include self, manager, final scores
4. If ExportType=EvaluationsStatuses:
   ├── Create sheets: Completion Status, Pending Items
   └── Include progress per participant
5. Generate XLSX file → Download
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-PR-001 | Create event with valid data | Event created, status=Draft, calendar created if recurring |
| TC-PR-002 | Create event with invalid date sequence | Returns validation error BR-PR-03 |
| TC-PR-003 | Add participant to event | Participant added, 5 assessments auto-generated (self, manager, additional, calibration if enabled, final) |
| TC-PR-004 | Complete self-evaluation | Assessment status=Completed, CompletedDate set, event published |
| TC-PR-005 | Manager views employee's self-eval | Allowed if AllowReviewerViewEmployeeSelfEvaluationImmediately=true OR self-eval completed |
| TC-PR-006 | Complete manager evaluation | Assessment status=Completed, final evaluation becomes accessible |
| TC-PR-007 | Unlock assessment for retake | RetakeStatus=CanRetake, IsRetake=true, can resubmit |
| TC-PR-008 | Unlock fails: dependent assessment completed | Returns validation error BR-PR-05 |
| TC-PR-009 | Export evaluation results | XLSX generated with all scores and comments |
| TC-PR-010 | Delete event: Draft only | Success; Delete event: Active → Error |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Empty title | Validation error: "Title required" | `SavePerformanceReviewEventCommand.cs:Validate()` |
| Due date not between Start/End | Validation error: "Date outside period" | `SavePerformanceReviewEventCommand.Validate()` |
| Remove participant with completed assessment | Error: "Cannot remove" | `RemoveParticipantFromPerformanceReviewEventCommand` |
| Out-of-order event status transition | Error: "Invalid status" | `PerformanceReviewStatus` state machine |
| Both internal+external templates set | Error: "Template exclusivity" | `SavePerformanceReviewEventCommand` logic |
| Concurrent assessment submissions | Last write wins / optimistic lock | `repository.UpdateAsync()` behavior |
| Calendar recurring event generation | Auto-create PerformanceReviewCalendar | `SavePerformanceReviewEventCommand` handler |

---

## Usage Notes

### When to Use This File

- Implementing new assessment workflows or event management features
- Fixing bugs related to validation, retake logic, or permission checks
- Understanding entity relationships and data flow quickly
- Code review context for performance review changes

### When to Use Full Documentation

- Understanding business requirements and stakeholder context
- Comprehensive test planning and scenario coverage
- Troubleshooting production issues and performance analysis
- Understanding UI flows and user interactions

---

## Quick Implementation Checklist

When adding features to Performance Review:

- [ ] Use `IGrowthRootRepository<PerformanceReviewEvent>` for data access
- [ ] Implement fluent validation with `PlatformValidationResult` API
- [ ] Add entity event handlers in `UseCaseEvents/PerformanceReview/`
- [ ] Publish events via auto-generated `PerformanceReviewEventEntityEventBusMessageProducer`
- [ ] Apply `[PlatformAuthorize]` with HRM, PerformanceReviewAdmin roles
- [ ] Use assessment type enums: SelfEvaluation, ManagerEvaluation, FinalEvaluation, AdditionalEvaluation, CalibrationEvaluation
- [ ] Validate permission with `PerformanceReviewAssessment.ValidateHasViewPermission()`
- [ ] Check assessment.Status and RetakeStatus state machine consistency
- [ ] Test cross-service event consumption with `LastMessageSyncDate` idempotency

---

*Generated from comprehensive documentation. For full details, see [README.PerformanceReviewFeature.md](./README.PerformanceReviewFeature.md)*
