using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application;
using Easy.Platform.Application.Exceptions;
using Easy.Platform.Infrastructures.PushNotification;
using Easy.Platform.FirebasePushNotification.GoogleFcm;
using Easy.Platform.Common.JsonSerialization;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.FirebasePushNotification
{
    internal class FirebasePushNotificationService : IPushNotificationPlatformService
    {
        private readonly IFcmSender fcmSender;
        private readonly ILogger<FirebasePushNotificationService> logger;

        public FirebasePushNotificationService(IFcmSender fcmSender, ILogger<FirebasePushNotificationService> logger)
        {
            this.fcmSender = fcmSender;
            this.logger = logger;
        }

        public async Task SendAsync(PushNotificationPlatformMessage message, CancellationToken cancellationToken)
        {
            message.Validate().EnsureValid(p => new PlatformApplicationValidationException(p));

            var result = await fcmSender.SendAsync(
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

            if (!result.IsSuccess())
            {
                logger.LogError($"Firebase notification error with Device Token Id: {message.DeviceId} - {result.Results[0].Error}");
            }
        }
    }
}
