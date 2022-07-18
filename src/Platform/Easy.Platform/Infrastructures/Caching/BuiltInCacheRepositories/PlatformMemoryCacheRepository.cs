using System.Collections.Concurrent;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories
{
    public class PlatformMemoryCacheRepository : PlatformCacheRepository, IPlatformMemoryCacheRepository
    {
        private readonly MemoryDistributedCache memoryDistributedCache;

        private readonly ConcurrentDictionary<PlatformCacheKey, object> cachedKeys =
            new ConcurrentDictionary<PlatformCacheKey, object>();

        public PlatformMemoryCacheRepository(ILoggerFactory loggerFactory, IServiceProvider serviceProvider) : base(
            serviceProvider)
        {
            memoryDistributedCache = new MemoryDistributedCache(
                new OptionsWrapper<MemoryDistributedCacheOptions>(new MemoryDistributedCacheOptions()),
                loggerFactory);
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

        public override void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null)
        {
            memoryDistributedCache.Set(
                cacheKey,
                PlatformJsonSerializer.SerializeToUtf8Bytes(value),
                MapToDistributedCacheEntryOptions(cacheOptions));

            cachedKeys.TryAdd(cacheKey, null);
        }

        public override async Task SetAsync<T>(
            PlatformCacheKey cacheKey,
            T value,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default)
        {
            await memoryDistributedCache.SetAsync(
                cacheKey,
                PlatformJsonSerializer.SerializeToUtf8Bytes(value),
                MapToDistributedCacheEntryOptions(cacheOptions ?? GetDefaultCacheEntryOptions()),
                token);

            cachedKeys.TryAdd(cacheKey, null);
        }

        public override void Remove(PlatformCacheKey cacheKey)
        {
            memoryDistributedCache.Remove(cacheKey);

            cachedKeys.Remove(cacheKey, out _);
        }

        public override void Remove(Func<PlatformCacheKey, bool> cacheKeyPredicate)
        {
            var matchedKeys = cachedKeys.Select(p => p.Key).Where(cacheKeyPredicate).ToList();
            foreach (var matchedKey in matchedKeys)
            {
                Remove(matchedKey);
            }
        }

        public override async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            await memoryDistributedCache.RemoveAsync(cacheKey, token);

            cachedKeys.Remove(cacheKey, out _);
        }

        public override Task RemoveAsync(
            Func<PlatformCacheKey, bool> cacheKeyPredicate,
            CancellationToken token = default)
        {
            Remove(cacheKeyPredicate);

            return Task.CompletedTask;
        }

        private DistributedCacheEntryOptions MapToDistributedCacheEntryOptions(PlatformCacheEntryOptions options)
        {
            var result = new DistributedCacheEntryOptions();

            var absoluteExpirationRelativeToNow = options?.AbsoluteExpirationRelativeToNow();
            if (absoluteExpirationRelativeToNow != null)
            {
                result.AbsoluteExpirationRelativeToNow = absoluteExpirationRelativeToNow;
            }

            var slidingExpiration = options?.SlidingExpiration();
            if (slidingExpiration != null)
            {
                result.SlidingExpiration = slidingExpiration;
            }

            return result;
        }
    }
}
