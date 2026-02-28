---
applyTo: '**/UseCaseCommands/**/*.cs,**/*Validation*.cs'
---

# Validation Patterns

> Auto-loads when editing Command/Validation files. See `docs/backend-patterns-reference.md` for full reference.

## Fluent Validation Style (MANDATORY)

```csharp
// Sync validation in Command
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => FromDate <= ToDate, "Invalid range");

// Async validation in Handler
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

## Validation Location Decision Tree

```
Simple property validation?  -> Command.Validate() method
Async validation (DB check)?  -> Handler.ValidateRequestAsync()
Business rule validation?  -> Entity.ValidateFor{Action}() method
Cross-field validation?  -> PlatformValidators.dateRange(), etc.
```

## Critical Rules

1. **ALWAYS** use `PlatformValidationResult` fluent API
2. **NEVER** `throw ValidationException` or use `if-return` style
3. **Sync checks** go in `Command.Validate()`
4. **Async checks** (DB lookups) go in `Handler.ValidateRequestAsync()`
5. **Business rules** go in the Entity class
6. **Use `.EnsureFound()`** after repository lookups, not manual null checks
7. **Use `.EnsureValid()`** to throw if validation fails

## Anti-Patterns

```csharp
// WRONG: if-return style
if (field.Group == null)
    return PlatformValidationResult.Valid<object>(null);

// CORRECT: Fluent style
return this
    .Validate(f => f.Group != null, "Group required")
    .And(f => IsCompatibleWithGroup(f), "Incompatible type");

// WRONG: throw exception
if (!entity.IsValid) throw new ValidationException("Invalid");

// CORRECT: fluent validation
entity.Validate().EnsureValid();
```
