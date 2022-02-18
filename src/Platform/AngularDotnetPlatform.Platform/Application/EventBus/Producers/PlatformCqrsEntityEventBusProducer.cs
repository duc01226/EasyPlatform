using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
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

    public abstract class PlatformCqrsEntityEventBusProducer<TEntity> : PlatformCqrsEntityEventHandler<TEntity>, IPlatformCqrsEventBusProducer<PlatformCqrsEntityEvent<TEntity>>
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
            CancellationToken cancellationToken) where TEvent : PlatformCqrsEntityEvent<TEntity>, new()
        {
            if (unitOfWorkManager.Current() == null || unitOfWorkManager.Current().Completed)
            {
                await SendEntityEventEventBusMessage(applicationEventBusProducer, logger, @event, cancellationToken);
            }
            else
            {
                unitOfWorkManager.Current().OnCompleted += (sender, args) =>
                {
                    SendEntityEventEventBusMessage(applicationEventBusProducer, logger, @event, cancellationToken).Wait(cancellationToken);
                };
            }
        }

        public static async Task SendEntityEventEventBusMessage<TEvent>(
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILogger logger,
            TEvent @event,
            CancellationToken cancellationToken) where TEvent : PlatformCqrsEntityEvent<TEntity>, new()
        {
            try
            {
                await applicationEventBusProducer.SendAsync<PlatformCqrsEntityEventBusMessage<TEntity>, PlatformCqrsEntityEvent<TEntity>>(
                    trackId: @event.Id,
                    messagePayload: @event,
                    messageAction: @event.EventAction,
                    cancellationToken: cancellationToken);
            }
            catch (PlatformEventBusException<PlatformCqrsEntityEventBusMessage<TEntity>> e)
            {
                logger.LogError(e, $"[PlatformCqrsEventBusEntityEventHandler] Failed to send message for ${typeof(PlatformCqrsEntityEvent<TEntity>).FullName}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }

        protected override async Task HandleAsync(PlatformCqrsEntityEvent<TEntity> @event, CancellationToken cancellationToken)
        {
            await HandleAsync(UnitOfWorkManager, ApplicationEventBusProducer, Logger, @event, cancellationToken);
        }
    }
}
