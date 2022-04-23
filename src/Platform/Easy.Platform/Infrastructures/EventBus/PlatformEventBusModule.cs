using System;
using System.Collections.Generic;
using System.Reflection;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.EventBus
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
            serviceCollection.RegisterAllFromType<IPlatformEventBusBaseConsumer>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformEventBusMessage>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.Register<IPlatformEventBusManager, PlatformEventBusManager>(ServiceLifeTime.Transient);
            serviceCollection.Register(
                typeof(PlatformEventBusApplicationSetting),
                provider => new PlatformEventBusApplicationSetting() { ApplicationName = ForApplicationServiceName() },
                ServiceLifeTime.Singleton);
        }

        /// <summary>
        /// The Application Service Unique Name. Usually it's the ApiService name.
        /// </summary>
        protected abstract string ForApplicationServiceName();
    }
}
