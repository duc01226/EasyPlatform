using Easy.Platform.MongoDB;
using Easy.Platform.Persistence;
using Microsoft.Extensions.Configuration;
using MongoDB.Driver;

namespace PlatformExampleApp.TextSnippet.Persistence.Mongo;

public class TextSnippetMongoPersistenceModule : PlatformMongoDbPersistenceModule<TextSnippetDbContext>
{
    public TextSnippetMongoPersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    protected override void ConfigureMongoOptions(PlatformMongoOptions<TextSnippetDbContext> options)
    {
        options.ConnectionString = new MongoUrlBuilder(Configuration.GetSection("MongoDB:ConnectionString").Value)
            .With(
                p => p.MinConnectionPoolSize = RecommendedMinPoolSize) // Always available connection to serve request, reduce latency
            .With(p => p.MaxConnectionPoolSize = RecommendedMaxPoolSize)
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
