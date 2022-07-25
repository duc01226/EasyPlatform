using Easy.Platform.Infrastructures.MessageBus;

namespace PlatformExampleApp.TextSnippet.Application.MessageBus.FreeFormatMessages;

public class DemoSendFreeFormatEventBusMessage : PlatformBusFreeFormatMessage
{
    public string Property1 { get; set; }
    public int Property2 { get; set; }
}
