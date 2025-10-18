using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application;

public interface IPlatformApplicationDataSeeder
{
    /// <summary>
    /// Seed order support multiple data seeders seed by order. Start default value from 0; Higher order will execute later
    /// </summary>
    public int SeedOrder { get; }

    /// <summary>
    /// Default value is 0 mean that No Seeding in background; <br />
    /// When value is > 0, Support delay execute a seed data task in background thread.
    /// This is needed if you want to seed a lot of data for testing performance purpose or you seed by command so wait for
    /// infrastructure to started,
    /// so you don't prevent the application to kick start, and also waiting for all other micro services could started
    /// before you do seed data, to ensure that other services still may receive data if they sync (listen data via message
    /// bus)
    /// </summary>
    public int DelaySeedingInBackgroundBySeconds { get; }

    public Task SeedData(bool isReplaceNewSeedData = false);
}

/// <summary>
/// The data seeders will run SeedData on module.Init()
/// </summary>
public abstract class PlatformApplicationDataSeeder : IPlatformApplicationDataSeeder
{
    public const int DefaultActiveDelaySeedingInBackgroundBySeconds = 5;
    public const int DefaultDelayRetryCheckSeedDataBySeconds = 5;
    public const int DefaultMaxWaitSeedDataBySyncMessagesBySeconds = 3600;

    protected readonly IConfiguration Configuration;
    protected readonly ILoggerFactory LoggerFactory;
    protected readonly IPlatformRootServiceProvider RootServiceProvider;
    protected readonly IServiceProvider ServiceProvider;
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    private readonly Lazy<ILogger> loggerLazy;

    public PlatformApplicationDataSeeder(
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IConfiguration configuration,
        ILoggerFactory loggerFactory,
        IPlatformRootServiceProvider rootServiceProvider)
    {
        UnitOfWorkManager = unitOfWorkManager;
        ServiceProvider = serviceProvider;
        Configuration = configuration;
        LoggerFactory = loggerFactory;
        RootServiceProvider = rootServiceProvider;
        loggerLazy = new Lazy<ILogger>(() => loggerFactory.CreateLogger(typeof(PlatformApplicationDataSeeder).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
        ApplicationSettingContext = serviceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    public static int DefaultSeedingMinimumDummyItemsCount => PlatformEnvironment.IsDevelopment ? 10 : 1000;

    /// <summary>
    /// Default value is SeedingMinimumDummyItemsCount; <br />
    /// Used to read SeedingMinimumDummyItemsCount in appsettings by Configuration. <br />
    /// Could update it to change the configuration key.
    /// </summary>
    public static string SeedingMinimumDummyItemsCountConfigurationKey { get; set; } = "SeedingMinimumDummyItemsCount";

    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    protected ILogger Logger => loggerLazy.Value;

    /// <summary>
    /// Default is true. Override this if you want to start uow yourself or not want to
    /// auto run in a uow
    /// </summary>
    protected virtual bool AutoBeginUow => false;

    public virtual async Task SeedData(bool isReplaceNewSeedData = false)
    {
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(SeedData));

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (AutoBeginUow)
                {
                    using (var uow = UnitOfWorkManager.Begin())
                    {
                        await InternalSeedData(isReplaceNewSeedData);
                        await uow.CompleteAsync();
                    }
                }
                else
                    await InternalSeedData(isReplaceNewSeedData);
            });

        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(SeedData));
    }

    public virtual int SeedOrder => 0;

    public virtual int DelaySeedingInBackgroundBySeconds => 0;

    public static int SeedingMinimumDummyItemsCount(IConfiguration configuration)
    {
        return configuration.GetValue<int?>(SeedingMinimumDummyItemsCountConfigurationKey) ??
               DefaultSeedingMinimumDummyItemsCount;
    }

    protected abstract Task InternalSeedData(bool isReplaceNewSeed = false);
}
