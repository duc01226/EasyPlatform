# Troubleshooting & Support

> Common issues and solutions for EasyPlatform development

## Common Issues & Solutions

| Issue                          | Solution                                                               |
| ------------------------------ | ---------------------------------------------------------------------- |
| **Build failures**             | Check platform package versions and run `dotnet restore`               |
| **Missing repositories**       | Search for `IPlatformQueryableRootRepository` in Domain project        |
| **Component not found**        | Verify inheritance chain and check available base class methods        |
| **API calls failing**          | Verify service is running and check endpoint routes                    |
| **Database connection issues** | Ensure infrastructure is started with docker-compose                   |
| **Entity event not firing**    | Verify event handler is in `UseCaseEvents/` folder with correct naming |
| **Validation not working**     | Check if using `PlatformValidationResult` fluent API correctly         |
| **Store not updating UI**      | Ensure using signals and proper change detection                       |
| **FormArray not validating**   | Check `dependentValidations` configuration                             |

## Build & Compilation Errors

### .NET Build Failures

```bash
# Clean and restore
dotnet clean EasyPlatform.sln
dotnet restore EasyPlatform.sln

# Rebuild
dotnet build EasyPlatform.sln
```

### Angular Build Failures

```bash
# Clear cache and reinstall
cd src/PlatformExampleAppWeb
rm -rf node_modules
npm cache clean --force
npm install

# Rebuild
nx build playground-text-snippet
```

### Missing Dependencies

```bash
# Check Easy.Platform versions
dotnet list package | grep Easy.Platform

# Update platform packages
dotnet add package Easy.Platform --version <latest>
```

## Runtime Errors

### Repository Not Found

```csharp
// Error: Cannot resolve IPlatformQueryableRootRepository<Entity, string>

// Solution: Check registration in DI container
// Ensure entity is registered in DbContext
public class TextSnippetDbContext : PlatformDbContext
{
    public DbSet<Entity> Entities { get; set; }  // Add this
}
```

### Entity Event Handler Not Called

```csharp
// Checklist:
// 1. Handler in UseCaseEvents/ folder (NOT DomainEventHandlers/)
// 2. Correct naming: [Action]On[Event][Entity]EntityEventHandler
// 3. Single generic parameter: PlatformCqrsEntityEventApplicationHandler<Entity>
// 4. HandleWhen() is public override async Task<bool> (NOT protected bool)
// 5. Check filter logic in HandleWhen()
```

### Message Bus Consumer Not Processing

```csharp
// Checklist:
// 1. Consumer registered in DI
// 2. HandleWhen() returns true for the message
// 3. RabbitMQ is running (check localhost:15672)
// 4. Check message routing key matches
// 5. LastMessageSyncDate handling for race conditions
```

## Frontend Issues

### Component State Not Updating

```typescript
// Problem: UI not reflecting state changes

// Solution 1: Ensure using signals
public vm = this.store.vm$;  // Not just this.store.state

// Solution 2: Check change detection
this.cdr.detectChanges();  // Force update if needed

// Solution 3: Verify subscription
.pipe(this.untilDestroyed()).subscribe();  // Ensure subscribed
```

### Form Validation Not Working

```typescript
// Problem: Async validators not running

// Solution: Use ifAsyncValidator
new FormControl('', [], [
  ifAsyncValidator(() => this.form.valid, asyncValidator)  // Runs only if sync valid
]);

// Problem: Dependent validation not triggering
// Solution: Configure dependentValidations
protected initialFormConfig = () => ({
  controls: { ... },
  dependentValidations: { email: ['firstName'] }  // email revalidates when firstName changes
});
```

### API Service Errors

```typescript
// Problem: Requests failing silently

// Solution: Use proper error handling
this.api
    .getData()
    .pipe(
        this.observerLoadingErrorState('loadData'), // Tracks loading/error state
        this.tapResponse(
            data => this.handleSuccess(data),
            error => this.handleError(error) // Handle errors explicitly
        )
    )
    .subscribe();
```

## Database Issues

### Connection Failures

```bash
# Verify infrastructure is running
docker ps | grep sql
docker ps | grep mongo
docker ps | grep postgres

# Start infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Migration Errors

```bash
# EF Core migrations
dotnet ef migrations add NewMigration
dotnet ef database update

# Check pending migrations
dotnet ef migrations list
```

## Performance Issues

### Slow Queries

```csharp
// Problem: N+1 queries

// Solution: Use eager loading
await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.Company, e => e.Departments);

// Solution: Use projection
await repository.FirstOrDefaultAsync(
    query => query.Where(...).Select(e => new { e.Id, e.Name }), ct);
```

### Memory Issues

```csharp
// Problem: Large data sets

// Solution: Use paging
var queryBuilder = repository.GetQueryBuilder((uow, q) =>
    q.Where(...).OrderBy(e => e.Id).PageBy(skip, take));

// Solution: Use streaming for exports
await foreach (var entity in repository.AsAsyncEnumerable(expr))
{
    yield return entity;
}
```

## Getting Help

1. **Study Platform Example:** `src/PlatformExampleApp` for working patterns
2. **Search Documentation:**
    - Use grep/semantic search tools
    - Check `ai-prompt-context.md` for solution planning
3. **Check Existing Implementations:**
    - Look for similar features in the codebase
    - Search for patterns in existing handlers/components
4. **Follow Training Materials:**
    - See README.md learning paths section
    - Check ../architecture-overview.md for architecture details

## Debugging Protocol

When debugging issues, follow the [AI Debugging Protocol](.github/AI-DEBUGGING-PROTOCOL.md):

1. **Never assume** based on first glance
2. **Verify with multiple search patterns**
3. **Check both static AND dynamic code usage**
4. **Read actual implementations**, not just interfaces
5. **Trace full dependency chains**
6. **Declare confidence level** and uncertainties
7. **Request user confirmation** when confidence < 90%

## Quality Checklist

Before considering a task complete:

- [ ] Follows Clean Architecture layers correctly
- [ ] Uses platform validation patterns
- [ ] Implements proper error handling
- [ ] Uses platform repositories correctly
- [ ] Includes unit tests for business logic
- [ ] No direct cross-service dependencies
- [ ] Uses message bus for cross-service communication
- [ ] Proper authorization checks
- [ ] Input validation implemented
