using System;
using Microsoft.Extensions.Configuration;
using AngularDotnetPlatform.Platform.Domain;

namespace PlatformExampleApp.TextSnippet.Domain
{
    public class TextSnippetDomainModule : PlatformDomainModule
    {
        public TextSnippetDomainModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }
}
