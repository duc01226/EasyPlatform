using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Extensions;

public static class BsonClassMapExtension
{
    /// <summary>
    /// Register ClassMap If Not Registered
    /// </summary>
    public static void TryRegisterClassMap<TClassMap>(Action<BsonClassMap<TClassMap>> classMapInitializer)
    {
        if (!BsonClassMap.IsClassMapRegistered(typeof(TClassMap)))
            BsonClassMap.RegisterClassMap(classMapInitializer);
    }
}
