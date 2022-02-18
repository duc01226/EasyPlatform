using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.InboxPattern;
using AngularDotnetPlatform.Platform.Common.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Application.UseCaseCommands;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.EventBus.Consumers.DomainEventConsumers
{
    /// <summary>
    /// Demo using <see cref="PlatformInboxEventBusConsumer{TMessagePayload}"/> to support inbox consumer
    /// The TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer will throw error => Trigger message requeue =>
    /// Inbox consumer will prevent a consumer consume the same message again.
    /// <br/>
    /// <inheritdoc cref="PlatformInboxEventBusConsumer{TMessagePayload}"/>
    /// </summary>
    [PlatformEventBusConsumer(PlatformCqrsDomainEvent.EventTypeValue, TextSnippetApplicationConstants.ApplicationName, "TransferSnippetTextToMultiDbDemoEntityNameDomainEvent")]
    public class TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer : PlatformInboxEventBusConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
    {
        public TransferSnippetTextToMultiDbDemoEntityNameDomainEventEventBusConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IPlatformInboxEventBusMessageRepository inboxEventBusMessageRepo) : base(loggerFactory, uowManager, inboxEventBusMessageRepo)
        {
        }

        protected override Task InternalHandleAsync(PlatformEventBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message)
        {
            Logger.LogInformationIfEnabled($"{GetType().FullName} has handled message. Message Detail: ${JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value)}");

            return Task.CompletedTask;
        }
    }
}
