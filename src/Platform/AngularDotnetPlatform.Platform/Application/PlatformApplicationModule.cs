using System;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Application
{
    public abstract class PlatformApplicationModule : PlatformModule
    {
        protected PlatformApplicationModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        /// <summary>
        /// Override this factory method to register default PlatformApplicationSettingContext if application do not
        /// have any implementation of IPlatformApplicationSettingContext in the Assembly to be registered.
        /// </summary>
        protected virtual PlatformApplicationSettingContext DefaultApplicationSettingContextFactory(
            IServiceProvider serviceProvider)
        {
            return new PlatformApplicationSettingContext()
            {
                ApplicationName = Assembly.FullName
            };
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(ServiceLifeTime.Scoped, Assembly);
            RegisterApplicationSettingContext(serviceCollection);
        }

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);

            var dataSeeder = serviceScope.ServiceProvider.GetService<IPlatformApplicationDataSeeder>();
            if (dataSeeder != null)
                await dataSeeder.SeedData();
        }

        private void RegisterApplicationSettingContext(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType<IPlatformApplicationSettingContext>(
                ServiceLifeTime.Transient,
                Assembly,
                replaceIfExist: true);

            // If there is no implemented type of IPlatformApplicationSettingContext in application, register default PlatformApplicationSettingContext
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IPlatformApplicationSettingContext)))
            {
                serviceCollection.Register(
                    typeof(IPlatformApplicationSettingContext),
                    DefaultApplicationSettingContextFactory,
                    ServiceLifeTime.Transient,
                    replaceIfExist: true);
            }
        }
    }
}
