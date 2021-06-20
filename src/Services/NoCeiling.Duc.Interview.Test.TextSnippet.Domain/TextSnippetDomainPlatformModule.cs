using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.Domain;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Domain
{
    public class TextSnippetDomainPlatformModule : PlatformDomainModule
    {
        public TextSnippetDomainPlatformModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
        }
    }
}
