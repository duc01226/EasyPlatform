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
        }

        public override async Task SetAsync<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions, CancellationToken token = default)
        {
            await memoryDistributedCache.SetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), MapToDistributedCacheEntryOptions(cacheOptions ?? new PlatformCacheEntryOptions()), token);
        }

        public override void Remove(PlatformCacheKey cacheKey)
        {
            memoryDistributedCache.Get(cacheKey);
        }

        public override async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            await memoryDistributedCache.RemoveAsync(cacheKey, token);
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
