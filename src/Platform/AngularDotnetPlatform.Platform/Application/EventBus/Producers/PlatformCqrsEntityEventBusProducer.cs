using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    public interface IPlatformCqrsEntityEventBusMessage : IPlatformEventBusMessage
    {
    }

    public class PlatformCqrsEntityEventBusMessage<TEntity> : PlatformEventBusMessage<TEntity>, IPlatformCqrsEntityEventBusMessage
        where TEntity : class, IEntity, new()
    {
        public override string MessageGroup => PlatformCqrsEntityEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsEntityEvent.EventNameValue<TEntity>();
    }

    public abstract class PlatformCqrsEntityEventBusProducer<TEntity, TEntityKey> : PlatformCqrsEntityEventHandler<TEntity, TEntityKey>, IPlatformCqrsEventBusProducer<PlatformCqrsEntityEvent<TEntity, TEntityKey>>
        where TEntity : class, IEntity<TEntityKey>, new()
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

        protected override async Task HandleAsync(PlatformCqrsEntityEvent<TEntity, TEntityKey> @event, CancellationToken cancellationToken)
        {
            if (UnitOfWorkManager.Current() == null || UnitOfWorkManager.Current().Completed)
            {
                await SendEntityEventEventBusMessage(@event, cancellationToken);
            }
            else
            {
                UnitOfWorkManager.Current().OnCompleted += (sender, args) =>
                {
                    SendEntityEventEventBusMessage(@event, cancellationToken).Wait(cancellationToken);
                };
            }
        }

        private async Task SendEntityEventEventBusMessage(PlatformCqrsEntityEvent<TEntity, TEntityKey> @event, CancellationToken cancellationToken)
        {
            try
            {
                await ApplicationEventBusProducer.SendAsync<PlatformCqrsEntityEventBusMessage<TEntity>, TEntity>(
                    trackId: @event.Id,
                    messagePayload: @event.EntityData,
                    messageAction: @event.EventAction,
                    cancellationToken: cancellationToken);
            }
            catch (PlatformEventBusException<PlatformCqrsEntityEventBusMessage<TEntity>> e)
            {
                Logger.LogError(e, $"[PlatformCqrsEventBusEntityEventHandler] Failed to send message for ${typeof(PlatformCqrsEntityEvent<TEntity, TEntityKey>).FullName}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                throw;
            }
        }
    }
}
