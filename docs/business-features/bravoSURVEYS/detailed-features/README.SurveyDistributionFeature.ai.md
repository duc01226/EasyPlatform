# Survey Distribution Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.SurveyDistributionFeature.md](./README.SurveyDistributionFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoSURVEYS |
| Services | LearningPlatform.Service (MongoDB) |
| Database | MongoDB |
| Domain | Survey Design (Distributions) |
| Full Docs | [README.SurveyDistributionFeature.md](./README.SurveyDistributionFeature.md) |

### File Locations

```
Entities:    src/Services/bravoSURVEYS/LearningPlatform.Domain/Entities/SurveyDesign/Distributions/
Commands:    src/Services/bravoSURVEYS/LearningPlatform.Application/
Queries:     src/Services/bravoSURVEYS/LearningPlatform.Application/ApplyPlatform/UseCaseQueries/
Controllers: src/Services/bravoSURVEYS/LearningPlatform/Controllers/Surveys/Distributions/DistributionController.cs
Background:  src/Services/bravoSURVEYS/LearningPlatform.Application/ApplyPlatform/BackgroundJobs/
Frontend:    src/Web/bravoSURVEYSClient/src/app/survey-distributions/
```

---

## Domain Model

### Entities

```
Distribution : RootEntity (Abstract)
├── Id: string (ULID)
├── Name: string
├── Status: DistributionStatus (Open | Closed | Scheduled)
├── SurveyId: string
├── UserId: string
├── Respondents: List<Respondent>
├── Invitations: int (counter)
├── InProgressRespondentsCount: int
├── CompletedRespondentsCount: int
├── ScheduledActivationTimeUtc: DateTime?
├── ScheduledActiveDistributionJobId: string? (Hangfire job ID)
└── SurveyDistributionScheduleId: string?

EmailDistribution : Distribution
├── Subject: string
├── Message: string
├── SenderName: string
├── ReplyToEmail: string
└── DistributionSchedule: SurveyDistributionSchedule? (cloned)

SmsDistribution : Distribution
└── SMS provider configuration

Respondent : RootEntity
├── Id: long
├── DistributionId: string
├── SurveyId: string
├── EmailAddress: string [TrackFieldUpdatedDomainEvent]
├── PhoneNumber: string [TrackFieldUpdatedDomainEvent]
├── ResponseStatus: string (NotTaken | InProgress | Completed)
├── Started: DateTimeOffset? [TrackFieldUpdatedDomainEvent]
├── Completed: DateTimeOffset? [TrackFieldUpdatedDomainEvent]
├── LastModified: DateTimeOffset [LastUpdatedDateAuditField]
├── LastTimeSent: DateTimeOffset?
├── NumberSent: int
├── IsDeleted: bool [TrackFieldUpdatedDomainEvent]
└── Credential: string (anonymous survey token)

DistributionCommunicationHistory
├── Id: string
├── DistributionId: string
├── EmailType: RespondentEmailType (0=Invitation, 1=Reminder, 2=ThankYou)
├── Subject: string
├── Message: string
├── SentCount: int
├── CreatedDate: DateTime
├── CreatedByUserId: string
└── Recipients: List<DistributionCommunicationRecipient>

SurveyDistributionSchedule
├── Id: string
├── SurveyId: string
├── DistributionName: string (template)
├── DefaultRecipients: List<DistributionRecipient>
├── MessageTemplate: DistributionMessageTemplate
├── ReminderConfigs: List<ReminderScheduleConfig>?
└── IsIncludeSubDepartments: bool
```

### Enums

```
DistributionStatus: Open | Closed | Scheduled
ResponseStatus: NotTaken | InProgress | Completed | Custom | All
RespondentEmailType: Invitation=0 | Reminder=1 | ThankYou=2
```

### Key Expressions

```csharp
// Status checks
public bool IsDistributed() => Status != DistributionStatus.Scheduled;
public void MarkCountersAsZeroIfScheduled() => if (Status == Scheduled) { Invitations = 0; ... }

// Permission validation
public static bool HasReadWritePermission(User user, Survey survey, PermissionType perm)
    => perm == PermissionType.Write || user.Role == "SurveyAdmin";

// Respondent eligibility for reminders
// IF ResponseStatus == "Completed" THEN exclude
// IF IsDeleted == true THEN exclude
// IF LastModified >= (now - notModifiedWithinDays) THEN exclude (recently active)
```

---

## API Contracts

### Commands (Creation & Mutations)

```
POST /api/surveys/{surveyId}/distributions/add-email
├── Request:  { name, recipients[], subject, message, senderName, replyToEmail,
│              scheduledActivationTimeUtc?, distributionSchedule?, reminderConfigs[] }
├── Response: { id, status, invitations, inProgressRespondentsCount, completedRespondentsCount }
├── Handler:  DistributionAppService.AddDistribution()
└── Evidence: DistributionController.cs:64-77

POST /api/surveys/{surveyId}/distributions/add-sms
├── Request:  { name, recipients[], message }
└── Handler:  DistributionAppService.AddDistribution() SMS branch

POST /api/surveys/{surveyId}/distributions/{distributionId}/email-reminder
├── Request:  { notModifiedWithinDays, subject, message, senderName, replyToEmail }
├── Response: List<Respondent> sent to
└── Handler:  DistributionAppService.EmailReminder()

POST /api/surveys/{surveyId}/distributions/{distributionId}/sms-reminder
├── Request:  { notModifiedWithinDays, messageTemplate }
└── Handler:  DistributionAppService.SmsReminder()

POST /api/surveys/{surveyId}/distributions/{distributionId}/email-thank-you
├── Request:  EmailDistribution object
└── Handler:  DistributionAppService.EmailThankYou()

POST /api/surveys/{surveyId}/distributions/{distributionId}/sms-thank-you
├── Request:  { messageTemplate }
└── Handler:  DistributionAppService.SmsThankYou()

PUT /api/surveys/{surveyId}/distributions/{distributionId}/close
├── Response: { distributionId, status: "Closed" }
└── Handler:  DistributionAppService.Close()

PUT /api/surveys/{surveyId}/distributions/{distributionId}/reopen
├── Response: { distributionId, status: "Open" }
└── Handler:  DistributionAppService.Reopen()

DELETE /api/surveys/{surveyId}/distributions/{distributionId}
└── Handler:  DistributionAppService.Delete() (cascade)

POST /api/surveys/{surveyId}/distributions/{distributionId}/delete-respondents
├── Request:  { respondentIds[] }
└── Handler:  RespondentAppService.DeleteRespondents()

POST /api/surveys/{surveyId}/distributions/{distributionId}/export-respondents
├── Request:  { responseStatuses[], language? }
├── Response: CSV (Content-Type: text/csv)
└── Handler:  RespondentAppService.GetExportedRespondentsDataAsString()
```

### Queries (Read-Only)

```
GET /api/surveys/{surveyId}/distributions
├── Query:   GetDistributionListQuery
└── Handler: DistributionAppService.GetShallowDistributionWithCountedIndexes()

GET /api/surveys/{surveyId}/distributions/{distributionId}
└── Handler: DistributionAppService.GetDistributionDetail()

GET /api/surveys/{surveyId}/distributions/{distributionId}/detail
├── Query:   { initialRespondentsCount, respondentStatuses[] }
└── Response: DistributionDetailDto with paginated respondents

GET /api/surveys/{surveyId}/distributions/{distributionId}/responses-stats
├── Response: { total, notTaken, inProgress, completed }
└── Evidence: DistributionController.cs:133-144

GET /api/surveys/{surveyId}/distributions/{distributionId}/invitation-statistics
├── Response: { totalSent, delivered, bounced, opened, clicked }
└── Evidence: DistributionController.cs:336-342

GET /api/surveys/{surveyId}/distributions/{distributionId}/sendable-reminder-respondents-count
├── Query:   { daysCountFromModifiedToConsiderAsRemindable }
└── Response: count (int)

GET /api/surveys/{surveyId}/distributions/{distributionId}/sendable-thankyou-respondents-count
└── Response: count (int)

GET /api/surveys/{surveyId}/distributions/{distributionId}/communication-history
├── Query:   GetDistributionCommunicationHistoryQuery
└── Response: List<DistributionCommunicationHistoryDto>

GET /api/surveys/{surveyId}/communication-recipients
├── Query:   GetDistributionCommunicationRecipientsQuery (paginated)
└── Response: { items[], totalCount }
```

### DTOs

```typescript
export interface Distribution {
  id: string;
  name: string;
  status: DistributionStatus;
  surveyId: string;
  created: Date;
  invitations: number;
  inProgressRespondentsCount: number;
  completedRespondentsCount: number;
}

export interface EmailDistribution extends Distribution {
  subject: string;
  message: string;
  senderName: string;
  replyToEmail: string;
  distributionSchedule: SurveyDistributionSchedule | null;
  reminderConfigs: ReminderScheduleConfig[];
}

export interface Respondent {
  id: number;
  distributionId: string;
  emailAddress: string;
  responseStatus: ResponseStatus;
  lastModified: Date;
  lastTimeSent: Date | null;
  numberSent: int;
  isDeleted: bool;
}
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-DI-001 | Distribution status state machine: null→(Scheduled OR Open) \| Scheduled+time→Open \| Open→Closed \| Closed→Open | `DistributionStatus.cs`, `DistributionController.cs:344-372` |
| BR-DI-002 | Reminders exclude: Completed status, IsDeleted=true, LastModified recent | `DistributionAppService.EmailReminder()` |
| BR-DI-003 | Scheduled distributions show zero counters until activated | `Distribution.MarkCountersAsZeroIfScheduled()`, `Distribution.cs:82-85` |
| BR-DI-004 | Delete cascades: Respondents, CommunicationHistory, Recipients, Reminders, Hangfire job | `DistributionAppService.Delete()`, `DistributionController.cs:374-382` |
| BR-DI-005 | Survey deletion cascades to all distributions | `DeleteDistributionAndReminderOnDeleteSurvey.cs` |
| BR-DI-006 | Permissions: Write for create/update/delete/remind, Read for view/export, SurveyAdmin bypasses | `Distribution.HasReadWritePermission()`, `DistributionController.cs:425-431` |
| BR-DI-007 | Respondent soft delete: IsDeleted=true, decrement Invitations counter | `RespondentAppService.DeleteRespondents()` |
| BR-DI-008 | Thank you messages: recipients WHERE ResponseStatus="Completed" AND IsDeleted=false | `DistributionAppService.EmailThankYou()`, `DistributionController.cs:206-230` |
| BR-DI-009 | Communication history audit: Create record per communication + per recipient with delivery status | `DistributionCommunicationHistory.cs` |
| BR-DI-010 | Hangfire idempotency: Skip if ScheduledActiveDistributionJobId already set | `ScheduledDistributionActivationScannerBackgroundJobExecutor.cs` |
| BR-DI-011 | Recipient validation: Min 1 recipient, RFC 5322 email, E.164 phone, org unit/user exists | `DistributionRecipient.cs`, `Respondent.CreateRespondentByUserInfos()` |
| BR-DI-012 | Export filter: IsDeleted=false + optional ResponseStatus filter + Language filter | `RespondentAppService.GetExportedRespondentsDataAsString()`, `DistributionController.cs:166-184` |
| BR-DI-013 | Scheduled time: Must be future UTC, ISO 8601 format, cron syntax if recurring | `EmailDistribution.UpdateScheduledActivationTime()` |
| BR-DI-014 | Reopen constraints: Status must be Closed (not Open/Scheduled), user has Write permission | `DistributionAppService.Reopen()`, `DistributionController.cs:359-372` |
| BR-DI-015 | Schedule cloning: Clone SurveyDistributionSchedule into EmailDistribution.DistributionSchedule | `EmailDistribution.DistributionSchedule` |
| BR-DI-016 | Close preserves in-progress: Blocks new respondents, allows existing to complete | `DistributionAppService.Close()`, `DistributionController.cs:344-357` |

### Validation Patterns

```csharp
// Command validation - required fields
if (recipients == null || recipients.Count == 0) return ValidationError("At least 1 recipient");
if (string.IsNullOrEmpty(subject)) return ValidationError("Subject required");
if (string.IsNullOrEmpty(message)) return ValidationError("Message required");

// Permission check
if (!user.HasRole("SurveyAdmin") && !user.HasWritePermissionOnSurvey(surveyId))
    return Forbidden();

// Async validation - recipient existence
foreach (var recipient in request.Recipients) {
    if (recipient.OrgUnitId != null && !await accountsService.OrgUnitExists(recipient.OrgUnitId, ct))
        return ValidationError($"Org unit {recipient.OrgUnitId} not found");
}

// Scheduled activation time validation
if (request.ScheduledActivationTimeUtc.HasValue && request.ScheduledActivationTimeUtc <= DateTime.UtcNow)
    return ValidationError("Activation time must be in the future");
```

---

## Service Boundaries

### Produces Events

```
Distribution Entity Events (Create/Update/Delete) → [Message Bus]
├── Producer: Auto-generated via Platform base class
├── Triggers: DistributionAppService.AddDistribution(), UpdateEmailDistribution(), Delete()
└── Subscribers: Entity event handlers for audit, cascade operations
```

### Consumes Events

```
Survey Entity Event (Deleted) ← bravoSURVEYS Service
├── Consumer: DeleteDistributionAndReminderOnDeleteSurvey (entity event handler)
├── Action: Query all Distributions WHERE SurveyId = deletedSurveyId
├── Cascade: Apply BR-DI-004 to each (delete respondents, history, reminders, jobs)
└── Idempotent: Runs once per survey delete
```

### Cross-Service Integration

```
bravoSURVEYS.DistributionService
    ├── → Accounts.Service (GetMatchedOrgUnitsAndUsersQuery, user/orgunit validation)
    ├── → Notification.Service (SendEmailAsync, SendSmsAsync)
    ├── → Hangfire (ScheduleRecurringJob, BackgroundJob.Delete)
    └── ← Message Bus (Survey.Deleted event)
```

### Hangfire Background Jobs

```
1. ScheduledDistributionActivationScannerBackgroundJobExecutor
   ├── Triggers: Daily or on-demand
   ├── Logic: Find Scheduled WHERE ScheduledActivationTimeUtc <= now
   ├── Action: Change status→Open, create respondents, send invitations, clear job ID
   └── Idempotency: Clear ScheduledActiveDistributionJobId after execution

2. SendDistributionReminderBackgroundJobExecutor
   ├── Called by: DistributionReminderScannerBackgroundJobExecutor
   ├── Logic: Filter respondents not modified within N days, send reminders
   └── Logging: Create DistributionCommunicationHistory record

3. DistributionReminderScannerBackgroundJobExecutor
   ├── Triggers: Daily
   ├── Logic: Find Open distributions with ReminderConfigs
   ├── Check: If reminder schedule next execution is due
   └── Action: Schedule SendDistributionReminderBackgroundJobExecutor

4. ActiveDistributionAndSendInvitationForSurveyScheduleBackgroundJobExecutor
   ├── Triggers: Per SurveyDistributionSchedule
   ├── Logic: Create new EmailDistribution from schedule
   └── Action: Send invitations immediately
```

---

## Critical Paths

### Create Email Distribution (Immediate)

```
1. User submits form → Controller validates
   └── BR-DI-006: Check Write permission on survey
   └── BR-DI-011: Validate recipients (min 1, email format, org unit exists)

2. Validate business data
   └── Survey exists
   └── Email template complete (subject, message, sender, reply-to)

3. Create EmailDistribution entity
   └── IF scheduledActivationTimeUtc IS NULL:
       ├── Status = Open
       └── Send invitations immediately
   └── ELSE:
       ├── Status = Scheduled
       ├── Create Hangfire recurring job
       ├── Store ScheduledActiveDistributionJobId
       └── BR-DI-003: Set counters to zero

4. Create Respondent entities
   └── FOR each recipient: CreateRespondentByUserInfos() factory method
   └── Generate credential token for anonymous surveys
   └── Set ResponseStatus = "NotTaken"

5. Create DistributionCommunicationHistory
   └── EmailType = Invitation
   └── SentCount = respondent count
   └── Create DistributionCommunicationRecipient per recipient

6. Publish Distribution entity event (Create)
   └── Event handlers subscribe for audit/logging

7. Return response
   └── API returns Distribution with counters
   └── BR-DI-003: If Scheduled, counters already zeroed
```

### Send Reminder to Non-Respondents

```
1. User clicks "Send Reminder" or background job fires
   └── Validate distribution Status = Open (BR-DI-002)

2. Filter eligible respondents
   └── ResponseStatus != "Completed"
   └── IsDeleted = false
   └── LastModified < (now - notModifiedWithinDays)

3. Send reminder emails/SMS
   └── For each recipient, call notification service
   └── Create DistributionCommunicationRecipient record with delivery status

4. Update respondent counters
   └── Respondent.NumberSent++
   └── Respondent.LastTimeSent = now

5. Create DistributionCommunicationHistory
   └── EmailType = Reminder
   └── SentCount = eligible respondent count

6. Return response
   └── API returns list of respondents sent to
   └── UI shows success message with count
```

### Delete Distribution (Cascade)

```
1. User clicks "Delete" or survey is deleted
   └── BR-DI-006: Validate Write permission

2. Begin transaction

3. Delete cascade (BR-DI-004)
   └── Query all Respondent WHERE DistributionId = id
   └── Delete all DistributionCommunicationRecipient (via FK)
   └── Delete all DistributionCommunicationHistory
   └── Delete all DistributionReminder
   └── IF ScheduledActiveDistributionJobId IS NOT NULL:
       └── BackgroundJob.Delete(jobId) (Hangfire)
   └── Delete Distribution

4. Commit transaction
   └── All-or-nothing: rollback if any step fails

5. Publish Distribution entity event (Delete)

6. Return response
   └── API returns 200 OK
   └── UI redirects to distribution list
```

### Close Distribution (Stop Accepting Responses)

```
1. User clicks "Close" in distribution detail
   └── Validate Status = Open (BR-DI-016)
   └── BR-DI-006: Check Write permission

2. Update Distribution.Status = Closed
   └── Update Distribution.Modified = now

3. Persist to database

4. Publish event (Update)

5. Response
   └── API returns { distributionId, status: "Closed" }
   └── Survey respondents see "closed" error on GET /survey
   └── In-progress respondents can still complete
```

### Reopen Distribution

```
1. User clicks "Reopen" on closed distribution
   └── Validate Status = Closed (BR-DI-014)
   └── BR-DI-006: Check Write permission

2. Update Distribution.Status = Open
   └── Update Distribution.Modified = now

3. Optionally reschedule reminder jobs if ReminderConfigs exist

4. Publish event (Update)

5. Response
   └── API returns { distributionId, status: "Open" }
   └── Survey respondents can resume taking survey
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation |
|----|------|------------|
| TC-DI-001 | Create immediate email distribution | Distribution created, Status=Open, Respondents created, CommunicationHistory logged, counters > 0 |
| TC-DI-002 | Create scheduled email distribution | Status=Scheduled, counters=0, Hangfire job scheduled, ScheduledActiveDistributionJobId stored |
| TC-DI-003 | Send reminder to non-respondents | Only eligible respondents receive (not Completed, not recently modified), CommunicationHistory logged |
| TC-DI-004 | Close distribution | Status changed to Closed, new respondents blocked, in-progress can complete |
| TC-DI-005 | Reopen distribution | Status changed back to Open, respondents can resume |
| TC-DI-006 | Delete distribution | Cascade: Respondents, CommunicationHistory, Recipients, Reminders deleted, Hangfire job cancelled |
| TC-DI-007 | Export respondents | CSV generated with filter by ResponseStatus, IsDeleted=false applied |
| TC-DI-008 | Permission enforcement | Non-admin users without Write permission rejected with 403 |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| No respondents provided | Validation error: "At least 1 recipient" | Recipient validation BR-DI-011 |
| Invalid email format | Validation error: "Invalid email format" | RFC 5322 validation |
| Scheduled time in past | Validation error: "Activation time must be future" | BR-DI-013 |
| Delete while Hangfire job queued | Job cancelled via BackgroundJob.Delete() | BR-DI-004 |
| Close then Reopen | Status transitions correctly, counters preserved | BR-DI-016, BR-DI-014 |
| Send reminder with no eligible respondents | Success with count=0 | BR-DI-002 filter logic |
| Respondent soft delete then export | Deleted respondents excluded | BR-DI-007, BR-DI-012 |
| Survey deleted with active distributions | All distributions cascade deleted | BR-DI-005 |

---

## Usage Notes

### When to Use This File

- Implementing new distribution or respondent features
- Debugging cascade delete or permission issues
- Understanding API contracts quickly for frontend integration
- Code review context for distribution-related PRs

### When to Use Full Documentation

- Understanding business requirements and user stories
- Stakeholder communication and ROI analysis
- Comprehensive test planning with all business rules
- Troubleshooting production issues with detailed process flows
- UI/UX design decisions

---

*Generated from comprehensive documentation. For full details, see [README.SurveyDistributionFeature.md](./README.SurveyDistributionFeature.md)*
