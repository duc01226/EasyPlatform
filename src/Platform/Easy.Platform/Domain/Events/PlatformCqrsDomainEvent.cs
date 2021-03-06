using Easy.Platform.Common.Cqrs.Events;

namespace Easy.Platform.Domain.Events;

public abstract class PlatformCqrsDomainEvent : PlatformCqrsEvent
{
    public const string EventTypeValue = "DomainEvent";

    public override string EventType => EventTypeValue;

    public override string EventName => GetType().Name;

    public override string EventAction => null;
}
