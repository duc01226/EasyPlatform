using System.Collections.Concurrent;
using Easy.Platform.Common;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Persistence.Domain;

/// <summary>
/// Defines the contract for aggregated persistence Unit of Work that coordinates multiple database contexts
/// within a single transactional boundary for polyglot persistence scenarios.
/// </summary>
/// <remarks>
/// This interface extends <see cref="IPlatformUnitOfWork"/> to provide specific functionality for managing
/// multiple heterogeneous database contexts in a coordinated manner.
///
/// **Key Capabilities:**
/// - Coordinate transactions across multiple database technologies
/// - Manage individual Unit of Work instances for different data stores
/// - Provide unified transaction semantics across polyglot persistence
/// - Enable complex business operations spanning multiple databases
///
/// **Use Cases:**
/// - Microservices with multiple database technologies (PostgreSQL + MongoDB)
/// - Cross-database data synchronization operations
/// - Complex business transactions requiring ACID properties across databases
/// - Event sourcing scenarios with multiple persistence stores
///
/// **Implementation Patterns:**
/// - Aggregates multiple concrete Unit of Work implementations
/// - Coordinates commit/rollback operations across all inner Unit of Work instances
/// - Manages pseudo-transaction scenarios for databases without full ACID support
/// - Handles query-persistent Unit of Work instances for read operations
///
/// Used by services like Employee and Talents that need to coordinate operations
/// across Growth service (PostgreSQL) and their own databases (MongoDB).
/// </remarks>
public interface IPlatformAggregatedPersistenceUnitOfWork : IPlatformUnitOfWork
{
    /// <summary>
    /// Determines whether the specified inner Unit of Work operates in pseudo-transaction mode.
    /// </summary>
    /// <typeparam name="TInnerUnitOfWork">The type of the inner Unit of Work to check.</typeparam>
    /// <param name="uow">The inner Unit of Work instance to evaluate.</param>
    /// <returns>
    /// <c>true</c> if the inner Unit of Work uses pseudo-transactions; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// Pseudo-transactions are used for databases that don't support full ACID transactions
    /// or when transaction overhead needs to be minimized for performance reasons.
    ///
    /// **Pseudo-Transaction Characteristics:**
    /// - No rollback capability (changes are immediately committed)
    /// - Optimized for high-performance scenarios
    /// - Used with NoSQL databases like MongoDB in certain configurations
    /// - Suitable for append-only or event-sourcing patterns
    ///
    /// **Decision Logic:**
    /// The method helps determine transaction coordination strategy:
    /// - Full transactions: Use distributed transaction protocols
    /// - Pseudo-transactions: Use compensation patterns or saga orchestration
    /// - Mixed scenarios: Implement hybrid transaction management
    /// </remarks>
    public bool IsPseudoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow)
        where TInnerUnitOfWork : IPlatformUnitOfWork;

    /// <summary>
    /// Determines whether the specified inner Unit of Work must be kept alive for query operations.
    /// </summary>
    /// <typeparam name="TInnerUnitOfWork">The type of the inner Unit of Work to check.</typeparam>
    /// <param name="uow">The inner Unit of Work instance to evaluate.</param>
    /// <returns>
    /// <c>true</c> if the inner Unit of Work should remain active for queries; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// Some database contexts need to remain active beyond the transaction scope to:
    /// - Maintain lazy loading capabilities
    /// - Preserve entity change tracking
    /// - Support deferred query execution
    /// - Enable efficient batch operations
    ///
    /// **Keep-Alive Scenarios:**
    /// - Entity Framework contexts with lazy loading
    /// - Long-running analytical queries
    /// - Batch processing operations
    /// - Report generation with complex data relationships
    ///
    /// **Performance Considerations:**
    /// - Keeping Unit of Work alive consumes memory and connections
    /// - Should be balanced against query performance requirements
    /// - Automatic cleanup should be implemented to prevent resource leaks
    /// </remarks>
    public bool MustKeepUowForQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow)
        where TInnerUnitOfWork : IPlatformUnitOfWork;
}

/// <summary>
/// Implements aggregated Unit of Work pattern for coordinating multiple database contexts
/// within a single transactional boundary, supporting polyglot persistence architectures.
/// </summary>
/// <remarks>
/// This class provides a unified interface for managing multiple heterogeneous database contexts
/// within a single business transaction, enabling complex operations that span multiple data stores.
///
/// **Architecture Overview:**
/// ```
/// PlatformAggregatedPersistenceUnitOfWork
/// ├── PostgreSQL Unit of Work (Growth service data)
/// ├── MongoDB Unit of Work (Employee data)
/// ├── MongoDB Unit of Work (Surveys data)
/// └── Other database Unit of Work instances
/// ```
///
/// **Key Features:**
/// - **Multi-Database Coordination**: Manages multiple database contexts simultaneously
/// - **Transaction Orchestration**: Coordinates commit/rollback across all inner Unit of Work instances
/// - **Pseudo-Transaction Support**: Handles databases without full ACID transaction support
/// - **Performance Optimization**: Caches inner Unit of Work instances for efficient reuse
/// - **Resource Management**: Manages lifecycle of database connections and contexts
///
/// **Caching Strategy:**
/// - **By Type**: Caches Unit of Work instances by their concrete type for type-based access
/// - **By ID**: Caches Unit of Work instances by unique identifier for instance-specific operations
/// - **Lazy Initialization**: Caches are created only when first accessed to minimize memory usage
/// - **Thread-Safe**: Uses ConcurrentDictionary for safe multi-threaded access
///
/// **Transaction Coordination:**
/// The aggregated Unit of Work coordinates transactions by:
/// 1. Determining transaction capabilities of each inner Unit of Work
/// 2. Executing operations in the appropriate order
/// 3. Handling rollback scenarios for failed operations
/// 4. Managing compensation actions for pseudo-transactions
///
/// **Use Cases:**
/// - **Cross-Service Operations**: Employee service updating Growth service user data
/// - **Data Migration**: Synchronizing data between different database technologies
/// - **Complex Business Logic**: Operations requiring consistency across multiple data stores
/// - **Reporting**: Generating reports from multiple database sources
///
/// **Performance Considerations:**
/// - Caching reduces Unit of Work creation overhead
/// - Lazy initialization minimizes memory usage
/// - Thread-safe operations ensure concurrent access safety
/// - Resource cleanup prevents memory leaks
///
/// **Error Handling:**
/// - Graceful handling of partial transaction failures
/// - Compensation logic for pseudo-transaction rollbacks
/// - Comprehensive logging for debugging complex multi-database operations
///
/// **Integration Examples:**
/// ```csharp
/// // Coordinate operations across Growth (PostgreSQL) and Employee (MongoDB) services
/// using var aggregatedUow = uowManager.Begin();
///
/// // Update user in Growth service database
/// var growthUow = aggregatedUow.GetInnerUnitOfWork&lt;GrowthDbContext&gt;();
/// growthUow.Repository&lt;User&gt;().Update(user);
///
/// // Update employee in Employee service database
/// var employeeUow = aggregatedUow.GetInnerUnitOfWork&lt;EmployeeDbContext&gt;();
/// employeeUow.Repository&lt;Employee&gt;().Update(employee);
///
/// // Commit changes to both databases
/// await aggregatedUow.SaveChangesAsync();
/// ```
/// </remarks>
public class PlatformAggregatedPersistenceUnitOfWork : PlatformUnitOfWork, IPlatformAggregatedPersistenceUnitOfWork
{
    /// <summary>
    /// Lazy-initialized cache of inner Unit of Work instances indexed by their unique identifiers.
    /// </summary>
    /// <remarks>
    /// This cache enables efficient retrieval of specific Unit of Work instances by their unique ID,
    /// which is useful for operations that need to target specific database context instances.
    ///
    /// **Usage Patterns:**
    /// - Instance-specific operations and queries
    /// - Debugging and monitoring individual Unit of Work instances
    /// - Resource cleanup and lifecycle management
    /// - Cross-reference operations between different Unit of Work instances
    /// </remarks>
    private readonly Lazy<ConcurrentDictionary<string, IPlatformUnitOfWork>> cachedInnerUowByIdsLazy = new(() => new ConcurrentDictionary<string, IPlatformUnitOfWork>());

    /// <summary>
    /// Lazy-initialized cache of inner Unit of Work instances indexed by their concrete types.
    /// </summary>
    /// <remarks>
    /// This cache enables efficient retrieval of Unit of Work instances by their type,
    /// which is the primary access pattern for database context operations.
    ///
    /// **Usage Patterns:**
    /// - Type-safe access to specific database contexts
    /// - Repository pattern implementation
    /// - Database-specific operations and queries
    /// - Performance optimization through type-based caching
    /// </remarks>
    private readonly Lazy<ConcurrentDictionary<Type, IPlatformUnitOfWork>> cachedInnerUowsLazy = new(() => new ConcurrentDictionary<Type, IPlatformUnitOfWork>());

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformAggregatedPersistenceUnitOfWork"/> class.
    /// </summary>
    /// <param name="rootServiceProvider">The root service provider for accessing global services.</param>
    /// <param name="serviceProvider">The scoped service provider for the current operation.</param>
    /// <param name="loggerFactory">The logger factory for creating loggers for debugging and monitoring.</param>
    public PlatformAggregatedPersistenceUnitOfWork(IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider, ILoggerFactory loggerFactory)
        : base(rootServiceProvider, serviceProvider, loggerFactory) { }

    /// <summary>
    /// Gets the cache of inner Unit of Work instances indexed by their concrete types.
    /// </summary>
    /// <value>A thread-safe dictionary mapping types to Unit of Work instances.</value>
    /// <remarks>
    /// This property provides access to the type-based cache, which is the primary mechanism
    /// for retrieving database-specific Unit of Work instances in a type-safe manner.
    /// </remarks>
    protected override ConcurrentDictionary<Type, IPlatformUnitOfWork> CachedInnerUowByTypes => cachedInnerUowsLazy.Value;

    /// <summary>
    /// Gets the cache of inner Unit of Work instances indexed by their unique identifiers.
    /// </summary>
    /// <value>A thread-safe dictionary mapping unique IDs to Unit of Work instances.</value>
    /// <remarks>
    /// This property provides access to the ID-based cache, which enables instance-specific
    /// operations and debugging scenarios where specific Unit of Work instances need to be targeted.
    /// </remarks>
    protected override ConcurrentDictionary<string, IPlatformUnitOfWork> CachedInnerUowByIds => cachedInnerUowByIdsLazy.Value;

    /// <summary>
    /// Determines whether all inner Unit of Work instances operate in pseudo-transaction mode.
    /// </summary>
    /// <returns>
    /// <c>true</c> if all inner Unit of Work instances use pseudo-transactions; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// This method evaluates the transaction capabilities of the entire aggregated Unit of Work
    /// by checking all inner Unit of Work instances. The aggregated Unit of Work is considered
    /// pseudo-transactional only if ALL inner instances are pseudo-transactional.
    ///
    /// **Decision Logic:**
    /// - Returns <c>true</c> only when ALL inner Unit of Work instances are pseudo-transactional
    /// - Returns <c>false</c> if ANY inner Unit of Work supports full transactions
    /// - Empty collection (no inner Unit of Work instances) returns <c>true</c>
    ///
    /// **Impact on Transaction Strategy:**
    /// - **All Pseudo**: Use compensation patterns, no rollback capability
    /// - **Mixed/Full**: Use distributed transaction coordination with rollback support
    ///
    /// This information is crucial for transaction coordinators to determine the appropriate
    /// consistency and rollback strategies for complex operations.
    /// </remarks>
    public override bool IsPseudoTransactionUow()
    {
        return CachedInnerUowByTypes!.Values.All(p => p.IsPseudoTransactionUow());
    }

    /// <summary>
    /// Determines whether any inner Unit of Work instance must be kept alive for query operations.
    /// </summary>
    /// <returns>
    /// <c>true</c> if any inner Unit of Work instance requires persistent connection; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// This method evaluates the query persistence requirements of the entire aggregated Unit of Work
    /// by checking all inner Unit of Work instances. The aggregated Unit of Work must be kept alive
    /// if ANY inner instance requires persistent connection for queries.
    ///
    /// **Decision Logic:**
    /// - Returns <c>true</c> if ANY inner Unit of Work requires persistent connection
    /// - Returns <c>false</c> only when ALL inner Unit of Work instances can be safely disposed
    /// - Empty collection (no inner Unit of Work instances) returns <c>false</c>
    ///
    /// **Resource Management Impact:**
    /// - **Must Keep**: Aggregated Unit of Work remains in memory with all connections active
    /// - **Can Dispose**: All resources can be safely cleaned up after transaction completion
    ///
    /// **Performance Considerations:**
    /// - Keeping Unit of Work alive consumes memory and database connections
    /// - Necessary for lazy loading, change tracking, and complex query scenarios
    /// - Should be balanced against resource usage and application performance
    ///
    /// This information helps the Unit of Work manager optimize resource usage and prevent
    /// premature disposal of database contexts that are still needed for query operations.
    /// </remarks>
    public override bool MustKeepUowForQuery()
    {
        return CachedInnerUowByTypes!.Values.Any(p => p.MustKeepUowForQuery());
    }

    /// <summary>
    /// Determines whether the specified inner Unit of Work operates in pseudo-transaction mode.
    /// </summary>
    /// <typeparam name="TInnerUnitOfWork">The type of the inner Unit of Work to check.</typeparam>
    /// <param name="uow">The inner Unit of Work instance to evaluate.</param>
    /// <returns>
    /// <c>true</c> if the inner Unit of Work uses pseudo-transactions; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// This method provides instance-specific pseudo-transaction detection, allowing for
    /// fine-grained transaction coordination decisions for individual database contexts.
    ///
    /// **Lookup Strategy:**
    /// - Uses the Unit of Work's unique ID to find the cached instance
    /// - Returns the pseudo-transaction status of the specific instance
    /// - Returns <c>false</c> if the instance is not found in the cache
    ///
    /// **Use Cases:**
    /// - Conditional transaction logic based on specific database capabilities
    /// - Selective rollback strategies for mixed transaction environments
    /// - Performance optimization for specific database operations
    /// - Debugging and monitoring individual Unit of Work behavior
    /// </remarks>
    public bool IsPseudoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow)
        where TInnerUnitOfWork : IPlatformUnitOfWork
    {
        return CachedInnerUowByIds!.GetValueOrDefault(uow.Id)?.IsPseudoTransactionUow() == true;
    }

    /// <summary>
    /// Determines whether the specified inner Unit of Work must be kept alive for query operations.
    /// </summary>
    /// <typeparam name="TInnerUnitOfWork">The type of the inner Unit of Work to check.</typeparam>
    /// <param name="uow">The inner Unit of Work instance to evaluate.</param>
    /// <returns>
    /// <c>true</c> if the inner Unit of Work should remain active for queries; otherwise, <c>false</c>.
    /// </returns>
    /// <remarks>
    /// This method provides instance-specific query persistence detection, enabling targeted
    /// resource management decisions for individual database contexts.
    ///
    /// **Lookup Strategy:**
    /// - Uses the Unit of Work's unique ID to find the cached instance
    /// - Returns the query persistence requirement of the specific instance
    /// - Returns <c>false</c> if the instance is not found in the cache
    ///
    /// **Use Cases:**
    /// - Selective resource cleanup based on specific database requirements
    /// - Performance optimization by keeping only necessary contexts alive
    /// - Memory management for long-running operations
    /// - Debugging connection and context lifecycle issues
    /// </remarks>
    public bool MustKeepUowForQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow)
        where TInnerUnitOfWork : IPlatformUnitOfWork
    {
        return CachedInnerUowByIds!.GetValueOrDefault(uow.Id)?.MustKeepUowForQuery() == true;
    }

    /// <summary>
    /// Performs the internal save changes operation for the aggregated Unit of Work.
    /// </summary>
    /// <param name="cancellationToken">The cancellation token to observe during the asynchronous operation.</param>
    /// <returns>A <see cref="Task"/> representing the asynchronous save operation.</returns>
    /// <remarks>
    /// The aggregated Unit of Work does not perform any save operations itself, as it delegates
    /// all persistence operations to its inner Unit of Work instances. This method returns
    /// a completed task immediately.
    ///
    /// **Design Rationale:**
    /// - The aggregated Unit of Work acts as a coordinator, not a direct data persistence layer
    /// - Actual save operations are handled by individual inner Unit of Work instances
    /// - Each inner Unit of Work manages its own database context and transaction
    /// - The aggregated Unit of Work orchestrates the overall transaction flow
    ///
    /// **Transaction Coordination:**
    /// The save operation coordination happens through:
    /// 1. **Base Class Logic**: The base <see cref="PlatformUnitOfWork"/> class handles inner Unit of Work coordination
    /// 2. **Individual Saves**: Each inner Unit of Work performs its own save operations
    /// 3. **Error Handling**: Any failures are propagated up through the aggregation hierarchy
    /// 4. **Cleanup**: Resources are properly disposed regardless of success or failure
    ///
    /// **Implementation Pattern:**
    /// This follows the Composite pattern where:
    /// - The aggregated Unit of Work (Composite) coordinates multiple inner Unit of Work instances (Leaves)
    /// - Operations are delegated to the appropriate inner instances
    /// - The composite itself doesn't perform actual database operations
    /// - Transaction semantics are maintained across all inner instances
    ///
    /// **Thread Safety:**
    /// - The method is thread-safe as it performs no operations
    /// - Actual thread safety is managed by individual inner Unit of Work instances
    /// - Cancellation token is properly handled by the task completion
    /// </remarks>
    protected override Task InternalSaveChangesAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
