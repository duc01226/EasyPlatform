---
name: cqrs-command
description: Use when creating or modifying a CQRS Command (Save, Create, Update, Delete) or command handler in .NET backend.
---

# CQRS Command Development

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for CQRS, validation, repositories, entity events, background jobs, migrations

---

## CRITICAL: File Organization

**Command + Handler + Result = ONE FILE**

```
{Service}.Application/
└── UseCaseCommands/{Feature}/
    └── Save{Entity}Command.cs  # Contains all 3 classes
```

## Command Pattern

```csharp
// ═══════════════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════════════
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string? Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => Name.IsNotNullOrEmpty(), "Name is required");
    }
}

// ═══════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════
public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly I{Service}RootRepository<{Entity}> repository;

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command req, CancellationToken ct)
    {
        // 1. Get or create entity
        var entity = req.Id.IsNullOrEmpty()
            ? req.MapToNewEntity().With(e => e.CreatedBy = RequestContext.UserId())
            : await repository.GetByIdAsync(req.Id, ct)
                .EnsureFound($"Entity not found: {req.Id}")
                .Then(e => req.UpdateEntity(e));

        // 2. Save
        var saved = await repository.CreateOrUpdateAsync(entity, ct);

        return new Save{Entity}CommandResult { Entity = new {Entity}Dto(saved) };
    }
}
```

## Validation Patterns

### Sync Validation (in Command)

```csharp
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
{
    return base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => StartDate <= EndDate, "Invalid range");
}
```

### Async Validation (in Handler)

```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndAsync(req => repo.AnyAsync(e => e.Code == req.Code, ct), "Code exists")
        .AndNotAsync(req => repo.AnyAsync(e => e.IsLocked, ct), "Entity locked");
}
```

## Anti-Patterns to AVOID

- Creating separate files for Command/Handler/Result
- Calling side effects directly (notifications, external APIs)
- Mapping DTO to Entity in handler (use DTO's `MapToEntity()`)
- Using generic repository instead of service-specific
- Catching exceptions in handler (let platform handle)

## Side Effects Rule

**NEVER call side effects in command handlers!**

Create Entity Event Handler instead:

```
UseCaseEvents/{Feature}/Send{Action}On{Event}{Entity}EntityEventHandler.cs
```

Platform automatically raises `PlatformCqrsEntityEvent` on repository CRUD.
