using AngularDotnetPlatform.Platform.Common.Cqrs.Events;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsDomainEvent : PlatformCqrsEvent
    {
        public const string EventTypeValue = "DomainEvent";

        public override string EventType => EventTypeValue;

        public override string EventName => GetType().Name;

        public override string EventAction => null;
    }
}
