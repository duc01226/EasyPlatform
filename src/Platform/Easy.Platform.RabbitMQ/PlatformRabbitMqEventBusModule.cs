using System;
using Easy.Platform.Application.EventBus;
using Easy.Platform.Application.EventBus.InboxPattern;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Infrastructures.EventBus;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Easy.Platform.RabbitMQ
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
            RegisterRabbitMqInboxEventBusMessageCleanerHostedService(serviceCollection);
        }

        protected abstract PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider);

        private void RegisterRabbitMqInboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
        {
            serviceCollection.RemoveIfExist(PlatformInboxEventBusMessageCleanerHostedService.MatchImplementation);
            serviceCollection.Register(
                typeof(IHostedService),
                typeof(PlatformRabbitMqInboxEventBusMessageCleanerHostedService),
                ServiceLifeTime.Singleton);
        }
    }
}
