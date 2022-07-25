using Easy.Platform.Application.MessageBus.InboxPattern;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Mapping;

public abstract class PlatformMongoInboxBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformInboxBusMessage, string>
{
}

public class PlatformDefaultMongoInboxBusMessageClassMapping : PlatformMongoInboxBusMessageClassMapping
{
    public override void ClassMapInitializer(BsonClassMap<PlatformInboxBusMessage> cm)
    {
        base.ClassMapInitializer(cm);
    }
}
