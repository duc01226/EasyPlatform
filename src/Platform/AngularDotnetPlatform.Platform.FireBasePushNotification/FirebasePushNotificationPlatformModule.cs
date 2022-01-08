using System;
using AngularDotnetPlatform.Platform.Infrastructures;
using AngularDotnetPlatform.Platform.Common.DependencyInjection;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.FirebasePushNotification.GoogleFcm;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.FirebasePushNotification
{
    public abstract class FirebasePushNotificationPlatformModule : PlatformInfrastructureModule
    {
        public FirebasePushNotificationPlatformModule(IServiceProvider serviceProvider, IConfiguration configuration) : base(serviceProvider, configuration)
        {
        }

        protected override void InternalRegister(IServiceCollection serviceCollection)
        {
            base.InternalRegister(serviceCollection);

            serviceCollection.Register(typeof(FirebasePushNotificationSettings), FirebasePushNotificationSettingsProvider);
            serviceCollection.Register<IFcmSender, FcmSender>(ServiceLifeTime.Transient);
            serviceCollection.AddHttpClient<FcmSender>();
        }

        protected abstract FirebasePushNotificationSettings FirebasePushNotificationSettingsProvider(IServiceProvider serviceProvider);
    }
}
