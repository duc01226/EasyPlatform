using Easy.Platform.Common.Utils;

namespace Easy.Platform.Persistence;

/// <summary>
/// Defines the core configuration interface for Platform persistence modules.
/// Provides essential configuration options for database connections, query optimization, and debug settings.
/// </summary>
/// <remarks>
/// This interface establishes the foundation for persistence configuration across all Platform services.
/// Key Configuration Areas:
/// - Cross-database migration control for data synchronization scenarios
/// - Query performance monitoring and warning systems
/// - Debug logging for development and troubleshooting
///
/// Usage across Platform services:
/// - Growth service: PostgreSQL persistence with EF Core and bad query monitoring
/// - Employee service: MongoDB persistence with connection pooling
/// - Talents service: Multi-database scenarios with cross-db migration support
/// - Surveys service: MongoDB with custom slow query thresholds
///
/// Configuration is typically set per service through appsettings.json and can be
/// overridden in concrete persistence module implementations.
/// </remarks>
public interface IPlatformPersistenceConfiguration
{
    /// <summary>
    /// Gets or sets whether this configuration is exclusively for cross-database migration operations.
    /// When true, limits functionality to essential migration tasks without full persistence setup.
    /// </summary>
    /// <value>
    /// True to enable cross-database migration mode; false for standard persistence operations.
    /// Default is false for normal service operation.
    /// </value>
    /// <remarks>
    /// Cross-database migration mode is used when:
    /// - Migrating data between different database systems (e.g., SQL Server to PostgreSQL)
    /// - Synchronizing data across service boundaries
    /// - Running one-time data transformation operations
    /// - Performing database consolidation tasks
    ///
    /// When enabled:
    /// - Repository registration is skipped
    /// - Unit of work management is simplified
    /// - Only essential migration services are available
    /// - Performance monitoring may be reduced
    ///
    /// Used in scenarios like:
    /// - Employee service data migration to central Growth database
    /// - Legacy system data imports
    /// - Cross-service data synchronization tasks
    /// </remarks>
    public bool ForCrossDbMigrationOnly { get; set; }

    /// <summary>
    /// Gets or sets the configuration for bad query warning and monitoring system.
    /// Enables detection and logging of poorly performing database queries.
    /// </summary>
    /// <value>
    /// Configuration object controlling query performance monitoring.
    /// Default configuration provides balanced monitoring suitable for most scenarios.
    /// </value>
    /// <remarks>
    /// Bad query warning system helps identify performance issues:
    /// - Slow query detection based on execution time thresholds
    /// - Large result set warnings for memory optimization
    /// - Stack trace logging for debugging query origins
    /// - Configurable logging levels (Warning vs Error)
    ///
    /// Monitoring capabilities:
    /// - Read query threshold: Typically 500ms for SELECT operations
    /// - Write query threshold: Typically 2000ms for INSERT/UPDATE/DELETE
    /// - Result count threshold: Typically 100 items for memory concerns
    /// - Execution stack trace capture for debugging
    ///
    /// Performance consideration:
    /// Enabling detailed monitoring may impact application performance
    /// due to additional logging and stack trace capture overhead.
    ///
    /// Common configurations per service:
    /// - Development: Enabled with lower thresholds for optimization
    /// - Production: Enabled with higher thresholds for stability monitoring
    /// - High-throughput services: Disabled or minimal monitoring
    /// </remarks>
    public PlatformPersistenceConfigurationBadQueryWarningConfig BadQueryWarning { get; set; }

    /// <summary>
    /// Gets or sets whether query logging is enabled in debug mode.
    /// Provides detailed query execution information during development and debugging.
    /// </summary>
    /// <value>
    /// True to enable debug query logging when debugger is attached; false to disable.
    /// Default is true for development assistance.
    /// </value>
    /// <remarks>
    /// Debug query logging provides:
    /// - Generated SQL/query statements
    /// - Parameter values and types
    /// - Execution timing information
    /// - Query plan details (where supported)
    ///
    /// Activation conditions:
    /// - Only logs when debugger is attached (development scenarios)
    /// - Outputs to debugger output window
    /// - Does not affect production deployments
    /// - No performance impact when debugger not attached
    ///
    /// Useful for:
    /// - Debugging query generation issues
    /// - Optimizing query performance during development
    /// - Understanding ORM query translation
    /// - Troubleshooting parameter binding problems
    ///
    /// Information logged includes:
    /// - Raw SQL statements for relational databases
    /// - MongoDB query documents for document databases
    /// - Parameter substitution details
    /// - Query execution context and timing
    /// </remarks>
    public bool EnableDebugQueryLog { get; set; }
}

/// <summary>
/// Extends the base persistence configuration to support typed database context scenarios.
/// Provides additional configuration options specific to strongly-typed database contexts.
/// </summary>
/// <typeparam name="TDbContext">The type of database context this configuration applies to</typeparam>
/// <remarks>
/// This interface adds database context pool configuration capabilities to the base
/// persistence configuration. Used primarily for EF Core and MongoDB scenarios where
/// context pooling can provide significant performance benefits.
///
/// Context pooling benefits:
/// - Reduced object allocation overhead
/// - Improved response time for frequent operations
/// - Better resource utilization under load
/// - Automatic context lifecycle management
///
/// Commonly implemented by:
/// - PlatformEfCorePersistenceModule for SQL databases
/// - PlatformMongoDbPersistenceModule for document databases
/// - Custom persistence modules requiring connection pooling
/// </remarks>
public interface IPlatformPersistenceConfiguration<TDbContext> : IPlatformPersistenceConfiguration
{
    /// <summary>
    /// Gets or sets the pooled database context configuration options.
    /// Controls connection pooling behavior for improved performance.
    /// </summary>
    /// <value>
    /// Configuration options for database context pooling including pool size and enablement.
    /// Default configuration enables pooling with optimal pool size based on system resources.
    /// </value>
    /// <remarks>
    /// Pooled context options provide control over:
    /// - Pool enablement for performance optimization
    /// - Maximum pool size for resource management
    /// - Context lifecycle and cleanup behavior
    ///
    /// Pool size considerations:
    /// - Too small: Context creation overhead under load
    /// - Too large: Excessive memory consumption
    /// - Optimal: Based on concurrent request patterns and system resources
    ///
    /// Typically configured based on:
    /// - Expected concurrent user load
    /// - Available system memory
    /// - Database connection limits
    /// - Application threading model
    /// </remarks>
    public PlatformPersistenceConfigurationPooledDbContextOptions PooledOptions { get; set; }
}

/// <summary>
/// Represents configuration options for pooled database context instances.
/// Controls how database context pooling is configured for performance optimization.
/// </summary>
/// <remarks>
/// Pooled database context configuration enables efficient context reuse patterns:
/// - Reduces object allocation overhead through context pooling
/// - Improves application startup time and response times
/// - Provides better resource utilization under concurrent load
/// - Enables automatic context lifecycle management
///
/// Pool sizing considerations:
/// - Default size is calculated based on system CPU cores and expected concurrent operations
/// - Size should align with expected concurrent database operation patterns
/// - Too small pools may cause context creation bottlenecks
/// - Too large pools may consume excessive memory resources
///
/// Used by:
/// - EF Core persistence modules for SQL database operations
/// - MongoDB persistence modules for document database operations
/// - Custom persistence implementations requiring connection pooling
///
/// Performance impact:
/// - Enabled pooling significantly improves performance under load
/// - Disabled pooling may be suitable for low-traffic scenarios
/// - Pool size should be tuned based on application usage patterns
/// </remarks>
public struct PlatformPersistenceConfigurationPooledDbContextOptions
{
    /// <summary>
    /// Initializes a new instance of the pooled database context options with default values.
    /// Sets up recommended configuration for optimal performance in most scenarios.
    /// </summary>
    /// <remarks>
    /// Default configuration provides:
    /// - Pooling enabled for performance benefits
    /// - Pool size calculated based on system resources and concurrent operation patterns
    /// - Optimal balance between performance and resource consumption
    ///
    /// The default configuration is suitable for most applications but can be customized
    /// based on specific performance requirements and resource constraints.
    /// </remarks>
    public PlatformPersistenceConfigurationPooledDbContextOptions() { }

    /// <summary>
    /// Gets or sets whether database context pooling is enabled.
    /// Controls whether contexts are pooled and reused for performance optimization.
    /// </summary>
    /// <value>
    /// True to enable context pooling; false to create new contexts for each operation.
    /// Default is true for optimal performance.
    /// </value>
    /// <remarks>
    /// Context pooling provides significant performance benefits:
    /// - Reduces object allocation and garbage collection pressure
    /// - Improves response times for database operations
    /// - Better resource utilization under concurrent load
    /// - Automatic context lifecycle management
    ///
    /// When enabled:
    /// - Contexts are pooled and reused across requests
    /// - Pool size is managed automatically based on configuration
    /// - Context state is properly reset between uses
    /// - Thread safety is ensured through proper pool management
    ///
    /// When disabled:
    /// - New context instances are created for each operation
    /// - Higher memory allocation and GC pressure
    /// - Suitable for low-traffic scenarios or specialized requirements
    /// - May be needed for specific context customization scenarios
    ///
    /// Pooling is recommended for production environments to achieve optimal performance.
    /// </remarks>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Gets or sets the maximum number of database context instances retained by the pool.
    /// Controls the upper limit of pooled contexts for resource management.
    /// </summary>
    /// <value>
    /// Maximum number of context instances in the pool.
    /// Default is calculated based on system capabilities and expected concurrent operations.
    /// </value>
    /// <remarks>
    /// Pool size determination factors:
    /// - System CPU cores and threading capabilities
    /// - Expected concurrent database operation patterns
    /// - Available memory resources
    /// - Database connection pool limits
    ///
    /// Default calculation:
    /// - Based on DefaultParallelIoTaskMaxConcurrent squared
    /// - Provides optimal balance for most applications
    /// - Can handle typical concurrent load patterns
    /// - Considers both CPU and I/O intensive operations
    ///
    /// Pool size considerations:
    /// - Too small: Context creation bottlenecks under load
    /// - Too large: Excessive memory consumption and resource waste
    /// - Optimal: Balanced based on actual application usage patterns
    ///
    /// Tuning recommendations:
    /// - Monitor context pool usage in production
    /// - Adjust based on actual concurrent operation patterns
    /// - Consider database connection limits
    /// - Balance memory usage with performance requirements
    ///
    /// The pool size directly impacts both performance and resource consumption,
    /// making proper tuning essential for optimal application behavior.
    /// </remarks>
    public int PoolSize { get; set; } = Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent * Util.TaskRunner.DefaultParallelIoTaskMaxConcurrent;
}

/// <summary>
/// Concrete implementation of the Platform persistence configuration.
/// Provides default settings for database connection, query monitoring, and debug logging.
/// </summary>
/// <remarks>
/// This class serves as the base implementation for persistence configuration
/// across all Platform services. It provides sensible defaults that can be
/// overridden through dependency injection or configuration files.
///
/// Default configuration includes:
/// - Cross-database migration disabled for normal operations
/// - Bad query warning enabled with standard thresholds
/// - Debug query logging enabled for development scenarios
///
/// Used by services to configure persistence behavior including:
/// - Query performance monitoring
/// - Debug logging during development
/// - Migration mode control
/// </remarks>
public class PlatformPersistenceConfiguration : IPlatformPersistenceConfiguration
{
    /// <summary>
    /// Gets or sets whether this configuration is for cross-database migration only.
    /// Default is false for standard persistence operations.
    /// </summary>
    public bool ForCrossDbMigrationOnly { get; set; }

    /// <summary>
    /// Gets or sets the bad query warning configuration with default monitoring settings.
    /// Initializes with balanced performance monitoring suitable for most scenarios.
    /// </summary>
    public PlatformPersistenceConfigurationBadQueryWarningConfig BadQueryWarning { get; set; } = new();

    /// <summary>
    /// Gets or sets whether debug query logging is enabled when debugger is attached.
    /// Default is true to assist with development and debugging scenarios.
    /// </summary>
    /// <remarks>
    /// Debug query logging provides detailed query execution information including:
    /// - Generated SQL/MongoDB query statements
    /// - Parameter values and binding information
    /// - Execution timing and performance metrics
    /// - Query plan details where available
    ///
    /// Only active when debugger is attached, ensuring no production impact.
    /// Essential for development workflow and query optimization.
    /// </remarks>
    public bool EnableDebugQueryLog { get; set; } = true;
}

/// <summary>
/// Typed persistence configuration that extends the base configuration with database context specific options.
/// Provides type-safe configuration for specific database context implementations.
/// </summary>
/// <typeparam name="TDbContext">The type of database context this configuration applies to</typeparam>
/// <remarks>
/// This class combines base persistence configuration with context-specific pooling options.
/// Used by persistence modules to provide strongly-typed configuration management.
///
/// Enables configuration scenarios like:
/// - Different pool sizes per database context type
/// - Context-specific query monitoring thresholds
/// - Database-specific debug logging settings
///
/// Essential for multi-database architectures where different contexts
/// may require different performance and pooling characteristics.
/// </remarks>
public class PlatformPersistenceConfiguration<TDbContext> : PlatformPersistenceConfiguration, IPlatformPersistenceConfiguration<TDbContext>
{
    /// <summary>
    /// Gets or sets the pooled database context configuration options for this specific context type.
    /// Provides type-safe access to context pooling configuration.
    /// </summary>
    /// <value>
    /// Configuration options controlling how this database context type is pooled and managed.
    /// Default configuration enables pooling with system-appropriate pool sizing.
    /// </value>
    /// <remarks>
    /// Context-specific pooling allows fine-tuned performance optimization:
    /// - Different pool sizes based on expected load per context
    /// - Separate pooling strategies for read vs write contexts
    /// - Context-specific resource management policies
    ///
    /// Common configuration patterns:
    /// - Main application context: Large pool for high concurrency
    /// - Reporting context: Smaller pool for periodic operations
    /// - Migration context: Disabled pooling for specialized operations
    /// </remarks>
    public PlatformPersistenceConfigurationPooledDbContextOptions PooledOptions { get; set; }
}

/// <summary>
/// Configuration for bad query warning and monitoring system.
/// Provides comprehensive query performance monitoring to identify slow and inefficient database operations.
/// </summary>
/// <remarks>
/// Warning: Enabling this feature may impact application performance due to additional monitoring overhead.
/// The system captures execution details, stack traces, and logs warnings for queries that exceed configured thresholds.
///
/// Key monitoring capabilities:
/// - Execution time tracking for read and write operations
/// - Result set size monitoring for memory optimization
/// - Stack trace capture for debugging query origins
/// - Configurable warning thresholds per operation type
/// - Adjustable logging levels for different severity
///
/// Performance considerations:
/// - Stack trace collection adds overhead to query execution
/// - Frequent logging may impact high-throughput applications
/// - Threshold configuration should balance detection and performance
///
/// Usage patterns:
/// - Development: Lower thresholds for early detection and optimization
/// - Production: Higher thresholds for monitoring without impact
/// - High-throughput services: Disabled or minimal monitoring
/// </remarks>
public class PlatformPersistenceConfigurationBadQueryWarningConfig
{
    /// <summary>
    /// Gets or sets whether bad query warning monitoring is enabled.
    /// Controls all query performance monitoring and warning functionality.
    /// </summary>
    /// <value>
    /// True to enable query monitoring; false to disable all monitoring.
    /// Default is configurable per service based on environment and requirements.
    /// </value>
    /// <remarks>
    /// When enabled, the system monitors:
    /// - Query execution times against configured thresholds
    /// - Result set sizes for memory usage concerns
    /// - Stack traces for debugging slow query origins
    ///
    /// When disabled:
    /// - No performance monitoring overhead
    /// - No query performance logging
    /// - Suitable for high-throughput production scenarios
    ///
    /// Recommendation: Enable in development and staging, configure carefully in production.
    /// </remarks>
    public bool IsEnabled { get; set; }

    /// <summary>
    /// Gets or sets whether warnings should be generated when query results exceed the item count threshold.
    /// Helps identify queries that may consume excessive memory or cause performance issues.
    /// </summary>
    /// <value>
    /// True to enable result count monitoring; false to disable this specific check.
    /// Allows fine-grained control over different monitoring aspects.
    /// </value>
    /// <remarks>
    /// Result count monitoring helps identify:
    /// - Queries returning large datasets that may impact memory
    /// - Missing pagination in user-facing queries
    /// - Inefficient queries that should be optimized
    /// - Potential N+1 query problems
    ///
    /// Common scenarios triggering warnings:
    /// - Loading entire entity collections without pagination
    /// - Missing WHERE clauses in reporting queries
    /// - Eager loading of large related datasets
    /// - Bulk operations without proper filtering
    ///
    /// Disable when large result sets are expected and properly handled.
    /// </remarks>
    public bool TotalItemsThresholdWarningEnabled { get; set; }

    /// <summary>
    /// Gets or sets the threshold for total items loaded into memory that triggers a warning.
    /// Helps identify queries that may cause memory pressure or performance issues.
    /// </summary>
    /// <value>
    /// Number of items that triggers a warning when exceeded. Default is 100 items.
    /// Should be adjusted based on entity size and memory considerations.
    /// </value>
    /// <remarks>
    /// The threshold should consider:
    /// - Entity size and complexity (simple vs complex objects)
    /// - Available system memory and allocation patterns
    /// - Typical query patterns and expected result sizes
    /// - User experience requirements for response times
    ///
    /// Recommended thresholds:
    /// - Small entities (primitives, simple DTOs): 500-1000 items
    /// - Medium entities (business objects): 100-500 items
    /// - Large entities (complex aggregates): 50-100 items
    /// - Report data (wide objects): 10-50 items
    ///
    /// Queries exceeding this threshold should consider:
    /// - Implementing pagination for user-facing operations
    /// - Using streaming/async enumeration for large datasets
    /// - Applying additional filtering or projection
    /// - Breaking large operations into smaller batches
    /// </remarks>
    public int TotalItemsThreshold { get; set; } = 100;

    /// <summary>
    /// Gets or sets whether warnings should be logged as error-level messages instead of warning-level.
    /// Controls the severity of query performance logging for monitoring and alerting systems.
    /// </summary>
    /// <value>
    /// True to log warnings as errors; false to log as warnings.
    /// Default depends on service configuration and monitoring requirements.
    /// </value>
    /// <remarks>
    /// Error-level logging is useful when:
    /// - Query performance issues should trigger alerts
    /// - Monitoring systems need to differentiate severity
    /// - Performance problems are considered critical failures
    /// - Integration with error tracking systems is required
    ///
    /// Warning-level logging is appropriate when:
    /// - Performance monitoring is informational
    /// - Issues don't require immediate attention
    /// - High query volumes might generate excessive error logs
    /// - Performance problems are optimization opportunities
    ///
    /// Consider the impact on:
    /// - Log volume and storage costs
    /// - Monitoring system alert thresholds
    /// - On-call notification policies
    /// - Error tracking and aggregation tools
    /// </remarks>
    public bool IsLogWarningAsError { get; set; }

    /// <summary>
    /// Gets or sets the execution time threshold in milliseconds for read queries that triggers slow query warnings.
    /// Helps identify queries that may impact user experience or system responsiveness.
    /// </summary>
    /// <value>
    /// Threshold in milliseconds for read operations. Default is 500ms.
    /// Should be adjusted based on application requirements and user expectations.
    /// </value>
    /// <remarks>
    /// Read query threshold considerations:
    /// - User-facing queries should be fast (50-200ms for interactive operations)
    /// - Background queries can tolerate higher latency (500-2000ms)
    /// - Reporting queries may require even higher thresholds (2000-10000ms)
    /// - Database type affects acceptable thresholds (SSD vs spinning disk)
    ///
    /// Factors affecting read performance:
    /// - Database indexing strategy and coverage
    /// - Query complexity and JOIN operations
    /// - Data volume and table sizes
    /// - Network latency to database server
    /// - Concurrent load and resource contention
    ///
    /// Optimization strategies for slow reads:
    /// - Add appropriate database indexes
    /// - Optimize query structure and JOINs
    /// - Implement result caching where appropriate
    /// - Use read replicas for heavy read workloads
    /// - Consider query pagination for large datasets
    /// </remarks>
    public int SlowQueryMillisecondsThreshold { get; set; } = 500;

    /// <summary>
    /// Gets or sets the execution time threshold in milliseconds for write queries that triggers slow query warnings.
    /// Helps identify data modification operations that may impact system throughput or user experience.
    /// </summary>
    /// <value>
    /// Threshold in milliseconds for write operations. Default is 2000ms (2 seconds).
    /// Higher than read threshold due to inherent complexity of write operations.
    /// </value>
    /// <remarks>
    /// Write operations are typically slower than reads due to:
    /// - Transaction overhead and ACID compliance requirements
    /// - Index maintenance during data modifications
    /// - Constraint validation and referential integrity checks
    /// - Logging and durability requirements
    /// - Lock acquisition and potential contention
    ///
    /// Write query threshold factors:
    /// - INSERT operations: Usually fastest write operation
    /// - UPDATE operations: May require index updates
    /// - DELETE operations: May trigger cascading actions
    /// - Bulk operations: Expected to take longer
    /// - Complex business logic in triggers or constraints
    ///
    /// Optimization strategies for slow writes:
    /// - Batch operations to reduce round trips
    /// - Optimize database schema and indexing
    /// - Use appropriate transaction isolation levels
    /// - Consider async processing for non-critical writes
    /// - Implement proper connection pooling
    ///
    /// High threshold (2000ms) accounts for typical write operation complexity
    /// while still detecting genuinely problematic queries.
    /// </remarks>
    public int SlowWriteQueryMillisecondsThreshold { get; set; } = 2000;

    /// <summary>
    /// Gets the appropriate slow query threshold based on the operation type.
    /// Provides unified access to read and write thresholds for monitoring logic.
    /// </summary>
    /// <param name="forWriteQuery">True for write operations (INSERT/UPDATE/DELETE); false for read operations (SELECT)</param>
    /// <returns>The threshold in milliseconds for the specified operation type</returns>
    /// <remarks>
    /// This method centralizes threshold logic and ensures consistent application
    /// of performance monitoring across different query types.
    ///
    /// Used by query monitoring infrastructure to:
    /// - Apply appropriate thresholds during query execution
    /// - Generate contextually relevant warning messages
    /// - Maintain consistent performance expectations
    ///
    /// The differentiation between read and write thresholds recognizes
    /// the inherent performance characteristics of different database operations.
    /// </remarks>
    public int GetSlowQueryMillisecondsThreshold(bool forWriteQuery)
    {
        return forWriteQuery ? SlowWriteQueryMillisecondsThreshold : SlowQueryMillisecondsThreshold;
    }
}
