using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.Logging;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    public interface IPlatformCqrsCommandEventBusMessage : IPlatformEventBusMessage
    {
    }

    public class PlatformCqrsCommandEventBusMessage<TCommand, TCommandResult> : PlatformEventBusMessage<TCommand>, IPlatformCqrsCommandEventBusMessage
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
    {
        public override string MessageGroup => PlatformCqrsCommandEvent.EventTypeValue;
        public override string MessageType => PlatformCqrsCommandEvent.EventNameValue<TCommand>();
    }

    public abstract class PlatformCqrsCommandEventBusProducer<TCommand, TCommandResult> : PlatformCqrsCommandEventHandler<TCommand, TCommandResult>, IPlatformCqrsEventBusProducer<PlatformCqrsCommandEvent<TCommand, TCommandResult>>
        where TCommand : PlatformCqrsCommand<TCommandResult>, new()
        where TCommandResult : PlatformCqrsCommandResult, new()
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

        protected override async Task HandleAsync(PlatformCqrsCommandEvent<TCommand, TCommandResult> @event, CancellationToken cancellationToken)
        {
            if (RestrictOnlyForAction() == null || @event.Action == RestrictOnlyForAction())
            {
                try
                {
                    await ApplicationEventBusProducer
                        .SendAsync<PlatformCqrsCommandEventBusMessage<TCommand, TCommandResult>, TCommand>(
                            trackId: @event.Id,
                            messagePayload: @event.CommandData,
                            messageAction: @event.EventAction,
                            cancellationToken);
                }
                catch (PlatformEventBusException<PlatformCqrsCommandEventBusMessage<TCommand, TCommandResult>> e)
                {
                    Logger.LogError(e, $"[PlatformCqrsEventBusCommandEventHandler] Failed to send message for ${typeof(TCommand).Name}. Message Info: {JsonSerializer.Serialize(e.EventBusMessage)}");
                    throw;
                }
            }
        }

        protected virtual PlatformCqrsCommandEventAction? RestrictOnlyForAction()
        {
            return null;
        }
    }
}
