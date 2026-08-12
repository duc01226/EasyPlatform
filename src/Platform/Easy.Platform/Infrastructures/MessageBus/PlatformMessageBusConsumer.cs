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
    /// Main Entry Handle Method.
    /// <para>
    /// <b>IDEMPOTENCY CONTRACT (MANDATORY):</b> Implementations MUST be idempotent. Replays and concurrent
    /// duplicate invocations of the same message can occur and are an accepted operational mode of the platform:
    /// </para>
    /// <list type="bullet">
    /// <item><description>Inbox stale-recovery and wall-clock hard-timeout (see <c>PlatformInboxConfig.MaxProcessingDurationSeconds</c>)
    /// can re-pop a row whose original consumer task is still alive on the thread pool. The platform does not pass
    /// a <c>CancellationToken</c> into <c>HandleAsync</c>, so the orphan task is not stopped — two consumer
    /// instances may run in parallel for the same message until the orphan finishes.</description></item>
    /// <item><description>Bus redelivery on broker reconnect / nack can re-invoke the handler for an already-processed message.</description></item>
    /// </list>
    /// <para>
    /// Safe handler patterns: dedupe on a natural key, use upserts instead of inserts, guard side-effects
    /// (outbound calls, emitted events, balance mutations) with an idempotency key or a "already-done" check.
    /// </para>
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

    /// <summary>
    /// The single funnel every consume-failure log goes through — the retry sites in
    /// <c>PlatformMessageBusConsumer</c> and <c>PlatformApplicationBusMessageConsumer</c> all call THIS method, which is
    /// why it is the only correct place to decide what a failed consume may write.
    /// <para>
    /// <b>The message PAYLOAD is deliberately NOT logged.</b> This previously used the structured-logging destructure
    /// operator (<c>{@Message}</c>), which serializes the entire object graph of whatever failed. Bus messages routinely
    /// carry personal data — email addresses, names, attachment filenames, free-text bodies — so every consumer in every
    /// service emitted that data at ERROR level on any fault, to a sink with its own retention, entirely outside the
    /// reach of a right-to-erasure request. A per-consumer opt-out cannot fix it: the retry call sites are NOT gated by
    /// <c>LogErrorOnException</c>, so a consumer that declared itself quiet still leaked on the retry path.
    /// </para>
    /// <para>
    /// <b>Diagnosability is preserved, not traded away.</b> What a failed consume actually needs is which message, of
    /// which type, in which consumer, and why — so the log keeps the consumer type, the message type, the exception with
    /// its stack, and the message's IDENTITY (<c>TrackingId</c> plus creation time) when it is trackable. The TrackingId
    /// is the handle to the authoritative copy already persisted in the outbox/inbox store, so an operator can still
    /// retrieve the full payload deliberately, under whatever access control that store has, instead of finding it
    /// pre-copied into a log. The trace names causes and handles; the store holds content.
    /// </para>
    /// <para>
    /// A consumer that genuinely needs a specific field in its failure log should log that ONE field from its own
    /// handler, where the author can judge whether it is personal data. That is a deliberate, reviewable decision;
    /// destructuring the whole message was neither.
    /// </para>
    /// <para>
    /// Mechanically this is done with payload-free MESSAGE diagnostics (type name only) and bounded EXCEPTION
    /// diagnostics (type, message, demystified stack trace, inner type chain), both produced by
    /// <see cref="PlatformMessageBusDiagnosticFormatter" /> so this site emits the same shape as the inbox/outbox
    /// failure paths that share it. The two halves have deliberately different rules: the message body is business
    /// data with a safe alternative, the exception is often the only record of what went wrong.
    /// </para>
    /// </summary>
    /// <typeparam name="TMessage">The consumed message type.</typeparam>
    /// <param name="logger">Target logger.</param>
    /// <param name="consumerType">Consumer that failed.</param>
    /// <param name="message">The message being consumed; only its type reaches the log.</param>
    /// <param name="e">
    /// The RAW exception. Callers must pass it as-is — do NOT pre-transform it (for example with a stack-trace
    /// beautifier). This method decides what of the exception is safe to emit; handing it a pre-rendered exception
    /// only re-opens that decision at every call site, and a beautifier additionally MUTATES the exception, changing
    /// what an outer handler later logs.
    /// </param>
    /// <param name="prefix">Optional category prefix (for example <c>"Retry"</c>).</param>
    /// <remarks>
    /// The exception is NOT passed to <see cref="ILogger" /> as its exception argument. That is deliberate: doing so
    /// hands the logging pipeline the whole object graph — including <see cref="Exception.Data" /> and every inner
    /// exception's message — which routinely carries connection strings, tokens, and the entity values that caused
    /// the failure, and structured sinks expand all of it unbounded. Routing through
    /// <see cref="PlatformMessageBusDiagnosticFormatter" /> instead selects a bounded, deliberate subset: the
    /// exception's type, message, demystified stack trace, and inner TYPE names — enough to fix the failure — while
    /// the message payload stays a type name only.
    /// </remarks>
    public static void LogError<TMessage>(ILogger logger, Type consumerType, TMessage message, Exception e, string prefix = "")
        where TMessage : class, new()
    {
        // No null-conditional on `message`: the signature is non-nullable and every call site passes the message it just
        // failed to handle. `as` still guards the common case that a message type simply is not trackable.
        var trackable = message as IPlatformTrackableBusMessage;

        logger.LogError(
            "Error Consume message bus.{Prefix} [ConsumerType:{ConsumerType}]; [MessageType:{MessageType}]; "
            + "[TrackingId:{TrackingId}]; [MessageCreatedUtcDate:{MessageCreatedUtcDate}]; "
            + "[MessageDiagnostics:{MessageDiagnostics}]; [ExceptionDiagnostics:{ExceptionDiagnostics}]; "
            + "[Payload omitted — may contain personal data; retrieve by TrackingId from the outbox/inbox store];",
            prefix,
            consumerType.FullName,
            message.GetType().GetNameOrGenericTypeName(),
            trackable?.TrackingId,
            trackable?.CreatedUtcDate,
            PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(message),
            PlatformMessageBusDiagnosticFormatter.FormatException(e)
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
                            "[MessageBus] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. Consumer:{Consumer} MessageDiagnostics:{MessageDiagnostics}",
                            toCheckSlowProcessWarningTimeMilliseconds,
                            elapsedMilliseconds,
                            consumer.GetType().FullName,
                            PlatformMessageBusDiagnosticFormatter.FormatRuntimeMessage(busMessage)
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
                        // Log only after 75% of retry budget consumed. See Util.TaskRunner.LogErrorRetryThreshold.
                        if (retryAttempt > Util.TaskRunner.LogErrorRetryThreshold(RetryOnFailedTimes))
                            IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e, "Retry");
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
                IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e);
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
