---
agent: 'agent'
description: 'Analyze and optimize code for performance following EasyPlatform patterns'
tools: ['read', 'search', 'edit']
---

# Optimize Code for Performance

Analyze and optimize the following code for performance:

**Target:** ${input:target}
**Focus Area:** ${input:focus:All,Database Queries,Memory Usage,Frontend Rendering,API Response Time}

## Analysis Checklist

### Backend (C#)

#### Database Queries
- [ ] **N+1 Problem**: Are related entities loaded in separate queries?
  - Fix: Use eager loading with `loadRelatedEntities` parameter
- [ ] **Missing Pagination**: Are large datasets loaded without paging?
  - Fix: Use `.PageBy(skip, take)` for all list queries
- [ ] **Unnecessary Data**: Is full entity loaded when only ID needed?
  - Fix: Use projection `.Select(e => e.Id)`
- [ ] **Sequential Queries**: Are independent queries running one after another?
  - Fix: Use parallel tuple queries `await (query1, query2, query3)`

#### Query Optimization
- [ ] **Reusable Queries**: Is query logic duplicated?
  - Fix: Use `GetQueryBuilder()` for reusable query definitions
- [ ] **Conditional Filters**: Are conditions always evaluated?
  - Fix: Use `.WhereIf(condition, expression)`
- [ ] **Full-Text Search**: Is string search efficient?
  - Fix: Use `IPlatformFullTextSearchPersistenceService`

#### Memory & Processing
- [ ] **Large Collections**: Are large lists processed in memory?
  - Fix: Use streaming or batch processing
- [ ] **Unnecessary Allocations**: Are objects created unnecessarily?
  - Fix: Use object pooling or reuse instances

### Frontend (TypeScript/Angular)

#### Rendering
- [ ] **Missing TrackBy**: Do `@for` loops have trackBy?
  - Fix: Use `ngForTrackByItemProp<T>('id')`
- [ ] **Default Change Detection**: Is OnPush used where appropriate?
  - Fix: Add `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] **Large Lists**: Are 100+ items rendered without virtualization?
  - Fix: Use `cdk-virtual-scroll-viewport`

#### Data Loading
- [ ] **No Debouncing**: Is search input triggering immediate API calls?
  - Fix: Add `debounceTime(300)` to input observables
- [ ] **Memory Leaks**: Are subscriptions unmanaged?
  - Fix: Use `this.untilDestroyed()`
- [ ] **Duplicate Requests**: Are same API calls made multiple times?
  - Fix: Use caching or shareReplay()

## Optimization Patterns

### Backend - Parallel Queries
```csharp
// Before (sequential)
var employees = await employeeRepo.GetAllAsync(expr, ct);
var departments = await deptRepo.GetAllAsync(deptExpr, ct);

// After (parallel)
var (employees, departments) = await (
    employeeRepo.GetAllAsync(expr, ct),
    deptRepo.GetAllAsync(deptExpr, ct)
);
```

### Backend - Eager Loading
```csharp
// Before (N+1)
var employees = await repo.GetAllAsync(expr, ct);
foreach (var e in employees)
    e.Department = await deptRepo.GetByIdAsync(e.DeptId, ct);

// After (eager load)
var employees = await repo.GetAllAsync(expr, ct,
    loadRelatedEntities: e => e.Department);
```

### Backend - Query Builder
```csharp
// Before (duplicated logic)
var count = await repo.CountAsync(e => e.CompanyId == companyId && e.IsActive, ct);
var items = await repo.GetAllAsync(e => e.CompanyId == companyId && e.IsActive, ct);

// After (reusable)
var queryBuilder = repo.GetQueryBuilder((uow, q) => q
    .Where(e => e.CompanyId == companyId && e.IsActive));
var (count, items) = await (
    repo.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repo.GetAllAsync((uow, q) => queryBuilder(uow, q), ct)
);
```

### Frontend - TrackBy
```typescript
// Before
@for (item of items; track $index) { ... }

// After
trackByItem = this.ngForTrackByItemProp<Item>('id');
@for (item of items; track trackByItem) { ... }
```

### Frontend - Debouncing
```typescript
// Before
this.searchControl.valueChanges.subscribe(term => this.search(term));

// After
this.searchControl.valueChanges.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.apiService.search(term)),
    this.untilDestroyed()
).subscribe();
```

## Output Format

For each optimization found:

```markdown
### Issue: [Brief description]

**Location:** `file:line`
**Impact:** High | Medium | Low
**Category:** Database | Memory | Rendering | Network

**Before:**
```code
[Current code]
```

**After:**
```code
[Optimized code]
```

**Explanation:** [Why this is better]
```

## Performance Metrics to Consider

| Metric | Target |
|--------|--------|
| API Response Time | < 200ms for simple queries |
| List Rendering | < 16ms per frame (60fps) |
| Memory Usage | No leaks, stable baseline |
| Database Queries | Minimize count per request |
