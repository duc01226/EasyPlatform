using System.Diagnostics;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Infrastructures.Caching;

/// <summary>
/// Provides configuration settings for the platform caching system.
/// This class contains default cache options and performance monitoring settings for cache operations.
/// </summary>
public class PlatformCacheSettings
{
    /// <summary>
    /// Gets or sets the default cache entry options that will be applied to cache operations when no specific options are provided.
    /// These options control aspects like expiration time, priority, and other cache behavior settings.
    /// </summary>
    public PlatformCacheEntryOptions DefaultCacheEntryOptions { get; set; } = new();

    /// <summary>
    /// Gets or sets the configuration for slow operation warning functionality.
    /// This setting helps monitor cache performance by logging warnings when cache operations take longer than expected.
    /// </summary>
    public PlatformCacheSettingsSlowWarningConfig SlowWarning { get; set; } = new();

    /// <summary>
    /// Executes a cache operation function while monitoring its performance and logging warnings for slow operations.
    /// This method wraps cache operations to provide performance monitoring capabilities, measuring execution time
    /// and logging warnings when operations exceed the configured threshold times.
    /// </summary>
    /// <typeparam name="T">The return type of the cache operation function.</typeparam>
    /// <param name="executeFn">The asynchronous function to execute that performs the cache operation.</param>
    /// <param name="loggerFactory">A factory function that provides a logger instance for warning messages.</param>
    /// <param name="forSetData">A flag indicating whether this operation is for setting data (true) or getting data (false). This affects the threshold used for slow operation detection.</param>
    /// <returns>A task that represents the asynchronous operation, containing the result of the executed function.</returns>
    public async Task<T> ExecuteWithSlowWarning<T>(Func<Task<T>> executeFn, Func<ILogger> loggerFactory, bool forSetData = false)
    {
        if (SlowWarning.IsEnabled)
        {
            // Store stack trace before call executeFn to keep the original stack trace to log
            // after executeFn could lose full stack trace (may because it connects async to other external service)
            var fullStackTrace = PlatformEnvironment.StackTrace();

            var startQueryTimeStamp = Stopwatch.GetTimestamp();

            var result = await executeFn();

            var queryElapsedTime = Stopwatch.GetElapsedTime(startQueryTimeStamp);

            if (queryElapsedTime.TotalMilliseconds >= SlowWarning.GetSlowQueryMillisecondsThreshold(forSetData))
            {
                loggerFactory()
                    .Log(
                        SlowWarning.IsLogWarningAsError ? LogLevel.Error : LogLevel.Warning,
                        "[SlowDistributedCacheWarning][IsLogWarningAsError:{IsLogWarningAsError}][ForWrite:{ForWrite}] Slow redis cache execution. QueryElapsedTime.TotalMilliseconds:{QueryElapsedTime}. "
                            + "SlowCacheWarningTrackTrace:{TrackTrace}",
                        SlowWarning.IsLogWarningAsError,
                        forSetData.ToString(),
                        queryElapsedTime.TotalMilliseconds,
                        fullStackTrace
                    );
            }

            return result;
        }

        return await executeFn();
    }

    /// <summary>
    /// Executes a cache operation function while monitoring its performance and logging warnings for slow operations.
    /// This method wraps cache operations to provide performance monitoring capabilities, measuring execution time
    /// and logging warnings when operations exceed the configured threshold times.
    /// </summary>
    /// <param name="executeFn">The asynchronous function to execute that performs the cache operation.</param>
    /// <param name="loggerFactory">A factory function that provides a logger instance for warning messages.</param>
    /// <param name="forSetData">A flag indicating whether this operation is for setting data (true) or getting data (false). This affects the threshold used for slow operation detection.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task ExecuteWithSlowWarning(Func<Task> executeFn, Func<ILogger> loggerFactory, bool forSetData = false)
    {
        await ExecuteWithSlowWarning(executeFn.ToAsyncFunc(), loggerFactory, forSetData);
    }
}

/// <summary>
/// Configuration class for monitoring and warning about slow cache operations.
/// This class provides settings to control performance monitoring thresholds
/// and logging behavior for cache operations.
/// </summary>
public class PlatformCacheSettingsSlowWarningConfig
{
    /// <summary>
    /// Gets or sets a value indicating whether the slow warning monitoring is enabled.
    /// When true, the system will monitor cache operations and log warnings for slow operations.
    /// </summary>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether slow operation warnings should be logged as errors.
    /// If true, the warning log will be logged at Error level rather than Warning level.
    /// </summary>
    public bool IsLogWarningAsError { get; set; }

    /// <summary>
    /// Gets or sets the threshold in milliseconds for detecting slow get operations.
    /// Cache read operations that take longer than this threshold will trigger warnings.
    /// Default is 50 milliseconds.
    /// </summary>
    public int SlowGetMillisecondsThreshold { get; set; } = 50;

    /// <summary>
    /// Gets or sets the threshold in milliseconds for detecting slow write operations.
    /// Cache write/update operations that take longer than this threshold will trigger warnings.
    /// Default is 100 milliseconds.
    /// </summary>
    public int SlowWriteQueryMillisecondsThreshold { get; set; } = 100;

    /// <summary>
    /// Gets the appropriate slow query threshold based on the operation type.
    /// </summary>
    /// <param name="forSetData">If true, returns the write operation threshold; otherwise, returns the read operation threshold.</param>
    /// <returns>The threshold value in milliseconds for the specified operation type.</returns>
    public int GetSlowQueryMillisecondsThreshold(bool forSetData)
    {
        return forSetData ? SlowWriteQueryMillisecondsThreshold : SlowGetMillisecondsThreshold;
    }
}
