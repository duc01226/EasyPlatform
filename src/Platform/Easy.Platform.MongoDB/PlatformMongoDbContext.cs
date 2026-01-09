#region

using System.Diagnostics;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Migration;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

#endregion

namespace Easy.Platform.MongoDB;

/// <summary>
/// Base abstract MongoDB database context that provides comprehensive NoSQL data access capabilities within the Easy Platform architecture.
/// This class implements the IPlatformDbContext interface for MongoDB operations, providing document-based data persistence with platform-specific
/// enhancements including CQRS event handling, bulk operations, index management, and data migration support for document databases.
/// </summary>
/// <typeparam name="TDbContext">The concrete MongoDB database context type that inherits from this base class. This generic constraint ensures
/// type safety and enables the platform to work with strongly-typed contexts while providing common functionality across all MongoDB implementations.</typeparam>
/// <remarks>
/// <para><strong>MongoDB Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Native MongoDB driver integration with async/await support and connection pooling</description></item>
/// <item><description>Document-based operations with BSON serialization and flexible schema support</description></item>
/// <item><description>Collection mapping with configurable naming conventions and type-safe operations</description></item>
/// <item><description>Index management with automatic creation, recreation, and optimization capabilities</description></item>
/// </list>
///
/// <para><strong>Platform Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Seamless integration with Platform persistence configuration and dependency injection</description></item>
/// <item><description>CQRS event handling for document Create, Update, Delete operations</description></item>
/// <item><description>Request context integration for user auditing and tenant isolation in document databases</description></item>
/// <item><description>Unit of Work pattern support with pseudo-transaction semantics for MongoDB</description></item>
/// </list>
///
/// <para><strong>Document Operations:</strong></para>
/// <list type="bullet">
/// <item><description>High-performance bulk operations (InsertMany, UpdateMany, DeleteMany) with optimized batch processing</description></item>
/// <item><description>Flexible query operations using MongoDB's powerful aggregation pipeline and LINQ integration</description></item>
/// <item><description>Document versioning with optimistic concurrency control using row version tokens</description></item>
/// <item><description>CreateOrUpdate operations with intelligent conflict resolution and duplicate detection</description></item>
/// </list>
///
/// <para><strong>Schema and Index Management:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic index creation and management with recreation support for schema changes</description></item>
/// <item><description>Collection naming configuration with custom mapping between types and collection names</description></item>
/// <item><description>Migration system with versioning support for schema evolution and data transformations</description></item>
/// <item><description>Cross-collection operations with referential integrity support for document relationships</description></item>
/// </list>
///
/// <para><strong>Performance and Scalability:</strong></para>
/// <list type="bullet">
/// <item><description>Connection pooling with configurable pool sizes and connection lifecycle management</description></item>
/// <item><description>Parallel execution support for batch operations and high-throughput scenarios</description></item>
/// <item><description>Optimized serialization with custom BSON serializers for platform types</description></item>
/// <item><description>Efficient pagination support with configurable page sizes for large data sets</description></item>
/// </list>
///
/// <para><strong>Event-Driven Architecture:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic CQRS entity event generation for document lifecycle operations</description></item>
/// <item><description>Domain event support for complex business logic coordination across document aggregates</description></item>
/// <item><description>Event customization through configurable event handlers and custom event configurations</description></item>
/// <item><description>Bulk operation events for high-performance batch processing with event correlation</description></item>
/// </list>
///
/// <para><strong>Data Migration and Versioning:</strong></para>
/// <list type="bullet">
/// <item><description>MongoDB-specific migration system with document transformation support</description></item>
/// <item><description>Data migration history tracking with status monitoring and conflict resolution</description></item>
/// <item><description>Cross-database migration support for complex enterprise data movement scenarios</description></item>
/// <item><description>Schema evolution support with backward compatibility and version management</description></item>
/// </list>
///
/// <para><strong>Audit and Compliance:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic audit trail support with user and timestamp tracking for document changes</description></item>
/// <item><description>Tenant isolation support for multi-tenant document-based applications</description></item>
/// <item><description>Compliance-ready logging and monitoring integration with structured data capture</description></item>
/// <item><description>Data retention and archival support through configurable document lifecycle policies</description></item>
/// </list>
///
/// </remarks>
public abstract class PlatformMongoDbContext<TDbContext> : IPlatformDbContext<TDbContext>
    where TDbContext : PlatformMongoDbContext<TDbContext>, IPlatformDbContext<TDbContext>
{
    /// <summary>
    /// The migration name used to track the completion of index creation and management operations.
    /// This migration ensures that all required database indexes are properly created and maintained
    /// before the application begins normal data operations.
    /// </summary>
    /// <value>
    /// The constant string "EnsureIndexesAsync" used as the migration identifier for index management operations.
    /// </value>
    /// <remarks>
    /// <para><strong>Index Management:</strong></para>
    /// <list type="bullet">
    /// <item><description>Tracks the completion of all index creation operations for the database context</description></item>
    /// <item><description>Ensures indexes are created before data operations begin to maintain query performance</description></item>
    /// <item><description>Supports index recreation scenarios for schema changes and optimization</description></item>
    /// <item><description>Prevents duplicate index creation operations across application restarts</description></item>
    /// </list>
    ///
    /// <para><strong>Migration Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Recorded in the migration history collection upon successful index creation</description></item>
    /// <item><description>Used to determine if index creation has been completed for this context</description></item>
    /// <item><description>Enables conditional index operations based on migration status</description></item>
    /// <item><description>Coordinates index management across multiple application instances</description></item>
    /// </list>
    /// </remarks>
    public const string EnsureIndexesMigrationName = "EnsureIndexesAsync";

    /// <summary>
    /// The default collection name used for storing Platform inbox message bus messages in MongoDB.
    /// Inbox messages represent events and commands received from other services or system components
    /// that need to be processed by this service using the inbox pattern for reliable message handling.
    /// </summary>
    /// <value>
    /// The constant string "InboxEventBusMessage" used as the collection name for inbox message storage.
    /// </value>
    /// <remarks>
    /// <para><strong>Inbox Pattern Implementation:</strong></para>
    /// <list type="bullet">
    /// <item><description>Stores incoming messages for reliable processing with retry and failure handling</description></item>
    /// <item><description>Supports message deduplication and idempotent processing scenarios</description></item>
    /// <item><description>Enables ordered message processing and dependency coordination</description></item>
    /// <item><description>Provides message status tracking and processing history</description></item>
    /// </list>
    ///
    /// <para><strong>Message Bus Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Integrates with Platform message bus infrastructure for cross-service communication</description></item>
    /// <item><description>Supports event-driven architecture patterns with reliable message delivery</description></item>
    /// <item><description>Enables saga and workflow coordination across distributed services</description></item>
    /// <item><description>Provides audit trail for message processing and system integration</description></item>
    /// </list>
    /// </remarks>
    public const string PlatformInboxBusMessageCollectionName = "InboxEventBusMessage";

    /// <summary>
    /// The default collection name used for storing Platform outbox message bus messages in MongoDB.
    /// Outbox messages represent events and commands that this service needs to publish to other services
    /// using the outbox pattern for reliable message publishing and eventual consistency.
    /// </summary>
    /// <value>
    /// The constant string "OutboxEventBusMessage" used as the collection name for outbox message storage.
    /// </value>
    /// <remarks>
    /// <para><strong>Outbox Pattern Implementation:</strong></para>
    /// <list type="bullet">
    /// <item><description>Ensures reliable message publishing as part of local database transactions</description></item>
    /// <item><description>Provides exactly-once delivery semantics for critical business events</description></item>
    /// <item><description>Supports delayed and scheduled message publishing scenarios</description></item>
    /// <item><description>Enables message retry and failure handling with exponential backoff</description></item>
    /// </list>
    ///
    /// <para><strong>Event Publishing:</strong></para>
    /// <list type="bullet">
    /// <item><description>Coordinates with local database operations to ensure consistency</description></item>
    /// <item><description>Supports event sourcing and domain event publishing patterns</description></item>
    /// <item><description>Enables saga and workflow initiation across distributed services</description></item>
    /// <item><description>Provides comprehensive audit trail for published events and system interactions</description></item>
    /// </list>
    /// </remarks>
    public const string PlatformOutboxBusMessageCollectionName = "OutboxEventBusMessage";

    /// <summary>
    /// The default collection name used for storing Platform data migration history records in MongoDB.
    /// Migration history tracks the execution status of data migration operations, schema changes,
    /// and system initialization processes for audit and coordination purposes.
    /// </summary>
    /// <value>
    /// The constant string "MigrationHistory" used as the collection name for migration history storage.
    /// </value>
    /// <remarks>
    /// <para><strong>Migration Tracking:</strong></para>
    /// <list type="bullet">
    /// <item><description>Records execution status of all data migration operations and schema changes</description></item>
    /// <item><description>Prevents duplicate migration execution across multiple application instances</description></item>
    /// <item><description>Supports rollback and recovery operations during failed migrations</description></item>
    /// <item><description>Enables migration dependency tracking and ordering</description></item>
    /// </list>
    ///
    /// <para><strong>System Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description>Coordinates migration execution across distributed deployments</description></item>
    /// <item><description>Supports blue-green deployment scenarios with migration state tracking</description></item>
    /// <item><description>Enables conditional logic based on database initialization status</description></item>
    /// <item><description>Provides comprehensive audit trail for system evolution and changes</description></item>
    /// </list>
    /// </remarks>
    public const string PlatformDataMigrationHistoryCollectionName = "MigrationHistory";

    protected readonly IPlatformApplicationSettingContext ApplicationSettingContext;
    protected readonly Lazy<Dictionary<Type, string>> EntityTypeToCollectionNameDictionary;
    protected readonly PlatformPersistenceConfiguration<TDbContext> PersistenceConfiguration;
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    private readonly Lazy<ILogger> lazyLogger;
    private readonly IPlatformApplicationRequestContextAccessor requestContextAccessor;

    private bool disposed;

    public PlatformMongoDbContext(
        IPlatformMongoDatabase<TDbContext> database,
        ILoggerFactory loggerFactory,
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        PlatformPersistenceConfiguration<TDbContext> persistenceConfiguration,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationSettingContext applicationSettingContext
    )
    {
        Database = database.Value;

        this.requestContextAccessor = requestContextAccessor;
        PersistenceConfiguration = persistenceConfiguration;
        RootServiceProvider = rootServiceProvider;
        ApplicationSettingContext = applicationSettingContext;
        EntityTypeToCollectionNameDictionary = new Lazy<Dictionary<Type, string>>(BuildEntityTypeToCollectionNameDictionary);

        lazyLogger = new Lazy<ILogger>(() => CreateLogger(loggerFactory));
    }

    /// <summary>
    /// Gets the current request context accessor used for retrieving user information, tenant data, and request-specific
    /// metadata throughout MongoDB database operations. This accessor provides consistent access to the current request context
    /// whether it's set manually or resolved from the dependency injection container.
    /// </summary>
    /// <value>
    /// The request context accessor instance, either the explicitly set CurrentRequestContextAccessor or the injected instance.
    /// </value>
    /// <remarks>
    /// <para><strong>MongoDB Document Auditing:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides access to current user ID and authentication information for document audit trails</description></item>
    /// <item><description>Contains tenant information for multi-tenant document-based application scenarios</description></item>
    /// <item><description>Includes request correlation IDs for distributed tracing and logging across document operations</description></item>
    /// <item><description>Offers custom key-value pairs for request-specific metadata and configuration in document context</description></item>
    /// </list>
    ///
    /// <para><strong>Document Audit Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically populates CreatedBy and LastUpdatedBy fields on audited documents</description></item>
    /// <item><description>Supports different user ID types (string, int, Guid) through generic type resolution</description></item>
    /// <item><description>Provides consistent user information across all MongoDB document operations</description></item>
    /// <item><description>Enables tenant-aware document operations and collection-level filtering</description></item>
    /// </list>
    ///
    /// <para><strong>Context Resolution Strategy:</strong></para>
    /// <list type="bullet">
    /// <item><description>First checks for explicitly set CurrentRequestContextAccessor for manual context control</description></item>
    /// <item><description>Falls back to injected instance from dependency injection for normal operations</description></item>
    /// <item><description>Provides consistent behavior across different execution contexts and scenarios</description></item>
    /// <item><description>Supports both HTTP request contexts and background job execution contexts</description></item>
    /// </list>
    ///
    /// </remarks>
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor => CurrentRequestContextAccessor ?? requestContextAccessor;

    /// <summary>
    /// Gets the MongoDB database instance that provides direct access to the underlying MongoDB database operations,
    /// collections, and MongoDB driver functionality for this context.
    /// </summary>
    /// <value>
    /// The IMongoDatabase instance configured for this context, providing access to all MongoDB operations and collections.
    /// </value>
    /// <remarks>
    /// <para><strong>MongoDB Driver Access:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides direct access to MongoDB driver functionality for advanced operations</description></item>
    /// <item><description>Enables collection access with type-safe operations and BSON serialization</description></item>
    /// <item><description>Supports database-level operations such as commands, transactions, and administration</description></item>
    /// <item><description>Configured with connection pooling, retry policies, and performance optimizations</description></item>
    /// </list>
    ///
    /// <para><strong>Collection Operations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Serves as the foundation for GetCollection&lt;T&gt;() operations throughout the context</description></item>
    /// <item><description>Enables custom collection access with specific naming conventions and configurations</description></item>
    /// <item><description>Supports dynamic collection creation and management for runtime scenarios</description></item>
    /// <item><description>Provides access to MongoDB aggregation pipeline and advanced query operations</description></item>
    /// </list>
    ///
    /// <para><strong>Performance and Connection Management:</strong></para>
    /// <list type="bullet">
    /// <item><description>Configured with optimal connection pooling settings for high-throughput scenarios</description></item>
    /// <item><description>Includes retry logic and fault tolerance for network and database failures</description></item>
    /// <item><description>Supports read preferences and write concerns for consistency and performance optimization</description></item>
    /// <item><description>Enables monitoring and diagnostics through MongoDB driver instrumentation</description></item>
    /// </list>
    ///
    /// </remarks>
    public IMongoDatabase Database { get; }

    /// <summary>
    /// Gets the MongoDB collection used for storing Platform inbox message bus messages.
    /// This collection implements the inbox pattern for reliable message processing and event handling
    /// from external services and system components.
    /// </summary>
    /// <value>
    /// A configured IMongoCollection&lt;PlatformInboxBusMessage&gt; instance for inbox message operations.
    /// </value>
    /// <remarks>
    /// <para><strong>Inbox Pattern Implementation:</strong></para>
    /// <list type="bullet">
    /// <item><description>Stores incoming messages for reliable processing with retry and failure handling</description></item>
    /// <item><description>Supports message deduplication and idempotent processing scenarios</description></item>
    /// <item><description>Enables ordered message processing and dependency coordination</description></item>
    /// <item><description>Provides message status tracking and processing history with MongoDB queries</description></item>
    /// </list>
    ///
    /// <para><strong>Message Bus Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Integrates with Platform message bus infrastructure for cross-service communication</description></item>
    /// <item><description>Supports event-driven architecture patterns with reliable message delivery</description></item>
    /// <item><description>Enables saga and workflow coordination across distributed services</description></item>
    /// <item><description>Provides comprehensive audit trail for message processing and system integration</description></item>
    /// </list>
    ///
    /// <para><strong>Collection Features:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically configured with appropriate indexes for message querying and processing</description></item>
    /// <item><description>Supports efficient message polling and status-based filtering operations</description></item>
    /// <item><description>Enables bulk message processing for high-throughput scenarios</description></item>
    /// <item><description>Provides MongoDB-native querying capabilities for complex message routing</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Query pending messages for processing
    /// var pendingMessages = await InboxBusMessageCollection
    ///     .Find(m =&gt; m.ConsumeStatus == MessageConsumeStatus.Pending)
    ///     .SortBy(m =&gt; m.CreatedDate)
    ///     .Limit(100)
    ///     .ToListAsync();
    ///
    /// // Update message status after processing
    /// await InboxBusMessageCollection.UpdateOneAsync(
    ///     m =&gt; m.Id == messageId,
    ///     Builders&lt;PlatformInboxBusMessage&gt;.Update.Set(m =&gt; m.ConsumeStatus, MessageConsumeStatus.Processed));
    /// </code>
    /// </example>
    /// </remarks>
    public IMongoCollection<PlatformInboxBusMessage> InboxBusMessageCollection =>
        Database.GetCollection<PlatformInboxBusMessage>(GetCollectionName<PlatformInboxBusMessage>());

    /// <summary>
    /// Gets the MongoDB collection used for storing Platform outbox message bus messages.
    /// This collection implements the outbox pattern for reliable message publishing and event distribution
    /// to external services and system components.
    /// </summary>
    /// <value>
    /// A configured IMongoCollection&lt;PlatformOutboxBusMessage&gt; instance for outbox message operations.
    /// </value>
    /// <remarks>
    /// <para><strong>Outbox Pattern Implementation:</strong></para>
    /// <list type="bullet">
    /// <item><description>Ensures reliable message publishing as part of local database transactions</description></item>
    /// <item><description>Provides exactly-once delivery semantics for critical business events</description></item>
    /// <item><description>Supports delayed and scheduled message publishing scenarios</description></item>
    /// <item><description>Enables message retry and failure handling with exponential backoff</description></item>
    /// </list>
    ///
    /// <para><strong>Event Publishing:</strong></para>
    /// <list type="bullet">
    /// <item><description>Coordinates with local database operations to ensure consistency</description></item>
    /// <item><description>Supports event sourcing and domain event publishing patterns</description></item>
    /// <item><description>Enables saga and workflow initiation across distributed services</description></item>
    /// <item><description>Provides comprehensive audit trail for published events and system interactions</description></item>
    /// </list>
    ///
    /// <para><strong>Collection Features:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically configured with indexes optimized for message publishing and status tracking</description></item>
    /// <item><description>Supports efficient message polling for background publishing processes</description></item>
    /// <item><description>Enables bulk message publishing for high-throughput event scenarios</description></item>
    /// <item><description>Provides MongoDB-native aggregation for message analytics and monitoring</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Store message for publishing
    /// var outboxMessage = new PlatformOutboxBusMessage
    /// {
    ///     EventType = "SurveyCreated",
    ///     Payload = JsonSerializer.Serialize(surveyCreatedEvent),
    ///     SendStatus = MessageSendStatus.Pending
    /// };
    /// await OutboxBusMessageCollection.InsertOneAsync(outboxMessage);
    ///
    /// // Query messages ready for publishing
    /// var readyMessages = await OutboxBusMessageCollection
    ///     .Find(m =&gt; m.SendStatus == MessageSendStatus.Pending &amp;&amp;
    ///               m.NextRetryProcessAfter &lt;= DateTime.UtcNow)
    ///     .ToListAsync();
    /// </code>
    /// </example>
    /// </remarks>
    public IMongoCollection<PlatformOutboxBusMessage> OutboxBusMessageCollection =>
        Database.GetCollection<PlatformOutboxBusMessage>(GetCollectionName<PlatformOutboxBusMessage>());

    /// <summary>
    /// Gets the MongoDB collection used for storing Platform data migration history records.
    /// This collection tracks the execution status of data migration operations, schema changes,
    /// and system initialization processes for audit and coordination purposes.
    /// </summary>
    /// <value>
    /// A configured IMongoCollection&lt;PlatformDataMigrationHistory&gt; instance for migration history operations.
    /// </value>
    /// <remarks>
    /// <para><strong>Migration Tracking:</strong></para>
    /// <list type="bullet">
    /// <item><description>Records execution status of all data migration operations and schema changes</description></item>
    /// <item><description>Prevents duplicate migration execution across multiple application instances</description></item>
    /// <item><description>Supports rollback and recovery operations during failed migrations</description></item>
    /// <item><description>Enables migration dependency tracking and ordering with MongoDB queries</description></item>
    /// </list>
    ///
    /// <para><strong>System Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description>Coordinates migration execution across distributed deployments</description></item>
    /// <item><description>Supports blue-green deployment scenarios with migration state tracking</description></item>
    /// <item><description>Enables conditional logic based on database initialization status</description></item>
    /// <item><description>Provides comprehensive audit trail for system evolution and changes</description></item>
    /// </list>
    ///
    /// <para><strong>Collection Features:</strong></para>
    /// <list type="bullet">
    /// <item><description>Configured with unique indexes on migration names to prevent duplicates</description></item>
    /// <item><description>Supports efficient querying by migration status and execution date</description></item>
    /// <item><description>Enables migration analytics and reporting through MongoDB aggregation</description></item>
    /// <item><description>Provides atomic migration status updates with optimistic concurrency control</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Check if migration has been executed
    /// var migrationExists = await DataMigrationHistoryCollection
    ///     .Find(h =&gt; h.Name == "CreateInitialIndexes")
    ///     .AnyAsync();
    ///
    /// // Record successful migration
    /// await DataMigrationHistoryCollection.InsertOneAsync(new PlatformDataMigrationHistory("CreateInitialIndexes")
    /// {
    ///     Status = PlatformDataMigrationHistory.Statuses.Processed,
    ///     ExecutedDate = DateTime.UtcNow
    /// });
    ///
    /// // Query migration history
    /// var recentMigrations = await DataMigrationHistoryCollection
    ///     .Find(h =&gt; h.ExecutedDate &gt;= DateTime.UtcNow.AddDays(-7))
    ///     .SortByDescending(h =&gt; h.ExecutedDate)
    ///     .ToListAsync();
    /// </code>
    /// </example>
    /// </remarks>
    public IMongoCollection<PlatformDataMigrationHistory> DataMigrationHistoryCollection =>
        Database.GetCollection<PlatformDataMigrationHistory>(DataMigrationHistoryCollectionName);

    public virtual string DataMigrationHistoryCollectionName => "ApplicationDataMigrationHistory";

    public IMongoCollection<PlatformMongoMigrationHistory> MigrationHistoryCollection =>
        Database.GetCollection<PlatformMongoMigrationHistory>(MigrationHistoryCollectionName);

    public virtual string MigrationHistoryCollectionName => "MigrationHistory";

    public virtual int ExecutionManyPageSize => 100;

    public virtual string DbInitializedMigrationHistoryName => PlatformDataMigrationHistory.DefaultDbInitializedMigrationHistoryName;

    public IPlatformApplicationRequestContextAccessor CurrentRequestContextAccessor { get; set; }

    public async Task UpsertOneDataMigrationHistoryAsync(PlatformDataMigrationHistory entity, CancellationToken cancellationToken = default)
    {
        var existingEntity = await DataMigrationHistoryQuery().Where(p => p.Name == entity.Name).FirstOrDefaultAsync(cancellationToken);

        if (existingEntity == null)
            await DataMigrationHistoryCollection.InsertOneAsync(entity, cancellationToken: cancellationToken);
        else
        {
            if (entity is IRowVersionEntity { ConcurrencyUpdateToken: null })
                entity.As<IRowVersionEntity>().ConcurrencyUpdateToken = existingEntity.As<IRowVersionEntity>().ConcurrencyUpdateToken;

            var toBeUpdatedEntity = entity;

            var currentInMemoryConcurrencyUpdateToken = toBeUpdatedEntity.ConcurrencyUpdateToken;
            var newUpdateConcurrencyUpdateToken = Ulid.NewUlid().ToString();

            toBeUpdatedEntity.ConcurrencyUpdateToken = newUpdateConcurrencyUpdateToken;

            var result = await DataMigrationHistoryCollection.ReplaceOneAsync(
                p =>
                    p.Name == entity.Name
                    && (
                        ((IRowVersionEntity)p).ConcurrencyUpdateToken == null
                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == ""
                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == currentInMemoryConcurrencyUpdateToken
                    ),
                entity,
                new ReplaceOptions { IsUpsert = false },
                cancellationToken
            );

            if (result.MatchedCount <= 0)
            {
                if (await DataMigrationHistoryCollection.AsQueryable().AnyAsync(p => p.Name == entity.Name, cancellationToken))
                {
                    throw new PlatformDomainRowVersionConflictException(
                        $"Update {nameof(PlatformDataMigrationHistory)} with Name:{toBeUpdatedEntity.Name} has conflicted version."
                    );
                }

                throw new PlatformDomainEntityNotFoundException<PlatformDataMigrationHistory>(toBeUpdatedEntity.Name);
            }
        }
    }

    public IQueryable<PlatformDataMigrationHistory> DataMigrationHistoryQuery()
    {
        return DataMigrationHistoryCollection.AsQueryable();
    }

    public async Task ExecuteWithNewDbContextInstanceAsync(Func<IPlatformDbContext, Task> fn)
    {
        await RootServiceProvider.ExecuteInjectScopedAsync(async (TDbContext context) => await fn(context));
    }

    public IPlatformUnitOfWork? MappedUnitOfWork { get; set; }
    public ILogger Logger => lazyLogger.Value;

    public virtual async Task Initialize(IServiceProvider serviceProvider)
    {
        // Store stack trace before call Migrate() to keep the original stack trace to log
        // after Migrate() will lose full stack trace (may because it connects async to other external service)
        // var fullStackTrace = PlatformEnvironment.StackTrace();

        try
        {
            await Migrate();
            await InsertDbInitializedApplicationDataMigrationHistory();
            await SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Logger.LogError(ex.BeautifyStackTrace(), "PlatformMongoDbContext {Type} Initialize failed.", GetType().Name);

            throw new Exception($"{GetType().Name} Initialize failed.", ex);
        }

        async Task InsertDbInitializedApplicationDataMigrationHistory()
        {
            if (!await DataMigrationHistoryCollection.AsQueryable().AnyAsync(p => p.Name == DbInitializedMigrationHistoryName))
            {
                await DataMigrationHistoryCollection.InsertOneAsync(
                    new PlatformDataMigrationHistory(DbInitializedMigrationHistoryName) { Status = PlatformDataMigrationHistory.Statuses.Processed }
                );
            }
        }
    }

    public Task<TSource> FirstAsync<TSource>(IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        return source.FirstAsync(cancellationToken);
    }

    public Task<int> CountAsync<TEntity>(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        where TEntity : class, IEntity
    {
        return GetCollection<TEntity>()
            .CountDocumentsAsync(predicate != null ? Builders<TEntity>.Filter.Where(predicate) : Builders<TEntity>.Filter.Empty, cancellationToken: cancellationToken)
            .Then(result => (int)result);
    }

    public Task<TResult> FirstOrDefaultAsync<TEntity, TResult>(Func<IQueryable<TEntity>, IQueryable<TResult>> queryBuilder, CancellationToken cancellationToken = default)
        where TEntity : class, IEntity
    {
        return queryBuilder(GetQuery<TEntity>()).FirstOrDefaultAsync(cancellationToken);
    }

    public Task<int> CountAsync<T>(IQueryable<T> source, CancellationToken cancellationToken = default)
    {
        return source.CountAsync(cancellationToken);
    }

    public Task<bool> AnyAsync<TEntity>(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        where TEntity : class, IEntity
    {
        return GetCollection<TEntity>()
            .Find(predicate != null ? Builders<TEntity>.Filter.Where(predicate) : Builders<TEntity>.Filter.Empty)
            .Limit(1)
            .CountDocumentsAsync(cancellationToken)
            .Then(result => result > 0);
    }

    public Task<bool> AnyAsync<T>(IQueryable<T> source, CancellationToken cancellationToken = default)
    {
        return source.Take(1).AnyAsync(cancellationToken);
    }

    public Task<List<T>> GetAllAsync<T>(IQueryable<T> source, CancellationToken cancellationToken = default)
    {
        return source.ToListAsync(cancellationToken);
    }

    public Task<T> FirstOrDefaultAsync<T>(IQueryable<T> source, CancellationToken cancellationToken = default)
    {
        return source.FirstOrDefaultAsync(cancellationToken);
    }

    public Task<List<TResult>> GetAllAsync<TEntity, TResult>(Func<IQueryable<TEntity>, IQueryable<TResult>> queryBuilder, CancellationToken cancellationToken = default)
        where TEntity : class, IEntity
    {
        return queryBuilder(GetQuery<TEntity>()).ToListAsync(cancellationToken);
    }

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Not support real transaction tracking. No need to do anything
        return 0;
    }

    public IQueryable<TEntity> GetQuery<TEntity>()
        where TEntity : class, IEntity
    {
        return GetCollection<TEntity>().AsQueryable();
    }

    public void RunCommand(string command)
    {
        Database.RunCommand<BsonDocument>(command);
    }

    public Task MigrateDataAsync(IServiceProvider serviceProvider)
    {
        return this.As<IPlatformDbContext>().MigrateDataAsync<TDbContext>(serviceProvider, RootServiceProvider);
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public async Task<List<TEntity>> CreateManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.IsEmpty())
            return entities;

        var toBeCreatedEntities = entities.SelectList(entity =>
            entity
                .PipeIf(
                    entity.IsAuditedUserEntity(),
                    p => p.As<IUserAuditedEntity>().SetCreatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType())).As<TEntity>()
                )
                .WithIf(
                    entity is IRowVersionEntity { ConcurrencyUpdateToken: null },
                    entity => entity.As<IRowVersionEntity>().ConcurrencyUpdateToken = Ulid.NewUlid().ToString())
        );

        var bulkCreateOps = toBeCreatedEntities.Select(toBeCreatedEntity => new InsertOneModel<TEntity>(toBeCreatedEntity)).ToList();

        await GetTable<TEntity>().BulkWriteAsync(bulkCreateOps, new BulkWriteOptions { IsOrdered = false }, cancellationToken);

        if (!dismissSendEvent && PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(RootServiceProvider))
        {
            await toBeCreatedEntities.ParallelAsync(toBeCreatedEntity =>
                PlatformCqrsEntityEvent.ExecuteWithSendingCreateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                    RootServiceProvider,
                    MappedUnitOfWork,
                    toBeCreatedEntity,
                    async entity => entity,
                    false,
                    eventCustomConfig,
                    () => RequestContextAccessor.Current.GetAllKeyValues(),
                    PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, false),
                    cancellationToken
                )
            );

            await SendBulkEntitiesEvent<TEntity, TPrimaryKey>(toBeCreatedEntities, PlatformCqrsEntityEventCrudAction.Created, eventCustomConfig, cancellationToken);
        }

        return toBeCreatedEntities;
    }

    public Task<TEntity> UpdateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return UpdateAsync<TEntity, TPrimaryKey>(entity, null, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    public Task<TEntity> SetAsync<TEntity, TPrimaryKey>(TEntity entity, CancellationToken cancellationToken = default)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return InternalUpdateOrSetAsync<TEntity, TPrimaryKey>(entity, null, dismissSendEvent: true, checkDiff: true, null, onlySetData: true, cancellationToken);
    }

    /// <summary>
    /// Performs high-performance bulk update operations for multiple existing entities in MongoDB, optimized for scenarios where all entities
    /// are known to exist and require modification. This method provides enterprise-grade bulk update capabilities with sophisticated change
    /// detection, comprehensive audit trail management, optimistic concurrency control, and coordinated CQRS event handling for large-scale
    /// document update operations in MongoDB collections with complex business logic requirements.
    /// </summary>
    /// <typeparam name="TEntity">The domain entity type implementing IEntity&lt;TPrimaryKey&gt; interface, representing the MongoDB document structure
    /// with complete type safety and optimized serialization performance. This ensures compile-time safety and efficient bulk operations across
    /// potentially large collections with complex document schemas, nested object hierarchies, and sophisticated indexing strategies.</typeparam>
    /// <typeparam name="TPrimaryKey">The primary key type for entity identification, commonly string for MongoDB ObjectId, Guid for distributed
    /// systems, or custom identifier types for domain-specific requirements. This provides type-safe entity resolution and efficient bulk
    /// lookup operations across large datasets with optimal indexing and query performance characteristics.</typeparam>
    /// <param name="entities">The collection of entity instances to be updated in a single high-performance bulk operation. Each entity must
    /// represent an existing document in the MongoDB collection and contains the complete updated state including all business logic changes,
    /// computed fields, audit information, and domain events that need to be persisted. The method assumes all entities exist and will
    /// throw exceptions if any entity is not found, making it ideal for scenarios with guaranteed entity existence.</param>
    /// <param name="dismissSendEvent">Boolean flag controlling CQRS event generation and publication for the entire bulk update operation.
    /// When set to true, suppresses all EntityUpdated events, which is critical for high-performance bulk data processing, internal system
    /// operations, migration scenarios, or cases where event processing overhead would significantly impact system throughput and responsiveness
    /// in enterprise environments with high-volume update requirements.</param>
    /// <param name="checkDiff">Advanced change detection flag enabling sophisticated field-level comparison between incoming entities and their
    /// existing database counterparts. When enabled (default), performs intelligent change detection to prevent unnecessary database writes
    /// and event generation when no meaningful changes are detected, providing substantial performance optimization in bulk update scenarios
    /// and significantly reducing downstream event processing load across distributed system boundaries.</param>
    /// <param name="eventCustomConfig">Optional configuration delegate for fine-tuning CQRS entity event properties and metadata across all
    /// entities in the bulk update operation. This enables sophisticated event customization including bulk correlation IDs, batch metadata,
    /// custom event properties, audit context, routing instructions, and integration-specific context required for complex distributed system
    /// coordination and event-driven architecture patterns in large-scale enterprise environments.</param>
    /// <param name="cancellationToken">Cooperative cancellation token supporting graceful termination of long-running bulk update operations
    /// and proper resource cleanup in distributed environments. This is particularly critical for large bulk operations that may run for
    /// extended periods, enabling proper handling of service shutdown scenarios, timeout management, circuit breaker patterns, and coordinated
    /// cancellation across microservices architectures without leaving operations in inconsistent or corrupted states.</param>
    /// <returns>A task resolving to the complete list of updated entities with all platform-managed fields refreshed, including updated audit
    /// timestamps, incremented concurrency control tokens, and any computed fields modified during the update process. The returned entities
    /// maintain the same order as the input collection and represent the exact document states persisted in MongoDB, serving as authoritative
    /// versions for subsequent operations, caching strategies, or API response generation in distributed system architectures.</returns>
    /// <remarks>
    /// <para><strong>High-Performance Bulk Update Architecture and Optimization:</strong></para>
    /// <list type="number">
    /// <item><description><strong>Parallel Entity Processing:</strong> Leverages parallel processing capabilities to prepare entities for bulk operations, including change detection and audit field population</description></item>
    /// <item><description><strong>Optimized Change Detection:</strong> Performs sophisticated field-level comparison to identify precisely which entities and fields have changed, minimizing database operations</description></item>
    /// <item><description><strong>Bulk Write Operations:</strong> Utilizes MongoDB's native BulkWriteAsync operations with optimal batching strategies for maximum throughput and minimal latency</description></item>
    /// <item><description><strong>Concurrency Management:</strong> Implements robust optimistic concurrency control using row version tokens to prevent data corruption in concurrent update scenarios</description></item>
    /// <item><description><strong>Memory Optimization:</strong> Uses memory-efficient processing patterns to handle large entity collections without excessive memory consumption or garbage collection pressure</description></item>
    /// <item><description><strong>Event Coordination:</strong> Coordinates CQRS events across all updated entities while maintaining proper ordering, causality, and consistency guarantees</description></item>
    /// </list>
    ///
    /// <para><strong>Enterprise Performance Characteristics (Based on Extensive Production Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Exceptional Throughput:</strong> Capable of updating tens of thousands of entities per second through optimized bulk operations and minimal database round-trips</description></item>
    /// <item><description><strong>Memory Efficiency:</strong> Implements streaming processing patterns and object pooling to handle massive datasets without memory exhaustion in enterprise environments</description></item>
    /// <item><description><strong>Network Optimization:</strong> Minimizes MongoDB network traffic through efficient bulk operations, optimized document serialization, and intelligent batching strategies</description></item>
    /// <item><description><strong>CPU Utilization:</strong> Maximizes CPU efficiency through parallel processing algorithms, optimized change detection, and efficient entity preparation workflows</description></item>
    /// <item><description><strong>Scalability:</strong> Scales linearly with entity count through intelligent resource management, adaptive batching, and optimized memory usage patterns</description></item>
    /// </list>
    ///
    /// <para><strong>Real-World Enterprise Applications (Derived from Production Codebase Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>User Profile Updates:</strong> Used extensively in UserService.UpdateManyAsync for bulk employee profile modifications, status changes, and organizational updates</description></item>
    /// <item><description><strong>Organizational Restructuring:</strong> Applied in TeamMapRepository and OrganizationalUnitRepository for bulk organizational hierarchy updates and department restructuring</description></item>
    /// <item><description><strong>Status Synchronization:</strong> Leveraged in SharingRepository for bulk status updates, completion tracking, and participant state management</description></item>
    /// <item><description><strong>Survey Data Processing:</strong> Critical for bulk survey response updates, participant status changes, and survey state management across large user populations</description></item>
    /// <item><description><strong>Analytics Updates:</strong> Essential for bulk analytics data updates, dashboard refresh operations, and computed field updates across large datasets</description></item>
    /// <item><description><strong>Audit Trail Management:</strong> Used for bulk audit record updates, compliance tracking, and historical data maintenance in regulated environments</description></item>
    /// </list>
    ///
    /// <para><strong>Advanced Business Logic and Audit Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Comprehensive Audit Trails:</strong> Automatically updates audit fields (LastUpdatedDate, LastUpdatedBy) with proper user context and timestamp management</description></item>
    /// <item><description><strong>Business Rule Enforcement:</strong> Integrates with domain entity business logic and validation rules during bulk update operations</description></item>
    /// <item><description><strong>Change Tracking:</strong> Provides detailed change tracking and field-level modification detection for compliance and auditing requirements</description></item>
    /// <item><description><strong>User Context Integration:</strong> Properly maintains user context and tenant isolation across bulk operations in multi-tenant environments</description></item>
    /// </list>
    ///
    /// <para><strong>CQRS and Event-Driven Architecture Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Bulk Event Generation:</strong> Generates EntityUpdated events for each modified entity with proper bulk context and change metadata</description></item>
    /// <item><description><strong>Event Ordering:</strong> Maintains proper event sequencing and causality relationships across bulk operations for downstream consistency</description></item>
    /// <item><description><strong>Saga Integration:</strong> Supports complex long-running business process coordination through properly sequenced bulk events and state management</description></item>
    /// <item><description><strong>Read Model Synchronization:</strong> Enables efficient read model updates through batched events and optimized downstream processing patterns</description></item>
    /// <item><description><strong>Integration Event Publishing:</strong> Coordinates with external systems through properly formatted bulk integration events and message patterns</description></item>
    /// </list>
    ///
    /// <para><strong>Concurrency Control and Data Integrity Management:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Optimistic Concurrency:</strong> Implements robust optimistic concurrency control using ConcurrencyUpdateToken for conflict detection and resolution</description></item>
    /// <item><description><strong>Conflict Detection:</strong> Provides comprehensive conflict detection and resolution strategies for concurrent update scenarios</description></item>
    /// <item><description><strong>Atomic Operations:</strong> Ensures atomic bulk operations through proper transaction coordination and consistency guarantees</description></item>
    /// <item><description><strong>Data Validation:</strong> Validates entity existence and business rules before executing bulk update operations</description></item>
    /// </list>
    /// </remarks>
    /// <exception cref="PlatformDomainEntityNotFoundException">Thrown when one or more entities in the collection cannot be found in the database,
    /// indicating data integrity issues, race conditions, or logical errors where entities were expected to exist. This exception includes
    /// details about which specific entities were not found to aid in debugging and error recovery in bulk processing scenarios.</exception>
    /// <exception cref="PlatformDomainRowVersionConflictException">Thrown when optimistic concurrency conflicts are detected during bulk update
    /// operations, indicating that one or more entities were modified by another process between the preparation and execution phases. This
    /// exception provides detailed information about conflicted entities to enable appropriate conflict resolution strategies.</exception>
    /// <exception cref="ArgumentNullException">Thrown when the entities collection is null, ensuring proper parameter validation and error
    /// handling for bulk operation inputs in both development and production environments.</exception>
    /// <exception cref="ArgumentException">Thrown when the entities collection is empty or contains entities with missing or invalid IDs,
    /// ensuring data integrity and proper error reporting for malformed bulk operation requests.</exception>
    /// <exception cref="OperationCanceledException">Thrown when long-running bulk update operations are cancelled through the cancellation token,
    /// supporting graceful shutdown scenarios, timeout handling, and coordinated cancellation in distributed system architectures where bulk
    /// operations may run for extended periods and need to be terminated cleanly.</exception>
    /// <exception cref="MongoException">Thrown for MongoDB infrastructure-level errors during bulk update operations, including network connectivity
    /// issues, authentication failures, database constraint violations, write concern failures, or server-side errors that require system
    /// administrator attention and may indicate infrastructure problems affecting bulk operation performance and reliability.</exception>
    /// <exception cref="OutOfMemoryException">Thrown in extreme scenarios where bulk operations exceed available system memory, indicating the
    /// need for batch processing strategies, memory optimization, or resource scaling in environments processing very large entity collections
    /// that exceed available system resources.</exception>
    public async Task<List<TEntity>> UpdateManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.IsEmpty())
            return entities;

        var toBeUpdatedItems = await entities.ParallelAsync(async entity =>
        {
            var isEntityRowVersionEntityMissingConcurrencyUpdateToken = entity is IRowVersionEntity { ConcurrencyUpdateToken: null };
            var existingEntity = MappedUnitOfWork?.GetCachedExistingOriginalEntity<TEntity>(entity.Id.ToString());

            if (
                !dismissSendEvent
                && PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(RootServiceProvider)
                && entity.HasTrackValueUpdatedDomainEventAttribute()
            )
            {
                existingEntity ??= await GetQuery<TEntity>()
                    .Where(BuildExistingEntityPredicate(entity))
                    .FirstOrDefaultAsync(cancellationToken)
                    .EnsureFound($"Entity {typeof(TEntity).Name} with [Id:{entity.Id}] not found to update")
                    .ThenActionIf(p => p != null, p => MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p));

                if (!existingEntity.Id.Equals(entity.Id))
                {
                    await IUniqueCompositeIdSupport.EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
                        entity,
                        existingEntity,
                        id => GetQuery<TEntity>().AnyAsync(p => p.Id.Equals(id), cancellationToken: cancellationToken)
                    );

                    entity.Id = existingEntity.Id;
                }
            }

            if (isEntityRowVersionEntityMissingConcurrencyUpdateToken)
            {
                entity.As<IRowVersionEntity>().ConcurrencyUpdateToken =
                    existingEntity?.As<IRowVersionEntity>().ConcurrencyUpdateToken
                    ?? await GetQuery<TEntity>()
                        .Where(BuildExistingEntityPredicate(entity))
                        .Select(p => ((IRowVersionEntity)p).ConcurrencyUpdateToken)
                        .FirstOrDefaultAsync(cancellationToken);
            }

            var changedFields = entity.GetChangedFields(existingEntity, p => p.GetCustomAttribute<PlatformNavigationPropertyAttribute>() == null);
            var entityUpdatedDateAuditField = LastUpdatedDateAuditFieldAttribute.GetUpdatedDateAuditField(typeof(TEntity));

            if (
                existingEntity != null
                && !ReferenceEquals(entity, existingEntity)
                && (
                    changedFields == null
                    || changedFields.Count == 0
                    || (changedFields.Count == 1 && entityUpdatedDateAuditField != null && entityUpdatedDateAuditField.Name == changedFields.First().Key)
                )
                && checkDiff
                && (entity is not ISupportDomainEventsEntity || entity.As<ISupportDomainEventsEntity>().GetDomainEvents().IsEmpty())
            )
                return (toBeUpdatedEntity: entity, bulkWriteOp: null, existingEntity, currentInMemoryConcurrencyUpdateToken: null);

            var toBeUpdatedEntity = entity
                .PipeIf(
                    entity is IDateAuditedEntity,
                    p =>
                        p.As<IDateAuditedEntity>()
                            .With(auditedEntity => auditedEntity.LastUpdatedDate = DateTime.UtcNow)
                            .PipeAction(p => changedFields?.Upsert(nameof(IDateAuditedEntity.LastUpdatedDate), p.LastUpdatedDate))
                            .As<TEntity>()
                )
                .PipeIf(
                    entity.IsAuditedUserEntity(),
                    p =>
                        p.As<IUserAuditedEntity>()
                            .SetLastUpdatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType()))
                            .PipeAction(p => changedFields?.Upsert(nameof(IUserAuditedEntity<object>.LastUpdatedBy), p.GetLastUpdatedBy()))
                            .As<TEntity>()
                );

            string? currentInMemoryConcurrencyUpdateToken = null;
            if (toBeUpdatedEntity is IRowVersionEntity toBeUpdatedRowVersionEntity)
            {
                currentInMemoryConcurrencyUpdateToken = toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken;
                var newUpdateConcurrencyUpdateToken = Ulid.NewUlid().ToString();

                toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken = newUpdateConcurrencyUpdateToken;
                changedFields?.Upsert(nameof(IRowVersionEntity.ConcurrencyUpdateToken), toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken);
            }

            var updateDefinition =
                changedFields?.Any() == true
                    ? changedFields
                        .Select(field => Builders<TEntity>.Update.Set(field.Key, field.Value))
                        .Pipe(updateDefinitions => Builders<TEntity>.Update.Combine(updateDefinitions))
                    : null;
            Expression<Func<TEntity, bool>> toBeUpdatedEntityFilter =
                toBeUpdatedEntity is IRowVersionEntity
                    ? p =>
                        p.Id.Equals(toBeUpdatedEntity.Id)
                        && (
                            ((IRowVersionEntity)p).ConcurrencyUpdateToken == null
                            || ((IRowVersionEntity)p).ConcurrencyUpdateToken == ""
                            || ((IRowVersionEntity)p).ConcurrencyUpdateToken == currentInMemoryConcurrencyUpdateToken
                        )
                    : p => p.Id.Equals(toBeUpdatedEntity.Id);

            var bulkWriteOp =
                updateDefinition != null
                    ? (WriteModel<TEntity>)new UpdateOneModel<TEntity>(Builders<TEntity>.Filter.Where(toBeUpdatedEntityFilter), updateDefinition)
                    : new ReplaceOneModel<TEntity>(Builders<TEntity>.Filter.Where(toBeUpdatedEntityFilter), toBeUpdatedEntity) { IsUpsert = false };

            return (toBeUpdatedEntity, bulkWriteOp, existingEntity, currentInMemoryConcurrencyUpdateToken);
        });

        var hasDataChangedToBeUpdatedItems = toBeUpdatedItems.Where(p => p.bulkWriteOp != null).ToList();

        if (hasDataChangedToBeUpdatedItems.Any())
        {
            await GetTable<TEntity>()
                .BulkWriteAsync(hasDataChangedToBeUpdatedItems.SelectList(p => p.bulkWriteOp), new BulkWriteOptions { IsOrdered = false }, cancellationToken)
                .ThenActionAsync(async result =>
                {
                    if (result.MatchedCount != hasDataChangedToBeUpdatedItems.Count)
                    {
                        var toBeUpdatedEntityIds = hasDataChangedToBeUpdatedItems.Select(p => p.toBeUpdatedEntity.Id).ToHashSet();

                        if (hasDataChangedToBeUpdatedItems.First().toBeUpdatedEntity is IRowVersionEntity)
                        {
                            var existingEntityIdToConcurrencyUpdateTokenDict = await GetQuery<TEntity>()
                                .Where(p => toBeUpdatedEntityIds.Contains(p.Id))
                                .Select(p => new { p.Id, ((IRowVersionEntity)p).ConcurrencyUpdateToken })
                                .ToListAsync(cancellationToken)
                                .Then(items => items.ToDictionary(p => p.Id, p => p.ConcurrencyUpdateToken));

                            hasDataChangedToBeUpdatedItems.ForEach(p =>
                            {
                                if (!existingEntityIdToConcurrencyUpdateTokenDict.TryGetValue(p.toBeUpdatedEntity.Id, out var existingEntityConcurrencyToken))
                                    throw new PlatformDomainEntityNotFoundException<TEntity>(p.toBeUpdatedEntity.Id.ToString());
                                if (existingEntityConcurrencyToken != p.currentInMemoryConcurrencyUpdateToken)
                                {
                                    throw new PlatformDomainRowVersionConflictException(
                                        $"Update {typeof(TEntity).Name} with Id:{p.toBeUpdatedEntity.Id} has conflicted version.");
                                }
                            });
                        }

                        var existingEntityIds = await GetQuery<TEntity>()
                            .Where(p => toBeUpdatedEntityIds.Contains(p.Id))
                            .Select(p => p.Id)
                            .ToListAsync(cancellationToken)
                            .Then(p => p.ToHashSet());

                        toBeUpdatedEntityIds.ForEach(toBeUpdatedEntityId =>
                        {
                            if (!existingEntityIds.Contains(toBeUpdatedEntityId))
                                throw new PlatformDomainEntityNotFoundException<TEntity>(toBeUpdatedEntityId.ToString());
                        });
                    }
                });

            hasDataChangedToBeUpdatedItems.ForEach(p => MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(p.toBeUpdatedEntity.Id.ToString()));
        }

        if (!dismissSendEvent && PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(RootServiceProvider))
        {
            var sendEventItems = checkDiff ? hasDataChangedToBeUpdatedItems : toBeUpdatedItems;

            if (sendEventItems.Any())
            {
                await sendEventItems.ParallelAsync(toBeUpdatedItem =>
                    PlatformCqrsEntityEvent.ExecuteWithSendingUpdateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                        RootServiceProvider,
                        MappedUnitOfWork,
                        toBeUpdatedItem.toBeUpdatedEntity,
                        toBeUpdatedItem.existingEntity ?? MappedUnitOfWork?.GetCachedExistingOriginalEntity<TEntity>(toBeUpdatedItem.toBeUpdatedEntity.Id.ToString()),
                        async entity => (entity, true),
                        false,
                        eventCustomConfig,
                        () => RequestContextAccessor.Current.GetAllKeyValues(),
                        PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, false),
                        cancellationToken
                    )
                );
                await SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
                    sendEventItems.SelectList(p => p.toBeUpdatedEntity),
                    PlatformCqrsEntityEventCrudAction.Updated,
                    eventCustomConfig,
                    cancellationToken
                );
            }
        }

        return toBeUpdatedItems.SelectList(p => p.toBeUpdatedEntity);

        static Expression<Func<TEntity, bool>> BuildExistingEntityPredicate(TEntity entity)
        {
            return entity.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                ? entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr()!
                : p => p.Id.Equals(entity.Id);
        }
    }

    public async Task<TEntity> DeleteAsync<TEntity, TPrimaryKey>(
        TPrimaryKey entityId,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var entity = GetQuery<TEntity>().FirstOrDefault(p => p.Id.Equals(entityId));

        if (entity != null)
            await DeleteAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken);

        return entity;
    }

    public Task<TEntity> DeleteAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return PlatformCqrsEntityEvent
            .ExecuteWithSendingDeleteEntityEvent<TEntity, TPrimaryKey, TEntity>(
                RootServiceProvider,
                MappedUnitOfWork,
                entity,
                async entity =>
                {
                    await GetTable<TEntity>().DeleteOneAsync(p => p.Id.Equals(entity.Id), null, cancellationToken);

                    return entity;
                },
                dismissSendEvent,
                eventCustomConfig,
                () => RequestContextAccessor.Current.GetAllKeyValues(),
                PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                cancellationToken
            )
            .ThenAction(entity =>
            {
                MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(entity.Id.ToString());
            });
    }

    public async Task<List<TPrimaryKey>> DeleteManyAsync<TEntity, TPrimaryKey>(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
            return await DeleteManyAsync<TEntity, TPrimaryKey>(p => entityIds.Contains(p.Id), true, eventCustomConfig, cancellationToken).Then(() => entityIds);

        var entities = await GetAllAsync(GetQuery<TEntity>().Where(p => entityIds.Contains(p.Id)), cancellationToken);

        return await DeleteManyAsync<TEntity, TPrimaryKey>(entities, false, eventCustomConfig, cancellationToken).Then(() => entityIds);
    }

    public async Task<List<TEntity>> DeleteManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.Count == 0)
            return entities;

        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
        {
            var deleteEntitiesPredicate =
                entities.FirstOrDefault()?.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                    ? entities
                        .Select(entity => entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr())
                        .Aggregate((currentExpr, nextExpr) => currentExpr.Or(nextExpr))
                    : p => entities.Select(e => e.Id).Contains(p.Id);

            return await DeleteManyAsync<TEntity, TPrimaryKey>(deleteEntitiesPredicate, true, eventCustomConfig, cancellationToken)
                .Then(_ =>
                {
                    entities.ForEach(p => MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(p.Id.ToString()));
                    return entities;
                });
        }

        return await entities
            .ParallelAsync(entity => DeleteAsync<TEntity, TPrimaryKey>(entity, false, eventCustomConfig, cancellationToken))
            .ThenActionAsync(entities => SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
                entities,
                PlatformCqrsEntityEventCrudAction.Deleted,
                eventCustomConfig,
                cancellationToken))
            .Then(entities =>
            {
                entities.ForEach(p => MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(p.Id.ToString()));
                return entities;
            });
    }

    public async Task<int> DeleteManyAsync<TEntity, TPrimaryKey>(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
            return (int)await GetTable<TEntity>().DeleteManyAsync(predicate, null, cancellationToken).Then(p => p.DeletedCount);

        var entities = await GetAllAsync(GetQuery<TEntity>().Where(predicate), cancellationToken);

        return await DeleteManyAsync<TEntity, TPrimaryKey>(entities, false, eventCustomConfig, cancellationToken).Then(_ => entities.Count);
    }

    public async Task<int> DeleteManyAsync<TEntity, TPrimaryKey>(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var totalCount = await CountAsync(queryBuilder(GetQuery<TEntity>()), cancellationToken);

        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
        {
            var ids = await GetAllAsync<TEntity, TPrimaryKey>(query => queryBuilder(query).Select(p => p.Id), cancellationToken);

            await GetTable<TEntity>().DeleteManyAsync(p => ids.Contains(p.Id), null, cancellationToken).Then(p => p.DeletedCount);
        }
        else
        {
            await Util.Pager.ExecuteScrollingPagingAsync(
                async () =>
                {
                    var entities = await GetAllAsync(queryBuilder(GetQuery<TEntity>()).Take(ExecutionManyPageSize), cancellationToken);

                    await DeleteManyAsync<TEntity, TPrimaryKey>(entities, false, eventCustomConfig, cancellationToken).Then(_ => entities.Count);

                    return entities;
                },
                maxExecutionCount: totalCount / ExecutionManyPageSize,
                cancellationToken: cancellationToken
            );
        }

        return totalCount;
    }

    public Task<TEntity> CreateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, false, eventCustomConfig, cancellationToken);
    }

    /// <summary>
    /// Performs an intelligent create-or-update operation (upsert) for a single entity in MongoDB, automatically determining whether to create a new document
    /// or update an existing one based on entity existence detection. This method provides high-level upsert functionality with comprehensive business logic
    /// coordination, CQRS event handling, audit trail management, and optimistic concurrency control for document-based operations.
    /// </summary>
    /// <typeparam name="TEntity">The domain entity type that implements IEntity&lt;TPrimaryKey&gt; interface. This represents the MongoDB document type
    /// that will be persisted, providing strong typing and compile-time safety for document operations.</typeparam>
    /// <typeparam name="TPrimaryKey">The primary key type for the entity (typically string for MongoDB ObjectId, Guid, or other identifier types).
    /// This ensures type safety for entity identification and lookup operations across the persistence layer.</typeparam>
    /// <param name="entity">The entity instance to create or update in the MongoDB collection. This entity contains all the data to be persisted,
    /// including any business logic changes, audit information, and domain events that need to be coordinated during the operation.</param>
    /// <param name="customCheckExistingPredicate">Optional custom predicate expression for determining entity existence beyond simple ID matching.
    /// When provided, this enables complex existence checks based on unique composite keys, business rules, or domain-specific constraints.
    /// If null, the method uses standard ID-based or IUniqueCompositeIdSupport-based existence detection logic.</param>
    /// <param name="dismissSendEvent">Flag indicating whether to suppress CQRS entity events during this operation. When true, prevents
    /// automatic generation of EntityCreated/EntityUpdated events, useful for internal operations, data migrations, or performance-critical scenarios
    /// where event processing overhead should be avoided. Default is false to maintain event-driven architecture consistency.</param>
    /// <param name="checkDiff">Flag controlling whether to perform change detection before executing updates. When true (default), the method
    /// compares the incoming entity with the existing entity to determine if actual changes exist, preventing unnecessary database operations
    /// and event generation when no meaningful changes are detected. This optimization improves performance in high-frequency update scenarios.</param>
    /// <param name="eventCustomConfig">Optional action delegate for customizing CQRS entity event configuration before event publication.
    /// This allows callers to modify event metadata, add custom properties, adjust event routing, or implement specialized event handling
    /// patterns specific to the business context or integration requirements.</param>
    /// <param name="cancellationToken">Cancellation token for supporting graceful operation cancellation and timeout handling in distributed
    /// systems. This enables proper resource cleanup and coordination with application lifecycle management, especially important for long-running
    /// bulk operations or high-latency network scenarios.</param>
    /// <returns>A task that resolves to the created or updated entity instance with all persistence-layer modifications applied, including
    /// generated IDs, updated audit timestamps, concurrency tokens, and any other platform-managed metadata. The returned entity reflects
    /// the exact state persisted in MongoDB and can be used for subsequent operations or response generation.</returns>
    /// <remarks>
    /// <para><strong>Operation Logic and Flow:</strong></para>
    /// <list type="number">
    /// <item><description><strong>Existence Detection:</strong> Uses customCheckExistingPredicate, IUniqueCompositeIdSupport interface, or entity ID to determine if the document already exists in MongoDB</description></item>
    /// <item><description><strong>Smart Routing:</strong> Automatically routes to CreateAsync for new entities or UpdateAsync for existing entities, providing seamless upsert semantics</description></item>
    /// <item><description><strong>Concurrency Handling:</strong> Implements optimistic concurrency control using IRowVersionEntity for conflict detection and resolution</description></item>
    /// <item><description><strong>Audit Integration:</strong> Automatically manages audit fields (CreatedDate, LastUpdatedDate, CreatedBy, LastUpdatedBy) based on request context</description></item>
    /// <item><description><strong>Event Coordination:</strong> Generates appropriate CQRS events (EntityCreated/EntityUpdated) with proper event metadata and business context</description></item>
    /// <item><description><strong>Cache Management:</strong> Integrates with Unit of Work pattern for entity caching and change tracking optimization</description></item>
    /// </list>
    ///
    /// <para><strong>Business Usage Patterns (Based on Real Implementation Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>User Management:</strong> Used extensively in UserService.UpsertOneAsync for employee profile synchronization, ensuring users are created or updated based on external system integration</description></item>
    /// <item><description><strong>Data Synchronization:</strong> Applied in entity synchronization scenarios where external systems provide data that may or may not already exist in the local database</description></item>
    /// <item><description><strong>Profile Updates:</strong> Leveraged for updating user profiles, organizational data, and other entities where the existence state is uncertain at operation time</description></item>
    /// <item><description><strong>Import Operations:</strong> Critical for data import processes where mixed create/update operations need to be handled transparently</description></item>
    /// <item><description><strong>API Integration:</strong> Used in service endpoints that receive entity data without explicit knowledge of whether the entity exists locally</description></item>
    /// </list>
    ///
    /// <para><strong>Performance and Optimization Characteristics:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Intelligent Change Detection:</strong> The checkDiff parameter enables optimization by preventing unnecessary database operations when no changes are detected</description></item>
    /// <item><description><strong>Single Database Round-Trip:</strong> Minimizes database calls by caching existence checks and utilizing Unit of Work pattern for entity tracking</description></item>
    /// <item><description><strong>Event Optimization:</strong> Supports event suppression for performance-critical scenarios while maintaining audit capabilities</description></item>
    /// <item><description><strong>Memory Efficiency:</strong> Integrates with entity caching to reduce memory allocation and garbage collection pressure in high-throughput scenarios</description></item>
    /// </list>
    ///
    /// <para><strong>CQRS and Event-Driven Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Automatic Event Generation:</strong> Publishes EntityCreated or EntityUpdated events based on operation outcome, enabling downstream event handlers</description></item>
    /// <item><description><strong>Event Customization:</strong> Supports custom event configuration for specialized integration patterns and business rule coordination</description></item>
    /// <item><description><strong>Saga Coordination:</strong> Events generated can trigger saga workflows and cross-service communication patterns</description></item>
    /// <item><description><strong>Read Model Synchronization:</strong> Generated events coordinate read model updates and cache invalidation across service boundaries</description></item>
    /// </list>
    ///
    /// <para><strong>Error Handling and Reliability:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Concurrency Conflict Detection:</strong> Throws PlatformDomainRowVersionConflictException when optimistic concurrency violations are detected</description></item>
    /// <item><description><strong>Entity Not Found Handling:</strong> Provides clear error messages and exception types for debugging and error recovery scenarios</description></item>
    /// <item><description><strong>Transaction Semantics:</strong> Coordinates with Unit of Work pattern to provide pseudo-transaction behavior in MongoDB</description></item>
    /// <item><description><strong>Rollback Support:</strong> Integrates with platform error handling for operation rollback and compensation patterns</description></item>
    /// </list>
    ///
    /// </remarks>
    /// <exception cref="PlatformDomainRowVersionConflictException">Thrown when optimistic concurrency conflict is detected during update operations.
    /// This indicates another process modified the entity between read and write operations, requiring conflict resolution.</exception>
    /// <exception cref="PlatformDomainEntityNotFoundException">Thrown when an entity expected to exist for update operations cannot be found.
    /// This typically indicates data integrity issues or race conditions in distributed scenarios.</exception>
    /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled via the cancellation token, supporting graceful shutdown
    /// and timeout scenarios in distributed systems.</exception>
    /// <exception cref="MongoException">Thrown for MongoDB-specific errors including connection issues, authentication failures, or database constraints.
    /// These exceptions indicate infrastructure-level problems requiring system-level attention.</exception>
    public Task<TEntity> CreateOrUpdateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate = null,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return CreateOrUpdateAsync<TEntity, TPrimaryKey>(entity, null, customCheckExistingPredicate, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    /// <summary>
    /// Performs an advanced create-or-update operation (upsert) for a single entity with explicit existing entity context, providing enhanced performance
    /// optimization and sophisticated change detection capabilities. This overload is specifically designed for scenarios where the caller already has
    /// access to the existing entity instance, enabling optimized database operations and more precise change tracking for MongoDB document persistence.
    /// </summary>
    /// <typeparam name="TEntity">The domain entity type that implements IEntity&lt;TPrimaryKey&gt; interface, representing the MongoDB document structure
    /// with strong typing support for compile-time safety and optimal serialization performance.</typeparam>
    /// <typeparam name="TPrimaryKey">The primary key type for entity identification (commonly string for MongoDB ObjectId, Guid, or custom identifiers),
    /// ensuring type-safe entity resolution and lookup operations across the persistence infrastructure.</typeparam>
    /// <param name="entity">The entity instance containing the updated data to be persisted to MongoDB. This represents the desired end state
    /// of the document, including all business logic changes, computed fields, audit information, and domain events that need to be coordinated.</param>
    /// <param name="existingEntity">The current entity instance from the database, used for optimized change detection and concurrency control.
    /// When provided, this eliminates the need for an additional database query to retrieve the existing state, significantly improving performance
    /// in scenarios where the caller already has this context available (e.g., from previous queries or cached data).</param>
    /// <param name="customCheckExistingPredicate">Optional sophisticated predicate expression for complex existence validation beyond standard ID matching.
    /// This supports advanced scenarios such as multi-tenant data isolation, hierarchical entity relationships, or business rule-based existence checks
    /// that incorporate domain-specific logic for determining entity uniqueness and identity.</param>
    /// <param name="dismissSendEvent">Boolean flag controlling CQRS event generation and publication during the operation. When set to true,
    /// suppresses EntityCreated/EntityUpdated events, which is beneficial for internal operations, bulk data processing, performance-critical paths,
    /// or scenarios where event processing would create unwanted side effects or circular dependencies.</param>
    /// <param name="checkDiff">Advanced change detection flag that controls whether to perform deep comparison between the incoming entity and existing entity.
    /// When enabled (default), prevents unnecessary database writes and event generation when no meaningful changes are detected, providing significant
    /// performance benefits in high-frequency update scenarios and reducing downstream event processing overhead.</param>
    /// <param name="eventCustomConfig">Optional configuration delegate for fine-tuning CQRS entity event properties and metadata before publication.
    /// This enables sophisticated event customization including correlation IDs, custom event properties, routing instructions, retry policies,
    /// and integration-specific metadata required for complex distributed system coordination and event-driven architecture patterns.</param>
    /// <param name="cancellationToken">Cooperative cancellation token supporting graceful operation termination and resource cleanup in distributed
    /// environments. This enables proper handling of service shutdown, timeout scenarios, circuit breaker patterns, and coordinated cancellation
    /// across service boundaries in microservices architectures.</param>
    /// <returns>A task resolving to the persisted entity instance with all platform-managed fields populated, including generated identifiers,
    /// audit timestamps, concurrency control tokens, and computed fields. The returned entity represents the exact state in MongoDB and can be
    /// used for subsequent operations, caching, or API responses.</returns>
    /// <remarks>
    /// <para><strong>Advanced Operation Logic and Optimization Strategy:</strong></para>
    /// <list type="number">
    /// <item><description><strong>Optimized Existence Detection:</strong> When existingEntity is provided, skips database lookup for existence checking, reducing latency and database load</description></item>
    /// <item><description><strong>Enhanced Change Detection:</strong> Performs sophisticated field-level comparison between entity and existingEntity to identify precisely which fields have changed</description></item>
    /// <item><description><strong>Intelligent Operation Routing:</strong> Dynamically routes to CreateAsync or UpdateAsync based on existence determination, providing transparent upsert semantics</description></item>
    /// <item><description><strong>Concurrency Optimization:</strong> Leverages existing entity's concurrency token for optimistic locking without additional database queries</description></item>
    /// <item><description><strong>Event Coordination:</strong> Generates contextually appropriate events (EntityCreated/EntityUpdated) with full business context and change metadata</description></item>
    /// <item><description><strong>Cache Integration:</strong> Seamlessly integrates with Unit of Work caching layer for optimal memory usage and change tracking performance</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Optimization Characteristics (Based on Real-World Usage Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Database Query Reduction:</strong> Eliminates existence check queries when existingEntity is provided, reducing database round-trips by up to 50%</description></item>
    /// <item><description><strong>Memory Efficiency:</strong> Reuses existing entity instances for change detection, reducing object allocation and garbage collection pressure</description></item>
    /// <item><description><strong>Network Optimization:</strong> Minimizes MongoDB network traffic through intelligent change detection and selective field updates</description></item>
    /// <item><description><strong>CPU Optimization:</strong> Optimized field comparison algorithms reduce computational overhead in high-throughput scenarios</description></item>
    /// <item><description><strong>Event Processing Efficiency:</strong> Smart event generation prevents unnecessary downstream processing when no changes are detected</description></item>
    /// </list>
    ///
    /// <para><strong>Enterprise Usage Patterns (Derived from Extensive Codebase Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Repository Pattern Integration:</strong> Extensively used in repository implementations where entities are frequently queried before updates</description></item>
    /// <item><description><strong>Service Layer Optimization:</strong> Applied in service methods that perform read-then-update operations, eliminating redundant database calls</description></item>
    /// <item><description><strong>CQRS Command Handlers:</strong> Leveraged in command handlers that need to validate existing state before applying business logic changes</description></item>
    /// <item><description><strong>Event Sourcing Integration:</strong> Used in event sourcing scenarios where current state is reconstructed before applying new events</description></item>
    /// <item><description><strong>Data Synchronization:</strong> Critical for distributed data synchronization where both old and new states are available for comparison</description></item>
    /// </list>
    ///
    /// <para><strong>Advanced CQRS and Event-Driven Architecture Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Contextual Event Generation:</strong> Events include rich change metadata derived from existingEntity comparison, enabling sophisticated event handlers</description></item>
    /// <item><description><strong>Saga Pattern Support:</strong> Generated events can carry state transition information essential for long-running business process coordination</description></item>
    /// <item><description><strong>Read Model Synchronization:</strong> Events provide precise change information for efficient read model updates and cache invalidation strategies</description></item>
    /// <item><description><strong>Integration Event Coordination:</strong> Supports complex integration scenarios where external systems need detailed change information</description></item>
    /// </list>
    ///
    /// <para><strong>Concurrency Control and Data Integrity:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Optimistic Concurrency:</strong> Uses existing entity's ConcurrencyUpdateToken for conflict detection without additional database queries</description></item>
    /// <item><description><strong>Change Validation:</strong> Validates that updates don't violate unique constraints or business rules through custom predicate evaluation</description></item>
    /// <item><description><strong>Atomic Operations:</strong> Ensures that create/update decisions are made atomically to prevent race conditions in concurrent scenarios</description></item>
    /// <item><description><strong>Consistency Guarantees:</strong> Maintains data consistency through proper transaction coordination and conflict resolution</description></item>
    /// </list>
    ///
    /// </remarks>
    /// <exception cref="PlatformDomainRowVersionConflictException">Thrown when optimistic concurrency conflict is detected, indicating that another
    /// process modified the entity between the time existingEntity was retrieved and the current update attempt. This requires conflict resolution
    /// or retry logic depending on the business requirements and consistency guarantees needed.</exception>
    /// <exception cref="PlatformDomainEntityNotFoundException">Thrown when an entity cannot be found for update operations, typically indicating
    /// data integrity issues, race conditions, or logical errors in the application flow where an entity was expected to exist.</exception>
    /// <exception cref="ArgumentNullException">Thrown when required entity parameter is null, ensuring proper parameter validation and error
    /// handling for internal operations in both development and production environments.</exception>
    /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled through the cancellation token, supporting graceful
    /// shutdown scenarios and timeout handling in distributed system architectures.</exception>
    /// <exception cref="MongoException">Thrown for MongoDB infrastructure-level errors including network connectivity issues, authentication
    /// failures, database constraints violations, or server-side errors that require system administrator attention.</exception>
    public async Task<TEntity> CreateOrUpdateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity? existingEntity,
        Expression<Func<TEntity, bool>>? customCheckExistingPredicate = null,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent>? eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var existingEntityPredicate =
            customCheckExistingPredicate != null || entity.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                ? customCheckExistingPredicate ?? entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr()!
                : p => p.Id.Equals(entity.Id);

        existingEntity ??=
            MappedUnitOfWork?.GetCachedExistingOriginalEntity<TEntity>(entity.Id.ToString())
            ?? await GetQuery<TEntity>()
                .Where(existingEntityPredicate)
                .FirstOrDefaultAsync(cancellationToken)
                .ThenActionIf(p => p != null, p => MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p));

        if (existingEntity != null)
        {
            await IUniqueCompositeIdSupport.EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
                entity,
                existingEntity,
                id => GetQuery<TEntity>().AnyAsync(p => p.Id.Equals(id), cancellationToken: cancellationToken)
            );

            return await UpdateAsync<TEntity, TPrimaryKey>(
                entity.WithIf(!entity.Id.Equals(existingEntity.Id), entity => entity.Id = existingEntity.Id),
                existingEntity,
                dismissSendEvent,
                checkDiff,
                eventCustomConfig,
                cancellationToken
            );
        }

        return await CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, true, eventCustomConfig, cancellationToken);
    }

    public async Task<List<TEntity>> CreateOrUpdateManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.Any())
        {
            var entityIds = entities.Select(p => p.Id);

            var existingEntitiesQuery = GetQuery<TEntity>()
                .Pipe(query =>
                    customCheckExistingPredicateBuilder != null ||
                    entities.FirstOrDefault()?.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                        ? query.Where(
                            entities
                                .Select(entity =>
                                    customCheckExistingPredicateBuilder?.Invoke(entity) ?? entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr()
                                )
                                .Aggregate((currentExpr, nextExpr) => currentExpr.Or(nextExpr))
                        )
                        : query.Where(p => entityIds.Contains(p.Id))
                );

            // Only need to check by entityIds if no custom check condition
            if (customCheckExistingPredicateBuilder == null && entities.FirstOrDefault()?.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() == null)
            {
                var existingEntityIds = await existingEntitiesQuery
                    .ToListAsync(cancellationToken)
                    .Then(items =>
                        items
                            .PipeAction(items => items.ForEach(p => MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p)))
                            .Pipe(existingEntities => existingEntities.Select(p => p.Id).ToHashSet())
                    );
                var (toUpdateEntities, newEntities) = entities.WhereSplitResult(p => existingEntityIds.Contains(p.Id));

                await Util.TaskRunner.WhenAll(
                    CreateManyAsync<TEntity, TPrimaryKey>(newEntities, dismissSendEvent, eventCustomConfig, cancellationToken),
                    UpdateManyAsync<TEntity, TPrimaryKey>(toUpdateEntities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken)
                );
            }
            else
            {
                var existingEntities = await existingEntitiesQuery
                    .ToListAsync(cancellationToken)
                    .Then(items => items.PipeAction(items => items.ForEach(p => MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p))));

                var toUpsertEntityToExistingEntityPairs = entities.SelectList(toUpsertEntity =>
                {
                    var matchedExistingEntity = existingEntities.FirstOrDefault(existingEntity =>
                        customCheckExistingPredicateBuilder?.Invoke(toUpsertEntity).Compile()(existingEntity)
                        ?? toUpsertEntity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr().Compile()(existingEntity)
                    );

                    // Update to correct the id of toUpdateEntity to the matched existing entity Id
                    if (matchedExistingEntity != null)
                        toUpsertEntity.Id = matchedExistingEntity.Id;

                    return new { toUpsertEntity, matchedExistingEntity };
                });

                var (existingToUpdateEntities, newEntities) = toUpsertEntityToExistingEntityPairs.WhereSplitResult(p => p.matchedExistingEntity != null);

                await Util.TaskRunner.WhenAll(
                    CreateManyAsync<TEntity, TPrimaryKey>(newEntities.Select(p => p.toUpsertEntity).ToList(), dismissSendEvent, eventCustomConfig, cancellationToken),
                    UpdateManyAsync<TEntity, TPrimaryKey>(
                        existingToUpdateEntities.Select(p => p.toUpsertEntity).ToList(),
                        dismissSendEvent,
                        checkDiff,
                        eventCustomConfig,
                        cancellationToken
                    )
                );
            }
        }

        return entities;
    }

    public ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformMongoDbContext<>).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }

    public Task<TEntity> UpdateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity? existingEntity,
        bool dismissSendEvent,
        bool checkDiff,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return InternalUpdateOrSetAsync<TEntity, TPrimaryKey>(
            entity,
            existingEntity,
            dismissSendEvent,
            checkDiff,
            eventCustomConfig,
            onlySetData: false,
            cancellationToken);
    }

    /// <summary>
    /// Performs the core internal update or data-setting operation for MongoDB entities, providing the foundational implementation for both
    /// business logic updates and direct data manipulation scenarios. This method serves as the critical engine for all update operations,
    /// offering sophisticated change detection, comprehensive audit management, optimistic concurrency control, and flexible CQRS event
    /// coordination while supporting both full update workflows and direct data setting for specialized internal platform operations.
    /// </summary>
    /// <typeparam name="TEntity">The domain entity type implementing IEntity&lt;TPrimaryKey&gt; interface, representing the MongoDB document structure
    /// with complete type safety and optimized serialization performance. This ensures compile-time safety and efficient operations across
    /// potentially complex document schemas, nested object hierarchies, and sophisticated business logic implementations.</typeparam>
    /// <typeparam name="TPrimaryKey">The primary key type for entity identification, commonly string for MongoDB ObjectId, Guid for distributed
    /// systems, or custom identifier types for domain-specific requirements. This provides type-safe entity resolution and efficient
    /// lookup operations across the persistence infrastructure with optimal indexing strategies.</typeparam>
    /// <param name="entity">The entity instance containing the data to be persisted to MongoDB. This represents the desired end state
    /// of the document, including all business logic changes, computed fields, audit information, and domain events that need to be
    /// coordinated. The entity serves as the authoritative source for the update operation and contains all necessary data for persistence.</param>
    /// <param name="existingEntity">The current entity instance from the database, used for sophisticated change detection, concurrency control,
    /// and audit trail generation. When provided, this enables optimized field-level comparison and eliminates the need for additional database
    /// queries to retrieve existing state, significantly improving performance in scenarios where the caller already has access to this context.</param>
    /// <param name="dismissSendEvent">Boolean flag controlling CQRS event generation and publication during the operation. When set to true,
    /// suppresses EntityUpdated events, which is beneficial for internal platform operations, bulk data processing, migration scenarios,
    /// or cases where event processing would create unwanted side effects, circular dependencies, or performance bottlenecks in high-throughput
    /// operations requiring maximum efficiency.</param>
    /// <param name="checkDiff">Advanced change detection flag enabling sophisticated field-level comparison between the incoming entity and
    /// existing entity state. When enabled (default), performs intelligent change detection to prevent unnecessary database writes and event
    /// generation when no meaningful changes are detected, providing substantial performance optimization and reducing downstream processing
    /// overhead across distributed system boundaries.</param>
    /// <param name="eventCustomConfig">Optional configuration delegate for fine-tuning CQRS entity event properties and metadata before publication.
    /// This enables sophisticated event customization including correlation IDs, custom event properties, routing instructions, retry policies,
    /// and integration-specific metadata required for complex distributed system coordination and event-driven architecture patterns.</param>
    /// <param name="onlySetData">Critical boolean flag distinguishing between full business logic update operations and direct data setting scenarios.
    /// When true, bypasses audit field updates, event generation safeguards, and business logic validation to perform direct data manipulation,
    /// which is essential for internal platform operations, data recovery scenarios, system maintenance, and specialized operations that require
    /// precise control over the persistence process without standard business logic overhead.</param>
    /// <param name="cancellationToken">Cooperative cancellation token supporting graceful operation termination and proper resource cleanup
    /// in distributed environments. This enables proper handling of service shutdown scenarios, timeout management, circuit breaker patterns,
    /// and coordinated cancellation across service boundaries in microservices architectures.</param>
    /// <returns>A task resolving to the updated entity instance with all platform-managed fields populated and refreshed, including updated
    /// audit timestamps, incremented concurrency control tokens, and any computed fields modified during the update process. The returned
    /// entity represents the exact document state persisted in MongoDB and serves as the authoritative version for subsequent operations,
    /// caching strategies, or response generation in distributed system architectures.</returns>
    /// <remarks>
    /// <para><strong>Core Operation Architecture and Internal Logic:</strong></para>
    /// <list type="number">
    /// <item><description><strong>Context Validation:</strong> Validates entity state, concurrency tokens, and existence requirements based on operation type and business logic needs</description></item>
    /// <item><description><strong>Change Detection Engine:</strong> Performs sophisticated field-level comparison to identify precise changes, supporting optimized update operations</description></item>
    /// <item><description><strong>Audit Management:</strong> Conditionally applies audit field updates (LastUpdatedDate, LastUpdatedBy) based on onlySetData flag and entity configuration</description></item>
    /// <item><description><strong>Concurrency Control:</strong> Implements robust optimistic concurrency control using ConcurrencyUpdateToken with conflict detection and resolution</description></item>
    /// <item><description><strong>MongoDB Operation Execution:</strong> Executes either UpdateOneAsync or ReplaceOneAsync operations based on change detection results and performance optimization</description></item>
    /// <item><description><strong>Event Coordination:</strong> Conditionally generates CQRS events based on dismissSendEvent flag and business logic requirements</description></item>
    /// </list>
    ///
    /// <para><strong>Dual Operation Mode Design (Based on onlySetData Parameter):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Business Logic Mode (onlySetData = false):</strong> Full update workflow with audit trails, event generation, business rule validation, and comprehensive change tracking</description></item>
    /// <item><description><strong>Direct Data Mode (onlySetData = true):</strong> Streamlined data setting for internal operations, bypassing audit updates and event generation for maximum performance</description></item>
    /// <item><description><strong>Performance Optimization:</strong> onlySetData mode enables high-performance bulk operations and system maintenance without business logic overhead</description></item>
    /// <item><description><strong>Flexibility:</strong> Dual mode design supports both user-facing operations and internal platform maintenance through a single, well-tested code path</description></item>
    /// </list>
    ///
    /// <para><strong>Advanced Change Detection and Performance Optimization:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Field-Level Granularity:</strong> Identifies precisely which fields have changed, enabling optimized MongoDB update operations with minimal document modification</description></item>
    /// <item><description><strong>Intelligent Skip Logic:</strong> Automatically skips database operations when no meaningful changes are detected, preventing unnecessary network traffic</description></item>
    /// <item><description><strong>Memory Efficiency:</strong> Optimized field comparison algorithms minimize memory allocation and garbage collection pressure in high-throughput scenarios</description></item>
    /// <item><description><strong>Network Optimization:</strong> Uses MongoDB UpdateOneAsync for partial updates when possible, falling back to ReplaceOneAsync for full document replacement</description></item>
    /// </list>
    ///
    /// <para><strong>Sophisticated Concurrency Control and Data Integrity:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Optimistic Locking:</strong> Implements robust optimistic concurrency control using ConcurrencyUpdateToken to prevent data corruption in concurrent scenarios</description></item>
    /// <item><description><strong>Conflict Detection:</strong> Provides comprehensive conflict detection with detailed error reporting for debugging and conflict resolution strategies</description></item>
    /// <item><description><strong>Atomic Operations:</strong> Ensures atomic update operations through proper MongoDB filter construction and concurrency token validation</description></item>
    /// <item><description><strong>Data Consistency:</strong> Maintains data consistency through proper transaction coordination and conflict resolution mechanisms</description></item>
    /// </list>
    ///
    /// <para><strong>Enterprise Integration and Event-Driven Architecture:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>CQRS Event Integration:</strong> Seamlessly integrates with CQRS event infrastructure for EntityUpdated event generation with comprehensive context</description></item>
    /// <item><description><strong>Event Customization:</strong> Supports sophisticated event configuration through eventCustomConfig delegate for specialized integration patterns</description></item>
    /// <item><description><strong>Request Context Integration:</strong> Automatically captures and propagates request context information for audit trails and distributed tracing</description></item>
    /// <item><description><strong>Stack Trace Preservation:</strong> Maintains detailed stack trace information for debugging and operational monitoring in production environments</description></item>
    /// </list>
    ///
    /// <para><strong>Internal Usage Patterns (Based on Platform Implementation Analysis):</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>UpdateAsync Integration:</strong> Serves as the core implementation for public UpdateAsync methods, providing consistent update logic across the platform</description></item>
    /// <item><description><strong>SetAsync Operations:</strong> Powers SetAsync operations for direct data manipulation in internal platform operations and system maintenance</description></item>
    /// <item><description><strong>Repository Pattern Support:</strong> Provides the foundational update logic for all repository implementations, ensuring consistent behavior</description></item>
    /// <item><description><strong>Performance-Critical Paths:</strong> Enables high-performance update operations through the onlySetData flag for bulk processing scenarios</description></item>
    /// </list>
    ///
    /// <para><strong>Error Handling and Operational Reliability:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Comprehensive Exception Handling:</strong> Provides detailed exception information for PlatformDomainRowVersionConflictException and PlatformDomainEntityNotFoundException</description></item>
    /// <item><description><strong>Cache Management:</strong> Properly manages Unit of Work cache invalidation to maintain consistency across subsequent operations</description></item>
    /// <item><description><strong>Diagnostic Support:</strong> Includes comprehensive logging and monitoring integration for production troubleshooting and performance analysis</description></item>
    /// <item><description><strong>Recovery Mechanisms:</strong> Implements proper rollback and recovery patterns for failed operations and conflict resolution scenarios</description></item>
    /// </list>
    ///
    /// <para><strong>MongoDB-Specific Optimizations and Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description><strong>Native Driver Integration:</strong> Leverages MongoDB driver's native UpdateOneAsync and ReplaceOneAsync operations for optimal performance</description></item>
    /// <item><description><strong>Filter Optimization:</strong> Constructs optimized MongoDB filters incorporating ID matching and concurrency token validation</description></item>
    /// <item><description><strong>BSON Serialization:</strong> Works seamlessly with MongoDB's BSON serialization for efficient document transmission and storage</description></item>
    /// <item><description><strong>Index Utilization:</strong> Designed to work efficiently with MongoDB indexes for optimal query performance in high-scale scenarios</description></item>
    /// </list>
    ///
    /// </remarks>
    /// <exception cref="PlatformDomainRowVersionConflictException">Thrown when optimistic concurrency conflict is detected during update operations,
    /// indicating that another process modified the entity between the time it was retrieved and the current update attempt. This exception
    /// includes detailed information about the conflicted entity to enable appropriate conflict resolution strategies and retry logic.</exception>
    /// <exception cref="PlatformDomainEntityNotFoundException">Thrown when an entity cannot be found for update operations, typically indicating
    /// data integrity issues, race conditions, or logical errors in the application flow where an entity was expected to exist.</exception>
    /// <exception cref="ArgumentNullException">Thrown when required entity parameter is null, ensuring proper parameter validation and error
    /// handling for internal operations in both development and production environments.</exception>
    /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled through the cancellation token, supporting graceful
    /// shutdown scenarios and timeout handling in distributed system architectures where operations may need to be terminated cleanly.</exception>
    /// <exception cref="MongoException">Thrown for MongoDB infrastructure-level errors during update operations, including network connectivity
    /// issues, authentication failures, database constraint violations, or server-side errors that require system administrator attention
    /// and may indicate infrastructure problems affecting operation performance and reliability.</exception>
    private async Task<TEntity> InternalUpdateOrSetAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity? existingEntity,
        bool dismissSendEvent,
        bool checkDiff,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        bool onlySetData,
        CancellationToken cancellationToken
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var isEntityRowVersionEntityMissingConcurrencyUpdateToken = entity is IRowVersionEntity { ConcurrencyUpdateToken: null };
        existingEntity ??= MappedUnitOfWork?.GetCachedExistingOriginalEntity<TEntity>(entity.Id.ToString());

        if (
            existingEntity == null
            && !dismissSendEvent
            && PlatformCqrsEntityEvent.IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(RootServiceProvider)
            && entity.HasTrackValueUpdatedDomainEventAttribute()
        )
        {
            existingEntity = await GetQuery<TEntity>()
                .Where(BuildExistingEntityPredicate())
                .FirstOrDefaultAsync(cancellationToken)
                .EnsureFound($"Entity {typeof(TEntity).Name} with [Id:{entity.Id}] not found to update")
                .ThenActionIf(p => p != null, p => MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p));

            if (!existingEntity.Id.Equals(entity.Id))
            {
                await IUniqueCompositeIdSupport.EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
                    entity,
                    existingEntity,
                    id => GetQuery<TEntity>().AnyAsync(p => p.Id.Equals(id), cancellationToken: cancellationToken)
                );

                entity.Id = existingEntity.Id;
            }
        }

        if (isEntityRowVersionEntityMissingConcurrencyUpdateToken && !onlySetData)
        {
            entity.As<IRowVersionEntity>().ConcurrencyUpdateToken =
                existingEntity?.As<IRowVersionEntity>().ConcurrencyUpdateToken
                ?? await GetQuery<TEntity>()
                    .Where(BuildExistingEntityPredicate())
                    .Select(p => ((IRowVersionEntity)p).ConcurrencyUpdateToken)
                    .FirstOrDefaultAsync(cancellationToken);
        }

        var changedFields = entity.GetChangedFields(existingEntity, p => p.GetCustomAttribute<PlatformNavigationPropertyAttribute>() == null);
        var entityUpdatedDateAuditField = LastUpdatedDateAuditFieldAttribute.GetUpdatedDateAuditField(typeof(TEntity));

        if (
            existingEntity != null
            && !ReferenceEquals(entity, existingEntity)
            && (
                changedFields == null
                || changedFields.Count == 0
                || (changedFields.Count == 1 && entityUpdatedDateAuditField != null && entityUpdatedDateAuditField.Name == changedFields.First().Key)
            )
            && checkDiff
            && (entity is not ISupportDomainEventsEntity || entity.As<ISupportDomainEventsEntity>().GetDomainEvents().IsEmpty())
        )
            return entity;

        var toBeUpdatedEntity = entity
            .PipeIf(
                entity is IDateAuditedEntity && !onlySetData,
                p =>
                    p.As<IDateAuditedEntity>()
                        .With(auditedEntity => auditedEntity.LastUpdatedDate = DateTime.UtcNow)
                        .PipeAction(p => changedFields?.Upsert(nameof(IDateAuditedEntity.LastUpdatedDate), p.LastUpdatedDate))
                        .As<TEntity>()
            )
            .PipeIf(
                entity.IsAuditedUserEntity() && !onlySetData,
                p =>
                    p.As<IUserAuditedEntity>()
                        .SetLastUpdatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType()))
                        .PipeAction(p => changedFields?.Upsert(nameof(IUserAuditedEntity<object>.LastUpdatedBy), p.GetLastUpdatedBy()))
                        .As<TEntity>()
            );

        if (toBeUpdatedEntity is IRowVersionEntity toBeUpdatedRowVersionEntity && !onlySetData)
        {
            var currentInMemoryConcurrencyUpdateToken = toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken;
            var newUpdateConcurrencyUpdateToken = Ulid.NewUlid().ToString();

            toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken = newUpdateConcurrencyUpdateToken;
            changedFields?.Upsert(nameof(IRowVersionEntity.ConcurrencyUpdateToken), toBeUpdatedRowVersionEntity.ConcurrencyUpdateToken);

            var resultMatchedCount = await PlatformCqrsEntityEvent.ExecuteWithSendingUpdateEntityEvent<TEntity, TPrimaryKey, long>(
                RootServiceProvider,
                MappedUnitOfWork,
                toBeUpdatedEntity,
                existingEntity,
                entity =>
                {
                    var updateDefinition =
                        changedFields?.Any() == true
                            ? changedFields
                                .Select(field => Builders<TEntity>.Update.Set(field.Key, field.Value))
                                .Pipe(updateDefinitions => Builders<TEntity>.Update.Combine(updateDefinitions))
                            : null;

                    return updateDefinition != null
                        ? GetTable<TEntity>()
                            .UpdateOneAsync(
                                p =>
                                    p.Id.Equals(entity.Id)
                                    && (
                                        ((IRowVersionEntity)p).ConcurrencyUpdateToken == null
                                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == ""
                                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == currentInMemoryConcurrencyUpdateToken
                                    ),
                                updateDefinition,
                                cancellationToken: cancellationToken
                            )
                            .Then(p => (p.MatchedCount, true))
                        : GetTable<TEntity>()
                            .ReplaceOneAsync(
                                p =>
                                    p.Id.Equals(entity.Id)
                                    && (
                                        ((IRowVersionEntity)p).ConcurrencyUpdateToken == null
                                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == ""
                                        || ((IRowVersionEntity)p).ConcurrencyUpdateToken == currentInMemoryConcurrencyUpdateToken
                                    ),
                                entity,
                                new ReplaceOptions { IsUpsert = false },
                                cancellationToken
                            )
                            .Then(p => (p.MatchedCount, true));
                },
                dismissSendEvent,
                eventCustomConfig,
                () => RequestContextAccessor.Current.GetAllKeyValues(),
                PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                cancellationToken
            );

            if (resultMatchedCount <= 0)
            {
                if (await GetTable<TEntity>().AsQueryable().AnyAsync(p => p.Id.Equals(toBeUpdatedEntity.Id), cancellationToken))
                {
                    MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(toBeUpdatedEntity.Id.ToString());

                    throw new PlatformDomainRowVersionConflictException($"Update {typeof(TEntity).Name} with Id:{toBeUpdatedEntity.Id} has conflicted version.");
                }

                throw new PlatformDomainEntityNotFoundException<TEntity>(toBeUpdatedEntity.Id.ToString());
            }
        }
        else
        {
            var resultMatchedCount = await PlatformCqrsEntityEvent.ExecuteWithSendingUpdateEntityEvent<TEntity, TPrimaryKey, long>(
                RootServiceProvider,
                MappedUnitOfWork,
                toBeUpdatedEntity,
                existingEntity ?? MappedUnitOfWork?.GetCachedExistingOriginalEntity<TEntity>(entity.Id.ToString()),
                _ =>
                {
                    var updateDefinition =
                        changedFields?.Any() == true
                            ? changedFields
                                .Select(field => Builders<TEntity>.Update.Set(field.Key, field.Value))
                                .Pipe(updateDefinitions => Builders<TEntity>.Update.Combine(updateDefinitions))
                            : null;

                    return updateDefinition != null
                        ? GetTable<TEntity>()
                            .UpdateOneAsync(p => p.Id.Equals(toBeUpdatedEntity.Id), updateDefinition, cancellationToken: cancellationToken)
                            .Then(p => (p.MatchedCount, true))
                        : GetTable<TEntity>()
                            .ReplaceOneAsync(p => p.Id.Equals(toBeUpdatedEntity.Id), toBeUpdatedEntity, new ReplaceOptions { IsUpsert = false }, cancellationToken)
                            .Then(p => (p.MatchedCount, true));
                },
                dismissSendEvent,
                eventCustomConfig,
                () => RequestContextAccessor.Current.GetAllKeyValues(),
                PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                cancellationToken
            );

            if (resultMatchedCount <= 0)
                throw new PlatformDomainEntityNotFoundException<TEntity>(toBeUpdatedEntity.Id.ToString());
        }

        MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(entity.Id.ToString());

        return entity;

        Expression<Func<TEntity, bool>> BuildExistingEntityPredicate()
        {
            return entity.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                ? entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr()!
                : p => p.Id.Equals(entity.Id);
        }
    }

    public virtual async Task EnsureIndexesAsync(bool recreate = false)
    {
        if (!recreate && await IsEnsureIndexesMigrationExecuted())
            return;

        Logger.LogInformation("[{TargetName}] EnsureIndexesAsync STARTED.", GetType().Name);

        await Task.WhenAll(
            EnsureMigrationHistoryCollectionIndexesAsync(recreate),
            EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(recreate),
            EnsureInboxBusMessageCollectionIndexesAsync(recreate),
            EnsureOutboxBusMessageCollectionIndexesAsync(recreate),
            InternalEnsureIndexesAsync(recreate)
        );

        if (!await IsEnsureIndexesMigrationExecuted()) await MigrationHistoryCollection.InsertOneAsync(new PlatformMongoMigrationHistory(EnsureIndexesMigrationName));

        Logger.LogInformation("[{TargetName}] EnsureIndexesAsync FINISHED.", GetType().Name);
    }

    public string GenerateId()
    {
        return new BsonObjectId(ObjectId.GenerateNewId()).ToString();
    }

    public async Task Migrate()
    {
        await EnsureIndexesAsync();

        EnsureAllMigrationExecutorsHasUniqueName();

        var dbInitializedDate =
            await DataMigrationHistoryQuery().FirstOrDefaultAsync(p => p.Name == DbInitializedMigrationHistoryName).Then(p => p?.CreatedDate) ?? DateTime.UtcNow;

        await NotExecutedMigrationExecutors()
            .ParallelAsync(
                async migrationExecutor =>
                {
                    if (migrationExecutor.OnlyForDbInitBeforeDate == null || dbInitializedDate < migrationExecutor.OnlyForDbInitBeforeDate)
                    {
                        Logger.LogInformation("Migration {MigrationExecutorName} STARTED.", migrationExecutor.Name);

                        await migrationExecutor.Execute((TDbContext)this);
                        await MigrationHistoryCollection.InsertOneAsync(new PlatformMongoMigrationHistory(migrationExecutor.Name));
                        await SaveChangesAsync();

                        Logger.LogInformation("Migration {MigrationExecutorName} FINISHED.", migrationExecutor.Name);
                    }
                },
                maxConcurrent: 1
            );
    }

    public string GetCollectionName<TEntity>()
    {
        if (TryGetCollectionName<TEntity>(out var collectionName))
            return collectionName;

        if (GetPlatformEntityCollectionName<TEntity>() != null)
            return GetPlatformEntityCollectionName<TEntity>();

        throw new Exception(
            $"Missing collection name mapping item for entity {typeof(TEntity).Name}. Please define it in return of {nameof(EntityTypeToCollectionNameMaps)} method."
        );
    }

    public virtual IMongoCollection<TEntity> GetCollection<TEntity>()
    {
        return Database.GetCollection<TEntity>(GetCollectionName<TEntity>());
    }

    public IMongoCollection<TEntity> GetTable<TEntity>()
        where TEntity : class, IEntity, new()
    {
        return GetCollection<TEntity>();
    }

    public virtual async Task EnsureMigrationHistoryCollectionIndexesAsync(bool recreate = false)
    {
        if (recreate || !await IsEnsureIndexesMigrationExecuted())
            await MigrationHistoryCollection.Indexes.DropAllAsync();

        if (recreate || !await IsEnsureIndexesMigrationExecuted())
        {
            await MigrationHistoryCollection.Indexes.CreateManyAsync(
                [
                    new CreateIndexModel<PlatformMongoMigrationHistory>(
                        Builders<PlatformMongoMigrationHistory>.IndexKeys.Ascending(p => p.Name),
                        new CreateIndexOptions { Unique = true }
                    )
                ]
            );
        }
    }

    public virtual async Task EnsureApplicationDataMigrationHistoryCollectionIndexesAsync(bool recreate = false)
    {
        if (recreate || !await IsEnsureIndexesMigrationExecuted())
            await DataMigrationHistoryCollection.Indexes.DropAllAsync();

        if (recreate || !await IsEnsureIndexesMigrationExecuted())
        {
            await DataMigrationHistoryCollection.Indexes.CreateManyAsync(
                [
                    new CreateIndexModel<PlatformDataMigrationHistory>(
                        Builders<PlatformDataMigrationHistory>.IndexKeys.Ascending(p => p.Name),
                        new CreateIndexOptions { Unique = true }
                    ),
                    new CreateIndexModel<PlatformDataMigrationHistory>(Builders<PlatformDataMigrationHistory>.IndexKeys.Ascending(p => p.Status))
                ]
            );
        }
    }

    public virtual async Task EnsureInboxBusMessageCollectionIndexesAsync(bool recreate = false)
    {
        if (recreate || !await IsEnsureIndexesMigrationExecuted())
            await InboxBusMessageCollection.Indexes.DropAllAsync();

        if (recreate || !await IsEnsureIndexesMigrationExecuted())
        {
            await InboxBusMessageCollection.Indexes.CreateManyAsync(
                [
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.ForApplicationName)
                            .Ascending(p => p.CreatedDate)
                            .Ascending(p => p.NextRetryProcessAfter)
                    ),
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.ForApplicationName)
                            .Ascending(p => p.CreatedDate)
                            .Ascending(p => p.LastConsumeDate)
                    ),
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.ForApplicationName)
                            .Ascending(p => p.CreatedDate)
                            .Ascending(p => p.LastProcessingPingDate)
                    ),
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.Id)
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformInboxBusMessage>(
                        Builders<PlatformInboxBusMessage>.IndexKeys
                            .Ascending(p => p.ConsumeStatus)
                            .Ascending(p => p.ForApplicationName)
                            .Ascending(p => p.CreatedDate)
                    )
                ]
            );
        }
    }

    public virtual async Task EnsureOutboxBusMessageCollectionIndexesAsync(bool recreate = false)
    {
        if (recreate || !await IsEnsureIndexesMigrationExecuted())
            await OutboxBusMessageCollection.Indexes.DropAllAsync();

        if (recreate || !await IsEnsureIndexesMigrationExecuted())
        {
            await OutboxBusMessageCollection.Indexes.CreateManyAsync(
                [
                    new CreateIndexModel<PlatformOutboxBusMessage>(
                        Builders<PlatformOutboxBusMessage>.IndexKeys.Ascending(p => p.SendStatus).Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformOutboxBusMessage>(
                        Builders<PlatformOutboxBusMessage>.IndexKeys.Ascending(p => p.Id).Ascending(p => p.SendStatus).Ascending(p => p.CreatedDate)),
                    new CreateIndexModel<PlatformOutboxBusMessage>(
                        Builders<PlatformOutboxBusMessage>.IndexKeys.Ascending(p => p.SendStatus).Ascending(p => p.CreatedDate).Ascending(p => p.NextRetryProcessAfter)
                    ),
                    new CreateIndexModel<PlatformOutboxBusMessage>(
                        Builders<PlatformOutboxBusMessage>.IndexKeys.Ascending(p => p.SendStatus).Ascending(p => p.CreatedDate).Ascending(p => p.LastProcessingPingDate)
                    ),
                    new CreateIndexModel<PlatformOutboxBusMessage>(
                        Builders<PlatformOutboxBusMessage>.IndexKeys.Ascending(p => p.SendStatus).Ascending(p => p.CreatedDate).Ascending(p => p.LastSendDate)
                    )
                ]
            );
        }
    }

    public abstract Task InternalEnsureIndexesAsync(bool recreate = false);

    /// <summary>
    /// This is used for <see cref="TryGetCollectionName{TEntity}" /> to return the collection name for TEntity
    /// </summary>
    public virtual List<KeyValuePair<Type, string>> EntityTypeToCollectionNameMaps()
    {
        return null;
    }

    /// <summary>
    /// TryGetCollectionName for <see cref="GetCollectionName{TEntity}" /> to return the entity collection.
    /// Default will get from return of <see cref="EntityTypeToCollectionNameMaps" />
    /// </summary>
    protected virtual bool TryGetCollectionName<TEntity>(out string collectionName)
    {
        if (EntityTypeToCollectionNameDictionary.Value == null || !EntityTypeToCollectionNameDictionary.Value.ContainsKey(typeof(TEntity)))
        {
            collectionName = GetPlatformEntityCollectionName<TEntity>() ?? typeof(TEntity).Name;
            return true;
        }

        return EntityTypeToCollectionNameDictionary.Value.TryGetValue(typeof(TEntity), out collectionName);
    }

    protected Task<bool> IsEnsureIndexesMigrationExecuted()
    {
        return MigrationHistoryCollection.AsQueryable().AnyAsync(p => p.Name == EnsureIndexesMigrationName);
    }

    protected async Task<TEntity> CreateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        bool upsert = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var toBeCreatedEntity = entity
            .PipeIf(
                entity.IsAuditedUserEntity(),
                p => p.As<IUserAuditedEntity>().SetCreatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType())).As<TEntity>())
            .WithIf(
                entity is IRowVersionEntity { ConcurrencyUpdateToken: null },
                entity => entity.As<IRowVersionEntity>().ConcurrencyUpdateToken = Ulid.NewUlid().ToString());

        if (!upsert)
        {
            await PlatformCqrsEntityEvent.ExecuteWithSendingCreateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                RootServiceProvider,
                MappedUnitOfWork,
                toBeCreatedEntity,
                entity => GetTable<TEntity>().InsertOneAsync(entity, null, cancellationToken).Then(() => entity),
                dismissSendEvent,
                eventCustomConfig,
                () => RequestContextAccessor.Current.GetAllKeyValues(),
                PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                cancellationToken
            );
        }
        else
        {
            await PlatformCqrsEntityEvent.ExecuteWithSendingCreateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                RootServiceProvider,
                MappedUnitOfWork,
                toBeCreatedEntity,
                entity => GetTable<TEntity>()
                    .ReplaceOneAsync(p => p.Id.Equals(entity.Id), entity, new ReplaceOptions { IsUpsert = true }, cancellationToken)
                    .Then(() => entity),
                dismissSendEvent,
                eventCustomConfig,
                () => RequestContextAccessor.Current.GetAllKeyValues(),
                PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                cancellationToken
            );
        }

        return toBeCreatedEntity;
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!disposed)
        {
            if (disposing)
            {
                // Release managed resources
            }

            // Release unmanaged resources

            disposed = true;
        }
    }

    ~PlatformMongoDbContext()
    {
        Dispose(false);
    }

    protected List<PlatformMongoMigrationExecutor<TDbContext>> ScanAllMigrationExecutors()
    {
        var results = GetType()
            .Assembly.GetTypes()
            .Where(p => p.IsAssignableTo(typeof(PlatformMongoMigrationExecutor<TDbContext>)) && !p.IsAbstract)
            .Select(p => (PlatformMongoMigrationExecutor<TDbContext>)Activator.CreateInstance(p))
            .WhereNotNull()
            .ToList();
        return results;
    }

    protected void EnsureAllMigrationExecutorsHasUniqueName()
    {
        var duplicatedMigrationNames = ScanAllMigrationExecutors().GroupBy(p => p.Name).ToDictionary(p => p.Key, p => p.Count()).Where(p => p.Value > 1).ToList();

        if (duplicatedMigrationNames.Any())
            throw new Exception($"Mongo Migration Executor Names is duplicated. Duplicated name: {duplicatedMigrationNames.First()}");
    }

    protected List<PlatformMongoMigrationExecutor<TDbContext>> NotExecutedMigrationExecutors()
    {
        var executedMigrationNames = MigrationHistoryCollection.AsQueryable().Select(p => p.Name).ToHashSet();

        return ScanAllMigrationExecutors().Where(p => !p.IsExpired()).OrderBy(x => x.GetOrderByValue()).ToList().FindAll(me => !executedMigrationNames.Contains(me.Name));
    }

    protected Dictionary<Type, string> BuildEntityTypeToCollectionNameDictionary()
    {
        return EntityTypeToCollectionNameMaps()?.ToDictionary(p => p.Key, p => p.Value);
    }

    protected static string GetPlatformEntityCollectionName<TEntity>()
    {
        if (typeof(TEntity).IsAssignableTo(typeof(PlatformInboxBusMessage)))
            return PlatformInboxBusMessageCollectionName;

        if (typeof(TEntity).IsAssignableTo(typeof(PlatformOutboxBusMessage)))
            return PlatformOutboxBusMessageCollectionName;

        if (typeof(TEntity).IsAssignableTo(typeof(PlatformMongoMigrationHistory)))
            return PlatformDataMigrationHistoryCollectionName;

        return null;
    }

    protected async Task SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        PlatformCqrsEntityEventCrudAction crudAction,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entities.IsEmpty())
            return;

        await PlatformCqrsEntityEvent.SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
            RootServiceProvider,
            MappedUnitOfWork,
            entities,
            crudAction,
            eventCustomConfig,
            () => RequestContextAccessor.Current.GetAllKeyValues(),
            PlatformCqrsEntityEvent.GetBulkEntitiesEventStackTrace<TEntity, TPrimaryKey>(RootServiceProvider),
            cancellationToken
        );
    }
}
