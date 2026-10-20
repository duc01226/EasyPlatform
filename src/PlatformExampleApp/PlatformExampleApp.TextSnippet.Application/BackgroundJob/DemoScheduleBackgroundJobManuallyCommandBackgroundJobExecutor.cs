#region

using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

#endregion

namespace PlatformExampleApp.TextSnippet.Application.BackgroundJob;

public sealed class DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor
    : PlatformApplicationBackgroundJobExecutor<DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam>
{
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;

    public DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository) : base(
        unitOfWorkManager,
        loggerFactory,
        serviceProvider,
        backgroundJobScheduler)
    {
        this.textSnippetEntityRepository = textSnippetEntityRepository;
    }

    public override async Task ProcessAsync(
        DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam param)
    {
        await textSnippetEntityRepository.CreateOrUpdateAsync(
            TextSnippetEntity.Create(
                id: Ulid.Parse("01J0P1B1HNKNVK5XV31D837KGQ").ToString(),
                snippetText: $"DemoScheduleBackgroundJobManually {Clock.Now:t} {param.NewSnippetText ?? ""}",
                fullText: $"DemoScheduleBackgroundJobManually {param.NewSnippetText ?? ""}"));
    }
}

public sealed class DemoScheduleBackgroundJobManuallyCommandBackgroundJobExecutorParam
{
    public string NewSnippetText { get; set; }
}
