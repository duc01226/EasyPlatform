using System;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Easy.Platform.RabbitMQ;

public abstract class PlatformRabbitMqMessageBusModule : PlatformMessageBusModule
{
    protected PlatformRabbitMqMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);
        serviceCollection.RegisterSelf(typeof(PlatformRabbitMqChannelPoolPolicy));
        serviceCollection.RegisterSelf(typeof(PlatformRabbitChannelPool), ServiceLifeTime.Singleton);
        serviceCollection.Register<IPlatformRabbitMqExchangeProvider, PlatformRabbitMqExchangeProvider>(ServiceLifeTime.Transient);
        serviceCollection.Register(typeof(PlatformRabbitMqOptions), RabbitMqOptionsFactory);
        serviceCollection.Register<IPlatformMessageBusProducer, PlatformRabbitMqMessageBusProducer>(ServiceLifeTime.Singleton);
        serviceCollection.AddHostedService<PlatformRabbitMqHostedService>();

        RegisterRabbitMqInboxEventBusMessageCleanerHostedService(serviceCollection);
        RegisterRabbitMqConsumeInboxEventBusMessageHostedService(serviceCollection);

        RegisterRabbitMqOutboxEventBusMessageCleanerHostedService(serviceCollection);
        RegisterRabbitMqSendOutboxEventBusMessageHostedService(serviceCollection);
    }

    protected abstract PlatformRabbitMqOptions RabbitMqOptionsFactory(IServiceProvider serviceProvider);

    private void RegisterRabbitMqInboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
    {
        serviceCollection.RemoveIfExist(PlatformInboxBusMessageCleanerHostedService.MatchImplementation);
        serviceCollection.Register(
            typeof(IHostedService),
            typeof(PlatformRabbitMqInboxBusMessageCleanerHostedService),
            ServiceLifeTime.Singleton);
    }

    private void RegisterRabbitMqConsumeInboxEventBusMessageHostedService(IServiceCollection serviceCollection)
    {
        serviceCollection.RemoveIfExist(PlatformConsumeInboxBusMessageHostedService.MatchImplementation);
        serviceCollection.Register(
            typeof(IHostedService),
            typeof(PlatformRabbitMqConsumeInboxBusMessageHostedService),
            ServiceLifeTime.Singleton);
    }

    private void RegisterRabbitMqOutboxEventBusMessageCleanerHostedService(IServiceCollection serviceCollection)
    {
        serviceCollection.RemoveIfExist(PlatformOutboxBusMessageCleanerHostedService.MatchImplementation);
        serviceCollection.Register(
            typeof(IHostedService),
            typeof(PlatformRabbitMqOutboxBusMessageCleanerHostedService),
            ServiceLifeTime.Singleton);
    }

    private void RegisterRabbitMqSendOutboxEventBusMessageHostedService(IServiceCollection serviceCollection)
    {
        serviceCollection.RemoveIfExist(PlatformSendOutboxBusMessageHostedService.MatchImplementation);
        serviceCollection.Register(
            typeof(IHostedService),
            typeof(PlatformRabbitMqSendOutboxBusMessageHostedService),
            ServiceLifeTime.Singleton);
    }
}
