using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace AngularDotnetPlatform.Platform.Caching.MemoryCache
{
    public class PlatformMemoryCache : PlatformCache, IPlatformMemoryCache
    {
        private readonly MemoryDistributedCache memoryDistributedCache;
        private readonly HashSet<PlatformCacheKey> cachedKeys = new();

        public PlatformMemoryCache(ILoggerFactory loggerFactory)
        {
            memoryDistributedCache =
                new MemoryDistributedCache(
                    new OptionsWrapper<MemoryDistributedCacheOptions>(new MemoryDistributedCacheOptions()),
                    loggerFactory);
        }

        public override T Get<T>(PlatformCacheKey cacheKey)
        {
            var result = memoryDistributedCache.Get(cacheKey);
            return result == null ? default : JsonSerializer.Deserialize<T>(result);
        }

        public override async Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            var result = await memoryDistributedCache.GetAsync(cacheKey, token);
            return result == null ? default : JsonSerializer.Deserialize<T>(result);
        }

        public override void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions options)
        {
            memoryDistributedCache.Set(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), MapToDistributedCacheEntryOptions(options));

            // Lock to prevent multi thread add a same cache key at the same time
            lock (cacheKey.ToString())
            {
                cachedKeys.Add(cacheKey);
            }
        }

        public override async Task SetAsync<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions, CancellationToken token = default)
        {
            await memoryDistributedCache.SetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), MapToDistributedCacheEntryOptions(cacheOptions ?? new PlatformCacheEntryOptions()), token);

            // Lock to prevent multi thread add a same cache key at the same time
            lock (cacheKey.ToString())
            {
                cachedKeys.Add(cacheKey);
            }
        }

        public override void Remove(PlatformCacheKey cacheKey)
        {
            memoryDistributedCache.Remove(cacheKey);

            // Lock to prevent multi thread add a same cache key at the same time
            lock (cacheKey.ToString())
            {
                cachedKeys.Remove(cacheKey);
            }
        }

        public override async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            await memoryDistributedCache.RemoveAsync(cacheKey, token);

            // Lock to prevent multi thread add a same cache key at the same time
            lock (cacheKey.ToString())
            {
                cachedKeys.Remove(cacheKey);
            }
        }

        public override Task RemoveAsync(Func<PlatformCacheKey, bool> cacheKeyPredicate, CancellationToken token = default)
        {
            foreach (var platformCacheKey in cachedKeys.Where(cacheKeyPredicate).ToList())
            {
                Remove(platformCacheKey);
            }

            return Task.CompletedTask;
        }

        private DistributedCacheEntryOptions MapToDistributedCacheEntryOptions(PlatformCacheEntryOptions options)
        {
            return new DistributedCacheEntryOptions()
            {
                AbsoluteExpirationRelativeToNow = options.AbsoluteExpirationRelativeToNow(),
                SlidingExpiration = options.SlidingExpiration()
            };
        }
    }
}
