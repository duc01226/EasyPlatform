# Anti-Patterns to Avoid

## Backend Anti-Patterns

### Direct Cross-Service Database Access
```csharp
// WRONG: Direct access to another service's database
var otherServiceData = await otherDbContext.Entities.ToListAsync();

// CORRECT: Use message bus communication
await messageBus.PublishAsync(new RequestDataMessage());
```

### Custom Repository Interfaces
```csharp
// WRONG: Creating custom repository interfaces
public interface ICustomEmployeeRepository : IRepository<Employee>

// CORRECT: Use platform repositories with extensions
public static class EmployeeRepositoryExtensions
{
    public static async Task<Employee> GetByEmailAsync(
        this IPlatformQueryableRootRepository<Employee, string> repository, string email)
}
```

### Manual Validation Logic
```csharp
// WRONG: Manual validation with exceptions
if (string.IsNullOrEmpty(request.Name))
    throw new ValidationException("Name required");

// CORRECT: Use Platform validation fluent API
return base.Validate().And(_ => !string.IsNullOrEmpty(Name), "Name required");
```

### Side Effects in Command Handlers
```csharp
// WRONG: Direct side effect call in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // BAD!
    return new Result();
}

// CORRECT: Let platform auto-raise events, handle in event handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(newEntity, ct);  // Platform auto-raises event
    return new Result();
}

// Event handler handles side effects
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### DTO Mapping in Handler
```csharp
// WRONG: Mapping logic in command handler
var config = new AuthConfigurationValue
{
    ClientId = req.Dto.ClientId,
    ClientSecret = req.Dto.ClientSecret
};

// CORRECT: DTO owns mapping responsibility
public sealed class AuthConfigurationValueDto : PlatformDto<AuthConfigurationValue>
{
    public override AuthConfigurationValue MapToObject() => new AuthConfigurationValue
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret
    };
}

// Handler uses dto.MapToObject().With()
var config = req.AuthConfiguration.MapToObject()
    .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));
```

### Manual AddDomainEvent
```csharp
// WRONG: Manual domain event raising
entity.AddDomainEvent(new EntityCreatedEvent(entity));

// CORRECT: Platform auto-raises PlatformCqrsEntityEvent on repository CRUD
// NO manual AddDomainEvent() needed
```

## Frontend Anti-Patterns

### Direct HTTP Client Usage
```typescript
// WRONG: Direct HttpClient
constructor(private http: HttpClient) {}
this.http.get('/api/employees');

// CORRECT: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}
this.employeeApi.getEmployees();
```

### Manual State Management
```typescript
// WRONG: Manual signal-based state
employees = signal([]);
loading = signal(false);
error = signal(null);

// CORRECT: Use platform store pattern
constructor(private store: EmployeeStore) {}
// Store handles loading/error states automatically
```

### Assuming Base Class Methods
```typescript
// WRONG: Calling methods without verification
this.someMethod(); // Might not exist on base class

// CORRECT: Check base class APIs first through IntelliSense
// Verify method exists before calling
```

### Not Using untilDestroyed
```typescript
// WRONG: Manual subscription management
ngOnInit() {
    this.sub = this.data$.subscribe();
}
ngOnDestroy() {
    this.sub.unsubscribe();
}

// CORRECT: Use platform lifecycle management
ngOnInit() {
    this.data$.pipe(this.untilDestroyed()).subscribe();
}
```

## General Anti-Patterns

### Over-Engineering
- Adding features not requested
- Creating abstractions for one-time use
- Adding error handling for impossible scenarios
- Designing for hypothetical future requirements

### Backwards Compatibility Hacks
- Renaming unused `_vars`
- Re-exporting unused types
- Adding `// removed` comments
- If unused, delete completely

### Ignoring Existing Patterns
- Creating custom solutions when platform patterns exist
- Not searching for existing implementations before coding
- Not following established project conventions

### Poor Investigation
- Assuming based on first glance
- Not verifying with multiple search patterns
- Not checking both static AND dynamic code usage
- Not reading actual implementations
