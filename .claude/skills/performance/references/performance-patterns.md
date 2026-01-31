# EasyPlatform Performance Patterns

## API/Endpoint Optimization

### Parallel Tuple Queries
```csharp
// Always parallelize independent queries
var (users, companies, settings) = await (
    userRepo.GetAllAsync(filter, ct),
    companyRepo.GetAllAsync(filter, ct),
    settingsRepo.GetAllAsync(filter, ct));
```

### Response Size Reduction
```csharp
// Return DTOs, not entities. Use projections for partial data.
return new Result { Id = employee.Id, Name = employee.FullName, Status = employee.Status };
```

### Static Data Caching
```csharp
private static readonly ConcurrentDictionary<string, LookupData> _cache = new();
public async Task<LookupData> GetLookupAsync(string key)
{
    if (_cache.TryGetValue(key, out var cached)) return cached;
    var data = await LoadFromDbAsync(key);
    _cache.TryAdd(key, data);
    return data;
}
```

## Background Job Optimization

### Bounded Parallelism
```csharp
// Always set maxConcurrent to prevent thread pool exhaustion
await items.ParallelAsync(ProcessAsync, maxConcurrent: 5);
```

### Batch Processing
```csharp
// Batch updates with event/diff suppression for performance
await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
```

## Cross-Service (Message Bus) Optimization
- Minimize payload size in bus messages (send IDs, not full entities)
- Use `TryWaitUntilAsync` with reasonable timeout for eventual consistency
- Batch message publishing when possible
- Idempotent consumers to handle retries safely

## Profiling Approaches

### Backend
```bash
# EF Core query logging: appsettings.Development.json
# "Logging": { "LogLevel": { "Microsoft.EntityFrameworkCore.Database.Command": "Information" } }
```
```csharp
var sw = Stopwatch.StartNew();
var result = await ExecuteOperation();
if (sw.ElapsedMilliseconds > 1000) Logger.LogWarning("Slow: {Ms}ms", sw.ElapsedMilliseconds);
```

### Frontend
- Angular DevTools Chrome extension for change detection profiling
- `npm run build -- --stats-json` + `npx webpack-bundle-analyzer stats.json` for bundle analysis

## Anti-Patterns
- `var all = await context.Table.ToListAsync();` -- SELECT * in production
- `asyncOperation.Result;` -- synchronous I/O blocks thread
- `await repo.GetAllAsync();` -- unbounded result sets
- DB calls inside loops -- use batch load or eager loading
