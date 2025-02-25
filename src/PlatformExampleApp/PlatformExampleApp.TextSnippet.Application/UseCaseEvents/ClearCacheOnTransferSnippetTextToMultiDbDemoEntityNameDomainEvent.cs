using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Caching;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.UseCaseQueries;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents;

internal sealed class ClearCacheOnTransferSnippetTextToMultiDbDemoEntityNameDomainEvent
    : PlatformCqrsDomainEventApplicationHandler<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
{
    private readonly IPlatformCacheRepositoryProvider cacheRepositoryProvider;

    public ClearCacheOnTransferSnippetTextToMultiDbDemoEntityNameDomainEvent(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider) : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        this.cacheRepositoryProvider = cacheRepositoryProvider;
    }

    protected override async Task HandleAsync(TransferSnippetTextToMultiDbDemoEntityNameDomainEvent @event, CancellationToken cancellationToken)
    {
        // Test slow event do not affect main command
        await Task.Delay(5.Seconds(), cancellationToken);

        var removeFilterRequestCacheKeyParts = SearchSnippetTextQuery.BuildCacheRequestKeyParts(request: null, userId: null, companyId: null);

        // Queue task to clear cache every 5 seconds for 2 times.
        // Delay because when save snippet text, fulltext index take amount of time to update, so that we wait
        // amount of time for fulltext index update
        // We also set executeOnceImmediately=true to clear cache immediately in case of some index is updated fast
        Util.TaskRunner.QueueIntervalAsyncActionInBackground(
            token => cacheRepositoryProvider
                .GetCollection<TextSnippetCollectionCacheKeyProvider>()
                .RemoveAsync(cacheRequestKeyPartsPredicate: keyParts => keyParts[1] == removeFilterRequestCacheKeyParts[1], token),
            intervalTimeInSeconds: 5,
            CreateGlobalLogger,
            maximumIntervalExecutionCount: 2,
            executeOnceImmediately: true,
            cancellationToken);
    }
}
