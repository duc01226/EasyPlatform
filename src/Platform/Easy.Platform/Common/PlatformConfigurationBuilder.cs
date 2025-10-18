using System.IO;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;

namespace Easy.Platform.Common;

public static class PlatformConfigurationBuilder
{
    /// <summary>
    /// Support get configuration inheritance from appsettings.X.Y.Z.
    /// Example: Development.Level1.Level2.json => Load from Development.json, Development.Level1.json and
    /// Development.Level1.Level2.json
    /// </summary>
    public static IConfigurationBuilder GetConfigurationBuilder(
        string appSettingsJsonFileName = "appsettings.json",
        string fallbackAspCoreEnv = PlatformEnvironment.DefaultAspCoreDevelopmentEnvironmentValue,
        bool consoleServicesAppMode = false)
    {
        return ConfigConfigurationBuilder(
            new ConfigurationBuilder(),
            appSettingsJsonFileName,
            fallbackAspCoreEnv,
            consoleServicesAppMode);
    }

    public static IConfigurationBuilder ConfigConfigurationBuilder(
        IConfigurationBuilder configurationBuilder,
        string appSettingsJsonFileName = "appsettings.json",
        string fallbackAspCoreEnv = PlatformEnvironment.DefaultAspCoreDevelopmentEnvironmentValue,
        bool consoleServicesAppMode = false)
    {
        // Mode use OS service
        var pathToExe = Environment.ProcessPath;
        var pathToContentRoot = pathToExe != null ? Path.GetDirectoryName(pathToExe) : null;

        return configurationBuilder
            .SetBasePath(
                consoleServicesAppMode && pathToContentRoot != null
                    ? pathToContentRoot!
                    : Directory.GetCurrentDirectory())
            .AddJsonFile(appSettingsJsonFileName, optional: false, reloadOnChange: false)
            .PipeAction(
                builder =>
                {
                    var aspCoreEnv = PlatformEnvironment.AspCoreEnvironmentValue ?? fallbackAspCoreEnv;

                    var aspCoreEnvInheritanceLevelNames = aspCoreEnv.Split(".");

                    for (var i = 0; i < aspCoreEnvInheritanceLevelNames.Length; i++)
                    {
                        var fullCurrentAppSettingLevelName = aspCoreEnvInheritanceLevelNames.Take(i + 1).JoinToString(".");

                        builder = builder.AddJsonFile(
                            $"appsettings.{fullCurrentAppSettingLevelName}.json",
                            optional: true,
                            reloadOnChange: false);
                    }
                })
            .AddEnvironmentVariables()
            .AddInMemoryCollection(
            [
                new KeyValuePair<string, string>(
                    PlatformEnvironment.AspCoreEnvironmentVariableName,
                    Environment.GetEnvironmentVariable(PlatformEnvironment.AspCoreEnvironmentVariableName))
            ]);
    }
}
