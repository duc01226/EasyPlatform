using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Infrastructures.Abstract;

namespace AngularDotnetPlatform.Platform.Application.Infrastructures.PushNotification
{
    public interface IPushNotificationPlatformService : IPlatformInfrastructureService
    {
        public Task SendAsync(PushNotificationPlatformMessage message, CancellationToken cancellationToken);
    }
}
