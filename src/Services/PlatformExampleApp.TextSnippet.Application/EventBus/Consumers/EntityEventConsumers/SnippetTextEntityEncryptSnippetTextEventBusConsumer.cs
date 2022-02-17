using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.EntityEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity, TBusinessActionPayload}"/> to support inbox consumer with handling entity event with business action payload
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity, TBusinessActionPayload}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity", "Updated.EncryptSnippetText")]
    public class SnippetTextEntityEncryptSnippetTextEventBusConsumer : PlatformInboxCqrsEntityEventBusConsumer<TextSnippetEntity, TextSnippetEntity.EncryptSnippetTextPayload>
    {
        public SnippetTextEntityEncryptSnippetTextEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity, TextSnippetEntity.EncryptSnippetTextPayload>> message)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessAction != null ? $"for Business Action [{message.Payload.BusinessAction}]" : "")}.\r\n" +
                                           $"Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}
