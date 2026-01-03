---
applyTo: 'src/PlatformExampleApp/**/*.cs,src/Platform/**/*.cs'
excludeAgent: ['copilot-code-review']
description: '.NET backend development patterns for EasyPlatform microservices'
---

# Backend .NET Development Patterns

## Required Reading

**For comprehensive C# patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`**

This guide contains complete patterns for CQRS, validation, repositories, entity events, background jobs, migrations, and more.

---

## Repository Pattern (CRITICAL)

**Always use service-specific repositories:**

```csharp
// Preferred - Service-specific
IPlatformQueryableRootRepository<Employee>           // TextSnippet
IPlatformQueryableRootRepository<Job>     // TextSnippet
IPlatformQueryableRootRepository<Survey>    // TextSnippet

// Fallback only when service-specific not available
IPlatformQueryableRootRepository<Entity, Key>
```

## Repository API Complete Reference

```csharp
// CREATE
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);

// UPDATE
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, cancellationToken);

// CREATE OR UPDATE (Upsert)
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);

// DELETE
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, cancellationToken);

// GET BY ID
var entity = await repository.GetByIdAsync(id, cancellationToken);
// With eager loading
var entity = await repository.GetByIdAsync(id, cancellationToken,
    loadRelatedEntities: p => p.Employee, p => p.Company);

// GET SINGLE
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// GET MULTIPLE
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// QUERY BUILDERS (Reusable Queries)
var query = repository.GetQuery(uow);
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));

// COUNT & EXISTS
var count = await repository.CountAsync(expr, cancellationToken);
var exists = await repository.AnyAsync(expr, cancellationToken);
```

## Repository Extension Pattern

```csharp
// Location: {Service}.Domain\Repositories\Extensions\{Entity}RepositoryExtensions.cs
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByGetUniqueExpr(
        this IPlatformQueryableRootRepository<Employee> employeeRepository,
        int productScope,
        string employeeCompanyId,
        string employeeUserId,
        CancellationToken cancellationToken = default,
        params Expression<Func<Employee, object?>>[] loadRelatedEntities)
    {
        return await employeeRepository
            .FirstOrDefaultAsync(
                Employee.UniqueExpr(productScope, employeeCompanyId, employeeUserId),
                cancellationToken,
                loadRelatedEntities)
            .EnsureFound();
    }

    // Projected result (performance optimization)
    public static async Task<string> GetEmployeeIdByGetUniqueExpr(
        this IPlatformQueryableRootRepository<Employee> employeeRepository,
        int productScope,
        string employeeCompanyId,
        string employeeUserId,
        CancellationToken cancellationToken = default)
    {
        return await employeeRepository
            .FirstOrDefaultAsync(
                queryBuilder: query => query
                    .Where(Employee.UniqueExpr(productScope, employeeCompanyId, employeeUserId))
                    .Select(p => p.Id),  // Projection - only fetch ID
                cancellationToken: cancellationToken)
            .EnsureFound();
    }
}
```

## CQRS Pattern (Command + Handler + Result = ONE FILE)

**File location:** `{Service}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs`

```csharp
// Command
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<IFormFile> Files { get; set; } = [];

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
            .And(_ => FromDate <= ToDate, "Invalid date range");
    }
}

// Result (same file)
public sealed class SaveEmployeeCommandResult : PlatformCqrsCommandResult
{
    public EmployeeDto Entity { get; set; } = null!;
}

// Handler (same file)
internal sealed class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    private readonly IPlatformQueryableRootRepository<Employee> repository;

    // Async validation
    protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEmployeeCommand> validation, CancellationToken ct)
    {
        return await validation
            .AndAsync(req => repository.GetByIdsAsync(req.RelatedIds, ct)
                .ThenValidateFoundAllAsync(req.RelatedIds, ids => $"Not found: {ids}"));
    }

    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req, CancellationToken ct)
    {
        // 1. Get or create
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // 2. Validate and save (parallel operations)
        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        var (saved, files) = await (
            repository.CreateOrUpdateAsync(entity, ct),
            req.Files.ParallelAsync(f => fileService.UploadAsync(f, ct))
        );

        return new SaveEmployeeCommandResult { Entity = new EmployeeDto(saved) };
    }
}
```

## Query Pattern with GetQueryBuilder

```csharp
// Query
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

// Handler
internal sealed class GetEntityListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    private readonly IServiceRepository<Entity> repository;
    private readonly IPlatformFullTextSearchPersistenceService searchService;

    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        // Parallel tuple queries
        var (total, items, counts) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct, e => e.RelatedEntity),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
        );

        return new GetEntityListQueryResult(items, total, req, counts.ToDictionary(x => x.Status, x => x.Count));
    }
}
```

## Validation Patterns

```csharp
// Sync validation (in Command class)
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required")
        .And(_ => Util.TimeZoneParser.TryGetTimeZoneById(TimeZone) != null, "TimeZone is invalid")
        .And(_ => StartDate <= EndDate, "Invalid range");
}

// Async validation (in Handler)
protected override async Task<PlatformValidationResult<SaveLeaveRequestCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveLeaveRequestCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async request => await employeeRepository
            .GetByIdsAsync(request.WatcherIds, cancellationToken)
            .ThenSelect(existingEmployee => existingEmployee.Id)
            .ThenValidateFoundAllAsync(
                request.WatcherIds,
                notFoundIds => $"Not found watcher ids: {PlatformJsonSerializer.Serialize(notFoundIds)}"))
        .AndNotAsync(
            request => employeeRepository.AnyAsync(
                p => request.Data.OwnerEmployeeIds.Contains(p.Id) && p.IsExternalUser == true,
                cancellationToken),
            "External users can't create a goal"
        );
}

// Chained Validation with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return this
        .Validate(p => p.CheckInEventId.IsNotNullOrEmpty(), "CheckInEventId is required")
        .And(
            p => p.UpdateType == ActionTypes.SingleCheckIn ||
                 (p.UpdateType == ActionTypes.SeriesAndFollowingCheckIn &&
                  p.FrequencyInfo != null &&
                  p.ToUpdateCheckInDate.Date >= Clock.UtcNow.Date),
            "New CheckIn date must greater than Current date OR Missing FrequencyInfo")
        .Of<IPlatformCqrsRequest>();
}

// Ensure Pattern - Inline validation that throws
var toSaveCheckInEvent = await checkInEventRepository
    .GetByIdAsync(request.CheckInEventId, cancellationToken)
    .EnsureFound($"CheckIn Event not found, Id : {request.CheckInEventId}")
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());
```

## Full-Text Search Patterns

```csharp
// Inject IPlatformFullTextSearchPersistenceService in query handlers
protected override async Task<GetEmployeeListQueryResult> HandleAsync(
    GetEmployeeListQuery request, CancellationToken cancellationToken)
{
    var queryBuilder = employeeRepository.GetQueryBuilder(query =>
        query
            .Where(Employee.OfficialEmployeeExpr(RequestContext.ProductScope()))
            .PipeIf(
                request.SearchText.IsNotNullOrEmpty(),
                query => fullTextSearchPersistenceService.Search(
                    query,
                    request.SearchText,
                    Employee.DefaultFullTextSearchColumns(),  // Define searchable properties
                    fullTextAccurateMatch: true,              // true = exact phrase, false = fuzzy
                    includeStartWithProps: Employee.DefaultFullTextSearchColumns()
                )
            )
    );

    var (totalCount, pagedItems) = await (
        employeeRepository.CountAsync((uow, query) => queryBuilder(uow, query), cancellationToken),
        employeeRepository.GetAllAsync(
            (uow, query) => queryBuilder(uow, query)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(request.SkipCount, request.MaxResultCount),
            cancellationToken)
    );

    return new GetEmployeeListQueryResult(pagedItems, totalCount, request);
}

// Define searchable columns in entity
public partial class Employee : RootEntity<Employee, string>
{
    public static Expression<Func<Employee, object>>[] DefaultFullTextSearchColumns()
    {
        return new Expression<Func<Employee, object>>[]
        {
            e => e.FullName,
            e => e.Email,
            e => e.PhoneNumber,
            e => e.EmployeeCode,
            e => e.FullTextSearch
        };
    }
}
```

## Entity Event Handlers (Side Effects)

**Never call side effects in command handlers!** Use entity event handlers:

```csharp
// Location: UseCaseEvents/{Feature}/Send{Action}On{Event}{Entity}EntityEventHandler.cs
internal sealed class SendNotificationOnCreateEmployeeEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Employee>  // Single generic parameter!
{
    private readonly INotificationService notificationService;

    public SendNotificationOnCreateEmployeeEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
    }

    // Filter: Only handle Created events - NOTE: async Task<bool>, not bool!
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Employee> @event,
        CancellationToken ct)
    {
        var entity = @event.EntityData;
        await notificationService.SendAsync(entity);
    }
}
```

## Entity Development Patterns

```csharp
// Entity with field tracking and static expressions
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    public string CompanyId { get; set; } = "";

    [JsonIgnore]
    public Company? Company { get; set; }

    // Static expression patterns
    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Entity, bool>> FilterByStatusExpr(List<Status> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => e.Status.HasValue && statusSet.Contains(e.Status.Value);
    }

    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
        => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

    // Search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code, e => e.Email];

    // Computed properties - MUST have empty set { } for EF Core compatibility
    [ComputedEntityProperty]
    public bool IsRoot
    {
        get => Id == RootId;
        set { }  // Required empty setter
    }

    [ComputedEntityProperty]
    public string FullName
    {
        get => $"{FirstName} {LastName}".Trim();
        set { }  // Required empty setter
    }

    // Instance methods
    public void Reset() { /* ... */ }

    public static List<string> ValidateEntity(Entity? entity)
    {
        var errors = new List<string>();
        if (entity == null) errors.Add("Entity not found");
        if (!entity.IsActive) errors.Add("Entity inactive");
        return errors;
    }
}
```

## Entity DTO Patterns

```csharp
// Location: {Service}.Application\EntityDtos\EmployeeEntityDto.cs
public class EmployeeEntityDto : PlatformEntityDto<Employee, string>
{
    public EmployeeEntityDto() { }

    public EmployeeEntityDto(Employee entity, User? userEntity) : base(entity)
    {
        Id = entity.Id;
        EmployeeId = entity.Id!;
        FullName = entity.FullName ?? userEntity?.FullName ?? "";
        Email = userEntity?.Email ?? "";
        Position = entity.Position;
        Status = entity.Status;
    }

    // Core properties
    public string? Id { get; set; }
    public string EmployeeId { get; set; } = "";
    public string FullName { get; set; } = "";

    // Optional load properties (via With* methods)
    public OrganizationEntityDto? AssociatedCompany { get; set; }
    public List<OrganizationEntityDto>? Departments { get; set; }

    // With* fluent methods for optional loading
    public EmployeeEntityDto WithFullAssociatedCompany(OrganizationalUnit company)
    {
        AssociatedCompany = new OrganizationEntityDto(company);
        return this;
    }

    public EmployeeEntityDto WithAssociatedDepartments(List<OrganizationalUnit> departments)
    {
        Departments = departments.Select(org => new OrganizationEntityDto(org)).ToList();
        return this;
    }

    // Platform overrides
    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();

    protected override Employee MapToEntity(Employee entity, MapToEntityModes mode)
    {
        entity.Position = Position;
        entity.Status = Status;
        return entity;
    }
}

// Usage in Query Handler
var employees = await repository.GetAllAsync(expr, ct, e => e.User, e => e.Departments);
var dtos = employees.SelectList(e => new EmployeeEntityDto(e, e.User)
    .WithAssociatedDepartments(e.Departments?.SelectList(d => d.OrganizationalUnit!) ?? []));
```

## Fluent Helpers

```csharp
// Mutation helpers
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .WithIf(condition, e => e.Status = Status.Active);

// Transformation helpers
var dto = await repository.GetByIdAsync(id)
    .Then(e => e.PerformLogic())
    .ThenAsync(async e => await e.ValidateAsync(service, ct));

// Safety helpers
await entity.ValidateAsync(repo, ct).EnsureValidAsync();
var entity = await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");
var items = await repository.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);

// Expression composition
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds));

// Collection helpers
var ids = await repository.GetByIdsAsync(ids, ct).ThenSelect(e => e.Id);
await items.ParallelAsync(async item => await ProcessAsync(item, ct), maxConcurrent: 10);

// Parallel operations
var (entity, files) = await (
    repository.CreateOrUpdateAsync(entity, ct),
    files.ParallelAsync(f => fileService.UploadAsync(f, path, ct))
);
```

## Background Job Patterns

```csharp
// Pattern 1: Simple Paged (skip/take pagination)
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }

    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}

// Pattern 2: Batch Scrolling (two-level: batch keys + entities within batch)
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;     // Entities per company

    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey).Select(e => e.CompanyId).Distinct();

    protected override async Task ProcessEntitiesAsync(List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
    {
        await entities.ParallelAsync(async e => await ProcessEntity(e), maxConcurrent: 1);
    }
}

// Cron schedules
[PlatformRecurringJob("0 0 * * *")]              // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + on startup
```

## Message Bus Patterns

```csharp
// Entity Event Consumer
internal sealed class UpsertOrDeleteEntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    private readonly IServiceRepository<Entity> repository;

    public override async Task<bool> HandleWhen(EntityEventBusMessage msg, string routingKey)
        => true;  // Filter logic here

    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        // CREATE/UPDATE
        if (msg.Payload.CrudAction == Created || (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            // Wait for dependencies
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p)
            );

            if (companyMissing || userMissing) return;  // Skip if dependencies missing

            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity().With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }

        // DELETE
        if (msg.Payload.CrudAction == Deleted || (msg.Payload.CrudAction == Updated && msg.Payload.EntityData.IsDeleted))
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

## Data Migration Patterns

```csharp
// Data migration with paging
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<Entity>> ExecutePaging(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> repo, IPlatformUnitOfWorkManager uow)
    {
        using (var unitOfWork = uow.Begin())
        {
            var items = await repo.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
            await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, cancellationToken: default);
            await unitOfWork.CompleteAsync();
            return items;
        }
    }
}
```

## Authorization Patterns

```csharp
// Controller level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));

// Command handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company only");
}

// Entity-level query filter
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage
var employees = await repository.GetAllAsync(Employee.OfCompanyExpr(companyId).AndAlso(Employee.UserCanAccessExpr(userId, companyId)), ct);
```

## Helper vs Util Decision Guide

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
│   └── Location: {Service}.Application\Helpers\{Entity}Helper.cs
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils or {Service}.Application.Utils
```

```csharp
// Helper pattern (with dependencies)
public class EmployeeHelper
{
    private readonly IPlatformQueryableRootRepository<Employee> repository;

    public async Task<Employee> GetOrCreateEmployeeAsync(string userId, string companyId, CancellationToken ct)
    {
        return await repository.FirstOrDefaultAsync(Employee.UniqueExpr(userId, companyId), ct)
            ?? await CreateEmployeeAsync(userId, companyId, ct);
    }
}

// Util pattern (pure functions)
public static class EmployeeUtil
{
    public static string GetFullName(Employee e) => $"{e.FirstName} {e.LastName}".Trim();
    public static bool IsActive(Employee e) => e.Status == EmploymentStatus.Active && !e.TerminationDate.HasValue;
}
```

## Advanced Patterns Reference

```csharp
// List Extensions
.IsNullOrEmpty() / .IsNotNullOrEmpty()
.RemoveWhere(predicate, out removedItems)
.UpsertBy(keySelector, items, updateFn)
.SelectList(selector)  // Like Select().ToList()
.ThenSelect(selector)  // For Task<List<T>>
.ForEachAsync(async action, maxConcurrent)

// Request Context Methods
RequestContext.CurrentCompanyId() / .UserId() / .ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()

// Task Tuple Await Pattern
var (users, companies, settings) = await (
    userRepository.GetAllAsync(...),
    companyRepository.GetAllAsync(...),
    settingsRepository.GetAllAsync(...)
);

// Conditional Actions
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .PipeActionIf(condition, e => e.UpdateTimestamp())
    .PipeActionAsyncIf(async () => await externalService.Any(), async e => await e.SyncExternal());

// Advanced Expression Composition
public static Expression<Func<Employee, bool>> CanBeReviewParticipantExpr(int scope, string companyId, int? minMonths, string? eventId)
    => OfficialEmployeeExpr(scope, companyId)
        .AndAlso(e => e.User != null && e.User.IsActive)
        .AndAlsoIf(minMonths != null, () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value))
        .AndAlsoIf(eventId.IsNotNullOrEmpty(), () => e => e.ReviewParticipants.Any(p => p.EventId == eventId));
```

## Anti-Patterns

- **Never** create separate files for Command/Handler/Result
- **Never** call side effects (notifications, external APIs) in handlers
- **Never** map DTO to entity in handler (use DTO's `MapToEntity()`)
- **Never** use generic repository when service-specific exists
- **Never** catch exceptions in handler (let platform handle)
- **Never** add manual `AddDomainEvent()` - platform auto-raises entity events on CRUD
