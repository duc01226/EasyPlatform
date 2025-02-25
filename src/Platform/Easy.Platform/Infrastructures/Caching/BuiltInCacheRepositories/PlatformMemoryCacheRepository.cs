using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;

public class PlatformMemoryCacheRepository : PlatformCacheRepository, IPlatformMemoryCacheRepository
{
    private readonly MemoryDistributedCache memoryDistributedCache;

    public PlatformMemoryCacheRepository(
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        MemoryDistributedCache memoryDistributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext)
    {
        this.memoryDistributedCache = memoryDistributedCache;
    }

    public override T Get<T>(PlatformCacheKey cacheKey)
    {
        var result = memoryDistributedCache.Get(cacheKey);
        return result == null ? default : PlatformJsonSerializer.Deserialize<T>(result);
    }

    public override async Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
    {
        var result = await memoryDistributedCache.GetAsync(cacheKey, token);
        return result == null ? default : PlatformJsonSerializer.Deserialize<T>(result);
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
        await CacheSettings.ExecuteWithSlowWarning(
            async () =>
            {
                await SetToMemoryDistributedCacheAsync(cacheKey, value, cacheOptions, tags, token);

                await UpdateGlobalCachedKeys(p => p.TryAdd(cacheKey, null));
            },
            () => Logger,
            true);
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
            await memoryDistributedCache.RemoveAsync(cacheKey, token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} RemoveAsync failed. [CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    public override async Task RemoveAsync(List<PlatformCacheKey> cacheKeys, CancellationToken token = default)
    {
        if (cacheKeys.Any())
        {
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
    }

    private async Task SetToMemoryDistributedCacheAsync<T>(
        PlatformCacheKey cacheKey,
        T value,
        PlatformCacheEntryOptions cacheOptions = null,
        List<string> tags = null,
        CancellationToken token = default)
    {
        try
        {
            await memoryDistributedCache.SetAsync(
                cacheKey,
                PlatformJsonSerializer.SerializeToUtf8Bytes(value),
                MapToDistributedCacheEntryOptions(cacheOptions),
                token);

            await AssociateCacheKeyWithTags(cacheKey, PlatformCacheKey.CombineWithCacheKeyContextAndCollectionTag(cacheKey, tags), token);
        }
        catch (Exception ex)
        {
            throw new Exception($"{GetType().Name} SetToMemoryDistributedCacheAsync failed. [CacheKey: {cacheKey}]. {ex.Message}", ex);
        }
    }

    protected override IDistributedCache GetDistributedCache()
    {
        return memoryDistributedCache;
    }
}
