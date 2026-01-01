---
applyTo: "src/PlatformExampleApp/**/*Migration*.cs,src/PlatformExampleApp/**/*DataMigration*.cs"
excludeAgent: ["copilot-code-review"]
description: "Data migration patterns for schema and data changes in EasyPlatform"
---

# Data Migration Patterns

## MongoDB Data Migration

```csharp
public class Migrate{Description} : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_Migrate{Description}";

    // Only run on databases created before this date
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);

    // Allow running in background thread
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q =>
            q.Where(FilterExpr()));

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<Entity>> ExecutePaging(
        int skip, int take,
        Func<IQueryable<Entity>, IQueryable<Entity>> queryBuilder,
        IRepository<Entity> repo,
        IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();

        var items = await repo.GetAllAsync(q =>
            queryBuilder(q).OrderBy(e => e.Id).Skip(skip).Take(take));

        foreach (var item in items)
        {
            // Apply migration logic
            item.NewField = TransformOldField(item.OldField);
        }

        await repo.UpdateManyAsync(items,
            dismissSendEvent: true,   // Don't raise entity events
            checkDiff: false);        // Skip change detection

        await unitOfWork.CompleteAsync();

        return items;
    }
}
```

## EF Core Schema Migration

```csharp
public partial class Add{FieldName}Column : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "NewField",
            table: "Entities",
            type: "nvarchar(200)",
            maxLength: 200,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "NewField",
            table: "Entities");
    }
}
```

**Commands:**
```bash
dotnet ef migrations add Add{FieldName}Column
dotnet ef database update
```

## Cross-Service Initial Sync Migration

```csharp
public class SyncDataFromSourceToTarget : PlatformDataMigrationExecutor<TargetDbContext>
{
    // Only for one-time initial sync
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);

    public override async Task Execute(TargetDbContext dbContext)
    {
        var cutoffDate = new DateTime(2024, 1, 15);

        var sourceData = await sourceDbContext.Entities
            .Where(e => e.CreatedDate < cutoffDate)
            .ToListAsync();

        var targetData = sourceData.SelectList(e => e.MapToTargetEntity());

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: targetData.Count,
            pageSize: 100,
            async (skip, take, repo, uow) =>
            {
                using var unitOfWork = uow.Begin();
                var batch = targetData.Skip(skip).Take(take).ToList();
                await repo.CreateManyAsync(batch);
                await unitOfWork.CompleteAsync();
                return batch;
            });
    }
}
```

## Best Practices

| Practice | Description |
|----------|-------------|
| `OnlyForDbsCreatedBeforeDate` | Target specific database versions |
| Paged processing | Handle large datasets efficiently |
| `dismissSendEvent: true` | Avoid triggering entity events |
| `checkDiff: false` | Skip unnecessary change detection |
| Unit of work | Ensure transactional consistency |

## Anti-Patterns

- **Never** process all records at once (use paging)
- **Never** forget OnlyForDbsCreatedBeforeDate for targeted migrations
- **Never** trigger entity events during migration
- **Never** skip unit of work for batch operations
