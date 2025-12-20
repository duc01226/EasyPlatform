#region

using Easy.Platform.Common.Dtos;
using MediatR;

#endregion

namespace Easy.Platform.Common.Cqrs.Queries;

/// <summary>
/// Base interface for all Platform CQRS queries.
/// Represents read-only operations that retrieve data without modifying system state.
/// </summary>
/// <remarks>
/// Marker interface for queries in the Platform CQRS framework.
/// Queries are responsible for data retrieval and should not modify system state.
/// 
/// Key characteristics of queries:
/// - Read-only operations
/// - No side effects
/// - Cacheable results
/// - Optimized for data retrieval
/// - Support for paging and filtering
/// 
/// Used extensively across platform services:
/// - Growth service: Employee data, leave requests, attendance records
/// - Employee service: Payroll information, employee profiles
/// - Talents service: Candidate data, hiring workflows
/// - Permission Provider: Subscription and usage data
/// 
/// All queries should implement cache key building for performance optimization.
/// Integrates with platform caching system for automatic cache management.
/// </remarks>
public interface IPlatformCqrsQuery : IPlatformCqrsRequest
{
}

/// <summary>
/// Generic interface for Platform CQRS queries that return specific result types.
/// Provides type-safe query operations with strongly-typed results.
/// </summary>
/// <typeparam name="TResult">The type of data returned by the query</typeparam>
/// <remarks>
/// Generic query interface enabling type-safe data retrieval operations.
/// Inherits from both IPlatformCqrsQuery and IRequest&lt;TResult&gt; for MediatR integration.
/// 
/// Design benefits:
/// - Compile-time type safety for query results
/// - Automatic handler discovery through MediatR
/// - Consistent query processing pipeline
/// - Integration with caching and validation frameworks
/// 
/// Usage patterns:
/// - Single entity queries: GetEmployeeByIdQuery&lt;EmployeeDto&gt;
/// - Collection queries: GetEmployeesQuery&lt;List&lt;EmployeeDto&gt;&gt;
/// - Paged queries: GetPagedEmployeesQuery&lt;PlatformCqrsQueryPagedResult&lt;EmployeeDto&gt;&gt;
/// - Aggregation queries: GetEmployeeStatisticsQuery&lt;EmployeeStatsDto&gt;
/// 
/// Result types should be DTOs or value objects optimized for data transfer.
/// Covariant type parameter enables flexible result type handling.
/// </remarks>
public interface IPlatformCqrsQuery<out TResult> : IPlatformCqrsQuery, IRequest<TResult>
{
}

/// <summary>
/// Abstract base class for Platform CQRS queries with typed results.
/// Provides foundation for implementing data retrieval operations.
/// </summary>
/// <typeparam name="TResult">The type of data returned by the query</typeparam>
/// <remarks>
/// Standard base class for all Platform queries providing:
/// - Audit information tracking
/// - Cache key generation capability
/// - Validation framework integration
/// - MediatR request handling
/// 
/// Inherits from PlatformCqrsRequest to provide common CQRS functionality:
/// - Automatic audit trail generation
/// - Request correlation and tracking
/// - Standardized validation patterns
/// - Object cloning for cache scenarios
/// 
/// Query implementation patterns:
/// 1. Define query class with parameters as properties
/// 2. Implement cache key building for performance
/// 3. Create corresponding handler inheriting from PlatformCqrsQueryHandler
/// 4. Register handler with dependency injection
/// 
/// Examples from codebase:
/// - GetEmployeeByIdQuery in Employee service
/// - GetLeaveRequestsQuery in Growth service
/// - GetPayrollRecordsQuery in Talents service
/// - GetSubscriptionDetailsQuery in Permission Provider
/// 
/// All queries should consider caching strategy for optimal performance.
/// </remarks>
public abstract class PlatformCqrsQuery<TResult> : PlatformCqrsRequest, IPlatformCqrsQuery<TResult>
{
}

/// <summary>
/// Abstract base class for Platform CQRS queries that support paging.
/// Provides standardized paging functionality for large result sets.
/// </summary>
/// <typeparam name="TResult">The paged result type, must inherit from PlatformCqrsQueryPagedResult&lt;TItem&gt;</typeparam>
/// <typeparam name="TItem">The type of individual items in the paged result</typeparam>
/// <remarks>
/// Specialized query base class for operations that return paged data.
/// Essential for performance when dealing with large datasets.
/// 
/// Paging implementation:
/// - SkipCount: Number of items to skip (for offset-based paging)
/// - MaxResultCount: Maximum number of items to return (page size)
/// - Validation: Ensures paging parameters are valid
/// - Result: Structured paged result with items and metadata
/// 
/// Key features:
/// - Inherits all query capabilities from PlatformCqrsQuery
/// - Implements IPlatformPagedRequest for paging contracts
/// - Provides validation for paging parameters
/// - Supports both offset and cursor-based paging patterns
/// 
/// Usage patterns:
/// - Employee lists with search and filtering
/// - Transaction history with date ranges
/// - Audit logs with time-based paging
/// - Report data with sorting and filtering
/// 
/// Cache key building should include paging parameters for cache efficiency.
/// Result should include total count and paging metadata for client-side handling.
/// 
/// Examples from codebase:
/// - GetPagedEmployeesQuery in Employee service
/// - GetPagedLeaveRequestsQuery in Growth service
/// - GetPagedPayrollRecordsQuery in Talents service
/// </remarks>
public abstract class PlatformCqrsPagedQuery<TResult, TItem> : PlatformCqrsQuery<TResult>, IPlatformPagedRequest
    where TResult : PlatformCqrsQueryPagedResult<TItem>
{
    /// <summary>
    /// Gets or sets the number of items to skip for paging (zero-based offset).
    /// Used for offset-based paging to determine starting position.
    /// </summary>
    /// <value>
    /// Number of items to skip, or null for no offset.
    /// Must be zero or positive when specified.
    /// </value>
    /// <remarks>
    /// Offset-based paging parameter enabling:
    /// - Page navigation (page 2 = skip page_size items)
    /// - Result windowing for large datasets
    /// - Consistent pagination across requests
    /// 
    /// Null value indicates no skipping (start from beginning).
    /// Zero value explicitly starts from first item.
    /// Must be validated to ensure non-negative values.
    /// 
    /// Used in conjunction with MaxResultCount for complete paging control.
    /// Should be included in cache key generation for accurate caching.
    /// </remarks>
    public virtual int? SkipCount { get; set; }

    /// <summary>
    /// Gets or sets the maximum number of items to return (page size).
    /// Controls the size of each page in paged result sets.
    /// </summary>
    /// <value>
    /// Maximum number of items to return, or null for no limit.
    /// Must be positive when specified.
    /// </value>
    /// <remarks>
    /// Page size parameter enabling:
    /// - Performance control for large datasets
    /// - Memory usage optimization
    /// - Network bandwidth management
    /// - Client-side display control
    /// 
    /// Null value indicates no limit (return all matching items).
    /// Should have reasonable default and maximum limits to prevent abuse.
    /// Must be validated to ensure positive values.
    /// 
    /// Common page sizes: 10, 25, 50, 100 items per page.
    /// Should be included in cache key generation for accurate caching.
    /// Query handlers should enforce maximum limits for performance.
    /// </remarks>
    public virtual int? MaxResultCount { get; set; }

    /// <summary>
    /// Validates that paging parameters are within acceptable ranges.
    /// Ensures SkipCount and MaxResultCount are non-negative when specified.
    /// </summary>
    /// <returns>
    /// True if paging parameters are valid or null; false if any parameter is negative.
    /// </returns>
    /// <remarks>
    /// Validation method ensuring paging parameters are logically valid:
    /// - SkipCount must be null or >= 0 (can't skip negative items)
    /// - MaxResultCount must be null or >= 0 (can't return negative items)
    /// 
    /// Called by validation pipeline to prevent invalid paging requests.
    /// Should be extended by derived classes for additional validation rules:
    /// - Maximum page size limits
    /// - Business-specific constraints
    /// - Performance-based restrictions
    /// 
    /// Invalid paging parameters should result in validation errors.
    /// Used by PlatformCqrsQueryHandler for request validation.
    /// </remarks>
    public bool IsPagedRequestValid()
    {
        // Validate that skip count is null or non-negative
        // Validate that max result count is null or non-negative
        return (SkipCount == null || SkipCount >= 0) && (MaxResultCount == null || MaxResultCount >= 0);
    }
}
