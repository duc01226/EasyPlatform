#region

using System.Diagnostics;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Infrastructures.BackgroundJob;

/// <summary>
/// Interface for a background job executor.
/// </summary>
public interface IPlatformBackgroundJobExecutor
{
    /// <summary>
    /// This method will be executed when processing the job
    /// </summary>
    public void Execute();

    /// <summary>
    /// Config the time to log warning if the process job time is over ProcessWarningTime.
    /// </summary>
    public TimeSpan? SlowProcessWarningTime();
}

/// <summary>
/// Interface for a background job executor with param
/// </summary>
public interface IPlatformBackgroundJobExecutor<in TParam> : IPlatformBackgroundJobExecutor
{
    /// <summary>
    /// This method will be executed when processing the job
    /// </summary>
    public void Execute(TParam param);
}

/// <summary>
/// Base class for any background job executor with param. Define a job be extend from this class.
/// </summary>
public abstract class PlatformBackgroundJobExecutor<TParam> : IPlatformBackgroundJobExecutor<TParam> where TParam : class
{
    private readonly Lazy<ILogger> loggerLazy;

    public PlatformBackgroundJobExecutor(ILoggerFactory loggerFactory, IServiceProvider serviceProvider, IPlatformBackgroundJobScheduler backgroundJobScheduler)
    {
        ServiceProvider = serviceProvider;
        BackgroundJobScheduler = backgroundJobScheduler;
        RootServiceProvider = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>();
        LoggerFactory = loggerFactory;
        loggerLazy = new Lazy<ILogger>(() => LoggerFactory.CreateLogger(typeof(PlatformBackgroundJobExecutor).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
    }

    public IPlatformBackgroundJobScheduler BackgroundJobScheduler { get; }

    protected ILogger Logger => loggerLazy.Value;

    protected IPlatformRootServiceProvider RootServiceProvider { get; }

    protected IServiceProvider ServiceProvider { get; }

    protected ILoggerFactory LoggerFactory { get; }

    /// <summary>
    /// Config the time to log warning if the process job time is over ProcessWarningTime.
    /// </summary>
    public virtual TimeSpan? SlowProcessWarningTime()
    {
        return null;
    }

    public virtual void Execute(TParam? param)
    {
        try
        {
            var slowProcessWarningTimeTotalMilliseconds = SlowProcessWarningTime()?.TotalMilliseconds ?? 0;

            if (slowProcessWarningTimeTotalMilliseconds > 0)
            {
                if (LogDebugInformation())
                    Logger.LogInformation("BackgroundJobExecutor invoking background job {GetTypeFullName} STARTED", GetType().FullName);

                Util.TaskRunner
                    .ProfileExecutionAsync(
                        asyncTask: () => InternalExecuteAsync(param),
                        afterExecution: elapsedMilliseconds =>
                        {
                            var logMessage =
                                $"ElapsedMilliseconds:{elapsedMilliseconds}.";

                            if (elapsedMilliseconds >= slowProcessWarningTimeTotalMilliseconds)
                            {
                                Logger.LogWarning(
                                    "BackgroundJobExecutor invoking background job {GetTypeFullName} FINISHED. SlowProcessWarningTimeMilliseconds:{SlowProcessWarningTimeMilliseconds}. {LogMessage}",
                                    GetType().FullName,
                                    slowProcessWarningTimeTotalMilliseconds,
                                    logMessage);
                            }
                            else if (LogDebugInformation())
                            {
                                Logger.LogInformation(
                                    "BackgroundJobExecutor invoking background job {GetTypeFullName} FINISHED. {LogMessage}",
                                    GetType().FullName,
                                    logMessage);
                            }
                        })
                    .WaitResult();
            }
            else
            {
                if (LogDebugInformation())
                    Logger.LogInformation("BackgroundJobExecutor invoking background job {GetTypeFullName} STARTED", GetType().FullName);

                InternalExecuteAsync(param).WaitResult();

                if (LogDebugInformation())
                    Logger.LogInformation("BackgroundJobExecutor invoking background job {GetTypeFullName} FINISHED", GetType().FullName);
            }
        }
        catch (Exception e)
        {
            Logger.LogError(
                e.BeautifyStackTrace(),
                "[BackgroundJob] Job {BackgroundJobType_Name} execution was failed. ParamType:{ParamType}. ParamContent:{@ParamContent}",
                GetType().Name,
                param?.GetType().Name ?? "null",
                param);

            throw;
        }
    }

    public virtual void Execute()
    {
        Execute(null);
    }

    public virtual bool LogDebugInformation()
    {
        return true;
    }

    public abstract Task ProcessAsync(TParam param);

    protected virtual async Task InternalExecuteAsync(TParam param)
    {
        await ProcessAsync(param);
    }
}

/// <summary>
/// Base class for any background job executor. Define a job be extend from this class.
/// </summary>
public abstract class PlatformBackgroundJobExecutor : PlatformBackgroundJobExecutor<object>
{
    protected PlatformBackgroundJobExecutor(
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformBackgroundJobScheduler backgroundJobScheduler) : base(loggerFactory, rootServiceProvider, backgroundJobScheduler)
    {
    }
}
