using Easy.Platform.MongoDB.Mapping;
using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Helpers;

internal static class BsonClassMapHelper
{
    public static void DefaultClassMapInitializer<TClassMap>(BsonClassMap<TClassMap> cm)
    {
        cm.AutoMap();
        cm.SetIgnoreExtraElements(true);
        PlatformMongoClassMapping.ApplyEnumAsStringMappingConvention(cm);
        PlatformMongoClassMapping.ApplyGuidAsStringMappingConvention(cm);
        PlatformMongoClassMapping.ApplyTimeOnlyAsStringMappingConvention(cm);
    }

    public static void TryRegisterClassMapWithDefaultInitializer<TClassMap>()
    {
        // Shares PlatformMongoDbPersistenceModuleCache.RegistrationLock rather than owning a private lock: a private lock
        // would serialize only this method against itself while the OTHER registration entry points hold a different lock,
        // and two locks over one process-global registry give no mutual exclusion at all.
        lock (PlatformMongoDbPersistenceModuleCache.RegistrationLock)
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(TClassMap)))
                BsonClassMap.RegisterClassMap<TClassMap>(DefaultClassMapInitializer);
        }
    }
}
