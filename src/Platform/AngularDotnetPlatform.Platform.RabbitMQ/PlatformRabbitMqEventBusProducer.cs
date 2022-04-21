using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using Polly.Retry;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public class PlatformRabbitMqEventBusProducer : IPlatformEventBusProducer
    {
        protected readonly DefaultObjectPool<IModel> ChannelPool;
        protected readonly IPlatformRabbitMqExchangeProvider ExchangeProvider;
        protected readonly RetryPolicy RetryPublishPolicy;
        protected readonly ILogger Logger;

        public PlatformRabbitMqEventBusProducer(
            PlatformRabbitMqChannelPoolPolicy channelPoolPolicy,
            IPlatformRabbitMqExchangeProvider exchangeProvider,
            PlatformRabbitMqOptions options,
            ILoggerFactory loggerFactory)
        {
            ChannelPool = new DefaultObjectPool<IModel>(channelPoolPolicy);
            ExchangeProvider = exchangeProvider;
            Logger = loggerFactory.CreateLogger(GetType());
            RetryPublishPolicy = Policy.Handle<Exception>().WaitAndRetry(
                retryCount: options.PublishMessageRetryCount,
                retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
        }

        public async Task<TMessage> SendAsync<TMessage>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : class, IPlatformEventBusMessage, new()
        {
            return await SendAsync(message, message.RoutingKey().CombinedStringKey, cancellationToken);
        }

        public async Task<TMessage> SendAsync<TMessage>(TMessage message, string customRoutingKey, CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusMessage, new()
        {
            try
            {
                var jsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value);

                await PublishMessageToQueueAsync(jsonMessage, customRoutingKey ?? message.RoutingKey(), cancellationToken);

                return message;
            }
            catch (Exception e)
            {
                throw new PlatformEventBusException<TMessage>(message, e);
            }
        }

        public async Task<IPlatformEventBusMessage<TMessagePayload>> SendAsync<TMessagePayload>(
            string trackId,
            TMessagePayload payload,
            PlatformEventBusMessageIdentity identity,
            PlatformEventBusMessageRoutingKey routingKey,
            CancellationToken cancellationToken = default) where TMessagePayload : class, new()
        {
            var message = await SendAsync(
                PlatformEventBusMessage<TMessagePayload>.New(
                    trackId: trackId,
                    payload: payload,
                    identity: identity,
                    routingKey: routingKey),
                cancellationToken);

            return message;
        }

        public Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
        {
            return SendFreeFormatMessageAsync(message, PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build<TMessage>(), cancellationToken);
        }

        public async Task<TMessage> SendFreeFormatMessageAsync<TMessage>(
            TMessage message,
            string routingKey,
            CancellationToken cancellationToken = default) where TMessage : class, IPlatformEventBusFreeFormatMessage, new()
        {
            try
            {
                var jsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value);

                await PublishMessageToQueueAsync(jsonMessage, routingKey, cancellationToken);

                return message;
            }
            catch (Exception e)
            {
                throw new PlatformEventBusException<TMessage>(message, e);
            }
        }

        private Task PublishMessageToQueueAsync(string message, string routingKey, CancellationToken cancellationToken = default)
        {
            RetryPublishPolicy.ExecuteAndThrowFinalException(
                () => PublishMessageToQueue(message, routingKey),
                ex => Logger.LogError(ex, $"[EventBusProducer] Unable to send message. Message Info: {message}"));

            return Task.CompletedTask;
        }

        private void PublishMessageToQueue(string message, string routingKey)
        {
            var body = Encoding.UTF8.GetBytes(message);
            var channel = ChannelPool.Get();

            try
            {
                channel.BasicPublish(ExchangeProvider.GetExchangeName(routingKey), routingKey, null, body);
                ChannelPool.Return(channel);
            }
            catch (AlreadyClosedException alreadyClosedException)
            {
                channel.Close();
                channel.Dispose();

                if (alreadyClosedException.ShutdownReason.ReplyCode == 404)
                {
                    Logger.LogWarning($"Tried to send a message with routing key {routingKey} from {GetType().FullName} " +
                                      $"but exchange is not found. May be there is no consumer registered to consume this message." +
                                      $"If in source code has consumers for this message, this could be unexpected errors");
                }
                else
                {
                    throw;
                }
            }
        }
    }
}
