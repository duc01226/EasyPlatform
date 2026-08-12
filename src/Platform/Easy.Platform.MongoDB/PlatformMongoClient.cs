using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace Easy.Platform.MongoDB;

public interface IPlatformMongoClient
{
    public MongoClient MongoClient { get; }
}

public interface IPlatformMongoClient<TDbContext> : IPlatformMongoClient
    where TDbContext : PlatformMongoDbContext<TDbContext>
{
}

public class PlatformMongoClient : IPlatformMongoClient
{
    public PlatformMongoClient(IOptions<PlatformMongoOptions> options)
    {
        var clientSettings = MongoClientSettings.FromUrl(
            new MongoUrlBuilder(options.Value.ConnectionString)
                .WithIf(options.Value.MinConnectionPoolSize.HasValue, p => p.MinConnectionPoolSize = options.Value.MinConnectionPoolSize!.Value)
                .WithIf(options.Value.MaxConnectionPoolSize.HasValue, p => p.MaxConnectionPoolSize = options.Value.MaxConnectionPoolSize!.Value)
                // Only when explicitly set — a null leaves whatever the connection string carried (or the driver default 2),
                // so this never silently overrides a maxConnecting= already present in the configured connection string.
                .WithIf(options.Value.MaxConnecting.HasValue, p => p.MaxConnecting = options.Value.MaxConnecting!.Value)
                .WithIf(options.Value.MaxConnectionIdleTimeSeconds.HasValue, p => p.MaxConnectionIdleTime = options.Value.MaxConnectionIdleTimeSeconds!.Value.Seconds())
                .ToMongoUrl());

        if (options.Value.ClusterConfigurator != null) clientSettings.ClusterConfigurator = options.Value.ClusterConfigurator;

        MongoClient = new MongoClient(clientSettings);
    }

    public MongoClient MongoClient { get; init; }
}

public class PlatformMongoClient<TDbContext>
    : PlatformMongoClient, IPlatformMongoClient<TDbContext> where TDbContext : PlatformMongoDbContext<TDbContext>
{
    public PlatformMongoClient(IOptions<PlatformMongoOptions<TDbContext>> options) : base(options)
    {
    }
}
