using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.CommandEventBusProducers
{
    public class SaveTextSnippetCommandEventBusProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }
    }

    public class SaveTextSnippetCommandSendAsFreeFormatMessageEventBusProducer : PlatformCqrsCommandEventBusProducer<SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandSendAsFreeFormatMessageEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }

        protected override bool SendAsFreeFormatMessage()
        {
            return true;
        }
    }
}
