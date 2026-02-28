# Backend Development Patterns — Project Reference

> **Companion doc for generic skills.** Contains project-specific CQRS patterns, repository conventions, entity examples, validation, message bus, background jobs, and migration patterns. Generic skills reference this file via "MUST READ `backend-patterns-reference.md`".

> CQRS, Repository, Entity, Validation, Message Bus, Background Jobs

## BravoSUITE Service-Specific Repositories

```csharp
// ALWAYS use service-specific repositories (CRITICAL)
ICandidatePlatformRootRepository<T>    // bravoTALENTS
IGrowthRootRepository<T>               // bravoGROWTH
ISurveysPlatformRootRepository<T>      // bravoSURVEYS

// Create repository extensions for complex queries
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this ICandidatePlatformRootRepository<Employee> repo,
        string email, CancellationToken ct = default)
        => await repo.GetSingleOrDefaultAsync(Employee.ByEmailExpression(email), ct);
}
```

## BravoSUITE Namespace Conventions

| Service                  | Application Namespace          | Domain Namespace          | Service Path                                   |
| ------------------------ | ------------------------------ | ------------------------- | ---------------------------------------------- |
| bravoGROWTH              | `Growth.Application`           | `Growth.Domain`           | `src/Services/bravoGROWTH/`                    |
| bravoTALENTS (Candidate) | `Candidate.Application`        | `Candidate.Domain`        | `src/Services/bravoTALENTS/Candidate.Service/` |
| bravoTALENTS (Talent)    | `Talent.Application`           | `Talent.Domain`           | `src/Services/bravoTALENTS/Talent.Service/`    |
| bravoTALENTS (Job)       | `Job.Application`              | `Job.Domain`              | `src/Services/bravoTALENTS/Job.Service/`       |
| bravoTALENTS (Employee)  | `Employee.Application`         | `Employee.Domain`         | `src/Services/bravoTALENTS/Employee.Service/`  |
| bravoSURVEYS             | `LearningPlatform.Application` | `LearningPlatform.Domain` | `src/Services/bravoSURVEYS/LearningPlatform/`  |
| bravoINSIGHTS            | `Analyze.Application`          | `Analyze.Domain`          | `src/Services/bravoINSIGHTS/Analyze/`          |
| Accounts                 | `BravoAccount.Application`     | `BravoAccount.Domain`     | `src/Services/Accounts/`                       |

## BravoSUITE Migration Patterns

MongoDB data migrations in bravoGROWTH: `src/Services/bravoGROWTH/Growth.Persistence/DataMigrations/`
EF Core migrations in bravoTALENTS: `src/Services/bravoTALENTS/{Service}.Persistence/Migrations/`

## BravoSUITE Database Configuration

| Service                  | Database  | Type       |
| ------------------------ | --------- | ---------- |
| bravoGROWTH              | Growth    | MongoDB    |
| bravoTALENTS (Candidate) | Candidate | MongoDB    |
| bravoTALENTS (Employee)  | Employee  | SQL Server |
| bravoTALENTS (Talent)    | Talent    | MongoDB    |
| bravoTALENTS (Job)       | Job       | MongoDB    |
| bravoSURVEYS             | Surveys   | MongoDB    |
| bravoINSIGHTS            | Insights  | MongoDB    |
| Accounts                 | Accounts  | PostgreSQL |

## BravoSUITE Message Bus Examples

```csharp
// RabbitMQ message naming convention
// Event (Producer is leader): {ServiceName}{Feature}{Action}EventBusMessage
// Request (Consumer asks): {ConsumerService}{Feature}RequestBusMessage

// Example: Accounts creates user → Growth syncs employee
public class AccountUserEntityEventBusMessage : PlatformBusMessage<PlatformCqrsEntityEventBusMessagePayload<User>> { }

// Consumer in Growth service
internal sealed class UpsertOrDeleteEmployeeFromAccountUserConsumer
    : PlatformApplicationMessageBusConsumer<AccountUserEntityEventBusMessage>
{
    public override async Task HandleLogicAsync(AccountUserEntityEventBusMessage msg, string routingKey) { ... }
}
```

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
// 1. ALWAYS prioritize microservice-specific repositories
ICandidatePlatformRootRepository<Employee>    // bravoTALENTS
IGrowthRootRepository<Employee>               // bravoGROWTH
ISurveysPlatformRootRepository<Survey>        // bravoSURVEYS

// 2. Alternative: Platform generic repositories (when service-specific not available)
IPlatformQueryableRootRepository<Entity, Key>

// 3. Best Practice: Create service-specific repository extensions
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this ICandidatePlatformRootRepository<Employee> repository,
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
```

### Index Configuration Patterns

#### MongoDB Index Setup

```csharp
// In DbContext class
public async Task EnsureEmployeeIndexesAsync(bool recreate = false)
{
    if (recreate) await EmployeeCollection.Indexes.DropAllAsync();

    await EmployeeCollection.Indexes.CreateManyAsync([
        // Single field index
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys.Ascending(p => p.UserId)),

        // Compound index (order matters for leftmost prefix rule)
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Ascending(p => p.CompanyId)
                .Ascending(p => p.UserId)
                .Ascending(p => p.Status)),

        // Unique constraint index
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Ascending(p => p.UserId)
                .Ascending(p => p.CompanyId)
                .Ascending(p => p.ProductScope),
            new CreateIndexOptions { Unique = true }),

        // Text index for full-text search
        new CreateIndexModel<Employee>(
            Builders<Employee>.IndexKeys
                .Text(p => p.FullName)
                .Text(p => p.EmployeeEmail),
            new CreateIndexOptions { Name = "IX_Employee_TextSearch" })
    ]);
}
```

**Index Selection Strategy:**

1. **Identify query patterns:** Analyze most frequent expressions in repository calls
2. **Field order:** Most selective fields first (e.g., `CompanyId` before `Status`)
3. **Leftmost prefix:** `CompanyId+Status` index supports `CompanyId` alone, but not `Status` alone
4. **Text vs Regular:** Use text indexes only for full-text search, not exact match

#### EF Core Index Configuration

```csharp
// In Entity Configuration (OnModelCreating)
builder.Entity<Employee>(entity =>
{
    // Composite index
    entity.HasIndex(e => new { e.CompanyId, e.Status, e.IsDeleted })
        .HasDatabaseName("IX_Employee_Active_Lookup");

    // Unique index
    entity.HasIndex(e => new { e.UserId, e.CompanyId })
        .IsUnique()
        .HasDatabaseName("IX_Employee_UserCompany_Unique");

    // Foreign key index (auto-created)
    entity.HasOne(e => e.Company)
        .WithMany(c => c.Employees)
        .HasForeignKey(e => e.CompanyId);
});
```

**Migration Best Practices:**

- Foreign keys auto-generate indexes (no manual `CreateIndex` needed)
- Composite indexes should match query filter order
- Use descriptive names: `IX_{Table}_{Purpose}` (e.g., `IX_Employee_Active_Lookup`)

```csharp
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

| Pattern                  | Return Type                   | Behavior                     |
| ------------------------ | ----------------------------- | ---------------------------- |
| `Validate[Context]()`    | `PlatformValidationResult<T>` | Never throws, returns result |
| `Ensure[Context]Valid()` | `void` or `T`                 | Throws if invalid            |

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

## Navigation Property Loading

> Load related entities via `[PlatformNavigationProperty]` attribute for repositories where the underlying persistence doesn't natively support eager loading (e.g., MongoDB). For EF Core, use `loadRelatedEntities` parameter.

### Entity Definition

```csharp
public class Employee : RootEntity<Employee, string>
{
    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 1: Forward Navigation (FK on THIS entity)
    // ═══════════════════════════════════════════════════════════════════
    public string DepartmentId { get; set; } = "";

    // Single navigation - auto-ignored in BSON for MongoDB, manual [JsonIgnore] if needed for API
    [JsonIgnore]
    [PlatformNavigationProperty(nameof(DepartmentId))]
    public Department? Department { get; set; }

    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 2: Collection via FK List (parent has List<TKey>)
    // ═══════════════════════════════════════════════════════════════════
    public List<string> ProjectIds { get; set; } = [];

    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ProjectIds), Cardinality = PlatformNavigationCardinality.Collection)]
    public List<Project>? Projects { get; set; }

    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 3: Reverse Navigation (child has FK pointing to parent)
    // ═══════════════════════════════════════════════════════════════════
    // Load children where child.ManagerId == this.Id
    [JsonIgnore]
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Employee.ManagerId))]
    public List<Employee>? DirectReports { get; set; }

    public string? ManagerId { get; set; }  // FK for reverse nav from Manager

    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ManagerId))]
    public Employee? Manager { get; set; }
}
```

### Loading via Repository (Recommended)

```csharp
// ═══════════════════════════════════════════════════════════════════
// SINGLE ENTITY - with navigation expressions
// ═══════════════════════════════════════════════════════════════════
// Single level
var employee = await repository.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Department!);

// Deep navigation (2-3 levels)
var snippet = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Category!.ParentCategory!.ParentCategory!);

// Multiple navigations in one call
var snippet = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Category!, e => e.Category!.ParentCategory!);

// ═══════════════════════════════════════════════════════════════════
// REVERSE NAVIGATION - load children where child.FK == parent.Id
// ═══════════════════════════════════════════════════════════════════
// All children
var parent = await repository.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildCategories!);

// With .Where() filter - only active children
var parent = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: c => c.ChildCategories!.Where(child => child.IsActive));

// ═══════════════════════════════════════════════════════════════════
// BATCH LOADING - N+1 prevention at all levels
// ═══════════════════════════════════════════════════════════════════
// Single level batch
var employees = await repository.GetByIdsAsync(ids, ct, loadRelatedEntities: e => e.Department!);

// Deep navigation batch
var snippets = await repository.GetByIdsAsync(ids, ct,
    loadRelatedEntities: e => e.Category!.ParentCategory!);

// Reverse navigation batch - single query for all parents
var parents = await repository.GetByIdsAsync(parentIds, ct,
    loadRelatedEntities: c => c.ChildCategories!.Where(child => child.IsActive));
```

### Manual Loading (Alternative)

```csharp
// Single entity - resolver auto-injected by repository
var employee = await repository.GetByIdAsync(id, ct);
await employee.LoadNavigationAsync(e => e.Department, ct);

// Batch loading - single DB call for N+1 prevention
var employees = await repository.GetAllAsync(expr, ct);
await employees.LoadNavigationAsync(e => e.Department, resolver, ct);

// Collection loading (one-to-many via FK list)
await employee.LoadCollectionNavigationAsync(e => e.Projects, ct);
```

### Attribute Options

| Option                      | Default  | Description                                                 |
| --------------------------- | -------- | ----------------------------------------------------------- |
| `ForeignKeyProperty`        | `""`     | FK property on THIS entity (e.g., `nameof(DepartmentId)`)   |
| `ReverseForeignKeyProperty` | `null`   | FK property on RELATED entity pointing to this entity       |
| `Cardinality`               | `Single` | `Single` = TKey FK, `Collection` = `List<TKey>` FK          |
| `MaxDepth`                  | `3`      | Max recursive loading depth (circular reference protection) |

### Two Collection Patterns

| Pattern         | Entity Definition                | Use Case                          |
| --------------- | -------------------------------- | --------------------------------- |
| **FK List**     | Parent has `List<TKey>` property | Many-to-many, explicit ID list    |
| **Reverse Nav** | Child has FK pointing to parent  | One-to-many, classic parent-child |

```csharp
// FK List Pattern: Employee owns the relationship
public List<string> ProjectIds { get; set; } = [];
[PlatformNavigationProperty(nameof(ProjectIds), Cardinality = Collection)]
public List<Project>? Projects { get; set; }

// Reverse Nav Pattern: Child owns the relationship
[PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Project.EmployeeId))]
public List<Project>? AssignedProjects { get; set; }  // Loads where Project.EmployeeId == this.Id
```

### Key Behaviors

- **BsonIgnore:** Auto-set by MongoDB convention - no manual attribute needed
- **JsonIgnore:** Add manually if nav prop should be excluded from API responses
- **FK Not Found:** Silent null (no exception or warning)
- **Batch Loading:** Always overwrites existing nav prop values
- **Empty Collection:** Returns empty `List<T>`, never null, when no children found
- **Where Filter:** Only supported for reverse navigation collections
- **Cross-Service:** Not supported - use message bus instead
- **EF Core:** Use `loadRelatedEntities` parameter (same syntax works)

---

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

## Async Collection Processing

> **NEVER `await` in `foreach`.** Use `.ParallelAsync()`.

```csharp
// ❌ foreach (var item in items) await ProcessAsync(item);
// ✅ await items.ParallelAsync(async item => await ProcessAsync(item));
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

| Type    | Producer Role | Pattern                                           | Example                                            |
| ------- | ------------- | ------------------------------------------------- | -------------------------------------------------- |
| Event   | Leader        | `<ServiceName><Feature><Action>EventBusMessage`   | `CandidateJobBoardApiSyncCompletedEventBusMessage` |
| Request | Follower      | `<ConsumerServiceName><Feature>RequestBusMessage` | `JobCreateNonexistentJobsRequestBusMessage`        |

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
│   └── Location: Growth.Application\Helpers\EmployeeHelper.cs
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils

Cross-Cutting Logic (used in multiple domains)?
├── YES → Platform Util (Easy.Platform.Application.Utils)
└── NO → Domain Util (Growth.Application.Utils)
```

## Integration Testing

Subcutaneous integration tests that boot the full DI container (real DB, real RabbitMQ, no HTTP layer). Tests dispatch CQRS commands/queries directly and assert database state.

> **Prerequisite:** The full backend system must be running before executing tests. Tests rely on real infrastructure (MongoDB, RabbitMQ, Redis, PostgreSQL) and running API services for cross-service data sync (message bus consumers, event handlers). Local: start via `Bravo-DevStarts/StartDocker/BRAVO-APIS-DOCKER-Start.cmd` and wait for all services to be healthy.

### Architecture (3-Layer Stack)

```
Platform (Easy.Platform.AutomationTest)     ← Generic, reusable across any project
  ├─ PlatformServiceIntegrationTestFixture<TModule>   xUnit fixture: DI bootstrap + module init + seeding
  ├─ PlatformServiceIntegrationTestBase<TModule>      Test base: Execute*, BeforeExecute*, static SP per closed generic
  ├─ PlatformServiceIntegrationTestWithAssertions<T>  Adds AssertEntity* helpers via abstract ResolveRepository<T>
  ├─ PlatformCrossServiceFixture                      Composes N service fixtures (sequential init, reverse dispose)
  ├─ PlatformIntegrationTestHelper                    Static: UniqueName, UniqueId, UniqueEmail, WaitUntilAsync
  ├─ PlatformAssertDatabaseState                      Static: EntityExistsAsync, EntityMatchesAsync, EntityDeletedAsync
  └─ PlatformIntegrationTestDataSeeder                Abstract: idempotent SeedAsync contract

Shared (Bravo.Shared.IntegrationTest)       ← BravoSUITE-specific, shared across services
  ├─ BravoTestUserContext                             POCO: Roles, OrgUnitRoles, CompanyId, UserId, DepartmentIds
  ├─ BravoTestUserContextFactory                      Static: CreateEmployee, CreateAdminUser, CreateHrManager, etc.
  └─ PopulateTestUserContextIntoRequestContextExtensions  Bridges test context → platform request context

Service (e.g., Growth.IntegrationTests)     ← Domain-specific test project
  ├─ GrowthIntegrationTestFixture                     Boots GrowthApiAspNetCoreModule, seeds via data seeder
  ├─ GrowthServiceIntegrationTestBase                 ResolveRepository → IGrowthRootRepository<T>, domain helpers
  └─ GrowthIntegrationTestDataSeeder                  Seeds FormTemplate, RequestTypes, KudosCompanySetting
```

### Platform Class Quick Reference

| Class                                             | Purpose                                                                              | Key Methods                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `PlatformServiceIntegrationTestFixture<T>`        | xUnit `ICollectionFixture` — builds DI, calls `module.InitializeAsync()`, seeds data | `BuildConfiguration()`, `SeedDataAsync()`, `ConfigureAdditionalServices()`                      |
| `PlatformServiceIntegrationTestBase<T>`           | Test base — static SP per closed generic, scoped execution                           | `ExecuteCommandAsync`, `ExecuteQueryAsync`, `ExecuteWithServicesAsync`, `BeforeExecuteAnyAsync` |
| `PlatformServiceIntegrationTestWithAssertions<T>` | Adds entity assertions via abstract repo hook                                        | `AssertEntityExistsAsync`, `AssertEntityMatchesAsync`, `AssertEntityDeletedAsync`               |
| `PlatformCrossServiceFixture`                     | Composes multiple service fixtures                                                   | `GetFixtureTypes()` (abstract), `GetFixture<T>()`, `GetServiceProvider<TModule>()`              |
| `PlatformIntegrationTestHelper`                   | Static utilities for unique test data + polling                                      | `UniqueName()`, `UniqueEmail()`, `WaitUntilAsync()` (5s default, 100ms poll)                    |
| `PlatformAssertDatabaseState`                     | Static eventual-consistency assertions (fresh scope per poll)                        | `EntityExistsAsync<TEntity, TRepo>`, `EntityMatchesAsync`, `EntityDeletedAsync`                 |
| `PlatformIntegrationTestDataSeeder`               | Abstract seeder contract for test-specific data                                      | `SeedAsync(IServiceProvider)`                                                                   |

### Two-Level Data Seeding

Integration tests use two seeder layers that run in sequence during fixture initialization:

**Layer 1 — Application Data Seeder** (`PlatformApplicationDataSeeder`): Runs during `module.InitializeAsync()` — seeds production-like reference data (admin users, organizations, roles, employees). Lives in the service's Application layer. Configured via `SeedAutomationTestingData` appsetting.

- Example: `GrowthTestApplicationDataSeeder` in `Growth.Application/DataSeeders/`

**Layer 2 — Integration Test Data Seeder** (`PlatformIntegrationTestDataSeeder`): Runs in `SeedDataAsync()` after module init — seeds test-specific data (form templates, request types). Lives in the test project.

- Example: `GrowthIntegrationTestDataSeeder` in `Growth.IntegrationTests/`

Both layers use idempotent `FirstOrDefault + create-if-missing` pattern — safe for repeated runs without teardown.

### Single-Service Test Setup

```csharp
// 1. Fixture: boots DI container and seeds data
public class GrowthIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<GrowthApiAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
    protected override Task SeedDataAsync(IServiceProvider sp)
        => new GrowthIntegrationTestDataSeeder().SeedAsync(sp);
}

// 2. Collection: shares one fixture across all test classes
[CollectionDefinition(Name)]
public class GrowthIntegrationTestCollection : ICollectionFixture<GrowthIntegrationTestFixture>
{ public const string Name = "Growth Integration Tests"; }

// 3. Test base: resolves service-specific repo, sets up request context
public class GrowthServiceIntegrationTestBase
    : PlatformServiceIntegrationTestWithAssertions<GrowthApiAspNetCoreModule>
{
    protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<IGrowthRootRepository<TEntity>>();
}

// 4. Test class
[Collection(GrowthIntegrationTestCollection.Name)]
public class GoalCommandIntegrationTests : GrowthServiceIntegrationTestBase
{
    [Fact]
    public async Task SaveGoal_WhenValid_ShouldCreate()
    {
        var result = await ExecuteCommandAsync(new SaveGoalCommand { ... },
            BravoTestUserContextFactory.CreateEmployee());
        await AssertEntityMatchesAsync<Goal>(result.Id, g => g.Title.Should().Be(expected));
    }
}
```

### Cross-Service Test Setup

For tests spanning multiple microservices (e.g., Accounts creates user → Growth syncs employee):

```csharp
// Each service gets its own fixture with isolated config
public class CrossServiceAccountsFixture : AccountsIntegrationTestFixture
{
    protected override IConfiguration BuildConfiguration()
        => new ConfigurationBuilder().AddJsonFile("appsettings.Accounts.json").Build();
}

// Compose fixtures using PlatformCrossServiceFixture
public class CrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(CrossServiceAccountsFixture), typeof(CrossServiceGrowthFixture)];
    public IServiceProvider AccountsServiceProvider => GetFixture<CrossServiceAccountsFixture>().ServiceProvider;
    public IServiceProvider GrowthServiceProvider => GetFixture<CrossServiceGrowthFixture>().ServiceProvider;
}
```

**Config isolation:** Each service loads its own `appsettings.{Service}.json` to prevent collision when multiple modules boot in the same process.

### Test User Context Flow

```
BravoTestUserContextFactory.CreateEmployee()    → BravoTestUserContext { Roles, CompanyId, ... }
    ↓ passed as userContext to ExecuteCommandAsync
BeforeExecuteAnyAsync(accessor, userContext)     → PopulateFromTestUserContext(testContext, config)
    ↓ sets IPlatformApplicationRequestContextAccessor
Command handler reads context                   → CurrentUser, CompanyId, Roles available
```

### New Service Bootstrap Checklist

To add integration tests to a new microservice:

1. Create `{Service}.IntegrationTests` project referencing the service's `.Service` project + `Easy.Platform.AutomationTest` + `Bravo.Shared.IntegrationTest`
2. Create `{Service}IntegrationTestFixture : PlatformServiceIntegrationTestFixture<{Service}ApiAspNetCoreModule>` with `SeedDataAsync` override
3. Create `{Service}ServiceIntegrationTestBase : PlatformServiceIntegrationTestWithAssertions<{Service}ApiAspNetCoreModule>` with `ResolveRepository` returning service-specific repo
4. Create `{Service}IntegrationTestDataSeeder : PlatformIntegrationTestDataSeeder` for test-specific seed data
5. Add `appsettings.json` + `appsettings.Development.json` with DB/RabbitMQ/Redis connection strings
6. Add `GlobalUsings.cs` with platform + shared imports
7. Add `Startup.cs` (no-op, required by `Xunit.DependencyInjection`)

> Full code templates for each file: see `.claude/skills/integration-test/references/integration-test-patterns.md`
