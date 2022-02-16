using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.BackgroundJob;
using PlatformExampleApp.TextSnippet.Application.BackgroundJob;
using PlatformExampleApp.TextSnippet.Domain.Services;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseCommands
{
    public class DemoScheduleBackgroundJobManuallyCommand : PlatformCqrsCommand<DemoScheduleBackgroundJobManuallyCommandResult>
    {
        public static readonly string DefaultUpdateTextSnippetFullText =
            "DemoScheduleBackgroundJobManually NewSnippetText";

        public string NewSnippetText { get; set; } = DefaultUpdateTextSnippetFullText;
    }

    public class DemoScheduleBackgroundJobManuallyCommandResult : PlatformCqrsCommandResult
    {
        public string ScheduledJobId { get; set; }
    }

    public class DemoScheduleBackgroundJobManuallyCommandHandler :
        PlatformCqrsApplicationCommandHandler<DemoScheduleBackgroundJobManuallyCommand, DemoScheduleBackgroundJobManuallyCommandResult>
    {
        private readonly IPlatformBackgroundJobScheduler backgroundJobScheduler;
        // Demo use demoDomainService
        private readonly DemoDomainService demoDomainService;

        public DemoScheduleBackgroundJobManuallyCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            IPlatformBackgroundJobScheduler backgroundJobScheduler,
            DemoDomainService demoDomainService) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.backgroundJobScheduler = backgroundJobScheduler;
            this.demoDomainService = demoDomainService;
        }

        protected override async Task<DemoScheduleBackgroundJobManuallyCommandResult> HandleAsync(
            DemoScheduleBackgroundJobManuallyCommand request,
            CancellationToken cancellationToken)
        {
            return await Task.Run(
                () =>
                {
                    var scheduledJobId = backgroundJobScheduler
                        .Schedule<DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor, DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam>(
                            new DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam()
                            {
                                NewSnippetText = request.NewSnippetText
                            },
                            TimeSpan.FromSeconds(5));

                    return new DemoScheduleBackgroundJobManuallyCommandResult() { ScheduledJobId = scheduledJobId };
                },
                cancellationToken);
        }
    }
}
