using System.Reflection;
using AngularDotnetPlatform.Platform.Application.Context;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Application
{
    public class TextSnippetApplicationSettingContext : IPlatformApplicationSettingContext
    {
        public TextSnippetApplicationSettingContext(IConfiguration configuration)
        {
            AdditionalSettingExample = configuration["AllowCorsOrigins"];
            ApplicationAssembly = GetType().Assembly;
        }

        public string ApplicationName => TextSnippetApplicationConstants.ApplicationName;

        public Assembly ApplicationAssembly { get; init; }

        public string AdditionalSettingExample { get; }
    }
}
