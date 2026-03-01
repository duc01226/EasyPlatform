# Backend Development Patterns — Project Reference

## Document Summary

**What this file covers:** Complete .NET 9 + Easy.Platform backend reference — from entity definition through CQRS command/query handlers, repository extensions, validation chains, event-driven side effects, background jobs, message bus consumers, data migrations, full-text search, authorization, and fluent helper utilities. Includes Project-specific conventions (service repos, namespaces, DB config) and integration testing patterns.

**Sections:**

| #   | Section                                                                    | What You'll Find                                                                              |
| --- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | [Service-Specific Repositories](#project-service-specific-repositories) | `ITextSnippetRootRepository`, `IUserRootRepository`, extension pattern                       |
| 2   | [Namespace Conventions](#project-namespace-conventions)                 | Service → namespace → path mapping table                                                      |
| 3   | [Migration Paths](#project-migration-patterns)                          | MongoDB vs EF Core migration file locations                                                   |
| 4   | [Database Configuration](#project-database-configuration)               | Service → DB engine mapping (MongoDB/PostgreSQL/SQL Server)                                   |
| 5   | [Message Bus Examples](#project-message-bus-examples)                   | Producer/consumer naming, cross-service event sync                                            |
| 6   | [Clean Architecture](#clean-architecture-layers)                           | Domain → Application → Persistence → Api layer examples                                       |
| 7   | [Repository Pattern](#repository-pattern)                                  | Priority order, CRUD API, index configuration (MongoDB + EF Core)                             |
| 8   | [Validation](#validation-patterns)                                         | Sync/async fluent API, `AndAsync`, `AndNotAsync`, `Ensure`, naming conventions                |
| 9   | [CQRS Implementation](#cqrs-implementation-patterns)                       | Command+Result+Handler in ONE file, `ValidateRequestAsync`, query with `GetQueryBuilder`      |
| 10  | [Navigation Properties](#navigation-property-loading)                      | Forward/reverse/collection nav, `[PlatformNavigationProperty]`, batch loading                 |
| 11  | [Entity Patterns](#entity-development-patterns)                            | Static expressions, computed properties, `SearchColumns()`, `[TrackFieldUpdatedDomainEvent]`  |
| 12  | [Entity DTO](#entity-dto-patterns)                                         | `PlatformEntityDto`, `MapToEntity()`, `With*` fluent methods                                  |
| 13  | [Event-Driven Side Effects](#event-driven-side-effects-critical)           | [MUST NOT] side effects in handler → entity event handlers, `IsSeedingTestingData()` guard    |
| 14  | [Background Jobs](#background-job-patterns)                                | Paged, batch scrolling, cron schedules                                                        |
| 15  | [Async Collection Processing](#async-collection-processing)                | [MUST NOT] await in foreach → `.ParallelAsync()`                                              |
| 16  | [Message Bus](#message-bus-patterns)                                       | Consumer with `TryWaitUntilAsync`, create/update/delete handling, naming convention           |
| 17  | [Data Migration](#data-migration-patterns)                                 | `PlatformDataMigrationExecutor`, paged execution, `OnlyForDbsCreatedBeforeDate`               |
| 18  | [Full-Text Search](#full-text-search-patterns)                             | `IPlatformFullTextSearchPersistenceService`, `PipeIf`, `fullTextAccurateMatch`                |
| 19  | [Authorization](#authorization-patterns)                                   | `[PlatformAuthorize]`, handler validation, entity-level query filter                          |
| 20  | [Helper vs Util](#helper-vs-util-decision-guide)                           | Decision tree: dependencies → Helper, pure functions → Util                                   |
| 21  | [Repository Extensions](#repository-extension-patterns)                    | `.EnsureFound()`, `.EnsureFoundAllBy()`, projected ID select                                  |
| 22  | [Validation Advanced](#validation-advanced-patterns)                       | `.Of<>()` terminal cast, inline ensure chain                                                  |
| 23  | [Event Producer](#cross-service-event-producer)                            | `PlatformCqrsEntityEventBusMessageProducer` registration                                      |
| 24  | [Fluent Helpers](#fluent-helper-reference)                                 | `.With`, `.Then`, `.EnsureFound`, `.AndAlso`, `.ParallelAsync`, parallel tuples               |
| 25  | [Advanced Entity](#advanced-entity-patterns)                               | Async expression factory, `ToHashSet()`, static `ValidateEntity()`                            |
| 26  | [Background Job Advanced](#background-job-advanced-patterns)               | Cron reference, scrolling pattern, job coordination                                           |
| 27  | [MongoDB Migrations](#mongodb-migration-patterns)                          | `PlatformMongoMigrationExecutor` (no DI) vs `PlatformDataMigrationExecutor` (with DI)         |
| 28  | [Advanced Utilities](#advanced-backend-utilities)                          | `RequestContext`, `IPlatformHelper`, expression combinators, deep comparison, task extensions |
| 29  | [Anti-Patterns](#anti-patterns-critical)                                   | 6 [MUST NOT] rules + correct DTO mapping example                                              |
| 30  | [Templates](#templates)                                                    | Copy-paste scaffold for Command + Handler                                                     |
| 31  | [Integration Testing](#integration-testing)                                | 3-layer test stack, fixtures, cross-service, data seeding, bootstrap checklist                |

---

## Project Service-Specific Repositories

```csharp
// ALWAYS use service-specific repositories (CRITICAL)
ITextSnippetRootRepository<T>              // TextSnippet service
IUserRootRepository<T>                     // TextSnippet service (User entities)

// Create repository extensions for complex queries
public static class TextSnippetRepositoryExtensions
{
    public static async Task<TextSnippetEntity> GetByUniqueExprAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repo,
        string? categoryId, string snippetText, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(TextSnippetEntity.UniqueExpr(categoryId, snippetText), ct)
            .EnsureFound($"Snippet not found: CategoryId={categoryId}, SnippetText={snippetText}");
}
```

## Project Namespace Conventions

| Service              | Application Namespace                         | Domain Namespace                         | Service Path                                                    |
| -------------------- | --------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| TextSnippet          | `PlatformExampleApp.TextSnippet.Application`  | `PlatformExampleApp.TextSnippet.Domain`  | `src/Backend/PlatformExampleApp.TextSnippet.Application/`       |

## Project Migration Patterns

MongoDB data migrations in TextSnippet: `src/Backend/PlatformExampleApp.TextSnippet.Persistence.Mongo/`
EF Core migrations in TextSnippet: `src/Backend/PlatformExampleApp.TextSnippet.Persistence/Migrations/`
PostgreSQL migrations: `src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/Migrations/`

## Project Database Configuration

| Service              | Database     | Type                               |
| -------------------- | ------------ | ---------------------------------- |
| TextSnippet          | TextSnippet  | MongoDB / PostgreSQL / SQL Server  |

## Project Message Bus Examples

```csharp
// RabbitMQ message naming convention
// Event (Producer is leader): {ServiceName}{Feature}{Action}EventBusMessage
// Request (Consumer asks): {ConsumerServiceName}{Feature}RequestBusMessage

// Example: TextSnippet entity event bus message
public class TextSnippetEntityEventBusMessage : PlatformBusMessage<PlatformCqrsEntityEventBusMessagePayload<TextSnippetEntity>> { }

// Consumer in TextSnippet service
internal sealed class SyncTextSnippetFromEventConsumer
    : PlatformApplicationMessageBusConsumer<TextSnippetEntityEventBusMessage>
{
    public override async Task HandleLogicAsync(TextSnippetEntityEventBusMessage msg, string routingKey) { ... }
}
```

## Clean Architecture Layers

```csharp
// Domain Layer - Business entities and rules (non-audited)
public class TextSnippetEntity : RootEntity<TextSnippetEntity, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; } = string.Empty;

    public static Expression<Func<TextSnippetEntity, bool>> IsActiveExpression()
        => e => e.Status == SnippetStatus.Active;
}

// Domain Layer - Business entities with audit trails
public class AuditedTextSnippetEntity : RootAuditedEntity<AuditedTextSnippetEntity, string, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; } = string.Empty;
}

// Application Layer - CQRS handlers
public class SaveSnippetCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveSnippetCommand, SaveSnippetCommandResult>
{
    protected override async Task<SaveSnippetCommandResult> HandleAsync(
        SaveSnippetCommand request, CancellationToken cancellationToken)
    {
        // Step 1: Validate and get dependencies
        var snippet = await repository.GetByIdAsync(request.Id, cancellationToken);

        // Step 2: Apply business logic
        snippet.SnippetText = request.SnippetText;

        // Step 3: Save and return result
        var saved = await repository.CreateOrUpdateAsync(snippet, cancellationToken);
        return new SaveSnippetCommandResult { Id = saved.Id };
    }
}

// Service Layer - API controllers
[ApiController]
[Route("api/[controller]")]
public class TextSnippetController : PlatformBaseController
{
    [HttpPost]
    public async Task<IActionResult> SaveSnippet([FromBody] SaveSnippetCommand command)
        => Ok(await Cqrs.SendAsync(command));
}
```

## Repository Pattern

### Priority Order (CRITICAL)

```csharp
// 1. ALWAYS prioritize microservice-specific repositories
ITextSnippetRootRepository<TextSnippetEntity>    // TextSnippet service
IUserRootRepository<UserEntity>                  // TextSnippet service (User entities)

// 2. Alternative: Platform generic repositories (when service-specific not available)
IPlatformQueryableRootRepository<Entity, Key>

// 3. Best Practice: Create service-specific repository extensions
public static class TextSnippetRepositoryExtensions
{
    public static async Task<TextSnippetEntity> GetByIdValidatedAsync(
        this ITextSnippetRootRepository<TextSnippetEntity> repository,
        string id, CancellationToken cancellationToken = default)
    {
        return await repository.GetByIdAsync(id, cancellationToken)
            .EnsureFound($"Snippet not found: Id={id}");
    }
}
```

### Repository API Reference

```csharp
// CREATE
await repository.CreateAsync(entity, cancellationToken);
await repository.CreateManyAsync(entities, cancellationToken);

// UPDATE
await repository.UpdateAsync(entity, cancellationToken);
await repository.UpdateManyAsync(entities, dismissSendEvent: false, checkDiff: true, ct);

// CREATE OR UPDATE (Upsert)
await repository.CreateOrUpdateAsync(entity, cancellationToken);
await repository.CreateOrUpdateManyAsync(entities, cancellationToken);

// DELETE
await repository.DeleteAsync(entityId, cancellationToken);
await repository.DeleteManyAsync(entities, cancellationToken);
await repository.DeleteManyAsync(expr => expr.Status == Status.Deleted, ct);
```

### Index Configuration Patterns

#### MongoDB Index Setup

```csharp
// In DbContext class
public async Task EnsureTextSnippetIndexesAsync(bool recreate = false)
{
    if (recreate) await TextSnippetCollection.Indexes.DropAllAsync();

    await TextSnippetCollection.Indexes.CreateManyAsync([
        // Single field index
        new CreateIndexModel<TextSnippetEntity>(
            Builders<TextSnippetEntity>.IndexKeys.Ascending(p => p.CategoryId)),

        // Compound index (order matters for leftmost prefix rule)
        new CreateIndexModel<TextSnippetEntity>(
            Builders<TextSnippetEntity>.IndexKeys
                .Ascending(p => p.CategoryId)
                .Ascending(p => p.Status)),

        // Unique constraint index
        new CreateIndexModel<TextSnippetEntity>(
            Builders<TextSnippetEntity>.IndexKeys
                .Ascending(p => p.CategoryId)
                .Ascending(p => p.SnippetText),
            new CreateIndexOptions { Unique = true }),

        // Text index for full-text search
        new CreateIndexModel<TextSnippetEntity>(
            Builders<TextSnippetEntity>.IndexKeys
                .Text(p => p.SnippetText)
                .Text(p => p.FullText),
            new CreateIndexOptions { Name = "IX_TextSnippet_TextSearch" })
    ]);
}
```

**Index Selection Strategy:**

1. **Identify query patterns:** Analyze most frequent expressions in repository calls
2. **Field order:** Most selective fields first (e.g., `CategoryId` before `Status`)
3. **Leftmost prefix:** `CategoryId+Status` index supports `CategoryId` alone, but not `Status` alone
4. **Text vs Regular:** Use text indexes only for full-text search, not exact match

#### EF Core Index Configuration

```csharp
// In Entity Configuration (OnModelCreating)
builder.Entity<TextSnippetEntity>(entity =>
{
    // Composite index
    entity.HasIndex(e => new { e.CategoryId, e.Status })
        .HasDatabaseName("IX_TextSnippet_Category_Status");

    // Unique index
    entity.HasIndex(e => new { e.CategoryId, e.SnippetText })
        .IsUnique()
        .HasDatabaseName("IX_TextSnippet_Category_Text_Unique");

    // Foreign key index (auto-created)
    entity.HasOne(e => e.SnippetCategory)
        .WithMany(c => c.TextSnippets)
        .HasForeignKey(e => e.CategoryId);
});
```

**Migration Best Practices:**

- Foreign keys auto-generate indexes (no manual `CreateIndex` needed)
- Composite indexes should match query filter order
- Use descriptive names: `IX_{Table}_{Purpose}` (e.g., `IX_TextSnippet_Category_Status`)

```csharp
// GET BY ID
var entity = await repository.GetByIdAsync(id, cancellationToken);
// With eager loading
var entity = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: p => p.SnippetCategory, p => p.CreatedByUser);

// GET SINGLE
var entity = await repository.FirstOrDefaultAsync(expr, cancellationToken);
var entity = await repository.GetSingleOrDefaultAsync(expr, cancellationToken);

// GET MULTIPLE
var entities = await repository.GetAllAsync(expr, cancellationToken);
var entities = await repository.GetByIdsAsync(ids, cancellationToken);

// QUERY BUILDERS (Reusable Queries)
var queryBuilder = repository.GetQueryBuilder((uow, query) =>
    query.Where(...).OrderBy(...));

// COUNT & EXISTS
var count = await repository.CountAsync(expr, cancellationToken);
var exists = await repository.AnyAsync(expr, cancellationToken);
```

## Validation Patterns

```csharp
// Basic Sync Validation - Use PlatformValidationResult fluent API
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 18, "Must be 18 or older")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required");
}

// Async Validation - Override ValidateRequestAsync
protected override async Task<PlatformValidationResult<SaveSnippetCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveSnippetCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async request => await snippetRepository
            .GetByIdsAsync(request.RelatedIds, cancellationToken)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(request.RelatedIds,
                notFoundIds => $"Not found: {notFoundIds}"));
}

// Negative Validation - AndNotAsync
return await requestSelfValidation.AndNotAsync(
    request => snippetRepository.AnyAsync(
        p => request.Ids.Contains(p.Id) && p.Status == SnippetStatus.Archived, ct),
    "Archived snippets can't be modified");

// Ensure Pattern - Inline validation that throws
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Entity not found: {id}")
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());
```

**Naming Conventions:**

| Pattern                  | Return Type                   | Behavior                     |
| ------------------------ | ----------------------------- | ---------------------------- |
| `Validate[Context]()`    | `PlatformValidationResult<T>` | Never throws, returns result |
| `Ensure[Context]Valid()` | `void` or `T`                 | Throws if invalid            |

## CQRS Implementation Patterns

> **CRITICAL:** Command/Query + Handler + Result: ALL in ONE file

```csharp
// File: SaveEntityCommand.cs - Contains Command + Result + Handler

// COMMAND
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required");
    }
}

// COMMAND RESULT (stays in same file)
public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult
{
    public EntityDto Entity { get; set; } = null!;
}

// COMMAND HANDLER
internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    private readonly ITextSnippetRootRepository<Entity> repository;

    protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(PlatformValidationResult<SaveEntityCommand> v, CancellationToken ct)
        => await v.AndAsync(r => repository.GetByIdsAsync(r.RelatedIds, ct).ThenValidateFoundAllAsync(r.RelatedIds, ids => $"Not found: {ids}"));

    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req, CancellationToken ct)
    {
        // 1. Get or create
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // 2. Save
        var saved = await repository.CreateOrUpdateAsync(entity, ct);
        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

### Query Pattern with GetQueryBuilder

```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}

internal sealed class GetEntityListQueryHandler :
    PlatformCqrsQueryApplicationHandler<GetEntityListQuery, GetEntityListQueryResult>
{
    protected override async Task<GetEntityListQueryResult> HandleAsync(
        GetEntityListQuery req, CancellationToken ct)
    {
        // Build reusable query
        var queryBuilder = repository.GetQueryBuilder((uow, q) => q
            .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
            .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
            .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
                searchService.Search(q, req.SearchText, Entity.SearchColumns())));

        // Parallel tuple queries
        var (total, items) = await (
            repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
            repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
                .OrderByDescending(e => e.CreatedDate)
                .PageBy(req.SkipCount, req.MaxResultCount), ct)
        );

        return new GetEntityListQueryResult(items, total, req);
    }
}
```

## Navigation Property Loading

> Load related entities via `[PlatformNavigationProperty]` attribute for repositories where the underlying persistence doesn't natively support eager loading (e.g., MongoDB). For EF Core, use `loadRelatedEntities` parameter.

### Entity Definition

```csharp
public class TextSnippetEntity : RootEntity<TextSnippetEntity, string>
{
    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 1: Forward Navigation (FK on THIS entity)
    // ═══════════════════════════════════════════════════════════════════
    public string? CategoryId { get; set; }

    // Single navigation - auto-ignored in BSON for MongoDB, manual [JsonIgnore] if needed for API
    [JsonIgnore]
    [PlatformNavigationProperty(nameof(CategoryId))]
    public TextSnippetCategory? SnippetCategory { get; set; }

    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 2: Collection via FK List (parent has List<TKey>)
    // ═══════════════════════════════════════════════════════════════════
    public List<string> TagIds { get; set; } = [];

    [JsonIgnore]
    [PlatformNavigationProperty(nameof(TagIds), Cardinality = PlatformNavigationCardinality.Collection)]
    public List<Tag>? Tags { get; set; }

    // ═══════════════════════════════════════════════════════════════════
    // PATTERN 3: Reverse Navigation (child has FK pointing to parent)
    // ═══════════════════════════════════════════════════════════════════
    // Load children where child.ParentSnippetId == this.Id
    [JsonIgnore]
    [PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(TextSnippetEntity.ParentSnippetId))]
    public List<TextSnippetEntity>? ChildSnippets { get; set; }

    public string? ParentSnippetId { get; set; }  // FK for reverse nav from Parent

    [JsonIgnore]
    [PlatformNavigationProperty(nameof(ParentSnippetId))]
    public TextSnippetEntity? ParentSnippet { get; set; }
}
```

### Loading via Repository (Recommended)

```csharp
// ═══════════════════════════════════════════════════════════════════
// SINGLE ENTITY - with navigation expressions
// ═══════════════════════════════════════════════════════════════════
// Single level
var snippet = await repository.GetByIdAsync(id, ct, loadRelatedEntities: e => e.SnippetCategory!);

// Deep navigation (2-3 levels)
var snippet = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.SnippetCategory!.ParentCategory!.ParentCategory!);

// Multiple navigations in one call
var snippet = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: e => e.SnippetCategory!, e => e.SnippetCategory!.ParentCategory!);

// ═══════════════════════════════════════════════════════════════════
// REVERSE NAVIGATION - load children where child.FK == parent.Id
// ═══════════════════════════════════════════════════════════════════
// All children
var parent = await repository.GetByIdAsync(id, ct, loadRelatedEntities: c => c.ChildSnippets!);

// With .Where() filter - only active children
var parent = await repository.GetByIdAsync(id, ct,
    loadRelatedEntities: c => c.ChildSnippets!.Where(child => child.Status == SnippetStatus.Active));

// ═══════════════════════════════════════════════════════════════════
// BATCH LOADING - N+1 prevention at all levels
// ═══════════════════════════════════════════════════════════════════
// Single level batch
var snippets = await repository.GetByIdsAsync(ids, ct, loadRelatedEntities: e => e.SnippetCategory!);

// Deep navigation batch
var snippets = await repository.GetByIdsAsync(ids, ct,
    loadRelatedEntities: e => e.SnippetCategory!.ParentCategory!);

// Reverse navigation batch - single query for all parents
var parents = await repository.GetByIdsAsync(parentIds, ct,
    loadRelatedEntities: c => c.ChildSnippets!.Where(child => child.Status == SnippetStatus.Active));
```

### Manual Loading (Alternative)

```csharp
// Single entity - resolver auto-injected by repository
var snippet = await repository.GetByIdAsync(id, ct);
await snippet.LoadNavigationAsync(e => e.SnippetCategory, ct);

// Batch loading - single DB call for N+1 prevention
var snippets = await repository.GetAllAsync(expr, ct);
await snippets.LoadNavigationAsync(e => e.SnippetCategory, resolver, ct);

// Collection loading (one-to-many via FK list)
await snippet.LoadCollectionNavigationAsync(e => e.Tags, ct);
```

### Attribute Options

| Option                      | Default  | Description                                                 |
| --------------------------- | -------- | ----------------------------------------------------------- |
| `ForeignKeyProperty`        | `""`     | FK property on THIS entity (e.g., `nameof(CategoryId)`)     |
| `ReverseForeignKeyProperty` | `null`   | FK property on RELATED entity pointing to this entity       |
| `Cardinality`               | `Single` | `Single` = TKey FK, `Collection` = `List<TKey>` FK          |
| `MaxDepth`                  | `3`      | Max recursive loading depth (circular reference protection) |

### Two Collection Patterns

| Pattern         | Entity Definition                | Use Case                          |
| --------------- | -------------------------------- | --------------------------------- |
| **FK List**     | Parent has `List<TKey>` property | Many-to-many, explicit ID list    |
| **Reverse Nav** | Child has FK pointing to parent  | One-to-many, classic parent-child |

```csharp
// FK List Pattern: Snippet owns the relationship
public List<string> TagIds { get; set; } = [];
[PlatformNavigationProperty(nameof(TagIds), Cardinality = Collection)]
public List<Tag>? Tags { get; set; }

// Reverse Nav Pattern: Child owns the relationship
[PlatformNavigationProperty(ReverseForeignKeyProperty = nameof(TextSnippetEntity.CategoryId))]
public List<TextSnippetEntity>? CategorySnippets { get; set; }  // Loads where TextSnippetEntity.CategoryId == this.Id
```

### Key Behaviors

- **BsonIgnore:** Auto-set by MongoDB convention - no manual attribute needed
- **JsonIgnore:** Add manually if nav prop should be excluded from API responses
- **FK Not Found:** Silent null (no exception or warning)
- **Batch Loading:** Always overwrites existing nav prop values
- **Empty Collection:** Returns empty `List<T>`, never null, when no children found
- **Where Filter:** Only supported for reverse navigation collections
- **Cross-Service:** Not supported - use message bus instead
- **EF Core:** Use `loadRelatedEntities` parameter (same syntax works)

---

## Entity Development Patterns

```csharp
[TrackFieldUpdatedDomainEvent]
public sealed class TextSnippetEntity : RootEntity<TextSnippetEntity, string>
{
    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; } = "";
    public string? CategoryId { get; set; }

    [JsonIgnore]
    public TextSnippetCategory? SnippetCategory { get; set; }

    // Static expression patterns
    public static Expression<Func<TextSnippetEntity, bool>> UniqueExpr(string? categoryId, string snippetText)
        => e => e.CategoryId == categoryId && e.SnippetText == snippetText;

    public static Expression<Func<TextSnippetEntity, bool>> SearchableSnippetsExpr(string categoryId, bool includeArchived = false)
        => OfCategoryExpr(categoryId).AndAlsoIf(!includeArchived, () => e => e.Status == SnippetStatus.Active);

    // Search columns
    public static Expression<Func<TextSnippetEntity, object?>>[] DefaultFullTextSearchColumns()
        => [e => e.SnippetText, e => e.FullText, e => e.Address];

    // Computed properties - MUST have empty set { } for EF Core
    [ComputedEntityProperty]
    public string DisplayTitle
    {
        get => $"{SnippetText}".Trim();
        set { }  // Required empty setter
    }
}
```

## Entity DTO Patterns

> Reusable Entity DTOs MUST extend `PlatformEntityDto<TEntity, TKey>`

```csharp
public class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, string>
{
    public TextSnippetEntityDto() { }

    public TextSnippetEntityDto(TextSnippetEntity entity) : base(entity)
    {
        Id = entity.Id;
        SnippetText = entity.SnippetText ?? "";
        FullText = entity.FullText ?? "";
    }

    public string? Id { get; set; }
    public string SnippetText { get; set; } = "";
    public string FullText { get; set; } = "";

    // Optional load properties (via With* methods)
    public TextSnippetCategoryDto? Category { get; set; }

    // With* fluent methods
    public TextSnippetEntityDto WithCategory(TextSnippetCategory category)
    {
        Category = new TextSnippetCategoryDto(category);
        return this;
    }

    // Platform overrides
    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
    {
        entity.SnippetText = SnippetText;
        return entity;
    }
}
```

## Event-Driven Side Effects (CRITICAL)

> **NEVER call side effects directly in command handlers.** Use entity events instead.

```csharp
// WRONG: Direct side effect in handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    var entity = await repository.CreateAsync(newEntity, ct);
    await notificationService.SendAsync(entity); // BAD!
    return new Result();
}

// CORRECT: Platform auto-raises events - handle in event handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(newEntity, ct);  // Event raised automatically
    return new Result();
}

// Event handler (in UseCaseEvents/ folder)
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => !@event.RequestContext.IsSeedingTestingData() && @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

## Background Job Patterns

```csharp
// Pattern 1: Simple Paged
[PlatformRecurringJob("0 3 * * *")]
public sealed class SimpleJob : PlatformApplicationPagedBackgroundJobExecutor
{
    protected override int PageSize => 50;

    protected override async Task ProcessPagedAsync(int? skip, int? take,
        object? param, IServiceProvider sp, IPlatformUnitOfWorkManager uow)
    {
        var items = await repository.GetAllAsync(q => QueryBuilder(q).PageBy(skip, take));
        await items.ParallelAsync(async item => await ProcessItem(item));
    }
}

// Pattern 2: Batch Scrolling (multi-tenant)
[PlatformRecurringJob("0 0 * * *")]
public sealed class BatchJob : PlatformApplicationBatchScrollingBackgroundJobExecutor<Entity, string>
{
    protected override int BatchKeyPageSize => 50;  // Companies per page
    protected override int BatchPageSize => 25;      // Entities per company

    protected override IQueryable<Entity> EntitiesQueryBuilder(
        IQueryable<Entity> q, object? param, string? batchKey = null)
        => q.Where(BaseFilter()).WhereIf(batchKey != null, e => e.CompanyId == batchKey);
}

// Cron schedules
[PlatformRecurringJob("0 0 * * *")]              // Daily midnight
[PlatformRecurringJob("*/5 * * * *")]            // Every 5 min
[PlatformRecurringJob("5 0 * * *", executeOnStartUp: true)]  // Daily + startup
```

## Async Collection Processing

> **NEVER `await` in `foreach`.** Use `.ParallelAsync()`.

```csharp
// [MUST NOT] foreach (var item in items) await ProcessAsync(item);
// [CORRECT] await items.ParallelAsync(async item => await ProcessAsync(item));
```

## Message Bus Patterns

```csharp
internal sealed class UpsertOrDeleteEntityConsumer :
    PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        // Wait for dependencies
        var (companyMissing, userMissing) = await (
            Util.TaskRunner.TryWaitUntilAsync(
                () => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId),
                maxWaitSeconds: 300).Then(p => !p),
            Util.TaskRunner.TryWaitUntilAsync(
                () => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId),
                maxWaitSeconds: 300).Then(p => !p)
        );

        if (companyMissing || userMissing) return;

        // CREATE/UPDATE
        if (msg.Payload.CrudAction == Created ||
            (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            var existing = await repository.FirstOrDefaultAsync(
                e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity()
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing)
                    .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }

        // DELETE
        if (msg.Payload.CrudAction == Deleted ||
            (msg.Payload.CrudAction == Updated && msg.Payload.EntityData.IsDeleted))
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

**Message Naming Convention:**

| Type    | Producer Role | Pattern                                           | Example                                                    |
| ------- | ------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Event   | Leader        | `<ServiceName><Feature><Action>EventBusMessage`   | `TextSnippetEntityCreatedEventBusMessage`                  |
| Request | Follower      | `<ConsumerServiceName><Feature>RequestBusMessage` | `TextSnippetCategorySyncRequestBusMessage`                 |

## Data Migration Patterns

```csharp
public class MigrateData : PlatformDataMigrationExecutor<DbContext>
{
    public override string Name => "20251022000000_MigrateData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2025, 10, 22);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(DbContext dbContext)
    {
        var queryBuilder = repository.GetQueryBuilder(q => q.Where(FilterExpr()));
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            maxItemCount: await repository.CountAsync(q => queryBuilder(q)),
            pageSize: 200,
            ExecutePaging,
            queryBuilder);
    }

    private static async Task<List<Entity>> ExecutePaging(
        int skip, int take,
        Func<IQueryable<Entity>, IQueryable<Entity>> qb,
        IRepo<Entity> repo, IPlatformUnitOfWorkManager uow)
    {
        using var unitOfWork = uow.Begin();
        var items = await repo.GetAllAsync(q => qb(q).OrderBy(e => e.Id).Skip(skip).Take(take));
        await repo.UpdateManyAsync(items, dismissSendEvent: true, checkDiff: false, ct: default);
        await unitOfWork.CompleteAsync();
        return items;
    }
}
```

## Full-Text Search Patterns

```csharp
// Inject IPlatformFullTextSearchPersistenceService in query handlers
var queryBuilder = snippetRepository.GetQueryBuilder(query =>
    query
        .Where(TextSnippetEntity.SearchableSnippetsExpr(categoryId))
        .PipeIf(
            request.SearchText.IsNotNullOrEmpty(),
            query => fullTextSearchPersistenceService.Search(
                query,
                request.SearchText,
                TextSnippetEntity.DefaultFullTextSearchColumns(),
                fullTextAccurateMatch: true,
                includeStartWithProps: TextSnippetEntity.DefaultFullTextSearchColumns()
            )
        )
);

// Define searchable columns in entity
public static Expression<Func<TextSnippetEntity, object>>[] DefaultFullTextSearchColumns()
{
    return new Expression<Func<TextSnippetEntity, object>>[]
    {
        e => e.SnippetText,
        e => e.FullText,
        e => e.Address
    };
}
```

## Authorization Patterns

```csharp
// Controller level
[PlatformAuthorize(PlatformRoles.Admin, PlatformRoles.Manager)]
[HttpPost]
public async Task<IActionResult> Save([FromBody] SaveCommand cmd)
    => Ok(await Cqrs.SendAsync(cmd));

// Handler validation
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndNotAsync(_ => !RequestContext.HasRole(PlatformRoles.Admin), "Admin only")
        .AndAsync(_ => repository.AnyAsync(
            e => e.CompanyId == RequestContext.CurrentCompanyId()), "Same company only");
}

// Entity-level query filter
public static Expression<Func<TextSnippetEntity, bool>> UserCanAccessExpr(string userId)
    => e => e.CreatedBy == userId || e.Status == SnippetStatus.Active;
```

## Helper vs Util Decision Guide

```
Business Logic with Dependencies (DB, Services)?
├── YES → Helper (Application layer, injectable service)
│   └── Location: PlatformExampleApp.TextSnippet.Application\Helpers\SnippetHelper.cs
└── NO → Util (Pure functions, static class)
    └── Location: Easy.Platform.Application.Utils

Cross-Cutting Logic (used in multiple domains)?
├── YES → Platform Util (Easy.Platform.Application.Utils)
└── NO → Domain Util (PlatformExampleApp.TextSnippet.Application.Utils)
```

## Repository Extension Patterns

```csharp
public static class TextSnippetRepositoryExtensions
{
    public static async Task<TextSnippetEntity> GetByUniqueExprAsync(this ITextSnippetRootRepository<TextSnippetEntity> repo, string? categoryId, string snippetText, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(TextSnippetEntity.UniqueExpr(categoryId, snippetText), ct).EnsureFound();

    public static async Task<List<TextSnippetEntity>> GetByIdsValidatedAsync(this ITextSnippetRootRepository<TextSnippetEntity> repo, List<string> ids, CancellationToken ct = default)
        => await repo.GetAllAsync(p => ids.Contains(p.Id), ct).EnsureFoundAllBy(p => p.Id, ids);

    public static async Task<string?> GetIdByUniqueExprAsync(this ITextSnippetRootRepository<TextSnippetEntity> repo, string? categoryId, string snippetText, CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(q => q.Where(TextSnippetEntity.UniqueExpr(categoryId, snippetText)).Select(p => p.Id), ct);
}
```

## Validation Advanced Patterns

```csharp
// Chained with Of<> terminal cast
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => this.Validate(p => p.Id.IsNotNullOrEmpty(), "Id required")
        .And(p => p.FromDate <= p.ToDate, "Invalid range")
        .Of<IPlatformCqrsRequest>();

// Inline ensure chain
var entity = await repo.GetByIdAsync(id, ct).EnsureFound($"Not found: {id}").Then(x => x.Validate().EnsureValid());
```

## Cross-Service Event Producer

```csharp
// Producer registration (consumer patterns in Message Bus section above)
public class TextSnippetEventProducer : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippetEntity, string> { }
```

## Fluent Helper Reference

```csharp
.With(e => e.Name = x).WithIf(cond, e => e.Status = Active)
.Then(e => e.Process()).ThenAsync(async e => await e.ValidateAsync(ct))
.EnsureFound("Not found").EnsureFoundAllBy(x => x.Id, ids).EnsureValidAsync()
.AndAlso(expr).AndAlsoIf(cond, () => expr).OrElse(expr)
.ThenSelect(e => e.Id).ParallelAsync(async i => await Process(i), maxConcurrent: 10)
.PipeActionIf(cond, e => e.Update()).PipeActionAsyncIf(async () => await svc.Any(), async e => await e.Sync())

var (entity, files) = await (repo.CreateOrUpdateAsync(e, ct), files.ParallelAsync(f => Upload(f, ct)));
var (a, b, c) = await (repo1.GetAllAsync(...), repo2.GetAllAsync(...), repo3.GetAllAsync(...));
```

## Advanced Entity Patterns

```csharp
// Async expression with external dependency
public static async Task<Expression<Func<Entity, bool>>> FilterWithLicenseExprAsync(IRepository<License> licenseRepo, string companyId, CancellationToken ct = default)
{
    var hasLicense = await licenseRepo.HasLicenseAsync(companyId, ct);
    return hasLicense ? PremiumFilterExpr() : StandardFilterExpr();
}

// FilterExpr with ToHashSet() for O(1) lookup
public static Expression<Func<Entity, bool>> FilterExpr(List<Status> s) => e => s.ToHashSet().Contains(e.Status!.Value);

// Static self-validation returning message list
public static List<string> ValidateEntity(Entity? e) => e == null ? ["Not found"] : !e.IsActive ? ["Inactive"] : [];
```

## Background Job Advanced Patterns

```csharp
// Cron expression reference:
// "0 0 * * *"    = Daily midnight     | "0 3 * * *"    = Daily 3 AM
// "*/5 * * * *"  = Every 5 min        | "0 0 * * 0"    = Weekly Sunday midnight
// "0 0 1 * *"    = Monthly 1st midnight

// Scrolling pattern (data affected by processing, always queries from start)
public override async Task ProcessAsync(Param p) => await UnitOfWorkManager.ExecuteInjectScopedScrollingPagingAsync<Entity>(
    ExecutePaged, await repo.CountAsync(q => Query(q, p)) / PageSize, p, PageSize);

// Job coordination (master schedules child jobs)
await companies.ParallelAsync(async cId => await DateRangeBuilder.BuildDateRange(start, end).ParallelAsync(date =>
    BackgroundJobScheduler.Schedule<ChildJob, Param>(Clock.UtcNow, new Param { CompanyId = cId, Date = date })));
```

## MongoDB Migration Patterns

```csharp
// Simple MongoDB migration (NO DI — PlatformMongoMigrationExecutor has NO RootServiceProvider)
public class MigrateData : PlatformMongoMigrationExecutor<TextSnippetMongoDbContext>
{
    public override string Name => "20240115_Migrate";
    public override DateTime? OnlyForDbInitBeforeDate => new DateTime(2024, 01, 15);
    public override async Task Execute(TextSnippetMongoDbContext dbContext)
    {
        await dbContext.InternalEnsureIndexesAsync(recreate: true);
    }
}

// MongoDB migration WITH DI (needs cross-DB access) — use PlatformDataMigrationExecutor<MongoDbContext>
public class SyncExternalData : PlatformDataMigrationExecutor<TextSnippetMongoDbContext>
{
    public override string Name => "20260206_SyncExternalData";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2026, 02, 06);
    public override bool AllowRunInBackgroundThread => true;
    public override async Task Execute(TextSnippetMongoDbContext dbContext) =>
        await RootServiceProvider.ExecuteInjectScopedPagingAsync(
            await dbContext.GetQuery<TextSnippetEntity>().CountAsync(), 100, MigratePaging);
}
```

## Advanced Backend Utilities

```csharp
.IsNullOrEmpty() / .IsNotNullOrEmpty() / .RemoveWhere(pred, out removed) / .UpsertBy(key, items, update) / .SelectList(sel) / .ThenSelect(sel) / .ParallelAsync(fn, max) / .AddDistinct(item, key)

var entity = dto.NotHasSubmitId() ? dto.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId()) : await repo.GetByIdAsync(dto.Id, ct).Then(x => dto.UpdateToEntity(x));

RequestContext.CurrentCompanyId() / .UserId() / .ProductScope() / .HasRequestAdminRoleInCompany()

public sealed class Helper : IPlatformHelper { private readonly IPlatformApplicationRequestContext ctx; public Helper(IPlatformApplicationRequestContextAccessor a) { ctx = a.Current; } }

public static Expression<Func<E, bool>> ComplexExpr(int s, string c, int? m) => BaseExpr(s, c).AndAlso(e => e.User!.IsActive).AndAlsoIf(m != null, () => e => e.Start <= Clock.UtcNow.AddMonths(-m!.Value));

// Domain Service Pattern (strategy for permissions)
public static class PermissionService {
    static readonly Dictionary<string, IRoleBasedPermissionCheckHandler> RoleHandlers = ...;
    public static Expression<Func<E, bool>> GetCanManageExpr(IList<string> roles) => roles.Aggregate(e => false, (expr, role) => expr.OrElse(RoleHandlers[role].GetExpr()));
}

// Object Deep Comparison
if (prop.GetValue(entity).IsValuesDifferent(prop.GetValue(existing))) entity.AddFieldUpdatedEvent(prop, oldVal, newVal);

// Task Extensions
task.WaitResult();  // NOT task.Wait() — preserves stack trace
await target.WaitUntilGetValidResultAsync(t => repo.GetByIdAsync(t.Id), r => r != null, maxWaitSeconds: 30);
.ThenGetWith(selector)  // Returns (T, T1)
.ThenIfOrDefault(condition, nextTask, defaultValue)
```

## Anti-Patterns (CRITICAL)

```csharp
// [MUST NOT] Direct cross-service DB access → Use message bus
// [MUST NOT] Custom repository interface → Use platform repo + extensions
// [MUST NOT] Manual validation throw → Use PlatformValidationResult fluent API
// [MUST NOT] Side effects in handler → Use entity event handlers
// [MUST NOT] DTO mapping in handler → DTO owns mapping via MapToObject()/MapToEntity()
// [MUST NOT] await in foreach → items.ParallelAsync(async item => await Process(item))

// [CORRECT] DTO mapping
public sealed class ConfigDto : PlatformDto<ConfigValue> { public override ConfigValue MapToObject() => new() { ClientId = ClientId }; }
var config = req.Config.MapToObject().With(p => p.Secret = encrypt(p.Secret));
```

## Templates

```csharp
public sealed class Save{E}Command : PlatformCqrsCommand<Save{E}CommandResult> { public string Name { get; set; } = ""; public override PlatformValidationResult<IPlatformCqrsRequest> Validate() => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Required"); }
internal sealed class Save{E}CommandHandler : PlatformCqrsCommandApplicationHandler<Save{E}Command, Save{E}CommandResult> { protected override async Task<Save{E}CommandResult> HandleAsync(Save{E}Command r, CancellationToken ct) { /* impl */ } }
```

---

## Integration Testing

Subcutaneous integration tests that boot the full DI container (real DB, real RabbitMQ, no HTTP layer). Tests dispatch CQRS commands/queries directly and assert database state.

> **Prerequisite:** The full backend system must be running before executing tests. Tests rely on real infrastructure (MongoDB, RabbitMQ, Redis, PostgreSQL) and running API services for cross-service data sync (message bus consumers, event handlers). Local: start via `src/start-dev-platform-example-app.cmd` and wait for all services to be healthy.

### Architecture (3-Layer Stack)

```
Platform (Easy.Platform.AutomationTest)     <- Generic, reusable across any project
  ├─ PlatformServiceIntegrationTestFixture<TModule>   xUnit fixture: DI bootstrap + module init + seeding
  ├─ PlatformServiceIntegrationTestBase<TModule>      Test base: Execute*, BeforeExecute*, static SP per closed generic
  ├─ PlatformServiceIntegrationTestWithAssertions<T>  Adds AssertEntity* helpers via abstract ResolveRepository<T>
  ├─ PlatformCrossServiceFixture                      Composes N service fixtures (sequential init, reverse dispose)
  ├─ PlatformIntegrationTestHelper                    Static: UniqueName, UniqueId, UniqueEmail, WaitUntilAsync
  ├─ PlatformAssertDatabaseState                      Static: EntityExistsAsync, EntityMatchesAsync, EntityDeletedAsync
  └─ PlatformIntegrationTestDataSeeder                Abstract: idempotent SeedAsync contract

Service (e.g., PlatformExampleApp.Tests.Integration)     <- Domain-specific test project
  ├─ TextSnippetIntegrationTestFixture                    Boots TextSnippetApiAspNetCoreModule, seeds via data seeder
  ├─ TextSnippetServiceIntegrationTestBase                ResolveRepository → ITextSnippetRootRepository<T>, domain helpers
  └─ TextSnippetIntegrationTestDataSeeder                 Seeds TextSnippetCategory, sample TextSnippets
```

### Platform Class Quick Reference

| Class                                             | Purpose                                                                              | Key Methods                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `PlatformServiceIntegrationTestFixture<T>`        | xUnit `ICollectionFixture` — builds DI, calls `module.InitializeAsync()`, seeds data | `BuildConfiguration()`, `SeedDataAsync()`, `ConfigureAdditionalServices()`                      |
| `PlatformServiceIntegrationTestBase<T>`           | Test base — static SP per closed generic, scoped execution                           | `ExecuteCommandAsync`, `ExecuteQueryAsync`, `ExecuteWithServicesAsync`, `BeforeExecuteAnyAsync` |
| `PlatformServiceIntegrationTestWithAssertions<T>` | Adds entity assertions via abstract repo hook                                        | `AssertEntityExistsAsync`, `AssertEntityMatchesAsync`, `AssertEntityDeletedAsync`               |
| `PlatformCrossServiceFixture`                     | Composes multiple service fixtures                                                   | `GetFixtureTypes()` (abstract), `GetFixture<T>()`, `GetServiceProvider<TModule>()`              |
| `PlatformIntegrationTestHelper`                   | Static utilities for unique test data + polling                                      | `UniqueName()`, `UniqueEmail()`, `WaitUntilAsync()` (5s default, 100ms poll)                    |
| `PlatformAssertDatabaseState`                     | Static eventual-consistency assertions (fresh scope per poll)                        | `EntityExistsAsync<TEntity, TRepo>`, `EntityMatchesAsync`, `EntityDeletedAsync`                 |
| `PlatformIntegrationTestDataSeeder`               | Abstract seeder contract for test-specific data                                      | `SeedAsync(IServiceProvider)`                                                                   |

### Two-Level Data Seeding

Integration tests use two seeder layers that run in sequence during fixture initialization:

**Layer 1 — Application Data Seeder** (`PlatformApplicationDataSeeder`): Runs during `module.InitializeAsync()` — seeds production-like reference data (admin users, categories, sample data). Lives in the service's Application layer. Configured via `SeedAutomationTestingData` appsetting.

- Example: `TextSnippetApplicationDataSeeder` in `PlatformExampleApp.TextSnippet.Application/DataSeeders/`

**Layer 2 — Integration Test Data Seeder** (`PlatformIntegrationTestDataSeeder`): Runs in `SeedDataAsync()` after module init — seeds test-specific data (snippet categories, sample snippets). Lives in the test project.

- Example: `TextSnippetIntegrationTestDataSeeder` in `PlatformExampleApp.Tests.Integration/`

Both layers use idempotent `FirstOrDefault + create-if-missing` pattern — safe for repeated runs without teardown.

### Single-Service Test Setup

```csharp
// 1. Fixture: boots DI container and seeds data
public class TextSnippetIntegrationTestFixture
    : PlatformServiceIntegrationTestFixture<TextSnippetApiAspNetCoreModule>
{
    public override string FallbackAspCoreEnvironmentValue() => "Development";
    protected override Task SeedDataAsync(IServiceProvider sp)
        => new TextSnippetIntegrationTestDataSeeder().SeedAsync(sp);
}

// 2. Collection: shares one fixture across all test classes
[CollectionDefinition(Name)]
public class TextSnippetIntegrationTestCollection : ICollectionFixture<TextSnippetIntegrationTestFixture>
{ public const string Name = "TextSnippet Integration Tests"; }

// 3. Test base: resolves service-specific repo, sets up request context
public class TextSnippetServiceIntegrationTestBase
    : PlatformServiceIntegrationTestWithAssertions<TextSnippetApiAspNetCoreModule>
{
    protected override IPlatformRepository<TEntity, string> ResolveRepository<TEntity>(IServiceProvider sp)
        => sp.GetRequiredService<ITextSnippetRootRepository<TEntity>>();
}

// 4. Test class
[Collection(TextSnippetIntegrationTestCollection.Name)]
public class SaveSnippetCommandIntegrationTests : TextSnippetServiceIntegrationTestBase
{
    [Fact]
    public async Task SaveSnippet_WhenValid_ShouldCreate()
    {
        var result = await ExecuteCommandAsync(new SaveSnippetCommand { ... },
            TestUserContextFactory.CreateEmployee());
        await AssertEntityMatchesAsync<TextSnippetEntity>(result.Id, s => s.SnippetText.Should().Be(expected));
    }
}
```

### Cross-Service Test Setup

For tests spanning multiple microservices (e.g., Service A creates entity, Service B syncs via message bus):

```csharp
// Each service gets its own fixture with isolated config
public class CrossServiceTextSnippetFixture : TextSnippetIntegrationTestFixture
{
    protected override IConfiguration BuildConfiguration()
        => new ConfigurationBuilder().AddJsonFile("appsettings.TextSnippet.json").Build();
}

// Compose fixtures using PlatformCrossServiceFixture
public class CrossServiceFixture : PlatformCrossServiceFixture
{
    protected override IReadOnlyList<Type> GetFixtureTypes()
        => [typeof(CrossServiceTextSnippetFixture), typeof(CrossServiceOtherServiceFixture)];
    public IServiceProvider TextSnippetServiceProvider => GetFixture<CrossServiceTextSnippetFixture>().ServiceProvider;
    public IServiceProvider OtherServiceProvider => GetFixture<CrossServiceOtherServiceFixture>().ServiceProvider;
}
```

**Config isolation:** Each service loads its own `appsettings.{Service}.json` to prevent collision when multiple modules boot in the same process.

### Test User Context Flow

```
TestUserContextFactory.CreateEmployee()    → TestUserContext { Roles, CompanyId, ... }
    ↓ passed as userContext to ExecuteCommandAsync
BeforeExecuteAnyAsync(accessor, userContext)     → PopulateFromTestUserContext(testContext, config)
    ↓ sets IPlatformApplicationRequestContextAccessor
Command handler reads context                   → CurrentUser, CompanyId, Roles available
```

### New Service Bootstrap Checklist

To add integration tests to a new microservice:

1. Create `{Service}.IntegrationTests` project referencing the service's `.Application` project + `Easy.Platform.AutomationTest`
2. Create `{Service}IntegrationTestFixture : PlatformServiceIntegrationTestFixture<{Service}ApiAspNetCoreModule>` with `SeedDataAsync` override
3. Create `{Service}ServiceIntegrationTestBase : PlatformServiceIntegrationTestWithAssertions<{Service}ApiAspNetCoreModule>` with `ResolveRepository` returning service-specific repo
4. Create `{Service}IntegrationTestDataSeeder : PlatformIntegrationTestDataSeeder` for test-specific seed data
5. Add `appsettings.json` + `appsettings.Development.json` with DB/RabbitMQ/Redis connection strings
6. Add `GlobalUsings.cs` with platform + shared imports
7. Add `Startup.cs` (no-op, required by `Xunit.DependencyInjection`)

> Full code templates for each file: see `.claude/skills/integration-test/references/integration-test-patterns.md`
