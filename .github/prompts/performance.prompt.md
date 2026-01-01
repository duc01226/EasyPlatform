---
agent: 'agent'
description: 'Analyze and identify performance bottlenecks'
tools: ['read', 'search']
---

# Performance Analysis

Analyze performance for the specified target.

## Target
${input:target}

## Bottleneck Categories

### 1. Database Queries
- N+1 query problems
- Missing indexes
- Inefficient projections
- Full table scans

### 2. API Endpoint Latency
- Serialization overhead
- Unnecessary data loading
- Missing caching
- Sequential operations that could be parallel

### 3. Frontend Rendering
- Excessive change detection
- Large component trees
- Missing OnPush strategy
- Unnecessary re-renders

### 4. Memory Issues
- Subscription leaks
- Large object retention
- Missing cleanup in ngOnDestroy

## Backend Analysis

### Check Repository Patterns
```csharp
// Eager load related entities
await repository.GetAllAsync(expr, ct, e => e.RelatedEntity)

// N+1 problem - separate query per item
foreach (item in items) { await repo.GetById(item.RelatedId) }
```

### Review Query Builders
```csharp
// Use projections to reduce data transfer
.Select(e => new { e.Id, e.Name, e.Status })

// Loading full entities when only IDs needed
.Select(e => e).ToList().Select(e => e.Id)
```

### Check for Parallel Operations
```csharp
// Parallel tuple queries
var (total, items) = await (
    repository.CountAsync(queryBuilder, ct),
    repository.GetAllAsync(queryBuilder.PageBy(skip, take), ct)
);

// Sequential when independent
var total = await repository.CountAsync(queryBuilder, ct);
var items = await repository.GetAllAsync(queryBuilder.PageBy(skip, take), ct);
```

## Frontend Analysis

1. Check signal usage and change detection
2. Review store patterns for unnecessary emissions
3. Verify `untilDestroyed()` on all subscriptions
4. Check for `trackBy` in `@for` loops
5. Review `observerLoadingErrorState` usage

## Report Format

```markdown
## Performance Analysis Report

### Executive Summary
[Brief overview of findings]

### Bottlenecks Identified
| Issue | Location | Impact | Fix |
|-------|----------|--------|-----|
| N+1 query | file:line | High | Use eager loading |

### Recommendations
1. [Prioritized recommendation with expected impact]
2. [Next recommendation]

### Metrics (if measurable)
- Current response time: Xms
- Expected after optimization: Yms
```

**IMPORTANT**: Present findings and plan - wait for approval before implementing changes.
