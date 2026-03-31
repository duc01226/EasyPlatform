<!-- Last scanned: 2026-03-15 -->

# Backend Patterns Reference

> Easy.Platform -- .NET 9 CQRS Framework | Scanned from `src/Backend/PlatformExampleApp.TextSnippet.*` and `src/Platform/Easy.Platform/`

## Quick Summary

**Goal:** Canonical backend patterns for Easy.Platform CQRS applications -- repository, command/query, validation, DTO mapping, events, messaging, migrations, jobs, and authorization.

**Key Rules:**

- **DTOs own mapping** -- `MapToEntity()` / `UpdateToEntity()` in DTO class, NEVER map in handlers
- **Side effects in event handlers** (`UseCaseEvents/`), NEVER in command handlers
- **Validation via fluent API** (`PlatformValidationResult`), NEVER throw exceptions directly
- **Repository interfaces** -- inject narrowest type: `IXxxRepository<T>` for reads, `IXxxRootRepository<T>` for writes
- **Cross-service communication** -- RabbitMQ message bus ONLY, never direct DB access
- **Logic in lowest layer** -- Entity > Service > Handler (validation, expressions, factory methods belong on Entity)

**Key Patterns Quick-Ref:**

| Pattern               | Base Class / Interface                                            | Location                         |
| --------------------- | ----------------------------------------------------------------- | -------------------------------- |
| Repository (read)     | `IPlatformQueryableRepository<TEntity, TId>`                      | `Domain/Repositories/`           |
| Repository (CRUD)     | `IPlatformQueryableRootRepository<TEntity, TId>`                  | `Domain/Repositories/`           |
| Command               | `PlatformCqrsCommand<TResult>`                                    | `UseCaseCommands/`               |
| Command Handler       | `PlatformCqrsCommandApplicationHandler<TCmd, TResult>`            | `UseCaseCommands/`               |
| Query                 | `PlatformCqrsQuery<TResult>` / `PlatformCqrsPagedQuery<T, TItem>` | `UseCaseQueries/`                |
| Query Handler         | `PlatformCqrsQueryApplicationHandler<TQuery, TResult>`            | `UseCaseQueries/`                |
| Entity DTO            | `PlatformEntityDto<TEntity, TKey>`                                | `Dtos/EntityDtos/`               |
| Value Object DTO      | `PlatformDto<T>`                                                  | `Dtos/`                          |
| Entity Event Handler  | `PlatformCqrsEntityEventApplicationHandler<TEntity>`              | `UseCaseEvents/`                 |
| Entity Event Producer | `PlatformCqrsEntityEventBusMessageProducer<TMsg, TEntity, TId>`   | `MessageBus/Producers/`          |
| Event Consumer        | `PlatformCqrsEntityEventBusMessageConsumer<TMsg, TEntity>`        | `MessageBus/Consumers/`          |
| Free-Format Message   | `PlatformTrackableBusMessage`                                     | `MessageBus/FreeFormatMessages/` |
| Background Job        | `PlatformApplicationBackgroundJobExecutor`                        | `BackgroundJob/`                 |
| Data Migration        | `PlatformDataMigrationExecutor<TDbContext>`                       | `DataMigrations/`                |
| Controller            | `PlatformBaseController`                                          | `Api/Controllers/`               |

---

## Table of Contents

1. [Repository Pattern](#repository-pattern)
2. [CQRS Patterns](#cqrs-patterns)
3. [Validation Patterns](#validation-patterns)
4. [Entity Patterns](#entity-patterns)
5. [DTO Mapping](#dto-mapping)
6. [Event Handlers](#event-handlers)
7. [Message Bus](#message-bus)
8. [Migrations](#migrations)
9. [Background Jobs](#background-jobs)
10. [Authorization](#authorization)

---

## Repository Pattern

### Interface Hierarchy

Domain projects define service-specific interfaces extending platform base interfaces.

| Interface                             | Purpose                                    | Base                                                                                   |
| ------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------- |
| `ITextSnippetRepository<TEntity>`     | Read-only queries for TextSnippet entities | `IPlatformQueryableRepository<TEntity, string>`                                        |
| `ITextSnippetRootRepository<TEntity>` | Full CRUD for root entities                | `IPlatformQueryableRootRepository<TEntity, string>`, `ITextSnippetRepository<TEntity>` |
| `IUserRepository<TEntity>`            | Read-only queries for User entities        | `IPlatformQueryableRepository<TEntity, string>`                                        |
| `IUserRootRepository<TEntity>`        | Full CRUD for root User entities           | `IPlatformQueryableRootRepository<TEntity, string>`, `IUserRepository<TEntity>`        |

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Repositories/ITextSnippetRepository.cs`

```csharp
public interface ITextSnippetRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new()
{
}

public interface ITextSnippetRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>, ITextSnippetRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new()
{
}
```

### Key Conventions

- **Read-only vs Root:** `IXxxRepository<T>` for queries (no write), `IXxxRootRepository<T>` for full CRUD
- **Generic entity param:** One interface for multiple entities (e.g., `ITextSnippetRootRepository<TextSnippetEntity>` and `ITextSnippetRootRepository<MultiDbDemoEntity>`)
- **Inject narrowest type:** Query handlers use `ITextSnippetRepository<T>` (read-only); command handlers use `ITextSnippetRootRepository<T>` (read-write)

### Query Builder Pattern

Repositories expose `GetQueryBuilder` for composable LINQ queries:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseQueries/SearchSnippetTextQuery.cs` (lines 121-146)

```csharp
var fullItemsQueryBuilder = repository.GetQueryBuilder(
    builderFn: query => query
        .Where(p => p.CreatedByUserId == RequestContext.UserId())
        .PipeIf(
            request.SearchText.IsNotNullOrEmpty(),
            _ => fullTextSearchPersistenceService.Search(query, request.SearchText, ...))
        .PipeIf(
            request.SearchAddress.IsNotNullOrEmpty(),
            e => e.Where(p => p.Addresses.Any(add => add.Street == request.SearchAddress)))
        .WhereIf(request.SearchId != null, p => p.Id == request.SearchId));
```

### Common Repository APIs

| Method                               | Purpose                       |
| ------------------------------------ | ----------------------------- |
| `GetAllAsync(queryBuilder, ct)`      | Query with builder function   |
| `FirstOrDefaultAsync(predicate, ct)` | Single entity lookup          |
| `AnyAsync(predicate, ct)`            | Existence check               |
| `CountAsync(queryBuilder, ct)`       | Count with query              |
| `CreateOrUpdateAsync(entity)`        | Upsert                        |
| `UpdateAsync(entity, ct)`            | Update existing               |
| `GetQueryBuilder(builderFn)`         | Composable LINQ query builder |

---

## CQRS Patterns

### File Organization

```
UseCaseCommands/
    SaveSnippetTextCommand.cs          # Command + Result + Handler in ONE file
    Category/
        SaveSnippetCategoryCommand.cs  # Grouped by subdomain
    Snippet/
        CloneSnippetCommand.cs
        BulkUpdateSnippetStatusCommand.cs
    TaskItem/
        SaveTaskItemCommand.cs
    OtherDemos/
        DemoSendFreeFormatEventBusMessageCommand.cs
UseCaseQueries/
    SearchSnippetTextQuery.cs
    GetMyTextSnippetsQuery.cs
    TaskItem/
        GetTaskListQuery.cs
```

**Convention:** Command, Result, and Handler co-located in a single file. Commands in `UseCaseCommands/`, queries in `UseCaseQueries/`.

### Command Structure

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/SaveSnippetTextCommand.cs`

```csharp
// 1. Command -- extends PlatformCqrsCommand<TResult>
public sealed class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult>
{
    public TextSnippetEntityDto Data { get; set; }
    public bool AutoCreateIfNotExisting { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this
            .Validate(p => Data != null, "Data must be not null.")
            .And(p => Data.MapToEntity().Validate().Of(p))
            .ThenValidate(p => p.JustDemoUsingValidateNot())
            .Of<IPlatformCqrsRequest>();
    }
}

// 2. Result -- extends PlatformCqrsCommandResult
public sealed class SaveSnippetTextCommandResult : PlatformCqrsCommandResult
{
    public TextSnippetEntityDto SavedData { get; set; }
}

// 3. Handler -- extends PlatformCqrsCommandApplicationHandler<TCommand, TResult>
internal sealed class SaveSnippetTextCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
{
    // Constructor with DI for repositories, services, logger
    // Override HandleAsync for business logic
    // Optional: Override ValidateRequestAsync for async validation
}
```

### Query Structure

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseQueries/SearchSnippetTextQuery.cs`

```csharp
// 1. Query -- extends PlatformCqrsPagedQuery<TResult, TItem> or PlatformCqrsQuery<TResult>
public sealed class SearchSnippetTextQuery : PlatformCqrsPagedQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
{
    public string SearchText { get; set; }
    public string SearchId { get; set; }
}

// 2. Result -- extends PlatformCqrsQueryPagedResult<TItem> or direct type
public sealed class SearchSnippetTextQueryResult : PlatformCqrsQueryPagedResult<TextSnippetEntityDto> { }

// 3. Handler -- extends PlatformCqrsQueryApplicationHandler<TQuery, TResult>
internal sealed class SearchSnippetTextQueryHandler
    : PlatformCqrsQueryApplicationHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
{
    // Injectable: requestContextAccessor, loggerFactory, serviceProvider, cacheRepositoryProvider, repositories
}
```

### Handler HandleAsync Pattern

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/SaveSnippetTextCommand.cs` (lines 299-316)

```csharp
protected override async Task<SaveSnippetTextCommandResult> HandleAsync(
    SaveSnippetTextCommand request, CancellationToken cancellationToken)
{
    // STEP 1: Build entity from request (create or update)
    var toSaveEntity = request.Data.HasSubmitId()
        ? await textSnippetEntityRepository.FirstOrDefaultAsync(p => p.Id == request.Data.Id, cancellationToken)
            .EnsureFound($"Has not found text snippet for id {request.Data.Id}")
            .Then(existingEntity => request.Data.UpdateToEntity(existingEntity))
        : request.Data.MapToNewEntity();

    // STEP 2: Validate with fluent chain
    var validToSaveEntity = await toSaveEntity
        .ValidateSavePermission(userId: RequestContext.UserId<string>())
        .And(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogic())
        .AndAsync(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogicAsync(...))
        .EnsureValidAsync();

    // STEP 3: Save and return
    // ...
}
```

### Controller Dispatch

Controllers extend `PlatformBaseController` and dispatch via `Cqrs.SendCommand()` / `Cqrs.SendQuery()`:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs`

```csharp
[Route("api/[controller]")]
[ApiController]
public class TextSnippetController : PlatformBaseController
{
    // Constructor injects: IPlatformCqrs, IPlatformCacheRepositoryProvider, IConfiguration, etc.

    [HttpGet, Route("search")]
    public async Task<SearchSnippetTextQueryResult> Search([FromQuery] SearchSnippetTextQuery request)
    {
        return await CacheRepositoryProvider.GetCollection<TextSnippetCollectionCacheKeyProvider>()
            .CacheRequestAsync(
                () => Cqrs.SendQuery(request),
                SearchSnippetTextQuery.BuildCacheRequestKeyParts(request, null, null),
                tags: [SearchSnippetTextQuery.BuildCacheRequestTag(...)]);
    }

    [HttpPost, Route("save")]
    public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
    {
        return await Cqrs.SendCommand(request);
    }
}
```

---

## Validation Patterns

### Two Levels of Validation

| Level                        | Where               | Method                   | Purpose                                  |
| ---------------------------- | ------------------- | ------------------------ | ---------------------------------------- |
| **Request self-validation**  | Command/Query class | `Validate()`             | Input validation (nulls, format, ranges) |
| **Async handler validation** | Handler class       | `ValidateRequestAsync()` | Database checks, business rules          |

### Request Self-Validation (Fluent API)

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/Category/SaveSnippetCategoryCommand.cs` (lines 42-51)

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Category != null, "Category data is required")
        .And(_ => Category.Name.IsNotNullOrEmpty(), "Category name is required")
        .And(_ => Category.Name.Length <= TextSnippetCategory.NameMaxLength,
            $"Category name must not exceed {TextSnippetCategory.NameMaxLength} characters")
        .And(
            _ => Category.Description.IsNullOrEmpty() || Category.Description!.Length <= TextSnippetCategory.DescriptionMaxLength,
            $"Description must not exceed {TextSnippetCategory.DescriptionMaxLength} characters");
}
```

### Async Handler Validation

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseCommands/Category/SaveSnippetCategoryCommand.cs` (lines 87-110)

```csharp
protected override async Task<PlatformValidationResult<SaveSnippetCategoryCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveSnippetCategoryCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndNotAsync(
            async request => await categoryRepository.ExistsByNameAsync(
                request.Category.ParentCategoryId, request.Category.Name,
                request.Category.Id, cancellationToken),
            "Category name already exists under the same parent")
        .AndAsync(
            async request => request.Category.ParentCategoryId.IsNullOrEmpty() ||
                             await categoryRepository.AnyAsync(c => c.Id == request.Category.ParentCategoryId, cancellationToken),
            "Parent category not found");
}
```

### Entity-Level Validation

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs` (lines 295-342)

```csharp
// Property-level validators (reusable)
public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
{
    return new PlatformSingleValidator<TextSnippetEntity, string>(
        p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));
}

// Composed entity validator
public override PlatformValidator<TextSnippetEntity> GetValidator()
{
    return PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());
}

// Business rule validators (return PlatformValidationResult)
public PlatformValidationResult<TextSnippetEntity> ValidateCanBePublished()
{
    return this.Validate(_ => Status != SnippetStatus.Published, "Snippet is already published")
        .And(_ => !IsDeleted, "Cannot publish a deleted snippet")
        .And(_ => SnippetText.IsNotNullOrEmpty(), "Snippet text is required to publish");
}

// Permission validators with exception type
public PlatformValidationResult<TextSnippetEntity> ValidateSavePermission(string userId)
{
    return SavePermissionValidator(userId).Validate(this).WithPermissionException();
}
```

### Fluent Validation API Reference

| Method                                | Purpose                                        |
| ------------------------------------- | ---------------------------------------------- |
| `.Validate(predicate, error)`         | First validation in chain                      |
| `.And(predicate, error)`              | Chain synchronous validation                   |
| `.AndAsync(asyncPredicate, error)`    | Chain async validation                         |
| `.AndNot(predicate, error)`           | Negative check (should NOT be true)            |
| `.AndNotAsync(asyncPredicate, error)` | Async negative check                           |
| `.ThenValidate(fn)`                   | Chain to another validation result             |
| `.Of<T>()`                            | Cast result type                               |
| `.EnsureValidAsync()`                 | Throw on invalid                               |
| `.WithPermissionException()`          | Throw `PlatformPermissionException` on invalid |
| `.WithDomainException()`              | Throw `PlatformDomainException` on invalid     |

### DO and DON'T

```csharp
// [MUST NOT] Throw exceptions for validation
if (data == null) throw new ArgumentException("Data required");

// DO: Use fluent validation
return this.Validate(p => Data != null, "Data must be not null.")
    .And(p => Data.MapToEntity().Validate().Of(p));
```

---

## Entity Patterns

### Base Classes

| Base Class                               | Purpose                                                | Example             |
| ---------------------------------------- | ------------------------------------------------------ | ------------------- |
| `RootAuditedEntity<TSelf, TId, TUserId>` | Root entity with audit fields (CreatedBy, LastUpdated) | `TextSnippetEntity` |
| `IRootEntity<TId>`                       | Marker for root entities (can be saved directly)       |                     |
| `IEntity<TId>`                           | Marker for non-root entities                           |                     |
| `IRowVersionEntity`                      | Adds concurrency control token                         | `TextSnippetEntity` |

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs` (line 22)

```csharp
[TrackFieldUpdatedDomainEvent]
public class TextSnippetEntity : RootAuditedEntity<TextSnippetEntity, string, string>, IRowVersionEntity
{
    public const int FullTextMaxLength = 4000;
    public const int SnippetTextMaxLength = 100;

    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; }

    [TrackFieldUpdatedDomainEvent]
    public string FullText { get; set; }
    // ...
}
```

### Computed Properties

Use `[ComputedEntityProperty]` for derived values. Empty setter required for EF Core.

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs` (lines 96-140)

```csharp
[ComputedEntityProperty]
public int WordCount
{
    get => SnippetText?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length ?? 0;
    set { } // Required empty setter for EF Core
}

[ComputedEntityProperty]
public bool IsPublished
{
    get => Status == SnippetStatus.Published && PublishedDate.HasValue;
    set { } // Required empty setter for EF Core
}
```

### Static Expression Pattern

Reusable LINQ expressions as static methods for repository queries:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs` (lines 144-218)

```csharp
// Simple filter
public static Expression<Func<TextSnippetEntity, bool>> OfCategoryExpr(string categoryId)
    => e => e.CategoryId == categoryId;

// Composite expression using AndAlso
public static Expression<Func<TextSnippetEntity, bool>> SearchableSnippetsExpr(string categoryId)
    => OfCategoryExpr(categoryId).AndAlso(IsActiveExpr());

// Conditional composite using AndAlsoIf
public static Expression<Func<TextSnippetEntity, bool>> FilterExpr(
    string? categoryId, List<SnippetStatus>? statuses = null, bool includeDeleted = false)
{
    return ((Expression<Func<TextSnippetEntity, bool>>)(e => true))
        .AndAlsoIf(categoryId.IsNotNullOrEmpty(), () => OfCategoryExpr(categoryId!))
        .AndAlsoIf(statuses?.Count > 0, () => FilterByStatusExpr(statuses!))
        .AndAlsoIf(!includeDeleted, () => e => !e.IsDeleted);
}
```

### Static Factory Methods

```csharp
public static TextSnippetEntity Create(string id, string snippetText, string fullText)
{
    return new TextSnippetEntity { Id = id, SnippetText = snippetText, FullText = fullText };
}
```

### Domain Events

Entities raise domain events via `AddDomainEvent()`:

```csharp
public TextSnippetEntity DemoDoSomeDomainEntityLogicAction_EncryptSnippetText()
{
    SnippetText = Convert.ToBase64String(SHA256.HashData(Encoding.UTF8.GetBytes(SnippetText)));
    AddDomainEvent(new EncryptSnippetTextDomainEvent { ... });
    return this;
}

// Nested domain event class
public class EncryptSnippetTextDomainEvent : ISupportDomainEventsEntity.DomainEvent
{
    public string OriginalSnippetText { get; set; }
    public string EncryptedSnippetText { get; set; }
}
```

### Field Tracking

Use `[TrackFieldUpdatedDomainEvent]` on entity class or individual properties to auto-emit domain events when values change.

### Unique Composite Validation

```csharp
public override PlatformCheckUniqueValidator<TextSnippetEntity> CheckUniqueValidator()
{
    return new PlatformCheckUniqueValidator<TextSnippetEntity>(
        targetItem: this,
        findOtherDuplicatedItemExpr: otherItem => otherItem.Id != Id && otherItem.SnippetText == SnippetText,
        "SnippetText must be unique");
}
```

---

## DTO Mapping

### Entity DTO Pattern

DTOs extend `PlatformEntityDto<TEntity, TKey>` and own the mapping logic.

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/Dtos/EntityDtos/TextSnippetEntityDto.cs`

```csharp
public sealed class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, string>
{
    // Constructor maps entity -> DTO
    public TextSnippetEntityDto(TextSnippetEntity entity)
    {
        Id = entity.Id;
        SnippetText = entity.SnippetText;
        FullText = entity.FullText;
        Status = entity.Status;
        // ...
    }

    // DTO owns the mapping back to entity
    protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
    {
        entity.SnippetText = SnippetText;
        entity.FullText = FullText;

        // Mode-aware mapping: skip certain fields on update
        if (mode != MapToEntityModes.MapToUpdateExistingEntity)
            entity.Address = Address;

        if (mode == MapToEntityModes.MapToUpdateExistingEntity)
        {
            entity.Status = Status;
            if (Status == SnippetStatus.Published && !entity.PublishedDate.HasValue)
                entity.PublishedDate = Clock.UtcNow;
        }
        return entity;
    }

    protected override object GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
}
```

### Key DTO Methods

| Method                     | Purpose                                   | Called By                     |
| -------------------------- | ----------------------------------------- | ----------------------------- |
| `MapToEntity()`            | Create new entity from DTO                | Command handler (create path) |
| `MapToNewEntity()`         | Alias for MapToEntity with new ID         | Command handler               |
| `UpdateToEntity(existing)` | Update existing entity from DTO           | Command handler (update path) |
| `HasSubmitId()`            | Check if DTO has an ID (update vs create) | Command handler               |
| `GetSubmittedId()`         | Return the submitted ID                   | Framework                     |

### Usage in Command Handler

```csharp
var toSaveEntity = request.Data.HasSubmitId()
    ? await repo.FirstOrDefaultAsync(p => p.Id == request.Data.Id, ct)
        .EnsureFound("Not found")
        .Then(existing => request.Data.UpdateToEntity(existing))
    : request.Data.MapToNewEntity();
```

### Value Object DTO Pattern

Value objects use `PlatformDto<T>` with `MapToObject()`:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/Dtos/ExampleAddressValueObjectDto.cs`

```csharp
public class ExampleAddressValueObjectDto : PlatformDto<ExampleAddressValueObject>
{
    public string Number { get; set; }
    public string Street { get; set; }

    public override ExampleAddressValueObject MapToObject()
    {
        return new ExampleAddressValueObject { Number = Number, Street = Street };
    }
}
```

### Static Factory Methods on DTOs

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/Dtos/EntityDtos/TextSnippetEntityDto.cs` (lines 244-284)

```csharp
// Single entity with related data
public static TextSnippetEntityDto FromEntityWithRelated(
    TextSnippetEntity entity, TextSnippetCategory? category = null, ...)
{
    return new TextSnippetEntityDto(entity)
        .WithIf(category != null, dto => dto.WithCategory(category))
        .WithIf(createdByUserName.IsNotNullOrEmpty(), dto => dto.WithCreatedByUser(createdByUserName));
}

// Batch: entities with lookup dictionaries
public static List<TextSnippetEntityDto> FromEntitiesWithRelated(
    List<TextSnippetEntity> entities,
    Dictionary<string, TextSnippetCategory>? categoriesDict = null, ...)
{
    return entities.SelectList(entity => new TextSnippetEntityDto(entity)
        .WithIf(categoriesDict != null, dto => dto.WithCategory(categoriesDict!.GetValueOrDefault(entity.CategoryId!))));
}
```

### DO and DON'T

```csharp
// [MUST NOT] Map in command handler
handler.Handle(cmd) {
    entity.Name = cmd.Data.Name;  // Mapping in handler
}

// DO: DTO owns mapping
handler.Handle(cmd) {
    var entity = cmd.Data.MapToEntity();  // DTO maps itself
}
```

---

## Event Handlers

### Entity Event Handlers

Located in `UseCaseEvents/`. Extend `PlatformCqrsEntityEventApplicationHandler<TEntity>`. Used for side effects (cache clearing, notifications, cross-entity updates).

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseEvents/ClearCaches/ClearCacheOnSaveSnippetTextEntityEventHandler.cs`

```csharp
internal sealed class ClearCacheOnSaveSnippetTextEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        return true; // Handle all events for this entity
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TextSnippetEntity> @event,
        CancellationToken cancellationToken)
    {
        await SearchSnippetTextQuery.ClearCache(
            cacheRepositoryProvider, @event.EntityData,
            @event.RequestContext, () => CreateLogger(LoggerFactory), cancellationToken);
    }
}
```

### Domain Event Handling

Event handlers can inspect specific domain events raised by entities:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/UseCaseEvents/DemoDoSomeDomainEntityLogicActionOnSaveSnippetTextEntityEventHandler.cs` (lines 35-48)

```csharp
protected override async Task HandleAsync(
    PlatformCqrsEntityEvent<TextSnippetEntity> @event, CancellationToken cancellationToken)
{
    var encryptSnippetTextEvent = @event
        .FindEvents<TextSnippetEntity.EncryptSnippetTextDomainEvent>()
        .FirstOrDefault();

    if (encryptSnippetTextEvent != null &&
        @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created)
    {
        // Handle specific domain event
    }
}
```

### Handler Execution Options

| Override                                        | Default | Purpose                                           |
| ----------------------------------------------- | ------- | ------------------------------------------------- |
| `MustWaitHandlerExecutionFinishedImmediately()` | `false` | If true, handler runs synchronously with command  |
| `EnableInboxEventBusMessage`                    | `true`  | If false, disables inbox pattern for this handler |

### Directory Convention

```
UseCaseEvents/
    ClearCaches/
        ClearCacheOnSaveSnippetTextEntityEventHandler.cs
    DemoDoSomeDomainEntityLogicActionOnSaveSnippetTextEntityEventHandler.cs
    DemoUsingPropertyValueUpdatedDomainEventOnSnippetTextEntityEventHandler.cs
```

### DO and DON'T

```csharp
// [MUST NOT] Side effects in command handler
HandleAsync(cmd) {
    await repo.Save(entity);
    await ClearCache();        // Side effect in handler!
    await SendNotification();  // Side effect in handler!
}

// DO: Side effects in event handlers (UseCaseEvents/)
// ClearCacheOnSaveSnippetTextEntityEventHandler handles cache clearing
// NotifyOnSaveEntityEventHandler handles notifications
```

---

## Message Bus

### Architecture Overview

```
MessageBus/
    Producers/
        EntityEventBusProducers/
            TextSnippetEntityEventBusMessageProducer.cs
    Consumers/
        EntityEventConsumers/
            SnippetTextEntityEventBusConsumer.cs
        CommandEventConsumers/
        DomainEventConsumers/
        FreeFormatConsumers/
            DemoSendFreeFormatEventBusMessageCommandEventBusConsumer.cs
    FreeFormatMessages/
        DemoSendFreeFormatEventBusMessage.cs
        EventMessages/
        RequestMessages/
```

### Entity Event Producer

Automatically publishes entity events to the message bus for cross-service consumption.

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/MessageBus/Producers/EntityEventBusProducers/TextSnippetEntityEventBusMessageProducer.cs`

```csharp
// Producer
public class TextSnippetEntityEventBusMessageProducer
    : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippetEntity, string>
{
    // Constructor with applicationBusMessageProducer
    // Optional: Override BuildMessage() to add custom properties
}

// Message contract
public class TextSnippetEntityEventBusMessage : PlatformCqrsEntityEventBusMessage<TextSnippetEntity, string>
{
    // Custom properties can be added here
}
```

### Entity Event Consumer

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/MessageBus/Consumers/EntityEventConsumers/SnippetTextEntityEventBusConsumer.cs`

```csharp
internal sealed class SnippetTextEntityEventBusConsumer
    : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntityEventBusMessage, TextSnippetEntity>
{
    public override Task HandleLogicAsync(TextSnippetEntityEventBusMessage message, string routingKey)
    {
        Logger.LogInformation("{Name} handled message {Events}",
            GetType().FullName, message.Payload.DomainEvents.Any() ? "..." : "");
        return Task.CompletedTask;
    }

    public override async Task<bool> HandleWhen(TextSnippetEntityEventBusMessage message, string routingKey)
        => true; // Process all messages
}
```

### Free-Format Messages

For custom cross-service messages not tied to entity events:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/MessageBus/FreeFormatMessages/DemoSendFreeFormatEventBusMessage.cs`

```csharp
public sealed class DemoSendFreeFormatEventBusMessage : PlatformTrackableBusMessage
{
    public string Property1 { get; set; }
    public int Property2 { get; set; }
}
```

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/MessageBus/Consumers/FreeFormatConsumers/DemoSendFreeFormatEventBusMessageCommandEventBusConsumer.cs`

```csharp
internal sealed class DemoSendFreeFormatEventBusMessageCommandEventBusConsumer
    : PlatformApplicationMessageBusConsumer<DemoSendFreeFormatEventBusMessage>
{
    public override Task HandleLogicAsync(DemoSendFreeFormatEventBusMessage message, string routingKey)
    {
        Logger.LogInformation("Message {Name} handled", nameof(DemoSendFreeFormatEventBusMessage));
        return Task.CompletedTask;
    }
}
```

### Message Type Hierarchy

| Base Class                                        | Purpose                     | Example                             |
| ------------------------------------------------- | --------------------------- | ----------------------------------- |
| `PlatformCqrsEntityEventBusMessage<TEntity, TId>` | Entity CRUD events          | `TextSnippetEntityEventBusMessage`  |
| `PlatformTrackableBusMessage`                     | Custom free-format messages | `DemoSendFreeFormatEventBusMessage` |

### Sending Messages

```csharp
// Via CQRS command (entity events are auto-published)
await Cqrs.SendCommand(new SaveSnippetTextCommand { ... });

// Directly via producer
await busMessageProducer.SendAsync(new DemoSendFreeFormatEventBusMessage { Property1 = "value" });
```

### Inbox/Outbox Pattern

- Consumers support inbox pattern by default (`AutoSaveInboxMessage` returns true)
- Override `AutoSaveInboxMessage => false` to disable
- Platform automatically manages `PlatformInboxBusMessage` and `PlatformOutboxBusMessage` tables

---

## Migrations

### Platform Data Migrations

Runtime data migrations (not schema). Extend `PlatformDataMigrationExecutor<TDbContext>`.

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Persistence/DataMigrations/DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated.cs`

```csharp
internal sealed class DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated
    : PlatformDataMigrationExecutor<TextSnippetDbContext>
{
    public override string Name => "20220130_DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2022, 01, 30);
    public override bool AllowRunInBackgroundThread => true;

    public override async Task Execute(TextSnippetDbContext dbContext)
    {
        await demoSeedDataUseCommandSolutionDataSeeder.SeedData(isReplaceNewSeedData: true);
    }
}
```

### Migration Properties

| Property                      | Purpose                                                      |
| ----------------------------- | ------------------------------------------------------------ |
| `Name`                        | Unique migration identifier (format: `YYYYMMDD_Description`) |
| `OnlyForDbsCreatedBeforeDate` | Only run on databases created before this date               |
| `AllowRunInBackgroundThread`  | If true, migration runs async without blocking app startup   |

### EF Core Schema Migrations

Located in `Persistence.PostgreSql/Migrations/`. Standard EF Core migration approach.

**Directory:** `src/Backend/PlatformExampleApp.TextSnippet.Persistence.PostgreSql/Migrations/`

Migration naming: `YYYYMMDDHHMMSS_Description.cs` (e.g., `20251219050854_AddTaskItemEntity.cs`)

### Persistence Projects

| Project                                     | Database        | Purpose                                             |
| ------------------------------------------- | --------------- | --------------------------------------------------- |
| `TextSnippet.Persistence`                   | Shared/abstract | DbContext interfaces, data seeders, data migrations |
| `TextSnippet.Persistence.Mongo`             | MongoDB         | MongoDB-specific implementation                     |
| `TextSnippet.Persistence.PostgreSql`        | PostgreSQL      | EF Core + PostgreSQL                                |
| `TextSnippet.Persistence.MultiDbDemo.Mongo` | MongoDB         | Demo multi-database support                         |

---

## Background Jobs

### Recurring Jobs

Use `[PlatformRecurringJob]` attribute with cron expression. Extend `PlatformApplicationBackgroundJobExecutor`.

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/BackgroundJob/TestRecurringBackgroundJobExecutor.cs`

```csharp
[PlatformRecurringJob("0 0 * * *", timeZoneOffset: -7)]
public sealed class TestRecurringBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    // Constructor DI: loggerFactory, unitOfWorkManager, serviceProvider,
    //   backgroundJobScheduler, repositories, cqrs, busMessageProducer

    public override async Task ProcessAsync(object param)
    {
        await textSnippetEntityRepository.CreateOrUpdateAsync(
            TextSnippetEntity.Create(id: "...", snippetText: "...", fullText: "..."));

        await cqrs.SendCommand(new DemoSendFreeFormatEventBusMessageCommand { ... });
        await busMessageProducer.SendAsync(new TestFreeFormatMessage());
    }
}
```

### Parameterized Jobs

Extend `PlatformApplicationBackgroundJobExecutor<TParam>` for jobs with typed parameters:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/BackgroundJob/DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor.cs`

```csharp
public class DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor
    : PlatformApplicationBackgroundJobExecutor<DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam>
{
    // Override ProcessAsync(TParam param) instead of ProcessAsync(object param)
}
```

### Manual Scheduling

Schedule jobs programmatically from command handlers:

```csharp
await backgroundJobScheduler.Schedule(
    typeof(DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor),
    new DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam { ... });
```

### Paged Background Jobs

For large dataset processing, extend `PlatformApplicationPagedBackgroundJobExecutor`:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Application/BackgroundJob/DemoPagedBackgroundJobExecutor.cs`

Features: paged processing, skip/take pagination, configurable modes, memory-efficient chunking, automatic progress tracking.

### Job Directory

```
BackgroundJob/
    TestRecurringBackgroundJobExecutor.cs
    DemoPagedBackgroundJobExecutor.cs
    DemoBatchScrollingBackgroundJobExecutor.cs
    DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor.cs
```

---

## Authorization

### Permission Validation in Entities

Permission checks are validation results with `WithPermissionException()`:

**File:** `src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs` (lines 321-342)

```csharp
public static PlatformExpressionValidator<TextSnippetEntity> SavePermissionValidator(string userId)
{
    return new PlatformExpressionValidator<TextSnippetEntity>(
        must: p => p.CreatedByUserId == null || userId == null || p.CreatedByUserId == userId,
        errorMessage: "User must be the creator to update text snippet entity"
    );
}

public PlatformValidationResult<TextSnippetEntity> ValidateSavePermission(string userId)
{
    return SavePermissionValidator(userId).Validate(this).WithPermissionException();
}
```

### Usage in Command Handler

```csharp
var validToSaveEntity = await toSaveEntity
    .ValidateSavePermission(userId: RequestContext.UserId<string>())  // Throws PlatformPermissionException
    .And(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogic())     // Throws PlatformDomainException
    .EnsureValidAsync();
```

### Request Context

Handlers access the current user via `RequestContext`:

```csharp
RequestContext.UserId<string>()     // Get current user ID
RequestContext.UserId<Guid?>()      // Get as nullable Guid
await RequestContext.CurrentUser()  // Get full user object (lazy-loaded)
```

### Exception Types

| Exception                      | Thrown By                       | HTTP Status |
| ------------------------------ | ------------------------------- | ----------- |
| `PlatformPermissionException`  | `.WithPermissionException()`    | 403         |
| `PlatformDomainException`      | `.WithDomainException()`        | 400         |
| `PlatformApplicationException` | `.EnsureValidAsync()` (default) | 400         |
| `PlatformNotFoundException`    | `.EnsureFound()`                | 404         |

---

## Closing Reminders

- **MUST** use `PlatformValidationResult` fluent API for all validation -- NEVER throw exceptions directly for business/input validation
- **MUST** put DTO mapping in DTO class (`MapToEntity()` / `UpdateToEntity()`) -- NEVER map fields in command handlers
- **MUST** place side effects in entity event handlers (`UseCaseEvents/`) -- NEVER in command handlers (cache clearing, notifications, cross-entity updates)
- **MUST** inject narrowest repository type -- `IXxxRepository<T>` for reads, `IXxxRootRepository<T>` for writes
- **MUST** place business logic, validators, static expressions, and factory methods on the Entity -- keep handlers thin
