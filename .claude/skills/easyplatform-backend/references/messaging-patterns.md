# Message Bus Patterns Reference

## File Locations

### Producer (Source Service)

```
{Service}.Application/
└── MessageBusProducers/
    └── {Entity}EntityEventBusMessageProducer.cs
```

### Consumer (Target Service)

```
{Service}.Application/
└── MessageBusConsumers/
    └── {SourceEntity}/
        └── {Action}On{Entity}EntityEventBusConsumer.cs
```

### Message Definition (Shared)

```
PlatformExampleApp.Shared/
└── CrossServiceMessages/
    └── {Entity}EntityEventBusMessage.cs
```

---

## Message Definition

```csharp
// In PlatformExampleApp.Shared
public sealed class EmployeeEntityEventBusMessage
    : PlatformCqrsEntityEventBusMessage<EmployeeEventData, string>
{
    public EmployeeEntityEventBusMessage() { }

    public EmployeeEntityEventBusMessage(
        PlatformCqrsEntityEvent<Employee> entityEvent,
        EmployeeEventData entityData)
        : base(entityEvent, entityData)
    {
    }
}

public sealed class EmployeeEventData
{
    public string Id { get; set; } = "";
    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string CompanyId { get; set; } = "";
    public bool IsDeleted { get; set; }

    public EmployeeEventData() { }

    public EmployeeEventData(Employee entity)
    {
        Id = entity.Id;
        FullName = entity.FullName;
        Email = entity.Email;
        CompanyId = entity.CompanyId;
        IsDeleted = entity.IsDeleted;
    }

    public TargetEmployee ToEntity() => new TargetEmployee
    {
        SourceId = Id,
        FullName = FullName,
        Email = Email,
        CompanyId = CompanyId
    };

    public TargetEmployee UpdateEntity(TargetEmployee existing)
    {
        existing.FullName = FullName;
        existing.Email = Email;
        return existing;
    }
}
```

---

## Pattern 1: Entity Event Producer

Auto-publishes when entity changes via repository CRUD.

```csharp
internal sealed class EmployeeEntityEventBusMessageProducer
    : PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string>
{
    public EmployeeEntityEventBusMessageProducer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider)
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<Employee> @event)
    {
        if (@event.RequestContext.IsSeedingTestingData()) return false;

        return @event.EntityData.IsActive ||
               @event.CrudAction == PlatformCqrsEntityEventCrudAction.Deleted;
    }

    protected override Task<EmployeeEntityEventBusMessage> BuildMessageAsync(
        PlatformCqrsEntityEvent<Employee> @event,
        CancellationToken ct)
    {
        return Task.FromResult(new EmployeeEntityEventBusMessage(
            @event,
            new EmployeeEventData(@event.EntityData)));
    }
}
```

---

## Pattern 2: Entity Event Consumer

```csharp
internal sealed class UpsertOrDeleteEmployeeOnEmployeeEntityEventBusConsumer
    : PlatformApplicationMessageBusConsumer<EmployeeEntityEventBusMessage>
{
    private readonly ITargetServiceRepository<TargetEmployee> employeeRepo;
    private readonly ITargetServiceRepository<Company> companyRepo;

    public override async Task<bool> HandleWhen(
        EmployeeEntityEventBusMessage message,
        string routingKey)
    {
        return true;
    }

    public override async Task HandleLogicAsync(
        EmployeeEntityEventBusMessage message,
        string routingKey)
    {
        var payload = message.Payload;
        var entityData = payload.EntityData;

        // ═══════════════════════════════════════════════════════════════════
        // WAIT FOR DEPENDENCIES (with timeout)
        // ═══════════════════════════════════════════════════════════════════
        var companyMissing = await Util.TaskRunner
            .TryWaitUntilAsync(
                () => companyRepo.AnyAsync(c => c.Id == entityData.CompanyId),
                maxWaitSeconds: message.IsForceSyncDataRequest() ? 30 : 300)
            .Then(found => !found);

        if (companyMissing)
        {
            Logger.LogWarning("Company {CompanyId} not found, skipping employee sync",
                entityData.CompanyId);
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // HANDLE DELETE
        // ═══════════════════════════════════════════════════════════════════
        if (payload.CrudAction == PlatformCqrsEntityEventCrudAction.Deleted ||
            (payload.CrudAction == PlatformCqrsEntityEventCrudAction.Updated && entityData.IsDeleted))
        {
            await employeeRepo.DeleteAsync(entityData.Id);
            return;
        }

        // ═══════════════════════════════════════════════════════════════════
        // HANDLE CREATE/UPDATE
        // ═══════════════════════════════════════════════════════════════════
        var existing = await employeeRepo.FirstOrDefaultAsync(
            e => e.SourceId == entityData.Id);

        if (existing == null)
        {
            await employeeRepo.CreateAsync(
                entityData.ToEntity()
                    .With(e => e.LastMessageSyncDate = message.CreatedUtcDate));
        }
        else if (existing.LastMessageSyncDate <= message.CreatedUtcDate)
        {
            await employeeRepo.UpdateAsync(
                entityData.UpdateEntity(existing)
                    .With(e => e.LastMessageSyncDate = message.CreatedUtcDate));
        }
        // else: Skip - we have a newer version already
    }
}
```

---

## Pattern 3: Custom Message (Non-Entity)

```csharp
// Message definition
public sealed class NotificationRequestMessage : PlatformBusMessage
{
    public string UserId { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Body { get; set; } = "";
    public NotificationType Type { get; set; }
}

// Producer (manual publish)
public class NotificationService
{
    private readonly IPlatformMessageBusProducer messageBus;

    public async Task SendNotificationAsync(NotificationRequest request)
    {
        await messageBus.PublishAsync(new NotificationRequestMessage
        {
            UserId = request.UserId,
            Subject = request.Subject,
            Body = request.Body,
            Type = request.Type
        });
    }
}

// Consumer
internal sealed class ProcessNotificationRequestConsumer
    : PlatformApplicationMessageBusConsumer<NotificationRequestMessage>
{
    public override async Task HandleLogicAsync(
        NotificationRequestMessage message,
        string routingKey)
    {
        await notificationService.ProcessAsync(message);
    }
}
```

---

## Message Naming Convention

| Type | Producer Role | Pattern | Example |
|------|---------------|---------|---------|
| Event | Leader | `<ServiceName><Feature><Action>EventBusMessage` | `CandidateJobBoardApiSyncCompletedEventBusMessage` |
| Request | Follower | `<ConsumerServiceName><Feature>RequestBusMessage` | `JobCreateNonexistentJobsRequestBusMessage` |

**Consumer Naming:** Consumer class name = Message class name + `Consumer` suffix

---

## Key Patterns

### Wait for Dependencies

```csharp
var found = await Util.TaskRunner.TryWaitUntilAsync(
    () => companyRepo.AnyAsync(c => c.Id == companyId),
    maxWaitSeconds: 300);

if (!found) return;
```

### Prevent Race Conditions

```csharp
if (existing.LastMessageSyncDate <= message.CreatedUtcDate)
{
    await repository.UpdateAsync(existing.With(e =>
        e.LastMessageSyncDate = message.CreatedUtcDate));
}
```

### Force Sync Detection

```csharp
var timeout = message.IsForceSyncDataRequest() ? 30 : 300;
```

---

## Anti-Patterns

| Don't | Do |
|-------|-----|
| No dependency waiting | `TryWaitUntilAsync` |
| No race condition handling | Check `LastMessageSyncDate` |
| Blocking in producer | Keep `BuildMessageAsync` fast |
| Only check `Deleted` action | Also check soft delete flag |

```csharp
// WRONG - only checks Deleted
if (payload.CrudAction == Deleted)

// CORRECT - also check soft delete flag
if (payload.CrudAction == Deleted ||
    (payload.CrudAction == Updated && entityData.IsDeleted))
```
