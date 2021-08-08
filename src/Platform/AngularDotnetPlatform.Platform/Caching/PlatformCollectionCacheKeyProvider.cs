using System;

namespace AngularDotnetPlatform.Platform.Caching
{
    public interface IPlatformCollectionCacheKeyProvider
    {
        /// <summary>
        /// The Type of the cached data. Usually it's like the database collection or data class name.
        /// </summary>
        string Collection { get; init; }

        PlatformCacheKey GetKey(string requestKey = PlatformContextCacheKeyProvider.DefaultRequestKey);
        PlatformCacheKey GetKey(object[] requestKeyParts = null);
        Func<PlatformCacheKey, bool> MatchCollectionKeyPredicate();
    }

    public class PlatformCollectionCacheKeyProvider : PlatformContextCacheKeyProvider, IPlatformCollectionCacheKeyProvider
    {
        public PlatformCollectionCacheKeyProvider()
        {
        }

        /// <summary>
        /// The Type of the cached data. Usually it's like the database collection or data class name.
        /// </summary>
        public virtual string Collection { get; init; }

        public PlatformCacheKey GetKey(string requestKey = DefaultRequestKey)
        {
            EnsureValidProvider();
            return new PlatformCacheKey(Context, Collection, requestKey);
        }

        public PlatformCacheKey GetKey(object[] requestKeyParts = null)
        {
            EnsureValidProvider();
            return new PlatformCacheKey(Context, Collection, requestKeyParts ?? new object[] { DefaultRequestKey });
        }

        public Func<PlatformCacheKey, bool> MatchCollectionKeyPredicate()
        {
            return p => p.Collection == Collection && p.Context == Context;
        }

        protected override void EnsureValidProvider()
        {
            if (string.IsNullOrEmpty(Context) || string.IsNullOrEmpty(Collection))
                throw new Exception("Context and Collection must be not null");
        }
    }

    public class PlatformCollectionCacheKeyProvider<TFixedImplementationProvider> : PlatformCollectionCacheKeyProvider
        where TFixedImplementationProvider : PlatformCollectionCacheKeyProvider<TFixedImplementationProvider>
    {
        public static PlatformCacheKey CreateKey(string requestKey = DefaultRequestKey)
        {
            return Activator.CreateInstance<TFixedImplementationProvider>().GetKey(requestKey);
        }

        public static PlatformCacheKey CreateKey(object[] requestKeyParts = null)
        {
            return Activator.CreateInstance<TFixedImplementationProvider>().GetKey(requestKeyParts);
        }
    }
}
