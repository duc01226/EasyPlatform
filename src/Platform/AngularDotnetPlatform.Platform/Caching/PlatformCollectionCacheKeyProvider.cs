using System;

namespace AngularDotnetPlatform.Platform.Caching
{
    public class PlatformCollectionCacheKeyProvider
    {
        public const string DefaultRequestKey = "All";

        public PlatformCollectionCacheKeyProvider()
        {
        }

        /// <summary>
        /// The context of the cached data. Usually it's like the database or service name.
        /// </summary>
        public virtual string Context { get; set; }

        /// <summary>
        /// The Type of the cached data. Usually it's like the database collection or data class name.
        /// </summary>
        public virtual string Collection { get; set; }

        public static PlatformCollectionCacheKeyProvider Create(string context, string collection)
        {
            return new PlatformCollectionCacheKeyProvider() { Collection = collection, Context = context };
        }

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

        protected void EnsureValidProvider()
        {
            if (string.IsNullOrEmpty(Context) || string.IsNullOrEmpty(Collection))
                throw new Exception("Context and Collection must be not null");
        }
    }

    public abstract class
        PlatformCollectionCacheKeyProvider<TFixedImplementationProvider> : PlatformCollectionCacheKeyProvider
        where TFixedImplementationProvider : PlatformCollectionCacheKeyProvider<TFixedImplementationProvider>, new()
    {
        public abstract override string Context { get; }
        public abstract override string Collection { get; }

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
