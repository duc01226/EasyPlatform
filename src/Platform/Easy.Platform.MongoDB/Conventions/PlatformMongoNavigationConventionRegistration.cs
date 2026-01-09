using MongoDB.Bson.Serialization.Conventions;

namespace Easy.Platform.MongoDB.Conventions;

/// <summary>
/// Thread-safe registration of navigation property conventions.
/// </summary>
public static class PlatformMongoNavigationConventionRegistration
{
    private static volatile bool registered;
    private static readonly Lock LockObj = new();

    /// <summary>
    /// Registers navigation property convention. Safe to call multiple times.
    /// </summary>
    public static void EnsureRegistered()
    {
        if (registered) return;

        lock (LockObj)
        {
            if (registered) return;

            var pack = new ConventionPack
            {
                new IgnoreNavigationPropertiesConvention()
            };

            ConventionRegistry.Register(
                name: "PlatformNavigationPropertyConventions",
                conventions: pack,
                filter: _ => true); // Apply to all types

            registered = true;
        }
    }
}
