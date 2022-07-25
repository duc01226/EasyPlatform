using Easy.Platform.Application.MessageBus.Producers;
using Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Producers.EntityEventBusProducers;

public class TextSnippetEntityEventBusMessageProducer : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntity>
{
    public TextSnippetEntityEventBusMessageProducer(
        IUnitOfWorkManager unitOfWorkManager,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
        ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationBusMessageProducer, loggerFactory)
    {
    }
}

/// <summary>
/// Demo SendAsFreeFormatMessage. The consumer for this entity event message do not need to define routing key
/// </summary>
public class TextSnippetEntitySendAsFreeFormatMessageEventBusMessageProducer : PlatformCqrsEntityEventBusMessageProducer<TextSnippetEntity>
{
    public TextSnippetEntitySendAsFreeFormatMessageEventBusMessageProducer(
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
