#region

using System.Diagnostics;
using System.Text.Json.Serialization;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Extensions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Infrastructures.BackgroundJob;

/// <summary>
/// Base module for registering and configuring background job infrastructure.
/// This module provides functionality for scheduling, processing, and monitoring background jobs,
/// allowing applications to perform long-running or scheduled tasks outside the request lifecycle.
/// </summary>
public abstract class PlatformBackgroundJobModule : PlatformInfrastructureModule
{
    /// <summary>
    /// PlatformBackgroundJobModule initializes after PersistenceModule but before other modules
    /// to ensure background job infrastructure is available for other modules to schedule jobs.
    /// </summary>
    public new const int DefaultInitializationPriority = DefaultDependentOnPersistenceInitInitializationPriority;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformBackgroundJobModule"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution.</param>
    /// <param name="configuration">The configuration settings for the module.</param>
    public PlatformBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    public override int InitializationPriority => DefaultInitializationPriority;

    public static int DefaultStartBackgroundJobProcessingRetryCount => PlatformEnvironment.IsDevelopment ? 5 : 10;

    /// <summary>
    /// Override AutoUseDashboardUi = true to background job dashboard ui. Config via PlatformBackgroundJobUseDashboardUiOptions. Default Path is /BackgroundJobsDashboard
    /// </summary>
    public virtual bool AutoUseDashboardUi => false;

    public virtual PlatformBackgroundJobModule UseDashboardUi(IApplicationBuilder app, PlatformBackgroundJobUseDashboardUiOptions options = null)
    {
        return this;
    }

    public virtual PlatformBackgroundJobAutomaticRetryOnFailedOptions AutomaticRetryOnFailedOptionsBuilder()
    {
        return new PlatformBackgroundJobAutomaticRetryOnFailedOptions();
    }

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(GetAssembliesForServiceScanning());

        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobScheduler>(
            GetAssembliesForServiceScanning(),
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService,
            lifeTime: ServiceLifeTime.Scoped
        );

        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobProcessingService>(
            GetAssembliesForServiceScanning(),
            ServiceLifeTime.Singleton,
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );

        serviceCollection.RegisterHostedService<PlatformBackgroundJobStartProcessHostedService>();
    }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);

        await StartBackgroundJobProcessing(serviceScope);

        if (AutoUseDashboardUi)
            UseDashboardUi(CurrentAppBuilder);
    }

    public async Task StartBackgroundJobProcessing(IServiceScope serviceScope)
    {
        var backgroundJobProcessingService = serviceScope.ServiceProvider.GetRequiredService<IPlatformBackgroundJobProcessingService>();

        if (!backgroundJobProcessingService.Started())
        {
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                async () =>
                {
                    await backgroundJobProcessingService.Start();

                    Util.TaskRunner.QueueActionInBackground(
                        async () =>
                        {
                            await ReplaceAllLatestRecurringBackgroundJobs();

                            await ExecuteOnStartUpRecurringBackgroundJobImmediately();
                        },
                        loggerFactory: () => Logger,
                        logFullStackTraceBeforeBackgroundTask: false
                    );
                },
                sleepDurationProvider: retryAttempt => 10.Seconds(),
                retryCount: DefaultStartBackgroundJobProcessingRetryCount,
                onRetry: (exception, timeSpan, currentRetry, ctx) =>
                {
                    LoggerFactory
                        .CreateLogger(typeof(PlatformBackgroundJobModule).GetNameOrGenericTypeName() + $"-{GetType().Name}")
                        .LogError(
                            exception.BeautifyStackTrace(),
                            "[StartBackgroundJobProcessing] Exception {ExceptionType} detected on attempt StartBackgroundJobProcessing {Retry} of {Retries}",
                            exception.GetType().Name,
                            currentRetry,
                            DefaultStartBackgroundJobProcessingRetryCount
                        );
                }
            );
        }
    }

    public async Task ExecuteOnStartUpRecurringBackgroundJobImmediately()
    {
        await IPlatformModule.WaitForAllModulesInitializedAsync(
            ServiceProvider,
            typeof(IPlatformModule),
            Logger,
            "execute on start-up recurring background job"
        );

        await ServiceProvider.ExecuteInjectScopedAsync(async (IPlatformBackgroundJobScheduler backgroundJobScheduler, IServiceProvider serviceProvider) =>
            {
                var allExecuteOnStartUpCurrentRecurringJobExecutors = serviceProvider
                    .GetServices<IPlatformBackgroundJobExecutor>()
                    .Where(p => PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(p.GetType()) is { ExecuteOnStartUp: true })
                    .ToList();

                await allExecuteOnStartUpCurrentRecurringJobExecutors.ParallelAsync(p =>
                    backgroundJobScheduler.Schedule<object>(p.GetType(), null, DateTimeOffset.UtcNow)
                );
            }
        );
    }

    public async Task ReplaceAllLatestRecurringBackgroundJobs()
    {
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                await ServiceProvider.ExecuteInjectScopedAsync(async (IPlatformBackgroundJobScheduler scheduler, IServiceProvider serviceProvider) =>
                    {
                        var allCurrentRecurringJobExecutors = serviceProvider
                            .GetServices<IPlatformBackgroundJobExecutor>()
                            .Where(p => PlatformRecurringJobAttribute.GetRecurringJobAttributeInfo(p.GetType()) != null)
                            .ToList();

                        await scheduler.ReplaceAllRecurringBackgroundJobs(allCurrentRecurringJobExecutors);
                    }
                );
            },
            sleepDurationProvider: retryAttempt => 10.Seconds(),
            retryCount: DefaultStartBackgroundJobProcessingRetryCount,
            onRetry: (exception, timeSpan, currentRetry, ctx) =>
            {
                LoggerFactory
                    .CreateLogger(typeof(PlatformBackgroundJobModule).GetNameOrGenericTypeName() + $"-{GetType().Name}")
                    .LogError(
                        exception.BeautifyStackTrace(),
                        "[Init][ReplaceAllLatestRecurringBackgroundJobs] Exception {ExceptionType} detected on attempt ReplaceAllLatestRecurringBackgroundJobs {Retry} of {Retries}",
                        exception.GetType().Name,
                        currentRetry,
                        DefaultStartBackgroundJobProcessingRetryCount
                    );
            }
        );
    }
}

/// <summary>
/// Config BackgroundJobsDashboard. Default path is: /BackgroundJobsDashboard
/// </summary>
public class PlatformBackgroundJobUseDashboardUiOptions
{
    /// <summary>
    /// Default is "/BackgroundJobsDashboard"
    /// </summary>
    public string DashboardUiPathStart { get; set; } = "/BackgroundJobsDashboard";

    public bool UseAuthentication { get; set; }

    public BasicAuthentications BasicAuthentication { get; set; }

    public void EnsureValid()
    {
        this.Validate(
                p =>
                    p.BasicAuthentication == null
                    || (p.BasicAuthentication.UserName.IsNotNullOrEmpty() && p.BasicAuthentication.Password.IsNotNullOrEmpty()),
                "PlatformBackgroundJobUseDashboardUiOptions BasicAuthentication UserName and Password must be not null or empty"
            )
            .And(
                p => !p.UseAuthentication || p.BasicAuthentication != null,
                "UseAuthentication is True must come with one of BasicAuthentication"
            )
            .EnsureValid();
    }

    public class BasicAuthentications
    {
        public string UserName { get; set; }
        public string Password { get; set; }
    }
}

/// <summary>
/// Configures automatic retry behavior for failed background jobs.
/// This class provides options to control how many retry attempts should be made
/// and how long to wait between retry attempts.
/// </summary>
public class PlatformBackgroundJobAutomaticRetryOnFailedOptions
{
    /// <summary>
    /// The default maximum number of retry attempts, set to the maximum integer value.
    /// This effectively means infinite retries unless otherwise specified.
    /// </summary>
    public const int DefaultAttempts = int.MaxValue;

    /// <summary>
    /// The default delay between retry attempts in seconds (5 minutes).
    /// </summary>
    public const int DefaultRetryDelayInSeconds = 300;

    /// <summary>
    /// Gets or sets the maximum number of automatic retry attempts.
    /// </summary>
    /// <value>Any non-negative number.</value>
    /// <exception cref="ArgumentOutOfRangeException">The value in a set operation is less than zero.</exception>
    public int Attempts { get; set; } = DefaultAttempts;

    /// <summary>
    /// Gets or sets a function using to get a delay by an attempt number. Default is constant delay of
    /// </summary>
    /// <exception cref="ArgumentNullException">The value in a set operation is null.</exception>
    [JsonIgnore]
    public Func<long, int> DelayInSecondsByAttemptFunc { get; set; } = _ => DefaultRetryDelayInSeconds;
}
