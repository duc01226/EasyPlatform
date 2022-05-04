using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Producers.CqrsEventProducers
{
    public interface IPlatformCqrsCommandEventBusMessage : IPlatformEventBusMessage
    {
    }

    public class PlatformCqrsCommandEventBusMessage<TCommand> : PlatformEventBusMessage<TCommand>, IPlatformCqrsCommandEventBusMessage
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        public override string MessageGroup => PlatformCqrsCommandEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsCommandEvent.EventNameValue<TCommand>();
    }

    public abstract class PlatformCqrsCommandEventBusProducer<TCommand> : PlatformCqrsCommandEventApplicationHandler<TCommand>, IPlatformCqrsEventBusProducer<PlatformCqrsCommandEvent<TCommand>>
        where TCommand : class, IPlatformCqrsCommand, new()
    {
        protected readonly IPlatformApplicationEventBusProducer ApplicationEventBusProducer;
        protected readonly ILogger Logger;

        public PlatformCqrsCommandEventBusProducer(
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformApplicationEventBusProducer applicationEventBusProducer,
            ILoggerFactory loggerFactory) : base(unitOfWorkManager)
        {
            ApplicationEventBusProducer = applicationEventBusProducer;
            Logger = loggerFactory.CreateLogger(GetType());
        }

        protected override async Task HandleAsync(PlatformCqrsCommandEvent<TCommand> @event, CancellationToken cancellationToken)
        {
            if (RestrictOnlyForAction() == null || @event.Action == RestrictOnlyForAction())
            {
                try
                {
                    if (CustomMessageRoutingKey() != null)
                    {
                        await ApplicationEventBusProducer
                            .SendAsync<PlatformCqrsCommandEventBusMessage<TCommand>, TCommand>(
                                customRoutingKey: CustomMessageRoutingKey(),
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                    else if (SendAsFreeFormatMessage())
                    {
                        await ApplicationEventBusProducer
                            .SendAsFreeFormatMessageAsync<PlatformCqrsCommandEventBusMessage<TCommand>, TCommand>(
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                    else
                    {
                        await ApplicationEventBusProducer
                            .SendAsync<PlatformCqrsCommandEventBusMessage<TCommand>, TCommand>(
                                trackId: Guid.NewGuid().ToString(),
                                messagePayload: @event.CommandData,
                                messageAction: @event.EventAction,
                                cancellationToken: cancellationToken);
                    }
                }
                catch (PlatformEventBusException<PlatformCqrsCommandEventBusMessage<TCommand>> e)
                {
                    Logger.LogError(e, $"[PlatformCqrsEventBusCommandEventHandler] Failed to send message for ${typeof(TCommand).Name}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
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
        /// Default is False. If True, the producer will send message using <see cref="IPlatformApplicationEventBusProducer.SendAsFreeFormatMessageAsync{TMessage,TMessagePayload}"/>.
        /// The the consumer for this message do not need to define <see cref="PlatformEventBusConsumerAttribute"/>.
        /// Consumer without <see cref="PlatformEventBusConsumerAttribute"/> will automatically binding to Default FreeFormatMessageRoutingKey for the TMessage Type.
        /// </summary>
        protected virtual bool SendAsFreeFormatMessage()
        {
            return false;
        }
    }
}
