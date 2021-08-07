using MongoDB.Bson.Serialization;

namespace AngularDotnetPlatform.Platform.MongoDB.Serializer.Abstract
{
    public interface IPlatformMongoBaseSerializer : IBsonSerializer
    {
    }

    public interface IPlatformMongoBaseSerializer<TValue> : IBsonSerializer<TValue>, IPlatformMongoBaseSerializer
    {
    }
}
