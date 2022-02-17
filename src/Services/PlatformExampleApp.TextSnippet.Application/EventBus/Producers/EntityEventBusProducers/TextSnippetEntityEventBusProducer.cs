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
}
