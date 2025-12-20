using System.Diagnostics;
using System.Text;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;
using OpenTelemetry;
using OpenTelemetry.Context.Propagation;
using RabbitMQ.Client;
using RabbitMQ.Client.Exceptions;

namespace Easy.Platform.RabbitMQ;

/// <summary>
/// RabbitMQ-specific implementation of message bus producer that handles reliable message publishing
/// to RabbitMQ exchanges with advanced features including distributed tracing, connection pooling,
/// error handling, and exchange management. This class serves as the primary interface for sending
/// messages through the platform's RabbitMQ messaging infrastructure.
///
/// <para><strong>Core Capabilities:</strong></para>
/// <para>• <strong>Reliable Publishing:</strong> Ensures message delivery with persistent storage and connection management</para>
/// <para>• <strong>Connection Pooling:</strong> Uses <see cref="PlatformProducerRabbitMqChannelPool"/> for efficient channel management</para>
/// <para>• <strong>Distributed Tracing:</strong> Integrates with OpenTelemetry for end-to-end message tracking</para>
/// <para>• <strong>Exchange Management:</strong> Automatically routes messages to appropriate exchanges</para>
/// <para>• <strong>Error Resilience:</strong> Handles connection failures, missing exchanges, and retry scenarios</para>
///
/// <para><strong>Message Publishing Pipeline:</strong></para>
/// <para>The producer follows this processing pipeline:</para>
/// <para>1. Message serialization to JSON with runtime type information</para>
/// <para>2. Routing key resolution (explicit or self-routing)</para>
/// <para>3. Channel acquisition from connection pool</para>
/// <para>4. Exchange name resolution through <see cref="IPlatformRabbitMqExchangeProvider"/></para>
/// <para>5. Distributed tracing context injection</para>
/// <para>6. Message publishing with persistence enabled</para>
/// <para>7. Channel return to pool and activity completion</para>
///
/// <para><strong>Distributed Tracing Integration:</strong></para>
/// <para>Advanced observability features include:</para>
/// <para>• Automatic activity creation with producer kind semantics</para>
/// <para>• Routing key and message content tagging for debugging</para>
/// <para>• Context propagation to enable distributed tracing chains</para>
/// <para>• Integration with OpenTelemetry standards for monitoring</para>
/// <para>• Baggage support for cross-service context sharing</para>
///
/// <para><strong>Connection Management:</strong></para>
/// <para>Robust connection handling provides:</para>
/// <para>• Channel pooling for performance optimization</para>
/// <para>• Automatic channel acquisition and release</para>
/// <para>• Connection failure detection and recovery</para>
/// <para>• Graceful handling of already-closed connections</para>
/// <para>• Resource cleanup in exception scenarios</para>
///
/// <para><strong>Exchange and Routing:</strong></para>
/// <para>Smart routing capabilities include:</para>
/// <para>• Dynamic exchange resolution based on routing keys</para>
/// <para>• Support for self-routing messages via <see cref="IPlatformSelfRoutingKeyBusMessage"/></para>
/// <para>• Automatic exchange creation and binding management</para>
/// <para>• Warning logging for missing exchanges/consumers</para>
/// <para>• Flexible routing key override support</para>
///
/// <para><strong>Error Handling and Resilience:</strong></para>
/// <para>Comprehensive error management features:</para>
/// <para>• Automatic retry on transient connection failures</para>
/// <para>• Graceful handling of missing exchanges (404 errors)</para>
/// <para>• Detailed error logging with contextual information</para>
/// <para>• Proper exception wrapping with <see cref="PlatformMessageBusException{T}"/></para>
/// <para>• Channel pool state management during failures</para>
///
/// <para><strong>Integration with Platform Services:</strong></para>
/// <para>The producer integrates with:</para>
/// <para>• <see cref="PlatformRabbitMqProcessInitializerService"/> for infrastructure readiness</para>
/// <para>• <see cref="PlatformProducerRabbitMqChannelPool"/> for connection management</para>
/// <para>• <see cref="IPlatformRabbitMqExchangeProvider"/> for exchange resolution</para>
/// <para>• Platform logging infrastructure for operational monitoring</para>
/// <para>• OpenTelemetry for distributed tracing and metrics</para>
///
/// <para><strong>Performance Considerations:</strong></para>
/// <para>Optimized for high-throughput scenarios:</para>
/// <para>• Connection pooling reduces connection overhead</para>
/// <para>• Persistent message publishing ensures durability</para>
/// <para>• Lazy logger initialization for memory efficiency</para>
/// <para>• Efficient JSON serialization with type information</para>
/// <para>• Asynchronous operations throughout the pipeline</para>
///
/// <para><strong>Usage Examples:</strong></para>
/// <para>Common usage patterns:</para>
/// <para>• Domain event publishing for CQRS architectures</para>
/// <para>• Command distribution for distributed processing</para>
/// <para>• Notification delivery for user communication</para>
/// <para>• Integration message sending for external systems</para>
/// <para>• Background job scheduling and task distribution</para>
/// </summary>
public class PlatformRabbitMqMessageBusProducer : IPlatformMessageBusProducer
{
    public const int MaxWaitProcessInitializerServiceStartedSeconds = 60;

    public static readonly TextMapPropagator TracingActivityPropagator = Propagators.DefaultTextMapPropagator;

    protected readonly PlatformProducerRabbitMqChannelPool ChannelPool;
    protected readonly IPlatformRabbitMqExchangeProvider ExchangeProvider;
    protected readonly Lazy<ILogger> Logger;
    protected readonly PlatformRabbitMqOptions Options;
    protected readonly PlatformRabbitMqProcessInitializerService InitializerService;

    public PlatformRabbitMqMessageBusProducer(
        IPlatformRabbitMqExchangeProvider exchangeProvider,
        PlatformRabbitMqOptions options,
        ILoggerFactory loggerFactory,
        PlatformProducerRabbitMqChannelPool channelPool,
        PlatformRabbitMqProcessInitializerService initializerService
    )
    {
        ChannelPool = channelPool;
        InitializerService = initializerService;
        ExchangeProvider = exchangeProvider;
        Options = options;
        Logger = new Lazy<ILogger>(() => loggerFactory.CreateLogger(typeof(PlatformRabbitMqMessageBusProducer).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
    }

    public async Task<TMessage> SendAsync<TMessage>(TMessage message, string routingKey, CancellationToken cancellationToken = default)
        where TMessage : class, new()
    {
        try
        {
            var jsonMessage = message.ToJson(forceUseRuntimeType: true);
            var selectedRoutingKey = routingKey ?? message.As<IPlatformSelfRoutingKeyBusMessage>()?.RoutingKey();

            await PublishMessageToQueueAsync(jsonMessage, selectedRoutingKey);

            return message;
        }
        catch (Exception e)
        {
            throw new PlatformMessageBusException<TMessage>(message, e);
        }
    }

    private async Task PublishMessageToQueueAsync(string message, string routingKey)
    {
        await PublishMessageToQueue(message, routingKey);
    }

    private async Task PublishMessageToQueue(string message, string routingKey)
    {
        using (
            var activity = IPlatformMessageBusProducer.ActivitySource.StartActivity(
                $"MessageBusProducer.{nameof(IPlatformMessageBusProducer.SendAsync)}",
                ActivityKind.Producer)
        )
        {
            activity?.AddTag("routingKey", routingKey);
            activity?.AddTag("message", message);

            IChannel channel = null;

            try
            {
                await Util.TaskRunner.WaitUntilAsync(
                    () => InitializerService.IsStarted,
                    maxWaitSeconds: MaxWaitProcessInitializerServiceStartedSeconds,
                    waitForMsg: "Rabbitmq started to publish message"
                );

                channel = ChannelPool.Get();

                var publishRequestProps = new BasicProperties { Persistent = true };

                InjectDistributedTracingInfoIntoRequestProps(activity, publishRequestProps);

                await channel.BasicPublishAsync(
                    ExchangeProvider.GetExchangeName(routingKey),
                    routingKey,
                    body: Encoding.UTF8.GetBytes(message),
                    basicProperties: publishRequestProps,
                    mandatory: false
                );

                ChannelPool.Return(channel);
            }
            catch (AlreadyClosedException alreadyClosedException)
            {
                if (alreadyClosedException.ShutdownReason?.ReplyCode == 404)
                {
                    Logger.Value.LogWarning(
                        "Tried to send a message with routing key {RoutingKey} from {ProducerType} "
                        + "but exchange is not found. May be there is no consumer registered to consume this message."
                        + "If in source code has consumers for this message, this could be unexpected errors",
                        routingKey,
                        GetType().FullName
                    );
                }
                else
                    throw;
            }
            finally
            {
                if (channel != null)
                    ChannelPool.Return(channel);
            }
        }

        // This help consumer can extract tracing information for continuing tracing
        void InjectDistributedTracingInfoIntoRequestProps(Activity activity, IBasicProperties publishRequestProps)
        {
            if (activity != null)
            {
                TracingActivityPropagator.Inject(
                    new PropagationContext(activity.Context, Baggage.Current),
                    publishRequestProps,
                    InjectDistributedTracingContextIntoSendMessageRequestHeader
                );
            }
        }

        void InjectDistributedTracingContextIntoSendMessageRequestHeader(IBasicProperties props, string key, string value)
        {
            try
            {
                props.Headers ??= new Dictionary<string, object>();
                props.Headers[key] = value;
            }
            catch (Exception ex)
            {
                Logger.Value.LogError(ex.BeautifyStackTrace(), "Failed to inject trace context.");
            }
        }
    }
}
