<!-- Last scanned: 2026-04-03 -->

# Backend Patterns Reference

**CRITICAL:** Logic MUST live in LOWEST layer: Entity > Service > Handler. DTOs own mapping. Validation uses fluent `PlatformValidationResult`, NEVER throw exceptions. Side effects go in entity event handlers, NEVER in command handlers.

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
// src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs:22
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
// src/Backend/PlatformExampleApp.TextSnippet.Domain/Entities/TextSnippetEntity.cs:150
public static Expression<Func<TextSnippetEntity, bool>> UniqueExpr(string? categoryId, string snippetText)
    => e => e.CategoryId == categoryId && e.SnippetText == snippetText;

// Conditional composition: src/Backend/.../TextSnippetEntity.cs:188
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
// src/Backend/.../TextSnippetEntity.cs:297
public static PlatformSingleValidator<TextSnippetEntity, string> SnippetTextValidator()
    => new(p => p.SnippetText, p => p.NotNull().NotEmpty().MaximumLength(SnippetTextMaxLength));

public override PlatformValidator<TextSnippetEntity> GetValidator()
    => PlatformValidator<TextSnippetEntity>.Create(SnippetTextValidator(), FullTextValidator(), AddressValidator());

// Instance validation: src/Backend/.../TextSnippetEntity.cs:352
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
// src/Backend/PlatformExampleApp.TextSnippet.Domain/Repositories/ITextSnippetRepository.cs:6
public interface ITextSnippetRepository<TEntity> : IPlatformQueryableRepository<TEntity, string>
    where TEntity : class, IEntity<string>, new() { }

public interface ITextSnippetRootRepository<TEntity> : IPlatformQueryableRootRepository<TEntity, string>, ITextSnippetRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new() { }
```

```csharp
// EF Core impl: src/Backend/PlatformExampleApp.TextSnippet.Persistence/TextSnippetRepository.cs:20
internal sealed class TextSnippetRootRepository<TEntity>
    : PlatformEfCoreRootRepository<TEntity, string, TextSnippetDbContext>, ITextSnippetRootRepository<TEntity>
    where TEntity : class, IRootEntity<string>, new()
{
    public TextSnippetRootRepository(DbContextOptions<TextSnippetDbContext> dbContextOptions, IServiceProvider serviceProvider)
        : base(dbContextOptions, serviceProvider) { }
}
```

### Key Repository Methods

| Method                               | Purpose                                |
| ------------------------------------ | -------------------------------------- |
| `CreateOrUpdateAsync(entity)`        | Upsert entity                          |
| `GetAllAsync(queryBuilder, ct)`      | Query with LINQ builder                |
| `FirstOrDefaultAsync(predicate, ct)` | Single entity lookup                   |
| `CountAsync(queryBuilder, ct)`       | Count query                            |
| `AnyAsync(predicate)`                | Existence check                        |
| `GetQueryBuilder(builderFn)`         | Create reusable query builder function |
| `UpdateAsync(entity)`                | Update only                            |
| `DeleteAsync(entity)`                | Delete entity                          |

## CQRS Patterns

### Command Structure

MUST use `PlatformCqrsCommand<TResult>` for commands. Handler MUST be `internal sealed`. Command class MUST be `public sealed`. MUST override `Validate()` on command for self-validation.

```csharp
// src/Backend/.../UseCaseCommands/SaveSnippetTextCommand.cs:26
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

// Handler: src/Backend/.../UseCaseCommands/SaveSnippetTextCommand.cs:59
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

MUST use `PlatformCqrsQuery<TResult>` or `PlatformCqrsPagedQuery<TResult, TItemDto>` for paged queries. Paged queries get `SkipCount`/`MaxResultCount` automatically.

```csharp
// src/Backend/.../UseCaseQueries/SearchSnippetTextQuery.cs:20
public sealed class SearchSnippetTextQuery : PlatformCqrsPagedQuery<SearchSnippetTextQueryResult, TextSnippetEntityDto>
{
    public string SearchText { get; set; }
}

// Handler: src/Backend/.../UseCaseQueries/SearchSnippetTextQuery.cs:73
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
                    _ => fullTextSearchPersistenceService.Search(query, request.SearchText, ...))
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
// src/Backend/PlatformExampleApp.TextSnippet.Api/Controllers/TextSnippetController.cs:22
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

// GOOD: fluent validation chain (src/Backend/.../SaveSnippetTextCommand.cs:307)
var validEntity = await toSaveEntity
    .ValidateSavePermission(userId: RequestContext.UserId<string>())  // WithPermissionException
    .And(entity => toSaveEntity.ValidateSomeSpecificIsXxxLogic())     // WithDomainException
    .AndAsync(ValidateSomeThisCommandApplicationLogic)                // WithApplicationException
    .EnsureValidAsync();
```

### Reusable Validators as Query Filters

`PlatformExpressionValidator<T>` validators expose `.ValidExpr` for reuse in repository queries:

```csharp
// src/Backend/.../TextSnippetEntity.cs:321
public static PlatformExpressionValidator<TextSnippetEntity> SavePermissionValidator(string userId)
    => new(must: p => p.CreatedByUserId == null || userId == null || p.CreatedByUserId == userId,
           errorMessage: "User must be the creator");

// Reuse in queries: src/Backend/.../SaveSnippetTextCommand.cs:348
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
// src/Backend/.../Dtos/EntityDtos/TextSnippetEntityDto.cs:17
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

### With\* Fluent Methods for Optional Data

MUST use `With*` pattern to populate optional/related data on DTOs:

```csharp
// src/Backend/.../TextSnippetEntityDto.cs:157
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
// src/Backend/.../UseCaseEvents/ClearCaches/ClearCacheOnSaveSnippetTextEntityEventHandler.cs:12
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

## Message Bus

Cross-service communication MUST use RabbitMQ message bus. NEVER direct database access across services. Three message types:

| Type                | Producer Base                                                    | Consumer Base                                              | Naming                                  |
| ------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------- |
| Entity Event        | `PlatformCqrsEntityEventBusMessageProducer<TMsg, TEntity, TKey>` | `PlatformCqrsEntityEventBusMessageConsumer<TMsg, TEntity>` | `{Entity}EventBusMessage`               |
| Command Event       | (auto-produced)                                                  | `PlatformCqrsCommandEventBusMessageConsumer<TCommand>`     | per command class name                  |
| Free-format Event   | `IPlatformApplicationBusMessageProducer.SendAsync(msg)`          | `PlatformApplicationMessageBusConsumer<TMessage>`          | `[LeaderService]+XXX+EventBusMessage`   |
| Free-format Request | `IPlatformApplicationBusMessageProducer.SendAsync(msg)`          | `PlatformApplicationMessageBusConsumer<TMessage>`          | `[LeaderService]+XXX+RequestBusMessage` |

```csharp
// Producer: src/Backend/.../MessageBus/Producers/.../TextSnippetEntityEventBusMessageProducer.cs:9
public class TextSnippetEntityEventBusMessageProducer
    : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntityEventBusMessage, TextSnippetEntity, string> { }

public class TextSnippetEntityEventBusMessage : PlatformCqrsEntityEventBusMessage<TextSnippetEntity, string> { }

// Consumer: src/Backend/.../MessageBus/Consumers/.../SnippetTextEntityEventBusConsumer.cs:20
internal sealed class SnippetTextEntityEventBusConsumer
    : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntityEventBusMessage, TextSnippetEntity>
{
    public override Task HandleLogicAsync(TextSnippetEntityEventBusMessage message, string routingKey) { ... }
    public override async Task<bool> HandleWhen(...) => true;
}
```

### Free-format Messages

```csharp
// Event message: src/Backend/.../FreeFormatMessages/EventMessages/DemoSomethingHappenedEventBusMessage.cs:13
public sealed class DemoSomethingHappenedEventBusMessage : PlatformTrackableBusMessage { }

// Request message: src/Backend/.../FreeFormatMessages/RequestMessages/DemoAskDoSomethingRequestBusMessage.cs:13
public sealed class DemoAskDoSomethingRequestBusMessage : PlatformTrackableBusMessage { }
```

## Background Jobs

Three job patterns. All use `[PlatformRecurringJob("cron")]` for scheduling.

| Pattern          | Base Class                                                                           | Use When                                          |
| ---------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Simple recurring | `PlatformApplicationBackgroundJobExecutor`                                           | One-shot or simple recurring logic                |
| Paged processing | `PlatformApplicationPagedBackgroundJobExecutor<TParam>`                              | Sequential page processing, no parallelism needed |
| Batch scrolling  | `PlatformApplicationBatchScrollingBackgroundJobExecutor<TEntity, TBatchKey, TParam>` | Parallel batch processing with logical grouping   |

```csharp
// Simple: src/Backend/.../BackgroundJob/TestRecurringBackgroundJobExecutor.cs:19
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
// Paged: src/Backend/.../BackgroundJob/DemoPagedBackgroundJobExecutor.cs:69
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
// src/Backend/.../Persistence/DataMigrations/DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated.cs:7
internal sealed class DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated : PlatformDataMigrationExecutor<TextSnippetDbContext>
{
    public override string Name => "20220130_DemoMigrateUpdateSeedDataWhenSeedDataLogicIsUpdated";
    public override DateTime? OnlyForDbsCreatedBeforeDate => new(2022, 01, 30);
    public override bool AllowRunInBackgroundThread => true;
    public override async Task Execute(TextSnippetDbContext dbContext) { ... }
}
```

EF Core schema migrations live in `Persistence/Migrations/` (standard EF Core migration files).

## Data Seeding

MUST extend `PlatformApplicationDataSeeder`. MUST use `CreateOrUpdateAsync` with `customCheckExistingPredicate` for idempotent seeding.

```csharp
// src/Backend/.../DataSeeders/TextSnippetApplicationDataSeeder.cs:14
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

---

**CRITICAL (repeated for anchoring):** Logic in LOWEST layer (Entity > Service > Handler). DTOs own mapping via `MapToEntity()`. Validation via `PlatformValidationResult` fluent chain, NEVER throw. Side effects in `UseCaseEvents/` handlers, NEVER in commands. Cross-service via message bus ONLY.
