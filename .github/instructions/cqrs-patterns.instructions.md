---
applyTo: '**/UseCaseCommands/**/*.cs,**/UseCaseQueries/**/*.cs'
---

# CQRS Command & Query Patterns

> Auto-loads when editing Command/Query files. See `docs/backend-patterns-reference.md` for full reference.

## Command Pattern (All-in-One File)

**Location:** `UseCaseCommands/{Feature}/Save{Entity}Command.cs`

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class Save{E}CommandResult : PlatformCqrsCommandResult
{
    public {E}Dto Entity { get; set; } = null!;
}

internal sealed class Save{E}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult>
{
    protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        await repository.CreateOrUpdateAsync(entity, ct);
        return new() { Entity = new {E}Dto(entity) };
    }
}
```

## Query Pattern

**Location:** `UseCaseQueries/{Feature}/Get{Entity}ListQuery.cs`

```csharp
public sealed class Get{E}ListQuery : PlatformCqrsPagedQuery<Get{E}ListQueryResult, {E}Dto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class Get{E}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{E}ListQuery, Get{E}ListQueryResult>
{
    protected override async Task<Get{E}ListQueryResult> HandleAsync(Get{E}ListQuery req, CancellationToken ct)
    {
        var qb = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repository.CountAsync((uow, q) => qb(uow, q), ct),
            repository.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.SkipCount, req.MaxResultCount), ct)
        );
        return new Get{E}ListQueryResult(items, total, req);
    }
}
```

## Critical Rules

1. **Command + Result + Handler in ONE file** under `UseCaseCommands/{Feature}/`
2. **Sync validation** in `Command.Validate()` method
3. **Async validation** (DB checks) in `Handler.ValidateRequestAsync()`
4. **Business rule validation** in `Entity.ValidateFor{Action}()` method
5. **Use DTO mapping** - `req.MapToNewEntity()`, never manual property assignment
6. **Side effects** go in Entity Event Handlers (`UseCaseEvents/`), NOT in handlers
7. **Use fluent validation** `.And()` / `.AndAsync()`, never `if-return` style
8. **Parallel loading** - use tuple deconstruction for independent async operations

## Validation in Handlers

```csharp
protected override async Task<PlatformValidationResult<TCommand>> ValidateRequestAsync(
    PlatformValidationResult<TCommand> validation, CancellationToken ct)
    => await validation
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(e => e.IsExternal && r.Ids.Contains(e.Id), ct), "External not allowed");
```

## Anti-Patterns

- **NEVER** put side effects (notifications, emails) in command handlers
- **NEVER** use `throw ValidationException` - use fluent validation
- **NEVER** do DTO mapping in handler - DTOs own their mapping
- **NEVER** access other service's database directly - use message bus
