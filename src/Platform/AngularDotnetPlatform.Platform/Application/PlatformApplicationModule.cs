using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Application
{
    public abstract class PlatformApplicationModule : PlatformModule
    {
        protected PlatformApplicationModule(IServiceProvider serviceProvider) : base(serviceProvider)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection, IConfiguration configuration)
        {
            base.InternalRegister(serviceCollection, configuration);
            serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(this, ServiceLifeTime.Scoped);
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
