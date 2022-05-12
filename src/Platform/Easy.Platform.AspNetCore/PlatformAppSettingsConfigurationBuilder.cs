using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;

namespace Easy.Platform.AspNetCore
{
    public static class PlatformAppSettingsConfigurationBuilder
    {
        /// <summary>
        /// Support get configuration inheritance from appsettings.X.Y.Z.
        /// Example: Development.Level1.Level2.json => Load from Development.json, Development.Level1.json and Development.Level1.Level2.json
        /// </summary>
        public static IConfigurationBuilder GetConfigurationBuilder()
        {
            return new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
                .Pipe(builder =>
                {
                    var aspCoreEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

                    var aspCoreEnvInheritanceLevelNames = aspCoreEnv.Split(".");

                    for (var i = 0; i < aspCoreEnvInheritanceLevelNames.Length; i++)
                    {
                        var fullCurrentAppSettingLevelName = string.Join(".", aspCoreEnvInheritanceLevelNames.Take(i + 1));

                        builder = builder.AddJsonFile(
                            $"appsettings.{fullCurrentAppSettingLevelName}.json",
                            optional: true,
                            reloadOnChange: false);
                    }

                    return builder;
                })
                .AddEnvironmentVariables();
        }
    }
}
