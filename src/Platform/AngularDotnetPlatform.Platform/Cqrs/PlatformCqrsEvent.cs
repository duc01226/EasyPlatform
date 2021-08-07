using System;
using MediatR;
using AngularDotnetPlatform.Platform.Timing;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsEvent : INotification
    {
        public PlatformCqrsEvent() { }

        public Guid Id { get; } = Guid.NewGuid();

        public DateTime CreatedDate { get; } = Clock.Now;

        public string CreatedBy { get; set; }

        /// <summary>
        /// Using routing key to help config queues in event bus binding to events.
        /// Based on the routing key and queue binding configuration, the event will be distributed to the binding queues
        /// </summary>
        public abstract string GetRoutingKey();
    }
}
