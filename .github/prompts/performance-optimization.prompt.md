---
description: "Performance analysis for database queries, API endpoints, and frontend rendering"
---

# Performance Optimization Prompt

## Overview

This prompt guides performance analysis and optimization for EasyPlatform applications, covering database queries, API endpoints, and frontend rendering.

## Database Query Optimization

### N+1 Query Detection

**Problem:**
```csharp
// ❌ WRONG - N+1 query (1 query for employees + N queries for companies)
var employees = await repo.GetAllAsync(e => e.IsActive, ct);
foreach (var emp in employees)
{
    var company = await companyRepo.GetByIdAsync(emp.CompanyId, ct);
    emp.Company = company; // Triggers N queries
}
```

**Solution:**
```csharp
// ✅ CORRECT - Single query with eager loading
var employees = await repo.GetAllAsync(
    e => e.IsActive,
    ct,
    loadRelatedEntities: e => e.Company);

// Or using Include in query builder
var employees = await repo.GetAllAsync((uow, q) => q
    .Where(e => e.IsActive)
    .Include(e => e.Company), ct);
```

### Projection for Large Datasets

**Problem:**
```csharp
// ❌ WRONG - Loads entire entity graph
var employees = await repo.GetAllAsync(e => e.IsActive, ct);
var dtos = employees.Select(e => new EmployeeDto(e)).ToList();
```

**Solution:**
```csharp
// ✅ CORRECT - Project to DTO in query
var dtos = await repo.GetAllAsync((uow, q) => q
    .Where(e => e.IsActive)
    .Select(e => new EmployeeDto
    {
        Id = e.Id,
        Name = e.Name,
        CompanyName = e.Company!.Name
    }), ct);
```

### Pagination

**Always paginate large datasets:**
```csharp
// ✅ CORRECT - Paginated query
var queryBuilder = repo.GetQueryBuilder((uow, q) => q
    .Where(e => e.IsActive)
    .OrderByDescending(e => e.CreatedDate)
    .PageBy(req.Skip, req.Take));

var (total, items) = await (
    repo.CountAsync((uow, q) => queryBuilder(uow, q).OrderBy(e => e.Id).Take(0), ct), // Remove ordering for count
    repo.GetAllAsync((uow, q) => queryBuilder(uow, q), ct)
);
```

### Index Optimization

**Identify missing indexes:**
```csharp
// Frequently filtered/sorted fields should be indexed
public class Employee : RootEntity<Employee, string>
{
    [Indexed] // MongoDB
    public string CompanyId { get; set; } = "";

    [Indexed]
    public Status Status { get; set; }

    [Indexed]
    public DateTime CreatedDate { get; set; }
}

// EF Core - Add in DbContext configuration
protected override void OnModelCreating(ModelBuilder builder)
{
    builder.Entity<Employee>()
        .HasIndex(e => new { e.CompanyId, e.Status, e.CreatedDate });
}
```

### Query Complexity Analysis

**Simplify complex queries:**
```csharp
// ❌ WRONG - Multiple JOINs and subqueries
var result = await repo.GetAllAsync((uow, q) => q
    .Include(e => e.Company)
        .ThenInclude(c => c.Industry)
    .Include(e => e.Department)
        .ThenInclude(d => d.Manager)
    .Where(e => e.Company!.Industry!.Employees.Count > 100), ct);

// ✅ CORRECT - Break into multiple queries or use query builder
var industryIds = await industryRepo.GetAllAsync((uow, q) => q
    .Where(i => i.Employees.Count > 100)
    .Select(i => i.Id), ct);

var companyIds = await companyRepo.GetAllAsync((uow, q) => q
    .Where(c => industryIds.Contains(c.IndustryId))
    .Select(c => c.Id), ct);

var employees = await repo.GetAllAsync(
    e => companyIds.Contains(e.CompanyId),
    ct,
    loadRelatedEntities: e => e.Company);
```

### Batch Processing

**Process large datasets efficiently:**
```csharp
// ✅ CORRECT - Batch processing pattern
var total = await repo.CountAsync(e => e.Status == Status.Pending, ct);
var pageSize = 100;

await RootServiceProvider.ExecuteInjectScopedPagingAsync(
    total,
    pageSize,
    async (skip, take, r, u) =>
    {
        using var uow = u.Begin();
        var items = await r.GetAllAsync((uow, q) => q
            .Where(e => e.Status == Status.Pending)
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(take), ct);

        await items.ParallelAsync(async item =>
        {
            await ProcessItem(item);
        }, maxConcurrent: 10);

        await r.UpdateManyAsync(items, dismissSendEvent: true, ct: ct);
        await uow.CompleteAsync();
        return items;
    });
```

### Caching Strategies

**Repository-level caching:**
```csharp
// ✅ CORRECT - Cache reference data
public static class CompanyRepositoryExtensions
{
    private static readonly MemoryCache Cache = new(new MemoryCacheOptions());

    public static async Task<List<Company>> GetActiveCompaniesAsync(
        this IPlatformQueryableRootRepository<Company, string> repo,
        CancellationToken ct = default)
    {
        return await Cache.GetOrCreateAsync("ActiveCompanies", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10);
            return await repo.GetAllAsync(c => c.IsActive, ct);
        });
    }
}
```

## API Endpoint Performance

### Response Caching

**Enable caching for read-only endpoints:**
```csharp
[HttpGet]
[ResponseCache(Duration = 300, VaryByQueryKeys = new[] { "companyId" })]
public async Task<IActionResult> GetAll([FromQuery] string companyId)
{
    return Ok(await Cqrs.SendAsync(new GetAllQuery { CompanyId = companyId }));
}
```

### Compression

**Enable response compression:**
```csharp
// Startup.cs
services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
});
```

### Async All the Way

**Never block async calls:**
```csharp
// ❌ WRONG - Blocking async
var result = repo.GetByIdAsync(id, ct).Result; // Deadlock risk

// ✅ CORRECT - Async all the way
var result = await repo.GetByIdAsync(id, ct);
```

### Parallel Processing

**Execute independent operations in parallel:**
```csharp
// ✅ CORRECT - Parallel execution
var (employees, companies, departments) = await (
    employeeRepo.GetAllAsync(e => e.IsActive, ct),
    companyRepo.GetAllAsync(c => c.IsActive, ct),
    departmentRepo.GetAllAsync(d => d.IsActive, ct)
);

// ✅ CORRECT - Parallel processing with max concurrency
var results = await items.ParallelAsync(async item =>
{
    return await ProcessItem(item);
}, maxConcurrent: 10);
```

### Connection Pooling

**Ensure proper connection pooling:**
```csharp
// Connection string should have proper pool settings
"Server=localhost;Database=MyDb;User=sa;Password=Pass;Max Pool Size=100;Min Pool Size=10"
```

### Request Throttling

**Implement rate limiting:**
```csharp
services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 100;
    });
});

// Controller
[EnableRateLimiting("api")]
public class EmployeeController : PlatformBaseController { }
```

## Frontend Performance

### Change Detection Optimization

**Use OnPush strategy:**
```typescript
@Component({
    selector: 'app-employee-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `...`
})
export class EmployeeListComponent extends PlatformVmStoreComponent<EmployeeState, EmployeeStore> {
    // OnPush only checks when:
    // 1. Input reference changes
    // 2. Event emitted
    // 3. Async pipe receives new value
}
```

### TrackBy Functions

**Always use trackBy in *ngFor:**
```typescript
// Component
readonly trackByEmployeeId = this.ngForTrackByItemProp<Employee>('id');

// Template
@for (employee of vm().employees; track employee.id) {
    <div class="employee-list__item">{{ employee.name }}</div>
}

// Or with trackBy function
<div *ngFor="let employee of vm().employees; trackBy: trackByEmployeeId">
    {{ employee.name }}
</div>
```

### Virtual Scrolling

**Use virtual scrolling for large lists:**
```typescript
// Install CDK
npm install @angular/cdk

// Component
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

// Template
<cdk-virtual-scroll-viewport itemSize="50" class="employee-list">
    <div *cdkVirtualFor="let employee of vm().employees; trackBy: trackByEmployeeId"
         class="employee-list__item">
        {{ employee.name }}
    </div>
</cdk-virtual-scroll-viewport>
```

### Lazy Loading

**Lazy load feature modules:**
```typescript
// app.routes.ts
const routes: Routes = [
    {
        path: 'employees',
        loadChildren: () => import('./employees/employees.module')
            .then(m => m.EmployeesModule)
    }
];
```

### Memoization

**Cache expensive computations:**
```typescript
import { memoize } from '@libs/platform-core';

export class EmployeeComponent {
    readonly getFullName = memoize((employee: Employee) => {
        return `${employee.firstName} ${employee.lastName}`.trim();
    });

    // Template
    // {{ getFullName(employee) }} - Only recalculates when employee reference changes
}
```

### Debouncing

**Debounce user input:**
```typescript
// Search input
this.searchControl.valueChanges
    .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        this.untilDestroyed()
    )
    .subscribe(term => this.store.search(term));
```

### Image Optimization

**Lazy load images:**
```html
<img [src]="employee.avatar"
     loading="lazy"
     [alt]="employee.name"
     class="employee-list__avatar">
```

### Bundle Size Optimization

**Analyze bundle size:**
```bash
nx build playground-text-snippet --stats-json
npx webpack-bundle-analyzer dist/apps/playground-text-snippet/stats.json
```

**Tree shaking:**
```typescript
// ❌ WRONG - Imports entire lodash
import _ from 'lodash';
const result = _.uniq(items);

// ✅ CORRECT - Tree-shakeable import
import { uniq } from 'lodash-es';
const result = uniq(items);

// ✅ BETTER - Use platform utilities
import { list_distinctBy } from '@libs/platform-core';
const result = list_distinctBy(items, x => x.id);
```

### Store Performance

**Use selectors for derived state:**
```typescript
@Injectable()
export class EmployeeStore extends PlatformVmStore<EmployeeState> {
    // ✅ CORRECT - Memoized selector
    readonly activeEmployees$ = this.select(s => s.employees.filter(e => e.isActive));

    // ❌ WRONG - Recomputes on every access
    get activeEmployees() {
        return this.state().employees.filter(e => e.isActive);
    }
}
```

### API Call Optimization

**Enable caching in API service:**
```typescript
@Injectable({ providedIn: 'root' })
export class EmployeeApiService extends PlatformApiService {
    getAll(companyId: string): Observable<Employee[]> {
        return this.get('/employees', { companyId }, {
            enableCache: true,
            cacheDurationMinutes: 5
        });
    }
}
```

## Performance Monitoring

### Backend Monitoring

**Log slow queries:**
```csharp
// Middleware to log slow requests
app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next();
    sw.Stop();

    if (sw.ElapsedMilliseconds > 1000)
    {
        logger.LogWarning("Slow request: {Method} {Path} took {Duration}ms",
            context.Request.Method,
            context.Request.Path,
            sw.ElapsedMilliseconds);
    }
});
```

### Frontend Monitoring

**Track component render time:**
```typescript
export class EmployeeComponent implements AfterViewInit {
    ngAfterViewInit() {
        if (environment.production) return;

        performance.mark('component-render-end');
        performance.measure('component-render', 'component-render-start', 'component-render-end');
        const measure = performance.getEntriesByName('component-render')[0];
        console.log(`Component rendered in ${measure.duration}ms`);
    }
}
```

## Performance Checklist

### Backend

- [ ] No N+1 queries (use eager loading)
- [ ] Large datasets paginated
- [ ] Indexes on filtered/sorted columns
- [ ] Projection used for large entities
- [ ] Batch processing for bulk operations
- [ ] Parallel execution where possible
- [ ] Caching for reference data
- [ ] Response compression enabled
- [ ] Connection pooling configured

### Frontend

- [ ] OnPush change detection
- [ ] TrackBy in all loops
- [ ] Virtual scrolling for large lists
- [ ] Lazy loading for routes
- [ ] Image lazy loading
- [ ] Debounced search inputs
- [ ] Memoized expensive computations
- [ ] Tree-shakeable imports
- [ ] Bundle size analyzed

### API

- [ ] Response caching configured
- [ ] Rate limiting implemented
- [ ] Async all the way (no blocking)
- [ ] Parallel requests where possible
- [ ] Compression enabled

## Common Performance Issues

### Issue: Slow List Queries

**Diagnosis:**
```csharp
// Check query execution time
var sw = Stopwatch.StartNew();
var items = await repo.GetAllAsync(e => e.IsActive, ct);
sw.Stop();
logger.LogInformation("Query took {Duration}ms", sw.ElapsedMilliseconds);
```

**Fix:**
- Add pagination
- Add indexes
- Use projection
- Optimize filters

### Issue: Slow Frontend Rendering

**Diagnosis:**
```typescript
// Use Angular DevTools Profiler
// Check for excessive change detection cycles
```

**Fix:**
- Use OnPush change detection
- Add trackBy functions
- Use virtual scrolling
- Memoize computed values

### Issue: High Memory Usage

**Diagnosis:**
```csharp
// Check object allocations
GC.Collect();
var beforeMem = GC.GetTotalMemory(true);
// Execute operation
var afterMem = GC.GetTotalMemory(true);
logger.LogInformation("Memory used: {Size}MB", (afterMem - beforeMem) / 1024 / 1024);
```

**Fix:**
- Use streaming for large files
- Dispose resources properly
- Use batch processing
- Clear caches periodically

## References

- [Entity Framework Performance Best Practices](https://learn.microsoft.com/en-us/ef/core/performance/)
- [Angular Performance Checklist](https://angular.dev/best-practices/runtime-performance)
- [docs/claude/06-decision-trees.md](../../docs/claude/06-decision-trees.md)
