#region

using System.Collections;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.EntityConfiguration;
using Easy.Platform.Persistence;
using Easy.Platform.Persistence.DataMigration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.EfCore;

/// <summary>
/// Base abstract Entity Framework Core database context that provides comprehensive data access capabilities within the Easy Platform architecture.
/// This class extends Entity Framework Core's DbContext with platform-specific features including CQRS event handling, unit of work integration,
/// advanced entity operations, thread safety mechanisms, and data migration support.
/// </summary>
/// <typeparam name="TDbContext">The concrete database context type that inherits from this base class. This generic constraint ensures type safety
/// and enables the platform to work with strongly-typed contexts while providing common functionality across all EF Core implementations.</typeparam>
/// <remarks>
/// <para><strong>Entity Framework Core Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Extends EF Core's DbContext with platform-specific enhancements for enterprise applications</description></item>
/// <item><description>Supports EF Core context pooling for improved performance and resource utilization</description></item>
/// <item><description>Integrates with Entity Framework Core's change tracking and transaction management systems</description></item>
/// <item><description>Provides automatic entity configuration discovery and registration through assembly scanning</description></item>
/// </list>
///
/// <para><strong>CQRS and Event-Driven Architecture:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic CQRS entity event generation for Create, Update, Delete operations</description></item>
/// <item><description>Domain event support for complex business logic coordination across aggregates</description></item>
/// <item><description>Event customization through configurable event handlers and custom event configurations</description></item>
/// <item><description>Bulk operation events for high-performance batch processing scenarios</description></item>
/// </list>
///
/// <para><strong>Advanced Entity Operations:</strong></para>
/// <list type="bullet">
/// <item><description>CreateOrUpdate operations with intelligent conflict resolution and duplicate detection</description></item>
/// <item><description>Batch operations (CreateMany, UpdateMany, DeleteMany) with optimized performance</description></item>
/// <item><description>Concurrency control through row versioning and optimistic locking mechanisms</description></item>
/// <item><description>Audit trail support with automatic user and timestamp tracking for entity changes</description></item>
/// </list>
///
/// <para><strong>Thread Safety and Performance:</strong></para>
/// <list type="bullet">
/// <item><description>Thread-safe operations using SemaphoreSlim with configurable concurrency limits</description></item>
/// <item><description>Entity tracking optimization to prevent EF Core tracking conflicts and memory leaks</description></item>
/// <item><description>Lazy loading proxy support with runtime type resolution for performance optimization</description></item>
/// <item><description>Cached entity metadata for improved query performance and reduced reflection overhead</description></item>
/// </list>
///
/// <para><strong>Data Migration and Initialization:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic database schema migration during application initialization</description></item>
/// <item><description>Data migration history tracking with status monitoring and conflict resolution</description></item>
/// <item><description>Cross-database migration support for complex enterprise scenarios</description></item>
/// <item><description>Configurable migration behavior with environment-specific customization options</description></item>
/// </list>
///
/// <para><strong>Platform Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Seamless integration with Platform persistence configuration and dependency injection</description></item>
/// <item><description>Request context integration for user auditing and tenant isolation</description></item>
/// <item><description>Unit of Work pattern integration for transaction coordination across multiple repositories</description></item>
/// <item><description>Logging and error handling integration with Platform monitoring and diagnostics</description></item>
/// </list>
/// </remarks>
public abstract class PlatformEfCoreDbContext<TDbContext> : DbContext, IPlatformDbContext<TDbContext>
    where TDbContext : PlatformEfCoreDbContext<TDbContext>, IPlatformDbContext<TDbContext>
{
    /// <summary>
    /// Maximum number of concurrent threads allowed to access the database context simultaneously.
    /// This limit prevents thread safety issues and ensures optimal performance by avoiding context conflicts.
    /// </summary>
    /// <value>
    /// The maximum concurrent thread count, set to 1 to ensure thread-safe operations with EF Core contexts.
    /// </value>
    /// <remarks>
    /// Entity Framework Core contexts are not thread-safe by design. This constant ensures that database operations
    /// are serialized to prevent concurrent access issues, change tracking conflicts, and potential data corruption.
    /// The value is used by <see cref="ContextThreadSafeLock"/> to control access to context operations.
    /// </remarks>
    public const int ContextMaxConcurrentThreadLock = 1;

    // ReSharper disable once StaticMemberInGenericType
    private static readonly ConcurrentDictionary<string, Type> GetCachedExistingOriginalEntityCustomGetRuntimeTypeFnCachedResultDict = new();

    private readonly Lazy<ILogger> lazyLogger;
    private readonly Lazy<PlatformPersistenceConfiguration<TDbContext>> lazyPersistenceConfiguration;
    private readonly Lazy<IPlatformApplicationRequestContextAccessor> lazyRequestContextAccessor;
    private readonly Lazy<IPlatformRootServiceProvider> lazyRootServiceProvider;

    // PlatformEfCoreDbContext take only options to support context pooling factory
    /// <summary>
    /// Initializes a new instance of the PlatformEfCoreDbContext with Entity Framework Core pooling support and lazy service resolution.
    /// This constructor is specifically designed to support EF Core context pooling, which improves performance by reusing context instances
    /// and reducing the overhead of context creation and disposal in high-throughput scenarios.
    /// </summary>
    /// <param name="options">
    /// The Entity Framework Core configuration options for this database context. Contains connection string, provider configuration,
    /// lazy loading settings, and other EF Core-specific configurations. These options are typically configured in the persistence module
    /// and injected through the dependency injection container.
    /// </param>
    /// <remarks>
    /// <para><strong>EF Core Pooling Support:</strong></para>
    /// <list type="bullet">
    /// <item><description>Constructor signature is restricted to DbContextOptions only to support EF Core context pooling</description></item>
    /// <item><description>Context pooling improves performance by reusing context instances instead of creating new ones for each request</description></item>
    /// <item><description>Pooled contexts are automatically reset between uses to ensure clean state</description></item>
    /// <item><description>Pool size and behavior are configured in the persistence module registration</description></item>
    /// </list>
    ///
    /// <para><strong>Lazy Service Resolution:</strong></para>
    /// <list type="bullet">
    /// <item><description>Services are resolved lazily using this.GetService() to support pooling requirements</description></item>
    /// <item><description>Lazy initialization prevents circular dependencies and reduces constructor overhead</description></item>
    /// <item><description>Service resolution is cached for performance optimization during context lifetime</description></item>
    /// <item><description>Error handling ensures graceful degradation if optional services are not available</description></item>
    /// </list>
    ///
    /// <para><strong>Initialization Process:</strong></para>
    /// <list type="bullet">
    /// <item><description>Persistence configuration is resolved with fallback handling for cross-database scenarios</description></item>
    /// <item><description>Request context accessor is initialized for user auditing and tenant isolation</description></item>
    /// <item><description>Root service provider is configured for dependency resolution during operations</description></item>
    /// <item><description>Logger factory is captured early to ensure availability even after context disposal</description></item>
    /// <item><description>Lazy loading proxy detection is performed to optimize entity tracking behavior</description></item>
    /// </list>
    ///
    /// <para><strong>Thread Safety Considerations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Context thread safety lock is initialized with maximum concurrency of 1</description></item>
    /// <item><description>Service resolution is performed synchronously to avoid async context issues</description></item>
    /// <item><description>Logger factory is captured immediately to prevent disposal-related exceptions</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Optimizations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Lazy service resolution reduces constructor time and improves pooling efficiency</description></item>
    /// <item><description>Exception handling with fallbacks prevents startup failures from optional dependencies</description></item>
    /// <item><description>Cached entity type resolution improves runtime performance for entity operations</description></item>
    /// </list>
    ///
    /// <para><strong>Error Handling:</strong></para>
    /// <list type="bullet">
    /// <item><description>Graceful handling of missing optional services with appropriate fallback values</description></item>
    /// <item><description>Exception catching for service resolution to prevent application startup failures</description></item>
    /// <item><description>Logging initialization with fallback to prevent missing logger factory issues</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Context pooling registration in persistence module
    /// services.AddDbContextPool&lt;MyDbContext&gt;(options =&gt;
    /// {
    ///     options.UseNpgsql(connectionString);
    ///     options.EnableServiceProviderCaching();
    ///     options.UseLazyLoadingProxies();
    /// }, poolSize: 128);
    ///
    /// // Context usage with pooling
    /// using var scope = serviceProvider.CreateScope();
    /// var context = scope.ServiceProvider.GetRequiredService&lt;MyDbContext&gt;();
    /// // Context is retrieved from pool, used, and returned to pool automatically
    /// </code>
    /// </example>
    /// </remarks>
    public PlatformEfCoreDbContext(DbContextOptions<TDbContext> options)
        : base(options)
    {
        // Use lazy because we are using this.GetService to support EfCore pooling => force constructor must take only DbContextOptions<TDbContext>
        lazyPersistenceConfiguration = new Lazy<PlatformPersistenceConfiguration<TDbContext>>(() => Util.TaskRunner.CatchException(
            this.GetService<PlatformPersistenceConfiguration<TDbContext>>,
            (PlatformPersistenceConfiguration<TDbContext>)null)
        );
        lazyRequestContextAccessor = new Lazy<IPlatformApplicationRequestContextAccessor>(this.GetService<IPlatformApplicationRequestContextAccessor>);
        lazyRootServiceProvider = new Lazy<IPlatformRootServiceProvider>(this.GetService<IPlatformRootServiceProvider>);

        // Must get loggerFactory outside lazy factory func then use it inside because when logging the context might be disposed
        // need to get logger factory here first
        var loggerFactory = Util.TaskRunner.CatchException<Exception, ILoggerFactory>(() => this.GetService<ILoggerFactory>(), fallbackValue: null);
        lazyLogger = new Lazy<ILogger>(() => CreateLogger(loggerFactory));

        IsUsingLazyLoadingProxy = options.IsUsingLazyLoadingProxy();
    }

    /// <summary>
    /// Gets or sets a value indicating whether this database context is configured to use Entity Framework Core lazy loading proxies.
    /// Lazy loading proxies automatically load related entities when navigation properties are accessed, improving developer productivity
    /// but potentially impacting performance if not used carefully.
    /// </summary>
    /// <value>
    /// <c>true</c> if lazy loading proxies are enabled and configured for this context; otherwise, <c>false</c>.
    /// </value>
    /// <remarks>
    /// <para><strong>Lazy Loading Proxy Behavior:</strong></para>
    /// <list type="bullet">
    /// <item><description>When enabled, EF Core creates proxy classes that inherit from entity types</description></item>
    /// <item><description>Navigation properties are automatically loaded when accessed, reducing explicit Load() calls</description></item>
    /// <item><description>Requires virtual navigation properties on entity classes to function properly</description></item>
    /// <item><description>Can lead to N+1 query problems if not used with proper query planning</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Implications:</strong></para>
    /// <list type="bullet">
    /// <item><description>Simplifies data access code by reducing explicit loading requirements</description></item>
    /// <item><description>May cause unintended database queries if navigation properties are accessed inadvertently</description></item>
    /// <item><description>Affects entity caching behavior and type resolution in the platform</description></item>
    /// <item><description>Used by platform caching mechanisms to determine entity runtime types</description></item>
    /// </list>
    ///
    /// <para><strong>Platform Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Value is automatically detected from DbContextOptions during initialization</description></item>
    /// <item><description>Used by Unit of Work to determine if context should be kept alive for query execution</description></item>
    /// <item><description>Affects entity type resolution in caching and event handling scenarios</description></item>
    /// <item><description>Influences repository behavior for deferred query execution</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Enable lazy loading in context configuration
    /// services.AddDbContext&lt;MyContext&gt;(options =&gt;
    /// {
    ///     options.UseNpgsql(connectionString);
    ///     options.UseLazyLoadingProxies(); // Enables lazy loading
    /// });
    ///
    /// // Entity with virtual navigation properties
    /// public class Order
    /// {
    ///     public int Id { get; set; }
    ///     public virtual Customer Customer { get; set; } // Will be lazy loaded
    ///     public virtual ICollection&lt;OrderItem&gt; Items { get; set; } // Will be lazy loaded
    /// }
    /// </code>
    /// </example>
    /// </remarks>
    public bool IsUsingLazyLoadingProxy { get; set; }

    /// <summary>
    /// Gets the platform persistence configuration for this database context, providing access to database-specific settings,
    /// connection parameters, and behavioral configurations used throughout the persistence layer.
    /// </summary>
    /// <value>
    /// The persistence configuration instance for this context type, or <c>null</c> if not available (typically in cross-database migration scenarios).
    /// </value>
    /// <remarks>
    /// <para><strong>Configuration Scope:</strong></para>
    /// <list type="bullet">
    /// <item><description>Contains database connection settings, retry policies, and timeout configurations</description></item>
    /// <item><description>Includes behavioral flags such as ForCrossDbMigrationOnly for special migration scenarios</description></item>
    /// <item><description>Provides access to assembly scanning configuration for entity discovery</description></item>
    /// <item><description>May be null in cross-database migration contexts where full configuration is not needed</description></item>
    /// </list>
    ///
    /// <para><strong>Lazy Resolution:</strong></para>
    /// <list type="bullet">
    /// <item><description>Resolved lazily to support EF Core context pooling requirements</description></item>
    /// <item><description>Uses exception handling to gracefully handle missing configurations</description></item>
    /// <item><description>Cached after first access for performance optimization</description></item>
    /// <item><description>Resolution occurs through the context's service provider</description></item>
    /// </list>
    ///
    /// <para><strong>Usage Scenarios:</strong></para>
    /// <list type="bullet">
    /// <item><description>Entity configuration loading and assembly scanning operations</description></item>
    /// <item><description>Database initialization and migration control logic</description></item>
    /// <item><description>Connection string and provider-specific configuration access</description></item>
    /// <item><description>Cross-database migration coordination and control</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Accessing configuration in derived context
    /// protected override void OnModelCreating(ModelBuilder modelBuilder)
    /// {
    ///     base.OnModelCreating(modelBuilder);
    ///
    ///     if (PersistenceConfiguration?.ForCrossDbMigrationOnly == true)
    ///     {
    ///         // Skip entity configuration for migration-only scenarios
    ///         return;
    ///     }
    ///
    ///     // Apply full entity configuration
    ///     ApplyEntityConfigurationsFromAssembly(modelBuilder);
    /// }
    /// </code>
    /// </example>
    /// </remarks>
    protected PlatformPersistenceConfiguration<TDbContext>? PersistenceConfiguration => lazyPersistenceConfiguration.Value;

    /// <summary>
    /// Gets the root service provider instance used for dependency resolution throughout database operations.
    /// This service provider provides access to platform services, repositories, and other dependencies needed
    /// for advanced database operations including event handling, caching, and cross-service communication.
    /// </summary>
    /// <value>
    /// The root service provider instance configured for this context, providing access to the complete dependency injection container.
    /// </value>
    /// <remarks>
    /// <para><strong>Service Resolution Capabilities:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides access to CQRS services for entity event handling and message dispatch</description></item>
    /// <item><description>Resolves repository instances and unit of work implementations</description></item>
    /// <item><description>Enables access to caching services and distributed cache implementations</description></item>
    /// <item><description>Supports cross-service communication through message bus and API clients</description></item>
    /// </list>
    ///
    /// <para><strong>Platform Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Used by entity event handling to resolve event handlers and processors</description></item>
    /// <item><description>Enables dependency injection for data migration and initialization processes</description></item>
    /// <item><description>Supports scoped service creation for isolated operations and cross-context scenarios</description></item>
    /// <item><description>Provides access to logging, configuration, and monitoring services</description></item>
    /// </list>
    ///
    /// <para><strong>Lazy Resolution:</strong></para>
    /// <list type="bullet">
    /// <item><description>Resolved lazily through the context's GetService method to support pooling</description></item>
    /// <item><description>Cached after first access to improve performance for repeated operations</description></item>
    /// <item><description>Provides consistent service provider instance throughout context lifetime</description></item>
    /// </list>
    ///
    /// <para><strong>Usage Scenarios:</strong></para>
    /// <list type="bullet">
    /// <item><description>Entity event handling and CQRS event dispatch operations</description></item>
    /// <item><description>Cross-context data access and repository coordination</description></item>
    /// <item><description>Background job scheduling and execution coordination</description></item>
    /// <item><description>Data migration and initialization dependency resolution</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Using root service provider for scoped operations
    /// await RootServiceProvider.ExecuteInjectScopedAsync&lt;MyService&gt;(async service =&gt;
    /// {
    ///     await service.ProcessDataAsync();
    /// });
    ///
    /// // Resolving services for event handling
    /// var eventHandler = RootServiceProvider.GetRequiredService&lt;IEntityEventHandler&gt;();
    /// await eventHandler.HandleAsync(entityEvent);
    /// </code>
    /// </example>
    /// </remarks>
    protected IPlatformRootServiceProvider RootServiceProvider => lazyRootServiceProvider.Value;

    /// <summary>
    /// Gets the current request context accessor used for retrieving user information, tenant data, and request-specific
    /// metadata throughout database operations. This accessor provides consistent access to the current request context
    /// whether it's set manually or resolved from the dependency injection container.
    /// </summary>
    /// <value>
    /// The request context accessor instance, either the explicitly set CurrentRequestContextAccessor or the lazily resolved instance.
    /// </value>
    /// <remarks>
    /// <para><strong>Request Context Information:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides access to current user ID and authentication information for audit trails</description></item>
    /// <item><description>Contains tenant information for multi-tenant application scenarios</description></item>
    /// <item><description>Includes request correlation IDs for distributed tracing and logging</description></item>
    /// <item><description>Offers custom key-value pairs for request-specific metadata and configuration</description></item>
    /// </list>
    ///
    /// <para><strong>Audit Trail Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically populates CreatedBy and LastUpdatedBy fields on audited entities</description></item>
    /// <item><description>Supports different user ID types (string, int, Guid) through generic type resolution</description></item>
    /// <item><description>Provides consistent user information across all entity operations</description></item>
    /// <item><description>Enables tenant-aware data operations and filtering</description></item>
    /// </list>
    ///
    /// <para><strong>Context Resolution Strategy:</strong></para>
    /// <list type="bullet">
    /// <item><description>First checks for explicitly set CurrentRequestContextAccessor for manual context control</description></item>
    /// <item><description>Falls back to lazy-resolved instance from dependency injection for normal operations</description></item>
    /// <item><description>Provides consistent behavior across different execution contexts and scenarios</description></item>
    /// <item><description>Supports both HTTP request contexts and background job execution contexts</description></item>
    /// </list>
    ///
    /// <para><strong>Usage Scenarios:</strong></para>
    /// <list type="bullet">
    /// <item><description>Entity audit trail population during Create and Update operations</description></item>
    /// <item><description>Tenant-aware data filtering and query customization</description></item>
    /// <item><description>Event metadata population for CQRS event handling</description></item>
    /// <item><description>Cross-service request correlation and tracking</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Automatic audit trail population
    /// var user = new User { Name = "John Doe" };
    /// await CreateAsync&lt;User, string&gt;(user);
    /// // user.CreatedBy is automatically set from RequestContextAccessor.Current.UserId()
    ///
    /// // Manual context override for background operations
    /// context.CurrentRequestContextAccessor = backgroundContextAccessor;
    /// await ProcessBackgroundDataAsync();
    /// </code>
    /// </example>
    /// </remarks>
    protected IPlatformApplicationRequestContextAccessor RequestContextAccessor => CurrentRequestContextAccessor ?? lazyRequestContextAccessor.Value;

    /// <summary>
    /// Gets the semaphore used to ensure thread-safe access to database context operations.
    /// This semaphore prevents concurrent access to the Entity Framework Core context, which is not thread-safe by design,
    /// ensuring data consistency and preventing change tracking conflicts during database operations.
    /// </summary>
    /// <value>
    /// A SemaphoreSlim instance configured with a maximum count of <see cref="ContextMaxConcurrentThreadLock"/> to control concurrent access.
    /// </value>
    /// <remarks>
    /// <para><strong>Thread Safety Enforcement:</strong></para>
    /// <list type="bullet">
    /// <item><description>Limits concurrent access to 1 thread to prevent EF Core context threading issues</description></item>
    /// <item><description>Protects change tracking operations from concurrent modification</description></item>
    /// <item><description>Ensures transaction isolation and prevents data corruption scenarios</description></item>
    /// <item><description>Serializes database operations to maintain consistency and reliability</description></item>
    /// </list>
    ///
    /// <para><strong>Operation Protection:</strong></para>
    /// <list type="bullet">
    /// <item><description>Guards all Create, Update, Delete operations to prevent tracking conflicts</description></item>
    /// <item><description>Protects bulk operations that modify multiple entities simultaneously</description></item>
    /// <item><description>Ensures safe entity detachment and attachment operations</description></item>
    /// <item><description>Coordinates access during complex query and modification scenarios</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Considerations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Serializes operations to prevent threading overhead and context switching costs</description></item>
    /// <item><description>Reduces memory allocation from concurrent context creation</description></item>
    /// <item><description>Simplifies error handling by avoiding complex concurrent failure scenarios</description></item>
    /// <item><description>Enables context pooling optimization by ensuring single-threaded usage</description></item>
    /// </list>
    ///
    /// <para><strong>Usage Pattern:</strong></para>
    /// <list type="bullet">
    /// <item><description>Acquired using WaitAsync() before database operations begin</description></item>
    /// <item><description>Released using TryRelease() after operations complete or in finally blocks</description></item>
    /// <item><description>Automatically managed by platform entity operation methods</description></item>
    /// <item><description>Supports cancellation tokens for operation timeouts and cancellation</description></item>
    /// </list>
    ///
    /// <para><strong>Error Handling:</strong></para>
    /// <list type="bullet">
    /// <item><description>Always released in finally blocks to prevent deadlocks</description></item>
    /// <item><description>Includes current count checking to prevent over-release scenarios</description></item>
    /// <item><description>Supports timeout scenarios through cancellation token integration</description></item>
    /// <item><description>Graceful handling of disposal and cleanup scenarios</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Typical usage pattern in entity operations
    /// try
    /// {
    ///     await ContextThreadSafeLock.WaitAsync(cancellationToken);
    ///
    ///     // Perform database operations safely
    ///     var entity = new MyEntity();
    ///     GetTable&lt;MyEntity&gt;().Add(entity);
    /// }
    /// finally
    /// {
    ///     ContextThreadSafeLock.TryRelease();
    /// }
    /// </code>
    /// </example>
    /// </remarks>
    protected SemaphoreSlim ContextThreadSafeLock { get; } = new(ContextMaxConcurrentThreadLock, ContextMaxConcurrentThreadLock);

    /// <summary>
    /// Gets or sets a value indicating whether database schema migration should be disabled during context initialization.
    /// When set to <c>true</c>, the automatic database migration process is skipped, allowing for manual control
    /// over database schema updates or supporting scenarios where migrations are handled externally.
    /// </summary>
    /// <value>
    /// <c>true</c> if database schema migration should be disabled during initialization; otherwise, <c>false</c>.
    /// The default value is <c>false</c>, enabling automatic migrations.
    /// </value>
    /// <remarks>
    /// <para><strong>Migration Control:</strong></para>
    /// <list type="bullet">
    /// <item><description>Controls whether Database.MigrateAsync() is called during context initialization</description></item>
    /// <item><description>Useful for environments where database schema is managed externally (e.g., DBA-controlled environments)</description></item>
    /// <item><description>Supports scenarios where migrations are applied through CI/CD pipelines rather than application startup</description></item>
    /// <item><description>Enables faster application startup in environments where migrations are not needed</description></item>
    /// </list>
    ///
    /// <para><strong>Use Cases:</strong></para>
    /// <list type="bullet">
    /// <item><description>Production environments where database changes are applied through separate migration processes</description></item>
    /// <item><description>Development scenarios where database schema is maintained manually or through external tools</description></item>
    /// <item><description>Testing environments where database setup is handled by test infrastructure</description></item>
    /// <item><description>Cross-database migration scenarios where selective migration control is required</description></item>
    /// </list>
    ///
    /// <para><strong>Impact on Initialization:</strong></para>
    /// <list type="bullet">
    /// <item><description>When true, skips the Database.MigrateAsync() call but still processes data migrations</description></item>
    /// <item><description>Application data migration history is still maintained and processed</description></item>
    /// <item><description>Context initialization continues with other setup operations</description></item>
    /// <item><description>Does not affect entity configuration or other context setup processes</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Override in derived context for production environments
    /// public class ProductionDbContext : PlatformEfCoreDbContext&lt;ProductionDbContext&gt;
    /// {
    ///     public override bool DisableDbSchemaMigrateOnInitialize =&gt; true; // Disable auto-migration
    ///
    ///     public ProductionDbContext(DbContextOptions&lt;ProductionDbContext&gt; options) : base(options) { }
    /// }
    ///
    /// // Environment-specific configuration
    /// public override bool DisableDbSchemaMigrateOnInitialize =&gt;
    ///     Environment.GetEnvironmentVariable("DISABLE_AUTO_MIGRATION") == "true";
    /// </code>
    /// </example>
    /// </remarks>
    public virtual bool DisableDbSchemaMigrateOnInitialize => false;

    /// <summary>
    /// Gets or sets the unit of work instance that this database context is associated with.
    /// This property enables coordination between the context and the unit of work pattern for transaction management,
    /// entity caching, and cross-repository operation coordination within the platform architecture.
    /// </summary>
    /// <value>
    /// The platform unit of work instance that manages this context, or <c>null</c> if the context is not associated with a unit of work.
    /// </value>
    /// <remarks>
    /// <para><strong>Unit of Work Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Enables coordination between multiple repositories within a single transaction scope</description></item>
    /// <item><description>Provides centralized transaction management and rollback capabilities</description></item>
    /// <item><description>Supports entity caching and change tracking across repository boundaries</description></item>
    /// <item><description>Facilitates cross-aggregate operations while maintaining consistency</description></item>
    /// </list>
    ///
    /// <para><strong>Entity Caching:</strong></para>
    /// <list type="bullet">
    /// <item><description>Unit of work maintains cached entities to prevent duplicate loads and tracking conflicts</description></item>
    /// <item><description>Cache is automatically cleared after successful SaveChangesAsync() operations</description></item>
    /// <item><description>Provides GetCachedExistingOriginalEntity() for retrieving previously loaded entities</description></item>
    /// <item><description>Supports SetCachedExistingOriginalEntity() for optimizing entity operation performance</description></item>
    /// </list>
    ///
    /// <para><strong>Transaction Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description>Ensures all repository operations within the unit of work participate in the same transaction</description></item>
    /// <item><description>Supports atomic operations across multiple aggregates and entity types</description></item>
    /// <item><description>Provides consistent error handling and rollback behavior</description></item>
    /// <item><description>Enables complex business operations that span multiple data access operations</description></item>
    /// </list>
    ///
    /// <para><strong>Lifecycle Management:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically set by unit of work implementations during context creation</description></item>
    /// <item><description>Used to coordinate context disposal and cleanup operations</description></item>
    /// <item><description>Supports nested unit of work scenarios for complex operation hierarchies</description></item>
    /// <item><description>Enables context pooling optimization through unit of work coordination</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Unit of work usage pattern
    /// using var unitOfWork = serviceProvider.GetRequiredService&lt;IPlatformUnitOfWork&gt;();
    /// var context = unitOfWork.DbContext; // Context has MappedUnitOfWork set
    ///
    /// // Multiple repository operations in single transaction
    /// var userRepo = new UserRepository(contextOptions, serviceProvider);
    /// var orderRepo = new OrderRepository(contextOptions, serviceProvider);
    ///
    /// await userRepo.CreateAsync(user);
    /// await orderRepo.CreateAsync(order);
    /// await unitOfWork.SaveChangesAsync(); // Commits all changes atomically
    ///
    /// // Entity caching through unit of work
    /// var cachedUser = unitOfWork.GetCachedExistingOriginalEntity&lt;User&gt;(userId);
    /// </code>
    /// </example>
    /// </remarks>
    public IPlatformUnitOfWork? MappedUnitOfWork { get; set; }

    /// <summary>
    /// Gets the logger instance used for database context operations, providing structured logging capabilities
    /// for database operations, performance monitoring, error tracking, and debugging support throughout
    /// the Entity Framework Core data access layer.
    /// </summary>
    /// <value>
    /// The logger instance configured for this database context type, with appropriate category and naming conventions.
    /// </value>
    /// <remarks>
    /// <para><strong>Logging Categories:</strong></para>
    /// <list type="bullet">
    /// <item><description>Uses category name combining generic base type and concrete context type for clear identification</description></item>
    /// <item><description>Provides structured logging with consistent format across all platform database contexts</description></item>
    /// <item><description>Enables filtering and routing of database-specific log messages</description></item>
    /// <item><description>Supports correlation with EF Core's built-in logging for comprehensive database monitoring</description></item>
    /// </list>
    ///
    /// <para><strong>Logging Scenarios:</strong></para>
    /// <list type="bullet">
    /// <item><description>Database initialization and migration status tracking</description></item>
    /// <item><description>Entity operation performance monitoring and timing</description></item>
    /// <item><description>Error logging with full exception details and stack traces</description></item>
    /// <item><description>Debug information for complex query and entity operations</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Monitoring:</strong></para>
    /// <list type="bullet">
    /// <item><description>Tracks database operation timing and performance characteristics</description></item>
    /// <item><description>Logs slow operations and potential performance bottlenecks</description></item>
    /// <item><description>Provides metrics for context pooling and resource utilization</description></item>
    /// <item><description>Enables correlation with application performance monitoring systems</description></item>
    /// </list>
    ///
    /// <para><strong>Lazy Initialization:</strong></para>
    /// <list type="bullet">
    /// <item><description>Logger is resolved lazily to support context pooling and early disposal scenarios</description></item>
    /// <item><description>Logger factory is captured during constructor to ensure availability throughout context lifetime</description></item>
    /// <item><description>Handles missing logger factory gracefully with appropriate fallback behavior</description></item>
    /// <item><description>Cached after first access to improve performance for repeated logging operations</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Typical logging usage in database operations
    /// Logger.LogInformation("Initializing database context {ContextType}", GetType().Name);
    ///
    /// try
    /// {
    ///     await Database.MigrateAsync();
    ///     Logger.LogInformation("Database migration completed successfully");
    /// }
    /// catch (Exception ex)
    /// {
    ///     Logger.LogError(ex, "Database migration failed for context {ContextType}", GetType().Name);
    ///     throw;
    /// }
    ///
    /// // Performance logging
    /// var stopwatch = Stopwatch.StartNew();
    /// await SomeExpensiveOperation();
    /// Logger.LogWarning("Operation took {ElapsedMs}ms, consider optimization", stopwatch.ElapsedMilliseconds);
    /// </code>
    /// </example>
    /// </remarks>
    public ILogger Logger => lazyLogger.Value;

    /// <summary>
    /// Gets the name used for the database initialized migration history entry.
    /// This name identifies the special migration history record that marks when the database
    /// was first initialized and is ready for application data operations.
    /// </summary>
    /// <value>
    /// The migration history name for database initialization tracking.
    /// Defaults to <see cref="PlatformDataMigrationHistory.DefaultDbInitializedMigrationHistoryName"/>.
    /// </value>
    /// <remarks>
    /// <para><strong>Initialization Tracking:</strong></para>
    /// <list type="bullet">
    /// <item><description>Marks the completion of database schema migration and initial setup</description></item>
    /// <item><description>Used to determine if the database is ready for application data operations</description></item>
    /// <item><description>Serves as a baseline for subsequent data migration operations</description></item>
    /// <item><description>Enables conditional data migration logic based on database initialization status</description></item>
    /// </list>
    ///
    /// <para><strong>Migration Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides a consistent marker across all platform database contexts</description></item>
    /// <item><description>Enables cross-database migration scenarios with proper sequencing</description></item>
    /// <item><description>Supports rollback and recovery operations during database initialization</description></item>
    /// <item><description>Facilitates database state validation in complex deployment scenarios</description></item>
    /// </list>
    ///
    /// <para><strong>Customization:</strong></para>
    /// <list type="bullet">
    /// <item><description>Can be overridden in derived contexts for custom initialization tracking</description></item>
    /// <item><description>Supports environment-specific naming conventions for migration tracking</description></item>
    /// <item><description>Enables integration with external database management systems</description></item>
    /// <item><description>Allows for version-specific initialization tracking in complex deployment scenarios</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Custom initialization marker for specific environments
    /// public override string DbInitializedMigrationHistoryName =&gt;
    ///     $"{base.DbInitializedMigrationHistoryName}_v{ApplicationVersion}";
    ///
    /// // Environment-specific naming
    /// public override string DbInitializedMigrationHistoryName =&gt;
    ///     Environment.IsDevelopment() ? "DevDbInitialized" : "DbInitialized";
    ///
    /// // Checking initialization status
    /// var isInitialized = await DataMigrationHistoryQuery()
    ///     .AnyAsync(h =&gt; h.Name == DbInitializedMigrationHistoryName);
    /// </code>
    /// </example>
    /// </remarks>
    public virtual string DbInitializedMigrationHistoryName => PlatformDataMigrationHistory.DefaultDbInitializedMigrationHistoryName;

    /// <summary>
    /// Gets or sets the request context accessor instance that can be manually overridden for specific operations.
    /// This property allows temporary substitution of the request context for scenarios such as background jobs,
    /// system operations, or cross-tenant administrative tasks that require different user context information.
    /// </summary>
    /// <value>
    /// The manually set request context accessor, or <c>null</c> if using the default lazy-resolved instance.
    /// </value>
    /// <remarks>
    /// <para><strong>Context Override Scenarios:</strong></para>
    /// <list type="bullet">
    /// <item><description>Background job execution where no HTTP request context is available</description></item>
    /// <item><description>System-level operations that require elevated or service account permissions</description></item>
    /// <item><description>Cross-tenant administrative operations requiring different tenant context</description></item>
    /// <item><description>Data migration operations that need to run under specific user contexts</description></item>
    /// </list>
    ///
    /// <para><strong>Fallback Behavior:</strong></para>
    /// <list type="bullet">
    /// <item><description>When null, the RequestContextAccessor property uses the lazy-resolved instance</description></item>
    /// <item><description>When set, overrides the default context accessor for all database operations</description></item>
    /// <item><description>Provides consistent context information throughout the lifetime of the override</description></item>
    /// <item><description>Automatically used by audit trail and entity event handling operations</description></item>
    /// </list>
    ///
    /// <para><strong>Thread Safety:</strong></para>
    /// <list type="bullet">
    /// <item><description>Context override is scoped to the specific database context instance</description></item>
    /// <item><description>Multiple contexts can have different overrides simultaneously</description></item>
    /// <item><description>Changes take effect immediately for subsequent database operations</description></item>
    /// <item><description>Does not affect other context instances or global request context state</description></item>
    /// </list>
    ///
    /// <para><strong>Usage Best Practices:</strong></para>
    /// <list type="bullet">
    /// <item><description>Set override before performing operations that require specific user context</description></item>
    /// <item><description>Clear override (set to null) after completing special operations</description></item>
    /// <item><description>Use scoped contexts when override is needed for limited operations</description></item>
    /// <item><description>Document override usage for maintainability and debugging</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Background job context override
    /// public async Task ProcessBackgroundDataAsync(string systemUserId)
    /// {
    ///     using var scope = serviceProvider.CreateScope();
    ///     var context = scope.ServiceProvider.GetRequiredService&lt;MyDbContext&gt;();
    ///
    ///     // Override with system context
    ///     context.CurrentRequestContextAccessor = CreateSystemContext(systemUserId);
    ///
    ///     // All operations will use the system context
    ///     await context.CreateAsync&lt;Entity, string&gt;(entity);
    ///     await context.SaveChangesAsync();
    /// }
    ///
    /// // Cross-tenant administrative operation
    /// context.CurrentRequestContextAccessor = CreateAdminContext(targetTenantId);
    /// await PerformCrossTenantOperation();
    /// context.CurrentRequestContextAccessor = null; // Restore default
    /// </code>
    /// </example>
    /// </remarks>
    public IPlatformApplicationRequestContextAccessor? CurrentRequestContextAccessor { get; set; }

    /// <summary>
    /// Executes application data migrations for this database context using the provided service provider.
    /// This method coordinates the execution of custom data migration operations that need to run after
    /// schema migrations to populate or transform application data.
    /// </summary>
    /// <param name="serviceProvider">The service provider used to resolve migration dependencies and services.</param>
    /// <returns>A task representing the asynchronous migration operation.</returns>
    /// <remarks>
    /// <para><strong>Migration Coordination:</strong></para>
    /// <list type="bullet">
    /// <item><description>Delegates to the platform data migration infrastructure for execution</description></item>
    /// <item><description>Uses both context-scoped and root service providers for dependency resolution</description></item>
    /// <item><description>Coordinates with database initialization process to ensure proper sequencing</description></item>
    /// <item><description>Maintains migration history for tracking completed migration operations</description></item>
    /// </list>
    ///
    /// <para><strong>Integration with Platform:</strong></para>
    /// <list type="bullet">
    /// <item><description>Called automatically during context initialization process</description></item>
    /// <item><description>Executes after schema migrations but before context is ready for operations</description></item>
    /// <item><description>Supports cross-database migration scenarios with proper service resolution</description></item>
    /// <item><description>Enables complex data transformation operations during application upgrades</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Typically called during context initialization
    /// public override async Task Initialize(IServiceProvider serviceProvider)
    /// {
    ///     await base.Initialize(serviceProvider);
    ///     await MigrateDataAsync(serviceProvider);
    /// }
    /// </code>
    /// </example>
    /// </remarks>
    public Task MigrateDataAsync(IServiceProvider serviceProvider)
    {
        return this.As<IPlatformDbContext>().MigrateDataAsync<TDbContext>(serviceProvider, RootServiceProvider);
    }

    public async Task UpsertOneDataMigrationHistoryAsync(PlatformDataMigrationHistory entity, CancellationToken cancellationToken = default)
    {
        var existingEntity = await DataMigrationHistoryDbSet().AsNoTracking().Where(p => p.Name == entity.Name).FirstOrDefaultAsync(cancellationToken);

        if (existingEntity == null)
            await DataMigrationHistoryDbSet().AddAsync(entity, cancellationToken);
        else
        {
            if (entity is IRowVersionEntity { ConcurrencyUpdateToken: null })
                entity.As<IRowVersionEntity>().ConcurrencyUpdateToken = existingEntity.As<IRowVersionEntity>().ConcurrencyUpdateToken;

            // Run DetachLocalIfAny to prevent
            // The instance of entity type cannot be tracked because another instance of this type with the same key is already being tracked
            var toBeUpdatedEntity = entity.Pipe(entity => DetachLocalIfAnyDifferentTrackedEntity(entity, p => p.Name == entity.Name, existingEntity).entity);

            DataMigrationHistoryDbSet()
                .Update(toBeUpdatedEntity)
                .Entity.Pipe(p => p.With(dataMigrationHistory => dataMigrationHistory.ConcurrencyUpdateToken = Ulid.NewUlid().ToString()));
        }
    }

    public IQueryable<PlatformDataMigrationHistory> DataMigrationHistoryQuery()
    {
        return DataMigrationHistoryDbSet().AsQueryable().AsNoTracking();
    }

    public async Task ExecuteWithNewDbContextInstanceAsync(Func<IPlatformDbContext, Task> fn)
    {
        await RootServiceProvider.ExecuteInjectScopedAsync(async (TDbContext context) => await fn(context));
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await base.SaveChangesAsync(cancellationToken);

            MappedUnitOfWork?.ClearCachedExistingOriginalEntity();

            return result;
        }
        catch (DbUpdateConcurrencyException ex)
        {
            ChangeTracker
                .Entries()
                .Where(p => p.State == EntityState.Modified || p.State == EntityState.Added || p.State == EntityState.Deleted)
                .Select(p => p.Entity.As<IEntity>()?.GetId()?.ToString())
                .WhereNotNull()
                .ForEach(id => MappedUnitOfWork?.RemoveCachedExistingOriginalEntity(id));
            ChangeTracker.Clear();

            throw new PlatformDomainRowVersionConflictException($"Save changes has conflicted version. {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Creates a queryable interface for the specified entity type with change tracking enabled.
    /// This method provides the foundation for building LINQ queries against entity sets
    /// while maintaining full Entity Framework Core change tracking capabilities.
    /// </summary>
    /// <typeparam name="TEntity">The entity type that implements IEntity interface.</typeparam>
    /// <returns>An IQueryable interface for the specified entity type with change tracking enabled.</returns>
    /// <remarks>
    /// <para><strong>Query Foundation:</strong></para>
    /// <list type="bullet">
    /// <item><description>Provides tracked queryable interface for entity modification scenarios</description></item>
    /// <item><description>Enables complex LINQ operations with full EF Core query translation</description></item>
    /// <item><description>Supports join operations, filtering, ordering, and projection</description></item>
    /// <item><description>Maintains entity change tracking for update and delete operations</description></item>
    /// </list>
    ///
    /// <para><strong>Change Tracking Behavior:</strong></para>
    /// <list type="bullet">
    /// <item><description>Entities loaded through this query are automatically tracked by the context</description></item>
    /// <item><description>Modifications to tracked entities are detected during SaveChanges operations</description></item>
    /// <item><description>Supports lazy loading proxy integration when configured</description></item>
    /// <item><description>Enables optimistic concurrency checking for versioned entities</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Considerations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Change tracking adds memory overhead for loaded entities</description></item>
    /// <item><description>Consider using AsNoTracking() extension for read-only scenarios</description></item>
    /// <item><description>Tracked queries support modification scenarios but have higher memory usage</description></item>
    /// <item><description>Automatic proxy creation may impact performance for large entity graphs</description></item>
    /// </list>
    /// </remarks>
    public IQueryable<TEntity> GetQuery<TEntity>()
        where TEntity : class, IEntity
    {
        return Set<TEntity>().AsQueryable();
    }

    public void RunCommand(string command)
    {
        Database.ExecuteSqlRaw(command);
    }

    public virtual async Task Initialize(IServiceProvider serviceProvider)
    {
        // Store stack trace before call Database.MigrateAsync() to keep the original stack trace to log
        // after Database.MigrateAsync() will lose full stack trace (may because it connects async to other external service)
        // var fullStackTrace = PlatformEnvironment.StackTrace();

        try
        {
            if (!DisableDbSchemaMigrateOnInitialize)
                await Database.With(p => p.SetCommandTimeout(1.Days())).MigrateAsync();
            await InsertDbInitializedApplicationDataMigrationHistory();
            await SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Logger.LogError(ex.BeautifyStackTrace(), "PlatformEfCoreDbContext {Type} Initialize failed.", GetType().Name);

            throw new Exception($"{GetType().Name} Initialize failed.", ex);
        }

        async Task InsertDbInitializedApplicationDataMigrationHistory()
        {
            if (!await DataMigrationHistoryDbSet().AnyAsync(p => p.Name == DbInitializedMigrationHistoryName))
            {
                await DataMigrationHistoryDbSet()
                    .AddAsync(new PlatformDataMigrationHistory(DbInitializedMigrationHistoryName) { Status = PlatformDataMigrationHistory.Statuses.Processed });
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
        return GetQuery<TEntity>().WhereIf(predicate != null, predicate).CountAsync(cancellationToken);
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
        return GetQuery<TEntity>().WhereIf(predicate != null, predicate).Take(1).AnyAsync(cancellationToken);
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

    public Task<List<TEntity>> CreateManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return entities
            .ParallelAsync(entity => CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken), maxConcurrent: 1)
            .ThenActionIfAsync(
                !dismissSendEvent,
                entities => SendBulkEntitiesEvent<TEntity, TPrimaryKey>(entities, PlatformCqrsEntityEventCrudAction.Created, eventCustomConfig, cancellationToken)
            );
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

    public Task<List<TEntity>> UpdateManyAsync<TEntity, TPrimaryKey>(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return entities
            .ParallelAsync(entity => UpdateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken), maxConcurrent: 1)
            .ThenActionIfAsync(
                !dismissSendEvent,
                entities => SendBulkEntitiesEvent<TEntity, TPrimaryKey>(entities, PlatformCqrsEntityEventCrudAction.Updated, eventCustomConfig, cancellationToken)
            );
    }

    public async Task<TEntity> DeleteAsync<TEntity, TPrimaryKey>(
        TPrimaryKey entityId,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var entity = await ContextThreadSafeLock.ExecuteLockActionAsync(
            () => GetQuery<TEntity>().FirstOrDefaultAsync(p => p.Id.Equals(entityId), cancellationToken),
            cancellationToken: cancellationToken
        );

        if (entity != null)
            await DeleteAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken);

        return entity;
    }

    public async Task<TEntity> DeleteAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return await ContextThreadSafeLock.ExecuteLockActionAsync(
            async () =>
            {
                DetachLocalIfAnyDifferentTrackedEntity<TEntity, TPrimaryKey>(entity, null);

                var result = await PlatformCqrsEntityEvent.ExecuteWithSendingDeleteEntityEvent<TEntity, TPrimaryKey, TEntity>(
                    RootServiceProvider,
                    MappedUnitOfWork,
                    entity,
                    async entity =>
                    {
                        GetTable<TEntity>().Remove(entity);

                        ContextThreadSafeLock.TryRelease();

                        return entity;
                    },
                    dismissSendEvent,
                    eventCustomConfig,
                    () => RequestContextAccessor.Current.GetAllKeyValues(),
                    PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                    cancellationToken
                );

                return result;
            },
            cancellationToken,
            isManuallyReleaseLockInAction: true
        );
    }

    public async Task<List<TPrimaryKey>> DeleteManyAsync<TEntity, TPrimaryKey>(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (entityIds.Count == 0)
            return entityIds;

        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
            return await DeleteManyAsync<TEntity, TPrimaryKey>(p => entityIds.Contains(p.Id), true, eventCustomConfig, cancellationToken).Then(() => entityIds);

        var entities = await ContextThreadSafeLock.ExecuteLockActionAsync(
            () => GetAllAsync(GetQuery<TEntity>().Where(p => entityIds.Contains(p.Id)), cancellationToken),
            cancellationToken
        );

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

            return await DeleteManyAsync<TEntity, TPrimaryKey>(deleteEntitiesPredicate, dismissSendEvent, eventCustomConfig, cancellationToken).Then(_ => entities);
        }

        return await entities
            .ParallelAsync(entity => DeleteAsync<TEntity, TPrimaryKey>(entity, false, eventCustomConfig, cancellationToken), maxConcurrent: 1)
            .ThenActionAsync(entities => SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
                entities,
                PlatformCqrsEntityEventCrudAction.Deleted,
                eventCustomConfig,
                cancellationToken));
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
        {
            return await ContextThreadSafeLock.ExecuteLockActionAsync(
                async () =>
                {
                    var result = await GetTable<TEntity>().Where(predicate).ExecuteDeleteAsync(cancellationToken);

                    return result;
                },
                cancellationToken
            );
        }

        var entities = await ContextThreadSafeLock.ExecuteLockActionAsync(() => GetAllAsync(GetQuery<TEntity>().Where(predicate), cancellationToken), cancellationToken);

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
        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(RootServiceProvider))
        {
            return await ContextThreadSafeLock.ExecuteLockActionAsync(
                async () =>
                {
                    var result = await queryBuilder(GetTable<TEntity>()).ExecuteDeleteAsync(cancellationToken);

                    return result;
                },
                cancellationToken
            );
        }

        var entities = await ContextThreadSafeLock.ExecuteLockActionAsync(() => GetAllAsync(queryBuilder(GetQuery<TEntity>()), cancellationToken), cancellationToken);

        return await DeleteManyAsync<TEntity, TPrimaryKey>(entities, false, eventCustomConfig, cancellationToken).Then(_ => entities.Count);
    }

    public async Task<TEntity> CreateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return await ContextThreadSafeLock.ExecuteLockActionAsync(
            async () =>
            {
                var toBeCreatedEntity = entity
                    .Pipe(entity => DetachLocalIfAnyDifferentTrackedEntity<TEntity, TPrimaryKey>(entity, null).entity)
                    .PipeIf(
                        entity.IsAuditedUserEntity(),
                        p => p.As<IUserAuditedEntity>().SetCreatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType())).As<TEntity>()
                    )
                    .WithIf(
                        entity is IRowVersionEntity { ConcurrencyUpdateToken: null },
                        entity => entity.As<IRowVersionEntity>().ConcurrencyUpdateToken = Ulid.NewUlid().ToString()
                    );

                var result = await PlatformCqrsEntityEvent.ExecuteWithSendingCreateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                    RootServiceProvider,
                    MappedUnitOfWork,
                    toBeCreatedEntity,
                    async _ =>
                    {
                        // Track navigation properties properly before AddAsync to prevent cascade insertion
                        await TrackNavigationPropertiesBeforeAddAsync(toBeCreatedEntity, cancellationToken);

                        var result = await GetTable<TEntity>().AddAsync(toBeCreatedEntity, cancellationToken).AsTask().Then(_ => toBeCreatedEntity);

                        ContextThreadSafeLock.TryRelease();

                        return result;
                    },
                    dismissSendEvent,
                    eventCustomConfig,
                    () => RequestContextAccessor.Current.GetAllKeyValues(),
                    PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                    cancellationToken
                );

                return result;
            },
            cancellationToken,
            isManuallyReleaseLockInAction: true
        );
    }

    /// <summary>
    /// Asynchronously creates a new entity if it doesn't exist, or updates an existing entity if it does exist.
    /// This simplified overload provides intelligent upsert functionality using custom existence predicates
    /// without requiring a pre-loaded existing entity parameter.
    /// </summary>
    /// <typeparam name="TEntity">The entity type that implements IEntity&lt;TPrimaryKey&gt; and has a parameterless constructor.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key for the entity.</typeparam>
    /// <param name="entity">The entity to create or update. Its properties will be used for the operation.</param>
    /// <param name="customCheckExistingPredicate">Optional custom predicate for checking entity existence. If null, uses IUniqueCompositeIdSupport or primary key matching.</param>
    /// <param name="dismissSendEvent">When true, suppresses CQRS entity events. Default is false to enable event publishing.</param>
    /// <param name="checkDiff">When true, performs change detection to optimize updates. Default is true for performance.</param>
    /// <param name="eventCustomConfig">Optional configuration action for customizing CQRS entity events before they are dispatched.</param>
    /// <param name="cancellationToken">Token to monitor for cancellation requests during the async operation.</param>
    /// <returns>The created or updated entity with any auto-generated values populated (ID, audit timestamps, etc.).</returns>
    /// <remarks>
    /// <para><strong>Simplified Interface:</strong></para>
    /// <list type="bullet">
    /// <item><description>Delegates to the comprehensive CreateOrUpdateAsync overload with existingEntity set to null</description></item>
    /// <item><description>Automatically handles existing entity resolution from Unit of Work cache or database</description></item>
    /// <item><description>Provides clean interface for scenarios where existing entity pre-loading is not needed</description></item>
    /// <item><description>Maintains all advanced features while reducing parameter complexity</description></item>
    /// </list>
    ///
    /// <para><strong>Custom Predicate Usage:</strong></para>
    /// <list type="bullet">
    /// <item><description>Enables complex existence checking beyond simple primary key matching</description></item>
    /// <item><description>Supports business logic-based entity identification (e.g., unique codes, composite keys)</description></item>
    /// <item><description>Falls back to IUniqueCompositeIdSupport pattern when predicate is not provided</description></item>
    /// <item><description>Uses primary key matching as the final fallback for standard entities</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Characteristics:</strong></para>
    /// <list type="bullet">
    /// <item><description>Leverages Unit of Work caching to minimize database queries</description></item>
    /// <item><description>Uses AsNoTracking queries for existence checks to reduce memory overhead</description></item>
    /// <item><description>Automatically caches discovered existing entities for subsequent operations</description></item>
    /// <item><description>Optimizes for common scenarios where existing entity lookup is sufficient</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Simple create-or-update with primary key matching
    /// var user = new User { Id = "user123", Name = "John Doe" };
    /// var result = await CreateOrUpdateAsync&lt;User, string&gt;(user);
    ///
    /// // Custom existence check using business logic
    /// var product = new Product { Code = "PROD001", Name = "Widget" };
    /// var savedProduct = await CreateOrUpdateAsync&lt;Product, int&gt;(
    ///     product,
    ///     customCheckExistingPredicate: p =&gt; p.Code == product.Code
    /// );
    ///
    /// // Silent operation for system updates
    /// var config = new Configuration { Key = "Theme", Value = "Dark" };
    /// await CreateOrUpdateAsync&lt;Configuration, string&gt;(
    ///     config,
    ///     dismissSendEvent: true
    /// );
    /// </code>
    /// </example>
    /// </remarks>
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
            ?? await ContextThreadSafeLock.ExecuteLockActionAsync(
                () =>
                    GetQuery<TEntity>()
                        .AsNoTracking()
                        .Where(existingEntityPredicate)
                        .FirstOrDefaultAsync(cancellationToken)
                        .ThenActionIf(p => p != null, p => SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p)),
                cancellationToken
            );

        if (existingEntity != null)
        {
            await IUniqueCompositeIdSupport.EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
                entity,
                existingEntity,
                id => GetQuery<TEntity>().AsNoTracking().AnyAsync(p => p.Id.Equals(id), cancellationToken: cancellationToken)
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

        return await CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken);
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
                .AsNoTracking()
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
                var existingEntityIds = await ContextThreadSafeLock.ExecuteLockActionAsync(
                    () =>
                        existingEntitiesQuery
                            .ToListAsync(cancellationToken)
                            .Then(items =>
                                items
                                    .PipeAction(items => items.ForEach(p => SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p)))
                                    .Pipe(existingEntities => existingEntities.Select(p => p.Id).ToHashSet())
                            ),
                    cancellationToken
                );
                var (toUpdateEntities, newEntities) = entities.WhereSplitResult(p => existingEntityIds.Contains(p.Id));

                // Ef core is not thread safe so that couldn't use when all
                await CreateManyAsync<TEntity, TPrimaryKey>(newEntities, dismissSendEvent, eventCustomConfig, cancellationToken);
                await UpdateManyAsync<TEntity, TPrimaryKey>(toUpdateEntities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
            }
            else
            {
                var existingEntities = await ContextThreadSafeLock.ExecuteLockActionAsync(
                    () =>
                        existingEntitiesQuery
                            .ToListAsync(cancellationToken)
                            .Then(items => items.PipeAction(items => items.ForEach(p => SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p)))),
                    cancellationToken
                );

                var toUpsertEntityToExistingEntityPairs = entities.Select(toUpsertEntity =>
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

                // Ef core is not thread safe so that couldn't use when all
                await CreateManyAsync<TEntity, TPrimaryKey>(newEntities.Select(p => p.toUpsertEntity).ToList(), dismissSendEvent, eventCustomConfig, cancellationToken);
                await UpdateManyAsync<TEntity, TPrimaryKey>(
                    existingToUpdateEntities.Select(p => p.toUpsertEntity).ToList(),
                    dismissSendEvent,
                    checkDiff,
                    eventCustomConfig,
                    cancellationToken
                );
            }
        }

        return entities;
    }

    public DbSet<PlatformDataMigrationHistory> DataMigrationHistoryDbSet()
    {
        return Set<PlatformDataMigrationHistory>();
    }

    public ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformEfCoreDbContext<>).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }

    public Task<TEntity> UpdateAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity? existingEntity,
        bool dismissSendEvent,
        bool checkDiff = true,
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
    /// Internal method that provides the core logic for entity update and set operations with comprehensive
    /// concurrency control, audit trail management, and CQRS event coordination. This method handles both
    /// tracked and untracked entities while ensuring data consistency and optimal performance.
    /// </summary>
    /// <typeparam name="TEntity">The entity type that implements IEntity&lt;TPrimaryKey&gt; and has a parameterless constructor.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key for the entity.</typeparam>
    /// <param name="entity">The entity to update with new property values.</param>
    /// <param name="existingEntity">Optional existing entity for change detection and concurrency control. Retrieved from cache or database if null.</param>
    /// <param name="dismissSendEvent">When true, suppresses CQRS entity events. Used for silent operations or performance-critical scenarios.</param>
    /// <param name="checkDiff">When true, performs change detection to optimize updates. When false, forces update regardless of changes.</param>
    /// <param name="eventCustomConfig">Optional configuration action for customizing CQRS entity events before dispatch.</param>
    /// <param name="onlySetData">When true, performs set operation without audit trails or events. Used for data initialization scenarios.</param>
    /// <param name="cancellationToken">Token to monitor for cancellation requests during the async operation.</param>
    /// <returns>The updated entity with all audit fields and row version tokens properly populated.</returns>
    /// <remarks>
    /// <para><strong>Core Update Logic Flow:</strong></para>
    /// <list type="bullet">
    /// <item><description>Acquires thread-safe lock to prevent Entity Framework Core concurrency issues</description></item>
    /// <item><description>Resolves existing entity from Unit of Work cache or database if not provided</description></item>
    /// <item><description>Handles row version entity concurrency token resolution and validation</description></item>
    /// <item><description>Detaches conflicting tracked entities to prevent EF Core tracking exceptions</description></item>
    /// </list>
    ///
    /// <para><strong>Entity Tracking and Change Detection:</strong></para>
    /// <list type="bullet">
    /// <item><description>Uses DetachLocalIfAnyDifferentTrackedEntity to manage EF Core change tracking conflicts</description></item>
    /// <item><description>Performs sophisticated change detection including mutable type property analysis</description></item>
    /// <item><description>Supports computed entity properties that require explicit modification marking</description></item>
    /// <item><description>Optimizes performance by skipping updates when no changes are detected</description></item>
    /// </list>
    ///
    /// <para><strong>Audit Trail Management:</strong></para>
    /// <list type="bullet">
    /// <item><description>Automatically populates LastUpdatedDate for entities implementing IDateAuditedEntity</description></item>
    /// <item><description>Sets LastUpdatedBy from current request context for IUserAuditedEntity implementations</description></item>
    /// <item><description>Respects onlySetData flag to skip audit fields for data initialization scenarios</description></item>
    /// <item><description>Maintains audit consistency across complex entity hierarchies</description></item>
    /// </list>
    ///
    /// <para><strong>Concurrency Control and Row Versioning:</strong></para>
    /// <list type="bullet">
    /// <item><description>Resolves missing concurrency tokens from existing entities or database queries</description></item>
    /// <item><description>Generates new ULID-based row version tokens for updated entities</description></item>
    /// <item><description>Handles IRowVersionEntity implementations with optimistic concurrency checking</description></item>
    /// <item><description>Prevents concurrency conflicts through proper token management</description></item>
    /// </list>
    ///
    /// <para><strong>Entity State Management:</strong></para>
    /// <list type="bullet">
    /// <item><description>Determines whether to use EF Core Update() method or leverage existing change tracking</description></item>
    /// <item><description>Handles both tracked and untracked entity scenarios appropriately</description></item>
    /// <item><description>Manages entity detachment to prevent "another instance is already being tracked" errors</description></item>
    /// <item><description>Coordinates with Unit of Work for optimal entity caching and retrieval</description></item>
    /// </list>
    ///
    /// <para><strong>CQRS Event Integration:</strong></para>
    /// <list type="bullet">
    /// <item><description>Integrates with PlatformCqrsEntityEvent.ExecuteWithSendingUpdateEntityEvent for event handling</description></item>
    /// <item><description>Provides complete entity state context including before/after entity data</description></item>
    /// <item><description>Supports domain event integration for entities implementing ISupportDomainEventsEntity</description></item>
    /// <item><description>Maintains event metadata including user context and stack trace information</description></item>
    /// </list>
    ///
    /// <para><strong>Performance Optimizations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Early return optimization when no changes are detected and checkDiff is enabled</description></item>
    /// <item><description>Efficient handling of tracked vs untracked entity scenarios</description></item>
    /// <item><description>Minimal database queries through intelligent existing entity resolution</description></item>
    /// <item><description>Optimized change detection for mutable properties and computed fields</description></item>
    /// </list>
    ///
    /// <para><strong>Thread Safety Considerations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Uses ContextThreadSafeLock to ensure single-threaded access to EF Core context</description></item>
    /// <item><description>Proper lock release in finally blocks to prevent deadlocks</description></item>
    /// <item><description>Coordinates lock release timing with CQRS event execution</description></item>
    /// <item><description>Handles exception scenarios to maintain lock consistency</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Standard update operation with full audit and events
    /// var user = await GetByIdAsync(userId);
    /// user.Name = "Updated Name";
    /// var result = await InternalUpdateOrSetAsync&lt;User, string&gt;(
    ///     user,
    ///     existingUser,
    ///     dismissSendEvent: false,
    ///     checkDiff: true,
    ///     eventCustomConfig: null,
    ///     onlySetData: false,
    ///     cancellationToken
    /// );
    ///
    /// // Set operation for data initialization (no audit trails)
    /// var config = new Configuration { Key = "Setting", Value = "InitialValue" };
    /// await InternalUpdateOrSetAsync&lt;Configuration, string&gt;(
    ///     config,
    ///     null,
    ///     dismissSendEvent: true,
    ///     checkDiff: false,
    ///     eventCustomConfig: null,
    ///     onlySetData: true,
    ///     cancellationToken
    /// );
    /// </code>
    /// </example>
    /// </remarks>
    private async Task<TEntity> InternalUpdateOrSetAsync<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity existingEntity,
        bool dismissSendEvent,
        bool checkDiff,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        bool onlySetData,
        CancellationToken cancellationToken
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return await ContextThreadSafeLock.ExecuteLockActionAsync(
            async () =>
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
                        .AsNoTracking()
                        .Where(BuildExistingEntityPredicate())
                        .FirstOrDefaultAsync(cancellationToken)
                        .EnsureFound($"Entity {typeof(TEntity).Name} with [Id:{entity.Id}] not found to update")
                        .ThenActionIf(p => p != null, p => SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p));

                    if (!existingEntity.Id.Equals(entity.Id))
                    {
                        await IUniqueCompositeIdSupport.EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
                            entity,
                            existingEntity,
                            id => GetQuery<TEntity>().AsNoTracking().AnyAsync(p => p.Id.Equals(id), cancellationToken: cancellationToken)
                        );

                        entity.Id = existingEntity.Id;
                    }
                }

                if (isEntityRowVersionEntityMissingConcurrencyUpdateToken && !onlySetData)
                {
                    entity.As<IRowVersionEntity>().ConcurrencyUpdateToken =
                        existingEntity?.As<IRowVersionEntity>().ConcurrencyUpdateToken
                        ?? await GetQuery<TEntity>()
                            .AsNoTracking()
                            .Where(BuildExistingEntityPredicate())
                            .Select(p => ((IRowVersionEntity)p).ConcurrencyUpdateToken)
                            .FirstOrDefaultAsync(cancellationToken);
                }

                // Run DetachLocalIfAny to prevent
                // The instance of entity type cannot be tracked because another instance of this type with the same key is already being tracked
                var (toBeUpdatedEntity, isEntityTracked, isEntityNotTrackedOrTrackedModified) = entity
                    .Pipe(p => DetachLocalIfAnyDifferentTrackedEntity<TEntity, TPrimaryKey>(p, existingEntity))
                    .WithIf(
                        p => p.isEntityNotTrackedOrTrackedModified && entity is IDateAuditedEntity && !onlySetData,
                        p => p.entity.As<IDateAuditedEntity>().With(auditedEntity => auditedEntity.LastUpdatedDate = DateTime.UtcNow).As<TEntity>()
                    )
                    .WithIf(
                        p => p.isEntityNotTrackedOrTrackedModified && entity.IsAuditedUserEntity() && !onlySetData,
                        p => p.entity.As<IUserAuditedEntity>().SetLastUpdatedBy(RequestContextAccessor.Current.UserId(entity.GetAuditedUserIdType())).As<TEntity>()
                    );

                // is entity tracked as not modified any things then return
                if (
                    existingEntity != null
                    && !isEntityNotTrackedOrTrackedModified
                    && checkDiff
                    && (entity is not ISupportDomainEventsEntity || entity.As<ISupportDomainEventsEntity>().GetDomainEvents().IsEmpty())
                )
                {
                    ContextThreadSafeLock.TryRelease();

                    return entity;
                }

                var result = await PlatformCqrsEntityEvent.ExecuteWithSendingUpdateEntityEvent<TEntity, TPrimaryKey, TEntity>(
                    RootServiceProvider,
                    MappedUnitOfWork,
                    toBeUpdatedEntity,
                    existingEntity,
                    async entity =>
                    {
                        var updatedEntity =
                            !isEntityTracked || existingEntity == null
                                ? GetTable<TEntity>()
                                    .Update(entity)
                                    .Entity.PipeIf(
                                        entity is IRowVersionEntity && !onlySetData,
                                        p => p.As<IRowVersionEntity>()
                                            .With(rowVersionEntity => rowVersionEntity.ConcurrencyUpdateToken = Ulid.NewUlid().ToString())
                                            .As<TEntity>()
                                    )
                                : entity.PipeIf(
                                    entity => entity is IRowVersionEntity && !onlySetData,
                                    p => p.As<IRowVersionEntity>()
                                        .With(rowVersionEntity => rowVersionEntity.ConcurrencyUpdateToken = Ulid.NewUlid().ToString())
                                        .As<TEntity>()
                                );

                        ContextThreadSafeLock.TryRelease();

                        return (updatedEntity, true);
                    },
                    dismissSendEvent,
                    eventCustomConfig,
                    () => RequestContextAccessor.Current.GetAllKeyValues(),
                    PlatformCqrsEntityEvent.GetEntityEventStackTrace<TEntity>(RootServiceProvider, dismissSendEvent),
                    cancellationToken
                );

                return result;
            },
            cancellationToken,
            isManuallyReleaseLockInAction: true
        );

        Expression<Func<TEntity, bool>> BuildExistingEntityPredicate()
        {
            return entity.As<IUniqueCompositeIdSupport<TEntity>>()?.FindByUniqueCompositeIdExpr() != null
                ? entity.As<IUniqueCompositeIdSupport<TEntity>>().FindByUniqueCompositeIdExpr()!
                : p => p.Id.Equals(entity.Id);
        }
    }

    public TEntity SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(TEntity p)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return MappedUnitOfWork?.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p, false, GetCachedExistingOriginalEntityCustomGetRuntimeTypeFn);
    }

    public Type GetCachedExistingOriginalEntityCustomGetRuntimeTypeFn<TEntity>(TEntity entity)
        where TEntity : class, IEntity, new()
    {
        var entityType = entity.GetType();

        return GetCachedExistingOriginalEntityCustomGetRuntimeTypeFnCachedResultDict.GetOrAdd(
            $"{entityType.Name}_{typeof(TEntity)}",
            p =>
            {
                return IsUsingLazyLoadingProxy && entityType != typeof(TEntity) && entityType.GetProperties().Any(p => p.PropertyType.IsAssignableTo(typeof(ILazyLoader)))
                    ? entityType.BaseType?.IsAssignableTo(typeof(TEntity)) == true
                        ? entityType.BaseType
                        : typeof(TEntity)
                    : entityType;
            }
        );
    }

    private bool IsValidScalarProperty(string propertyInfoName, Type entityType)
    {
        // Get the entity type metadata
        var efCoreEntityTypeMap = Model.FindEntityType(entityType);
        if (efCoreEntityTypeMap == null)
            return false;

        // Check if the property is a scalar (non-navigation)
        var property = efCoreEntityTypeMap.FindProperty(propertyInfoName);
        if (property == null)
            return false;

        // Ensure the property is not a navigation or ownership
        return !property.IsShadowProperty();
    }

    private bool IsValidScalarOrOwnedProperty(string propertyOrNavName, Type entityType)
    {
        // Find the EF Core metadata for this CLR type
        var efEntityType = Model.FindEntityType(entityType);
        if (efEntityType == null)
            return false;

        // 1) Is it a true scalar (IProperty)?
        var scalar = efEntityType.FindProperty(propertyOrNavName);
        if (scalar != null)
            return true;

        // 2) Is it a navigation pointing to an owned type?
        var nav = efEntityType.FindNavigation(propertyOrNavName);
        if (nav != null && nav.TargetEntityType.IsOwned())
            return true;

        // 3) (Optional) If you ever use skip-navigations for collection ownership:
        var skipNav = efEntityType.FindSkipNavigation(propertyOrNavName);
        if (skipNav != null && skipNav.TargetEntityType.IsOwned())
            return true;

        return false;
    }

    /// <summary>
    /// Captures the current tracking state of all navigation properties on an entity before creation operations.
    /// This method recursively identifies navigation properties that are populated but not currently tracked by EF Core,
    /// enabling post-creation cleanup to prevent unwanted cascade insertion of existing entities.
    /// </summary>
    /// <typeparam name="TEntity">The entity type to analyze for navigation properties.</typeparam>
    /// <param name="entity">The entity instance to examine.</param>
    /// <param name="maxDepth">Maximum depth for recursive navigation property traversal (default: 3).</param>
    /// <returns>A dictionary mapping navigation property paths to their current EntityState and entity reference.</returns>
    /// <remarks>
    /// <para><strong>Recursive Navigation Property Detection:</strong></para>
    /// <list type="bullet">
    /// <item><description>Recursively traverses navigation properties to handle nested chains (e.g., TimeLog.Employee.User)</description></item>
    /// <item><description>Uses path-based keys to track navigation property hierarchy (e.g., "Employee", "Employee.User")</description></item>
    /// <item><description>Prevents infinite recursion with visited entity tracking and configurable max depth</description></item>
    /// <item><description>Handles complex entity relationships and circular references safely</description></item>
    /// </list>
    ///
    /// <para><strong>Owned Entity Type Handling:</strong></para>
    /// <list type="bullet">
    /// <item><description>Excludes owned entity types (configured with OwnsOne/OwnsMany) from capture and detachment</description></item>
    /// <item><description>Owned entities are part of the parent entity and should be inserted/updated normally</description></item>
    /// <item><description>Detects ownership through ForeignKey.IsOwnership and TargetEntityType.IsOwned() checks</description></item>
    /// <item><description>Prevents incorrect detachment of value objects that belong to the parent entity</description></item>
    /// </list>
    ///
    /// <para><strong>Entity State Tracking:</strong></para>
    /// <list type="bullet">
    /// <item><description>Records the current EntityState of each navigation entity before AddAsync</description></item>
    /// <item><description>Handles both tracked (Added/Modified/Unchanged) and untracked (Detached) entities</description></item>
    /// <item><description>Safely handles entities that may not be in the current context</description></item>
    /// <item><description>Provides state information needed for post-creation cleanup decisions</description></item>
    /// </list>
    /// </remarks>
    protected Dictionary<string, (EntityState OriginalState, object NavigationEntity)> CaptureNavigationPropertyStates<TEntity>(TEntity entity, int maxDepth = 6)
        where TEntity : class
    {
        var navigationStates = new Dictionary<string, (EntityState OriginalState, object NavigationEntity)>();
        var visitedEntities = new HashSet<object>(ReferenceEqualityComparer.Instance);

        try
        {
            CaptureNavigationPropertyStatesRecursive(entity, navigationStates, visitedEntities, string.Empty, 0, maxDepth);
        }
        catch (Exception ex)
        {
            // Log warning but don't fail the operation
            Logger.LogWarning(ex, "Failed to capture navigation property states for {EntityType}", typeof(TEntity).Name);
        }

        return navigationStates;
    }

    /// <summary>
    /// Recursively captures navigation property states for an entity and its navigation properties.
    /// </summary>
    /// <param name="entity">The entity to analyze.</param>
    /// <param name="navigationStates">Dictionary to store captured navigation states.</param>
    /// <param name="visitedEntities">Set of visited entities to prevent infinite recursion.</param>
    /// <param name="propertyPath">Current property path (e.g., "Employee.User").</param>
    /// <param name="currentDepth">Current recursion depth.</param>
    /// <param name="maxDepth">Maximum allowed recursion depth.</param>
    private void CaptureNavigationPropertyStatesRecursive(
        object entity,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates,
        HashSet<object> visitedEntities,
        string propertyPath,
        int currentDepth,
        int maxDepth
    )
    {
        // Prevent infinite recursion
        if (entity == null || currentDepth >= maxDepth || !visitedEntities.Add(entity))
            return;

        try
        {
            // Get EF Core entity metadata
            var entityType = Model.FindEntityType(entity.GetType());
            if (entityType == null)
                return;

            // Process regular navigation properties
            CaptureRegularNavigationProperties(entity, entityType, navigationStates, visitedEntities, propertyPath, currentDepth, maxDepth);

            // Process skip navigations (many-to-many)
            CaptureSkipNavigationProperties(entity, entityType, navigationStates, visitedEntities, propertyPath, currentDepth, maxDepth);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to capture navigation properties for entity {EntityType} at path {PropertyPath}", entity.GetType().Name, propertyPath);
        }
    }

    /// <summary>
    /// Captures regular navigation properties (references and collections) for an entity.
    /// Excludes owned entity types (configured with OwnsOne/OwnsMany) since they are part of the parent entity.
    /// </summary>
    private void CaptureRegularNavigationProperties(
        object entity,
        IEntityType entityType,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates,
        HashSet<object> visitedEntities,
        string propertyPath,
        int currentDepth,
        int maxDepth
    )
    {
        foreach (var navigation in entityType.GetNavigations())
        {
            // Skip owned entity types - they are part of the parent entity and should be inserted normally
            if (IsOwnedEntityNavigation(navigation)) continue;

            var propertyInfo = navigation.PropertyInfo;
            if (propertyInfo == null)
                continue;

            var navigationValue = propertyInfo.GetValue(entity);
            if (navigationValue == null)
                continue;

            var currentPropertyPath = string.IsNullOrEmpty(propertyPath) ? navigation.Name : $"{propertyPath}.{navigation.Name}";

            if (navigation.IsCollection)
                CaptureCollectionNavigationProperty(navigationValue, currentPropertyPath, navigationStates, visitedEntities, currentDepth, maxDepth);
            else
                CaptureReferenceNavigationProperty(navigationValue, currentPropertyPath, navigationStates, visitedEntities, currentDepth, maxDepth);
        }
    }

    /// <summary>
    /// Captures skip navigation properties (many-to-many relationships) for an entity.
    /// </summary>
    private void CaptureSkipNavigationProperties(
        object entity,
        IEntityType entityType,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates,
        HashSet<object> visitedEntities,
        string propertyPath,
        int currentDepth,
        int maxDepth
    )
    {
        foreach (var skipNavigation in entityType.GetSkipNavigations())
        {
            var propertyInfo = skipNavigation.PropertyInfo;
            if (propertyInfo == null)
                continue;

            var navigationValue = propertyInfo.GetValue(entity);
            if (navigationValue == null)
                continue;

            var currentPropertyPath = string.IsNullOrEmpty(propertyPath) ? skipNavigation.Name : $"{propertyPath}.{skipNavigation.Name}";

            if (navigationValue is IEnumerable enumerable)
            {
                var collectionItems = new List<(EntityState, object)>();
                foreach (var item in enumerable)
                {
                    if (item != null)
                    {
                        var itemState = GetEntityStateOrDefault(item);
                        collectionItems.Add((itemState, item));

                        // Recursively process navigation properties of collection items
                        CaptureNavigationPropertyStatesRecursive(item, navigationStates, visitedEntities, currentPropertyPath, currentDepth + 1, maxDepth);
                    }
                }

                if (collectionItems.Any())
                    navigationStates[$"{currentPropertyPath}SkipCollection"] = (EntityState.Detached, collectionItems);
            }
        }
    }

    /// <summary>
    /// Captures a reference navigation property and recursively processes its navigation properties.
    /// </summary>
    private void CaptureReferenceNavigationProperty(
        object navigationValue,
        string currentPropertyPath,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates,
        HashSet<object> visitedEntities,
        int currentDepth,
        int maxDepth
    )
    {
        var navigationState = GetEntityStateOrDefault(navigationValue);
        navigationStates[currentPropertyPath] = (navigationState, navigationValue);

        // Recursively process navigation properties of the referenced entity
        CaptureNavigationPropertyStatesRecursive(navigationValue, navigationStates, visitedEntities, currentPropertyPath, currentDepth + 1, maxDepth);
    }

    /// <summary>
    /// Captures a collection navigation property and recursively processes navigation properties of collection items.
    /// </summary>
    private void CaptureCollectionNavigationProperty(
        object navigationValue,
        string currentPropertyPath,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates,
        HashSet<object> visitedEntities,
        int currentDepth,
        int maxDepth
    )
    {
        if (navigationValue is IEnumerable enumerable)
        {
            var collectionItems = new List<(EntityState, object)>();
            foreach (var item in enumerable)
            {
                if (item != null)
                {
                    var itemState = GetEntityStateOrDefault(item);
                    collectionItems.Add((itemState, item));

                    // Recursively process navigation properties of collection items
                    CaptureNavigationPropertyStatesRecursive(item, navigationStates, visitedEntities, currentPropertyPath, currentDepth + 1, maxDepth);
                }
            }

            if (collectionItems.Any())
            {
                // Store collection state info - we'll use this for cleanup
                navigationStates[$"{currentPropertyPath}Collection"] = (EntityState.Detached, collectionItems);
            }
        }
    }

    /// <summary>
    /// Gets the EntityState for an object, returning Detached if the object is not tracked or an error occurs.
    /// This method safely handles entities that may not be in the current context.
    /// </summary>
    /// <param name="navigationEntity">The entity object to check.</param>
    /// <returns>The current EntityState of the entity, or Detached if not tracked or if an error occurs.</returns>
    private EntityState GetEntityStateOrDefault(object navigationEntity)
    {
        try
        {
            var entry = Entry(navigationEntity);
            return entry.State;
        }
        catch (InvalidOperationException)
        {
            // Entity is not being tracked by this context
            return EntityState.Detached;
        }
        catch (Exception ex)
        {
            // Any other error - treat as detached
            Logger.LogWarning(ex, "Error checking entity state for navigation property");
            return EntityState.Detached;
        }
    }

    /// <summary>
    /// Detaches navigation entities that were not originally tracked before entity creation or were
    /// automatically populated by EF Core during the AddAsync operation.
    /// This prevents EF Core from attempting to INSERT existing entities that were attached
    /// during the AddAsync operation through navigation property cascade behavior and foreign key fixup.
    /// </summary>
    /// <param name="navigationStatesBeforeAdd">The navigation property states captured before entity creation.</param>
    /// <param name="navigationStatesAfterAdd">The navigation property states captured after entity creation.</param>
    /// <remarks>
    /// <para><strong>Two-Phase Detachment Logic:</strong></para>
    /// <list type="bullet">
    /// <item><description>Phase 1: Detaches entities that were originally in Detached state before AddAsync</description></item>
    /// <item><description>Phase 2: Detaches entities that were auto-populated by EF Core during AddAsync (foreign key navigation fixup)</description></item>
    /// <item><description>Handles path-based navigation property keys (e.g., "Employee", "Employee.User")</description></item>
    /// <item><description>Preserves entities that were already being tracked (Added/Modified/Unchanged)</description></item>
    /// </list>
    ///
    /// <para><strong>EF Core Navigation Fixup Handling:</strong></para>
    /// <list type="bullet">
    /// <item><description>Detects navigation properties that were null before AddAsync but populated after</description></item>
    /// <item><description>Handles automatic foreign key navigation fixup that occurs during entity addition</description></item>
    /// <item><description>Prevents cascade insertion of entities loaded through navigation property relationships</description></item>
    /// </list>
    /// </remarks>
    protected void DetachPreviouslyUntrackedNavigationProperties(
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStatesBeforeAdd,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStatesAfterAdd
    )
    {
        try
        {
            // Phase 1: Detach entities that were originally in Detached state before AddAsync
            DetachNavigationPropertiesByStates(navigationStatesBeforeAdd, "before AddAsync");

            // Phase 2: Detach entities that were auto-populated by EF Core during AddAsync
            DetachNavigationPropertiesPopulatedByEfCore(navigationStatesBeforeAdd, navigationStatesAfterAdd);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to detach previously untracked navigation properties");
        }
    }

    /// <summary>
    /// Detaches navigation properties based on their original EntityState.
    /// </summary>
    private void DetachNavigationPropertiesByStates(Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStates, string phase)
    {
        foreach (var kvp in navigationStates)
        {
            var (originalState, navigationEntity) = kvp.Value;

            // Only detach entities that were originally not tracked (Detached)
            if (originalState != EntityState.Detached)
                continue;

            DetachNavigationEntity(kvp.Key, navigationEntity, $"{phase} - originally detached");
        }
    }

    /// <summary>
    /// Detaches navigation properties that were populated by EF Core during AddAsync operation
    /// but weren't present before AddAsync (foreign key navigation fixup).
    /// </summary>
    private void DetachNavigationPropertiesPopulatedByEfCore(
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStatesBeforeAdd,
        Dictionary<string, (EntityState OriginalState, object NavigationEntity)> navigationStatesAfterAdd
    )
    {
        foreach (var (navigationPath, value) in navigationStatesAfterAdd)
        {
            var (_, afterEntity) = value;

            // If this navigation property wasn't present before AddAsync, it was populated by EF Core
            if (!navigationStatesBeforeAdd.ContainsKey(navigationPath))
                DetachNavigationEntity(navigationPath, afterEntity, "EF Core auto-populated during AddAsync");
        }
    }

    /// <summary>
    /// Detaches a single navigation entity or collection with proper error handling.
    /// </summary>
    private void DetachNavigationEntity(string navigationPath, object navigationEntity, string reason)
    {
        try
        {
            if (navigationPath.EndsWith("Collection") || navigationPath.EndsWith("SkipCollection"))
            {
                // Handle collection navigations
                if (navigationEntity is List<(EntityState, object)> collectionItems)
                {
                    foreach (var (itemOriginalState, item) in collectionItems)
                    {
                        if (itemOriginalState == EntityState.Detached)
                            DetachSingleEntity(item, $"{navigationPath} collection item", reason);
                    }
                }
            }
            else
            {
                // Handle reference navigations
                DetachSingleEntity(navigationEntity, navigationPath, reason);
            }
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to detach navigation entity for property {NavigationPath} ({Reason})", navigationPath, reason);
        }
    }

    /// <summary>
    /// Detaches a single entity with proper error handling and logging.
    /// </summary>
    private void DetachSingleEntity(object entity, string entityDescription, string reason)
    {
        try
        {
            var entry = Entry(entity);
            if (entry.State != EntityState.Detached)
            {
                Logger.LogDebug("Detaching entity {EntityDescription} - {Reason}. Current state: {CurrentState}", entityDescription, reason, entry.State);
                entry.State = EntityState.Detached;
            }
        }
        catch (InvalidOperationException)
        {
            // Entity is no longer tracked - this is actually what we want
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to detach entity {EntityDescription} ({Reason})", entityDescription, reason);
        }
    }

    /// <summary>
    /// Determines if a navigation property represents an owned entity type (configured with OwnsOne/OwnsMany).
    /// Owned entities are part of the parent entity and should not be detached during navigation property cleanup.
    /// </summary>
    /// <param name="navigation">The navigation property to check.</param>
    /// <returns>True if the navigation represents an owned entity type, false otherwise.</returns>
    /// <remarks>
    /// <para><strong>Owned Entity Detection:</strong></para>
    /// <list type="bullet">
    /// <item><description>Checks if the foreign key represents an ownership relationship</description></item>
    /// <item><description>Verifies if the target entity type is configured as owned</description></item>
    /// <item><description>Owned entities are value objects that don't have independent identity</description></item>
    /// <item><description>They should be inserted/updated/deleted together with their parent entity</description></item>
    /// </list>
    ///
    /// <para><strong>EF Core Ownership Patterns:</strong></para>
    /// <list type="bullet">
    /// <item><description>OwnsOne() - Single owned entity (e.g., Address in Customer)</description></item>
    /// <item><description>OwnsMany() - Collection of owned entities (e.g., List of OrderItems in Order)</description></item>
    /// <item><description>Owned entities share the same table as parent or use table splitting</description></item>
    /// <item><description>They cannot exist without their parent and don't have independent DbSet</description></item>
    /// </list>
    /// </remarks>
    private async Task TrackNavigationPropertiesBeforeAddAsync<TEntity>(TEntity entity, CancellationToken cancellationToken)
        where TEntity : class
    {
        var entityType = Model.FindEntityType(typeof(TEntity));
        if (entityType == null) return;

        foreach (var navigation in entityType.GetNavigations())
        {
            // Skip owned entity types - they should be inserted with their parent
            if (IsOwnedEntityNavigation(navigation))
                continue;

            var propertyInfo = navigation.PropertyInfo;
            if (propertyInfo == null)
                continue;

            var navigationValue = propertyInfo.GetValue(entity);
            if (navigationValue == null)
                continue;

            if (navigation.IsCollection)
            {
                // Handle collection navigation properties
                if (navigationValue is IEnumerable<object> collection)
                {
                    foreach (var item in collection)
                        await TrackSingleNavigationEntity(item, cancellationToken);
                }
            }
            else
            {
                // Handle single navigation properties
                await TrackSingleNavigationEntity(navigationValue, cancellationToken);
            }
        }
    }

    private async Task TrackSingleNavigationEntity(object navigationEntity, CancellationToken cancellationToken)
    {
        if (navigationEntity == null) return;

        var entityType = Model.FindEntityType(navigationEntity.GetType());
        if (entityType == null) return;

        if (Entry(navigationEntity).State != EntityState.Detached) return;

        // Get the primary key value
        var primaryKey = entityType.FindPrimaryKey();
        if (primaryKey == null) return;

        var keyValues = new object[primaryKey.Properties.Count];
        for (var i = 0; i < primaryKey.Properties.Count; i++)
        {
            var property = primaryKey.Properties[i];
            var value = property.PropertyInfo?.GetValue(navigationEntity);
            keyValues[i] = value;
        }

        // Check if any key value is null/default - this indicates a new entity
        var hasNullKey = keyValues.Any(kv => kv == null || kv.Equals(GetDefaultValue(kv.GetType())));

        if (!hasNullKey)
        {
            // Check if entity exists in database (this will track it if found)
            var existingEntity = await FindAsync(navigationEntity.GetType(), keyValues, cancellationToken);
            if (existingEntity != null)
            {
                // Entity exists in database but navigationEntity is not tracked
                // We need to detach the loaded entity and track our navigationEntity instead
                Entry(existingEntity).State = EntityState.Detached;
                Entry(navigationEntity).State = EntityState.Unchanged;
            }
        }
        // If entity doesn't exist or has null keys, let EF Core handle it normally
    }

    private static object GetDefaultValue(Type type)
    {
        return type.IsValueType ? Activator.CreateInstance(type) : null;
    }

    private static bool IsOwnedEntityNavigation(INavigation navigation)
    {
        try
        {
            // Check if the foreign key represents an ownership relationship
            if (navigation.ForeignKey.IsOwnership)
                return true;

            // Check if the target entity type is configured as owned
            if (navigation.TargetEntityType.IsOwned())
                return true;

            return false;
        }
        catch (Exception)
        {
            // If we can't determine ownership, err on the side of caution and don't detach
            return true;
        }
    }

    protected (TEntity entity, bool isEntityTracked, bool isEntityNotTrackedOrTrackedModified) DetachLocalIfAnyDifferentTrackedEntity<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity checkEntityModifiedByExistingEntity
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return DetachLocalIfAnyDifferentTrackedEntity(entity, entry => entry.Id.Equals(entity.Id), checkEntityModifiedByExistingEntity);
    }

    /// <summary>
    /// Detaches any locally tracked entity that conflicts with the provided entity to prevent Entity Framework Core
    /// tracking exceptions. This method provides sophisticated entity conflict resolution with custom predicate matching,
    /// mutable property change detection, and comprehensive entity state analysis.
    /// </summary>
    /// <typeparam name="TEntity">The entity type that implements IEntity and has a parameterless constructor.</typeparam>
    /// <param name="entity">The entity to check for tracking conflicts and analyze for changes.</param>
    /// <param name="findExistingEntityPredicate">Custom predicate function used to locate conflicting tracked entities. Enables complex matching logic beyond simple primary keys.</param>
    /// <param name="checkEntityModifiedByExistingEntity">Optional existing entity used for sophisticated change detection including mutable properties and computed fields.</param>
    /// <param name="forceAlwaysDetach">When true, forces detachment even if the local and provided entities are the same reference. Used for clean slate operations.</param>
    /// <returns>
    /// A tuple containing:
    /// - entity: The original entity passed in
    /// - isEntityTracked: True if the entity was already being tracked by the context
    /// - isEntityNotTrackedOrTrackedModified: True if the entity is not tracked or has been modified (includes mutable property changes)
    /// </returns>
    /// <remarks>
    /// <para><strong>Entity Framework Core Tracking Conflict Resolution:</strong></para>
    /// <list type="bullet">
    /// <item><description>Prevents "The instance of entity type cannot be tracked because another instance of this type with the same key is already being tracked" exceptions</description></item>
    /// <item><description>Uses custom predicate for flexible entity matching beyond primary key constraints</description></item>
    /// <item><description>Safely detaches conflicting entities while preserving context state integrity</description></item>
    /// <item><description>Handles both reference equality and business logic-based entity identification</description></item>
    /// </list>
    ///
    /// <para><strong>Advanced Change Detection Logic:</strong></para>
    /// <list type="bullet">
    /// <item><description>Detects changes in mutable properties (collections, arrays, complex objects) that EF Core might miss</description></item>
    /// <item><description>Supports ComputedEntityPropertyAttribute for properties requiring explicit modification marking</description></item>
    /// <item><description>Uses IsValidScalarProperty and IsValidScalarOrOwnedProperty for property validation</description></item>
    /// <item><description>Explicitly marks properties as modified when mutable or computed changes are detected</description></item>
    /// </list>
    ///
    /// <para><strong>Entity State Analysis:</strong></para>
    /// <list type="bullet">
    /// <item><description>isEntityTracked: Determines if the entity is currently being tracked by the EF Core context</description></item>
    /// <item><description>isEntityTrackedModified: Checks if EF Core has detected modifications to tracked properties</description></item>
    /// <item><description>isEntityNotTrackedOrTrackedModified: Comprehensive flag indicating if processing is needed</description></item>
    /// <item><description>Handles edge cases where entities appear unchanged but have mutable property modifications</description></item>
    /// </list>
    ///
    /// <para><strong>Mutable Property Support:</strong></para>
    /// <list type="bullet">
    /// <item><description>Specifically handles properties with mutable types (collections, dictionaries, complex objects)</description></item>
    /// <item><description>Uses GetChangedFields extension method for deep property comparison</description></item>
    /// <item><description>Supports both scalar properties and owned entity properties for comprehensive change detection</description></item>
    /// <item><description>Automatically marks detected changes in EF Core's change tracker for proper persistence</description></item>
    /// </list>
    ///
    /// <para><strong>Performance and Safety Considerations:</strong></para>
    /// <list type="bullet">
    /// <item><description>Uses Local collection for efficient in-memory entity lookups</description></item>
    /// <item><description>Minimal performance impact through targeted property analysis</description></item>
    /// <item><description>Safe detachment prevents memory leaks and tracking inconsistencies</description></item>
    /// <item><description>Supports force detachment for scenarios requiring clean entity state</description></item>
    /// </list>
    ///
    /// <para><strong>Integration with Platform Features:</strong></para>
    /// <list type="bullet">
    /// <item><description>Works seamlessly with Unit of Work pattern for coordinated entity management</description></item>
    /// <item><description>Supports complex entity hierarchies and relationships</description></item>
    /// <item><description>Integrates with audit trail systems through proper change detection</description></item>
    /// <item><description>Enables sophisticated business logic through custom predicate matching</description></item>
    /// </list>
    ///
    /// <example>
    /// <code>
    /// // Complex entity matching with business logic
    /// var (processedEntity, wasTracked, needsUpdate) = DetachLocalIfAnyDifferentTrackedEntity(
    ///     updatedOrder,
    ///     local =&gt; local.OrderNumber == updatedOrder.OrderNumber &amp;&amp;
    ///              local.CustomerCode == updatedOrder.CustomerCode,
    ///     existingOrder
    /// );
    ///
    /// // Mutable property change detection
    /// var user = await GetUserAsync(userId);
    /// user.Preferences.Add("Theme", "Dark"); // Mutable collection change
    /// var (changedUser, _, hasChanges) = DetachLocalIfAnyDifferentTrackedEntity(
    ///     user,
    ///     local =&gt; local.Id == user.Id,
    ///     originalUser
    /// );
    /// // hasChanges will be true due to mutable property detection
    ///
    /// // Force detachment for clean operations
    /// var (cleanEntity, _, _) = DetachLocalIfAnyDifferentTrackedEntity(
    ///     importedEntity,
    ///     local =&gt; local.ImportKey == importedEntity.ImportKey,
    ///     null,
    ///     forceAlwaysDetach: true
    /// );
    /// </code>
    /// </example>
    /// </remarks>
    protected (TEntity entity, bool isEntityTracked, bool isEntityNotTrackedOrTrackedModified) DetachLocalIfAnyDifferentTrackedEntity<TEntity>(
        TEntity entity,
        Func<TEntity, bool> findExistingEntityPredicate,
        TEntity checkEntityModifiedByExistingEntity
    )
        where TEntity : class, IEntity, new()
    {
        var local = GetTable<TEntity>().Local.FirstOrDefault(findExistingEntityPredicate);

        var isEntityTracked = local == entity;
        var isEntityTrackedModified = GetTable<TEntity>().Entry(entity!).State == EntityState.Modified;

        if (local != null && !ReferenceEquals(local, entity))
        {
            GetTable<TEntity>().Entry(local).State = EntityState.Detached;

            if (checkEntityModifiedByExistingEntity == null)
                GetTable<TEntity>().Entry(entity).State = EntityState.Modified;
            else
            {
                var changedFields = entity
                    .GetChangedFields(
                        checkEntityModifiedByExistingEntity,
                        p => (IsValidScalarProperty(p.Name, typeof(TEntity)) ||
                              p.GetCustomAttribute<ComputedEntityPropertyAttribute>() != null) &&
                             p.GetCustomAttribute<PlatformNavigationPropertyAttribute>() == null
                    )
                    .PipeAction(changedMutableOrComputedFields => changedMutableOrComputedFields?.ForEach(p => Entry(entity!).Property(p.Key).IsModified = true));

                GetTable<TEntity>().Entry(entity).State = changedFields.Any() ? EntityState.Modified : EntityState.Unchanged;
            }
        }

        // Explicitly check props changes to mark it's updated to support mutate json prop like array, object, etc or prop has ComputedEntityProperty
        if (isEntityTracked && checkEntityModifiedByExistingEntity != null)
        {
            var changedMutableFields = entity
                .GetChangedFields(
                    checkEntityModifiedByExistingEntity,
                    p => ((p.PropertyType.IsMutableType() && IsValidScalarProperty(p.Name, typeof(TEntity))) ||
                          p.GetCustomAttribute<ComputedEntityPropertyAttribute>() != null) &&
                         p.GetCustomAttribute<PlatformNavigationPropertyAttribute>() == null
                )
                .PipeAction(changedMutableOrComputedFields => changedMutableOrComputedFields?.ForEach(p => Entry(entity!).Property(p.Key).IsModified = true));

            if (!isEntityTrackedModified)
            {
                isEntityTrackedModified =
                    changedMutableFields?.Any() == true
                    || entity
                        .GetChangedFields(
                            checkEntityModifiedByExistingEntity,
                            p => p.PropertyType.IsMutableType() && IsValidScalarOrOwnedProperty(p.Name, typeof(TEntity)))
                        ?.Any() == true;
            }
        }

        return (entity, isEntityTracked, !ReferenceEquals(local, entity) || isEntityTrackedModified);
    }

    public DbSet<TEntity> GetTable<TEntity>()
        where TEntity : class, IEntity, new()
    {
        return Set<TEntity>();
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ApplyEntityConfigurationsFromAssembly(modelBuilder);

        modelBuilder.ApplyConfiguration(new PlatformDataMigrationHistoryEntityConfiguration());
        modelBuilder.ApplyConfiguration(new PlatformInboxBusMessageEntityConfiguration());
        modelBuilder.ApplyConfiguration(new PlatformOutboxBusMessageEntityConfiguration());
    }

    protected void ApplyEntityConfigurationsFromAssembly(ModelBuilder modelBuilder)
    {
        // Auto apply configuration by convention for the current dbcontext (usually persistence layer) assembly.
        var applyForLimitedEntityTypes = ApplyForLimitedEntityTypes();

        if (applyForLimitedEntityTypes == null && PersistenceConfiguration?.ForCrossDbMigrationOnly == true)
            return;

        modelBuilder.ApplyConfigurationsFromAssembly(
            GetType().Assembly,
            entityConfigType =>
                applyForLimitedEntityTypes == null
                || applyForLimitedEntityTypes.Any(limitedEntityType =>
                    typeof(IEntityTypeConfiguration<>).GetGenericTypeDefinition().MakeGenericType(limitedEntityType).Pipe(entityConfigType.IsAssignableTo)
                )
        );
    }

    /// <summary>
    /// Override this in case you have two db context in same project, you dont want it to scan and apply entity configuration conflicted with each others. <br />
    /// return [typeof(Your Limited entity type for the db context to auto run entity configuration by scanning assembly)];
    /// </summary>
    protected virtual List<Type> ApplyForLimitedEntityTypes()
    {
        return null;
    }
}
