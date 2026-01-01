---
applyTo: "src/PlatformExampleApp/**/*Job*.cs,src/PlatformExampleApp/**/*BackgroundJob*.cs"
excludeAgent: ["copilot-code-review"]
description: "Background job patterns for scheduled and recurring tasks in EasyPlatform"
---

# Background Job Patterns

## Simple Paged Job

```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class ProcessEntitiesJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param,
        IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(
            q => QueryBuilder(q).PageBy(skip, take));

        await items.ParallelAsync(item => ProcessItemAsync(item));
    }

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}
```

## Batch Scrolling Job (Multi-Tenant)

```csharp
[PlatformRecurringJob("0 0 * * *")]  // Daily at midnight
public sealed class SyncCompanyDataJob :
    PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;   // Companies per page
    protected override int BatchPageSize => 25;      // Entities per company

    protected override IQueryable<Entity> EntitiesQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter())
            .WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey)
            .Select(e => e.CompanyId)
            .Distinct();

    protected override async Task ProcessEntitiesAsync(
        List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
    {
        await entities.ParallelAsync(
            e => ProcessEntityAsync(e),
            maxConcurrent: 1);
    }
}
```

## Scrolling Job (Data Changes During Processing)

```csharp
public override async Task ProcessAsync(Param param)
{
    await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
        ExecutePaged,
        await repository.CountAsync(q => QueryBuilder(q, param)) / PageSize,
        param,
        PageSize);
}

public static async Task<List<Entity>> ExecutePaged(
    Param param, int? limitPageSize,
    IRepo<Entity> repo, IRepo<ProcessedLog> logRepo)
{
    var items = await repo.GetAllAsync(q =>
        QueryBuilder(q, param)
            .OrderBy(e => e.Id)
            .PipeIf(limitPageSize != null, q => q.Take(limitPageSize!.Value)));

    if (items.IsEmpty()) return items;

    // Mark as processed (excludes from next query)
    await logRepo.CreateManyAsync(items.SelectList(e => new ProcessedLog(e)));

    return items;
}
```

## Cron Schedule Examples

| Schedule | Cron Expression |
|----------|-----------------|
| Daily midnight | `0 0 * * *` |
| Daily 3 AM | `0 3 * * *` |
| Every 5 minutes | `*/5 * * * *` |
| Weekly Sunday | `0 0 * * 0` |
| On startup | `executeOnStartUp: true` |

## Job Types Decision

| Type | Use When |
|------|----------|
| Paged | Simple sequential processing |
| Batch Scrolling | Multi-tenant parallel batches |
| Scrolling | Data changes during processing |

## Anti-Patterns

- **Never** process without pagination
- **Never** use large page sizes (>100)
- **Never** forget parallel processing limits
- **Never** skip logging for debugging
