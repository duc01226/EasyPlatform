# Backend C# Complete Guide

> Comprehensive reference for C# backend development in EasyPlatform - patterns, principles, and best practices.

---

## Summary - Quick Reference

| Category | Key Pattern | Location/Example |
|----------|-------------|------------------|
| **Repository** | Platform queryable repos | `IPlatformQueryableRootRepository<T, TKey>` |
| **CQRS** | Command+Handler+Result in ONE file | `UseCaseCommands/{Feature}/Save{Entity}Command.cs` |
| **Validation** | Fluent `PlatformValidationResult` | `.And()`, `.AndAsync()`, `.EnsureFound()` |
| **Side Effects** | Entity Event Handlers | `UseCaseEvents/{Feature}/{Action}On{Event}EntityEventHandler.cs` |
| **DTO Mapping** | DTO owns mapping | `PlatformEntityDto<T,K>.MapToEntity()`, `PlatformDto<T>.MapToObject()` |
| **Cross-Service** | Message Bus only | `PlatformApplicationMessageBusConsumer<T>` |
| **Background Jobs** | Platform executors | `PlatformApplicationPagedBackgroundJobExecutor` |
| **Expressions** | Static factory methods | `Entity.UniqueExpr()`, `Entity.FilterByStatusExpr()` |

---

## Table of Contents

1. [Code Principles & Clean Code](#1-code-principles--clean-code)
   - [SOLID Principles](#solid-principles)
   - [DRY - Don't Repeat Yourself](#dry---dont-repeat-yourself)
   - [KISS - Keep It Simple Stupid](#kiss---keep-it-simple-stupid)
   - [YAGNI - You Aren't Gonna Need It](#yagni---you-arent-gonna-need-it)
   - [Clean Code Essentials](#clean-code-essentials)
   - [Naming Conventions](#naming-conventions)
   - [Code Responsibility Hierarchy](#code-responsibility-hierarchy)
2. [Repository Pattern](#2-repository-pattern)
   - [Repository Priority Order](#repository-priority-order)
   - [Repository API Reference](#repository-api-reference)
   - [Repository Extension Pattern](#repository-extension-pattern)
3. [CQRS Pattern](#3-cqrs-pattern)
   - [Command Pattern](#command-pattern)
   - [Query Pattern](#query-pattern)
   - [Validation Patterns](#validation-patterns)
4. [Entity Development](#4-entity-development)
   - [Entity Structure](#entity-structure)
   - [Static Expression Patterns](#static-expression-patterns)
   - [Computed Properties](#computed-properties)
5. [DTO Patterns](#5-dto-patterns)
   - [PlatformEntityDto](#platformentitydto)
   - [PlatformDto for Value Objects](#platformdto-for-value-objects)
   - [Fluent With Methods](#fluent-with-methods)
6. [Event-Driven Architecture](#6-event-driven-architecture)
   - [Entity Event Handlers](#entity-event-handlers)
   - [Entity Event Bus Producers](#entity-event-bus-producers)
7. [Message Bus Communication](#7-message-bus-communication)
   - [Consumer Pattern](#consumer-pattern)
   - [Dependency Waiting](#dependency-waiting)
8. [Background Jobs](#8-background-jobs)
   - [Simple Paged Job](#simple-paged-job)
   - [Batch Scrolling Job](#batch-scrolling-job)
   - [Job Coordination](#job-coordination)
9. [Data Migration](#9-data-migration)
10. [Full-Text Search](#10-full-text-search)
11. [Authorization](#11-authorization)
12. [Fluent Helpers & Extensions](#12-fluent-helpers--extensions)
13. [Helper vs Util](#13-helper-vs-util)
14. [Anti-Patterns](#14-anti-patterns)
15. [Quick Reference Templates](#15-quick-reference-templates)

---

## 1. Code Principles & Clean Code

### SOLID Principles

#### Single Responsibility Principle (SRP)
Each class/method should have ONE reason to change.

```csharp
// WRONG: Multiple responsibilities
public class EmployeeService
{
    public void SaveEmployee(Employee e) { /* save logic */ }
    public void SendWelcomeEmail(Employee e) { /* email logic */ }
    public void GenerateReport(Employee e) { /* report logic */ }
}

// CORRECT: Separated responsibilities
public class EmployeeRepository { /* data access only */ }
public class EmailService { /* email sending only */ }
public class ReportGenerator { /* reporting only */ }
```

#### Open/Closed Principle (OCP)
Open for extension, closed for modification.

```csharp
// CORRECT: Use expressions for extensible filtering
public static Expression<Func<Employee, bool>> FilterExpr(EmployeeFilter filter)
    => BaseExpr()
        .AndAlsoIf(filter.Status.HasValue, () => e => e.Status == filter.Status)
        .AndAlsoIf(filter.DepartmentId.IsNotNullOrEmpty(), () => e => e.DepartmentId == filter.DepartmentId);
```

#### Liskov Substitution Principle (LSP)
Derived classes must be substitutable for base classes.

```csharp
// Platform pattern ensures LSP through base class contracts
public class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    // Must implement HandleAsync - contract from base class
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(...) { }
}
```

#### Interface Segregation Principle (ISP)
Clients shouldn't depend on interfaces they don't use.

```csharp
// Platform repositories provide clean abstractions
IPlatformQueryableRootRepository<Employee, string>  // Queryable repository for entities
IPlatformRootRepository<Employee, string>           // Base repository operations
```

#### Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions.

```csharp
// CORRECT: Inject interfaces
internal sealed class SaveEmployeeCommandHandler
{
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;  // Interface, not concrete
    private readonly INotificationService notificationService;    // Interface, not concrete
}
```

### DRY - Don't Repeat Yourself

```csharp
// WRONG: Duplicated filter logic
// In Handler 1:
var employees = await repo.GetAllAsync(e => e.CompanyId == companyId && e.IsActive && !e.IsDeleted);
// In Handler 2:
var employees = await repo.GetAllAsync(e => e.CompanyId == companyId && e.IsActive && !e.IsDeleted);

// CORRECT: Extract to static expression on entity
public partial class Employee
{
    public static Expression<Func<Employee, bool>> ActiveInCompanyExpr(string companyId)
        => e => e.CompanyId == companyId && e.IsActive && !e.IsDeleted;
}

// Usage - DRY
var employees = await repo.GetAllAsync(Employee.ActiveInCompanyExpr(companyId), ct);
```

### KISS - Keep It Simple Stupid

```csharp
// WRONG: Over-engineered
public async Task<Employee> GetEmployeeAsync(string id)
{
    var cacheKey = $"employee_{id}";
    var cached = await cache.GetAsync(cacheKey);
    if (cached != null) return cached;
    var employee = await repository.GetByIdAsync(id);
    await cache.SetAsync(cacheKey, employee, TimeSpan.FromMinutes(5));
    return employee;
}

// CORRECT: Simple and direct (let platform handle caching if needed)
public async Task<Employee> GetEmployeeAsync(string id)
    => await repository.GetByIdAsync(id, ct).EnsureFound();
```

### YAGNI - You Aren't Gonna Need It

```csharp
// WRONG: Building for hypothetical future requirements
public class EmployeeDto
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string FutureField1 { get; set; }  // "We might need this"
    public string FutureField2 { get; set; }  // "Just in case"
    public Dictionary<string, object> ExtensionData { get; set; }  // "For flexibility"
}

// CORRECT: Only what's needed now
public class EmployeeDto
{
    public string Id { get; set; }
    public string Name { get; set; }
}
```

### Clean Code Essentials

1. **Single Responsibility per method** - One method does one thing
2. **Consistent abstraction levels** - Don't mix high and low level operations
3. **Meaningful, descriptive names** - Code should be self-documenting
4. **Group related functionality** - Logical organization
5. **Step-by-step code flow** - Clear progression with spacing
6. **Business logic in domain entities** - Not in handlers
7. **Search existing code first** - Never duplicate

**90% Logic Rule:** If logic belongs 90% to class A, put it in class A.

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `UserService`, `EmployeeDto` |
| Methods | PascalCase | `GetEmployeeAsync()`, `ValidateRequest()` |
| Variables | camelCase | `userName`, `employeeList` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| Booleans | Prefix with verb | `isActive`, `hasPermission`, `canEdit`, `shouldProcess` |
| Collections | Plural | `users`, `items`, `employees` |
| Async methods | Suffix `Async` | `GetEmployeesAsync()`, `SaveAsync()` |
| Expressions | Suffix `Expr` | `UniqueExpr()`, `FilterByStatusExpr()` |

### Code Responsibility Hierarchy

**Place logic in LOWEST appropriate layer to enable reuse:**

```
Entity/Model (Lowest) → Service/Helper → Handler/Component (Highest)
```

| Layer | Contains |
|-------|----------|
| **Entity** | Business logic, display helpers, static expressions, default values, validation rules |
| **Service/Helper** | Cross-entity coordination, external service calls |
| **Handler** | Orchestration ONLY - delegates to lower layers |

```csharp
// WRONG: Logic in handler that should be in entity
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var fullName = $"{req.FirstName} {req.LastName}".Trim();  // Should be in Entity
    var isActive = req.Status == 1 && req.EndDate > DateTime.Now;  // Should be in Entity
}

// CORRECT: Logic in entity
public partial class Employee
{
    [ComputedEntityProperty]
    public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }

    public bool IsActive => Status == EmployeeStatus.Active && (!EndDate.HasValue || EndDate > Clock.UtcNow);
}
```

---

## 2. Repository Pattern

### Repository Priority Order

**CRITICAL: Use platform repositories consistently.**

```csharp
// PRIMARY - Platform queryable repository (for query operations)
IPlatformQueryableRootRepository<Employee, string>

// ALTERNATIVE - Base repository (when queryable not needed)
IPlatformRootRepository<Employee, string>
```

### Repository API Reference

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════════════════
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// CREATE OR UPDATE (Upsert)
// ═══════════════════════════════════════════════════════════════════════════
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// DELETE
// ═══════════════════════════════════════════════════════════════════════════
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════════════════
var entity = await repository.GetByIdAsync(id, cancellationToken);

// With eager loading
var entity = await repository.GetByIdAsync(id, cancellationToken,
    loadRelatedEntities: p => p.Employee, p => p.Company);

// ═══════════════════════════════════════════════════════════════════════════
// GET SINGLE
// ═══════════════════════════════════════════════════════════════════════════
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// GET MULTIPLE
// ═══════════════════════════════════════════════════════════════════════════
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// QUERY BUILDERS (Reusable Queries)
// ═══════════════════════════════════════════════════════════════════════════
var query = repository.GetQuery(uow);
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));

// ═══════════════════════════════════════════════════════════════════════════
// COUNT & EXISTS
// ═══════════════════════════════════════════════════════════════════════════
var count = await repository.CountAsync(expr, cancellationToken);
var exists = await repository.AnyAsync(expr, cancellationToken);

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTION (Performance optimization - fetch only needed fields)
// ═══════════════════════════════════════════════════════════════════════════
var id = await repository.FirstOrDefaultAsync(
    queryBuilder: query => query
        .Where(Employee.UniqueExpr(userId))
        .Select(e => e.Id),  // Only fetch ID
    cancellationToken: ct);
```

### Repository Extension Pattern

**Location:** `{Service}.Domain\Repositories\Extensions\{Entity}RepositoryExtensions.cs`

```csharp
public static class EmployeeRepositoryExtensions
{
    // Get single entity with EnsureFound
    public static async Task<Employee> GetByUniqueExprAsync(
        this IPlatformQueryableRootRepository<Employee, string> employeeRepository,
        string employeeCompanyId,
        string employeeUserId,
        CancellationToken cancellationToken = default,
        params Expression<Func<Employee, object?>>[] loadRelatedEntities)
    {
        return await employeeRepository
            .FirstOrDefaultAsync(
                Employee.UniqueExpr(employeeCompanyId, employeeUserId),
                cancellationToken,
                loadRelatedEntities)
            .EnsureFound();
    }

    // Projection pattern - return only ID for performance
    public static async Task<string> GetEmployeeIdByUniqueExprAsync(
        this IPlatformQueryableRootRepository<Employee, string> employeeRepository,
        string employeeCompanyId,
        string employeeUserId,
        CancellationToken cancellationToken = default)
    {
        return await employeeRepository
            .FirstOrDefaultAsync(
                queryBuilder: query => query
                    .Where(Employee.UniqueExpr(employeeCompanyId, employeeUserId))
                    .Select(p => p.Id),
                cancellationToken: cancellationToken)
            .EnsureFound();
    }

    // Batch validation pattern
    public static async Task<List<Employee>> GetByIdsValidatedAsync(
        this IPlatformQueryableRootRepository<Employee, string> repo,
        List<string> ids,
        CancellationToken ct = default)
    {
        return await repo
            .GetAllAsync(p => ids.Contains(p.Id), ct)
            .EnsureFoundAllBy(p => p.Id, ids);
    }
}
```

---

## 3. CQRS Pattern

### Command Pattern

**CRITICAL:** Command + Result + Handler = ALL IN ONE FILE

**Location:** `{Service}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs`

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════════════════════════
public sealed class SaveEmployeeCommand : PlatformCqrsCommand<SaveEmployeeCommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public List<IFormFile> Files { get; set; } = [];

    // Sync validation
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
            .And(_ => Email.IsNotNullOrEmpty(), "Email is required")
            .And(_ => Email.Contains("@"), "Invalid email format");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT (same file)
// ═══════════════════════════════════════════════════════════════════════════
public sealed class SaveEmployeeCommandResult : PlatformCqrsCommandResult
{
    public EmployeeDto Entity { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER (same file)
// ═══════════════════════════════════════════════════════════════════════════
internal sealed class SaveEmployeeCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;
    private readonly IFileService fileService;

    public SaveEmployeeCommandHandler(
        IPlatformQueryableRootRepository<Employee, string> repository,
        IFileService fileService,
        // ... other dependencies
        ) : base(/* base params */)
    {
        this.repository = repository;
        this.fileService = fileService;
    }

    // Async validation
    protected override async Task<PlatformValidationResult<SaveEmployeeCommand>> ValidateRequestAsync(
        PlatformValidationResult<SaveEmployeeCommand> validation,
        CancellationToken ct)
    {
        return await validation
            .AndAsync(req => repository
                .GetByIdsAsync(req.RelatedIds, ct)
                .ThenValidateFoundAllAsync(req.RelatedIds, ids => $"Not found: {ids}"))
            .AndNotAsync(
                req => repository.AnyAsync(e => e.Email == req.Email && e.Id != req.Id, ct),
                "Email already exists");
    }

    protected override async Task<SaveEmployeeCommandResult> HandleAsync(
        SaveEmployeeCommand req,
        CancellationToken ct)
    {
        // Step 1: Get or create entity
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // Step 2: Validate entity state
        await entity.ValidateAsync(repository, ct).EnsureValidAsync();

        // Step 3: Save entity and upload files (parallel)
        var (saved, uploadedFiles) = await (
            repository.CreateOrUpdateAsync(entity, ct),
            req.Files.ParallelAsync(f => fileService.UploadAsync(f, ct))
        );

        // Step 4: Return result
        return new SaveEmployeeCommandResult { Entity = new EmployeeDto(saved) };
    }
}
```

### Query Pattern

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════
public sealed class GetEmployeeListQuery : PlatformCqrsPagedQuery<GetEmployeeListQueryResult, EmployeeDto>
{
    public List<EmployeeStatus> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
    public string? DepartmentId { get; set; }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY RESULT
// ═══════════════════════════════════════════════════════════════════════════
public sealed class GetEmployeeListQueryResult : PlatformCqrsPagedQueryResult<EmployeeDto>
{
    public Dictionary<EmployeeStatus, int> StatusCounts { get; set; } = new();

    public GetEmployeeListQueryResult(
        List<Employee> items,
        int totalCount,
        GetEmployeeListQuery request,
        Dictionary<EmployeeStatus, int> statusCounts)
        : base(items.SelectList(e => new EmployeeDto(e)), totalCount, request)
    {
        StatusCounts = statusCounts;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUERY HANDLER
// ═══════════════════════════════════════════════════════════════════════════
internal sealed class GetEmployeeListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEmployeeListQuery, GetEmployeeListQueryResult>
{
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;
    private readonly IPlatformFullTextSearchPersistenceService searchService;

    protected override async Task<GetEmployeeListQueryResult> HandleAsync(
        GetEmployeeListQuery req,
        CancellationToken ct)
    {
        // Build reusable query with GetQueryBuilder
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .WhereIf(req.DepartmentId.IsNotNullOrEmpty(), e => e.DepartmentId == req.DepartmentId)
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), query =>
                searchService.Search(query, req.SearchText, Employee.DefaultFullTextSearchColumns())));

        // Parallel tuple queries for count, data, and aggregation
        var (total, items, statusCounts) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct, e => e.Department),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .GroupBy(e => e.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() }), ct)
        );

        return new GetEmployeeListQueryResult(
            items,
            total,
            req,
            statusCounts.ToDictionary(x => x.Status, x => x.Count));
    }
}
```

### Validation Patterns

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// SYNC VALIDATION (in Command class)
// ═══════════════════════════════════════════════════════════════════════════
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required")
        .And(_ => Util.TimeZoneParser.TryGetTimeZoneById(TimeZone) != null, "TimeZone is invalid")
        .And(_ => StartDate <= EndDate, "Start date must be before end date");
}

// ═══════════════════════════════════════════════════════════════════════════
// ASYNC VALIDATION (in Handler)
// ═══════════════════════════════════════════════════════════════════════════
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> validation,
    CancellationToken ct)
{
    return await validation
        // Validate all IDs exist
        .AndAsync(req => repository
            .GetByIdsAsync(req.WatcherIds, ct)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(req.WatcherIds, notFoundIds => $"Not found: {notFoundIds}"))
        // Negative validation - ensure condition is NOT true
        .AndNotAsync(
            req => repository.AnyAsync(e => req.Ids.Contains(e.Id) && e.IsExternalUser, ct),
            "External users cannot perform this action");
}

// ═══════════════════════════════════════════════════════════════════════════
// CHAINED VALIDATION WITH Of<>
// ═══════════════════════════════════════════════════════════════════════════
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return this
        .Validate(p => p.Id.IsNotNullOrEmpty(), "Id is required")
        .And(p => p.Status != Status.Deleted, "Cannot modify deleted entity")
        .Of<IPlatformCqrsRequest>();  // Type conversion at end
}

// ═══════════════════════════════════════════════════════════════════════════
// ENSURE PATTERN (Inline validation that throws)
// ═══════════════════════════════════════════════════════════════════════════
var entity = await repository
    .GetByIdAsync(id, ct)
    .EnsureFound($"Entity not found: {id}")
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());

// Multiple ensures
var entities = await repository
    .GetByIdsAsync(ids, ct)
    .EnsureFoundAllBy(e => e.Id, ids);
```

**Validation Naming Convention:**

| Pattern | Return Type | Behavior |
|---------|-------------|----------|
| `Validate[Context]()` | `PlatformValidationResult<T>` | Never throws, returns result |
| `Ensure[Context]Valid()` | `void` or `T` | Throws if invalid |

---

## 4. Entity Development

### Entity Structure

```csharp
// Non-audited entity
public class Employee : RootEntity<Employee, string>
{
    // Properties...
}

// Audited entity (with CreatedBy, ModifiedBy tracking)
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string>
{
    // Properties...
}
```

### Full Entity Example

```csharp
[TrackFieldUpdatedDomainEvent]  // Auto-track field changes
public sealed class Employee : RootEntity<Employee, string>
{
    // ═══════════════════════════════════════════════════════════════════════
    // TRACKED PROPERTIES (raise domain events on change)
    // ═══════════════════════════════════════════════════════════════════════
    [TrackFieldUpdatedDomainEvent]
    public string FirstName { get; set; } = string.Empty;

    [TrackFieldUpdatedDomainEvent]
    public string LastName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;
    public string CompanyId { get; set; } = string.Empty;
    public string? DepartmentId { get; set; }
    public EmployeeStatus Status { get; set; } = EmployeeStatus.Active;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }

    // ═══════════════════════════════════════════════════════════════════════
    // NAVIGATION PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════
    [JsonIgnore]
    public Company? Company { get; set; }

    [JsonIgnore]
    public Department? Department { get; set; }

    // ═══════════════════════════════════════════════════════════════════════
    // COMPUTED PROPERTIES (MUST have empty setter for EF Core)
    // ═══════════════════════════════════════════════════════════════════════
    [ComputedEntityProperty]
    public string FullName
    {
        get => $"{FirstName} {LastName}".Trim();
        set { }  // Required empty setter
    }

    [ComputedEntityProperty]
    public bool IsActive
    {
        get => Status == EmployeeStatus.Active && (!EndDate.HasValue || EndDate > Clock.UtcNow);
        set { }  // Required empty setter
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATIC EXPRESSION PATTERNS
    // ═══════════════════════════════════════════════════════════════════════
    public static Expression<Func<Employee, bool>> UniqueExpr(string companyId, string email)
        => e => e.CompanyId == companyId && e.Email == email;

    public static Expression<Func<Employee, bool>> OfCompanyExpr(string companyId)
        => e => e.CompanyId == companyId;

    public static Expression<Func<Employee, bool>> FilterByStatusExpr(List<EmployeeStatus> statuses)
    {
        var statusSet = statuses.ToHashSet();
        return e => statusSet.Contains(e.Status);
    }

    // Composite expression with conditional parts
    public static Expression<Func<Employee, bool>> ActiveInCompanyExpr(string companyId, bool includeInactive = false)
        => OfCompanyExpr(companyId)
            .AndAlsoIf(!includeInactive, () => e => e.IsActive);

    // Async expression (when external dependency needed)
    public static async Task<Expression<Func<Employee, bool>>> FilterWithLicenseExprAsync(
        ILicenseRepository licenseRepo,
        string companyId,
        CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SEARCH COLUMNS
    // ═══════════════════════════════════════════════════════════════════════
    public static Expression<Func<Employee, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.FirstName, e => e.LastName, e => e.Email, e => e.FullName];

    // ═══════════════════════════════════════════════════════════════════════
    // INSTANCE METHODS
    // ═══════════════════════════════════════════════════════════════════════
    public void Activate()
    {
        Status = EmployeeStatus.Active;
        EndDate = null;
    }

    public void Deactivate(DateTime endDate)
    {
        Status = EmployeeStatus.Inactive;
        EndDate = endDate;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STATIC VALIDATION
    // ═══════════════════════════════════════════════════════════════════════
    public static List<string> ValidateEntity(Employee? entity)
    {
        var errors = new List<string>();
        if (entity == null) errors.Add("Employee not found");
        else if (!entity.IsActive) errors.Add("Employee is inactive");
        return errors;
    }
}
```

### Static Expression Patterns

```csharp
// Simple expressions
public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;

// Conditional composition
public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, List<Status>? statuses)
    => OfCompanyExpr(companyId)
        .AndAlso(e => e.IsActive)
        .AndAlsoIf(statuses?.Any() == true, () => FilterByStatusExpr(statuses!));

// Complex expression with multiple conditions
public static Expression<Func<Employee, bool>> CanBeReviewParticipantExpr(
    int scope, string companyId, int? minMonths, string? eventId)
    => OfficialEmployeeExpr(scope, companyId)
        .AndAlso(e => e.User != null && e.User.IsActive)
        .AndAlsoIf(minMonths != null, () => e => e.StartDate <= Clock.UtcNow.AddMonths(-minMonths!.Value))
        .AndAlsoIf(eventId.IsNotNullOrEmpty(), () => e => e.ReviewParticipants.Any(p => p.EventId == eventId));
```

### Computed Properties

**CRITICAL:** Computed properties MUST have empty setter `set { }` for EF Core compatibility.

```csharp
[ComputedEntityProperty]
public string FullName
{
    get => $"{FirstName} {LastName}".Trim();
    set { }  // REQUIRED - empty setter for EF Core
}

[ComputedEntityProperty]
public bool IsRoot
{
    get => Id == RootId;
    set { }  // REQUIRED
}

[ComputedEntityProperty]
public int DaysEmployed
{
    get => StartDate.HasValue ? (Clock.UtcNow - StartDate.Value).Days : 0;
    set { }  // REQUIRED
}
```

---

## 5. DTO Patterns

### PlatformEntityDto

**Location:** `{Service}.Application\EntityDtos\{Entity}EntityDto.cs`

```csharp
public class EmployeeEntityDto : PlatformEntityDto<Employee, string>
{
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTRUCTORS
    // ═══════════════════════════════════════════════════════════════════════
    public EmployeeEntityDto() { }

    public EmployeeEntityDto(Employee entity, User? userEntity = null) : base(entity)
    {
        Id = entity.Id;
        EmployeeId = entity.Id!;
        FullName = entity.FullName ?? userEntity?.FullName ?? "";
        Email = entity.Email ?? userEntity?.Email ?? "";
        Position = entity.Position;
        Status = entity.Status;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE PROPERTIES
    // ═══════════════════════════════════════════════════════════════════════
    public string? Id { get; set; }
    public string EmployeeId { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string? Position { get; set; }
    public EmployeeStatus Status { get; set; }

    // ═══════════════════════════════════════════════════════════════════════
    // OPTIONAL LOAD PROPERTIES (via With* methods)
    // ═══════════════════════════════════════════════════════════════════════
    public OrganizationEntityDto? Company { get; set; }
    public List<OrganizationEntityDto>? Departments { get; set; }

    // ═══════════════════════════════════════════════════════════════════════
    // FLUENT With* METHODS
    // ═══════════════════════════════════════════════════════════════════════
    public EmployeeEntityDto WithCompany(OrganizationalUnit company)
    {
        Company = new OrganizationEntityDto(company);
        return this;
    }

    public EmployeeEntityDto WithDepartments(List<OrganizationalUnit> departments)
    {
        Departments = departments.SelectList(d => new OrganizationEntityDto(d));
        return this;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PLATFORM OVERRIDES
    // ═══════════════════════════════════════════════════════════════════════
    protected override object? GetSubmittedId() => Id;

    protected override string GenerateNewId() => Ulid.NewUlid().ToString();

    protected override Employee MapToEntity(Employee entity, MapToEntityModes mode)
    {
        entity.FullName = FullName;
        entity.Email = Email;
        entity.Position = Position;
        entity.Status = Status;
        return entity;
    }
}

// Usage in handler
var employees = await repository.GetAllAsync(expr, ct, e => e.User, e => e.Company);
var dtos = employees.SelectList(e => new EmployeeEntityDto(e, e.User)
    .WithCompany(e.Company!)
    .WithDepartments(e.Departments?.ToList() ?? []));
```

### PlatformDto for Value Objects

```csharp
// For non-entity objects (configurations, value objects)
public sealed class AuthConfigurationValueDto : PlatformDto<AuthConfigurationValue>
{
    public string ClientId { get; set; } = "";
    public string ClientSecret { get; set; } = "";
    public string BaseUrl { get; set; } = "";

    public override AuthConfigurationValue MapToObject() => new()
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret,
        BaseUrl = BaseUrl
    };
}

// Usage in handler - DTO owns mapping responsibility
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = req.AuthConfiguration.MapToObject()
        .With(p => p.ClientSecret = encryptionService.Encrypt(p.ClientSecret));

    await configService.SaveAsync(config, ct);
}
```

### Fluent With Methods

```csharp
// Pattern for optional data loading
public class EmployeeDto
{
    public string Id { get; set; }
    public string Name { get; set; }

    // Optional - only set when needed
    public CompanyDto? Company { get; set; }
    public List<RoleDto>? Roles { get; set; }
    public ManagerDto? Manager { get; set; }

    public EmployeeDto WithCompany(Company c)
    {
        Company = new CompanyDto(c);
        return this;
    }

    public EmployeeDto WithRoles(IEnumerable<Role> roles)
    {
        Roles = roles.SelectList(r => new RoleDto(r));
        return this;
    }

    public EmployeeDto WithManager(Employee? manager)
    {
        Manager = manager != null ? new ManagerDto(manager) : null;
        return this;
    }
}

// Usage - chain as needed
var dto = new EmployeeDto(employee)
    .WithCompany(employee.Company!)
    .WithRoles(employee.Roles)
    .WithManager(employee.Manager);
```

---

## 6. Event-Driven Architecture

### Entity Event Handlers

**CRITICAL:** Never call side effects directly in command handlers. Use entity event handlers.

**Location:** `UseCaseEvents/{Feature}/Send{Action}On{Event}{Entity}EntityEventHandler.cs`

```csharp
internal sealed class SendNotificationOnCreateEmployeeEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Employee>  // Single generic parameter!
{
    private readonly INotificationService notificationService;
    private readonly IEmailService emailService;

    public SendNotificationOnCreateEmployeeEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService,
        IEmailService emailService)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    // Filter: When should this handler run?
    // NOTE: Returns async Task<bool>, not bool!
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
    {
        // Skip during test data seeding
        if (@event.RequestContext.IsSeedingTestingData()) return false;

        // Only handle Created events
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Employee> @event,
        CancellationToken ct)
    {
        var employee = @event.EntityData;

        // Execute side effects
        await notificationService.SendWelcomeNotificationAsync(employee, ct);
        await emailService.SendWelcomeEmailAsync(employee.Email, employee.FullName, ct);
    }
}
```

### Entity Event Bus Producers

```csharp
// Auto-publishes entity changes to message bus
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string>
{
    // Platform handles publishing automatically on Create/Update/Delete
}
```

---

## 7. Message Bus Communication

### Consumer Pattern

```csharp
internal sealed class UpsertOrDeleteEmployeeConsumer :
    PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;
    private readonly IPlatformQueryableRootRepository<Company, string> companyRepo;
    private readonly IPlatformQueryableRootRepository<User, string> userRepo;

    // Filter: Should this message be processed?
    public override async Task<bool> HandleWhen(EmployeeEntityEventBusMessage msg, string routingKey)
        => true;  // Process all messages, or add filtering logic

    public override async Task HandleLogicAsync(EmployeeEntityEventBusMessage msg, string routingKey)
    {
        var action = msg.Payload.CrudAction;
        var data = msg.Payload.EntityData;

        // ═══════════════════════════════════════════════════════════════════
        // CREATE / UPDATE
        // ═══════════════════════════════════════════════════════════════════
        if (action == PlatformCqrsEntityEventCrudAction.Created ||
            (action == PlatformCqrsEntityEventCrudAction.Updated && !data.IsDeleted))
        {
            // Wait for dependencies (company and user must exist first)
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(
                    () => companyRepo.AnyAsync(c => c.Id == data.CompanyId),
                    maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(
                    () => userRepo.AnyAsync(u => u.Id == data.UserId),
                    maxWaitSeconds: 300).Then(p => !p)
            );

            // Skip if dependencies missing after timeout
            if (companyMissing || userMissing) return;

            var existing = await repository.FirstOrDefaultAsync(e => e.Id == data.Id);

            if (existing == null)
            {
                // Create new entity
                await repository.CreateAsync(data.ToEntity()
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            }
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
            {
                // Update existing entity (only if message is newer)
                await repository.UpdateAsync(data.UpdateEntity(existing)
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // DELETE
        // ═══════════════════════════════════════════════════════════════════
        if (action == PlatformCqrsEntityEventCrudAction.Deleted ||
            (action == PlatformCqrsEntityEventCrudAction.Updated && data.IsDeleted))
        {
            await repository.DeleteAsync(data.Id);
        }
    }
}
```

### Dependency Waiting

```csharp
// Wait for dependent data to arrive before processing
var (companyExists, userExists) = await (
    Util.TaskRunner.TryWaitUntilAsync(
        () => companyRepo.AnyAsync(c => c.Id == msg.CompanyId),
        maxWaitSeconds: msg.IsForceSync ? 30 : 300),
    Util.TaskRunner.TryWaitUntilAsync(
        () => userRepo.AnyAsync(u => u.Id == msg.UserId),
        maxWaitSeconds: 300)
);

if (!companyExists || !userExists)
{
    Logger.LogWarning("Dependencies not found for message {Id}", msg.Id);
    return;  // Skip processing
}
```

**Message Naming Convention:**

| Type | Producer Role | Pattern | Example |
|------|---------------|---------|---------|
| Event | Leader | `<Service><Feature><Action>EventBusMessage` | `CandidateJobSyncCompletedEventBusMessage` |
| Request | Follower | `<ConsumerService><Feature>RequestBusMessage` | `GrowthCreateEmployeeRequestBusMessage` |

---

## 8. Background Jobs

### Simple Paged Job

```csharp
[PlatformRecurringJob("0 3 * * *")]  // Daily at 3 AM
public sealed class ProcessEmployeesJob : PlatformApplicationPagedBackgroundJobExecutor
{
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;

    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(
        int? skip,
        int? take,
        object? param,
        IServiceProvider sp,
        IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItemAsync(item));
    }

    protected override async Task<int> MaxItemsCount(
        PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));

    private IQueryable<Employee> QueryBuilder(IQueryable<Employee> q)
        => q.Where(e => e.IsActive && e.NeedsProcessing);

    private async Task ProcessItemAsync(Employee employee)
    {
        // Process individual employee
        employee.LastProcessedDate = Clock.UtcNow;
        await repository.UpdateAsync(employee);
    }
}
```

### Batch Scrolling Job

Two-level pagination: batch keys (e.g., companies) + entities within each batch.

```csharp
[PlatformRecurringJob("0 0 * * *")]  // Daily at midnight
public sealed class SyncEmployeesByCompanyJob :
    PlatformApplicationBatchScrollingBackgroundJobExecutor<Employee, string>
{
    protected override int BatchKeyPageSize => 50;   // Companies per page
    protected override int BatchPageSize => 25;       // Employees per company

    // Query entities, optionally filtered by batch key (companyId)
    protected override IQueryable<Employee> EntitiesQueryBuilder(
        IQueryable<Employee> q,
        object? param,
        string? batchKey = null)
        => q.Where(e => e.IsActive)
            .WhereIf(batchKey != null, e => e.CompanyId == batchKey);

    // Get distinct batch keys (company IDs)
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(
        IQueryable<Employee> q,
        object? param,
        string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey)
            .Select(e => e.CompanyId)
            .Distinct();

    // Process entities within a batch
    protected override async Task ProcessEntitiesAsync(
        List<Employee> entities,
        string batchKey,
        object? param,
        IServiceProvider sp)
    {
        await entities.ParallelAsync(
            async e => await SyncEmployeeAsync(e),
            maxConcurrent: 1);  // Process one at a time within batch
    }

    private async Task SyncEmployeeAsync(Employee employee)
    {
        // Sync logic
    }
}
```

### Job Coordination

Master job schedules child jobs:

```csharp
[PlatformRecurringJob("0 0 * * *")]
public sealed class MasterSyncJob : PlatformApplicationBackgroundJobExecutor
{
    protected override async Task ProcessAsync(object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var companies = await companyRepo.GetAllAsync(c => c.IsActive);

        // Schedule child jobs for each company and date range
        await companies.ParallelAsync(async companyId =>
            await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
                BackgroundJobScheduler.Schedule<ChildSyncJob, SyncParam>(
                    Clock.UtcNow,
                    new SyncParam { CompanyId = companyId, Date = date })));
    }
}
```

**Cron Schedule Examples:**

```csharp
[PlatformRecurringJob("0 0 * * *")]              // Daily at midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 minutes
[PlatformRecurringJob("0 */2 * * *")]            // Every 2 hours
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + on startup
[PlatformRecurringJob("0 0 * * 1")]              // Weekly on Monday
[PlatformRecurringJob("0 0 1 * *")]              // Monthly on 1st
```

---

## 9. Data Migration

```csharp
public class MigrateEmployeeData : PlatformDataMigrationExecutor<TextSnippetDbContext>
{
    public override string Name => "20251022000000_MigrateEmployeeData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(GrowthDbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));

        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static Expression<Func<Employee, bool>> FilterExpr()
        => e => e.Status == EmployeeStatus.Active && e.NeedsMigration;

    private static async Task<List<Employee>> ExecutePaging(
        int skip,
        int take,
        Func<IQueryable<Employee>, IQueryable<Employee>> qb,
        IPlatformQueryableRootRepository<Employee, string> repo,
        IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();

        var items = await repo.GetAllAsync(q => qb(q)
            .OrderBy(e => e.Id)
            .Skip(skip)
            .Take(take));

        // Apply migration transformation
        foreach (var item in items)
        {
            item.MigratedField = TransformValue(item.OldField);
            item.NeedsMigration = false;
        }

        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false);
        await unitOfWork.CompleteAsync();

        return items;
    }
}
```

---

## 10. Full-Text Search

```csharp
// In Query Handler
private readonly IPlatformFullTextSearchPersistenceService fullTextSearchService;

protected override async Task<Result> HandleAsync(Query req, CancellationToken ct)
{
    var queryBuilder = repository.GetQueryBuilder((uow, q) => q
        .Where(Employee.OfCompanyExpr(RequestContext.CurrentCompanyId()))
        .PipeIf(
            req.SearchText.IsNotNullOrEmpty(),
            query => fullTextSearchService.Search(
                query,
                req.SearchText,
                Employee.DefaultFullTextSearchColumns(),
                fullTextAccurateMatch: true,  // true = exact phrase, false = fuzzy
                includeStartWithProps: Employee.DefaultFullTextSearchColumns()
            )
        )
    );

    // Execute query...
}

// In Entity - define searchable columns
public partial class Employee
{
    public static Expression<Func<Employee, object?>>[] DefaultFullTextSearchColumns()
        => new Expression<Func<Employee, object?>>[]
        {
            e => e.FullName,
            e => e.Email,
            e => e.EmployeeCode,
            e => e.PhoneNumber
        };
}
```

---

## 11. Authorization

```csharp
// ═══════════════════════════════════════════════════════════════════════════
// CONTROLLER LEVEL
// ═══════════════════════════════════════════════════════════════════════════
[ApiController]
[Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd)
        => Ok(await Cqrs.SendAsync(cmd));

    [PlatformAuthorize(PlatformRoles.Admin)]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
        => Ok(await Cqrs.SendAsync(new DeleteEmployeeCommand { Id = id }));
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER VALIDATION
// ═══════════════════════════════════════════════════════════════════════════
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(
    PlatformValidationResult<T> validation,
    CancellationToken ct)
{
    return await validation
        // Must be admin
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        // Must be same company
        .AndAsync(_ => repository.AnyAsync(
            e => e.Id == Id && e.CompanyId == RequestContext.CurrentCompanyId(), ct),
            "Access denied");
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTITY-LEVEL QUERY FILTER
// ═══════════════════════════════════════════════════════════════════════════
public static Expression<Func<Employee, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);

// Usage
var employees = await repository.GetAllAsync(
    Employee.OfCompanyExpr(companyId)
        .AndAlso(Employee.UserCanAccessExpr(userId, companyId)),
    ct);
```

---

## 12. Fluent Helpers & Extensions

### Mutation Helpers

```csharp
// With - mutate and return
var entity = await repository.GetByIdAsync(id)
    .With(e => e.Name = newName)
    .With(e => e.UpdatedDate = Clock.UtcNow);

// WithIf - conditional mutation
var entity = await repository.GetByIdAsync(id)
    .WithIf(shouldActivate, e => e.Status = Status.Active)
    .WithIf(shouldSetManager, e => e.ManagerId = managerId);
```

### Transformation Helpers

```csharp
// Then - transform result
var dto = await repository.GetByIdAsync(id)
    .Then(e => new EmployeeDto(e));

// ThenAsync - async transformation
var result = await repository.GetByIdAsync(id)
    .ThenAsync(async e => await e.ValidateAsync(service, ct));
```

### Safety Helpers

```csharp
// EnsureFound - throw if null
var entity = await repository.GetByIdAsync(id)
    .EnsureFound($"Employee not found: {id}");

// EnsureFoundAllBy - validate all IDs found
var entities = await repository.GetByIdsAsync(ids)
    .EnsureFoundAllBy(e => e.Id, ids);

// EnsureValidAsync - throw if validation fails
await entity.ValidateAsync(repo, ct).EnsureValidAsync();
```

### Expression Composition

```csharp
// AndAlso - combine expressions
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlso(Entity.IsActiveExpr());

// AndAlsoIf - conditional composition
var expr = Entity.OfCompanyExpr(companyId)
    .AndAlsoIf(statusFilter.Any(), () => Entity.FilterByStatusExpr(statusFilter))
    .AndAlsoIf(deptId.IsNotNullOrEmpty(), () => e => e.DepartmentId == deptId);

// OrElse - OR composition
var expr = Entity.CreatedByExpr(userId)
    .OrElse(Entity.IsPublicExpr());
```

### Collection Helpers

```csharp
// SelectList - Select().ToList() shorthand
var ids = employees.SelectList(e => e.Id);

// ThenSelect - for Task<List<T>>
var ids = await repository.GetAllAsync(expr, ct).ThenSelect(e => e.Id);

// ParallelAsync - parallel processing with concurrency limit
await items.ParallelAsync(
    async item => await ProcessAsync(item, ct),
    maxConcurrent: 10);

// IsNullOrEmpty / IsNotNullOrEmpty
if (list.IsNotNullOrEmpty()) { /* process */ }

// RemoveWhere - remove items matching predicate
list.RemoveWhere(x => x.IsDeleted, out var removed);

// UpsertBy - update existing or add new
list.UpsertBy(x => x.Id, newItems, (existing, incoming) => existing.Update(incoming));
```

### Parallel Tuple Await

```csharp
// Execute multiple queries in parallel
var (users, companies, settings) = await (
    userRepository.GetAllAsync(userExpr, ct),
    companyRepository.GetAllAsync(companyExpr, ct),
    settingsRepository.GetAllAsync(settingsExpr, ct)
);

// With count and data
var (total, items) = await (
    repository.CountAsync(queryBuilder, ct),
    repository.GetAllAsync(queryBuilder.PageBy(skip, take), ct)
);
```

### Conditional Actions

```csharp
var entity = await repository.GetByIdAsync(id)
    .PipeActionIf(condition, e => e.UpdateTimestamp())
    .PipeActionAsyncIf(
        async () => await externalService.ShouldSync(),
        async e => await e.SyncExternalAsync());
```

### Task Extensions

```csharp
// WaitResult - preserves stack trace (NOT task.Wait())
var result = task.WaitResult();

// WaitUntilGetValidResultAsync - poll until condition met
await target.WaitUntilGetValidResultAsync(
    t => repository.GetByIdAsync(t.Id),
    r => r != null && r.IsProcessed,
    maxWaitSeconds: 30);

// ThenGetWith - return tuple
var (entity, related) = await repository.GetByIdAsync(id)
    .ThenGetWith(e => e.RelatedEntity);

// ThenIfOrDefault - conditional next task
var result = await repository.GetByIdAsync(id)
    .ThenIfOrDefault(
        e => e.NeedsProcessing,
        e => ProcessAsync(e, ct),
        defaultValue: null);
```

---

## 13. Helper vs Util

**Decision Guide:**

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
│   └── Location: {Service}.Application\Helpers\{Entity}Helper.cs
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils or {Service}.Application.Utils
```

### Helper Pattern (with dependencies)

```csharp
public sealed class EmployeeHelper : IPlatformHelper
{
    private readonly IPlatformApplicationRequestContext requestContext;
    private readonly IPlatformQueryableRootRepository<Employee, string> repository;

    public EmployeeHelper(
        IPlatformApplicationRequestContextAccessor contextAccessor,
        IPlatformQueryableRootRepository<Employee, string> repository)
    {
        requestContext = contextAccessor.Current;  // Extract .Current
        this.repository = repository;
    }

    public async Task<Employee> GetOrCreateEmployeeAsync(
        string userId,
        string companyId,
        CancellationToken ct)
    {
        return await repository.FirstOrDefaultAsync(
            Employee.UniqueExpr(userId, companyId), ct)
            ?? await CreateEmployeeAsync(userId, companyId, ct);
    }

    private async Task<Employee> CreateEmployeeAsync(
        string userId,
        string companyId,
        CancellationToken ct)
    {
        var employee = new Employee
        {
            Id = Ulid.NewUlid().ToString(),
            UserId = userId,
            CompanyId = companyId,
            CreatedBy = requestContext.UserId()
        };
        return await repository.CreateAsync(employee, ct);
    }
}
```

### Util Pattern (pure functions)

```csharp
public static class EmployeeUtil
{
    public static string GetFullName(Employee e)
        => $"{e.FirstName} {e.LastName}".Trim();

    public static bool IsActive(Employee e)
        => e.Status == EmployeeStatus.Active &&
           (!e.EndDate.HasValue || e.EndDate > Clock.UtcNow);

    public static int CalculateTenure(Employee e)
        => e.StartDate.HasValue
            ? (Clock.UtcNow - e.StartDate.Value).Days / 365
            : 0;
}
```

---

## 14. Anti-Patterns

### Repository Anti-Patterns

```csharp
// DON'T: Create custom repository interfaces unnecessarily
ICustomEmployeeRepository repo;  // WRONG - unnecessary abstraction

// DO: Use platform repository
IPlatformQueryableRootRepository<Employee, string> repo;  // CORRECT
```

### Validation Anti-Patterns

```csharp
// DON'T: Throw exceptions for validation
if (string.IsNullOrEmpty(request.Name))
    throw new ValidationException("Name required");  // WRONG

// DO: Use fluent validation
return request.Validate(r => r.Name.IsNotNullOrEmpty(), "Name required");  // CORRECT
```

### Side Effect Anti-Patterns

```csharp
// DON'T: Call side effects in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity);  // WRONG - side effect in handler!
    return new Result();
}

// DO: Use entity event handler
// Handler just does CRUD
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);  // Event auto-raised
    return new Result();
}

// Side effect in event handler
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    // Handle notification here
}
```

### DTO Mapping Anti-Patterns

```csharp
// DON'T: Map in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var config = new AuthConfig  // WRONG - mapping in handler
    {
        ClientId = req.Dto.ClientId,
        ClientSecret = req.Dto.ClientSecret
    };
}

// DO: Use PlatformDto.MapToObject()
public class AuthConfigDto : PlatformDto<AuthConfig>
{
    public override AuthConfig MapToObject() => new()
    {
        ClientId = ClientId,
        ClientSecret = ClientSecret
    };
}

// Handler uses dto method
var config = req.AuthConfigDto.MapToObject();
```

### CQRS File Structure Anti-Patterns

```csharp
// DON'T: Separate files for Command/Handler/Result
// SaveEmployeeCommand.cs
// SaveEmployeeCommandHandler.cs
// SaveEmployeeCommandResult.cs

// DO: All in ONE file
// SaveEmployeeCommand.cs contains:
// - SaveEmployeeCommand
// - SaveEmployeeCommandResult
// - SaveEmployeeCommandHandler
```

### Cross-Service Anti-Patterns

```csharp
// DON'T: Direct database access to another service
var otherServiceData = await otherDbContext.Entities.ToListAsync();  // WRONG

// DO: Use message bus
await messageBus.PublishAsync(new RequestDataMessage());  // CORRECT
```

### Domain Event Anti-Patterns

```csharp
// DON'T: Manually add domain events
entity.AddDomainEvent(new EntityCreatedEvent());  // WRONG - platform handles this

// DO: Let platform auto-raise events on CRUD operations
await repository.CreateAsync(entity, ct);  // Events raised automatically
```

---

## 15. Quick Reference Templates

### Command Template

```csharp
// File: {Service}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs

public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly IPlatformQueryableRootRepository<{Entity}, string> repository;

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity()
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await repository.CreateOrUpdateAsync(entity, ct);
        return new Save{Entity}CommandResult { Entity = new {Entity}Dto(entity) };
    }
}
```

### Query Template

```csharp
public sealed class Get{Entity}ListQuery : PlatformCqrsPagedQuery<Get{Entity}ListQueryResult, {Entity}Dto>
{
    public string? SearchText { get; set; }
}

internal sealed class Get{Entity}ListQueryHandler :
    PlatformCqrsQueryApplicationHandler<Get{Entity}ListQuery, Get{Entity}ListQueryResult>
{
    protected override async Task<Get{Entity}ListQueryResult> HandleAsync(
        Get{Entity}ListQuery req, CancellationToken ct)
    {
        var qb = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, {Entity}.SearchColumns())));

        var (total, items) = await (
            repository.CountAsync((uow, q) => qb(uow, q), ct),
            repository.GetAllAsync((uow, q) => qb(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct));

        return new Get{Entity}ListQueryResult(items, total, req);
    }
}
```

### Entity Template

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class {Entity} : RootEntity<{Entity}, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public string CompanyId { get; set; } = "";

    [ComputedEntityProperty]
    public bool IsActive { get => Status == Status.Active; set { } }

    public static Expression<Func<{Entity}, bool>> UniqueExpr(string companyId, string code)
        => e => e.CompanyId == companyId && e.Code == code;

    public static Expression<Func<{Entity}, object?>>[] SearchColumns()
        => [e => e.Name, e => e.Code];
}
```

### Event Handler Template

```csharp
// File: UseCaseEvents/{Feature}/Send{Action}On{Event}{Entity}EntityEventHandler.cs

internal sealed class Send{Action}On{Event}{Entity}EntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<{Entity}>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
        => !@event.RequestContext.IsSeedingTestingData()
           && @event.CrudAction == PlatformCqrsEntityEventCrudAction.{Event};

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<{Entity}> @event, CancellationToken ct)
    {
        var entity = @event.EntityData;
        await service.{Action}Async(entity, ct);
    }
}
```

---

## Request Context Quick Reference

```csharp
// Common methods
RequestContext.CurrentCompanyId()
RequestContext.UserId()
RequestContext.ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()
RequestContext.HasRole(PlatformRoles.Admin)
RequestContext.IsSeedingTestingData()
```

---

*This document consolidates all backend C# patterns for EasyPlatform development. For frontend patterns, see `frontend-patterns.md`.*
