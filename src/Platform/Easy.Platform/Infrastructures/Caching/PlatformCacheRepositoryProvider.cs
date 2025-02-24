using Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Provides an interface for managing cache repositories in the platform.
/// </summary>
/// <remarks>
/// This interface provides methods for getting cache repositories, including the last registered repository,
/// a repository by type, and collection cache repositories. It also provides a method for trying to get a cache repository by type.
/// </remarks>
public interface IPlatformCacheRepositoryProvider
{
    /// <summary>
    /// Retrieves a cache repository by type.
    /// </summary>
    /// <param name="cacheRepositoryType">The type of the cache repository to retrieve.</param>
    /// <param name="fallbackMemoryCacheIfNotExist">Whether to fallback to memory cache if the specified cache repository does not exist.</param>
    /// <returns>The cache repository of the specified type, or memory cache if the specified cache repository does not exist and fallback is enabled.</returns>
    public IPlatformCacheRepository Get(
        PlatformCacheRepositoryType cacheRepositoryType = PlatformCacheRepositoryType.Distributed,
        bool fallbackMemoryCacheIfNotExist = true);

    /// <summary>
    /// Tries to retrieve a cache repository by type.
    /// </summary>
    /// <param name="cacheRepositoryType">The type of the cache repository to retrieve.</param>
    /// <returns>The cache repository of the specified type, or null if it does not exist.</returns>
    public IPlatformCacheRepository? TryGet(PlatformCacheRepositoryType cacheRepositoryType);

    /// <summary>
    /// Retrieves a collection cache repository by type.
    /// </summary>
    /// <typeparam name="TCollectionCacheKeyProvider">The type of the collection cache key provider.</typeparam>
    /// <param name="cacheRepositoryType">The type of the cache repository to retrieve.</param>
    /// <param name="fallbackMemoryCacheIfNotExist">Whether to fallback to memory cache if the specified cache repository does not exist.</param>
    /// <returns>The collection cache repository of the specified type, or memory cache if the specified cache repository does not exist and fallback is enabled.</returns>
    public IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
        GetCollection<TCollectionCacheKeyProvider>(
            PlatformCacheRepositoryType cacheRepositoryType = PlatformCacheRepositoryType.Distributed,
            bool fallbackMemoryCacheIfNotExist = true)
        where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider;
}

/// <summary>
/// Provides a mechanism for managing cache repositories in the platform.
/// </summary>
/// <remarks>
/// This class is responsible for providing access to different types of cache repositories,
/// such as memory cache and distributed cache. It also allows for the retrieval of cache
/// repositories based on their type, and provides a fallback mechanism in case a specific
/// cache repository does not exist.
/// </remarks>
public class PlatformCacheRepositoryProvider : IPlatformCacheRepositoryProvider
{
    private readonly Dictionary<PlatformCacheRepositoryType, IPlatformCacheRepository> registeredCacheRepositoriesDic;

    private readonly IServiceProvider serviceProvider;

    public PlatformCacheRepositoryProvider(
        IServiceProvider serviceProvider,
        IEnumerable<IPlatformCacheRepository> registeredCacheRepositories)
    {
        this.serviceProvider = serviceProvider;
        registeredCacheRepositoriesDic = BuildRegisteredCacheRepositoriesDic(registeredCacheRepositories.ToList());
    }

    public IPlatformCacheRepository Get(
        PlatformCacheRepositoryType cacheRepositoryType = PlatformCacheRepositoryType.Distributed,
        bool fallbackMemoryCacheIfNotExist = true)
    {
        if (fallbackMemoryCacheIfNotExist == false)
            EnsureCacheRepositoryTypeRegistered(cacheRepositoryType);

        return registeredCacheRepositoriesDic.GetValueOrDefault(cacheRepositoryType) ?? registeredCacheRepositoriesDic[PlatformCacheRepositoryType.Memory];
    }

    public IPlatformCacheRepository? TryGet(PlatformCacheRepositoryType cacheRepositoryType)
    {
        try
        {
            return Get(cacheRepositoryType);
        }
        catch (Exception)
        {
            return null;
        }
    }

    public IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider> GetCollection<TCollectionCacheKeyProvider>(
        PlatformCacheRepositoryType cacheRepositoryType = PlatformCacheRepositoryType.Distributed,
        bool fallbackMemoryCacheIfNotExist = true)
        where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
    {
        if (fallbackMemoryCacheIfNotExist == false)
            EnsureCacheRepositoryTypeRegistered(cacheRepositoryType);

        return serviceProvider
                   .GetServices<IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>>()
                   .LastOrDefault(p => p.CacheRepositoryType() == cacheRepositoryType) ??
               serviceProvider
                   .GetServices<IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>>()
                   .LastOrDefault(p => p.CacheRepositoryType() == PlatformCacheRepositoryType.Memory);
    }

    private static Dictionary<PlatformCacheRepositoryType, IPlatformCacheRepository> BuildRegisteredCacheRepositoriesDic(
        List<IPlatformCacheRepository> registeredCacheRepositories)
    {
        return registeredCacheRepositories.GroupBy(p => p.GetType())
            .ToDictionary(
                p =>
                {
                    if (p.Key.IsAssignableTo(typeof(IPlatformDistributedCacheRepository)))
                        return PlatformCacheRepositoryType.Distributed;
                    if (p.Key.IsAssignableTo(typeof(IPlatformMemoryCacheRepository)))
                        return PlatformCacheRepositoryType.Memory;
                    if (p.Key.IsAssignableTo(typeof(PlatformHybridCacheRepository)))
                        return PlatformCacheRepositoryType.Hybrid;

                    throw new Exception($"Unknown PlatformCacheRepositoryType of {p.GetType().Name}");
                },
                p => p.Last());
    }

    private void EnsureCacheRepositoryTypeRegistered(PlatformCacheRepositoryType cacheRepositoryType)
    {
        if (!registeredCacheRepositoriesDic.ContainsKey(cacheRepositoryType))
            throw new Exception($"Type of {cacheRepositoryType} is not registered");
    }
}
