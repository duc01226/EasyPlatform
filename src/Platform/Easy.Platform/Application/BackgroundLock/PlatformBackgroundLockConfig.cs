using System.Threading;

namespace Easy.Platform.Application.BackgroundLock;

/// <summary>
/// Runtime configuration for the per-domain background permit pools that replace the
/// single global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore.
/// Registered as Singleton on <see cref="PlatformApplicationModule"/> via the virtual
/// <c>BackgroundLockConfigProvider</c> hook (mirrors the <c>PlatformOutboxConfig</c> /
/// <c>PlatformInboxConfig</c> convention).
/// </summary>
/// <remarks>
/// Per-service override is supported via two mechanisms:
/// <list type="bullet">
///   <item><description><c>appsettings.json</c> binding under section <c>BackgroundLock</c>.</description></item>
///   <item><description>Module subclass override of <c>BackgroundLockConfigProvider</c>.</description></item>
/// </list>
/// Last writer wins (<c>replaceIfExist: true</c> registration).
/// <para>
/// The background-lock feature is intentionally configured at the framework boundary. Business
/// call sites only choose a pool name that describes their work domain; this config controls the
/// operational behavior for that domain: capacity, wait timeout, and max hold safety net.
/// </para>
/// </remarks>
public class PlatformBackgroundLockConfig
{
    /// <summary>
    /// Master switch for the per-domain pool feature. Platform default is <c>true</c> —
    /// per-domain pools active in all services. Set to <c>false</c> in service
    /// <c>appsettings.json</c> to opt out: the registry returns a no-op pool that delegates
    /// to the existing global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore
    /// (infinite wait — admission parity with today's behavior) AND applies the
    /// <see cref="DefaultMaxHoldTime"/> safety net (strict improvement over today's
    /// unbounded hold).
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Named pool overrides. Key is the pool name declared by a consumer's
    /// <c>private const string BgPoolName</c>. Pools not present in this dictionary fall
    /// back to <see cref="DefaultPool"/>.
    /// </summary>
    /// <remarks>
    /// Well-known pool names (no central catalog — each consumer owns its constant):
    /// <c>EventHandlerFanOut</c>, <c>OutboxDispatch</c>, <c>InboxConsume</c>,
    /// <c>CacheWrite</c>, <c>DbPostSave</c>, <c>Default</c>.
    /// </remarks>
    public Dictionary<string, PlatformBackgroundLockPoolConfig> Pools { get; set; } = [];

    /// <summary>
    /// Fallback configuration for any pool name not present in <see cref="Pools"/>.
    /// </summary>
    /// <remarks>
    /// This keeps new pool names operational by default. A caller can introduce a new logical
    /// pool name without requiring every service to update configuration first; services can tune
    /// that name later once metrics show real pressure.
    /// </remarks>
    public PlatformBackgroundLockPoolConfig DefaultPool { get; set; } = new();

    /// <summary>
    /// Default permit-acquisition wait timeout applied when a pool's
    /// <see cref="PlatformBackgroundLockPoolConfig.WaitTimeout"/> is null.
    /// Platform default is infinite wait; <see cref="DefaultMaxQueueDepthMultiplier"/> bounds
    /// how many waiters can park before fail-open admission.
    /// </summary>
    public TimeSpan DefaultWaitTimeout { get; set; } = Timeout.InfiniteTimeSpan;

    /// <summary>
    /// Default maximum permit hold time applied when a pool's
    /// <see cref="PlatformBackgroundLockPoolConfig.MaxHoldTime"/> is null.
    /// </summary>
    /// <remarks>
    /// When a permit has been held for this duration, the pool auto-releases it so other
    /// waiters can proceed. The still-running action is NEVER cancelled — it continues to
    /// completion uninterrupted. Restores pool capacity for burst mitigation when one
    /// action runs longer than typical. This safety net applies universally — both
    /// <c>Enabled=true</c> and <c>Enabled=false</c> modes receive auto-release. A background
    /// lock must never hold a slot forever.
    /// </remarks>
    public TimeSpan DefaultMaxHoldTime { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Default queue-depth multiplier applied when a pool has neither
    /// <see cref="PlatformBackgroundLockPoolConfig.MaxQueueDepth"/> nor
    /// <see cref="PlatformBackgroundLockPoolConfig.MaxQueueDepthMultiplier"/>.
    /// Effective default queue depth = <c>MaxConcurrent * DefaultMaxQueueDepthMultiplier</c>.
    /// Queue depth counts waiters only, not active permit holders.
    /// </summary>
    public int DefaultMaxQueueDepthMultiplier { get; set; } = 30;

    public void Validate()
    {
        if (!IsValidWaitTimeout(DefaultWaitTimeout))
            throw new ArgumentOutOfRangeException(nameof(DefaultWaitTimeout), DefaultWaitTimeout, "DefaultWaitTimeout must be non-negative or Timeout.InfiniteTimeSpan.");

        if (DefaultMaxHoldTime <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(DefaultMaxHoldTime), DefaultMaxHoldTime, "DefaultMaxHoldTime must be positive.");

        if (DefaultMaxQueueDepthMultiplier < 0)
            throw new ArgumentOutOfRangeException(
                nameof(DefaultMaxQueueDepthMultiplier),
                DefaultMaxQueueDepthMultiplier,
                "DefaultMaxQueueDepthMultiplier must be non-negative.");

        ValidatePool(nameof(DefaultPool), DefaultPool);

        foreach (var (poolName, pool) in Pools)
        {
            ValidatePool($"Pools[{poolName}]", pool);
        }
    }

    private static void ValidatePool(string name, PlatformBackgroundLockPoolConfig pool)
    {
        if (pool.MaxConcurrent < 1)
            throw new ArgumentOutOfRangeException($"{name}.{nameof(pool.MaxConcurrent)}", pool.MaxConcurrent, "MaxConcurrent must be at least 1.");

        if (pool.WaitTimeout.HasValue && !IsValidWaitTimeout(pool.WaitTimeout.Value))
            throw new ArgumentOutOfRangeException($"{name}.{nameof(pool.WaitTimeout)}", pool.WaitTimeout, "WaitTimeout must be non-negative or Timeout.InfiniteTimeSpan.");

        if (pool.MaxHoldTime.HasValue && pool.MaxHoldTime.Value <= TimeSpan.Zero)
            throw new ArgumentOutOfRangeException($"{name}.{nameof(pool.MaxHoldTime)}", pool.MaxHoldTime, "MaxHoldTime must be positive.");

        if (pool.MaxQueueDepth is < 0)
            throw new ArgumentOutOfRangeException($"{name}.{nameof(pool.MaxQueueDepth)}", pool.MaxQueueDepth, "MaxQueueDepth must be non-negative.");

        if (pool.MaxQueueDepthMultiplier is < 0)
            throw new ArgumentOutOfRangeException(
                $"{name}.{nameof(pool.MaxQueueDepthMultiplier)}",
                pool.MaxQueueDepthMultiplier,
                "MaxQueueDepthMultiplier must be non-negative.");
    }

    private static bool IsValidWaitTimeout(TimeSpan timeout)
    {
        return timeout == Timeout.InfiniteTimeSpan || timeout >= TimeSpan.Zero;
    }
}
