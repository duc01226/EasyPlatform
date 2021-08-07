using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Extensions;

namespace AngularDotnetPlatform.Platform.Application
{
    public abstract class PlatformApplicationModule : PlatformModule
    {
        protected PlatformApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(ServiceLifeTime.Scoped, Assembly);
            serviceCollection.AddTransient<IPlatformCqrs, PlatformCqrs>();
        }

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);

            var dataSeeder = serviceScope.ServiceProvider.GetService<IPlatformApplicationDataSeeder>();
            if (dataSeeder != null)
                await dataSeeder.SeedData();
        }
    }
}
