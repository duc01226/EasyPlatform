using Hangfire.PostgreSql;

namespace Easy.Platform.HangfireBackgroundJob;

public class PlatformHangfireUsePostgreSqlStorageOptions
{
    public string ConnectionString { get; set; }

    public PostgreSqlStorageOptions StorageOptions { get; set; } = new()
    {
        JobExpirationCheckInterval = PlatformHangfireCommonOptions.DefaultJobExpirationCheckInterval,
        CountersAggregateInterval = PlatformHangfireCommonOptions.DefaultCountersAggregateInterval,
        QueuePollInterval = PlatformHangfireCommonOptions.DefaultQueuePollInterval
    };
}
