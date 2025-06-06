#nullable enable

#region

using System.Diagnostics;
using System.Text.Json;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
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

    public static void LogError<TMessage>(
        ILogger logger,
        Type consumerType,
        TMessage message,
        Exception e,
        string prefix = "")
        where TMessage : class, new()
    {
        logger.LogError(
            e.BeautifyStackTrace(),
            "Error Consume message bus.{Prefix} [ConsumerType:{ConsumerType}]; [MessageType:{MessageType}]; [Message:{@Message}];",
            prefix,
            consumerType.FullName,
            message.GetType().GetNameOrGenericTypeName(),
            message);
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
        var consumerGenericType = consumerType
                                      .GetInterfaces()
                                      .FirstOrDefault(x => x.IsAssignableToGenericType(typeof(IPlatformMessageBusConsumer<>))) ??
                                  throw new Exception("Must be implementation of IPlatformMessageBusConsumer<>");

        return IPlatformMessageBusConsumer.GetMessageTypeOfConsumerGenericType(consumerGenericType);
    }

    public static async Task InvokeConsumerAsync(
        IPlatformMessageBusConsumer consumer,
        object busMessage,
        string routingKey,
        IPlatformMessageBusConfig messageBusConfig,
        ILogger? logger = null)
    {
        if (messageBusConfig.EnableLogConsumerProcessTime && !consumer.DisableSlowProcessWarning())
        {
            await Util.TaskRunner.ProfileExecutionAsync(
                asyncTask: () => DoInvokeConsumer(consumer, busMessage, routingKey),
                afterExecution: elapsedMilliseconds =>
                {
                    var toCheckSlowProcessWarningTimeMilliseconds = consumer.SlowProcessWarningTimeMilliseconds() ??
                                                                    messageBusConfig.LogSlowProcessWarningTimeMilliseconds;
                    if (elapsedMilliseconds >= toCheckSlowProcessWarningTimeMilliseconds)
                    {
                        logger?.LogWarning(
                            "[MessageBus] SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. ElapsedMilliseconds:{ElapsedMilliseconds}. Consumer:{Consumer} BusMessage:{@BusMessage}",
                            toCheckSlowProcessWarningTimeMilliseconds,
                            elapsedMilliseconds,
                            consumer.GetType().FullName,
                            busMessage);
                    }
                });
        }
        else
            await DoInvokeConsumer(consumer, busMessage, routingKey);
    }

    private static async Task DoInvokeConsumer(
        IPlatformMessageBusConsumer consumer,
        object eventBusMessage,
        string routingKey)
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

            if (!NoNeedCheckHandleWhen && !await CheckHandleWhen(message, routingKey)) return;

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
                    });
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
