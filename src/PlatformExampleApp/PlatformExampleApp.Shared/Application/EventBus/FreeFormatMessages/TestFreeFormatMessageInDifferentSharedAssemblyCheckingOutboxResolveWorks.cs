using Easy.Platform.Infrastructures.EventBus;

namespace PlatformExampleApp.Shared.Application.EventBus.FreeFormatMessages
{
    public class TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks : PlatformEventBusFreeFormatMessage
    {
        public string Prop1 { get; set; } = "Prop1";
    }

    public class TestFreeFormatMessageInDifferentSharedAssemblyCheckingOutboxResolveWorks1 : PlatformEventBusFreeFormatMessage
    {
        public string Prop1 { get; set; } = "Prop1";
    }
}
