using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using AngularDotnetPlatform.Platform.BackgroundJob;
using AngularDotnetPlatform.Platform.Timing;
using Hangfire;
using Hangfire.Storage;
using Microsoft.Extensions.DependencyInjection;

namespace AngularDotnetPlatform.Platform.HangfireBackgroundJob
{
    public class PlatformHangfireBackgroundJobScheduler : IPlatformBackgroundJobScheduler
    {
        private readonly IServiceProvider serviceProvider;

        public PlatformHangfireBackgroundJobScheduler(IServiceProvider serviceProvider)
        {
            this.serviceProvider = serviceProvider;
        }

        public string Schedule(Expression<Action> methodCall, TimeSpan? delay = null)
        {
            return Hangfire.BackgroundJob.Schedule(methodCall, delay ?? TimeSpan.Zero);
        }

        public string Schedule<TJobExecutor>(DateTimeOffset enqueueAt) where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            return Hangfire.BackgroundJob.Schedule(() => ExecuteBackgroundJob<TJobExecutor>(), enqueueAt);
        }

        public string Schedule<TJobExecutor, TJobExecutorParam>(
            DateTimeOffset enqueueAt,
            TJobExecutorParam jobExecutorParam) where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam> where TJobExecutorParam : class
        {
            return Hangfire.BackgroundJob.Schedule(
                () => ExecuteBackgroundJob(
                    typeof(TJobExecutor),
                    jobExecutorParam != null ? JsonSerializer.Serialize(jobExecutorParam, null) : null),
                enqueueAt);
        }

        public string Schedule(Expression<Action> methodCall, DateTimeOffset enqueueAt)
        {
            return Hangfire.BackgroundJob.Schedule(methodCall, enqueueAt);
        }

        public string Schedule<TJobExecutor>(TimeSpan? delay = null) where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            return Hangfire.BackgroundJob.Schedule(() => ExecuteBackgroundJob<TJobExecutor>(), delay ?? TimeSpan.Zero);
        }

        public string Schedule<TJobExecutor, TJobExecutorParam>(
            TJobExecutorParam jobExecutorParam,
            TimeSpan? delay = null)
            where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam> where TJobExecutorParam : class
        {
            return Hangfire.BackgroundJob.Schedule(
                () => ExecuteBackgroundJob(
                    typeof(TJobExecutor),
                    jobExecutorParam != null ? JsonSerializer.Serialize(jobExecutorParam, null) : null),
                delay ?? TimeSpan.Zero);
        }

        public void UpsertRecurringJob<TJobExecutor>(Func<string> cronExpression = null, TimeZoneInfo timeZone = null) where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            var cronExpressionValue = PlatformRecurringJobAttribute.GetCronExpressionInfo<TJobExecutor>() ?? cronExpression?.Invoke();
            if (cronExpressionValue == null)
            {
                throw new Exception(
                    "Either recurring job must have cron expression from PlatformRecurringJobAttribute or cronExpression param must be not null");
            }

            RecurringJob.AddOrUpdate(
                BuildRecurringJobId<TJobExecutor>(),
                () => ExecuteBackgroundJob<TJobExecutor>(),
                cronExpressionValue,
                timeZone ?? Clock.CurrentTimeZone);
        }

        public void UpsertRecurringJob(Type jobExecutorType, Func<string> cronExpression = null, TimeZoneInfo timeZone = null)
        {
            EnsureJobExecutorTypeValid(jobExecutorType);

            var cronExpressionValue = PlatformRecurringJobAttribute.GetCronExpressionInfo(jobExecutorType) ?? cronExpression?.Invoke();
            if (cronExpressionValue == null)
            {
                throw new Exception(
                    "Either recurring job must have cron expression from PlatformRecurringJobAttribute or cronExpression param must be not null");
            }

            RecurringJob.AddOrUpdate(
                BuildRecurringJobId(jobExecutorType),
                () => ExecuteBackgroundJob(jobExecutorType, null),
                cronExpressionValue,
                timeZone ?? Clock.CurrentTimeZone);
        }

        public void RemoveRecurringJobIfExist(string recurringJobId)
        {
            RecurringJob.RemoveIfExists(recurringJobId);
        }

        public void TriggerRecurringJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            RecurringJob.Trigger(BuildRecurringJobId<TJobExecutor>());
        }

        public void RemoveAllRecurringJobs()
        {
            using (var connection = JobStorage.Current.GetConnection())
            {
                foreach (var recurringJob in connection.GetRecurringJobs())
                {
                    RecurringJob.RemoveIfExists(recurringJob.Id);
                }
            }
        }

        public HashSet<string> AllRecurringJobIds()
        {
            using (var connection = JobStorage.Current.GetConnection())
            {
                return connection.GetRecurringJobs().Select(p => p.Id).ToHashSet();
            }
        }

        public void ReplaceAllRecurringBackgroundJobs(List<IPlatformBackgroundJobExecutor> newAllRecurringJobs)
        {
            // Remove obsolete recurring job, job is not existed in the all current recurring job list in code
            var allCurrentRecurringJobExecutorIds = newAllRecurringJobs
                .Select(p => BuildRecurringJobId(p.GetType()))
                .ToHashSet();
            foreach (var existedRecurringJobId in AllRecurringJobIds())
            {
                if (!allCurrentRecurringJobExecutorIds.Contains(existedRecurringJobId))
                {
                    RemoveRecurringJobIfExist(existedRecurringJobId);
                }
            }

            // Upsert all new recurring jobs
            newAllRecurringJobs.ForEach(
                recurringBackgroundJobExecutor => UpsertRecurringJob(recurringBackgroundJobExecutor.GetType()));
        }

        public void ExecuteBackgroundJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            ExecuteBackgroundJob(typeof(TJobExecutor), null);
        }

        public void ExecuteBackgroundJobWithParam<TJobExecutor>(object jobExecutorParam)
            where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            ExecuteBackgroundJob(
                typeof(TJobExecutor),
                jobExecutorParam != null ? JsonSerializer.Serialize(jobExecutorParam) : null);
        }

        public void ExecuteBackgroundJob(Type jobExecutorType, string jobExecutorParamJson)
        {
            EnsureJobExecutorTypeValid(jobExecutorType);

            using (var scope = serviceProvider.CreateScope())
            {
                var jobExecutor = scope.ServiceProvider.GetService(jobExecutorType);
                if (jobExecutor != null)
                {
                    var withParamJobExecutorType = jobExecutor
                        .GetType()
                        .GetInterfaces()
                        .FirstOrDefault(x =>
                            x.IsGenericType &&
                            x.GetGenericTypeDefinition() == typeof(IPlatformBackgroundJobExecutor<>));
                    if (withParamJobExecutorType != null)
                    {
                        // Parse job executor param to correct type
                        var jobExecutorParamType = withParamJobExecutorType.GetGenericArguments()[0];
                        var jobExecutorParam = jobExecutorParamJson != null
                            ? JsonSerializer.Deserialize(jobExecutorParamJson, jobExecutorParamType)
                            : null;

                        // Execute job executor method
                        var executeMethod = jobExecutorType.GetMethod(
                            nameof(IPlatformBackgroundJobExecutor.Execute),
                            new Type[] { jobExecutorParamType });
                        executeMethod!.Invoke(jobExecutor, new[] { jobExecutorParam });
                    }
                    else
                    {
                        ((IPlatformBackgroundJobExecutor)jobExecutor).Execute();
                    }
                }
            }
        }

        public string BuildRecurringJobId<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
        {
            return BuildRecurringJobId(typeof(TJobExecutor));
        }

        public string BuildRecurringJobId(Type jobExecutorType)
        {
            EnsureJobExecutorTypeValid(jobExecutorType);

            return $"{jobExecutorType.Name}.{nameof(IPlatformBackgroundJobExecutor.Execute)}";
        }

        private void EnsureJobExecutorTypeValid(Type jobExecutorType)
        {
            if (!jobExecutorType.IsAssignableTo(typeof(IPlatformBackgroundJobExecutor)))
            {
                throw new Exception(
                    "JobExecutor type is invalid. Must be assignable to IPlatformBackgroundJobExecutor");
            }
        }
    }
}
