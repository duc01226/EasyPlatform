namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represents a repository interface for platform memory caching operations.
/// This interface extends the base platform cache repository to provide in-memory caching capabilities.
/// Memory cache provides fast access to frequently used data by storing it in the application's memory.
/// </summary>
public interface IPlatformMemoryCacheRepository : IPlatformCacheRepository { }
