---
agent: 'agent'
description: 'Generate an Entity Event Handler for side effects following EasyPlatform patterns'
tools: ['read', 'edit', 'search', 'execute']
---

# Create Entity Event Handler

## Required Reading

**Before implementing, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for entity events, side effects, message bus

---

Create an Entity Event Handler for side effects triggered by entity CRUD operations:

**Entity Name:** ${input:entityName}
**Service Name:** ${input:serviceName}
**Feature Name:** ${input:featureName}
**Action:** ${input:action:SendNotification,SyncData,UpdateStats,SendEmail}
**Trigger Event:** ${input:triggerEvent:Created,Updated,Deleted,Created or Updated}

## When to Use

- Sending notifications (email, Teams, Slack) after entity changes
- Calling external APIs after entity changes
- Cross-service communication via message bus
- Audit logging or analytics tracking
- ANY side effect triggered by entity CRUD

## CRITICAL RULE

**NEVER call side effects directly in command handlers!**

Platform automatically raises `PlatformCqrsEntityEvent` on repository CRUD.

## File Location & Naming

```
{Service}.Application/
└── UseCaseEvents/
    └── {Feature}/
        └── {Action}On{Event}{Entity}EntityEventHandler.cs
```

**Naming Examples:**
- `SendNotificationOnCreateLeaveRequestEntityEventHandler.cs`
- `SyncEmployeeOnEmployeeUpdatedEntityEventHandler.cs`
- `SendEmailOnPublishGoalEntityEventHandler.cs`

---

## Implementation Pattern

```csharp
// File: {Action}On{Event}{Entity}EntityEventHandler.cs

using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.Cqrs;

namespace {Service}.Application.UseCaseEvents.{Feature};

internal sealed class {Action}On{Event}{Entity}EntityEventHandler
    : PlatformCqrsEntityEventApplicationHandler<{Entity}>  // Single generic parameter!
{
    private readonly INotificationService notificationService;
    private readonly I{Service}RootRepository<{Entity}> repository;

    public {Action}On{Event}{Entity}EntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        INotificationService notificationService,
        I{Service}RootRepository<{Entity}> repository)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.notificationService = notificationService;
        this.repository = repository;
    }

    // Filter: Which events to handle
    // NOTE: Must be public override async Task<bool> - NOT protected, NOT bool!
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
    {
        // Skip during test data seeding
        if (@event.RequestContext.IsSeedingTestingData()) return false;

        // Only handle specific CRUD actions
        return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<{Entity}> @event,
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

## CRUD Action Filtering Patterns

### Single Action
```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
{
    return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Created;
}
```

### Multiple Actions
```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
{
    return @event.CrudAction is PlatformCqrsEntityEventCrudAction.Created
        or PlatformCqrsEntityEventCrudAction.Updated;
}
```

### Updated with Specific Condition
```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
{
    return @event.CrudAction == PlatformCqrsEntityEventCrudAction.Updated
        && @event.EntityData.Status == Status.Published;
}
```

### Skip Test Data Seeding
```csharp
public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<{Entity}> @event)
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

## Anti-Patterns to AVOID

### Wrong signature for HandleWhen
```csharp
// WRONG - must be public override async Task<bool>
protected override bool HandleWhen(...) { }
```

### Two generic parameters
```csharp
// WRONG - only use single generic parameter
: PlatformCqrsEntityEventApplicationHandler<{Entity}, string>
```

### Wrong folder location
```csharp
// WRONG - don't use DomainEventHandlers/
{Service}.Application/DomainEventHandlers/...

// CORRECT - use UseCaseEvents/
{Service}.Application/UseCaseEvents/{Feature}/...
```

### Side effects in command handler
```csharp
// WRONG - never do this!
protected override async Task<Result> HandleAsync(Command req, CancellationToken ct)
{
    await repository.CreateAsync(entity, ct);
    await notificationService.SendAsync(entity);  // BAD!
}
```

---

## Verification Checklist

- [ ] Handler is in `UseCaseEvents/` folder (not `DomainEventHandlers/`)
- [ ] Uses `PlatformCqrsEntityEventApplicationHandler<{Entity}>` (single generic param)
- [ ] `HandleWhen` is `public override async Task<bool>`
- [ ] Filters by `@event.CrudAction` appropriately
- [ ] Accesses entity via `@event.EntityData`
- [ ] Skips test data seeding if appropriate
- [ ] No side effects in command handlers
