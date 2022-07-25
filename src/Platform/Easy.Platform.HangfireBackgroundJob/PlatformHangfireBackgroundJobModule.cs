using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Infrastructures.BackgroundJob;
using Hangfire;
using Hangfire.Mongo;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

        RegisterBackgroundJob(serviceCollection);
    }

    protected override void RegisterBackgroundJob(IServiceCollection serviceCollection)
    {
        serviceCollection.AddHangfire(GlobalConfigurationConfigure);

        serviceCollection.RegisterAllFromType<IPlatformBackgroundJobExecutor>(
            ServiceLifeTime.Transient,
            Assembly,
            replaceIfExist: true);

        serviceCollection.RegisterAllForImplementation<PlatformHangfireBackgroundJobScheduler>(
            ServiceLifeTime.Transient,
            replaceIfExist: true,
            replaceStrategy: ServiceCollectionExtension.ReplaceServiceStrategy.ByService);

        serviceCollection.Register(
            typeof(IPlatformBackgroundJobProcessingService),
            provider =>
            {
                var options = new BackgroundJobServerOptions();
                BackgroundJobServerOptionsConfigure(provider, options);

                return new PlatformHangfireBackgroundJobProcessingService(options);
            },
            ServiceLifeTime.Singleton,
            replaceIfExist: true,
            replaceStrategy: ServiceCollectionExtension.ReplaceServiceStrategy.ByService);
    }

    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        // WHY: Config GlobalConfiguration on init module to take advantaged that the persistence module has initiated
        // (convention persistence module should be imported before infras module like background job) so that db is generated.
        GlobalConfigurationConfigure(GlobalConfiguration.Configuration);

        // UseActivator on init so that ServiceProvider have enough all registered services
        GlobalConfiguration.Configuration.UseActivator(new PlatformHangfireActivator(ServiceProvider));

        await StartBackgroundJobProcessing(serviceScope);

        await ReplaceAllRecurringBackgroundJobs(serviceScope);
    }

    protected virtual void BackgroundJobServerOptionsConfigure(
        IServiceProvider provider,
        BackgroundJobServerOptions options)
    {
        options.WorkerCount = Environment.ProcessorCount;
    }

    protected virtual void GlobalConfigurationConfigure(IGlobalConfiguration configuration)
    {
        configuration
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_170)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings();

        switch (UseBackgroundJobStorage())
        {
            case PlatformHangfireBackgroundJobStorageType.InMemory:
            {
                configuration.UseInMemoryStorage();
                break;
            }

            case PlatformHangfireBackgroundJobStorageType.Sql:
            {
                var options = UseSqlServerStorageOptions();
                configuration.UseSqlServerStorage(
                    options.ConnectionString,
                    options.StorageOptions);
                break;
            }

            case PlatformHangfireBackgroundJobStorageType.Mongo:
            {
                var options = UseMongoStorageOptions();
                configuration.UseMongoStorage(
                    options.ConnectionString,
                    options.DatabaseName,
                    options.StorageOptions);
                break;
            }

            default:
                throw new ArgumentOutOfRangeException();
        }
    }

    protected virtual PlatformHangfireUseSqlServerStorageOptions UseSqlServerStorageOptions()
    {
        return new PlatformHangfireUseSqlServerStorageOptions
        {
            ConnectionString = StorageOptionsConnectionString()
        };
    }

    protected virtual string StorageOptionsConnectionString()
    {
        return Configuration.GetConnectionString($"{DefaultHangfireBackgroundJobAppSettingsName}:ConnectionString");
    }

    protected virtual PlatformHangfireUseMongoStorageOptions UseMongoStorageOptions()
    {
        return new PlatformHangfireUseMongoStorageOptions
        {
            ConnectionString = StorageOptionsConnectionString()
        };
    }
}
