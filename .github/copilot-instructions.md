# EasyPlatform Development Guidelines

> **Development Platform Framework** - .NET 9 + Angular 19

## Project Overview

EasyPlatform is a comprehensive development platform framework providing infrastructure for building microservices with Clean Architecture, CQRS, and event-driven design. It includes a complete example application (TextSnippet) demonstrating all patterns.

**Structure:**

-   **Easy.Platform:** Core framework components (CQRS, validation, repositories, messaging)
-   **PlatformExampleApp:** Example microservice demonstrating all patterns (TextSnippet)
-   **PlatformExampleAppWeb:** Angular 19 frontend example application

## Tech Stack

| Layer         | Technology                                                      |
| ------------- | --------------------------------------------------------------- |
| **Backend**   | .NET 9, Clean Architecture, CQRS, MongoDB/SQL Server/PostgreSQL |
| **Frontend**  | Angular 19, Nx workspace, component-based architecture          |
| **Framework** | Easy.Platform (custom infrastructure)                           |
| **Messaging** | RabbitMQ message bus for cross-service communication            |

## Core Principles (MANDATORY)

**Backend Rules:**

1. Use platform repositories (`IPlatformQueryableRootRepository<TEntity, TKey>`) with extension methods
2. Use `PlatformValidationResult` fluent API (`.And()`, `.AndAsync()`) - never `throw ValidationException`
3. Side effects (notifications, emails, external APIs) go in Entity Event Handlers (`UseCaseEvents/`) - never in command handlers
4. DTOs own mapping via `PlatformEntityDto<TEntity, TKey>.MapToEntity()` or `PlatformDto<T>.MapToObject()` - never map in handlers
5. Command + Result + Handler in ONE file under `UseCaseCommands/{Feature}/`
6. Cross-service communication via RabbitMQ message bus only - never direct database access

**Frontend Rules:** 7. Extend `AppBaseComponent`, `AppBaseVmStoreComponent`, or `AppBaseFormComponent` - never raw `Component` 8. Use `PlatformVmStore` for state management - never manual signals 9. Extend `PlatformApiService` for HTTP calls - never direct `HttpClient` 10. Always use `.pipe(this.untilDestroyed())` for subscriptions - never manual unsubscribe 11. All template elements MUST have BEM classes (`block__element --modifier`)

**Architecture Rules:** 12. Search for existing implementations before creating new code 13. Place logic in LOWEST layer (Entity > Service > Component) to enable reuse 14. Plan before implementing non-trivial tasks 15. Follow Clean Architecture layers: Domain -> Application -> Infrastructure -> Presentation

## Automatic Workflow Detection (CRITICAL - MUST FOLLOW)

> **This is NOT optional.** Before responding to ANY development task, you MUST detect intent and follow the appropriate workflow. This ensures consistent, high-quality development across the team.

### Workflow Configuration

Full workflow patterns are defined in **`.claude/workflows.json`** - the single source of truth for both Claude and Copilot. Supports multilingual triggers (EN, VI, ZH, JA, KO).

For detailed routing logic, see the **`workflow-router`** agent in `.github/agents/workflow-router.md`.

### Quick Reference - Workflow Detection

| Intent            | Trigger Keywords                                     | Workflow Sequence                                                                                    |
| ----------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Feature**       | implement, add, create, build, develop, new feature  | `/plan` -> `/cook` -> `/post-task-review` -> `/code-review` -> `/dual-pass-review` -> `/test` -> `/docs-update` -> `/watzup` |
| **Bug Fix**       | bug, fix, error, broken, crash, not working, debug   | `/debug` -> `/plan` -> `/fix` -> `/post-task-review` -> `/test`                                                |
| **Documentation** | docs, document, readme, update docs                  | `/docs-update` -> `/watzup`                                                                                    |
| **Refactoring**   | refactor, improve, clean up, restructure             | `/plan` -> `/code` -> `/post-task-review` -> `/dual-pass-review` -> `/test` -> `/code-review`                   |
| **Code Review**   | review, check, audit code, PR review                 | `/code-review` -> `/dual-pass-review` -> `/watzup`                                                             |
| **Investigation** | how does, where is, explain, understand, find        | `/scout` -> `/investigate`                                                                                     |

### Prompt File Mapping

Each workflow step executes a prompt file from `.github/prompts/`:

| Step                | File                          | Purpose                       |
| ------------------- | ----------------------------- | ----------------------------- |
| `/plan`             | `plan.prompt.md`              | Create implementation plan    |
| `/cook`             | `cook.prompt.md`              | Implement feature             |
| `/code`             | `code.prompt.md`              | Execute existing plan         |
| `/test`             | `test.prompt.md`              | Run tests                     |
| `/fix`              | `fix.prompt.md`               | Apply fixes                   |
| `/debug`            | `debug.prompt.md`             | Investigate issues            |
| `/code-review`      | `code-review.prompt.md`       | Review code quality           |
| `/post-task-review` | `post-task-review.prompt.md`  | Post-implementation review    |
| `/dual-pass-review` | `dual-pass-review.prompt.md`  | Two-pass correction review    |
| `/docs-update`      | `docs-update.prompt.md`       | Update documentation          |
| `/watzup`           | `watzup.prompt.md`            | Summarize changes             |
| `/scout`            | `scout.prompt.md`             | Explore codebase              |
| `/investigate`      | `investigate.prompt.md`       | Deep dive analysis            |

### Workflow Execution Protocol (MANDATORY STEPS)

You MUST follow these steps for EVERY development request:

1. **DETECT** - Analyze user prompt against workflow patterns
2. **ANNOUNCE** - State the detected workflow: `"Detected: **{Workflow}** workflow. Following: {sequence}"`
3. **CONFIRM** - For features/refactors, ask: `"Proceed with this workflow? (yes/no/quick)"`
4. **EXECUTE** - Follow each step in sequence using prompts from `.github/prompts/`

### Override Methods

| Method           | Example                    | Effect                           |
| ---------------- | -------------------------- | -------------------------------- |
| `quick:` prefix  | `quick: add a button`      | Skip workflow, direct handling   |
| Explicit command | `/plan implement dark mode`| Bypass detection, run command    |
| Say "quick"      | When asked "Proceed?"      | Abort workflow, handle directly  |

### Example Interaction

**User:** "Add a dark mode toggle to the settings page"

**Copilot Response:**
```
Detected: **Feature Implementation** workflow. Following: /plan -> /cook -> /test -> /code-review -> /docs-update -> /watzup

Proceed with this workflow? (yes/no/quick)
```

**User:** "yes"

**Copilot:** *Reads and executes `.github/prompts/plan.prompt.md` first, then `cook.prompt.md`, then `test.prompt.md`, etc.*

## Architecture Overview

```
src/Platform/                    # Easy.Platform framework components
├── Easy.Platform/               # Core (CQRS, validation, repositories)
├── Easy.Platform.AspNetCore/    # ASP.NET Core integration
├── Easy.Platform.MongoDB/       # MongoDB patterns
├── Easy.Platform.RabbitMQ/      # Message bus
└── Easy.Platform.*/             # Other modules

src/PlatformExampleApp/          # Example microservice (TextSnippet)
├── *.Api/                       # Web API layer
├── *.Application/               # CQRS handlers, jobs, events
├── *.Domain/                    # Entities, domain events
├── *.Persistence*/              # Database implementations
└── *.Shared/                    # Cross-service utilities

src/PlatformExampleAppWeb/       # Angular 19 Nx workspace
├── apps/playground-text-snippet/# Example app
└── libs/
    ├── platform-core/           # Base classes, utilities
    ├── apps-domains/            # Business domain code
    ├── share-styles/            # SCSS themes
    └── share-assets/            # Static assets
```

## Essential Documentation

| Document                           | Purpose                          |
| ---------------------------------- | -------------------------------- |
| `README.md`                        | Platform overview & quick start  |
| `EasyPlatform.README.md`           | Framework deep dive & patterns   |
| `docs/claude/08-clean-code-rules.md`| Coding standards & anti-patterns |
| `.github/AI-DEBUGGING-PROTOCOL.md` | Debugging protocol for AI agents |

## How This Documentation Works

**Documentation Architecture:**

-   **This file (`copilot-instructions.md`)**: Quick reference, core principles, decision trees
-   **`.github/instructions/`**: Deep dive patterns (auto-loaded based on file paths via `applyTo`)
-   **`.github/prompts/`**: Task-specific prompts (plan, fix, scout, brainstorm, investigate)
-   **`.github/AGENTS.md`**: Specialized agent roles with decision tree
-   **`docs/claude/`**: Domain-specific pattern deep dives (Memory Bank)
-   **Framework docs**: `EasyPlatform.README.md`, platform component deep dive

## Memory Bank (Persistent Context)

**Use @workspace to reference these key files for deep domain knowledge:**

| Context Needed                                | Reference via @workspace                           |
| --------------------------------------------- | -------------------------------------------------- |
| Backend patterns (CQRS, Repository, Events)   | `@workspace docs/claude/03-backend-patterns.md`    |
| Frontend patterns (Components, Forms, Stores) | `@workspace docs/claude/04-frontend-patterns.md`   |
| Architecture & Service boundaries             | `@workspace docs/claude/01-planning-protocol.md`   |
| Advanced fluent helpers & utilities           | `@workspace docs/claude/07-advanced-patterns.md`   |
| What NOT to do                                | `@workspace docs/claude/07-advanced-patterns.md`   |
| Debugging & troubleshooting                   | `@workspace docs/claude/02-investigation-protocol.md` |
| Agent roles & when to use them                | `@workspace .github/AGENTS.md`                     |
| Framework deep dive                           | `@workspace EasyPlatform.README.md`                |

**When to load Memory Bank context:**

-   Starting complex multi-file tasks -> Load architecture docs
-   Backend development -> Load backend-patterns.md
-   Frontend development -> Load frontend-patterns.md
-   Code review -> Load anti-patterns section
-   Debugging -> Load investigation-protocol.md
-   Planning which agent to use -> Load AGENTS.md

**How AI Agents Use This:**

When you ask me to code/debug/analyze, I automatically:

1. **Always load** this file for core principles and decision trees
2. **Auto-load** relevant instruction files from `.github/instructions/` based on file paths being modified
3. **Invoke skills** from `.claude/skills/` for complex tasks (debugging, feature planning, testing)
4. **Search codebase** for existing patterns before implementing

Example: When you ask me to "add a CQRS command to save text snippet data", I:

-   Read this file -> See "Use CQRS pattern, platform repository"
-   Auto-load `backend-dotnet.instructions.md` (applies to `*.cs` files)
-   Auto-load `cqrs-patterns.instructions.md` (applies to `*Command*.cs`)
-   Search for existing `Save*Command.cs` patterns
-   Implement following discovered patterns

**You don't need to tell me which files to read - the system loads them automatically based on context.**

## Detailed Pattern Instructions

See `.github/instructions/` for path-specific detailed patterns:

| Topic                 | Instruction File                        | Applies To                        |
| --------------------- | --------------------------------------- | --------------------------------- |
| .NET Backend          | `backend-dotnet.instructions.md`        | `src/PlatformExampleApp/**/*.cs`  |
| Angular Frontend      | `frontend-angular.instructions.md`      | `src/PlatformExampleAppWeb/**/*.ts` |
| CQRS Patterns         | `cqrs-patterns.instructions.md`         | Commands/Queries                  |
| Validation            | `validation.instructions.md`            | All validation logic              |
| Entity Development    | `entity-development.instructions.md`    | Domain entities                   |
| Entity Events         | `entity-events.instructions.md`         | Side effects                      |
| Repository            | `repository.instructions.md`            | Data access                       |
| Message Bus           | `message-bus.instructions.md`           | Cross-service sync                |
| Background Jobs       | `background-jobs.instructions.md`       | Scheduled tasks                   |
| Migrations            | `migrations.instructions.md`            | Data/schema migrations            |
| Performance           | `performance.instructions.md`           | Optimization                      |
| Security              | `security.instructions.md`              | Auth, permissions                 |
| Testing               | `testing.instructions.md`               | Test patterns                     |
| Clean Code            | `clean-code.instructions.md`            | All code                          |
| Bug Investigation     | `bug-investigation.instructions.md`     | Debugging                         |
| Feature Investigation | `feature-investigation.instructions.md` | Code exploration                  |

## Quick Decision Trees

**Backend Task:**

-   New API endpoint -> `PlatformBaseController` + CQRS Command
-   Business logic -> Command Handler in Application layer
-   Data access -> Platform repository + extensions
-   Cross-service sync -> Entity Event Consumer
-   Scheduled task -> `PlatformApplicationBackgroundJob`
-   Migration -> `PlatformDataMigrationExecutor` or EF Core

**Frontend Task:**

-   Simple display -> `AppBaseComponent`
-   Complex state -> `AppBaseVmStoreComponent` + `PlatformVmStore`
-   Forms -> `AppBaseFormComponent` with validation
-   API calls -> Service extending `PlatformApiService`

**Repository Selection:**

-   Primary: `IPlatformQueryableRootRepository<TEntity, TKey>`
-   Complex queries: Create `RepositoryExtensions` with static expressions
-   When queryable not needed: `IPlatformRootRepository<TEntity, TKey>`

## Critical Anti-Patterns

**Backend:**

-   Direct cross-service database access (use message bus)
-   Custom repository interfaces (use platform repositories + extensions)
-   Manual validation (use `PlatformValidationResult`)
-   Side effects in command handlers (use entity event handlers)
-   DTO mapping in handlers (use `PlatformDto.MapToObject()`)

**Frontend:**

-   Direct `HttpClient` usage (use `PlatformApiService`)
-   Manual state management (use `PlatformVmStore`)
-   Assuming method names without verification (check base class APIs)
-   Skipping `untilDestroyed()` for subscriptions

## Code Responsibility Hierarchy (CRITICAL)

**Place logic in the LOWEST appropriate layer to enable reuse and prevent duplication:**

```
Entity/Model (Lowest)  ->  Service  ->  Component (Highest)
```

| Layer            | Responsibility                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Entity/Model** | Business logic, display helpers, static factory methods, default values, validation rules   |
| **Service**      | API calls, command factories, data transformation                                           |
| **Component**    | UI event handling ONLY - delegates all logic to lower layers                                |

**Anti-Pattern**: Logic in component that should be in model -> leads to duplicated code across components.

```typescript
// WRONG: Logic in component
readonly statusOptions = [{ value: 1, label: 'Active' }, ...]; // Duplicated if another component needs it

// CORRECT: Logic in entity/model
readonly statusOptions = TextSnippetStatus.getOptions(); // Single source of truth
```

## Universal Clean Code Rules

-   Single Responsibility: One method/class does one thing
-   Consistent abstraction level in methods
-   Reuse code, don't duplicate patterns
-   Meaningful names that explain intent
-   Group parallel operations (no dependencies) together
-   Follow Input -> Process -> Output pattern
-   Use early validation and guard clauses
-   90% Logic Rule: Place logic where 90% of it belongs

## Development Commands

```bash
# Backend
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api

# Frontend
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
nx build playground-text-snippet
nx test platform-core

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

## Getting Help

1. Study Platform Example: `src/PlatformExampleApp`
2. Search existing implementations in codebase
3. Check instruction files in `.github/instructions/`
4. Review `docs/claude/` documentation

---

# EasyPlatform - Code Pattern Reference

## Backend (C#)

### Entity & Domain

```csharp
// Entity types
public class TextSnippet : RootEntity<TextSnippet, string> { }
public class AuditedTextSnippet : RootAuditedEntity<AuditedTextSnippet, string, string> { }

// Field tracking
[TrackFieldUpdatedDomainEvent]
public string Name { get; set; } = "";

// Computed property (MUST have empty set)
[ComputedEntityProperty]
public string FullName { get => $"{FirstName} {LastName}".Trim(); set { } }

// Static expressions
public static Expression<Func<Entity, bool>> UniqueExpr(string companyId, string code)
    => e => e.CompanyId == companyId && e.Code == code;

public static Expression<Func<Entity, bool>> CompositeExpr(string companyId, bool includeInactive = false)
    => OfCompanyExpr(companyId).AndAlsoIf(!includeInactive, () => e => e.IsActive);

public static Expression<Func<Entity, object?>>[] DefaultFullTextSearchColumns()
    => [e => e.Name, e => e.Code, e => e.Content];
```

### Repository

```csharp
// Platform repositories
IPlatformQueryableRootRepository<TextSnippet, string>  // Primary - with IQueryable support
IPlatformRootRepository<TextSnippet, string>           // When queryable not needed

// CRUD operations
await repository.CreateAsync(entity, ct);
await repository.UpdateAsync(entity, ct);
await repository.CreateOrUpdateAsync(entity, ct);
await repository.DeleteAsync(id, ct);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// Query operations
await repository.GetByIdAsync(id, ct, loadRelatedEntities: p => p.Author, p => p.Category);
await repository.FirstOrDefaultAsync(expr, ct);
await repository.GetAllAsync(expr, ct);
await repository.GetByIdsAsync(ids, ct);
await repository.CountAsync(expr, ct);
await repository.AnyAsync(expr, ct);

// Query builder
var queryBuilder = repository.GetQueryBuilder((uow, q) => q.Where(...).OrderBy(...));

// Extension pattern
public static async Task<TextSnippet> GetByCodeAsync(
    this IPlatformQueryableRootRepository<TextSnippet, string> repo, string code, CancellationToken ct = default)
    => await repo.FirstOrDefaultAsync(TextSnippet.ByCodeExpr(code), ct).EnsureFound();

// Projection
await repo.FirstOrDefaultAsync(q => q.Where(expr).Select(e => e.Id), ct);
```

### Validation

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

// Chained with Of<>
return this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
    .And(p => p.Status != Status.Deleted, "Cannot be deleted")
    .Of<IPlatformCqrsRequest>();

// Ensure pattern
await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

### CQRS Command (all in one file)

```csharp
public sealed class SaveTextSnippetCommand : PlatformCqrsCommand<SaveTextSnippetCommandResult>
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveTextSnippetCommandResult : PlatformCqrsCommandResult
{
    public TextSnippetDto Entity { get; set; } = null!;
}

internal sealed class SaveTextSnippetCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveTextSnippetCommand, SaveTextSnippetCommandResult>
{
    protected override async Task<SaveTextSnippetCommandResult> HandleAsync(SaveTextSnippetCommand req, CancellationToken ct)
    {
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveTextSnippetCommandResult { Entity = new TextSnippetDto(entity) };
    }
}
```

### CQRS Query

```csharp
public sealed class GetTextSnippetListQuery : PlatformCqrsPagedQuery<GetTextSnippetListQueryResult, TextSnippetDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetTextSnippetListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetTextSnippetListQuery, GetTextSnippetListQueryResult>
{
    protected override async Task<GetTextSnippetListQueryResult> HandleAsync(GetTextSnippetListQuery req, CancellationToken ct)
    {
        var qb = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q => searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        var (total, items) = await (
            repository.CountAsync((uow, q) => qb(uow, q), ct),
            repository.GetAllAsync((uow, q) => qb(uow, q).OrderByDescending(e => e.CreatedDate).PageBy(req.SkipCount, req.MaxResultCount), ct)
        );
        return new GetTextSnippetListQueryResult(items, total, req);
    }
}
```

### Entity DTO

```csharp
public class TextSnippetDto : PlatformEntityDto<TextSnippet, string>
{
    public TextSnippetDto() { }
    public TextSnippetDto(TextSnippet e, User? u) : base(e) { FullName = e.FullName ?? u?.FullName ?? ""; }

    public string? Id { get; set; }
    public string FullName { get; set; } = "";
    public CategoryDto? Category { get; set; }

    public TextSnippetDto WithCategory(Category c) { Category = new CategoryDto(c); return this; }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override TextSnippet MapToEntity(TextSnippet e, MapToEntityModes mode) { e.FullName = FullName; return e; }
}

// Value object DTO
public sealed class ConfigDto : PlatformDto<ConfigValue>
{
    public string ClientId { get; set; } = "";
    public override ConfigValue MapToObject() => new() { ClientId = ClientId };
}
```

### Entity Event Handler (side effects)

```csharp
// Location: UseCaseEvents/[Feature]/[Action]On[Event][Entity]EntityEventHandler.cs
internal sealed class SendNotificationOnCreateTextSnippetEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippet>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippet> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<TextSnippet> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

### Cross-Service Communication

```csharp
// Entity Event Bus Producer (auto-publishes on entity changes)
public class TextSnippetEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippet, string> { }
```

### Message Bus Consumer

```csharp
internal sealed class UpsertEntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage msg, string routingKey) => true;

    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        var (companyMissing, _) = await (
            Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
            Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p)
        );
        if (companyMissing) return;

        var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
        if (existing == null)
            await repository.CreateAsync(msg.Payload.EntityData.ToEntity().With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
            await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
    }
}
```

### Background Jobs

```csharp
// Paged job
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skip, int? take, object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
        => await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take)).Then(items => items.ParallelAsync(ProcessItem));
    protected override async Task<int> MaxItemsCount(PlatformApplicationPagedBackgroundJobParam<object?> param)
        => await repository.CountAsync(q => QueryBuilder(q));
}

// Batch scrolling job
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;
    protected override int BatchPageSize => 25;
    protected override IQueryable<Entity> EntitiesQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);
    protected override IQueryable<string> EntitiesBatchKeyQueryBuilder(IQueryable<Entity> q, object? param, string? batchKey = null)
        => EntitiesQueryBuilder(q, param, batchKey).Select(e => e.CompanyId).Distinct();
    protected override async Task ProcessEntitiesAsync(List<Entity> entities, string batchKey, object? param, IServiceProvider sp)
        => await entities.ParallelAsync(e => ProcessEntity(e), maxConcurrent: 1);
}

// Cron examples
[PlatformRecurringJob("0 0 * * *")]              // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + startup
```

### Data Migration

```csharp
// EF Core migration
public partial class AddSnippetFields : Migration
{
    protected override void Up(MigrationBuilder mb) { mb.AddColumn<string>("Category", "TextSnippets"); }
}
// Commands: dotnet ef migrations add Name | dotnet ef database update

// MongoDB/Platform migration (SQL Server/PostgreSQL)
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => q.Where(FilterExpr())),
            pageSize: 200,
            async (skip, take, repo, uow) => {
                using var unit = uow.Begin();
                var items = await repo.GetAllAsync(q => q.OrderBy(e => e.Id).Skip(skip).Take(take));
                await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false);
                await unit.CompleteAsync();
                return items;
            });
    }
}

// MongoDB migration (for MongoDB databases)
internal sealed class EnsureIndexesMigration : PlatformMongoMigrationExecutor<ServiceDbContext>
{
    public override string Name => "20250130000000_EnsureIndexes";
    public override DateTime? OnlyForDbInitBeforeDate => new(2025, 01, 30);
    public override DateTime? ExpirationDate => new(2026, 01, 01); // Optional: auto-delete after date

    public override async Task Execute(ServiceDbContext dbContext)
    {
        await dbContext.EnsureInboxBusMessageCollectionIndexesAsync(true);
        await dbContext.EnsureOutboxBusMessageCollectionIndexesAsync(true);
    }
}
```

### Fluent Helpers

```csharp
// Mutation & transformation
await repo.GetByIdAsync(id).With(e => e.Name = newName).WithIf(cond, e => e.Status = Active);
await repo.GetByIdAsync(id).Then(e => e.Process()).ThenAsync(e => e.ValidateAsync(svc, ct));
await repo.GetByIdAsync(id).EnsureFound($"Not found: {id}");
await repo.GetByIdsAsync(ids, ct).EnsureFoundAllBy(x => x.Id, ids);

// Expression composition
Entity.OfCompanyExpr(companyId).AndAlso(StatusExpr(statuses)).AndAlsoIf(deptIds.Any(), () => DeptExpr(deptIds));

// Parallel operations
var (entity, files) = await (repo.CreateOrUpdateAsync(entity, ct), files.ParallelAsync(f => fileService.UploadAsync(f, ct)));
var ids = await repo.GetByIdsAsync(ids, ct).ThenSelect(e => e.Id);
await items.ParallelAsync(item => ProcessAsync(item, ct), maxConcurrent: 10);

// Conditional actions
await repo.GetByIdAsync(id).PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(() => svc.Any(), e => e.Sync());

// Task extensions
task.WaitResult();
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
```

### Authorization & Controller

```csharp
[ApiController]
[Route("api/[controller]")]
public class TextSnippetController : PlatformBaseController
{
    [PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
    [HttpPost]
    public async Task<IActionResult> Save([FromBody] SaveCommand cmd) => Ok(await Cqrs.SendAsync(cmd));
}

// Entity-level filter
public static Expression<Func<TextSnippet, bool>> UserCanAccessExpr(string userId, string companyId)
    => e => e.UserId == userId || (e.CompanyId == companyId && e.IsPublic);
```

### Helper vs Util

```csharp
// Helper (with dependencies)
public class TextSnippetHelper : IPlatformHelper
{
    private readonly IPlatformApplicationRequestContext requestContext;
    public TextSnippetHelper(IPlatformApplicationRequestContextAccessor accessor) { requestContext = accessor.Current; }
    public async Task<TextSnippet> GetOrCreateAsync(string userId, string companyId, CancellationToken ct)
        => await repo.FirstOrDefaultAsync(TextSnippet.UniqueExpr(userId, companyId), ct) ?? await CreateAsync(userId, companyId, ct);
}

// Util (pure functions)
public static class TextSnippetUtil
{
    public static string GetFullName(TextSnippet e) => $"{e.FirstName} {e.LastName}".Trim();
    public static bool IsActive(TextSnippet e) => e.Status == Active && !e.ExpirationDate.HasValue;
}
```

### Request Context

```csharp
RequestContext.CurrentCompanyId() / .UserId() / .ProductScope()
await RequestContext.CurrentUser()
RequestContext.HasRequestAdminRoleInCompany()
```

### List Extensions

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty()
.RemoveWhere(predicate, out removedItems)
.UpsertBy(keySelector, items, updateFn)
.ReplaceBy(keySelector, newItems, updateFn)
.SelectList(selector)  // Select().ToList()
.ThenSelect(selector)  // For Task<List<T>>
.ForEachAsync(action, maxConcurrent)
.AddDistinct(item, keySelector)
```

### Advanced Patterns

```csharp
// Object deep comparison (change detection)
if (propertyInfo.GetValue(entity).IsValuesDifferent(propertyInfo.GetValue(existingEntity)))
    entity.AddFieldUpdatedEvent(propertyInfo, oldValue, newValue);

// Domain Service (Strategy pattern)
public static class PermissionService {
    private static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<TextSnippet, bool>> GetCanManageExpr(IList<string> roles)
        => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Background Job Coordination (Master schedules child jobs)
await companies.ParallelAsync(async companyId =>
    await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
        BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = companyId, Date = date })));
```

---

## Frontend (TypeScript)

### Component Hierarchy

```typescript
PlatformComponent -> PlatformVmComponent -> PlatformFormComponent
                  -> PlatformVmStoreComponent

AppBaseComponent -> AppBaseVmComponent -> AppBaseFormComponent
                 -> AppBaseVmStoreComponent
```

## Component HTML Template Standard (BEM Classes)

**All UI elements in component templates MUST have BEM classes, even without styling needs.** This makes HTML self-documenting like OOP class hierarchy.

```html
<!-- CORRECT: All elements have BEM classes for structure clarity -->
<div class="snippet-card">
    <div class="snippet-card__header">
        <img class="snippet-card__icon" [src]="snippet.icon" />
        <span class="snippet-card__title">{{ snippet.title }}</span>
    </div>
    <div class="snippet-card__body">
        <p class="snippet-card__content">{{ snippet.content }}</p>
        <div class="snippet-card__actions">
            <button class="snippet-card__btn --primary">Edit</button>
        </div>
    </div>
</div>

<!-- WRONG: Elements without classes - harder to understand structure -->
<div class="snippet-card">
    <div>
        <img [src]="snippet.icon" />
        <span>{{ snippet.title }}</span>
    </div>
    <div>
        <p>{{ snippet.content }}</p>
        <div>
            <button>Edit</button>
        </div>
    </div>
</div>
```

**BEM Naming Convention:**

-   **Block**: Component name (e.g., `snippet-card`)
-   **Element**: Child using `block__element` (e.g., `snippet-card__header`)
-   **Modifier**: Separate class with `--` prefix (e.g., `snippet-card__btn --primary --large`)

## Component SCSS Standard

Always style both the **host element** (Angular selector) and the **main wrapper class**:

```scss
@import '~assets/scss/variables';

// Host element styling - ensures Angular element is a proper block container
my-component {
    display: flex;
    flex-direction: column;
}

// Main wrapper class with full styling
.my-component {
    display: flex;
    flex-direction: column;
    width: 100%;
    flex-grow: 1;

    &__header {
        // BEM child elements...
    }

    &__content {
        flex: 1;
        overflow-y: auto;
    }
}
```

**Why both?**

-   **Host element**: Makes the Angular element a real layout element (not an unknown element without display)
-   **Main class**: Contains the full styling, matches the wrapper div in HTML

### Platform Component API

```typescript
export abstract class PlatformComponent {
  status$: WritableSignal<ComponentStateStatus>;
  observerLoadingErrorState<T>(requestKey?: string): OperatorFunction<T, T>;
  isLoading$(requestKey?: string): Signal<boolean | null>;
  untilDestroyed<T>(): MonoTypeOperatorFunction<T>;
  tapResponse<T>(nextFn?, errorFn?): OperatorFunction<T, T>;
}

export abstract class PlatformVmComponent<TViewModel> extends PlatformComponent {
  vm: WritableSignal<TViewModel | undefined>;
  currentVm(): TViewModel;
  updateVm(partial): TViewModel;
  protected abstract initOrReloadVm: (isReload: boolean) => Observable<TViewModel | undefined>;
}

export abstract class PlatformVmStoreComponent<TViewModel, TStore> extends PlatformComponent {
  constructor(public store: TStore) {}
  vm: Signal<TViewModel | undefined>;
  reload(): void;
}

export abstract class PlatformFormComponent<TViewModel> extends PlatformVmComponent<TViewModel> {
  form: FormGroup<PlatformFormGroupControls<TViewModel>>;
  mode: PlatformFormMode;
  isViewMode/isCreateMode/isUpdateMode(): boolean;
  validateForm(): boolean;
  protected abstract initialFormConfig: () => PlatformFormConfig<TViewModel>;
}
```

### Component Usage

```typescript
export class SnippetListComponent extends PlatformComponent {
    loadSnippets() {
        this.snippetService
            .getSnippets()
            .pipe(
                this.observerLoadingErrorState('loadSnippets'),
                this.tapResponse(snippets => (this.snippets = snippets)),
                this.untilDestroyed()
            )
            .subscribe();
    }
}

export class SnippetListStore extends PlatformVmStore<SnippetListVm> {
    loadSnippets = this.effectSimple(() => this.api.getSnippets().pipe(this.tapResponse(snippets => this.updateState({ snippets }))));
    readonly snippets$ = this.select(state => state.snippets);
}

export class SnippetListComponent extends AppBaseVmStoreComponent<SnippetListVm, SnippetListStore> {
    constructor(store: SnippetListStore) {
        super(store);
    }
    onRefresh() {
        this.reload();
    }
}
```

### Form Component

```typescript
export class SnippetFormComponent extends AppBaseFormComponent<SnippetFormVm> {
  protected initialFormConfig = () => ({
    controls: {
      title: new FormControl(this.currentVm().title, [Validators.required],
        [ifAsyncValidator(() => !this.isViewMode, checkTitleUniqueValidator(...))])
    },
    dependentValidations: { title: ['content'] }
  });
  onSubmit() { if (this.validateForm()) { /* process */ } }
}

// FormArray
protected initialFormConfig = () => ({
  controls: {
    tags: {
      modelItems: () => vm.tags,
      itemControl: (tag) => new FormGroup({ name: new FormControl(tag.name, [Validators.required]) })
    }
  }
});
```

### API Service

```typescript
@Injectable({ providedIn: 'root' })
export class TextSnippetApiService extends PlatformApiService {
    protected get apiUrl() {
        return environment.apiUrl + '/api/TextSnippet';
    }
    getSnippets(query?: Query): Observable<TextSnippet[]> {
        return this.get<TextSnippet[]>('', query);
    }
    saveSnippet(cmd: SaveCommand): Observable<Result> {
        return this.post<Result>('', cmd);
    }
    search(criteria: Search): Observable<TextSnippet[]> {
        return this.post('/search', criteria, { enableCache: true });
    }
}
```

### Watch Decorator & RxJS

```typescript
export class MyComponent {
    @Watch('onChanged') public pagedResult?: PagedResult<Item>;
    @WatchWhenValuesDiff('search') public searchTerm: string = '';

    private onChanged(value: PagedResult<Item>, change: SimpleChange<PagedResult<Item>>) {
        if (!change.isFirstTimeSet) this.updateUI();
    }
}

this.search$
    .pipe(
        skipDuplicates(500),
        applyIf(this.isEnabled$, debounceTime(300)),
        onCancel(() => this.cleanup()),
        tapOnce({ next: v => this.init(v) }),
        distinctUntilObjectValuesChanged(),
        this.untilDestroyed()
    )
    .subscribe();
```

### Form Validators

```typescript
new FormControl(
    '',
    [
        Validators.required,
        noWhitespaceValidator,
        startEndValidator(
            'invalidRange',
            ctrl => ctrl.parent?.get('start')?.value,
            ctrl => ctrl.value
        )
    ],
    [ifAsyncValidator(ctrl => ctrl.valid, titleUniqueValidator)]
);
```

### Store with Caching

```typescript
@Injectable()
export class MyStore extends PlatformVmStore<MyVm> {
    protected get enableCaching() {
        return true;
    }
    protected cachedStateKeyName = () => 'MyStore';
    protected vmConstructor = (data?: Partial<MyVm>) => new MyVm(data);

    loadData = this.effectSimple(() => this.api.getData().pipe(this.tapResponse(data => this.updateState({ data }))), 'loadData');
    readonly data$ = this.select(state => state.data);
    readonly loading$ = this.isLoading$('loadData');
}
```

### Authorization

```typescript
export class SnippetFormComponent extends AppBaseFormComponent<SnippetFormVm> {
  get canEdit() { return this.hasRole(PlatformRoles.Admin, PlatformRoles.Manager) && this.isOwnCompany(); }
}
@if (hasRole(PlatformRoles.Admin)) { <button (click)="delete()">Delete</button> }
canActivate(): Observable<boolean> { return this.authService.hasRole$(PlatformRoles.Admin); }
```

### Platform Directives

```typescript
<div platformSwipeToScroll>/* Horizontal scroll with drag */</div>
<input [platformDisabledControl]="isDisabled" />
```

### Utilities

```typescript
import { date_addDays, list_groupBy, string_isEmpty, immutableUpdate, guid_generate, task_delay } from '@libs/platform-core';

trackByItem = this.ngForTrackByItemProp<Snippet>('id');
storeSubscription('dataLoad', this.data$.subscribe(...));
cancelStoredSubscription('dataLoad');
```

---

## Infrastructure

### VS Code Extensions

```json
{
    "recommendations": [
        "angular.ng-template",
        "esbenp.prettier-vscode",
        "ms-dotnettools.csharp",
        "ms-dotnettools.csdevkit",
        "nrwl.angular-console",
        "dbaeumer.vscode-eslint",
        "firsttris.vscode-jest-runner",
        "sonarsource.sonarlint-vscode",
        "eamodio.gitlens",
        "streetsidesoftware.code-spell-checker"
    ]
}
```

### Commands

```bash
# Backend
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api

# Frontend
cd src/PlatformExampleAppWeb
npm install
nx serve playground-text-snippet
nx build playground-text-snippet
nx test platform-core

# Infrastructure
docker-compose -f src/platform-example-app.docker-compose.yml up -d
```

### Database Connections

```
SQL Server:  localhost,14330  (sa / 123456Abc)
MongoDB:     localhost:27017  (root / rootPassXXX)
PostgreSQL:  localhost:54320  (postgres / postgres)
Redis:       localhost:6379
RabbitMQ:    localhost:15672  (guest / guest)
```

---

## Anti-Patterns

```csharp
// Direct cross-service DB access -> Use message bus
// Custom repository interfaces -> Use platform repos with extensions
// throw new ValidationException() -> Use PlatformValidationResult fluent API
// Side effects in command handler -> Use entity event handlers
// DTO mapping in handler -> Use PlatformDto.MapToObject()
```

```typescript
// constructor(private http: HttpClient) -> Use PlatformApiService
// Manual signals for state -> Use PlatformVmStore
```
