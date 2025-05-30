#region

using System.Diagnostics;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.BackgroundJob;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.BackgroundJob;

public interface IPlatformApplicationBackgroundJobExecutor
{
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformApplicationBackgroundJobExecutor)}");
}

public abstract class PlatformApplicationBackgroundJobExecutor<TParam> : PlatformBackgroundJobExecutor<TParam>, IPlatformApplicationBackgroundJobExecutor
    where TParam : class
{
    public const string BackgroundJobNameRequestContextKey = "BackgroundJobName";
    public const string BackgroundJobParamRequestContextKey = "BackgroundJobParam";

    protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    public PlatformApplicationBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(loggerFactory, serviceProvider, backgroundJobScheduler)
    {
        UnitOfWorkManager = unitOfWorkManager;
        ApplicationSettingContext = serviceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
        RequestContextAccessor = serviceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
    }

    public virtual bool AutoOpenUow => true;

    public override bool LogDebugInformation()
    {
        return ApplicationSettingContext.IsDebugInformationMode;
    }

    protected override async Task InternalExecuteAsync(TParam param)
    {
        using (var activity = IPlatformApplicationBackgroundJobExecutor.ActivitySource.StartActivity($"BackgroundJob.{nameof(InternalExecuteAsync)}"))
        {
            activity?.SetTag("Type", GetType().FullName);
            activity?.SetTag("Param", param?.ToFormattedJson());

            RequestContextAccessor.Current.SetValue(BackgroundJobNameRequestContextValue(), BackgroundJobNameRequestContextKey);
            if (param != null) RequestContextAccessor.Current.SetValue(param, BackgroundJobParamRequestContextKey);
            RequestContextAccessor.Current.AddConsumerOrEventHandlerPipeLine(BackgroundJobNameRequestContextValue());

            if (ApplicationSettingContext.IsDebugInformationMode)
                Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(InternalExecuteAsync));

            if (AutoOpenUow)
                await UnitOfWorkManager.ExecuteUowTask(() => ProcessAsync(param));
            else
            {
                await ProcessAsync(param);

                await UnitOfWorkManager.TryCurrentActiveUowSaveChangesAsync();
            }

            if (ApplicationSettingContext.IsDebugInformationMode)
                Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(InternalExecuteAsync));
        }
    }

    private string BackgroundJobNameRequestContextValue()
    {
        return $"{ApplicationSettingContext.ApplicationName}---{GetType().Name}";
    }
}

public abstract class PlatformApplicationBackgroundJobExecutor : PlatformApplicationBackgroundJobExecutor<object?>
{
    protected PlatformApplicationBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }
}
