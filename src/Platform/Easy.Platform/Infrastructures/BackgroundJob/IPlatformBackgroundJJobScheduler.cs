using System.Linq.Expressions;
using Easy.Platform.Common.Utils;

namespace Easy.Platform.Infrastructures.BackgroundJob;

public interface IPlatformBackgroundJobScheduler
{
    /// <summary>
    /// Creates a new background job based on a specified method
    /// call expression and schedules it to be enqueued after a given delay.
    /// </summary>
    /// <param name="methodCall">Instance method call expression that will be marshalled to the Server.</param>
    /// <param name="delay">Delay, after which the job will be enqueued.</param>
    /// <returns>Unique identifier of the created job.</returns>
    public string Schedule(Expression<Action> methodCall, TimeSpan? delay = null);

    /// <summary>
    /// Creates a new background job based on a specified method call expression
    /// and schedules it to be enqueued at the given moment of time.
    /// </summary>
    /// <typeparam name="TJobExecutor">The job executor type will be invoked during the job processing.</typeparam>
    /// <param name="enqueueAt">The moment of time at which the job will be enqueued.</param>
    /// <returns>Unique identifier of a created job.</returns>
    public string Schedule<TJobExecutor>(DateTimeOffset enqueueAt)
        where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// Creates a new background job based on a specified method call expression
    /// and schedules it to be enqueued at the given moment of time.
    /// </summary>
    /// <typeparam name="TJobExecutor">The job executor type will be invoked during the job processing.</typeparam>
    /// <typeparam name="TJobExecutorParam">The job executor param type.</typeparam>
    /// <param name="enqueueAt">The moment of time at which the job will be enqueued.</param>
    /// <param name="jobExecutorParam">Job executor param</param>
    /// <returns>Unique identifier of a created job.</returns>
    public string Schedule<TJobExecutor, TJobExecutorParam>(
        DateTimeOffset enqueueAt,
        TJobExecutorParam jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam>
        where TJobExecutorParam : class;

    /// <summary>
    /// Creates a new background job based on a specified method
    /// call expression and schedules it to be enqueued after a given delay.
    /// </summary>
    /// <param name="methodCall">Instance method call expression that will be marshalled to the Server.</param>
    /// <param name="enqueueAt">The moment of time at which the job will be enqueued.</param>
    /// <returns>Unique identifier of the created job.</returns>
    public string Schedule(Expression<Action> methodCall, DateTimeOffset enqueueAt);

    /// <summary>
    /// Creates a new background job based on a specified method call expression
    /// and schedules it to be enqueued at the given moment of time.
    /// </summary>
    /// <typeparam name="TJobExecutor">The job executor type will be invoked during the job processing.</typeparam>
    /// <param name="delay">Delay, after which the job will be enqueued.</param>
    /// <returns>Unique identifier of a created job.</returns>
    public string Schedule<TJobExecutor>(TimeSpan? delay = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// Creates a new background job based on a specified method call expression
    /// and schedules it to be enqueued at the given moment of time.
    /// </summary>
    /// <typeparam name="TJobExecutor">The job executor type will be invoked during the job processing.</typeparam>
    /// <typeparam name="TJobExecutorParam">The job executor param type.</typeparam>
    /// <param name="jobExecutorParam">Job executor param</param>
    /// <param name="delay">Delay, after which the job will be enqueued.</param>
    /// <returns>Unique identifier of a created job.</returns>
    public string Schedule<TJobExecutor, TJobExecutorParam>(
        TJobExecutorParam jobExecutorParam,
        TimeSpan? delay = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam>
        where TJobExecutorParam : class;

    /// <summary>
    /// Add or update a recurring job. Use <see cref="Util.CronBuilder"/> for common cron.// </summary>
    /// <param name="cronExpression">
    /// Set the cronExpression to be used if TJobExecutor don't have <see cref="PlatformRecurringJobAttribute"/>
    /// https://en.wikipedia.org/wiki/Cron
    /// <br/>
    /// Format: [minute(0-59)] [hour(0-23)] [day of month (1-31)] [month (1-12)] [dat of week (0-6 = Sunday to Saturday)]
    /// <br/>
    /// Example:
    /// <br/>
    /// Run once a year at midnight of 1 January: 0 0 1 1 *
    /// <br/>
    /// Run daily at midnight 0h: 0 0 * * *
    /// </param>
    /// <param name="timeZone">Timezone for the job to run based on</param>
    public void UpsertRecurringJob<TJobExecutor>(
        Func<string> cronExpression = null,
        TimeZoneInfo timeZone = null) where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// <inheritdoc cref="UpsertRecurringJob{TJobExecutor}(System.Func{string},System.TimeZoneInfo)"/>
    /// </summary>
    public void UpsertRecurringJob(
        Type jobExecutorType,
        Func<string> cronExpression = null,
        TimeZoneInfo timeZone = null);

    /// <summary>
    /// Remove recurring job if recurringJobId existed
    /// </summary>
    /// <param name="recurringJobId">Recurring job id</param>
    public void RemoveRecurringJobIfExist(string recurringJobId);

    /// <summary>
    /// Remove recurring job by <see cref="TJobExecutor"/>
    /// </summary>
    /// <typeparam name="TJobExecutor">The job executor type will be invoked during the job processing.</typeparam>
    public void TriggerRecurringJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// Remove all existed recurring jobs
    /// </summary>
    public void RemoveAllRecurringJobs();

    /// <summary>
    /// Get all existed recurring jobs. Return all existed recurring job ids, list of id from <see cref="BuildRecurringJobId{TJobExecutor}"/>
    /// </summary>
    public HashSet<string> AllRecurringJobIds();

    /// <summary>
    /// Build recurring job id from a TJobExecutor.
    /// </summary>
    public string BuildRecurringJobId<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// Build recurring job id from a TJobExecutor type.
    /// </summary>
    public string BuildRecurringJobId(Type jobExecutorType);

    public void ReplaceAllRecurringBackgroundJobs(List<IPlatformBackgroundJobExecutor> newAllRecurringJobs);

    /// <summary>
    /// Execute a background job immediately
    /// </summary>
    public void ExecuteBackgroundJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor;

    /// <summary>
    /// Execute a background job with param immediately
    /// </summary>
    public void ExecuteBackgroundJobWithParam<TJobExecutor>(object jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor;
}
