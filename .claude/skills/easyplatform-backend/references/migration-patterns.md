# Data Migration Patterns Reference

## Migration Type Decision

```
Is this a schema change?
├── YES → EF Core Migration
│   ├── SQL Server: dotnet ef migrations add {Name}
│   └── PostgreSQL: dotnet ef migrations add {Name}
│
└── NO → Data Migration
    ├── MongoDB: PlatformMongoMigrationExecutor<TDbContext>
    └── SQL/PostgreSQL: PlatformDataMigrationExecutor<TDbContext>
```

---

## File Locations

### EF Core Schema Migrations

```
{Service}.Persistence/
└── Migrations/
    └── {Timestamp}_{MigrationName}.cs
```

### Data Migrations

```
{Service}.Application/
└── DataMigrations/
    └── {Date}_{MigrationName}DataMigration.cs
```

---

## Pattern 1: EF Core Schema Migration

```bash
# Navigate to persistence project
cd src/Services/bravoGROWTH/Growth.Persistence

# Add migration
dotnet ef migrations add AddEmployeePhoneNumber

# Apply migration
dotnet ef database update

# Rollback last migration
dotnet ef migrations remove
```

```csharp
public partial class AddEmployeePhoneNumber : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "PhoneNumber",
            table: "Employees",
            type: "nvarchar(50)",
            maxLength: 50,
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Employees_PhoneNumber",
            table: "Employees",
            column: "PhoneNumber");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Employees_PhoneNumber",
            table: "Employees");

        migrationBuilder.DropColumn(
            name: "PhoneNumber",
            table: "Employees");
    }
}
```

---

## Pattern 2: Data Migration (SQL/PostgreSQL)

```csharp
public sealed class MigrateEmployeePhoneNumbers : PlatformDataMigrationExecutor<GrowthDbContext>
{
    public override string Name => "20251015000000_MigrateEmployeePhoneNumbers";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 15);
    public override bool AllowRunInBackgroundThread => true;

    private readonly IGrowthRootRepository<Employee> employeeRepo;
    private const int PageSize = 200;

    public override async Task Execute(GrowthDbContext dbContext)
    {
        var queryBuilder = employeeRepo.GetQueryBuilder((uow, q) =>
            q.Where(e => e.PhoneNumber == null && e.LegacyPhone != null));

        var totalCount = await employeeRepo.CountAsync((uow, q) => queryBuilder(uow, q));

        if (totalCount == 0)
        {
            Logger.LogInformation("No employees need phone migration");
            return;
        }

        Logger.LogInformation("Migrating phone numbers for {Count} employees", totalCount);

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: totalCount,
            pageSize: PageSize,
            processingDelegate: ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<Employee>> ExecutePaging(
        int skip,
        int take,
        Func<IPlatformUnitOfWork, IQueryable<Employee>, IQueryable<Employee>> queryBuilder,
        IGrowthRootRepository<Employee> repo,
        IPlatformUnitOfWorkManager uowManager)
    {
        using var unitOfWork = uowManager.Begin();

        var employees = await repo.GetAllAsync((uow, q) =>
            queryBuilder(uow, q)
                .OrderBy(e => e.Id)
                .Skip(skip)
                .Take(take));

        if (employees.IsEmpty()) return employees;

        foreach (var employee in employees)
        {
            employee.PhoneNumber = NormalizePhoneNumber(employee.LegacyPhone);
        }

        await repo.UpdateManyAsync(
            employees,
            dismissSendEvent: true,
            checkDiff: false);

        await unitOfWork.CompleteAsync();

        return employees;
    }
}
```

---

## Pattern 3: MongoDB Migration

```csharp
public sealed class MigrateDocumentSchema : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20251015_MigrateDocumentSchema";

    private readonly IMongoCollection<BsonDocument> collection;
    private const int BatchSize = 100;

    public override async Task Execute()
    {
        var filter = Builders<BsonDocument>.Filter.Exists("oldFieldName");

        var totalCount = await collection.CountDocumentsAsync(filter);
        var processed = 0;

        while (processed < totalCount)
        {
            var documents = await collection
                .Find(filter)
                .Limit(BatchSize)
                .ToListAsync();

            if (documents.Count == 0) break;

            var bulkOps = documents.Select(doc =>
            {
                var update = Builders<BsonDocument>.Update
                    .Set("newFieldName", doc["oldFieldName"])
                    .Unset("oldFieldName");

                return new UpdateOneModel<BsonDocument>(
                    Builders<BsonDocument>.Filter.Eq("_id", doc["_id"]),
                    update);
            }).ToList();

            await collection.BulkWriteAsync(bulkOps);

            processed += documents.Count;
            Logger.LogInformation("Migrated {Processed}/{Total} documents", processed, totalCount);
        }
    }
}
```

---

## Pattern 4: Cross-Service Data Sync (One-Time)

```csharp
public sealed class SyncEmployeesFromAccounts : PlatformDataMigrationExecutor<GrowthDbContext>
{
    public override string Name => "20251015000000_SyncEmployeesFromAccounts";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 15);

    public override async Task Execute(GrowthDbContext dbContext)
    {
        var sourceEmployees = await accountsDbContext.Employees
            .Where(e => e.CreatedDate < OnlyForDbsCreatedBeforeDate)
            .AsNoTracking()
            .ToListAsync();

        Logger.LogInformation("Syncing {Count} employees from Accounts", sourceEmployees.Count);

        var targetEmployees = sourceEmployees.Select(MapToGrowthEmployee).ToList();

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: targetEmployees.Count,
            pageSize: 100,
            async (skip, take, repo, uow) =>
            {
                var batch = targetEmployees.Skip(skip).Take(take).ToList();
                await repo.CreateManyAsync(batch, dismissSendEvent: true);
                return batch;
            });
    }
}
```

---

## Scrolling vs Paging

```csharp
// PAGING: When skip/take stays consistent
// (items don't disappear from query after processing)
await RootServiceProvider.ExecuteInjectScopedPagingAsync(...);

// SCROLLING: When processed items excluded from next query
// (e.g., status change means item no longer matches filter)
await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync(...);
```

---

## Key Options & Flags

| Option | Purpose | When to Use |
|--------|---------|-------------|
| `OnlyForDbsCreatedBeforeDate` | Target specific DBs | Migrating existing data only |
| `AllowRunInBackgroundThread` | Non-blocking | Large migrations that can run async |
| `dismissSendEvent: true` | Skip entity events | Data migrations (avoid event storms) |
| `checkDiff: false` | Skip change detection | Bulk updates (performance) |

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| No paging for large datasets | Use `ExecuteInjectScopedPagingAsync` |
| Send events during migration | `dismissSendEvent: true` |
| Missing unit of work | `using var uow = uowManager.Begin()` |
| Use migration for ongoing sync | Use message bus consumers |
