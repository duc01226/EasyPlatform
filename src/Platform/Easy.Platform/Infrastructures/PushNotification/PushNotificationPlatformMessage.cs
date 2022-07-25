using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Validators;

namespace Easy.Platform.Infrastructures.PushNotification;

public class PushNotificationPlatformMessage : IPlatformDto
{
    public string DeviceId { get; set; }
    public string Title { get; set; }
    public string Body { get; set; }
    public int? Badge { get; set; }
    public Dictionary<string, string> Data { get; set; }

    public PlatformValidationResult Validate()
    {
        return PlatformValidationResult.Valid()
            .And(() => !string.IsNullOrEmpty(DeviceId), "DeviceId is missing")
            .And(() => !string.IsNullOrEmpty(Title), "Title is missing")
            .And(() => !string.IsNullOrEmpty(Body), "Body is missing");
    }
}
