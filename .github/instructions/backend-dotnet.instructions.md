---
applyTo: "src/Services/**/*.cs,src/Platform/**/*.cs,src/PlatformExampleApp/**/*.cs"
---

# Backend .NET Development Patterns

> **Authoritative source:** `CLAUDE.md` and `docs/claude/backend-csharp-complete-guide.md`
> This file auto-loads when editing C# backend files.

## Critical Rules

1. **Repository:** Use service-specific repositories (`IGrowthRootRepository<T>`, `ICandidatePlatformRootRepository<T>`, `ISurveysPlatformRootRepository<T>`) - NEVER generic `IPlatformRootRepository`
2. **Validation:** Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) - NEVER `throw ValidationException`
3. **Side Effects:** Handle in Entity Event Handlers (`UseCaseEvents/`) - NEVER in command handlers
4. **DTO Mapping:** DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()` - NEVER map in handlers
5. **Command Structure:** Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. **Cross-Service:** Use RabbitMQ message bus - NEVER direct database access

## Architecture Layers

| Layer | Contains | Location |
|-------|----------|----------|
| **Domain** | Entity, Repository, ValueObject, DomainService | `{Service}.Domain/` |
| **Application** | DTOs, CQRS Commands/Queries, BackgroundJobs, MessageBus | `{Service}.Application/` |
| **Infrastructure** | External services, data access | `{Service}.Infrastructure/` |
| **Presentation** | Controllers, API endpoints | `{Service}.Service/` |

## Entity & Domain Patterns

```csharp
// Entity types
public class Employee : RootEntity<Employee, string> { }
public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }

// Field tracking
[TrackFieldUpdatedDomainEvent]
public string Name { get; set; } = "";

// Computed property (MUST have empty set)
[ComputedEntityProperty]
public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }

// Navigation Properties (for non-EF Core repos like MongoDB)
// Pattern 1: Forward navigation (FK on THIS entity)
public string DepartmentId { get; set; } = "";
[PlatformNavigationProperty(nameof(DepartmentId))]
public Department? Department { get; set; }

// Pattern 2: Collection via FK List
public List<string> ProjectIds { get; set; } = [];
[PlatformNavigationProperty(nameof(ProjectIds), Cardinality = Collection)]
public List<Project>? Projects { get; set; }

// Pattern 3: Reverse navigation
[PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(Employee.ManagerId))]
public List<Employee>? DirectReports { get; set; }

// Static expressions
public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;

public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
    => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);
```

## Repository Operations

```csharp
// Service-specific repositories (ALWAYS prefer these)
IPlatformQueryableRootRepository<TextSnippetEntity, string>  // TextSnippet service

// CRUD
await repository.CreateAsync(entity, ct);
await repository.UpdateAsync(entity, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.DeleteAsync(id, ct);

// Query operations
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Employee, p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.CountAsync(expr, ct);

// Navigation loading
var employee = await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Department!);
var snippet = await repo.GetByIdAsync(id, ct, loadRelatedEntities: e => e.Category!.ParentCategory!);

// Extension pattern
public static async Task<Employee> GetByEmailAsync(
    this IGrowthRootRepository<Employee> repo, string email, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(Employee.ByEmailExpr(email), ct).EnsureFound();
```

## CQRS Command (All-in-One File)

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(entity) };
    }
}
```

## Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => FromDate <= ToDate, "Invalid range");

// Async validation
protected override async Task<PlatformValidationResult<TCommand>> ValidateRequestAsync(
    PlatformValidationResult<TCommand> validation, CancellationToken ct)
    => await validation
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(e => e.IsExternal && r.Ids.Contains(e.Id), ct), "External not allowed");
```

## DTO Mapping

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { FullName = e.FullName ?? u?.FullName ?? ""; }

    protected override Employee MapToEntity(Employee e, MapToEntityModes mode) { e.FullName = FullName; return e; }
}

// Value object DTO
public sealed class ConfigDto : PlatformDto<ConfigValue>
{
    public string ClientId { get; set; } = "";
    public override ConfigValue MapToObject() => new() { ClientId = ClientId };
}
```

## Fluent Helpers

```csharp
// Mutation & transformation
await repo.GetByIdAsync(id).With(e => e.Name = newName).WithIf(cond, e => e.Status = Active);
await repo.GetByIdAsync(id).Then(e => e.Process()).ThenAsync(e => e.ValidateAsync(svc, ct));
await repo.GetByIdAsync(id).EnsureFound($"Not found: {id}");

// Expression composition
Entity.OfCompanyExpr(companyId).AndAlso(StatusExpr(statuses)).AndAlsoIf(deptIds.Any(), () => DeptExpr(deptIds));

// Parallel operations
var (entity, files) = await (repo.CreateOrUpdateAsync(entity, ct), files.ParallelAsync(f => fileService.UploadAsync(f, ct)));
await items.ParallelAsync(item => ProcessAsync(item, ct), maxConcurrent: 10);
```

## Authorization & Controller

```csharp
[ApiController]
[Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}
```

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `throw ValidationException` | `PlatformValidationResult` fluent API |
| Side effects in command handler | Entity Event Handler in `UseCaseEvents/` |
| Generic `IPlatformRootRepository<T>` | Service-specific repository |
| Direct cross-service DB access | Message bus |
| DTO mapping in handler | `PlatformDto.MapToObject()` |
| Sequential awaits (independent ops) | `Util.TaskRunner.WhenAll()` |

## Request Context

```csharp
RequestContext.CurrentCompanyId() / .UserId() / .ProductScope()
await RequestContext.CurrentEmployee()
RequestContext.HasRequestAdminRoleInCompany()
```

## Quick Decision Tree

- New API endpoint → `PlatformBaseController` + CQRS Command
- Business logic → Command Handler in Application layer
- Data access → Microservice-specific repository + extensions
- Cross-service sync → Entity Event Consumer (message bus)
- Scheduled task → `PlatformApplicationBackgroundJob`
- Migration → `PlatformDataMigrationExecutor` or EF Core
