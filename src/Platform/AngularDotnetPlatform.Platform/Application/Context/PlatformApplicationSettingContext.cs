namespace AngularDotnetPlatform.Platform.Application.Context
{
    public interface IPlatformApplicationSettingContext
    {
        public string ApplicationName { get; }
    }

    public class PlatformApplicationSettingContext : IPlatformApplicationSettingContext
    {
        public string ApplicationName { get; init; }
    }
}
