#region

using System.Diagnostics;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
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

    /// <summary>
    /// Runs the job inside a trace activity and a request-context scope, opening a unit of work when configured.
    /// </summary>
    /// <param name="param">
    /// Job parameter. Frequently <c>null</c> — parameterless recurring jobs are invoked with a null param — which the
    /// diagnostic tag below tolerates by falling back to the declared type.
    /// </param>
    /// <remarks>
    /// The <c>Param</c> trace tag carries the parameter's TYPE only. Job parameters routinely identify the specific
    /// tenant, user, or record a run targets, and trace backends retain tags for every execution of every recurring
    /// job — so serializing the parameter turned each schedule tick into a durable record of what it operated on.
    /// </remarks>
    protected override async Task InternalExecuteAsync(TParam param)
    {
        using (var activity = IPlatformApplicationBackgroundJobExecutor.ActivitySource.StartActivity($"BackgroundJob.{nameof(InternalExecuteAsync)}"))
        {
            activity?.SetTag("Type", GetType().FullName);
            activity?.SetTag(
                "Param",
                PlatformJsonSerializer.SerializeForDiagnostics(
                    param,
                    forceUseRuntimeType: true,
                    writeIndented: true));

            RequestContextAccessor.Current.SetValue(
                BackgroundJobNameRequestContextValue(),
                BackgroundJobNameRequestContextKey
            );
            if (param != null)
                RequestContextAccessor.Current.SetValue(param, BackgroundJobParamRequestContextKey);
            RequestContextAccessor.Current.AddConsumerOrEventHandlerPipeLine(
                BackgroundJobNameRequestContextValue()
            );

            if (ShouldSkipDueToCircularPipeLine())
                return;

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
                Logger.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(InternalExecuteAsync));
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
    /// <para>• Returns <c>true</c> and logs an Error if count >= configured threshold (default: 3)</para>
    ///
    /// <para><strong>Configuration:</strong></para>
    /// <para>Maximum circular count is controlled by:</para>
    /// <para><see cref="IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount"/></para>
    /// <para>Default value: <see cref="IPlatformApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCountDefaultValue"/> = 3</para>
    ///
    /// <para><strong>When A Circular Pipeline Is Detected:</strong></para>
    /// <para>• One Error is logged (<c>[CircularPipeLineSkipped]</c>) including the full pipeline trace and routing key</para>
    /// <para>• The method returns <c>true</c> so the job body is skipped and the job completes as success (not failed/retried)</para>
    /// <para>• Background job execution is halted to prevent infinite loops</para>
    ///
    /// <para><strong>Pipeline Tracking:</strong></para>
    /// <para>The pipeline is tracked via <see cref="PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey"/>
    /// and includes all components in the execution chain: CQRS commands, event handlers, message consumers, and background jobs.</para>
    /// </summary>
    /// <returns>
    /// <c>true</c> when a circular pipeline is detected (the caller must skip the job body); otherwise <c>false</c>.
    /// </returns>
    private bool ShouldSkipDueToCircularPipeLine()
    {
        var requestContextPipeLine =
            RequestContextAccessor.Current.ConsumerOrEventHandlerPipeLine();
        var pipelineRoutingKey = BackgroundJobNameRequestContextValue();

        return requestContextPipeLine.ShouldSkipDueToCircularPipeLine(
            pipelineRoutingKey,
            ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount,
            Logger,
            "background job execution");
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
