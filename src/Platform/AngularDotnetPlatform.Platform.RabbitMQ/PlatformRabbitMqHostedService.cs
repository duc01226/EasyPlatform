using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.EventBus;
using AngularDotnetPlatform.Platform.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public partial class PlatformRabbitMqHostedService : IHostedService
    {
        private readonly PlatformRabbitMqOptions options;
        private readonly IServiceProvider serviceProvider;
        private readonly IPlatformApplicationSettingContext applicationSettingContext;
        private readonly PlatformRabbitMqExchangeProvider exchangeProvider;
        private readonly IPlatformEventBusManager eventBusManager;
        private readonly ILogger<PlatformRabbitMqHostedService> logger;

        // Use ObjectBool to manage chanel because HostService is singleton, and we don't want re-init chanel is heavy and wasting time.
        // We want to use pool when object is expensive to allocate/initialize
        // References: https://docs.microsoft.com/en-us/aspnet/core/performance/objectpool?view=aspnetcore-5.0
        private readonly DefaultObjectPool<IModel> channelPool;

        private readonly object retryConnectConsumerLock = new object();
        private IModel currentChannel;

        public PlatformRabbitMqHostedService(
            PlatformRabbitMqOptions options,
            PlatformRabbitMqChannelPoolPolicy channelPolicy,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformRabbitMqExchangeProvider exchangeProvider,
            IPlatformEventBusManager eventBusManager,
            ILogger<PlatformRabbitMqHostedService> logger)
        {
            this.options = options;
            this.serviceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
            this.exchangeProvider = exchangeProvider;
            this.logger = logger;
            this.eventBusManager = eventBusManager;

            // Needs 1 object only for the hosted service.
            channelPool = new DefaultObjectPool<IModel>(channelPolicy, 1);
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            DeclareRabbitMqConfiguration();

            RunConsumer();

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            if (currentChannel != null)
            {
                channelPool.Return(currentChannel);
            }

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
            // Declare queue for all messages to be produced
            eventBusManager.GetAllDefinedEventBusMessageRoutingKeys()
                .ForEach(definedMessageRoutingKey => DeclareQueueForRoutingKey(channel, definedMessageRoutingKey));

            // Declare queue for all consumers
            eventBusManager.AllDefinedEventBusConsumerPatternRoutingKeys()
                .ForEach(consumerMatchingRoutingKey => DeclareQueueForRoutingKey(channel, consumerMatchingRoutingKey));
        }

        private void DeclareQueueForRoutingKey(IModel channel, PlatformEventBusMessageRoutingKey forRoutingKey)
        {
            // Set exclusive to false to support multiple consumers with the same type.
            // For example: in load balancing environment, we may have 2 instances of an API.
            // RabbitMQ will automatically apply load balancing behavior to send message to 1 instance only.
            var queueName = forRoutingKey.QueueName(applicationSettingContext.ApplicationName);
            var bindRoutingKey = $"{queueName}.{PlatformRabbitMqConstants.FanoutBindingChar}";
            var exchange = exchangeProvider.GetName(forRoutingKey);

            channel.QueueDeclare(queueName, durable: true, exclusive: false, autoDelete: false);
            channel.QueueBind(queueName, exchange, bindRoutingKey);

            Log.Information(logger, message: $"Queue {queueName} has been declared and bind to Exchange {exchange} with routing key {bindRoutingKey}");
        }

        private void DeclareRabbitMqExchangesConfiguration(IModel channel)
        {
            // Declare exchanges for all defined messages to be produced
            DeclareExchangesForRoutingKeys(channel, eventBusManager.GetAllDefinedEventBusMessageRoutingKeys());

            // Declare exchanges for all consumers
            DeclareExchangesForRoutingKeys(channel, eventBusManager.AllDefinedEventBusConsumerPatternRoutingKeys());
        }

        private void DeclareExchangesForRoutingKeys(IModel channel, List<PlatformEventBusMessageRoutingKey> routingKeys)
        {
            routingKeys
                .GroupBy(p => exchangeProvider.GetName(p))
                .Select(p => p.Key)
                .ToList()
                .ForEach(exchangeName =>
                {
                    channel.ExchangeDeclare(exchangeName, ExchangeType.Topic, durable: true);

                    Log.Information(logger, message: $"Exchange {exchangeName} is declared.");
                });
        }

        private void RunConsumer()
        {
            try
            {
                if (currentChannel != null)
                    channelPool.Return(currentChannel);

                // Config Chanel
                currentChannel = channelPool.Get();
                currentChannel.ModelShutdown += (model, eventArg) =>
                {
                    Log.Error(logger, message: "Channel shutdown");

                    lock (retryConnectConsumerLock)
                    {
                        RetryRunningConsumer();

                        Log.Warning(logger, message: "Channel Re-connect event already triggered");
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
                eventBusManager.AllDefinedEventBusConsumerPatternRoutingKeys()
                    .Select(p => p.QueueName())
                    .ToList()
                    .ForEach(queueName =>
                    {
                        // autoAck: false -> the Consumer will ack manually.
                        currentChannel.BasicConsume(queue: queueName, autoAck: false, consumer: applicationRabbitConsumer);

                        Log.Information(logger, message: $"Connected to queue {queueName}");
                    });
            }
            catch (Exception ex)
            {
                Log.Error(logger, ex, "Consumer can't start");
                throw;
            }
            finally
            {
                if (currentChannel != null)
                {
                    Log.Information(logger, message: "Return channel object to the pool.");
                    channelPool.Return(currentChannel);
                }
            }
        }

        private Task OnConsumerCancelled(object sender, ConsumerEventArgs args)
        {
            Log.Error(logger, message: "Consumer cancelled");

            lock (retryConnectConsumerLock)
            {
                RetryRunningConsumer();

                Log.Warning(logger, message: "Re-connect event already triggered");
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
                            logger,
                            ex,
                            $"Retry consumer {currentRetry} time(s) failed with error: {ex.Message}");
                    })
                .ExecuteAndCapture(RunConsumer);

            if (finalResult.FinalException != null)
            {
                Log.Error(logger, finalResult.FinalException, $"Retry consumer failed with err : {finalResult.FinalException.Message}");
            }
        }

        private async Task OnMessageReceived(object sender, BasicDeliverEventArgs rabbitMqMessage)
        {
            if (options.LogConsumerProcessTime)
            {
                await Util.Tasks.ProfilingAsync(
                    asyncTask: () => TransferMessageToAllEventBusConsumers(rabbitMqMessage),
                    beforeExecution: () => Log.Information(
                        logger,
                        message: "Received message with routing key: {RoutingKey}. Delivery Tag: {DeliveryTag}.",
                        args: new object[] { rabbitMqMessage.RoutingKey, rabbitMqMessage.DeliveryTag }),
                    afterExecution: elapsedMilliseconds => Log.Information(
                        logger,
                        message: "End processing message with routing key: {RoutingKey}. Delivery Tag: {DeliveryTag}. Elapsed {ElapsedMilliseconds} in milliseconds.",
                        args: new object[] { rabbitMqMessage.RoutingKey, rabbitMqMessage.DeliveryTag, elapsedMilliseconds }));
            }
            else
            {
                await TransferMessageToAllEventBusConsumers(rabbitMqMessage);
            }
        }

        private async Task TransferMessageToAllEventBusConsumers(BasicDeliverEventArgs rabbitMqMessage)
        {
            try
            {
                var objectTypePayloadMessage = JsonSerializer.Deserialize<PlatformEventBusMessage<object>>(rabbitMqMessage.Body.Span, PlatformJsonSerializer.CurrentOptions.Value);
                if (objectTypePayloadMessage == null)
                {
                    currentChannel.BasicAck(rabbitMqMessage.DeliveryTag, false);
                    return;
                }

                using (var scope = serviceProvider.CreateScope())
                {
                    var canProcessConsumers = scope.ServiceProvider
                        .GetServices<IPlatformEventBusConsumer>()
                        .Where(p => p.CanProcess(PlatformEventBusMessageRoutingKey.New(rabbitMqMessage.RoutingKey)))
                        .ToList();

                    foreach (var consumer in canProcessConsumers)
                    {
                        if (options.LogConsumerProcessTime)
                        {
                            Log.Information(
                                logger,
                                message: "Begin processing message with routing key: {RoutingKey}; Delivery Tag: {DeliveryTag}; Message id {MessageId} for consumer {ConsumerName}",
                                args: new object[] { rabbitMqMessage.RoutingKey, rabbitMqMessage.DeliveryTag, objectTypePayloadMessage.TrackingId ?? "n/a", consumer.GetType().FullName });

                            await ExecuteConsumer(rabbitMqMessage, consumer);

                            Log.Information(
                                logger,
                                message: "End processing message with routing key: {RoutingKey}; Delivery Tag: {DeliveryTag}; Message id {MessageId} for consumer {ConsumerName}",
                                args: new object[] { rabbitMqMessage.RoutingKey, rabbitMqMessage.DeliveryTag, objectTypePayloadMessage.TrackingId ?? "n/a", consumer.GetType().FullName });
                        }
                        else
                        {
                            await ExecuteConsumer(rabbitMqMessage, consumer);
                        }
                    }

                    // Clear to prevent memory leak
                    canProcessConsumers.Clear();

                    // Ack the message.
                    currentChannel.BasicAck(rabbitMqMessage.DeliveryTag, false);
                }
            }
            catch (Exception ex)
            {
                Log.Error(
                    logger,
                    ex,
                    "RabbitMQ processing error for the routing key: {RoutingKey}. Message: {Message}",
                    new object[] { rabbitMqMessage.RoutingKey, Encoding.UTF8.GetString(rabbitMqMessage.Body.Span) });

                // Reject the message.
                Util.Tasks.CatchException(() => currentChannel.BasicReject(rabbitMqMessage.DeliveryTag, false));
            }
        }

        /// <summary>
        /// Return Exception if failed to execute consumer
        /// </summary>
        private async Task ExecuteConsumer(BasicDeliverEventArgs args, IPlatformEventBusConsumer consumer)
        {
            var genericConsumerType = consumer
                .GetType()
                .GetInterfaces()
                .FirstOrDefault(x =>
                    x.IsGenericType &&
                    x.GetGenericTypeDefinition() == typeof(IPlatformEventBusConsumer<>));

            // To ensure that the consumer implements the correct interface IOpalMessageConsumer<>.
            // The IOpalMessageConsumer (non-generic version) is used for Interface Marker only.
            if (genericConsumerType == null)
            {
                throw new Exception("Incorrect implementation of IPlatformMessageConsumer<>");
            }

            // Get generic type IPlatformMessageConsumer<TMessage> -> TMessage
            var messageConsumerPayloadType = genericConsumerType.GetGenericArguments()[0];

            // Get type of generic PlatformEventBusMessage<>
            var messageType = typeof(PlatformEventBusMessage<>);

            // Make a generic type: PlatformEventBusMessage<TMessage>
            var messageForConsumerPayloadType =
                messageType.MakeGenericType(messageConsumerPayloadType);

            var data = Util.Tasks.CatchExceptionContinueThrow(
                () => JsonSerializer.Deserialize(
                    args.Body.Span,
                    messageForConsumerPayloadType,
                    PlatformJsonSerializer.CurrentOptions.Value),
                ex => Log.Error(
                    logger,
                    ex,
                    "RabbitMQ parsing error for the routing key {RoutingKey}. Body: {Message}",
                    new object[] { args.RoutingKey, Encoding.UTF8.GetString(args.Body.Span) }));

            if (data != null)
            {
                // Get HandleAsync method.
                var methodInfo = consumer.GetType()
                    .GetMethod(nameof(IPlatformEventBusConsumer<object>.HandleAsync));
                if (methodInfo == null)
                {
                    throw new Exception(
                        $"Can not find execution method from {genericConsumerType.FullName}");
                }

                // Invoke the method.
                var invokeResult = methodInfo.Invoke(consumer, new[] { data });
                if (invokeResult is Task invokeTask)
                    await invokeTask;
            }
        }
    }

    public partial class PlatformRabbitMqHostedService
    {
        public class Log
        {
            public static void Error(ILogger<PlatformRabbitMqHostedService> logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogError(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogError($"{message}", args);
            }

            public static void Warning(ILogger<PlatformRabbitMqHostedService> logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogWarning(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogWarning($"{message}", args);
            }

            public static void Information(ILogger<PlatformRabbitMqHostedService> logger, Exception ex = null, string message = null, object[] args = null)
            {
                if (ex != null)
                    logger.LogInformation(ex, $"{message ?? ex.Message}", args ?? Array.Empty<object>());
                else if (message != null)
                    logger.LogInformation($"{message}", args);
            }
        }
    }
}
