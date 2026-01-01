---
applyTo: "src/PlatformExampleApp/**/*Repository*.cs,src/PlatformExampleApp/**/*Handler*.cs"
excludeAgent: ["copilot-code-review"]
description: "Repository patterns and extensions for EasyPlatform"
---

# Repository Patterns

## Platform Repositories

```csharp
// Use platform queryable repository for all entities
IPlatformQueryableRootRepository<Entity, string>      // Primary choice
IPlatformQueryableRootRepository<Entity, TKey>        // With custom key type

// Non-queryable when IQueryable not needed
IPlatformRootRepository<Entity, string>
```

## Repository API Reference

```csharp
// CREATE
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);

// UPDATE
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// CREATE OR UPDATE (Upsert)
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);

// DELETE
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(entities, ct);
await repository.DeleteManyAsync(e => e.Status == Deleted, ct);

// GET BY ID
var entity = await repository.GetByIdAsync(id, ct);
// With eager loading
var entity = await repository.GetByIdAsync(id, ct, e => e.Employee, e => e.Company);

// GET SINGLE
var entity = await repository.FirstOrDefaultAsync(expr, ct);
var entity = await repository.GetSingleOrDefaultAsync(expr, ct);

// GET MULTIPLE
var entities = await repository.GetAllAsync(expr, ct);
var entities = await repository.GetByIdsAsync(ids, ct);

// QUERY BUILDERS
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));

// COUNT
var count = await repository.CountAsync(expr, ct);

// EXISTS
var exists = await repository.AnyAsync(expr, ct);
```

## Repository Extension Pattern

```csharp
// Location: {Service}.Domain\Repositories\Extensions\{Entity}RepositoryExtensions.cs
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string companyId,
        string email,
        CancellationToken ct = default)
    {
        return await repo
            .FirstOrDefaultAsync(Employee.ByEmailExpr(companyId, email), ct)
            .EnsureFound($"Employee not found: {email}");
    }

    // Projected result (performance optimization)
    public static async Task<string> GetEmployeeIdAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string userId,
        string companyId,
        CancellationToken ct = default)
    {
        return await repo
            .FirstOrDefaultAsync(
                q => q.Where(Employee.UniqueExpr(userId, companyId)).Select(e => e.Id),
                ct)
            .EnsureFound();
    }
}
```

## Static Expression Patterns

```csharp
// In entity class
public static Expression<Func<Employee, bool>> UniqueExpr(string userId, string companyId)
    => e => e.UserId == userId && e.CompanyId == companyId;

public static Expression<Func<Employee, bool>> ActiveInCompanyExpr(string companyId)
    => e => e.CompanyId == companyId && e.Status == EmploymentStatus.Active;

// Composable expressions
public static Expression<Func<Employee, bool>> CanBeReviewerExpr(string companyId, int? minMonths)
    => ActiveInCompanyExpr(companyId)
        .AndAlsoIf(minMonths != null, () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value));
```

## Anti-Patterns

- **Never** create custom repository interfaces
- **Never** duplicate query logic (use expressions/extensions)
- **Never** forget eager loading (causes N+1)
- **Never** use raw DbContext when repository pattern available
