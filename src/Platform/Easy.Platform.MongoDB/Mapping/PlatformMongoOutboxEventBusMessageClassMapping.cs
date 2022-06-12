using Easy.Platform.Application.MessageBus.OutboxPattern;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoOutboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformOutboxBusMessage, string>
    {
    }

    public class PlatformDefaultMongoOutboxEventBusMessageClassMapping : PlatformMongoOutboxEventBusMessageClassMapping
    {
        public override void ClassMapInitializer(BsonClassMap<PlatformOutboxBusMessage> cm)
        {
            base.ClassMapInitializer(cm);

            cm.MapProperty(p => p.SendStatus)
                .SetSerializer(new EnumSerializer<PlatformOutboxBusMessage.SendStatuses>(BsonType.String));
        }
    }
}
