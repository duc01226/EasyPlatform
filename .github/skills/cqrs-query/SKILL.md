---
name: cqrs-query
description: Use when creating or modifying a CQRS Query (Get, List, Search) or query handler with filtering, paging, or full-text search.
---

# CQRS Query Development

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for CQRS, validation, repositories, entity expressions

---

## File Organization

**Query + Handler + Result = ONE FILE**

```
{Service}.Application/
└── UseCaseQueries/{Feature}/
    └── Get{Entity}ListQuery.cs  # Contains all 3 classes
```

## Paged List Query Pattern

```csharp
public sealed class Get{Entity}ListQuery : PlatformCqrsPagedQuery<Get{Entity}ListQueryResult, {Entity}Dto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
    public List<string>? FilterIds { get; set; }
}
```

## Query Handler with GetQueryBuilder

```csharp
internal sealed class Get{Entity}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ListQuery, Get{Entity}ListQueryResult>
{
    private readonly I{Service}RootRepository<{Entity}> repository;
    private readonly IPlatformFullTextSearchPersistenceService searchService;

    protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
        Get{Entity}ListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .WhereIf(req.FilterIds.IsNotNullOrEmpty(), e => req.FilterIds!.Contains(e.Id))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, {Entity}.DefaultFullTextSearchColumns())));

        // Parallel tuple queries
        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct,
                e => e.Related)  // Eager load
        );

        return new Get{Entity}ListQueryResult(
            items.SelectList(e => new {Entity}Dto(e)),
            total, req);
    }
}
```

## Key Patterns

| Pattern           | Usage                      |
| ----------------- | -------------------------- |
| `GetQueryBuilder` | Reusable query builder     |
| `WhereIf`         | Conditional filtering      |
| `PipeIf`          | Conditional transformation |
| `PageBy`          | Pagination                 |
| Tuple await       | Parallel queries           |

## Anti-Patterns

- Using raw `query.Where()` instead of `GetQueryBuilder`
- Sequential await for independent queries
- Forgetting eager loading (N+1 queries)
- Hardcoding company filters
