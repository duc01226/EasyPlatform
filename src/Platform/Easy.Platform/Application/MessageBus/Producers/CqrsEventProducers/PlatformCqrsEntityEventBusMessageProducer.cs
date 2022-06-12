using System;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers
{
    public interface IPlatformCqrsEntityEventBusMessage : IPlatformBusMessage
    {
    }

    public class PlatformCqrsEntityEventBusMessage<TEntity> : PlatformBusMessage<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusMessage
        where TEntity : class, IEntity, new()
    {
        public override string MessageGroup => PlatformCqrsEntityEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsEntityEvent.EventNameValue<TEntity>();
    }

    public abstract class PlatformCqrsEntityEventBusMessageProducer<TEntity> : PlatformCqrsEntityEventApplicationHandler<TEntity>, IPlatformCqrsEventBusMessageProducer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
        protected readonly IPlatformApplicationBusMessageProducer ApplicationBusMessageProducer;
        protected readonly ILogger Logger;

        public PlatformCqrsEntityEventBusMessageProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            ApplicationBusMessageProducer = applicationBusMessageProducer;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        protected override async Task HandleAsync(PlatformCqrsEntityEvent<TEntity> @event, CancellationToken cancellationToken)
        {
            await SendEntityEventEventBusMessage(@event, cancellationToken);
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

        protected virtual async Task SendEntityEventEventBusMessage<TEvent>(
            TEvent @event,
            CancellationToken cancellationToken) where TEvent : PlatformCqrsEntityEvent<TEntity>, new()
        {
            try
            {
                if (SendAsFreeFormatMessage())
                {
                    await ApplicationBusMessageProducer.SendAsDefaultFreeFormatMessageAsync<PlatformCqrsEntityEventBusMessage<TEntity>, PlatformCqrsEntityEvent<TEntity>>(
                        trackId: Guid.NewGuid().ToString(),
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
                }
                else
                {
                    await ApplicationBusMessageProducer.SendAsync<PlatformCqrsEntityEventBusMessage<TEntity>, PlatformCqrsEntityEvent<TEntity>>(
                        trackId: Guid.NewGuid().ToString(),
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
                }
            }
            catch (PlatformMessageBusException<PlatformCqrsEntityEventBusMessage<TEntity>> e)
            {
                Logger.LogError(e, $"[PlatformCqrsEventBusEntityEventHandler] Failed to send message for ${typeof(PlatformCqrsEntityEvent<TEntity>).FullName}. " +
                                   $"Message Info: {PlatformJsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }
    }
}
