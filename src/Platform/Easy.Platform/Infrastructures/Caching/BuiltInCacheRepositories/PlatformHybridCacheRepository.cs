using System.Collections.Concurrent;
using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
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

    protected override async Task InternalRemoveAsync(PlatformCacheKey cacheKey, CancellationToken token)
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

    protected override async Task SetToDistributedCacheAsync<T>(
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
            throw new Exception($"{GetType().Name} SetCacheAsync failed. [CacheKey: {cacheKey}]. {ex.Message}", ex);
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
                    await hybridCache.SetAsync(
                        globalAllRequestCacheKeysCacheKey,
                        PlatformJsonSerializer.SerializeToUtf8Bytes(modifiedCacheValue),
                        MapToHybridCacheEntryOptions(
                            new PlatformCacheEntryOptions
                            {
                                UnusedExpirationInSeconds = null,
                                AbsoluteExpirationInSeconds = null
                            }));
                }
            });
    }
}
