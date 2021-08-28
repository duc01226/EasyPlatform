using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.EventBus;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    public interface IPlatformApplicationEventBusProducer
    {
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            CancellationToken cancellationToken = default)
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

        protected IPlatformEventBusProducer EventBusProducer { get; }
        protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }
        protected IPlatformApplicationUserContextAccessor UserContextAccessor { get; }

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

        public async Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            CancellationToken cancellationToken = default) where TMessagePayload : class, new()
        {
            return await EventBusProducer.SendAsync(
                trackId,
                messagePayload,
                identity: PlatformApplicationEventBusMessageIdentityMapper.ByUserContext(UserContextAccessor.Current),
                routingKey: PlatformEventBusMessageRoutingKey.NewEnsureValid(
                    messageGroup,
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageType: typeof(TMessagePayload).Name,
                    messageAction),
                cancellationToken);
        }
    }
}
