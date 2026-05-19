#region

using System.Collections.Concurrent;
using Easy.Platform.Application.BackgroundLock;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.BackgroundLock;

/// <summary>
/// Default <see cref="IPlatformBackgroundActionPermitPoolRegistry"/>. Holds a
/// <see cref="ConcurrentDictionary{TKey,TValue}"/> of <c>Lazy&lt;IPlatformBackgroundActionPermitPool&gt;</c>
/// keyed by pool name. The <see cref="Lazy{T}"/> wrapper guarantees a single construction
/// (and therefore a single ObservableGauge registration in Phase 06) per pool name even under
/// contended <c>GetOrAdd</c> races.
/// </summary>
/// <remarks>
/// This type centralizes three policy decisions so call sites stay simple: pool name to config
/// resolution, disabled-mode fallback to the shared no-op pool, and one-time construction of
/// long-lived pool instances. Pools are intentionally process-lifetime objects because their
/// gauges are registered with the static <c>PlatformMeter</c>.
/// </remarks>
public sealed class PlatformBackgroundActionPermitPoolRegistry : IPlatformBackgroundActionPermitPoolRegistry, IDisposable
{
    private readonly PlatformBackgroundLockConfig config;
    private readonly ILoggerFactory loggerFactory;
    private readonly ConcurrentDictionary<string, Lazy<IPlatformBackgroundActionPermitPool>> pools = new();
    private readonly Lazy<IPlatformBackgroundActionPermitPool> noOpPool;
    private readonly Lazy<IPlatformBackgroundActionPermitPool> defaultPool;

    public PlatformBackgroundActionPermitPoolRegistry(PlatformBackgroundLockConfig config, ILoggerFactory loggerFactory)
    {
        config.Validate();
        this.config = config;
        this.loggerFactory = loggerFactory;
        noOpPool = new Lazy<IPlatformBackgroundActionPermitPool>(
            () => new NoOpBackgroundActionPermitPool(
                config.DefaultMaxHoldTime,
                loggerFactory.CreateLogger<NoOpBackgroundActionPermitPool>()),
            LazyThreadSafetyMode.ExecutionAndPublication);
        defaultPool = new Lazy<IPlatformBackgroundActionPermitPool>(
            () => Get(IPlatformBackgroundActionPermitPoolRegistry.DefaultPoolName),
            LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public IPlatformBackgroundActionPermitPool DefaultPool => defaultPool.Value;

    /// <summary>
    /// Returns the configured pool for <paramref name="poolName"/>. In enabled mode this lazily
    /// builds and caches one semaphore-backed pool per name; in disabled mode all names return the
    /// same no-op pool.
    /// </summary>
    public IPlatformBackgroundActionPermitPool Get(string poolName)
    {
        if (!config.Enabled) return noOpPool.Value;

        return pools.GetOrAdd(
                poolName,
                name => new Lazy<IPlatformBackgroundActionPermitPool>(
                    () => Build(name),
                    LazyThreadSafetyMode.ExecutionAndPublication))
            .Value;
    }

    private SemaphoreSlimBackgroundActionPermitPool Build(string poolName)
    {
        var poolCfg = config.Pools.GetValueOrDefault(poolName) ?? config.DefaultPool;
        var waitTimeout = poolCfg.WaitTimeout ?? config.DefaultWaitTimeout;
        var maxHoldTime = poolCfg.MaxHoldTime ?? config.DefaultMaxHoldTime;
        var maxQueueDepth = ResolveMaxQueueDepth(config, poolCfg);
        var logger = loggerFactory.CreateLogger<SemaphoreSlimBackgroundActionPermitPool>();

        // The pool stores its resolved timeout/capacity values, so hot call sites do not repeatedly
        // read dictionaries or merge default values for every background action.
        return new SemaphoreSlimBackgroundActionPermitPool(poolName, poolCfg.MaxConcurrent, waitTimeout, maxHoldTime, maxQueueDepth, logger);
    }

    private static int ResolveMaxQueueDepth(PlatformBackgroundLockConfig config, PlatformBackgroundLockPoolConfig poolCfg)
    {
        if (poolCfg.MaxQueueDepth.HasValue) return Math.Max(0, poolCfg.MaxQueueDepth.Value);

        var multiplier = Math.Max(0, poolCfg.MaxQueueDepthMultiplier ?? config.DefaultMaxQueueDepthMultiplier);
        var calculated = (long)poolCfg.MaxConcurrent * multiplier;

        return calculated > int.MaxValue ? int.MaxValue : (int)calculated;
    }

    /// <summary>
    /// Disposes every materialized pool (and the NoOp fallback) at host shutdown. Lazy entries
    /// whose <see cref="Lazy{T}.IsValueCreated"/> is <c>false</c> are skipped to avoid forcing
    /// construction during disposal. Production impact is nil (OS reclaims on process exit) —
    /// the value lands in test re-creation cycles (`WebApplicationFactory`, integration test
    /// fixture rebuilds) where unmanaged <see cref="SemaphoreSlim"/> handles would otherwise
    /// accumulate. The underlying <c>SemaphoreSlimBackgroundActionPermitPool.Dispose()</c> is
    /// idempotent (delegates to <see cref="SemaphoreSlim.Dispose()"/> which tolerates re-call).
    /// </summary>
    public void Dispose()
    {
        foreach (var lazy in pools.Values)
            if (lazy.IsValueCreated && lazy.Value is IDisposable disposable)
                disposable.Dispose();

        if (noOpPool.IsValueCreated && noOpPool.Value is IDisposable noOpDisposable)
            noOpDisposable.Dispose();
    }
}
