using MongoDB.Bson.Serialization;

namespace Easy.Platform.MongoDB.Utils;

public static class BsonClassMapUtil
{
    /// <summary>
    /// Register ClassMap If Not Registered.
    /// <para />
    /// Takes <see cref="PlatformMongoDbPersistenceModuleCache.RegistrationLock" /> — the same lock every other platform
    /// registration entry point uses — so the check and the registration it guards cannot be separated by another thread.
    /// Unlocked, two callers both observe "not registered" and the loser throws
    /// <c>ArgumentException: An item with the same key has already been added</c>, because the driver's class-map registry
    /// is append-only and rejects duplicates rather than ignoring them.
    /// </summary>
    public static void TryRegisterClassMap<TClassMap>(Action<BsonClassMap<TClassMap>> classMapInitializer)
    {
        lock (PlatformMongoDbPersistenceModuleCache.RegistrationLock)
        {
            if (!BsonClassMap.IsClassMapRegistered(typeof(TClassMap)))
                BsonClassMap.RegisterClassMap(classMapInitializer);
        }
    }
}
