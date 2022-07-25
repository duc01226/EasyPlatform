using Easy.Platform.Infrastructures.MessageBus;

namespace Easy.Platform.Application.MessageBus.InboxPattern;

public interface IPlatformInboxSupportMessageBusConsumer : IPlatformMessageBusBaseConsumer
{
    public IPlatformInboxSupportMessageBusConsumer ForProcessingExistingInboxMessage();
}
