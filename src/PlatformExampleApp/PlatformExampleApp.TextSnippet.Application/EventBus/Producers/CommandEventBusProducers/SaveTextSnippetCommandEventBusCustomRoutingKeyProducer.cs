using Easy.Platform.Application.EventBus.Producers;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.CommandEventBusProducers
{
    public class SaveTextSnippetCommandEventBusCustomRoutingKeyProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandEventBusCustomRoutingKeyProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }

        protected override string CustomMessageRoutingKey()
        {
            // Demo support refactor scrolling with old system that listen for message with their own routing key
            // Current value equal to "{PlatformCqrsCommandEvent.EventTypeValue}.CustomRoutingKeyForFlexibleMigrateWithOldSystem"
            return PlatformEventBusMessageRoutingKey.BuildCombinedStringKey(
                PlatformCqrsCommandEvent.EventTypeValue,
                "CustomRoutingKeyForFlexibleMigrateWithOldSystem");
        }
    }
}
