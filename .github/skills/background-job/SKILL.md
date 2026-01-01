---
name: background-job
description: Use when creating recurring jobs, scheduled tasks, or batch processing operations.
---

# Background Job Development

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for background jobs, migrations, batch processing

---

## Job Types

| Type            | Use Case                       |
| --------------- | ------------------------------ |
| Paged           | Simple sequential processing   |
| Batch Scrolling | Multi-tenant, parallel batches |
| Scrolling       | Data changes during processing |

## Simple Paged Job

```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class Process{Entity}Job : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip, int? take, object? param,
        IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q =>
            QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(item => ProcessItem(item));
    }

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}
```

## Batch Scrolling Job (Multi-tenant)

```csharp
[PlatformRecurringJob("0 0 * * *")]
public sealed class Batch{Entity}Job :
    PlatformApplicationBatchScrollingBackgroundJobExecutor<{Entity}, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;      // Entities per company

    protected override IQueryable<{Entity}> EntitiesQueryBuilder(
        IQueryable<{Entity}> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter())
            .WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<{Entity}> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey)
            .Select(e => e.CompanyId).Distinct();

    protected override async Task ProcessEntitiesAsync(
        List<{Entity}> entities, string batchKey, object? param, IServiceProvider sp)
    {
        await entities.ParallelAsync(e => ProcessEntity(e), maxConcurrent: 1);
    }
}
```

## Cron Schedules

| Schedule      | Meaning         |
| ------------- | --------------- |
| `0 0 * * *`   | Daily midnight  |
| `*/5 * * * *` | Every 5 minutes |
| `0 3 * * *`   | Daily 3 AM      |
| `0 0 * * 0`   | Weekly Sunday   |

## Key Patterns

- Use `ParallelAsync` for concurrent processing
- Use `maxConcurrent` to limit parallelism
- Use `executeOnStartUp: true` for startup execution
- Use batch scrolling for multi-tenant scenarios
