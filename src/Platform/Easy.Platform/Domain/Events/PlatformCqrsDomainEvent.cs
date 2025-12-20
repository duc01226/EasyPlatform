using Easy.Platform.Common.Cqrs.Events;

namespace Easy.Platform.Domain.Events;

/// <summary>
/// Represents a CQRS domain event within the platform. This is an abstract base class for domain-specific events.
/// </summary>
public abstract class PlatformCqrsDomainEvent : PlatformCqrsEvent, IPlatformUowEvent
{
    /// <summary>
    /// Defines the constant value for the event type. This is used to identify the event as a domain event.
    /// </summary>
    public const string EventTypeValue = nameof(PlatformCqrsDomainEvent);

    /// <summary>
    /// Gets the type of the event. Overrides the base implementation to return <see cref="EventTypeValue"/>.
    /// </summary>
    public override string EventType => EventTypeValue;

    /// <summary>
    /// Gets the name of the event, which is derived from the type name of the concrete event class.
    /// </summary>
    public override string EventName => GetType().Name;

    /// <summary>
    /// Gets the action of the event. This is not used for domain events and returns null.
    /// </summary>
    public override string EventAction => null;

    /// <summary>
    /// Gets or sets the ID of the source unit of work that generated this event.
    /// </summary>
    public string SourceUowId { get; set; }
}
