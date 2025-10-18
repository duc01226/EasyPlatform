using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching;

public class PlatformAutoClearDeprecatedGlobalRequestCachedKeysBackgroundService : PlatformIntervalHostingBackgroundService
{
    private readonly IPlatformCacheRepositoryProvider cacheRepositoryProvider;

    public PlatformAutoClearDeprecatedGlobalRequestCachedKeysBackgroundService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider) : base(serviceProvider, loggerFactory)
    {
        this.cacheRepositoryProvider = cacheRepositoryProvider;
    }

    public override bool LogIntervalProcessInformation => false;

    protected override TimeSpan ProcessTriggerIntervalTime()
    {
        return 1.Days();
    }

    protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
    {
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                await (cacheRepositoryProvider.TryGet(PlatformCacheRepositoryType.Distributed)?.ProcessClearDeprecatedGlobalRequestCachedKeys() ?? Task.CompletedTask);
                await (cacheRepositoryProvider.TryGet(PlatformCacheRepositoryType.Hybrid)?.ProcessClearDeprecatedGlobalRequestCachedKeys() ?? Task.CompletedTask);
            },
            cancellationToken: cancellationToken);
    }
}
