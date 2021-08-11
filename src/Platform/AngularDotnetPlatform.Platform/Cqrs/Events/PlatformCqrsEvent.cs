using System;
using AngularDotnetPlatform.Platform.Timing;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Events
{
    public abstract class PlatformCqrsEvent : INotification
    {
        public PlatformCqrsEvent() { }

        public string Id { get; set; }

        public DateTime CreatedDate { get; } = Clock.Now;

        public string CreatedBy { get; set; }

        public abstract string EventType { get; }

        public abstract string EventName { get; }

        public abstract string EventAction { get; }
    }
}
