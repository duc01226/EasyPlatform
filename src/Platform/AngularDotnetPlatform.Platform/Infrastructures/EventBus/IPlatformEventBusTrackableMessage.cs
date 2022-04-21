namespace AngularDotnetPlatform.Platform.Infrastructures.EventBus
{
    public interface IPlatformEventBusTrackableMessage
    {
        public string TrackingId { get; set; }
    }
}
