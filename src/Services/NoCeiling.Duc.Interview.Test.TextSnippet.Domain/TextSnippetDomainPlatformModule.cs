using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.DependencyInjection;
using NoCeiling.Duc.Interview.Test.Platform.Domain;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Helpers;

namespace NoCeiling.Duc.Interview.Test.TextSnippet.Domain
{
    public class TextSnippetDomainPlatformModule : PlatformDomainModule
    {
        public TextSnippetDomainPlatformModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            serviceCollection.RegisterAllFromType<IDomainHelper>(this, ServiceLifeTime.Transient);
        }
    }
}
