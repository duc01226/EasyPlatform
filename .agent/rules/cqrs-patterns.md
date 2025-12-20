# CQRS Implementation Patterns

## Critical File Organization Rules
- **Command/Query + Handler + Result**: ALL in ONE file
- Example: `SaveGoalCommand.cs` contains Command, CommandResult, and CommandHandler classes
- **Reusable Entity DTOs**: Place in separate `EntityDtos/` folder
- **Command/Query-specific Results**: Keep in same file as Command/Query

## Command Pattern

### Command Structure
```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public List<IFormFile> Files { get; set; } = [];

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name required");
    }
}
```

### Command Handler
```csharp
internal sealed class SaveEntityCommandHandler :
    PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(
        SaveEntityCommand req, CancellationToken ct)
    {
        // 1. Get or create entity
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct).Then(e => req.UpdateEntity(e));

        // 2. Validate and save
        await entity.ValidateAsync(repository, ct).EnsureValidAsync();
        var saved = await repository.CreateOrUpdateAsync(entity, ct);

        return new SaveEntityCommandResult { Entity = new EntityDto(saved) };
    }
}
```

## Query Pattern

### Paged Query
```csharp
public sealed class GetEntityListQuery : PlatformCqrsPagedQuery<GetEntityListQueryResult, EntityDto>
{
    public List<Status> Statuses { get; set; } = [];
    public string? SearchText { get; set; }
}
```

### Query Handler with GetQueryBuilder
```csharp
protected override async Task<GetEntityListQueryResult> HandleAsync(
    GetEntityListQuery req, CancellationToken ct)
{
    var queryBuilder = repository.GetQueryBuilder((uow, q) => q
        .Where(e => e.CompanyId == RequestContext.CurrentCompanyId())
        .WhereIf(req.Statuses.Any(), e => req.Statuses.Contains(e.Status))
        .PipeIf(req.SearchText.IsNotNullOrEmpty(), q =>
            searchService.Search(q, req.SearchText, Entity.SearchColumns())));

    var (total, items) = await (
        repository.CountAsync((uow, q) => queryBuilder(uow, q), ct),
        repository.GetAllAsync((uow, q) => queryBuilder(uow, q)
            .OrderByDescending(e => e.CreatedDate)
            .PageBy(req.SkipCount, req.MaxResultCount), ct, e => e.RelatedEntity)
    );

    return new GetEntityListQueryResult(items, total, req);
}
```

## Entity Event Handler Pattern (Side Effects)

### Rule: NEVER call side effects directly in command handlers
- Side effects: notifications, external APIs, cross-service communication

### Correct Pattern
```csharp
// In command handler - just save, platform auto-raises events
await repository.CreateAsync(newEntity, ct);

// In UseCaseEvents/ folder - handle side effects
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
    {
        await notificationService.SendAsync(@event.EntityData);
    }
}
```

## DTO Mapping Pattern

### Entity DTO (Reusable)
```csharp
public class EntityDto : PlatformEntityDto<Entity, string>
{
    public EntityDto() { }
    public EntityDto(Entity entity) : base(entity) { /* map properties */ }

    protected override object? GetSubmittedId() => Id;
    protected override string GenerateNewId() => Ulid.NewUlid().ToString();
    protected override Entity MapToEntity(Entity entity, MapToEntityModes mode) { /* map back */ }

    // Fluent loading
    public EntityDto WithRelated(RelatedEntity related) { Related = new RelatedDto(related); return this; }
}
```

## Key Query Patterns
- `GetQueryBuilder((uow, q) => ...)` - Reusable query definitions
- `WhereIf(condition, expr)` - Conditional filtering
- `PipeIf(condition, transform)` - Conditional transformations
- `.PageBy(skip, take)` - Pagination
- `.Then(transform)` - Result transformation
