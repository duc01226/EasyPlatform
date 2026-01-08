# Backend Quick Reference

> Quick decision guide for backend development. For detailed patterns, see [CLAUDE.md](../CLAUDE.md#backend-patterns).

## Decision Tree

```
Need backend feature?
├── API endpoint → PlatformBaseController + CQRS Command
├── Business logic → Command Handler in Application layer
├── Data access → Repository Extensions with static expressions
├── Cross-service → Entity Event Consumer
├── Scheduled task → PlatformApplicationBackgroundJob
└── Migration → PlatformDataMigrationExecutor / EF migrations
```

## Key Patterns

### 1. Repository Pattern

```csharp
// Use specific repository type
IPlatformQueryableRootRepository<TEntity, TKey>

// Extension pattern for common queries
public static class EntityRepositoryExtensions
{
    public static async Task<Entity> GetByCodeAsync(
        this IPlatformQueryableRootRepository<Entity, string> repo,
        string code,
        CancellationToken ct = default)
        => await repo.FirstOrDefaultAsync(Entity.CodeExpr(code), ct).EnsureFound();
}
```

### 2. Validation Pattern

```csharp
// Fluent validation - NEVER throw ValidationException
public override PlatformValidationResult<IPlatformCqrsRequest> Validate()
    => base.Validate()
        .And(_ => Name.IsNotNullOrEmpty(), "Name required")
        .And(_ => Age >= 18, "Must be 18+");
```

### 3. CQRS Command (Single File)

```csharp
// Command + Result + Handler in ONE file under UseCaseCommands/{Feature}/
public sealed class SaveEntityCommand : PlatformCqrsCommand<SaveEntityCommandResult> { }
public sealed class SaveEntityCommandResult : PlatformCqrsCommandResult { }
internal sealed class SaveEntityCommandHandler : PlatformCqrsCommandApplicationHandler<...> { }
```

### 4. Event-Driven Side Effects

```csharp
// Side effects in Event Handlers (UseCaseEvents/), NOT in command handlers
internal sealed class SendNotificationOnCreateHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> e, CancellationToken ct)
        => await notificationService.SendAsync(e.EntityData);
}
```

### 5. DTO Mapping

```csharp
// DTOs own mapping via MapToEntity() - NEVER map in handlers
public class EmployeeDto : PlatformEntityDto<Employee, string>
{
    protected override Employee MapToEntity(Employee e, MapToEntityModes m)
    {
        e.Name = Name;
        return e;
    }
}
```

## Common Commands

```bash
dotnet build EasyPlatform.sln
dotnet run --project src/PlatformExampleApp/PlatformExampleApp.TextSnippet.Api
dotnet test [Project].csproj
```

## Anti-Patterns

- Direct cross-service DB access - Use message bus
- Manual validation throw - Use PlatformValidationResult fluent API
- Side effects in handler - Use entity event handlers
- DTO mapping in handler - DTO owns mapping

## Related Documentation

- [CLAUDE.md](../CLAUDE.md#backend-patterns) - Complete backend patterns
- [Architecture Overview](./architecture-overview.md) - System design
