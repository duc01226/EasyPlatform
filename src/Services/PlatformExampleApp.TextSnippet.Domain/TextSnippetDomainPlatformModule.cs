using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain;
using AngularDotnetPlatform.Platform.Domain.Helpers;

namespace PlatformExampleApp.TextSnippet.Domain
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
