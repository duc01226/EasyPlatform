using Easy.Platform.Application;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching.BuiltInCacheRepositories;

public class PlatformMemoryCacheRepository : PlatformCacheRepository, IPlatformMemoryCacheRepository
{
    private readonly MemoryDistributedCache memoryDistributedCache;

    public PlatformMemoryCacheRepository(
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        PlatformCacheSettings cacheSettings,
        IPlatformApplicationSettingContext applicationSettingContext,
        MemoryDistributedCache memoryDistributedCache) : base(serviceProvider, loggerFactory, cacheSettings, applicationSettingContext)
    {
        this.memoryDistributedCache = memoryDistributedCache;
    }

    protected override IDistributedCache GetDistributedCache()
    {
        return memoryDistributedCache;
    }
}
