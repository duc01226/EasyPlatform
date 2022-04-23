using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Producers
{
    public interface IPlatformCqrsDomainEventBusMessage : IPlatformEventBusMessage
    {
    }

    public class PlatformCqrsDomainEventBusMessage<TDomainEvent> : PlatformEventBusMessage<TDomainEvent>, IPlatformCqrsDomainEventBusMessage
        where TDomainEvent : PlatformCqrsDomainEvent, new()
    {
        public override string MessageGroup => PlatformCqrsDomainEvent.EventTypeValue;
        public override string MessageType => typeof(TDomainEvent).Name;
    }

    public abstract class PlatformCqrsDomainEventBusProducer<TDomainEvent> : PlatformCqrsDomainEventApplicationHandler<TDomainEvent>, IPlatformCqrsEventBusProducer<TDomainEvent>
        where TDomainEvent : PlatformCqrsDomainEvent, new()
    {
        protected readonly IPlatformApplicationEventBusProducer ApplicationEventBusProducer;
        protected readonly ILogger Logger;

        public PlatformCqrsDomainEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            ApplicationEventBusProducer = applicationEventBusProducer;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        protected override async Task HandleAsync(TDomainEvent @event, CancellationToken cancellationToken)
        {
            try
            {
                if (SendWithFreeFormatMessageRoutingKey())
                {
                    await ApplicationEventBusProducer
                        .SendAsFreeFormatMessageAsync<PlatformCqrsDomainEventBusMessage<TDomainEvent>, TDomainEvent>(
                            trackId: @event.Id,
                            messagePayload: @event,
                            messageAction: @event.EventAction,
                            cancellationToken);
                }
                else
                {
                    await ApplicationEventBusProducer
                        .SendAsync<PlatformCqrsDomainEventBusMessage<TDomainEvent>, TDomainEvent>(
                            trackId: @event.Id,
                            messagePayload: @event,
                            messageAction: @event.EventAction,
                            cancellationToken);
                }
            }
            catch (PlatformEventBusException<PlatformCqrsDomainEventBusMessage<TDomainEvent>> e)
            {
                Logger.LogError(e, $"[PlatformCqrsEventBusDomainEventHandler] Failed to send message for ${typeof(TDomainEvent).Name}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }

        /// <summary>
        /// Default is False. If True, the producer will send message using <see cref="IPlatformApplicationEventBusProducer.SendAsFreeFormatMessageAsync{TMessage,TMessagePayload}"/>.
        /// The the consumer for this message do not need to define <see cref="PlatformEventBusConsumerAttribute"/>.
        /// Consumer without <see cref="PlatformEventBusConsumerAttribute"/> will automatically binding to Default FreeFormatMessageRoutingKey for the TMessage Type.
        /// </summary>
        protected virtual bool SendWithFreeFormatMessageRoutingKey()
        {
            return false;
        }
    }
}
