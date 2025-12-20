# Backend Development Patterns

## Entity Development

### Entity Base Classes
- Non-audited: `RootEntity<TEntity, TKey>`
- Audited: `RootAuditedEntity<TEntity, TKey, TAuditKey>`

### Entity Features
- Use `[TrackFieldUpdatedDomainEvent]` for automatic change tracking
- Use `[ComputedEntityProperty]` for derived properties (MUST have empty `set { }`)
- Define static expressions for queries: `public static Expression<Func<TEntity, bool>> UniqueExpr(...)`
- Define `DefaultFullTextSearchColumns()` for searchable properties

### Entity Expression Patterns
```csharp
// Basic filter expression
public static Expression<Func<Entity, bool>> OfCompanyExpr(string companyId)
    => e => e.CompanyId == companyId;

// Composite expression with AndAlso/OrElse
public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive)
    => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

// Async expression with dependencies
public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(...)
```

## Controller Patterns

### Base Controller
- Extend `PlatformBaseController`
- Use `[PlatformAuthorize(...)]` for authorization
- Inject CQRS via `Cqrs.SendAsync(command)`

### Controller Methods
```csharp
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand command)
    => Ok(await Cqrs.SendAsync(command));

[HttpGet]
public async Task<IActionResult> Get([FromQuery] GetQuery query)
    => Ok(await Cqrs.SendAsync(query));
```

## Helper vs Util Pattern

### Helper (with dependencies)
- Location: `{Service}.Application\Helpers\`
- Injectable service with repository/service dependencies
- Implements `IPlatformHelper`
- Example: `GetOrCreateEmployeeAsync(userId, companyId, ct)`

### Util (pure functions)
- Location: `Easy.Platform.Application.Utils` or `{Service}.Application.Utils`
- Static class with no dependencies
- Example: `StringUtil.IsNullOrEmpty()`, `DateUtil.Format()`

## Fluent Helper Extensions

### Mutation Helpers
```csharp
entity.With(e => e.Name = newName)
      .WithIf(condition, e => e.Status = Status.Active);
```

### Transformation Helpers
```csharp
await repository.GetByIdAsync(id)
    .Then(e => e.PerformLogic())
    .ThenAsync(async e => await e.ValidateAsync(service, ct));
```

### Safety Helpers
```csharp
await entity.ValidateAsync(repo, ct).EnsureValidAsync();
var entity = await repository.GetByIdAsync(id).EnsureFound($"Not found: {id}");
var items = await repository.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);
```

### Collection Helpers
```csharp
var ids = await repository.GetByIdsAsync(ids, ct).ThenSelect(e => e.Id);
await items.ParallelAsync(async item => await ProcessAsync(item, ct), maxConcurrent: 10);
```

## Parallel Tuple Await Pattern
```csharp
var (users, companies, settings) = await (
    userRepository.GetAllAsync(...),
    companyRepository.GetAllAsync(...),
    settingsRepository.GetAllAsync(...)
);
```

## Request Context Usage
```csharp
RequestContext.CurrentCompanyId()
RequestContext.UserId()
RequestContext.ProductScope()
RequestContext.HasRequestAdminRoleInCompany()
await RequestContext.CurrentEmployee()
```
