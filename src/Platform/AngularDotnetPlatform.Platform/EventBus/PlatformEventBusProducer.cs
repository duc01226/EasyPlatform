using System.Threading;
using System.Threading.Tasks;

namespace AngularDotnetPlatform.Platform.EventBus
{
    public interface IPlatformEventBusProducer
    {
        public Task SendAsync<TMessage, TMessagePayload>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : IPlatformEventBusMessage<TMessagePayload>
            where TMessagePayload : class, new();
    }
}
