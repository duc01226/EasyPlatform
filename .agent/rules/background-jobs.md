# Background Job Patterns

## Job Types Overview

| Pattern | Use Case | Key Feature |
|---------|----------|-------------|
| Simple Paged | Sequential processing | Skip/take pagination |
| Batch Scrolling | Multi-tenant parallel | Two-level pagination |
| Scrolling | Data changes during processing | Always queries from start |

## Simple Paged Job

```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));

    private IQueryable<Entity> QueryBuilder(IQueryable<Entity> query)
        => query.Where(e => e.Status == Status.Pending);
}
```

## Batch Scrolling Job (Multi-Tenant)

```csharp
[PlatformRecurringJob("0 0 * * *")]  // Daily at midnight
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;     // Entities per company

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
            async e => await ProcessEntity(e),
            maxConcurrent: 1);
    }
}
```

## Scrolling Job (Data Changes During Processing)

```csharp
public sealed class ScrollingJob : PlatformApplicationBackgroundJobExecutor
{
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

        // Mark as processed - excludes from next query
        await logRepo.CreateManyAsync(items.SelectList(e => new ProcessedLog(e)));

        return items;
    }
}
```

## Cron Schedule Reference

| Schedule | Expression | Description |
|----------|------------|-------------|
| Daily midnight | `0 0 * * *` | Run once per day at 00:00 |
| Daily 3 AM | `0 3 * * *` | Run once per day at 03:00 |
| Every 5 minutes | `*/5 * * * *` | Run every 5 minutes |
| Hourly | `0 * * * *` | Run at minute 0 of every hour |
| Weekly Sunday | `0 0 * * 0` | Run Sunday at midnight |
| On startup + daily | `5 0 * * *` with `executeOnStartUp: true` | Run on app start + daily |

## Job Attributes

```csharp
// Basic recurring job
[PlatformRecurringJob("0 0 * * *")]

// With startup execution
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]

// Manual trigger only (no schedule)
// Just don't add the attribute - trigger via code
```

## Scheduling Jobs Programmatically

```csharp
// Schedule immediate execution
await BackgroundJobScheduler.Schedule<MyJob, Param>(Clock.UtcNow, new Param { ... });

// Schedule for future
await BackgroundJobScheduler.Schedule<MyJob, Param>(
    Clock.UtcNow.AddMinutes(30),
    new Param { ... });

// Master job scheduling child jobs
await companies.ParallelAsync(async companyId =>
    await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
        BackgroundJobScheduler.Schedule<ChildJob, Param>(
            Clock.UtcNow,
            new Param { CompanyId = companyId, Date = date })));
```

## Best Practices

### Job Design
- Keep jobs idempotent (safe to retry)
- Use paging for large data sets
- Log progress for monitoring
- Handle exceptions gracefully

### Performance
- Use `ParallelAsync()` with `maxConcurrent` limit
- Process in batches, not one-by-one
- Use `dismissSendEvent: true` for bulk updates

### Multi-Tenant
- Use Batch Scrolling for per-company processing
- Batch keys are processed in parallel
- Entities within batch can be parallel or sequential

### When to Use Each Pattern
- **Paged**: Simple sequential, data doesn't change during job
- **Batch Scrolling**: Multi-tenant, parallel processing by batch key
- **Scrolling**: Data changes during processing (marked as processed)
