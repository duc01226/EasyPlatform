using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
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

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                  $"Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }

    /// <summary>
    /// Demo using <see cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity}"/> to support inbox consumer.
    /// Consume without using <see cref="PlatformEventBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <br/>
    /// <inheritdoc cref="PlatformInboxCqrsEntityEventBusConsumer{TEntity}"/>
    /// </summary>
    public class SnippetTextEntityAsFreeFormatEventBusConsumer : PlatformInboxCqrsEntityEventBusConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityAsFreeFormatEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                           $"Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");
            return Task.CompletedTask;
        }
    }
}
