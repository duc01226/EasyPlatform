using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.FireBasePushNotification.GoogleFcm;
using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.PushNotification;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.FireBasePushNotification
{
    public abstract class FireBasePushNotificationPlatformModule : PlatformInfrastructureModule
    {
        public FireBasePushNotificationPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration) :
            base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.Register<IPushNotificationPlatformService, FireBasePushNotificationService>(
                ServiceLifeTime.Transient);
            serviceCollection.Register(
                typeof(FireBasePushNotificationSettings),
                FireBasePushNotificationSettingsProvider);
            serviceCollection.Register<IFcmSender, FcmSender>(ServiceLifeTime.Transient);
            serviceCollection.AddHttpClient<FcmSender>();
        }

        protected abstract FireBasePushNotificationSettings FireBasePushNotificationSettingsProvider(
            IServiceProvider serviceProvider);
    }
}
