# Create Migration: $ARGUMENTS

Create a data or schema migration following EasyPlatform patterns.

## Phase 1: Analyze Requirements

1. **Parse migration description** from: $ARGUMENTS
2. **Identify migration type:**
    - Schema migration (EF Core) - for SQL Server/PostgreSQL table changes
    - Data migration (PlatformDataMigrationExecutor) - for data transformations
    - MongoDB migration (PlatformMongoMigrationExecutor) - for MongoDB changes

3. **Search for existing patterns:**
    - `src/PlatformExampleApp/*/Persistence/Migrations/` for schema migrations
    - Search for `PlatformDataMigrationExecutor` implementations

## Phase 2: Design Migration

1. **Determine affected entities and tables**
2. **Plan rollback strategy if applicable**
3. **Consider data volume and performance:**
    - Use paging for large datasets (PageSize: 200-500)
    - Set `dismissSendEvent: true` if entity events not needed
    - Use `checkDiff: false` for bulk updates

## Phase 3: Generate Migration

Follow naming convention: `YYYYMMDDHHMMSS_MigrationName`

**For EF Core Schema Migration:**

```bash
dotnet ef migrations add MigrationName --project src/PlatformExampleApp/{Service}/{Service}.Persistence
```

**For Data Migration (SQL Server/PostgreSQL):**

```csharp
public class YYYYMMDDHHMMSS_MigrationName : PlatformDataMigrationExecutor<{Service}DbContext>
{
    public override string Name => "YYYYMMDDHHMMSS_MigrationName";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(YYYY, MM, DD);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute({Service}DbContext dbContext)
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
        // Apply transformations
        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false);
        await unitOfWork.CompleteAsync();
        return items;
    }
}
```

**For MongoDB Migration:**

```csharp
internal sealed class YYYYMMDDHHMMSS_MigrationName : PlatformMongoMigrationExecutor<{Service}DbContext>
{
    public override string Name => "YYYYMMDDHHMMSS_MigrationName";
    public override DateTime? OnlyForDbInitBeforeDate => new(YYYY, MM, DD);
    public override DateTime? ExpirationDate => new(YYYY, MM, DD); // Optional: auto-delete after date

    public override async Task Execute({Service}DbContext dbContext)
    {
        // Ensure indexes
        await dbContext.EnsureInboxBusMessageCollectionIndexesAsync(true);
        await dbContext.EnsureOutboxBusMessageCollectionIndexesAsync(true);

        // Or custom index/data operations
        var collection = dbContext.GetCollection<Entity>();
        await collection.Indexes.CreateOneAsync(
            new CreateIndexModel<Entity>(
                Builders<Entity>.IndexKeys.Ascending(e => e.Field),
                new CreateIndexOptions { Unique = true }));
    }
}
```

## Phase 4: Verify

- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Large datasets use paging
- [ ] Proper error handling
- [ ] Unit of work for transactions
- [ ] `OnlyForDbsCreatedBeforeDate` set correctly
- [ ] Tested with sample data

## Phase 5: Wait for Approval

**CRITICAL:** Present your migration design and wait for explicit user approval before creating files.

---

Use `backend-data-migration` skill for detailed guidance.
