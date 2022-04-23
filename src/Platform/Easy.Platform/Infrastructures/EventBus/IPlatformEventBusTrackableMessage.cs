using System;

namespace Easy.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusTrackableMessage
    {
        public string TrackingId { get; set; }

        public DateTime CreatedUtcDate { get; set; }
    }
}
