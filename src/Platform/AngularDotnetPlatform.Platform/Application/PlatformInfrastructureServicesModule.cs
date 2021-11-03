using System;
using AngularDotnetPlatform.Platform.Application.InfrastructureServices;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Application
{
    public abstract class PlatformInfrastructureServicesModule : PlatformModule
    {
        protected PlatformInfrastructureServicesModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType<IPlatformInfrastructureService>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
