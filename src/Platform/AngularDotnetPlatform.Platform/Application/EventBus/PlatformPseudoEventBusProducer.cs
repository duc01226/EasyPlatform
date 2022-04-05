using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;

namespace AngularDotnetPlatform.Platform.Application.EventBus
{
    public class PlatformPseudoEventBusProducer : IPlatformEventBusProducer
    {
        public Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusMessage, new()
        {
            return Task.FromResult(message);
        }

        public Task<TMessage> SendAsync<TMessage>(TMessage message, string customRoutingKey, CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusMessage, new()
        {
            return Task.FromResult(message);
        }

        public Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload payload,
            PlatformEventBusMessageIdentity identity,
            PlatformEventBusMessageRoutingKey routingKey,
            CancellationToken cancellationToken = default) where TMessagePayload : class, new()
        {
            return Task.FromResult((IPlatformEventBusMessage<TMessagePayload>)null);
        }

        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default) where TMessage : class, new()
        {
            return Task.FromResult(message);
        }

        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken = default) where TMessage : class, new()
        {
            return Task.FromResult(message);
        }
    }
}
