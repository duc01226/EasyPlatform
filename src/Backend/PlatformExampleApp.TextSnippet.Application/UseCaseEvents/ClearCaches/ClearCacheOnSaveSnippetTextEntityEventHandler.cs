using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents.ClearCaches;

internal sealed class ClearCacheOnSaveSnippetTextEntityEventHandler : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
{
    private readonly IPlatformCacheRepositoryProvider cacheRepositoryProvider;

    public ClearCacheOnSaveSnippetTextEntityEventHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider) : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.cacheRepositoryProvider = cacheRepositoryProvider;
    }

    // Default is true to improve performance when command save, the event is executed separately and could be in parallel.
    // Set it to false if you want the event executed sync with the command and in order
    // protected override bool MustWaitHandlerExecutionFinishedImmediately() => true;

    // Can override to return False to TURN OFF support for store cqrs event handler as inbox
    // protected override bool EnableInboxEventBusMessage => false;

    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TextSnippetEntity> @event)
    {
        return true;
    }

    protected override async Task HandleAsync(
        PlatformCqrsEntityEvent<TextSnippetEntity> @event,
        CancellationToken cancellationToken)
    {
        Util.RandomGenerator.DoByChance(percentChance: 50, () => throw new Exception("Test throw exception in event handler"));

        await SearchSnippetTextQuery.ClearCache(
            cacheRepositoryProvider,
            @event.EntityData,
            @event.RequestContext,
            () => CreateLogger(LoggerFactory),
            cancellationToken);
    }
}
