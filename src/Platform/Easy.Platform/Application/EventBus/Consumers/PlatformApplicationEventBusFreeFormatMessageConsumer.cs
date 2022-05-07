using System;
using System.Threading.Tasks;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Consumers
{
    /// <summary>
    /// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
    /// when event bus requeue message.
    /// This will stored consumed message into db. If message existed, it won't process the consumer.
    /// </summary>
    public interface IPlatformApplicationEventBusFreeFormatMessageConsumer<TMessage> : IPlatformInboxSupportEventBusConsumer, IPlatformEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
    }

    public abstract class PlatformApplicationEventBusFreeFormatMessageConsumer<TMessage> : PlatformEventBusFreeFormatMessageConsumer<TMessage>, IPlatformApplicationEventBusFreeFormatMessageConsumer<TMessage>
        where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
    {
        protected readonly IUnitOfWorkManager UowManager;
        protected readonly IPlatformInboxEventBusMessageRepository InboxEventBusMessageRepo;

        protected PlatformApplicationEventBusFreeFormatMessageConsumer(
            ILoggerFactory loggerFactory,
            IUnitOfWorkManager uowManager,
            IServiceProvider serviceProvider) : base(loggerFactory)
        {
            UowManager = uowManager;
            InboxEventBusMessageRepo = serviceProvider.GetService<IPlatformInboxEventBusMessageRepository>();
        }

        public override async Task HandleAsync(TMessage message, string routingKey)
        {
            try
            {
                using (var uow = UowManager.Begin())
                {
                    await ExecuteInternalHandleAsync(message, routingKey);
                    await uow.CompleteAsync();
                }
            }
            catch (Exception e)
            {
                Logger.LogError(e, $"Error Consume message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                                   $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
                throw;
            }
        }

        protected virtual async Task ExecuteInternalHandleAsync(TMessage message, string routingKey)
        {
            if (InboxEventBusMessageRepo != null && AutoSaveInboxMessage)
            {
                await PlatformInboxEventBusConsumerHelper.HandleExecutingInboxConsumerInternalHandleAsync(
                    consumer: this,
                    UowManager,
                    InboxEventBusMessageRepo,
                    InternalHandleAsync,
                    message,
                    routingKey,
                    IsProcessingExistingInboxMessage,
                    Logger);
            }
            else
            {
                await InternalHandleAsync(message, routingKey);
            }
        }

        protected bool IsProcessingExistingInboxMessage { get; set; }

        public IPlatformInboxSupportEventBusConsumer ForProcessingExistingInboxMessage()
        {
            IsProcessingExistingInboxMessage = true;

            return this;
        }

        /// <summary>
        /// Auto save inbox message if Inbox feature activated
        /// </summary>
        public virtual bool AutoSaveInboxMessage => true;
    }
}
