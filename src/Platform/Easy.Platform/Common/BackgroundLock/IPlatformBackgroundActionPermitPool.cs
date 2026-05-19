namespace Easy.Platform.Common.BackgroundLock;

/// <summary>
/// Abstraction for a named per-domain background-action permit pool. This is the framework's
/// bulkhead primitive for fire-and-forget work: instead of sending every background action through
/// one global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> <see cref="SemaphoreSlim"/>,
/// each work domain can own a small capacity bucket such as <c>InboxConsume</c>,
/// <c>OutboxDispatch</c>, or <c>CacheWrite</c>.
/// </summary>
/// <remarks>
/// <para>
/// Two implementations exist:
/// </para>
/// <list type="bullet">
///   <item><description><c>SemaphoreSlimBackgroundActionPermitPool</c> — enabled-mode default. Honors the
///   caller-supplied <c>waitTimeout</c> via <c>SemaphoreSlim.WaitAsync(timeout, ct)</c>; returns
///   <c>null</c> on timeout or queue-full admission (fail-open at admission).</description></item>
///   <item><description><c>NoOpBackgroundActionPermitPool</c> — disabled-mode fallback. Delegates to the
///   existing global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore using
///   <see cref="Timeout.InfiniteTimeSpan"/> wait — parity with today's
///   <c>Util.TaskRunner.cs:172</c> <c>WaitAsync(ct)</c> admission queue. The caller-supplied
///   <c>waitTimeout</c> is intentionally ignored. Callers that rely on bounded-wait semantics
///   must check <c>Enabled=true</c> upstream (Phase 07 startup-log surfaces the active mode).</description></item>
/// </list>
/// <para>
/// The design uses a lease pattern. <see cref="AcquireAsync"/> returns an <see cref="IPermit"/>
/// handle when the caller successfully enters the pool. The caller owns that lease with
/// <c>using (permit)</c>, and disposal releases the slot. This keeps acquisition/release local to
/// the caller while hiding the concrete synchronization primitive behind the interface.
/// </para>
/// <para>
/// The pool is a soft limiter, not a hard correctness lock. In enabled mode, acquisition can be
/// rejected and return <c>null</c> because the wait timed out or the wait queue was full; the
/// TaskRunner call site then runs the action without a permit (fail-open). That choice protects
/// integrity-critical background side effects from being dropped under pressure while still
/// exposing contention through metrics.
/// </para>
/// <para>
/// Both implementations issue permits that auto-release the underlying semaphore slot after
/// <c>MaxHoldTime</c>. The running action is <b>NEVER</b> cancelled — auto-release restores
/// pool capacity so other waiters can proceed; the long-running handler completes naturally.
/// A background lock must never hold a slot forever, regardless of feature-flag state.
/// </para>
/// </remarks>
public interface IPlatformBackgroundActionPermitPool
{
    /// <summary>
    /// Logical pool name used for configuration lookup, logs, and metrics tags
    /// (for example <c>EventHandlerFanOut</c>, <c>OutboxDispatch</c>, <c>InboxConsume</c>,
    /// <c>CacheWrite</c>, or <c>&lt;noop&gt;</c>).
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Configured maximum concurrent permits this pool may issue. For a semaphore-backed pool this
    /// maps to the semaphore's initial and maximum count.
    /// </summary>
    int Max { get; }

    /// <summary>
    /// Current count of permits available to issue. This is the live capacity gauge and, for the
    /// semaphore-backed implementation, matches <see cref="SemaphoreSlim.CurrentCount"/>.
    /// </summary>
    int Available { get; }

    /// <summary>
    /// Current count of permits held by running actions. Computed as <see cref="Max"/> minus
    /// <see cref="Available"/> so operators can see pool pressure without knowing semaphore internals.
    /// </summary>
    int InUse { get; }

    /// <summary>
    /// Maximum number of callers allowed to wait for a permit. This bounds backlog memory pressure
    /// separately from <see cref="Max"/>, which bounds active permit holders.
    /// </summary>
    int MaxQueueDepth { get; }

    /// <summary>
    /// Current number of callers waiting for a permit. Active permit holders are not included.
    /// </summary>
    int QueueDepth { get; }

    /// <summary>
    /// Acquire a permit from this pool. Returns <c>null</c> when admission is rejected (wait timeout
    /// or queue-full in enabled mode — NoOp pool uses infinite wait and never returns <c>null</c>).
    /// The returned <see cref="IPermit"/>
    /// auto-releases after the pool's configured <c>MaxHoldTime</c>; callers should still call
    /// <see cref="IDisposable.Dispose"/> on the happy path (release-on-completion).
    /// </summary>
    /// <remarks>
    /// Admission policy is baked into the pool at construction (looked up from <c>PlatformBackgroundLockConfig</c>
    /// by the registry) — callers no longer pay the per-call config dictionary lookup.
    /// A <c>null</c> result is an admission-control signal, not a failure of the action itself.
    /// Callers that need fire-and-forget reliability should run the action and log/measure the
    /// timeout or queue-full condition, which is exactly what
    /// <c>Util.TaskRunner.QueueActionInBackground</c> does.
    /// </remarks>
    /// <param name="cancellationToken">Cancels the wait; propagates <see cref="OperationCanceledException"/>.</param>
    Task<IPermit?> AcquireAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Permit handle returned by <see cref="AcquireAsync"/>. This is intentionally tiny: callers
    /// only need to hold the lease and dispose it when their action finishes. Disposing releases
    /// the underlying semaphore slot exactly once, so it is safe to call multiple times and safe to
    /// race with the pool's internal auto-release Timer.
    /// </summary>
    public interface IPermit : IDisposable
    {
    }
}
