using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.Caching
{
    /// <summary>
    /// Represent the structured cache key. The string formatted value is "{Context}.{Collection}.{RequestKey}";
    /// </summary>
    public class PlatformCacheKey : IEqualityComparer<PlatformCacheKey>
    {
        public PlatformCacheKey(string requestKey)
        {
            Context = GetType().Assembly.GetName().Name;
            RequestKey = requestKey;
        }

        public PlatformCacheKey(object[] requestKeyParts)
        {
            Context = GetType().Assembly.GetName().Name;
            RequestKey = string.Join(".", requestKeyParts.Select(p => JsonSerializer.Serialize(p)));
        }

        public PlatformCacheKey(string collection, string requestKey) : this(requestKey)
        {
            Collection = collection;
        }

        public PlatformCacheKey(string collection, params object[] requestKeyParts) : this(requestKeyParts)
        {
            Collection = collection;
        }

        public PlatformCacheKey(string context, string collection, string requestKey) : this(collection, requestKey)
        {
            Context = context;
        }

        public PlatformCacheKey(string context, string collection, params object[] requestKeyParts) : this(collection, requestKeyParts)
        {
            Context = context;
        }

        /// <summary>
        /// The context of the cached data. Usually it's like the database or service name.
        /// </summary>
        public string Context { get; init; }

        /// <summary>
        /// The Type of the cached data. Usually it's like the database collection or data class name.
        /// </summary>
        public string Collection { get; init; } = "UnknownCollection";

        /// <summary>
        /// The request key for cached data. Usually it could be data identifier, or request unique key.
        /// </summary>
        public string RequestKey { get; }

        public static implicit operator string(PlatformCacheKey platformCacheKey)
        {
            return platformCacheKey.ToString();
        }

        public override string ToString()
        {
            return $"{Context}.{Collection}.{RequestKey}";
        }

        public bool Equals(PlatformCacheKey x, PlatformCacheKey y)
        {
            if (ReferenceEquals(x, y))
                return true;
            if (x is null || y is null)
                return false;
            if (x.GetType() != y.GetType())
                return false;
            return x.ToString() == y.ToString();
        }

        public int GetHashCode(PlatformCacheKey obj)
        {
            return HashCode.Combine(obj.Context, obj.Collection, obj.RequestKey);
        }
    }
}
