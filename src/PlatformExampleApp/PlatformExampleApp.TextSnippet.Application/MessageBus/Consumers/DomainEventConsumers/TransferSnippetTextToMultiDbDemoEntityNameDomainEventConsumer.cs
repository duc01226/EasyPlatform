using Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using PlatformExampleApp.TextSnippet.Domain.Events;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.Consumers.DomainEventConsumers;

/// <summary>
/// Consumer use the default routing key using message class type name without using <see cref="PlatformConsumerRoutingKeyAttribute" />
/// Must ensure TDomainEvent class name (TransferSnippetTextToMultiDbDemoEntityNameDomainEvent) is unique in the system.
/// </summary>
// Use self routing key binding [PlatformConsumerRoutingKey(messageGroup: PlatformCqrsDomainEvent.EventTypeValue, messageType: nameof(TransferSnippetTextToMultiDbDemoEntityNameDomainEvent))]
// for SendByMessageSelfRoutingKey in Producer is True
internal sealed class TransferSnippetTextToMultiDbDemoEntityNameDomainEventConsumer
    : PlatformCqrsDomainEventBusMessageConsumer<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent>
{
    public TransferSnippetTextToMultiDbDemoEntityNameDomainEventConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager uowManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
    {
    }

    public override Task HandleLogicAsync(
        PlatformBusMessage<TransferSnippetTextToMultiDbDemoEntityNameDomainEvent> message,
        string routingKey)
    {
        // Example for sync data event update event data entity value not changed
        // if (message.ForceSyncNoCheckDiff == true)
        //    RequestContextAccessor.Current.Upsert(PlatformCqrsEntityEvent.RequestContextForceSyncDataNoCheckUpdateDataIsDifferentKey, true);

        Util.RandomGenerator.DoByChance(
            percentChance: 5,
            () => throw new Exception("Random Test Retry Consumer Throw Exception"));

        Logger.LogInformation(
            "{GetTypeFullName} has handled message. Message Detail: {BusMessage}",
            GetType().FullName,
            message.ToFormattedJson());

        return Task.CompletedTask;
    }

    // Can override this method return false to user normal consumer without using inbox message
    //public override bool AutoSaveInboxMessage => false;
}
