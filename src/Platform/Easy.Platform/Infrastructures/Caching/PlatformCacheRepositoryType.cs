namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Defines the types of cache repositories available in the platform caching system.
/// This enumeration specifies the different caching strategies and storage mechanisms that can be used.
/// </summary>
public enum PlatformCacheRepositoryType
{
    /// <summary>
    /// In-memory caching that stores data within the application's memory space.
    /// Provides the fastest access times but is limited to a single application instance and is not shared across multiple instances.
    /// Data is lost when the application restarts.
    /// </summary>
    Memory,

    /// <summary>
    /// Distributed caching that stores data in an external cache store (such as Redis).
    /// Allows multiple application instances to share the same cached data, providing scalability and consistency.
    /// Data persists across application restarts and can be shared between different services.
    /// </summary>
    Distributed,

    /// <summary>
    /// Hybrid caching that combines both memory and distributed caching strategies.
    /// Provides the performance benefits of memory caching with the scalability and persistence of distributed caching.
    /// Typically uses a multi-tier approach where data is cached locally in memory and also in a distributed cache.
    /// </summary>
    Hybrid,
}
