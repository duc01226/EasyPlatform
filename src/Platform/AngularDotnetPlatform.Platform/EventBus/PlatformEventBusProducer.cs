using System.Threading;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusProducer
    {
        public Task SendAsync<TMessage, TMessagePayload>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : IPlatformEventBusMessage<TMessagePayload>
            where TMessagePayload : class, new();

        public Task SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload payload,
            PlatformEventBusMessageIdentity identity,
            PlatformEventBusMessageRoutingKey routingKey,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();
    }
}
