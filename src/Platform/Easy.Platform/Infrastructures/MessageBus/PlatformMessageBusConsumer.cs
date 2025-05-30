#nullable enable

#region

using System.Diagnostics;
using System.Text.Json;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Infrastructures.MessageBus;

public interface IPlatformMessageBusConsumer
{
    public bool NoNeedCheckHandleWhen { get; set; }

    /// <summary>
    /// Main Entry Handle Method
    /// </summary>
    Task HandleAsync(object message, string routingKey);

    /// <summary>
    /// Main handle logic only method of the consumer
    /// </summary>
    Task HandleLogicAsync(object message, string routingKey);

    /// <summary>
    /// Config the time in milliseconds to log warning if the process consumer time is over ProcessWarningTimeMilliseconds.
    /// </summary>
    long? SlowProcessWarningTimeMilliseconds();

    bool DisableSlowProcessWarning();

    /// <summary>
    /// Default is 0. Return bigger number order to execute it later by order ascending
    /// </summary>
    int ExecuteOrder();

    public Task<bool> HandleWhen(object message, string routingKey);

    public static PlatformBusMessageRoutingKey BuildForConsumerDefaultBindingRoutingKey(Type consumerGenericType)
    {
        var messageType = GetMessageTypeOfConsumerGenericType(consumerGenericType);

        return PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(messageType);
    }

    public static Type GetMessageTypeOfConsumerGenericType(Type consumerGenericType)
    {
        return consumerGenericType.GetGenericArguments()[0];
    }

    public static void LogError<TMessage>(ILogger logger, Type consumerType, TMessage message, Exception e, string prefix = "")
        where TMessage : class, new()
    {
        logger.LogError(
            e.BeautifyStackTrace(),
            "Error Consume message bus.{Prefix} [ConsumerType:{ConsumerType}]; [MessageType:{MessageType}]; [Message:{@Message}];",
            prefix,
            consumerType.FullName,
            message.GetType().GetNameOrGenericTypeName(),
            message
        );
    }
}

public interface IPlatformMessageBusConsumer<in TMessage> : IPlatformMessageBusConsumer
    where TMessage : class, new()
{
    /// <summary>
    /// Main Entry Handle Method
    /// </summary>
    Task HandleAsync(TMessage message, string routingKey);

    /// <summary>
    /// This method is executed in <see cref="HandleAsync" /> when conditional logic is met
    /// </summary>
    Task ExecuteHandleLogicAsync(TMessage message, string routingKey);

    /// <summary>
    /// Main handle logic only method of the consumer
    /// </summary>
    Task HandleLogicAsync(TMessage message, string routingKey);

    public Task<bool> HandleWhen(TMessage message, string routingKey);
}

/// <summary>
/// Abstract base class providing foundational infrastructure for message bus consumer implementations in the platform.
/// This class serves as the core building block for all message processing consumers, offering essential
/// functionality for message handling, error management, performance monitoring, and integration with the
/// platform's messaging infrastructure.
///
/// <para><strong>Core Responsibilities:</strong></para>
/// <para>• <strong>Message Processing:</strong> Provides standardized message handling pipeline with validation and routing</para>
/// <para>• <strong>Error Management:</strong> Implements retry mechanisms, error logging, and exception handling strategies</para>
/// <para>• <strong>Performance Monitoring:</strong> Tracks processing times and provides slow process warnings</para>
/// <para>• <strong>Conditional Logic:</strong> Supports conditional message processing through HandleWhen implementations</para>
/// <para>• <strong>Lifecycle Management:</strong> Manages consumer lifecycle hooks and execution order</para>
///
/// <para><strong>Usage in Platform Architecture:</strong></para>
/// <para>This base class is extended by specialized consumer types:</para>
/// <para>• <see cref="PlatformApplicationMessageBusConsumer{TMessage}"/> for application-level message processing</para>
/// <para>• Custom consumer implementations for specific business logic requirements</para>
/// <para>• Integration consumers for external system communication</para>
/// <para>• Event-driven consumers for domain event processing</para>
///
/// <para><strong>Integration Points:</strong></para>
/// <para>The consumer integrates with:</para>
/// <para>• Message Bus Infrastructure for receiving and acknowledging messages</para>
/// <para>• Logging system for operational monitoring and debugging</para>
/// <para>• Performance monitoring for tracking processing metrics</para>
/// <para>• Error handling infrastructure for retry and dead letter processing</para>
///
/// <para><strong>Implementation Guidelines:</strong></para>
/// <para>When extending this class:</para>
/// <para>• Implement <see cref="HandleLogicAsync"/> with your core business logic</para>
/// <para>• Override <see cref="HandleWhen"/> to define when messages should be processed</para>
/// <para>• Configure retry behavior through RetryOnFailedTimes and related properties</para>
/// <para>• Use SlowProcessWarningTimeMilliseconds for performance monitoring</para>
/// </summary>
public abstract class PlatformMessageBusConsumer : IPlatformMessageBusConsumer
{
    public abstract Task HandleAsync(object message, string routingKey);

    public abstract Task HandleLogicAsync(object message, string routingKey);

    public virtual long? SlowProcessWarningTimeMilliseconds()
    {
        return PlatformMessageBusConfig.DefaultProcessWarningTimeMilliseconds;
    }

    public virtual bool DisableSlowProcessWarning()
    {
        return false;
    }

    public virtual int ExecuteOrder()
    {
        return 0;
    }

    public abstract Task<bool> HandleWhen(object message, string routingKey);

    public bool NoNeedCheckHandleWhen { get; set; }

    public virtual JsonSerializerOptions? CustomJsonSerializerOptions()
    {
        return null;
    }

    /// <summary>
    /// Get <see cref="PlatformBusMessage{TPayload}" /> concrete message type from a consumer type. Type must be assignable to <see cref="IPlatformMessageBusConsumer" />
    /// <br />
    /// Get a generic type: PlatformEventBusMessage{TMessage} where TMessage = TMessagePayload
    /// of IPlatformEventBusConsumer{TMessagePayload}
    /// </summary>
    public static Type GetConsumerMessageType(Type consumerType)
    {
        var consumerGenericType =
            consumerType.GetInterfaces().FirstOrDefault(x => x.IsAssignableToGenericType(typeof(IPlatformMessageBusConsumer<>)))
            ?? throw new Exception("Must be implementation of IPlatformMessageBusConsumer<>");

        return IPlatformMessageBusConsumer.GetMessageTypeOfConsumerGenericType(consumerGenericType);
    }

    public static async Task InvokeConsumerAsync(
        IPlatformMessageBusConsumer consumer,
        object busMessage,
        string routingKey,
        IPlatformMessageBusConfig messageBusConfig,
        ILogger? logger = null
    )
    {
        if (messageBusConfig.EnableLogConsumerProcessTime && !consumer.DisableSlowProcessWarning())
        {
            await Util.TaskRunner.ProfileExecutionAsync(
                asyncTask: () => DoInvokeConsumer(consumer, busMessage, routingKey),
                afterExecution: elapsedMilliseconds =>
                {
                    var toCheckSlowProcessWarningTimeMilliseconds =
                        consumer.SlowProcessWarningTimeMilliseconds() ?? messageBusConfig.LogSlowProcessWarningTimeMilliseconds;
                    if (elapsedMilliseconds >= toCheckSlowProcessWarningTimeMilliseconds)
                    {
                        logger?.LogWarning(
                            "[MessageBus] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. Consumer:{Consumer} BusMessage:{@BusMessage}",
                            toCheckSlowProcessWarningTimeMilliseconds,
                            elapsedMilliseconds,
                            consumer.GetType().FullName,
                            busMessage
                        );
                    }
                }
            );
        }
        else
            await DoInvokeConsumer(consumer, busMessage, routingKey);
    }

    private static async Task DoInvokeConsumer(IPlatformMessageBusConsumer consumer, object eventBusMessage, string routingKey)
    {
        try
        {
            await consumer.HandleAsync(eventBusMessage, routingKey);
        }
        catch (Exception e)
        {
            throw new PlatformInvokeConsumerException(e, consumer.GetType().FullName, eventBusMessage);
        }
    }
}

/// <summary>
/// Generic abstract base class for strongly-typed message bus consumers that process specific message types.
/// This class extends <see cref="PlatformMessageBusConsumer"/> to provide type-safe message processing
/// with built-in support for retry mechanisms, error handling, logging, and conditional processing logic.
///
/// <para><strong>Type Safety and Performance:</strong></para>
/// <para>• <strong>Strongly Typed:</strong> Eliminates casting errors and provides compile-time type checking</para>
/// <para>• <strong>Performance Optimized:</strong> Reduces reflection overhead through generic type constraints</para>
/// <para>• <strong>IntelliSense Support:</strong> Provides full IDE support for message properties and methods</para>
/// <para>• <strong>Serialization Aware:</strong> Handles message serialization/deserialization automatically</para>
///
/// <para><strong>Processing Pipeline:</strong></para>
/// <para>The consumer executes the following processing pipeline:</para>
/// <para>1. <see cref="BeforeHandleAsync"/> - Pre-processing hook for setup and validation</para>
/// <para>2. <see cref="CheckHandleWhen"/> - Conditional logic to determine if message should be processed</para>
/// <para>3. <see cref="BeforeExecuteHandleLogicAsync"/> - Immediate pre-execution hook</para>
/// <para>4. <see cref="ExecuteHandleLogicAsync"/> - Core business logic execution (with retry if enabled)</para>
/// <para>5. Error handling and logging if exceptions occur</para>
///
/// <para><strong>Retry and Resilience:</strong></para>
/// <para>Built-in retry mechanisms provide resilience against transient failures:</para>
/// <para>• <see cref="RetryOnFailedTimes"/> configures the number of retry attempts</para>
/// <para>• <see cref="RetryOnFailedDelaySeconds"/> sets the base delay between retries</para>
/// <para>• <see cref="MaxRetryOnFailedDelaySeconds"/> limits the maximum retry delay</para>
/// <para>• Exponential backoff strategy helps reduce system load during failures</para>
///
/// <para><strong>Logging and Monitoring:</strong></para>
/// <para>Comprehensive logging and monitoring capabilities:</para>
/// <para>• Automatic error logging with contextual information</para>
/// <para>• Performance tracking and slow process warnings</para>
/// <para>• Retry attempt logging for operational visibility</para>
/// <para>• Integration with platform monitoring infrastructure</para>
///
/// <para><strong>Usage Examples:</strong></para>
/// <para>Common implementation patterns:</para>
/// <para>• Domain event consumers for handling business events</para>
/// <para>• Integration consumers for external system communication</para>
/// <para>• Notification consumers for user communication</para>
/// <para>• Data processing consumers for background operations</para>
///
/// <para><strong>Extension Points:</strong></para>
/// <para>Override these virtual methods to customize behavior:</para>
/// <para>• <see cref="HandleLogicAsync"/> - Implement your core business logic</para>
/// <para>• <see cref="HandleWhen"/> - Define conditional processing logic</para>
/// <para>• <see cref="BeforeHandleAsync"/> - Add pre-processing logic</para>
/// <para>• <see cref="BeforeExecuteHandleLogicAsync"/> - Add immediate pre-execution logic</para>
/// </summary>
/// <typeparam name="TMessage">The specific message type this consumer processes. Must be a class with a parameterless constructor.</typeparam>
public abstract class PlatformMessageBusConsumer<TMessage> : PlatformMessageBusConsumer, IPlatformMessageBusConsumer<TMessage>
    where TMessage : class, new()
{
    protected readonly ILoggerFactory LoggerFactory;
    private readonly Lazy<ILogger> loggerLazy;

    private bool? cachedCheckHandleWhen;

    protected PlatformMessageBusConsumer(ILoggerFactory loggerFactory)
    {
        LoggerFactory = loggerFactory;
        loggerLazy = new Lazy<ILogger>(() => CreateLogger(loggerFactory, GetType()));
    }

    protected ILogger Logger => loggerLazy.Value;

    public virtual int RetryOnFailedTimes { get; set; } = Util.TaskRunner.DefaultResilientRetryCount;

    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    public virtual double MaxRetryOnFailedDelaySeconds { get; set; } = 60;

    public virtual bool LogErrorOnException => true;

    public override async Task HandleAsync(object message, string routingKey)
    {
        await HandleAsync(message.Cast<TMessage>(), routingKey);
    }

    public override Task HandleLogicAsync(object message, string routingKey)
    {
        return HandleLogicAsync(message.Cast<TMessage>(), routingKey);
    }

    public virtual async Task HandleAsync(TMessage message, string routingKey)
    {
        try
        {
            await BeforeHandleAsync(message, routingKey);

            if (!NoNeedCheckHandleWhen && !await CheckHandleWhen(message, routingKey))
                return;

            await BeforeExecuteHandleLogicAsync(message, routingKey);

            if (ShouldExecuteHandleLogicInRetry())
            {
                // Retry RetryOnFailedTimes to help resilient consumer. Sometime parallel, create/update concurrency could lead to error
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    async () => await ExecuteHandleLogicAsync(message, routingKey),
                    retryCount: RetryOnFailedTimes,
                    sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
                    onRetry: (e, delayTime, retryAttempt, context) =>
                    {
                        if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                            IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e.BeautifyStackTrace(), "Retry");
                    },
                    ignoreExceptionTypes: [typeof(IPlatformValidationException)]
                );
            }
            else
                await ExecuteHandleLogicAsync(message, routingKey);
        }
        catch (Exception e)
        {
            if (LogErrorOnException)
                IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e.BeautifyStackTrace());
            throw;
        }
    }

    public abstract Task HandleLogicAsync(TMessage message, string routingKey);

    public virtual Task ExecuteHandleLogicAsync(TMessage message, string routingKey)
    {
        return HandleLogicAsync(message, routingKey);
    }

    public virtual async Task<bool> HandleWhen(TMessage message, string routingKey)
    {
        return true;
    }

    public override async Task<bool> HandleWhen(object message, string routingKey)
    {
        return await HandleWhen(message.Cast<TMessage>(), routingKey);
    }

    protected virtual bool ShouldExecuteHandleLogicInRetry() => true;

    public virtual Task BeforeExecuteHandleLogicAsync(TMessage message, string routingKey)
    {
        return Task.CompletedTask;
    }

    public virtual Task BeforeHandleAsync(TMessage message, string routingKey)
    {
        return Task.CompletedTask;
    }

    protected async Task<bool> CheckHandleWhen(TMessage message, string routingKey)
    {
        return cachedCheckHandleWhen ??= await HandleWhen(message, routingKey);
    }

    public static ILogger CreateLogger(ILoggerFactory loggerFactory, Type type)
    {
        return loggerFactory.CreateLogger(typeof(PlatformMessageBusConsumer).GetNameOrGenericTypeName() + $"-{type.Name}");
    }

    public ILogger CreateLogger()
    {
        return CreateLogger(LoggerFactory, GetType());
    }
}
