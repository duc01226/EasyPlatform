# Backend Development Patterns

## 1. Clean Architecture Layers

```csharp
// Domain Layer - Business entities
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;

    public static Expression<Func<Employee, bool>> IsActiveExpression()
        => e => e.Status == EmployeeStatus.Active;
}

// Application Layer - CQRS handlers
public class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand request, CancellationToken cancellationToken)
    {
        var employee = await repository.GetByIdAsync(request.Id, cancellationToken);
        employee.FirstName = request.FirstName;
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

## 2. Repository Pattern (CRITICAL)

```csharp
// ✅ Use platform generic repositories
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// ✅ Create extensions for domain-specific queries
public static class TextSnippetRepositoryExtensions
{
    public static async Task<TextSnippetText> GetByCodeAsync(
        this IPlatformQueryableRootRepository<TextSnippetText, string> repository,
        string code, CancellationToken ct = default)
    {
        return await repository.FirstOrDefaultAsync(
            TextSnippetText.FullTextSearchCodeExactMatchExpr(code), ct).EnsureFound();
    }
}
```

## 3. Repository API Reference

```csharp
// CREATE
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);

// UPDATE
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// UPSERT
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);

// DELETE
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);

// GET
var entity = await repository.GetByIdAsync(id, ct);
var entity = await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
var entity = await repository.FirstOrDefaultAsync(expr, ct);
var entities = await repository.GetAllAsync(expr, ct);
var entities = await repository.GetByIdsAsync(ids, ct);

// QUERY BUILDERS
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));

// AGGREGATION
var count = await repository.CountAsync(expr, ct);
var exists = await repository.AnyAsync(expr, ct);
```

## 4. Validation Patterns

```csharp
// Sync Validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 18, "Must be 18 or older");
}

// Async Validation
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> validation, CancellationToken ct)
{
    return await validation
        .AndAsync(req => repository.GetByIdsAsync(req.Ids, ct)
            .ThenValidateFoundAllAsync(req.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(req => repository.AnyAsync(e => e.IsExternal, ct), "Externals not allowed");
}

// Ensure Pattern (throws)
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Not found: {id}")
    .Then(e => e.Validate().EnsureValid());
```

## 5. CQRS File Organization (CRITICAL)

**Rule:** Command/Query + Handler + Result ALL in ONE file

```csharp
// File: SaveEntityCommand.cs
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Name { get; set; } = string.Empty;
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        var saved = await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

## 6. Event-Driven Side Effects (CRITICAL)

**NEVER** call side effects directly in command handlers. Use entity events instead.

```csharp
// ❌ WRONG: Direct side effect
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity); // ❌ BAD!
    return new Result();
}

// ✅ CORRECT: Just save - platform auto-raises entity events
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);  // Event raised automatically
    return new Result();
}

// Entity event handler in UseCaseEvents/ folder
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

## 7. Entity Patterns

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";

    [JsonIgnore]
    public Company? Company { get; set; }

    // Static expressions
    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    // Computed properties - MUST have empty set { }
    [ComputedEntityProperty]
    public bool IsActive { get => Status == EntityStatus.Active; set { } }

    // Search columns
    public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.Name, e => e.Code];
}
```

## 8. Entity DTO Patterns

```csharp
public class EmployeeEntityDto : PlatformEntityDto<Employee, string>
{
    public EmployeeEntityDto() { }
    public EmployeeEntityDto(Employee entity, User? user) : base(entity)
    {
        FullName = entity.FullName ?? user?.FullName ?? "";
        Email = user?.Email ?? "";
    }

    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public OrganizationEntityDto? Company { get; set; }  // Optional load

    // Fluent loading
    public EmployeeEntityDto WithCompany(OrganizationalUnit company)
    {
        Company = new OrganizationEntityDto(company);
        return this;
    }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee entity, MapToEntityModes mode)
    {
        entity.Position = Position;
        return entity;
    }
}
```

## 9. Fluent Helpers

```csharp
// Mutation
entity.With(e => e.Name = newName).WithIf(condition, e => e.Status = Status.Active);

// Transformation
await repository.GetByIdAsync(id).Then(e => e.PerformLogic()).ThenAsync(async e => await e.ValidateAsync(ct));

// Safety
await entity.ValidateAsync(ct).EnsureValidAsync();
await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");
await repository.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);

// Expression composition
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.FilterByStatusExpr(statuses))
    .AndAlsoIf(deptIds.Any(), () => Entity.FilterByDeptExpr(deptIds));

// Parallel queries
var (total, items) = await (
    repository.CountAsync(q => queryBuilder(q), ct),
    repository.GetAllAsync(q => queryBuilder(q).PageBy(skip, take), ct)
);
```

## 10. Background Jobs

```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(int? skip, int? take, ...)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }

    protected override async Task<int> MaxItemsCount(...)
        => await repository.CountAsync(q => QueryBuilder(q));
}
```

## 11. Message Bus Consumer

```csharp
internal sealed class UpsertEntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Created || msg.Payload.CrudAction == Updated)
        {
            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity());
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing));
        }

        if (msg.Payload.CrudAction == Deleted)
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

## 12. Cross-Service Communication

```csharp
// Producer (auto-publishes on entity changes)
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string> { }

// Consumer (in target service)
public class UpsertEmployeeInfoConsumer :
    PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEntityEventBusMessage message)
        => // Sync needed fields to local service
}
```

## 13. Full-Text Search

```csharp
var queryBuilder = repository.GetQueryBuilder(query =>
    query.Where(t => t.IsActive)
        .PipeIf(request.SearchText.IsNotNullOrEmpty(), q =>
            fullTextSearchService.Search(q, request.SearchText,
                TextSnippetText.DefaultFullTextSearchColumns(),
                fullTextAccurateMatch: true)));

var (totalCount, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(request.SkipCount, request.MaxResultCount), ct)
);
```

## 14. Navigation Property Loading

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
