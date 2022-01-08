using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Infrastructures.Abstract;

namespace AngularDotnetPlatform.Platform.Infrastructures.PushNotification
{
    public interface IPushNotificationPlatformService : IPlatformInfrastructureService
    {
        public Task SendAsync(PushNotificationPlatformMessage message, CancellationToken cancellationToken);
    }
}
