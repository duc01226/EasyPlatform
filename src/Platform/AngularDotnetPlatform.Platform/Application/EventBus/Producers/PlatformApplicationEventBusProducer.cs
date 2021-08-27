using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.EventBus;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    public interface IPlatformApplicationEventBusProducer
    {
        public IPlatformEventBusProducer EventBusProducer { get; }
        public IPlatformApplicationSettingContext ApplicationSettingContext { get; }
        public IPlatformApplicationUserContextAccessor UserContextAccessor { get; }

        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();
    }

    public class PlatformApplicationEventBusProducer : IPlatformApplicationEventBusProducer
    {
        public PlatformApplicationEventBusProducer(
            IPlatformEventBusProducer eventBusProducer,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor)
        {
            EventBusProducer = eventBusProducer;
            ApplicationSettingContext = applicationSettingContext;
            UserContextAccessor = userContextAccessor;
        }

        public IPlatformEventBusProducer EventBusProducer { get; }
        public IPlatformApplicationSettingContext ApplicationSettingContext { get; }
        public IPlatformApplicationUserContextAccessor UserContextAccessor { get; }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    PlatformApplicationEventBusMessageIdentityMapper.ByUserContext(UserContextAccessor.Current),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return EventBusProducer.SendAsync<TMessage, TMessagePayload>(message, cancellationToken);
        }
    }
}
