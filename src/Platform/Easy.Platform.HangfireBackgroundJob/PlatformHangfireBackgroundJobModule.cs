#region

using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
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

#endregion

namespace Easy.Platform.HangfireBackgroundJob;

public abstract class PlatformHangfireBackgroundJobModule : PlatformBackgroundJobModule
{
    public static readonly string DefaultHangfireBackgroundJobAppSettingsName = "HangfireBackgroundJob";

    protected PlatformHangfireBackgroundJobModule(IServiceProvider serviceProvider, IConfiguration configuration) :
        base(serviceProvider, configuration)
    {
    }

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
                options: BackgroundJobServerOptionsConfigure(provider, new BackgroundJobServerOptions()),
                loggerFactory: provider.GetRequiredService<ILoggerFactory>()),
            ServiceLifeTime.Singleton,
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService);

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

        await base.InternalInit(serviceScope);
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
