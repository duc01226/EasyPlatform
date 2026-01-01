---
name: database-optimization
description: Use when optimizing database queries, indexes, N+1 problems, slow queries, or analyzing query performance.
---

# Database Optimization for EasyPlatform

## N+1 Query Problem

```csharp
// BAD: N+1 queries
var employees = await repo.GetAllAsync(e => e.CompanyId == companyId, ct);
foreach (var emp in employees)
{
    var dept = await deptRepo.GetByIdAsync(emp.DepartmentId, ct);  // N queries!
}

// GOOD: Eager loading
var employees = await repo.GetAllAsync(
    e => e.CompanyId == companyId, ct,
    loadRelatedEntities: e => e.Department);  // Single query with join

// GOOD: Batch load
var employees = await repo.GetAllAsync(e => e.CompanyId == companyId, ct);
var deptIds = employees.Select(e => e.DepartmentId).Distinct().ToList();
var departments = await deptRepo.GetByIdsAsync(deptIds, ct);
var deptMap = departments.ToDictionary(d => d.Id);
```

## Projection (Fetch Only Needed Columns)

```csharp
// BAD: Fetching entire entity
var employee = await repo.GetByIdAsync(id, ct);
return employee.Id;

// GOOD: Projection
var employeeId = await repo.FirstOrDefaultAsync(
    query => query.Where(Employee.UniqueExpr(userId, companyId)).Select(e => e.Id), ct);
```

## Parallel Independent Queries

```csharp
// BAD: Sequential
var count = await repo.CountAsync(filter, ct);
var items = await repo.GetAllAsync(filter, ct);

// GOOD: Parallel tuple queries
var (count, items, stats) = await (
    repo.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repo.GetAllAsync((uow, q) => queryBuilder(uow, q).PageBy(skip, take), ct),
    statsRepo.GetAsync(companyId, ct)
);
```

## Reusable Query Builder

```csharp
var queryBuilder = repo.GetQueryBuilder((uow, q) => q
    .Where(Employee.OfCompanyExpr(RequestContext.CurrentCompanyId()))
    .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
    .WhereIf(req.DepartmentId.IsNotNullOrEmpty(), e => e.DepartmentId == req.DepartmentId)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
        fullTextSearch.Search(q, req.SearchText, Employee.SearchColumns())));

var (total, items) = await (
    repo.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repo.GetAllAsync((uow, q) => queryBuilder(uow, q)
        .OrderByDescending(e => e.CreatedDate)
        .PageBy(req.SkipCount, req.MaxResultCount), ct)
);
```

## Index Recommendations

### MongoDB

```javascript
{ "CompanyId": 1 }                           // Single field
{ "CompanyId": 1, "Status": 1, "CreatedDate": -1 }  // Compound
{ "FullName": "text", "Email": "text" }      // Text index
```

### SQL Server

```sql
CREATE INDEX IX_Employee_Company_Status
ON Employees (CompanyId, Status)
INCLUDE (FullName, Email, CreatedDate);
```

## Bulk Operations

```csharp
await repo.CreateManyAsync(entities, ct);
await repo.UpdateManyAsync(entities, dismissSendEvent: true, checkDiff: false, ct);
await repo.DeleteManyAsync(e => e.Status == Status.Deleted, ct);
```

## Anti-Patterns

- **Loading entire collections**: Always filter and paginate
- **Fetching unused data**: Use projections
- **Sequential independent queries**: Use parallel tuple queries
- **Skip without ordering**: Always order before pagination
