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
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace AngularDotnetPlatform.Platform.Application
{
    public abstract class PlatformApplicationModule : PlatformModule
    {
        protected readonly ILogger<PlatformApplicationModule> Logger;

        protected PlatformApplicationModule(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<PlatformApplicationModule> logger) : base(serviceProvider, configuration)
        {
            this.Logger = logger;
        }

        public async Task SeedData(IServiceScope serviceScope)
        {
            //if the db server is not initiated, SeedData could fail.
            //So that we do retry to ensure that SeedData action run successfully.
            await Policy.Handle<Exception>()
                .WaitAndRetryAsync(
                    retryCount: 10,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (exception, timeSpan, retry, ctx) =>
                    {
                        Logger.LogWarning(exception,
                            "Exception {ExceptionType} with message [{Message}] detected on attempt SeedData {retry}",
                            exception.GetType().Name,
                            exception.Message,
                            retry);
                    })
                .ExecuteAndCaptureAsync(async () =>
                {
                    var dataSeeder = serviceScope.ServiceProvider.GetService<IPlatformApplicationDataSeeder>();
                    if (dataSeeder != null)
                        await dataSeeder.SeedData();
                });
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
            RegisterInboxEventBusMessageCleanerHostedService(serviceCollection);
        }

        protected override async Task InternalInit(IServiceScope serviceScope)
        {
            await base.InternalInit(serviceScope);

            if (AutoSeedDataOnInit())
                await SeedData(serviceScope);
        }

        /// <summary>
        /// Default return value is false.
        /// Set this to true if need to auto seed data on application module init.
        /// Only do this when define application module depend on persistence module
        /// to ensure db initiated in persistence module init before application module init
        /// </summary>
        protected virtual bool AutoSeedDataOnInit()
        {
            return false;
        }

        private void RegisterInboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
        {
            if (!serviceCollection.Any(PlatformInboxEventBusMessageCleanerHostedService.MatchImplementation))
            {
                serviceCollection.Register(
                    typeof(IHostedService),
                    typeof(PlatformDefaultInboxEventBusMessageCleanerHostedService),
                    ServiceLifeTime.Singleton);
            }
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
                    replaceIfExist: true,
                    ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
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
            serviceCollection.Register<IPlatformApplicationEventBusProducer, PlatformApplicationEventBusProducer>(ServiceLifeTime.Transient);
        }
    }
}
