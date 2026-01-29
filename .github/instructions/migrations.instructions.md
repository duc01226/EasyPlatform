---
applyTo: "**/DataMigrations/**/*.cs,**/Migrations/**/*.cs"
---

# Data Migration Patterns

> Auto-loads when editing Migration files. See `docs/claude/backend-patterns.md` for full reference.

## EF Core Migration

```csharp
public partial class AddEmployeeFields : Migration
{
    protected override void Up(MigrationBuilder mb) { mb.AddColumn<string>("Department", "Employees"); }
}
// Commands: dotnet ef migrations add Name | dotnet ef database update
```

## Platform Data Migration (MongoDB/SQL Server/PostgreSQL)

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(FilterExpr())),
            pageSize: 200,
            async (skip, take, repo, uow) => {
                using var unit = uow.Begin();
                var items = await repo.GetAllAsync(q => q.OrderBy(e => e.Id).Skip(skip).Take(take));
                await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false);
                await unit.CompleteAsync();
                return items;
            });
    }
}
```

## MongoDB-Specific Migration

```csharp
public class MigrateData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_Migrate";
    public override async Task Execute() => await RootServiceProvider.ExecuteInjectScopedPagingAsync(
        await repo.CountAsync(q => q.Where(...)), 200,
        async (skip, take, r, u) => {
            var items = await r.GetAllAsync(q => q.Skip(skip).Take(take));
            await r.UpdateManyAsync(items, dismissSendEvent: true);
            return items;
        });
}
```

## Critical Rules

1. **Always paginate** migration processing - never load all at once
2. **Use `dismissSendEvent: true`** to avoid triggering entity events during migration
3. **Set `OnlyForDbsCreatedBeforeDate`** to prevent re-running on new databases
4. **Name format:** `{yyyyMMddHHmmss}_{Description}` (e.g., `20251022000000_MigrateData`)
5. **Use Unit of Work** for batch operations in EF migrations
6. **Cross-DB migration** should only be for first-time setup; use events for ongoing sync
