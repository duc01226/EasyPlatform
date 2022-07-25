using Easy.Platform.Application.Context;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Hosting;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Polly;

namespace Easy.Platform.Application.MessageBus.InboxPattern;

public abstract class PlatformConsumeInboxBusMessageHostedService : PlatformIntervalProcessHostedService
{
    private readonly IPlatformApplicationSettingContext applicationSettingContext;

    private bool isProcessing;

    protected PlatformConsumeInboxBusMessageHostedService(
        IHostApplicationLifetime applicationLifetime,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        IPlatformMessageBusManager messageBusManager) : base(applicationLifetime, loggerFactory)
    {
        ServiceProvider = serviceProvider;
        this.applicationSettingContext = applicationSettingContext;
        ConsumerByNameToTypeDic = messageBusManager
            .AllDefinedMessageBusConsumerTypes()
            .ToDictionary(PlatformInboxMessageBusConsumerHelper.GetConsumerByValue);
    }

    protected IServiceProvider ServiceProvider { get; }

    protected Dictionary<string, Type> ConsumerByNameToTypeDic { get; }

    public static bool MatchImplementation(ServiceDescriptor serviceDescriptor)
    {
        return MatchImplementation(serviceDescriptor.ImplementationType) ||
               MatchImplementation(serviceDescriptor.ImplementationInstance?.GetType());
    }

    public static bool MatchImplementation(Type implementationType)
    {
        return implementationType?.IsAssignableTo(
                   typeof(PlatformConsumeInboxBusMessageHostedService)) ==
               true;
    }

    protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
    {
        if (!ApplicationStartedAndRunning || !HasInboxEventBusMessageRepositoryRegistered() || isProcessing)
            return;

        isProcessing = true;

        try
        {
            // WHY: Retry in case of the database is not started, initiated or restarting
            await Policy.Handle<Exception>()
                .WaitAndRetryAsync(
                    retryCount: ProcessConsumeMessageRetryCount(),
                    sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                    onRetry: (
                        ex,
                        timeSpan,
                        currentRetry,
                        ctx) =>
                    {
                        Logger.LogWarning(
                            ex,
                            $"Retry ConsumeInboxEventBusMessages {currentRetry} time(s) failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
                    })
                .ExecuteAndThrowFinalExceptionAsync(() => ConsumeInboxEventBusMessages(cancellationToken));
        }
        catch (Exception ex)
        {
            Logger.LogError(
                ex,
                $"Retry ConsumeInboxEventBusMessages failed with error: {ex.Message}. [ApplicationName:{applicationSettingContext.ApplicationName}]. [ApplicationAssembly:{applicationSettingContext.ApplicationAssembly.FullName}]");
        }

        isProcessing = false;
    }

    protected virtual async Task ConsumeInboxEventBusMessages(CancellationToken cancellationToken)
    {
        do
        {
            var toHandleMessages = await PopToHandleInboxEventBusMessages(cancellationToken);

            foreach (var toHandleMessage in toHandleMessages)
                using (var scope = ServiceProvider.CreateScope())
                {
                    try
                    {
                        await InvokeConsumerAsync(scope, toHandleMessage, cancellationToken);
                    }
                    catch (Exception e)
                    {
                        Logger.LogError(
                            e,
                            $"[PlatformConsumeInboxEventBusMessageHostedService] Try to consume inbox message with Id:{toHandleMessage.Id} failed. Message Content:{PlatformJsonSerializer.Serialize(toHandleMessage)}");
                    }
                }
        } while (await IsAnyMessagesToHandleAsync());
    }

    protected async Task<bool> IsAnyMessagesToHandleAsync()
    {
        using (var scope = ServiceProvider.CreateScope())
        {
            using (var uow = scope.ServiceProvider.GetService<IUnitOfWorkManager>()!.Begin())
            {
                var inboxEventBusMessageRepo =
                    scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>();

                var result = await inboxEventBusMessageRepo!.AnyAsync(
                    PlatformInboxBusMessage.ToHandleInboxEventBusMessagesExpr(
                        MessageProcessingMaximumTimeInSeconds()));

                return result;
            }
        }
    }

    protected virtual async Task InvokeConsumerAsync(
        IServiceScope scope,
        PlatformInboxBusMessage toHandleInboxMessage,
        CancellationToken cancellationToken)
    {
        var consumerType = ResolveConsumerType(toHandleInboxMessage);

        if (consumerType != null)
        {
            var consumer = ((IPlatformInboxSupportMessageBusConsumer)scope.ServiceProvider.GetService(consumerType))
                !.ForProcessingExistingInboxMessage();

            var consumerMessageType = PlatformMessageBusBaseConsumer.GetConsumerMessageType(consumer);

            var eventBusMessage = Util.Tasks.CatchExceptionContinueThrow(
                () => PlatformJsonSerializer.Deserialize(
                    toHandleInboxMessage.JsonMessage,
                    consumerMessageType,
                    consumer.CustomJsonSerializerOptions()),
                ex => Logger.LogError(
                    ex,
                    $"RabbitMQ parsing message to {consumerMessageType.Name} error for the routing key {toHandleInboxMessage.RoutingKey}.{Environment.NewLine} Body: {toHandleInboxMessage.JsonMessage}"));

            if (eventBusMessage != null)
                await PlatformMessageBusBaseConsumer.InvokeConsumerAsync(
                    consumer,
                    eventBusMessage,
                    toHandleInboxMessage.RoutingKey,
                    IsLogConsumerProcessTime(),
                    LogErrorSlowProcessWarningTimeMilliseconds(),
                    Logger,
                    cancellationToken);
        }
        else
        {
            await PlatformInboxMessageBusConsumerHelper.UpdateFailedInboxMessageAsync(
                toHandleInboxMessage.Id,
                scope.ServiceProvider.GetService<IUnitOfWorkManager>(),
                scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>(),
                new Exception(
                    $"[{GetType().Name}] Error resolve consumer type {toHandleInboxMessage.ConsumerBy}. InboxId:{toHandleInboxMessage.Id} "),
                cancellationToken);
        }
    }

    protected async Task<List<PlatformInboxBusMessage>> PopToHandleInboxEventBusMessages(
        CancellationToken cancellationToken)
    {
        try
        {
            using (var scope = ServiceProvider.CreateScope())
            {
                var uowManager = scope.ServiceProvider.GetService<IUnitOfWorkManager>();

                using (var uow = uowManager!.Begin())
                {
                    var inboxEventBusMessageRepo =
                        scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>();

                    var toHandleMessages = inboxEventBusMessageRepo!.GetAllQuery()
                        .Where(
                            PlatformInboxBusMessage.ToHandleInboxEventBusMessagesExpr(
                                MessageProcessingMaximumTimeInSeconds()))
                        .OrderBy(p => p.LastConsumeDate)
                        .Take(NumberOfProcessMessagesBatch())
                        .ToList();

                    toHandleMessages.ForEach(
                        p =>
                        {
                            p.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Processing;
                            p.LastConsumeDate = DateTime.UtcNow;
                        });

                    await inboxEventBusMessageRepo.UpdateManyAsync(
                        toHandleMessages,
                        dismissSendEvent: true,
                        cancellationToken);

                    await uow.CompleteAsync(cancellationToken);

                    return toHandleMessages;
                }
            }
        }
        catch (PlatformRowVersionConflictDomainException conflictDomainException)
        {
            Logger.LogWarning(
                conflictDomainException,
                "Some other consumer instance has been handling some inbox messages (support multi service instance running concurrently), which lead to row version conflict. This is as expected so just warning.");

            // WHY: Because support multi service instance running concurrently,
            // get row version conflict is expected, so just retry again to get unprocessed inbox messages
            return await PopToHandleInboxEventBusMessages(cancellationToken);
        }
    }

    protected virtual int NumberOfProcessMessagesBatch()
    {
        return 1;
    }

    protected virtual int ProcessConsumeMessageRetryCount()
    {
        return 5;
    }

    /// <summary>
    /// To config how long a message can live in the database as Processing status in seconds. Default is 3600 * 24 seconds;
    /// This to handle that if message for some reason has been set as Processing but failed to process and has not been set back to failed.
    /// </summary>
    protected virtual double MessageProcessingMaximumTimeInSeconds()
    {
        return 3600 * 24;
    }

    /// <summary>
    /// Config the time to true to log consumer process time. Default is true
    /// </summary>
    protected virtual bool IsLogConsumerProcessTime()
    {
        return true;
    }

    /// <summary>
    /// Config the time in milliseconds to log warning if the process consumer time is over LogConsumerProcessWarningTimeMilliseconds. Default is 5000
    /// </summary>
    protected virtual double LogErrorSlowProcessWarningTimeMilliseconds()
    {
        return 5000;
    }

    /// <summary>
    /// Config the time in seconds to retry process failed message from lastConsumeDate. Default is 60
    /// </summary>
    protected virtual double RetryProcessFailedMessageDelayTimeInSeconds()
    {
        return 60;
    }

    protected bool HasInboxEventBusMessageRepositoryRegistered()
    {
        using (var scope = ServiceProvider.CreateScope())
        {
            return scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>() != null;
        }
    }

    private Type ResolveConsumerType(PlatformInboxBusMessage toHandleInboxMessage)
    {
        return ConsumerByNameToTypeDic.GetValueOrDefault(toHandleInboxMessage.ConsumerBy, null);
    }
}

public class PlatformDefaultConsumeInboxBusMessageHostedService : PlatformConsumeInboxBusMessageHostedService
{
    public PlatformDefaultConsumeInboxBusMessageHostedService(
        IHostApplicationLifetime applicationLifetime,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationSettingContext applicationSettingContext,
        IPlatformMessageBusManager messageBusManager) : base(
        applicationLifetime,
        loggerFactory,
        serviceProvider,
        applicationSettingContext,
        messageBusManager)
    {
    }
}
