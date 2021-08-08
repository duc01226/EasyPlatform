using System;
using System.Collections.Generic;
using System.Linq;
using AngularDotnetPlatform.Platform.Caching.BuiltInCacheRepositories;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Caching
{
    /// <summary>
    /// Cache Provider provide cache repository like MemoryCache, DistributedCache.
    /// </summary>
    public interface IPlatformCacheRepositoryProvider
    {
        /// <summary>
        /// Get last registered cache repository or default cache repository
        /// </summary>
        public IPlatformCacheRepository Get();

        /// <summary>
        /// Get cache repository by type
        /// </summary>
        public IPlatformCacheRepository Get(PlatformCacheRepositoryType cacheRepositoryType);

        /// <summary>
        /// Get default cache repository
        /// </summary>
        public IPlatformCacheRepository GetDefault();
    }

    public class PlatformCacheRepositoryRepositoryProvider : IPlatformCacheRepositoryProvider
    {
        private readonly List<IPlatformCacheRepository> registeredCacheRepositories;
        private readonly Dictionary<PlatformCacheRepositoryType, IPlatformCacheRepository> registeredCacheRepositoriesDic;
        private readonly IPlatformCacheRepository defaultCacheRepository;

        public PlatformCacheRepositoryRepositoryProvider(IEnumerable<IPlatformCacheRepository> registeredCacheRepositories, ILoggerFactory loggerFactory)
        {
            this.registeredCacheRepositories = registeredCacheRepositories.ToList();
            this.registeredCacheRepositoriesDic = BuildRegisteredCacheRepositoriesDic(this.registeredCacheRepositories);
            this.defaultCacheRepository = new PlatformMemoryCacheRepository(loggerFactory);
        }

        public IPlatformCacheRepository Get()
        {
            return registeredCacheRepositories.LastOrDefault() ?? GetDefault();
        }

        public IPlatformCacheRepository Get(PlatformCacheRepositoryType cacheRepositoryType)
        {
            if (!registeredCacheRepositoriesDic.ContainsKey(cacheRepositoryType))
                throw new Exception($"Type of {cacheRepositoryType} is not registered");

            return registeredCacheRepositoriesDic[cacheRepositoryType];
        }

        public IPlatformCacheRepository GetDefault()
        {
            return defaultCacheRepository;
        }

        private static Dictionary<PlatformCacheRepositoryType, IPlatformCacheRepository> BuildRegisteredCacheRepositoriesDic(List<IPlatformCacheRepository> registeredCacheRepositories)
        {
            return registeredCacheRepositories.GroupBy(p => p.GetType()).ToDictionary(
                p =>
                {
                    if (p.Key.IsAssignableTo(typeof(IPlatformDistributedCacheRepository)))
                        return PlatformCacheRepositoryType.Distributed;
                    if (p.Key.IsAssignableTo(typeof(IPlatformMemoryCacheRepository)))
                        return PlatformCacheRepositoryType.Memory;

                    throw new Exception($"Unknown PlatformCacheRepositoryType of {p.GetType().Name}");
                },
                p => p.Last());
        }
    }
}
