using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.EntityEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/> to support inbox consumer
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity")]
    public class SnippetTextEntityEventBusConsumer : PlatformCqrsEntityEventBusConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                           $"Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/> to support inbox consumer.
    /// Consume without using <see cref="PlatformEventBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/>
    /// </summary>
    public class SnippetTextEntityAsFreeFormatEventBusConsumer : PlatformCqrsEntityEventBusConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityAsFreeFormatEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                           $"Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/> to support inbox consumer.
    /// Test throw error to store inbox message with error info
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusConsumer{TEntity}"/>
    /// </summary>
    public class SnippetTextEntityTestErrorInboxEventBusConsumer : PlatformCqrsEntityEventBusConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityTestErrorInboxEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            throw new Exception($"Test error inbox {DateTime.UtcNow.ToLongDateString()}");
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}
