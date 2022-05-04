using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.OutboxPattern;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoOutboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformOutboxEventBusMessage, string>
    {
    }

    public class PlatformDefaultMongoOutboxEventBusMessageClassMapping : PlatformMongoOutboxEventBusMessageClassMapping
    {
        public override void ClassMapInitializer(BsonClassMap<PlatformOutboxEventBusMessage> cm)
        {
            base.ClassMapInitializer(cm);

            cm.MapProperty(p => p.SendStatus)
                .SetSerializer(new EnumSerializer<PlatformOutboxEventBusMessage.SendStatuses>(BsonType.String));
        }
    }
}
