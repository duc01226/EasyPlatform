---
description: "Feature implementation workflow with research, planning, and verification"
---

# Feature Implementation Prompt

## Overview

This prompt guides feature implementation in EasyPlatform, ensuring proper research, planning, and execution following platform patterns.

## Feature Implementation Workflow

```
1. Research → 2. Plan → 3. Get Approval → 4. Implement → 5. Test → 6. Verify → 7. Document
```

## Step 1: Research Phase

### Domain Understanding

**Extract domain concepts from requirements:**
```
Requirement: "Add ability to track employee certifications with expiry dates"

Domain concepts:
- Certification (entity)
- Employee (existing entity)
- ExpiryDate (property)
- CertificationStatus (enum: Active, Expired, Expiring)
```

### Existing Pattern Discovery

**Search for similar features:**
```bash
# Backend patterns
grep -r "class.*Repository" src/Platform/
grep -r "PlatformCqrsCommand" src/PlatformExampleApp/

# Frontend patterns
grep -r "extends PlatformVmStoreComponent" src/PlatformExampleAppWeb/
grep -r "PlatformApiService" src/PlatformExampleAppWeb/
```

**Check example implementations:**
- Backend: `src/PlatformExampleApp/PlatformExampleApp.TextSnippet.*`
- Frontend: `src/PlatformExampleAppWeb/apps/playground-text-snippet`

### Service Boundary Identification

**Determine which service owns the feature:**
```
Questions to ask:
1. Which service owns the primary entity?
2. Does this require cross-service communication?
3. Is this a new microservice or extension of existing?

Example:
- Employee certifications → Owned by Employee service
- Cross-service sync → Use message bus (PlatformCqrsEntityEventBusMessage)
```

### Technology Stack Verification

**Identify required technologies:**
- Database: MongoDB, SQL Server, PostgreSQL?
- Message bus: RabbitMQ for cross-service?
- Background jobs: Scheduled expiry notifications?
- File storage: For certificate uploads?

## Step 2: Planning Phase

### Create Implementation Plan

**Use structured planning format:**
```markdown
# Feature: Employee Certification Tracking

## Requirements
- Track certifications per employee
- Expiry date warnings
- Automatic status updates
- File upload for certificates

## Architecture Decisions
- Service: Employee service (existing)
- Database: MongoDB (existing pattern)
- Background job: Daily check for expiring certs
- Message bus: Notify other services on certification changes

## Backend Tasks
1. Create Certification entity (Domain layer)
2. Create repository extensions (Persistence layer)
3. Implement CQRS commands (Application layer)
   - SaveCertificationCommand
   - DeleteCertificationCommand
4. Implement queries (Application layer)
   - GetCertificationsByEmployeeQuery
   - GetExpiringCertificationsQuery
5. Create background job (Application layer)
   - CheckExpiringCertificationsJob (daily at 3 AM)
6. Create entity event handlers (Application layer)
   - SendNotificationOnCertificationExpiringHandler
7. Add API endpoints (Service layer)
8. Add database migration

## Frontend Tasks
1. Create certification models
2. Create API service
3. Create store (state management)
4. Create list component
5. Create form component
6. Add routing
7. Update navigation

## Testing Tasks
1. Unit tests for entity validation
2. Integration tests for commands
3. Frontend component tests
4. E2E workflow tests

## File Structure
Backend:
- Domain/Entities/Certification.cs
- Domain/Enums/CertificationStatus.cs
- Persistence/RepositoryExtensions/CertificationRepositoryExtensions.cs
- Application/UseCaseCommands/Certification/SaveCertificationCommand.cs
- Application/UseCaseQueries/Certification/GetCertificationsByEmployeeQuery.cs
- Application/BackgroundJobs/CheckExpiringCertificationsJob.cs
- Application/UseCaseEvents/Certification/SendNotificationOnCertificationExpiringHandler.cs
- Api/Controllers/CertificationController.cs

Frontend:
- libs/apps-domains/employee/models/certification.model.ts
- libs/apps-domains/employee/services/certification-api.service.ts
- libs/apps-domains/employee/stores/certification.store.ts
- apps/employee/src/app/certifications/certification-list.component.ts
- apps/employee/src/app/certifications/certification-form.component.ts
```

### Identify Dependencies

**List prerequisite tasks:**
```markdown
## Dependencies
- Employee entity must exist (✓ exists)
- File upload service required (✓ platform provides)
- Notification service required (✓ exists)
- Background job scheduler (✓ platform provides)

## Blockers
- None identified

## Assumptions
- Certifications belong to single employee (no sharing)
- Maximum 50 certifications per employee
- Certificate files max 5MB
```

### Define Success Criteria

**Clear acceptance criteria:**
```markdown
## Success Criteria
1. User can add/edit/delete certifications
2. System shows expiry warnings 30 days before
3. Background job runs daily and updates statuses
4. Email sent when certification expires
5. File upload works with validation
6. All tests pass
7. No performance degradation on employee list
8. Authorization enforced (only own company)
```

## Step 3: Get Approval

**Present plan to stakeholder/team lead:**
```markdown
## Plan Summary
Feature: Employee Certification Tracking
Effort: 16 hours
Risk: Low
Dependencies: None

Key decisions:
1. Use MongoDB (consistent with employee service)
2. Background job for expiry checks
3. Message bus for cross-service notifications

Questions for review:
1. Should certifications sync to other services?
2. Do we need certification templates/categories?
3. File storage: local or cloud?
```

**Wait for approval before implementation.**

## Step 4: Implementation Phase

### Backend Implementation Order

**Follow Clean Architecture layers (inside-out):**

**1. Domain Layer (Entities, Enums)**
```csharp
public enum CertificationStatus { Active = 1, Expiring = 2, Expired = 3 }

public sealed class Certification : RootAuditedEntity<Certification, string, string>
{
    public string EmployeeId { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime IssueDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public CertificationStatus Status { get; set; }
    public string? FileId { get; set; }

    [JsonIgnore]
    public Employee? Employee { get; set; }

    public static Expression<Func<Certification, bool>> OfEmployeeExpr(string employeeId)
        => c => c.EmployeeId == employeeId;

    public static Expression<Func<Certification, bool>> ExpiringInDaysExpr(int days)
        => c => c.ExpiryDate <= DateTime.UtcNow.AddDays(days) && c.Status == CertificationStatus.Active;

    public void UpdateStatus()
    {
        if (ExpiryDate < DateTime.UtcNow)
            Status = CertificationStatus.Expired;
        else if (ExpiryDate <= DateTime.UtcNow.AddDays(30))
            Status = CertificationStatus.Expiring;
        else
            Status = CertificationStatus.Active;
    }
}
```

**2. Persistence Layer (Repository Extensions)**
```csharp
public static class CertificationRepositoryExtensions
{
    public static async Task<List<Certification>> GetByEmployeeIdAsync(
        this IPlatformQueryableRootRepository<Certification, string> repo,
        string employeeId,
        CancellationToken ct = default)
    {
        return await repo.GetAllAsync(Certification.OfEmployeeExpr(employeeId), ct);
    }

    public static async Task<List<Certification>> GetExpiringAsync(
        this IPlatformQueryableRootRepository<Certification, string> repo,
        int daysAhead,
        CancellationToken ct = default)
    {
        return await repo.GetAllAsync(Certification.ExpiringInDaysExpr(daysAhead), ct);
    }
}
```

**3. Application Layer (CQRS, Jobs, Events)**

*Commands:*
```csharp
public sealed class SaveCertificationCommand : PlatformCqrsCommand<SaveCertificationCommandResult>
{
    public string? Id { get; set; }
    public string EmployeeId { get; set; } = "";
    public string Name { get; set; } = "";
    public DateTime IssueDate { get; set; }
    public DateTime ExpiryDate { get; set; }
    public string? FileId { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(_ => EmployeeId.IsNotNullOrEmpty(), "Employee required")
            .And(_ => Name.IsNotNullOrEmpty(), "Name required")
            .And(_ => ExpiryDate > IssueDate, "Expiry must be after issue date");
}

internal sealed class SaveCertificationCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveCertificationCommand, SaveCertificationCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveCertificationCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveCertificationCommand> v,
        CancellationToken ct)
    {
        return await v.AndAsync(r => employeeRepo.AnyAsync(
            e => e.Id == r.EmployeeId && e.CompanyId == RequestContext.CurrentCompanyId(), ct),
            "Employee not found or access denied");
    }

    protected override async Task<SaveCertificationCommandResult> HandleAsync(
        SaveCertificationCommand req,
        CancellationToken ct)
    {
        var certification = req.Id.IsNullOrEmpty()
            ? new Certification
            {
                Id = Ulid.NewUlid().ToString(),
                EmployeeId = req.EmployeeId,
                Name = req.Name,
                IssueDate = req.IssueDate,
                ExpiryDate = req.ExpiryDate,
                FileId = req.FileId
            }
            : await repo.GetByIdAsync(req.Id, ct).Then(c =>
            {
                c.Name = req.Name;
                c.IssueDate = req.IssueDate;
                c.ExpiryDate = req.ExpiryDate;
                c.FileId = req.FileId;
                return c;
            });

        certification.UpdateStatus();
        var saved = await repo.CreateOrUpdateAsync(certification, ct);
        return new SaveCertificationCommandResult { Certification = new CertificationDto(saved) };
    }
}
```

*Background Jobs:*
```csharp
[PlatformRecurringJob("0 3 * * *")] // Daily at 3 AM
public sealed class CheckExpiringCertificationsJob : PlatformApplicationBackgroundJobExecutor
{
    public override async Task ProcessAsync(
        PlatformApplicationBackgroundJobParam<object?> param,
        IServiceProvider serviceProvider)
    {
        var certifications = await repo.GetExpiringAsync(daysAhead: 30);
        await certifications.ParallelAsync(async cert =>
        {
            cert.UpdateStatus();
            await repo.UpdateAsync(cert, dismissSendEvent: false);
        });
    }
}
```

*Event Handlers:*
```csharp
internal sealed class SendNotificationOnCertificationExpiringHandler
    : PlatformCqrsEntityEventApplicationHandler<Certification>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Certification> e)
        => e.CrudAction == PlatformCqrsEntityEventCrudAction.Updated
           && e.EntityData.Status == CertificationStatus.Expiring;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Certification> e,
        CancellationToken ct)
    {
        var employee = await employeeRepo.GetByIdAsync(e.EntityData.EmployeeId, ct);
        await notificationService.SendAsync(new ExpiringCertificationNotification
        {
            EmployeeEmail = employee.Email,
            CertificationName = e.EntityData.Name,
            ExpiryDate = e.EntityData.ExpiryDate
        });
    }
}
```

**4. Service Layer (Controllers)**
```csharp
[ApiController]
[Route("api/[controller]")]
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager, PlatformRoles.Employee)]
public class CertificationController : PlatformBaseController
{
    [HttpGet("employee/{employeeId}")]
    public async Task<IActionResult> GetByEmployee(string employeeId)
        => Ok(await Cqrs.SendAsync(new GetCertificationsByEmployeeQuery { EmployeeId = employeeId }));

    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveCertificationCommand cmd)
        => Ok(await Cqrs.SendAsync(cmd));

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
        => Ok(await Cqrs.SendAsync(new DeleteCertificationCommand { Id = id }));
}
```

### Frontend Implementation Order

**1. Models**
```typescript
export class Certification {
    id?: string;
    employeeId: string = '';
    name: string = '';
    issueDate: Date = new Date();
    expiryDate: Date = new Date();
    status: CertificationStatus = CertificationStatus.Active;
    fileId?: string;

    constructor(data?: Partial<Certification>) {
        Object.assign(this, data);
    }

    get isExpiring(): boolean {
        return this.status === CertificationStatus.Expiring;
    }

    get isExpired(): boolean {
        return this.status === CertificationStatus.Expired;
    }
}

export enum CertificationStatus {
    Active = 1,
    Expiring = 2,
    Expired = 3
}
```

**2. API Service**
```typescript
@Injectable({ providedIn: 'root' })
export class CertificationApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Certification';
    }

    getByEmployee(employeeId: string): Observable<Certification[]> {
        return this.get(`/employee/${employeeId}`);
    }

    save(cmd: SaveCertificationCommand): Observable<SaveCertificationResult> {
        return this.post('', cmd);
    }

    delete(id: string): Observable<void> {
        return this.delete(`/${id}`);
    }
}
```

**3. Store**
```typescript
export interface CertificationState {
    certifications: Certification[];
    selectedEmployeeId?: string;
}

@Injectable()
export class CertificationStore extends PlatformVmStore<CertificationState> {
    protected initialState: CertificationState = {
        certifications: []
    };

    loadByEmployee = this.effect<string>((employeeId$) =>
        employeeId$.pipe(
            tap(id => this.updateState({ selectedEmployeeId: id })),
            switchMap(id =>
                this.api.getByEmployee(id).pipe(
                    this.observerLoadingErrorState('load'),
                    this.tapResponse(certs => this.updateState({ certifications: certs }))
                )
            )
        )
    );

    readonly certifications$ = this.select(s => s.certifications);
    readonly expiringCertifications$ = this.select(s =>
        s.certifications.filter(c => c.isExpiring || c.isExpired)
    );
}
```

**4. Components**
```typescript
@Component({
    selector: 'app-certification-list',
    template: `
        <app-loading [target]="this">
            @if (vm(); as vm) {
                <div class="certification-list">
                    @for (cert of vm.certifications; track cert.id) {
                        <div class="certification-list__item"
                             [class.--expiring]="cert.isExpiring"
                             [class.--expired]="cert.isExpired">
                            <span class="certification-list__name">{{ cert.name }}</span>
                            <span class="certification-list__expiry">{{ cert.expiryDate | date }}</span>
                        </div>
                    }
                </div>
            }
        </app-loading>
    `,
    providers: [CertificationStore]
})
export class CertificationListComponent extends AppBaseVmStoreComponent<CertificationState, CertificationStore> {
    @Input() employeeId!: string;

    ngOnInit() {
        this.store.loadByEmployee(this.employeeId);
    }
}
```

## Step 5: Testing Phase

### Backend Tests

**Unit tests:**
```csharp
public class CertificationTests
{
    [Fact]
    public void UpdateStatus_ShouldSetExpired_WhenExpiryPassed()
    {
        var cert = new Certification { ExpiryDate = DateTime.UtcNow.AddDays(-1) };
        cert.UpdateStatus();
        Assert.Equal(CertificationStatus.Expired, cert.Status);
    }
}
```

**Integration tests:**
```csharp
public class SaveCertificationCommandTests : IntegrationTestBase
{
    [Fact]
    public async Task Handle_ShouldCreateCertification_WhenValid()
    {
        var cmd = new SaveCertificationCommand
        {
            EmployeeId = TestData.EmployeeId,
            Name = "AWS Certified",
            IssueDate = DateTime.UtcNow,
            ExpiryDate = DateTime.UtcNow.AddYears(3)
        };

        var result = await Cqrs.SendAsync(cmd);

        Assert.NotNull(result.Certification);
        Assert.Equal(CertificationStatus.Active, result.Certification.Status);
    }
}
```

### Frontend Tests

**Component tests:**
```typescript
describe('CertificationListComponent', () => {
    it('should display certifications', () => {
        const certs = [new Certification({ name: 'AWS' })];
        component.store.updateState({ certifications: certs });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('AWS');
    });
});
```

## Step 6: Verification Phase

### Code Review Checklist

- [ ] Follows Clean Architecture layers
- [ ] Uses platform patterns (repository, CQRS, validation)
- [ ] Authorization implemented (controller + handler + entity)
- [ ] Input validation complete
- [ ] Error handling proper
- [ ] Tests passing
- [ ] No code duplication
- [ ] Performance acceptable
- [ ] Documentation updated

### Manual Testing

- [ ] Create certification (happy path)
- [ ] Create with validation errors
- [ ] Update existing certification
- [ ] Delete certification
- [ ] List certifications by employee
- [ ] Expiry warning displays
- [ ] Background job runs
- [ ] Notification sent on expiry
- [ ] Authorization enforced
- [ ] File upload works

## Step 7: Documentation

### Update Documentation

**README updates:**
```markdown
## Features
- Employee certification tracking
- Expiry date warnings
- Automatic status updates
- File attachments
```

**API documentation:**
```markdown
### Certification Endpoints

POST /api/Certification
- Save certification
- Auth: Admin, Manager, Employee

GET /api/Certification/employee/{employeeId}
- Get certifications by employee
- Auth: Admin, Manager, Employee
```

## Common Implementation Mistakes

### Backend

**❌ Wrong: Skip validation**
```csharp
protected override async Task<Result> HandleAsync(Cmd req, CancellationToken ct)
{
    var entity = new Entity { Name = req.Name };
    await repo.CreateAsync(entity, ct);
}
```

**✅ Correct: Validate thoroughly**
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required");

protected override async Task<PlatformValidationResult<Cmd>> ValidateRequestAsync(...)
    => await v.AndAsync(r => repo.GetByIdAsync(r.Id, ct).ThenValidate(e => e != null));
```

### Frontend

**❌ Wrong: No subscription cleanup**
```typescript
ngOnInit() {
    this.api.getData().subscribe(d => this.data = d);
}
```

**✅ Correct: Use untilDestroyed**
```typescript
ngOnInit() {
    this.api.getData()
        .pipe(this.untilDestroyed())
        .subscribe(d => this.data = d);
}
```

## References

- [CLAUDE.md](../../CLAUDE.md)
- [docs/claude/architecture.md](../../docs/claude/architecture.md)
- [docs/claude/backend-patterns.md](../../docs/claude/backend-patterns.md)
- [docs/claude/frontend-patterns.md](../../docs/claude/frontend-patterns.md)
- [src/PlatformExampleApp](../../src/PlatformExampleApp)
