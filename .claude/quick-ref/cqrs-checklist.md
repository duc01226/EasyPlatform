# CQRS Quick Checklist

> One-page reference for CQRS implementation in EasyPlatform

## File Organization Rule

```
ONE FILE contains:
├── Command/Query class
├── CommandResult/QueryResult class
└── CommandHandler/QueryHandler class

Exception: Reusable EntityDtos -> EntityDtos/ folder
```

---

## Command Template

```csharp
// File: Save{Entity}Command.cs

public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required");
    }
}

public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command request, CancellationToken ct)
    {
        // Implementation
    }
}
```

---

## Query Template

```csharp
// File: Get{Entity}ListQuery.cs

public sealed class Get{Entity}ListQuery : PlatformCqrsPagedQuery<Get{Entity}ListQueryResult, {Entity}Dto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

public sealed class Get{Entity}ListQueryResult : PlatformCqrsPagedQueryResult<{Entity}Dto>
{
    public Get{Entity}ListQueryResult(List<{Entity}Dto> items, long total, Get{Entity}ListQuery query)
        : base(items, total, query) { }
}

internal sealed class Get{Entity}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ListQuery, Get{Entity}ListQueryResult>
{
    protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
        Get{Entity}ListQuery request, CancellationToken ct)
    {
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(Entity.OfCompanyExpr(RequestContext.CurrentCompanyId()))
            .WhereIf(request.Statuses.Any(), e => request.Statuses.Contains(e.Status)));

        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(request.SkipCount, request.MaxResultCount), ct));

        return new Get{Entity}ListQueryResult(items.SelectList(e => new {Entity}Dto(e)), total, request);
    }
}
```

---

## Validation Patterns

| Pattern                             | Usage            |
| ----------------------------------- | ---------------- |
| `.And(condition, msg)`              | Sync validation  |
| `.AndAsync(asyncCondition, msg)`    | Async validation |
| `.AndNot(condition, msg)`           | Negative sync    |
| `.AndNotAsync(asyncCondition, msg)` | Negative async   |
| `.Of<T>()`                          | Type conversion  |

---

## Common Fluent Helpers

```csharp
// Get with validation
await repository.GetByIdAsync(id, ct).EnsureFound("Not found");

// Transform chain
await entity.ValidateAsync(repo, ct).EnsureValidAsync();

// Mutation
entity.With(e => e.Name = newName).WithIf(condition, e => e.Status = Active);

// Parallel queries
var (count, items) = await (countTask, itemsTask);
```

---

## Side Effects Rule

```
NEVER in Handler:
❌ await notificationService.SendAsync(entity);
❌ await externalApi.SyncAsync(entity);

ALWAYS via Event Handler:
✅ Platform auto-raises PlatformCqrsEntityEvent
✅ Create: SendNotificationOnCreate{Entity}EntityEventHandler
✅ Location: UseCaseEvents/{Feature}/
```

---

## Repository Methods Quick Reference

| Method                | Purpose                  |
| --------------------- | ------------------------ |
| `CreateAsync`         | Insert new entity        |
| `UpdateAsync`         | Update existing          |
| `CreateOrUpdateAsync` | Upsert                   |
| `DeleteAsync`         | Delete by ID             |
| `GetByIdAsync`        | Fetch by ID              |
| `FirstOrDefaultAsync` | Single with expression   |
| `GetAllAsync`         | Multiple with expression |
| `CountAsync`          | Count matching           |
| `AnyAsync`            | Exists check             |
| `GetQueryBuilder`     | Reusable query           |

---

## Request Context Quick Reference

```csharp
RequestContext.CurrentCompanyId()  // Current company
RequestContext.UserId()            // Current user
RequestContext.ProductScope()      // Product scope
RequestContext.HasRole(role)       // Role check
await RequestContext.CurrentEmployee()  // Full employee
```
