using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;

public interface IPlatformCqrsEventBusMessageProducer
{
    public static Type GetTMessageArgumentType(Type cqrsEventBusMessageProducerType)
    {
        return cqrsEventBusMessageProducerType.GetGenericArguments()[1];
    }
}

/// <summary>
/// This interface is used for conventional register all PlatformCqrsEventBusProducer
/// </summary>
public interface IPlatformCqrsEventBusMessageProducer<in TEvent> : INotificationHandler<TEvent>, IPlatformCqrsEventBusMessageProducer
    where TEvent : PlatformCqrsEvent, new()
{
}

public abstract class PlatformCqrsEventBusMessageProducer<TEvent, TMessage>
    : PlatformCqrsEventApplicationHandler<TEvent>, IPlatformCqrsEventBusMessageProducer<TEvent>
    where TEvent : PlatformCqrsEvent, new()
    where TMessage : class, new()
{
    protected readonly IPlatformApplicationBusMessageProducer ApplicationBusMessageProducer;

    public PlatformCqrsEventBusMessageProducer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer) : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
        ApplicationBusMessageProducer = applicationBusMessageProducer;
    }

    public override bool EnableInboxEventBusMessage => false;

    protected override bool AutoOpenUow => false;

    // Outbox messages must be inserted in the same transaction as the entity change.
    // MustRunHandlerInSameCurrentActiveUow ensures same scope/DbContext/UoW as the parent.
    protected override bool MustRunHandlerInSameCurrentActiveUow => ApplicationBusMessageProducer.HasOutboxMessageSupport();

    protected abstract TMessage BuildMessage(TEvent @event);

    protected override bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return base.AllowHandleInBackgroundThread(@event) && !ApplicationBusMessageProducer.HasOutboxMessageSupport();
    }

    protected override async Task HandleAsync(
        TEvent @event,
        CancellationToken cancellationToken)
    {
        await SendMessage(@event, cancellationToken);
    }

    /// <summary>
    /// Logs a send failure using payload-free MESSAGE diagnostics (type name only) and detailed EXCEPTION
    /// diagnostics (type, message, stack trace, inner type chain).
    /// </summary>
    /// <param name="notification">The source event; used as the diagnostic subject when no bus message was built.</param>
    /// <param name="exception">
    /// The RAW exception — pass it unmodified. Its type, message, stack trace, and inner type chain are emitted;
    /// <see cref="Exception.Data" /> and inner exception messages are not. See the base handler's LogError.
    /// </param>
    /// <param name="loggerFactory">Factory for the categorized logger.</param>
    /// <param name="prefix">Optional category prefix, e.g. <c>"Retry"</c>.</param>
    /// <remarks>
    /// The subject is resolved before logging: a <see cref="PlatformMessageBusException{TMessage}" /> carries the bus
    /// message that actually failed to send, which is the more precise thing to name; only when the failure happened
    /// before a message existed does it fall back to the source event. Both are reduced to a type name, so this
    /// choice affects WHICH type is reported, never how much is disclosed.
    /// </remarks>
    public override void LogError(TEvent notification, Exception exception, ILoggerFactory loggerFactory, string prefix = "")
    {
        var failedMessage = (object)exception.As<PlatformMessageBusException<TMessage>>()?.EventBusMessage ?? notification;

        CreateLogger(loggerFactory)
            .LogError(
                "[PlatformCqrsEventBusMessageProducer] {Prefix} Failed to send {MessageName}. ExceptionDiagnostics:{ExceptionDiagnostics}. MessageDiagnostics:{MessageDiagnostics}.",
                prefix,
                typeof(TMessage).FullName,
                PlatformMessageBusDiagnosticFormatter.FormatException(exception),
                PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(failedMessage));
    }

    protected virtual async Task SendMessage(TEvent @event, CancellationToken cancellationToken)
    {
        await ApplicationBusMessageProducer.SendAsync(
            BuildMessage(@event),
            forceUseDefaultRoutingKey: !SendByMessageSelfRoutingKey(),
            sourceOutboxUowId: @event.As<IPlatformUowEvent>()?.SourceUowId,
            cancellationToken: cancellationToken);
    }

    /// <summary>
    /// Default is False. If True, send message using RoutingKey() from <see cref="IPlatformSelfRoutingKeyBusMessage" />
    /// </summary>
    /// <returns></returns>
    protected virtual bool SendByMessageSelfRoutingKey()
    {
        return false;
    }

    protected PlatformBusMessageIdentity BuildPlatformEventBusMessageIdentity(IDictionary<string, object> eventRequestContext)
    {
        return new PlatformBusMessageIdentity
        {
            UserId = eventRequestContext.UserId(),
            RequestId = eventRequestContext.RequestId(),
            UserName = eventRequestContext.UserName()
        };
    }
}
