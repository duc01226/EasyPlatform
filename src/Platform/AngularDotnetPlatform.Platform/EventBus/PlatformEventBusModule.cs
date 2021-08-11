using System;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public abstract class PlatformEventBusModule : PlatformModule
    {
        protected PlatformEventBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override bool AutoRegisterCaching => false;
        protected override bool AutoRegisterCqrs => false;

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformEventBusProducer>(ServiceLifeTime.Singleton, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformEventBusConsumer>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformEventBusMessage>(ServiceLifeTime.Transient, Assembly);
        }
    }
}
