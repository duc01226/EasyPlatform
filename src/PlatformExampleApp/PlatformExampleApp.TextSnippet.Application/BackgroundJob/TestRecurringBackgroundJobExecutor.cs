using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Timing;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.Shared.Application.EventBus.FreeFormatMessages;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Entities;
using PlatformExampleApp.TextSnippet.Domain.Repositories;

namespace PlatformExampleApp.TextSnippet.Application.BackgroundJob;

[PlatformRecurringJob("* * * * *")]
public class TestRecurringBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor
{
    private readonly IPlatformApplicationBusMessageProducer busMessageProducer;
    private readonly IPlatformCqrs cqrs;
    private readonly ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository;

    public TestRecurringBackgroundJobExecutor(
        IUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        ITextSnippetRootRepository<TextSnippetEntity> textSnippetEntityRepository,
        IPlatformCqrs cqrs,
        IPlatformApplicationBusMessageProducer busMessageProducer) : base(unitOfWorkManager, loggerFactory)
    {
        this.textSnippetEntityRepository = textSnippetEntityRepository;
        this.cqrs = cqrs;
        this.busMessageProducer = busMessageProducer;
    }

    public override async Task ProcessAsync()
    {
        await textSnippetEntityRepository.CreateOrUpdateAsync(
            new TextSnippetEntity
            {
                Id = Guid.Parse("76e0f523-ee53-4124-b109-13dedaa4618d"),
                SnippetText = "TestRecurringBackgroundJob " + Clock.Now.ToShortTimeString(),
                FullText = "Test of recurring job upsert this entity"
            });

        await cqrs.SendCommand(
            new DemoSendFreeFormatEventBusMessageCommand
            {
                Property1 = "TestRecurringBackgroundJobExecutor Prop1"
            });

        await busMessageProducer.SendFreeFormatMessageAsync(
            new TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks());
        await busMessageProducer.SendFreeFormatMessageAsync(
            new TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks1());
    }
}
