using System.Collections.Concurrent;
using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;

public class PlatformHybridCacheRepository : PlatformCacheRepository
{
    private readonly HybridCache hybridCache;

    public PlatformHybridCacheRepository(
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings,
        HybridCache hybridCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext)
    {
        this.hybridCache = hybridCache;
    }

    public override T Get<T>(PlatformCacheKey cacheKey)
    {
        return GetAsync<T>(cacheKey).GetResult();
    }

    public override async Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        using (var activity = IPlatformCacheRepository.ActivitySource.StartActivity($"HybridCache.{nameof(GetAsync)}"))
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
                                    return result is null ? default : PlatformJsonSerializer.Deserialize<T>(result);
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

    public override void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null, List<string> tags = null)
    {
        SetAsync(cacheKey, value, cacheOptions, tags).WaitResult();
    }

    public override async Task SetAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        using (var activity = IPlatformCacheRepository.ActivitySource.StartActivity($"HybridCache.{nameof(SetAsync)}"))
        {
            activity?.AddTag("cacheKey", cacheKey);

            await CacheSettings.ExecuteWithSlowWarning(
                async () =>
                {
                    await SetToHybridCacheAsync(cacheKey, value, cacheOptions, tags, token);

                    await UpdateGlobalCachedKeys(p => p.TryAdd(cacheKey, null));
                },
                () => Logger,
                true);
        }
    }

    public override async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
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

    private async Task InternalRemoveAsync(PlatformCacheKey cacheKey, CancellationToken token)
    {
        try
        {
            await hybridCache.RemoveAsync(cacheKey, token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} RemoveAsync failed.[CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    public override async Task RemoveAsync(List<PlatformCacheKey> cacheKeys, CancellationToken token = default)
    {
        if (cacheKeys.IsEmpty()) return;

        await SetGlobalCachedKeysAsync(
            async allCachedKeys =>
            {
                var clonedMatchedKeys = cacheKeys.ToArray();

                await clonedMatchedKeys.ParallelAsync(
                    async matchedKey =>
                    {
                        await InternalRemoveAsync(matchedKey, token);
                        allCachedKeys.TryRemove(matchedKey, out _);
                    });
            });
    }

    public override async Task RemoveByTagsAsync(List<string> tags, Func<PlatformCacheKey, bool> cacheKeyPredicate = null, CancellationToken token = default)
    {
        await base.RemoveByTagsAsync(tags, cacheKeyPredicate, token);

        if (cacheKeyPredicate == null)
            await hybridCache.RemoveByTagAsync(tags, token);
    }

    protected override IDistributedCache GetDistributedCache()
    {
        return ServiceProvider.GetService<IDistributedCache>();
    }

    private async Task SetToHybridCacheAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        try
        {
            await hybridCache.SetAsync(
                cacheKey,
                PlatformJsonSerializer.SerializeToUtf8Bytes(value),
                MapToHybridCacheEntryOptions(cacheOptions),
                cancellationToken: token,
                tags: PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, tags));

            await AssociateCacheKeyWithTags(cacheKey, PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, tags), token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} SetToHybridCacheAsync failed.[CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    protected override async Task SetGlobalCachedKeysAsync(Func<ConcurrentDictionary<PlatformCacheKey, object>, Task> modifyGlobalCachedKeysFunc)
    {
        await SetGlobalCachedKeysAsyncLock.ExecuteLockActionAsync(
            async () =>
            {
                var globalCachedKeys = await LoadGlobalAllRequestCachedKeys().ThenActionAsync(modifyGlobalCachedKeysFunc);
                var globalAllRequestCacheKeysCacheKey = GetGlobalAllRequestCachedKeysCacheKey();

                var modifiedCacheValue = globalCachedKeys.Select(p => p.Key).ToList();

                if (!modifiedCacheValue.Any())
                    await RemoveAsync(globalAllRequestCacheKeysCacheKey);
                else
                {
                    await SetToHybridCacheAsync(
                        globalAllRequestCacheKeysCacheKey,
                        modifiedCacheValue,
                        new PlatformCacheEntryOptions
                        {
                            UnusedExpirationInSeconds = null,
                            AbsoluteExpirationInSeconds = null
                        });
                }
            });
    }
}
