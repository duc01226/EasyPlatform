namespace Easy.Platform.Infrastructures.MessageBus;

public interface IPlatformMessageBusProducer
{
    /// <summary>
    /// Send a message to bus
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformBusMessage, new();

    /// <summary>
    /// Send a message to bus with a customRoutingKey
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<TMessage> SendAsync<TMessage>(
        TMessage message,
        string customRoutingKey,
        CancellationToken cancellationToken = default)
        where TMessage : class, IPlatformBusMessage, new();

    /// <summary>
    /// Send a message <see cref="IPlatformBusMessage{TPayload}"/> to bus
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
        string trackId,
        TMessagePayload payload,
        PlatformBusMessageIdentity identity,
        PlatformBusMessageRoutingKey routingKey,
        CancellationToken cancellationToken = default)
        where TMessagePayload : class, new();

    /// <summary>
    /// Send a free format message <see cref="TMessage"/> to bus with routingKey from = <see cref="PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper.Build"/> for <see cref="TMessage"/>
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
        TMessage message,
        CancellationToken cancellationToken = default)
        where TMessage : IPlatformBusFreeFormatMessage;

    /// <summary>
    /// Send a free format message <see cref="TMessage"/> to bus with <see cref="routingKey"/>
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        CancellationToken cancellationToken = default)
        where TMessage : IPlatformBusFreeFormatMessage;

    /// <summary>
    /// Send a message to bus with a routingKey
    /// </summary>
    /// <exception cref="PlatformMessageBusException{TMessage}">Could throw if there is an exception</exception>
    public Task<TMessage> SendTrackableMessageAsync<TMessage>(
        TMessage message,
        string routingKey,
        CancellationToken cancellationToken = default)
        where TMessage : IPlatformBusTrackableMessage;
}
