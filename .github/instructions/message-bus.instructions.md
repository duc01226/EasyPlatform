---
applyTo: '**/MessageBus*/**/*.cs,**/*Consumer*.cs,**/*Producer*.cs'
---

# Message Bus Patterns (Cross-Service Communication)

> Auto-loads when editing MessageBus/Consumer/Producer files. See `docs/backend-patterns-reference.md` for full reference.

## Entity Event Bus Producer

```csharp
// Auto-publishes entity changes to message bus (RabbitMQ)
public class EmployeeEntityEventBusMessageProducer :
    PlatformCqrsEntityEventBusMessageProducer<EmployeeEntityEventBusMessage, Employee, string> { }
```

## Message Bus Consumer

```csharp
internal sealed class UpsertEntityConsumer : PlatformApplicationMessageBusConsumer<EntityEventBusMessage>
{
    public override async Task<bool> HandleWhen(EntityEventBusMessage msg, string routingKey) => true;

    public override async Task HandleLogicAsync(EntityEventBusMessage msg, string routingKey)
    {
        if (msg.Payload.CrudAction == Created || (msg.Payload.CrudAction == Updated && !msg.Payload.EntityData.IsDeleted))
        {
            // Wait for dependencies to be available
            var (companyMissing, userMissing) = await (
                Util.TaskRunner.TryWaitUntilAsync(() => companyRepo.AnyAsync(c => c.Id == msg.Payload.EntityData.CompanyId), maxWaitSeconds: 300).Then(p => !p),
                Util.TaskRunner.TryWaitUntilAsync(() => userRepo.AnyAsync(u => u.Id == msg.Payload.EntityData.UserId), maxWaitSeconds: 300).Then(p => !p)
            );
            if (companyMissing || userMissing) return;

            var existing = await repository.FirstOrDefaultAsync(e => e.Id == msg.Payload.EntityData.Id);
            if (existing == null)
                await repository.CreateAsync(msg.Payload.EntityData.ToEntity().With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
            else if (existing.LastMessageSyncDate <= msg.CreatedUtcDate)
                await repository.UpdateAsync(msg.Payload.EntityData.UpdateEntity(existing).With(e => e.LastMessageSyncDate = msg.CreatedUtcDate));
        }
        if (msg.Payload.CrudAction == Deleted)
            await repository.DeleteAsync(msg.Payload.EntityData.Id);
    }
}
```

## Critical Rules

1. **Cross-service communication MUST use message bus** - NEVER direct database access
2. **Use `TryWaitUntilAsync`** for dependency ordering (wait for parent entities)
3. **Check `LastMessageSyncDate`** to prevent out-of-order message processing
4. **Handle all CRUD actions:** Created, Updated, Deleted
5. **Idempotent processing** - check if entity already exists before creating

## Pattern: Dependency Waiting

When a consumer depends on entities from other services (e.g., Company, User), use `TryWaitUntilAsync` to wait for those entities to be synced first, with a reasonable timeout.

## Anti-Patterns

- **NEVER** access another service's database directly
- **NEVER** skip `LastMessageSyncDate` comparison - causes stale data
- **NEVER** assume dependencies are already synced - always wait/check
