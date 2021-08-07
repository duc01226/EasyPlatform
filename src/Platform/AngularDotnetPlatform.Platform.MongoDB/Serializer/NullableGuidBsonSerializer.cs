using System;
using AngularDotnetPlatform.Platform.MongoDB.Serializer.Abstract;
using MongoDB.Bson.Serialization.Serializers;

namespace AngularDotnetPlatform.Platform.MongoDB.Serializer
{
    public class NullableGuidBsonSerializer : SerializerBase<Guid?>, IPlatformMongoBaseSerializer<Guid?>
    {
    }
}
