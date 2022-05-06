using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.Consumers;
using Easy.Platform.Application.EventBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.DomainEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformApplicationEventBusConsumer{TMessagePayload}"/> to support inbox consumer
    /// The TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformApplicationEventBusConsumer{TMessagePayload}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsDomainEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TransferSnippetTextToMultiDbDemoEntityNameDomainEvent")]
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer : PlatformCqrsDomainEventBusConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }

    /// <summary>
    /// Demo using <see cref="PlatformApplicationEventBusConsumer{TMessagePayload}"/> to support inbox consumer.
    /// The TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again. <br/>
    /// Consume without using <see cref="PlatformEventBusConsumerAttribute"/>, Consumer will treat the message as free format message.
    /// Must ensure MessageClassName is unique in the system.
    /// <br/>
    /// <inheritdoc cref="PlatformApplicationEventBusConsumer{TMessagePayload}"/>
    /// </summary>
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventAsFreeFormatEventBusConsumer : PlatformCqrsDomainEventBusConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventAsFreeFormatEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory, uowManager, serviceProvider)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message, string routingKey)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${PlatformJsonSerializer.Serialize(message)}");

            return Task.CompletedTask;
        }

        // Can override this method return false to user normal consumer without using inbox message
        //public override bool AutoSaveInboxMessage => false;
    }
}
