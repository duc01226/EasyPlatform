namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Represents an exception that occurred during message bus operations.
/// This exception type encapsulates both the original exception and the message that was being processed
/// when the exception occurred, providing context for debugging and error handling.
/// </summary>
/// <typeparam name="TMessage">The type of message that was being processed when the exception occurred.</typeparam>
public class PlatformMessageBusException<TMessage> : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformMessageBusException{TMessage}"/> class.
    /// </summary>
    /// <param name="eventBusMessage">The message that was being processed when the exception occurred.</param>
    /// <param name="rootException">The original exception that was thrown during message processing.</param>
    public PlatformMessageBusException(TMessage eventBusMessage, Exception rootException)
        : base(rootException.Message, rootException)
    {
        EventBusMessage = eventBusMessage;
    }

    /// <summary>
    /// Gets the message that was being processed when the exception occurred.
    /// This provides context about what message caused the problem.
    /// </summary>
    public TMessage EventBusMessage { get; }
}
