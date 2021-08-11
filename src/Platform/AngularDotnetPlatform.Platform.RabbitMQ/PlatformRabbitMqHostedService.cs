using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.EventBus;
using AngularDotnetPlatform.Platform.Application.EventBus.Producers;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Cqrs.Commands;
using AngularDotnetPlatform.Platform.Domain;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.EventBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.ObjectPool;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;

namespace AngularDotnetPlatform.Platform.RabbitMQ
{
    public class PlatformRabbitMqHostedService : IHostedService
    {
        private readonly PlatformRabbitMqOptions options;
        private readonly IServiceProvider serviceProvider;
        private readonly IPlatformApplicationSettingContext applicationSettingContext;
        private readonly PlatformRabbitMqExchangeProvider exchangeProvider;
        private readonly ILogger<PlatformRabbitMqHostedService> logger;
        private readonly DefaultObjectPool<IModel> channelPool;
        private readonly object retryConnectConsumerLock = new object();
        private IModel currentChannel;

        public PlatformRabbitMqHostedService(
            PlatformRabbitMqOptions options,
            PlatformRabbitMqChannelPoolPolicy channelPolicy,
            IServiceProvider serviceProvider,
            IPlatformApplicationSettingContext applicationSettingContext,
            PlatformRabbitMqExchangeProvider exchangeProvider,
            ILogger<PlatformRabbitMqHostedService> logger)
        {
            this.options = options;
            this.serviceProvider = serviceProvider;
            this.applicationSettingContext = applicationSettingContext;
            this.exchangeProvider = exchangeProvider;
            this.logger = logger;

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
            GetAllDefinedMessageRoutingKeys()
                .ForEach(definedMessageRoutingKey =>
                {
                    DeclareQueueForRoutingKey(channel, definedMessageRoutingKey);
                });

            // Declare queue for all consumers
            GetAllConsumerMatchingRoutingKeys()
                .ForEach(consumerMatchingRoutingKey =>
                {
                    DeclareQueueForRoutingKey(channel, consumerMatchingRoutingKey);
                });
        }

        /// <summary>
        /// Get all routing keys matched with all defined consumers
        /// </summary>
        private List<PlatformEventBusMessageRoutingKey> GetAllConsumerMatchingRoutingKeys()
        {
            return applicationSettingContext.GetType().Assembly.GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformEventBusConsumer)) && p.IsClass && !p.IsAbstract)
                .SelectMany(messageConsumerType => messageConsumerType
                    .GetCustomAttributes(true)
                    .OfType<PlatformEventBusConsumerAttribute>()
                    .Select(messageConsumerTypeAttribute => (PlatformEventBusConsumerAttribute)messageConsumerTypeAttribute))
                .Select(p => PlatformEventBusMessageRoutingKey.New(p.MessageGroup, p.ProducerContext, p.MessageType))
                .Distinct()
                .ToList();
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
        }

        private void DeclareRabbitMqExchangesConfiguration(IModel channel)
        {
            // Declare exchanges for all defined messages to be produced
            DeclareExchangesForRoutingKeys(channel, GetAllDefinedMessageRoutingKeys());

            // Declare exchanges for all consumers
            DeclareExchangesForRoutingKeys(channel, GetAllConsumerMatchingRoutingKeys());
        }

        /// <summary>
        /// Get routing keys for all defined message to be produced
        /// </summary>
        private List<PlatformEventBusMessageRoutingKey> GetAllDefinedMessageRoutingKeys()
        {
            var definedMessageRoutingKeys = serviceProvider.GetServices<IPlatformEventBusMessage>()
                .Select(p => p.RoutingKey())
                .ToList();

            var allDefinedEntitiesEntityEventRoutingKeys = serviceProvider.GetService<IPlatformDomainAssemblyProvider>()!.Assembly
                .GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IEntity)) && p.IsClass && !p.IsAbstract && !p.IsGenericType)
                .Select(entityType =>
                {
                    var entityIdType = entityType.GetInterfaces().First(p => p.IsGenericType && p.GetGenericTypeDefinition().IsAssignableTo(typeof(IEntity<>)));
                    var entityEventMessageType =
                        typeof(PlatformCqrsEntityEventBusMessage<,>).MakeGenericType(entityType, entityIdType.GenericTypeArguments[0]);
                    var entityEventMessage =
                        (IPlatformCqrsEntityEventBusMessage)Activator.CreateInstance(entityEventMessageType);
                    return entityEventMessage!.RoutingKey();
                })
                .ToList();

            var allDefinedCommandsCommandEventRoutingKeys = applicationSettingContext.GetType().Assembly
                .GetTypes()
                .Where(p => p.IsAssignableTo(typeof(IPlatformCqrsCommand)) && p.IsClass && !p.IsAbstract && !p.IsGenericType)
                .Select(commandType =>
                {
                    var commandResultType = commandType.GetInterfaces().First(p =>
                        p.IsGenericType && p.GetGenericTypeDefinition().IsAssignableTo(typeof(IPlatformCqrsCommand<>)));
                    var commandEventMessageType =
                        typeof(PlatformCqrsCommandEventBusMessage<,>).MakeGenericType(commandType, commandResultType.GenericTypeArguments[0]);
                    var commandEventMessage =
                        (IPlatformCqrsCommandEventBusMessage)Activator.CreateInstance(commandEventMessageType);
                    return commandEventMessage!.RoutingKey();
                })
                .ToList();

            return definedMessageRoutingKeys
                .Concat(allDefinedEntitiesEntityEventRoutingKeys)
                .Concat(allDefinedCommandsCommandEventRoutingKeys)
                .ToList();
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
                });
        }

        private void RunConsumer()
        {
            try
            {
                var channel = channelPool.Get();
                currentChannel = channel;

                // Config the prefectCount: 30 (Not default is 0 mean unlimited) to limit messages to prevent rabbit mq down
                // Reference: https://www.rabbitmq.com/tutorials/tutorial-two-dotnet.html. Filter: BasicQos
                channel.BasicQos(prefetchSize: 0, prefetchCount: options.QueuePrefectCount, global: false);
                var consumer = new AsyncEventingBasicConsumer(channel);
                var reconnect = false;
                consumer.ConsumerCancelled += (model, eventArg) =>
                {
                    LogError(message: "Consumer cancelled");

                    var shouldReconnect = false;
                    lock (retryConnectConsumerLock)
                    {
                        if (!reconnect)
                        {
                            reconnect = true;
                            shouldReconnect = true;
                        }
                        else
                        {
                            logger.LogWarning("[{GetType().FullName}] Re-connect event already triggered");
                        }
                    }

                    if (shouldReconnect)
                    {
                        RetryRunningConsumer();
                    }

                    return Task.CompletedTask;
                };
                consumer.Received += OnMessageReceived;

                GetAllConsumerMatchingRoutingKeys().Select(p => p.QueueName(applicationSettingContext.ApplicationName)).ToList().ForEach(queueName =>
                {
                    // autoAck: false -> the Consumer will ack manually.
                    channel.BasicConsume(queue: queueName, autoAck: false, consumer: consumer);
                });
                channel.ModelShutdown += (model, eventArg) =>
                {
                    LogError(message: "Channel shutdown");

                    var shouldReconnect = false;
                    lock (retryConnectConsumerLock)
                    {
                        if (!reconnect)
                        {
                            reconnect = true;
                            shouldReconnect = true;
                        }
                        else
                        {
                            LogWarning(message: "Channel Re-connect event already triggered");
                        }
                    }

                    if (shouldReconnect)
                    {
                        RetryRunningConsumer();
                    }
                };
            }
            catch (Exception ex)
            {
                LogError(ex, "Consumer can't start");

                throw;
            }
            finally
            {
                if (currentChannel != null)
                {
                    LogInformation(message: "Return channel object to the pool.");
                    channelPool.Return(currentChannel);
                }
            }
        }

        private void LogError(Exception ex = null, string message = null, object[] args = null)
        {
            if (ex != null)
                logger.LogError(ex, $"{LogPrefix()} {message ?? ex.Message}", args ?? Array.Empty<object>());
            else if (message != null)
                logger.LogError($"{LogPrefix()} {message}", args);
        }

        private void LogWarning(Exception ex = null, string message = null, object[] args = null)
        {
            if (ex != null)
                logger.LogWarning(ex, $"{LogPrefix()} {message ?? ex.Message}", args ?? Array.Empty<object>());
            else if (message != null)
                logger.LogWarning($"{LogPrefix()} {message}", args);
        }

        private void LogInformation(Exception ex = null, string message = null, object[] args = null)
        {
            if (ex != null)
                logger.LogInformation(ex, $"{LogPrefix()} {message ?? ex.Message}", args ?? Array.Empty<object>());
            else if (message != null)
                logger.LogInformation($"{LogPrefix()} {message}", args);
        }

        private string LogPrefix()
        {
            return $"[{GetType().FullName}]";
        }

        private void RetryRunningConsumer()
        {
            var currentRetry = 0;
            while (true)
            {
                try
                {
                    currentRetry++;
                    LogInformation(message: $"Consumer re-connecting {currentRetry} time(s)");
                    RunConsumer();
                    LogInformation(message: "Consumer re-connected");

                    break;
                }
                catch (Exception ex)
                {
                    LogWarning(ex, $"Retry consumer {currentRetry} time(s) failed with error: {ex.Message}");

                    if (currentRetry > options.RunConsumerRetryCount)
                    {
                        logger.LogError(ex, $"Retry consumer failed with err : {ex.Message}");

                        throw;
                    }
                }

                Thread.Sleep(TimeSpan.FromSeconds(Math.Pow(2, currentRetry)));
            }
        }

        private async Task OnMessageReceived(object sender, BasicDeliverEventArgs args)
        {
            Stopwatch stopwatch = null;
            if (options.LogProcessTime)
            {
                stopwatch = Stopwatch.StartNew();
                LogInformation(message: "Received message with routing key: {RoutingKey}. Delivery Tag: {DeliveryTag}.", args: new object[] { args.RoutingKey, args.DeliveryTag });
            }

            try
            {
                using (var scope = serviceProvider.CreateScope())
                {
                    var objectTypePayloadMessage = JsonSerializer.Deserialize<PlatformEventBusMessage<object>>(args.Body.Span, PlatformJsonSerializer.CurrentOptions.Value);
                    if (objectTypePayloadMessage != null)
                    {
                        using (logger.BeginScope(new Dictionary<string, object>()
                        {
                            {PlatformCommonApplicationUserContextKeys.RequestId, objectTypePayloadMessage.Identity?.RequestId},
                            {PlatformCommonApplicationUserContextKeys.UserId, objectTypePayloadMessage.Identity?.UserId}
                        }))
                        {
                            var canProcessConsumers = scope.ServiceProvider
                                .GetServices<IPlatformEventBusConsumer>()
                                .Where(p => p.CanProcess(PlatformEventBusMessageRoutingKey.New(args.RoutingKey)))
                                .ToList();

                            foreach (var consumer in canProcessConsumers)
                            {
                                if (options.LogProcessTime)
                                {
                                    LogInformation(
                                        message: "Begin processing message with routing key {RoutingKey} {DeliveryTag}",
                                        args: new object[] { args.RoutingKey, args.DeliveryTag });
                                }

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

                                object data = null;
                                try
                                {
                                    // Deserialize message into a type-safe type.
                                    data = JsonSerializer.Deserialize(
                                        args.Body.Span,
                                        messageForConsumerPayloadType,
                                        PlatformJsonSerializer.CurrentOptions.Value);
                                }
                                catch (Exception parseException)
                                {
                                    LogError(
                                        parseException,
                                        "RabbitMQ parsing error for the routing key {RoutingKey}. Body: {Message}",
                                        new object[] { args.RoutingKey, Encoding.UTF8.GetString(args.Body.Span) });
                                    continue;
                                }

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
                                    await (Task)methodInfo.Invoke(consumer, new[] { data });
                                }

                                if (options.LogProcessTime)
                                {
                                    LogInformation(
                                        message: "End processing message with routing key: {RoutingKey}. Delivery Tag: {DeliveryTag}. Message id {MessageId}",
                                        args: new object[] { args.RoutingKey, args.DeliveryTag, objectTypePayloadMessage.TrackingId ?? "n/a" });
                                }
                            }

                            // Clear to prevent memory leak
                            canProcessConsumers.Clear();
                        }
                    }

                    // Ack the message.
                    currentChannel.BasicAck(args.DeliveryTag, false);
                }
            }
            catch (Exception ex)
            {
                LogError(ex, "RabbitMQ processing error for the routing key: {RoutingKey}. Message: {Message}", new object[] { args.RoutingKey, Encoding.UTF8.GetString(args.Body.Span) });

                // Reject the message.
                currentChannel.BasicReject(args.DeliveryTag, false);
            }
            finally
            {
                if (options.LogProcessTime)
                {
                    stopwatch?.Stop();

                    LogInformation(
                        message: "End processing message with routing key: {RoutingKey}. Delivery Tag: {DeliveryTag}. Elapsed {ElapsedMilliseconds} in milliseconds.",
                        args: new object[] { args.RoutingKey, args.DeliveryTag, stopwatch?.ElapsedMilliseconds ?? 0 });
                }
            }
        }
    }
}
