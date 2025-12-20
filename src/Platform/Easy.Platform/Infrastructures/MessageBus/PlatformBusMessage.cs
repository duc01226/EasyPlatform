using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Timing;

namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Base implementation for platform bus messages with a typed payload.
/// This class implements multiple message interfaces to provide comprehensive messaging capabilities
/// including tracking, self-routing, and payload management.
/// </summary>
/// <typeparam name="TPayload">The type of payload carried by this message.</typeparam>
public class PlatformBusMessage<TPayload> : IPlatformTrackableBusMessage, IPlatformSelfRoutingKeyBusMessage, IPlatformWithPayloadBusMessage<TPayload>
    where TPayload : class, new()
{
    private string messageAction;
    private string messageGroup;
    private string messageType;
    private string producerContext;

    /// <summary>
    /// Gets or sets the identity information for this message.
    /// </summary>
    public PlatformBusMessageIdentity Identity { get; set; }

    /// <summary>
    /// Gets or sets the message group, which is the first level in the routing hierarchy.
    /// Usually represents a category of message types (e.g., CommandEvent, EntityEvent).
    /// </summary>
    public virtual string MessageGroup
    {
        get => messageGroup ?? PlatformBusMessageRoutingKey.DefaultMessageGroup;
        set => messageGroup = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
    }

    /// <summary>
    /// Gets or sets the producer context, which is the second level in the routing hierarchy.
    /// Usually represents the microservice or component that produced the message.
    /// </summary>
    public string ProducerContext
    {
        get => producerContext ?? PlatformBusMessageRoutingKey.UnknownProducerContext;
        set => producerContext = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
    }

    /// <summary>
    /// Gets or sets the message type, which is the third level in the routing hierarchy.
    /// Usually represents the specific message class name or purpose.
    /// </summary>
    public virtual string MessageType
    {
        get => messageType ??= GetDefaultMessageType();
        set => messageType = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
    }

    /// <summary>
    /// Gets or sets the message action, which is the fourth level in the routing hierarchy.
    /// Usually represents a specific action or operation (e.g., Created, Updated, Deleted).
    /// </summary>
    public string MessageAction
    {
        get => messageAction;
        set => messageAction = PlatformBusMessageRoutingKey.AutoFixKeyPart(value);
    }

    /// <summary>
    /// Creates a routing key for this message based on its properties.
    /// This method implements the self-routing capability defined in <see cref="IPlatformSelfRoutingKeyBusMessage"/>.
    /// </summary>
    /// <returns>A routing key that determines how this message is routed in the message bus.</returns>
    public PlatformBusMessageRoutingKey RoutingKey()
    {
        return new PlatformBusMessageRoutingKey
        {
            MessageGroup = MessageGroup,
            ProducerContext = ProducerContext,
            MessageType = MessageType,
            MessageAction = MessageAction,
        };
    }

    /// <summary>
    /// Gets or sets the tracking ID for this message.
    /// This unique identifier is used to track the message throughout its lifecycle.
    /// </summary>
    public string TrackingId { get; set; } = Ulid.NewUlid().ToString();
    public DateTime? CreatedUtcDate { get; set; } = Clock.UtcNow;
    public string ProduceFrom { get; set; } = Assembly.GetEntryAssembly()?.FullName;
    public IDictionary<string, object> RequestContext { get; set; } = new Dictionary<string, object>();

    public virtual string SubQueuePrefix()
    {
        return Payload?.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix();
    }

    public TPayload Payload { get; set; }

    public static TBusMessage New<TBusMessage>(
        string trackId,
        TPayload payload,
        PlatformBusMessageIdentity identity,
        string producerContext,
        string messageGroup,
        string messageAction,
        IDictionary<string, object> requestContext
    )
        where TBusMessage : class, IPlatformWithPayloadBusMessage<TPayload>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
    {
        var message = Activator.CreateInstance<TBusMessage>();

        message.TrackingId = trackId;
        message.Payload = payload;
        message.Identity = identity ?? throw new ArgumentNullException(nameof(identity));
        message.ProducerContext = producerContext;
        message.ProduceFrom = producerContext;
        if (messageGroup != null)
            message.MessageGroup = messageGroup;
        if (messageAction != null)
            message.MessageAction = messageAction;
        message.MessageType ??= GetDefaultMessageType();
        message.RequestContext = requestContext ?? new Dictionary<string, object>();

        return message;
    }

    public static string GetDefaultMessageType()
    {
        return typeof(TPayload).GetNameOrGenericTypeName();
    }
}
