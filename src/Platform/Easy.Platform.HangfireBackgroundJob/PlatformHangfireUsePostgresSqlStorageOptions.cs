using Hangfire.PostgreSql;

namespace Easy.Platform.HangfireBackgroundJob;

public class PlatformHangfireUsePostgreSqlStorageOptions
{
    public static readonly PostgreSqlStorageOptions DefaultStorageOptions = new()
    {
        JobExpirationCheckInterval = PlatformHangfireCommonOptions.DefaultJobExpirationCheckInterval,
        CountersAggregateInterval = PlatformHangfireCommonOptions.DefaultCountersAggregateInterval,
        QueuePollInterval = PlatformHangfireCommonOptions.DefaultQueuePollInterval
    };

    public string ConnectionString { get; set; }

    public PostgreSqlStorageOptions StorageOptions { get; set; } = DefaultStorageOptions;
}
