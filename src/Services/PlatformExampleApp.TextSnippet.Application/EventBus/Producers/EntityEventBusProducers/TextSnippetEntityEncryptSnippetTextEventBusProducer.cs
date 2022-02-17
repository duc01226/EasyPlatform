using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Producers.EntityEventBusProducers
{
    public class TextSnippetEntityEncryptSnippetTextEventBusProducer : PlatformCqrsEntityEventBusProducer<TextSnippetEntity, TextSnippetEntity.EncryptSnippetTextPayload>
    {
        public TextSnippetEntityEncryptSnippetTextEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager, applicationEventBusProducer, loggerFactory)
        {
        }
    }
}
