# CQRS Patterns Reference

## Command Validation

### Sync Validation (in Command class)

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => StartDate <= EndDate, "Invalid range")
        .And(_ => Items.Count > 0, "At least one item required")
        .Of<IPlatformCqrsRequest>();
}
```

### Async Validation (in Handler)

```csharp
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> validation, CancellationToken ct)
{
    return await validation
        // Validate all IDs exist
        .AndAsync(req => repository.GetByIdsAsync(req.RelatedIds, ct)
            .ThenValidateFoundAllAsync(req.RelatedIds, ids => $"Not found: {ids}"))
        // Validate uniqueness
        .AndNotAsync(req => repository.AnyAsync(e => e.Code == req.Code && e.Id != req.Id, ct),
            "Code already exists")
        // Validate business rule
        .AndAsync(req => ValidateBusinessRuleAsync(req, ct));
}
```

### Chained Validation with Of<>

```csharp
return this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
    .And(p => p.Status != Status.Deleted, "Cannot modify deleted")
    .Of<IPlatformCqrsRequest>();
```

---

## Query Patterns

### GetQueryBuilder (Reusable Queries)

```csharp
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
    .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
    .WhereIf(req.FilterIds.IsNotNullOrEmpty(), e => req.FilterIds!.Contains(e.Id))
    .WhereIf(req.FromDate.HasValue, e => e.CreatedDate >= req.FromDate)
    .WhereIf(req.ToDate.HasValue, e => e.CreatedDate <= req.ToDate)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
        searchService.Search(q, req.SearchText, Entity.DefaultFullTextSearchColumns())));
```

### Parallel Tuple Queries

```csharp
var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(req.SkipCount, req.MaxResultCount), ct,
        e => e.RelatedEntity,     // Eager load
        e => e.AnotherRelated)
);
```

### Full-Text Search

```csharp
// In entity - define searchable columns
public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
    => [e => e.Name, e => e.Code, e => e.Description, e => e.Email];

// In query handler
.PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
    searchService.Search(
        q,
        req.SearchText,
        Entity.DefaultFullTextSearchColumns(),
        fullTextAccurateMatch: true,      // true=exact phrase, false=fuzzy
        includeStartWithProps: Entity.DefaultFullTextSearchColumns()  // For autocomplete
    ))
```

### Aggregation Query

```csharp
var (total, items, statusCounts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .GroupBy(e => e.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
);
```

### Single Entity Query

```csharp
protected override async Task<GetEntityByIdQueryResult> HandleAsync(
    GetEntityByIdQuery req, CancellationToken ct)
{
    var entity = await repository.GetByIdAsync(req.Id, ct,
        e => e.RelatedEntity,
        e => e.Children)
        .EnsureFound($"Entity not found: {req.Id}");

    return new GetEntityByIdQueryResult
    {
        Entity = new EntityDto(entity)
            .WithRelated(entity.RelatedEntity)
            .WithChildren(entity.Children)
    };
}
```

---

## Repository Extensions

```csharp
// Extension pattern
public static async Task<Employee> GetByEmailAsync(
    this IGrowthRootRepository<Employee> repo, string email, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();

public static async Task<List<Entity>> GetByIdsValidatedAsync(
    this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
    => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

public static async Task<string> GetIdByCodeAsync(
    this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();

// Projection
await repo.FirstOrDefaultAsync(q => q.Where(expr).Select(e => e.Id), ct);
```

---

## Fluent Helpers

```csharp
// Mutation & transformation
await repo.GetByIdAsync(id).With(e => e.Name = newName).WithIf(cond, e => e.Status = Active);
await repo.GetByIdAsync(id).Then(e => e.Process()).ThenAsync(e => e.ValidateAsync(svc, ct));
await repo.GetByIdAsync(id).EnsureFound($"Not found: {id}");
await repo.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);

// Parallel operations
var (entity, files) = await (
    repo.CreateOrUpdateAsync(entity, ct),
    files.ParallelAsync(f => fileService.UploadAsync(f, ct))
);
var ids = await repo.GetByIdsAsync(ids, ct).ThenSelect(e => e.Id);
await items.ParallelAsync(item => ProcessAsync(item, ct), maxConcurrent: 10);

// Conditional actions
await repo.GetByIdAsync(id).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(() => svc.Any(), e => e.Sync());
```

---

## Key Patterns Summary

| Pattern | Usage | Example |
|---------|-------|---------|
| `GetQueryBuilder` | Reusable query | `repository.GetQueryBuilder((uow, q) => ...)` |
| `WhereIf` | Conditional filter | `.WhereIf(ids.Any(), e => ids.Contains(e.Id))` |
| `PipeIf` | Conditional transform | `.PipeIf(text != null, q => searchService.Search(...))` |
| `PageBy` | Pagination | `.PageBy(skip, take)` |
| Tuple await | Parallel queries | `var (count, items) = await (q1, q2)` |
| Eager load | Load relations | `GetByIdAsync(id, ct, e => e.Related)` |
| `.EnsureFound()` | Validate exists | `await repo.GetByIdAsync(id).EnsureFound()` |
| `.ThenValidateFoundAllAsync()` | Validate all IDs | `repo.GetByIdsAsync(ids).ThenValidateFoundAllAsync(ids, ...)` |
