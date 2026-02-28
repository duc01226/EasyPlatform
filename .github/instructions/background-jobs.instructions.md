---
applyTo: '**/BackgroundJobs/**/*.cs,**/*Job*.cs'
---

# Background Job Patterns

> Auto-loads when editing BackgroundJob files. See `docs/backend-patterns-reference.md` for full reference.

## Paged Job

```csharp
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take)).Then(items => items.ParallelAsync(ProcessItem));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}
```

## Batch Scrolling Job

```csharp
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
        => await entities.ParallelAsync(e => ProcessEntity(e), maxConcurrent: 1);
}
```

## Scrolling Pattern

```csharp
// Data affected by processing, always queries from start
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);
```

## Job Coordination (Master/Child)

```csharp
await companies.ParallelAsync(async cId =>
    await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
        BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

## Cron Examples

```csharp
[PlatformRecurringJob("0 0 * * *")]                          // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]                        // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + startup
```

## Critical Rules

1. **Always paginate** - use `PageSize` and `PageBy()`, never process all at once
2. **Use `ParallelAsync`** with `maxConcurrent` for controlled parallelism
3. **Use Unit of Work** (`UnitOfWorkManager`) for batch updates
4. **Master-child coordination** for complex multi-dimensional jobs
