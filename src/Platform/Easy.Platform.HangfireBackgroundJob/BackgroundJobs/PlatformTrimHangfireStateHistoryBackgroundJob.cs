#region

using Easy.Platform.Application.BackgroundJob;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

#endregion

namespace Easy.Platform.HangfireBackgroundJob.BackgroundJobs;

/// <summary>
/// Platform-level maintenance job to trim StateHistory arrays in Hangfire job documents.
/// Prevents MongoDB 16MB BSON document limit (Error 17419) from being exceeded.
///
/// <para><strong>Problem:</strong></para>
/// <para>Hangfire.Mongo stores job state transitions in a StateHistory array within each job document.
/// This array grows unbounded over time, especially for recurring jobs with executeOnStartUp=true.
/// When the document exceeds 16MB, MongoDB rejects updates with error code 17419.</para>
///
/// <para><strong>Solution:</strong></para>
/// <para>This job runs daily to trim StateHistory arrays to the last N entries (default: 20).
/// Combined with startup cleanup in PlatformHangfireBackgroundJobModule, this prevents accumulation.</para>
///
/// <para><strong>Registration:</strong></para>
/// <para>Automatically registered for services using MongoDB Hangfire storage.
/// Uses connection options from PlatformHangfireMongoOptionsHolder set during module initialization.</para>
/// </summary>
[PlatformRecurringJob("0 4 * * *")] // Daily at 4 AM UTC
public class PlatformTrimHangfireStateHistoryBackgroundJob : PlatformApplicationBackgroundJobExecutor
{
    /// <summary>
    /// Maximum number of state history entries to retain per job document.
    /// 20 entries is sufficient for debugging while preventing unbounded growth.
    /// </summary>
    public const int MaxStateHistoryEntries = 20;

    public PlatformTrimHangfireStateHistoryBackgroundJob(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler)
        : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }

    /// <summary>
    /// Disable automatic Unit of Work - this job accesses MongoDB directly, not through repositories.
    /// </summary>
    public override bool AutoOpenUow => false;

    public override async Task ProcessAsync(object? param)
    {
        var mongoOptions = PlatformHangfireMongoOptionsHolder.CurrentOptions;

        if (mongoOptions == null)
        {
            Logger.LogDebug("[Hangfire] Skipping StateHistory cleanup - not using MongoDB storage.");
            return;
        }

        try
        {
            var result = await TrimStateHistoryAsync(mongoOptions);

            Logger.LogInformation(
                "[Hangfire] Daily StateHistory cleanup completed. Modified {ModifiedCount} documents.",
                result.ModifiedCount);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(
                ex,
                "[Hangfire] StateHistory cleanup failed. Will retry on next scheduled run.");
        }
    }

    /// <summary>
    /// Trims StateHistory arrays in Hangfire job documents to prevent 16MB limit.
    /// Uses MongoDB $slice operator to keep only the last MaxStateHistoryEntries entries.
    /// </summary>
    /// <param name="options">MongoDB storage options containing connection details.</param>
    /// <param name="maxEntries">Maximum entries to retain (default: 20).</param>
    /// <param name="cancellationToken">Cancellation token for async operation.</param>
    /// <returns>Update result containing modified document count.</returns>
    public static async Task<UpdateResult> TrimStateHistoryAsync(
        PlatformHangfireUseMongoStorageOptions options,
        int maxEntries = MaxStateHistoryEntries,
        CancellationToken cancellationToken = default)
    {
        var mongoUrl = new MongoUrl(options.ConnectionString);
        var client = new MongoClient(mongoUrl);
        var database = client.GetDatabase(options.DatabaseName);
        var collectionName = $"{options.StorageOptions.Prefix}.jobGraph";
        var collection = database.GetCollection<BsonDocument>(collectionName);

        // Filter: Only documents with more than maxEntries in StateHistory
        // Using dot notation to check if array index exists (e.g., StateHistory.20 checks for 21+ entries)
        var filter = Builders<BsonDocument>.Filter.Exists($"StateHistory.{maxEntries}");

        // Update: Use $push with $slice to trim array to last N entries
        // $slice: -N keeps the last N elements (atomic operation)
        var update = Builders<BsonDocument>.Update.PushEach(
            "StateHistory",
            Array.Empty<BsonDocument>(),
            slice: -maxEntries);

        return await collection.UpdateManyAsync(filter, update, cancellationToken: cancellationToken);
    }
}

/// <summary>
/// Static holder for MongoDB options used by the StateHistory cleanup job.
/// Set during PlatformHangfireBackgroundJobModule initialization when using MongoDB storage.
/// Thread-safe: write happens during module init (single-threaded), reads happen during job execution.
/// </summary>
public static class PlatformHangfireMongoOptionsHolder
{
    private static volatile PlatformHangfireUseMongoStorageOptions? currentOptionsField;

    /// <summary>
    /// Current MongoDB storage options. Null if not using MongoDB storage.
    /// Uses volatile field for thread-safe read/write across threads.
    /// </summary>
    public static PlatformHangfireUseMongoStorageOptions? CurrentOptions
    {
        get => currentOptionsField;
        set => currentOptionsField = value;
    }
}
