using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Linq.Expressions;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.HostingBackgroundServices;
using Easy.Platform.Common.Utils;
using Easy.Platform.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.InboxPattern;

public class PlatformInboxBusMessageCleanerHostedService : PlatformIntervalHostingBackgroundService
{
    public const int MinimumRetryCleanInboxMessageTimesToWarning = 3;
    public const int DefaultResilientDelayRetrySeconds = 10;
    public const int DefaultCleanDelayToNotStressSystemSeconds = 10;

    private bool isProcessing;
    private readonly IPlatformMessageBusStoreRegistry messageBusStoreRegistry;
    private readonly AsyncLocal<InboxCleanupState> currentCleanupState = new();
    private readonly PlatformInboxConfig legacyInboxConfig;
    private readonly PlatformMessageBusStoreRuntimeStateCache<InboxCleanupState> cleanupStates;

    public PlatformInboxBusMessageCleanerHostedService(
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformInboxConfig inboxConfig,
        IPlatformMessageBusStoreRegistry messageBusStoreRegistry = null) : base(serviceProvider, loggerFactory)
    {
        ApplicationSettingContext = applicationSettingContext;
        legacyInboxConfig = inboxConfig;
        this.messageBusStoreRegistry = messageBusStoreRegistry;
        cleanupStates = new PlatformMessageBusStoreRuntimeStateCache<InboxCleanupState>(BuildCleanupStates);
    }

    public override bool LogIntervalProcessInformation => InboxConfig.LogIntervalProcessInformation;

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    protected PlatformInboxConfig InboxConfig => currentCleanupState.Value?.Config ?? legacyInboxConfig;

    private string ProcessingStoreKey => currentCleanupState.Value?.Descriptor.StoreKey.Value ?? "Legacy";

    private string ProcessingApplicationLane =>
        currentCleanupState.Value?.Lane.ApplicationName ?? ApplicationSettingContext.ApplicationName;

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
                await CleanInboxMessagesForStateAsync(cleanupState, cancellationToken);
            }

            return;
        }

        if (!HasInboxEventBusMessageRepositoryRegistered() || isProcessing) return;

        isProcessing = true;

        try
        {
            await RetryCleanInboxMessagesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception ex)
        {
            LogCleanupError(ex, "CleanInboxEventBusMessage failed");
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

        return legacyInboxConfig.MessageCleanerTriggerIntervalInMinutes.Minutes();
    }

    protected override TimeSpan FallbackProcessTriggerIntervalTime()
    {
        return legacyInboxConfig.MessageCleanerTriggerIntervalInMinutes.Minutes();
    }

    protected virtual int ProcessClearMessageRetryCount()
    {
        return InboxConfig.ProcessClearMessageRetryCount;
    }

    /// <inheritdoc cref="PlatformInboxConfig.NumberOfDeleteMessagesBatch" />
    protected virtual int NumberOfDeleteMessagesBatch()
    {
        return InboxConfig.NumberOfDeleteMessagesBatch;
    }

    protected bool HasInboxEventBusMessageRepositoryRegistered()
    {
        if (HasRegistryComposition)
            return GetCleanupStates().Count > 0;

        return ServiceProvider.ExecuteScoped(scope => scope.ServiceProvider.GetService<IPlatformInboxBusMessageRepository>() != null);
    }

    protected async Task CleanInboxEventBusMessage(CancellationToken cancellationToken)
    {
        await ProcessCleanMessageByExpiredTime(cancellationToken);
        if (cancellationToken.IsCancellationRequested) return;
        await ProcessIgnoreFailedMessageByExpiredTime(cancellationToken);
    }

    // WHY: Retry in case of the db is not started, initiated or restarting
    private async Task RetryCleanInboxMessagesAsync(CancellationToken cancellationToken)
    {
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => CleanInboxEventBusMessage(cancellationToken),
            retryAttempt => DefaultResilientDelayRetrySeconds.Seconds(),
            retryCount: ProcessClearMessageRetryCount(),
            onRetry: (ex, timeSpan, currentRetry, ctx) =>
            {
                if (currentRetry >= MinimumRetryCleanInboxMessageTimesToWarning)
                    LogCleanupError(ex, $"Retry CleanInboxEventBusMessage {currentRetry} time(s) failed");
            },
            cancellationToken: cancellationToken);
    }

    private async Task CleanInboxMessagesForStateAsync(InboxCleanupState cleanupState, CancellationToken cancellationToken)
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
            await RetryCleanInboxMessagesAsync(cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Cleanup cancellation ends this pass without reporting a processing failure.
        }
        catch (Exception ex)
        {
            LogCleanupError(ex, "CleanInboxEventBusMessage failed");
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
            "{Message}. [StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. " +
            "[PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
            message,
            ProcessingStoreKey,
            ProcessingApplicationLane,
            ProcessingPersistenceOwnerType,
            ProcessingPersistenceContextType);
    }

    private async Task ProcessCleanMessageByExpiredTime(CancellationToken cancellationToken)
    {
        try
        {
            var toDeleteMessageCount = await ExecuteWithInboxRepositoryAsync(
                repository => repository.CountAsync(
                    CleanExpiredMessagesExpr(),
                    cancellationToken));

            if (toDeleteMessageCount > 0)
            {
                await ExecuteWithInboxRepositoryAsync(
                    inboxEventBusMessageRepo => inboxEventBusMessageRepo.DeleteManyAsync(
                        CleanExpiredMessagesExpr(),
                        dismissSendEvent: true,
                        eventCustomConfig: null,
                        cancellationToken));

                Logger.LogDebug(
                    "ProcessCleanMessageByExpiredTime success. Number of deleted messages: {DeletedMessageCount}. " +
                    "[StoreKey:{StoreKey}]. [ApplicationLane:{ApplicationLane}]. [PersistenceOwnerType:{PersistenceOwnerType}]. [PersistenceContextType:{PersistenceContextType}]",
                    toDeleteMessageCount,
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
            var toIgnoreMessageCount = await ExecuteWithInboxRepositoryAsync(
                repository => repository.CountAsync(
                    IgnoreFailedExpiredMessagesExpr(),
                    cancellationToken));

            if (toIgnoreMessageCount > 0)
            {
                await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                    () => Util.Pager.ExecuteScrollingPagingAsync(
                        () => ExecuteWithInboxRepositoryAsync(async inboxEventBusMessageRepo =>
                        {
                            var expiredMessages = await inboxEventBusMessageRepo.GetAllAsync(
                                queryBuilder: query => query
                                    .Where(IgnoreFailedExpiredMessagesExpr())
                                    .OrderBy(p => p.CreatedDate)
                                    .Take(NumberOfDeleteMessagesBatch()),
                                cancellationToken);

                            if (expiredMessages.Count > 0)
                            {
                                await inboxEventBusMessageRepo.UpdateManyAsync(
                                    expiredMessages.SelectList(p => p.With(x => x.ConsumeStatus = PlatformInboxBusMessage.ConsumeStatuses.Ignored)),
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
                    "ProcessIgnoreFailedMessageByExpiredTime success. Number of ignored messages: {DeletedMessageCount}. " +
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

    private bool HasRegistryComposition => messageBusStoreRegistry?.HasRuntimeStoreComposition == true;

    private IReadOnlyList<InboxCleanupState> GetCleanupStates()
    {
        return HasRegistryComposition ? cleanupStates.Get() : [];
    }

    // One state per application lane so each lane applies its own retention. The first lane of each store (worker lane
    // ordering) also owns every row no other lane of that store claims, so unassigned rows and rows of renamed/removed
    // lanes are still cleaned exactly once.
    private ReadOnlyCollection<InboxCleanupState> BuildCleanupStates()
    {
        return PlatformMessageBusStoreRuntimeDescriptors
            .Resolve(messageBusStoreRegistry, descriptor => descriptor.IsInboxEnabled)
            .SelectMany(descriptor =>
            {
                var lanes = PlatformMessageBusStoreRuntimeDescriptors.GetOrderedLanes(descriptor);
                return lanes.Select((lane, laneIndex) => new InboxCleanupState(
                    descriptor,
                    lane,
                    descriptor.ResolveInboxConfig(ServiceProvider, lane.ApplicationModuleType),
                    ownsUnclaimedMessages: laneIndex == 0,
                    otherLaneApplicationNames: lanes.Where(other => other != lane).Select(other => other.ApplicationName).ToList()));
            })
            .ToList()
            .AsReadOnly();
    }

    private async Task<TResult> ExecuteWithInboxRepositoryAsync<TResult>(
        Func<IPlatformInboxBusMessageRepository, Task<TResult>> action)
    {
        var repositoryFactory = currentCleanupState.Value?.Descriptor.InboxRepositoryFactory;

        if (repositoryFactory == null)
            return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(action);

        Func<IServiceProvider, Task<TResult>> scopedAction = scopedServiceProvider => action(repositoryFactory(scopedServiceProvider));
        return await ServiceProvider.ExecuteInjectScopedAsync<TResult>(scopedAction);
    }

    private Expression<Func<PlatformInboxBusMessage, bool>> CleanExpiredMessagesExpr()
    {
        return ScopeToCurrentCleanupLane(
            PlatformInboxBusMessage.ToCleanExpiredMessagesExpr(
                InboxConfig.DeleteProcessedMessageInSeconds,
                InboxConfig.DeleteExpiredIgnoredMessageInSeconds));
    }

    private Expression<Func<PlatformInboxBusMessage, bool>> IgnoreFailedExpiredMessagesExpr()
    {
        return ScopeToCurrentCleanupLane(
            PlatformInboxBusMessage.ToIgnoreFailedExpiredMessagesExpr(InboxConfig.IgnoreExpiredFailedMessageInSeconds));
    }

    /// <summary>
    /// Legacy (no store composition) cleanup stays store-wide exactly as before; a composed lane only touches the rows it owns.
    /// </summary>
    private Expression<Func<PlatformInboxBusMessage, bool>> ScopeToCurrentCleanupLane(Expression<Func<PlatformInboxBusMessage, bool>> expr)
    {
        var ownershipExpr = currentCleanupState.Value?.OwnershipExpr;
        return ownershipExpr == null ? expr : expr.AndAlso(ownershipExpr);
    }

    private sealed class InboxCleanupState
    {
        public InboxCleanupState(
            PlatformMessageBusStoreDescriptor descriptor,
            PlatformMessageBusApplicationLaneRegistration lane,
            PlatformInboxConfig config,
            bool ownsUnclaimedMessages,
            List<string> otherLaneApplicationNames)
        {
            Descriptor = descriptor;
            Lane = lane;
            Config = config;
            OwnershipExpr = BuildOwnershipExpr(lane.ApplicationName, ownsUnclaimedMessages, otherLaneApplicationNames);
        }

        public PlatformMessageBusStoreDescriptor Descriptor { get; }
        public PlatformMessageBusApplicationLaneRegistration Lane { get; }
        public PlatformInboxConfig Config { get; }

        /// <summary>
        /// Row ownership inside the lane's store, or null when the lane owns the whole store.
        /// </summary>
        public Expression<Func<PlatformInboxBusMessage, bool>> OwnershipExpr { get; }

        public bool IsProcessing { get; set; }

        private static Expression<Func<PlatformInboxBusMessage, bool>> BuildOwnershipExpr(
            string laneApplicationName,
            bool ownsUnclaimedMessages,
            List<string> otherLaneApplicationNames)
        {
            if (!ownsUnclaimedMessages)
                return p => p.ForApplicationName == laneApplicationName;

            // The only lane of a store owns every row, identical to the legacy store-wide cleanup.
            if (otherLaneApplicationNames.Count == 0)
                return null;

            // Unassigned rows and rows of lanes no longer bound to this store (renamed/removed) have no other owner.
            return p => p.ForApplicationName == null || !otherLaneApplicationNames.Contains(p.ForApplicationName);
        }
    }
}
