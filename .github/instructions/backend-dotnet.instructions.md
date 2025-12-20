---
applyTo: "src/**/*.cs,**/*.csproj"
---

# EasyPlatform .NET Backend Development Instructions

## Clean Architecture Layers

**Domain Layer**: Entities, domain events, value objects
**Application Layer**: CQRS handlers, events, jobs, validators
**Persistence Layer**: DbContext, migrations, repository implementations
**Service Layer**: Controllers, startup configuration

```csharp
// Domain Entity
public sealed class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    public static Expression<Func<Employee, bool>> IsActiveExpr()
        => e => e.Status == Status.Active;

    public static Expression<Func<Employee, object>>[] SearchColumns()
        => [e => e.Name, e => e.Code];
}
```

## Repository Pattern

**ALWAYS use platform repositories** - never create custom repository interfaces.

```csharp
// Repository injection
private readonly IPlatformQueryableRootRepository<Employee, string> repository;

// Repository extensions (static expressions)
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string code,
        CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Employee.CodeExpr(code), ct)
            .EnsureFound($"Employee not found: {code}");

    public static async Task<List<Employee>> GetByIdsValidatedAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        List<string> ids,
        CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct)
            .EnsureFoundAllBy(p => p.Id, ids);
}
```

## Repository API

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
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);

// Query
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);

// Query Builder (for complex queries)
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == companyId)
    .WhereIf(condition, e => e.Status == Status.Active)
    .OrderBy(e => e.Name));

// Count and existence
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);

// Parallel tuple queries
var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).Skip(0).Take(10), ct)
);
```

## Validation Patterns

**Use PlatformValidationResult fluent API** - never throw exceptions manually.

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
        .And(_ => Age >= 18, "Must be 18 or older")
        .And(_ => Email.Contains("@"), "Invalid email format");

// Async validation in handler
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> v,
    CancellationToken ct)
    => await v
        .AndAsync(r => repository.GetByIdsAsync(r.RelatedIds, ct)
            .ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {string.Join(", ", ids)}"))
        .AndNotAsync(r => repository.AnyAsync(p => p.Code == r.Code, ct), "Code already exists");

// Chained with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid date range")
        .Of<IPlatformCqrsRequest>();

// Ensure pattern
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Entity not found: {id}")
    .Then(x => x.Validate().EnsureValid());
```

## CQRS File Organization

**Command + Result + Handler in ONE file** - never split into separate files.

```csharp
// SaveEntityCommand.cs - contains all three components

public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public List<string> RelatedIds { get; set; } = [];

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

internal sealed class SaveEntityCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEntityCommand> v,
        CancellationToken ct)
        => await v
            .AndAsync(r => repository.GetByIdsAsync(r.RelatedIds, ct)
                .ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Related entities not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req,
        CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await entity.ValidateAsync(repository, ct).EnsureValidAsync();

        var saved = await repository.CreateOrUpdateAsync(entity, ct);

        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

## Event-Driven Side Effects

**NEVER call side effects in command handlers** - use entity event handlers.

```csharp
// ❌ WRONG - direct side effect in handler
protected override async Task<SaveResult> HandleAsync(SaveCommand req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity); // ❌ WRONG
    return new SaveResult { Id = entity.Id };
}

// ✅ CORRECT - just save, platform auto-raises event
protected override async Task<SaveResult> HandleAsync(SaveCommand req, CancellationToken ct)
{
    var saved = await repository.CreateOrUpdateAsync(entity, ct);
    return new SaveResult { Id = saved.Id };
}

// Event handler in UseCaseEvents/[Feature]/ folder
internal sealed class SendNotificationOnCreateHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => !e.RequestContext.IsSeedingTestingData()
        && e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> e,
        CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

## Entity Patterns

```csharp
public sealed class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    [JsonIgnore]
    public Company? Company { get; set; }

    // Static expressions for queries
    public static Expression<Func<Employee, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Employee, bool>> FilterExpr(List<Status> statuses)
        => e => statuses.ToHashSet().Contains(e.Status!.Value);

    // Composite expressions
    public static Expression<Func<Employee, bool>> CompositeExpr(string companyId)
        => OfCompanyExpr(companyId).AndAlsoIf(true, () => e => e.IsActive);

    // Search columns for full-text search
    public static Expression<Func<Employee, object?>>[] SearchColumns()
        => [e => e.Name, e => e.Code];

    // Computed properties (MUST have empty setter for serialization)
    [ComputedEntityProperty]
    public bool IsRoot { get => Id == RootId; set { } }

    [ComputedEntityProperty]
    public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }

    // Validation
    public static List<string> ValidateEntity(Employee? e)
        => e == null ? ["Not found"]
            : !e.IsActive ? ["Employee is inactive"]
            : [];
}
```

## DTO Mapping Patterns

**DTOs own mapping logic** - never map in handlers.

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }

    public EmployeeDto(Employee e, User? u) : base(e)
    {
        Id = e.Id;
        Name = e.Name ?? u?.Name ?? "";
    }

    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public CompanyDto? Company { get; set; }

    public EmployeeDto WithCompany(Company c)
    {
        Company = new CompanyDto(c);
        return this;
    }

    protected override object? GetSubmittedId() => Id;

    protected override string GenerateNewId() => Ulid.NewUlid().ToString();

    protected override Employee MapToEntity(Employee e, MapToEntityModes m)
    {
        e.Name = Name;
        return e;
    }
}

// Usage in handler
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

## Fluent Helpers

```csharp
// With pattern (mutation)
entity.With(e => e.Name = "New")
    .WithIf(condition, e => e.Status = Status.Active);

// Then pattern (transformation)
await repository.GetByIdAsync(id, ct)
    .Then(e => e.Process())
    .ThenAsync(async e => await e.ValidateAsync(ct));

// Ensure pattern (validation)
var entity = await repository.FirstOrDefaultAsync(expr, ct)
    .EnsureFound("Entity not found");

await repository.GetByIdsAsync(ids, ct)
    .EnsureFoundAllBy(e => e.Id, ids);

// Expression composition
var expr = baseExpr.AndAlso(e => e.IsActive)
    .AndAlsoIf(condition, () => e => e.Status == Status.Pending)
    .OrElse(e => e.IsAdmin);

// Parallel processing
await items.ParallelAsync(async i => await ProcessAsync(i, ct), maxConcurrent: 10);

// Tuple results
var (entity, files) = await (
    repository.CreateOrUpdateAsync(e, ct),
    files.ParallelAsync(f => UploadAsync(f, ct))
);
```

## Background Jobs

```csharp
// Daily job at 3 AM
[PlatformRecurringJob("0 3 * * *")]
public sealed class DailyReportJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param,
        IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repository.GetAllAsync(q => Query(q).PageBy(skip, take))
            .Then(items => items.ParallelAsync(ProcessAsync));

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> p)
        => await repository.CountAsync(Query);
}

// Every 5 minutes + run on startup
[PlatformRecurringJob("*/5 * * * *", executeOnStartUp: true)]
public sealed class SyncJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;

    protected override IQueryable<Entity> EntitiesQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey)
        => q.WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey)
        => EntitiesQueryBuilder(q, param, batchKey)
            .Select(e => e.CompanyId)
            .Distinct();

    protected override async Task ProcessEntitiesAsync(
        List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
        => await entities.ParallelAsync(ProcessAsync);
}
```

## Message Bus Consumers

```csharp
internal sealed class EmployeeEventConsumer
    : PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    public override async Task<bool> HandleWhen(
        EmployeeEventBusMessage msg, string routingKey)
        => true;

    public override async Task HandleLogicAsync(
        EmployeeEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Created
            || (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            var existing = await repository.FirstOrDefaultAsync(
                e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(
                    msg.Payload.EntityData.ToEntity()
                        .With(e => e.LastSyncDate = msg.CreatedUtcDate));
            else if (existing.LastSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(
                    msg.Payload.EntityData.UpdateEntity(existing)
                        .With(e => e.LastSyncDate = msg.CreatedUtcDate));
        }

        if (msg.Payload.CrudAction == Deleted)
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

## Anti-Patterns

```csharp
// ❌ WRONG: Direct cross-service DB access
var data = await otherDbContext.Entities.ToListAsync();

// ✅ CORRECT: Use message bus
public class EntityEventConsumer : PlatformApplicationMessageBusConsumer<EntityMessage> { }

// ❌ WRONG: Custom repository interface
public interface IEmployeeRepository { Task<Employee> GetByCodeAsync(string code); }

// ✅ CORRECT: Repository extensions with static expressions
public static class EmployeeRepositoryExtensions {
    public static async Task<Employee> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Employee.CodeExpr(code), ct).EnsureFound();
}

// ❌ WRONG: Manual validation throw
if (string.IsNullOrEmpty(Name)) throw new Exception("Name required");

// ✅ CORRECT: PlatformValidationResult fluent API
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");

// ❌ WRONG: Mapping in handler
var config = new Config { Name = req.Dto.Name, Code = req.Dto.Code };

// ✅ CORRECT: DTO owns mapping
var config = req.Dto.MapToObject().With(c => c.CreatedBy = RequestContext.UserId());
```
