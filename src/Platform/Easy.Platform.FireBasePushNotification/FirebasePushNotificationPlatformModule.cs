using System;
using Easy.Platform.Infrastructures;
using Easy.Platform.Infrastructures.PushNotification;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.FirebasePushNotification.GoogleFcm;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.FirebasePushNotification
{
    public abstract class FirebasePushNotificationPlatformModule : PlatformInfrastructureModule
    {
        public FirebasePushNotificationPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.Register<IPushNotificationPlatformService, FirebasePushNotificationService>(ServiceLifeTime.Transient);
            serviceCollection.Register(typeof(FirebasePushNotificationSettings), FirebasePushNotificationSettingsProvider);
            serviceCollection.Register<IFcmSender, FcmSender>(ServiceLifeTime.Transient);
            serviceCollection.AddHttpClient<FcmSender>();
        }

        protected abstract FirebasePushNotificationSettings FirebasePushNotificationSettingsProvider(IServiceProvider serviceProvider);
    }
}
