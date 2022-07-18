using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Producers.CommandEventBusProducers
{
    public class
        SaveTextSnippetCommandEventBusMessageCustomRoutingKeyProducer : PlatformCqrsCommandEventBusMessageProducer<
            SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandEventBusMessageCustomRoutingKeyProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationBusMessageProducer, loggerFactory)
        {
        }

        protected override string CustomMessageRoutingKey()
        {
            // Demo support refactor scrolling with old system that listen for message with their own routing key
            // Current value equal to "{PlatformCqrsCommandEvent.EventTypeValue}.CustomRoutingKeyForFlexibleMigrateWithOldSystem"
            return PlatformBusMessageRoutingKey.BuildCombinedStringKey(
                "CustomGroupForExchange",
                "CustomRoutingKeyForFlexibleMigrateWithOldSystem");
        }
    }
}
