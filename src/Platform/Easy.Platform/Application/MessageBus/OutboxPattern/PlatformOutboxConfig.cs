#region

using Easy.Platform.Common.Utils;

#endregion

namespace Easy.Platform.Application.MessageBus.OutboxPattern;

public class PlatformOutboxConfig
{
    public const int DefaultProcessSendMessageRetryCount = 100;

    /// <summary>
    /// This is used to calculate the next retry process message time.
    /// Ex: NextRetryProcessAfterDate = DateTime.UtcNow.AddSeconds(retryProcessFailedMessageInSecondsUnit * Math.Pow(2, retriedProcessCount ?? 0));
    /// </summary>
    public double RetryProcessFailedMessageInSecondsUnit { get; set; } = PlatformOutboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit;

    /// <summary>
    /// AutoDeleteProcessedMessage
    /// </summary>
    public bool AutoDeleteProcessedMessage { get; set; } = false;

    /// <summary>
    /// Set StandaloneScopeForOutbox = true only when apply platform for old code/project have not open and complete uow. Remove it after finish refactoring
    /// </summary>
    public bool StandaloneScopeForOutbox { get; set; }

    /// <summary>
    /// To config how long a message can live in the database in seconds. Default is one week (14 day);
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
    /// Default number messages is processed to be Deleted/Ignored in batch. Default is Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;
    /// </summary>
    public int NumberOfDeleteMessagesBatch { get; set; } = Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

    public double MessageCleanerTriggerIntervalInMinutes { get; set; } = 1;

    public int ProcessClearMessageRetryCount { get; set; } = 5;

    public int GetCanHandleMessageGroupedByTypeIdPrefixesPageSize { get; set; } = 1000;

    public int ProcessSendMessageRetryCount { get; set; } = DefaultProcessSendMessageRetryCount;

    public int ProcessSendMessageRetryDelaySeconds { get; set; } = 5;

    public bool LogIntervalProcessInformation { get; set; }

    public int CheckToProcessTriggerIntervalTimeSeconds { get; set; } = 30;

    public int MinimumRetrySendOutboxMessageTimesToLogError { get; set; } = DefaultProcessSendMessageRetryCount * 8 / 10;

    public int MaxParallelProcessingMessagesCount { get; set; } = Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent * 2;
}
