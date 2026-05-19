#region

using System.Diagnostics;
using Easy.Platform.Common.Diagnostics;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.BackgroundLock;

/// <summary>
/// Default <see cref="IPlatformBackgroundActionPermitPool"/> implementation backed by a single
/// <see cref="SemaphoreSlim"/>. Permits carry a Timer-based <c>MaxHoldTime</c> auto-release so a
/// stuck handler cannot starve the pool indefinitely; the running action is never cancelled.
/// </summary>
/// <remarks>
/// This class is deliberately small because its job is infrastructure, not business policy. The
/// registry decides which pool name/config to use; TaskRunner decides what to do on admission
/// rejection. This type only enforces the mechanics: bounded queue depth, bounded or infinite wait,
/// one slot per permit, release-on-dispose, release-at-most-once, and metric emission around those
/// transitions.
/// </remarks>
public sealed class SemaphoreSlimBackgroundActionPermitPool : IPlatformBackgroundActionPermitPool, IDisposable
{
    private readonly SemaphoreSlim semaphore;
    private readonly TimeSpan waitTimeout;
    private readonly TimeSpan? maxHoldTime;
    private readonly ILogger logger;
    private readonly KeyValuePair<string, object?> poolTag;
    private int currentQueueDepth;

    /// <summary>
    /// Creates a semaphore-backed pool for one logical background-work domain.
    /// </summary>
    /// <param name="name">Logical pool name used in logs and metric tags.</param>
    /// <param name="maxConcurrent">Maximum number of permits the pool can issue concurrently.</param>
    /// <param name="waitTimeout">Maximum time a caller waits for a permit before receiving <c>null</c>.</param>
    /// <param name="maxHoldTime">Optional safety-net duration after which a held permit is auto-released.</param>
    /// <param name="maxQueueDepth">Maximum number of callers allowed to wait for a permit.</param>
    /// <param name="logger">Logger used by auto-release warnings.</param>
    public SemaphoreSlimBackgroundActionPermitPool(
        string name,
        int maxConcurrent,
        TimeSpan waitTimeout,
        TimeSpan? maxHoldTime,
        int maxQueueDepth,
        ILogger logger)
    {
        Name = name;
        Max = maxConcurrent;
        MaxQueueDepth = maxQueueDepth;
        semaphore = new SemaphoreSlim(maxConcurrent, maxConcurrent);
        this.waitTimeout = waitTimeout;
        this.maxHoldTime = maxHoldTime;
        this.logger = logger;
        poolTag = new KeyValuePair<string, object?>("pool", name);
        PlatformMeter.RegisterGaugesForPool(name, () => semaphore.CurrentCount, () => Max, () => QueueDepth, () => MaxQueueDepth);
    }

    public string Name { get; }

    public int Max { get; }

    public int Available => semaphore.CurrentCount;

    public int InUse => Max - Available;

    public int MaxQueueDepth { get; }

    public int QueueDepth => Volatile.Read(ref currentQueueDepth);

    /// <summary>
    /// Attempts to reserve one semaphore slot for the caller. A successful acquisition returns a
    /// disposable permit lease; timeout or queue-full admission returns <c>null</c> so the caller
    /// can fail open.
    /// </summary>
    /// <remarks>
    /// Timeout and queue-full pressure are modeled as nullable returns instead of exceptions because
    /// pressure is an expected operating condition. Exceptions remain reserved for cancellation or
    /// unexpected infrastructure failures.
    /// </remarks>
    public async Task<IPlatformBackgroundActionPermitPool.IPermit?> AcquireAsync(CancellationToken cancellationToken = default)
    {
        var startTs = Stopwatch.GetTimestamp();

        if (await semaphore.WaitAsync(TimeSpan.Zero, cancellationToken))
        {
            PlatformMeter.WaitDurationMs.Record(Stopwatch.GetElapsedTime(startTs).TotalMilliseconds, poolTag);
            return new BackgroundActionSemaphorePermit(semaphore, maxHoldTime, Name, logger);
        }

        if (!TryReserveQueueSlot())
        {
            PlatformMeter.QueueFullTotal.Add(1, poolTag);
            return null;
        }

        // SemaphoreSlim is the actual bulkhead: WaitAsync decrements capacity on success and
        // reports false when no slot is available before the configured timeout.
        try
        {
            var acquired = await semaphore.WaitAsync(waitTimeout, cancellationToken);
            var elapsedMs = Stopwatch.GetElapsedTime(startTs).TotalMilliseconds;
            PlatformMeter.WaitDurationMs.Record(elapsedMs, poolTag);
            if (!acquired)
            {
                PlatformMeter.WaitTimeoutTotal.Add(1, poolTag);
                return null;
            }
            return new BackgroundActionSemaphorePermit(semaphore, maxHoldTime, Name, logger);
        }
        finally
        {
            Interlocked.Decrement(ref currentQueueDepth);
        }
    }

    private bool TryReserveQueueSlot()
    {
        while (true)
        {
            var snapshot = Volatile.Read(ref currentQueueDepth);
            if (snapshot >= MaxQueueDepth) return false;

            if (Interlocked.CompareExchange(ref currentQueueDepth, snapshot + 1, snapshot) == snapshot) return true;
        }
    }

    /// <summary>
    /// Disposes the underlying semaphore. The registry owns pool lifetime and calls this on
    /// shutdown; individual permits are disposed separately by their callers or auto-release timer.
    /// </summary>
    public void Dispose()
    {
        semaphore.Dispose();
    }
}

/// <summary>
/// Permit primitive shared by <see cref="SemaphoreSlimBackgroundActionPermitPool"/> and
/// <c>NoOpBackgroundActionPermitPool</c>. Releases the underlying <see cref="SemaphoreSlim"/>
/// exactly once — guarded by <see cref="Interlocked.Exchange(ref int, int)"/> so explicit
/// <see cref="IDisposable.Dispose"/> and the Timer-driven auto-release path are mutually exclusive.
/// Auto-release emits a structured warning + increments <c>PermitAutoReleasedTotal</c> tagged with the pool name.
/// Hold duration recorded to <c>HoldDurationMs</c> histogram on first release path (explicit or auto).
/// </summary>
/// <remarks>
/// This is the lease object in the permit-pool pattern. The pool hands it to a caller only after a
/// semaphore slot has been acquired. The caller does not know about the semaphore; it simply
/// disposes the lease. The lease also owns the timer so the same exact-once release logic covers
/// normal completion and the safety-net path.
/// </remarks>
internal sealed class BackgroundActionSemaphorePermit : IPlatformBackgroundActionPermitPool.IPermit
{
    private int released;
    private readonly SemaphoreSlim sem;
    private readonly Timer? autoReleaseTimer;
    private readonly string poolName;
    private readonly ILogger logger;
    private readonly long acquiredTs;

    /// <summary>
    /// Starts a permit lease. If <paramref name="maxHoldTime"/> is configured, a one-shot timer is
    /// armed to restore the semaphore slot even if the action never reaches normal disposal.
    /// </summary>
    public BackgroundActionSemaphorePermit(SemaphoreSlim sem, TimeSpan? maxHoldTime, string poolName, ILogger logger)
    {
        this.sem = sem;
        this.poolName = poolName;
        this.logger = logger;
        acquiredTs = Stopwatch.GetTimestamp();
        if (maxHoldTime.HasValue)
            autoReleaseTimer = new Timer(_ => TryRelease(autoReleased: true), null, maxHoldTime.Value, Timeout.InfiniteTimeSpan);
    }

    /// <summary>
    /// Releases the slot for normal action completion and disposes the timer. The actual release
    /// is delegated to <see cref="TryRelease"/> so explicit dispose and timer callback share the
    /// same exact-once guard.
    /// </summary>
    public void Dispose()
    {
        TryRelease(autoReleased: false);
        autoReleaseTimer?.Dispose();
    }

    private void TryRelease(bool autoReleased)
    {
        // Interlocked.Exchange is the concurrency guard: whichever path wins (normal Dispose or
        // timer callback) performs the release; the losing path becomes a no-op.
        if (Interlocked.Exchange(ref released, 1) != 0) return;

        sem.TryRelease();
        var poolTag = new KeyValuePair<string, object?>("pool", poolName);
        try
        {
            PlatformMeter.HoldDurationMs.Record(Stopwatch.GetElapsedTime(acquiredTs).TotalMilliseconds, poolTag);
        }
        catch (ObjectDisposedException)
        {
        }
        if (autoReleased)
        {
            try
            {
                logger.LogWarning(
                    "BackgroundLock: permit auto-released after MaxHoldTime in pool {Pool}; action continues uninterrupted",
                    poolName);
                PlatformMeter.PermitAutoReleasedTotal.Add(1, poolTag);
            }
            catch (ObjectDisposedException)
            {
            }
        }
    }
}
