using Easy.Platform.Domain.Repositories;

namespace Easy.Platform.Application.EventBus.OutboxPattern
{
    public interface IPlatformOutboxEventBusMessageRepository : IPlatformQueryableRootRepository<PlatformOutboxEventBusMessage, string>
    {
    }
}
