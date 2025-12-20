#nullable enable

#region

using System.Linq.Expressions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Infrastructures.BackgroundJob;
using Hangfire;
using Hangfire.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.HangfireBackgroundJob;

public class PlatformHangfireBackgroundJobScheduler : IPlatformBackgroundJobScheduler
{
    public const string AutoRecurringJobIdByTypeSuffix = "_Auto_";
    public const int DefaultMaxLengthJobId = 200;
    private readonly IPlatformBackgroundJobSchedulerCarryRequestContextService? carryRequestContextService;

    private readonly IServiceProvider serviceProvider;

    public PlatformHangfireBackgroundJobScheduler(IServiceProvider serviceProvider)
    {
        this.serviceProvider = serviceProvider;
        carryRequestContextService = serviceProvider.GetService<IPlatformBackgroundJobSchedulerCarryRequestContextService>();
    }

    public async Task<string> Schedule(Expression<Action> methodCall, TimeSpan? delay = null)
    {
        return await Task.Run(() => BackgroundJob.Schedule(methodCall, delay ?? TimeSpan.Zero));
    }

    public async Task<string> Schedule(Expression<Func<Task>> methodCall, TimeSpan? delay = null)
    {
        return await Task.Run(() => BackgroundJob.Schedule(methodCall, delay ?? TimeSpan.Zero));
    }

    public async Task<string> Schedule<TJobExecutor>(DateTimeOffset enqueueAt)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return await Task.Run(() => BackgroundJob.Schedule(
            () => ExecuteBackgroundJobByType(typeof(TJobExecutor), null, CurrentRequestContextValuesAsJsonStr()),
            enqueueAt));
    }

    public async Task<string> Schedule<TJobExecutor, TJobExecutorParam>(DateTimeOffset enqueueAt, TJobExecutorParam? jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam>
        where TJobExecutorParam : class
    {
        return await Task.Run(() =>
            BackgroundJob.Schedule(
                () => ExecuteBackgroundJobByType(
                    typeof(TJobExecutor),
                    jobExecutorParam != null ? jobExecutorParam.ToJson(true) : null,
                    CurrentRequestContextValuesAsJsonStr()),
                enqueueAt
            )
        );
    }

    public async Task<string> Schedule(Expression<Action> methodCall, DateTimeOffset enqueueAt)
    {
        return await Task.Run(() => BackgroundJob.Schedule(methodCall, enqueueAt));
    }

    public async Task<string> Schedule<TJobExecutor>(TimeSpan? delay = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return await Task.Run(() => BackgroundJob.Schedule(
            () => ExecuteBackgroundJobByType(typeof(TJobExecutor), null, CurrentRequestContextValuesAsJsonStr()),
            delay ?? TimeSpan.Zero)
        );
    }

    public async Task<string> Schedule<TJobExecutor, TJobExecutorParam>(TJobExecutorParam? jobExecutorParam, TimeSpan? delay = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam>
        where TJobExecutorParam : class
    {
        return await Task.Run(() =>
            BackgroundJob.Schedule(
                () => ExecuteBackgroundJobByType(
                    typeof(TJobExecutor),
                    jobExecutorParam != null ? jobExecutorParam.ToJson(true) : null,
                    CurrentRequestContextValuesAsJsonStr()),
                delay ?? TimeSpan.Zero
            )
        );
    }

    public async Task RemoveJobIfExist(string jobId)
    {
        await Task.Run(() => BackgroundJob.Delete(jobId));
    }

    public async Task UpsertRecurringJob<TJobExecutor>(Func<string>? cronExpression = null, TimeZoneInfo? timeZone = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(typeof(TJobExecutor), cronExpression);

            RecurringJob.AddOrUpdate(
                BuildAutoRecurringJobIdByType<TJobExecutor>(),
                () => ExecuteBackgroundJobByType(typeof(TJobExecutor), null, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task UpsertRecurringJob<TJobExecutor, TJobExecutorParam>(
        TJobExecutorParam? jobExecutorParam,
        Func<string>? cronExpression = null,
        TimeZoneInfo? timeZone = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam>
        where TJobExecutorParam : class
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(typeof(TJobExecutor), cronExpression);
            var jobExecutorParamJson = jobExecutorParam?.ToJson(true);

            RecurringJob.AddOrUpdate(
                BuildAutoRecurringJobIdByType<TJobExecutor>(),
                () => ExecuteBackgroundJobByType(typeof(TJobExecutor), jobExecutorParamJson, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task UpsertRecurringJob(Type jobExecutorType, Func<string>? cronExpression = null, TimeZoneInfo? timeZone = null)
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(jobExecutorType, cronExpression);

            RecurringJob.AddOrUpdate(
                BuildAutoRecurringJobIdByType(jobExecutorType),
                () => ExecuteBackgroundJobByType(jobExecutorType, null, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task UpsertRecurringJob(Type jobExecutorType, object? jobExecutorParam, Func<string>? cronExpression = null, TimeZoneInfo? timeZone = null)
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(jobExecutorType, cronExpression);
            var jobExecutorParamJson = jobExecutorParam?.ToJson(true);

            RecurringJob.AddOrUpdate(
                BuildAutoRecurringJobIdByType(jobExecutorType),
                () => ExecuteBackgroundJobByType(jobExecutorType, jobExecutorParamJson, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task UpsertRecurringJob(string recurringJobId, Type jobExecutorType, Func<string>? cronExpression = null, TimeZoneInfo? timeZone = null)
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(jobExecutorType, cronExpression);

            RecurringJob.AddOrUpdate(
                recurringJobId.TakeTop(DefaultMaxLengthJobId),
                () => ExecuteBackgroundJobByType(jobExecutorType, null, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task UpsertRecurringJob(
        string recurringJobId,
        Type jobExecutorType,
        object? jobExecutorParam,
        Func<string>? cronExpression = null,
        TimeZoneInfo? timeZone = null)
    {
        await Task.Run(() =>
        {
            var cronExpressionValue = EnsureValidToUpsertRecurringJob(jobExecutorType, cronExpression);
            var jobExecutorParamJson = jobExecutorParam?.ToJson(true);

            RecurringJob.AddOrUpdate(
                recurringJobId.TakeTop(DefaultMaxLengthJobId),
                () => ExecuteBackgroundJobByType(jobExecutorType, jobExecutorParamJson, CurrentRequestContextValuesAsJsonStr()),
                cronExpressionValue,
                new RecurringJobOptions { TimeZone = timeZone ?? TimeZoneInfo.Local }
            );
        });
    }

    public async Task RemoveRecurringJobIfExist(string recurringJobId)
    {
        await Task.Run(() =>
        {
            RecurringJob.RemoveIfExists(recurringJobId.TakeTop(DefaultMaxLengthJobId));
        });
    }

    public async Task TriggerRecurringJob<TJobExecutor>()
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await Task.Run(() =>
        {
            RecurringJob.TriggerJob(BuildAutoRecurringJobIdByType<TJobExecutor>());
        });
    }

    public async Task RemoveAllRecurringJobs()
    {
        await Task.Run(async () =>
        {
            var allExistingRecurringJobIds = await AllExistingRecurringJobIds();

            await allExistingRecurringJobIds.ParallelAsync(async recurringJobId =>
            {
                await Task.Run(() =>
                {
                    RecurringJob.RemoveIfExists(recurringJobId);
                });
            });
        });
    }

    public async Task<HashSet<string>> AllExistingRecurringJobIds()
    {
        return await Task.Run(() =>
        {
            using (var connection = JobStorage.Current.GetConnection()) return connection.GetRecurringJobs().Select(p => p.Id).ToHashSet();
        });
    }

    public async Task ReplaceAllRecurringBackgroundJobs(List<IPlatformBackgroundJobExecutor> newAllRecurringJobs)
    {
        var newCurrentRecurringJobExecutorToIdPairs =
            newAllRecurringJobs.Select(p => (JobExecutor: p, JobExecutorId: BuildAutoRecurringJobIdByType(p.GetType()))).ToHashSet();

        var newCurrentRecurringJobExecutorIds = newCurrentRecurringJobExecutorToIdPairs.Select(p => p.JobExecutorId).ToHashSet();
        var allExistingRecurringJobIds = await AllExistingRecurringJobIds();

        // Detect jobs with invalid serialization (e.g., after refactoring base classes)
        var invalidJobIds = await DetectInvalidRecurringJobs();

        // Remove obsolete recurring job, job is not existed in the all current recurring declared jobs in source code
        await allExistingRecurringJobIds
            .Where(existingAutoRecurringJobId => !newCurrentRecurringJobExecutorIds.Contains(existingAutoRecurringJobId))
            .ParallelAsync(RemoveRecurringJobIfExist);

        // Remove invalid jobs that we still need (will be recreated with correct serialization)
        await invalidJobIds.Where(invalidJobId => newCurrentRecurringJobExecutorIds.Contains(invalidJobId)).ParallelAsync(RemoveRecurringJobIfExist);

        // Calculate which jobs need to be created/recreated
        var validExistingJobIds = allExistingRecurringJobIds.Except(invalidJobIds).ToHashSet();

        // Upsert new jobs OR jobs that were removed due to invalid serialization
        await newCurrentRecurringJobExecutorToIdPairs
            .Where(p => !validExistingJobIds.Contains(p.JobExecutorId))
            .Select(p => p.JobExecutor)
            .ParallelAsync(async recurringBackgroundJobExecutor =>
            {
                await Task.Run(async () =>
                {
                    var backgroundJobTimeZoneOffset = PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(recurringBackgroundJobExecutor.GetType()).TimeZoneOffset;

                    var backgroundJobTimeZoneInfo =
                        backgroundJobTimeZoneOffset != null
                            ? TimeZoneInfo.GetSystemTimeZones().MinBy(p => Math.Abs(p.BaseUtcOffset.TotalHours - backgroundJobTimeZoneOffset.Value))
                            : null;

                    await UpsertRecurringJob(recurringBackgroundJobExecutor.GetType(), timeZone: backgroundJobTimeZoneInfo);
                });
            });
    }

    public async Task ExecuteBackgroundJob<TJobExecutor>()
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await ExecuteBackgroundJobByType(typeof(TJobExecutor), null, CurrentRequestContextValuesAsJsonStr());
    }

    public async Task ExecuteBackgroundJobWithParam<TJobExecutor>(object? jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await ExecuteBackgroundJobByType(typeof(TJobExecutor), jobExecutorParam?.ToJson(true), CurrentRequestContextValuesAsJsonStr());
    }

    public string BuildAutoRecurringJobIdByType<TJobExecutor>()
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return BuildAutoRecurringJobIdByType(typeof(TJobExecutor));
    }

    public string BuildAutoRecurringJobIdByType(Type jobExecutorType)
    {
        EnsureJobExecutorTypeValid(jobExecutorType);

        return $"{AutoRecurringJobIdByTypeSuffix}.{jobExecutorType.Name}".TakeTop(DefaultMaxLengthJobId);
    }

    public async Task ExecuteBackgroundJob<TJobExecutor>(TJobExecutor jobExecutor)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await ExecuteBackgroundJobByInstance(jobExecutor, null);
    }

    public async Task ExecuteBackgroundJob<TJobExecutor, TParam>(TJobExecutor jobExecutor, TParam? jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TParam>
    {
        await ExecuteBackgroundJobByInstance(jobExecutor, jobExecutorParam?.ToJson(true));
    }

    public async Task<string> Schedule<TJobExecutorParam>(Type jobExecutorType, TJobExecutorParam? jobExecutorParam, DateTimeOffset enqueueAt)
        where TJobExecutorParam : class
    {
        return await Task.Run(() =>
        {
            return BackgroundJob.Schedule(
                () => ExecuteBackgroundJobByType(
                    jobExecutorType,
                    jobExecutorParam != null ? jobExecutorParam.ToJson(true) : null,
                    CurrentRequestContextValuesAsJsonStr()),
                enqueueAt
            );
        });
    }

    public async Task ExecuteBackgroundJobByType(Type jobExecutorType, string? jobExecutorParamJson, string? requestContextJson)
    {
        await Task.Run(async () =>
        {
            EnsureJobExecutorTypeValid(jobExecutorType);

            using (var scope = serviceProvider.CreateTrackedScope())
            {
                var jobExecutor = scope.ServiceProvider.GetService(jobExecutorType);
                if (jobExecutor != null)
                {
                    carryRequestContextService?.SetCurrentRequestContextValues(scope, requestContextJson?.JsonDeserialize<Dictionary<string, object?>>() ?? []);

                    await ExecuteBackgroundJobByInstance(jobExecutor.Cast<IPlatformBackgroundJobExecutor>(), jobExecutorParamJson);
                }
            }
        });
    }

    /// <summary>
    /// Detects recurring jobs that cannot be properly deserialized due to serialization format mismatch.
    /// This happens when job implementation changes (e.g., base class refactoring) but job ID remains the same.
    /// Common scenarios:
    /// - Job refactored from PlatformApplicationBackgroundJobExecutor to PlatformApplicationBatchScrollingBackgroundJobExecutor
    /// - Job signature changed (added/removed generic parameters)
    /// - Assembly version changes with incompatible serialization settings
    /// </summary>
    /// <returns>Set of job IDs that have invalid serialization and should be recreated</returns>
    private async Task<HashSet<string>> DetectInvalidRecurringJobs()
    {
        return await Task.Run(() =>
        {
            var invalidJobIds = new HashSet<string>();

            try
            {
                using (var connection = JobStorage.Current.GetConnection())
                {
                    var recurringJobs = connection.GetRecurringJobs();

                    foreach (var recurringJob in recurringJobs)
                    {
                        // Check if Hangfire already caught a deserialization exception
                        // Hangfire stores JobLoadException in LoadException property instead of throwing
                        if (recurringJob.LoadException != null)
                        {
                            invalidJobIds.Add(recurringJob.Id);

                            // Log for diagnostics
                            serviceProvider
                                .GetService<ILogger<PlatformHangfireBackgroundJobScheduler>>()
                                ?.LogWarning(
                                    recurringJob.LoadException,
                                    "Recurring job '{JobId}' has invalid serialization and will be recreated. "
                                    + "This typically happens after refactoring job implementations (e.g., changing base class). "
                                    + "LoadException: {ExceptionMessage}",
                                    recurringJob.Id,
                                    recurringJob.LoadException.Message
                                );
                            continue;
                        }

                        // Additional validation: Check if the job method can be invoked
                        var job = recurringJob.Job;
                        if (job == null || job.Type == null || job.Method == null)
                        {
                            invalidJobIds.Add(recurringJob.Id);

                            serviceProvider
                                .GetService<ILogger<PlatformHangfireBackgroundJobScheduler>>()
                                ?.LogWarning(
                                    "Recurring job '{JobId}' has incomplete job definition (Job={JobNull}, Type={TypeNull}, Method={MethodNull}) and will be recreated.",
                                    recurringJob.Id,
                                    job == null,
                                    job?.Type == null,
                                    job?.Method == null
                                );
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // If we can't connect to storage, log and continue
                serviceProvider
                    .GetService<ILogger<PlatformHangfireBackgroundJobScheduler>>()
                    ?.LogWarning(ex, "Failed to detect invalid recurring jobs. Jobs will be processed normally.");
            }

            return invalidJobIds;
        });
    }

    public static string EnsureValidToUpsertRecurringJob(Type jobExecutorType, Func<string>? cronExpression)
    {
        EnsureJobExecutorTypeValid(jobExecutorType);

        var cronExpressionValue =
            (cronExpression?.Invoke() ?? PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(jobExecutorType)?.CronExpression)
            ?? throw new Exception("Either recurring job must have cron expression from PlatformRecurringJobAttribute or cronExpression param must be not null");
        return cronExpressionValue;
    }

    public static async Task ExecuteBackgroundJobByInstance(IPlatformBackgroundJobExecutor jobExecutor, string? jobExecutorParamJson)
    {
        await Task.Run(async () =>
        {
            var withParamJobExecutorType =
                jobExecutor.GetType().GetInterfaces().FirstOrDefault(x => x.IsAssignableToGenericType(typeof(IPlatformBackgroundJobExecutor<>)));

            if (withParamJobExecutorType != null)
            {
                // Parse job executor param to correct type
                var (jobExecutorParamType, jobExecutorParam) = withParamJobExecutorType
                    .GetGenericArguments()[0]
                    .GetWith(jobExecutorParamType =>
                        jobExecutorParamJson != null ? PlatformJsonSerializer.Deserialize(jobExecutorParamJson, jobExecutorParamType) : null);

                // Execute job executor method
                jobExecutor.GetType().GetMethod(nameof(IPlatformBackgroundJobExecutor.Execute), [jobExecutorParamType])!.Invoke(jobExecutor, [jobExecutorParam]);
            }
            else
                jobExecutor.Execute();
        });
    }

    public static void EnsureJobExecutorTypeValid(Type jobExecutorType)
    {
        if (!jobExecutorType.IsAssignableTo(typeof(IPlatformBackgroundJobExecutor)))
            throw new Exception("JobExecutor type is invalid. Must be assignable to IPlatformBackgroundJobExecutor");
    }

    private string CurrentRequestContextValuesAsJsonStr()
    {
        return (carryRequestContextService?.CurrentRequestContext() ?? new Dictionary<string, object?>()).ToJson();
    }
}
