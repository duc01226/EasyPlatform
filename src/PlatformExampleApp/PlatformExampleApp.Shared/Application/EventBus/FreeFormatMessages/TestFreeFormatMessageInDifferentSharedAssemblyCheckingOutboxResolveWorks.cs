using Easy.Platform.Infrastructures.MessageBus;

namespace PlatformExampleApp.Shared.Application.EventBus.FreeFormatMessages
{
    public class TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks : PlatformBusFreeFormatMessage
    {
        public string Prop1 { get; set; } = "Prop1";
    }

    public class TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks1 : PlatformBusFreeFormatMessage
    {
        public string Prop1 { get; set; } = "Prop1";
    }
}
