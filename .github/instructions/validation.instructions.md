---
applyTo: 'src/PlatformExampleApp/**/*Command*.cs,src/PlatformExampleApp/**/*Query*.cs,src/PlatformExampleApp/**/*Handler*.cs'
excludeAgent: ['copilot-code-review']
description: 'Validation patterns using PlatformValidationResult in EasyPlatform'
---

# Validation Patterns

## Sync Validation (in Command/Query)

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name is required")
        .And(_ => Age >= 18, "Must be 18 or older")
        .And(_ => StartDate <= EndDate, "Invalid date range")
        .And(_ => TimeZone.IsNotNullOrEmpty() && Util.TimeZoneParser.TryGetTimeZoneById(TimeZone) != null,
            "Invalid timezone");
}
```

## Async Validation (in Handler)

```csharp
protected override async Task<PlatformValidationResult<SaveEntityCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveEntityCommand> validation,
    CancellationToken ct)
{
    return await validation
        // Validate all IDs exist
        .AndAsync(req => repository.GetByIdsAsync(req.RelatedIds, ct)
            .ThenSelect(e => e.Id)
            .ThenValidateFoundAllAsync(req.RelatedIds,
                notFoundIds => $"Not found: {PlatformJsonSerializer.Serialize(notFoundIds)}"))

        // Negative validation
        .AndNotAsync(req => repository.AnyAsync(
            e => req.OwnerIds.Contains(e.Id) && e.IsExternal,
            ct), "External users not allowed")

        // Conditional validation
        .AndAsync(req => req.Type == EntityType.Special
            ? specialValidator.ValidateAsync(req, ct)
            : Task.FromResult(PlatformValidationResult.Valid()));
}
```

## Validation Methods

| Method                              | Description               |
| ----------------------------------- | ------------------------- |
| `.And(predicate, msg)`              | Sync validation           |
| `.AndAsync(asyncPredicate, msg)`    | Async validation          |
| `.AndNot(predicate, msg)`           | Negative sync validation  |
| `.AndNotAsync(asyncPredicate, msg)` | Negative async validation |
| `.Of<T>()`                          | Convert to different type |

## Ensure Pattern (Inline Throwing)

```csharp
// Get with validation
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Entity not found: {id}");

// Chain with validation
var entity = await repository.GetByIdAsync(id, ct)
    .EnsureFound($"Not found: {id}")
    .Then(e => e.ValidateCanBeUpdated().EnsureValid());

// Validate all found
var items = await repository.GetByIdsAsync(ids, ct)
    .EnsureFoundAllBy(x => x.Id, ids);
```

## Validation Method Naming Conventions

| Pattern                  | Return Type                   | Behavior                                        |
| ------------------------ | ----------------------------- | ----------------------------------------------- |
| `Validate[Context]()`    | `PlatformValidationResult<T>` | Never throws, returns validation result         |
| `Ensure[Context]Valid()` | `void` or `T`                 | Throws `PlatformValidationException` if invalid |

**Rules:**

- Methods starting with `Validate` should return a validation result, NOT throw
- Methods starting with `Ensure` are allowed to throw exceptions
- At call site: Use `Validate...().EnsureValid()` instead of creating wrapper `Ensure...` methods
- `EnsureFound()` - Throws if null
- `EnsureFoundAllBy()` - Validates collection completeness
- `ThenValidateFoundAllAsync()` - Async validation helper

## Entity Validation Methods

```csharp
// In entity class
public PlatformValidationResult ValidateCanBeUpdated()
{
    return PlatformValidationResult.Valid()
        .And(_ => Status != EntityStatus.Locked, "Entity is locked")
        .And(_ => !IsArchived, "Cannot update archived entity");
}

public async Task<PlatformValidationResult> ValidateAsync(
    IRepository<Entity> repo,
    CancellationToken ct)
{
    return await PlatformValidationResult.Valid()
        .AndNotAsync(_ => repo.AnyAsync(e => e.Code == Code && e.Id != Id, ct),
            "Code already exists");
}
```

## Chained Validation with Of<>

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return this
        .Validate(p => p.Id.IsNotNullOrEmpty(), "Id is required")
        .And(p => p.Type == ActionTypes.Single ||
             (p.Type == ActionTypes.Series && p.FrequencyInfo != null),
            "FrequencyInfo required for series")
        .Of<IPlatformCqrsRequest>();
}
```

## Anti-Patterns

- **Never** use `if/throw` for validation (use fluent API)
- **Never** duplicate validation logic (extract to entity/helper)
- **Never** forget meaningful error messages
