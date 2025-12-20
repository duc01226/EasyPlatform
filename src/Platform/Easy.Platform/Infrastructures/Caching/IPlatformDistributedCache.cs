namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Represents a repository interface for platform distributed caching operations.
/// This interface extends the base platform cache repository to provide distributed caching capabilities.
/// Distributed cache allows multiple application instances to share cached data across different servers or processes,
/// providing scalability and consistency in multi-instance deployments.
/// </summary>
public interface IPlatformDistributedCacheRepository : IPlatformCacheRepository { }
