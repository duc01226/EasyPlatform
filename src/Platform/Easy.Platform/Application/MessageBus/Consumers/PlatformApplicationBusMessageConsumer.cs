#region

using System.Diagnostics;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.Consumers;

/// <summary>
/// Represents a message bus consumer for platform applications.
/// This interface extends the <see cref="IPlatformMessageBusConsumer" /> interface with additional properties and methods
/// specific to handling inbox messages.
/// </summary>
public interface IPlatformApplicationMessageBusConsumer : IPlatformMessageBusConsumer
{
    public const string RequestContextConsumerPipeLineKey = "ConsumerPipeLine";

    /// <summary>
    /// Gets or sets the message to be handled if it exists in the inbox.
    /// </summary>
    public PlatformInboxBusMessage HandleExistingInboxMessage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the processed inbox event message should be automatically deleted.
    /// </summary>
    public bool AutoDeleteProcessedInboxEventMessageImmediately { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether if you need to check any consumer other previous not processed inbox message before processing. Default is true
    /// </summary>
    public bool NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the instance is called to execute handling logic for an inbox message.
    /// </summary>
    public bool IsHandlingLogicForInboxMessage { get; set; }

    public bool HasErrorAndShouldNeverRetry { get; set; }
}

/// <summary>
/// Represents a message bus consumer for platform applications that handles messages of a specific type.
/// This interface extends the <see cref="IPlatformMessageBusConsumer{TMessage}" /> and <see cref="IPlatformApplicationMessageBusConsumer" /> interfaces.
/// </summary>
/// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
public interface IPlatformApplicationMessageBusConsumer<in TMessage> : IPlatformMessageBusConsumer<TMessage>, IPlatformApplicationMessageBusConsumer
    where TMessage : class, new()
{
    public Task HandleMessageDirectly(TMessage message, string routingKey, int? retryCount = null);
}

/// <summary>
/// An abstract base class for platform application message bus consumers that handle messages of a specific type.
/// This class provides common functionality for handling inbox messages and managing units of work.
/// </summary>
/// <typeparam name="TMessage">The type of the message being consumed.</typeparam>
public abstract class PlatformApplicationMessageBusConsumer<TMessage> : PlatformMessageBusConsumer<TMessage>, IPlatformApplicationMessageBusConsumer<TMessage>
    where TMessage : class, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformApplicationMessageBusConsumer{TMessage}" /> class.
    /// </summary>
    /// <param name="loggerFactory">A factory for creating loggers.</param>
    /// <param name="uowManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider for the current scope.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformApplicationMessageBusConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager uowManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(loggerFactory)
    {
        UnitOfWorkManager = uowManager;
        ServiceProvider = serviceProvider;
        RootServiceProvider = rootServiceProvider;
        InboxBusMessageRepo = serviceProvider.GetService<IPlatformInboxBusMessageRepository>();
        InboxConfig = serviceProvider.GetRequiredService<PlatformInboxConfig>();
        RequestContextAccessor = ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
        ApplicationSettingContext = rootServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    public override bool LogErrorOnException => HandleExistingInboxMessage == null && !IsHandlingLogicForInboxMessage;

    protected IPlatformInboxBusMessageRepository InboxBusMessageRepo { get; }
    protected PlatformInboxConfig InboxConfig { get; }
    protected IPlatformRootServiceProvider RootServiceProvider { get; }
    protected IServiceProvider ServiceProvider { get; }
    protected IPlatformUnitOfWorkManager UnitOfWorkManager { get; }

    /// <summary>
    /// Gets a value indicating whether to automatically open a unit of work when handling a message.
    /// </summary>
    public virtual bool AutoOpenUow => true;

    /// <summary>
    /// Gets the request context accessor.
    /// </summary>
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor { get; }

    /// <summary>
    /// Gets the application setting context.
    /// </summary>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets a value indicating whether to allow the use of inbox messages. Default is True. Set to False to consume messages directly without using the inbox.
    /// </summary>
    public virtual bool AllowUseInboxMessage => true;

    public bool AllowHandleNewInboxMessageInBackground { get; set; } = false;

    /// <inheritdoc />
    public bool NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage { get; set; } = true;

    /// <inheritdoc />
    public PlatformInboxBusMessage HandleExistingInboxMessage { get; set; }

    /// <inheritdoc />
    public bool AutoDeleteProcessedInboxEventMessageImmediately { get; set; } = false;

    /// <inheritdoc />
    public bool IsHandlingLogicForInboxMessage { get; set; }

    public bool HasErrorAndShouldNeverRetry { get; set; }

    /// <summary>
    /// Executes the message handling logic, either using the inbox pattern or directly.
    /// </summary>
    /// <param name="message">The message being consumed.</param>
    /// <param name="routingKey">The routing key of the message.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public override Task ExecuteHandleLogicAsync(TMessage message, string routingKey)
    {
        // If the inbox pattern is enabled and allowed, handle the message using the inbox pattern.
        // Otherwise, handle the message directly.
        return InboxBusMessageRepo != null && AllowUseInboxMessage && !IsHandlingLogicForInboxMessage
            ? HandleExecutingInboxConsumerAsync(message, routingKey)
            : HandleMessageDirectly(message, routingKey);
    }

    public async Task HandleMessageDirectly(TMessage message, string routingKey, int? retryCount = null)
    {
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(HandleMessageDirectly));

        // Update the request context with information from the message.
        if (message is IPlatformTrackableBusMessage trackableBusMessage)
        {
            RequestContextAccessor.Current.SetValues(trackableBusMessage.RequestContext);

            ProcessConsumerPipeLineInRequestContextAndEnsureNoCircularPipeLine(trackableBusMessage, routingKey);
        }

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync<PlatformDomainRowVersionConflictException>(
            async () =>
            {
                try
                {
                    // If auto-opening a unit of work is enabled, handle the message within a unit of work.
                    if (AutoOpenUow)
                        await UnitOfWorkManager.ExecuteUowTask(() => HandleLogicAsync(message, routingKey));
                    else
                    {
                        await HandleLogicAsync(message, routingKey);

                        await UnitOfWorkManager.TryCurrentActiveUowSaveChangesAsync();
                    }
                }
                finally
                {
                    // If garbage collection is enabled, perform garbage collection.
                    ApplicationSettingContext.ProcessAutoGarbageCollect();
                }
            },
            retryCount: retryCount ?? RetryOnFailedTimes,
            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
            onRetry: (e, delayTime, retryAttempt, context) =>
            {
                if (retryAttempt > 1)
                    IPlatformMessageBusConsumer.LogError(Logger, GetType(), message, e.BeautifyStackTrace(), "Retry");
            });

        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(HandleMessageDirectly));
    }

    private void ProcessConsumerPipeLineInRequestContextAndEnsureNoCircularPipeLine(IPlatformTrackableBusMessage trackableBusMessage, string routingKey)
    {
        var requestContextConsumerPipeLine =
            RequestContextAccessor.Current.GetValue<List<string>>(IPlatformApplicationMessageBusConsumer.RequestContextConsumerPipeLineKey) ?? [];

        // Prevent: A => [B, B => C, B => C => D] => A.
        if (requestContextConsumerPipeLine.Count >= 4)
        {
            // p => p.Take(p.Count - 1).Count(p => p == routingKey) >= 2 => circular 2 times => could be forever
            requestContextConsumerPipeLine
                .ValidateNot(
                    mustNot: p => p.Take(p.Count - 1).Count(p => p == routingKey) >= 2,
                    $"The current [RequestContextConsumerPipeLine:{requestContextConsumerPipeLine.ToJson()}] lead to {routingKey} has circular call error.")
                .EnsureValid();
        }

        if (requestContextConsumerPipeLine.LastOrDefault() != routingKey)
            requestContextConsumerPipeLine.Add(routingKey);

        trackableBusMessage.RequestContext.Upsert(IPlatformApplicationMessageBusConsumer.RequestContextConsumerPipeLineKey, requestContextConsumerPipeLine);
        RequestContextAccessor.Current.Upsert(IPlatformApplicationMessageBusConsumer.RequestContextConsumerPipeLineKey, requestContextConsumerPipeLine);
    }

    private Task HandleExecutingInboxConsumerAsync(TMessage message, string routingKey)
    {
        return PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
            RootServiceProvider,
            currentScopeServiceProvider: ServiceProvider,
            consumerType: GetType(),
            inboxBusMessageRepository: InboxBusMessageRepo,
            inboxConfig: InboxConfig,
            applicationSettingContext: ApplicationSettingContext,
            message: message,
            forApplicationName: ApplicationSettingContext.ApplicationName,
            routingKey: routingKey,
            loggerFactory: CreateLogger,
            retryProcessFailedMessageInSecondsUnit: InboxConfig.RetryProcessFailedMessageInSecondsUnit,
            handleExistingInboxMessage: HandleExistingInboxMessage,
            currentScopeConsumerInstance: this,
            handleInUow: null,
            subQueueMessageIdPrefix: message.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix(),
            autoDeleteProcessedMessageImmediately: AutoDeleteProcessedInboxEventMessageImmediately,
            needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: NeedToCheckAnySameConsumerOtherPreviousNotProcessedInboxMessage,
            allowHandleNewInboxMessageInBackground: AllowHandleNewInboxMessageInBackground);
    }
}
