using AngularDotnetPlatform.Platform.Domain.Repositories;

namespace AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern
{
    public interface IPlatformInboxEventBusMessageRepository : IPlatformQueryableRootRepository<PlatformInboxEventBusMessage, string>
    {
    }
}
