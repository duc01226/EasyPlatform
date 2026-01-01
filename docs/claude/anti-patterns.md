# Critical Anti-Patterns to Avoid

> Common mistakes and how to avoid them in EasyPlatform development

## Backend Anti-Patterns

### Direct Cross-Service Database Access

```csharp
// DON'T: Direct access to another service's database
var otherServiceData = await otherDbContext.Entities.ToListAsync();

// DO: Use message bus communication
await messageBus.PublishAsync(new RequestDataMessage());
```

### Custom Repository Interfaces

```csharp
// DON'T: Create custom repository interfaces
public interface ICustomEmployeeRepository : IRepository<Employee>

// DO: Use platform repositories with extensions
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IPlatformQueryableRootRepository<Employee, string> repository,
        string email)
    {
        return await repository.GetSingleOrDefaultAsync(
            Employee.ByEmailExpression(email));
    }
}
```

### Manual Validation Logic

```csharp
// DON'T: Manual validation with exceptions
if (string.IsNullOrEmpty(request.Name))
    throw new ValidationException("Name required");

// DO: Use Platform validation fluent API
return request.Validate(r => !string.IsNullOrEmpty(r.Name), "Name required");
```

### Direct Side Effects in Command Handlers

```csharp
// DON'T: Call side effects directly in handlers
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // BREAKS event-driven architecture!
    return new Result();
}

// DO: Let platform auto-raise entity events
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    // NO AddDomainEvent() needed - platform handles it automatically
    await repository.CreateAsync(newEntity, ct);  // Event handler sends notification
    return new Result();
}

// Handle side effects in event handler (in UseCaseEvents/ folder)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>  // Single generic param!
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### DTO Mapping in Command Handlers

```csharp
// DON'T: Map DTO to entity in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = new AuthConfigurationValue  // Mapping logic in handler!
    {
        ClientId = req.Dto.ClientId,
        ClientSecret = req.Dto.ClientSecret,
        BaseUrl = req.Dto.BaseUrl
    };
}

// DO: Use PlatformDto - let DTO own mapping responsibility
public sealed class AuthConfigurationValueDto : PlatformDto<AuthConfigurationValue>
{
    public override AuthConfigurationValue MapToObject() => new AuthConfigurationValue
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret,
        BaseUrl = BaseUrl
    };
}

// Handler uses dto.MapToObject() and .With() for transformations
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = req.AuthConfiguration.MapToObject()
        .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));
}
```

## Frontend Anti-Patterns

### Direct HTTP Client Usage

```typescript
// DON'T: Use HttpClient directly
constructor(private http: HttpClient) {}

getData() {
  return this.http.get('/api/data');
}

// DO: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}

getData() {
  return this.employeeApi.getEmployees();
}
```

### Manual State Management

```typescript
// DON'T: Manual state management with signals
employees = signal([]);
loading = signal(false);
error = signal<string | null>(null);

loadData() {
  this.loading.set(true);
  this.api.getEmployees().subscribe({
    next: data => { this.employees.set(data); this.loading.set(false); },
    error: err => { this.error.set(err.message); this.loading.set(false); }
  });
}

// DO: Use platform store pattern
constructor(private store: EmployeeStore) {}

loadData() {
  this.store.loadEmployees();  // Handles loading/error state automatically
}
```

### Assuming Base Class Methods

```typescript
// DON'T: Assume method names without verification
this.someMethod(); // Might not exist on base class

// DO: Check base class APIs through IntelliSense first
// Verify method exists in PlatformComponent, PlatformVmComponent, etc.
// Use IDE autocomplete to see available methods
```

### Ignoring Component Lifecycle

```typescript
// DON'T: Manual subscription management
ngOnInit() {
  this.subscription = this.data$.subscribe(...);
}
ngOnDestroy() {
  this.subscription.unsubscribe();  // Easy to forget!
}

// DO: Use platform lifecycle helpers
ngOnInit() {
  this.data$
    .pipe(this.untilDestroyed())  // Auto-cleanup on destroy
    .subscribe(...);
}
```

### Not Using Loading Indicators

```typescript
// DON'T: No loading state feedback
loadData() {
  this.api.getData().subscribe(data => this.data = data);
}

// DO: Use platform loading/error state tracking
loadData() {
  this.api.getData()
    .pipe(
      this.observerLoadingErrorState('loadData'),
      this.tapResponse(data => this.data = data)
    ).subscribe();
}
```

## Common Architecture Mistakes

### Skipping Plan Mode

```
// DON'T: Jump straight into coding
User: "Add a new feature"
Claude: *starts writing code immediately*

// DO: Always plan first for non-trivial tasks
User: "Add a new feature"
Claude: *enters plan mode, analyzes codebase, creates implementation plan*
```

### Not Verifying Service Boundaries

```
// DON'T: Assume which service owns a concept
"Employee data? Must be in this service"

// DO: Verify through code analysis
1. Search for existing implementations
2. Check domain ownership
3. Verify service responsibilities
```

### Creating Custom Solutions Over Platform Patterns

```
// DON'T: Invent new patterns
public class CustomValidationHelper { ... }
public class MyRepositoryWrapper { ... }

// DO: Use established Easy.Platform patterns
PlatformValidationResult<T>.Validate(...)
IPlatformQueryableRootRepository<Employee, string>
```

### Ignoring Existing Implementations

```
// DON'T: Create new code without searching
"I'll create a new EmployeeHelper class"

// DO: Search first
1. grep for "EmployeeHelper"
2. Check existing helper classes
3. Extend or reuse existing code
```

## Quality Gate Violations

### Missing Validation

- No input validation on commands/queries
- Missing null checks on entity lookups
- No authorization checks

### Poor Error Handling

- Swallowing exceptions silently
- Generic error messages
- No proper error state in UI

### Performance Issues

- N+1 queries (not using eager loading)
- Missing pagination on large datasets
- No caching for frequently accessed data

### Security Issues

- Direct database access across services
- Missing authorization attributes
- Exposing sensitive data in DTOs
