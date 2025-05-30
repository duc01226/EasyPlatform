#region

using System.Diagnostics;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.MessageBus.OutboxPattern;
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
/// Used by services like Growth (PostgreSQL), Surveys/Employee/Talents (MongoDB) to standardize
/// persistence layer management while supporting different database technologies.
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
    /// - Only provides database context for cross-service data synchronization
    ///
    /// This is useful for scenarios where one service needs to read/write data from another service's database
    /// for synchronization purposes without taking ownership of the full persistence lifecycle.
    ///
    /// Example: Employee service reading Growth service data for user synchronization.
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
    /// Example: Multiple services in a microservice group sharing the same MongoDB instance.
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
    /// For example, Growth service user data must be migrated before Employee service processes it.
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
                await serviceProvider.ExecuteScopedAsync(scope => scope.ServiceProvider.GetService(moduleType).As<IPlatformPersistenceModule>().MigrateDataAsync(scope));
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
/// - Entity Framework Core (SQL Server, PostgreSQL) - used by Growth service
/// - MongoDB - used by Surveys, Employee, Talents services
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
/// // Growth service - PostgreSQL with EF Core
/// public class GrowthPersistenceModule : PlatformPersistenceModule&lt;GrowthDbContext&gt;
/// {
///     // Database-specific configuration
/// }
///
/// // Employee service - MongoDB
/// public class EmployeePersistenceModule : PlatformPersistenceModule&lt;EmployeeDbContext&gt;
/// {
///     // MongoDB-specific configuration with cross-database access
/// }
/// ```
///
/// **Recommended Connection Settings:**
/// - Pool Size: CPU cores × 50 (max), 1 (min)
/// - Idle Lifetime: 5 seconds (prevents connection exhaustion)
/// - Retry Count: 10 attempts with 1-second delay
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
    /// Recommended connection idle lifetime in seconds to prevent connection pool exhaustion.
    /// </summary>
    /// <remarks>
    /// Set to 5 seconds to quickly release idle connections back to the pool.
    /// This prevents scenarios where long-running operations (like paging) hold connections
    /// while waiting for user input, which can exhaust the connection pool.
    ///
    /// Particularly important in containerized environments with limited connection pools.
    /// </remarks>
    public static readonly int RecommendedConnectionIdleLifetimeSeconds = 5;

    /// <summary>
    /// Recommended number of retry attempts for database connection failures.
    /// </summary>
    /// <remarks>
    /// Set to 10 attempts to handle transient network issues common in containerized environments.
    /// Database containers may take time to become available during startup.
    /// </remarks>
    public static readonly int RecommendedConnectionRetryOnFailureCount = 10;

    /// <summary>
    /// Recommended delay between connection retry attempts.
    /// </summary>
    /// <remarks>
    /// Set to 1 second to provide reasonable recovery time for transient network issues
    /// without excessive delay in application startup.
    /// </remarks>
    public static readonly TimeSpan RecommendedConnectionRetryDelay = 1.Seconds();

    /// <summary>
    /// Recommended maximum size for database connection pools.
    /// </summary>
    /// <remarks>
    /// Calculated as CPU cores × 50 to optimize for high-concurrency scenarios.
    /// This provides adequate connection availability while preventing resource exhaustion.
    /// Adjust based on application-specific load patterns and database server capacity.
    /// </remarks>
    public static readonly int RecommendedMaxPoolSize = Environment.ProcessorCount * 50;

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
    /// 5 attempts in development environment, 10 attempts in production environment.
    /// </value>
    /// <remarks>
    /// Different retry counts are used based on environment:
    /// - Development: 5 attempts (faster feedback, local database usually more stable)
    /// - Production: 10 attempts (more resilience for containerized/cloud environments)
    ///
    /// Used by <see cref="InitializeDatabaseAsync"/> and <see cref="MigrateDataAsync"/> for handling
    /// transient failures during application startup.
    /// </remarks>
    public static int DefaultDbInitAndMigrationRetryCount => PlatformEnvironment.IsDevelopment ? 5 : 10;

    /// <summary>
    /// Gets the default delay in seconds between database initialization and migration retry attempts.
    /// </summary>
    /// <value>
    /// 15 seconds in development environment, 30 seconds in production environment.
    /// </value>
    /// <remarks>
    /// Different retry delays are used based on environment:
    /// - Development: 15 seconds (faster iteration, local containers start quickly)
    /// - Production: 30 seconds (more conservative for cloud environments with slower startup)
    ///
    /// Provides sufficient time for database containers to become available while
    /// not unnecessarily delaying application startup.
    /// </remarks>
    public static int DefaultDbInitAndMigrationRetryDelaySeconds => PlatformEnvironment.IsDevelopment ? 15 : 30;

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
    /// - Only provides database context for cross-service data access
    ///
    /// This is particularly useful for microservice scenarios where one service needs to access
    /// another service's database for data synchronization or reporting purposes.
    ///
    /// Example: Employee service accessing Growth service database to synchronize user information.
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
    /// Example: Multiple services in a microservice group sharing the same MongoDB instance
    /// where only one service is responsible for schema management.
    /// </remarks>
    public virtual bool DisableDatabaseInitialization => false;

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
    /// Used by services like Employee and Surveys for processing events from other microservices.
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
    /// Used by services like Growth and Employee for publishing domain events to other microservices.
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
/// // PostgreSQL with Entity Framework Core (Growth service)
/// public class GrowthPersistenceModule : PlatformPersistenceModule&lt;GrowthDbContext&gt;
/// {
///     protected override PlatformPersistenceConfiguration&lt;GrowthDbContext&gt; ConfigurePersistenceConfiguration(
///         PlatformPersistenceConfiguration&lt;GrowthDbContext&gt; config, IConfiguration configuration)
///     {
///         return config.With(c => c.BadQueryWarningConfig.LogSlowQueries = true);
///     }
/// }
///
/// // MongoDB (Employee service)
/// public class EmployeePersistenceModule : PlatformPersistenceModule&lt;EmployeeDbContext&gt;
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
    /// **Cross-Service Migration Examples:**
    /// - Employee service migrating Growth service user data
    /// - Surveys service synchronizing with Employee service data
    /// - Talents service integrating with multiple data sources
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
    /// - 10-second delay between retry attempts (hard-coded for initialization)
    /// - Default retry count: 5 (development) / 10 (production)
    /// - Handles Docker Compose scenarios where database containers are starting up
    /// - Common in CI/CD pipelines and local development environments
    ///
    /// **Error Handling:**
    /// - Comprehensive logging with beautified stack traces
    /// - Database context type identification in error messages
    /// - Exception type classification for troubleshooting
    ///
    /// **Database Technology Examples:**
    /// - PostgreSQL: Schema migration, connection pool setup, performance monitoring
    /// - MongoDB: Collection creation, index setup, connection validation
    /// - SQL Server: Database creation, stored procedure setup, performance counters
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
    ///         options.UseNpgsql(connectionString);
    ///         // Configure additional options...
    ///     }, poolOptions.MaxPoolSize);
    /// }
    ///
    /// // MongoDB pooling
    /// protected override void RegisterDbContextPool(IServiceCollection serviceCollection)
    /// {
    ///     // MongoDB handles connection pooling at the client level
    ///     // Register pooled client instances if needed
    /// }
    /// ```
    ///
    /// **Database Technology Considerations:**
    /// - **Entity Framework Core**: Use AddDbContextPool for built-in pooling
    /// - **MongoDB**: Connection pooling handled by MongoDB driver
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
