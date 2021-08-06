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
    public class PlatformCacheKey
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

        public PlatformCacheKey(string context, string collection, string requestKey)
        {
            Context = context;
            Collection = collection;
            RequestKey = requestKey;
        }

        public PlatformCacheKey(string context, string collection, params object[] requestKeyParts)
        {
            Context = context;
            Collection = collection;
            RequestKey = string.Join(".", requestKeyParts.Select(p => JsonSerializer.Serialize(p)));
        }

        /// <summary>
        /// The context of the cached data. Usually it's like the database or service name.
        /// </summary>
        public virtual string Context { get; }

        /// <summary>
        /// The Type of the cached data. Usually it's like the database collection or data class name.
        /// </summary>
        public virtual string Collection { get; } = "UnknownCollection";

        /// <summary>
        /// The request key for cached data. Usually it could be data identifier, or request unique key.
        /// </summary>
        public string RequestKey { get; }

        public static implicit operator string(PlatformCacheKey platformCacheKey)
        {
            return platformCacheKey.ToString();
        }

        public static implicit operator PlatformCacheKey(string platformCacheKey)
        {
            return new PlatformCacheKey(platformCacheKey);
        }

        public override string ToString()
        {
            return $"{Context}.{Collection}.{RequestKey}";
        }
    }
}
