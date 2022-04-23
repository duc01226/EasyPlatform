using System;

namespace Easy.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusFreeFormatMessage : IPlatformEventBusTrackableMessage
    {
    }

    public class PlatformEventBusFreeFormatMessage : IPlatformEventBusFreeFormatMessage
    {
        public string TrackingId { get; set; } = Guid.NewGuid().ToString();

        public DateTime CreatedUtcDate { get; set; } = DateTime.UtcNow;
    }
}
