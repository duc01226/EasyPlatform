#region

using System.Diagnostics;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
using Easy.Platform.Application.MessageBus.Store;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common;
using Easy.Platform.Common.DependencyInjection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Persistence.DataMigration;
using Easy.Platform.Persistence.Domain;
using Easy.Platform.Persistence.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Persistence;

/// <summary>
/// Defines the contract for platform persistence modules that manage database contexts, repositories,
/// and data migration operations within the Platform framework.
/// </summary>
/// <remarks>
/// This interface extends <see cref="IPlatformModule"/> to provide persistence-specific functionality including:
/// - Database initialization and migration management
/// - Cross-database data migration coordination
/// - Repository and Unit of Work pattern implementation
/// - Service lifecycle management for persistence components
///
/// Implemented once per consuming service to standardize persistence layer management while supporting
/// different database technologies — relational (any EF Core provider) and document stores alike.
/// </remarks>
public interface IPlatformPersistenceModule : IPlatformModule
{
    /// <summary>
    /// Gets a value indicating whether this persistence module is used exclusively for cross-database migrations.
    /// </summary>
    /// <value>
    /// <c>true</c> if the module is configured only for cross-database data migration; otherwise, <c>false</c>.
    /// Default is <c>false</c>.
    /// </value>
    /// <remarks>
    /// When set to <c>true</c>, the module:
    /// - Skips database initialization and migration
    /// - Does not register repositories and Unit of Work managers
    /// - Only provides database context for an explicitly approved cross-database migration or reconciliation
    ///
    /// This boundary is for a named migration/reconciliation operation where a service must inspect or reconcile a
    /// peer-owned store without taking ownership of that store's persistence lifecycle. It is not a general runtime
    /// integration mechanism; runtime cross-service synchronization must use RabbitMQ and the owning service's API or
    /// consumer boundary.
    ///
    /// Example: a migration-only module reading a peer service's data while an approved reconciliation is running.
    /// </remarks>
    public bool ForCrossDbMigrationOnly { get; }

    /// <summary>
    /// Gets a value indicating whether the data migration has been successfully executed.
    /// </summary>
    /// <value>
    /// <c>true</c> if data migration has completed; otherwise, <c>false</c>.
    /// </value>
    /// <remarks>
    /// This property is set to <c>true</c> after <see cref="MigrateDataAsync"/> completes successfully.
    /// It's used to track module initialization state and ensure data migration runs only once per lifecycle.
    /// Combined with <see cref="IPlatformModule.InitExecuted"/>, it determines the complete initialization status.
    /// </remarks>
    public bool HasMigrationCompleted { get; }

    /// <summary>
    /// Gets a value indicating whether database initialization and migration should be disabled.
    /// </summary>
    /// <value>
    /// <c>true</c> if database initialization and migration is disabled; otherwise, <c>false</c>.
    /// Default is <c>false</c>.
    /// </value>
    /// <remarks>
    /// When set to <c>true</c>, the module:
    /// - Skips database schema initialization
    /// - Skips data migration execution
    /// - Still registers repositories and services
    ///
    /// This is useful for:
    /// - Shared database scenarios where multiple services connect to the same database
    /// - Testing environments where database is pre-configured
    /// - Services that consume existing databases without schema ownership
    ///
    /// Example: Multiple services in a microservice group sharing the same database instance.
    /// </remarks>
    public bool DisableDatabaseInitialization { get; }

    /// <summary>
    /// Asynchronously migrates application data for this persistence module.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous migration operation.</returns>
    /// <remarks>
    /// This method coordinates data migration by:
    /// 1. Executing dependency module migrations first (ordered by priority)
    /// 2. Running database-specific data migration logic
    /// 3. Handling retry logic for network-related failures (common in containerized environments)
    ///
    /// The method respects <see cref="ForCrossDbMigrationOnly"/> and <see cref="DisableDatabaseInitialization"/>
    /// flags to determine whether migration should be executed.
    ///
    /// Implementation should be idempotent and handle partial failure scenarios gracefully.
    /// </remarks>
    public Task MigrateDataAsync(IServiceScope serviceScope);

    /// <summary>
    /// Asynchronously initializes the database schema and configuration for this persistence module.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous initialization operation.</returns>
    /// <remarks>
    /// This method handles:
    /// - Database schema creation/updates
    /// - Index creation and optimization
    /// - Initial configuration setup
    /// - Connection validation
    ///
    /// Includes built-in retry logic for handling containerized environment startup delays
    /// where database servers may not be immediately available.
    ///
    /// The method respects <see cref="ForCrossDbMigrationOnly"/> and <see cref="DisableDatabaseInitialization"/>
    /// flags to determine whether initialization should be executed.
    /// </remarks>
    public Task InitializeDatabaseAsync(IServiceScope serviceScope);

    /// <summary>
    /// Executes data migration for all dependency persistence modules in priority order.
    /// </summary>
    /// <param name="moduleTypeDependencies">The list of module types that this module depends on.</param>
    /// <param name="serviceProvider">The service provider for resolving module instances.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous migration operation.</returns>
    /// <remarks>
    /// This static method coordinates cross-module data migration by:
    /// 1. Filtering for types implementing <see cref="IPlatformPersistenceModule"/>
    /// 2. Ordering modules by their <see cref="IPlatformModule.InitializationPriority"/> (descending)
    /// 3. Executing each module's <see cref="MigrateDataAsync"/> method in sequence
    /// 4. Using scoped service resolution to ensure proper dependency lifecycle
    ///
    /// This ensures that dependent data is migrated before modules that consume it.
    /// For example, a producing service's user data must be migrated before a consuming service processes it.
    ///
    /// Each migration runs in its own service scope to prevent resource leaks and ensure
    /// proper disposal of database contexts and connections.
    /// </remarks>
    public static async Task MigrateDependentModulesApplicationDataAsync(List<Type> moduleTypeDependencies, IServiceProvider serviceProvider)
    {
        await moduleTypeDependencies
            .Where(moduleType => moduleType.IsAssignableTo(typeof(IPlatformPersistenceModule)))
            .Select(moduleType => new { ModuleType = moduleType, serviceProvider.GetService(moduleType).As<IPlatformPersistenceModule>().InitializationPriority })
            .OrderByDescending(p => p.InitializationPriority)
            .Select(p => p.ModuleType)
            .ForEachAsync(async moduleType =>
            {
                await serviceProvider.ExecuteScopedAsync(
                    scope => scope.ServiceProvider.GetService(moduleType).As<IPlatformPersistenceModule>().MigrateDataAsync(scope));
            });
    }
}

/// <summary>
/// Abstract base class for platform persistence modules that provides standardized database context management,
/// repository registration, and data migration coordination within the Platform framework.
/// </summary>
/// <remarks>
/// This class serves as the foundation for all persistence modules in the Platform ecosystem, providing:
///
/// **Core Functionality:**
/// - Database context lifecycle management
/// - Repository and Unit of Work pattern implementation
/// - Service registration and dependency injection setup
/// - Data migration coordination with retry logic
/// - Activity tracing for monitoring and debugging
///
/// **Database Technology Support:**
/// - Entity Framework Core — provider-agnostic; ANY relational provider EF Core supports
/// - Document stores, via their own platform provider package
/// - Extensible for other database technologies
///
/// **Key Features:**
/// - Cross-database migration support for microservice data synchronization
/// - Connection pooling with recommended settings for performance
/// - Retry logic for containerized environments (Docker Compose scenarios)
/// - Inbox/Outbox message pattern support for event-driven architectures
/// - Configurable initialization priorities for dependency management
///
/// **Usage Examples:**
/// ```csharp
/// // Relational store, via EF Core (any provider EF Core supports)
/// public class MyRelationalPersistenceModule : PlatformPersistenceModule&lt;MyRelationalDbContext&gt;
/// {
///     // Provider-specific configuration lives in the derived module, never here
/// }
///
/// // Document store
/// public class MyDocumentPersistenceModule : PlatformPersistenceModule&lt;MyDocumentDbContext&gt;
/// {
///     // Document-store-specific configuration; cross-database access is limited to approved migration modules.
/// }
/// ```
///
/// **Recommended Connection Settings** (the constants below are the source of truth; keep this list in step with them):
/// - Pool size: <see cref="DefaultRecommendedMaxPoolSize" /> = <c>Max(EffectiveProcessorCount * 10, 30)</c> max,
///   <see cref="RecommendedMinPoolSize" /> = 1 min
/// - Idle lifetime: <see cref="RecommendedConnectionIdleLifetimeSeconds" /> = 30 seconds
/// - Retry: <see cref="RecommendedConnectionRetryOnFailureCount" /> = 10 attempts, backoff capped at
///   <see cref="RecommendedConnectionRetryDelay" /> = 3 seconds
/// - These settings optimize for containerized, high-concurrency scenarios
///
/// **Initialization Process:**
/// 1. Register database contexts and configurations
/// 2. Register repositories and Unit of Work managers
/// 3. Register message bus repositories (Inbox/Outbox pattern)
/// 4. Initialize database schema
/// 5. Execute data migrations (with dependency ordering)
///
/// **Monitoring and Observability:**
/// - Activity tracing for repository operations
/// - Unit of Work transaction monitoring
/// - Performance metrics collection
/// - Debug logging for development scenarios
/// </remarks>
public abstract class PlatformPersistenceModule : PlatformModule, IPlatformPersistenceModule
{
    /// <summary>
    /// Default execution priority for persistence modules initialization.
    /// Set higher than base platform modules to ensure core services are available first.
    /// </summary>
    public new const int DefaultInitializationPriority = PlatformModule.DefaultInitializationPriority + (InitializationPriorityTierGap * 2);

    /// <summary>
    /// Recommended connection idle lifetime in seconds for pruning idle connections.
    /// </summary>
    /// <remarks>
    /// Set to 30 seconds — balances connection reuse with resource cleanup in multi-pool microservices.
    /// Provider defaults for idle lifetime are typically in the hundreds of seconds; 30s prevents holding too many
    /// idle connections across ~15 pools while avoiding the reconnection churn caused by overly aggressive values
    /// (e.g., 5s). With MinPoolSize=1, at least one connection always survives pruning.
    /// </remarks>
    public static readonly int RecommendedConnectionIdleLifetimeSeconds = 30;

    /// <summary>
    /// Recommended number of retry attempts for database connection failures.
    /// </summary>
    /// <remarks>
    /// Set to 10 attempts to handle transient network issues common in containerized environments.
    /// Database containers may take time to become available during startup.
    /// </remarks>
    public static readonly int RecommendedConnectionRetryOnFailureCount = 10;

    /// <summary>
    /// Recommended maximum delay between connection retry attempts.
    /// </summary>
    /// <remarks>
    /// Set to 3 seconds as the upper bound for exponential backoff with jitter.
    /// A provider's retrying execution strategy randomizes actual delays between 0 and this value,
    /// reducing thundering herd probability when multiple services retry concurrently
    /// after a pool exhaustion event.
    /// Reduced from 5s: with 10 retries, the 5s cap produced a 40-50s worst-case wait budget
    /// that consumed most of a typical HTTP request timeout. 3s keeps total retry budget under ~20s.
    /// </remarks>
    public static readonly TimeSpan RecommendedConnectionRetryDelay = 3.Seconds();

    /// <summary>
    /// Per-CPU ratio for the relational connection pool and for the selected Hangfire MongoDB pools that reuse this
    /// shared ceiling. DERIVED from the I/O fan-out ratio the pools have to serve
    /// (<see cref="Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio" />) instead of being an independent
    /// literal, so the two cannot drift apart as hosts scale.
    /// </summary>
    /// <remarks>
    /// This is the pairing rule the Mongo provider already states for its own ceiling — "because both sides derive
    /// from the same processor count, overriding neither nor scaling the host can silently un-pair them"
    /// (<c>PlatformMongoDbPersistenceModule.DefaultNumberOfMaxConnectingPerCpuRatio</c>). Mongo honours it: pool
    /// ratio 25 against fan-out ratio 10, i.e. 2.5x headroom at every processor count. The relational default was
    /// the one member of that family whose ratio was picked WITHOUT reference to the fan-out it backs.
    /// <para>
    /// Was an independent <c>4</c>, which inverted the pairing. <see cref="Util.TaskRunner" /> documents ratio 10 as
    /// the default for work that waits on "DB, HTTP, queue, file", and the platform itself dispatches DB-touching
    /// work at that width: inbox <c>MaxParallelProcessingMessagesCount</c> (ratio 10), RabbitMQ
    /// <c>MaxConcurrentProcessing</c> (ratio 10), Hangfire worker count (ratio 5). Against a ratio-4 pool that is a
    /// 2.5x over-subscription at every processor count >= 5, and 40 workers against 20 connections under the
    /// Development cap of 4 (<see cref="PlatformEnvironment.EffectiveProcessorCount" />). A caller that followed the
    /// documented ratio-10 default for DB-bound fan-out therefore exhausted the pool and failed with a
    /// pool-exhaustion error only after burning the full connection timeout.
    /// </para>
    /// </remarks>
    public static readonly int DefaultNumberOfMaxPoolSizePerCpuRatio = Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

    /// <summary>
    /// Floor for <see cref="DefaultRecommendedMaxPoolSize" />, raised from 20 to 30.
    /// </summary>
    /// <remarks>
    /// The floor exists for SMALL hosts only. With ratio 10 it binds only when
    /// <see cref="PlatformEnvironment.EffectiveProcessorCount" /> is 1-2; from 3 upward the ratio wins. That is the
    /// point: the OLD floor of 20 was the binding constraint at the Development cap of 4 (<c>Max(4*4, 20) = 20</c>),
    /// so the previous default failed for its FLOOR, not for its ratio. A floor must never again be what starves a
    /// fan-out — 30 sits deliberately below the 40 the ratio yields at P=4.
    /// <para>
    /// Why 30 rather than 20 on a 1-2 core host: the platform's fixed background machinery (inbox and outbox
    /// processing, Hangfire, the interval ping loops) does not scale DOWN with processor count, so a tiny host still
    /// dispatches roughly the same number of concurrent DB touches as a large one.
    /// </para>
    /// <para>
    /// <b>Corrected 2026-09-09 — do not restore the previous claim.</b> This remark used to assert that 30 was "the
    /// value every bitten service already sets by hand" through per-service pool-size settings. That was FALSE and the
    /// surrounding argument was unsound. Verified: those per-service keys were read by NO code,
    /// <c>"Persistence": { "MaxPoolSize": ... }</c> — the one key this module actually reads — was set in NO settings
    /// file anywhere, and the deployment ConfigMap entries that mirrored them bound to nothing. So NO consuming
    /// service ever had an effective override, and none was special — every relational pool in every environment has
    /// always used this default. Nothing in that config was evidence FOR 30; it only showed what operators once
    /// intended, and the deployed values said 500, not 30.
    /// </para>
    /// <para>
    /// Those keys were live once, in a consuming service's own persistence module (introduced <c>8e8703997e9</c>,
    /// 2023-08-24, defaults 10/40); <c>9159d596c6f</c> later centralised pool sizing here onto
    /// <see cref="RecommendedMinPoolSize" /> / <see cref="GetRecommendedMaxPoolSize" /> without deleting the settings
    /// it replaced. They have been ORPHANED config ever since. All 13 settings-file occurrences, the 3 ConfigMap
    /// entries and the 12 environment-values entries were REMOVED on 2026-09-09 — a no-op at runtime (nothing read
    /// them), but they were actively misleading: they made both a "30 cap" and a "500 cap" look enforced when neither
    /// was. The live override key is <c>Persistence:MaxPoolSize</c> (<see cref="GetRecommendedMaxPoolSize" />) and it
    /// is deliberately left UNSET everywhere, so this constant is the single effective value.
    /// </para>
    /// </remarks>
    public const int MinRecommendedMaxPoolSize = 30;

    /// <summary>
    /// Default maximum size for database connection pools when no configuration is provided.
    /// </summary>
    /// <remarks>
    /// Formula: <c>Max(EffectiveProcessorCount * 10, 30)</c> — the pool must be able to SERVE the platform's own
    /// default I/O fan-out, because that fan-out is what the platform dispatches against it.
    /// <para>
    /// The previous <c>Max(ProcessorCount * 4, 20)</c> justified its multiplier with "the provider releases connections
    /// at each async yield". That does not hold for EF Core work: the connection is held for the life of the DbContext
    /// query/transaction, not returned at each <c>await</c>, so the burst capacity the *4 was meant to buy never
    /// materialised — the pool was simply 2.5x smaller than the concurrency aimed at it.
    /// </para>
    /// This is a CEILING, not a reservation: <see cref="RecommendedMinPoolSize" /> stays 1 and idle connections are
    /// pruned, so raising it costs nothing until the concurrency that was already being dispatched actually arrives.
    /// Override via <see cref="GetRecommendedMaxPoolSize()"/> virtual method in derived classes,
    /// or via appsettings "Persistence:MaxPoolSize".
    /// <para>
    /// <b>Production sizing is UNCAPPED, and that is a recorded, accepted decision (2026-09-09) — not an oversight.</b>
    /// The Development cap of 4 on <see cref="PlatformEnvironment.EffectiveProcessorCount" /> does NOT apply in
    /// production, and where the deployment sets no cpu request/limit this evaluates against the full
    /// node CPU count: on a 16-core node the per-pool ceiling moves from 64 (old ratio 4) to 160, across the roughly
    /// 15 relational pools a service opens. Four deployed service modules also reuse this static ceiling for their
    /// MongoDB Hangfire driver pools (Employee, Communication, Surveys, and Candidate Application), so those pools move
    /// with the same constant even though they are not EF Core pools. There is no deployment-side cap standing behind it either — the ConfigMap entries that looked
    /// like one were dead and have been removed (see <see cref="MinRecommendedMaxPoolSize" />). The raise was put to
    /// the code owner with those numbers and approved: <i>"raise in prod is ok, as long as it is reasonable better"</i>.
    /// </para>
    /// <para>
    /// Why it is reasonable rather than merely bigger: (a) this is a CEILING, not a reservation — with
    /// <see cref="RecommendedMinPoolSize" /> = 1 and <see cref="RecommendedConnectionIdleLifetimeSeconds" /> = 30 the
    /// steady-state connection count tracks actual concurrency, so nothing is consumed until the fan-out that was
    /// ALREADY being dispatched arrives; (b) 160 is ~1.6x the out-of-the-box <c>MaxPoolSize</c> that mainstream
    /// ADO.NET providers ship (commonly 100), i.e. the same order as a driver default, not a departure from it;
    /// (c) the alternative is the measured failure this constant was changed to close — a ratio-4 pool starved by the
    /// platform's own documented ratio-10 I/O fan-out. The uncapped-ness itself PRE-DATES this change (ratio 4 was
    /// uncapped too); what changed is the multiplier.
    /// </para>
    /// <para>
    /// What would make it bite, and what to watch: the ceiling only materialises under a genuine ~160-wide concurrent
    /// DB burst per pool. The binding resource is then the SERVER, not the client — the database's own maximum
    /// connection count, summed across all replicas and all services. If that ever becomes the constraint, the fix is
    /// a server-side limit (a connection proxy/pooler, or raising the server's connection maximum) or a per-pod cpu
    /// limit that lowers <see cref="PlatformEnvironment.EffectiveProcessorCount" /> — both of which move the pool WITH
    /// the fan-out.
    /// </para>
    /// <para>
    /// Deliberately NOT bounded by clamping this value: a clamp would put the pool BACK below the fan-out it exists
    /// to serve whenever ProcessorCount &gt; 10, re-opening the exact starvation this constant was changed to close,
    /// and breaking the pairing invariant pinned by TC-PLATMOD-049. The two sides must be bounded TOGETHER
    /// (pool AND <see cref="Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent" />) or not at all — that is a
    /// planned platform change with its own approval, not a constant to tweak here.
    /// </para>
    /// </remarks>
    public static readonly int DefaultRecommendedMaxPoolSize =
        Math.Max(PlatformEnvironment.EffectiveProcessorCount * DefaultNumberOfMaxPoolSizePerCpuRatio, MinRecommendedMaxPoolSize);

    /// <summary>
    /// Gets the recommended maximum connection pool size for this persistence module.
    /// </summary>
    /// <remarks>
    /// Base implementation: reads "Persistence:MaxPoolSize" from configuration,
    /// falling back to <see cref="DefaultRecommendedMaxPoolSize"/> (<c>Max(EffectiveProcessorCount * 10, 30)</c>).
    /// Override in derived classes to provide database-specific pool sizing.
    /// <para>
    /// "Persistence:MaxPoolSize" is the ONE live override key for the relational pool and is deliberately UNSET in
    /// every settings file and every deployment ConfigMap, so <see cref="DefaultRecommendedMaxPoolSize" /> is the
    /// value actually in force for the relational pools. The provider-prefixed per-service pool-size keys that used to
    /// sit beside it were orphaned by an earlier centralisation and were removed on 2026-09-09; do not reintroduce a
    /// second spelling — an override belongs here or nowhere (see <see cref="MinRecommendedMaxPoolSize" /> for the full
    /// history). The base method is provider-neutral across EF Core providers. Selected MongoDB Hangfire modules also
    /// reuse the static default directly for their driver pool ceiling, but they do not read this relational override key.
    /// </para>
    /// </remarks>
    protected virtual int GetRecommendedMaxPoolSize()
    {
        return Configuration.GetValue<int?>("Persistence:MaxPoolSize")
               ?? DefaultRecommendedMaxPoolSize;
    }


    /// <summary>
    /// Recommended minimum size for database connection pools.
    /// </summary>
    /// <remarks>
    /// Set to 1 to ensure at least one connection is always available for immediate use
    /// while minimizing resource consumption during low-activity periods.
    /// </remarks>
    public static readonly int RecommendedMinPoolSize = 1;

    protected PlatformPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Gets the default number of retry attempts for database initialization and migration operations.
    /// </summary>
    /// <value>
    /// 12 retries in development environment, 30 retries in production environment.
    /// </value>
    /// <remarks>
    /// Different retry counts are used based on environment:
    /// - Development: 12 retries with a 5-second delay, giving local infra up to one minute to become ready
    /// - Production: 30 retries with a 10-second delay, preserving a five-minute retry budget
    ///
    /// Used by <see cref="InitializeDatabaseAsync"/> and <see cref="MigrateDataAsync"/> for handling
    /// transient failures during application startup.
    /// </remarks>
    public static int DefaultDbInitAndMigrationRetryCount => PlatformEnvironment.IsDevelopment ? 12 : 30;

    /// <summary>
    /// Gets the default delay in seconds between database initialization and migration retry attempts.
    /// </summary>
    /// <value>
    /// 5 seconds in development environment, 10 seconds in production environment.
    /// </value>
    /// <remarks>
    /// Different retry delays are used based on environment:
    /// - Development: 5 seconds (local startup gets a one-minute retry window)
    /// - Production: 10 seconds (balanced with more retry attempts for the same total budget)
    ///
    /// Provides sufficient time for database containers to become available while
    /// not unnecessarily delaying application startup.
    /// </remarks>
    public static int DefaultDbInitAndMigrationRetryDelaySeconds => PlatformEnvironment.IsDevelopment ? 5 : 10;

    /// <summary>
    /// Gets the activity source names for distributed tracing of persistence operations.
    /// </summary>
    /// <returns>An array of activity source names for repositories, Unit of Work, and Unit of Work managers.</returns>
    /// <remarks>
    /// Enables distributed tracing for:
    /// - <see cref="IPlatformRepository"/> operations (CRUD, queries)
    /// - <see cref="IPlatformUnitOfWork"/> transactions (commit, rollback)
    /// - <see cref="IPlatformUnitOfWorkManager"/> lifecycle management
    ///
    /// Tracing data helps with:
    /// - Performance monitoring and optimization
    /// - Debugging complex data access patterns
    /// - Understanding transaction boundaries
    /// - Identifying bottlenecks in data operations
    ///
    /// Integrates with Application Insights, Jaeger, or other observability platforms.
    /// </remarks>
    public override string[] TracingSources()
    {
        return [IPlatformRepository.ActivitySource.Name, IPlatformUnitOfWork.ActivitySource.Name, IPlatformUnitOfWorkManager.ActivitySource.Name];
    }

    /// <summary>
    /// Gets a value indicating whether the current persistence module is used only for cross-database migrations.
    /// </summary>
    /// <value>
    /// <c>true</c> if this instance is for cross-database migrations only; otherwise, <c>false</c>.
    /// Default is <c>false</c>.
    /// </value>
    /// <remarks>
    /// When this property is set to <c>true</c>, the persistence module:
    /// - Will not register repositories and Unit of Work managers
    /// - Will not perform database initialization and migration
    /// - Only provides database context for an explicitly approved cross-database migration or reconciliation
    ///
    /// This is reserved for a named migration/reconciliation operation where a service must inspect or reconcile a
    /// peer-owned database without taking ownership of its persistence lifecycle. Runtime cross-service synchronization
    /// must use RabbitMQ and the owning service's API or consumer boundary.
    ///
    /// Example: a migration-only module accessing a peer service's database during an approved reconciliation.
    /// </remarks>
    public virtual bool ForCrossDbMigrationOnly => false;

    /// <summary>
    /// Gets or sets a value indicating whether data migration has been executed successfully.
    /// </summary>
    /// <value>
    /// <c>true</c> if data migration has completed; otherwise, <c>false</c>.
    /// </value>
    /// <remarks>
    /// This property is automatically set to <c>true</c> by the <see cref="MigrateDataAsync"/> method
    /// after successful completion. It's used internally to track module initialization state
    /// and ensure data migration runs only once per application lifecycle.
    /// </remarks>
    public bool HasMigrationCompleted { get; protected set; }

    /// <summary>
    /// Gets a value indicating whether database initialization and migration should be disabled.
    /// </summary>
    /// <value>
    /// <c>true</c> if database initialization and migration is disabled; otherwise, <c>false</c>.
    /// Default is <c>false</c>.
    /// </value>
    /// <remarks>
    /// When this property is set to <c>true</c>, the persistence module:
    /// - Skips database schema initialization
    /// - Skips data migration execution
    /// - Still registers repositories and services for data access
    ///
    /// This is useful for:
    /// - Shared database scenarios (multiple services, same database)
    /// - Testing environments with pre-configured databases
    /// - Services consuming existing databases without schema ownership
    ///
    /// Example: Multiple services in a microservice group sharing the same database instance
    /// where only one service is responsible for schema management.
    /// </remarks>
    public virtual bool DisableDatabaseInitialization => false;

    /// <summary>
    /// Gets the logical message-bus store key owned by this persistence module.
    /// </summary>
    /// <remarks>
    /// The default keeps existing single-store applications on the legacy compatibility path. A composite host should
    /// override this hook with a stable, non-empty key and bind it explicitly to its application lane.
    /// </remarks>
    public virtual PlatformMessageBusStoreKey MessageBusStoreKey => PlatformMessageBusStoreKey.Default;

    /// <summary>
    /// Gets a value indicating whether this persistence boundary contributes an inbox/outbox store to the
    /// composition registry.
    /// </summary>
    /// <remarks>
    /// Opt-in (default false). Existing hosts often load several runtime persistence modules (for example an EF
    /// database plus a Mongo permission database) that were never designed to own separate message stores; making
    /// them contribute implicitly would register conflicting contracts under the default key and move every service
    /// off the legacy unqualified inbox/outbox path. Only a persistence module composed into a multi-store host
    /// should override this with <c>true</c> together with <see cref="MessageBusStoreKey" /> and an explicit binding.
    /// </remarks>
    public virtual bool EnableMessageBusStoreContribution => false;

    /// <summary>
    /// Gets the concrete owner type used when this persistence boundary is composed into a message-bus store.
    /// </summary>
    /// <remarks>
    /// The default is the concrete module type, not the open generic base. This keeps two closed persistence modules
    /// distinguishable even when they share a provider and a physical database.
    /// </remarks>
    public virtual Type MessageBusStoreOwnerType => GetType();

    /// <summary>
    /// Gets the execution priority for this persistence module during application initialization.
    /// </summary>
    /// <value>
    /// The default execution priority, set higher than base platform modules.
    /// </value>
    /// <remarks>
    /// Persistence modules are initialized after core platform services but before
    /// application-specific modules that depend on data access.
    ///
    /// Higher priority values execute first, ensuring proper dependency ordering.
    /// </remarks>
    public override int InitializationPriority => DefaultInitializationPriority;

    /// <summary>
    /// Asynchronously migrates application data for this persistence module.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous migration operation.</returns>
    /// <remarks>
    /// This method must be implemented by concrete persistence modules to handle:
    /// - Database schema migration
    /// - Data transformation and migration
    /// - Seed data insertion
    /// - Cross-database data synchronization
    ///
    /// The implementation should be idempotent and handle partial failure scenarios gracefully.
    /// The base class coordinates dependency migration and sets <see cref="HasMigrationCompleted"/> upon completion.
    ///
    /// Called during application startup after <see cref="InitializeDatabaseAsync"/> completes successfully.
    /// </remarks>
    public abstract Task MigrateDataAsync(IServiceScope serviceScope);

    /// <summary>
    /// Asynchronously initializes the database schema and configuration for this persistence module.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous initialization operation.</returns>
    /// <remarks>
    /// This method must be implemented by concrete persistence modules to handle:
    /// - Database connection validation
    /// - Schema creation and updates
    /// - Index creation and optimization
    /// - Connection pool configuration
    /// - Performance monitoring setup
    ///
    /// The implementation should include appropriate error handling and logging.
    /// Called during application startup before <see cref="MigrateDataAsync"/>.
    ///
    /// The base class provides retry logic for handling containerized environment startup delays.
    /// </remarks>
    public abstract Task InitializeDatabaseAsync(IServiceScope serviceScope);

    /// <summary>
    /// Registers persistence-related services in the dependency injection container.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register services into.</param>
    /// <remarks>
    /// This method handles the registration of core persistence services including:
    ///
    /// **Always Registered:**
    /// - <see cref="IPlatformDbContext"/> implementations (scoped lifetime)
    ///
    /// **Conditionally Registered (when not <see cref="ForCrossDbMigrationOnly"/>):**
    /// - Unit of Work managers and implementations
    /// - Repository implementations (all or limited based on configuration)
    /// - Inbox/Outbox message repositories for event-driven patterns
    /// - General persistence services
    /// - Data migration executors
    ///
    /// **Service Lifetime Management:**
    /// - Database contexts: Scoped (per request/operation)
    /// - Unit of Work: Scoped (aligns with database context)
    /// - Repositories: Scoped (shares context with Unit of Work)
    /// - Configurations: Singleton (application-wide settings)
    ///
    /// **Cross-Database Migration Mode:**
    /// When <see cref="ForCrossDbMigrationOnly"/> is true, only database contexts are registered,
    /// allowing the module to provide data access without full persistence lifecycle management.
    ///
    /// **Service Discovery:**
    /// Uses assembly scanning from <see cref="GetAssembliesForServiceScanning"/> to automatically
    /// discover and register implementations of persistence interfaces.
    /// </remarks>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        base.InternalRegister(serviceCollection);

        // Register all database context implementations as scoped services
        serviceCollection.RegisterAllFromType<IPlatformDbContext>(GetAssembliesForServiceScanning(), ServiceLifeTime.Scoped);

        if (!ForCrossDbMigrationOnly)
        {
            // Register core persistence components
            RegisterUnitOfWorkManager(serviceCollection);
            serviceCollection.RegisterAllFromType<IPlatformUnitOfWork>(GetAssembliesForServiceScanning());
            RegisterRepositories(serviceCollection);

            // Register event-driven messaging components
            RegisterInboxEventBusMessageRepository(serviceCollection);
            RegisterOutboxEventBusMessageRepository(serviceCollection);

            // Register general persistence services
            serviceCollection.RegisterAllFromType<IPersistenceService>(GetAssembliesForServiceScanning());

            // Register data migration executors
            serviceCollection.RegisterAllFromType<IPlatformDataMigrationExecutor>(Assembly);
        }
    }

    /// <summary>
    /// Performs internal initialization tasks for the persistence module.
    /// </summary>
    /// <param name="serviceScope">The service scope for initialization operations.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous initialization operation.</returns>
    /// <remarks>
    /// This method coordinates the initialization sequence:
    /// 1. Calls base class initialization (core platform services)
    /// 2. Initializes the database schema and configuration
    ///
    /// Database initialization includes connection validation, schema creation,
    /// and performance optimization setup with built-in retry logic for
    /// containerized environments.
    /// </remarks>
    protected override async Task InternalInit(IServiceScope serviceScope)
    {
        await base.InternalInit(serviceScope);

        await InitializeDatabaseAsync(serviceScope);
    }

    /// <summary>
    /// Allows derived classes to specify a limited set of repository implementation types to register.
    /// </summary>
    /// <returns>
    /// A list of repository implementation types to register, or <c>null</c> to register all discovered repositories.
    /// </returns>
    /// <remarks>
    /// Override this method to restrict which repository implementations are registered for this persistence module.
    /// This is useful for:
    /// - Performance optimization (registering only needed repositories)
    /// - Security (limiting access to specific data stores)
    /// - Testing (registering mock repositories)
    ///
    /// When this method returns a non-empty list, only the specified repository types are registered.
    /// When it returns <c>null</c> or an empty list, all discovered repository implementations are registered.
    ///
    /// Example:
    /// ```csharp
    /// protected override List&lt;Type&gt; RegisterLimitedRepositoryImplementationTypes()
    /// {
    ///     return new List&lt;Type&gt; { typeof(UserRepository), typeof(ProductRepository) };
    /// }
    /// ```
    /// </remarks>
    protected virtual List<Type> RegisterLimitedRepositoryImplementationTypes()
    {
        return null;
    }

    /// <summary>
    /// Registers Inbox message repository for the event-driven messaging pattern.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register the repository into.</param>
    /// <remarks>
    /// The Inbox pattern ensures reliable message processing by:
    /// - Storing incoming messages in the database before processing
    /// - Preventing duplicate message processing through deduplication
    /// - Enabling message processing retry for failed operations
    /// - Maintaining message processing audit trail
    ///
    /// Registration occurs only when:
    /// - <see cref="IsInboxBusMessageEnabled"/> returns <c>true</c>
    /// - Module is not in <see cref="ForCrossDbMigrationOnly"/> mode
    ///
    /// Used by any consuming service that processes events published by other microservices.
    /// </remarks>
    protected virtual void RegisterInboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (IsInboxBusMessageEnabled())
            serviceCollection.RegisterAllFromType<IPlatformInboxBusMessageRepository>(GetAssembliesForServiceScanning());
    }

    /// <summary>
    /// Registers Outbox message repository for the event-driven messaging pattern.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register the repository into.</param>
    /// <remarks>
    /// The Outbox pattern ensures reliable message publishing by:
    /// - Storing outgoing messages in the database within the same transaction as business data
    /// - Guaranteeing message delivery through background processing
    /// - Preventing message loss during system failures
    /// - Enabling at-least-once delivery semantics
    ///
    /// Registration occurs only when:
    /// - <see cref="IsOutboxBusMessageEnabled"/> returns <c>true</c>
    /// - Module is not in <see cref="ForCrossDbMigrationOnly"/> mode
    ///
    /// Used by any consuming service that publishes domain events to other microservices.
    /// </remarks>
    protected virtual void RegisterOutboxEventBusMessageRepository(IServiceCollection serviceCollection)
    {
        if (IsOutboxBusMessageEnabled())
            serviceCollection.RegisterAllFromType<IPlatformOutboxBusMessageRepository>(GetAssembliesForServiceScanning());
    }

    /// <summary>
    /// Determines whether the Inbox message pattern should be enabled for this persistence module.
    /// </summary>
    /// <returns>
    /// <c>true</c> to enable Inbox message processing; otherwise, <c>false</c>. Default is <c>true</c>.
    /// </returns>
    /// <remarks>
    /// Override this method to disable the Inbox pattern for persistence modules that:
    /// - Don't consume events from other services
    /// - Use alternative messaging patterns
    /// - Are read-only or reporting services
    ///
    /// When enabled, the module can reliably process incoming events from other microservices
    /// with deduplication and retry capabilities.
    /// </remarks>
    protected virtual bool IsInboxBusMessageEnabled()
    {
        return true;
    }

    /// <summary>
    /// Determines whether the Outbox message pattern should be enabled for this persistence module.
    /// </summary>
    /// <returns>
    /// <c>true</c> to enable Outbox message publishing; otherwise, <c>false</c>. Default is <c>true</c>.
    /// </returns>
    /// <remarks>
    /// Override this method to disable the Outbox pattern for persistence modules that:
    /// - Don't publish events to other services
    /// - Use synchronous communication patterns
    /// - Are purely consumer services without domain events
    ///
    /// When enabled, the module can reliably publish domain events to other microservices
    /// with transactional guarantees and at-least-once delivery.
    /// </remarks>
    protected virtual bool IsOutboxBusMessageEnabled()
    {
        return true;
    }

    /// <summary>
    /// Registers Unit of Work manager services for coordinating database transactions.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register services into.</param>
    /// <remarks>
    /// This method registers:
    /// 1. Default Unit of Work manager (<see cref="PlatformDefaultPersistenceUnitOfWorkManager"/>) as scoped service
    /// 2. All custom Unit of Work manager implementations discovered through assembly scanning
    ///
    /// **Service Lifetime:**
    /// - Scoped: Ensures Unit of Work managers are tied to request/operation lifecycle
    /// - Aligns with database context lifetime for proper transaction coordination
    ///
    /// **Registration Strategy:**
    /// - Default implementation is always registered first
    /// - Custom implementations can override default behavior through dependency injection
    /// - Uses "ByService" strategy to prevent duplicate registrations
    ///
    /// Unit of Work managers coordinate multiple repositories within a single transaction,
    /// ensuring data consistency across complex business operations.
    /// </remarks>
    protected virtual void RegisterUnitOfWorkManager(IServiceCollection serviceCollection)
    {
        // Register default Unit of Work manager
        serviceCollection.Register<IPlatformUnitOfWorkManager, PlatformDefaultPersistenceUnitOfWorkManager>(ServiceLifeTime.Scoped);

        // Register custom Unit of Work manager implementations
        serviceCollection.RegisterAllFromType<IPlatformUnitOfWorkManager>(
            GetAssembliesForServiceScanning(),
            ServiceLifeTime.Scoped,
            true,
            DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );
    }

    /// <summary>
    /// Registers repository implementations for data access operations.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register repositories into.</param>
    /// <remarks>
    /// This method handles repository registration based on configuration:
    ///
    /// **Cross-Database Migration Mode:**
    /// - No repositories are registered when <see cref="ForCrossDbMigrationOnly"/> is true
    /// - Allows pure database context access without repository overhead
    ///
    /// **Limited Repository Registration:**
    /// - When <see cref="RegisterLimitedRepositoryImplementationTypes"/> returns specific types
    /// - Only those repository implementations are registered
    /// - Useful for performance optimization and security constraints
    ///
    /// **Full Repository Registration:**
    /// - When no limitations are specified, all discovered repository implementations are registered
    /// - Uses assembly scanning to find implementations of <see cref="IPlatformRepository"/>
    ///
    /// **Service Lifetime:**
    /// - All repositories are registered with scoped lifetime
    /// - Ensures repositories share database context with Unit of Work
    /// - Enables proper transaction coordination across multiple repositories
    ///
    /// Examples of registered repositories:
    /// - UserRepository, ProductRepository (business entities)
    /// - AuditLogRepository (cross-cutting concerns)
    /// - ReportingRepository (read-only operations)
    /// </remarks>
    private void RegisterRepositories(IServiceCollection serviceCollection)
    {
        if (ForCrossDbMigrationOnly)
            return;

        if (RegisterLimitedRepositoryImplementationTypes()?.Any() == true)
        {
            // Register only specified repository implementations
            RegisterLimitedRepositoryImplementationTypes()
                .ForEach(repositoryImplementationType => serviceCollection.RegisterAllForImplementation(repositoryImplementationType));
        }
        else
        {
            // Register all discovered repository implementations
            serviceCollection.RegisterAllFromType<IPlatformRepository>(GetAssembliesForServiceScanning());
        }
    }
}

/// <summary>
/// Generic implementation of platform persistence module that provides type-safe database context management
/// and standardized initialization patterns for specific database context types.
/// </summary>
/// <typeparam name="TDbContext">
/// The specific database context type that implements <see cref="IPlatformDbContext{TDbContext}"/>.
/// </typeparam>
/// <remarks>
/// This generic class extends <see cref="PlatformPersistenceModule"/> to provide:
///
/// **Type-Safe Database Context Management:**
/// - Strongly-typed access to specific database context implementations
/// - Automatic registration of the specific database context type
/// - Type-safe configuration management for the database context
///
/// **Database Technology Examples:**
/// ```csharp
/// // Relational store, via Entity Framework Core (any provider EF Core supports)
/// public class MyRelationalPersistenceModule : PlatformPersistenceModule&lt;MyRelationalDbContext&gt;
/// {
///     protected override PlatformPersistenceConfiguration&lt;MyRelationalDbContext&gt; ConfigurePersistenceConfiguration(
///         PlatformPersistenceConfiguration&lt;MyRelationalDbContext&gt; config, IConfiguration configuration)
///     {
///         return config.With(c => c.BadQueryWarningConfig.LogSlowQueries = true);
///     }
/// }
///
/// // Document store
/// public class MyDocumentPersistenceModule : PlatformPersistenceModule&lt;MyDocumentDbContext&gt;
/// {
///     public override PlatformPersistenceConfigurationPooledDbContextOptions PooledDbContextOptions()
///     {
///         return new() { Enabled = true, MaxPoolSize = 100 };
///     }
/// }
/// ```
///
/// **Key Features:**
/// - **Dependency-Ordered Migration**: Executes dependency module migrations before own migration
/// - **Retry Logic**: Built-in retry mechanisms for containerized environments (Docker Compose)
/// - **Connection Pooling**: Configurable database context pooling for performance optimization
/// - **Configuration Management**: Type-safe persistence configuration with environment-specific settings
/// - **Initialization State Tracking**: Combines base initialization with data migration completion status
///
/// **Initialization Sequence:**
/// 1. Register database context and configuration services
/// 2. Register optional database context pooling
/// 3. Execute base persistence service registration
/// 4. Initialize database schema (with retry logic)
/// 5. Execute dependency module data migrations (ordered by priority)
/// 6. Execute own data migration logic
/// 7. Set initialization completion flags
///
/// **Containerized Environment Support:**
/// - Default retry counts: 5 (development) / 10 (production)
/// - Default retry delays: 15s (development) / 30s (production)
/// - Handles database container startup delays gracefully
/// - Comprehensive error logging for troubleshooting
///
/// **Performance Optimization:**
/// - Optional database context pooling (enabled by default)
/// - Configurable pool sizes and connection management
/// - Query performance monitoring and alerting
/// - Memory-efficient context lifecycle management
///
/// **Cross-Service Integration:**
/// - Supports cross-database data migration scenarios
/// - Enables data synchronization between microservices
/// - Maintains transactional integrity across operations
/// - Provides audit trails for data migration activities
/// </remarks>
public abstract class PlatformPersistenceModule<TDbContext> : PlatformPersistenceModule, IPlatformPersistenceModule
    where TDbContext : class, IPlatformDbContext<TDbContext>
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformPersistenceModule{TDbContext}"/> class.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution.</param>
    /// <param name="configuration">The application configuration.</param>
    protected PlatformPersistenceModule(IServiceProvider serviceProvider, IConfiguration configuration)
        : base(serviceProvider, configuration)
    {
    }

    /// <summary>
    /// Gets the execution priority for this persistence module during application initialization.
    /// </summary>
    /// <value>
    /// The default execution priority for persistence modules.
    /// </value>
    /// <remarks>
    /// Uses the same priority as the base class to ensure consistent initialization ordering
    /// across different database context types.
    /// </remarks>
    public override int InitializationPriority => DefaultInitializationPriority;

    /// <summary>
    /// Gets a value indicating whether the module has been completely initialized.
    /// </summary>
    /// <value>
    /// <c>true</c> if both base initialization and data migration have completed; otherwise, <c>false</c>.
    /// </value>
    /// <remarks>
    /// This property combines two initialization states:
    /// - <see cref="IPlatformModule.InitExecuted"/>: Base platform services initialized
    /// - <see cref="HasMigrationCompleted"/>: Database migration completed
    ///
    /// Both conditions must be true for the module to be considered fully operational.
    /// Used by the platform framework to determine when dependent services can be started.
    /// </remarks>
    public override bool IsFullyInitialized => InitExecuted && HasMigrationCompleted;

    /// <summary>
    /// Asynchronously migrates application data for the specific database context.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous migration operation.</returns>
    /// <remarks>
    /// This method coordinates data migration in the following sequence:
    ///
    /// **1. Dependency Migration:**
    /// - Executes data migration for all dependency persistence modules first
    /// - Modules are processed in priority order (highest priority first)
    /// - Ensures dependent data is available before processing own data
    ///
    /// **2. Database Context Migration:**
    /// - Calls the database context's <see cref="IPlatformDbContext{TDbContext}.MigrateDataAsync"/> method
    /// - Includes retry logic for handling containerized environment issues
    /// - Skipped if <see cref="PlatformPersistenceModule.ForCrossDbMigrationOnly"/> or <see cref="PlatformPersistenceModule.DisableDatabaseInitialization"/> is true
    ///
    /// **3. State Management:**
    /// - Sets <see cref="PlatformPersistenceModule.HasMigrationCompleted"/> to true upon successful completion
    /// - Enables the <see cref="IsFullyInitialized"/> property to return true when combined with base initialization
    ///
    /// **Retry Logic:**
    /// - Default retry count: 5 (development) / 10 (production)
    /// - Default retry delay: 15s (development) / 30s (production)
    /// - Handles Docker Compose scenarios where database containers may be starting up
    ///
    /// **Error Handling:**
    /// - Comprehensive logging with beautified stack traces
    /// - Database context type identification in error messages
    /// - Exception type classification for troubleshooting
    ///
    /// **Cross-Database Migration/Reconciliation Examples:**
    /// - An approved migration reconciling a peer service's user data
    /// - A migration-only module synchronizing a peer-owned store under an explicit reconciliation boundary
    /// - An approved operation integrating multiple data sources without turning this module into a runtime peer writer
    /// </remarks>
    public override async Task MigrateDataAsync(IServiceScope serviceScope)
    {
        // Execute dependency module migrations first
        await IPlatformPersistenceModule.MigrateDependentModulesApplicationDataAsync(
            GetDependentModuleTypes().SelectList(p => p.Invoke(Configuration)),
            ServiceProvider
        );

        if (!ForCrossDbMigrationOnly && !DisableDatabaseInitialization)
        {
            // Execute database context migration with retry logic for containerized environments
            await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                () => serviceScope.ServiceProvider.GetRequiredService<TDbContext>().MigrateDataAsync(serviceScope.ServiceProvider),
                retryAttempt => DefaultDbInitAndMigrationRetryDelaySeconds.Seconds(),
                DefaultDbInitAndMigrationRetryCount,
                exception =>
                    Logger.LogError(
                        exception.BeautifyStackTrace(),
                        "[{DbContext}] {ExceptionType} detected on attempt MigrateDataAsync",
                        typeof(TDbContext).Name,
                        exception.GetType().Name
                    )
            );
        }

        HasMigrationCompleted = true;
    }

    /// <summary>
    /// Asynchronously initializes the database schema and configuration for the specific database context.
    /// </summary>
    /// <param name="serviceScope">The service scope providing access to registered services and dependencies.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous initialization operation.</returns>
    /// <remarks>
    /// This method handles database initialization with the following logic:
    ///
    /// **Conditional Execution:**
    /// - Skipped when <see cref="PlatformPersistenceModule.ForCrossDbMigrationOnly"/> is true (cross-database access only)
    /// - Skipped when <see cref="PlatformPersistenceModule.DisableDatabaseInitialization"/> is true (shared database scenarios)
    ///
    /// **Initialization Tasks:**
    /// - Database connection validation and setup
    /// - Schema creation and updates through the database context
    /// - Index creation and optimization
    /// - Performance monitoring configuration
    /// - Connection pool setup and validation
    ///
    /// **Retry Logic for Containerized Environments:**
    /// - 5-second delay between retry attempts in development, 10 seconds otherwise
    /// - Default retry count: 12 (development) / 30 (production)
    /// - Handles Docker Compose scenarios where database containers are starting up
    /// - Common in CI/CD pipelines and local development environments
    ///
    /// **Error Handling:**
    /// - Comprehensive logging with beautified stack traces
    /// - Database context type identification in error messages
    /// - Exception type classification for troubleshooting
    ///
    /// **Database Technology Examples:**
    /// - Relational (EF Core, any provider): schema migration, connection pool setup, performance monitoring
    /// - Document store: collection creation, index setup, connection validation
    ///
    /// Called before <see cref="MigrateDataAsync"/> during application startup sequence.
    /// </remarks>
    public override async Task InitializeDatabaseAsync(IServiceScope serviceScope)
    {
        if (ForCrossDbMigrationOnly || DisableDatabaseInitialization)
            return;

        // Initialize database with retry logic for containerized environments
        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => serviceScope.ServiceProvider.GetRequiredService<TDbContext>().Initialize(serviceScope.ServiceProvider),
            retryAttempt => 10.Seconds(),
            DefaultDbInitAndMigrationRetryCount,
            exception =>
                Logger.LogError(
                    exception.BeautifyStackTrace(),
                    "[{DbContext}] {ExceptionType} detected on attempt InitializeDatabaseAsync",
                    typeof(TDbContext).Name,
                    exception.GetType().Name)
        );
    }

    /// <summary>
    /// Configures database context pooling options for performance optimization.
    /// </summary>
    /// <returns>
    /// A <see cref="PlatformPersistenceConfigurationPooledDbContextOptions"/> instance with pooling configuration.
    /// </returns>
    /// <remarks>
    /// Database context pooling improves performance by reusing database context instances
    /// instead of creating new ones for each operation. This is particularly beneficial for:
    ///
    /// **Performance Benefits:**
    /// - Reduces object allocation overhead
    /// - Improves query response times
    /// - Reduces garbage collection pressure
    /// - Optimizes connection pool utilization
    ///
    /// **Default Configuration:**
    /// - Pooling is enabled by default (<see cref="PlatformPersistenceConfigurationPooledDbContextOptions.Enabled"/> = true)
    /// - Uses recommended pool sizes from the base class
    /// - Appropriate for most read-heavy scenarios
    ///
    /// **Customization Examples:**
    /// ```csharp
    /// // High-performance configuration for read-heavy services
    /// public override PlatformPersistenceConfigurationPooledDbContextOptions PooledDbContextOptions()
    /// {
    ///     return new()
    ///     {
    ///         Enabled = true,
    ///         MaxPoolSize = 200,
    ///         MinPoolSize = 10
    ///     };
    /// }
    ///
    /// // Disable pooling for write-heavy services
    /// public override PlatformPersistenceConfigurationPooledDbContextOptions PooledDbContextOptions()
    /// {
    ///     return new() { Enabled = false };
    /// }
    /// ```
    ///
    /// **When to Use Pooling:**
    /// - Read-heavy operations (queries, reports)
    /// - High-concurrency scenarios
    /// - Stateless operations
    ///
    /// **When to Avoid Pooling:**
    /// - Write-heavy operations with long transactions
    /// - Stateful operations requiring context customization
    /// - Complex transaction scenarios
    ///
    /// Override this method to customize pooling behavior for specific database contexts.
    /// </remarks>
    public virtual PlatformPersistenceConfigurationPooledDbContextOptions PooledDbContextOptions()
    {
        return new PlatformPersistenceConfigurationPooledDbContextOptions();
    }

    /// <summary>
    /// Registers database context, configuration, and optional pooling services in the dependency injection container.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register services into.</param>
    /// <remarks>
    /// This method extends the base registration with database context-specific services:
    ///
    /// **Registration Sequence:**
    /// 1. **Database Context Registration**: Registers the specific database context implementation as scoped
    /// 2. **Configuration Registration**: Registers type-safe persistence configuration
    /// 3. **Optional Pooling Registration**: Registers database context pooling if enabled
    /// 4. **Base Service Registration**: Calls base class to register common persistence services
    ///
    /// **Service Lifetimes:**
    /// - Database Context: Scoped (per request/operation)
    /// - Configuration: Singleton (application-wide settings)
    /// - Pooled Context: Singleton pool with scoped instances
    ///
    /// **Configuration Setup:**
    /// - Creates type-safe configuration with cross-database migration flags
    /// - Applies pooling options from <see cref="PooledDbContextOptions"/>
    /// - Calls <see cref="ConfigurePersistenceConfiguration"/> for custom configuration
    /// - Registers both concrete and interface types for flexibility
    ///
    /// **Database Context Pooling:**
    /// - Conditionally registered based on <see cref="PlatformPersistenceConfigurationPooledDbContextOptions.Enabled"/>
    /// - Improves performance for read-heavy scenarios
    /// - Managed through <see cref="RegisterDbContextPool"/> virtual method
    ///
    /// The registration order ensures dependencies are available when needed by subsequent services.
    /// </remarks>
    protected override void InternalRegister(IServiceCollection serviceCollection)
    {
        // Register the specific database context implementation
        serviceCollection.RegisterAllForImplementation<TDbContext>(ServiceLifeTime.Scoped);

        // Register type-safe persistence configuration
        RegisterPersistenceConfiguration(serviceCollection);

        // Register optional database context pooling for performance
        if (PooledDbContextOptions().Enabled)
            RegisterDbContextPool(serviceCollection);

        // Register base persistence services
        base.InternalRegister(serviceCollection);
    }

    /// <summary>
    /// Publishes this persistence module's typed message-store contribution after a provider has registered its
    /// context-specific repositories and inner unit-of-work service.
    /// </summary>
    /// <param name="serviceCollection">The service collection receiving the contribution.</param>
    /// <param name="unitOfWorkServiceType">The closed provider-specific inner unit-of-work service type.</param>
    /// <remarks>
    /// The aggregate <see cref="IPlatformUnitOfWorkManager" /> remains the compatibility manager used by existing
    /// repositories. Keyed consumers use the closed repository and inner unit-of-work service contracts recorded here,
    /// so resolving a keyed store never selects the last unqualified repository registration.
    /// </remarks>
    protected void RegisterMessageBusStoreContribution(IServiceCollection serviceCollection, Type unitOfWorkServiceType)
    {
        ArgumentNullException.ThrowIfNull(serviceCollection);

        if (!EnableMessageBusStoreContribution)
            return;

        var isRuntimeEnabled = !ForCrossDbMigrationOnly;
        var inboxRepositoryServiceType = isRuntimeEnabled && IsInboxBusMessageEnabled()
            ? typeof(IPlatformInboxBusMessageRepository<TDbContext>)
            : null;
        var outboxRepositoryServiceType = isRuntimeEnabled && IsOutboxBusMessageEnabled()
            ? typeof(IPlatformOutboxBusMessageRepository<TDbContext>)
            : null;

        if (isRuntimeEnabled)
            ArgumentNullException.ThrowIfNull(unitOfWorkServiceType);

        serviceCollection.AddSingleton(
            new PlatformPersistenceMessageBusStoreRegistration(
                MessageBusStoreKey,
                MessageBusStoreOwnerType,
                typeof(TDbContext),
                inboxRepositoryServiceType,
                outboxRepositoryServiceType,
                isRuntimeEnabled ? typeof(IPlatformUnitOfWorkManager) : null,
                inboxRepositoryServiceType == null
                    ? null
                    : serviceProvider =>
                        (IPlatformInboxBusMessageRepository)serviceProvider.GetRequiredService(inboxRepositoryServiceType),
                outboxRepositoryServiceType == null
                    ? null
                    : serviceProvider =>
                        (IPlatformOutboxBusMessageRepository)serviceProvider.GetRequiredService(outboxRepositoryServiceType),
                isRuntimeEnabled
                    ? serviceProvider => serviceProvider.GetRequiredService<IPlatformUnitOfWorkManager>()
                    : null,
                isRuntimeEnabled: isRuntimeEnabled,
                unitOfWorkServiceType: isRuntimeEnabled ? unitOfWorkServiceType : null,
                unitOfWorkFactory: isRuntimeEnabled
                    ? serviceProvider => (IPlatformUnitOfWork)serviceProvider.GetRequiredService(unitOfWorkServiceType)
                    : null));
    }

    /// <summary>
    /// Registers type-safe persistence configuration services for the specific database context.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register configuration services into.</param>
    /// <remarks>
    /// This method creates and registers persistence configuration with the following setup:
    ///
    /// **Configuration Creation:**
    /// - Creates a new <see cref="PlatformPersistenceConfiguration{TDbContext}"/> instance
    /// - Sets <see cref="IPlatformPersistenceConfiguration.ForCrossDbMigrationOnly"/> flag
    /// - Applies pooling options from <see cref="PooledDbContextOptions"/>
    /// - Calls <see cref="ConfigurePersistenceConfiguration"/> for custom configuration
    ///
    /// **Service Registration:**
    /// - Registers concrete configuration type as singleton
    /// - Registers interface type pointing to concrete implementation
    /// - Uses "ByService" strategy to prevent duplicate registrations
    ///
    /// **Configuration Flow:**
    /// 1. Create base configuration with default settings
    /// 2. Apply module-specific flags (cross-database migration, pooling)
    /// 3. Apply custom configuration through virtual method
    /// 4. Register both concrete and interface types for dependency injection
    ///
    /// **Service Lifetime:**
    /// - Singleton: Configuration is application-wide and doesn't change during runtime
    /// - Enables efficient configuration sharing across all persistence operations
    ///
    /// The configuration is used throughout the persistence layer for:
    /// - Database connection management
    /// - Query performance monitoring
    /// - Cross-database migration coordination
    /// - Debug logging and diagnostics
    /// </remarks>
    protected void RegisterPersistenceConfiguration(IServiceCollection serviceCollection)
    {
        // Register concrete configuration type
        serviceCollection.Register(
            sp =>
                new PlatformPersistenceConfiguration<TDbContext>()
                    .With(config => config.ForCrossDbMigrationOnly = ForCrossDbMigrationOnly)
                    .With(config => config.PooledOptions = PooledDbContextOptions())
                    .Pipe(config => ConfigurePersistenceConfiguration(config, Configuration)),
            ServiceLifeTime.Singleton
        );

        // Register interface type pointing to concrete implementation
        serviceCollection.Register(
            typeof(IPlatformPersistenceConfiguration<TDbContext>),
            sp => sp.GetRequiredService<PlatformPersistenceConfiguration<TDbContext>>(),
            ServiceLifeTime.Singleton,
            replaceStrategy: DependencyInjectionExtension.CheckRegisteredStrategy.ByService
        );
    }

    /// <summary>
    /// Configures the persistence configuration for the specific database context.
    /// </summary>
    /// <param name="config">The initial persistence configuration with default settings.</param>
    /// <param name="configuration">The application's configuration for accessing environment-specific settings.</param>
    /// <returns>The configured persistence configuration with any custom modifications applied.</returns>
    /// <remarks>
    /// Override this method to customize persistence configuration for specific database contexts:
    ///
    /// **Common Customizations:**
    /// ```csharp
    /// protected override PlatformPersistenceConfiguration&lt;MyDbContext&gt; ConfigurePersistenceConfiguration(
    ///     PlatformPersistenceConfiguration&lt;MyDbContext&gt; config, IConfiguration configuration)
    /// {
    ///     // Enable query performance monitoring
    ///     config.BadQueryWarningConfig.LogSlowQueries = true;
    ///     config.BadQueryWarningConfig.SlowQueryThresholdMs = 1000;
    ///
    ///     // Configure debug logging for development
    ///     if (PlatformEnvironment.IsDevelopment)
    ///     {
    ///         config.EnableDebugLogging = true;
    ///     }
    ///
    ///     // Environment-specific connection settings
    ///     var connectionString = configuration.GetConnectionString("MyDatabase");
    ///     // Apply connection string modifications...
    ///
    ///     return config;
    /// }
    /// ```
    ///
    /// **Configuration Options:**
    /// - Query performance monitoring thresholds
    /// - Debug logging enablement
    /// - Cross-database migration settings
    /// - Connection pooling parameters
    /// - Environment-specific overrides
    ///
    /// **Best Practices:**
    /// - Use environment checks for development vs production settings
    /// - Read sensitive configuration from secure configuration providers
    /// - Apply reasonable defaults with option to override
    /// - Document any custom configuration requirements
    ///
    /// The default implementation returns the configuration unchanged.
    /// </remarks>
    protected virtual PlatformPersistenceConfiguration<TDbContext> ConfigurePersistenceConfiguration(
        PlatformPersistenceConfiguration<TDbContext> config,
        IConfiguration configuration
    )
    {
        return config;
    }

    /// <summary>
    /// Registers database context pooling services when pooling is enabled.
    /// </summary>
    /// <param name="serviceCollection">The service collection to register pooling services into.</param>
    /// <remarks>
    /// This virtual method allows derived classes to implement database-specific context pooling:
    ///
    /// **Implementation Examples:**
    /// ```csharp
    /// // Entity Framework Core pooling
    /// protected override void RegisterDbContextPool(IServiceCollection serviceCollection)
    /// {
    ///     var poolOptions = PooledDbContextOptions();
    ///     serviceCollection.AddDbContextPool&lt;MyDbContext&gt;(options =>
    ///     {
    ///         options.UseMyEfCoreProvider(connectionString); // whichever EF Core provider this context targets
    ///         // Configure additional options...
    ///     }, poolOptions.MaxPoolSize);
    /// }
    ///
    /// // Document-store pooling
    /// protected override void RegisterDbContextPool(IServiceCollection serviceCollection)
    /// {
    ///     // Many document-store drivers pool connections at the client level
    ///     // Register pooled client instances if needed
    /// }
    /// ```
    ///
    /// **Database Technology Considerations:**
    /// - **Entity Framework Core**: Use AddDbContextPool for built-in pooling
    /// - **Document stores**: Connection pooling typically handled by the store's own driver
    /// - **Other ORMs**: Implement custom pooling based on ORM capabilities
    ///
    /// **When Called:**
    /// - Only when <see cref="PlatformPersistenceConfigurationPooledDbContextOptions.Enabled"/> is true
    /// - During service registration phase of application startup
    /// - Before base persistence services are registered
    ///
    /// **Performance Considerations:**
    /// - Pool sizes should be tuned based on application load
    /// - Consider memory usage vs performance trade-offs
    /// - Monitor pool utilization in production environments
    ///
    /// The default implementation is empty, allowing derived classes to implement as needed.
    /// </remarks>
    protected virtual void RegisterDbContextPool(IServiceCollection serviceCollection) { }
}
