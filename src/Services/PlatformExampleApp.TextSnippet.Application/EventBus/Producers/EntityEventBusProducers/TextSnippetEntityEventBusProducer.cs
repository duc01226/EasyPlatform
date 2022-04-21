using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.EntityEventBusProducers
{
    public class TextSnippetEntityEventBusProducer : PlatformCqrsEntityEventBusProducer<TextSnippetEntity>
    {
        public TextSnippetEntityEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }
    }

    public class TextSnippetEntitySendAsFreeFormatMessageEventBusProducer : PlatformCqrsEntityEventBusProducer<TextSnippetEntity>
    {
        public TextSnippetEntitySendAsFreeFormatMessageEventBusProducer(
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
