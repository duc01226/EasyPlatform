using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoInboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformInboxEventBusMessage, string>
    {
    }

    public class PlatformDefaultMongoInboxEventBusMessageClassMapping : PlatformMongoInboxEventBusMessageClassMapping
    {
        public override void ClassMapInitializer(BsonClassMap<PlatformInboxEventBusMessage> cm)
        {
            base.ClassMapInitializer(cm);

            cm.MapProperty(p => p.ConsumeStatus)
                .SetSerializer(new EnumSerializer<PlatformInboxEventBusMessage.ConsumeStatuses>(BsonType.String));
        }
    }
}
