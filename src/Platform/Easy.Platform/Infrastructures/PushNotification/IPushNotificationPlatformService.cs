using Easy.Platform.Infrastructures.Abstract;

namespace Easy.Platform.Infrastructures.PushNotification;

/// <summary>
/// Represents a platform service for sending push notifications to mobile devices and web browsers.
/// This service provides an abstraction layer for different push notification providers and handles
/// the delivery of notifications to users across various platforms and devices.
/// </summary>
public interface IPushNotificationPlatformService : IPlatformInfrastructureService
{
    /// <summary>
    /// Asynchronously sends a push notification message to the specified recipients.
    /// This method handles the delivery of push notifications through the configured push notification provider,
    /// managing the communication with external push notification services (such as Firebase Cloud Messaging, Apple Push Notification Service, etc.).
    /// </summary>
    /// <param name="message">The push notification message containing the notification content, recipients, and delivery options.</param>
    /// <param name="cancellationToken">A token to cancel the asynchronous operation if needed.</param>
    /// <returns>A task that represents the asynchronous send operation.</returns>
    public Task SendAsync(PushNotificationPlatformMessage message, CancellationToken cancellationToken);
}
