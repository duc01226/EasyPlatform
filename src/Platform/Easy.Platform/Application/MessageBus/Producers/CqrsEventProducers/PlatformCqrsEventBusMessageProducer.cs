using System.Collections.Concurrent;
using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Easy.Platform.Application.MessageBus.Store;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
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
    protected override bool MustRunHandlerInSameCurrentActiveUow => HasOutboxMessageSupport();

    /// <summary>
    /// Gets the logical message-bus store selected by this producer. The default retains the legacy path;
    /// module-specific producers can override it without changing command or event callers.
    /// </summary>
    protected virtual PlatformMessageBusStoreKey MessageBusStoreKey => PlatformMessageBusStoreKey.Default;

    /// <summary>
    /// Gets the optional application-lane identity selected by this producer. A null value requires the selected
    /// descriptor to contain one lane, which preserves single-store compatibility and rejects ambiguity in strict hosts.
    /// </summary>
    protected virtual string MessageBusApplicationName => null;

    protected abstract TMessage BuildMessage(TEvent @event);

    protected override bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return base.AllowHandleInBackgroundThread(@event) && !HasOutboxMessageSupport();
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
        var message = BuildMessage(@event);
        var forceUseDefaultRoutingKey = !SendByMessageSelfRoutingKey();
        var sourceOutboxUowId = @event.As<IPlatformUowEvent>()?.SourceUowId;

        if (KeyedProducer != null)
        {
            await KeyedProducer.SendAsync(
                MessageBusStoreKey,
                message,
                applicationName: MessageBusApplicationName,
                forceUseDefaultRoutingKey: forceUseDefaultRoutingKey,
                sourceOutboxUowId: sourceOutboxUowId,
                cancellationToken: cancellationToken);
        }
        else
        {
            WarnOnceIfDeclaredStoreRouteIgnored();

            await ApplicationBusMessageProducer.SendAsync(
                message,
                forceUseDefaultRoutingKey: forceUseDefaultRoutingKey,
                sourceOutboxUowId: sourceOutboxUowId,
                cancellationToken: cancellationToken);
        }
    }

    /// <summary>
    /// The keyed capability of the injected producer, or null for legacy-only producers (decorators, service test doubles).
    /// </summary>
    private IPlatformKeyedApplicationBusMessageProducer KeyedProducer =>
        ApplicationBusMessageProducer as IPlatformKeyedApplicationBusMessageProducer;

    /// <summary>
    /// A legacy-only producer cannot honour a declared non-Default store key or lane, so the message silently uses the
    /// unqualified path. Warn once per producer type (not per send) so a misrouted module is visible without log floods.
    /// Never throw: service test doubles and decorators legitimately implement only the legacy interface.
    /// </summary>
    private void WarnOnceIfDeclaredStoreRouteIgnored()
    {
        if (MessageBusStoreKey.IsDefault && MessageBusApplicationName.IsNullOrEmpty())
            return;

        if (!PlatformCqrsEventBusMessageProducerIgnoredRouteWarnings.TryMarkWarned(GetType()))
            return;

        // Without runtime store composition the declared key is meaningless for every producer (legacy path by design),
        // so the ignored route is not a misconfiguration worth reporting.
        if (RootServiceProvider.GetService<IPlatformMessageBusStoreRegistry>()?.HasRuntimeStoreComposition != true)
            return;

        CreateLogger(LoggerFactory)
            .LogWarning(
                "[PlatformCqrsEventBusMessageProducer] {ProducerType} declares message-bus store '{StoreKey}' / application lane '{ApplicationName}', but the injected {ApplicationBusMessageProducerType} does not implement {KeyedProducerType}. The declared route is ignored and the message is sent through the unqualified producer path.",
                GetType().FullName,
                MessageBusStoreKey,
                MessageBusApplicationName,
                ApplicationBusMessageProducer.GetType().FullName,
                nameof(IPlatformKeyedApplicationBusMessageProducer));
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

    private bool HasOutboxMessageSupport()
    {
        return KeyedProducer?.HasOutboxMessageSupport(MessageBusStoreKey, MessageBusApplicationName)
               ?? ApplicationBusMessageProducer.HasOutboxMessageSupport();
    }
}

/// <summary>
/// Process-wide record of producer types already warned about an ignored store route, kept outside the generic producer
/// so the warning fires once per producer type rather than once per closed generic instantiation.
/// </summary>
internal static class PlatformCqrsEventBusMessageProducerIgnoredRouteWarnings
{
    private static readonly ConcurrentDictionary<Type, byte> WarnedProducerTypes = [];

    public static bool TryMarkWarned(Type producerType)
    {
        return WarnedProducerTypes.TryAdd(producerType, 0);
    }
}
