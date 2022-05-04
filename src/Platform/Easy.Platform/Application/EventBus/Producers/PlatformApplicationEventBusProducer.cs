using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Application.EventBus.OutboxPattern;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.EventBus.Producers
{
    public interface IPlatformApplicationEventBusProducer
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
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
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
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
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
        Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
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
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessage,TMessagePayload}(string,string,TMessagePayload,string,bool,CancellationToken)"/>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string customRoutingKey,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessagePayload}(string,TMessagePayload,string,string,bool,CancellationToken)"/>
        Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
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
            where TMessage : class, IPlatformEventBusFreeFormatMessage, new();

        Task<TMessage> SendAsFreeFormatMessageAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();
    }

    public class PlatformApplicationEventBusProducer : IPlatformApplicationEventBusProducer
    {
        public PlatformApplicationEventBusProducer(
            IServiceProvider serviceProvider,
            ILogger<PlatformApplicationEventBusProducer> logger,
            IPlatformApplicationSettingContext applicationSettingContext,
            IPlatformApplicationUserContextAccessor userContextAccessor)
        {
            ServiceProvider = serviceProvider;
            Logger = logger;
            EventBusProducer = serviceProvider.GetService<IPlatformEventBusProducer>() ?? new PlatformPseudoEventBusProducer();
            ApplicationSettingContext = applicationSettingContext;
            UserContextAccessor = userContextAccessor;
        }

        protected IServiceProvider ServiceProvider { get; }
        protected ILogger<PlatformApplicationEventBusProducer> Logger { get; }
        protected IPlatformEventBusProducer EventBusProducer { get; }
        protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }
        protected IPlatformApplicationUserContextAccessor UserContextAccessor { get; }

        public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(message, message.RoutingKey(), autoSaveOutboxMessage, cancellationToken);
        }

        public async Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string customRoutingKey,
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new() where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(message, customRoutingKey ?? message.RoutingKey(), autoSaveOutboxMessage, cancellationToken);
        }

        public async Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default) where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>.New(
                trackId: trackId,
                payload: messagePayload,
                identity: BuildPlatformEventBusMessageIdentity(),
                routingKey: PlatformEventBusMessageRoutingKey.NewEnsureValid(
                    messageGroup,
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageType: typeof(TMessagePayload).Name,
                    messageAction));

            return await SendMessageAsync(message, message.RoutingKey(), autoSaveOutboxMessage, cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
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
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
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

        public Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
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
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
        {
            return await SendMessageAsync(
                message,
                routingKey: PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(message.GetType()),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        public async Task<TMessage> SendAsFreeFormatMessageAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            bool autoSaveOutboxMessage = true,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return await SendMessageAsync(
                message,
                routingKey: PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(messagePayload.GetType()),
                autoSaveOutboxMessage,
                cancellationToken);
        }

        protected PlatformEventBusMessageIdentity BuildPlatformEventBusMessageIdentity()
        {
            return new PlatformEventBusMessageIdentity()
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
                return scope.ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>() != null;
            }
        }

        protected virtual async Task<TMessage> SendMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            bool autoSaveOutboxMessage,
            CancellationToken cancellationToken)
            where TMessage : IPlatformEventBusTrackableMessage
        {
            if (autoSaveOutboxMessage && HasOutboxEventBusMessageRepositoryRegistered())
            {
                await PlatformOutboxEventBusProducerHelper.HandleSendingOutboxMessageAsync(
                    ServiceProvider,
                    ServiceProvider.GetService<IUnitOfWorkManager>(),
                    ServiceProvider.GetService<IPlatformOutboxEventBusMessageRepository>(),
                    EventBusProducer,
                    message,
                    routingKey,
                    isProcessingExistingOutboxMessage: false,
                    Logger,
                    cancellationToken);

                return message;
            }
            else
            {
                return await EventBusProducer.SendTrackableMessageAsync(message, routingKey, cancellationToken);
            }
        }

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

            public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default) where TMessage : IPlatformEventBusFreeFormatMessage
            {
                return Task.FromResult(message);
            }

            public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
                TMessage message,
                string routingKey,
                CancellationToken cancellationToken = default) where TMessage : IPlatformEventBusFreeFormatMessage
            {
                return Task.FromResult(message);
            }

            public Task<TMessage> SendTrackableMessageAsync<TMessage>(
                TMessage message,
                string routingKey,
                CancellationToken cancellationToken = default) where TMessage : IPlatformEventBusTrackableMessage
            {
                return Task.FromResult(message);
            }
        }
    }
}
