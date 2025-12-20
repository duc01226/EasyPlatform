namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Represents identity and context information for a platform bus message.
/// This class stores information about the origin of a message, including user and request details,
/// which helps with message traceability, auditing, and security.
/// </summary>
public class PlatformBusMessageIdentity
{
    /// <summary>
    /// Indicate which user id generate the message
    /// </summary>
    public string UserId { get; set; }

    /// <summary>
    /// Indicate which request id generate the message
    /// </summary>
    public string RequestId { get; set; }

    /// <summary>
    /// Indicate which user name generate the message
    /// </summary>
    public string UserName { get; set; }
}
