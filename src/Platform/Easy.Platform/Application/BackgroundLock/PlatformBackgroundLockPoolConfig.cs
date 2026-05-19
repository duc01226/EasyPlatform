#region

using Easy.Platform.Common.Utils;

#endregion

namespace Easy.Platform.Application.BackgroundLock;

/// <summary>
/// Per-pool sizing and timeout configuration for a named <c>BackgroundActionPermitPool</c>.
/// Populated via <see cref="PlatformBackgroundLockConfig.Pools"/> dictionary keyed by pool name
/// (e.g. <c>EventHandlerFanOut</c>, <c>OutboxDispatch</c>, <c>InboxConsume</c>,
/// <c>CacheWrite</c>, <c>DbPostSave</c>, <c>Default</c>).
/// </summary>
/// <remarks>
/// These values tune a soft limiter. They are meant to reduce burst fan-out and surface pressure,
/// not to provide strict mutual exclusion. If a handler must never overlap with another handler,
/// use a correctness lock at the domain/persistence layer instead of this background admission pool.
/// </remarks>
public class PlatformBackgroundLockPoolConfig
{
    /// <summary>
    /// Maximum number of concurrent background actions allowed to hold a permit from this pool.
    /// Default = <c>Util.TaskRunner.GetDefaultParallelIoTaskMaxConcurrent()</c>
    /// (i.e., <c>EffectiveProcessorCount × DefaultNumberOfParallelIoTasksPerCpuRatio</c>).
    /// </summary>
    /// <remarks>
    /// Read once at config construction time — runtime mutation of
    /// <see cref="Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio"/> will NOT
    /// retroactively resize existing pools (pools are lazy-built and cached for process lifetime).
    /// </remarks>
    public int MaxConcurrent { get; set; } = Util.TaskRunner.GetDefaultParallelIoTaskMaxConcurrent();

    /// <summary>
    /// Maximum time a caller will wait to acquire a permit from this pool. When <c>null</c>,
    /// the pool falls back to <see cref="PlatformBackgroundLockConfig.DefaultWaitTimeout"/>.
    /// On timeout the caller fails open — the action runs WITHOUT a permit, a warning is logged,
    /// and the <c>wait_timeout_total</c> counter is incremented.
    /// </summary>
    public TimeSpan? WaitTimeout { get; set; }

    /// <summary>
    /// Maximum time a permit may be held before the pool auto-releases it. When <c>null</c>,
    /// the pool falls back to <see cref="PlatformBackgroundLockConfig.DefaultMaxHoldTime"/>.
    /// </summary>
    /// <remarks>
    /// After a permit has been held for <c>MaxHoldTime</c>, the pool auto-releases it so other
    /// waiters can proceed. The still-running action is NEVER cancelled — it continues to
    /// completion. This restores pool capacity for burst mitigation when one action runs longer
    /// than typical. Tuning: set above the pool's expected p99 <c>hold_duration</c>; setting it
    /// below p99 amplifies downstream contention via routine auto-releases.
    /// <para>
    /// Anti-pattern: do NOT rely on this pool for handlers that require strict mutual exclusion —
    /// auto-release allows another action to acquire while the first is still running.
    /// </para>
    /// </remarks>
    public TimeSpan? MaxHoldTime { get; set; }

    /// <summary>
    /// Absolute maximum number of callers allowed to wait for a permit. When set, this beats
    /// <see cref="MaxQueueDepthMultiplier"/> and
    /// <see cref="PlatformBackgroundLockConfig.DefaultMaxQueueDepthMultiplier"/>.
    /// Queue depth counts waiters only; active permit holders are counted by <see cref="MaxConcurrent"/>.
    /// Set to <c>0</c> to disable queueing and fail open immediately when all permits are held.
    /// </summary>
    public int? MaxQueueDepth { get; set; }

    /// <summary>
    /// Per-pool queue-depth multiplier. Effective queue depth =
    /// <c>MaxConcurrent * MaxQueueDepthMultiplier</c> when <see cref="MaxQueueDepth"/> is null.
    /// When both are null, the pool falls back to
    /// <see cref="PlatformBackgroundLockConfig.DefaultMaxQueueDepthMultiplier"/>.
    /// </summary>
    public int? MaxQueueDepthMultiplier { get; set; }
}
