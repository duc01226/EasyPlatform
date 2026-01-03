# Analyze Performance: $ARGUMENTS

Analyze and optimize performance for: $ARGUMENTS

## Phase 1: Identify Bottleneck Type

1. **Database queries:**
    - N+1 query problems
    - Missing indexes
    - Inefficient projections
    - Full table scans

2. **API endpoint latency:**
    - Serialization overhead
    - Unnecessary data loading
    - Missing caching
    - Sequential operations that could be parallel

3. **Frontend rendering:**
    - Excessive change detection
    - Large component trees
    - Missing OnPush strategy
    - Unnecessary re-renders

4. **Memory issues:**
    - Subscription leaks
    - Large object retention
    - Missing cleanup in ngOnDestroy

## Phase 2: Investigation

### Backend Analysis

1. **Check repository patterns:**

    ```csharp
    // ✅ Eager load related entities
    await repository.GetAllAsync(expr, ct, e => e.RelatedEntity, e => e.AnotherRelated)

    // ❌ N+1 problem - separate query per item
    foreach (item in items) { await repo.GetById(item.RelatedId) }
    ```

2. **Review query builders:**

    ```csharp
    // ✅ Use projections to reduce data transfer
    .Select(e => new { e.Id, e.Name, e.Status })

    // ❌ Loading full entities when only IDs needed
    .Select(e => e).ToList().Select(e => e.Id)
    ```

3. **Check for parallel operations:**

    ```csharp
    // ✅ Parallel tuple queries
    var (total, items, counts) = await (
        repository.CountAsync(queryBuilder, ct),
        repository.GetAllAsync(queryBuilder.PageBy(skip, take), ct),
        repository.GetGroupedCountsAsync(queryBuilder, ct)
    );

    // ❌ Sequential when independent
    var total = await repository.CountAsync(queryBuilder, ct);
    var items = await repository.GetAllAsync(queryBuilder.PageBy(skip, take), ct);
    ```

4. **Review full-text search usage:**
    ```csharp
    // ✅ Use IPlatformFullTextSearchPersistenceService
    .PipeIf(searchText.IsNotNullOrEmpty(), q =>
        searchService.Search(q, searchText, Entity.SearchColumns()))
    ```

### Frontend Analysis

1. **Check signal usage and change detection**
2. **Review store patterns for unnecessary emissions**
3. **Verify `untilDestroyed()` on all subscriptions**
4. **Check for `trackBy` in `@for` loops**
5. **Review `observerLoadingErrorState` usage**

## Phase 3: Profiling Commands

```bash
# Backend - Check EF Core query logging
# Enable in appsettings.Development.json:
# "Logging": { "LogLevel": { "Microsoft.EntityFrameworkCore.Database.Command": "Information" } }

# Frontend - Angular DevTools profiler
# Use Angular DevTools Chrome extension
```

## Phase 4: Optimization Plan

Present findings with:

- Current performance metrics (if measurable)
- Root cause identification with file:line references
- Targeted fix recommendations
- Expected improvement rationale

## Phase 5: Wait for Approval

**CRITICAL:** Present your findings and optimization plan. Wait for explicit user approval before making changes.

---

Use `arch-performance-optimization` skill for detailed guidance.
