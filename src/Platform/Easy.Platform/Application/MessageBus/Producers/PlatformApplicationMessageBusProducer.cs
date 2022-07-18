using Easy.Platform.Application.Context;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Producers
{
    public interface IPlatformApplicationBusMessageProducer
    {
        /// <summary>
        /// Send message to bus. Routing key for consumer will be "{TMessage.MessageGroup}.{ApplicationSettingContext.ApplicationName}.{TMessage.MessageType}.{<see cref="messageAction"/>}"
        /// </summary>
        /// <typeparam name="TMessage">Message type</typeparam>
        /// <typeparam name="TMessagePayload">Message payload type</typeparam>
        /// <param name="trackId">A random unique string to be used to track the message history, where is it from or for logging</param>
        /// <param name="messagePayload">Message payload</param>
        /// <param name="messageAction">Optional message action to be used as routing key for consumer filtering</param>
        /// <param name="autoSaveOutboxMessage">If true, auto save message as outbox message if outbox message is supported</param>
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <summary>
        /// Send message to bus with a custom routing key. Routing key for consumer will be <see cref="customRoutingKey"/>
        /// </summary>
        /// <typeparam name="TMessage">Message type</typeparam>
        /// <typeparam name="TMessagePayload">Message payload type</typeparam>
        /// <param name="customRoutingKey">A custom routing key which you want to be used for this message</param>
        /// <param name="trackId">A random unique string to be used to track the message history, where is it from or for logging</param>
        /// <param name="messagePayload">Message payload</param>
        /// <param name="messageAction">Optional message action to be used as routing key for consumer filtering</param>
        /// <param name="autoSaveOutboxMessage">If true, auto save message as outbox message if outbox message is supported</param>
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string customRoutingKey,
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <summary>
        /// Send message to bus. Routing key for consumer will be "{<see cref="messageGroup"/>}.{ApplicationSettingContext.ApplicationName}.{typeof(TMessagePayload).Name}.{<see cref="messageAction"/>}"
        /// </summary>
        /// <typeparam name="TMessagePayload">Message payload type</typeparam>
        /// <param name="trackId">A random unique string to be used to track the message history, where is it from or for logging</param>
        /// <param name="messagePayload">Message payload</param>
        /// <param name="messageGroup">Message group is used at the first level for routing key, used to group the message in a related group like CommandEvent,DomainEvent, etc...</param>
        /// <param name="messageAction">Optional message action to be used as routing key for consumer filtering</param>
        /// <param name="autoSaveOutboxMessage">If true, auto save message as outbox message if outbox message is supported</param>
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessage,TMessagePayload}(string,TMessagePayload,string,bool,CancellationToken)"/>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessage,TMessagePayload}(string,string,TMessagePayload,string,bool,CancellationToken)"/>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string customRoutingKey,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessagePayload}(string,TMessagePayload,string,string,bool,CancellationToken)"/>
        Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();

        Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusFreeFormatMessage, new();

        Task<TMessage> SendAsDefaultFreeFormatMessageAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();
    }

    public class PlatformApplicationBusMessageProducer : IPlatformApplicationBusMessageProducer
    {
        public PlatformApplicationBusMessageProducer(
            IServiceProvider serviceProvider,
            ILogger<PlatformApplicationBusMessageProducer> logger,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor,
            PlatformOutboxConfig outboxConfig)
        {
            ServiceProvider = serviceProvider;
            Logger = logger;
            MessageBusProducer = serviceProvider.GetService<IPlatformMessageBusProducer>() ??
                                 new PlatformPseudoMessageBusProducer();
            ApplicationSettingContext = applicationSettingContext;
            UserContextAccessor = userContextAccessor;
            OutboxConfig = outboxConfig;
        }

        protected IServiceProvider ServiceProvider { get; }
        protected ILogger<PlatformApplicationBusMessageProducer> Logger { get; }
        protected IPlatformMessageBusProducer MessageBusProducer { get; }
        protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }
        protected IPlatformApplicationUserContextAccessor UserContextAccessor { get; }
        protected PlatformOutboxConfig OutboxConfig { get; }

        public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            var message = PlatformBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(
                message,
                message.RoutingKey(),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string customRoutingKey,
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new() where TMessagePayload : class, new()
        {
            var message = PlatformBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(
                message,
                customRoutingKey ?? message.RoutingKey(),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public async Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default) where TMessagePayload : class, new()
        {
            var message = PlatformBusMessage<TMessagePayload>.New(
                trackId: trackId,
                payload: messagePayload,
                identity: BuildPlatformEventBusMessageIdentity(),
                routingKey: PlatformBusMessageRoutingKey.NewEnsureValid(
                    messageGroup,
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageType: typeof(TMessagePayload).Name,
                    messageAction));

            return await SendMessageAsync(
                message,
                message.RoutingKey(),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            return SendAsync<TMessage, TMessagePayload>(
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageAction,
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string customRoutingKey,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            return SendAsync<TMessage, TMessagePayload>(
                customRoutingKey: customRoutingKey,
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageAction,
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new()
        {
            return SendAsync(
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageGroup,
                messageAction,
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public async Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusFreeFormatMessage, new()
        {
            return await SendMessageAsync(
                message,
                routingKey: PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper.Build(message.GetType()),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public async Task<TMessage> SendAsDefaultFreeFormatMessageAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            var message = PlatformBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(
                message,
                routingKey: PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper
                    .BuildForGenericPlatformEventBusMessage(message.GetType()),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        protected PlatformBusMessageIdentity BuildPlatformEventBusMessageIdentity()
        {
            return new PlatformBusMessageIdentity()
            {
                UserId = UserContextAccessor.Current.GetUserId(),
                RequestId = UserContextAccessor.Current.GetRequestId(),
                UserName = UserContextAccessor.Current.GetUserName()
            };
        }

        protected bool HasOutboxEventBusMessageRepositoryRegistered()
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                return scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null;
            }
        }

        protected virtual async Task<TMessage> SendMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            bool autoSaveOutboxMessage,
            CancellationToken cancellationToken)
            where TMessage : IPlatformBusTrackableMessage
        {
            if (autoSaveOutboxMessage && HasOutboxEventBusMessageRepositoryRegistered())
            {
                var outboxEventBusProducerHelper = ServiceProvider.GetService<PlatformOutboxMessageBusProducerHelper>();

                await outboxEventBusProducerHelper!.HandleSendingOutboxMessageAsync(
                    message,
                    routingKey,
                    isProcessingExistingOutboxMessage: false,
                    OutboxConfig.RetryProcessFailedMessageInSecondsUnit,
                    cancellationToken);

                return message;
            }
            else
            {
                return await MessageBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

        public class PlatformPseudoMessageBusProducer : IPlatformMessageBusProducer
        {
            public Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
                where TMessage : class, IPlatformBusMessage, new()
            {
                return Task.FromResult(message);
            }

            public Task<TMessage> SendAsync<TMessage>(
                TMessage message,
                string customRoutingKey,
                CancellationToken cancellationToken = default) where TMessage : class, IPlatformBusMessage, new()
            {
                return Task.FromResult(message);
            }

            public Task<IPlatformBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
                string trackId,
                TMessagePayload payload,
                PlatformBusMessageIdentity identity,
                PlatformBusMessageRoutingKey routingKey,
                CancellationToken cancellationToken = default) where TMessagePayload : class, new()
            {
                return Task.FromResult((IPlatformBusMessage<TMessagePayload>)null);
            }

            public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
                TMessage message,
                CancellationToken cancellationToken = default) where TMessage : IPlatformBusFreeFormatMessage
            {
                return Task.FromResult(message);
            }

            public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
                TMessage message,
                string routingKey,
                CancellationToken cancellationToken = default) where TMessage : IPlatformBusFreeFormatMessage
            {
                return Task.FromResult(message);
            }

            public Task<TMessage> SendTrackableMessageAsync<TMessage>(
                TMessage message,
                string routingKey,
                CancellationToken cancellationToken = default) where TMessage : IPlatformBusTrackableMessage
            {
                return Task.FromResult(message);
            }
        }
    }
}
