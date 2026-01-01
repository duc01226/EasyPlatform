---
name: message-bus
description: Use when implementing cross-service communication via RabbitMQ message bus.
---

# Message Bus Development

## Required Reading

**For comprehensive C# backend patterns, you MUST read:**

**`docs/claude/backend-csharp-complete-guide.md`** - Complete patterns for message bus, cross-service communication, consumers

---

## Message Types

| Type    | Producer Role | Naming                                      |
| ------- | ------------- | ------------------------------------------- |
| Event   | Leader        | `{Service}{Feature}{Action}EventBusMessage` |
| Request | Follower      | `{Consumer}{Feature}RequestBusMessage`      |

## Entity Event Producer

Platform automatically handles this - entities sync via `PlatformCqrsEntityEventBusMessageProducer`.

## Consumer Pattern

```csharp
internal sealed class Upsert{Entity}OnEventConsumer :
    PlatformApplicationMessageBusConsumer<{Entity}EventBusMessage>
{
    private readonly IServiceRepository<{Entity}> repository;

    public override async Task<bool> HandleWhen({Entity}EventBusMessage msg, string routingKey)
        => true;  // Filter logic

    public override async Task HandleLogicAsync({Entity}EventBusMessage msg, string routingKey)
    {
        // Wait for dependencies
        var (companyMissing, userMissing) = await (
            Util.TaskRunner.TryWaitUntilAsync(
                () => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId),
                maxWaitSeconds: 300).Then(p => !p),
            Util.TaskRunner.TryWaitUntilAsync(
                () => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId),
                maxWaitSeconds: 300).Then(p => !p)
        );

        if (companyMissing || userMissing) return;

        // CREATE/UPDATE
        if (msg.Payload.CrudAction == Created ||
            (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            var existing = await repository.FirstOrDefaultAsync(
                e => e.Id == msg.Payload.EntityData.Id);

            if (existing == null)
                await repository.CreateAsync(
                    msg.Payload.EntityData.ToEntity()
                        .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(
                    msg.Payload.EntityData.UpdateEntity(existing)
                        .With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }

        // DELETE
        if (msg.Payload.CrudAction == Deleted ||
            (msg.Payload.CrudAction == Updated && msg.Payload.EntityData.IsDeleted))
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

## Key Patterns

- `TryWaitUntilAsync` - Wait for dependencies with timeout
- `LastMessageSyncDate` - Prevent race conditions
- `IsForceSyncDataRequest()` - Check for force sync requests
- Consumer class name matches message name + `Consumer` suffix
