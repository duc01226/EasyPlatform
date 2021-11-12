using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.JsonSerialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using Polly.Retry;
using RabbitMQ.Client;

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

                await PublishMessageToQueueAsync(jsonMessage, message.RoutingKey(), customRoutingKey, cancellationToken);

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

        private Task PublishMessageToQueueAsync(string message, PlatformEventBusMessageRoutingKey routingKey, string customRoutingKey = null, CancellationToken cancellationToken = default)
        {
            RetryPublishPolicy.ExecuteAndThrowFinalException(
                () => PublishMessageToQueue(message, routingKey, customRoutingKey),
                ex => Logger.LogError(ex, $"[EventBusProducer] Unable to send message. Message Info: {message}"));

            return Task.CompletedTask;
        }

        private void PublishMessageToQueue(string message, PlatformEventBusMessageRoutingKey mainRoutingKey, string customRoutingKey = null)
        {
            var body = Encoding.UTF8.GetBytes(message);
            var channel = ChannelPool.Get();

            try
            {
                channel.BasicPublish(ExchangeProvider.GetName(mainRoutingKey), customRoutingKey ?? mainRoutingKey.CombinedStringKey, null, body);
            }
            finally
            {
                ChannelPool.Return(channel);
            }
        }
    }
}
