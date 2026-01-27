# EasyPlatform Code Patterns - Backend

> Referenced by: Claude hooks (auto-injected), Copilot instruction files (linked), Gemini context.
> Do NOT duplicate this content — always reference this file.

## EasyPlatform Backend Code Patterns

## Backend Patterns

### 1. Clean Architecture

```csharp
// Domain Layer
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public static Expression<Func<Employee, bool>> IsActiveExpr() => e => e.Status == Status.Active;
}

public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }

// Application Layer - CQRS Handler
public class SaveEmployeeCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
    {
        var employee = await repository.GetByIdAsync(req.Id, ct);
        employee.Name = req.Name;
        var saved = await repository.CreateOrUpdateAsync(employee, ct);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - Controller
[ApiController, Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}
```

### 2. Repository Pattern

```csharp
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// Extension pattern
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Entity.CodeExpr(code), ct).EnsureFound();

    public static async Task<List<Entity>> GetByIdsValidatedAsync(this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

    public static async Task<string> GetIdByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();
}
```

### 3. Repository API

```csharp
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);
```

### 4. Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");

// Async validation
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(p => r.Ids.Contains(p.Id) && p.IsExternal, ct), "Externals not allowed");

// Chained with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid range")
        .Of<IPlatformCqrsRequest>();

// Ensure pattern
var entity = await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

### 5. Cross-Service Communication

```csharp
public class EmployeeEventProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }

public class EmployeeEventConsumer : PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEventBusMessage msg) { /* sync logic */ }
}
```

### 6. Full-Text Search

```csharp
var queryBuilder = repository.GetQueryBuilder(q => q
    .Where(t => t.IsActive)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns(), fullTextAccurateMatch: true)));

var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct)
);

// Entity search columns
public static Expression<Func<Entity, object>>[] SearchColumns() => [e => e.Name, e => e.Code];
```

### 7. CQRS Command Pattern (Command + Result + Handler in ONE file)

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { public EntityDto Entity { get; set; } = null!; }

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEntityCommand> v, CancellationToken ct)
        => await v.AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct).ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repo.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));
        await entity.ValidateAsync(repo, ct).EnsureValidAsync();
        var saved = await repo.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

### 8. Query Pattern

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler : PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        var qb = repo.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repo.CountAsync((uow, q) => qb(uow, q), ct),
            repo.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct, e => e.Related)
        );
        return new GetEntityListQueryResult(items, total, req);
    }
}
```

### 9. Event-Driven Side Effects

```csharp
// ❌ WRONG - direct side effect
await repo.CreateAsync(entity, ct);
await notificationService.SendAsync(entity);

// ✅ CORRECT - just save, platform auto-raises event
await repo.CreateAsync(entity, ct);

// Event handler (UseCaseEvents/[Feature]/)
internal sealed class SendNotificationOnCreateHandler : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => !e.RequestContext.IsSeedingTestingData() && e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

### 10. Entity Pattern

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent] public string Name { get; set; } = "";
    public string? ParentId { get; set; }

    // Navigation properties - two collection patterns supported
    // Pattern 1: Forward navigation (FK on this entity)
    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ParentId))]
    public Entity? Parent { get; set; }

    // Pattern 2: Reverse navigation (child has FK pointing to parent)
    // Supports .Where() filtering: e => e.Children.Where(c => c.IsActive)
    [JsonIgnore]
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(ParentId))]
    public List<Entity>? Children { get; set; }

    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code) => e => e.CompanyId == companyId && e.Code == code;
    public static Expression<Func<Entity, bool>> FilterExpr(List<Status> s) => e => s.ToHashSet().Contains(e.Status!.Value);
    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId) => OfCompanyExpr(companyId).AndAlsoIf(true, () => e => e.IsActive);
    public static Expression<Func<Entity, object?>>[] SearchColumns() => [e => e.Name, e => e.Code];

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    // Computed property (MUST have empty set for serialization)
    [ComputedEntityProperty] public bool IsRoot { get => Id == RootId; set { } }
    [ComputedEntityProperty] public string FullName { get => $"{First} {Last}".Trim(); set { } }

    public static List<string> ValidateEntity(Entity? e) => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
}

// Loading navigation properties
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Parent);                    // Forward
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Children!);                 // Reverse
await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Children!.Where(c => c.IsActive)); // Reverse + filter
```

### 11. Entity DTO Pattern

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { Id = e.Id; Name = e.Name ?? u?.Name ?? ""; }

    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public OrgDto? Company { get; set; }

    public EmployeeDto WithCompany(Org c) { Company = new OrgDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee e, MapToEntityModes m) { e.Name = Name; return e; }
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

### 12. Fluent Helpers

```csharp
.With(e => e.Name = x).WithIf(cond, e => e.Status = Active)
.Then(e => e.Process()).ThenAsync(async e => await e.ValidateAsync(ct))
.EnsureFound("Not found").EnsureFoundAllBy(x => x.Id, ids).EnsureValidAsync()
.AndAlso(expr).AndAlsoIf(cond, () => expr).OrElse(expr)
.ThenSelect(e => e.Id).ParallelAsync(async i => await Process(i), maxConcurrent: 10)

var (entity, files) = await (repo.CreateOrUpdateAsync(e, ct), files.ParallelAsync(f => Upload(f, ct)));
```

### 13. Background Jobs

```csharp
// Cron expression examples:
// "0 0 * * *"    = Daily at midnight
// "0 3 * * *"    = Daily at 3 AM
// "*/5 * * * *"  = Every 5 minutes
// "0 0 * * 0"    = Weekly on Sunday at midnight
// "0 0 1 * *"    = Monthly on 1st at midnight

[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class PagedJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? p, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repo.GetAllAsync(q => Query(q).PageBy(skip, take)).Then(items => items.ParallelAsync(Process));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> p) => await repo.CountAsync(Query);
}

[PlatformRecurringJob("0 0 * * *")]  // Daily at midnight
[PlatformRecurringJob("*/5 * * * *", executeOnStartUp: true)]  // Every 5 min + run on startup
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? p, string? k) => q.WhereIf(k != null, e => e.CompanyId == k);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? p, string? k) => EntitiesQueryBuilder(q, p, k).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> e, string k, object? p, IServiceProvider sp) => await e.ParallelAsync(Process);
}

// Scrolling pattern (data affected by processing, always queries from start)
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);

// Job coordination (master schedules child jobs)
await companies.ParallelAsync(async cId => await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
    BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

### 14. Message Bus Consumer

```csharp
internal sealed class EntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage m, string r) => true;
    public override async Task HandleLogicAsync(EntityEventBusMessage m, string r)
    {
        if (m.Payload.CrudAction == Created || (m.Payload.CrudAction == Updated && !m.Payload.EntityData.IsDeleted))
        {
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == m.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == m.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p));
            if (companyMissing || userMissing) return;

            var existing = await repo.FirstOrDefaultAsync(e => e.Id == m.Payload.EntityData.Id);
            if (existing == null) await repo.CreateAsync(m.Payload.EntityData.ToEntity().With(e => e.LastSyncDate = m.CreatedUtcDate));
            else if (existing.LastSyncDate <= m.CreatedUtcDate) await repo.UpdateAsync(m.Payload.EntityData.UpdateEntity(existing).With(e => e.LastSyncDate = m.CreatedUtcDate));
        }
        if (m.Payload.CrudAction == Deleted) await repo.DeleteAsync(m.Payload.EntityData.Id);
    }
}
```

### 15. Data Migration

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext db)
    {
        var qb = repo.GetQueryBuilder(q => q.Where(Filter()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => qb(q)), 200, ExecutePage, qb);
    }

    static async Task<List<Entity>> ExecutePage(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> r, IPlatformUnitOfWorkManager u)
    {
        using var uow = u.Begin();
        var items = await r.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await r.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await uow.CompleteAsync();
        return items;
    }
}
```

### 16. Multi-Database Support

```csharp
// Entity Framework Core (SQL Server/PostgreSQL)
public class MyEfCorePersistenceModule : PlatformEfCorePersistenceModule<MyDbContext>
{
    protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(IServiceProvider sp)
        => options => options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection"));
}

// MongoDB
public class MyMongoPersistenceModule : PlatformMongoDbPersistenceModule<MyDbContext>
{
    protected override void ConfigureMongoOptions(PlatformMongoOptions<MyDbContext> options)
    {
        options.ConnectionString = Configuration.GetSection("MongoDB:ConnectionString").Value;
        options.Database = Configuration.GetSection("MongoDB:Database").Value;
    }
}
```

---

## Authorization

```csharp
// Controller
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost] public async Task<IActionResult> Save([FromBody] Cmd c) => Ok(await Cqrs.SendAsync(c));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
              .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity filter
public static Expression<Func<E, bool>> AccessExpr(string userId, string companyId) => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

---

## Migration

```csharp
// EF Core
public partial class AddField : Migration { protected override void Up(MigrationBuilder m) { m.AddColumn<string>("Dept", "Employees"); } }

// MongoDB
public class MigrateData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_Migrate";
    public override async Task Execute() => await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => q.Where(...)), 200,
        async (skip, take, r, u) => { var items = await r.GetAllAsync(q => q.Skip(skip).Take(take)); await r.UpdateManyAsync(items, dismissSendEvent: true); return items; });
}

// Cross-DB migration (first-time setup, use events for ongoing sync)
public class SyncData : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);
    public override async Task Execute(TargetDbContext db) => await targetRepo.CreateManyAsync(
        (await sourceDbContext.Entities.Where(e => e.CreatedDate < cutoffDate).ToListAsync()).Select(e => e.MapToTargetEntity()));
}
```

---

## Helper vs Util

```csharp
// Helper (with dependencies)
public class EntityHelper { private readonly IRepo<E> repo; public async Task<E> GetOrCreateAsync(string code, CancellationToken ct) => await repo.FirstOrDefaultAsync(t => t.Code == code, ct) ?? await CreateAsync(code, ct); }

// Util (pure functions)
public static class EntityUtil { public static string FullName(E e) => $"{e.First} {e.Last}".Trim(); public static bool IsActive(E e) => e.Status == Active; }
```

---

## Advanced Backend

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty() / .RemoveWhere(pred, out removed) / .UpsertBy(key, items, update) / .SelectList(sel) / .ThenSelect(sel) / .ParallelAsync(fn, max) / .AddDistinct(item, key)

var entity = dto.NotHasSubmitId() ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId()) : await repo.GetByIdAsync(dto.Id, ct).Then(x => dto.UpdateToEntity(x));

RequestContext.CurrentCompanyId() / .UserId() / .ProductScope() / .HasRequestAdminRoleInCompany()

var (a, b, c) = await (repo1.GetAllAsync(...), repo2.GetAllAsync(...), repo3.GetAllAsync(...));

public sealed class Helper : IPlatformHelper { private readonly IPlatformApplicationRequestContext ctx; public Helper(IPlatformApplicationRequestContextAccessor a) { ctx = a.Current; } }

.With(e => e.Name = x).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(async () => await svc.Any(), async e => await e.Sync())

public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m) => BaseExpr(s, c).AndAlso(e => e.User!.IsActive).AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));

// Domain Service Pattern (strategy for permissions)
public static class PermissionService {
    static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<E, bool>> GetCanManageExpr(IList<string> roles) => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Object Deep Comparison
if (prop.GetValue(entity).IsValuesDifferent(prop.GetValue(existing))) entity.AddFieldUpdatedEvent(prop, oldVal, newVal);

// Task Extensions
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

---

## Anti-Patterns

```csharp
// ❌ Direct cross-service DB access → ✅ Use message bus
// ❌ Custom repository interface → ✅ Use platform repo + extensions
// ❌ Manual validation throw → ✅ Use PlatformValidationResult fluent API
// ❌ Side effects in handler → ✅ Use entity event handlers
// ❌ DTO mapping in handler → ✅ DTO owns mapping via MapToObject()/MapToEntity()

// ✅ Correct DTO mapping
public sealed class ConfigDto : PlatformDto<ConfigValue> { public override ConfigValue MapToObject() => new() { ClientId = ClientId }; }
var config = req.Config.MapToObject().With(p => p.Secret = encrypt(p.Secret));
```

---

## Templates

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult> { public string Name { get; set; } = ""; public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required"); }
internal sealed class Save{E}CommandHandler : PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult> { protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command r, CancellationToken ct) { /* impl */ } }
```
