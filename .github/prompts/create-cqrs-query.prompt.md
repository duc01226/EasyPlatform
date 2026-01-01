---
agent: 'agent'
description: 'Generate a CQRS Query with Handler and Result following EasyPlatform patterns'
tools: ['read', 'edit', 'search', 'execute']
---

# Create CQRS Query

## Required Reading

**Before implementing, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for CQRS queries, GetQueryBuilder, expressions

---

Create a new CQRS Query with Handler and Result for the following entity:

**Entity Name:** ${input:entityName}
**Service Name:** ${input:serviceName}
**Feature Name:** ${input:featureName}
**Query Type:** ${input:queryType:Paged List Query,Single Entity Query}

## Requirements

1. Create in: `{Service}.Application/UseCaseQueries/{Feature}/Get{Entity}Query.cs`
2. **CRITICAL:** Query + Handler + Result must be in ONE file
3. Use `GetQueryBuilder` for reusable query composition
4. Use tuple await for parallel count + data queries

## Paged List Query Pattern

```csharp
// File: Get{Entity}ListQuery.cs

namespace {Service}.Application.UseCaseQueries.{Feature};

// ═══════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Get{Entity}ListQuery : PlatformCqrsPagedQuery<Get{Entity}ListQueryResult, {Entity}Dto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
    public List<string>? FilterIds { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Get{Entity}ListQueryResult : PlatformCqrsPagedQueryResult<{Entity}Dto>
{
    public Get{Entity}ListQueryResult(
        List<{Entity}Dto> items,
        long totalCount,
        IPlatformCqrsPagedQuery request)
        : base(items, totalCount, request) { }
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════
internal sealed class Get{Entity}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ListQuery, Get{Entity}ListQueryResult>
{
    private readonly I{Service}RootRepository<{Entity}> repository;
    private readonly IPlatformFullTextSearchPersistenceService searchService;

    public Get{Entity}ListQueryHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        I{Service}RootRepository<{Entity}> repository,
        IPlatformFullTextSearchPersistenceService searchService)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.repository = repository;
        this.searchService = searchService;
    }

    protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
        Get{Entity}ListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .WhereIf(req.FilterIds.IsNotNullOrEmpty(), e => req.FilterIds!.Contains(e.Id))
            .WhereIf(req.FromDate.HasValue, e => e.CreatedDate >= req.FromDate)
            .WhereIf(req.ToDate.HasValue, e => e.CreatedDate <= req.ToDate)
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, {Entity}.DefaultFullTextSearchColumns())));

        // Parallel tuple queries
        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct,
                e => e.RelatedEntity)  // Eager load
        );

        return new Get{Entity}ListQueryResult(
            items.SelectList(e => new {Entity}Dto(e)),
            total,
            req);
    }
}
```

## Single Entity Query Pattern

```csharp
// File: Get{Entity}ByIdQuery.cs

public sealed class Get{Entity}ByIdQuery : PlatformCqrsQuery<Get{Entity}ByIdQueryResult>
{
    public string Id { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Id.IsNotNullOrEmpty(), "Id is required");
    }
}

public sealed class Get{Entity}ByIdQueryResult : PlatformCqrsQueryResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

internal sealed class Get{Entity}ByIdQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ByIdQuery, Get{Entity}ByIdQueryResult>
{
    protected override async Task<Get{Entity}ByIdQueryResult> HandleAsync(
        Get{Entity}ByIdQuery req, CancellationToken ct)
    {
        var entity = await repository.GetByIdAsync(req.Id, ct,
            e => e.RelatedEntity,
            e => e.Children)
            .EnsureFound($"Entity not found: {req.Id}");

        return new Get{Entity}ByIdQueryResult
        {
            Entity = new {Entity}Dto(entity)
                .WithRelated(entity.RelatedEntity)
        };
    }
}
```

## Key Patterns

| Pattern | Usage |
|---------|-------|
| `GetQueryBuilder` | Reusable query definition |
| `WhereIf` | Conditional filtering |
| `PipeIf` | Conditional transformation |
| `PageBy` | Pagination |
| Tuple await | Parallel queries: `var (a, b) = await (q1, q2)` |
| Eager load | Load relations: `GetByIdAsync(id, ct, e => e.Related)` |

## Full-Text Search

```csharp
// In entity - define searchable columns
public static Expression<Func<{Entity}, object?>>[] DefaultFullTextSearchColumns()
    => [e => e.Name, e => e.Code, e => e.Email];

// In handler
.PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
    searchService.Search(q, req.SearchText, {Entity}.DefaultFullTextSearchColumns()))
```

## Anti-Patterns to AVOID

- Using raw `query.Where()` instead of `GetQueryBuilder`
- Sequential await for independent queries (use tuple await)
- Forgetting eager loading (causes N+1 queries)
- Hardcoding company/user filters (use `RequestContext`)
