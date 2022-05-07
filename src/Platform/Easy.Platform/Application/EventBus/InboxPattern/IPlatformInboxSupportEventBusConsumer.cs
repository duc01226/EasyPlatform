using Easy.Platform.Infrastructures.EventBus;

namespace Easy.Platform.Application.EventBus.InboxPattern
{
    public interface IPlatformInboxSupportEventBusConsumer : IPlatformEventBusBaseConsumer
    {
        public IPlatformInboxSupportEventBusConsumer ForProcessingExistingInboxMessage();
    }
}
