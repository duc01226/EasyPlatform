# Candidate Management Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.CandidateManagementFeature.md](./README.CandidateManagementFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Service | Candidate.Service (MongoDB) |
| Database | MongoDB |
| Frontend | src/WebV2/apps/growth-for-company/ |

### File Locations

```
Entities:    src/Services/bravoTALENTS/Candidate.Domain/AggregatesModel/Candidate.cs
Commands:    src/Services/bravoTALENTS/Candidate.Application/UseCaseCommands/
Queries:     src/Services/bravoTALENTS/Candidate.Application/UseCaseQueries/
Controllers: src/Services/bravoTALENTS/Candidate.Service/Controllers/CandidatesController.cs
Frontend:    src/WebV2/apps/growth-for-company/src/app/
```

---

## Domain Model

### Entities

```
CandidateEntity : RootEntity<CandidateEntity, string>
├── Id: string (ULID)
├── OrganizationalUnitId: string (Company scope)
├── Firstname: string
├── Lastname: string
├── Middlename: string
├── Email: string (company-unique)
├── PhoneNumber: string
├── Gender: Gender?
├── EducationLevel: EducationLevel?
├── DateOfBirth: DateTime?
├── PreviousJob: string
├── PreviousCompany: string
├── ProfileImagePath: string
├── Description: string (max 1000 chars)
├── Tags: List<string> (company-scoped)
├── Applications: IReadOnlyList<ApplicationEntity>
├── FollowedByUserIds: IList<string>
├── OwnedByUserIds: IList<string>
├── ReadByUserIds: IList<string>
├── SuitableJobCategories: IList<SuitableJobCategory>
├── InterestProfileCodes: IList<string>
├── CreatedDate: DateTime
├── ModifiedDate: DateTime
└── ExternalId: string (VIP24 reference)

ApplicationEntity (Child aggregate)
├── Id: string
├── JobId: string
├── AppliedDate: DateTime
├── JoiningDate: DateTime?
├── ExpirationDate: DateTime?
├── CurrentPipelineStage: CurrentPipelineStage (VO)
├── CV: CV (VO - nested object with education, experience, skills)
├── CVFile: File
├── IsRejected: bool
├── RejectReason: string
├── Attachments: IList<File>
├── PipelineStageHistories: List<PipelineStageHistory>
└── JobTitle: string
```

### Enumerations

```
EducationLevel: PrimarySchool=0 | SecondarySchool=1 | HighSchool=2 | VocationalSchool=3 | College=4 | University=5 | Postgraduate=6

JobType: Undefined=0 | FullTime=1 | PartTime=2 | Temporary=3 | Internship=4

PositionLevel: Undefined=0 | StudentJob=1 | EntryLevel=2 | Experienced=3 | Manager=4 | SeniorManager=5 | TopManagement=6
```

### Key Expressions

```csharp
// Company-scoped candidates
public static Expression<Func<CandidateEntity, bool>> OfCompanyExpr(string companyId)
    => c => c.OrganizationalUnitId == companyId;

// Email uniqueness (company-scoped)
public static Expression<Func<CandidateEntity, bool>> ByEmailExpr(string email, string companyId)
    => c => c.Email == email && c.OrganizationalUnitId == companyId;

// Full-text search
public static Expression<Func<CandidateEntity, object?>>[] DefaultFullTextSearchColumns()
    => [c => c.Firstname, c => c.Lastname, c => c.Email];
```

---

## API Contracts

### Commands

```
POST /api/candidates/create-candidate-manual
├── Request:  { firstname, lastname, email?, phoneNumber?, educationLevel?, gender?, dateOfBirth? }
├── Response: { id, firstname, lastname, email, createdDate }
├── Handler:  CreateCandidateManualCommandHandler
└── Evidence: CreateCandidateManualCommand.cs, CandidatesController.cs:416-421

PUT /api/candidates/{candidateId}/edit-candidate
├── Request:  { candidateId, firstname, lastname, email, phone, education, gender, dob, address }
├── Response: { CandidateDto }
├── Handler:  UpdateBasicCandidateInfoCommandHandler
└── Evidence: UpdateBasicCandidateInfoCommand.cs, CandidatesController.cs:449-456

POST /api/candidates/import-candidate-from-file
├── Request:  { file, isOverride }
├── Response: { Created: int, Updated: int, Failed: int, errors[] }
├── Handler:  ImportCandidateFromFileCommandHandler
└── Evidence: ImportCandidateFromFileCommand.cs, CandidatesController.cs:533-541

PUT /api/candidates/add-candidate-tag
├── Request:  { candidateId, tag }
├── Response: { CandidateDto with updated tags }
├── Handler:  AddCandidateTagCommandHandler
└── Evidence: AddCandidateTagCommand.cs, CandidatesController.cs:499-504

POST /api/candidates/mark-candidate-as-followed
├── Request:  { candidateIds: string[] }
├── Response: { candidateIds[] with updated FollowedByUserIds }
├── Handler:  MarkCandidateAsFollowedCommandHandler
└── Evidence: MarkCandidateAsFollowedCommand.cs, CandidatesController.cs:226-235

POST /api/candidates/description/save
├── Request:  { candidateId, description (max 1000 chars) }
├── Response: { CandidateDto }
├── Handler:  SaveCandidateDescriptionCommand
└── Evidence: SaveCandidateDescriptionCommand.cs, CandidatesController.cs:598-602

POST /api/candidates/{candidateId}/application/{applicationId}/upload-file
├── Request:  { file (max 50MB, type: PDF|DOC|DOCX|XLS|XLSX|JPG|PNG) }
├── Response: { FileDto with path and metadata }
├── Handler:  UploadFileCommandHandler
└── Evidence: UploadFileCommand.cs, CandidatesController.cs:308-320
```

### Queries

```
GET /api/candidates/{id}
├── Response: CandidateDto with all nested data
├── Handler:  GetCandidateQuery
└── Evidence: GetCandidateQuery.cs, CandidatesController.cs:175-179

GET /api/candidates?skip={int}&take={int}&query={text}&filters=...
├── Response: { items: CandidateDto[], totalCount: int }
├── Handler:  GetCandidatesQuery
└── Evidence: GetCandidatesQuery.cs, CandidatesController.cs:203-214

GET /api/candidates/filters
├── Response: { educationLevels[], jobs[], statuses[], tags[] }
├── Handler:  GetCandidateFiltersQuery (cached)
└── Evidence: GetCandidateFiltersQuery.cs, CandidatesController.cs:191-195

GET /api/candidates/get-tag-suggestion?tag={text}
├── Response: string[] (max 10 results, company-scoped)
├── Handler:  GetTagSuggestionQuery
└── Evidence: GetTagSuggestionQuery.cs, CandidatesController.cs:506-511

GET /api/candidates/check-exist-candidate-email/{email}
├── Response: bool (true if exists in company, false if available)
├── Handler:  CheckExistCandidateEmail
└── Evidence: CheckExistCandidateEmail.cs, CandidatesController.cs:423-427

POST /api/candidates/export-file
├── Request:  { columns: string[], filters: {...} }
├── Response: XLSX file (streaming)
├── Handler:  ExportCandidateQuery
└── Evidence: ExportCandidateQuery.cs, CandidatesController.cs:604-619
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|------------|----------|
| BR-CM-001 | Email must be unique per company | `ErrorMessage.cs:83`, `CreateCandidateManualCommand.cs` |
| BR-CM-002 | Firstname AND Lastname required | `ErrorMessage.cs:70-71`, `CreateCandidateManualCommand.cs` |
| BR-CM-003 | Phone OR Email required (at least one) | `ErrorMessage.cs:71`, `CreateCandidateManualCommand.cs` |
| BR-CM-004 | Description max 1000 characters | `ErrorMessage.cs:131`, `Candidate.Description:53` |
| BR-CM-005 | File max 50MB, allowed types: PDF,DOC,DOCX,XLS,XLSX,JPG,PNG | `ErrorMessage.cs:89-92`, `UploadFileCommand.cs` |
| BR-CM-006 | Tag duplicates prevented at entity level (case-insensitive) | `AddCandidateTagCommand.cs` |
| BR-CM-007 | Follow/unfollow operations idempotent (safe to repeat) | `MarkCandidateAsFollowedCommand.cs` |
| BR-CM-008 | Import override behavior: isOverride=true (update) OR false (skip) | `ImportCandidateFromFileCommandHandler.cs` |
| BR-CM-009 | Access control via JobAccessRightsHelper.CanAccessToSpecificApplicationAsync() | `CandidatesController.cs` authorization |
| BR-CM-010 | Soft-delete pattern: IsDeleted flag, retained for audit | `Candidate.Domain` entity |

### Validation Patterns

```csharp
// Command validation (sync)
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Firstname.IsNotNullOrEmpty(), "First name required")
        .And(_ => Lastname.IsNotNullOrEmpty(), "Last name required")
        .And(_ => Email.IsNotNullOrEmpty() || PhoneNumber.IsNotNullOrEmpty(), "Email or phone required");

// Async validation in handler (email uniqueness)
await validation
    .AndNotAsync(r => repo.AnyAsync(c => c.Email == r.Email && c.OrganizationalUnitId == RequestContext.CurrentCompanyId()),
        "Email already exists");
```

---

## Service Boundaries

### Produces Events

```
CandidateEntityEventBusMessage → [Growth.Service, Employee.Service, Talent.Service]
├── Producer: Auto-generated PlatformEntityEventBusMessageProducer
├── Triggers: Create, Update, Delete
└── Payload: { CrudAction: Created|Updated|Deleted, EntityData: CandidateEntity }
```

### Consumes Events

```
[TBD] Events from other services synced to Candidate
├── Example: Employee updates sync to candidate employee links
└── Pattern: SettingCompanyClassFieldTemplateEntityEventBusConsumer pattern
```

### Cross-Service Data Flow

```
Candidate.Service (MongoDB)
     │
     ├─ Publishes CandidateEntityEventBusMessage on CRUD
     │
     ▼ RabbitMQ
     │
     ├──→ Growth.Service (PostgreSQL) - Candidate Sync Consumer
     ├──→ Employee.Service (SQL Server) - Candidate Sync Consumer
     └──→ Talent.Service (TBD) - Candidate Sync Consumer
```

### Consumer Pattern

```csharp
internal sealed class UpsertCandidateConsumer : PlatformApplicationMessageBusConsumer<CandidateEntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(CandidateEntityEventBusMessage msg, string routingKey) => true;

    public override async Task HandleLogicAsync(CandidateEntityEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Created || msg.Payload.CrudAction == Updated)
        {
            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity());
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing).With(
                    e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }
        if (msg.Payload.CrudAction == Deleted)
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

---

## Critical Paths

### Create Candidate Manually

```
1. Validate input (BR-CM-002, BR-CM-003)
   ├── Firstname required
   ├── Lastname required
   └── Phone OR Email required
2. Check email uniqueness (BR-CM-001)
   └── Query: repo.AnyAsync(c => c.Email == email && c.OrganizationalUnitId == companyId)
3. Generate ID → Ulid.NewUlid()
4. Set CreatedBy = RequestContext.UserId(), OrganizationalUnitId = RequestContext.CurrentCompanyId()
5. Create CandidateEntity → repository.CreateAsync()
6. Publish event → CandidateEntityEventBusMessage
7. Return CandidateDto with ID
```

### Import Candidates from File

```
1. Validate file (CSV/XLSX)
   └── File format, encoding, size
2. Parse records → Extract firstname, lastname, email, phone
3. Dedup within file
4. For each record:
   ├── Check if email exists in database
   ├── If exists AND isOverride=true → Update (increment ModifiedDate, set ModifiedBy)
   ├── If exists AND isOverride=false → Skip (log as skipped)
   └── If not exists → Create new
5. Batch persist → repository.CreateManyAsync() or UpdateManyAsync()
6. Publish events for new/updated candidates
7. Return ImportResult { Created: int, Updated: int, Failed: int, Errors: [] }
```

### Search & Filter Candidates

```
1. Build MongoDB filter expression
   └── OfCompanyExpr(RequestContext.CurrentCompanyId())
2. Apply access control (JobAccessRightsHelper)
3. If searchText provided:
   └── Match Firstname, Lastname, Email (text search)
4. Apply selected filters:
   ├── Status, Education, Tags, Job Categories
   └── AND logic (must match all selected)
5. Apply sort order (default: CreatedDate DESC)
6. Apply pagination (skip, take)
7. Execute MongoDB query
8. Map to CandidateDto collection
9. Return { items: CandidateDto[], totalCount: int }
```

### Add Tag to Candidate

```
1. Load candidate → repo.GetByIdAsync(candidateId)
2. Check tag not already in Tags collection (idempotent)
3. Add tag to Tags collection (case-insensitive trim)
4. Update ModifiedDate, ModifiedBy
5. Save → repository.UpdateAsync()
6. Publish event → Notify followers
7. Return updated CandidateDto
```

### Mark Candidate as Followed

```
1. For each candidateId in request:
   ├── Load candidate
   ├── Check if current userId already in FollowedByUserIds
   ├── If not, add userId → FollowedByUserIds.Add(userId)
   └── Idempotent: safe to call multiple times
2. Bulk update → repository.UpdateManyAsync()
3. Return updated candidates
```

### Export Candidates to Excel

```
1. Apply same filters as GetCandidates query
2. User selects columns (default: firstname, lastname, email, educationLevel, tags)
3. If dataset > 10k records:
   └── Use streaming export (prevent OOM)
4. Generate XLSX with:
   ├── Headers (column names)
   ├── Data rows
   └── Basic formatting
5. Stream to browser with attachment disposition
6. Return file
```

---

## Test Focus Areas

### Critical Test Cases (P0)

| ID | Test | Validation | Evidence |
|----|------|------------|----------|
| TC-CM-001 | Create candidate with required fields | Entity created, ID generated, timestamps set | `CreateCandidateManualCommand.cs`, `ErrorMessage.cs:70-77` |
| TC-CM-002 | Email uniqueness validation | Returns error if email exists in company | `ErrorMessage.cs:83`, `CheckExistCandidateEmail.cs` |
| TC-CM-003 | Full-text search by name | Matches firstname/lastname, <1s response, paginated | `GetCandidateSearchResultsQuery.cs`, `CandidatesController.cs:203-214` |
| TC-CM-004 | Add tag to candidate | Tag added, duplicates prevented, idempotent | `AddCandidateTagCommand.cs`, `Candidate.Tags:43` |
| TC-CM-005 | Mark candidate as followed | UserId added to FollowedByUserIds, bulk operation supported | `MarkCandidateAsFollowedCommand.cs`, `Candidate.FollowedByUserIds:45` |
| TC-CM-006 | Import from CSV file | Parses CSV, handles duplicates, respects isOverride flag | `ImportCandidateFromFileCommandHandler.cs`, `ErrorMessage.cs:89-91` |

### Edge Cases

| Scenario | Expected | Evidence |
|----------|----------|----------|
| Create with duplicate email | Validation error "Email already exists" | `ErrorMessage.cs:83` |
| Email in different company | Succeeds (company-scoped uniqueness) | `ByEmailExpr: email && companyId` |
| Import with isOverride=true | Updates existing candidates | `ImportCandidateFromFileCommandHandler.cs` |
| Import with isOverride=false | Skips duplicates, logs as skipped | `ImportCandidateFromFileCommandHandler.cs` |
| Tag with special characters | Allowed (trimmed, case-insensitive) | `AddCandidateTagCommand.cs` |
| Description > 1000 chars | Validation error "Comment too long" | `ErrorMessage.cs:131`, `Candidate.Description:53` |
| File > 50MB | Validation error "File size is too large" | `ErrorMessage.cs:89`, `UploadFileCommand.cs` |
| Follow already followed | Succeeds silently (idempotent) | `MarkCandidateAsFollowedCommand.cs` |

---

## Usage Notes

### When to Use This File

- Implementing new candidate features (create, update, search, tagging, follow)
- Fixing bugs in candidate management (CRUD operations, import, export)
- Understanding API contracts for integration
- Code review context for candidate-related PRs

### When to Use Full Documentation

- Understanding business value and ROI analysis
- Stakeholder communication and presentations
- Comprehensive test planning and edge case analysis
- Troubleshooting production issues with detailed runbooks
- UI/UX flow understanding and component hierarchy

---

*Generated from comprehensive documentation. For full details, see [README.CandidateManagementFeature.md](./README.CandidateManagementFeature.md)*
