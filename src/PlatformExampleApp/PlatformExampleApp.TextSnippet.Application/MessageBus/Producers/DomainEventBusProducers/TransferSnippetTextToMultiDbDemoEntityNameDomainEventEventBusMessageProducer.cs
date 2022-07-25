using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Producers.DomainEventBusProducers;

public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusMessageProducer :
    PlatformCqrsDomainEventBusMessageProducer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
{
    public TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusMessageProducer(
        IUnitOfWorkManager unitOfWorkManager,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
        ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationBusMessageProducer, loggerFactory)
    {
    }
}

/// <summary>
/// Demo SendAsFreeFormatMessage. The consumer for this domain event message do not need to define routing key
/// </summary>
public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventSendAsFreeFormatMessageEventBusMessageProducer :
    PlatformCqrsDomainEventBusMessageProducer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
{
    public TransferSnippetTextToMultiDbDemoEntityNameDomainEventSendAsFreeFormatMessageEventBusMessageProducer(
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
