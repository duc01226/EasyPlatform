using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
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
        PlatformCqrsCommandApplicationHandler<DemoScheduleBackgroundJobManuallyCommand, DemoScheduleBackgroundJobManuallyCommandResult>
    {
        private readonly IPlatformBackgroundJobScheduler backgroundJobScheduler;

        public DemoScheduleBackgroundJobManuallyCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs,
            IPlatformBackgroundJobScheduler backgroundJobScheduler) : base(userContext, unitOfWorkManager, cqrs)
        {
            this.backgroundJobScheduler = backgroundJobScheduler;
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
