using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Store;

/// <summary>
/// The single worker-side answer to "which message-bus stores and lanes run in this process, in which order".
/// </summary>
/// <remarks>
/// The inbox/outbox send and cleaner hosted services all project their per-store state from this resolver so the
/// runtime-enabled filter, the unbound legacy fallback and the deterministic store/lane ordering cannot drift between
/// workers (an inbox worker and an outbox worker picking different stores would split one application's messages).
/// </remarks>
internal static class PlatformMessageBusStoreRuntimeDescriptors
{
    /// <summary>
    /// Resolves the runtime descriptors a worker must process, ordered by store key.
    /// </summary>
    /// <param name="registry">The composed registry. Null or a registry without runtime store composition yields no descriptors.</param>
    /// <param name="isWorkerEnabled">The worker-specific capability filter, e.g. inbox enabled or outbox enabled.</param>
    /// <remarks>
    /// A host with one compatible application/persistence pair but no explicit binding retains the legacy single-store
    /// behavior through the unbound legacy descriptor, without using the unqualified repository.
    /// </remarks>
    public static IReadOnlyList<PlatformMessageBusStoreDescriptor> Resolve(
        IPlatformMessageBusStoreRegistry registry,
        Func<PlatformMessageBusStoreDescriptor, bool> isWorkerEnabled)
    {
        ArgumentNullException.ThrowIfNull(isWorkerEnabled);

        if (registry?.HasRuntimeStoreComposition != true)
            return [];

        var descriptors = registry.Descriptors
            .Where(descriptor => descriptor.IsRuntimeEnabled && isWorkerEnabled(descriptor))
            .OrderBy(descriptor => descriptor.StoreKey.Value, StringComparer.Ordinal)
            .ToList();

        if (descriptors.Count == 0 && registry.Bindings.Count == 0)
        {
            var legacyDescriptor = registry.TryResolveUnboundLegacyDefault();
            if (legacyDescriptor?.IsRuntimeEnabled == true && isWorkerEnabled(legacyDescriptor))
                descriptors.Add(legacyDescriptor);
        }

        return descriptors.AsReadOnly();
    }

    /// <summary>
    /// Gets a descriptor's application lanes in the deterministic worker order (application name, then module type name).
    /// </summary>
    /// <remarks>
    /// The first lane is the store's configuration and unassigned-row owner lane wherever a worker needs a single one.
    /// </remarks>
    public static IReadOnlyList<PlatformMessageBusApplicationLaneRegistration> GetOrderedLanes(PlatformMessageBusStoreDescriptor descriptor)
    {
        ArgumentNullException.ThrowIfNull(descriptor);

        return descriptor.ApplicationLanes
            .OrderBy(lane => lane.ApplicationName, StringComparer.Ordinal)
            .ThenBy(lane => lane.ApplicationModuleType.FullName ?? lane.ApplicationModuleType.Name, StringComparer.Ordinal)
            .ToList()
            .AsReadOnly();
    }

    /// <summary>
    /// Resolves the single configuration a store-scoped worker applies to a store shared by several lanes.
    /// </summary>
    /// <typeparam name="TConfig">The inbox or outbox configuration type.</typeparam>
    /// <param name="descriptor">The store descriptor.</param>
    /// <param name="resolveLaneConfig">Resolves the configuration of one lane.</param>
    /// <param name="usedSettings">
    /// Projects the settings the calling worker actually uses into a value with structural equality (e.g. a value tuple).
    /// </param>
    /// <param name="logger">The worker logger.</param>
    /// <param name="workerName">The worker name used in the diagnostic.</param>
    /// <returns>The configuration of the first lane in <see cref="GetOrderedLanes" /> order.</returns>
    /// <remarks>
    /// When lanes resolve non-equivalent settings, the first lane still wins deterministically and a warning names the
    /// store, the lanes and the winning lane. It never throws: rejecting the composition would stop existing hosts.
    /// </remarks>
    public static TConfig ResolveSharedStoreConfig<TConfig>(
        PlatformMessageBusStoreDescriptor descriptor,
        Func<PlatformMessageBusApplicationLaneRegistration, TConfig> resolveLaneConfig,
        Func<TConfig, object> usedSettings,
        ILogger logger,
        string workerName)
    {
        ArgumentNullException.ThrowIfNull(resolveLaneConfig);
        ArgumentNullException.ThrowIfNull(usedSettings);

        var lanes = GetOrderedLanes(descriptor);
        var laneConfigs = lanes.Select(lane => (Lane: lane, Config: resolveLaneConfig(lane))).ToList();
        var (winningLane, winningConfig) = laneConfigs[0];
        var winningSettings = usedSettings(winningConfig);

        var hasConflictingSettings = laneConfigs
            .Skip(1)
            .Any(item => !Equals(winningSettings, usedSettings(item.Config)));

        if (hasConflictingSettings)
        {
            logger?.LogWarning(
                "[{WorkerName}] Message-bus store {StoreKey} is shared by application lanes [{ApplicationLanes}] whose configurations differ " +
                "for the settings this worker uses. The store is processed with the configuration of lane {WinningApplicationLane} " +
                "(first by lane ordering); align the lane configurations to remove this warning.",
                workerName,
                descriptor.StoreKey.Value,
                string.Join(", ", lanes.Select(lane => lane.ApplicationName)),
                winningLane.ApplicationName);
        }

        return winningConfig;
    }
}

/// <summary>
/// Lazily builds and caches a worker's per-store state list.
/// </summary>
/// <remarks>
/// A build that throws (for example a lane configuration factory failing while a dependency is still starting) is not
/// cached: the exception propagates to the caller's error handling and the next interval tick retries the build.
/// </remarks>
internal sealed class PlatformMessageBusStoreRuntimeStateCache<TState>
{
    private readonly Func<IReadOnlyList<TState>> buildStates;
    private readonly Lock sync = new();
    private IReadOnlyList<TState> states;

    public PlatformMessageBusStoreRuntimeStateCache(Func<IReadOnlyList<TState>> buildStates)
    {
        this.buildStates = buildStates ?? throw new ArgumentNullException(nameof(buildStates));
    }

    /// <summary>
    /// Gets the states built so far, or null when no build has completed. Intended for disposal.
    /// </summary>
    public IReadOnlyList<TState> BuiltStates => states;

    /// <summary>
    /// Gets the cached states, building them once on first successful call.
    /// </summary>
    public IReadOnlyList<TState> Get()
    {
        if (states != null)
            return states;

        lock (sync)
        {
            return states ??= buildStates();
        }
    }
}
