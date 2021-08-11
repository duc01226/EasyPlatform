using AngularDotnetPlatform.Platform.Application.Context;
using Microsoft.Extensions.Configuration;

namespace PlatformExampleApp.TextSnippet.Application
{
    public class TextSnippetApplicationSettingContext : IPlatformApplicationSettingContext
    {
        public TextSnippetApplicationSettingContext(IConfiguration configuration)
        {
            AdditionalSettingExample = configuration["AllowCorsOrigins"];
        }

        public string ApplicationName => TextSnippetApplicationConstants.ApplicationName;

        public string AdditionalSettingExample { get; }
    }
}
