using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Serializer
{
    public class PlatformDynamicObjectMongoDbSerializer : SerializerBase<object>, IPlatformMongoBaseSerializer<object>
    {
        public override object Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
        }

        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, object value)
        {
            BsonSerializer.Serialize(context.Writer, PlatformObjectJsonConverter.TryGetReflectionDynamicIfJsonElement(value));
        }
    }
}
