using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Application.Infrastructures.PushNotification;
using AngularDotnetPlatform.Platform.FirebasePushNotification.GoogleFcm;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Newtonsoft.Json.Linq;

namespace AngularDotnetPlatform.Platform.FirebasePushNotification
{
    internal class FirebasePushNotificationService : IPushNotificationPlatformService
    {
        private readonly IFcmSender fcmSender;

        public FirebasePushNotificationService(IFcmSender fcmSender)
        {
            this.fcmSender = fcmSender;
        }

        public async Task SendAsync(PushNotificationPlatformMessage message, CancellationToken cancellationToken)
        {
            message.Validate().EnsureValid(p => new PlatformApplicationValidationException(p));

            await fcmSender.SendAsync(
                deviceId: message.DeviceId,
                payload: new GoogleNotification()
                {
                    Notification = new GoogleNotification.DataPayload()
                    {
                        Title = message.Title,
                        Body = message.Body
                    }
                },
                cancellationToken);
        }
    }
}
