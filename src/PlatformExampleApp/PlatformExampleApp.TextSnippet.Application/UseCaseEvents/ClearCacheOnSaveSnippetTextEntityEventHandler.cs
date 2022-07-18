using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.Caching;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents
{
    public class
        ClearCacheOnSaveSnippetTextEntityEventHandler : PlatformCqrsEntityEventApplicationHandler<TextSnippetEntity>
    {
        private readonly IPlatformCacheRepositoryProvider cacheRepositoryProvider;

        public ClearCacheOnSaveSnippetTextEntityEventHandler(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCacheRepositoryProvider cacheRepositoryProvider) : base(unitOfWorkManager)
        {
            this.cacheRepositoryProvider = cacheRepositoryProvider;
        }

        protected override Task HandleAsync(
            PlatformCqrsEntityEvent<TextSnippetEntity> @event,
            CancellationToken cancellationToken)
        {
            // Queue task to clear cache every 5 seconds for 3 times (mean that after 5,10,15s).
            // Delay because when save snippet text, fulltext index take amount of time to update, so that we wait
            // amount of time for fulltext index update
            // We also set executeOnceImmediately=true to clear cache immediately in case of some index is updated fast
            Util.Tasks.QueueIntervalAsyncAction(
                token => cacheRepositoryProvider.Get()
                    .RemoveCollectionAsync<TextSnippetCollectionCacheKeyProvider>(token),
                intervalTimeInSeconds: 5,
                maximumIntervalExecutionCount: 3,
                executeOnceImmediately: true,
                cancellationToken: cancellationToken);

            return Task.CompletedTask;
        }
    }
}
