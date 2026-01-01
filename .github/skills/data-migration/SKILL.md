---
name: data-migration
description: Use when creating data migrations, schema migrations, or data transformation scripts.
---

# Data Migration Development

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for data migrations, paged processing, cross-DB migrations

---

## Migration Types

| Type     | Use Case                       |
| -------- | ------------------------------ |
| EF Core  | Schema changes (SQL)           |
| MongoDB  | Data transformation            |
| Cross-DB | One-time sync between services |

## MongoDB Data Migration

```csharp
public class Migrate{Feature}Data : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_Migrate{Feature}Data";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<{Entity}>> ExecutePaging(
        int skip, int take,
        Func<IQueryable<{Entity}>, IQueryable<{Entity}>> qb,
        IRepository<{Entity}> repo,
        IPlatformUnitOfWorkManager uow)
    {
        using (var unitOfWork = uow.Begin())
        {
            var items = await repo.GetAllAsync(q =>
                qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));

            // Transform data
            items.ForEach(item => item.NewField = CalculateValue(item));

            await repo.UpdateManyAsync(items,
                dismissSendEvent: true,    // Don't trigger events
                checkDiff: false);         // Skip diff checking

            await unitOfWork.CompleteAsync();
            return items;
        }
    }
}
```

## EF Core Migration

```bash
dotnet ef migrations add {MigrationName} --project src/PlatformExampleApp/{Service}
dotnet ef database update
```

## Key Practices

| Practice                      | Why                 |
| ----------------------------- | ------------------- |
| `OnlyForDbsCreatedBeforeDate` | Target specific DBs |
| `dismissSendEvent: true`      | No entity events    |
| `AllowRunInBackgroundThread`  | Non-blocking        |
| Paged processing              | Memory efficient    |
| Unit of work per page         | Transaction safety  |

## Anti-Patterns

- Running without paging (memory issues)
- Triggering events during migration
- Not setting date filter
