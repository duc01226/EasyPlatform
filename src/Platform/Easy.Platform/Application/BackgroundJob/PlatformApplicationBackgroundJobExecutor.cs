#region

using System.Diagnostics;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations.Extensions;
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

            RequestContextAccessor.Current.SetValue(
                BackgroundJobNameRequestContextValue(),
                BackgroundJobNameRequestContextKey
            );
            if (param != null)
                RequestContextAccessor.Current.SetValue(param, BackgroundJobParamRequestContextKey);
            RequestContextAccessor.Current.AddConsumerOrEventHandlerPipeLine(
                BackgroundJobNameRequestContextValue()
            );

            EnsureNoCircularPipeLine();

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

    /// <summary>
    /// Ensures that the background job execution pipeline does not contain circular calls that could lead to infinite loops.
    /// This method checks the request context pipeline to detect if the same background job has been triggered
    /// recursively beyond the configured threshold.
    ///
    /// <para><strong>Circular Pipeline Detection Logic:</strong></para>
    /// <para>The method prevents scenarios where a background job triggers events or operations that eventually
    /// re-trigger the same background job, creating an infinite loop.</para>
    ///
    /// <para><strong>Example Circular Scenario:</strong></para>
    /// <para>BackgroundJob A → Event Handler B → Command C → Event Handler D → BackgroundJob A (again)</para>
    ///
    /// <para><strong>Detection Mechanism:</strong></para>
    /// <para>• Retrieves the current pipeline from RequestContext (list of all jobs/handlers/consumers in the call chain)</para>
    /// <para>• Checks if pipeline length exceeds 2x the configured max circular count threshold</para>
    /// <para>• Counts occurrences of the current background job in the pipeline (excluding the current call)</para>
    /// <para>• Throws validation error if count >= configured threshold (default: 3)</para>
    ///
    /// <para><strong>Configuration:</strong></para>
    /// <para>Maximum circular count is controlled by:</para>
    /// <para><see cref="IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount"/></para>
    /// <para>Default value: <see cref="IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue"/> = 3</para>
    ///
    /// <para><strong>When Validation Fails:</strong></para>
    /// <para>• A <see cref="PlatformDomainRowLevelSecurityViolationException"/> is thrown</para>
    /// <para>• The exception message includes the full pipeline trace for debugging</para>
    /// <para>• Background job execution is halted to prevent infinite loops</para>
    ///
    /// <para><strong>Pipeline Tracking:</strong></para>
    /// <para>The pipeline is tracked via <see cref="PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey"/>
    /// and includes all components in the execution chain: CQRS commands, event handlers, message consumers, and background jobs.</para>
    /// </summary>
    /// <exception cref="PlatformDomainRowLevelSecurityViolationException">
    /// Thrown when circular pipeline is detected (same background job called >= threshold times)
    /// </exception>
    private void EnsureNoCircularPipeLine()
    {
        var requestContextPipeLine =
            RequestContextAccessor.Current.ConsumerOrEventHandlerPipeLine();
        var pipelineRoutingKey = BackgroundJobNameRequestContextValue();

        // Prevent circular calls: BackgroundJob A => [Event B, Event B => Handler C, Handler C => BackgroundJob A] => BackgroundJob A (circular)
        if (
            requestContextPipeLine.Count
            >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount * 2
        )
        {
            // Check if the current background job appears in the pipeline more than the allowed threshold
            // Example: If threshold is 3, and this job appears 3+ times in the pipeline (excluding current call), it's circular
            requestContextPipeLine
                .ValidateNot(
                    mustNot: p =>
                        p.Take(p.Count - 1).Count(item => item == pipelineRoutingKey)
                        >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount,
                    $"The current [RequestContextBackgroundJobPipeLine:{requestContextPipeLine.ToJson()}] leads to {pipelineRoutingKey} and has a circular call error. "
                        + $"This background job has been triggered {requestContextPipeLine.Count(item => item == pipelineRoutingKey)} times in the execution pipeline, "
                        + $"which exceeds the maximum allowed threshold of {ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount}. "
                        + $"This likely indicates an infinite loop where the background job is triggering events or operations that eventually re-trigger itself."
                )
                .EnsureValid();
        }
    }
}

public abstract class PlatformApplicationBackgroundJobExecutor
    : PlatformApplicationBackgroundJobExecutor<object?>
{
    protected PlatformApplicationBackgroundJobExecutor(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformApplicationBackgroundJobScheduler backgroundJobScheduler) : base(unitOfWorkManager, loggerFactory, serviceProvider, backgroundJobScheduler)
    {
    }
}
