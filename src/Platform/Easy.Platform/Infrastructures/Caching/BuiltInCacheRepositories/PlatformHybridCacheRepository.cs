using Easy.Platform.Application;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Hybrid;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;

/// <summary>
/// Cache repository backed by <see cref="HybridCache" /> - an in-process L1 in front of an L2
/// <see cref="IDistributedCache" />, with tag-based invalidation.
/// <br />
/// <b>INVARIANT - the global cached-keys REGISTRY must NEVER be written through <see cref="HybridCache" />.</b>
/// The registry is read back by <c>PlatformCacheRepository.LoadGlobalAllRequestCachedKeys</c>, which goes through
/// <c>GetAsync&lt;T&gt;</c> -> <see cref="GetDistributedCache" /> and deserializes RAW JSON. <see cref="HybridCache" />
/// does not put raw values into its L2: it FRAMES every L2 entry in its own payload envelope (it carries the key,
/// the tags and the creation timestamp so that a read can be validated against tag invalidation - hence the
/// library's own <c>HybridCachePayload</c> / <c>FormatNotRecognized</c> / <c>ExpiredByTag</c> machinery). A registry
/// entry written through <see cref="HybridCache" /> is therefore NOT parseable by that raw read path: it trips the
/// non-JSON first-byte guard in <c>GetAsync</c> and comes back as an EMPTY registry, silently turning
/// <c>RemoveAsync(cacheKeyPredicate)</c> and <c>RemoveCollectionAsync</c> into no-ops - and, because the entry is
/// deliberately written to never expire, one that cannot even self-heal by expiring.
/// <br />
/// The INHERITED base <c>SetGlobalCachedKeysAsync</c> writes the registry through <see cref="GetDistributedCache" />,
/// the SAME primitive the read path uses, so write and read stay symmetric. Do NOT re-introduce an override here
/// that routes the registry through <see cref="HybridCache" />; TC-PLATREPO-097 guards this.
/// </summary>
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

    // NOTE: SetGlobalCachedKeysAsync is deliberately NOT overridden - see the INVARIANT on this class. The base
    // implementation writes the registry through GetDistributedCache() (the same primitive the read path uses)
    // with PlatformCacheEntryOptions.NeverExpireOptions(), which MapToDistributedCacheEntryOptions honours as
    // "no absolute AND no sliding expiration". That preserves the never-expire intent the registry needs while
    // keeping the write and the read on the SAME wire format.
}
