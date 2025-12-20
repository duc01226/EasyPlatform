# Advanced Patterns Reference

## Backend Advanced Patterns

### List Extension Methods

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty()
.RemoveWhere(predicate, out removedItems)
.UpsertBy(keySelector, items, updateFn)
.ReplaceBy(keySelector, newItems, updateFn)
.SelectList(selector)  // Like Select().ToList()
.ThenSelect(selector)  // For Task<List<T>>
.ForEachAsync(async action, maxConcurrent)
.AddDistinct(item, keySelector)
```

### DTO Mapping Pattern

```csharp
// In DTO: public Entity MapToNewEntity() / UpdateToEntity(Entity existing)
var entity = dto.NotHasSubmitId()
    ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
    : await repository.GetByIdAsync(dto.Id, ct).Then(existing => dto.UpdateToEntity(existing));
```

### Request Context Methods

```csharp
RequestContext.CurrentCompanyId() / .UserId() / .ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()
```

### Task Tuple Await (Parallel Queries)

```csharp
var (users, companies, settings) = await (
    userRepository.GetAllAsync(...),
    companyRepository.GetAllAsync(...),
    settingsRepository.GetAllAsync(...)
);
```

### Helper Class Pattern

```csharp
public sealed class EmployeeHelper : IPlatformHelper
{
    private readonly IPlatformApplicationRequestContext requestContext;
    public EmployeeHelper(IPlatformApplicationRequestContextAccessor contextAccessor, ...)
    {
        requestContext = contextAccessor.Current; // Extract .Current
    }
}
```

### Advanced Expression Composition

```csharp
public static Expression<Func<Employee, bool>> CanBeReviewParticipantExpr(
    int scope, string companyId, int? minMonths, string? eventId)
    => OfficialEmployeeExpr(scope, companyId)
        .AndAlso(e => e.User != null && e.User.IsActive)
        .AndAlsoIf(minMonths != null, () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value))
        .AndAlsoIf(eventId.IsNotNullOrEmpty(), () => e => e.ReviewParticipants.Any(p => p.EventId == eventId));
```

### Conditional Actions

```csharp
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .PipeActionIf(condition, e => e.UpdateTimestamp())
    .PipeActionAsyncIf(async () => await externalService.Any(), async e => await e.SyncExternal());
```

### Message Bus Dependency Wait

```csharp
var (companyMissing, userMissing) = await (
    Util.TaskRunner.TryWaitUntilAsync(
        () => companyRepo.AnyAsync(c => c.Id == msg.CompanyId),
        maxWaitSeconds: msg.IsForceSync ? 30 : 300).Then(p => !p),
    Util.TaskRunner.TryWaitUntilAsync(
        () => userRepo.AnyAsync(u => u.Id == msg.UserId),
        maxWaitSeconds: 300).Then(p => !p)
);
if (companyMissing || userMissing) return; // Skip if dependencies missing
```

### Repository Projection

```csharp
// Fetch only needed fields
return await repository.FirstOrDefaultAsync(
    query => query.Where(Employee.UniqueExpr(userId)).Select(e => e.Id),
    ct).EnsureFound();
```

---

## Frontend Advanced Patterns

### @Watch Decorator

```typescript
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
    @Watch('onPageResultChanged')
    public pagedResult?: PagedResult<Item>;

    @WatchWhenValuesDiff('performSearch') // Only triggers on actual value change
    public searchTerm: string = '';

    private onPageResultChanged(value: PagedResult<Item>, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }
}
```

### Custom RxJS Operators

```typescript
import { skipDuplicates, applyIf, onCancel, tapOnce, distinctUntilObjectValuesChanged } from '@libs/platform-core';

this.search$
    .pipe(
        skipDuplicates(500), // Skip duplicates within 500ms
        applyIf(this.isEnabled$, debounceTime(300)), // Conditional operator
        onCancel(() => this.cleanup()), // Handle cancellation
        tapOnce({ next: v => this.initOnce(v) }), // Execute only on first emission
        distinctUntilObjectValuesChanged(), // Deep object comparison
        this.untilDestroyed()
    )
    .subscribe();
```

### Advanced Form Validators

```typescript
import { ifAsyncValidator, startEndValidator, noWhitespaceValidator } from '@libs/platform-core';

new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('start')?.value,
            ctrl => ctrl.value,
            { allowEqual: false }
        )
    ],
    [ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator)]
);
```

### PlatformVmStore Advanced APIs

```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    protected get enableCaching() {
        return true;
    }
    protected cachedStateKeyName = () => 'MyStore';
    protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);
    protected beforeInitVm = () => this.loadInitialData();

    public readonly data$ = this.select(state => state.data);
    public readonly loading$ = this.isLoading$('loadData');
}
```

---

# Critical Anti-Patterns to Avoid

## Backend Anti-Patterns

```csharp
// ❌ DON'T: Direct cross-service database access
var otherServiceData = await otherDbContext.Entities.ToListAsync();
// ✅ DO: Use message bus communication
await messageBus.PublishAsync(new RequestDataMessage());

// ❌ DON'T: Custom repository interfaces
public interface ICustomEntityRepository : IRepository<Entity>
// ✅ DO: Use platform repositories with extensions
public static class EntityRepositoryExtensions { ... }

// ❌ DON'T: Manual validation logic
if (string.IsNullOrEmpty(request.Name)) throw new ValidationException();
// ✅ DO: Use Platform validation fluent API
return request.Validate(r => !string.IsNullOrEmpty(r.Name), "Name required");

// ❌ DON'T: Side effects in command handlers
await notificationService.SendAsync(entity);
// ✅ DO: Use entity event handlers
// (platform auto-raises events on CRUD)

// ❌ DON'T: Map DTO in handler
var config = new AuthConfigurationValue { ClientId = req.Dto.ClientId, ... };
// ✅ DO: Let DTO own mapping
var config = req.Dto.MapToObject().With(p => p.ClientSecret = encrypt(p.ClientSecret));
```

## Frontend Anti-Patterns

```typescript
// ❌ DON'T: Direct HTTP client usage
constructor(private http: HttpClient) {}
// ✅ DO: Use platform API services
constructor(private employeeApi: EmployeeApiService) {}

// ❌ DON'T: Manual state management
employees = signal([]);
loading = signal(false);
// ✅ DO: Use platform store pattern
constructor(private store: EmployeeStore) {}

// ❌ DON'T: Missing subscription cleanup
this.data$.subscribe(...);
// ✅ DO: Always use untilDestroyed
this.data$.pipe(this.untilDestroyed()).subscribe(...);

// ❌ DON'T: Assume method names
this.someMethod();
// ✅ DO: Check base class APIs first through IntelliSense
```
