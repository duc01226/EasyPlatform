using System;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Caching;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Utils;
using PlatformExampleApp.TextSnippet.Application.Caching;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventHandlers.CommandEventHandlers
{
    public class ClearCacheOnSaveSnippetTextCommandEventHandler : PlatformCqrsCommandEventHandler<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        private readonly IPlatformCacheProvider cacheProvider;

        public ClearCacheOnSaveSnippetTextCommandEventHandler(IPlatformCacheProvider cacheProvider)
        {
            this.cacheProvider = cacheProvider;
        }

        protected override Task HandleAsync(PlatformCqrsCommandEvent<SaveSnippetTextCommand, SaveSnippetTextCommandResult> @event, CancellationToken cancellationToken)
        {
            // Queue task to clear cache after 10 seconds. Delay because when save snippet text, fulltext index take amount of time to update, so that we wait
            // amount of time for fulltext index update
            Util.Tasks.DelayActionMultipleTimes(
                () => cacheProvider.Get().RemoveAsync(
                    TextSnippetCollectionCacheKeyProvider.DefaultInstance.MatchKeyPredicate(),
                    cancellationToken),
                delayTimes: new[] { TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10) },
                cancellationToken);

            // Still clear cache immediately to help update data in case of there is index which could be updated fast
            return cacheProvider.Get().RemoveAsync(
                TextSnippetCollectionCacheKeyProvider.DefaultInstance.MatchKeyPredicate(),
                cancellationToken);
        }
    }
}
