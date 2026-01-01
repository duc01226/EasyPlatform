---
applyTo: "src/PlatformExampleApp/**/*EntityEventHandler*.cs,src/PlatformExampleApp/**/*EventHandler*.cs"
excludeAgent: ["copilot-code-review"]
description: "Entity event handler patterns for side effects in EasyPlatform"
---

# Entity Event Handler Patterns

## CRITICAL RULE

**NEVER call side effects directly in command handlers!**

Platform automatically raises `PlatformCqrsEntityEvent` on repository CRUD operations.

## File Location & Naming

```
{Service}.Application/
└── UseCaseEvents/
    └── {Feature}/
        └── {Action}On{Event}{Entity}EntityEventHandler.cs
```

**Examples:**
- `SendNotificationOnCreateLeaveRequestEntityEventHandler.cs`
- `SyncEmployeeOnEmployeeUpdatedEntityEventHandler.cs`

## Implementation Pattern

```csharp
internal sealed class Send{Action}On{Event}{Entity}EntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<{Entity}>  // Single generic parameter!
{
    private readonly INotificationService notificationService;

    public Send{Action}On{Event}{Entity}EntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
    }

    // NOTE: Must be public override async Task<bool>
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<{Entity}> @event,
        CancellationToken ct)
    {
        await notificationService.SendAsync(@event.EntityData);
    }
}
```

## CRUD Action Filtering

```csharp
// Single action
return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

// Multiple actions
return @event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
    or PlatformCqrsEntityEventCrudAction.Updated;

// With condition
return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated
    && @event.EntityData.Status == Status.Published;
```

## Event Data Access

| Property | Description |
|----------|-------------|
| `@event.EntityData` | The entity that triggered the event |
| `@event.CrudAction` | Created, Updated, or Deleted |
| `@event.RequestContext` | Request context with user/company info |
| `@event.RequestContext.UserId()` | User who triggered the change |

## Anti-Patterns

- **Wrong:** `HandleWhen` as `protected override bool` (must be `public override async Task<bool>`)
- **Wrong:** Two generic parameters on base class
- **Wrong:** Placing in `DomainEventHandlers/` folder (use `UseCaseEvents/`)
- **Wrong:** Calling side effects directly in command handlers
