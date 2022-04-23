using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Producers
{
    public interface IPlatformCqrsEntityEventBusMessage : IPlatformEventBusMessage
    {
    }

    public class PlatformCqrsEntityEventBusMessage<TEntity> : PlatformEventBusMessage<PlatformCqrsEntityEvent<TEntity>>, IPlatformCqrsEntityEventBusMessage
        where TEntity : class, IEntity, new()
    {
        public override string MessageGroup => PlatformCqrsEntityEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsEntityEvent.EventNameValue<TEntity>();
    }

    public abstract class PlatformCqrsEntityEventBusProducer<TEntity> : PlatformCqrsEntityEventApplicationHandler<TEntity>, IPlatformCqrsEventBusProducer<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
        protected readonly IPlatformApplicationEventBusProducer ApplicationEventBusProducer;
        protected readonly ILogger Logger;

        public PlatformCqrsEntityEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            ApplicationEventBusProducer = applicationEventBusProducer;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        public static async Task HandleAsync<TEvent>(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILogger logger,
            TEvent @event,
            bool sendAsFreeFormatMessage,
            CancellationToken cancellationToken) where TEvent : PlatformCqrsEntityEvent<TEntity>, new()
        {
            if (unitOfWorkManager.Current() == null || unitOfWorkManager.Current().Completed)
            {
                await SendEntityEventEventBusMessage(applicationEventBusProducer, logger, @event, sendAsFreeFormatMessage, cancellationToken);
            }
            else
            {
                unitOfWorkManager.Current().OnCompleted += (sender, args) =>
                {
                    SendEntityEventEventBusMessage(applicationEventBusProducer, logger, @event, sendAsFreeFormatMessage, cancellationToken).Wait(cancellationToken);
                };
            }
        }

        public static async Task SendEntityEventEventBusMessage<TEvent>(
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILogger logger,
            TEvent @event,
            bool sendAsFreeFormatMessage,
            CancellationToken cancellationToken) where TEvent : PlatformCqrsEntityEvent<TEntity>, new()
        {
            try
            {
                if (sendAsFreeFormatMessage)
                {
                    await applicationEventBusProducer.SendAsFreeFormatMessageAsync<PlatformCqrsEntityEventBusMessage<TEntity>, PlatformCqrsEntityEvent<TEntity>>(
                        trackId: @event.Id,
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
                }
                else
                {
                    await applicationEventBusProducer.SendAsync<PlatformCqrsEntityEventBusMessage<TEntity>, PlatformCqrsEntityEvent<TEntity>>(
                        trackId: @event.Id,
                        messagePayload: @event,
                        messageAction: @event.EventAction,
                        cancellationToken: cancellationToken);
                }
            }
            catch (PlatformEventBusException<PlatformCqrsEntityEventBusMessage<TEntity>> e)
            {
                logger.LogError(e, $"[PlatformCqrsEventBusEntityEventHandler] Failed to send message for ${typeof(PlatformCqrsEntityEvent<TEntity>).FullName}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }

        protected override async Task HandleAsync(PlatformCqrsEntityEvent<TEntity> @event, CancellationToken cancellationToken)
        {
            await HandleAsync(UnitOfWorkManager, ApplicationEventBusProducer, Logger, @event, SendWithFreeFormatMessageRoutingKey(), cancellationToken);
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
