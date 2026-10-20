using System.Collections.ObjectModel;
using System.Diagnostics;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.Utils;
using Easy.Platform.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.OutboxPattern;

public class PlatformOutboxBusMessageCleanerHostedService : PlatformIntervalHostingBackgroundService
{
    public const int MinimumRetryCleanOutboxMessageTimesToWarning = 3;
    public const int DefaultResilientDelayRetrySeconds = 10;
    public const int DefaultCleanDelayToNotStressSystemSeconds = 10;

    private bool isProcessing;
    private readonly IPlatformMessageBusStoreRegistry messageBusStoreRegistry;
    private readonly AsyncLocal<OutboxCleanupState> currentCleanupState = new();
    private readonly PlatformOutboxConfig legacyOutboxConfig;
    private readonly PlatformMessageBusStoreRuntimeStateCache<OutboxCleanupState> cleanupStates;

    public PlatformOutboxBusMessageCleanerHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformOutboxConfig outboxConfig,
        IPlatformMessageBusStoreRegistry messageBusStoreRegistry = null) : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        legacyOutboxConfig = outboxConfig;
        this.messageBusStoreRegistry = messageBusStoreRegistry;
        cleanupStates = new PlatformMessageBusStoreRuntimeStateCache<OutboxCleanupState>(BuildCleanupStates);
    }

    public override bool LogIntervalProcessInformation => OutboxConfig.LogIntervalProcessInformation;

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    protected PlatformOutboxConfig OutboxConfig => currentCleanupState.Value?.Config ?? legacyOutboxConfig;

    private string ProcessingStoreKey => currentCleanupState.Value?.Descriptor.StoreKey.Value ?? "Legacy";

    private string ProcessingApplicationLane =>
        currentCleanupState.Value?.ApplicationLane ?? ApplicationSettingContext.ApplicationName;

    private string ProcessingPersistenceOwnerType =>
        currentCleanupState.Value?.Descriptor.PersistenceOwnerType?.FullName
        ?? ApplicationSettingContext.ApplicationAssembly?.FullName
        ?? "Legacy";

    private string ProcessingPersistenceContextType =>
        currentCleanupState.Value?.Descriptor.PersistenceContextType?.FullName ?? "Legacy";

    protected override async Task IntervalProcessAsync(CancellationToken cancellationToken)
    {
        await IPlatformModule.WaitForAllModulesInitializedAsync(ServiceProvider, typeof(IPlatformPersistenceModule), cancellationToken, Logger, $"process {GetType().Name}");

        if (HasRegistryComposition)
        {
            foreach (var cleanupState in GetCleanupStates())
            {
                if (cancellationToken.IsCancellationRequested) return;
                await CleanOutboxMessagesForStateAsync(cleanupState, cancellationToken);
            }

            return;
        }

        if (!HasOutboxEventBusMessageRepositoryRegistered() || isProcessing) return;

        isProcessing = true;

        try
        {
            await RetryCleanOutboxMessagesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception ex)
        {
            LogCleanupError(ex, "CleanOutboxEventBusMessage failed");
        }
        finally
        {
            isProcessing = false;
        }
    }

    protected override TimeSpan ProcessTriggerIntervalTime()
    {
        if (HasRegistryComposition)
        {
            var configuredStates = GetCleanupStates();
            if (configuredStates.Count > 0)
                return configuredStates.Min(state => state.Config.MessageCleanerTriggerIntervalInMinutes).Minutes();
        }

        return legacyOutboxConfig.MessageCleanerTriggerIntervalInMinutes.Minutes();
    }

    protected override TimeSpan FallbackProcessTriggerIntervalTime()
    {
        return legacyOutboxConfig.MessageCleanerTriggerIntervalInMinutes.Minutes();
    }

    protected virtual int ProcessClearMessageRetryCount()
    {
        return OutboxConfig.ProcessClearMessageRetryCount;
    }

    /// <inheritdoc cref="PlatformOutboxConfig.NumberOfDeleteMessagesBatch" />
    protected virtual int NumberOfDeleteMessagesBatch()
    {
        return OutboxConfig.NumberOfDeleteMessagesBatch;
    }

    protected bool HasOutboxEventBusMessageRepositoryRegistered()
    {
        if (HasRegistryComposition)
            return GetCleanupStates().Count > 0;

        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformOutboxBusMessageRepository>() != null);
    }

    protected async Task CleanOutboxEventBusMessage(CancellationToken cancellationToken)
    {
        await ProcessCleanMessageByMaxStoreProcessedMessageCount(cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;

        await ProcessCleanMessageByExpiredTime(cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;

        await ProcessIgnoreFailedMessageByExpiredTime(cancellationToken);
    }

    private async Task RetryCleanOutboxMessagesAsync(CancellationToken cancellationToken)
    {
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => CleanOutboxEventBusMessage(cancellationToken),
            retryAttempt => DefaultResilientDelayRetrySeconds.Seconds(),
            retryCount: ProcessClearMessageRetryCount(),
            onRetry: (ex, timeSpan, currentRetry, ctx) =>
            {
                if (currentRetry >= MinimumRetryCleanOutboxMessageTimesToWarning)
                    LogCleanupError(ex, $"Retry CleanOutboxEventBusMessage {currentRetry} time(s) failed");
            },
            cancellationToken: cancellationToken);
    }

    private async Task CleanOutboxMessagesForStateAsync(OutboxCleanupState cleanupState, CancellationToken cancellationToken)
    {
        var previousCleanupState = currentCleanupState.Value;
        currentCleanupState.Value = cleanupState;

        if (cleanupState.IsProcessing)
        {
            currentCleanupState.Value = previousCleanupState;
            return;
        }

        cleanupState.IsProcessing = true;

        try
        {
            await RetryCleanOutboxMessagesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception ex)
        {
            LogCleanupError(ex, "CleanOutboxEventBusMessage failed");
        }
        finally
        {
            cleanupState.IsProcessing = false;
            currentCleanupState.Value = previousCleanupState;
        }
    }

    private void LogCleanupError(Exception exception, string message)
    {
        Logger.LogError(
            exception.BeautifyStackTrace(),
            "{Message}. [[Error:{Error}]]. [StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
            "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
            message,
            exception.Message,
            ProcessingStoreKey,
            ProcessingApplicationLane,
            ProcessingPersistenceOwnerType,
            ProcessingPersistenceContextType);
    }

    private bool HasRegistryComposition => messageBusStoreRegistry?.HasRuntimeStoreComposition == true;

    private IReadOnlyList<OutboxCleanupState> GetCleanupStates()
    {
        return HasRegistryComposition ? cleanupStates.Get() : [];
    }

    // One state per store: outbox rows carry no lane identity, so a store shared by several lanes is cleaned once.
    private ReadOnlyCollection<OutboxCleanupState> BuildCleanupStates()
    {
        return PlatformMessageBusStoreRuntimeDescriptors
            .Resolve(messageBusStoreRegistry, descriptor => descriptor.IsOutboxEnabled)
            .Select(descriptor => new OutboxCleanupState(
                descriptor,
                PlatformMessageBusStoreRuntimeDescriptors.ResolveSharedStoreConfig(
                    descriptor,
                    lane => descriptor.ResolveOutboxConfig(ServiceProvider, lane.ApplicationModuleType),
                    CleanupSettingsUsed,
                    Logger,
                    GetType().Name)))
            .ToList()
            .AsReadOnly();
    }

    private static object CleanupSettingsUsed(PlatformOutboxConfig config)
    {
        return (
            config.MessageCleanerTriggerIntervalInMinutes,
            config.MaxStoreProcessedMessageCount,
            config.DeleteProcessedMessageInSeconds,
            config.DeleteExpiredIgnoredMessageInSeconds,
            config.IgnoreExpiredFailedMessageInSeconds,
            config.NumberOfDeleteMessagesBatch,
            config.ProcessClearMessageRetryCount);
    }

    private async Task<TResult> ExecuteWithOutboxRepositoryAsync<TResult>(
        Func<IPlatformOutboxBusMessageRepository, Task<TResult>> action)
    {
        var repositoryFactory = currentCleanupState.Value?.Descriptor.OutboxRepositoryFactory;

        if (repositoryFactory == null)
            return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(action);

        Func<IServiceProvider, Task<TResult>> scopedAction = scopedServiceProvider => action(repositoryFactory(scopedServiceProvider));
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(scopedAction);
    }

    /// <summary>
    /// Keeps the newest configured processed rows, deleting the initial excess in bounded provider batches.
    /// Each selection skips the retained rows again as earlier batches disappear. Concurrent arrivals do not
    /// expand this invocation's deletion budget; zero progress or cancellation stops the drain.
    /// </summary>
    private async Task ProcessCleanMessageByMaxStoreProcessedMessageCount(CancellationToken cancellationToken)
    {
        try
        {
            var retainedCount = OutboxConfig.MaxStoreProcessedMessageCount;
            var batchSize = NumberOfDeleteMessagesBatch();
            ArgumentOutOfRangeException.ThrowIfNegative(retainedCount);
            ArgumentOutOfRangeException.ThrowIfNegativeOrZero(batchSize);

            var totalProcessedMessages = await ExecuteWithOutboxRepositoryAsync(
                repository => repository.CountAsync(
                    p => p.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed,
                    cancellationToken));

            var remaining = totalProcessedMessages - retainedCount;
            if (remaining <= 0) return;

            var deletedMessageCount = 0;
            while (remaining > 0 && !cancellationToken.IsCancellationRequested)
            {
                var currentBatchSize = Math.Min(batchSize, remaining);
                var deletedCount = await ExecuteWithOutboxRepositoryAsync(
                    outboxEventBusMessageRepo => outboxEventBusMessageRepo.DeleteManyAsync(
                        queryBuilder: query => query
                            .Where(p => p.SendStatus == PlatformOutboxBusMessage.SendStatuses.Processed)
                            .OrderByDescending(p => p.CreatedDate)
                            .Skip(retainedCount)
                            .Take(currentBatchSize),
                        dismissSendEvent: true,
                        cancellationToken: cancellationToken));

                if (deletedCount == 0) break;
                remaining -= deletedCount;
                deletedMessageCount += deletedCount;
            }

            Logger.LogDebug(
                "ProcessCleanMessageByMaxStoreProcessedMessageCount success. Number of deleted messages: {DeletedMessageCount}. " +
                "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. [PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                deletedMessageCount,
                ProcessingStoreKey,
                ProcessingApplicationLane,
                ProcessingPersistenceOwnerType,
                ProcessingPersistenceContextType);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception e)
        {
            LogCleanupError(e, "ProcessCleanMessageByMaxStoreProcessedMessageCount failed");
        }
    }

    private async Task ProcessCleanMessageByExpiredTime(CancellationToken cancellationToken)
    {
        try
        {
            var toCleanMessageCount = await ExecuteWithOutboxRepositoryAsync(
                repository => repository.CountAsync(
                    PlatformOutboxBusMessage.ToCleanExpiredMessagesExpr(
                        OutboxConfig.DeleteProcessedMessageInSeconds,
                        OutboxConfig.DeleteExpiredIgnoredMessageInSeconds),
                    cancellationToken));

            if (toCleanMessageCount > 0)
            {
                await ExecuteWithOutboxRepositoryAsync(
                    outboxEventBusMessageRepo => outboxEventBusMessageRepo.DeleteManyAsync(
                        PlatformOutboxBusMessage.ToCleanExpiredMessagesExpr(
                            OutboxConfig.DeleteProcessedMessageInSeconds,
                            OutboxConfig.DeleteExpiredIgnoredMessageInSeconds),
                        dismissSendEvent: true,
                        eventCustomConfig: null,
                        cancellationToken));

                Logger.LogDebug(
                    "ProcessCleanMessageByExpiredTime success. Number of deleted messages: {ToCleanMessageCount}. " +
                    "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. [PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    toCleanMessageCount,
                    ProcessingStoreKey,
                    ProcessingApplicationLane,
                    ProcessingPersistenceOwnerType,
                    ProcessingPersistenceContextType);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception e)
        {
            LogCleanupError(e, "ProcessCleanMessageByExpiredTime failed");
        }
    }

    private async Task ProcessIgnoreFailedMessageByExpiredTime(CancellationToken cancellationToken)
    {
        try
        {
            var toIgnoreMessageCount = await ExecuteWithOutboxRepositoryAsync(
                repository => repository.CountAsync(
                    PlatformOutboxBusMessage.ToIgnoreFailedExpiredMessagesExpr(
                        OutboxConfig.IgnoreExpiredFailedMessageInSeconds),
                    cancellationToken));

            if (toIgnoreMessageCount > 0)
            {
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    () => Util.Pager.ExecuteScrollingPagingAsync(
                        () => ExecuteWithOutboxRepositoryAsync(async outboxEventBusMessageRepo =>
                        {
                            var expiredMessages = await outboxEventBusMessageRepo.GetAllAsync(
                                queryBuilder: query =>
                                    query.Where(PlatformOutboxBusMessage.ToIgnoreFailedExpiredMessagesExpr(OutboxConfig.IgnoreExpiredFailedMessageInSeconds))
                                        .OrderBy(p => p.CreatedDate)
                                        .Take(NumberOfDeleteMessagesBatch()),
                                cancellationToken);

                            if (expiredMessages.Count > 0)
                            {
                                await outboxEventBusMessageRepo.UpdateManyAsync(
                                    expiredMessages.SelectList(p => p.With(x => x.SendStatus = PlatformOutboxBusMessage.SendStatuses.Ignored)),
                                    dismissSendEvent: true,
                                    checkDiff: false,
                                    eventCustomConfig: null,
                                    cancellationToken);

                                await Task.Delay(DefaultCleanDelayToNotStressSystemSeconds.Seconds(), cancellationToken);
                            }

                            return expiredMessages;
                        }),
                        maxExecutionCount: toIgnoreMessageCount / NumberOfDeleteMessagesBatch()),
                    _ => DefaultResilientDelayRetrySeconds.Seconds(),
                    ProcessClearMessageRetryCount(),
                    cancellationToken: cancellationToken);

                Logger.LogDebug(
                    "ProcessIgnoreFailedMessageByExpiredTime success. Number of ignored messages: {ToCleanMessageCount}. " +
                    "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. [PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    toIgnoreMessageCount,
                    ProcessingStoreKey,
                    ProcessingApplicationLane,
                    ProcessingPersistenceOwnerType,
                    ProcessingPersistenceContextType);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception e)
        {
            LogCleanupError(e, "ProcessIgnoreFailedMessageByExpiredTime failed");
        }
    }

    private sealed class OutboxCleanupState
    {
        public OutboxCleanupState(PlatformMessageBusStoreDescriptor descriptor, PlatformOutboxConfig config)
        {
            Descriptor = descriptor;
            Config = config;
        }

        public PlatformMessageBusStoreDescriptor Descriptor { get; }
        public PlatformOutboxConfig Config { get; }
        public bool IsProcessing { get; set; }

        public string ApplicationLane => string.Join(",", Descriptor.ApplicationLanes.Select(lane => lane.ApplicationName));
    }
}
