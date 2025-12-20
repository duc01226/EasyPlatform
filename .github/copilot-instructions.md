# EasyPlatform - GitHub Copilot Instructions

> **.NET 9 + Angular 19 Enterprise Development Framework**

## Project Overview

EasyPlatform is a comprehensive development framework for building enterprise applications featuring:

-   **Microservices Architecture** with Clean Architecture layers (Domain, Application, Persistence, API)
-   **CQRS Pattern** with event-driven design and automatic entity events
-   **Cross-Service Communication** via RabbitMQ message bus
-   **Multi-Database Support** (MongoDB, SQL Server, PostgreSQL)

## Tech Stack

| Layer          | Technology                      |
| -------------- | ------------------------------- |
| Backend        | .NET 9, C# 13, ASP.NET Core     |
| Frontend       | Angular 19, TypeScript 5.x, Nx  |
| Databases      | MongoDB, SQL Server, PostgreSQL |
| Messaging      | RabbitMQ                        |
| Infrastructure | Docker, Redis                   |

## Project Structure

```
src/Platform/                         # Easy.Platform framework (core libraries)
├── Easy.Platform/                    # Core: CQRS, validation, repositories
├── Easy.Platform.AspNetCore/         # ASP.NET Core integration
├── Easy.Platform.MongoDB/            # MongoDB data access
├── Easy.Platform.RabbitMQ/           # Message bus implementation
└── Easy.Platform.*/                  # Other infrastructure modules

src/PlatformExampleApp/               # Example microservice implementation
├── *.Api/                            # ASP.NET Core Web API
├── *.Application/                    # CQRS handlers, jobs, events
├── *.Domain/                         # Entities, domain events
└── *.Persistence*/                   # Database implementations

src/PlatformExampleAppWeb/            # Angular 19 Nx workspace
├── apps/playground-text-snippet/     # Example frontend app
└── libs/
    ├── platform-core/                # Framework base classes
    └── apps-domains/                 # Business domain code
```

## Automatic Workflow Detection (MUST FOLLOW)

Before responding to any task request, analyze the user's prompt to detect intent and follow the appropriate workflow.

### Intent Detection Rules

| Intent                     | Trigger Keywords                                    | Workflow Sequence                                             |
| -------------------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| **Feature Implementation** | implement, add, create, build, develop, new feature | `/plan` → `/cook` → `/test` → `/code-review` → `/docs-update` |
| **Bug Fix**                | bug, fix, error, broken, issue, crash, not working  | `/debug` → `/plan` → `/fix` → `/test`                         |
| **Documentation**          | docs, document, readme, update docs                 | `/docs-update` → `/watzup`                                    |
| **Refactoring**            | refactor, restructure, clean up, improve code       | `/plan` → `/code` → `/test` → `/code-review`                  |
| **Code Review**            | review, check, audit code, PR review                | `/code-review` → `/watzup`                                    |
| **Investigation**          | how does, where is, explain, understand, find       | `/scout` → `/investigate`                                     |

### Workflow Execution Protocol

1. **DETECT:** Analyze user prompt for intent keywords
2. **ANNOUNCE:** Tell user: `"Detected: [Intent]. Following workflow: [sequence]"`
3. **CONFIRM (for features/refactors):** Ask: `"Proceed with this workflow? (yes/no/quick)"`
4. **EXECUTE:** Follow each step in sequence using the prompts in `.github/prompts/`

### Override

-   **Skip detection:** Prefix message with `quick:` (e.g., `quick: add a button`)
-   **Explicit command:** Start with `/` (e.g., `/fix the login bug`)

### Example

**User:** "Add a dark mode toggle to the settings page"

**Response:**

> Detected: **Feature Implementation** workflow. I will follow: `/plan` → `/cook` → `/test` → `/code-review` → `/docs-update`
>
> Proceed with this workflow? (yes/no/quick)

## Build & Test Commands

```bash
# Backend
dotnet build EasyPlatform.sln
dotnet test
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api

# Frontend
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
nx test platform-core
nx build playground-text-snippet

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

## Database Connections (Development)

| Service    | Connection      | Credentials         |
| ---------- | --------------- | ------------------- |
| SQL Server | localhost,14330 | sa / 123456Abc      |
| MongoDB    | localhost:27017 | root / rootPassXXX  |
| PostgreSQL | localhost:54320 | postgres / postgres |
| Redis      | localhost:6379  | -                   |
| RabbitMQ   | localhost:15672 | guest / guest       |

## Critical Coding Guidelines

1. **Repository Pattern**: Use `IPlatformQueryableRootRepository<TEntity, TKey>` for data access
2. **CQRS Organization**: Command + Handler + Result in ONE file
3. **Validation**: Use `PlatformValidationResult` fluent API with `.And()`, `.AndAsync()`
4. **Side Effects**: Use entity event handlers, NEVER direct calls in command handlers
5. **Entities**: Use static expressions for queries (e.g., `IsActiveExpr()`)
6. **DTOs**: Extend `PlatformEntityDto<TEntity, TKey>` with `MapToEntity()`
7. **Frontend Components**: Extend `AppBaseVmStoreComponent` for complex state
8. **State Management**: Use `PlatformVmStore` with `effectSimple()` and `tapResponse()`
9. **Clean Architecture**: Domain -> Application -> Persistence -> API (dependencies flow inward)
10. **Cross-Service**: Use message bus for communication, never direct DB access

## Reference Documentation

-   `README.md` - Platform overview & quick start
-   `CLEAN-CODE-RULES.md` - Coding standards & anti-patterns
-   `.github/AI-DEBUGGING-PROTOCOL.md` - Debugging protocol
-   `src/PlatformExampleApp/` - Working backend examples
-   `src/PlatformExampleAppWeb/apps/playground-text-snippet/` - Frontend examples

## Path-Specific Instructions

Detailed patterns are automatically loaded based on file context:

-   **Backend (.cs files)**: See `.github/instructions/backend-dotnet.instructions.md`
-   **Frontend (.ts/.html)**: See `.github/instructions/frontend-angular.instructions.md`
-   **Testing**: See `.github/instructions/testing.instructions.md`
-   **Clean Code**: See `.github/instructions/clean-code.instructions.md`
-   **Quick Reference**: See `.github/instructions/quick-reference.instructions.md`
-   **All Resources**: See `.github/COPILOT-INDEX.md`

---

## Effective Prompting Tips

### Good Prompts

```
"Create a SaveEmployeeCommand following EasyPlatform CQRS patterns"
"Add async validation to check if email is unique in the company"
"Create Angular list component with PlatformVmStore for employees"
"Add entity event handler to send notification on employee creation"
```

### Avoid These

```
"Make a save function" (too vague - which entity? what operation?)
"Fix this" (no context - what's broken?)
"Do the thing" (unclear intent)
"Create a service" (which layer? what pattern?)
```

### Context Tips

-   Open related files before asking (entity, DTO, existing similar command)
-   Reference specific patterns by name (e.g., "PlatformVmStore", "CQRS command")
-   Include business requirements in prompt
-   Mention the layer you're working in (Domain, Application, API, Frontend)

---

## Keyboard Shortcuts (VS Code)

| Action              | Windows      | Mac         |
| ------------------- | ------------ | ----------- |
| Inline suggestion   | (auto)       | (auto)      |
| Accept suggestion   | `Tab`        | `Tab`       |
| Reject suggestion   | `Esc`        | `Esc`       |
| Next suggestion     | `Alt+]`      | `Option+]`  |
| Previous suggestion | `Alt+[`      | `Option+[`  |
| Inline chat         | `Ctrl+I`     | `Cmd+I`     |
| Chat panel          | `Ctrl+Alt+I` | `Cmd+Alt+I` |
| Accept word         | `Ctrl+Right` | `Cmd+Right` |
| Trigger suggestion  | `Alt+\`      | `Option+\`  |

---

## Slash Commands Reference

| Command     | Use For                          | Example                            |
| ----------- | -------------------------------- | ---------------------------------- |
| `/explain`  | Understand existing code         | Select code, type `/explain`       |
| `/fix`      | Propose bug fixes                | Select buggy code, type `/fix`     |
| `/tests`    | Generate unit tests              | Select function, type `/tests`     |
| `/doc`      | Add documentation/comments       | Select code, type `/doc`           |
| `/optimize` | Improve performance              | Select slow code, type `/optimize` |
| `/simplify` | Reduce complexity                | Select complex code, `/simplify`   |
| `/new`      | Create new file from description | Type `/new Angular component`      |

---

## Model Recommendations

| Task Type             | Recommended Model | Notes                    |
| --------------------- | ----------------- | ------------------------ |
| Quick code completion | GPT-4o            | Fast, good for inline    |
| Complex architecture  | Claude Sonnet     | Better reasoning         |
| Debugging/analysis    | Claude Sonnet     | Good at tracing issues   |
| Refactoring           | GPT-4o            | Fast iterations          |
| Test generation       | GPT-4o            | Good pattern recognition |
| Documentation         | Claude Sonnet     | Better prose             |
| Multi-file changes    | Claude Sonnet     | Better context handling  |
| Quick questions       | GPT-4o-mini       | Fast, cost-effective     |

---

## Context Management

### Before Starting a Task

1. Open 2-3 most relevant files (entity, DTO, similar existing implementation)
2. Close unrelated files/tabs to reduce noise
3. Clear old conversation if switching to unrelated topic

### During Work

-   Reference files explicitly with `#filename`
-   Use `@workspace` for codebase-wide questions
-   Delete unhelpful exchanges from chat history
-   Break large tasks into focused sub-tasks

### For Complex Tasks

-   Start fresh conversation for new major topics
-   Summarize progress at checkpoints
-   Keep the most critical context files open
-   Use the Task tool for multi-step operations

---

## File Naming Conventions

### Backend

| Type           | Pattern                                                     | Example                                                     |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| Command        | `Save{Entity}Command.cs`                                    | `SaveEmployeeCommand.cs`                                    |
| Query          | `Get{Entity}ListQuery.cs`                                   | `GetEmployeeListQuery.cs`                                   |
| Entity Event   | `{Action}On{Event}{Entity}EntityEventHandler.cs`            | `SendNotificationOnCreateEmployeeEntityEventHandler.cs`     |
| Consumer       | `UpsertOrDelete{Entity}On{Source}EntityEventBusConsumer.cs` | `UpsertOrDeleteEmployeeOnEmployeeEntityEventBusConsumer.cs` |
| Background Job | `{JobName}BackgroundJob.cs`                                 | `SyncEmployeesBackgroundJob.cs`                             |
| Entity         | `{EntityName}.cs`                                           | `Employee.cs`                                               |
| Entity DTO     | `{Entity}Dto.cs` or `{Entity}EntityDto.cs`                  | `EmployeeDto.cs`                                            |
| Repository Ext | `{Entity}RepositoryExtensions.cs`                           | `EmployeeRepositoryExtensions.cs`                           |

### Frontend

| Type        | Pattern                       | Example                      |
| ----------- | ----------------------------- | ---------------------------- |
| Component   | `{feature}.component.ts`      | `employee-list.component.ts` |
| Store       | `{feature}.store.ts`          | `employee-list.store.ts`     |
| Form        | `{feature}-form.component.ts` | `employee-form.component.ts` |
| API Service | `{entity}-api.service.ts`     | `employee-api.service.ts`    |
| Model/DTO   | `{entity}.model.ts`           | `employee.model.ts`          |
| Validator   | `{entity}.validators.ts`      | `employee.validators.ts`     |

---

## Top 10 Common Mistakes

| #   | Mistake                                   | Correct Approach                                |
| --- | ----------------------------------------- | ----------------------------------------------- |
| 1   | Side effects in command handlers          | Use entity event handlers for notifications     |
| 2   | Command/Handler/Result in separate files  | Keep ALL THREE in ONE file                      |
| 3   | Using `HttpClient` directly in Angular    | Use `PlatformApiService` base class             |
| 4   | Forgetting `untilDestroyed()` on streams  | Always pipe with `this.untilDestroyed()`        |
| 5   | Manual state with signals                 | Use `PlatformVmStore` for complex state         |
| 6   | Generic repository interface              | Use `IPlatformQueryableRootRepository<T,K>`     |
| 7   | Mapping DTOs in command handlers          | Use DTO's `MapToEntity()` method                |
| 8   | Skipping async validation                 | Override `ValidateRequestAsync` in handler      |
| 9   | Direct cross-service database access      | Use message bus for cross-service communication |
| 10  | Missing `app-loading-and-error-indicator` | Wrap async content with loading indicator       |

---

## Quick Decision Guide

```
Need side effect after save?     → Entity Event Handler (NOT in command handler)
Cross-service data sync?         → Message Bus Consumer
Scheduled recurring task?        → Background Job with [PlatformRecurringJob("cron")]
Complex frontend state?          → PlatformVmStore + AppBaseVmStoreComponent
Form with validation?            → AppBaseFormComponent + initialFormConfig
API communication?               → Extend PlatformApiService
Reusable entity DTO?             → Extend PlatformEntityDto<TEntity, TKey>
Data filtering in query?         → Use static expressions in entity class
```

---

# Code Patterns Reference

## Backend Patterns

### 1. Clean Architecture

```csharp
// Domain Layer
public class Employee : RootEntity<Employee, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string Name { get; set; } = "";
    public static Expression<Func<Employee, bool>> IsActiveExpr() => e => e.Status == Status.Active;
}

public class AuditedEmployee : RootAuditedEntity<AuditedEmployee, string, string> { }

// Application Layer - CQRS Handler
public class SaveEmployeeCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEmployeeCommand, SaveEmployeeCommandResult>
{
    protected override async Task<SaveEmployeeCommandResult> HandleAsync(SaveEmployeeCommand req, CancellationToken ct)
    {
        var employee = await repository.GetByIdAsync(req.Id, ct);
        employee.Name = req.Name;
        var saved = await repository.CreateOrUpdateAsync(employee, ct);
        return new SaveEmployeeCommandResult { Id = saved.Id };
    }
}

// Service Layer - Controller
[ApiController, Route("api/[controller]")]
public class EmployeeController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveEmployeeCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}
```

### 2. Repository Pattern

```csharp
IPlatformQueryableRootRepository<TEntity, TKey>  // Primary
IPlatformRootRepository<TEntity, TKey>           // When queryable not needed

// Extension pattern
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Entity.CodeExpr(code), ct).EnsureFound();

    public static async Task<List<Entity>> GetByIdsValidatedAsync(this IPlatformQueryableRootRepository<Entity, string> repo, List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

    public static async Task<string> GetIdByCodeAsync(this IPlatformQueryableRootRepository<Entity, string> repo, string code, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(q => q.Where(Entity.CodeExpr(code)).Select(p => p.Id), ct).EnsureFound();
}
```

### 3. Repository API

```csharp
await repository.CreateAsync(entity, ct);
await repository.CreateManyAsync(entities, ct);
await repository.UpdateAsync(entity, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.CreateOrUpdateManyAsync(entities, ct);
await repository.DeleteAsync(entityId, ct);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Company);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);
```

### 4. Validation Patterns

```csharp
// Sync validation
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");

// Async validation
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v
        .AndAsync(r => repo.GetByIdsAsync(r.Ids, ct).ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"))
        .AndNotAsync(r => repo.AnyAsync(p => r.Ids.Contains(p.Id) && p.IsExternal, ct), "Externals not allowed");

// Chained with Of<>
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid range")
        .Of<IPlatformCqrsRequest>();

// Ensure pattern
var entity = await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

### 5. Cross-Service Communication

```csharp
public class EmployeeEventProducer : PlatformCqrsEntityEventBusMessageProducer<EmployeeEventBusMessage, Employee, string> { }

public class EmployeeEventConsumer : PlatformApplicationMessageBusConsumer<EmployeeEventBusMessage>
{
    protected override async Task HandleLogicAsync(EmployeeEventBusMessage msg) { /* sync logic */ }
}
```

### 6. Full-Text Search

```csharp
var queryBuilder = repository.GetQueryBuilder(q => q
    .Where(t => t.IsActive)
    .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns(), fullTextAccurateMatch: true)));

var (total, items) = await (
    repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
    repository.GetAllAsync((uow, q) => queryBuilder(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct)
);

// Entity search columns
public static Expression<Func<Entity, object>>[] SearchColumns() => [e => e.Name, e => e.Code];
```

### 7. CQRS Command Pattern (Command + Result + Handler in ONE file)

```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { public EntityDto Entity { get; set; } = null!; }

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEntityCommand> v, CancellationToken ct)
        => await v.AndAsync(r => repo.GetByIdsAsync(r.RelatedIds, ct).ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repo.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));
        await entity.ValidateAsync(repo, ct).EnsureValidAsync();
        var saved = await repo.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

### 8. Query Pattern

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler : PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(GetEntityListQuery req, CancellationToken ct)
    {
        var qb = repo.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repo.CountAsync((uow, q) => qb(uow, q), ct),
            repo.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.Skip, req.Take), ct, e => e.Related)
        );
        return new GetEntityListQueryResult(items, total, req);
    }
}
```

### 9. Event-Driven Side Effects

```csharp
// ❌ WRONG - direct side effect
await repo.CreateAsync(entity, ct);
await notificationService.SendAsync(entity);

// ✅ CORRECT - just save, platform auto-raises event
await repo.CreateAsync(entity, ct);

// Event handler (UseCaseEvents/[Feature]/)
internal sealed class SendNotificationOnCreateHandler : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => !e.RequestContext.IsSeedingTestingData() && e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

### 10. Entity Pattern

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class Entity : RootEntity<Entity, string>
{
    [TrackFieldUpdatedDomainEvent] public string Name { get; set; } = "";
    [JsonIgnore] public Company? Company { get; set; }

    public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code) => e => e.CompanyId == companyId && e.Code == code;
    public static Expression<Func<Entity, bool>> FilterExpr(List<Status> s) => e => s.ToHashSet().Contains(e.Status!.Value);
    public static Expression<Func<Entity, bool>> CompositeExpr(string companyId) => OfCompanyExpr(companyId).AndAlsoIf(true, () => e => e.IsActive);
    public static Expression<Func<Entity, object?>>[] SearchColumns() => [e => e.Name, e => e.Code];

    // Async expression with external dependency
    public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
    {
        var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
        return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
    }

    [ComputedEntityProperty] public bool IsRoot { get => Id == RootId; set { } }
    [ComputedEntityProperty] public string FullName { get => $"{First} {Last}".Trim(); set { } }

    public static List<string> ValidateEntity(Entity? e) => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
}
```

### 11. Entity DTO Pattern

```csharp
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    public EmployeeDto() { }
    public EmployeeDto(Employee e, User? u) : base(e) { Id = e.Id; Name = e.Name ?? u?.Name ?? ""; }

    public string? Id { get; set; }
    public string Name { get; set; } = "";
    public OrgDto? Company { get; set; }

    public EmployeeDto WithCompany(Org c) { Company = new OrgDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Employee MapToEntity(Employee e, MapToEntityModes m) { e.Name = Name; return e; }
}

// Usage
var dtos = employees.SelectList(e => new EmployeeDto(e, e.User).WithCompany(e.Company!));
```

### 12. Fluent Helpers

```csharp
.With(e => e.Name = x).WithIf(cond, e => e.Status = Active)
.Then(e => e.Process()).ThenAsync(async e => await e.ValidateAsync(ct))
.EnsureFound("Not found").EnsureFoundAllBy(x => x.Id, ids).EnsureValidAsync()
.AndAlso(expr).AndAlsoIf(cond, () => expr).OrElse(expr)
.ThenSelect(e => e.Id).ParallelAsync(async i => await Process(i), maxConcurrent: 10)

var (entity, files) = await (repo.CreateOrUpdateAsync(e, ct), files.ParallelAsync(f => Upload(f, ct)));
```

### 13. Background Jobs

```csharp
[PlatformRecurringJob("0 3 * * *")]
public sealed class PagedJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? p, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repo.GetAllAsync(q => Query(q).PageBy(skip, take)).Then(items => items.ParallelAsync(Process));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> p) => await repo.CountAsync(Query);
}

[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? p, string? k) => q.WhereIf(k != null, e => e.CompanyId == k);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? p, string? k) => EntitiesQueryBuilder(q, p, k).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> e, string k, object? p, IServiceProvider sp) => await e.ParallelAsync(Process);
}

// Scrolling pattern (data affected by processing, always queries from start)
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);

// Job coordination (master schedules child jobs)
await companies.ParallelAsync(async cId => await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
    BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

### 14. Message Bus Consumer

```csharp
internal sealed class EntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage m, string r) => true;
    public override async Task HandleLogicAsync(EntityEventBusMessage m, string r)
    {
        if (m.Payload.CrudAction == Created || (m.Payload.CrudAction == Updated && !m.Payload.EntityData.IsDeleted))
        {
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == m.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == m.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p));
            if (companyMissing || userMissing) return;

            var existing = await repo.FirstOrDefaultAsync(e => e.Id == m.Payload.EntityData.Id);
            if (existing == null) await repo.CreateAsync(m.Payload.EntityData.ToEntity().With(e => e.LastSyncDate = m.CreatedUtcDate));
            else if (existing.LastSyncDate <= m.CreatedUtcDate) await repo.UpdateAsync(m.Payload.EntityData.UpdateEntity(existing).With(e => e.LastSyncDate = m.CreatedUtcDate));
        }
        if (m.Payload.CrudAction == Deleted) await repo.DeleteAsync(m.Payload.EntityData.Id);
    }
}
```

### 15. Data Migration

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext db)
    {
        var qb = repo.GetQueryBuilder(q => q.Where(Filter()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => qb(q)), 200, ExecutePage, qb);
    }

    static async Task<List<Entity>> ExecutePage(int skip, int take, Func<IQueryable<Entity>, IQueryable<Entity>> qb, IRepo<Entity> r, IPlatformUnitOfWorkManager u)
    {
        using var uow = u.Begin();
        var items = await r.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await r.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await uow.CompleteAsync();
        return items;
    }
}
```

---

## Frontend Patterns

### 1. Component Hierarchy

```typescript
PlatformComponent → PlatformVmComponent → PlatformFormComponent
                  → PlatformVmStoreComponent

AppBaseComponent → AppBaseVmComponent → AppBaseFormComponent
                 → AppBaseVmStoreComponent

FeatureComponent extends AppBaseVmStoreComponent<State, Store>
```

### 2. Platform Component API

```typescript
// PlatformComponent
status$: WritableSignal<'Pending'|'Loading'|'Success'|'Error'>;
observerLoadingErrorState<T>(key?: string): OperatorFunction<T, T>;
isLoading$(key?: string): Signal<boolean | null>;
untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
tapResponse<T>(next?, error?, complete?): OperatorFunction<T, T>;

// PlatformVmComponent
vm: WritableSignal<T | undefined>;
currentVm(): T;
updateVm(partial): T;
abstract initOrReloadVm: (isReload: boolean) => Observable<T | undefined>;

// PlatformVmStoreComponent
constructor(public store: TStore) {}
vm: Signal<T | undefined>;
reload(): void;

// PlatformFormComponent
form: FormGroup<PlatformFormGroupControls<T>>;
mode: 'create'|'update'|'view';
validateForm(): boolean;
abstract initialFormConfig: () => PlatformFormConfig<T>;
```

### 3. Component Usage

```typescript
// PlatformComponent
export class ListComponent extends PlatformComponent {
    load() {
        this.api
            .get()
            .pipe(
                this.observerLoadingErrorState('load'),
                this.tapResponse(d => (this.data = d)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}

// PlatformVmStore
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    loadData = this.effectSimple(() => this.api.get().pipe(this.tapResponse(d => this.updateState({ data: d }))));
    readonly data$ = this.select(s => s.data);
}

// PlatformVmStoreComponent
export class ListComponent extends PlatformVmStoreComponent<MyVm, MyStore> {
    constructor(store: MyStore) {
        super(store);
    }
    refresh() {
        this.reload();
    }
}

// PlatformFormComponent
export class FormComponent extends AppBaseFormComponent<FormVm> {
    protected initialFormConfig = () => ({
        controls: { email: new FormControl(this.currentVm().email, [Validators.required], [ifAsyncValidator(() => !this.isViewMode, uniqueValidator)]) },
        dependentValidations: { email: ['name'] }
    });
    submit() {
        if (this.validateForm()) {
            /* save */
        }
    }
}
```

### 4. API Service

```typescript
@Injectable({ providedIn: 'root' })
export class EntityApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/Entity';
    }
    getAll(q?: Query): Observable<Entity[]> {
        return this.get('', q);
    }
    save(cmd: SaveCmd): Observable<Result> {
        return this.post('', cmd);
    }
    search(c: Search): Observable<Entity[]> {
        return this.post('/search', c, { enableCache: true });
    }
}
```

### 5. FormArray

```typescript
protected initialFormConfig = () => ({
  controls: {
    items: { modelItems: () => vm.items, itemControl: (i, idx) => new FormGroup({ name: new FormControl(i.name, [Validators.required]) }) }
  }
});
```

### 6. Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
app-entity-list {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.entity-list {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        /* BEM child elements */
    }
    &__content {
        flex: 1;
        overflow-y: auto;
    }
}
```

**Why both?** Host element makes Angular element a real layout element; main class contains full styling matching the wrapper div.

### BEM Naming Convention (MANDATORY)

**CRITICAL:** Every UI element in a component template MUST have a BEM class (`block__element`), even if it doesn't need special styling. This follows OOP principles for readability.

**BEM Structure:** `block` → `block__element` → `block__element --modifier1 --modifier2`

**Modifier Convention - Use space-separated `--modifier` classes:**

```html
<!-- ✅ CORRECT: Space-separated modifiers -->
<button class="user-card__btn --primary --large">Save</button>

<!-- ❌ WRONG: Suffix-style modifiers -->
<button class="user-card__btn--primary user-card__btn--large">Save</button>
```

```scss
.user-card {
    &__btn {
        &.--primary {
            background: $primary-color;
        }
        &.--large {
            padding: 1rem 2rem;
        }
    }
}
```

### 7. Advanced Frontend

```typescript
// @Watch decorator
@Watch('onChanged') public data?: Data;
@WatchWhenValuesDiff('search') public term = '';
private onChanged(v: Data, c: SimpleChange<Data>) { if (!c.isFirstTimeSet) this.update(); }

// RxJS operators
this.search$.pipe(skipDuplicates(500), applyIf(this.enabled$, debounceTime(300)), tapOnce({ next: v => this.init(v) }), distinctUntilObjectValuesChanged(), this.untilDestroyed()).subscribe();

// Form validators
new FormControl('', [Validators.required, noWhitespaceValidator, startEndValidator('err', c => c.parent?.get('start')?.value, c => c.value)], [ifAsyncValidator(c => c.valid, uniqueValidator)]);

// Utilities
import { date_format, date_addDays, date_timeDiff, list_groupBy, list_distinctBy, list_sortBy, string_isEmpty, string_truncate, dictionary_map, dictionary_filter, immutableUpdate, deepClone, removeNullProps, guid_generate, task_delay, task_debounce } from '@libs/platform-core';

// Module import
import { PlatformCoreModule } from '@libs/platform-core';
@NgModule({ imports: [PlatformCoreModule] })

// Platform Directives
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />

// PlatformComponent APIs
trackByItem = this.ngForTrackByItemProp<User>('id');
trackByList = this.ngForTrackByImmutableList(this.users);
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
isLoading$('req1'); isLoading$('req2');
getAllErrorMsgs$(['req1', 'req2']);
loadingRequestsCount(); reloadingRequestsCount();
protected get devModeCheckLoadingStateElement() { return '.spinner'; }
protected get devModeCheckErrorStateElement() { return '.error'; }

// Store with caching
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
  protected get enableCaching() { return true; }
  protected cachedStateKeyName = () => 'MyStore';
  protected vmConstructor = (d?: Partial<MyVm>) => new MyVm(d);
  protected beforeInitVm = () => this.loadInitialData();
  loadData = this.effectSimple(() => this.api.get().pipe(this.observerLoadingErrorState('load'), this.tapResponse(d => this.updateState({ data: d }))));
}
```

---

## Authorization

```csharp
// Controller
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost] public async Task<IActionResult> Save([FromBody] Cmd c) => Ok(await Cqrs.SendAsync(c));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
    => await v.AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
              .AndAsync(_ => repo.AnyAsync(e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company");

// Entity filter
public static Expression<Func<E, bool>> AccessExpr(string userId, string companyId) => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

```typescript
// Component
get canEdit() { return this.hasRole(PlatformRoles.Admin) && this.isOwnCompany(); }

// Template
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }

// Route guard
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

---

## Migration

```csharp
// EF Core
public partial class AddField : Migration { protected override void Up(MigrationBuilder m) { m.AddColumn<string>("Dept", "Employees"); } }

// MongoDB
public class MigrateData : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20240115_Migrate";
    public override async Task Execute() => await RootServiceProvider.ExecuteInjectScopedPagingAsync(await repo.CountAsync(q => q.Where(...)), 200,
        async (skip, take, r, u) => { var items = await r.GetAllAsync(q => q.Skip(skip).Take(take)); await r.UpdateManyAsync(items, dismissSendEvent: true); return items; });
}

// Cross-DB migration (first-time setup, use events for ongoing sync)
public class SyncData : PlatformDataMigrationExecutor<TargetDbContext>
{
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2024, 1, 15);
    public override async Task Execute(TargetDbContext db) => await targetRepo.CreateManyAsync(
        (await sourceDbContext.Entities.Where(e => e.CreatedDate < cutoffDate).ToListAsync()).Select(e => e.MapToTargetEntity()));
}
```

---

## Helper vs Util

```csharp
// Helper (with dependencies)
public class EntityHelper { private readonly IRepo<E> repo; public async Task<E> GetOrCreateAsync(string code, CancellationToken ct) => await repo.FirstOrDefaultAsync(t => t.Code == code, ct) ?? await CreateAsync(code, ct); }

// Util (pure functions)
public static class EntityUtil { public static string FullName(E e) => $"{e.First} {e.Last}".Trim(); public static bool IsActive(E e) => e.Status == Active; }
```

---

## Advanced Backend

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty() / .RemoveWhere(pred, out removed) / .UpsertBy(key, items, update) / .SelectList(sel) / .ThenSelect(sel) / .ParallelAsync(fn, max) / .AddDistinct(item, key)

var entity = dto.NotHasSubmitId() ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId()) : await repo.GetByIdAsync(dto.Id, ct).Then(x => dto.UpdateToEntity(x));

RequestContext.CurrentCompanyId() / .UserId() / .ProductScope() / .HasRequestAdminRoleInCompany()

var (a, b, c) = await (repo1.GetAllAsync(...), repo2.GetAllAsync(...), repo3.GetAllAsync(...));

public sealed class Helper : IPlatformHelper { private readonly IPlatformApplicationRequestContext ctx; public Helper(IPlatformApplicationRequestContextAccessor a) { ctx = a.Current; } }

.With(e => e.Name = x).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(async () => await svc.Any(), async e => await e.Sync())

public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m) => BaseExpr(s, c).AndAlso(e => e.User!.IsActive).AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));

// Domain Service Pattern (strategy for permissions)
public static class PermissionService {
    static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<E, bool>> GetCanManageExpr(IList<string> roles) => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Object Deep Comparison
if (prop.GetValue(entity).IsValuesDifferent(prop.GetValue(existing))) entity.AddFieldUpdatedEvent(prop, oldVal, newVal);

// Task Extensions
task.WaitResult();  // NOT task.Wait() - preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

---

## Anti-Patterns

```csharp
// ❌ Direct cross-service DB access → ✅ Use message bus
// ❌ Custom repository interface → ✅ Use platform repo + extensions
// ❌ Manual validation throw → ✅ Use PlatformValidationResult fluent API
// ❌ Side effects in handler → ✅ Use entity event handlers
// ❌ DTO mapping in handler → ✅ DTO owns mapping via MapToObject()/MapToEntity()

// ✅ Correct DTO mapping
public sealed class ConfigDto : PlatformDto<ConfigValue> { public override ConfigValue MapToObject() => new() { ClientId = ClientId }; }
var config = req.Config.MapToObject().With(p => p.Secret = encrypt(p.Secret));
```

```typescript
// ❌ Direct HttpClient → ✅ Extend PlatformApiService
// ❌ Manual signals → ✅ Use PlatformVmStore
// ❌ Missing untilDestroyed() → ✅ Always use .pipe(this.untilDestroyed())
```

---

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  →  Service  →  Component (Highest)
```

| Layer            | Responsibility                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, dropdown options, validation rules |
| **Service**      | API calls, command factories, data transformation                                                           |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                                                |

**Anti-Pattern**: Logic in component that should be in model → leads to duplicated code across components.

```typescript
// ❌ WRONG: Logic in component
readonly providerTypes = [{ value: 1, label: 'ITViec' }, ...]; // Duplicated if another component needs it

// ✅ CORRECT: Logic in entity/model
readonly providerTypes = JobBoardProviderConfiguration.getApiProviderTypeOptions(); // Single source of truth
```

---

## Templates

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult> { public string Name { get; set; } = ""; public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required"); }
internal sealed class Save{E}CommandHandler : PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult> { protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command r, CancellationToken ct) { /* impl */ } }
```

```typescript
@Component({ selector: 'app-{e}-list', template: `<app-loading [target]="this">@if (vm(); as vm) { @for (i of vm.items; track i.id) { <div>{{i.name}}</div> } }</app-loading>`, providers: [{E}Store] })
export class {E}Component extends AppBaseVmStoreComponent<{E}State, {E}Store> { ngOnInit() { this.store.load(); } }
```

---

## Commands

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
cd src/PlatformExampleAppWeb && npm install && nx serve playground-text-snippet
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```
