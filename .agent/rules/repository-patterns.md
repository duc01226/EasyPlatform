# Repository Patterns

## Repository Priority (CRITICAL)

### Use Platform Generic Repository
```csharp
// Platform generic repository pattern
IPlatformQueryableRootRepository<TEntity, TKey>

// Example usage
IPlatformQueryableRootRepository<SnippetText, string>
IPlatformQueryableRootRepository<Employee, string>
```

## Repository API Reference

### Create Operations
```csharp
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);
```

### Update Operations
```csharp
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, cancellationToken);
```

### Create or Update (Upsert)
```csharp
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);
```

### Delete Operations
```csharp
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, cancellationToken);
```

### Read Operations
```csharp
// By ID
var entity = await repository.GetByIdAsync(id, cancellationToken);
var entity = await repository.GetByIdAsync(id, cancellationToken,
    loadRelatedEntities: p => p.Employee, p => p.Company);

// Single
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// Multiple
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// Count and Exists
var count = await repository.CountAsync(expr, cancellationToken);
var exists = await repository.AnyAsync(expr, cancellationToken);
```

### Query Builders
```csharp
var query = repository.GetQuery(uow);
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));
```

## Repository Extension Pattern

### Location
`{Service}.Domain\Repositories\Extensions\{Entity}RepositoryExtensions.cs`

### Extension Method Examples
```csharp
public static class SnippetTextRepositoryExtensions
{
    // Get by composite expression
    public static async Task<SnippetText> GetByUniqueExpr(
        this IPlatformQueryableRootRepository<SnippetText, string> repository,
        string companyId, string code,
        CancellationToken ct = default,
        params Expression<Func<SnippetText, object?>>[] loadRelatedEntities)
    {
        return await repository
            .FirstOrDefaultAsync(SnippetText.UniqueExpr(companyId, code), ct, loadRelatedEntities)
            .EnsureFound();
    }

    // Projected result (performance optimization)
    public static async Task<string> GetSnippetTextIdByUniqueExpr(
        this IPlatformQueryableRootRepository<SnippetText, string> repository,
        string companyId, string code,
        CancellationToken ct = default)
    {
        return await repository
            .FirstOrDefaultAsync(
                queryBuilder: query => query
                    .Where(SnippetText.UniqueExpr(companyId, code))
                    .Select(p => p.Id),
                cancellationToken: ct)
            .EnsureFound();
    }
}
```

## Full-Text Search Pattern

```csharp
var queryBuilder = repository.GetQueryBuilder(query =>
    query
        .Where(Entity.BaseFilterExpr())
        .PipeIf(
            request.SearchText.IsNotNullOrEmpty(),
            query => fullTextSearchService.Search(
                query,
                request.SearchText,
                Entity.DefaultFullTextSearchColumns(),
                fullTextAccurateMatch: true,
                includeStartWithProps: Entity.DefaultFullTextSearchColumns()
            )
        )
);
```

## Decision Tree

```
Need repository access?
├── Service-specific repository exists? → Use I{ServiceName}PlatformRootRepository
├── Need complex queries? → Create RepositoryExtensions with static expressions
├── Generic CRUD only? → Use IPlatformQueryableRootRepository<TEntity, TKey>
└── Cross-service data? → Use message bus, NEVER direct database access
```
