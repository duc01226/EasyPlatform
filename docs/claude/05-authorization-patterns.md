# Authorization Patterns

## Backend Authorization

### Controller Level

```csharp
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));
```

### Handler Level Validation

```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(
            e => e.CompanyId == RequestContext.CurrentCompanyId()),
            "Same company only");
}
```

### Entity-Level Query Filter

```csharp
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage
var employees = await repository.GetAllAsync(
    Employee.OfCompanyExpr(companyId)
        .AndAlso(Employee.UserCanAccessExpr(userId, companyId)),
    ct);
```

## Frontend Authorization

### Component Properties

```typescript
export class EmployeeFormComponent extends AppBaseFormComponent<EmployeeFormVm> {
    get canEdit() {
        return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany();
    }

    get canDelete() {
        return this.hasRole(PlatformRoles.Admin);
    }
}
```

### Template Guards

```html
@if (hasRole(PlatformRoles.Admin)) {
<button (click)="delete()">Delete</button>
}
```

### Route Guards

```typescript
canActivate(): Observable<boolean> {
    return this.authService.hasRole$(PlatformRoles.Admin);
}
```

---

# Migration Patterns

## EF Core Migrations

```csharp
public partial class AddEmployeeFields : Migration
{
    protected override void Up(MigrationBuilder mb)
    {
        mb.AddColumn<string>("Department", "Employees");
    }
}

// Commands:
// dotnet ef migrations add AddEmployeeFields
// dotnet ef database update
```

## MongoDB Migrations

```csharp
public class MigrateEmployeeData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_MigrateEmployeeData";

    public override async Task Execute()
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(...)),
            pageSize: 200,
            async (skip, take, repo, uow) => {
                var items = await repo.GetAllAsync(q => q.Skip(skip).Take(take));
                await repo.UpdateManyAsync(items, dismissSendEvent: true);
                return items;
            });
    }
}
```

## Data Migration with Paging

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
        using (var unitOfWork = uow.Begin())
        {
            var items = await repo.GetAllAsync(q =>
                qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
            await repo.UpdateManyAsync(items,
                dismissSendEvent: true, checkDiff: false, cancellationToken: default);
            await unitOfWork.CompleteAsync();
            return items;
        }
    }
}
```

## Key Migration Practices

- `OnlyForDbsCreatedBeforeDate` - Target specific DB versions
- `dismissSendEvent: true` - Don't trigger entity events during migration
- Use paged processing for large datasets
- Wrap in unit of work for transactions
- For ongoing sync, use message bus events (not migrations)
