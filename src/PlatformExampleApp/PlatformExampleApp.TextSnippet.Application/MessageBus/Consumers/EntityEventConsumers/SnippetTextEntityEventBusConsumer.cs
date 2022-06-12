using System;
using System.Linq;
using System.Threading.Tasks;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Entities;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.EntityEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/> to support inbox consumer
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/>
    /// </summary>
    [PlatformMessageBusConsumer(PlatformCqrsEntityEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TextSnippetEntity")]
    public class SnippetTextEntityEventBusMessageConsumer : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                           $"Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/> to support inbox consumer.
    /// Consume without using <see cref="PlatformMessageBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/>
    /// </summary>
    public class SnippetTextEntityAsFreeFormatEventBusMessageConsumer : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityAsFreeFormatEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message {(message.Payload.BusinessActionEvents.Any() ? $"for Business Actions [{string.Join(", ", message.Payload.BusinessActionEvents.Select(p => p.Key))}]" : "")}.\r\n" +
                                           $"Message Detail: ${PlatformJsonSerializer.Serialize(message)}");
            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/> to support inbox consumer.
    /// Test throw error to store inbox message with error info
    /// <br/>
    /// <inheritdoc cref="PlatformCqrsEntityEventBusMessageConsumer{TEntity}"/>
    /// </summary>
    public class SnippetTextEntityTestErrorInboxEventBusMessageConsumer : PlatformCqrsEntityEventBusMessageConsumer<TextSnippetEntity>
    {
        public SnippetTextEntityTestErrorInboxEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformBusMessage<PlatformCqrsEntityEvent<TextSnippetEntity>> message, string routingKey)
        {
            throw new Exception($"Test error inbox {DateTime.UtcNow.ToLongDateString()}");
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}
