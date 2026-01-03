---
applyTo: "src/PlatformExampleApp/**/*Command*.cs,src/PlatformExampleApp/**/*Query*.cs"
excludeAgent: ["copilot-code-review"]
description: "CQRS Command and Query patterns for EasyPlatform"
---

# CQRS Implementation Patterns

## CRITICAL: File Organization

**Command/Query + Handler + Result = ONE FILE**

```
{Service}.Application/
├── UseCaseCommands/{Feature}/
│   └── Save{Entity}Command.cs      # Contains Command + Result + Handler
└── UseCaseQueries/{Feature}/
    └── Get{Entity}ListQuery.cs     # Contains Query + Result + Handler
```

## Command Pattern

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly I{Service}RootRepository<{Entity}> repository;

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command req, CancellationToken ct)
    {
        // 1. Get or create entity
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct)
                .EnsureFound($"Entity not found: {req.Id}")
                .Then(e => req.UpdateEntity(e));

        // 2. Save
        var saved = await repository.CreateOrUpdateAsync(entity, ct);

        return new Save{Entity}CommandResult { Entity = new {Entity}Dto(saved) };
    }
}
```

## Query Pattern with GetQueryBuilder

```csharp
public sealed class Get{Entity}ListQuery : PlatformCqrsPagedQuery<Get{Entity}ListQueryResult, {Entity}Dto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class Get{Entity}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ListQuery, Get{Entity}ListQueryResult>
{
    protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
        Get{Entity}ListQuery req, CancellationToken ct)
    {
        // Reusable query builder
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, {Entity}.SearchColumns())));

        // Parallel tuple queries
        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct,
                e => e.RelatedEntity)  // Eager load
        );

        return new Get{Entity}ListQueryResult(items.SelectList(e => new {Entity}Dto(e)), total, req);
    }
}
```

## Key Patterns

| Pattern | Usage |
|---------|-------|
| `GetQueryBuilder` | Reusable query definitions |
| `WhereIf` | Conditional filtering |
| `PipeIf` | Conditional transformations |
| `await (q1, q2)` | Parallel tuple queries |
| `.PageBy(skip, take)` | Pagination |
| `.Then(transform)` | Result transformation |

## Anti-Patterns

- **Never** create separate files for Command/Handler/Result
- **Never** call side effects in handlers (use entity event handlers)
- **Never** map DTO to entity in handler (use DTO's MapToEntity)
- **Never** use raw Where instead of GetQueryBuilder for complex queries
