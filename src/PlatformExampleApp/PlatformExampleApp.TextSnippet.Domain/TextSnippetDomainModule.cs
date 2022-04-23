using System;
using Microsoft.Extensions.Configuration;
using Easy.Platform.Domain;

namespace PlatformExampleApp.TextSnippet.Domain
{
    public class TextSnippetDomainModule : PlatformDomainModule
    {
        public TextSnippetDomainModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }
    }
}
