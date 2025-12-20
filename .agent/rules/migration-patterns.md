# Migration Patterns

## EF Core Migrations (SQL Server/PostgreSQL)

### Creating Migrations
```bash
# Add new migration
dotnet ef migrations add AddEmployeeFields --project {Service}.Persistence

# Update database
dotnet ef database update --project {Service}.Persistence
```

### Migration Structure
```csharp
public partial class AddEmployeeFields : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Department",
            table: "Employees",
            type: "nvarchar(100)",
            maxLength: 100,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Department", table: "Employees");
    }
}
```

## MongoDB Data Migrations

### Migration Executor
```csharp
public class MigrateEmployeeData : PlatformMongoMigrationExecutor
{
    public override string Name => "20240115_MigrateEmployeeData";

    public override async Task Execute()
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(FilterExpr())),
            pageSize: 200,
            async (skip, take, repo, uow) =>
            {
                var items = await repo.GetAllAsync(q => q.Skip(skip).Take(take));
                // Transform data
                await repo.UpdateManyAsync(items, dismissSendEvent: true);
                return items;
            });
    }
}
```

## Platform Data Migrations

### Data Migration Executor
```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
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

    private static async Task<List<Entity>> ExecutePaging(
        int skip, int take,
        Func<IQueryable<Entity>, IQueryable<Entity>> qb,
        IRepo<Entity> repo,
        IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();
        var items = await repo.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));

        // Transform items
        foreach (var item in items)
        {
            item.NewField = CalculateNewValue(item);
        }

        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, cancellationToken: default);
        await unitOfWork.CompleteAsync();
        return items;
    }
}
```

## Cross-Database Migration

### First-Time Sync (One-Time Setup)
```csharp
public class SyncDataFromSourceToTarget : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);

    public override async Task Execute(TargetDbContext dbContext)
    {
        var sourceEntities = await sourceDbContext.Entities
            .Where(e => e.CreatedDate < cutoffDate)
            .ToListAsync();

        await targetRepository.CreateManyAsync(
            sourceEntities.Select(e => e.MapToTargetEntity()));
    }
}
```

### Ongoing Sync (Use Events)
For ongoing cross-service synchronization, use Entity Event Bus - NOT migrations.

## Migration Best Practices

### Naming Convention
`YYYYMMDDHHMMSS_DescriptiveName`
- Example: `20251022143000_AddEmployeeDepartmentField`

### Key Practices
- Use `OnlyForDbsCreatedBeforeDate` to target specific databases
- Use paged processing for large data sets
- Use `dismissSendEvent: true` to prevent event cascades
- Use `checkDiff: false` for performance when updating many records
- Wrap operations in unit of work for transactions
- Test migrations on staging before production

### Rollback Strategy
- EF Core: Implement both `Up()` and `Down()` methods
- MongoDB: Create reverse migration if needed
- Always backup before running migrations in production

## Background Job Migration Pattern

For very large migrations, use background jobs:
```csharp
[PlatformRecurringJob("0 3 * * *")]  // Run at 3 AM daily
public sealed class DataMigrationJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 100;

    protected override async Task ProcessPagedAsync(int? skip, int? take, ...)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await MigrateItem(item));
    }
}
```
