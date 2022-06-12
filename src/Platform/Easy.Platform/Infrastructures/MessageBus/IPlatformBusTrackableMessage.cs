using System;

namespace Easy.Platform.Infrastructures.MessageBus
{
    public interface IPlatformBusTrackableMessage
    {
        public string TrackingId { get; set; }

        public DateTime CreatedUtcDate { get; set; }
    }
}
