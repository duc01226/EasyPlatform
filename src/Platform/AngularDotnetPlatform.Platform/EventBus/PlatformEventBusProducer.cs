using System.Threading;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusProducer
    {
        /// <summary>
        /// Send a message to bus
        /// </summary>
        /// <exception cref="PlatformEventBusException{TMessage}">Could throw if there is an exception</exception>
        public Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage, new();

        /// <summary>
        /// Send a message to bus with a customRoutingKey
        /// </summary>
        /// <exception cref="PlatformEventBusException{TMessage}">Could throw if there is an exception</exception>
        public Task<TMessage> SendAsync<TMessage>(TMessage message, string customRoutingKey, CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage, new();

        /// <summary>
        /// Send a message <see cref="IPlatformEventBusMessage{TMessagePayload}"/> to bus
        /// </summary>
        /// <exception cref="PlatformEventBusException{TMessage}">Could throw if there is an exception</exception>
        public Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload payload,
            PlatformEventBusMessageIdentity identity,
            PlatformEventBusMessageRoutingKey routingKey,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();

        /// <summary>
        /// Send a free format message <see cref="TMessage"/> to bus with routingKey from = <see cref="PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build"/> for <see cref="TMessage"/>
        /// </summary>
        /// <exception cref="PlatformEventBusException{TMessage}">Could throw if there is an exception</exception>
        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : class, new();

        /// <summary>
        /// Send a free format message <see cref="TMessage"/> to bus with <see cref="routingKey"/>
        /// </summary>
        /// <exception cref="PlatformEventBusException{TMessage}">Could throw if there is an exception</exception>
        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(TMessage message, string routingKey, CancellationToken cancellationToken = default)
            where TMessage : class, new();
    }
}
