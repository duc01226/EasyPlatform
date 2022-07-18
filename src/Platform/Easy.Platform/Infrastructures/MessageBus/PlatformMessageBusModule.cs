using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Infrastructures.MessageBus
{
    public abstract class PlatformMessageBusModule : PlatformInfrastructureModule
    {
        protected PlatformMessageBusModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(
            serviceProvider,
            configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformMessageBusProducer>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformMessageBusBaseConsumer>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.RegisterAllFromType<IPlatformBusMessage>(ServiceLifeTime.Transient, Assembly);
            serviceCollection.Register<IPlatformMessageBusManager, PlatformMessageBusManager>(
                ServiceLifeTime.Transient,
                replaceIfExist: true,
                ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
            serviceCollection.Register(
                typeof(PlatformMessageBusApplicationSetting),
                provider => new PlatformMessageBusApplicationSetting()
                {
                    ApplicationName = ForApplicationServiceName()
                },
                ServiceLifeTime.Transient);
        }

        /// <summary>
        /// The Application Service Unique Name. Usually it's the ApiService name.
        /// </summary>
        protected abstract string ForApplicationServiceName();
    }
}
