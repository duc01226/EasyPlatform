using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Provides an interface for a platform collection cache repository.
/// </summary>
/// <typeparam name="TCollectionCacheKeyProvider">The type of the collection cache key provider.</typeparam>
/// <remarks>
/// This interface defines methods for getting, setting, and removing cache entries,
/// as well as methods for caching requests and removing all cache entries.
/// </remarks>
public interface IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
    where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    T Get<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);

    /// <summary>
    /// Retrieves the cached value of the specified type.
    /// </summary>
    /// <typeparam name="T">The type of the value to retrieve.</typeparam>
    /// <param name="requestKeyParts">An array of strings that form the request key. If null, the default request key is used.</param>
    /// <returns>The cached value of the specified type.</returns>
    /// <remarks>
    /// This method retrieves the cached value associated with the request key formed by the provided array of strings.
    /// If the array is null, the default request key is used.
    /// </remarks>
    T Get<T>(string[] requestKeyParts = null);

    Task<T> GetAsync<T>(
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        CancellationToken token = default);

    Task<T> GetAsync<T>(string[] requestKeyParts = null, CancellationToken token = default);

    void Set<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null);

    void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string[] requestKeyParts = null, List<string> tags = null);

    Task SetAsync<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null,
        CancellationToken token = default);

    Task SetAsync<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default);

    void Set<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null);

    void Set<T>(T value, double? absoluteExpirationInSeconds = null, string[] requestKeyParts = null, List<string> tags = null);

    Task SetAsync<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null,
        CancellationToken token = default);

    Task SetAsync<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default);

    Task RemoveAsync(
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        CancellationToken token = default);

    Task RemoveAsync(string[] requestKeyParts = null, CancellationToken token = default);

    PlatformCacheRepositoryType CacheRepositoryType();

    Task RemoveAllAsync();

    /// <summary>
    /// Asynchronously removes the cache entries that match the specified predicate.
    /// </summary>
    /// <param name="cacheRequestKeyPredicate">The function to test each cache request key for a condition.</param>
    /// <param name="token">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    /// <remarks>
    /// The method will remove all cache entries where the cache request key satisfies the condition provided by the predicate function.
    /// </remarks>
    Task RemoveAsync(
        Func<string, bool>? cacheRequestKeyPredicate,
        CancellationToken token = default);

    /// <summary>
    /// Asynchronously removes the cache entries that match the specified predicate.
    /// </summary>
    /// <param name="cacheRequestKeyPartsPredicate">The function to test each cache request key parts for a condition.</param>
    /// <param name="token">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    /// <remarks>
    /// The method will remove all cache entries where the cache request key satisfies the condition provided by the predicate function.
    /// </remarks>
    Task RemoveAsync(
        Func<string[], bool>? cacheRequestKeyPartsPredicate,
        CancellationToken token = default);

    /// <summary>
    /// Removes cache entries associated with the specified tags.
    /// </summary>
    /// <param name="tags">The tags associated with the cache entries to remove.</param>
    /// <param name="cacheKeyPredicate">An optional function filter the requested value predicate.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken"/> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task"/> that represents the asynchronous operation.</returns>
    Task RemoveByTagsAsync(List<string> tags, Func<PlatformCacheKey, bool> cacheKeyPredicate = null, CancellationToken token = default);

    Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default);

    Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts = null,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default);

    Task<TData> CacheRequestUseConfigOptionsAsync<TConfigurationCacheOptions, TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default)
        where TConfigurationCacheOptions : PlatformConfigurationCacheEntryOptions;

    Task<TData> CacheRequestUseConfigOptionsAsync<TConfigurationCacheOptions, TData>(
        Func<Task<TData>> request,
        string requestKey,
        List<string> tags = null,
        CancellationToken token = default)
        where TConfigurationCacheOptions : PlatformConfigurationCacheEntryOptions;

    Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string requestKey,
        double? absoluteExpirationInSeconds,
        List<string> tags = null,
        CancellationToken token = default);

    Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts,
        double? absoluteExpirationInSeconds,
        List<string> tags = null,
        CancellationToken token = default);
}

/// <summary>
/// Collection cache repository for last registered cache repository
/// </summary>
public abstract class PlatformCollectionCacheRepository<TCollectionCacheKeyProvider> : IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
    where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    protected readonly IPlatformCacheRepositoryProvider CacheRepositoryProvider;
    protected readonly TCollectionCacheKeyProvider CollectionCacheKeyProvider;
    protected readonly IServiceProvider ServiceProvider;

    public PlatformCollectionCacheRepository(
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        TCollectionCacheKeyProvider collectionCacheKeyProvider,
        IServiceProvider serviceProvider)
    {
        CollectionCacheKeyProvider = collectionCacheKeyProvider;
        ServiceProvider = serviceProvider;
        CacheRepositoryProvider = cacheRepositoryProvider;
    }

    public T Get<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey)
    {
        return CacheRepository().Get<T>(CollectionCacheKeyProvider.GetKey(requestKey));
    }

    public T Get<T>(string[] requestKeyParts = null)
    {
        return CacheRepository().Get<T>(CollectionCacheKeyProvider.GetKey(requestKeyParts));
    }

    public Task<T> GetAsync<T>(
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        CancellationToken token = default)
    {
        return CacheRepository().GetAsync<T>(CollectionCacheKeyProvider.GetKey(requestKey), token);
    }

    public Task<T> GetAsync<T>(string[] requestKeyParts = null, CancellationToken token = default)
    {
        return CacheRepository().GetAsync<T>(CollectionCacheKeyProvider.GetKey(requestKeyParts), token);
    }

    public void Set<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null)
    {
        CacheRepository().Set(CollectionCacheKeyProvider.GetKey(requestKey), value, cacheOptions, tags);
    }

    public void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string[] requestKeyParts = null, List<string> tags = null)
    {
        CacheRepository().Set(CollectionCacheKeyProvider.GetKey(requestKeyParts), value, cacheOptions, tags);
    }

    public async Task SetAsync<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null,
        CancellationToken token = default)
    {
        await CacheRepository()
            .SetAsync(
                CollectionCacheKeyProvider.GetKey(requestKey),
                value,
                cacheOptions,
                tags,
                token);
    }

    public async Task SetAsync<T>(
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        await CacheRepository()
            .SetAsync(
                CollectionCacheKeyProvider.GetKey(requestKeyParts),
                value,
                cacheOptions,
                tags,
                token);
    }

    public void Set<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        Set(value, defaultCacheOptions, requestKey, tags);
    }

    public void Set<T>(T value, double? absoluteExpirationInSeconds = null, string[] requestKeyParts = null, List<string> tags = null)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        Set(value, defaultCacheOptions, requestKeyParts, tags);
    }

    public async Task SetAsync<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        await SetAsync(
            value,
            defaultCacheOptions,
            requestKey,
            tags,
            token);
    }

    public async Task SetAsync<T>(
        T value,
        double? absoluteExpirationInSeconds = null,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        await SetAsync(
            value,
            defaultCacheOptions,
            requestKeyParts,
            tags,
            token);
    }

    public async Task RemoveAsync(
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        CancellationToken token = default)
    {
        await CacheRepository().RemoveAsync(CollectionCacheKeyProvider.GetKey(requestKey), token);
    }

    public async Task RemoveAsync(string[] requestKeyParts = null, CancellationToken token = default)
    {
        await CacheRepository().RemoveAsync(CollectionCacheKeyProvider.GetKey(requestKeyParts), token);
    }

    public async Task RemoveAllAsync()
    {
        await RemoveAsync(cacheRequestKeyPredicate: null);
    }

    public async Task RemoveAsync(
        Func<string, bool> cacheRequestKeyPredicate,
        CancellationToken token = default)
    {
        await CacheRepository()
            .RemoveByTagsAsync(
                [PlatformCacheKey.BuildCacheKeyContextAndCollectionTag(CollectionCacheKeyProvider.Context, CollectionCacheKeyProvider.Collection)],
                cacheRequestKeyPredicate != null ? cacheKey => cacheRequestKeyPredicate(cacheKey.RequestKey) : null,
                token);
    }

    public async Task RemoveAsync(
        Func<string[], bool> cacheRequestKeyPartsPredicate,
        CancellationToken token = default)
    {
        await CacheRepository()
            .RemoveByTagsAsync(
                [PlatformCacheKey.BuildCacheKeyContextAndCollectionTag(CollectionCacheKeyProvider.Context, CollectionCacheKeyProvider.Collection)],
                cacheRequestKeyPartsPredicate != null ? cacheKey => cacheRequestKeyPartsPredicate(cacheKey.RequestKeyParts()) : null,
                token);
    }

    public async Task RemoveByTagsAsync(List<string> tags, Func<PlatformCacheKey, bool> cacheKeyPredicate = null, CancellationToken token = default)
    {
        var taggedKeys = await tags.ParallelAsync(tag => CacheRepository().GetTaggedKeys(tag, token)).Then(taggedKeysList => taggedKeysList.Flatten().ToHashSet());

        await CacheRepository()
            .RemoveByTagsAsync(
                [PlatformCacheKey.BuildCacheKeyContextAndCollectionTag(CollectionCacheKeyProvider.Context, CollectionCacheKeyProvider.Collection)],
                cacheKey =>
                {
                    return cacheKeyPredicate?.Invoke(cacheKey) != false && taggedKeys.Contains(cacheKey);
                },
                token);
    }

    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        return CacheRepository()
            .CacheRequestAsync(
                request,
                CollectionCacheKeyProvider.GetKey(requestKey),
                cacheOptions,
                tags,
                token);
    }

    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts = null,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        return CacheRepository()
            .CacheRequestAsync(
                request,
                CollectionCacheKeyProvider.GetKey(requestKeyParts),
                cacheOptions,
                tags,
                token);
    }

    public Task<TData> CacheRequestUseConfigOptionsAsync<TConfigurationCacheOptions, TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts = null,
        List<string> tags = null,
        CancellationToken token = default)
        where TConfigurationCacheOptions : PlatformConfigurationCacheEntryOptions
    {
        return CacheRequestAsync(
            request,
            requestKeyParts,
            ServiceProvider.GetService<TConfigurationCacheOptions>(),
            tags,
            token);
    }

    public Task<TData> CacheRequestUseConfigOptionsAsync<TConfigurationCacheOptions, TData>(
        Func<Task<TData>> request,
        string requestKey,
        List<string> tags = null,
        CancellationToken token = default)
        where TConfigurationCacheOptions : PlatformConfigurationCacheEntryOptions
    {
        return CacheRequestAsync(
            request,
            requestKey,
            ServiceProvider.GetService<TConfigurationCacheOptions>(),
            tags,
            token);
    }

    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string requestKey,
        double? absoluteExpirationInSeconds,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        return CacheRequestAsync(
            request,
            requestKey,
            defaultCacheOptions,
            tags,
            token);
    }

    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        string[] requestKeyParts,
        double? absoluteExpirationInSeconds,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var defaultCacheOptions = CacheRepository()
            .GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        return CacheRequestAsync(
            request,
            requestKeyParts,
            defaultCacheOptions,
            tags,
            token);
    }

    public abstract PlatformCacheRepositoryType CacheRepositoryType();

    protected IPlatformCacheRepository CacheRepository()
    {
        return CacheRepositoryProvider.Get(CacheRepositoryType());
    }
}

public class PlatformCollectionMemoryCacheRepository<TCollectionCacheKeyProvider> : PlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
    where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public PlatformCollectionMemoryCacheRepository(
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        TCollectionCacheKeyProvider collectionCacheKeyProvider,
        IServiceProvider serviceProvider) : base(
        cacheRepositoryProvider,
        collectionCacheKeyProvider,
        serviceProvider)
    {
    }

    public override PlatformCacheRepositoryType CacheRepositoryType()
    {
        return PlatformCacheRepositoryType.Memory;
    }
}

public class PlatformCollectionDistributedCacheRepository<TCollectionCacheKeyProvider> : PlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
    where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public PlatformCollectionDistributedCacheRepository(
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        TCollectionCacheKeyProvider collectionCacheKeyProvider,
        IServiceProvider serviceProvider) : base(
        cacheRepositoryProvider,
        collectionCacheKeyProvider,
        serviceProvider)
    {
    }

    public override PlatformCacheRepositoryType CacheRepositoryType()
    {
        return PlatformCacheRepositoryType.Distributed;
    }
}

public class PlatformCollectionHybridCacheRepository<TCollectionCacheKeyProvider> : PlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
    where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
{
    public PlatformCollectionHybridCacheRepository(
        IPlatformCacheRepositoryProvider cacheRepositoryProvider,
        TCollectionCacheKeyProvider collectionCacheKeyProvider,
        IServiceProvider serviceProvider) : base(
        cacheRepositoryProvider,
        collectionCacheKeyProvider,
        serviceProvider)
    {
    }

    public override PlatformCacheRepositoryType CacheRepositoryType()
    {
        return PlatformCacheRepositoryType.Hybrid;
    }
}
