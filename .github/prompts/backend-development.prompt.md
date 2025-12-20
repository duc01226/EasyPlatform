---
description: "EasyPlatform .NET 9 backend patterns (CQRS, Repository, Events)"
---

# EasyPlatform Backend Development

Complete .NET 9 backend development patterns for EasyPlatform framework.

## Quick Decision Tree

```
Backend Task?
├─ API endpoint?
│  ├─ Create/Update/Delete → CQRS Command
│  └─ Read/Query → CQRS Query
├─ Business entity?
│  └─ Entity Development
├─ Side effects (notifications, emails, external APIs)?
│  └─ Entity Event Handler (NEVER in command handlers!)
├─ Data transformation/backfill?
│  └─ Migration
├─ Scheduled/recurring task?
│  └─ Background Job
└─ Cross-service sync?
   └─ Message Bus (NEVER direct DB access!)
```

## Critical Rules

1. **Repository:** Use `IPlatformQueryableRootRepository<TEntity, TKey>`
2. **Validation:** Use `PlatformValidationResult` fluent API - NEVER throw exceptions
3. **Side Effects:** Handle in Entity Event Handlers - NEVER in command handlers
4. **DTO Mapping:** DTOs own mapping via `MapToEntity()` / `MapToNewEntity()`
5. **Cross-Service:** Use message bus - NEVER direct database access
6. **File Organization:** Command + Result + Handler in ONE file

## 1. CQRS Commands

**Purpose:** Create, Update, Delete operations

**File:** `UseCaseCommands/{Feature}/Save{Entity}Command.cs`

**Structure:** Command + Result + Handler in ONE file

```csharp
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required")
            .And(_ => Email.IsNotNullOrEmpty(), "Email required");
}

public sealed class SaveEmployeeCommandResult : PlatformCqrsCommandResult
{
    public EmployeeDto Employee { get; set; } = null!;
}

internal sealed class SaveEmployeeCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    // Async validation (optional)
    protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEmployeeCommand> v, CancellationToken ct)
        => await v
            .AndNotAsync(r => repository.AnyAsync(e => e.Id != r.Id && e.Email == r.Email, ct),
                         "Email already exists");

    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req, CancellationToken ct)
    {
        var employee = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).EnsureFound()
                .Then(e => req.UpdateEntity(e));

        await employee.ValidateAsync(repository, ct).EnsureValidAsync();
        var saved = await repository.CreateOrUpdateAsync(employee, ct);

        return new SaveEmployeeCommandResult { Employee = new EmployeeDto(saved) };
    }
}
```

**Controller:**
```csharp
[ApiController, Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd)
        => Ok(await Cqrs.SendAsync(cmd));
}
```

## 2. CQRS Queries

**Purpose:** Read operations with filtering, search, pagination

**File:** `UseCaseQueries/{Feature}/Get{Entity}ListQuery.cs`

```csharp
public sealed class GetEmployeeListQuery
    : PlatformCqrsPagedQuery<GetEmployeeListQueryResult, EmployeeDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEmployeeListQueryHandler
    : PlatformCqrsQueryApplicationHandler<GetEmployeeListQuery, GetEmployeeListQueryResult>
{
    protected override async Task<GetEmployeeListQueryResult> HandleAsync(
        GetEmployeeListQuery req, CancellationToken ct)
    {
        var qb = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(),
                q => searchService.Search(q, req.SearchText, Employee.SearchColumns())));

        var (total, items) = await (
            repository.CountAsync((uow, q) => qb(uow, q), ct),
            repository.GetAllAsync((uow, q) => qb(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.Skip, req.Take), ct, e => e.Company)
        );

        return new GetEmployeeListQueryResult(
            items.SelectList(e => new EmployeeDto(e)), total, req);
    }
}
```

## 3. Entity Development

**File:** `{Service}.Domain/Entities/{Entity}.cs`

```csharp
[TrackFieldUpdatedDomainEvent]  // Auto-track field changes
public sealed class Employee : RootAuditedEntity<Employee, string, string>
{
    // Regular properties
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string CompanyId { get; set; } = "";

    // Navigation properties (use [JsonIgnore])
    [JsonIgnore]
    public Company? Company { get; set; }

    // Computed properties (MUST have empty setter)
    [ComputedEntityProperty]
    public string DisplayName { get => $"{Code} - {Name}"; set { } }

    // Static expressions (for queries)
    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;

    public static Expression<Func<Employee, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Employee, object?>>[] SearchColumns()
        => [e => e.Name, e => e.Code, e => e.Email];

    // Validation
    public async Task<PlatformValidationResult> ValidateAsync(
        IPlatformRepository<Employee> repo, CancellationToken ct)
        => await PlatformValidationResult.Valid()
            .And(() => Name.IsNotNullOrEmpty(), "Name required")
            .And(() => Email.IsNotNullOrEmpty(), "Email required")
            .AndNotAsync(() => repo.AnyAsync(e => e.Id != Id && e.Code == Code, ct),
                        "Code already exists");
}
```

**Expression Composition:**
```csharp
// Combine expressions with .AndAlso(), .OrElse(), .AndAlsoIf()
public static Expression<Func<Employee, bool>> FilterExpr(string companyId, bool activeOnly)
    => OfCompanyExpr(companyId)
        .AndAlsoIf(activeOnly, () => e => e.Status == Status.Active);
```

## 4. Entity Event Handlers (Side Effects)

**CRITICAL:** NEVER call side effects in command handlers!

**File:** `UseCaseEvents/{Feature}/Send{Action}On{Event}{Entity}Handler.cs`

```csharp
internal sealed class SendNotificationOnCreateEmployeeHandler
    : PlatformCqrsEntityEventApplicationHandler<Employee>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> e)
    {
        // Skip if seeding test data
        if (e.RequestContext.IsSeedingTestingData()) return false;

        // Only for create actions
        return e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Employee> e, CancellationToken ct)
    {
        await notificationService.SendAsync(
            e.EntityData.Id,
            e.RequestContext.UserId());
    }
}
```

**Available CRUD Actions:**
- `Created`
- `Updated`
- `Deleted`

## 5. Repository Pattern

**Use Platform Repositories:**
```csharp
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed
```

**Common Operations:**
```csharp
// Create
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);

// Update
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// Create or Update
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);

// Delete
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(e => e.Status == Status.Deleted, ct);

// Read
await repository.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);

// Query
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);
var qb = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
```

**Repository Extensions:**
```csharp
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Employee.CodeExpr(code), ct)
            .EnsureFound($"Employee not found: {code}");

    public static async Task<List<Employee>> GetByIdsValidatedAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(e => ids.Contains(e.Id), ct)
            .EnsureFoundAllBy(e => e.Id, ids);
}
```

## 6. Validation Patterns

**Sync Validation:**
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+")
        .And(_ => Email.Contains("@"), "Invalid email");
```

**Async Validation:**
```csharp
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct)
            .ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {string.Join(", ", ids)}"))
        .AndNotAsync(r => repo.AnyAsync(e => e.Code == r.Code && e.Id != r.Id, ct),
                    "Code already exists");
```

**Ensure Pattern:**
```csharp
var entity = await repo.GetByIdAsync(id, ct)
    .EnsureFound($"Not found: {id}")
    .Then(e => e.Validate().EnsureValid());
```

## 7. Background Jobs

**Decision Tree:**
- Data doesn't change → `PlatformApplicationPagedBackgroundJobExecutor`
- Data changes, multi-tenant → `PlatformApplicationBatchScrollingBackgroundJobExecutor`
- Data changes, single-tenant → `ExecuteInjectScopedScrollingPagingAsync`

**Paged Job:**
```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class ProcessPendingJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => q.Where(e => e.Status == Status.Pending));

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param,
        IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => q
            .Where(e => e.Status == Status.Pending)
            .OrderBy(e => e.Id)
            .PageBy(skip, take));

        await items.ParallelAsync(ProcessItem, maxConcurrent: 5);
    }
}
```

**Cron Reference:**
- `"0 0 * * *"` - Daily at midnight
- `"0 3 * * *"` - Daily at 3 AM
- `"*/5 * * * *"` - Every 5 minutes
- `"0 0 * * 0"` - Weekly on Sunday
- `"0 0 1 * *"` - Monthly on 1st

## 8. Message Bus (Cross-Service)

**Producer (Source Service):**
```csharp
internal sealed class EmployeeEventProducer
    : PlatformCqrsEntityEventBusMessageProducer<EmployeeMessage, Employee, string>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> e)
        => !e.RequestContext.IsSeedingTestingData();
}
```

**Consumer (Target Service):**
```csharp
internal sealed class UpsertEmployeeConsumer
    : PlatformApplicationMessageBusConsumer<EmployeeMessage>
{
    public override async Task HandleLogicAsync(EmployeeMessage msg, string routingKey)
    {
        // Wait for dependencies
        var exists = await Util.TaskRunner.TryWaitUntilAsync(
            () => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId),
            maxWaitSeconds: 300);
        if (!exists) return;

        // Handle delete
        if (msg.Payload.CrudAction == Deleted)
        {
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
            return;
        }

        // Upsert with race condition prevention
        var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
        if (existing == null)
            await repository.CreateAsync(msg.Payload.EntityData.ToEntity()
                .With(e => e.LastSyncDate = msg.CreatedUtcDate));
        else if (existing.LastSyncDate <= msg.CreatedUtcDate)
            await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing)
                .With(e => e.LastSyncDate = msg.CreatedUtcDate));
    }
}
```

## 9. Fluent Helpers

**Common Extensions:**
```csharp
// With
entity.With(e => e.CreatedBy = userId)
      .WithIf(condition, e => e.Status = Active);

// Then
await repo.GetByIdAsync(id, ct)
    .Then(e => e.Process())
    .ThenAsync(async e => await e.ValidateAsync(ct));

// Ensure
await repo.GetByIdAsync(id, ct).EnsureFound("Not found");
await items.EnsureFoundAllBy(x => x.Id, requestedIds);

// Expression composition
expr.AndAlso(e => e.IsActive)
    .AndAlsoIf(condition, () => e => e.Type == type)
    .OrElse(e => e.IsDefault);

// Parallel execution
await items.ParallelAsync(async item => await Process(item), maxConcurrent: 10);
```

## Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|-------|
| `throw new ValidationException()` | `PlatformValidationResult` fluent API |
| Side effects in handler | Entity Event Handler |
| DTO mapping in handler | `dto.MapToEntity()` |
| Direct cross-service DB | Message bus |
| Separate Command/Handler files | ONE file |

## Verification Checklist

Before completing backend task:

- [ ] Uses `IPlatformQueryableRootRepository<T, K>`
- [ ] Validation uses fluent API (`.And()`, `.AndAsync()`)
- [ ] No side effects in command handlers
- [ ] DTO owns mapping
- [ ] Cross-service uses message bus
- [ ] Command + Result + Handler in ONE file
- [ ] Tests exist and pass

## Bottom Line

**Core patterns:**
1. CQRS for all API operations
2. Repository for all data access
3. Entity Event Handlers for side effects
4. Message Bus for cross-service
5. Validation fluent API everywhere
6. Background Jobs for scheduled tasks

**Follow the patterns. They exist for a reason.**
