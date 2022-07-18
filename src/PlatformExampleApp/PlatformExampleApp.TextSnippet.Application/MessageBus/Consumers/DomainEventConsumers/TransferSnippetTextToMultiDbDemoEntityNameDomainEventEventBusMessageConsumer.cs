using Easy.Platform.Application.MessageBus.Consumers;
using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.DomainEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformApplicationMessageBusConsumer{TMessagePayload}"/> to support inbox consumer
    /// The TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformApplicationMessageBusConsumer{TMessagePayload}"/>
    /// </summary>
    [PlatformMessageBusConsumer(
        PlatformCqrsDomainEvent.EventTypeValue,
        TextSnippetApplicationConstants.ApplicationName,
        "TransferSnippetTextToMultiDbDemoEntityNameDomainEvent")]
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusMessageConsumer :
        PlatformCqrsDomainEventBusMessageConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(
            PlatformBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message,
            string routingKey)
        {
            Logger.LogInformationIfEnabled(
                $"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformApplicationMessageBusConsumer{TMessagePayload}"/> to support inbox consumer.
    /// The TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again. <br/>
    /// Consume without using <see cref="PlatformMessageBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <br/>
    /// <inheritdoc cref="PlatformApplicationMessageBusConsumer{TMessagePayload}"/>
    /// </summary>
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventAsFreeFormatEventBusMessageConsumer :
        PlatformCqrsDomainEventBusMessageConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventAsFreeFormatEventBusMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(
            PlatformBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message,
            string routingKey)
        {
            Logger.LogInformationIfEnabled(
                $"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}
