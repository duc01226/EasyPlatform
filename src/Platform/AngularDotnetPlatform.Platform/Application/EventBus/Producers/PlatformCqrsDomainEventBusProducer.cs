using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
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

    public abstract class PlatformCqrsDomainEventBusProducer<TDomainEvent> : PlatformCqrsDomainEventHandler<TDomainEvent>, IPlatformCqrsEventBusProducer<TDomainEvent>
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
                await ApplicationEventBusProducer
                    .SendAsync<PlatformCqrsDomainEventBusMessage<TDomainEvent>, TDomainEvent>(
                        trackId: @event.Id,
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken);
            }
            catch (PlatformEventBusException<PlatformCqrsDomainEventBusMessage<TDomainEvent>> e)
            {
                Logger.LogError(e, $"[PlatformCqrsEventBusDomainEventHandler] Failed to send message for ${typeof(TDomainEvent).Name}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }
    }
}
