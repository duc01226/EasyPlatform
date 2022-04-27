using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Application.Context;
using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Infrastructures.EventBus;

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
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
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
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string customRoutingKey,
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
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
        /// <param name="cancellationToken">CancellationToken</param>
        /// <returns>Return sent Message</returns>
        Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessage,TMessagePayload}(string,TMessagePayload,string,CancellationToken)"/>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessage,TMessagePayload}(string,string,TMessagePayload,string,CancellationToken)"/>
        Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string customRoutingKey,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new();

        /// <inheritdoc cref="SendAsync{TMessagePayload}(string,TMessagePayload,string,string,CancellationToken)"/>
        Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new();

        Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusFreeFormatMessage, new();

        Task<TMessage> SendAsFreeFormatMessageAsync<TMessage, TMessagePayload>(
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
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return EventBusProducer.SendAsync(message, cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            string customRoutingKey,
            string trackId,
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new() where TMessagePayload : class, new()
        {
            var message = PlatformEventBusMessage<TMessagePayload>
                .New<TMessage>(
                    trackId,
                    payload: messagePayload,
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return EventBusProducer.SendAsync(message, customRoutingKey, cancellationToken);
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
                identity: BuildPlatformEventBusMessageIdentity(),
                routingKey: PlatformEventBusMessageRoutingKey.NewEnsureValid(
                    messageGroup,
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageType: typeof(TMessagePayload).Name,
                    messageAction),
                cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            return SendAsync<TMessage, TMessagePayload>(
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageAction,
                cancellationToken);
        }

        public Task<TMessage> SendAsync<TMessage, TMessagePayload>(
            TMessagePayload messagePayload,
            string customRoutingKey,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage<TMessagePayload>, new()
            where TMessagePayload : class, new()
        {
            return SendAsync<TMessage, TMessagePayload>(
                customRoutingKey: customRoutingKey,
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageAction,
                cancellationToken);
        }

        public Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            TMessagePayload messagePayload,
            string messageGroup,
            string messageAction = null,
            CancellationToken cancellationToken = default)
            where TMessagePayload : class, new()
        {
            return SendAsync(
                trackId: Guid.NewGuid().ToString(),
                messagePayload,
                messageGroup,
                messageAction,
                cancellationToken);
        }

        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
        {
            return EventBusProducer.SendFreeFormatMessageAsync(message, PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(message.GetType()), cancellationToken);
        }

        public Task<TMessage> SendAsFreeFormatMessageAsync<TMessage, TMessagePayload>(
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
                    identity: BuildPlatformEventBusMessageIdentity(),
                    producerContext: ApplicationSettingContext.ApplicationName,
                    messageAction: messageAction);

            return EventBusProducer.SendFreeFormatMessageAsync(message, PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(messagePayload.GetType()), cancellationToken);
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
    }
}
