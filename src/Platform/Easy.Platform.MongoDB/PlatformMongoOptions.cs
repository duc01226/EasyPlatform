using MongoDB.Driver.Core.Configuration;

namespace Easy.Platform.MongoDB;

public class PlatformMongoOptions
{
    public string ConnectionString { get; set; }
    public string Database { get; set; }
    public int? MinConnectionPoolSize { get; set; }
    public int? MaxConnectionPoolSize { get; set; }

    /// <summary>
    /// Max connections being ESTABLISHED concurrently (MongoDB <c>maxConnecting</c>, driver default 2).
    /// Throttles handshakes; it does NOT bound how many connections may exist — that is <see cref="MaxConnectionPoolSize" />.
    /// Left null the driver default applies, which starves a large pool on cold start. Set it from
    /// <c>PlatformMongoDbPersistenceModule.GetRecommendedMaxConnecting()</c> so the two stay paired.
    /// </summary>
    public int? MaxConnecting { get; set; }

    /// <summary>
    /// To configure a DbContext to release its connection shortly after being idle
    ///  => prevent max connection pool error, no connection if a db-context is idling (example run paging for a long time but has opened a db context outside and wait)
    /// </summary>
    public int? MaxConnectionIdleTimeSeconds { get; set; }

    public Action<ClusterBuilder> ClusterConfigurator { get; set; }
}

public class PlatformMongoOptions<TDbContext> : PlatformMongoOptions
    where TDbContext : PlatformMongoDbContext<TDbContext>
{
}
