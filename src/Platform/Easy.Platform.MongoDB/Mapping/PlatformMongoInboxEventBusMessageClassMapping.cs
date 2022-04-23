using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoInboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformInboxEventBusMessage, string>
    {
    }

    public class PlatformDefaultMongoInboxEventBusMessageClassMapping : PlatformMongoInboxEventBusMessageClassMapping
    {

    }
}
