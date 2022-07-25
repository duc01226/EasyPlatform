using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers;

/// <summary>
/// Inbox consumer support inbox pattern to prevent duplicated consumer message many times
/// when event bus requeue message.
/// This will stored consumed message into db. If message existed, it won't process the consumer.
/// </summary>
public interface IPlatformApplicationBusFreeFormatMessageConsumer<in TMessage> :
    IPlatformInboxSupportMessageBusConsumer,
    IPlatformMessageBusFreeFormatMessageConsumer<TMessage>
    where TMessage : class, IPlatformBusFreeFormatMessage, new()
{
}

public abstract class PlatformApplicationBusFreeFormatMessageConsumer<TMessage> :
    PlatformMessageBusFreeFormatMessageConsumer<TMessage>,
    IPlatformApplicationBusFreeFormatMessageConsumer<TMessage>
    where TMessage : class, IPlatformBusFreeFormatMessage, new()
{
    protected readonly IPlatformInboxBusMessageRepository InboxBusMessageRepo;
    protected readonly PlatformInboxConfig InboxConfig;
    protected readonly IUnitOfWorkManager UowManager;

    protected PlatformApplicationBusFreeFormatMessageConsumer(
        ILoggerFactory loggerFactory,
        IUnitOfWorkManager uowManager,
        IServiceProvider serviceProvider) : base(loggerFactory)
    {
        UowManager = uowManager;
        InboxBusMessageRepo = serviceProvider.GetService<IPlatformInboxBusMessageRepository>();
        InboxConfig = serviceProvider.GetRequiredService<PlatformInboxConfig>();
    }

    protected bool IsProcessingExistingInboxMessage { get; set; }

    /// <summary>
    /// Auto save inbox message if Inbox feature activated
    /// </summary>
    public virtual bool AutoSaveInboxMessage => true;

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
            Logger.LogError(
                e,
                $"Error Consume message [RoutingKey:{routingKey}], [Type:{message.GetType().GetGenericTypeName()}].{Environment.NewLine}" +
                $"Message Info: ${PlatformJsonSerializer.Serialize(message)}.{Environment.NewLine}");
            throw;
        }
    }

    public IPlatformInboxSupportMessageBusConsumer ForProcessingExistingInboxMessage()
    {
        IsProcessingExistingInboxMessage = true;

        return this;
    }

    protected virtual async Task ExecuteInternalHandleAsync(TMessage message, string routingKey)
    {
        if (InboxBusMessageRepo != null && AutoSaveInboxMessage)
            await PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerInternalHandleAsync(
                consumer: this,
                UowManager,
                InboxBusMessageRepo,
                InternalHandleAsync,
                message,
                routingKey,
                IsProcessingExistingInboxMessage,
                Logger,
                InboxConfig.RetryProcessFailedMessageInSecondsUnit);
        else
            await InternalHandleAsync(message, routingKey);
    }
}
