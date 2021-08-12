using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.EventBus;
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
        protected readonly PlatformRabbitMqExchangeProvider ExchangeProvider;
        protected readonly RetryPolicy RetryPublishPolicy;
        protected readonly ILogger Logger;

        public PlatformRabbitMqEventBusProducer(
            PlatformRabbitMqChannelPoolPolicy channelPoolPolicy,
            PlatformRabbitMqExchangeProvider exchangeProvider,
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

        public Task SendAsync<TMessage, TMessagePayload>(TMessage message, CancellationToken cancellationToken = default)
            where TMessage : IPlatformEventBusMessage<TMessagePayload>
            where TMessagePayload : class, new()
        {
            var jsonMessage = JsonSerializer.Serialize(message, PlatformJsonSerializer.CurrentOptions.Value);

            return PublishMessageToQueueAsync(jsonMessage, message.RoutingKey(), cancellationToken);
        }

        private Task PublishMessageToQueueAsync(string message, PlatformEventBusMessageRoutingKey routingKey, CancellationToken cancellationToken)
        {
            var result = RetryPublishPolicy.ExecuteAndCapture(() => PublishMessageToQueue(message, routingKey));
            if (result.Outcome == OutcomeType.Failure)
            {
                Logger.LogError(result.FinalException, $"[EventBusProducer] Unable to send message. Message Info: {message}");
                throw result.FinalException;
            }

            return Task.CompletedTask;
        }

        private void PublishMessageToQueue(string message, PlatformEventBusMessageRoutingKey routingKey)
        {
            var body = Encoding.UTF8.GetBytes(message);
            var channel = ChannelPool.Get();

            try
            {
                channel.BasicPublish(ExchangeProvider.GetName(routingKey), routingKey.CombinedStringKey, null, body);
            }
            finally
            {
                ChannelPool.Return(channel);
            }
        }
    }
}
