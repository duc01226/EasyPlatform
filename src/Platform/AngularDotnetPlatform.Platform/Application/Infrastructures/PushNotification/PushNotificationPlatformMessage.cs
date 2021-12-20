using AngularDotnetPlatform.Platform.Application.Dtos;
using AngularDotnetPlatform.Platform.Validators;

namespace AngularDotnetPlatform.Platform.Application.Infrastructures.PushNotification
{
    public class PushNotificationPlatformMessage : IPlatformDto
    {
        public string DeviceId { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }

        public PlatformValidationResult Validate()
        {
            return PlatformValidationResult.Valid()
                .And(() => !string.IsNullOrEmpty(DeviceId), "DeviceId is missing")
                .And(() => !string.IsNullOrEmpty(Title), "Title is missing")
                .And(() => !string.IsNullOrEmpty(Body), "Body is missing");
        }
    }
}
