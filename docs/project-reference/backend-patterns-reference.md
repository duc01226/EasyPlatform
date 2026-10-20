<!-- Last scanned: 2026-08-12 -->

# Backend Patterns Reference

**Final Purpose:** Make AI write Easy.Platform backend code (CQRS, repositories, validation, entities, events, messaging, jobs, migrations) that matches the PlatformExampleApp reference conventions on the first try — every pattern below cites real `file:line` evidence.

**CRITICAL:** Logic MUST live in LOWEST layer: Entity > Service > Handler. DTOs own mapping. Validation uses fluent `PlatformValidationResult`, NEVER throw exceptions — build a result and `.EnsureValid()`. Side effects go in entity event handlers (`UseCaseEvents/`), NEVER in command handlers. Cross-service via RabbitMQ message bus ONLY, NEVER direct DB.

## Contents

- [Entity Patterns](#entity-patterns)
- [Repository Pattern](#repository-pattern)
- [CQRS Patterns](#cqrs-patterns)
- [Validation Patterns](#validation-patterns)
- [DTO Mapping](#dto-mapping)
- [Event Handlers (Side Effects)](#event-handlers-side-effects)
- [Message Bus](#message-bus)
- [Diagnostics & Observability](#diagnostics--observability)
- [Persistence Failure Exceptions](#persistence-failure-exceptions)
- [Background Jobs](#background-jobs)
- [Migrations](#migrations)
- [Data Seeding](#data-seeding)
- [Anti-Patterns (Confirmed Violations)](#anti-patterns-confirmed-violations)

## Entity Patterns

MUST extend `RootAuditedEntity<TEntity, TPrimaryKey, TUserId>`. MUST override `GetValidator()`. MUST use `[ComputedEntityProperty]` for derived properties (empty setter required for EF Core). MUST use static `Expression<Func<T, bool>>` methods for reusable query filters.

| Feature         | Pattern                                                       | Example                                               |
| --------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| Base class      | `RootAuditedEntity<TEntity, string, string>`                  | All root entities                                     |
| Field tracking  | `[TrackFieldUpdatedDomainEvent]` on entity class + properties | Triggers property-change domain events                |
| Concurrency     | Implement `IRowVersionEntity`                                 | `ConcurrencyUpdateToken` property                     |
| Computed props  | `[ComputedEntityProperty]` + empty setter                     | `public int WordCount { get => ...; set { } }`        |
| Navigation      | `[PlatformNavigationProperty(nameof(ForeignKeyId))]`          | Auto-loading related entities                         |
| Unique check    | Override `CheckUniqueValidator()`                             | `PlatformCheckUniqueValidator<T>`                     |
| Value objects   | Extend `PlatformValueObject<T>`                               | `SubTaskItem` stored as JSON in parent                |
| Domain events   | `AddDomainEvent(new CustomDomainEvent{...})`                  | Inside entity methods                                 |
| Factory methods | `static Create(...)`                                          | `TextSnippetEntity.Create(id, snippetText, fullText)` |

```csharp
// src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs:22
[TrackFieldUpdatedDomainEvent]
public class TextSnippetEntity : RootAuditedEntity<TextSnippetEntity, string, string>, IRowVersionEntity
{
    public const int SnippetTextMaxLength = 100;

    [TrackFieldUpdatedDomainEvent]
    public string SnippetText { get; set; }

    [ComputedEntityProperty]
    public int WordCount
    {
        get => SnippetText?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length ?? 0;
        set { } // Required empty setter for EF Core
    }
}
```

### Static Expressions (Reusable Query Filters)

MUST define filter logic as static `Expression<Func<T, bool>>` on the entity. Use `AndAlso()` to compose, `AndAlsoIf()` for conditional composition.

```csharp
// src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs:150
public static Expression<Func<TextSnippetEntity, bool>> UniqueExpr(string? categoryId, string snippetText)
    => e => e.CategoryId == categoryId && e.SnippetText == snippetText;

// Conditional composition: src/PlatformExampleApp/.../TextSnippetEntity.cs:188
public static Expression<Func<TextSnippetEntity, bool>> FilterExpr(
    string? categoryId, List<SnippetStatus>? statuses = null, bool includeDeleted = false)
{
    return ((Expression<Func<TextSnippetEntity, bool>>)(e => true))
        .AndAlsoIf(categoryId.IsNotNullOrEmpty(), () => OfCategoryExpr(categoryId!))
        .AndAlsoIf(statuses?.Count > 0, () => FilterByStatusExpr(statuses!))
        .AndAlsoIf(!includeDeleted, () => e => !e.IsDeleted);
}
```

### Entity Validation

MUST override `GetValidator()` composing `PlatformSingleValidator` instances. MUST use instance methods (`ValidateCanBePublished()`) for state-transition validation returning `PlatformValidationResult<T>`.

```csharp
// src/PlatformExampleApp/.../TextSnippetEntity.cs:297
public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
    => new(p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));

public override PlatformValidator<TextSnippetEntity> GetValidator()
    => PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());

// Instance validation: src/PlatformExampleApp/.../TextSnippetEntity.cs:352
public PlatformValidationResult<TextSnippetEntity> ValidateCanBePublished()
{
    return this.Validate(_ => Status != SnippetStatus.Published, "Snippet is already published")
        .And(_ => !IsDeleted, "Cannot publish a deleted snippet")
        .And(_ => SnippetText.IsNotNullOrEmpty(), "Snippet text is required to publish");
}
```

## Repository Pattern

MUST define service-specific repository interfaces in Domain layer. MUST implement in Persistence layer using platform base classes.

| Layer   | Interface/Class                       | Base                                                         |
| ------- | ------------------------------------- | ------------------------------------------------------------ |
| Domain  | `ITextSnippetRepository<TEntity>`     | `IPlatformQueryableRepository<TEntity, string>`              |
| Domain  | `ITextSnippetRootRepository<TEntity>` | `IPlatformQueryableRootRepository<TEntity, string>`          |
| EF Core | `TextSnippetRootRepository<TEntity>`  | `PlatformEfCoreRootRepository<TEntity, string, TDbContext>`  |
| MongoDB | `TextSnippetRootRepository<TEntity>`  | `PlatformMongoDbRootRepository<TEntity, string, TDbContext>` |

```csharp
// src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Domain/Repositories/ITextSnippetRepository.cs:6
public interface ITextSnippetRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new() { }

public interface ITextSnippetRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>, ITextSnippetRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new() { }
```

```csharp
// EF Core impl: src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Persistence/TextSnippetRepository.cs:20
internal sealed class TextSnippetRootRepository<TEntity>
    : PlatformEfCoreRootRepository<TEntity, string, TextSnippetDbContext>, ITextSnippetRootRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new()
{
    public TextSnippetRootRepository(DbContextOptions<TextSnippetDbContext> dbContextOptions, IServiceProvider serviceProvider)
        : base(dbContextOptions, serviceProvider) { }
}
```

### Key Repository Methods

| Method                                                   | Purpose                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `CreateOrUpdateAsync(entity)`                            | Upsert entity                                                                     |
| `GetAllAsync(queryBuilder, ct)`                          | Query with LINQ builder                                                           |
| `FirstOrDefaultAsync(predicate, ct)`                     | Single entity lookup                                                              |
| `CountAsync(queryBuilder, ct)`                           | Count query                                                                       |
| `AnyAsync(predicate)`                                    | Existence check                                                                   |
| `GetQueryBuilder(builderFn)`                             | Create reusable query builder function                                            |
| `UpdateAsync(entity)`                                    | Update only                                                                       |
| `SetAsync(entity)`                                       | Set data only — NO domain event / row-version bump (`IPlatformRepository.cs:468`) |
| `DeleteAsync(entity)`                                    | Delete entity                                                                     |
| `CreateOrUpdateManyAsync(entities)`                      | Bulk upsert                                                                       |
| `UpdateManyAsync(entities, dismissSendEvent, checkDiff)` | Bulk update; `dismissSendEvent: true` suppresses events (loop prevention)         |

## CQRS Patterns

### Command Structure

MUST use `PlatformCqrsCommand<TResult>` for commands. Handler MUST be `internal sealed`. Command class MUST be `public sealed`. MUST override `Validate()` on command for self-validation.

```csharp
// src/PlatformExampleApp/.../UseCaseCommands/SaveSnippetTextCommand.cs:26
public sealed class SaveSnippetTextCommand : PlatformCqrsCommand<SaveSnippetTextCommandResult>
{
    public TextSnippetEntityDto Data { get; set; }

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return this
            .Validate(p => Data != null, "Data must be not null.")
            .And(p => Data.MapToEntity().Validate().Of(p))
            .Of<IPlatformCqrsRequest>();
    }
}

public sealed class SaveSnippetTextCommandResult : PlatformCqrsCommandResult
{
    public TextSnippetEntityDto SavedData { get; set; }
}

// Handler: src/PlatformExampleApp/.../UseCaseCommands/SaveSnippetTextCommand.cs:59
internal sealed class SaveSnippetTextCommandHandler
    : PlatformCqrsCommandApplicationHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
{
    // Inject: requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider + domain repos
    protected override async Task<SaveSnippetTextCommandResult> HandleAsync(
        SaveSnippetTextCommand request, CancellationToken cancellationToken)
    {
        // STEP 1: Build entity from request DTO
        var toSaveEntity = request.Data.HasSubmitId()
            ? await textSnippetEntityRepository.FirstOrDefaultAsync(p => p.Id == request.Data.Id, cancellationToken)
                .EnsureFound($"Has not found text snippet for id {request.Data.Id}")
                .Then(existing => request.Data.UpdateToEntity(existing))
            : request.Data.MapToNewEntity();
        // STEP 2: Validate
        var validEntity = await toSaveEntity
            .ValidateSavePermission(userId: RequestContext.UserId<string>())
            .And(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogic())
            .EnsureValidAsync();
        // STEP 3: Save
        var savedData = await textSnippetEntityRepository.CreateOrUpdateAsync(validEntity, cancellationToken: cancellationToken);
        // STEP 4: Return
        return new SaveSnippetTextCommandResult { SavedData = new TextSnippetEntityDto(savedData) };
    }
}
```

### Query Structure

MUST use `PlatformCqrsQuery<TResult>` or `PlatformCqrsPagedQuery<TResult, TItemDto>` for paged queries. Paged queries get `SkipCount`/`MaxResultCount` automatically. The example app's exposed snippet/task lists reuse `TextSnippetPagedQuery` for a default20 and accepted sizes1..200, rejecting negative offsets. Shared platform queries retain their documented nullable unlimited contract; do not impose app policy on generic callers.

```csharp
// src/PlatformExampleApp/.../UseCaseQueries/SearchSnippetTextQuery.cs:20
public sealed class SearchSnippetTextQuery : PlatformCqrsPagedQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
{
    public string SearchText { get; set; }
}

// Handler: src/PlatformExampleApp/.../UseCaseQueries/SearchSnippetTextQuery.cs:73
internal sealed class SearchSnippetTextQueryHandler
    : PlatformCqrsQueryApplicationHandler<SearchSnippetTextQuery, SearchSnippetTextQueryResult>
{
    protected override async Task<SearchSnippetTextQueryResult> HandleAsync(
        SearchSnippetTextQuery request, CancellationToken cancellationToken)
    {
        var fullItemsQueryBuilder = repository.GetQueryBuilder(
            builderFn: query => query
                .Where(p => p.CreatedByUserId == RequestContext.UserId())
                .PipeIf(request.SearchText.IsNotNullOrEmpty(),
                    filteredQuery => fullTextSearchPersistenceService.Search(filteredQuery, request.SearchText, ...))
                .WhereIf(request.SearchId != null, p => p.Id == request.SearchId));

        var (pagedEntities, totalCount) = await Util.TaskRunner.WhenAll(
            repository.GetAllAsync(q => fullItemsQueryBuilder(q).OrderByDescending(p => p.CreatedDate).PageBy(request.SkipCount, request.MaxResultCount), cancellationToken),
            repository.CountAsync(fullItemsQueryBuilder, cancellationToken));

        return new SearchSnippetTextQueryResult(pagedEntities.Select(p => new TextSnippetEntityDto(p)).ToList(), totalCount, request);
    }
}
```

### Controller Dispatch

MUST extend `PlatformBaseController`. Dispatch via `Cqrs.SendQuery(request)` / `Cqrs.SendCommand(request)`.

```csharp
// src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs:22
[Route("api/[controller]")]
[ApiController]
public class TextSnippetController : PlatformBaseController
{
    [HttpGet, Route("search")]
    public async Task<SearchSnippetTextQueryResult> Search([FromQuery] SearchSnippetTextQuery request)
        => await Cqrs.SendQuery(request);

    [HttpPost, Route("save")]
    public async Task<SaveSnippetTextCommandResult> Save([FromBody] SaveSnippetTextCommand request)
        => await Cqrs.SendCommand(request);
}
```

## Validation Patterns

NEVER throw exceptions for validation. MUST use `PlatformValidationResult<T>` fluent chain.

| Method                                   | Purpose                      |
| ---------------------------------------- | ---------------------------- |
| `.Validate(predicate, errorMsg)`         | Start validation chain       |
| `.ValidateNot(predicate, errorMsg)`      | Negated condition            |
| `.And(predicate, errorMsg)`              | Chain sync validation        |
| `.AndAsync(asyncPredicate)`              | Chain async validation       |
| `.EnsureValid()` / `.EnsureValidAsync()` | Throw if invalid             |
| `.WithPermissionException()`             | Wrap as permission error     |
| `.WithDomainValidationException()`       | Wrap as domain error         |
| `.WithApplicationException()`            | Wrap as application error    |
| `.CombineValidations()`                  | Fail-fast list validation    |
| `.AggregateValidations()`                | Collect all errors from list |
| `.Of<T>()`                               | Cast validation result type  |

```csharp
// BAD: throwing exceptions
if (entity.CreatedByUserId != userId) throw new Exception("No permission");

// GOOD: fluent validation chain (src/PlatformExampleApp/.../SaveSnippetTextCommand.cs:312)
var validEntity = await toSaveEntity
    .ValidateSavePermission(userId: RequestContext.UserId<string>())  // entity/app helper -> WithPermissionException
    .And(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogic())     // WithDomainException
    .AndAsync(ValidateSomeThisCommandApplicationLogic)                // WithApplicationException
    .EnsureValidAsync();                                              // EnsureValidAsync() at :316
```

### Reusable Validators as Query Filters

`PlatformExpressionValidator<T>` validators expose `.ValidExpr` for reuse in repository queries:

```csharp
// src/PlatformExampleApp/.../TextSnippetEntity.cs:321
public static PlatformExpressionValidator<TextSnippetEntity> SavePermissionValidator(string userId)
    => new(must: p => p.CreatedByUserId == null || userId == null || p.CreatedByUserId == userId,
           errorMessage: "User must be the creator");

// Reuse in queries: src/PlatformExampleApp/.../SaveSnippetTextCommand.cs:349
var permittedEntities = await repository.GetAllAsync(
    predicate: TextSnippetEntity.SavePermissionValidator(userId).ValidExpr, cancellationToken);
```

## DTO Mapping

DTOs MUST own mapping logic. MUST extend `PlatformEntityDto<TEntity, TKey>`. Handler NEVER maps.

| Method                         | Direction     | Purpose                   |
| ------------------------------ | ------------- | ------------------------- |
| `new Dto(entity)`              | Entity -> DTO | Constructor mapping       |
| `dto.MapToEntity()`            | DTO -> Entity | Full mapping for create   |
| `dto.MapToNewEntity()`         | DTO -> Entity | Create with generated ID  |
| `dto.UpdateToEntity(existing)` | DTO -> Entity | Update existing entity    |
| `dto.HasSubmitId()`            | -             | Check if create or update |
| `dto.Validate()`               | -             | Validate mapped entity    |

```csharp
// src/PlatformExampleApp/.../Dtos/EntityDtos/TextSnippetEntityDto.cs:17
public sealed class TextSnippetEntityDto : PlatformEntityDto<TextSnippetEntity, string>
{
    public TextSnippetEntityDto(TextSnippetEntity entity) { Id = entity.Id; SnippetText = entity.SnippetText; /* ... */ }

    protected override TextSnippetEntity MapToEntity(TextSnippetEntity entity, MapToEntityModes mode)
    {
        entity.SnippetText = SnippetText;
        entity.FullText = FullText;
        if (mode != MapToEntityModes.MapToUpdateExistingEntity) entity.Address = Address;
        return entity;
    }

    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override object GetSubmittedId() => Id;
}
```

**Mode-gating is a decision, not a default.** A property mapped under `if (mode != MapToUpdateExistingEntity)` is silently DROPPED on update; one mapped only under the update branch is silently dropped on create. Gate a property only when the operation genuinely does not exist in that mode (e.g. `Status` is set by an explicit state-transition command, not by a generic update). A field that participates in a real operation in BOTH modes MUST be mapped unconditionally — `TextSnippetEntityDto.cs:230` maps `CategoryId` in both because assigning a snippet to a category on create and moving it between categories on update are both real operations, and `UpdateCategoryStatsOnSnippetChangeEventHandler` depends on it in both (its Created branch fires only when the new snippet HAS a category; its Updated branch keys off a `CategoryId` field-change event). Leaving it gated made both branches unreachable with no compile error and no failing test.

### With\* Fluent Methods for Optional Data

MUST use `With*` pattern to populate optional/related data on DTOs:

```csharp
// src/PlatformExampleApp/.../TextSnippetEntityDto.cs:157
public TextSnippetEntityDto WithCategory(TextSnippetCategory? category) { ... return this; }
public TextSnippetEntityDto WithCreatedByUser(string? userName) { ... return this; }

// Batch construction:
public static List<TextSnippetEntityDto> FromEntitiesWithRelated(
    List<TextSnippetEntity> entities, Dictionary<string, TextSnippetCategory>? categoriesDict = null)
{
    return entities.SelectList(entity => new TextSnippetEntityDto(entity)
        .WithIf(categoriesDict != null, dto => dto.WithCategory(categoriesDict!.GetValueOrDefault(entity.CategoryId!))));
}
```

## Event Handlers (Side Effects)

Side effects MUST go in entity event handlers in `UseCaseEvents/`, NEVER in command handlers. MUST extend `PlatformCqrsEntityEventApplicationHandler<TEntity>`.

| Method                                          | Purpose                                      |
| ----------------------------------------------- | -------------------------------------------- |
| `HandleWhen(@event)`                            | Conditional execution (return false to skip) |
| `HandleAsync(@event, ct)`                       | Processing logic                             |
| `MustWaitHandlerExecutionFinishedImmediately()` | Override to make sync (default: async)       |
| `EnableInboxEventBusMessage`                    | Toggle inbox pattern (default: true)         |
| `@event.FindFieldUpdatedEvent(p => p.Prop)`     | Get property change event                    |
| `@event.HasAnyFieldUpdatedEvents(...)`          | Check multiple field changes                 |
| `@event.FindEvents<TDomainEvent>()`             | Find custom domain events                    |
| `@event.CrudAction`                             | `Created` / `Updated` / `Deleted`            |

```csharp
// src/PlatformExampleApp/.../UseCaseEvents/ClearCaches/ClearCacheOnSaveSnippetTextEntityEventHandler.cs:12
internal sealed class ClearCacheOnSaveSnippetTextEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event) => true;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<TextSnippetEntity> @event, CancellationToken ct)
    {
        await SearchSnippetTextQuery.ClearCache(cacheRepositoryProvider, @event.EntityData, @event.RequestContext, ...);
    }
}
```

### Synchronous side effect + loop prevention

To run a side effect synchronously (ordered with the command, not async) override `EnableInboxEventBusMessage => false`. When the handler itself updates an entity, pass `dismissSendEvent: true` to avoid re-triggering the same event chain.

```csharp
// src/PlatformExampleApp/.../UseCaseEvents/Snippet/UpdateCategoryStatsOnSnippetChangeEventHandler.cs:47
public override bool EnableInboxEventBusMessage => false; // run sync, in-order with command

// loop prevention when handler writes back (same file:139)
await categoryRepository.UpdateAsync(category, dismissSendEvent: true, cancellationToken: ct);
```

### Bulk Entity Event Handler

For batch CRUD, extend `PlatformCqrsBulkEntitiesEventApplicationHandler<TEntity, TKey>` — exposes `@event.Entities` and per-id `@event.DomainEvents`.

```csharp
// src/PlatformExampleApp/.../UseCaseEvents/DemoBulkEntitiesEventHandler.cs:13
internal sealed class DemoBulkEntitiesEventHandler
    : PlatformCqrsBulkEntitiesEventApplicationHandler<TextSnippetEntity, string>
{
    protected override Task HandleAsync(PlatformCqrsBulkEntitiesEvent<TextSnippetEntity, string> @event, CancellationToken ct)
    {
        // @event.Entities, @event.CrudAction, @event.DomainEvents.GetValueOrDefault(entity.Id)
    }
}
```

> NOTE: filename can differ from class name — `DemoUsingPropertyValueUpdatedDomainEventOnSnippetTextEntityEventHandler.cs` declares class `DemoUsingFieldUpdatedDomainEventOnSnippetTextEntityEventHandler`. Grep by class name, not filename.

## Message Bus

Cross-service communication MUST use RabbitMQ message bus. NEVER direct database access across services. Three message types:

| Type                | Producer Base                                                    | Consumer Base                                              | Naming                                  |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| Entity Event        | `PlatformCqrsEntityEventBusMessageProducer<TMsg, TEntity, TKey>` | `PlatformCqrsEntityEventBusMessageConsumer<TMsg, TEntity>` | `{Entity}EventBusMessage`               |
| Command Event       | `PlatformCqrsCommandEventBusMessageProducer<TCommand>`           | `PlatformCqrsCommandEventBusMessageConsumer<TCommand>`     | per command class name                  |
| Domain Event        | `PlatformCqrsDomainEventBusMessageProducer<TDomainEvent>`        | `PlatformCqrsDomainEventBusMessageConsumer<TDomainEvent>`  | `{DomainEvent}EventBusMessage`          |
| Free-format Event   | `IPlatformApplicationBusMessageProducer.SendAsync(msg)`          | `PlatformApplicationMessageBusConsumer<TMessage>`          | `[LeaderService]+XXX+EventBusMessage`   |
| Free-format Request | `IPlatformApplicationBusMessageProducer.SendAsync(msg)`          | `PlatformApplicationMessageBusConsumer<TMessage>`          | `[LeaderService]+XXX+RequestBusMessage` |

```csharp
// Producer: src/PlatformExampleApp/.../MessageBus/Producers/.../TextSnippetEntityEventBusMessageProducer.cs:9
public class TextSnippetEntityEventBusMessageProducer
    : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippetEntity, string> { }

public class TextSnippetEntityEventBusMessage : PlatformCqrsEntityEventBusMessage<TextSnippetEntity, string> { }

// Consumer: src/PlatformExampleApp/.../MessageBus/Consumers/.../SnippetTextEntityEventBusConsumer.cs:20
internal sealed class SnippetTextEntityEventBusConsumer
    : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntityEventBusMessage, TextSnippetEntity>
{
    public override Task HandleLogicAsync(TextSnippetEntityEventBusMessage message, string routingKey) { ... }
    public override async Task<bool> HandleWhen(...) => true;
}
```

### Free-format Messages

```csharp
// Event message: src/PlatformExampleApp/.../FreeFormatMessages/EventMessages/DemoSomethingHappenedEventBusMessage.cs:13
public sealed class DemoSomethingHappenedEventBusMessage : PlatformTrackableBusMessage { }

// Request message: src/PlatformExampleApp/.../FreeFormatMessages/RequestMessages/DemoAskDoSomethingRequestBusMessage.cs:13
public sealed class DemoAskDoSomethingRequestBusMessage : PlatformTrackableBusMessage { }
```

## Diagnostics & Observability

**CRITICAL:** Anything written to an observability sink (log, trace tag, persisted diagnostic column) MUST go through the diagnostic serialization boundary. NEVER serialize a command, query, entity, bus message, or exception into a sink with `ToFormattedJson()`, `{@Request}` destructuring, `ex.Message`, or `BeautifyStackTrace()`.

Diagnostic sinks fan out to a much wider audience than the data itself (log aggregators, APM traces, inbox/outbox rows), so the boundary is **payload-free**: it emits a fixed-shape envelope carrying only the type name (`{"DataType":"MyApp.SaveUserCommand"}`) and never walks the object graph. That is stronger than property allow/deny-listing, which fails open for every newly added member and for untyped containers (`Dictionary<,>`, anonymous objects). It also protects availability — traversing a caller-owned object runs caller-owned getters that can throw or block, replacing the real failure being logged.

| Sink being written                           | Use                                                                          | Evidence                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| CQRS / persistence / background-job value    | `PlatformJsonSerializer.SerializeForDiagnostics<TValue>(value)`              | `Common/JsonSerialization/PlatformJsonSerializer.cs:186`                 |
| Exception on a swallowed / persist-only path | `PlatformJsonSerializer.SerializeExceptionForDiagnostics(ex)`                | `Common/JsonSerialization/PlatformJsonSerializer.cs:214`                 |
| Runtime bus message                          | `PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(msg)`            | `Infrastructures/MessageBus/PlatformMessageBusDiagnosticFormatter.cs:43` |
| Persisted (inbox/outbox) bus message         | `PlatformMessageBusDiagnosticFormatter.FormatPersistedMessage(typeFullName)` | `Infrastructures/MessageBus/PlatformMessageBusDiagnosticFormatter.cs:59` |
| Bus-path exception                           | `PlatformMessageBusDiagnosticFormatter.FormatException(ex)`                  | `Infrastructures/MessageBus/PlatformMessageBusDiagnosticFormatter.cs:86` |

Exception serialization is the one deliberate exception to payload-free: it renders message, demystified stack trace, and inner TYPE chain, because on swallowed paths that envelope is the sole record of the failure. It still never reads `Exception.Data` and never traverses the observed payload.

Normal transport, model binding, and persistence serialization stays on `PlatformJsonSerializer.Serialize<TValue>(value)` and is unaffected.

### Opt-in redaction for typed diagnostic projections

`[PlatformSensitiveData]` (`Common/JsonSerialization/PlatformSensitiveDataAttribute.cs:9`, property/field targets) marks members to omit from the few diagnostic projections that DO render real content — currently HTTP request-body capture (`Easy.Platform.AspNetCore/Middleware/PlatformHttpRequestBodyDiagnosticSerializer.cs:239`). That path fails closed: a request model it cannot classify ahead of time is omitted entirely rather than logged raw.

**Enforcement:** `Easy.Platform.Tests.Unit/Common/JsonSerialization/PlatformDiagnosticSinkSourceShapeTests.cs` asserts on the SOURCE SHAPE of every known sink, so a new sink that bypasses this boundary fails the build. Behaviour (including hostile getters and converters) is covered by `PlatformDiagnosticJsonSerializerTests.cs`.

## Persistence Failure Exceptions

Application and domain code MUST react to store-level write failures through provider-neutral platform exceptions. NEVER catch `DbUpdateException`, `PostgresException`, or a Mongo write exception from the Application layer, and NEVER match on `ex.GetType().Name is "..."` — the string match keeps compiling after a rename or provider swap, silently degrading the handler into a no-op with no build error and no failing test.

| Failure                         | Catch this                                         | Re-thrown by                                                                                                                                           |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UNIQUE index / PK violation     | `PlatformDomainUniqueConstraintViolationException` | `Easy.Platform.EfCore/PlatformEfCoreDbContext.cs:910` (SQLSTATE 23505), `Easy.Platform.MongoDB/PlatformMongoDbContext.cs:662,666` (DuplicateKey 11000) |
| Optimistic-concurrency conflict | `PlatformDomainRowVersionConflictException`        | provider db contexts (pre-existing sibling pattern)                                                                                                    |
| File missing in blob storage    | `PlatformFileStorageNotFoundException`             | `Easy.Platform.AzureFileStorage/PlatformAzureFileStorageService.cs:326`                                                                                |

The provider-native exception is always preserved as `InnerException`, so constraint names and full diagnostics are not lost.

**Blob URI host rewriting** is centralised in `Infrastructures/FileStorage/PlatformBlobUriRewriter.cs` — pure and static, used in both directions (internal→public when emitting client-visible URLs at `PlatformAzureFileStorageService.cs:761`, public→internal when a server re-fetches a stored public URL). `TryRewrite` fails closed for server-side fetch paths so an untrusted host is never contacted. Do NOT reimplement endpoint parsing at a call site.

## Background Jobs

Job patterns. Recurring jobs use `[PlatformRecurringJob("cron")]`; the parameterized variant is scheduled manually (no attribute).

| Pattern              | Base Class                                                                           | Use When                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Simple recurring     | `PlatformApplicationBackgroundJobExecutor`                                           | One-shot or simple recurring logic                                                                                          |
| Parameterized/manual | `PlatformApplicationBackgroundJobExecutor<TParam>`                                   | Scheduled manually with a typed param, no cron attr (`DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor.cs:13`) |
| Paged processing     | `PlatformApplicationPagedBackgroundJobExecutor<TParam>`                              | Sequential page processing, no parallelism needed                                                                           |
| Batch scrolling      | `PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey, TParam>` | Parallel batch processing with logical grouping                                                                             |

```csharp
// Simple: src/PlatformExampleApp/.../BackgroundJob/TestRecurringBackgroundJobExecutor.cs:19
[PlatformRecurringJob("0 0 * * *", timeZoneOffset: -7)]
public sealed class TestRecurringBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    public override async Task ProcessAsync(object param)
    {
        await textSnippetEntityRepository.CreateOrUpdateAsync(...);
        await cqrs.SendCommand(new DemoSendFreeFormatEventBusMessageCommand{...});
    }
}
```

```csharp
// Paged: src/PlatformExampleApp/.../BackgroundJob/DemoPagedBackgroundJobExecutor.cs:69
[PlatformRecurringJob("0 3 * * *")]
public sealed class DemoPagedBackgroundJobExecutor : PlatformApplicationPagedBackgroundJobExecutor<DemoPagedParam>
{
    protected override int PageSize => 50;
    protected override async Task ProcessPagedAsync(int? skipCount, int? pageSize, DemoPagedParam? param, ...) { ... }
    protected override async Task<int> MaxItemsCount(...) { ... }
}
```

## Migrations

Platform data migrations MUST extend `PlatformDataMigrationExecutor<TDbContext>`. Name format: `YYYYMMDD_Description`.

```csharp
// src/PlatformExampleApp/.../Persistence/DataMigrations/DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated.cs:7
internal sealed class DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated : PlatformDataMigrationExecutor<TextSnippetDbContext>
{
    public override string Name => "20220130_DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2022, 01, 30);
    public override bool AllowRunInBackgroundThread => true;
    public override async Task Execute(TextSnippetDbContext dbContext) { ... }
}
```

EF Core schema migrations live in `Persistence/Migrations/` (standard EF Core migration files). DI registration is by service-specific module classes (e.g. `TextSnippetApplicationModule : PlatformApplicationModule`, `TextSnippetApplicationModule.cs:19`); handlers/consumers/jobs/seeders are auto-discovered by assembly scan — do NOT hand-register `AddScoped/Singleton` for them.

## Data Seeding

MUST extend `PlatformApplicationDataSeeder`. MUST use `CreateOrUpdateAsync` with `customCheckExistingPredicate` for idempotent seeding.

```csharp
// src/PlatformExampleApp/.../DataSeeders/TextSnippetApplicationDataSeeder.cs:14
public sealed class TextSnippetApplicationDataSeeder : PlatformApplicationDataSeeder
{
    protected override async Task InternalSeedData(bool isReplaceNewSeed = false)
    {
        await textSnippetRepository.CreateOrUpdateAsync(
            TextSnippetEntity.Create(id: Ulid.NewUlid().ToString(), snippetText: "Example", fullText: "Full text"),
            customCheckExistingPredicate: p => p.SnippetText == "Example");
    }
}
```

## Anti-Patterns (Confirmed Violations)

Real violations found in the codebase by convention audit. These are live teaching/legacy code — treat as DON'T examples, not patterns to copy.

| Convention violated                                              | Where                                                                                                                                                                                                                   | Severity | Fix                                                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Validation via raw `throw` instead of `PlatformValidationResult` | `UseCaseCommands/Snippet/BulkUpdateSnippetStatusCommand.cs:141` — `throw new PlatformValidationException(...)` as control flow; class is a locally-defined plain `Exception` (`:223`) shadowing the framework type name | MAJOR    | Build a `PlatformValidationResult` and `.EnsureValid()`; delete the shadow exception class                             |
| State-transition logic + side effects in handler, not entity     | `BulkUpdateSnippetStatusCommand.cs:163-177` (inline `Status` set + `PublishedDate` rules) and `:197` (`ValidateStatusTransition` duplicates `TextSnippetEntity.ValidateCanBePublished()`)                               | MAJOR    | Move to an entity method e.g. `TextSnippetEntity.ChangeStatusTo(newStatus, userId)` reusing `ValidateCanBePublished()` |
| DTO mapping done in handler, not DTO-owned                       | `UseCaseQueries/GetMyTextSnippetsQuery.cs:78-91` — manual `new TextSnippetEntityDto { Id = ..., SnippetText = ... }` initializer                                                                                        | MAJOR    | Use `new TextSnippetEntityDto(entity)` then `.WithCreatedByUser(...)` for enrichment                                   |
| Business rule + magic constant in handler (teaching demo)        | `UseCaseCommands/CreateTextSnippetWithCurrentUserCommand.cs:107,117` — `throw new InvalidOperationException`, daily-limit constant `10` inline                                                                          | MINOR    | Move rule + limit to entity/model; replace throw with validation chain                                                 |

Conventions confirmed WELL-followed (no violations): service-specific repository injection (zero generic `IPlatformRootRepository<>` in handlers), no cross-service direct DB access, bus message ownership-prefix naming, no uncleaned fire-and-forget (`Task.Run` results are returned/awaited).

---

**CRITICAL (repeated for anchoring):** Logic in LOWEST layer (Entity > Service > Handler). DTOs own mapping via `MapToEntity()`. Validation via `PlatformValidationResult` fluent chain, NEVER throw. Side effects in `UseCaseEvents/` handlers, NEVER in commands. Cross-service via message bus ONLY.
