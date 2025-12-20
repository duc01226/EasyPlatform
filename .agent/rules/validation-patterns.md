# Validation Patterns

## Validation API Overview

### Basic Sync Validation
Override `Validate()` in Command/Query class:
```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => !string.IsNullOrEmpty(Name), "Name is required")
        .And(_ => Age >= 18, "Employee must be 18 or older")
        .And(_ => TimeZone.IsNotNullOrEmpty(), "TimeZone is required")
        .And(_ => Util.TimeZoneParser.TryGetTimeZoneById(TimeZone) != null, "TimeZone is invalid");
}
```

### Async Validation
Override `ValidateRequestAsync()` in Handler:
```csharp
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> requestSelfValidation,
    CancellationToken cancellationToken)
{
    return await requestSelfValidation
        .AndAsync(async request => await repository
            .GetByIdsAsync(request.WatcherIds, cancellationToken)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(
                request.WatcherIds,
                notFoundIds => $"Not found watcher ids: {notFoundIds}"))
        .AndAsync(async request => await repository
            .GetByIdsAsync(request.BackupPersonIds, cancellationToken)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(
                request.BackupPersonIds,
                notFoundIds => $"Not found backup person ids: {notFoundIds}"));
}
```

## Validation Methods

### Positive Validation
```csharp
.And(condition, "Error message")           // Sync
.AndAsync(asyncCondition, "Error message") // Async
```

### Negative Validation
```csharp
.AndNot(condition, "Error message")           // Sync - fails if condition is TRUE
.AndNotAsync(asyncCondition, "Error message") // Async - fails if condition is TRUE
```

### Example: Negative Validation
```csharp
return await requestSelfValidation.AndNotAsync(
    request => repository.AnyAsync(
        p => request.Data.OwnerEmployeeIds.Contains(p.Id) && p.IsExternalUser == true,
        cancellationToken),
    "External users can't create a goal"
);
```

## Chained Validation with Of<>

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return this
        .Validate(p => p.CheckInEventId.IsNotNullOrEmpty(), "CheckInEventId is required")
        .And(
            p => p.UpdateType == ActionTypes.SingleCheckIn ||
                 (p.UpdateType == ActionTypes.SeriesAndFollowingCheckIn &&
                  p.FrequencyInfo != null &&
                  p.ToUpdateCheckInDate.Date >= Clock.UtcNow.Date),
            "New CheckIn date must be >= current date OR missing FrequencyInfo")
        .Of<IPlatformCqrsRequest>();  // Convert back to base type
}
```

## Ensure Pattern (Inline Validation)

### EnsureFound
```csharp
var entity = await repository
    .GetByIdAsync(request.Id, cancellationToken)
    .EnsureFound($"Entity not found, Id: {request.Id}");
```

### EnsureValid
```csharp
var entity = await repository.GetByIdAsync(request.Id, cancellationToken)
    .EnsureFound()
    .Then(x => x.ValidateCanBeUpdated().EnsureValid());
```

### EnsureFoundAllBy (Collection)
```csharp
var employees = await repository
    .GetByIdsAsync(request.EmployeeIds, cancellationToken)
    .EnsureFoundAllBy(e => e.Id, request.EmployeeIds);
```

### ThenValidateFoundAllAsync
```csharp
await repository.GetByIdsAsync(ids, ct)
    .ThenSelect(e => e.Id)
    .ThenValidateFoundAllAsync(ids, notFound => $"Not found: {notFound}");
```

## Naming Conventions

### Validation Methods
- `Validate[Context]Valid` - Returns `PlatformValidationResult`
- `Has[Property]` - Boolean check
- `Is[State]` - Boolean state check
- `Not[Condition]` - Negative boolean check

### Ensure Methods
- `EnsureValid()` - Throws if validation fails
- `EnsureFound()` - Throws if null
- `EnsureFoundAllBy()` - Validates collection completeness

## Entity Validation Pattern

```csharp
public class Entity
{
    public static List<string> ValidateEntity(Entity? entity)
    {
        var errors = new List<string>();
        if (entity == null) errors.Add("Entity not found");
        if (!entity.IsActive) errors.Add("Entity inactive");
        return errors;
    }

    public PlatformValidationResult ValidateCanBeUpdated()
    {
        return PlatformValidationResult.Valid()
            .And(_ => !IsDeleted, "Cannot update deleted entity")
            .And(_ => Status != Status.Completed, "Cannot update completed entity");
    }
}
```
