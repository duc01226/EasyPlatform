using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Utils;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.UseCaseEvents
{
    public class ClearCacheOnSaveSnippetTextEntityEventHandler : PlatformCqrsEntityEventHandler<TextSnippetEntity, Guid>
    {
        private readonly IPlatformCacheRepositoryProvider cacheRepositoryProvider;

        public ClearCacheOnSaveSnippetTextEntityEventHandler(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCacheRepositoryProvider cacheRepositoryProvider) : base(unitOfWorkManager)
        {
            this.cacheRepositoryProvider = cacheRepositoryProvider;
        }

        protected override Task HandleAsync(PlatformCqrsEntityEvent<TextSnippetEntity, Guid> @event, CancellationToken cancellationToken)
        {
            // Queue task to clear cache every 5 seconds for 3 times (mean that after 5,10,15s).
            // Delay because when save snippet text, fulltext index take amount of time to update, so that we wait
            // amount of time for fulltext index update
            // We also set executeOnceImmediately=true to clear cache immediately in case of some index is updated fast
            Util.Tasks.QueueIntervalAsyncAction(
                token => cacheRepositoryProvider.Get().RemoveCollectionAsync<TextSnippetApplicationCollectionCacheKeyProvider>(token),
                intervalTimeInSeconds: 5,
                maximumIntervalExecutionCount: 3,
                executeOnceImmediately: true,
                cancellationToken: cancellationToken);

            return Task.CompletedTask;
        }
    }
}
