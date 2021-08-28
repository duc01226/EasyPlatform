using System;
using AngularDotnetPlatform.Platform.DependencyInjection;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public abstract class PlatformRabbitMqEventBusModule : PlatformEventBusModule
    {
        protected PlatformRabbitMqEventBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterSelf(typeof(PlatformRabbitMqChannelPoolPolicy), ServiceLifeTime.Singleton);
            serviceCollection.Register<IPlatformRabbitMqExchangeProvider, PlatformRabbitMqExchangeProvider>(ServiceLifeTime.Transient);
            serviceCollection.Register(typeof(PlatformRabbitMqOptions), RabbitMqOptionsFactory, ServiceLifeTime.Transient);
            serviceCollection.Register<IPlatformEventBusProducer, PlatformRabbitMqEventBusProducer>(ServiceLifeTime.Singleton);
            serviceCollection.AddHostedService<PlatformRabbitMqHostedService>();
        }

        protected abstract PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider);
    }
}
