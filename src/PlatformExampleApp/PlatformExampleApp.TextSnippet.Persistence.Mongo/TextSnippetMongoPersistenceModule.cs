using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using PlatformExampleApp.TextSnippet.Application;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo;

public class TextSnippetMongoPersistenceModule : PlatformMongoDbPersistenceModule<TextSnippetDbContext>
{
    public override PlatformMessageBusStoreKey MessageBusStoreKey => new(TextSnippetApplicationModule.MessageBusStoreKeyValue);

    /// <summary>
    /// Opts in so the TextSnippet inbox/outbox store can be bound next to other module stores in a composite host.
    /// </summary>
    public override bool EnableMessageBusStoreContribution => true;

    public TextSnippetMongoPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    public override async Task InitializeDatabaseAsync(IServiceScope serviceScope)
    {
        if (!ForCrossDbMigrationOnly && !DisableDatabaseInitialization)
        {
            // Every host checks this required schema before normal initialization, independently of migration leases.
            // Rebuilding the sole text index is an explicit offline maintenance operation; the default never drops it.
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => TextSnippetSearchIndexes.EnsureCreatorTextIndexAsync(
                    serviceScope.ServiceProvider.GetRequiredService<TextSnippetDbContext>().TextSnippetCollection,
                    Configuration.GetValue<bool>("MongoDB:RebuildCreatorTextSearchIndex")),
                retryAttempt => DefaultDbInitAndMigrationRetryDelaySeconds.Seconds(),
                DefaultDbInitAndMigrationRetryCount,
                ignoreExceptionTypes: [typeof(InvalidOperationException)]);
        }

        await base.InitializeDatabaseAsync(serviceScope);
    }

    protected override void ConfigureMongoOptions(PlatformMongoOptions<TextSnippetDbContext> options)
    {
        options.ConnectionString = new MongoUrlBuilder(Configuration.GetSection("MongoDB:ConnectionString").Value)
            .With(
                p => p.MinConnectionPoolSize = RecommendedMinPoolSize) // Always available connection to serve request, reduce latency
            .With(p => p.MaxConnectionPoolSize = GetRecommendedMaxPoolSize())
            .With(p => p.MaxConnecting = GetRecommendedMaxConnecting())
            .With(p => p.MaxConnectionIdleTime = RecommendedConnectionIdleLifetimeSeconds.Seconds())
            .With(p => p.ConnectTimeout = 30.Seconds())
            .ToString();
        options.Database = Configuration.GetSection("MongoDB:Database").Value;
        //options.MinConnectionPoolSize =
        //    Configuration.GetValue<int?>("MongoDB:MinConnectionPoolSize") ?? PlatformPersistenceModule.RecommendedMinPoolSize; // Always available connection to serve request, reduce latency
        //options.MaxConnectionPoolSize =
        //    Configuration.GetValue<int?>("MongoDB:MaxConnectionPoolSize") ??
        //    RecommendedMaxPoolSize; // Setup based on app resource cpu ram max concurrent
        ////options.MaxConnectionIdleTimeSeconds = RecommendedConnectionIdleLifetimeSeconds;
    }

    protected override bool IsInboxBusMessageEnabled()
    {
        return true;
    }

    protected override bool IsOutboxBusMessageEnabled()
    {
        return true;
    }

    // override to Config PlatformPersistenceConfiguration
    protected override PlatformPersistenceConfiguration<TextSnippetDbContext> ConfigurePersistenceConfiguration(
        PlatformPersistenceConfiguration<TextSnippetDbContext> config,
        IConfiguration configuration)
    {
        return base.ConfigurePersistenceConfiguration(config, configuration)
            .With(p => p.BadQueryWarning.IsEnabled = configuration.GetValue<bool>("PersistenceConfiguration:BadQueryWarning:IsEnabled"))
            .With(p => p.BadQueryWarning.TotalItemsThresholdWarningEnabled = true)
            .With(
                p => p.BadQueryWarning.TotalItemsThreshold =
                    configuration.GetValue<int>("PersistenceConfiguration:BadQueryWarning:TotalItemsThreshold")) // Demo warning for getting a lot of data in to memory
            .With(
                p => p.BadQueryWarning.SlowQueryMillisecondsThreshold =
                    configuration.GetValue<int>("PersistenceConfiguration:BadQueryWarning:SlowQueryMillisecondsThreshold"))
            .With(
                p => p.BadQueryWarning.SlowWriteQueryMillisecondsThreshold =
                    configuration.GetValue<int>("PersistenceConfiguration:BadQueryWarning:SlowWriteQueryMillisecondsThreshold"))
            .With(
                p => p.BadQueryWarning.IsLogWarningAsError =
                    configuration.GetValue<bool>("PersistenceConfiguration:BadQueryWarning:IsLogWarningAsError")); // Demo logging warning as error message;
    }
}
