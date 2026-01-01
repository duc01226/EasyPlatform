# Advanced Patterns Reference

> Advanced fluent helpers, expression composition, and utilities

## Backend Advanced Patterns

### List Extension Methods

```csharp
// Platform.Common.Extensions (100+ file usages)
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
// In Command: public EntityDto BuildToSaveDto(IPlatformApplicationRequestContext ctx)
// In DTO: public Entity MapToNewEntity() / UpdateToEntity(Entity existing)
var entity = dto.NotHasSubmitId()
    ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
    : await repository.GetByIdAsync(dto.Id, ct).Then(existing => dto.UpdateToEntity(existing));
```

### Request Context Methods

```csharp
// 500+ usages across codebase
RequestContext.CurrentCompanyId()
RequestContext.UserId()
RequestContext.ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()
```

### Task Tuple Await Pattern

```csharp
// Custom GetAwaiter for parallel queries
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

### Parallel Tuple Queries

```csharp
// Count + data + aggregation simultaneously
var (total, items, statusCounts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct, e => e.Related),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .GroupBy(e => e.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
);
```

### Task Extensions

```csharp
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(
    t => repository.GetByIdAsync(t.Id),
    r => r != null,
    maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

### Conditional Actions

```csharp
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .PipeActionIf(condition, e => e.UpdateTimestamp())
    .PipeActionAsyncIf(
        async () => await externalService.Any(),
        async e => await e.SyncExternal());
```

### Advanced Expression Composition

```csharp
public static Expression<Func<Employee, bool>> CanBeReviewParticipantExpr(
    int scope, string companyId, int? minMonths, string? eventId)
    => OfficialEmployeeExpr(scope, companyId)
        .AndAlso(e => e.User != null && e.User.IsActive)
        .AndAlsoIf(minMonths != null,
            () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value))
        .AndAlsoIf(eventId.IsNotNullOrEmpty(),
            () => e => e.ReviewParticipants.Any(p => p.EventId == eventId));
```

### Repository Projection

```csharp
// Fetch only needed fields
return await repository.FirstOrDefaultAsync(
    query => query
        .Where(Employee.UniqueExpr(userId))
        .Select(e => e.Id),
    ct).EnsureFound();
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

### Background Job Coordination

```csharp
// Master schedules child jobs
await companies.ParallelAsync(async companyId =>
    await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
        BackgroundJobScheduler.Schedule<ChildJob, Param>(
            Clock.UtcNow,
            new Param { CompanyId = companyId, Date = date })));
```

## Frontend Advanced Patterns

### @Watch Decorator

```typescript
import { Watch, WatchWhenValuesDiff, SimpleChange } from '@libs/platform-core';

export class MyComponent {
    @Watch('onPageResultChanged')
    public pagedResult?: PagedResult<Item>;

    @WatchWhenValuesDiff('performSearch') // Only triggers on actual value change
    public searchTerm: string = '';

    private onPageResultChanged(value: PagedResult<Item> | undefined, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }

    private performSearch(term: string) {
        this.apiService
            .search(term)
            .pipe(this.untilDestroyed())
            .subscribe(results => (this.results = results));
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
    [
        ifAsyncValidator(ctrl => ctrl.valid, emailUniqueValidator) // Only run if sync valid
    ]
);
```

### Platform Directives

```html
<div platformSwipeToScroll><!-- Horizontal scroll with drag --></div>
<input [platformDisabledControl]="isDisabled" />
```

### Utility Functions

```typescript
import {
    date_addDays,
    date_format,
    date_timeDiff,
    list_groupBy,
    list_distinctBy,
    list_sortBy,
    string_isEmpty,
    string_truncate,
    string_toCamelCase,
    dictionary_map,
    dictionary_filter,
    dictionary_values,
    immutableUpdate,
    deepClone,
    removeNullProps,
    guid_generate,
    task_delay,
    task_debounce
} from '@libs/platform-core';
```

### PlatformComponent Advanced APIs

```typescript
export class MyComponent extends PlatformComponent {
  // Track-by for performance
  trackByItem = this.ngForTrackByItemProp<User>('id');
  trackByList = this.ngForTrackByImmutableList(this.users);

  // Named subscription management
  protected storeSubscription('dataLoad', this.data$.subscribe(...));
  protected cancelStoredSubscription('dataLoad');

  // Multiple request state
  isLoading$('request1');
  isLoading$('request2');
  getAllErrorMsgs$(['req1', 'req2']);
  loadingRequestsCount();
  reloadingRequestsCount();

  // Dev-mode validation
  protected get devModeCheckLoadingStateElement() { return '.spinner'; }
  protected get devModeCheckErrorStateElement() { return '.error'; }
}
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

    public loadData = this.effectSimple(() => this.apiService.getData().pipe(this.tapResponse(data => this.updateState({ data }))), 'loadData');

    // State selectors
    public readonly data$ = this.select(state => state.data);
    public readonly loading$ = this.isLoading$('loadData');
}
```

## Fluent Helper Quick Reference

### Mutation Helpers

```csharp
.With(e => e.Name = newName)
.WithIf(condition, e => e.Status = Status.Active)
```

### Transformation Helpers

```csharp
.Then(e => e.PerformLogic())
.ThenAsync(async e => await e.ValidateAsync(service, ct))
```

### Safety Helpers

```csharp
.EnsureFound($"Not found: {id}")
.EnsureFoundAllBy(x => x.Id, ids)
.EnsureValidAsync()
```

### Expression Composition

```csharp
.AndAlso(expr)
.AndAlsoIf(condition, () => expr)
.OrElse(expr)
```

### Collection Helpers

```csharp
.ThenSelect(e => e.Id)
.ParallelAsync(async item => await ProcessAsync(item, ct), maxConcurrent: 10)
```
