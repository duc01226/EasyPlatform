---
applyTo: 'src/PlatformExampleApp/**/*Command*.cs,src/PlatformExampleApp/**/*Query*.cs'
---

# CQRS Development Instructions

## Command Pattern

Commands modify state. Follow this structure:

```csharp
// File: Save{Entity}Command.cs - Contains Command + Result + Handler

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
    public EntityDto Entity { get; set; } = null!;
}

internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command req, CancellationToken ct)
    {
        // Implementation
    }
}
```

## Query Pattern

Queries read state. Use `GetQueryBuilder` for reusable queries:

```csharp
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
    .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
        searchService.Search(q, req.SearchText, Entity.SearchColumns())));

var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(req.SkipCount, req.MaxResultCount), ct));
```

## Key Rules

- Command + Result + Handler in ONE file
- Use parallel tuple await for independent queries
- Use `WhereIf` and `PipeIf` for conditional logic
- Always use `GetQueryBuilder` for reusable queries
- Never call side effects directly - use entity event handlers
