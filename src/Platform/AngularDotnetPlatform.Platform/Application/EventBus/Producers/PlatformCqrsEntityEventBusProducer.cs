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

    public class PlatformCqrsEntityEventBusMessage<TEntity, TEntityKey> : PlatformEventBusMessage<TEntity>, IPlatformCqrsEntityEventBusMessage
        where TEntity : RootEntity<TEntity, TEntityKey>, new()
    {
        public override string MessageGroup => PlatformCqrsEntityEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsEntityEvent.EventNameValue<TEntity>();
    }

    public abstract class PlatformCqrsEntityEventBusProducer<TEntity, TEntityKey> : PlatformCqrsEntityEventHandler<TEntity, TEntityKey>, IPlatformCqrsEventBusProducer<PlatformCqrsEntityEvent<TEntity, TEntityKey>>
        where TEntity : RootEntity<TEntity, TEntityKey>, new()
    {
        protected readonly IPlatformEventBusProducer EventBusProducer;
        protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;
        protected readonly IPlatformApplicationUserContextAccessor UserContextAccessor;
        protected readonly ILogger Logger;

        public PlatformCqrsEntityEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformEventBusProducer eventBusProducer,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            EventBusProducer = eventBusProducer;
            ApplicationSettingContext = applicationSettingContext;
            UserContextAccessor = userContextAccessor;
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
            var message = PlatformEventBusMessage<TEntity>.New<PlatformCqrsEntityEventBusMessage<TEntity, TEntityKey>>(
                @event.Id,
                @event.EntityData,
                new PlatformEventBusMessageIdentity()
                {
                    UserId = UserContextAccessor.Current?.GetUserId(),
                    RequestId = UserContextAccessor.Current?.GetRequestId()
                },
                producerContext: ApplicationSettingContext.ApplicationName,
                messageAction: @event.EventAction);
            try
            {
                await EventBusProducer.SendAsync<PlatformCqrsEntityEventBusMessage<TEntity, TEntityKey>, TEntity>(message, cancellationToken);
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"[PlatformCqrsEventBusEntityEventHandler] Failed to send message for ${typeof(PlatformCqrsEntityEvent<TEntity, TEntityKey>).FullName}. Message Info: {JsonSerializer.Serialize(message)}");
                throw;
            }
        }
    }
}
