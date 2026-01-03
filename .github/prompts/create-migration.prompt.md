---
agent: agent
description: Create data or schema migrations following EasyPlatform patterns. Supports EF Core, PlatformDataMigration, and MongoDB migrations.
---

# Create Migration

## Required Reading

**Before implementing, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for data migrations, paged processing

---

Create a data or schema migration following EasyPlatform patterns.

## Migration Description
$input

## Phase 1: Analyze Requirements

### Identify Migration Type

| Type | Use When | Tool |
|------|----------|------|
| **Schema Migration** | Table structure changes (add/modify columns, indexes) | EF Core |
| **Data Migration** | Data transformations, backfills (SQL Server/PostgreSQL) | PlatformDataMigrationExecutor |
| **MongoDB Migration** | MongoDB index/data changes | PlatformMongoMigrationExecutor |

### Search for Existing Patterns

```
src/PlatformExampleApp/*/Persistence/Migrations/    # EF Core migrations
**/DataMigrations/*.cs                    # Platform data migrations
```

## Phase 2: Design Migration

1. **Determine affected entities and tables**
2. **Plan rollback strategy if applicable**
3. **Consider data volume and performance:**
   - Use paging for large datasets (PageSize: 200-500)
   - Set `dismissSendEvent: true` if entity events not needed
   - Use `checkDiff: false` for bulk updates

## Phase 3: Generate Migration

### Naming Convention
`YYYYMMDDHHMMSS_MigrationName`

---

### EF Core Schema Migration

```bash
dotnet ef migrations add MigrationName --project src/PlatformExampleApp/{Service}/{Service}.Persistence
```

```csharp
public partial class MigrationName : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "NewColumn",
            table: "TableName",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "NewColumn",
            table: "TableName");
    }
}
```

---

### Platform Data Migration (SQL Server/PostgreSQL)

Location: `{Service}.Application/DataMigrations/`

```csharp
public class YYYYMMDDHHMMSS_MigrationName : PlatformDataMigrationExecutor<{Service}DbContext>
{
    public override string Name => "YYYYMMDDHHMMSS_MigrationName";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(YYYY, MM, DD);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute({Service}DbContext dbContext)
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(FilterExpr())),
            pageSize: 200,
            processingDelegate: async (skip, take, repo, uow) =>
            {
                using var unitOfWork = uow.Begin();
                var items = await repo.GetAllAsync(q => q
                    .Where(FilterExpr())
                    .OrderBy(e => e.Id)
                    .Skip(skip)
                    .Take(take));

                // Apply transformations
                foreach (var item in items)
                {
                    // Transform data
                }

                await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false);
                await unitOfWork.CompleteAsync();
                return items;
            });
    }

    private static Expression<Func<Entity, bool>> FilterExpr()
        => e => e.NeedsMigration; // Your filter condition
}
```

---

### MongoDB Migration

Location: `{Service}.Application/DataMigrations/`

```csharp
internal sealed class YYYYMMDDHHMMSS_MigrationName : PlatformMongoMigrationExecutor<{Service}DbContext>
{
    public override string Name => "YYYYMMDDHHMMSS_MigrationName";
    public override DateTime? OnlyForDbInitBeforeDate => new(YYYY, MM, DD);
    public override DateTime? ExpirationDate => new(YYYY, MM, DD); // Optional

    public override async Task Execute({Service}DbContext dbContext)
    {
        // Ensure indexes
        await dbContext.EnsureInboxBusMessageCollectionIndexesAsync(true);
        await dbContext.EnsureOutboxBusMessageCollectionIndexesAsync(true);

        // Or custom operations
        var collection = dbContext.GetCollection<Entity>();
        await collection.Indexes.CreateOneAsync(
            new CreateIndexModel<Entity>(
                Builders<Entity>.IndexKeys.Ascending(e => e.Field),
                new CreateIndexOptions { Unique = true }));
    }
}
```

## Phase 4: Verification Checklist

- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Large datasets use paging (PageSize: 200-500)
- [ ] Proper error handling with transactions
- [ ] Unit of work for atomic operations
- [ ] `OnlyForDbsCreatedBeforeDate` set to appropriate date
- [ ] `dismissSendEvent: true` if events not needed
- [ ] `checkDiff: false` for bulk updates
- [ ] Tested with sample data

## Phase 5: Wait for Approval

**CRITICAL:** Present the migration design and **WAIT for explicit approval** before creating files.

## Key Patterns

| Pattern | Purpose |
|---------|---------|
| `ExecuteInjectScopedPagingAsync` | Paged processing with DI |
| `dismissSendEvent: true` | Skip entity events during bulk ops |
| `checkDiff: false` | Skip change detection for performance |
| `OnlyForDbsCreatedBeforeDate` | Run only on existing DBs |
