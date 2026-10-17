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
                // TryGet can fall back to the same Memory instance for several types. Sweep each actual
                // repository once, including Memory when Distributed and Hybrid are both registered.
                var repositories = new[] { PlatformCacheRepositoryType.Distributed, PlatformCacheRepositoryType.Hybrid, PlatformCacheRepositoryType.Memory }
                    .Select(cacheRepositoryProvider.TryGet)
                    .OfType<IPlatformCacheRepository>()
                    .Distinct<IPlatformCacheRepository>(ReferenceEqualityComparer.Instance);

                foreach (var repository in repositories)
                    await repository.ProcessClearDeprecatedGlobalRequestCachedKeys();
            },
            cancellationToken: cancellationToken);
    }
}
