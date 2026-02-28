# Job Openings Management - AI Companion Context

**Purpose**: Quick reference for AI assistants working on Job Openings feature

---

## Feature Overview

Job Openings Management enables tracking of hiring rounds for job positions with lifecycle states (Active → Hired/Closed), candidate application assignment, and successful hire tracking.

## Key Files

### Backend (Candidate.Service)

```
Domain:
- src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/JobOpening.cs
- src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/JobOpeningStatus.cs
- src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/JobOpening/SuccessfulApplicationInfo.cs
- src/Services/bravoTALENTS/Candidate.Domain/Repositories/IJobOpeningRepository.cs

Application:
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/JobOpeningDto.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Commands/SaveJobOpeningCommand.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Commands/DeleteJobOpeningCommand.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Commands/CloseJobOpeningCommand.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Commands/ReopenJobOpeningCommand.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Commands/LinkJobOpeningToApplicationCommand.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Queries/GetJobOpeningListQuery.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Queries/GetJobOpeningByIdQuery.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Queries/CheckDuplicateOpeningCodeQuery.cs
- src/Services/bravoTALENTS/Candidate.Application/JobOpenings/Helpers/JobOpeningHelper.cs

Persistence:
- src/Services/bravoTALENTS/Candidate.Persistance/Repositories/JobOpeningRepository.cs
- src/Services/bravoTALENTS/Candidate.Persistance/Migrations/20260108000000_EnsureJobOpeningCollectionIndexes.cs

Controller:
- src/Services/bravoTALENTS/Candidate.Service/Controllers/JobOpeningController.cs
```

### Frontend (bravoTALENTSClient)

```
Models/Services:
- src/Web/bravoTALENTSClient/src/app/shared/models/job-opening.model.ts
- src/Web/bravoTALENTSClient/src/app/shared/services/job-opening-api.service.ts

Components:
- src/Web/bravoTALENTSClient/src/app/candidates/.../job-opening-assignment-dialog/
- src/Web/bravoTALENTSClient/src/app/candidates/.../job-opening-removal-dialog/
- src/Web/bravoTALENTSClient/src/app/jobs/components/close-job-opening-dialog/

Store:
- src/Web/bravoTALENTSClient/src/app/candidates/_store/candidates.action.ts
- src/Web/bravoTALENTSClient/src/app/candidates/_store/candidates.effect.ts

i18n:
- src/Web/bravoTALENTSClient/src/assets/i18n/en.json (key: jobOpening.*)
```

## Entity Model

```csharp
public class JobOpening : RootEntity<JobOpening, string>
{
    public string Code { get; set; }              // Unique per company (JO-YYYY-NNN)
    public string CompanyId { get; set; }
    public JobOpeningStatus Status { get; set; }  // Active=1, Hired=2, Closed=3
    public string? ClosedOpeningReason { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime? TargetEndDate { get; set; }
    public string? JobId { get; set; }            // Linked job position
    public string? HiringProcessId { get; set; }  // Linked pipeline
    public SuccessfulApplicationInfo? SuccessfulApplicationInfo { get; set; }
    public List<string> LocationIds { get; set; }
    public string? Team { get; set; }
}
```

## Status Transitions

```
Active → Hired   (MarkAsHired with candidate/application info)
Active → Closed  (Close with optional reason)
Closed → Active  (Reopen - clears reason)
Hired  → Active  (MarkAsUnHired - clears successful info)
```

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/job-opening/list | Paginated list with filters |
| GET | /api/job-opening/{id} | Get by ID |
| POST | /api/job-opening | Create/Update |
| DELETE | /api/job-opening/{id} | Delete (only if no applications) |
| POST | /api/job-opening/close | Close with reason |
| POST | /api/job-opening/reopen | Reopen closed |
| POST | /api/job-opening/link-to-application | Link/unlink application |
| GET | /api/job-opening/check-duplicate-code | Validate code uniqueness |

## Business Rules

1. **Code Uniqueness**: Opening code must be unique within company
2. **Delete Guard**: Cannot delete if applications are linked
3. **Status Guards**: Only valid transitions allowed
4. **Hired Info Required**: MarkAsHired requires candidateId + applicationId

## Related Features

- **Candidate Management**: Applications can link to openings
- **Hiring Process**: Openings link to pipelines for stage assignment
- **Job Management**: Openings link to job positions

## Common Patterns

### Creating Opening
```typescript
const command = new SaveJobOpeningCommand(new JobOpening({
  code: 'JO-2026-001',
  startDate: new Date(),
  jobId: 'job-123',
  hiringProcessId: 'pipeline-456'
}));
this.jobOpeningApi.save(command).subscribe(result => { ... });
```

### Linking Application
```typescript
const command = new LinkJobOpeningToApplicationCommand({
  candidateId: 'cand-123',
  applicationId: 'app-456',
  jobOpeningId: 'opening-789',
  defaultStageId: 'stage-001'
});
this.jobOpeningApi.linkToApplication(command).subscribe();
```

---

_Last Updated: 2026-01-23_
