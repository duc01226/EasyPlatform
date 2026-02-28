# Employee Management Feature - AI Context

> AI-optimized context file for code generation tasks.
> Full documentation: [README.EmployeeManagementFeature.md](./README.EmployeeManagementFeature.md)
> Last synced: 2026-01-11

---

## Quick Reference

| Field | Value |
|-------|-------|
| Module | bravoTALENTS |
| Services | Employee.Service (SQL Server), Setting.Service (MongoDB) |
| Database | SQL Server (primary), MongoDB (settings) |
| Frontend App | bravoTALENTSClient (Legacy Angular) |
| Full Docs | [README.EmployeeManagementFeature.md](./README.EmployeeManagementFeature.md) |

### File Locations

```
Entities:
├── src/Services/bravoTALENTS/Employee.Domain/Entities/Employee.cs
├── src/Services/bravoTALENTS/Employee.Domain/Entities/PendingEmployee.cs
├── src/Services/bravoTALENTS/Employee.Domain/Entities/Invitation.cs
├── src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/JobRecord.cs
└── src/Services/bravoTALENTS/Employee.Domain/AggregatesModel/ContractRecord.cs

Commands:    src/Services/bravoTALENTS/Employee.Application/UseCaseCommands/{Feature}/
Queries:     src/Services/bravoTALENTS/Employee.Application/UseCaseQueries/{Feature}/
Controllers: src/Services/bravoTALENTS/Employee.Service/Controllers/
Frontend:    src/Web/bravoTALENTSClient/src/app/employee/
EventHandlers: src/Services/bravoTALENTS/Employee.Application/UseCaseEvents/
Consumers:   src/Services/bravoTALENTS/Employee.Application/ApplyPlatform/MessageBus/Consumers/
```

---

## Domain Model

### Core Entities

```
Employee : RootEntity<Employee, string>
├── Id: string (ULID)
├── UserId: string
├── CompanyId: string
├── Email: string
├── FirstName: string
├── LastName: string
├── FullName: string (computed)
├── Position: string?
├── EmploymentStatus: EmploymentStatus (Active | OnLeave | Terminated | Suspended | Probation)
├── OrganizationalUnitId: string?
├── LineManagerId: string?
├── StartDate: DateTime?
├── TerminationDate: DateTime?
├── IsActive: bool
├── IsDeleted: bool (soft delete)
├── Avatar: string?
└── CreatedDate, LastModifiedDate: DateTime

PendingEmployee : RootEntity<PendingEmployee, string>
├── Id: string
├── UserId: string
├── CompanyId: string
├── Email: string
├── Status: PendingEmployeeStatus (Pending | Approved | Rejected)
├── RequestedDate: DateTime
├── ProcessedDate: DateTime?
└── ProcessedById: string?

Invitation : RootEntity<Invitation, string>
├── Id: string
├── CompanyId: string
├── InvitationType: InvitationType (Email | Url)
├── IsRetake: bool
├── OrganizationalUnitId: string?
├── ExpirationDate: DateTime?
├── InvitationUrl: string?
├── EmailSubject: string?
├── EmailBody: string?
├── Profiles: List<string>
├── CreatedById: string
└── CreatedDate: DateTime

JobRecord : EntityPeriodRecord<JobRecord>
├── Id: string
├── EmployeeId: string
├── FromDate: DateTime
├── ToDate: DateTime?
├── IsCurrent: bool
├── Position: string (required)
├── Team: string?
├── Level: string?
└── Comment: string

ContractRecord : EntityPeriodRecord<ContractRecord>
├── Id: string
├── EmployeeId: string
├── FromDate: DateTime
├── ToDate: DateTime?
├── IsCurrent: bool
├── ContractCode: string?
├── ContractType: string?
├── EmployeeType: string (required, Full-time | Part-time | Contract | Internship)
└── Comment: string
```

### Enums

```
EmploymentStatus: Active(1) | OnLeave(2) | Terminated(3) | Suspended(4) | Probation(5)
PendingEmployeeStatus: Pending(0) | Approved(1) | Rejected(2)
InvitationType: Email(1) | Url(2)
SurveyName: Interests | MotivationMastery | Preference | TeamRole | Vip24Flow | FlowAtWork | Lifestyle
ConnectionType: Company(1) | Team(2)
```

### Key Expressions

```csharp
// Company filter
public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
    => e => e.CompanyId == companyId;

// Status filter
public static Expression<Func<Employee, bool>> ByStatusExpr(EmploymentStatus status)
    => e => e.EmploymentStatus == status;

// Full text search
public static Expression<Func<Employee, object?>>[] DefaultFullTextSearchColumns()
    => [e => e.FirstName, e => e.LastName, e => e.Email, e => e.Position];
```

---

## API Contracts

### Employee Management Commands

```
POST /api/employee/imports
├── Request:  { file: CSV/TSV content, mapping: {column mappings} }
├── Response: { importedCount: int, errors: {line: reason}[] }
├── Handler:  ImportEmployeesCommand
└── Evidence: ImportEmployeesCommandHandler.cs

DELETE /api/employee/remove
├── Request:  { emails: string[] }
├── Response: { removedCount: int, succeeded: bool }
├── Handler:  RemoveEmployeesCommand
└── Evidence: RemoveEmployeesCommandHandler.cs

PUT /api/employee/{id}/employment-status
├── Request:  { status: EmploymentStatus, terminationDate?: DateTime }
├── Response: { employee: EmployeeDto }
├── Handler:  UpdateEmploymentStatusCommand
└── Evidence: UpdateEmploymentStatusCommandHandler.cs
```

### Employee Management Queries

```
GET /api/employee
├── Request:  { companyId, skipCount?, maxResultCount?, searchText?, filters: {} }
├── Response: { items: EmployeeDto[], totalCount: int }
├── Handler:  GetEmployeesByFilterQuery
└── Evidence: GetEmployeesByFilterQueryHandler.cs

GET /api/employee/{id}
├── Response: EmployeeDetailDto { employee, jobRecords, contractRecords, customFields }
├── Handler:  GetEmployeeQuery
└── Evidence: GetEmployeeQueryHandler.cs

POST /api/employee/departments/{deptId}
├── Response: EmployeeDto[]
├── Handler:  GetEmployeesByDepartmentQuery
└── Evidence: GetEmployeesByDepartmentQueryHandler.cs
```

### Invitation Commands

```
POST /api/invitations/invite-to-company-by-email
├── Request:  { emails: string[], orgUnitId?, profiles: string[], subject?, body? }
├── Response: { invitationCount: int, invalidEmails: string[] }
├── Handler:  CreateInvitationByEmailCommand
└── Evidence: CreateInvitationByEmailCommandHandler.cs

POST /api/invitations/invite-to-company-by-url
├── Request:  { orgUnitId?, profiles: string[], expirationDate?: DateTime }
├── Response: { invitationUrl: string, invitationId: string }
├── Handler:  CreateInvitationByUrlCommand
└── Evidence: CreateInvitationByUrlCommandHandler.cs

POST /api/invitations/invite-retake-to-company-by-email
├── Request:  { emails: string[], profiles: string[], subject?, body? }
├── Response: { invitationCount: int }
├── Handler:  CreateInvitationRetakeByEmailCommand
└── Evidence: CreateInvitationRetakeByEmailCommandHandler.cs
```

### Pending Employee Commands

```
POST /api/pending-employee/change-status
├── Request:  { pendingEmployeeIds: string[], status: PendingEmployeeStatus, rejectionReason?: string }
├── Response: { changedCount: int, succeeded: bool }
├── Handler:  ChangePendingEmployeesStatusCommand
└── Evidence: ChangePendingEmployeesStatusCommandHandler.cs
```

### Job/Contract Record Commands

```
POST /api/employee/job-record/save
├── Request:  { id?, employeeId, fromDate, toDate?, position, team?, level?, isCurrent }
├── Response: { jobRecord: JobRecordDto, succeeded: bool }
├── Handler:  SaveJobRecordCommand
└── Evidence: SaveJobRecordCommandHandler.cs

POST /api/contract-record/save
├── Request:  { id?, employeeId, fromDate, toDate?, contractType?, employeeType, isCurrent }
├── Response: { contractRecord: ContractRecordDto, succeeded: bool }
├── Handler:  SaveContractRecordCommand
└── Evidence: SaveContractRecordCommandHandler.cs
```

### DTOs

```
EmployeeDto : PlatformEntityDto<Employee, string>
├── Id: string?
├── Email: string
├── FirstName: string
├── LastName: string
├── FullName: string
├── Position: string?
├── EmploymentStatus: int
├── StartDate: DateTime?
├── OrganizationalUnitId: string?
├── Avatar: string?
└── SurveyResults: SurveyResultDto[]

JobRecordDto
├── Id: string
├── EmployeeId: string
├── FromDate: DateTime
├── ToDate: DateTime?
├── Position: string
├── Team: string?
├── Level: string?
├── IsCurrent: bool

ContractRecordDto
├── Id: string
├── EmployeeId: string
├── FromDate: DateTime
├── ToDate: DateTime?
├── ContractType: string?
├── EmployeeType: string
├── IsCurrent: bool
```

---

## Validation Rules

| Rule | Constraint | Evidence |
|------|-----------|----------|
| BR-EM-001 | Employee email unique per company | `Employee.cs:UniqueExpr(companyId, email)` |
| BR-EM-002 | Email format validation (RFC 5322) | `CreateInvitationByEmailCommand.Validate()` |
| BR-EM-003 | Cannot invite existing employees | `CreateInvitationByEmailCommand.Validate()` |
| BR-EM-004 | Pending employee status: Pending/Approved/Rejected only | `PendingEmployeeStatus` enum |
| BR-EM-005 | Job record position required | `SaveJobRecordCommand.Validate()` |
| BR-EM-006 | Job record date range: FromDate ≤ ToDate | `SaveJobRecordCommand.Validate()` |
| BR-EM-007 | Contract record EmployeeType required | `SaveContractRecordCommand.Validate()` |
| BR-EM-008 | Contract record date range: FromDate ≤ ToDate | `SaveContractRecordCommand.Validate()` |
| BR-EM-009 | Only one IsCurrent=true per employee per type | `SaveJobRecordCommand.Validate()` |
| BR-EM-010 | Cannot delete employee if HR dependencies exist | `RemoveEmployeesCommand.Validate()` |
| BR-EM-011 | Termination date cannot be in future | `UpdateEmploymentStatusCommand.Validate()` |
| BR-EM-012 | LineManager must be in same company | `SaveEmployeeCommand.Validate()` |
| BR-EM-013 | Circular manager hierarchy detection | `SaveEmployeeCommand.Validate()` |
| BR-EM-014 | Import file max 1024KB | `ImportEmployeesCommand.Validate()` |
| BR-EM-015 | No overlapping contract periods | `SaveContractRecordCommand.Validate()` |

### Validation Patterns

```csharp
// Command validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Email.IsNotNullOrEmpty() && Email.IsValidEmail(), "Valid email required")
        .And(_ => FirstName.IsNotNullOrEmpty(), "First name required")
        .And(_ => Position.IsNotNullOrEmpty() || !IsRequired, "Position required for current");

// Async validation in handler (uniqueness check)
await validation
    .AndNotAsync(r => repo.AnyAsync(e => e.Email == r.Email && e.CompanyId == RequestContext.CurrentCompanyId()),
        "Email already exists");

// Job record validation
await validation
    .And(r => r.FromDate <= r.ToDate, "Start date must be before end date")
    .AndNotAsync(r => repo.AnyAsync(JobRecord.OverlapExpr(r.EmployeeId, r.FromDate, r.ToDate)),
        "Date range overlaps with existing record");
```

---

## Service Boundaries

### Produces Events

```
EmployeeEntityEventBusMessage ← Employee.Service
├── Producer: EmployeeEntityEventBusMessageProducer.cs
├── Triggers: Create, Update, Delete on Employee entity
├── Filter: Published to Growth, Candidate, Survey services
└── Payload: { crudAction, employee, timestamp }

JobRecordEntityEventBusMessage ← Employee.Service
├── Triggers: Create, Update, Delete on JobRecord
├── Published to Growth, Candidate services
└── Idempotent: LastMessageSyncDate check on consume

PendingEmployeeEntityEventBusMessage ← Employee.Service
├── Triggers: Status change (Approved/Rejected)
├── Published to Account, Growth services
└── Action: Create employee or send rejection notification
```

### Consumes Events

```
AccountUserSavedEventBusMessage ← Account.Service
├── Consumer: UpsertEmployeeFromAccountUserConsumer.cs
├── Action: Sync user data to employee (email, name, etc.)
├── Idempotent: Yes (LastMessageSyncDate check)
└── Services: Employee.Service, Growth.Service

CandidateHiredEventBusMessage ← Candidate.Service
├── Consumer: ProcessCandidateHiredConsumer.cs
├── Action: Convert hired candidate to pending employee
└── Services: Employee.Service
```

### Cross-Service Data Flow

```
Account.Service ──publish──▶ [RabbitMQ] ──consume──▶ Employee.Service
  (User changes)                                    (Sync employee)

Candidate.Service ──publish──▶ [RabbitMQ] ──consume──▶ Employee.Service
  (Hired candidate)                                (Create employee from candidate)

Employee.Service ──publish──▶ [RabbitMQ] ──consume──▶ Growth.Service
  (Employee changes)                               (Sync employee data)

Setting.Service ──publish──▶ [RabbitMQ] ──consume──▶ Employee.Service
  (Field template)                                 (Update employee fields)
```

### Consumer Pattern

```csharp
internal sealed class UpsertEmployeeConsumer : PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    public override async Task HandleLogicAsync(EmployeeEntityEventBusMessage msg, ...)
    {
        var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);

        if (existing == null && msg.Payload.CrudAction == Created)
            await repository.CreateAsync(msg.Payload.EntityData.With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        else if (existing != null && existing.LastMessageSyncDate <= msg.CreatedUtcDate)
            await repository.UpdateAsync(existing.With(e => {
                // merge props
                e.LastMessageSyncDate = msg.CreatedUtcDate;
            }));
    }
}
```

---

## Critical Paths

### Create Employee (Manual or Imported)

```
1. Validate input (BR-EM-001, BR-EM-002, BR-EM-012)
   ├── Email required & valid format
   ├── Email unique per company
   └── LineManager in same company (if set)
2. Check if user exists in Account service
   └── If not: Create via AccountService or link existing
3. Generate ID → Ulid.NewUlid()
4. Create employee with audit fields (CreatedBy, CreatedDate)
5. Save via repository.CreateAsync()
6. Publish EmployeeEntityEventBusMessage
   └── Growth, Candidate, Survey services consume & sync
```

### Send Email Invitation

```
1. Validate emails (BR-EM-002, BR-EM-003)
   ├── Each email valid format
   ├── Not duplicate in list
   └── Not existing employee
2. For each email:
   ├── Create Invitation entity (InvitationType=Email)
   ├── Queue email message to email service
   └── Track in PendingInvited tab
3. Save invitations via repository.CreateManyAsync()
4. Publish NotificationMessageBusMessage → Email service
```

### Accept Pending Employee

```
1. Load PendingEmployee by ID (not found: 404)
2. Validate status = Pending (BR-EM-004)
3. Create Employee from PendingEmployee data
   ├── Copy email, name to employee
   ├── Map OrganizationalUnitId if set
   ├── Set EmploymentStatus=Active, StartDate=Today
   └── Link to UserId from PendingEmployee
4. Save Employee via repository.CreateAsync()
5. Update PendingEmployee.Status = Approved
6. Save PendingEmployee
7. Publish events:
   ├── EmployeeEntityEventBusMessage (Created)
   └── NotificationMessageBusMessage (Email: "You're hired")
```

### Update Employee Employment Status

```
1. Load Employee by ID (not found: 404)
2. Validate new status is valid (BR-EM-004, BR-EM-011)
   └── Termination date not in future if Terminated
3. Update employee.EmploymentStatus = new status
4. If Terminated: Set TerminationDate = today
5. Save via repository.UpdateAsync()
6. Publish EmployeeEntityEventBusMessage (Updated)
   └── Growth, Candidate services update status
```

### Save Job Record

```
1. Load Employee by ID (not found: 404)
2. Load existing JobRecord if ID provided
3. Validate (BR-EM-005, BR-EM-006, BR-EM-009)
   ├── Position required
   ├── FromDate ≤ ToDate
   └── No date overlap with other records
4. If new record & IsCurrent=true:
   ├── Set all other JobRecords.IsCurrent = false
5. Create or update JobRecord
6. Save via repository.CreateOrUpdateAsync()
7. Publish JobRecordEntityEventBusMessage
8. If IsCurrent=true:
   ├── Publish UpdateEmployeePositionEventHandler
   └── Sync employee.Position field
```

### Save Contract Record

```
1. Load Employee by ID (not found: 404)
2. Load existing ContractRecord if ID provided
3. Validate (BR-EM-007, BR-EM-008, BR-EM-015)
   ├── EmployeeType required
   ├── FromDate ≤ ToDate
   └── No overlapping periods with contracts
4. If new record & IsCurrent=true:
   ├── Set all other ContractRecords.IsCurrent = false
5. Create or update ContractRecord
6. Save via repository.CreateOrUpdateAsync()
7. Publish ContractRecordEntityEventBusMessage
8. Trigger UpdateEmployeeOnContractRecordSavedEventHandler
```

### Remove Employee

```
1. Load Employee by ID (not found: 404)
2. Validate deletable (BR-EM-010)
   ├── Check no active contracts/benefits
   ├── Check no pending requests
   └── HR approval requirement
3. Perform soft delete: Set IsDeleted=true, IsActive=false
4. Save via repository.UpdateAsync()
5. Publish EmployeeEntityEventBusMessage (Deleted)
6. Growth, Candidate services remove employee
7. Send notification to HR
```

---

## Frontend Key Components

```
app-employee-page                      (Main page container)
├── app-employee-list                  (List container with 3 tabs)
│   ├── employee-advanced-filter       (Filter panel)
│   ├── employee-list                  (Paginated table)
│   ├── app-profile-table-cell         (Survey profile display)
│   ├── app-employee-invitation        (Invitation modal)
│   ├── import-users-panel             (CSV import dialog)
│   ├── pending-employees-list         (Pending approval tab)
│   └── pending-invited-list           (Pending registration tab)
└── employee-detail-panel              (Detail sidebar)
    ├── app-employee-info              (Personal info tab)
    ├── app-employee-job-container     (Job history tab)
    ├── app-employee-contract-container (Contract history tab)
    ├── app-user-cv                    (CV display tab)
    └── app-user-profile-v2            (Survey results tab)

Services:
├── EmployeeHttpService (35+ methods for all operations)
├── EmployeeJobRecordService (Job CRUD)
└── EmployeeContractRecordService (Contract CRUD)
```

---

## Test Focus Areas (P0 Priority)

| ID | Test | Validation |
|----|------|------------|
| TC-EM-001 | Create employee with valid data | Employee created, event published |
| TC-EM-002 | Create duplicate email | Returns validation error BR-EM-001 |
| TC-EM-003 | Send email invitation to valid email | Invitation queued, appears in Pending Invited |
| TC-EM-004 | Accept pending employee | PendingEmployee→Employee created, notification sent |
| TC-EM-005 | Reject pending employee | Status=Rejected, employee not created, rejection email sent |
| TC-EM-006 | Update employment status to Terminated | TerminationDate set, status changed, event published |
| TC-EM-007 | Save job record with valid position | JobRecord created, IsCurrent synced to employee |
| TC-EM-008 | Save contract record with overlapping dates | Validation error BR-EM-015, not saved |
| TC-EM-009 | Import employees from CSV | All valid rows imported, errors reported per line |
| TC-EM-010 | Remove employee | Soft delete, IsDeleted=true, event published |

---

## Usage Notes

### When to Use This File

- Implementing new features in employee management
- Adding/modifying employee operations
- Debugging cross-service sync issues
- Understanding entity relationships and constraints
- Code generation for commands, queries, handlers

### When to Use Full Documentation

- Understanding complete business requirements
- Detailed error handling specifications
- UI/UX flow details and component behavior
- Troubleshooting production issues
- Stakeholder communication

---

*Generated from comprehensive documentation. For full details, see [README.EmployeeManagementFeature.md](./README.EmployeeManagementFeature.md)*
