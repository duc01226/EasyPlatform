#region

using Easy.Platform.Common.Utils;

#endregion

namespace Easy.Platform.Application.MessageBus.InboxPattern;

public class PlatformInboxConfig
{
    public const int DefaultProcessConsumeMessageRetryCount = 100;

    /// <summary>
    /// This is used to calculate the next retry process message time.
    /// Ex: NextRetryProcessAfter = DateTime.UtcNow.AddSeconds(retryProcessFailedMessageInSecondsUnit * Math.Pow(2, retriedProcessCount ?? 0));
    /// </summary>
    public double RetryProcessFailedMessageInSecondsUnit { get; set; } = PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit;

    /// <summary>
    /// To config how long a processed message can live in the database in seconds. Default is one week (14 days);
    /// </summary>
    public double DeleteProcessedMessageInSeconds { get; set; } = TimeSpan.FromDays(14).TotalSeconds;

    /// <summary>
    /// To config max store processed message count. Will delete old messages of maximum messages happened
    /// </summary>
    public int MaxStoreProcessedMessageCount { get; set; } = 100;

    /// <summary>
    /// To config how long a message can live in the database as Failed in seconds. Default is two week (30 days); After that the message will be automatically ignored by change status to Ignored
    /// </summary>
    public double IgnoreExpiredFailedMessageInSeconds { get; set; } = TimeSpan.FromDays(30).TotalSeconds;

    /// <summary>
    /// To config how long a message can live in the database as Ignored in seconds. Default is one month (30 days); After that the message will be automatically deleted
    /// </summary>
    public double DeleteExpiredIgnoredMessageInSeconds { get; set; } = TimeSpan.FromDays(30).TotalSeconds;

    /// <summary>
    /// Default number messages is processed to be Deleted/Ignored in batch. Default is DefaultNumberOfParallelIoTasksPerCpuRatio;
    /// </summary>
    public int NumberOfDeleteMessagesBatch { get; set; } = Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

    public double MessageCleanerTriggerIntervalInMinutes { get; set; } = 1;

    public int ProcessClearMessageRetryCount { get; set; } = 5;

    public int GetCanHandleMessageGroupedByConsumerIdPrefixesPageSize { get; set; } = 1000;

    public int ProcessConsumeMessageRetryCount { get; set; } = DefaultProcessConsumeMessageRetryCount;

    public int ProcessConsumeMessageRetryDelaySeconds { get; set; } = 5;

    public int MinimumRetryConsumeInboxMessageTimesToLogError { get; set; } = DefaultProcessConsumeMessageRetryCount * 8 / 10;

    public bool LogIntervalProcessInformation { get; set; }

    public int CheckToProcessTriggerIntervalTimeSeconds { get; set; } = 30;

    public int MaxParallelProcessingMessagesCount { get; set; } = Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent;

    /// <summary>
    /// Soft-cap timeout (seconds) for acquiring a slot from <c>processMessageParallelLimitLock</c> inside
    /// <c>HandleInboxMessageAsync</c>. When this timeout fires before a permit is available, the consumer
    /// proceeds WITHOUT a permit (temporary overshoot of <see cref="MaxParallelProcessingMessagesCount"/>)
    /// so a small number of hung consumers cannot block fresh messages indefinitely.
    /// <para>
    /// <b>Rationale:</b> The semaphore exists for throttling, not deadlock prevention. Under hang scenarios
    /// (consumer deadlocked, ping task alive) permits can be held until Fix B's hard 24h <c>CancelAfter</c>
    /// fires — without this soft cap, head-of-line blocking would stall ALL new messages for up to 24h.
    /// With overshoot enabled, normal load stays within the throttling cap, and only the partial-hang
    /// scenario triggers temporary cap violation.
    /// </para>
    /// <para>
    /// <b>Default 60s</b> — long enough that brief consumer spikes don't trigger overshoot, short enough
    /// that a single hung consumer doesn't stall recovery beyond one interval cycle.
    /// </para>
    /// <para>
    /// <b>Operational signal:</b> Log warning emitted on overshoot. Sustained overshoot under normal load
    /// indicates <see cref="MaxParallelProcessingMessagesCount"/> is undersized — raise the cap, don't
    /// raise this timeout.
    /// </para>
    /// </summary>
    public int PermitAcquisitionTimeoutSeconds { get; set; } = 60;

    /// <summary>
    /// Per-consume wall-clock ceiling (seconds) used by
    /// <c>PlatformConsumeInboxBusMessageHostedService.InvokeConsumerAsync</c> as a
    /// <see cref="CancellationTokenSource.CancelAfter(TimeSpan)"/> safety net to bound a single consumer
    /// invocation's wall-clock lifetime. This is NOT used as a recovery query branch — long-running ≠ stuck.
    /// <para>
    /// <b>Default 7 days</b> (<see cref="PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds"/>) — generous headroom for
    /// long-running legitimate consumers (bulk migrations, batch imports, multi-hour ETL). A consumer that is genuinely
    /// still progressing will keep refreshing <see cref="PlatformInboxBusMessage.LastProcessingPingDate"/> via the
    /// background ping task; ping-stale recovery (Part 3, ~600s) handles the cross-host stuck-Processing case.
    /// </para>
    /// <para>
    /// <b>When this CancelAfter fires:</b> ONLY as a defensive guard against a single zombie consumer task that
    /// would otherwise run forever inside the current host. Once cancelled, the await wrapper throws and the
    /// message moves to the Failed-retry pathway.
    /// </para>
    /// <para>
    /// <b>Per-service override:</b> If a consumer legitimately runs &gt;7 days, raise this value at module
    /// registration time. Do NOT lower the default — falsely killing a still-progressing consumer causes
    /// duplicate-execution risk.
    /// </para>
    /// <para>
    /// <b>Duplication trade-off (accepted):</b> When this ceiling triggers on a hung consumer, the orphan task
    /// keeps running because no <c>CancellationToken</c> is plumbed into the consumer pipeline. The same message
    /// may then be re-popped (same host on Failed-retry, or different host via the ping-stale branch once the
    /// orphan's ping task stops) and a second consumer instance runs in parallel with the orphan. All inbox
    /// consumers MUST be idempotent — see XML docs on <c>IPlatformMessageBusConsumer.HandleAsync</c>.
    /// </para>
    /// </summary>
    public int MaxProcessingDurationSeconds { get; set; } = PlatformInboxBusMessage.DefaultMaxProcessingDurationSeconds;
}
