using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;

namespace AngularDotnetPlatform.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoInboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformInboxEventBusMessage, string>
    {
    }

    public class PlatformDefaultMongoInboxEventBusMessageClassMapping : PlatformMongoInboxEventBusMessageClassMapping
    {

    }
}
