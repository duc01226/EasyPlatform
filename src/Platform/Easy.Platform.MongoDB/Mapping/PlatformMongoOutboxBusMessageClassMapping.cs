using Easy.Platform.Application.MessageBus.OutboxPattern;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoOutboxBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformOutboxBusMessage,
            string>
    {
    }

    public class PlatformDefaultMongoOutboxBusMessageClassMapping : PlatformMongoOutboxBusMessageClassMapping
    {
        public override void ClassMapInitializer(BsonClassMap<PlatformOutboxBusMessage> cm)
        {
            base.ClassMapInitializer(cm);
        }
    }
}
