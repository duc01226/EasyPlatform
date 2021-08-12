using System;
using System.Linq;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Context.UserContext.Default;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Consumers;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.EventBus;
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
                ApplicationName = Assembly.FullName,
                ApplicationAssembly = GetType().Assembly
            };
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformApplicationDataSeeder>(ServiceLifeTime.Scoped, Assembly);
            RegisterEventBus(serviceCollection);
            RegisterApplicationSettingContext(serviceCollection);
            RegisterDefaultApplicationUserContext(serviceCollection);
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

        private void RegisterDefaultApplicationUserContext(IServiceCollection serviceCollection)
        {
            if (!serviceCollection.Any(p => p.ServiceType == typeof(IPlatformApplicationUserContextAccessor)))
            {
                serviceCollection.Register(
                    typeof(IPlatformApplicationUserContextAccessor),
                    typeof(PlatformDefaultApplicationUserContextAccessor),
                    ServiceLifeTime.Singleton,
                    replaceIfExist: true);
            }
        }

        private void RegisterEventBus(IServiceCollection serviceCollection)
        {
            serviceCollection.RegisterAllFromType(typeof(IPlatformCqrsEventBusProducer<>), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(PlatformCqrsCommandEventBusProducer<,>), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(PlatformCqrsEntityEventBusProducer<,>), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(IPlatformEventBusConsumer), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(IPlatformUowEventBusConsumer<>), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(IPlatformCqrsCommandEventBusConsumer<,>), ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType(typeof(IPlatformCqrsEntityEventBusConsumer<,>), ServiceLifeTime.Transient, Assembly);
        }
    }
}
