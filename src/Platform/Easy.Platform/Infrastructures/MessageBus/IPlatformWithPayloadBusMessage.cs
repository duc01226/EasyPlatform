namespace Easy.Platform.Infrastructures.MessageBus;

/// <summary>
/// Defines a message interface that carries a strongly-typed payload.
/// This interface extends <see cref="IPlatformMessage"/> to provide a generic message
/// structure with a specific payload type.
/// </summary>
/// <typeparam name="TPayload">The type of payload the message carries. Must be a reference type with a parameterless constructor.</typeparam>
public interface IPlatformWithPayloadBusMessage<TPayload> : IPlatformMessage
    where TPayload : class, new()
{
    /// <summary>
    /// Gets or sets the payload data carried by this message.
    /// The payload contains the actual business data or event information being transmitted through the message bus.
    /// </summary>
    public TPayload Payload { get; set; }
}
