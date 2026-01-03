---
applyTo: "src/PlatformExampleApp/**/*.cs,src/PlatformExampleAppWeb/**/*.ts,src/PlatformExampleAppWeb/**/*.ts"
excludeAgent: ["copilot-code-review"]
description: "Performance optimization patterns for EasyPlatform"
---

# Performance Optimization Patterns

## Backend Performance

### Query Optimization

#### Reusable Query Builders
```csharp
// ✅ Use GetQueryBuilder for reusable queries
var queryBuilder = repository.GetQueryBuilder((uow, q) => q
    .Where(Employee.OfCompanyExpr(companyId))
    .WhereIf(statuses.Any(), e => statuses.Contains(e.Status))
    .WhereIf(deptId != null, e => e.DepartmentId == deptId));

// Execute count and data in parallel
var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(skip, take), ct)
);
```

#### Parallel Tuple Queries
```csharp
// ✅ Execute independent queries in parallel
var (employees, departments, settings) = await (
    employeeRepository.GetAllAsync(expr, ct),
    departmentRepository.GetAllAsync(deptExpr, ct),
    settingsRepository.GetByIdAsync(settingsId, ct)
);

// ❌ AVOID: Sequential execution
var employees = await employeeRepository.GetAllAsync(expr, ct);
var departments = await departmentRepository.GetAllAsync(deptExpr, ct);
var settings = await settingsRepository.GetByIdAsync(settingsId, ct);
```

#### Conditional Filtering with WhereIf
```csharp
// ✅ Use WhereIf for conditional filters (no unnecessary conditions)
var query = repository.GetQueryBuilder((uow, q) => q
    .Where(Entity.BaseExpr())
    .WhereIf(name.IsNotNullOrEmpty(), e => e.Name.Contains(name))
    .WhereIf(status.HasValue, e => e.Status == status)
    .WhereIf(ids.Any(), e => ids.Contains(e.Id)));

// ❌ AVOID: Always adding conditions
var query = q
    .Where(name != null ? e => e.Name.Contains(name) : e => true)  // Inefficient
```

### Pagination

```csharp
// ✅ Always use PageBy for list queries
var items = await repository.GetAllAsync(
    (uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(request.SkipCount, request.MaxResultCount),
    ct);

// ❌ NEVER load all records then paginate in memory
var allItems = await repository.GetAllAsync(expr, ct);
var pagedItems = allItems.Skip(skip).Take(take).ToList();  // Memory hog!
```

### Eager Loading (Avoid N+1)

```csharp
// ✅ Eager load related entities in single query
var employees = await repository.GetAllAsync(
    Employee.OfCompanyExpr(companyId),
    ct,
    loadRelatedEntities: e => e.Department, e => e.Manager, e => e.User);

// ❌ AVOID: N+1 queries
var employees = await repository.GetAllAsync(expr, ct);
foreach (var emp in employees)
{
    emp.Department = await deptRepo.GetByIdAsync(emp.DepartmentId, ct);  // N+1!
}
```

### Projection (Select Only Needed Fields)

```csharp
// ✅ Project to DTO when you don't need full entity
var employeeIds = await repository.GetAllAsync(
    queryBuilder: (uow, q) => q
        .Where(Employee.ActiveExpr())
        .Select(e => e.Id),  // Only fetch IDs
    ct);

// ✅ Project to anonymous type for aggregations
var statusCounts = await repository.GetAllAsync(
    (uow, q) => q
        .GroupBy(e => e.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }),
    ct);
```

### Batch Operations

```csharp
// ✅ Use bulk operations for multiple items
await repository.CreateManyAsync(newEntities, ct);
await repository.UpdateManyAsync(updatedEntities, dismissSendEvent: false, checkDiff: true, ct);
await repository.DeleteManyAsync(e => e.Status == Status.Deleted, ct);

// ❌ AVOID: Individual operations in loop
foreach (var entity in entities)
{
    await repository.CreateAsync(entity, ct);  // N database calls!
}
```

### Full-Text Search Optimization

```csharp
// ✅ Use platform full-text search service
.PipeIf(
    searchText.IsNotNullOrEmpty(),
    q => fullTextSearchService.Search(
        q,
        searchText,
        Entity.DefaultFullTextSearchColumns(),
        fullTextAccurateMatch: true,
        includeStartWithProps: Entity.DefaultFullTextSearchColumns()
    )
)
```

---

## Frontend Performance

### Change Detection

```typescript
// ✅ Use OnPush for performance-critical components
@Component({
    selector: 'app-employee-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `...`
})
export class EmployeeListComponent extends AppBaseVmStoreComponent<State, Store> {}
```

### TrackBy for Lists

```typescript
// ✅ Use platform trackBy helpers
@Component({
    template: `
        @for (item of items; track trackByItem) {
            <app-item [data]="item" />
        }
    `
})
export class ListComponent extends PlatformComponent {
    // Use platform helper for trackBy
    trackByItem = this.ngForTrackByItemProp<Item>('id');
}

// ❌ AVOID: No trackBy (causes full re-render)
@for (item of items; track $index) {
    <app-item [data]="item" />
}
```

### Lazy Loading

```typescript
// ✅ Lazy load routes
const routes: Routes = [
    {
        path: 'employees',
        loadChildren: () => import('./employees/employees.module')
            .then(m => m.EmployeesModule)
    }
];

// ✅ Lazy load components
@Component({
    imports: [
        // Heavy components loaded lazily
    ]
})
```

### Subscription Management

```typescript
// ✅ Use untilDestroyed() - auto-cleanup on destroy
this.data$.pipe(
    this.untilDestroyed()
).subscribe(data => this.handleData(data));

// ✅ Use observerLoadingErrorState for API calls
this.apiService.getData().pipe(
    this.observerLoadingErrorState('getData'),
    this.tapResponse(data => this.updateState({ data })),
    this.untilDestroyed()
).subscribe();

// ❌ AVOID: Manual unsubscribe management
private subscription: Subscription;
ngOnInit() { this.subscription = this.data$.subscribe(); }
ngOnDestroy() { this.subscription?.unsubscribe(); }  // Error-prone
```

### Debouncing User Input

```typescript
// ✅ Debounce search input
this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.apiService.search(term)),
    this.untilDestroyed()
).subscribe(results => this.results = results);
```

### Virtual Scrolling for Large Lists

```typescript
// ✅ Use virtual scrolling for 100+ items
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
    template: `
        <cdk-virtual-scroll-viewport itemSize="50" class="viewport">
            <div *cdkVirtualFor="let item of items; trackBy: trackByItem">
                {{ item.name }}
            </div>
        </cdk-virtual-scroll-viewport>
    `
})
```

---

## Performance Checklist

### Backend
- [ ] Using `GetQueryBuilder` for reusable queries
- [ ] Parallel tuple queries for independent operations
- [ ] `WhereIf()` for conditional filtering
- [ ] `PageBy()` for all list queries
- [ ] Eager loading to avoid N+1
- [ ] Projection when full entity not needed
- [ ] Bulk operations for multiple items

### Frontend
- [ ] `ChangeDetectionStrategy.OnPush` where appropriate
- [ ] `trackBy` for all `@for` loops
- [ ] Lazy loading for routes and heavy components
- [ ] `untilDestroyed()` for all subscriptions
- [ ] Debouncing for user input
- [ ] Virtual scrolling for large lists

---

## Performance Anti-Patterns

| Anti-Pattern | Solution |
|--------------|----------|
| N+1 queries | Eager load with `loadRelatedEntities` |
| Loading all then filtering | Use `WhereIf` in query |
| Loading all then paging | Use `PageBy()` in query |
| Sequential independent queries | Use parallel tuple queries |
| Full entity when only ID needed | Use projection `.Select(e => e.Id)` |
| No trackBy in lists | Use `ngForTrackByItemProp<T>('id')` |
| Missing debounce on search | Add `debounceTime(300)` |
| Memory leaks from subscriptions | Use `untilDestroyed()` |
