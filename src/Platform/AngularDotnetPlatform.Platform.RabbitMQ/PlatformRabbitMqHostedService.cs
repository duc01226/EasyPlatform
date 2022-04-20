using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Common.Hosting;
using AngularDotnetPlatform.Platform.Common.JsonSerialization;
using AngularDotnetPlatform.Platform.Common.Timing;
using AngularDotnetPlatform.Platform.Common.Utils;
using AngularDotnetPlatform.Platform.Infrastructures.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public partial class PlatformRabbitMqHostedService : PlatformHostedService
    {
        private readonly PlatformRabbitMqOptions options;
        private readonly IServiceProvider serviceProvider;
        private readonly IPlatformEventBusManager eventBusManager;
        private readonly IPlatformRabbitMqExchangeProvider exchangeProvider;
        private readonly PlatformEventBusApplicationSetting applicationSetting;

        // Use ObjectBool to manage chanel because HostService is singleton, and we don't want re-init chanel is heavy and wasting time.
        // We want to use pool when object is expensive to allocate/initialize
        // References: https://docs.microsoft.com/en-us/aspnet/core/performance/objectpool?view=aspnetcore-5.0
        private readonly DefaultObjectPool<IModel> channelPool;

        private readonly object retryConnectConsumerLock = new object();
        private IModel currentChannel;

        public PlatformRabbitMqHostedService(
            IHostApplicationLifetime applicationLifetime,
            PlatformRabbitMqOptions options,
            PlatformRabbitMqChannelPoolPolicy channelPolicy,
            IServiceProvider serviceProvider,
            IPlatformEventBusManager eventBusManager,
            ILoggerFactory loggerFactory,
            IPlatformRabbitMqExchangeProvider exchangeProvider,
            PlatformEventBusApplicationSetting applicationSetting) : base(applicationLifetime, loggerFactory)
        {
            this.options = options;
            this.serviceProvider = serviceProvider;
            this.eventBusManager = eventBusManager;
            this.exchangeProvider = exchangeProvider;
            this.applicationSetting = applicationSetting;

            // Needs 1 object only for the hosted service.
            channelPool = new DefaultObjectPool<IModel>(channelPolicy, 1);
        }

        protected override Task StartProcess(CancellationToken cancellationToken)
        {
            DeclareRabbitMqConfiguration();

            RunConsumer();

            return Task.CompletedTask;
        }

        protected override Task StopProcess(CancellationToken cancellationToken)
        {
            currentChannel?.Close();

            return Task.CompletedTask;
        }

        private void DeclareRabbitMqConfiguration()
        {
            var channel = channelPool.Get();

            DeclareRabbitMqExchangesConfiguration(channel);

            DeclareRabbitMqQueuesConfiguration(channel);

            channelPool.Return(channel);
        }

        private void DeclareRabbitMqQueuesConfiguration(IModel channel)
        {
            // Declare queue for all consumers
            eventBusManager.AllDefinedEventBusConsumerAttributes()
                .ForEach(consumerAttribute => DeclareQueueForConsumer(channel, consumerAttribute));
            eventBusManager.AllDefaultRoutingKeyForDefinedFreeFormatMessageConsumers()
                .ForEach(consumerAttribute => DeclareQueueForConsumer(channel, consumerAttribute));
        }

        private void DeclareQueueForConsumer(IModel channel, PlatformEventBusConsumerAttribute consumerAttribute)
        {
            var exchange = GetConsumerExchange(consumerAttribute);
            var queueName = GetConsumerQueueName(consumerAttribute);

            // Set exclusive to false to support multiple consumers with the same type.
            // For example: in load balancing environment, we may have 2 instances of an API.
            // RabbitMQ will automatically apply load balancing behavior to send message to 1 instance only.
            channel.QueueDeclare(queueName, durable: true, exclusive: false, autoDelete: false);
            Log.Information(Logger, message: $"Queue {queueName} has been declared");

            DeclareQueueBindForConsumer(channel, consumerAttribute.GetConsumerBindingRoutingKey(), queueName, exchange);

            if (!string.IsNullOrEmpty(consumerAttribute.CustomRoutingKey))
            {
                DeclareQueueBindForConsumer(channel, consumerAttribute.CustomRoutingKey, queueName, exchange);
            }
        }

        private void DeclareQueueForConsumer(IModel channel, PlatformEventBusMessageRoutingKey consumerBindingRoutingKey)
        {
            var exchange = GetConsumerExchange(consumerBindingRoutingKey);
            var queueName = GetConsumerQueueName(consumerBindingRoutingKey);

            // Set exclusive to false to support multiple consumers with the same type.
            // For example: in load balancing environment, we may have 2 instances of an API.
            // RabbitMQ will automatically apply load balancing behavior to send message to 1 instance only.
            channel.QueueDeclare(queueName, durable: true, exclusive: false, autoDelete: false);
            Log.Information(Logger, message: $"Queue {queueName} has been declared");

            DeclareQueueBindForConsumer(channel, consumerBindingRoutingKey, queueName, exchange);
        }

        private void DeclareQueueBindForConsumer(
            IModel channel,
            string consumerBindingRoutingKey,
            string queueName,
            string exchange)
        {
            channel.QueueBind(queueName, exchange, consumerBindingRoutingKey);
            Log.Information(Logger,
                message:
                $"Queue {queueName} has been declared and bound to Exchange {exchange} with routing key {consumerBindingRoutingKey}");

            channel.QueueBind(queueName, exchange, $"{consumerBindingRoutingKey}.{PlatformRabbitMqConstants.FanoutBindingChar}");
            Log.Information(Logger,
                message:
                $"Queue {queueName} has been declared and bound to Exchange {exchange} with routing key {consumerBindingRoutingKey}.{PlatformRabbitMqConstants.FanoutBindingChar}");
        }

        private string GetConsumerQueueName(PlatformEventBusConsumerAttribute consumerAttribute)
        {
            return GetConsumerQueueName(consumerAttribute.GetConsumerBindingRoutingKey());
        }

        private string GetConsumerQueueName(string consumerRoutingKey)
        {
            return $"Platform-{applicationSetting.ApplicationName}-{consumerRoutingKey}";
        }

        private string GetConsumerExchange(PlatformEventBusConsumerAttribute consumerAttribute)
        {
            return GetConsumerExchange(consumerRoutingKey: consumerAttribute.GetConsumerBindingRoutingKey());
        }

        private string GetConsumerExchange(PlatformEventBusMessageRoutingKey consumerRoutingKey)
        {
            return exchangeProvider.GetExchangeName(routingKey: consumerRoutingKey);
        }

        private void DeclareRabbitMqExchangesConfiguration(IModel channel)
        {
            // Get exchange routing key for all consumers
            var allDefinedEventBusConsumerPatternRoutingKeys = eventBusManager
                .AllDefinedEventBusConsumerBindingRoutingKeys();

            // Declare all exchanges
            DeclareExchangesForRoutingKeys(
                channel,
                routingKeys: allDefinedEventBusConsumerPatternRoutingKeys);
        }

        private void DeclareExchangesForRoutingKeys(IModel channel, List<string> routingKeys)
        {
            routingKeys
                .GroupBy(p => exchangeProvider.GetExchangeName(p))
                .Select(p => p.Key)
                .ToList()
                .ForEach(exchangeName =>
                {
                    channel.ExchangeDeclare(exchangeName, ExchangeType.Topic, durable: true);

                    Log.Information(Logger, message: $"Exchange {exchangeName} is declared.");
                });
        }

        private void RunConsumer()
        {
            try
            {
                ReturnCurrentChannelToPool();

                // Config Chanel
                currentChannel = channelPool.Get();
                currentChannel.ModelShutdown += (model, eventArg) =>
                {
                    Log.Error(Logger, message: "Channel shutdown");

                    lock (retryConnectConsumerLock)
                    {
                        RetryRunningConsumer();

                        Log.Warning(Logger, message: "Channel Re-connect event already triggered");
                    }
                };
                // Config the prefectCount: 30 (Not default is 0 mean unlimited) to limit messages to prevent rabbit mq down
                // Reference: https://www.rabbitmq.com/tutorials/tutorial-two-dotnet.html. Filter: BasicQos
                currentChannel.BasicQos(prefetchSize: 0, prefetchCount: options.QueuePrefetchCount, global: false);

                // Config RabbitMQ Basic Consumer
                var applicationRabbitConsumer = new AsyncEventingBasicConsumer(currentChannel);
                applicationRabbitConsumer.ConsumerCancelled += OnConsumerCancelled;
                applicationRabbitConsumer.Received += OnMessageReceived;

                // Binding all defined event bus consumer to RabbitMQ Basic Consumer
                eventBusManager.AllDefinedEventBusConsumerBindingRoutingKeys()
                    .Select(GetConsumerQueueName)
                    .ToList()
                    .ForEach(queueName =>
                    {
                        // autoAck: false -> the Consumer will ack manually.
                        currentChannel.BasicConsume(queue: queueName, autoAck: false, consumer: applicationRabbitConsumer);

                        Log.Information(Logger, message: $"Consumer connected to queue {queueName}");
                    });
            }
            catch (Exception ex)
            {
                Log.Error(Logger, ex, "RabbitMq Consumer can't start");
                throw;
            }
            finally
            {
                ReturnCurrentChannelToPool();
            }
        }

        private void ReturnCurrentChannelToPool()
        {
            if (currentChannel != null)
                channelPool.Return(currentChannel);
        }

        private Task OnConsumerCancelled(object sender, ConsumerEventArgs args)
        {
            Log.Error(Logger, message: "RabbitMq Consumer cancelled");

            lock (retryConnectConsumerLock)
            {
                Log.Warning(Logger, message: "Re-connect RabbitMq consumer is triggered.");

                RetryRunningConsumer();
            }

            return Task.CompletedTask;
        }

        private void RetryRunningConsumer()
        {
            var finalResult = Policy.Handle<Exception>()
                .WaitAndRetry(
                    retryCount: options.RunConsumerRetryCount,
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (ex, timeSpan, currentRetry, ctx) =>
                    {
                        Log.Warning(
                            Logger,
                            ex,
                            $"Retry running RabbitMq consumer {currentRetry} time(s) failed with error: {ex.Message}");
                    })
                .ExecuteAndCapture(RunConsumer);

            if (finalResult.FinalException != null)
            {
                Log.Error(Logger, finalResult.FinalException, $"Retry running RabbitMq  consumer failed with err : {finalResult.FinalException.Message}");
            }
            else
            {
                Log.Information(
                    Logger,
                    message: $"Re-connect RabbitMq consumer successfully.");
            }
        }

        private async Task OnMessageReceived(object sender, BasicDeliverEventArgs rabbitMqMessage)
        {
            await TransferMessageToAllEventBusConsumers(rabbitMqMessage);
        }

        private async Task TransferMessageToAllEventBusConsumers(BasicDeliverEventArgs rabbitMqMessage)
        {
            try
            {
                var objectTypePayloadMessage =
                    JsonSerializer.Deserialize<PlatformEventBusMessage<object>>(
                        rabbitMqMessage.Body.Span,
                        PlatformJsonSerializer.CurrentOptions.Value);
                if (objectTypePayloadMessage == null)
                {
                    currentChannel.BasicAck(rabbitMqMessage.DeliveryTag, false);
                    return;
                }

                var canProcessConsumerTypes = eventBusManager.AllDefinedEventBusConsumerTypes()
                    .Where(eventBusConsumerType =>
                    {
                        var matchedFreeFormatMessageConsumerType = Util.Types.FindMatchedGenericType(eventBusConsumerType, typeof(IPlatformEventBusFreeFormatMessageConsumer<>).GetGenericTypeDefinition());
                        if (matchedFreeFormatMessageConsumerType != null)
                        {
                            var matchedFreeFormatMessageConsumerRoutingKey = PlatformDefaultFreeFormatMessageRoutingKeyBuilder.Build(
                                messageType: matchedFreeFormatMessageConsumerType.GetGenericArguments()[0]);
                            return matchedFreeFormatMessageConsumerRoutingKey.ToString() == rabbitMqMessage.RoutingKey ||
                                   matchedFreeFormatMessageConsumerRoutingKey.Match(rabbitMqMessage.RoutingKey) ||
                                   PlatformEventBusConsumerAttribute.CanEventBusConsumerProcess(eventBusConsumerType, rabbitMqMessage.RoutingKey, forceAtLeastOneAttributes: false);
                        }

                        return PlatformEventBusConsumerAttribute.CanEventBusConsumerProcess(eventBusConsumerType, rabbitMqMessage.RoutingKey);
                    })
                    .ToList();

                foreach (var consumerType in canProcessConsumerTypes)
                {
                    using (var scope = serviceProvider.CreateScope())
                    {
                        var consumer = (IPlatformEventBusConsumer)scope.ServiceProvider.GetService(consumerType);

                        if (consumer != null)
                            await ExecuteConsumer(rabbitMqMessage, consumer);
                    }
                }

                // Ack the message.
                currentChannel.BasicAck(rabbitMqMessage.DeliveryTag, false);
            }
            catch (PlatformInvokeConsumerException ex)
            {
                Log.Error(
                    Logger,
                    ex,
                    $"RabbitMQ invoke consumer {ex.ConsumerName} error for the routing key: {rabbitMqMessage.RoutingKey}.{Environment.NewLine}Message: {Encoding.UTF8.GetString(rabbitMqMessage.Body.Span)}");

                ProcessRequeueMessage(rabbitMqMessage, ex.EventBusMessage);
            }
            catch (Exception ex)
            {
                Log.Error(
                    Logger,
                    ex,
                    $"RabbitMQ processing error for the routing key: {rabbitMqMessage.RoutingKey}.{Environment.NewLine}Message: {Encoding.UTF8.GetString(rabbitMqMessage.Body.Span)}");

                // Reject the message.
                Util.Tasks.CatchException(() => currentChannel.BasicReject(rabbitMqMessage.DeliveryTag, false));
            }
        }

        private void ProcessRequeueMessage(BasicDeliverEventArgs rabbitMqMessage, object eventBusMessage)
        {
            if (eventBusMessage is IPlatformEventBusMessage platformEventBusMessage &&
                platformEventBusMessage.CreatedUtcDate.AddSeconds(options.RequeueExpiredInSeconds) >= Clock.UtcNow)
            {
                // Requeue the message.
                // References: https://www.rabbitmq.com/confirms.html#consumer-nacks-requeue
                Util.Tasks.QueueDelayAsyncAction(
                    token => Task.Run(
                        () =>
                        {
                            Policy.Handle<Exception>()
                                .WaitAndRetry(
                                    retryCount: options.ProcessRequeueMessageRetryCount,
                                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)))
                                .ExecuteAndCapture(() =>
                                {
                                    currentChannel.BasicNack(rabbitMqMessage.DeliveryTag, multiple: true, requeue: true);

                                    Log.Information(Logger, message: $"RabbitMQ requeued message for the routing key: {rabbitMqMessage.RoutingKey}.{Environment.NewLine}Message: {JsonSerializer.Serialize(eventBusMessage)}");
                                });
                        },
                        token),
                    TimeSpan.FromSeconds(options.RequeueDelayTimeInSeconds));
            }
        }

        /// <summary>
        /// Return Exception if failed to execute consumer
        /// </summary>
        private async Task ExecuteConsumer(BasicDeliverEventArgs args, IPlatformEventBusConsumer consumer)
        {
            // Get a generic type: PlatformEventBusMessage<TMessage> where TMessage = TMessagePayload
            // of IPlatformEventBusConsumer<TMessagePayload>
            var consumerMessageType = PlatformEventBusConsumer.GetConsumerMessageType(consumer);

            var eventBusMessage = Util.Tasks.CatchExceptionContinueThrow(
                () => JsonSerializer.Deserialize(
                    args.Body.Span,
                    consumerMessageType,
                    consumer.CustomJsonSerializerOptions() ?? PlatformJsonSerializer.CurrentOptions.Value),
                ex => Log.Error(
                    Logger,
                    ex,
                    $"RabbitMQ parsing error for the routing key {args.RoutingKey}.{Environment.NewLine} Body: {Encoding.UTF8.GetString(args.Body.Span)}"));

            if (eventBusMessage != null)
            {
                await PlatformEventBusConsumer.InvokeConsumer(consumer, eventBusMessage, args.RoutingKey, options.LogConsumerProcessTime, options.LogConsumerProcessWarningTimeMilliseconds, Logger);
            }
        }
    }

    public partial class PlatformRabbitMqHostedService
    {
        public class Log
        {
            public static void Error(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogError(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogError($"{message}");
            }

            public static void Warning(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogWarning(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogWarning($"{message}");
            }

            public static void Information(ILogger logger, Exception ex = null, string message = null)
            {
                if (ex != null)
                    logger.LogInformationIfEnabled(ex, $"{message ?? ex.Message}");
                else if (message != null)
                    logger.LogInformationIfEnabled($"{message}");
            }
        }
    }
}
