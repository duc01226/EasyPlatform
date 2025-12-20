# Entity Event Handler Patterns Reference

## CRITICAL RULE

**NEVER call side effects directly in command handlers!**

Platform automatically raises `PlatformCqrsEntityEvent` on repository CRUD. Handle side effects in Entity Event Handlers instead.

---

## File Location & Naming

```
{Service}.Application/
└── UseCaseEvents/
    └── {Feature}/
        └── {Action}On{Event}{Entity}EntityEventHandler.cs
```

**Naming Examples:**
- `SendNotificationOnCreateLeaveRequestEntityEventHandler.cs`
- `UpdateCategoryStatsOnSnippetChangeEventHandler.cs`
- `SyncEmployeeOnEmployeeUpdatedEntityEventHandler.cs`
- `SendEmailOnPublishGoalEntityEventHandler.cs`

---

## Implementation Pattern

```csharp
internal sealed class SendNotificationOnCreateEntityEntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<Entity>  // Single generic parameter!
{
    private readonly INotificationService notificationService;
    private readonly IServiceRootRepository<Entity> repository;

    public SendNotificationOnCreateEntityEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService,
        IServiceRootRepository<Entity> repository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
        this.repository = repository;
    }

    // Filter: Which events to handle
    // NOTE: Must be public override async Task<bool> - NOT protected, NOT bool!
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
    {
        // Skip during test data seeding
        if (@event.RequestContext.IsSeedingTestingData()) return false;

        // Only handle specific CRUD actions
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<Entity> @event,
        CancellationToken ct)
    {
        var entity = @event.EntityData;

        // Load additional data if needed
        var relatedData = await repository.GetByIdAsync(entity.Id, ct, e => e.Related);

        // Execute side effect
        await notificationService.SendAsync(new NotificationRequest
        {
            EntityId = entity.Id,
            EntityName = entity.Name,
            Action = "Created",
            UserId = @event.RequestContext.UserId()
        });
    }
}
```

---

## CRUD Action Filtering

### Single Action

```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
{
    return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
}
```

### Multiple Actions

```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
{
    return @event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
        or PlatformCqrsEntityEventCrudAction.Updated;
}
```

### Updated with Specific Condition

```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
{
    return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated
        && @event.EntityData.Status == Status.Published;
}
```

### Skip Test Data Seeding

```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Entity> @event)
{
    if (@event.RequestContext.IsSeedingTestingData()) return false;
    return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
}
```

---

## Accessing Event Data

| Property | Description |
|----------|-------------|
| `@event.EntityData` | The entity that triggered the event |
| `@event.CrudAction` | Created, Updated, or Deleted |
| `@event.RequestContext` | Request context with user/company info |
| `@event.RequestContext.UserId()` | User who triggered the change |
| `@event.RequestContext.CurrentCompanyId()` | Company context |

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| `protected override bool HandleWhen()` | `public override async Task<bool> HandleWhen()` |
| Two generic parameters | Single generic: `<Entity>` |
| `DomainEventHandlers/` folder | `UseCaseEvents/` folder |
| Side effects in command handler | Entity Event Handler |

```csharp
// WRONG - two generic parameters
: PlatformCqrsEntityEventApplicationHandler<Entity, string>

// CORRECT - single generic parameter
: PlatformCqrsEntityEventApplicationHandler<Entity>
```

```csharp
// WRONG - side effects in command handler
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity);  // BAD!
}

// CORRECT - use Entity Event Handler
```
