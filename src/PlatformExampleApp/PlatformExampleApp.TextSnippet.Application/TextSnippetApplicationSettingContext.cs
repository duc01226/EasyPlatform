#region

using System.Reflection;
using Easy.Platform.Application;
using Microsoft.Extensions.Configuration;

#endregion

namespace PlatformExampleApp.TextSnippet.Application;

/// <summary>
/// This file is optional. You will want to implement it to override default implementation of IPlatformApplicationSettingContext if you want to.
/// This will replace config from DefaultApplicationSettingContextFactory in ApplicationModule
/// </summary>
public class TextSnippetApplicationSettingContext : IPlatformApplicationSettingContext
{
    public TextSnippetApplicationSettingContext(IConfiguration configuration)
    {
        AdditionalSettingExample = configuration["AllowCorsOrigins"];
        ApplicationAssembly = GetType().Assembly;
        IsDebugInformationMode = configuration
            .GetValue<bool?>(PlatformApplicationSettingContext.DefaultIsDebugInformationModeConfigurationKey) == true;
    }

    public string AdditionalSettingExample { get; }

    public string ApplicationName { get; set; } = TextSnippetApplicationConstants.ApplicationName;

    public Assembly ApplicationAssembly { get; set; }

    public bool AutoGarbageCollectPerProcessRequestOrBusMessage { get; set; } = true;

    public double AutoGarbageCollectPerProcessRequestOrBusMessageThrottleTimeSeconds { get; set; } = Util.GarbageCollector.DefaultCollectGarbageMemoryThrottleSeconds;

    public HashSet<string> IgnoreRequestContextKeys { get; set; }

    public bool IsDebugInformationMode { get; set; }

    public int ProcessEventEnsureNoCircularPipeLineMaxCircularCount { get; set; } =
        IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue;
}
