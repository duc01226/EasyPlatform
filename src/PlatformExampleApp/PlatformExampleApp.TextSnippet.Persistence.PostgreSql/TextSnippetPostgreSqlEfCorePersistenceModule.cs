using Easy.Platform.EfCore;
using Easy.Platform.EfCore.Services;
using Easy.Platform.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Npgsql;

namespace PlatformExampleApp.TextSnippet.Persistence.PostgreSql;

public class TextSnippetPostgreSqlEfCorePersistenceModule : PlatformEfCorePersistenceModule<TextSnippetDbContext>
{
    public TextSnippetPostgreSqlEfCorePersistenceModule(
        IServiceProvider serviceProvider,
        IConfiguration configuration) : base(serviceProvider, configuration)
    {
    }

    // Override using fulltext search index for BETTER PERFORMANCE
    protected override EfCorePlatformFullTextSearchPersistenceService FullTextSearchPersistenceServiceProvider(IServiceProvider serviceProvider)
    {
        return new TextSnippetPostgreSqlEfCorePlatformFullTextSearchPersistenceService(serviceProvider);
    }

    protected override bool EnableInboxBusMessage()
    {
        return true;
    }

    protected override bool EnableOutboxBusMessage()
    {
        return true;
    }

    protected override Action<DbContextOptionsBuilder> DbContextOptionsBuilderActionProvider(
        IServiceProvider serviceProvider)
    {
        /*
         * If your column JSON contains documents with a stable schema, you can map them to your own .NET types (or POCOs). The provider will use System.Text.Json APIs under the hood to serialize instances of your types to JSON documents before sending them to the database, and to deserialize documents coming back from the database. This effectively allows mapping an arbitrary .NET type - or object graph - to a single column in the database.
         * Starting with Npgsql 8.0, to use this feature, you must first enable it by calling <xref:Npgsql.INpgsqlTypeMapperExtensions.EnableDynamicJson> on your NpgsqlDataSourceBuilder, or, if you're not yet using data sources, on NpgsqlConnection.GlobalTypeMapper:
         */
        NpgsqlConnection.GlobalTypeMapper.EnableDynamicJson();

        // UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery) for best practice increase performance
        // With(conn => conn.Enlist = false); With(conn => conn.ReadBufferSize = 8192) https://www.npgsql.org/doc/performance.html
        return options => options
            .UseNpgsql(
                new NpgsqlConnectionStringBuilder(Configuration.GetConnectionString("PostgreSqlConnection"))
                    .With(conn => conn.Enlist = false)
                    .With(conn => conn.Pooling = true)
                    .With(conn => conn.MinPoolSize = 1) // Always available connection to serve request, reduce latency
                    .With(conn => conn.MaxPoolSize = 80) // Setup max pool size depend on the database maximum connections available
                    .ToString(),
                options => options.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery))
            .UseLazyLoadingProxies()
            .EnableDetailedErrors(detailedErrorsEnabled: PlatformEnvironment.IsDevelopment || Configuration.GetSection("SeedDummyData").Get<bool>());
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

public class TextSnippetPostgreSqlEfCorePlatformFullTextSearchPersistenceService : EfCorePlatformFullTextSearchPersistenceService
{
    public TextSnippetPostgreSqlEfCorePlatformFullTextSearchPersistenceService(IServiceProvider serviceProvider) : base(serviceProvider)
    {
    }

    // https://www.npgsql.org/efcore/mapping/full-text-search.html#method-2-expression-index
    // builder.HasIndex(p => p.ColName).HasMethod("gin").IsTsVectorExpressionIndex("english");
    public override IQueryable<T> BuildFullTextSearchForSinglePropQueryPart<T>(
        IQueryable<T> originalQuery,
        string fullTextSearchSinglePropName,
        List<string> removedSpecialCharacterSearchTextWords,
        bool exactMatch)
    {
        return originalQuery.Where(
            entity => EF.Functions
                .ToTsVector("english", EF.Property<string>(entity, fullTextSearchSinglePropName))
                .Matches(removedSpecialCharacterSearchTextWords.JoinToString(exactMatch ? " & " : " | ")));
    }

    // Need to execute: CREATE EXTENSION IF NOT EXISTS pg_trgm; => create extension for postgreSQL to support ILike
    // Need to "create index Index_Name on "TableName" using gin("ColumnName" gin_trgm_ops)" <=> builder.HasIndex(p => p.ColName).HasMethod("gin").HasOperators("gin_trgm_ops")
    protected override IQueryable<T> BuildStartWithSearchForSinglePropQueryPart<T>(IQueryable<T> originalQuery, string startWithPropName, string searchText)
    {
        return originalQuery.Where(
            entity => EF.Functions.ILike(EF.Property<string>(entity, startWithPropName), $"{searchText}%"));
    }
}
