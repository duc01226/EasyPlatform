using System;
using System.Collections.Generic;
using System.Linq;
using AngularDotnetPlatform.Platform.Caching.MemoryCache;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Caching
{
    public class PlatformCacheProvider : IPlatformCacheProvider
    {
        private readonly List<IPlatformCache> registeredCacheRepositories;
        private readonly Dictionary<PlatformCacheRepositoryType, IPlatformCache> registeredCacheRepositoriesDic;
        private readonly IPlatformCache defaultCache;

        public PlatformCacheProvider(IEnumerable<IPlatformCache> registeredCacheRepositories, ILoggerFactory loggerFactory)
        {
            this.registeredCacheRepositories = registeredCacheRepositories.ToList();
            this.registeredCacheRepositoriesDic = BuildRegisteredCacheRepositoriesDic(this.registeredCacheRepositories);
            this.defaultCache = new PlatformMemoryCache(loggerFactory);
        }

        public IPlatformCache Get()
        {
            return registeredCacheRepositories.LastOrDefault() ?? GetDefault();
        }

        public IPlatformCache Get(PlatformCacheRepositoryType cacheRepositoryType)
        {
            if (!registeredCacheRepositoriesDic.ContainsKey(cacheRepositoryType))
                throw new Exception($"Type of {cacheRepositoryType} is not registered");

            return registeredCacheRepositoriesDic[cacheRepositoryType];
        }

        public IPlatformCache GetDefault()
        {
            return defaultCache;
        }

        private static Dictionary<PlatformCacheRepositoryType, IPlatformCache> BuildRegisteredCacheRepositoriesDic(List<IPlatformCache> registeredCacheRepositories)
        {
            return registeredCacheRepositories.GroupBy(p => p.GetType()).ToDictionary(
                p =>
                {
                    if (p.Key.IsAssignableTo(typeof(IPlatformDistributedCache)))
                        return PlatformCacheRepositoryType.Distributed;
                    if (p.Key.IsAssignableTo(typeof(IPlatformMemoryCache)))
                        return PlatformCacheRepositoryType.Memory;

                    throw new Exception($"Unknown PlatformCacheRepositoryType of {p.GetType().Name}");
                },
                p => p.Last());
        }
    }
}
