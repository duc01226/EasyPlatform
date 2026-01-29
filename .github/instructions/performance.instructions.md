---
applyTo: "**/*.cs,**/*.ts"
---

# Performance Patterns

> Auto-loads when editing code files. See `docs/code-review-rules.md` for full reference.

## Backend Performance (C#)

### Parallel Execution (CRITICAL)

Independent async operations MUST use `Util.TaskRunner.WhenAll()`:

```csharp
// WRONG: Sequential awaits (slow)
var entity1 = await repo1.GetByIdAsync(id1, ct);
var entity2 = await repo2.GetByIdAsync(id2, ct);

// CORRECT: Parallel execution
var (entity1, entity2) = await Util.TaskRunner.WhenAll(
    repo1.GetByIdAsync(id1, ct),
    repo2.GetByIdAsync(id2, ct)
);
```

### Dictionary Lookup Over LINQ in Loops

```csharp
// WRONG: O(n) LINQ inside loops
foreach (var item in items)
    var match = allMatches.FirstOrDefault(m => m.Id == item.Id); // O(n) each

// CORRECT: Dictionary lookup O(1)
var matchDict = allMatches.ToDictionary(m => m.Id);
foreach (var item in items)
    var match = matchDict.GetValueOrDefault(item.Id);
```

### Batch Loading (No N+1)

```csharp
// WRONG: Await inside loops (N+1 queries)
foreach (var id in ids)
    var item = await repo.GetByIdAsync(id, ct);

// CORRECT: Batch load
var items = await repo.GetByIdsAsync(ids, ct);
```

### Query Projection

```csharp
// WRONG: Load all then select
var items = await repo.GetAllAsync(x => true, ct);
var ids = items.Select(x => x.Id).ToList();

// CORRECT: Project in query
var ids = await repo.FirstOrDefaultAsync(q => q.Where(expr).Select(e => e.Id), ct);
```

### Always Paginate

```csharp
var items = await repo.GetAllAsync(q => q.Where(expr).PageBy(skip, take), ct);
```

## Frontend Performance (TypeScript)

### TrackBy for ngFor

```typescript
trackByItem = this.ngForTrackByItemProp<User>('id');
```

### effectSimple for Auto Loading State

```typescript
loadData = this.effectSimple(() =>
    this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))));
```

### Platform Caching

```typescript
return this.post('/search', criteria, { enableCache: true });
```

### Subscription Management

```typescript
// Use untilDestroyed to prevent memory leaks
this.data$.pipe(this.untilDestroyed()).subscribe();

// Use storeSubscription for named subscriptions
this.storeSubscription('dataLoad', this.data$.subscribe(...));
```

## Custom Analyzer Rules (Enforced)

| Rule ID | Description |
|---------|-------------|
| `EASY_PLATFORM_ANALYZERS_PERF001` | Avoid O(n) LINQ inside loops |
| `EASY_PLATFORM_ANALYZERS_PERF002` | Avoid `await` inside loops |
| `EASY_PLATFORM_ANALYZERS_STEP001` | Missing blank line between dependent statements |
| `EASY_PLATFORM_ANALYZERS_STEP002` | Unexpected blank line within a step |
| `EASY_PLATFORM_ANALYZERS_STEP003` | Step must consume all previous outputs |
| `EASY_PLATFORM_ANALYZERS_DISALLOW_USING_STATIC` | Disallow `using static` directive |

## Performance Checklist

- [ ] Independent awaits use `Util.TaskRunner.WhenAll()`?
- [ ] No O(n) LINQ inside loops (use Dictionary)?
- [ ] No `await` inside loops (use batch loading)?
- [ ] Queries paginated and projected?
- [ ] Frontend uses `trackBy` for lists?
- [ ] API caching enabled where appropriate?
- [ ] All subscriptions properly cleaned up?
