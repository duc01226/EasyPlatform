#region

using Easy.Platform.Common.Utils;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.BackgroundLock;

/// <summary>
/// Disabled-mode (<c>PlatformBackgroundLockConfig.Enabled=false</c>) fallback pool. Delegates to
/// the existing global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c> semaphore using
/// <see cref="Timeout.InfiniteTimeSpan"/> wait — admission parity with today's
/// <c>Util.TaskRunner.cs:172</c> <c>WaitAsync(ct)</c>. The caller-supplied <c>waitTimeout</c> is
/// intentionally ignored.
/// </summary>
/// <remarks>
/// <para>
/// This type keeps the same permit-pool contract even when per-domain pools are disabled. Callers
/// still call <see cref="AcquireAsync"/> and receive an <see cref="IPlatformBackgroundActionPermitPool.IPermit"/>;
/// they do not need separate feature-flag branches. The only admission difference is that this
/// pool waits indefinitely on the legacy global semaphore to preserve disabled-mode behavior.
/// </para>
/// <para>
/// <b>Strict improvement over legacy — runtime semantics only.</b> Today's global semaphore has
/// unbounded wait AND unbounded hold (a stuck handler holds its slot forever). This NoOp
/// implementation preserves the unbounded wait (admission parity) but adds the Timer-based
/// <c>MaxHoldTime</c> auto-release universally, so the slot recovers even when a thread stalls.
/// The principle <i>"a background lock must never hold a slot forever"</i> applies regardless of
/// feature-flag state.
/// </para>
/// <para>
/// <b>Per-callsite caveat.</b> "Strict improvement" describes the runtime safety net, NOT the
/// throughput at every individual callsite. Callsites that previously bypassed admission entirely
/// pre-migration (Inbox / Outbox / Cache passing the old <c>queueLimitLock: false</c>) now route
/// through the global semaphore in disabled-mode and therefore experience <b>bounded</b> contention
/// where they had unbounded fan-out before. This is intentional — see ADR §Rollback semantics under
/// <c>Enabled=false</c>. If a specific callsite genuinely requires unbounded fan-out as its
/// rollback target, do not rely on <c>Enabled=false</c> — pass <c>pool: null</c> to
/// <c>Util.TaskRunner.QueueActionInBackground</c> at that site to fully bypass admission.
/// </para>
/// <para>
/// Per-pool ObservableGauges are NOT registered for the NoOp pool (Phase 06 skips them). The
/// static <c>permit_auto_released_total</c> counter still fires for NoOp auto-releases, tagged
/// <c>pool="&lt;noop&gt;"</c> — universal observability of the safety net.
/// </para>
/// </remarks>
public sealed class NoOpBackgroundActionPermitPool : IPlatformBackgroundActionPermitPool
{
    public const string NoOpPoolName = "<noop>";

    private readonly TimeSpan? maxHoldTime;
    private readonly ILogger logger;

    public NoOpBackgroundActionPermitPool(TimeSpan? maxHoldTime, ILogger logger)
    {
        this.maxHoldTime = maxHoldTime;
        this.logger = logger;
        Max = Util.TaskRunner.GetDefaultParallelIoTaskMaxConcurrent();
    }

    public string Name => NoOpPoolName;

    public int Max { get; }

    public int Available => Util.TaskRunner.BackgroundActionQueueLimitLock.Value.CurrentCount;

    public int InUse => Max - Available;

    public int MaxQueueDepth => 0;

    public int QueueDepth => 0;

    /// <summary>
    /// Acquires a permit from the global <c>Util.TaskRunner.BackgroundActionQueueLimitLock</c>
    /// semaphore with <see cref="Timeout.InfiniteTimeSpan"/> wait. NoOp mode preserves today's
    /// unbounded admission queue behavior. The returned permit auto-releases after the configured
    /// <c>MaxHoldTime</c> (30s default) — the running action is not cancelled.
    /// </summary>
    /// <remarks>
    /// Unlike <see cref="SemaphoreSlimBackgroundActionPermitPool"/>, this method does not return
    /// <c>null</c> for wait timeout because timeout is intentionally disabled in fallback mode.
    /// </remarks>
    public async Task<IPlatformBackgroundActionPermitPool.IPermit?> AcquireAsync(CancellationToken cancellationToken = default)
    {
        var sem = Util.TaskRunner.BackgroundActionQueueLimitLock.Value;
        await sem.WaitAsync(Timeout.InfiniteTimeSpan, cancellationToken);
        return new BackgroundActionSemaphorePermit(sem, maxHoldTime, Name, logger);
    }
}
