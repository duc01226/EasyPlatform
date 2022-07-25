namespace Easy.Platform.Application.MessageBus.OutboxPattern;

public class PlatformOutboxConfig
{
    /// <summary>
    /// You may only want to set this to true only when you are using mix old system and new platform code. You do not call uow.complete
    /// after call sendMessages. This will force sending message always start use there own uow
    /// </summary>
    public bool ForceAlwaysSendOutboxInNewUow { get; set; }

    /// <summary>
    /// This is used to calculate the next retry process message time.
    /// Ex: NextRetryProcessAfterDate = DateTime.UtcNow.AddSeconds(retryProcessFailedMessageInSecondsUnit * Math.Pow(2, retriedProcessCount ?? 0));
    /// </summary>
    public double RetryProcessFailedMessageInSecondsUnit { get; set; } =
        PlatformOutboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit;
}
