namespace Easy.Platform.Infrastructures.MessageBus
{
    public interface IPlatformBusFreeFormatMessage : IPlatformBusTrackableMessage
    {
    }

    public class PlatformBusFreeFormatMessage : IPlatformBusFreeFormatMessage
    {
        public string TrackingId { get; set; } = Guid.NewGuid().ToString();

        public DateTime CreatedUtcDate { get; set; } = DateTime.UtcNow;
    }
}
