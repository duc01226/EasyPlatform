using System.Diagnostics;

namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Defines an interface for producing messages to a message bus infrastructure.
/// This interface abstracts the underlying message bus implementation (like RabbitMQ, Azure Service Bus, etc.)
/// and provides a consistent API for sending messages to the bus.
/// </summary>
public interface IPlatformMessageBusProducer
{
    /// <summary>
    /// ActivitySource for tracing and diagnostics related to message bus producer operations.
    /// </summary>
    public static readonly ActivitySource ActivitySource = new(nameof(IPlatformMessageBusProducer));

    /// <summary>
    /// Sends a message to the message bus with the specified routing key.
    /// </summary>
    /// <typeparam name="TMessage">The type of message to send. Must be a class with a parameterless constructor.</typeparam>
    /// <param name="message">The message instance to send.</param>
    /// <param name="routingKey">The routing key that determines how the message will be routed in the message bus.</param>
    /// <param name="cancellationToken">A token to observe while waiting for the task to complete.</param>
    /// <returns>A task representing the asynchronous send operation, containing the sent message.</returns>
    /// <exception cref="PlatformMessageBusException{TMessage}">Thrown when there's an error sending the message to the bus.</exception>
    public Task<TMessage> SendAsync<TMessage>(TMessage message, string routingKey, CancellationToken cancellationToken = default)
        where TMessage : class, new();
}
