#region

using System.Linq.Expressions;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Application.BackgroundJob;

public interface IPlatformApplicationBackgroundJobScheduler : IPlatformBackgroundJobScheduler
{
}

public class PlatformApplicationBackgroundJobScheduler : IPlatformApplicationBackgroundJobScheduler
{
    private readonly Lazy<IPlatformBackgroundJobScheduler> innerInfrastructureSchedulerLazy;

    public PlatformApplicationBackgroundJobScheduler(
        IServiceProvider serviceProvider)
    {
        innerInfrastructureSchedulerLazy = new Lazy<IPlatformBackgroundJobScheduler>(serviceProvider.GetRequiredService<IPlatformBackgroundJobScheduler>);
    }

    private IPlatformBackgroundJobScheduler InnerInfrastructureScheduler => innerInfrastructureSchedulerLazy.Value;

    public Task<string> Schedule(Expression<Action> methodCall, TimeSpan? delay = null)
    {
        return InnerInfrastructureScheduler.Schedule(methodCall, delay);
    }

    public Task<string> Schedule(Expression<Func<Task>> methodCall, TimeSpan? delay = null)
    {
        return InnerInfrastructureScheduler.Schedule(methodCall, delay);
    }

    public Task<string> Schedule<TJobExecutor>(DateTimeOffset enqueueAt) where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return InnerInfrastructureScheduler.Schedule<TJobExecutor>(enqueueAt);
    }

    public Task<string> Schedule<TJobExecutorParam>(Type jobExecutorType, TJobExecutorParam? jobExecutorParam, DateTimeOffset enqueueAt) where TJobExecutorParam : class
    {
        return InnerInfrastructureScheduler.Schedule(jobExecutorType, jobExecutorParam, enqueueAt);
    }

    public Task<string> Schedule<TJobExecutor, TJobExecutorParam>(DateTimeOffset enqueueAt, TJobExecutorParam? jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam> where TJobExecutorParam : class
    {
        return InnerInfrastructureScheduler.Schedule<TJobExecutor, TJobExecutorParam>(enqueueAt, jobExecutorParam);
    }

    public Task<string> Schedule(Expression<Action> methodCall, DateTimeOffset enqueueAt)
    {
        return InnerInfrastructureScheduler.Schedule(methodCall, enqueueAt);
    }

    public Task<string> Schedule<TJobExecutor>(TimeSpan? delay = null) where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return InnerInfrastructureScheduler.Schedule<TJobExecutor>(delay);
    }

    public Task<string> Schedule<TJobExecutor, TJobExecutorParam>(TJobExecutorParam? jobExecutorParam, TimeSpan? delay = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam> where TJobExecutorParam : class
    {
        return InnerInfrastructureScheduler.Schedule<TJobExecutor, TJobExecutorParam>(jobExecutorParam, delay);
    }

    public Task RemoveJobIfExist(string jobId)
    {
        return InnerInfrastructureScheduler.RemoveJobIfExist(jobId);
    }

    public async Task UpsertRecurringJob<TJobExecutor>(Func<string> cronExpression = null, TimeZoneInfo timeZone = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob<TJobExecutor>(cronExpression, timeZone);
    }

    public async Task UpsertRecurringJob<TJobExecutor, TJobExecutorParam>(
        TJobExecutorParam? jobExecutorParam,
        Func<string> cronExpression = null,
        TimeZoneInfo timeZone = null)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TJobExecutorParam> where TJobExecutorParam : class
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob<TJobExecutor, TJobExecutorParam>(jobExecutorParam, cronExpression, timeZone);
    }

    public async Task UpsertRecurringJob(Type jobExecutorType, Func<string> cronExpression = null, TimeZoneInfo timeZone = null)
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob(jobExecutorType, cronExpression, timeZone);
    }

    public async Task UpsertRecurringJob(Type jobExecutorType, object jobExecutorParam, Func<string> cronExpression = null, TimeZoneInfo timeZone = null)
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob(jobExecutorType, jobExecutorParam, cronExpression, timeZone);
    }

    public async Task UpsertRecurringJob(string recurringJobId, Type jobExecutorType, Func<string> cronExpression = null, TimeZoneInfo timeZone = null)
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob(recurringJobId, jobExecutorType, cronExpression, timeZone);
    }

    public async Task UpsertRecurringJob(
        string recurringJobId,
        Type jobExecutorType,
        object jobExecutorParam,
        Func<string> cronExpression = null,
        TimeZoneInfo timeZone = null)
    {
        await InnerInfrastructureScheduler.UpsertRecurringJob(recurringJobId, jobExecutorType, jobExecutorParam, cronExpression, timeZone);
    }

    public async Task RemoveRecurringJobIfExist(string recurringJobId)
    {
        await InnerInfrastructureScheduler.RemoveRecurringJobIfExist(recurringJobId);
    }

    public async Task TriggerRecurringJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await InnerInfrastructureScheduler.TriggerRecurringJob<TJobExecutor>();
    }

    public async Task RemoveAllRecurringJobs()
    {
        await InnerInfrastructureScheduler.RemoveAllRecurringJobs();
    }

    public Task<HashSet<string>> AllExistingRecurringJobIds()
    {
        return InnerInfrastructureScheduler.AllExistingRecurringJobIds();
    }

    public string BuildAutoRecurringJobIdByType<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        return InnerInfrastructureScheduler.BuildAutoRecurringJobIdByType<TJobExecutor>();
    }

    public string BuildAutoRecurringJobIdByType(Type jobExecutorType)
    {
        return InnerInfrastructureScheduler.BuildAutoRecurringJobIdByType(jobExecutorType);
    }

    public async Task ReplaceAllRecurringBackgroundJobs(List<IPlatformBackgroundJobExecutor> newAllRecurringJobs)
    {
        await InnerInfrastructureScheduler.ReplaceAllRecurringBackgroundJobs(newAllRecurringJobs);
    }

    public async Task ExecuteBackgroundJob<TJobExecutor>() where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await InnerInfrastructureScheduler.ExecuteBackgroundJob<TJobExecutor>();
    }

    public async Task ExecuteBackgroundJobWithParam<TJobExecutor>(object jobExecutorParam) where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await InnerInfrastructureScheduler.ExecuteBackgroundJobWithParam<TJobExecutor>(jobExecutorParam);
    }

    public async Task ExecuteBackgroundJob<TJobExecutor>(TJobExecutor jobExecutor) where TJobExecutor : IPlatformBackgroundJobExecutor
    {
        await InnerInfrastructureScheduler.ExecuteBackgroundJob(jobExecutor);
    }

    public async Task ExecuteBackgroundJob<TJobExecutor, TParam>(TJobExecutor jobExecutor, TParam jobExecutorParam)
        where TJobExecutor : IPlatformBackgroundJobExecutor<TParam>
    {
        await InnerInfrastructureScheduler.ExecuteBackgroundJob(jobExecutor, jobExecutorParam);
    }

    public async Task ExecuteBackgroundJobByType(Type jobExecutorType, string jobExecutorParamJson, string? requestContextJson)
    {
        await InnerInfrastructureScheduler.ExecuteBackgroundJobByType(jobExecutorType, jobExecutorParamJson, requestContextJson);
    }
}
