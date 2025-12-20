---
mode: 'agent'
tools: ['editFiles', 'codebase', 'terminal']
description: 'Scaffold CQRS command with handler following EasyPlatform patterns'
---

# Create CQRS Command

Create a new CQRS Command with Handler and Result for the following entity:

**Entity Name:** ${input:entityName}
**Service Name:** ${input:serviceName}
**Feature Name:** ${input:featureName}

## Requirements

1. Create in: `{Service}.Application/UseCaseCommands/{Feature}/Save{Entity}Command.cs`
2. **CRITICAL:** Command + Handler + Result must be in ONE file
3. Use service-specific repository: `I{Service}RootRepository<{Entity}>`

## File Structure

```csharp
// File: Save{Entity}Command.cs
// Contains: Command + Result + Handler

#region
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Commands;
#endregion

namespace {Service}.Application.UseCaseCommands.{Feature};

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Save{Entity}Command : PlatformCqrsCommand<Save{Entity}CommandResult>
{
    public string? Id { get; set; }
    // TODO: Add command properties

    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    {
        return base.Validate()
            .And(_ => /* validation */, "Error message");
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESULT
// ═══════════════════════════════════════════════════════════════════════════
public sealed class Save{Entity}CommandResult : PlatformCqrsCommandResult
{
    public {Entity}Dto Entity { get; set; } = null!;
}

// ═══════════════════════════════════════════════════════════════════════════
// HANDLER
// ═══════════════════════════════════════════════════════════════════════════
internal sealed class Save{Entity}CommandHandler :
    PlatformCqrsCommandApplicationHandler<Save{Entity}Command, Save{Entity}CommandResult>
{
    private readonly I{Service}RootRepository<{Entity}> repository;

    public Save{Entity}CommandHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        I{Service}RootRepository<{Entity}> repository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.repository = repository;
    }

    protected override async Task<Save{Entity}CommandResult> HandleAsync(
        Save{Entity}Command req, CancellationToken ct)
    {
        // 1. Get or create
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

**Sync (in Command):**
```csharp
.And(_ => Name.IsNotNullOrEmpty(), "Name required")
.And(_ => StartDate <= EndDate, "Invalid range")
```

**Async (in Handler):**
```csharp
protected override async Task<PlatformValidationResult<T>> ValidateRequestAsync(...)
{
    return await validation
        .AndAsync(req => repo.AnyAsync(e => e.Code == req.Code, ct), "Code exists")
        .AndNotAsync(req => repo.AnyAsync(e => e.IsLocked, ct), "Entity locked");
}
```

## Anti-Patterns to AVOID

- Never call side effects directly (use Entity Event Handlers)
- Never create separate files for Command/Handler/Result
- Never map DTO→Entity in handler (use DTO methods)
- Never use generic `IPlatformRootRepository<>` instead of service-specific
