using AngularDotnetPlatform.Platform.Application.EventBus;

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
