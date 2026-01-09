#region

using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.HangfireBackgroundJob.BackgroundJobs;
using Easy.Platform.Infrastructures.BackgroundJob;
using Hangfire;
using Hangfire.Mongo;
using Hangfire.PostgreSql;
using HangfireBasicAuthenticationFilter;
using Microsoft.AspNetCore.Builder;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

#endregion

namespace Easy.Platform.HangfireBackgroundJob;

public abstract class PlatformHangfireBackgroundJobModule : PlatformBackgroundJobModule
{
    public static readonly string DefaultHangfireBackgroundJobAppSettingsName = "HangfireBackgroundJob";

    protected PlatformHangfireBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration) :
        base(serviceProvider, configuration)
    {
    }

    public static int DefaultBackgroundJobServerOptionsWorkerCount => Math.Max(Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent / 2, 5);

    protected abstract PlatformHangfireBackgroundJobStorageType UseBackgroundJobStorage();

    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        serviceCollection.AddHangfire(GlobalConfigurationConfigure);

        serviceCollection.RegisterAllForImplementation<PlatformHangfireBackgroundJobScheduler>(
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService,
            lifeTime: ServiceLifeTime.Scoped);

        serviceCollection.Register<IPlatformBackgroundJobProcessingService>(
            provider => new PlatformHangfireBackgroundJobProcessingService(
                options: BackgroundJobServerOptionsConfigure(
                    provider,
                    new BackgroundJobServerOptions { WorkerCount = DefaultBackgroundJobServerOptionsWorkerCount }),
                loggerFactory: provider.GetRequiredService<ILoggerFactory>()),
            ServiceLifeTime.Singleton,
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService);

        // Register MongoDB maintenance job only for MongoDB storage to avoid unnecessary job scheduling
        if (UseBackgroundJobStorage() == PlatformHangfireBackgroundJobStorageType.Mongo)
            serviceCollection.RegisterAllForImplementation<PlatformTrimHangfireStateHistoryBackgroundJob>();

        GlobalJobFilters.Filters.Add(
            AutomaticRetryOnFailedOptionsBuilder()
                .Pipe(options => new AutomaticRetryAttribute
                {
                    Attempts = options.Attempts,
                    DelayInSecondsByAttemptFunc = options.DelayInSecondsByAttemptFunc
                }));
    }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        // WHY: Config GlobalConfiguration on init module to take advantaged that the persistence module has initiated
        // (convention persistence module should be imported before infrastructure module like background job) so that db is generated.
        GlobalConfigurationConfigure(GlobalConfiguration.Configuration);

        // UseActivator on init so that ServiceProvider have enough all registered services
        GlobalConfiguration.Configuration.UseActivator(new PlatformHangfireActivator(ServiceProvider));

        // Trim StateHistory on startup for MongoDB storage to prevent 16MB document limit
        // This provides immediate relief for existing oversized documents
        if (UseBackgroundJobStorage() == PlatformHangfireBackgroundJobStorageType.Mongo) await TrimHangfireStateHistoryOnStartupAsync();

        await base.InternalInit(serviceScope);
    }

    /// <summary>
    /// Trims StateHistory arrays in Hangfire job documents to prevent MongoDB 16MB BSON limit.
    /// Runs once on service startup for immediate relief from oversized documents.
    ///
    /// <para><strong>Problem:</strong></para>
    /// <para>Hangfire.Mongo stores job state transitions in StateHistory array within each job document.
    /// This array grows unbounded, especially for recurring jobs with executeOnStartUp=true.
    /// When documents exceed 16MB, MongoDB rejects updates with error code 17419.</para>
    ///
    /// <para><strong>Solution:</strong></para>
    /// <para>On startup, trim StateHistory to last MaxStateHistoryEntries (default: 20).
    /// Combined with daily PlatformTrimHangfireStateHistoryBackgroundJob, this prevents accumulation.</para>
    /// </summary>
    protected virtual async Task TrimHangfireStateHistoryOnStartupAsync()
    {
        try
        {
            var options = PlatformHangfireMongoOptionsHolder.CurrentOptions;
            if (options == null) return;

            var result = await PlatformTrimHangfireStateHistoryBackgroundJob.TrimStateHistoryAsync(options);

            Logger.LogInformation(
                "[Hangfire] Trimmed StateHistory on startup. Modified {ModifiedCount} documents.",
                result.ModifiedCount);
        }
        catch (Exception ex)
        {
            // Non-blocking: startup should not fail if cleanup fails
            Logger.LogWarning(
                ex,
                "[Hangfire] Failed to trim StateHistory on startup. Will be cleaned by daily maintenance job.");
        }
    }

    protected virtual BackgroundJobServerOptions BackgroundJobServerOptionsConfigure(
        IServiceProvider provider,
        BackgroundJobServerOptions options)
    {
        return options;
    }

    protected virtual void GlobalConfigurationConfigure(IGlobalConfiguration configuration)
    {
        var commonOptions = CommonOptions();

        configuration
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_170)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseFilter(new PlatformHangfireAutoDeleteJobAfterSuccessAttribute(commonOptions.JobSucceededExpirationTimeoutSeconds));

        switch (UseBackgroundJobStorage())
        {
            case PlatformHangfireBackgroundJobStorageType.InMemory:
            {
                configuration.UseInMemoryStorage();
                break;
            }

            case PlatformHangfireBackgroundJobStorageType.Sql:
            {
                Util.TaskRunner.WaitRetryThrowFinalException(() =>
                {
                    var options = UseSqlServerStorageOptions();
                    configuration.UseSqlServerStorage(
                        () => new SqlConnection(options.ConnectionString),
                        options.StorageOptions);
                });
                break;
            }

            case PlatformHangfireBackgroundJobStorageType.Mongo:
            {
                Util.TaskRunner.WaitRetryThrowFinalException(() =>
                {
                    var options = UseMongoStorageOptions();

                    // Store options for StateHistory cleanup job
                    PlatformHangfireMongoOptionsHolder.CurrentOptions = options;

                    configuration.UseMongoStorage(
                        options.ConnectionString,
                        options.DatabaseName,
                        options.StorageOptions
                            .WithIf(
                                PlatformEnvironment.IsDevelopment,
                                p =>
                                {
                                    // https://github.com/Hangfire-Mongo/Hangfire.Mongo/issues/300 Fix for local hangfire mongo
                                    p.CheckQueuedJobsStrategy = CheckQueuedJobsStrategy.TailNotificationsCollection;
                                }));
                });
                break;
            }

            case PlatformHangfireBackgroundJobStorageType.PostgreSql:
            {
                Util.TaskRunner.WaitRetryThrowFinalException(() =>
                {
                    var options = UsePostgreSqlStorageOptions();
                    configuration.UsePostgreSqlStorage(opts => opts.UseNpgsqlConnection(options.ConnectionString), options.StorageOptions);
                });
                break;
            }

            default:
                throw new Exception("Invalid PlatformHangfireBackgroundJobStorageType");
        }
    }

    protected virtual string StorageOptionsConnectionString()
    {
        return Configuration.GetConnectionString($"{DefaultHangfireBackgroundJobAppSettingsName}:ConnectionString");
    }

    protected virtual PlatformHangfireCommonOptions CommonOptions()
    {
        return new PlatformHangfireCommonOptions();
    }

    protected virtual PlatformHangfireUseSqlServerStorageOptions UseSqlServerStorageOptions()
    {
        return new PlatformHangfireUseSqlServerStorageOptions
        {
            ConnectionString = StorageOptionsConnectionString()
        };
    }

    protected virtual PlatformHangfireUseMongoStorageOptions UseMongoStorageOptions()
    {
        return new PlatformHangfireUseMongoStorageOptions
        {
            ConnectionString = StorageOptionsConnectionString()
        };
    }

    protected virtual PlatformHangfireUsePostgreSqlStorageOptions UsePostgreSqlStorageOptions()
    {
        return new PlatformHangfireUsePostgreSqlStorageOptions
        {
            ConnectionString = StorageOptionsConnectionString()
        };
    }

    protected virtual PlatformBackgroundJobUseDashboardUiOptions BackgroundJobUseDashboardUiOptions()
    {
        return new PlatformBackgroundJobUseDashboardUiOptions();
    }

    public override PlatformBackgroundJobModule UseDashboardUi(IApplicationBuilder app, PlatformBackgroundJobUseDashboardUiOptions options = null)
    {
        options ??= BackgroundJobUseDashboardUiOptions();

        options.EnsureValid();

        app.UseHangfireDashboard(
            options.DashboardUiPathStart,
            new DashboardOptions()
                .WithIf(
                    options.UseAuthentication && options.BasicAuthentication != null,
                    opts => opts.Authorization =
                    [
                        new HangfireCustomBasicAuthenticationFilter
                        {
                            User = options.BasicAuthentication.UserName,
                            Pass = options.BasicAuthentication.Password
                        }
                    ]));

        return this;
    }
}
