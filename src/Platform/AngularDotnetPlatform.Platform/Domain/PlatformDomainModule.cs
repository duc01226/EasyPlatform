using System;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Domain.Services;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Domain
{
    public abstract class PlatformDomainModule : PlatformModule
    {
        protected PlatformDomainModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override bool AutoRegisterCaching => false;

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformDomainService>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.Register(typeof(IPlatformDomainAssemblyProvider), p => new PlatformDomainAssemblyProvider(Assembly), ServiceLifeTime.Transient);
        }
    }
}
