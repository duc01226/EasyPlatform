using System;
using System.Collections.Generic;
using System.Reflection;
using AngularDotnetPlatform.Platform.Common.DependencyInjection;
using AngularDotnetPlatform.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.Infrastructures.EventBus
{
    public abstract class PlatformEventBusModule : PlatformInfrastructureModule
    {
        protected PlatformEventBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformEventBusProducer>(ServiceLifeTime.Singleton, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformEventBusConsumer>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformEventBusMessage>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.Register<IPlatformEventBusManager, PlatformEventBusManager>(ServiceLifeTime.Transient);
        }
    }
}
