using Easy.Platform.Application.EventBus.Producers;
using Easy.Platform.Application.EventBus.Producers.CqrsEventProducers;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.DomainEventBusProducers
{
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusProducer : PlatformCqrsDomainEventBusProducer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }
    }

    /// <summary>
    /// Demo SendAsFreeFormatMessage. The consumer for this domain event message do not need to define routing key
    /// </summary>
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventSendAsFreeFormatMessageEventBusProducer : PlatformCqrsDomainEventBusProducer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventSendAsFreeFormatMessageEventBusProducer(
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
