---
applyTo: '**/Repositories/**/*.cs,**/*Repository*.cs'
---

# Repository Patterns

> Auto-loads when editing Repository files. See `docs/backend-patterns-reference.md` for full reference.

## Service-Specific Repositories (ALWAYS Use These)

```csharp
ICandidatePlatformRootRepository<Employee>  // bravoTALENTS
IGrowthRootRepository<Employee>             // bravoGROWTH
ISurveysPlatformRootRepository<Survey>      // bravoSURVEYS
```

**NEVER use generic `IPlatformRootRepository<T>` - always use the service-specific version.**

## CRUD Operations

```csharp
await repository.CreateAsync(entity, ct);
await repository.UpdateAsync(entity, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.DeleteAsync(id, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);
```

## Query Operations

```csharp
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Employee, p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);

// Query builder
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));

// Projection
await repo.FirstOrDefaultAsync(q => q.Where(expr).Select(e => e.Id), ct);
```

## Navigation Property Loading

```csharp
// Single level
var employee = await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Department!);

// Deep navigation (2-3 levels)
var snippet = await repo.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Category!.ParentCategory!.ParentCategory!);

// Reverse navigation - load children
var parent = await repo.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildCategories!);

// Batch loading - N+1 prevention
var items = await repo.GetByIdsAsync(ids, ct, loadRelatedEntities: e => e.Category!.ParentCategory!);
```

## Repository Extensions Pattern

```csharp
public static async Task<Employee> GetByEmailAsync(
    this IGrowthRootRepository<Employee> repo, string email, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();

public static async Task<List<Entity>> GetByIdsValidatedAsync(
    this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
    => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

public static async Task<string> GetIdByCodeAsync(
    this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();
```

## Decision Tree

```
Simple CRUD?  -> Use platform repository directly
Complex queries?  -> Create RepositoryExtensions with static expressions
Cross-service data?  -> Use message bus (NEVER direct DB access)
```

## Anti-Patterns

- **NEVER** create custom repository interfaces - use platform repos + extensions
- **NEVER** access another service's database directly
- **NEVER** fetch-then-delete - use `DeleteByIdAsync(id)`
- **NEVER** load all then select IDs - project in query: `.Select(e => e.Id)`
