using System;
using System.Threading;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Caching
{
    public interface IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider> where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
    {
        T Get<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);
        T Get<T>(object[] requestKeyParts = null);
        Task<T> GetAsync<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default);
        Task<T> GetAsync<T>(object[] requestKeyParts = null, CancellationToken token = default);
        void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);
        void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, object[] requestKeyParts = null);
        Task SetAsync<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default);
        Task SetAsync<T>(T value, PlatformCacheEntryOptions cacheOptions = null, object[] requestKeyParts = null, CancellationToken token = default);

        void Set<T>(T value, double? absoluteExpirationInSeconds = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);
        void Set<T>(T value, double? absoluteExpirationInSeconds = null, object[] requestKeyParts = null);
        Task SetAsync<T>(T value, double? absoluteExpirationInSeconds = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default);
        Task SetAsync<T>(T value, double? absoluteExpirationInSeconds = null, object[] requestKeyParts = null, CancellationToken token = default);

        void Remove(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);
        void Remove(object[] requestKeyParts = null);
        Task RemoveAsync(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default);
        Task RemoveAsync(object[] requestKeyParts = null, CancellationToken token = default);

        PlatformCacheRepositoryType CacheRepositoryType();

        Task RemoveAsync(
            Func<string, bool> cacheRequestKeyPredicate,
            CancellationToken token = default);

        Task RemoveAsync(
            Func<object[], bool> cacheRequestKeyPartsPredicate,
            CancellationToken token = default);

        Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default) where TData : new();

        Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            object[] requestKeyParts = null,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default) where TData : new();

        Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
            double? absoluteExpirationInSeconds = null,
            CancellationToken token = default) where TData : new();

        Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            object[] requestKeyParts = null,
            double? absoluteExpirationInSeconds = null,
            CancellationToken token = default) where TData : new();
    }

    /// <summary>
    /// Collection cache repository for last registered cache repository
    /// </summary>
    public abstract class PlatformCollectionCacheRepository<TCollectionCacheKeyProvider> : IPlatformCollectionCacheRepository<TCollectionCacheKeyProvider>
        where TCollectionCacheKeyProvider : PlatformCollectionCacheKeyProvider
    {
        protected readonly TCollectionCacheKeyProvider CollectionCacheKeyProvider;
        protected readonly IPlatformCacheRepositoryProvider CacheRepositoryProvider;

        public PlatformCollectionCacheRepository(
            IPlatformCacheRepositoryProvider cacheRepositoryProvider,
            TCollectionCacheKeyProvider collectionCacheKeyProvider)
        {
            CollectionCacheKeyProvider = collectionCacheKeyProvider;
            CacheRepositoryProvider = cacheRepositoryProvider;
        }

        public T Get<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey)
        {
            return CacheRepository().Get<T>(CollectionCacheKeyProvider.GetKey(requestKey));
        }

        public T Get<T>(object[] requestKeyParts = null)
        {
            return CacheRepository().Get<T>(CollectionCacheKeyProvider.GetKey(requestKeyParts));
        }

        public Task<T> GetAsync<T>(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default)
        {
            return CacheRepository().GetAsync<T>(CollectionCacheKeyProvider.GetKey(requestKey), token);
        }

        public Task<T> GetAsync<T>(object[] requestKeyParts = null, CancellationToken token = default)
        {
            return CacheRepository().GetAsync<T>(CollectionCacheKeyProvider.GetKey(requestKeyParts), token);
        }

        public void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey)
        {
            CacheRepository().Set(CollectionCacheKeyProvider.GetKey(requestKey), value, cacheOptions);
        }

        public void Set<T>(T value, PlatformCacheEntryOptions cacheOptions = null, object[] requestKeyParts = null)
        {
            CacheRepository().Set(CollectionCacheKeyProvider.GetKey(requestKeyParts), value, cacheOptions);
        }

        public async Task SetAsync<T>(T value, PlatformCacheEntryOptions cacheOptions = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default)
        {
            await CacheRepository().SetAsync(CollectionCacheKeyProvider.GetKey(requestKey), value, cacheOptions, token);
        }

        public async Task SetAsync<T>(T value, PlatformCacheEntryOptions cacheOptions = null, object[] requestKeyParts = null, CancellationToken token = default)
        {
            await CacheRepository().SetAsync(CollectionCacheKeyProvider.GetKey(requestKeyParts), value, cacheOptions, token);
        }

        public void Set<T>(T value, double? absoluteExpirationInSeconds = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey)
        {
            Set(value, new PlatformCacheEntryOptions() { AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds }, requestKey);
        }

        public void Set<T>(T value, double? absoluteExpirationInSeconds = null, object[] requestKeyParts = null)
        {
            Set(value, new PlatformCacheEntryOptions() { AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds }, requestKeyParts);
        }

        public async Task SetAsync<T>(T value, double? absoluteExpirationInSeconds = null, string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default)
        {
            await SetAsync(
                value,
                new PlatformCacheEntryOptions() { AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds },
                requestKey,
                token);
        }

        public async Task SetAsync<T>(T value, double? absoluteExpirationInSeconds = null, object[] requestKeyParts = null, CancellationToken token = default)
        {
            await SetAsync(
                value,
                new PlatformCacheEntryOptions() { AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds },
                requestKeyParts,
                token);
        }

        public void Remove(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey)
        {
            CacheRepository().Remove(CollectionCacheKeyProvider.GetKey(requestKey));
        }

        public void Remove(object[] requestKeyParts = null)
        {
            CacheRepository().Remove(CollectionCacheKeyProvider.GetKey(requestKeyParts));
        }

        public async Task RemoveAsync(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey, CancellationToken token = default)
        {
            await CacheRepository().RemoveAsync(CollectionCacheKeyProvider.GetKey(requestKey), token);
        }

        public async Task RemoveAsync(object[] requestKeyParts = null, CancellationToken token = default)
        {
            await CacheRepository().RemoveAsync(CollectionCacheKeyProvider.GetKey(requestKeyParts), token);
        }

        public async Task RemoveAsync(
            Func<string, bool> cacheRequestKeyPredicate,
            CancellationToken token = default)
        {
            var matchCollectionKeyPredicate = CollectionCacheKeyProvider.MatchCollectionKeyPredicate();
            await CacheRepository().RemoveAsync(cacheKey => matchCollectionKeyPredicate(cacheKey) && cacheRequestKeyPredicate(cacheKey.RequestKey), token);
        }

        public async Task RemoveAsync(
            Func<object[], bool> cacheRequestKeyPartsPredicate,
            CancellationToken token = default)
        {
            var matchCollectionKeyPredicate = CollectionCacheKeyProvider.MatchCollectionKeyPredicate();
            await CacheRepository().RemoveAsync(cacheKey => matchCollectionKeyPredicate(cacheKey) && cacheRequestKeyPartsPredicate(cacheKey.RequestKeyParts()), token);
        }

        public async Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default) where TData : new()
        {
            return await CacheRepository().CacheRequestAsync(request, CollectionCacheKeyProvider.GetKey(requestKey), cacheOptions, token);
        }

        public async Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            object[] requestKeyParts = null,
            PlatformCacheEntryOptions cacheOptions = null,
            CancellationToken token = default) where TData : new()
        {
            return await CacheRepository().CacheRequestAsync(request, CollectionCacheKeyProvider.GetKey(requestKeyParts), cacheOptions, token);
        }

        public async Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey,
            double? absoluteExpirationInSeconds = null,
            CancellationToken token = default) where TData : new()
        {
            return await CacheRequestAsync(
                request,
                requestKey,
                new PlatformCacheEntryOptions()
                {
                    AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds
                },
                token);
        }

        public async Task<TData> CacheRequestAsync<TData>(
            Func<Task<TData>> request,
            object[] requestKeyParts = null,
            double? absoluteExpirationInSeconds = null,
            CancellationToken token = default) where TData : new()
        {
            return await CacheRequestAsync(
                request,
                requestKeyParts,
                new PlatformCacheEntryOptions()
                {
                    AbsoluteExpirationInSeconds = absoluteExpirationInSeconds ?? PlatformCacheEntryOptions.DefaultExpirationInSeconds
                },
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
            TCollectionCacheKeyProvider collectionCacheKeyProvider) : base(cacheRepositoryProvider, collectionCacheKeyProvider)
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
            TCollectionCacheKeyProvider collectionCacheKeyProvider) : base(cacheRepositoryProvider, collectionCacheKeyProvider)
        {
        }

        public override PlatformCacheRepositoryType CacheRepositoryType()
        {
            return PlatformCacheRepositoryType.Distributed;
        }
    }
}
