using System;
using AngularDotnetPlatform.Platform.Domain.Repositories;

namespace AngularDotnetPlatform.Platform.Application.EventBus
{
    public interface IPlatformInboxEventBusMessageRepository : IPlatformQueryableRootRepository<PlatformInboxEventBusMessage, string>
    {
    }
}
