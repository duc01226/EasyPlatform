using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Options;

namespace AngularDotnetPlatform.Platform.RedisCache
{
    public class PlatformRedisDistributedCacheRepository : PlatformCacheRepository, IPlatformDistributedCacheRepository, IDisposable
    {
        public static readonly string CachedKeysCollectionName = "___PlatformRedisDistributedCacheKeys___";
        public static readonly double GlobalCachedKeysUnusedExpirationInSeconds = TimeSpan.FromDays(7).TotalSeconds;

        private readonly IPlatformApplicationSettingContext applicationSettingContext;
        private readonly Microsoft.Extensions.Caching.StackExchangeRedis.RedisCache redisCache;
        private readonly ConcurrentDictionary<PlatformCacheKey, object> localCachedKeys = new();
        private bool disposed;

        public PlatformRedisDistributedCacheRepository(
            IServiceProvider serviceProvider,
            IOptions<RedisCacheOptions> optionsAccessor,
            IPlatformApplicationSettingContext applicationSettingContext) : base(serviceProvider)
        {
            this.applicationSettingContext = applicationSettingContext;
            redisCache = new Microsoft.Extensions.Caching.StackExchangeRedis.RedisCache(optionsAccessor);
        }

        public override T Get<T>(PlatformCacheKey cacheKey)
        {
            var result = redisCache.Get(cacheKey);
            return result == null ? default : JsonSerializer.Deserialize<T>(result);
        }

        public override async Task<T> GetAsync<T>(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            var result = await redisCache.GetAsync(cacheKey, token);

            try
            {
                return result == null ? default : JsonSerializer.Deserialize<T>(result);
            }
            catch (Exception e)
            {
                // If parse failed, the cached data could be obsolete. Then just clear the cache
                await RemoveAsync(cacheKey, token);
                return default;
            }
        }

        public override void Set<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null)
        {
            SetToRedisCache(cacheKey, value, cacheOptions);

            UpdateCachedKeys(p => p.TryAdd(cacheKey, null));
        }

        public override async Task SetAsync<T>(
            PlatformCacheKey cacheKey,
            T value,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default)
        {
            await redisCache.SetAsync(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), MapToDistributedCacheEntryOptions(cacheOptions ?? GetDefaultCacheEntryOptions()), token);

            UpdateCachedKeys(p => p.TryAdd(cacheKey, null));
        }

        public override void Remove(PlatformCacheKey cacheKey)
        {
            redisCache.Remove(cacheKey);

            UpdateCachedKeys(p => p.Remove(cacheKey, out _));
        }

        public override void Remove(Func<PlatformCacheKey, bool> cacheKeyPredicate)
        {
            var globalCachedKeys = GetGlobalCachedKeys();

            var localMatchedKeys = localCachedKeys.Select(p => p.Key).Where(cacheKeyPredicate).ToList();
            var globalMatchedKeys = globalCachedKeys.Select(p => p.Key).Where(cacheKeyPredicate).ToList();

            var matchedKeys = localMatchedKeys.Concat(globalMatchedKeys).Distinct().ToList();
            foreach (var matchedKey in matchedKeys)
            {
                redisCache.Remove(matchedKey);
                localCachedKeys.Remove(matchedKey, out _);
                globalCachedKeys.Remove(matchedKey, out _);
            }

            SetGlobalCachedKeys(globalCachedKeys);
        }

        public override async Task RemoveAsync(PlatformCacheKey cacheKey, CancellationToken token = default)
        {
            await redisCache.RemoveAsync(cacheKey, token);

            UpdateCachedKeys(p => p.Remove(cacheKey, out _));
        }

        public override Task RemoveAsync(Func<PlatformCacheKey, bool> cacheKeyPredicate, CancellationToken token = default)
        {
            Remove(cacheKeyPredicate);

            return Task.CompletedTask;
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposed)
                return;

            if (disposing)
            {
                redisCache?.Dispose();
            }

            disposed = true;
        }

        protected void UpdateCachedKeys(Action<IDictionary<PlatformCacheKey, object>> updateCachedKeysAction)
        {
            updateCachedKeysAction(localCachedKeys);

            var globalCachedKeys = GetGlobalCachedKeys();
            updateCachedKeysAction(globalCachedKeys);

            SetGlobalCachedKeys(globalCachedKeys);
        }

        private void SetToRedisCache<T>(PlatformCacheKey cacheKey, T value, PlatformCacheEntryOptions cacheOptions = null)
        {
            redisCache.Set(cacheKey, JsonSerializer.SerializeToUtf8Bytes(value), MapToDistributedCacheEntryOptions(cacheOptions));
        }

        private Dictionary<PlatformCacheKey, object> GetGlobalCachedKeys()
        {
            var cachedKeysList =
                Get<List<string>>(BuildGlobalCachedKeysDataCacheKey()) ?? new List<string>();

            var cachedKeys = cachedKeysList.ToDictionary(p => (PlatformCacheKey)p, p => (object)p);

            return cachedKeys;
        }

        private PlatformCacheKey BuildGlobalCachedKeysDataCacheKey()
        {
            return new PlatformCacheKey(context: applicationSettingContext.ApplicationName, collection: CachedKeysCollectionName);
        }

        private void SetGlobalCachedKeys(IDictionary<PlatformCacheKey, object> value)
        {
            SetToRedisCache(
                BuildGlobalCachedKeysDataCacheKey(),
                value.Keys.Select(p => p.ToString()).ToList(),
                new PlatformCacheEntryOptions() { UnusedExpirationInSeconds = GlobalCachedKeysUnusedExpirationInSeconds });
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
