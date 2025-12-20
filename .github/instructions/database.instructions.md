---
applyTo: "**/Persistence/**,**/Migrations/**,**/*.sql,**/DbContext*.cs,**/Repositories/**"
---

# Database Development Patterns

## Repository Extensions Pattern

**CRITICAL**: Never create custom repository interfaces. Use static extension methods with static expressions.

```csharp
// Location: YourService.Domain/Repositories/EntityRepositoryExtensions.cs
public static class EntityRepositoryExtensions
{
    // Get by unique expression
    public static async Task<Entity> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Entity, string> repository,
        string code,
        CancellationToken cancellationToken = default,
        params Expression<Func<Entity, object?>>[] loadRelatedEntities)
    {
        return await repository
            .FirstOrDefaultAsync(
                Entity.UniqueCodeExpr(code),
                cancellationToken,
                loadRelatedEntities)
            .EnsureFound($"Entity not found with code: {code}");
    }

    // Get with validation
    public static async Task<List<Entity>> GetByIdsValidatedAsync(
        this IPlatformQueryableRootRepository<Entity, string> repository,
        List<string> ids,
        CancellationToken cancellationToken = default)
    {
        if (ids.IsNullOrEmpty()) return [];

        return await repository
            .GetAllAsync(p => ids.Contains(p.Id), cancellationToken)
            .EnsureFoundAllBy(p => p.Id, ids);
    }

    // Projected result (performance optimization)
    public static async Task<string> GetIdByCodeAsync(
        this IPlatformQueryableRootRepository<Entity, string> repository,
        string code,
        CancellationToken cancellationToken = default)
    {
        return await repository
            .FirstOrDefaultAsync(
                queryBuilder: query => query
                    .Where(Entity.UniqueCodeExpr(code))
                    .Select(p => p.Id),  // Projection - only fetch ID
                cancellationToken: cancellationToken)
            .EnsureFound($"Entity not found with code: {code}");
    }

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> GetFilterWithLicenseExprAsync(
        this IPlatformQueryableRootRepository<Entity, string> repository,
        IPlatformQueryableRootRepository<License, string> licenseRepo,
        string companyId,
        CancellationToken cancellationToken = default)
    {
        var hasLicense = await licenseRepo.AnyAsync(l => l.CompanyId == companyId && l.IsActive, cancellationToken);
        return hasLicense ? Entity.PremiumFilterExpr() : Entity.StandardFilterExpr();
    }
}
```

## Query Builder Patterns

```csharp
// Reusable query builder for complex queries
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
    .WhereIf(statuses.Any(), e => statuses.Contains(e.Status))
    .PipeIf(searchText.IsNotNullOrEmpty(), q =>
        fullTextSearchService.Search(q, searchText, Entity.SearchColumns()))
    .OrderByDescending(e => e.CreatedDate));

// Use in tuple queries for parallel execution
var (total, items, counts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .GroupBy(e => e.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
);
```

## Full-Text Search Patterns

```csharp
// In query handler
public class GetEntityListQueryHandler : PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    private readonly IPlatformFullTextSearchPersistenceService fullTextSearchService;
    private readonly IPlatformQueryableRootRepository<Entity, string> repository;

    protected override async Task<GetEntityListQueryResult> HandleAsync(
        GetEntityListQuery request, CancellationToken cancellationToken)
    {
        // Use .PipeIf() with full-text search for conditional search
        var queryBuilder = repository.GetQueryBuilder(query =>
            query
                .Where(e => e.IsActive)
                .PipeIf(
                    request.SearchText.IsNotNullOrEmpty(),
                    query => fullTextSearchService.Search(
                        query,
                        request.SearchText,
                        Entity.SearchColumns(),
                        fullTextAccurateMatch: true,
                        includeStartWithProps: Entity.SearchColumns()
                    )
                )
        );

        var (totalCount, pagedItems) = await (
            repository.CountAsync((uow, query) => queryBuilder(uow, query), cancellationToken),
            repository.GetAllAsync(
                (uow, query) => queryBuilder(uow, query)
                    .OrderByDescending(e => e.CreatedDate)
                    .PageBy(request.SkipCount, request.MaxResultCount),
                cancellationToken)
        );

        return new GetEntityListQueryResult(pagedItems, totalCount, request);
    }
}

// Define searchable columns in entity
public sealed class Entity : RootEntity<Entity, string>
{
    public static Expression<Func<Entity, object>>[] SearchColumns()
    {
        return [
            e => e.Name,
            e => e.Code,
            e => e.FullTextSearch,
            e => e.Email
        ];
    }
}
```

## Data Migration Patterns

### MongoDB Migration

```csharp
public class MigrateEntityData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20251022_MigrateEntityData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute()
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePage,
            queryBuilder);
    }

    private static async Task<List<Entity>> ExecutePage(
        int skip,
        int take,
        Func<IQueryable<Entity>, IQueryable<Entity>> queryBuilder,
        IPlatformQueryableRootRepository<Entity, string> repo,
        IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();

        var items = await repo.GetAllAsync(q => queryBuilder(q)
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(take));

        // Transform data
        foreach (var item in items)
        {
            item.NewField = TransformOldField(item.OldField);
        }

        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, cancellationToken: default);
        await unitOfWork.CompleteAsync();

        return items;
    }
}
```

### EF Core Migration

```csharp
// Add migration
dotnet ef migrations add AddEmployeeDepartment --project src/YourService.Persistence.SqlServer

// Migration file
public partial class AddEmployeeDepartment : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "DepartmentId",
            table: "Employees",
            type: "nvarchar(450)",
            nullable: true);

        migrationBuilder.CreateIndex(
            name: "IX_Employees_DepartmentId",
            table: "Employees",
            column: "DepartmentId");

        migrationBuilder.AddForeignKey(
            name: "FK_Employees_Departments_DepartmentId",
            table: "Employees",
            column: "DepartmentId",
            principalTable: "Departments",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Employees_Departments_DepartmentId",
            table: "Employees");

        migrationBuilder.DropIndex(
            name: "IX_Employees_DepartmentId",
            table: "Employees");

        migrationBuilder.DropColumn(
            name: "DepartmentId",
            table: "Employees");
    }
}
```

### Cross-Database Migration (One-Time Setup)

**IMPORTANT**: Use migrations ONLY for initial one-time data transfer. For ongoing sync, use message bus consumers.

```csharp
public class InitialSyncFromSourceService : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override string Name => "20240115_InitialSyncFromSourceService";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);  // Only run for DBs created before this date
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(TargetDbContext dbContext)
    {
        var sourceDbContext = RootServiceProvider.GetService<SourceDbContext>();
        var cutoffDate = new DateTime(2024, 1, 1);

        // Get source data
        var sourceEntities = await sourceDbContext.Entities
            .Where(e => e.CreatedDate < cutoffDate)
            .ToListAsync();

        // Map to target entities
        var targetEntities = sourceEntities.Select(e => new TargetEntity
        {
            Id = e.Id,
            Name = e.Name,
            MappedField = MapSourceField(e.SourceField)
        }).ToList();

        await targetRepository.CreateManyAsync(targetEntities);
    }
}
```

## Entity Static Expressions

```csharp
public sealed class Employee : RootEntity<Employee, string>
{
    // Simple filter expressions
    public static Expression<Func<Employee, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<Employee, bool>> IsActiveExpr()
        => e => e.Status == EmployeeStatus.Active && !e.IsDeleted;

    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;

    // Filter by collection
    public static Expression<Func<Employee, bool>> FilterByStatusExpr(List<EmployeeStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => e.Status.HasValue && statusSet.Contains(e.Status.Value);
    }

    // Composite expression with conditions
    public static Expression<Func<Employee, bool>> CanBeReviewerExpr(
        string companyId,
        int? minMonthsEmployed = null)
        => OfCompanyExpr(companyId)
            .AndAlso(IsActiveExpr())
            .AndAlso(e => e.User != null && e.User.IsActive)
            .AndAlsoIf(minMonthsEmployed != null, () => e =>
                e.StartDate <= Clock.UtcNow.AddMonths(-minMonthsEmployed!.Value));

    // Complex expression with multiple conditions
    public static Expression<Func<Employee, bool>> ComplexFilterExpr(
        string companyId,
        List<EmployeeStatus>? statuses = null,
        List<string>? departmentIds = null,
        string? searchText = null)
    {
        var expr = OfCompanyExpr(companyId);

        if (statuses?.Any() == true)
            expr = expr.AndAlso(FilterByStatusExpr(statuses));

        if (departmentIds?.Any() == true)
            expr = expr.AndAlso(e => departmentIds.Contains(e.DepartmentId));

        // Note: Full-text search should be in query builder, not static expression
        return expr;
    }
}
```

## Query Performance Patterns

```csharp
// Eager loading related entities
var employees = await repository.GetAllAsync(
    e => e.CompanyId == companyId,
    ct,
    loadRelatedEntities: e => e.Department, e => e.User);

// Projection for performance (only select needed fields)
var employeeIds = await repository.GetAllAsync(
    queryBuilder: q => q
        .Where(e => e.IsActive)
        .Select(e => e.Id),
    cancellationToken: ct);

// Batch processing with pagination
var total = await repository.CountAsync(filterExpr, ct);
var pageSize = 100;

for (int skip = 0; skip < total; skip += pageSize)
{
    var batch = await repository.GetAllAsync(
        queryBuilder: q => q
            .Where(filterExpr)
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(pageSize),
        cancellationToken: ct);

    await ProcessBatchAsync(batch, ct);
}
```

## Database Context Patterns

```csharp
// DbContext configuration
public class ServiceDbContext : DbContext
{
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Department> Departments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure entities
        modelBuilder.Entity<Employee>(entity =>
        {
            entity.ToTable("Employees");
            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .IsRequired()
                .HasMaxLength(200);

            entity.HasIndex(e => new { e.CompanyId, e.Code })
                .IsUnique();

            entity.HasOne(e => e.Department)
                .WithMany()
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
```

## Transaction Patterns

```csharp
// Unit of Work pattern
using (var uow = unitOfWorkManager.Begin())
{
    var entity1 = await repository1.CreateAsync(data1, ct);
    var entity2 = await repository2.CreateAsync(data2, ct);

    await uow.CompleteAsync();  // Commit transaction
}

// Parallel operations with shared UoW
await unitOfWorkManager.ExecuteInjectScopedAsync(async (repo1, repo2, uow) =>
{
    using var unitOfWork = uow.Begin();

    var (result1, result2) = await (
        repo1.CreateAsync(data1, ct),
        repo2.CreateAsync(data2, ct)
    );

    await unitOfWork.CompleteAsync();
});
```

## Anti-Patterns

```csharp
// ❌ WRONG: Custom repository interface
public interface IEmployeeRepository
{
    Task<Employee> GetByCodeAsync(string code);
}

// ✅ CORRECT: Static extension method
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        string code,
        CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Employee.CodeExpr(code), ct).EnsureFound();
}

// ❌ WRONG: Direct DbContext query in handler
var employees = await dbContext.Employees.Where(e => e.IsActive).ToListAsync();

// ✅ CORRECT: Use repository
var employees = await repository.GetAllAsync(Employee.IsActiveExpr(), ct);

// ❌ WRONG: Manual transaction management
await dbContext.Database.BeginTransactionAsync();
try { /* operations */ await dbContext.SaveChangesAsync(); transaction.Commit(); }
catch { transaction.Rollback(); }

// ✅ CORRECT: Use Unit of Work
using (var uow = unitOfWorkManager.Begin()) { /* operations */ await uow.CompleteAsync(); }

// ❌ WRONG: N+1 query problem
foreach (var employee in employees)
{
    var department = await repository.GetByIdAsync(employee.DepartmentId);
}

// ✅ CORRECT: Eager loading
var employees = await repository.GetAllAsync(expr, ct, e => e.Department);
```
