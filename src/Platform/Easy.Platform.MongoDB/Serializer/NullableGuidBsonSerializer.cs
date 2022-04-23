using System;
using Easy.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson.Serialization.Serializers;

namespace Easy.Platform.MongoDB.Serializer
{
    public class NullableGuidBsonSerializer : SerializerBase<Guid?>, IPlatformMongoBaseSerializer<Guid?>
    {
    }
}
