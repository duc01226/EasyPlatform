namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Represents a platform message that can determine its own routing key for message bus operations.
/// This interface extends IPlatformMessage to provide self-routing capabilities, allowing messages
/// to define how they should be routed through the message bus infrastructure based on their own properties.
/// </summary>
public interface IPlatformSelfRoutingKeyBusMessage : IPlatformMessage
{
    /// <summary>
    /// Gets or sets the unique identity information for this message.
    /// This identity helps track and identify the message throughout its lifecycle in the message bus system.
    /// </summary>
    public PlatformBusMessageIdentity Identity { get; set; }

    /// <summary>
    /// Gets or sets the logical group that this message belongs to.
    /// Message groups are used to categorize related messages and can influence routing decisions.
    /// </summary>
    public string MessageGroup { get; set; }

    /// <summary>
    /// Gets or sets the context information about the producer that created this message.
    /// This provides information about the source service or component that generated the message.
    /// </summary>
    public string ProducerContext { get; set; }

    /// <summary>
    /// Gets or sets the type classification of this message.
    /// Message types help categorize the kind of operation or event this message represents.
    /// </summary>
    public string MessageType { get; set; }

    /// <summary>
    /// Gets or sets the specific action associated with this message.
    /// This provides more granular information about what operation or event the message represents.
    /// </summary>
    public string MessageAction { get; set; }

    /// <summary>
    /// Determines and returns the routing key for this message based on its properties.
    /// This method implements the self-routing logic by analyzing the message's properties
    /// and generating the appropriate routing key for message bus delivery.
    /// </summary>
    /// <returns>A PlatformBusMessageRoutingKey that specifies how this message should be routed.</returns>
    public PlatformBusMessageRoutingKey RoutingKey();
}
