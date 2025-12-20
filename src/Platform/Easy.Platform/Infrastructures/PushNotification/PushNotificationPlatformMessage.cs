using Easy.Platform.Common.Dtos;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;

namespace Easy.Platform.Infrastructures.PushNotification;

/// <summary>
/// Represents a push notification message that can be sent to mobile devices or web browsers.
/// This class contains all the necessary information required to deliver a push notification,
/// including the target device, message content, and additional metadata.
/// </summary>
public class PushNotificationPlatformMessage : IPlatformDto<PushNotificationPlatformMessage>
{
    /// <summary>
    /// Gets or sets the unique identifier of the target device that should receive the push notification.
    /// This is typically a device token or registration ID provided by the push notification service.
    /// </summary>
    public string DeviceId { get; set; }

    /// <summary>
    /// Gets or sets the title of the push notification.
    /// This appears as the main heading in the notification and should be concise and descriptive.
    /// </summary>
    public string Title { get; set; }

    /// <summary>
    /// Gets or sets the body text of the push notification.
    /// This contains the main message content that will be displayed to the user.
    /// </summary>
    public string Body { get; set; }

    /// <summary>
    /// Gets or sets the badge number to display on the application icon.
    /// This is typically used on iOS devices to show the number of unread notifications or messages.
    /// A null value indicates that the badge should not be modified.
    /// </summary>
    public int? Badge { get; set; }

    /// <summary>
    /// Gets or sets additional custom data to include with the push notification.
    /// This data can be used by the receiving application to perform specific actions or provide additional context.
    /// The data is sent as key-value pairs and is available to the application when the notification is received.
    /// </summary>
    public Dictionary<string, string> Data { get; set; }

    /// <summary>
    /// Validates the push notification message to ensure all required fields are present and valid.
    /// This method checks that the DeviceId, Title, and Body properties are not null or empty,
    /// as these are essential for delivering a functional push notification.
    /// </summary>
    /// <returns>A validation result indicating whether the message is valid and ready to be sent.</returns>
    public PlatformValidationResult<PushNotificationPlatformMessage> Validate()
    {
        return PlatformValidationResult
            .Valid(this)
            .And(p => DeviceId.IsNotNullOrEmpty(), "DeviceId is missing")
            .And(p => Title.IsNotNullOrEmpty(), "Title is missing")
            .And(p => Body.IsNotNullOrEmpty(), "Body is missing");
    }
}
