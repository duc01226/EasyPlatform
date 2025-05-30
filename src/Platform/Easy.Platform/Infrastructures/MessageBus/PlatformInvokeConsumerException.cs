namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Represents an exception that occurs when invoking a message consumer.
/// This exception provides context about which consumer failed and what message was being processed,
/// helping with debugging and error handling in message consumption scenarios.
/// </summary>
public class PlatformInvokeConsumerException : Exception
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformInvokeConsumerException"/> class.
    /// </summary>
    /// <param name="e">The original exception that occurred during consumer invocation.</param>
    /// <param name="consumerName">The name of the consumer that was being invoked.</param>
    /// <param name="busMessage">The message that was being consumed when the exception occurred.</param>
    public PlatformInvokeConsumerException(Exception e, string consumerName, object busMessage)
        : base($"Invoke Consumer {consumerName} Failed.", e)
    {
        ConsumerName = consumerName;
        BusMessage = busMessage;
    }

    /// <summary>
    /// Gets the name of the consumer that failed during invocation.
    /// </summary>
    public string ConsumerName { get; }

    /// <summary>
    /// Gets or sets the message that was being processed when the exception occurred.
    /// </summary>
    public object BusMessage { get; set; }
}
