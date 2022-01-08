using System;
using System.Linq;
using AngularDotnetPlatform.Platform.Common.DependencyInjection;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Domain.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Domain
{
    public abstract class PlatformDomainModule : PlatformModule
    {
        protected PlatformDomainModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformDomainService>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
