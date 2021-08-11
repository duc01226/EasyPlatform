using System;
using Microsoft.Extensions.Configuration;
using AngularDotnetPlatform.Platform.Domain;

namespace PlatformExampleApp.TextSnippet.Domain
{
    public class TextSnippetDomainPlatformModule : PlatformDomainModule
    {
        public TextSnippetDomainPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }
}
