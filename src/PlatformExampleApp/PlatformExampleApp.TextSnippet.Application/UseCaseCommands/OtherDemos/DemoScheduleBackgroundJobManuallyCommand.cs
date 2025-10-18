#region

using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.BackgroundJob;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands.OtherDemos;

public sealed class DemoScheduleBackgroundJobManuallyCommand : PlatformCqrsCommand<DemoScheduleBackgroundJobManuallyCommandResult>
{
    public static readonly string DefaultUpdateTextSnippetFullText =
        "DemoScheduleBackgroundJobManually NewSnippetText";

    public string NewSnippetText { get; set; } = DefaultUpdateTextSnippetFullText;
}

public sealed class DemoScheduleBackgroundJobManuallyCommandResult : PlatformCqrsCommandResult
{
    public string ScheduledJobId { get; set; }
}

internal sealed class DemoScheduleBackgroundJobManuallyCommandHandler
    : PlatformCqrsCommandApplicationHandler<DemoScheduleBackgroundJobManuallyCommand, DemoScheduleBackgroundJobManuallyCommandResult>
{
    private readonly IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler;

    public DemoScheduleBackgroundJobManuallyCommandHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
        this.backgroundJobScheduler = backgroundJobScheduler;
    }

    protected override async Task<DemoScheduleBackgroundJobManuallyCommandResult> HandleAsync(
        DemoScheduleBackgroundJobManuallyCommand request,
        CancellationToken cancellationToken)
    {
        var scheduledJobId = backgroundJobScheduler
            .Schedule<DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor, DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam>(
                new DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam
                {
                    NewSnippetText = request.NewSnippetText
                },
                delay: TimeSpan.Zero);

        return new DemoScheduleBackgroundJobManuallyCommandResult
        {
            ScheduledJobId = scheduledJobId
        };
    }
}
