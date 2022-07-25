using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;

public interface IPlatformCqrsDomainEventBusMessage : IPlatformBusMessage
{
}

public class PlatformCqrsDomainEventBusMessage<TDomainEvent> : PlatformBusMessage<TDomainEvent>,
    IPlatformCqrsDomainEventBusMessage
    where TDomainEvent : PlatformCqrsDomainEvent, new()
{
    public override string MessageGroup => PlatformCqrsDomainEvent.EventTypeValue;
    public override string MessageType => typeof(TDomainEvent).Name;
}

public abstract class PlatformCqrsDomainEventBusMessageProducer<TDomainEvent> :
    PlatformCqrsDomainEventApplicationHandler<TDomainEvent>,
    IPlatformCqrsEventBusMessageProducer<TDomainEvent>
    where TDomainEvent : PlatformCqrsDomainEvent, new()
{
    protected readonly IPlatformApplicationBusMessageProducer ApplicationBusMessageProducer;
    protected readonly ILogger Logger;

    public PlatformCqrsDomainEventBusMessageProducer(
        IUnitOfWorkManager unitOfWorkManager,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
        ILoggerFactory loggerFactory) : base(unitOfWorkManager)
    {
        ApplicationBusMessageProducer = applicationBusMessageProducer;
        Logger = loggerFactory.CreateLogger(GetType());
    }

    protected override async Task HandleAsync(TDomainEvent @event, CancellationToken cancellationToken)
    {
        await SendDomainEventEventBusMessage(@event, cancellationToken);
    }

    protected virtual async Task SendDomainEventEventBusMessage(
        TDomainEvent @event,
        CancellationToken cancellationToken)
    {
        try
        {
            if (SendAsFreeFormatMessage())
                await ApplicationBusMessageProducer
                    .SendAsDefaultFreeFormatMessageAsync<PlatformCqrsDomainEventBusMessage<TDomainEvent>, TDomainEvent>(
                        trackId: Guid.NewGuid().ToString(),
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
            else
                await ApplicationBusMessageProducer
                    .SendAsync<PlatformCqrsDomainEventBusMessage<TDomainEvent>, TDomainEvent>(
                        trackId: Guid.NewGuid().ToString(),
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
        }
        catch (PlatformMessageBusException<PlatformCqrsDomainEventBusMessage<TDomainEvent>> e)
        {
            Logger.LogError(
                e,
                $"[PlatformCqrsEventBusDomainEventHandler] Failed to send message for ${typeof(TDomainEvent).Name}. Message Info: {PlatformJsonSerializer.Serialize(e.EventBusMessage)}");
            throw;
        }
    }

    /// <summary>
    /// Default is False. If True, the producer will send message using <see cref="IPlatformApplicationBusMessageProducer.SendAsDefaultFreeFormatMessageAsync{TMessage,TMessagePayload}"/>.
    /// The the consumer for this message do not need to define <see cref="PlatformMessageBusConsumerAttribute"/>.
    /// Consumer without <see cref="PlatformMessageBusConsumerAttribute"/> will automatically binding to Default FreeFormatMessageRoutingKey for the TMessage Type.
    /// </summary>
    protected virtual bool SendAsFreeFormatMessage()
    {
        return false;
    }
}
