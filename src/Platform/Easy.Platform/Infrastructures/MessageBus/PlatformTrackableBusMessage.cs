namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Defines an interface for messages that can be tracked through the message bus system.
/// This interface extends <see cref="IPlatformSubMessageQueuePrefixSupport"/> to provide
/// additional tracking capabilities for messages, allowing them to be monitored and traced
/// throughout their lifecycle in the messaging infrastructure.
/// </summary>
public interface IPlatformTrackableBusMessage : IPlatformSubMessageQueuePrefixSupport
{
    /// <summary>
    /// Unique generated string, usually guid id to define a unique message id
    /// </summary>
    public string TrackingId { get; set; }

    /// <summary>
    /// Gets or sets the date and time when the message was created, in UTC format.
    /// This timestamp helps track when messages were generated and calculate processing times.
    /// </summary>
    public DateTime? CreatedUtcDate { get; set; }

    /// <summary>
    /// Gets or sets information about the source system that produced the message.
    /// This helps identify the origin of messages in a distributed system.
    /// </summary>
    public string ProduceFrom { get; set; }

    /// <summary>
    /// Gets or sets a dictionary of context information about the request that generated this message.
    /// This can include caller information, correlation IDs, and other context data useful for tracing.
    /// </summary>
    public IDictionary<string, object> RequestContext { get; set; }
}

/// <summary>
/// Base implementation of the IPlatformTrackableBusMessage interface.
/// This abstract class provides default implementations for tracking properties
/// while requiring derived classes to define their specific sub-queue behavior.
/// </summary>
public abstract class PlatformTrackableBusMessage : IPlatformTrackableBusMessage
{
    /// <summary>
    /// Gets or sets the unique tracking identifier for this message.
    /// Default implementation generates a new ULID (Universally Unique Lexicographically Sortable Identifier).
    /// </summary>
    public string TrackingId { get; set; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// Gets or sets the creation timestamp in UTC.
    /// Default implementation sets this to the current UTC time when the message is created.
    /// </summary>
    public DateTime? CreatedUtcDate { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the source system that produced the message.
    /// </summary>
    public string ProduceFrom { get; set; }

    /// <summary>
    /// Gets or sets the request context information.
    /// Default implementation initializes an empty dictionary.
    /// </summary>
    public IDictionary<string, object> RequestContext { get; set; } = new Dictionary<string, object>();

    /// <summary>
    /// Abstract method that must be implemented by derived classes to specify the sub-queue prefix.
    /// This determines how messages are grouped for sequential processing.
    /// </summary>
    /// <returns>A string representing the sub-queue prefix for this message.</returns>
    public abstract string SubQueuePrefix();
}
