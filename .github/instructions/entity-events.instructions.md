---
applyTo: '**/UseCaseEvents/**/*.cs'
---

# Entity Event Handler Patterns

> Auto-loads when editing Entity Event files. See `docs/backend-patterns-reference.md` for full reference.

## Entity Event Handler (Side Effects)

**Location:** `UseCaseEvents/{Feature}/{Action}On{Event}{Entity}EntityEventHandler.cs`

```csharp
internal sealed class SendNotificationOnCreateEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>
{
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
        => !@event.RequestContext.IsSeedingTestingData()
           && @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;

    protected override async Task HandleAsync(PlatformCqrsEntityEvent<Entity> @event, CancellationToken ct)
        => await notificationService.SendAsync(@event.EntityData);
}
```

## Entity Event Bus Producer (Cross-Service)

```csharp
// Auto-publishes entity changes to message bus
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string> { }
```

## Critical Rules

1. **ALL side effects** (notifications, emails, external API calls) MUST go here - NEVER in command handlers
2. **Check `HandleWhen`** to filter which events trigger the handler
3. **Skip test data** with `!@event.RequestContext.IsSeedingTestingData()`
4. **Use `CrudAction`** to distinguish Created/Updated/Deleted events
5. **Cross-service sync** uses `EntityEventBusMessageProducer` - auto-publishes to RabbitMQ

## Event Pattern Decision Tree

```
Within same service + Entity changed?  -> EntityEventApplicationHandler
Within same service + Command completed?  -> CommandEventApplicationHandler
Cross-service + Data sync needed?  -> EntityEventBusMessageProducer/Consumer
Cross-service + Background processing?  -> PlatformApplicationBackgroundJob
```

## Naming Convention

`{Action}On{CrudAction}{EntityName}EntityEventHandler`

Examples:

- `SendNotificationOnCreateLeaveRequestEntityEventHandler`
- `UpdateSummaryOnUpdateEmployeeEntityEventHandler`
- `CleanupOnDeleteProjectEntityEventHandler`
