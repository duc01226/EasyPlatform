using System.Text.Json;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.EntityEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity}"/> to support inbox consumer
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity")]
    public class SnippetTextEntityEventBusConsumer : PlatformInboxCqrsEntityEventBusConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message)
        {
            Logger.LogInformation($"{GetType().FullName} has handled message {(message.Payload.ForBusinessAction != null ? $"for Business Action [{message.Payload.ForBusinessAction}]" : "")}.\r\n" +
                                  $"Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}
