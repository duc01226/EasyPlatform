using Easy.Platform.Application;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.RedisCache;

public class PlatformRedisDistributedCacheRepository : PlatformCacheRepository, IPlatformDistributedCacheRepository
{
    private readonly Microsoft.Extensions.Caching.StackExchangeRedis.RedisCache redisCache;

    public PlatformRedisDistributedCacheRepository(
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        ILoggerFactory loggerFactory,
        PlatformCacheSettings cacheSettings) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext)
    {
        redisCache = serviceProvider.GetServices<IDistributedCache>().OfType<Microsoft.Extensions.Caching.StackExchangeRedis.RedisCache>().FirstOrDefault();
    }

    protected override IDistributedCache GetDistributedCache()
    {
        return redisCache;
    }
}
