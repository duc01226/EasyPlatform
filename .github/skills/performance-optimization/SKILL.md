---
name: performance-optimization
description: Use when analyzing and improving performance for database queries, API endpoints, or frontend rendering.
---

# Performance Optimization

## Backend Optimization

### Parallel Tuple Queries

```csharp
// Sequential (slow)
var total = await repository.CountAsync(queryBuilder, ct);
var items = await repository.GetAllAsync(queryBuilder, ct);

// Parallel (fast)
var (total, items, statusCounts) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(skip, take), ct, e => e.Related),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .GroupBy(e => e.Status)
        .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
);
```

### Eager Loading (Prevent N+1)

```csharp
// N+1 problem
var employees = await repository.GetAllAsync(expr, ct);
foreach (var emp in employees)
    var dept = await deptRepo.GetByIdAsync(emp.DepartmentId);  // N queries!

// Eager load
var employees = await repository.GetAllAsync(expr, ct,
    e => e.Department,      // Include related
    e => e.User,
    e => e.Manager);
```

### Projection (Fetch Only Needed Fields)

```csharp
// Full entity
var ids = (await repository.GetAllAsync(expr, ct)).Select(e => e.Id);

// Projected
var ids = await repository.GetAllAsync(
    query => query.Where(expr).Select(e => e.Id), ct);
```

### Full-Text Search Optimization

```csharp
var queryBuilder = repository.GetQueryBuilder(q => q
    .Where(baseFilter)
    .PipeIf(searchText.IsNotNullOrEmpty(), q =>
        fullTextSearchService.Search(
            q, searchText,
            Entity.DefaultFullTextSearchColumns(),
            fullTextAccurateMatch: true,
            includeStartWithProps: Entity.DefaultFullTextSearchColumns())));
```

## Frontend Optimization

### TrackBy for Lists

```typescript
// No trackBy (re-renders all)
@for (item of items; track $index) { }

// TrackBy ID (minimal re-renders)
@for (item of items; track item.id) { }

// Platform helper
trackByItem = this.ngForTrackByItemProp<User>('id');
```

### Lazy Loading

```typescript
// Lazy load routes
const routes: Routes = [
    {
        path: 'employees',
        loadChildren: () => import('./employees/employees.module').then(m => m.EmployeesModule)
    }
];
```

### OnPush Change Detection

```typescript
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmployeeListComponent {}
```

## Quick Wins Checklist

| Area     | Optimization                        |
| -------- | ----------------------------------- |
| Backend  | Parallel tuple queries              |
| Backend  | Eager loading for related entities  |
| Backend  | Projection for ID-only queries      |
| Backend  | Paged processing for large datasets |
| Frontend | TrackBy for @for loops              |
| Frontend | OnPush change detection             |
| Frontend | Lazy loading for routes             |
| Frontend | Virtual scrolling for long lists    |

## Anti-Patterns

- Sequential awaits for independent queries
- Loading full entities when only IDs needed
- N+1 queries from lazy loading
- Re-rendering entire lists without trackBy
- Loading all data upfront instead of pagination
