using Easy.Platform.Application.MessageBus.InboxPattern;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Mapping
{
    public abstract class
        PlatformMongoInboxEventBusMessageClassMapping : PlatformMongoBaseEntityClassMapping<PlatformInboxBusMessage, string>
    {
    }

    public class PlatformDefaultMongoInboxEventBusMessageClassMapping : PlatformMongoInboxEventBusMessageClassMapping
    {
        public override void ClassMapInitializer(BsonClassMap<PlatformInboxBusMessage> cm)
        {
            base.ClassMapInitializer(cm);

            cm.MapProperty(p => p.ConsumeStatus)
                .SetSerializer(new EnumSerializer<PlatformInboxBusMessage.ConsumeStatuses>(BsonType.String));
        }
    }
}
