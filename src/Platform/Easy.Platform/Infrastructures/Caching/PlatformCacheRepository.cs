using System.Collections.Concurrent;
using System.Diagnostics;
using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// The IPlatformCacheRepository interface in the Easy.Platform.Infrastructures.Caching namespace is a key component of the caching infrastructure in the application. It provides a unified way to interact with different types of caching mechanisms, such as in-memory and distributed caches.
/// <br />
/// This interface defines methods for common caching operations, such as getting, setting, and removing cache entries. It also provides methods for handling asynchronous operations and managing cache entry options, including expiration settings.
/// <br />
/// The PlatformCacheRepository abstract class implements this interface, and specific cache repository classes like PlatformRedisDistributedCacheRepository and PlatformMemoryCacheRepository extend this abstract class to provide concrete implementations for different caching mechanisms.
/// <br />
/// The IPlatformMemoryCacheRepository and IPlatformDistributedCacheRepository interfaces extend IPlatformCacheRepository, indicating that they share the same basic caching operations but may have additional features specific to memory or distributed caching.
/// <br />
/// Overall, the IPlatformCacheRepository interface is crucial for abstracting the underlying caching mechanism, allowing the rest of the application to interact with the cache in a consistent and technology-agnostic manner.
/// </summary>
public interface IPlatformCacheRepository : IDisposable
{
    public static readonly string GlobalAllRequestCachedKeysCollectionName = "___PlatformGlobalCacheKeys___";
    public static readonly string TaggedKeysCacheKeyCollectionPart = "___PlatformGlobalCacheTags___";
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCacheRepository)}");

    /// <summary>
    /// Gets a value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <returns>The located value or null.</returns>
    public T Get<T>(PlatformCacheKey cacheKey);

    /// <summary>
    /// Gets a value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation, containing the located value or null.</returns>
    public Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default);

    /// <summary>
    /// Sets a value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="value">The value to set in the cache.</param>
    /// <param name="cacheOptions">The cache options for the value.</param>
    public void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null, List<string> tags = null);

    /// <summary>
    /// Sets the value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="value">The value to set in the cache.</param>
    /// <param name="cacheOptions">The cache options for the value.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation.</returns>
    public Task SetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default);

    /// <summary>
    /// Sets a value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="value">The value to set in the cache.</param>
    /// <param name="absoluteExpirationInSeconds">The absoluteExpirationInSeconds cache options for the value.</param>
    public void Set<T>(PlatformCacheKey cacheKey, T value, double? absoluteExpirationInSeconds = null);

    /// <summary>
    /// Sets the value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="value">The value to set in the cache.</param>
    /// <param name="absoluteExpirationInSeconds">The absoluteExpirationInSeconds cache options for the value.</param>
    /// <param name="tags">Tags associated with the cache. Help to remove the cache by tag</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation.</returns>
    public Task SetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        double? absoluteExpirationInSeconds = null,
        List<string> tags = null,
        CancellationToken token = default);

    /// <summary>
    /// Removes the value with the given key.
    /// </summary>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation.</returns>
    public Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default);

    /// <summary>
    /// Removes the value with the given key.
    /// </summary>
    /// <param name="cacheKeys">A list string identifying the requested value.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation.</returns>
    public Task RemoveAsync(List<PlatformCacheKey> cacheKeys, CancellationToken token = default);

    /// <summary>
    /// Removes cache entries associated with the specified tags.
    /// </summary>
    /// <param name="tags">The tags associated with the cache entries to remove.</param>
    /// <param name="cacheKeyPredicate">An optional function filter the requested value predicate.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken"/> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task"/> that represents the asynchronous operation.</returns>
    public abstract Task RemoveByTagsAsync(List<string> tags, Func<PlatformCacheKey, bool> cacheKeyPredicate = null, CancellationToken token = default);

    /// <summary>
    /// Removes the value with the given key predicate.
    /// </summary>
    /// <param name="cacheKeyPredicate">A function filter the requested value predicate.</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    /// <returns>The <see cref="Task" /> that represents the asynchronous operation.</returns>
    public Task RemoveAsync(Func<PlatformCacheKey, bool> cacheKeyPredicate, CancellationToken token = default);

    /// <summary>
    /// Removes the all cached value of collection with the given CollectionCacheKeyProvider.
    /// </summary>
    public Task RemoveCollectionAsync<TCollectionCacheKeyProvider>(CancellationToken token = default)
        where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider;

    /// <summary>
    /// Return cache from request function if exist. If not, call request function to get data, cache the data and return it.
    /// </summary>
    /// <param name="request">The request function return data to set in the cache.</param>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="cacheOptions">The cache options for the value.</param>
    /// <param name="tags">Tags associated with the cache. Help to remove the cache by tag</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        PlatformCacheKey cacheKey,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default);

    public Task<HashSet<PlatformCacheKey>> GetTaggedKeys(string tag, CancellationToken token);

    /// <summary>
    /// Return cache from request function if exist. If not, call request function to get data, cache the data and return it.
    /// </summary>
    /// <param name="request">The request function return data to set in the cache.</param>
    /// <param name="cacheKey">A string identifying the requested value.</param>
    /// <param name="absoluteExpirationInSeconds">The absoluteExpirationInSeconds cache options for the value.</param>
    /// <param name="tags">Tags associated with the cache. Help to remove the cache by tag</param>
    /// <param name="token">Optional. The <see cref="CancellationToken" /> used to propagate notifications that the operation should be canceled.</param>
    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        PlatformCacheKey cacheKey,
        double? absoluteExpirationInSeconds = null,
        List<string> tags = null,
        CancellationToken token = default);

    /// <summary>
    /// Return default cache entry options value. This could be config when register module, override <see cref="PlatformCachingModule.ConfigCacheSettings" />
    /// </summary>
    public PlatformCacheEntryOptions GetDefaultCacheEntryOptions();

    /// The ProcessClearDeprecatedGlobalRequestCachedKeys method is part of the IPlatformCacheRepository interface and is implemented in the PlatformCacheRepository abstract class. This method is designed to clear deprecated or outdated keys from the global request cache.
    /// <br />
    /// In the context of a caching system, this method is crucial for maintaining the freshness and relevance of the data stored in the cache. Over time, certain keys in the cache may become outdated or irrelevant, and keeping these keys can lead to inefficient use of memory and potentially incorrect data being served to the client.
    /// <br />
    /// The method is implemented in both PlatformMemoryCacheRepository and PlatformRedisDistributedCacheRepository classes, indicating that it's used for both in-memory and distributed Redis cache repositories.
    /// <br />
    /// In the PlatformAutoClearDeprecatedGlobalRequestCachedKeysBackgroundService class, this method is called in an interval process, suggesting that the clearing of deprecated global request cache keys is performed regularly as a background task. This helps to ensure that the cache is consistently maintained and that outdated keys are removed on a regular basis.
    public Task ProcessClearDeprecatedGlobalRequestCachedKeys();
}

public abstract class PlatformCacheRepository : IPlatformCacheRepository
{
    protected readonly PlatformCacheSettings CacheSettings;

    protected readonly IServiceProvider ServiceProvider;

    protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;

    protected readonly SemaphoreSlim SetGlobalCachedKeysAsyncLock = new(1, 1);

    private readonly Lazy<ILogger> loggerLazy;
    private bool disposed;

    public PlatformCacheRepository(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext)
    {
        ServiceProvider = serviceProvider;
        loggerLazy = new Lazy<ILogger>(() => loggerFactory.CreateLogger(typeof(PlatformCacheRepository).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
        CacheSettings = cacheSettings;
        ApplicationSettingContext = applicationSettingContext;
    }

    protected ILogger Logger => loggerLazy.Value;

    public virtual T Get<T>(PlatformCacheKey cacheKey)
    {
        return GetAsync<T>(cacheKey).GetResult();
    }

    public virtual async Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        using (var activity = IPlatformCacheRepository.ActivitySource.StartActivity($"{nameof(PlatformCacheRepository)}.{nameof(GetAsync)}"))
        {
            activity?.AddTag("cacheKey", cacheKey);

            return await CacheSettings.ExecuteWithSlowWarning(
                async () =>
                {
                    try
                    {
                        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                            async () =>
                            {
                                var result = await GetDistributedCache().GetAsync(cacheKey, token);

                                try
                                {
                                    // if the very first byte is 0x03 (In ASCII this is the “End of Text” control character), bail out
                                    if (result is { Length: > 0 } && result[0] == 0x03)
                                    {
                                        Logger.LogWarning("GetAsync: cached value for {CacheKey} starts with 0x03 → skipping deserialize", cacheKey);

                                        return default;
                                    }

                                    return result == null || result.Length == 0 ? default : PlatformJsonSerializer.Deserialize<T>(result);
                                }
                                catch (Exception e)
                                {
                                    Logger.LogError(e.BeautifyStackTrace(), "GetAsync Deserialize failed. CacheKey:{CacheKey}", cacheKey);

                                    // WHY: If parse failed, the cached data could be obsolete. Then just clear the cache
                                    await RemoveAsync(cacheKey, token);

                                    return default;
                                }
                            },
                            cancellationToken: token);
                    }
                    catch (Exception e)
                    {
                        throw new Exception($"{GetType().Name} GetAsync failed. {e.Message}.", e);
                    }
                },
                () => Logger);
        }
    }

    public virtual void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null, List<string> tags = null)
    {
        SetAsync(cacheKey, value, cacheOptions, tags).WaitResult();
    }

    public virtual async Task SetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        await CacheSettings.ExecuteWithSlowWarning(
            async () =>
            {
                await SetToDistributedCacheAsync(cacheKey, value, cacheOptions, tags, token);

                await UpdateGlobalCachedKeys(p => p.TryAdd(cacheKey, null));
            },
            () => Logger,
            true);
    }

    protected virtual async Task SetToDistributedCacheAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        try
        {
            await GetDistributedCache()
                .SetAsync(
                    cacheKey,
                    PlatformJsonSerializer.SerializeToUtf8Bytes(value),
                    MapToDistributedCacheEntryOptions(cacheOptions),
                    token);

            await AssociateCacheKeyWithTags(cacheKey, PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, tags), token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} SetCacheAsync failed. [CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    public void Set<T>(PlatformCacheKey cacheKey, T value, double? absoluteExpirationInSeconds = null)
    {
        var defaultCacheOptions = GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        Set(cacheKey, value, defaultCacheOptions);
    }

    public async Task SetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        double? absoluteExpirationInSeconds = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var defaultCacheOptions = GetDefaultCacheEntryOptions()
            .WithOptionalCustomAbsoluteExpirationInSeconds(absoluteExpirationInSeconds);

        await SetAsync(
            cacheKey,
            value,
            defaultCacheOptions,
            tags,
            token);
    }

    public virtual async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        await CacheSettings.ExecuteWithSlowWarning(
            async () =>
            {
                await InternalRemoveAsync(cacheKey, token);

                if (GetGlobalAllRequestCachedKeysCacheKey() != cacheKey)
                    await UpdateGlobalCachedKeys(p => p.TryRemove(cacheKey, out _));
            },
            () => Logger,
            true);
    }

    protected virtual async Task InternalRemoveAsync(PlatformCacheKey cacheKey, CancellationToken token)
    {
        try
        {
            await GetDistributedCache().RemoveAsync(cacheKey, token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} RemoveAsync failed. [CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    public virtual async Task RemoveAsync(List<PlatformCacheKey> cacheKeys, CancellationToken token = default)
    {
        if (cacheKeys.Any())
        {
            await SetGlobalCachedKeysAsync(async allCachedKeys =>
            {
                var clonedCacheKeys = cacheKeys.ToArray();

                await clonedCacheKeys.ParallelAsync(async matchedKey =>
                {
                    await InternalRemoveAsync(matchedKey, token);
                    allCachedKeys.TryRemove(matchedKey, out _);
                });
            });
        }
    }

    public virtual async Task RemoveByTagsAsync(List<string> tags, Func<PlatformCacheKey, bool> cacheKeyPredicate = null, CancellationToken token = default)
    {
        if (tags != null)
        {
            var tagKeyWithTaggedKeysList = await tags.ParallelAsync(async tag =>
            {
                var tagKey = BuildTagKey(tag);

                var taggedKeys = await GetTaggedKeys(tagKey, token);

                var toRemoveTaggedKeys = cacheKeyPredicate == null
                    ? taggedKeys
                    : taggedKeys.Select(PlatformCacheKey.FromFullCacheKeyString).Where(p => cacheKeyPredicate(p)).Select(p => p.ToString()).ToHashSet();
                var afterRemoveRemainingTaggedKeys = cacheKeyPredicate == null
                    ? []
                    : taggedKeys.Select(PlatformCacheKey.FromFullCacheKeyString).Where(p => !cacheKeyPredicate(p)).Select(p => p.ToString()).ToHashSet();

                return (tagKey, toRemoveTaggedKeys, afterRemoveRemainingTaggedKeys);
            });

            await tagKeyWithTaggedKeysList.SelectMany(p => p.toRemoveTaggedKeys)
                .ToHashSet()
                .Pipe(toRemoveCacheKeys => RemoveAsync(toRemoveCacheKeys.SelectList(PlatformCacheKey.FromFullCacheKeyString), token));
            await tagKeyWithTaggedKeysList.ParallelAsync(tagKeyWithUpdatedTaggedKeysItem => tagKeyWithUpdatedTaggedKeysItem.afterRemoveRemainingTaggedKeys.Count == 0
                ? GetDistributedCache().RemoveAsync(tagKeyWithUpdatedTaggedKeysItem.tagKey, token)
                : GetDistributedCache()
                    .SetAsync(
                        tagKeyWithUpdatedTaggedKeysItem.tagKey,
                        PlatformJsonSerializer.SerializeToUtf8Bytes(tagKeyWithUpdatedTaggedKeysItem.afterRemoveRemainingTaggedKeys),
                        token));
        }
    }

    protected PlatformCacheKey BuildTagKey(string tag)
    {
        return new PlatformCacheKey(ApplicationSettingContext.ApplicationName, IPlatformCacheRepository.TaggedKeysCacheKeyCollectionPart, tag);
    }

    public async Task RemoveAsync(
        Func<PlatformCacheKey, bool> cacheKeyPredicate,
        CancellationToken token = default)
    {
        var allCachedKeys = await LoadGlobalAllRequestCachedKeys();

        var matchedKeys = allCachedKeys.Select(p => p.Key).Where(cacheKeyPredicate).ToList();

        if (matchedKeys.Any()) await RemoveAsync(matchedKeys, token);
    }

    public async Task RemoveCollectionAsync<TCollectionCacheKeyProvider>(CancellationToken token = default)
        where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
    {
        await RemoveAsync(
            ServiceProvider.GetService<TCollectionCacheKeyProvider>()!.MatchCollectionKeyPredicate(),
            token);
    }

    public async Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        PlatformCacheKey cacheKey,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        var cachedDataResult = await TryGetAsync<TData>(cacheKey, token);

        return cachedDataResult.IsValid && cachedDataResult.Value is not null ? cachedDataResult.Value : await RequestAndCacheNewData();

        async Task<TData> RequestAndCacheNewData()
        {
            var requestedData = await request();

            Util.TaskRunner.QueueActionInBackground(
                () => TrySetAsync(
                    cacheKey,
                    requestedData,
                    cacheOptions,
                    tags,
                    token),
                loggerFactory: () => Logger,
                cancellationToken: token,
                logFullStackTraceBeforeBackgroundTask: false);

            return requestedData;
        }
    }

    public Task<TData> CacheRequestAsync<TData>(
        Func<Task<TData>> request,
        PlatformCacheKey cacheKey,
        double? absoluteExpirationInSeconds = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        return CacheRequestAsync(
            request,
            cacheKey,
            new PlatformCacheEntryOptions
            {
                AbsoluteExpirationInSeconds = absoluteExpirationInSeconds
            },
            tags,
            token);
    }

    public PlatformCacheEntryOptions GetDefaultCacheEntryOptions()
    {
        return ServiceProvider.GetService<PlatformCacheEntryOptions>() ?? CacheSettings.DefaultCacheEntryOptions;
    }

    public virtual async Task ProcessClearDeprecatedGlobalRequestCachedKeys()
    {
        await SetGlobalCachedKeysAsync(async toUpdateRequestCachedKeys =>
        {
            await toUpdateRequestCachedKeys
                .SelectList(p => p.Key)
                .ParallelAsync(async key =>
                {
                    if (await GetDistributedCache().GetAsync(key).Then(p => p.IsNullOrEmpty())) toUpdateRequestCachedKeys.TryRemove(key, out _);
                });
        });
    }

    protected async Task<PlatformValidationResult<T>> TryGetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        try
        {
            return await GetAsync<T>(cacheKey, token).Then(data => PlatformValidationResult<T>.Valid(data));
        }
        catch (Exception ex)
        {
            Logger.LogError(ex.BeautifyStackTrace(), "Try get data from cache failed. CacheKey:{CacheKey}", cacheKey.ToString());

            return PlatformValidationResult<T>.Invalid(default, ex.Message);
        }
    }

    protected async Task TrySetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        try
        {
            await SetAsync(cacheKey, value, cacheOptions, tags, token);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex.BeautifyStackTrace(), "Try set data to cache failed. CacheKey:{CacheKey}", cacheKey.ToString());
        }
    }

    /// <summary>
    /// Used to build a unique cache key to store list of all request cached keys
    /// </summary>
    public virtual PlatformCacheKey GetGlobalAllRequestCachedKeysCacheKey()
    {
        return new PlatformCacheKey(
            context: ApplicationSettingContext.ApplicationName,
            collection: IPlatformCacheRepository.GlobalAllRequestCachedKeysCollectionName);
    }

    protected async Task<ConcurrentDictionary<PlatformCacheKey, object>> LoadGlobalAllRequestCachedKeys()
    {
        try
        {
            return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(() => GetAsync<List<PlatformCacheKey>>(cacheKey: GetGlobalAllRequestCachedKeysCacheKey())
                .Then(keys => keys ?? [])
                .Then(globalRequestCacheKeys => globalRequestCacheKeys
                    .Select(p => new KeyValuePair<PlatformCacheKey, object>(p, null))
                    .Pipe(items => new ConcurrentDictionary<PlatformCacheKey, object>(items))));
        }
        catch (Exception e)
        {
            Logger.LogError(e.BeautifyStackTrace(), "LoadGlobalCachedKeys failed. Fallback to empty default value.");

            return new ConcurrentDictionary<PlatformCacheKey, object>();
        }
    }

    protected DistributedCacheEntryOptions MapToDistributedCacheEntryOptions(PlatformCacheEntryOptions options)
    {
        return new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = options?.AbsoluteExpirationRelativeToNow() ?? CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow(),
            SlidingExpiration = options?.SlidingExpiration() ?? CacheSettings.DefaultCacheEntryOptions.SlidingExpiration()
        };
    }

    protected HybridCacheEntryOptions MapToHybridCacheEntryOptions(PlatformCacheEntryOptions options)
    {
        return new HybridCacheEntryOptions
        {
            Expiration = options?.AbsoluteExpirationRelativeToNow() ?? CacheSettings.DefaultCacheEntryOptions.AbsoluteExpirationRelativeToNow()
        };
    }

    protected async Task AssociateCacheKeyWithTags(
        PlatformCacheKey cacheKey,
        List<string>? tags,
        CancellationToken token = default)
    {
        if (cacheKey == GetGlobalAllRequestCachedKeysCacheKey())
            return;

        if (tags != null)
        {
            foreach (var tag in tags)
            {
                var tagKey = new PlatformCacheKey(ApplicationSettingContext.ApplicationName, IPlatformCacheRepository.TaggedKeysCacheKeyCollectionPart, tag);

                var existingKeys = await GetTaggedKeys(tagKey, token) ?? [];

                if (existingKeys.Add(cacheKey)) await SetAsync(tagKey, existingKeys, absoluteExpirationInSeconds: null, tags: null, token);
            }
        }
    }

    protected async Task<HashSet<string>> GetTaggedKeys(PlatformCacheKey tagKey, CancellationToken token)
    {
        var result = await GetDistributedCache().GetAsync(tagKey, token);

        return result == null ? [] : PlatformJsonSerializer.Deserialize<HashSet<string>>(result);
    }

    public async Task<HashSet<PlatformCacheKey>> GetTaggedKeys(string tag, CancellationToken token)
    {
        var result = await GetDistributedCache().GetAsync(BuildTagKey(tag), token);

        return result == null ? [] : PlatformJsonSerializer.Deserialize<HashSet<string>>(result).Select(PlatformCacheKey.FromFullCacheKeyString).ToHashSet();
    }

    protected abstract IDistributedCache GetDistributedCache();

    protected virtual async Task UpdateGlobalCachedKeys(Action<ConcurrentDictionary<PlatformCacheKey, object>> updateCachedKeysAction)
    {
        await SetGlobalCachedKeysAsync(async globalCachedKeys => updateCachedKeysAction(globalCachedKeys));
    }

    protected virtual async Task SetGlobalCachedKeysAsync(Func<ConcurrentDictionary<PlatformCacheKey, object>, Task> modifyGlobalCachedKeysFunc)
    {
        await SetGlobalCachedKeysAsyncLock.ExecuteLockActionAsync(async () =>
        {
            var globalCachedKeys = await LoadGlobalAllRequestCachedKeys().ThenActionAsync(modifyGlobalCachedKeysFunc);
            var globalAllRequestCacheKeysCacheKey = GetGlobalAllRequestCachedKeysCacheKey();

            var modifiedCacheValue = globalCachedKeys.Select(p => p.Key).ToList();

            if (!modifiedCacheValue.Any())
                await RemoveAsync(globalAllRequestCacheKeysCacheKey);
            else
            {
                await GetDistributedCache()
                    .SetAsync(
                        globalAllRequestCacheKeysCacheKey,
                        PlatformJsonSerializer.SerializeToUtf8Bytes(modifiedCacheValue),
                        MapToDistributedCacheEntryOptions(
                            new PlatformCacheEntryOptions
                            {
                                UnusedExpirationInSeconds = null,
                                AbsoluteExpirationInSeconds = null
                            }));
            }
        });
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing) DisposeManagedResource();

            // Release unmanaged resources

            disposed = true;
        }
    }

    protected virtual void DisposeManagedResource()
    {
        SetGlobalCachedKeysAsyncLock.Dispose();
    }
}
