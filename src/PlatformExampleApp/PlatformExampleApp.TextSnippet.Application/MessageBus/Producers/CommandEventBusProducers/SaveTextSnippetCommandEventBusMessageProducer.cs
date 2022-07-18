using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Producers.CommandEventBusProducers
{
    public class
        SaveTextSnippetCommandEventBusMessageProducer : PlatformCqrsCommandEventBusMessageProducer<
            SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandEventBusMessageProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationBusMessageProducer, loggerFactory)
        {
        }
    }

    /// <summary>
    /// Demo SendAsFreeFormatMessage. The consumer for this command event message do not need to define routing key
    /// </summary>
    public class
        SaveTextSnippetCommandSendAsFreeFormatMessageEventBusMessageProducer :
            PlatformCqrsCommandEventBusMessageProducer<SaveSnippetTextCommand>
    {
        public SaveTextSnippetCommandSendAsFreeFormatMessageEventBusMessageProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationBusMessageProducer, loggerFactory)
        {
        }

        protected override bool SendAsFreeFormatMessage()
        {
            return true;
        }
    }
}
