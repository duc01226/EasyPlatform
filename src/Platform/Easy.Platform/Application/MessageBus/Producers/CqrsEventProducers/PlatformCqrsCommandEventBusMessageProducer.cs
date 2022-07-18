using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers
{
    public abstract class PlatformCqrsCommandEventBusMessageProducer<TCommand> :
        PlatformCqrsCommandEventApplicationHandler<TCommand>,
        IPlatformCqrsEventBusMessageProducer<PlatformCqrsCommandEvent<TCommand>>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected readonly IPlatformApplicationBusMessageProducer ApplicationBusMessageProducer;
        protected readonly ILogger Logger;

        public PlatformCqrsCommandEventBusMessageProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationBusMessageProducer applicationBusMessageProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            ApplicationBusMessageProducer = applicationBusMessageProducer;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        protected override async Task HandleAsync(
            PlatformCqrsCommandEvent<TCommand> @event,
            CancellationToken cancellationToken)
        {
            if (RestrictOnlyForAction() == null || @event.Action == RestrictOnlyForAction())
            {
                try
                {
                    if (CustomMessageRoutingKey() != null)
                    {
                        await ApplicationBusMessageProducer
                            .SendAsync<PlatformCqrsCommandEventBusMessage<TCommand>, TCommand>(
                                customRoutingKey: CustomMessageRoutingKey(),
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                    else if (SendAsFreeFormatMessage())
                    {
                        await ApplicationBusMessageProducer
                            .SendAsDefaultFreeFormatMessageAsync<PlatformCqrsCommandEventBusMessage<TCommand>,
                                TCommand>(
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                    else
                    {
                        await ApplicationBusMessageProducer
                            .SendAsync<PlatformCqrsCommandEventBusMessage<TCommand>, TCommand>(
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                }
                catch (PlatformMessageBusException<PlatformCqrsCommandEventBusMessage<TCommand>> e)
                {
                    Logger.LogError(
                        e,
                        $"[PlatformCqrsEventBusCommandEventHandler] Failed to send message for ${typeof(TCommand).Name}. Message Info: {PlatformJsonSerializer.Serialize(e.EventBusMessage)}");
                    throw;
                }
            }
        }

        protected virtual PlatformCqrsCommandEventAction? RestrictOnlyForAction()
        {
            return PlatformCqrsCommandEventAction.Executed;
        }

        protected virtual string CustomMessageRoutingKey()
        {
            return null;
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

    public interface IPlatformCqrsCommandEventBusMessage : IPlatformBusMessage
    {
    }

    public class PlatformCqrsCommandEventBusMessage<TCommand> : PlatformBusMessage<TCommand>,
        IPlatformCqrsCommandEventBusMessage
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        public override string MessageGroup => PlatformCqrsCommandEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsCommandEvent.EventNameValue<TCommand>();
    }
}
