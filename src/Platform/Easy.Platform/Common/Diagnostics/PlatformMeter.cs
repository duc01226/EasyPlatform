#region

using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using System.Threading;

#endregion

namespace Easy.Platform.Common.Diagnostics;

/// <summary>
/// Central <c>System.Diagnostics.Metrics.Meter</c> source for the Easy.Platform framework.
/// First metrics infrastructure in Platform — mirrors the existing <c>ActivitySource</c>
/// pattern (simple type-name strings, discoverable in OTel exporters).
/// </summary>
/// <remarks>
/// Per-pool gauges register on first <see cref="RegisterGaugesForPool"/> call (lazy, idempotent).
/// Later same-name registrations update the observed callbacks so provider/test-host rebuilds
/// do not leave gauges pinned to a disposed first pool instance.
/// All instruments are tagged with <c>pool</c> for Grafana / Aspire Dashboard slicing.
/// Gauge observation wraps in try/catch over <see cref="ObjectDisposedException"/> — callbacks
/// may fire during host shutdown after a pool has disposed; on dispose we return an empty
/// measurement set and the OTel pipeline simply omits the data point.
/// </remarks>
public static class PlatformMeter
{
    /// <summary>
    /// Canonical Meter name. MUST match the literal string passed to <c>AddMeter(...)</c> in
    /// <c>BravoSuite.ServiceDefaults/Extensions.cs</c> <c>ConfigureOpenTelemetry</c> — drift causes
    /// silent telemetry loss (OTel SDK simply does not subscribe to a meter whose name does not
    /// match the literal). Edit BOTH sites together.
    /// </summary>
    public const string MeterName = "Easy.Platform";

    public static readonly Meter Instance = new(
        MeterName,
        typeof(PlatformMeter).Assembly.GetName().Version?.ToString());

    /// <summary>
    /// Histogram (ms) of time spent waiting in <c>SemaphoreSlim.WaitAsync</c> before permit acquisition.
    /// Tagged <c>pool</c>. Tail percentiles drive operator decisions on pool sizing.
    /// </summary>
    public static readonly Histogram<double> WaitDurationMs =
        Instance.CreateHistogram<double>("easyplatform.bgqueue.wait_duration", "ms");

    /// <summary>
    /// Histogram (ms) of time a permit is held (between acquire and Dispose OR auto-release).
    /// Tagged <c>pool</c>. Used to tune <c>MaxHoldTime</c> per pool.
    /// </summary>
    public static readonly Histogram<double> HoldDurationMs =
        Instance.CreateHistogram<double>("easyplatform.bgqueue.hold_duration", "ms");

    /// <summary>
    /// Counter of permit acquisitions that timed out (caller fell open and ran without a permit).
    /// Tagged <c>pool</c>. Sustained &gt; 1Hz indicates pool undersizing.
    /// </summary>
    public static readonly Counter<long> WaitTimeoutTotal =
        Instance.CreateCounter<long>("easyplatform.bgqueue.wait_timeout_total");

    /// <summary>
    /// Counter of permit acquisitions that found the wait queue full. The caller falls open and
    /// runs without a permit; this counter distinguishes backlog shedding from wait timeout.
    /// </summary>
    public static readonly Counter<long> QueueFullTotal =
        Instance.CreateCounter<long>("easyplatform.bgqueue.queue_full_total");

    /// <summary>
    /// Counter of permits auto-released by the <c>MaxHoldTime</c> safety net.
    /// Tagged <c>pool</c>; NoOp-pool auto-releases carry <c>pool="&lt;noop&gt;"</c>.
    /// Sustained &gt; 0.1Hz in a single pool: capture handler thread dumps via
    /// <c>dotnet-dump collect</c> BEFORE shortening MaxHoldTime — auto-release is a symptom.
    /// </summary>
    public static readonly Counter<long> PermitAutoReleasedTotal =
        Instance.CreateCounter<long>("easyplatform.bgqueue.permit_auto_released_total");

    private static readonly ConcurrentDictionary<string, PoolGaugeState> RegisteredPools = new();

    /// <summary>
    /// Registers per-pool <c>ObservableGauge&lt;int&gt;</c> instruments for permits and queue depth,
    /// all tagged <c>pool</c>. Callbacks wrap in try/catch over
    /// <see cref="ObjectDisposedException"/> (host-shutdown race) and return an empty measurement
    /// set on disposed — the OTel pipeline tolerates empty observations.
    /// </summary>
    /// <param name="poolName">Pool name used as the <c>pool</c> tag value.</param>
    /// <param name="available">Callback returning current available permit count (e.g. <c>SemaphoreSlim.CurrentCount</c>).</param>
    /// <param name="max">Callback returning configured pool max.</param>
    /// <param name="queueDepth">Callback returning current waiter count.</param>
    /// <param name="maxQueueDepth">Callback returning configured max waiter count.</param>
    public static void RegisterGaugesForPool(
        string poolName,
        Func<int> available,
        Func<int> max,
        Func<int>? queueDepth = null,
        Func<int>? maxQueueDepth = null)
    {
        var state = RegisteredPools.GetOrAdd(poolName, static name => new PoolGaugeState(name));
        state.Update(available, max, queueDepth ?? (() => 0), maxQueueDepth ?? (() => 0));

        if (!state.TryMarkGaugesRegistered()) return;

        Instance.CreateObservableGauge<int>(
            "easyplatform.bgqueue.permits.available",
            state.ObserveAvailable);

        Instance.CreateObservableGauge<int>(
            "easyplatform.bgqueue.permits.in_use",
            state.ObserveInUse);

        Instance.CreateObservableGauge<int>(
            "easyplatform.bgqueue.queue_depth",
            state.ObserveQueueDepth);

        Instance.CreateObservableGauge<int>(
            "easyplatform.bgqueue.max_queue_depth",
            state.ObserveMaxQueueDepth);
    }

    private sealed class PoolGaugeState
    {
        private readonly KeyValuePair<string, object?> poolTag;
        private readonly Lock syncRoot = new();
        private Func<int> available = () => 0;
        private bool gaugesRegistered;
        private Func<int> max = () => 0;
        private Func<int> maxQueueDepth = () => 0;
        private Func<int> queueDepth = () => 0;

        public PoolGaugeState(string poolName)
        {
            poolTag = new KeyValuePair<string, object?>("pool", poolName);
        }

        /// <summary>
        /// Replaces the callbacks observed by already-registered gauges. Observable gauges cannot
        /// be unregistered per pool name, so this indirection lets rebuilt providers/test hosts
        /// point the existing instrument at the current pool instance.
        /// </summary>
        public void Update(Func<int> available, Func<int> max, Func<int> queueDepth, Func<int> maxQueueDepth)
        {
            lock (syncRoot)
            {
                this.available = available;
                this.max = max;
                this.queueDepth = queueDepth;
                this.maxQueueDepth = maxQueueDepth;
            }
        }

        public bool TryMarkGaugesRegistered()
        {
            lock (syncRoot)
            {
                if (gaugesRegistered) return false;

                gaugesRegistered = true;
                return true;
            }
        }

        public IEnumerable<Measurement<int>> ObserveAvailable()
        {
            try
            {
                // Copy callbacks under lock, then invoke outside the lock so metric observation
                // never holds the state lock while touching a potentially disposed pool.
                var (currentAvailable, _, _, _) = CurrentCallbacks();
                return [new Measurement<int>(currentAvailable(), poolTag)];
            }
            catch (ObjectDisposedException)
            {
                return [];
            }
        }

        public IEnumerable<Measurement<int>> ObserveInUse()
        {
            try
            {
                // In-use is derived from max and available at observation time; it stays accurate
                // even when the callbacks were replaced by a newer pool instance.
                var (currentAvailable, currentMax, _, _) = CurrentCallbacks();
                return [new Measurement<int>(currentMax() - currentAvailable(), poolTag)];
            }
            catch (ObjectDisposedException)
            {
                return [];
            }
        }

        public IEnumerable<Measurement<int>> ObserveQueueDepth()
        {
            try
            {
                var (_, _, currentQueueDepth, _) = CurrentCallbacks();
                return [new Measurement<int>(currentQueueDepth(), poolTag)];
            }
            catch (ObjectDisposedException)
            {
                return [];
            }
        }

        public IEnumerable<Measurement<int>> ObserveMaxQueueDepth()
        {
            try
            {
                var (_, _, _, currentMaxQueueDepth) = CurrentCallbacks();
                return [new Measurement<int>(currentMaxQueueDepth(), poolTag)];
            }
            catch (ObjectDisposedException)
            {
                return [];
            }
        }

        private (Func<int> Available, Func<int> Max, Func<int> QueueDepth, Func<int> MaxQueueDepth) CurrentCallbacks()
        {
            lock (syncRoot)
            {
                return (available, max, queueDepth, maxQueueDepth);
            }
        }
    }
}
