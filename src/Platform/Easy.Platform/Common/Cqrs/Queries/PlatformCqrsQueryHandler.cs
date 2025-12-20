using Easy.Platform.Common.Validations.Extensions;
using MediatR;

namespace Easy.Platform.Common.Cqrs.Queries;

/// <summary>
/// Abstract base class for handling Platform CQRS queries with typed results.
/// Provides standardized query processing pipeline including validation and execution.
/// </summary>
/// <typeparam name="TQuery">The query type to handle, must inherit from PlatformCqrsQuery&lt;TResult&gt;</typeparam>
/// <typeparam name="TResult">The result type returned by query execution</typeparam>
/// <remarks>
/// Core query handler providing the foundation for all data retrieval operations in the Platform CQRS framework.
/// Implements streamlined query processing pipeline optimized for read operations:
/// 1. Request validation using platform validation framework
/// 2. Query execution through abstract HandleAsync method
/// 3. Result return without event publishing (queries are read-only)
/// 
/// Key differences from command handlers:
/// - No event publishing (queries don't modify state)
/// - Simplified pipeline focused on data retrieval
/// - Optimized for caching and performance
/// - No audit trail for read operations
/// 
/// Features:
/// - Automatic validation with EnsureValidAsync extension
/// - Service provider integration for dependency resolution
/// - Cancellation token support for responsive operations
/// - Integration with caching infrastructure
/// - Support for paged and non-paged results
/// 
/// Used extensively across platform services:
/// - Growth service: Employee queries, leave request lookups, attendance data
/// - Employee service: Payroll queries, employee profile data
/// - Talents service: Candidate searches, hiring pipeline queries
/// - Permission Provider: Subscription queries, usage limit checks
/// 
/// Handler discovery and registration is automatic through MediatR conventions.
/// All queries should implement cache key building for optimal performance.
/// </remarks>
public abstract class PlatformCqrsQueryHandler<TQuery, TResult>
    : PlatformCqrsRequestHandler<TQuery>, IRequestHandler<TQuery, TResult>
    where TQuery : PlatformCqrsQuery<TResult>, IPlatformCqrsRequest
{
    /// <summary>
    /// Root service provider for dependency resolution and service discovery.
    /// Used to resolve repository dependencies and external services.
    /// </summary>
    /// <remarks>
    /// Provides access to the entire service container for complex dependency scenarios.
    /// Commonly used to resolve:
    /// - Repository interfaces for data access
    /// - External service clients
    /// - Caching services
    /// - Mapping services
    /// - Configuration objects
    /// 
    /// Enables flexible dependency resolution without tight coupling.
    /// Essential for query handlers that need multiple dependencies.
    /// </remarks>
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    /// <summary>
    /// Initializes a new instance of the query handler with required dependencies.
    /// Sets up service provider for dependency resolution during query processing.
    /// </summary>
    /// <param name="rootServiceProvider">Root service provider for dependency resolution</param>
    /// <remarks>
    /// Constructor injection pattern ensures required dependencies are available.
    /// Simpler than command handler constructor (no CQRS lazy loading needed).
    /// All concrete query handlers must call this base constructor.
    /// 
    /// Query handlers typically resolve:
    /// - Repository interfaces through RootServiceProvider
    /// - Caching services for performance optimization
    /// - Mapping services for DTO conversion
    /// - External API clients for data integration
    /// </remarks>
    protected PlatformCqrsQueryHandler(IPlatformRootServiceProvider rootServiceProvider)
    {
        RootServiceProvider = rootServiceProvider;
    }

    /// <summary>
    /// Handles query execution through the standard processing pipeline.
    /// Validates request and executes query logic to retrieve data.
    /// </summary>
    /// <param name="request">The query to execute</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Query execution result containing requested data</returns>
    /// <remarks>
    /// Standard query processing pipeline:
    /// 1. Validates request using ValidateRequestAsync (inherited from base)
    /// 2. Ensures validation passes with EnsureValidAsync extension
    /// 3. Executes query through HandleAsync abstract method
    /// 4. Returns query result directly (no event publishing)
    /// 
    /// Streamlined compared to command processing:
    /// - No event publishing (queries are read-only)
    /// - No audit trail generation (focused on data retrieval)
    /// - Optimized for caching and performance
    /// 
    /// Validation failures throw PlatformValidationException automatically.
    /// Cancellation token is passed through entire pipeline for responsiveness.
    /// Result should be optimized DTOs for efficient data transfer.
    /// 
    /// Query handlers should consider:
    /// - Implementing cache key building for performance
    /// - Using read-only database connections when possible
    /// - Optimizing queries for large datasets
    /// - Supporting paging for collection queries
    /// </remarks>
    /// <exception cref="PlatformValidationException">Thrown when request validation fails</exception>
    public virtual async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
    {
        // Validate the incoming request and ensure it passes validation rules
        await ValidateRequestAsync(request, cancellationToken).EnsureValidAsync();

        // Execute the core query logic and return the result
        var result = await HandleAsync(request, cancellationToken);

        return result;
    }

    /// <summary>
    /// Abstract method that must be implemented by concrete query handlers.
    /// Contains the core data retrieval logic for processing the specific query.
    /// </summary>
    /// <param name="request">The query to process</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Query execution result containing requested data</returns>
    /// <remarks>
    /// This method contains the actual data retrieval logic for the query.
    /// Implementers should:
    /// - Focus on data retrieval without worrying about validation
    /// - Use repositories and data access patterns
    /// - Implement efficient querying strategies
    /// - Use cancellation token for database operations
    /// - Return optimized DTOs for data transfer
    /// - Consider caching for frequently accessed data
    /// 
    /// Query implementation patterns:
    /// - Single entity: Retrieve by ID or unique key
    /// - Collection: Filter, sort, and optionally page results
    /// - Aggregation: Calculate summaries and statistics
    /// - Joined data: Combine related entities efficiently
    /// 
    /// Performance considerations:
    /// - Use projection to select only needed fields
    /// - Implement proper indexing strategies
    /// - Consider read replicas for heavy read workloads
    /// - Cache frequently accessed reference data
    /// 
    /// Called after validation passes and should not perform validation itself.
    /// Should handle data access errors gracefully and return appropriate results.
    /// </remarks>
    protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
}
