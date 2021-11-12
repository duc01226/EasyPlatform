using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.CommandEventBusProducers
{
    public class SaveTextSnippetCommandEventBusProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        public SaveTextSnippetCommandEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }
    }

    public class SaveTextSnippetCommandEventBusCustomRoutingKeyForFlexibleMigrateWithOldSystemProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand, SaveSnippetTextCommandResult>
    {
        public SaveTextSnippetCommandEventBusCustomRoutingKeyForFlexibleMigrateWithOldSystemProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }

        protected override string CustomMessageRoutingKey()
        {
            // Demo support refactor scrolling with old system that listen for message with their own routing key
            return "CustomRoutingKeyForFlexibleMigrateWithOldSystem";
        }
    }
}
