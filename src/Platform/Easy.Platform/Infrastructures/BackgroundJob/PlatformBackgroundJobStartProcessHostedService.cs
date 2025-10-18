using Easy.Platform.Common.HostingBackgroundServices;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.BackgroundJob;

public class PlatformBackgroundJobStartProcessHostedService : PlatformHostingBackgroundService
{
    private readonly IPlatformBackgroundJobProcessingService backgroundJobProcessingService;

    public PlatformBackgroundJobStartProcessHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformBackgroundJobProcessingService backgroundJobProcessingService) : base(serviceProvider, loggerFactory)
    {
        this.backgroundJobProcessingService = backgroundJobProcessingService;
    }

    protected override async Task StartProcess(CancellationToken cancellationToken)
    {
        await backgroundJobProcessingService.Start(cancellationToken);
    }

    protected override async Task StopProcess(CancellationToken cancellationToken)
    {
        await backgroundJobProcessingService.Stop(cancellationToken);
    }
}
