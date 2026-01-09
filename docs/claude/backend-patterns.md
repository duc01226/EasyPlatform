# Backend Development Patterns

> CQRS, Repository, Entity, Validation, Message Bus, Background Jobs

## Clean Architecture Layers

```csharp
// Domain Layer - Business entities and rules (non-audited)
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;

    public static Expression<Func<Employee, bool>> IsActiveExpression()
        => e => e.Status == EmployeeStatus.Active;
}

// Domain Layer - Business entities with audit trails
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;
}

// Application Layer - CQRS handlers
public class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Validate and get dependencies
        var employee = await repository.GetByIdAsync(request.Id, cancellationToken);

        // Step 2: Apply business logic
        employee.FirstName = request.FirstName;

        // Step 3: Save and return result
        var saved = await repository.CreateOrUpdateAsync(employee, cancellationToken);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - API controllers
[ApiController]
[Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> SaveEmployee([FromBody] SaveEmployeeCommand command)
        => Ok(await Cqrs.SendAsync(command));
}
```

## Repository Pattern

### Priority Order (CRITICAL)

```csharp
// PRIMARY - Platform queryable repository (for query operations)
IPlatformQueryableRootRepository<Employee, string>

// ALTERNATIVE - Base repository (when queryable not needed)
IPlatformRootRepository<Employee, string>

// Best Practice: Create repository extensions
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IPlatformQueryableRootRepository<Employee, string> repository,
        string email, CancellationToken cancellationToken = default)
    {
        return await repository.GetSingleOrDefaultAsync(
            Employee.ByEmailExpression(email), cancellationToken);
    }
}
```

### Repository API Reference

```csharp
// CREATE
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);

// UPDATE
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// CREATE OR UPDATE (Upsert)
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);

// DELETE
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);

// GET BY ID
var entity = await repository.GetByIdAsync(id, cancellationToken);
// With eager loading
var entity = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: p => p.Employee, p => p.Company);

// GET SINGLE
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// GET MULTIPLE
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// QUERY BUILDERS (Reusable Queries)
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));

// COUNT & EXISTS
var count = await repository.CountAsync(expr, cancellationToken);
var exists = await repository.AnyAsync(expr, cancellationToken);
```

## Validation Patterns

```csharp
// Basic Sync Validation - Use PlatformValidationResult fluent API
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 18, "Employee must be 18 or older")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required");
}

// Async Validation - Override ValidateRequestAsync
protected override async Task<PlatformValidationResult<SaveLeaveRequestCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveLeaveRequestCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async request => await employeeRepository
            .GetByIdsAsync(request.WatcherIds, cancellationToken)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(request.WatcherIds,
                notFoundIds => $"Not found: {notFoundIds}"));
}

// Negative Validation - AndNotAsync
return await requestSelfValidation.AndNotAsync(
    request => employeeRepository.AnyAsync(
        p => request.Ids.Contains(p.Id) && p.IsExternalUser == true, ct),
    "External users can't perform this action");

// Ensure Pattern - Inline validation that throws
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Entity not found: {id}")
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());
```

**Naming Conventions:**
| Pattern | Return Type | Behavior |
|---------|-------------|----------|
| `Validate[Context]()` | `PlatformValidationResult<T>` | Never throws, returns result |
| `Ensure[Context]Valid()` | `void` or `T` | Throws if invalid |

## CQRS Implementation Patterns

> **CRITICAL:** Command/Query + Handler + Result: ALL in ONE file

```csharp
// File: SaveEntityCommand.cs - Contains Command + Result + Handler

// COMMAND
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required");
    }
}

// COMMAND RESULT (stays in same file)
public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

// COMMAND HANDLER
internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    private readonly IServiceRepository<Entity> repository;

    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req, CancellationToken ct)
    {
        // 1. Get or create
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // 2. Save
        var saved = await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

### Query Pattern with GetQueryBuilder

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(
        GetEntityListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        // Parallel tuple queries
        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct)
        );

        return new GetEntityListQueryResult(items, total, req);
    }
}
```

## Entity Development Patterns

```csharp
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

    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
        => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

    // Search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code, e => e.Email];

    // Computed properties - MUST have empty set { } for EF Core
    [ComputedEntityProperty]
    public string FullName
    {
        get => $"{FirstName} {LastName}".Trim();
        set { }  // Required empty setter
    }
}
```

## Entity DTO Patterns

> Reusable Entity DTOs MUST extend `PlatformEntityDto<TEntity, TKey>`

```csharp
public class EmployeeEntityDto : PlatformEntityDto<Employee, string>
{
    public EmployeeEntityDto() { }

    public EmployeeEntityDto(Employee entity, User? userEntity) : base(entity)
    {
        Id = entity.Id;
        FullName = entity.FullName ?? userEntity?.FullName ?? "";
        Email = userEntity?.Email ?? "";
    }

    public string? Id { get; set; }
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";

    // Optional load properties (via With* methods)
    public OrganizationEntityDto? AssociatedCompany { get; set; }

    // With* fluent methods
    public EmployeeEntityDto WithFullAssociatedCompany(OrganizationalUnit company)
    {
        AssociatedCompany = new OrganizationEntityDto(company);
        return this;
    }

    // Platform overrides
    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee entity, MapToEntityModes mode)
    {
        entity.FullName = FullName;
        return entity;
    }
}
```

## Event-Driven Side Effects (CRITICAL)

> **NEVER call side effects directly in command handlers.** Use entity events instead.

```csharp
// WRONG: Direct side effect in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // BAD!
    return new Result();
}

// CORRECT: Platform auto-raises events - handle in event handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(newEntity, ct);  // Event raised automatically
    return new Result();
}

// Event handler (in UseCaseEvents/ folder)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

## Background Job Patterns

```csharp
// Pattern 1: Simple Paged
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(int? skip, int? take,
        object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }
}

// Pattern 2: Batch Scrolling (multi-tenant)
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;      // Entities per company

    protected override IQueryable<Entity> EntitiesQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);
}

// Cron schedules
[PlatformRecurringJob("0 0 * * *")]              // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + startup
```

## Message Bus Patterns

```csharp
internal sealed class UpsertOrDeleteEntityConsumer :
    PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        // Wait for dependencies
        var (companyMissing, userMissing) = await (
            Util.TaskRunner.TryWaitUntilAsync(
                () => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId),
                maxWaitSeconds: 300).Then(p => !p),
            Util.TaskRunner.TryWaitUntilAsync(
                () => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId),
                maxWaitSeconds: 300).Then(p => !p)
        );

        if (companyMissing || userMissing) return;

        // CREATE/UPDATE
        if (msg.Payload.CrudAction == Created ||
            (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            var existing = await repository.FirstOrDefaultAsync(
                e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity()
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing)
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }

        // DELETE
        if (msg.Payload.CrudAction == Deleted ||
            (msg.Payload.CrudAction == Updated && msg.Payload.EntityData.IsDeleted))
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

**Message Naming Convention:**
| Type | Producer Role | Pattern | Example |
|------|---------------|---------|---------|
| Event | Leader | `<ServiceName><Feature><Action>EventBusMessage` | `CandidateJobBoardApiSyncCompletedEventBusMessage` |
| Request | Follower | `<ConsumerServiceName><Feature>RequestBusMessage` | `JobCreateNonexistentJobsRequestBusMessage` |

## Data Migration Patterns

```csharp
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

    private static async Task<List<Entity>> ExecutePaging(
        int skip, int take,
        Func<IQueryable<Entity>, IQueryable<Entity>> qb,
        IRepo<Entity> repo, IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();
        var items = await repo.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await unitOfWork.CompleteAsync();
        return items;
    }
}
```

## Full-Text Search Patterns

```csharp
// Inject IPlatformFullTextSearchPersistenceService in query handlers
var queryBuilder = employeeRepository.GetQueryBuilder(query =>
    query
        .Where(Employee.OfficialEmployeeExpr(RequestContext.ProductScope()))
        .PipeIf(
            request.SearchText.IsNotNullOrEmpty(),
            query => fullTextSearchPersistenceService.Search(
                query,
                request.SearchText,
                Employee.DefaultFullTextSearchColumns(),
                fullTextAccurateMatch: true,
                includeStartWithProps: Employee.DefaultFullTextSearchColumns()
            )
        )
);

// Define searchable columns in entity
public static Expression<Func<Employee, object>>[] DefaultFullTextSearchColumns()
{
    return new Expression<Func<Employee, object>>[]
    {
        e => e.FullName,
        e => e.Email,
        e => e.EmployeeCode
    };
}
```

## Authorization Patterns

```csharp
// Controller level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(
            e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company only");
}

// Entity-level query filter
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

## Helper vs Util Decision Guide

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
│   └── Location: {Service}.Application\Helpers\EmployeeHelper.cs
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils

Cross-Cutting Logic (used in multiple domains)?
├── YES → Platform Util (Easy.Platform.Application.Utils)
└── NO → Domain Util ({Service}.Application.Utils)
```

## Navigation Property Loading

> Load related entities via `[PlatformNavigationProperty]` attribute for repositories where the underlying persistence doesn't natively support eager loading (e.g., MongoDB). For EF Core, use `loadRelatedEntities` parameter.

### Two Collection Patterns Supported

| Pattern | Use Case | Configuration |
|---------|----------|---------------|
| **FK List** | Parent has `List<Id>` (e.g., `ProjectIds`) | `ForeignKeyProperty` + `Cardinality = Collection` |
| **Reverse Navigation** | Child has FK to parent (e.g., `Project.EmployeeId`) | `ReverseForeignKeyProperty` |

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// ENTITY DEFINITION - Mark navigation properties with attribute
// ═══════════════════════════════════════════════════════════════════════════

public class Employee : RootEntity<Employee, string>
{
    public string DepartmentId { get; set; } = "";

    // Pattern 1: Single navigation - FK on this entity
    [PlatformNavigationProperty(nameof(DepartmentId))]
    public Department? Department { get; set; }

    // Pattern 2: Collection via FK list - this entity has List<TKey>
    public List<string> ProjectIds { get; set; } = [];

    [PlatformNavigationProperty(nameof(ProjectIds), Cardinality = PlatformNavigationCardinality.Collection)]
    public List<Project>? Projects { get; set; }

    // Pattern 3: Reverse navigation - child has FK pointing to parent
    // Example: Project has EmployeeId FK, load all projects for this employee
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Project.AssignedEmployeeId))]
    public List<Project>? AssignedProjects { get; set; }
}

public class Category : RootEntity<Category, string>
{
    public string? ParentCategoryId { get; set; }

    // Forward navigation (parent → child)
    [PlatformNavigationProperty(nameof(ParentCategoryId))]
    public Category? ParentCategory { get; set; }

    // Reverse navigation (parent ← children)
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(ParentCategoryId))]
    public List<Category>? ChildCategories { get; set; }
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING PATTERNS
// ═══════════════════════════════════════════════════════════════════════════

// 1. SINGLE ENTITY - Forward navigation (FK on this entity)
var employee = await repository.GetByIdAsync(id, ct);
await employee.LoadNavigationAsync(e => e.Department, ct);

// 2. SINGLE ENTITY - Reverse navigation (children have FK to this entity)
var category = await repository.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildCategories!);

// 3. REVERSE NAVIGATION WITH .Where() FILTER - Load only matching children
var category = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: c => c.ChildCategories!.Where(child => child.IsActive));

// 4. BATCH LOADING - Single DB call for N+1 prevention (uses IN clause)
var categories = await repository.GetByIdsAsync(ids, ct,
    loadRelatedEntities: c => c.ChildCategories!);
// Results in: SELECT * FROM Categories WHERE ParentCategoryId IN (@id1, @id2, ...)

// 5. BATCH WITH FILTER - Filter applied to all children
var categories = await repository.GetByIdsAsync(ids, ct,
    loadRelatedEntities: c => c.ChildCategories!.Where(child => child.IsActive));

// 6. CHAINED LOADING (Task extension)
var employees = await repository.GetAllAsync(expr, ct)
    .LoadNavigationAsync(e => e.Department, resolver, ct);
```

**Attribute Options:**
| Option | Default | Description |
|--------|---------|-------------|
| `ForeignKeyProperty` | `""` | FK property on THIS entity (e.g., `nameof(DepartmentId)`) |
| `ReverseForeignKeyProperty` | `null` | FK property on RELATED entity pointing to this entity (e.g., `nameof(Project.EmployeeId)`) |
| `Cardinality` | `Single` | `Single` = TKey FK, `Collection` = `List<TKey>` FK |
| `MaxDepth` | `3` | Max recursive loading depth (circular reference protection) |

**Key Behaviors:**
- **BsonIgnore:** Auto-set by MongoDB convention for MongoDB repositories - no manual attribute needed
- **JsonIgnore:** Add manually if nav prop should be excluded from API responses
- **FK Not Found:** Silent null (no exception or warning)
- **Empty Children:** Returns empty `List<>`, not null, when no children exist
- **Batch Loading:** Uses single query with `IN` clause - efficient N+1 prevention
- **.Where() Filtering:** Only supported for single-level reverse navigation, not deep chains
- **Cross-Service:** Not supported - use message bus instead
- **EF Core:** Use `loadRelatedEntities` parameter (e.g., `GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company)`)
