using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Hosting;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Timing;
using Easy.Platform.Common.Utils;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace Easy.Platform.RabbitMQ
{
    public partial class PlatformRabbitMqHostedService : PlatformHostedService
    {
        private readonly PlatformRabbitMqOptions options;
        private readonly IServiceProvider serviceProvider;
        private readonly IPlatformMessageBusManager messageBusManager;
        private readonly IPlatformRabbitMqExchangeProvider exchangeProvider;
        private readonly PlatformMessageBusApplicationSetting applicationSetting;
        private readonly PlatformRabbitChannelPool channelPool;

        private readonly object retryConnectConsumerLock = new object();
        private IModel currentChannel;

        public PlatformRabbitMqHostedService(
            IHostApplicationLifetime applicationLifetime,
            PlatformRabbitMqOptions options,
            IServiceProvider serviceProvider,
            IPlatformMessageBusManager messageBusManager,
            ILoggerFactory loggerFactory,
            IPlatformRabbitMqExchangeProvider exchangeProvider,
            PlatformMessageBusApplicationSetting applicationSetting,
            PlatformRabbitChannelPool channelPool) : base(applicationLifetime, loggerFactory)
        {
            this.options = options;
            this.serviceProvider = serviceProvider;
            this.messageBusManager = messageBusManager;
            this.exchangeProvider = exchangeProvider;
            this.applicationSetting = applicationSetting;
            this.channelPool = channelPool;
        }

        protected override async Task StartProcess(CancellationToken cancellationToken)
        {
            await Task.Run(
                () =>
                {
                    while (DeclareRabbitMqConfiguration() == false)
                    {
                        DeclareRabbitMqConfiguration();
                    }

                    RunConsumer();
                },
                cancellationToken);
        }

        protected override async Task StopProcess(CancellationToken cancellationToken)
        {
            await Task.Run(
                () =>
                {
                    ReturnCurrentChannelBackToPool();

                    if (currentChannel is { IsOpen: true })
                        currentChannel.Close();
                },
                cancellationToken);
        }

        private void ReturnCurrentChannelBackToPool()
        {
            if (currentChannel != null)
            {
                channelPool.Return(currentChannel);
            }
        }

        private bool DeclareRabbitMqConfiguration()
        {
            var channel = InitRabbitMqChannel();

            if (channel == null)
                return false;

            DeclareRabbitMqExchangesConfiguration(channel);

            DeclareRabbitMqQueuesConfiguration(channel);

            channelPool.Return(channel);

            return true;
        }

        private IModel InitRabbitMqChannel()
        {
            try
            {
                return Policy
                    .Handle<Exception>()
                    .WaitAndRetry(
                        options.FirstTimeInitChannelRetryCount,
                        retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)))
                    .ExecuteAndThrowFinalException(
                        executeFunc: () => channelPool.Get(),
                        onBeforeThrowFinalExceptionFn: ex =>
                        {
                            Logger.LogError(ex, "Init rabbit-mq channel failed.");
                        });
            }
            catch
            {
                return null;
            }
        }

        // Declare queue for all declared consumers in source code
        private void DeclareRabbitMqQueuesConfiguration(IModel channel)
        {
            messageBusManager.AllDefinedMessageBusConsumerAttributes()
                .ForEach(consumerAttribute => DeclareQueueForConsumer(channel, consumerAttribute));
            messageBusManager.AllDefaultFreeFormatMessageRoutingKeyForDefinedConsumers()
                .ForEach(consumerRoutingKey => DeclareQueueForConsumer(channel, consumerRoutingKey));
        }

        private void DeclareQueueForConsumer(IModel channel, PlatformMessageBusConsumerAttribute consumerAttribute)
        {
            var exchange = GetConsumerExchange(consumerAttribute);
            var queueName = GetConsumerQueueName(consumerAttribute);

            // WHY: Set exclusive to false to support multiple consumers with the same type.
            // For example: in load balancing environment, we may have 2 instances of an API.
            // RabbitMQ will automatically apply load balancing behavior to send message to 1 instance only.
            channel.QueueDeclare(
                queueName,
                durable: true,
                exclusive: false,
                autoDelete: false);
            Log.Information(Logger, message: $"Queue {queueName} has been declared");

            DeclareQueueBindForConsumer(
                channel,
                consumerAttribute.GetConsumerBindingRoutingKey(),
                queueName,
                exchange);

            if (!string.IsNullOrEmpty(consumerAttribute.CustomRoutingKey))
            {
                DeclareQueueBindForConsumer(
                    channel,
                    consumerAttribute.CustomRoutingKey,
                    queueName,
                    exchange);
            }
        }

        private void DeclareQueueForConsumer(IModel channel, PlatformBusMessageRoutingKey consumerBindingRoutingKey)
        {
            var exchange = GetConsumerExchange(consumerBindingRoutingKey);
            var queueName = GetConsumerQueueName(consumerBindingRoutingKey);

            // WHY: Set exclusive to false to support multiple consumers with the same type.
            // For example: in load balancing environment, we may have 2 instances of an API.
            // RabbitMQ will automatically apply load balancing behavior to send message to 1 instance only.
            channel.QueueDeclare(
                queueName,
                durable: true,
                exclusive: false,
                autoDelete: false);
            Log.Information(Logger, message: $"Queue {queueName} has been declared");

            DeclareQueueBindForConsumer(
                channel,
                consumerBindingRoutingKey,
                queueName,
                exchange);
        }

        private void DeclareQueueBindForConsumer(
            IModel channel,
            string consumerBindingRoutingKey,
            string queueName,
            string exchange)
        {
            channel.QueueBind(queueName, exchange, consumerBindingRoutingKey);
            Log.Information(
                Logger,
                message:
                $"Queue {queueName} has been declared and bound to Exchange {exchange} with routing key {consumerBindingRoutingKey}");

            channel.QueueBind(
                queueName,
                exchange,
                $"{consumerBindingRoutingKey}.{PlatformRabbitMqConstants.FanoutBindingChar}");
            Log.Information(
                Logger,
                message:
                $"Queue {queueName} has been declared and bound to Exchange {exchange} with routing key {consumerBindingRoutingKey}.{PlatformRabbitMqConstants.FanoutBindingChar}");
        }

        private string GetConsumerQueueName(PlatformMessageBusConsumerAttribute consumerAttribute)
        {
            return GetConsumerQueueName(consumerAttribute.GetConsumerBindingRoutingKey());
        }

        private string GetConsumerQueueName(string consumerRoutingKey)
        {
            return $"[Platform][{applicationSetting.ApplicationName}]-{consumerRoutingKey}";
        }

        private string GetConsumerExchange(PlatformMessageBusConsumerAttribute consumerAttribute)
        {
            return GetConsumerExchange(consumerRoutingKey: consumerAttribute.GetConsumerBindingRoutingKey());
        }

        private string GetConsumerExchange(PlatformBusMessageRoutingKey consumerRoutingKey)
        {
            return exchangeProvider.GetExchangeName(routingKey: consumerRoutingKey);
        }

        private void DeclareRabbitMqExchangesConfiguration(IModel channel)
        {
            // Get exchange routing key for all consumers
            var allDefinedMessageBusConsumerPatternRoutingKeys = messageBusManager
                .AllDefinedMessageBusConsumerBindingRoutingKeys();

            // Declare all exchanges
            DeclareExchangesForRoutingKeys(
                channel,
                routingKeys: allDefinedMessageBusConsumerPatternRoutingKeys);
        }

        private void DeclareExchangesForRoutingKeys(IModel channel, List<string> routingKeys)
        {
            routingKeys
                .GroupBy(p => exchangeProvider.GetExchangeName(p))
                .Select(p => p.Key)
                .ToList()
                .ForEach(
                    exchangeName =>
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
                // Config the prefectCount (Not default is 0 mean unlimited) to limit messages to prevent rabbit mq down
                // Reference: https://www.rabbitmq.com/tutorials/tutorial-two-dotnet.html. Filter: BasicQos
                currentChannel.BasicQos(prefetchSize: 0, prefetchCount: options.QueuePrefetchCount, global: false);

                // Config RabbitMQ Basic Consumer
                var applicationRabbitConsumer = new AsyncEventingBasicConsumer(currentChannel);
                applicationRabbitConsumer.ConsumerCancelled += OnConsumerCancelled;
                applicationRabbitConsumer.Received += OnMessageReceived;

                // Binding all defined event bus consumer to RabbitMQ Basic Consumer
                messageBusManager.AllDefinedMessageBusConsumerBindingRoutingKeys()
                    .Select(GetConsumerQueueName)
                    .ToList()
                    .ForEach(
                        queueName =>
                        {
                            // autoAck: false -> the Consumer will ack manually.
                            currentChannel.BasicConsume(
                                queue: queueName,
                                autoAck: false,
                                consumer: applicationRabbitConsumer);

                            Log.Information(Logger, message: $"Consumer connected to queue {queueName}");
                        });
            }
            catch (Exception ex)
            {
                Log.Warning(Logger, ex, "RabbitMq Consumer can't start");
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
                    onRetry: (
                        ex,
                        timeSpan,
                        currentRetry,
                        ctx) =>
                    {
                        Log.Warning(
                            Logger,
                            ex,
                            $"Retry running RabbitMq consumer {currentRetry} time(s) failed with error: {ex.Message}");
                    })
                .ExecuteAndCapture(RunConsumer);

            if (finalResult.FinalException != null)
            {
                Log.Error(
                    Logger,
                    finalResult.FinalException,
                    $"Retry running RabbitMq  consumer failed with err : {finalResult.FinalException.Message}");
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
            await TransferMessageToAllMessageBusConsumers(rabbitMqMessage);
        }

        private async Task TransferMessageToAllMessageBusConsumers(BasicDeliverEventArgs rabbitMqMessage)
        {
            try
            {
                var canProcessConsumerTypes = messageBusManager.AllDefinedMessageBusConsumerTypes()
                    .Where(
                        messageBusConsumerType =>
                        {
                            if (messageBusConsumerType.GetCustomAttributes<PlatformMessageBusConsumerAttribute>()
                                .IsEmpty())
                            {
                                var matchedConsumerType =
                                    Util.Types.FindMatchedGenericType(
                                        messageBusConsumerType,
                                        typeof(IPlatformMessageBusFreeFormatMessageConsumer<>)
                                            .GetGenericTypeDefinition()) ??
                                    Util.Types.FindMatchedGenericType(
                                        messageBusConsumerType,
                                        typeof(IPlatformMessageBusConsumer<>).GetGenericTypeDefinition());

                                var matchedDefaultFreeFormatMessageRoutingKey =
                                    PlatformBuildDefaultFreeFormatMessageRoutingKeyHelper.BuildForConsumer(
                                        matchedConsumerType);

                                return matchedDefaultFreeFormatMessageRoutingKey.Match(rabbitMqMessage.RoutingKey);
                            }

                            return PlatformMessageBusConsumerAttribute.CanMessageBusConsumerProcess(
                                messageBusConsumerType,
                                rabbitMqMessage.RoutingKey);
                        })
                    .ToList();

                foreach (var consumerType in canProcessConsumerTypes)
                {
                    using (var scope = serviceProvider.CreateScope())
                    {
                        var consumer = (IPlatformMessageBusBaseConsumer)scope.ServiceProvider.GetService(consumerType);

                        if (consumer != null)
                            await ExecuteConsumer(rabbitMqMessage, consumer);
                    }
                }

                // WHY: After consumed message successfully, ack the message is handled to rabbitmq so that message could be removed.
                currentChannel.BasicAck(rabbitMqMessage.DeliveryTag, multiple: false);
            }
            catch (PlatformInvokeConsumerException ex)
            {
                ProcessRequeueMessage(rabbitMqMessage, ex.BusMessage);
            }
            catch (Exception ex)
            {
                Log.Error(
                    Logger,
                    ex,
                    $"RabbitMQ consume message error must REJECT. [RoutingKey:{rabbitMqMessage.RoutingKey}].{Environment.NewLine}" +
                    $"Message: {Encoding.UTF8.GetString(rabbitMqMessage.Body.Span)}");

                // Reject the message.
                Util.Tasks.CatchException(() => currentChannel.BasicReject(rabbitMqMessage.DeliveryTag, false));
            }
        }

        private void ProcessRequeueMessage(BasicDeliverEventArgs rabbitMqMessage, object busMessage)
        {
            if (options.RequeueExpiredInSeconds <= 0 ||
                (busMessage is IPlatformBusTrackableMessage platformBusTrackableMessage &&
                 platformBusTrackableMessage.CreatedUtcDate.AddSeconds(options.RequeueExpiredInSeconds) >=
                 Clock.UtcNow))
            {
                // Requeue the message.
                // References: https://www.rabbitmq.com/confirms.html#consumer-nacks-requeue for WHY of multiple: true, requeue: true
                // Summary: requeue: true =>  the broker will requeue the delivery (or multiple deliveries, as will be explained shortly) with the specified delivery tag
                // Why multiple: true for Nack: to fix requeue true for multiple consumer instance by eject or requeue multiple messages at once.
                // Because if all consumers requeue because they cannot process a delivery due to a transient condition, they will create a requeue/redelivery loop. Such loops can be costly in terms of network bandwidth and CPU resources
                Util.Tasks.QueueDelayAsyncAction(
                    token => Task.Run(
                        () =>
                        {
                            Policy.Handle<Exception>()
                                .WaitAndRetry(
                                    retryCount: options.ProcessRequeueMessageRetryCount,
                                    sleepDurationProvider: retryAttempt =>
                                        TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)))
                                .ExecuteAndCapture(
                                    () =>
                                    {
                                        currentChannel.BasicNack(
                                            rabbitMqMessage.DeliveryTag,
                                            multiple: true,
                                            requeue: true);

                                        Log.Information(
                                            Logger,
                                            message:
                                            $"RabbitMQ requeued message for the routing key: {rabbitMqMessage.RoutingKey}.{Environment.NewLine}Message: {PlatformJsonSerializer.Serialize(busMessage)}");
                                    });
                        },
                        token),
                    TimeSpan.FromSeconds(options.RequeueDelayTimeInSeconds));
            }
        }

        /// <summary>
        /// Return Exception if failed to execute consumer
        /// </summary>
        private async Task ExecuteConsumer(BasicDeliverEventArgs args, IPlatformMessageBusBaseConsumer consumer)
        {
            // Get a generic type: PlatformMessageBusMessage<TMessage> where TMessage = TMessagePayload
            // of IPlatformMessageBusConsumer<TMessagePayload>
            var consumerMessageType = PlatformMessageBusBaseConsumer.GetConsumerMessageType(consumer);

            var busMessage = Util.Tasks.CatchExceptionContinueThrow(
                () => PlatformJsonSerializer.Deserialize(
                    args.Body.Span,
                    consumerMessageType,
                    consumer.CustomJsonSerializerOptions()),
                ex => Log.Error(
                    Logger,
                    ex,
                    $"RabbitMQ parsing message to {consumerMessageType.Name} error for the routing key {args.RoutingKey}.{Environment.NewLine} Body: {Encoding.UTF8.GetString(args.Body.Span)}"));

            if (busMessage != null)
            {
                await PlatformMessageBusBaseConsumer.InvokeConsumerAsync(
                    consumer,
                    busMessage,
                    args.RoutingKey,
                    options.IsLogConsumerProcessTime,
                    options.LogErrorSlowProcessWarningTimeMilliseconds,
                    Logger);
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
