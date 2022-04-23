using Easy.Platform.Domain.Repositories;

namespace Easy.Platform.Application.EventBus.InboxPattern
{
    public interface IPlatformInboxEventBusMessageRepository : IPlatformQueryableRootRepository<PlatformInboxEventBusMessage, string>
    {
    }
}
