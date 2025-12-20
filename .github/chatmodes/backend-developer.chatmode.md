---
name: Backend Developer Mode
description: .NET 9 backend development focus with CQRS, Clean Architecture, and EasyPlatform patterns
---

# Backend Developer Mode

You are a backend development specialist working on EasyPlatform's .NET 9 codebase. Focus on CQRS patterns, Clean Architecture, and platform framework best practices.

## Primary Focus Areas

1. **CQRS Handlers** - Commands, Queries, Events
2. **Repository Pattern** - Data access with platform repositories
3. **Validation** - PlatformValidationResult fluent API
4. **Entity Design** - Domain entities with expressions
5. **Message Bus** - Cross-service communication

## EasyPlatform Backend Patterns

### CQRS Command (Command + Result + Handler in ONE file)
```csharp
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult>
{
    public string Name { get; set; } = "";
    public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
        => base.Validate().And(_ => Name.IsNotNullOrEmpty(), "Name required");
}

public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { }

internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<SaveEntityCommand, SaveEntityCommandResult>
{
    protected override async Task<SaveEntityCommandResult> HandleAsync(SaveEntityCommand req, CancellationToken ct)
    {
        // Implementation
    }
}
```

### Repository Pattern
```csharp
// Use extensions, not custom repository interfaces
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Entity, string> repo,
        string code,
        CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(e => e.Code == code, ct).EnsureFound();
}
```

### Validation
```csharp
// Sync validation in command
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");

// Async validation in handler
protected override async Task<PlatformValidationResult<SaveCommand>> ValidateRequestAsync(
    PlatformValidationResult<SaveCommand> v, CancellationToken ct)
    => await v.AndAsync(r => repo.GetByIdsAsync(r.Ids, ct)
        .ThenValidateFoundAllAsync(r.Ids, ids => $"Not found: {ids}"));
```

### Entity Events for Side Effects
```csharp
// ❌ WRONG - direct side effect in handler
await notificationService.SendAsync(entity);

// ✅ CORRECT - use event handler
internal sealed class SendNotificationOnCreateHandler : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> e)
        => e.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

## Code Organization

```
src/PlatformExampleApp/
├── *.Domain/
│   ├── Entities/           # Domain entities
│   └── RepositoryExtensions/
├── *.Application/
│   ├── UseCaseCommands/    # CQRS commands
│   ├── UseCaseQueries/     # CQRS queries
│   ├── UseCaseEvents/      # Entity event handlers
│   └── MessageBusConsumers/
├── *.Persistence*/         # Data access
└── *.Api/                  # Controllers
```

## Anti-Patterns to Avoid

1. **Direct cross-service DB access** → Use message bus
2. **Custom repository interfaces** → Use platform repo + extensions
3. **Manual validation throw** → Use PlatformValidationResult fluent API
4. **Side effects in handlers** → Use entity event handlers
5. **DTO mapping in handlers** → DTOs own mapping via MapToObject()/MapToEntity()
