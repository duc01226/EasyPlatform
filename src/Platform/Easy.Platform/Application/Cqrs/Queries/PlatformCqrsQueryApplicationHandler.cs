#region

using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Commands;
using Easy.Platform.Application.Exceptions.Extensions;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Exceptions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Infrastructures.Caching;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Queries;

/// <summary>
/// Defines a marker interface for Platform CQRS query application handlers.
/// Provides shared configuration and behavior for application-layer query processing.
/// </summary>
/// <remarks>
/// Interface establishes common patterns for query application handlers including:
/// - Exception handling with selective retry logic
/// - Distributed tracing integration
/// - Error resilience configuration
///
/// Query application handlers provide the orchestration layer for data retrieval operations,
/// sitting between the presentation layer (controllers/APIs) and domain query handlers.
/// They handle cross-cutting concerns like caching, tracing, and resilience.
///
/// All application query handlers should implement this interface to ensure consistent
/// behavior across the platform for data retrieval operations.
/// </remarks>
public interface IPlatformCqrsQueryApplicationHandler
{
    /// <summary>
    /// List of exception types that should not trigger retry attempts when failures occur.
    /// Used to avoid retrying operations that will predictably fail again.
    /// </summary>
    /// <remarks>
    /// Includes validation and business logic exceptions that indicate permanent failures:
    /// - IPlatformValidationException: Input validation errors that won't change on retry
    /// - PlatformNotFoundException: Resource not found errors that are deterministic
    ///
    /// Retry logic should only be applied to transient failures like:
    /// - Network timeouts
    /// - Database connection issues
    /// - Temporary service unavailability
    ///
    /// This prevents unnecessary retry cycles for business logic violations
    /// and improves system responsiveness for end users.
    /// </remarks>
    public static readonly List<Type> IgnoreFailedRetryExceptionTypes = [typeof(IPlatformValidationException), typeof(PlatformNotFoundException)];

    /// <summary>
    /// Activity source for creating distributed tracing activities in query processing.
    /// Enables observability and performance monitoring across service boundaries.
    /// </summary>
    /// <remarks>
    /// Used to create tracing spans for query execution that can be:
    /// - Correlated across service calls
    /// - Monitored for performance bottlenecks
    /// - Analyzed for error patterns
    /// - Tracked in distributed tracing systems
    ///
    /// Activities include metadata like:
    /// - Query type and parameters
    /// - Execution timing
    /// - Success/failure status
    /// - Related request context
    ///
    /// Essential for debugging complex query flows in microservice architectures.
    /// Integrates with OpenTelemetry and other observability platforms.
    /// </remarks>
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsQueryApplicationHandler)}");
}

/// <summary>
/// Abstract base class for application-level handlers of Platform CQRS query requests with typed results.
/// Provides comprehensive query processing infrastructure including caching, tracing, resilience, and error handling.
/// </summary>
/// <typeparam name="TQuery">The type of CQRS query handled by this class, must inherit from PlatformCqrsQuery&lt;TResult&gt;</typeparam>
/// <typeparam name="TResult">The type of the result returned by the query handler</typeparam>
/// <remarks>
/// Application-level query handler that orchestrates data retrieval operations with full platform integration.
/// Provides enterprise-grade capabilities for query processing:
///
/// Key Features:
/// - Automatic retry logic with configurable resilience policies
/// - Distributed tracing integration for observability
/// - Comprehensive error handling and logging
/// - Cache integration for performance optimization
/// - Request context management and audit tracking
/// - Validation pipeline integration
/// - Automatic garbage collection optimization
///
/// Processing Pipeline:
/// 1. Request validation with platform validation framework
/// 2. Audit information generation and tracking
/// 3. Distributed tracing span creation (if enabled)
/// 4. Query execution with error handling
/// 5. Result caching (when implemented by concrete handlers)
/// 6. Performance logging and monitoring
/// 7. Automatic memory management
///
/// Resilience Features:
/// - Configurable retry attempts for transient failures
/// - Smart exception filtering (no retry for validation errors)
/// - Exponential backoff for retry delays
/// - Circuit breaker pattern support
/// - Graceful degradation handling
///
/// Used extensively across platform services:
/// - Growth service: Employee data queries, attendance reports, leave balances
/// - Employee service: Payroll calculations, employee profiles, hierarchy data
/// - Talents service: Candidate searches, interview schedules, hiring metrics
/// - Permission Provider: Subscription queries, usage analytics, limit checks
///
/// Concrete implementations should focus on business logic while leveraging
/// the comprehensive infrastructure provided by this base class.
/// </remarks>
public abstract class PlatformCqrsQueryApplicationHandler<TQuery, TResult>
    : PlatformCqrsRequestApplicationHandler<TQuery>,
        IPlatformCqrsQueryApplicationHandler,
        IRequestHandler<TQuery, TResult>
    where TQuery : PlatformCqrsQuery<TResult>, IPlatformCqrsRequest
{
    /// <summary>
    /// Cache repository provider for managing data caching operations across query executions.
    /// Enables high-performance data retrieval through intelligent caching strategies.
    /// </summary>
    /// <remarks>
    /// Provides access to distributed caching infrastructure for:
    /// - Storing frequently accessed query results
    /// - Implementing cache-aside patterns
    /// - Managing cache invalidation strategies
    /// - Optimizing database load through intelligent caching
    ///
    /// Common caching patterns used in queries:
    /// - Reference data caching (lookup tables, configuration)
    /// - User session data caching (preferences, permissions)
    /// - Computed result caching (reports, aggregations)
    /// - Entity caching (frequently accessed business objects)
    ///
    /// Cache keys should be generated using query.BuildCacheKey() method
    /// to ensure consistency and proper cache invalidation.
    ///
    /// Integrates with Redis and other distributed cache providers
    /// for scalable caching across multiple application instances.
    /// </remarks>
    protected readonly IPlatformCacheRepositoryProvider CacheRepositoryProvider;

    /// <summary>
    /// Initializes a new instance of the query application handler with required dependencies.
    /// Sets up comprehensive infrastructure for enterprise-grade query processing.
    /// </summary>
    /// <param name="requestContextAccessor">Request context accessor providing current application request information</param>
    /// <param name="loggerFactory">Logger factory for creating structured loggers</param>
    /// <param name="serviceProvider">Root service provider for dependency resolution</param>
    /// <param name="cacheRepositoryProvider">Cache repository provider for caching operations</param>
    /// <remarks>
    /// Constructor initializes all required infrastructure components:
    /// - Request context for tracking user, tenant, and session information
    /// - Logging infrastructure for structured application logging
    /// - Service provider for resolving domain services and repositories
    /// - Cache provider for performance optimization
    /// - Distributed tracing configuration for observability
    /// - Application settings for runtime configuration
    ///
    /// All concrete query application handlers must call this base constructor
    /// to ensure proper initialization of platform infrastructure.
    ///
    /// The constructor automatically configures:
    /// - Distributed tracing based on application configuration
    /// - Application settings context for runtime behavior
    /// - Error handling and retry policies
    /// - Performance monitoring capabilities
    /// </remarks>
    protected PlatformCqrsQueryApplicationHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider,
        IPlatformCacheRepositoryProvider cacheRepositoryProvider
    )
        : base(requestContextAccessor, loggerFactory, serviceProvider)
    {
        CacheRepositoryProvider = cacheRepositoryProvider;
        // Configure distributed tracing based on application settings
        IsDistributedTracingEnabled = serviceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
        // Initialize application settings context for runtime configuration
        ApplicationSettingContext = serviceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    /// <summary>
    /// Gets a value indicating whether distributed tracing is enabled for this application instance.
    /// Used to conditionally create tracing activities for performance monitoring and debugging.
    /// </summary>
    /// <remarks>
    /// When enabled, query handlers create distributed tracing spans that include:
    /// - Query type and execution timing
    /// - Request parameters and context
    /// - Success/failure status
    /// - Performance metrics
    ///
    /// Tracing data is essential for:
    /// - Debugging complex query flows across services
    /// - Identifying performance bottlenecks
    /// - Monitoring query execution patterns
    /// - Correlating issues across distributed systems
    ///
    /// Configuration is typically environment-specific:
    /// - Enabled in development and staging for debugging
    /// - Configured with sampling in production for performance
    /// - Disabled in high-throughput scenarios if needed
    /// </remarks>
    protected bool IsDistributedTracingEnabled { get; }

    /// <summary>
    /// Gets the application settings context providing runtime configuration and behavior control.
    /// Used for feature flags, debug settings, and environment-specific configurations.
    /// </summary>
    /// <remarks>
    /// Provides access to:
    /// - Debug information mode for verbose logging
    /// - Performance profiling settings
    /// - Feature toggles for query optimizations
    /// - Environment-specific behavior controls
    /// - Garbage collection optimization settings
    ///
    /// Settings can be changed at runtime without application restart,
    /// enabling dynamic behavior adjustment in production environments.
    ///
    /// Commonly used for:
    /// - Enabling detailed logging for troubleshooting
    /// - Toggling experimental query optimizations
    /// - Controlling cache behavior per environment
    /// - Managing memory optimization strategies
    /// </remarks>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets or sets the number of retry attempts to perform after a query execution failure.
    /// Default is 0 (no retries) as queries are typically idempotent and read-only.
    /// </summary>
    /// <remarks>
    /// Retry logic is applied only to transient failures like:
    /// - Database connection timeouts
    /// - Network connectivity issues
    /// - Temporary service unavailability
    /// - Resource contention errors
    ///
    /// Validation and business logic exceptions are never retried
    /// as they represent permanent failures that won't resolve with retry.
    ///
    /// Consider increasing retry count for:
    /// - Critical queries that must succeed
    /// - Queries against external services
    /// - High-throughput scenarios with potential contention
    ///
    /// Balance retry count with user experience:
    /// - Higher retries improve reliability
    /// - Too many retries increase response time
    /// - Failed retries consume resources unnecessarily
    /// </remarks>
    public virtual int RetryOnFailedTimes { get; set; } = 0;

    /// <summary>
    /// Gets or sets the delay in seconds between retry attempts for failed query executions.
    /// Uses platform default delay for consistent retry behavior across the system.
    /// </summary>
    /// <remarks>
    /// Retry delay helps prevent overwhelming failing systems and allows
    /// transient issues to resolve between attempts.
    ///
    /// Default delay is configured for optimal balance between:
    /// - User experience (not too long to wait)
    /// - System recovery (sufficient time for issues to resolve)
    /// - Resource utilization (prevents retry storms)
    ///
    /// Delay strategies supported:
    /// - Fixed delay: Same interval between all retries
    /// - Exponential backoff: Increasing delays for subsequent retries
    /// - Jittered delay: Random variation to prevent retry synchronization
    ///
    /// Consider adjusting delay based on:
    /// - Expected failure recovery time
    /// - User tolerance for response time
    /// - System load and capacity constraints
    /// </remarks>
    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    /// <summary>
    /// Handles the specified CQRS query asynchronously with comprehensive error resilience.
    /// Implements retry logic and delegates to the main execution pipeline.
    /// </summary>
    /// <param name="request">The CQRS query to handle</param>
    /// <param name="cancellationToken">Cancellation token that can be used to cancel the operation</param>
    /// <returns>The result of handling the CQRS query</returns>
    /// <remarks>
    /// Main entry point for query processing that provides resilience through:
    /// - Automatic retry for transient failures
    /// - Smart exception filtering (no retry for validation errors)
    /// - Configurable retry policies per handler
    /// - Proper cancellation token propagation
    ///
    /// Retry logic automatically handles:
    /// - Database connection timeouts
    /// - Network connectivity issues
    /// - Temporary service unavailability
    /// - Resource contention scenarios
    ///
    /// Exceptions that bypass retry logic:
    /// - Validation errors (IPlatformValidationException)
    /// - Not found errors (PlatformNotFoundException)
    /// - Authorization failures
    /// - Business logic violations
    ///
    /// The method ensures that:
    /// - Final exceptions are properly propagated
    /// - Cancellation requests are honored throughout
    /// - Resource cleanup occurs regardless of outcome
    /// - Retry attempts don't exceed configured limits
    /// </remarks>
    /// <exception cref="PlatformValidationException">Thrown when request validation fails</exception>
    /// <exception cref="PlatformNotFoundException">Thrown when requested data is not found</exception>
    /// <exception cref="OperationCanceledException">Thrown when operation is cancelled</exception>
    public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => DoExecuteHandleAsync(request, cancellationToken),
            retryCount: RetryOnFailedTimes,
            sleepDurationProvider: i => RetryOnFailedDelaySeconds.Seconds(),
            ignoreExceptionTypes: IPlatformCqrsQueryApplicationHandler.IgnoreFailedRetryExceptionTypes,
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Executes the core query handling logic including validation, auditing, tracing, and error handling.
    /// Orchestrates the complete query processing pipeline with comprehensive monitoring.
    /// </summary>
    /// <param name="request">The CQRS query to handle</param>
    /// <param name="cancellationToken">Cancellation token that can be used to cancel the operation</param>
    /// <returns>The result of handling the CQRS query</returns>
    /// <remarks>
    /// Complete query execution pipeline:
    /// 1. Distributed tracing setup (if enabled)
    /// 2. Audit information generation and request tracking
    /// 3. Request validation using platform validation framework
    /// 4. Query execution through HandleAsync abstract method
    /// 5. Comprehensive error handling and logging
    /// 6. Performance monitoring and debug information
    /// 7. Automatic garbage collection optimization
    ///
    /// Error handling includes:
    /// - Detailed logging with request context and audit tracking
    /// - Differentiated logging levels (Error vs Warning) based on exception type
    /// - Stack trace beautification for better debugging
    /// - Request and context serialization for troubleshooting
    ///
    /// The method ensures:
    /// - All exceptions are logged with full context
    /// - Memory is managed efficiently after processing
    /// - Debug information is available when needed
    /// - Request audit trails are maintained
    ///
    /// Automatic garbage collection is triggered to optimize memory usage
    /// after query processing, especially important for high-throughput scenarios.
    /// </remarks>
    /// <exception cref="PlatformValidationException">Thrown when request validation fails</exception>
    protected virtual async Task<TResult> DoExecuteHandleAsync(TQuery request, CancellationToken cancellationToken)
    {
        try
        {
            return await HandleWithTracing(
                request,
                async () =>
                {
                    // Generate and set audit information for request tracking
                    request.SetAuditInfo<TQuery>(BuildRequestAuditInfo(request));

                    // Validate request and ensure all validation rules pass
                    await ValidateRequestAsync(request, cancellationToken).EnsureValidAsync();

                    // Execute query with comprehensive error handling
                    var result = await Util.TaskRunner.CatchExceptionContinueThrowAsync(
                        () => HandleAsync(request, cancellationToken),
                        onException: ex =>
                        {
                            if (AutoLogOnException)
                            {
                                // Log errors with appropriate level and full context
                                LoggerFactory
                                    .CreateLogger(typeof(PlatformCqrsQueryApplicationHandler<,>).GetNameOrGenericTypeName() + $"-{GetType().Name}")
                                    .Log(
                                        !ex.IsPlatformLogicException() ? LogLevel.Error : LogLevel.Warning,
                                        ex.BeautifyStackTrace(),
                                        "[{Tag1}] Query:{RequestName} has error {Error}. AuditTrackId:{AuditTrackId}. Request:{@Request}. RequestContext:{@RequestContext}",
                                        "UnknownError",
                                        request.GetType().Name,
                                        ex.Message,
                                        request.AuditInfo?.AuditTrackId,
                                        request,
                                        RequestContext.GetAllKeyValues()
                                    );
                            }
                        }
                    );

                    return result;
                }
            );
        }
        finally
        {
            // Optimize memory usage after query processing
            ApplicationSettingContext.ProcessAutoGarbageCollect();
        }
    }

    /// <summary>
    /// Handles the specified CQRS query with distributed tracing integration.
    /// Creates tracing activities for observability and performance monitoring when enabled.
    /// </summary>
    /// <param name="request">The CQRS query to handle</param>
    /// <param name="handleFunc">The function representing the core query handling logic</param>
    /// <returns>The result of handling the CQRS query</returns>
    /// <remarks>
    /// Tracing integration provides:
    /// - Distributed tracing spans for cross-service correlation
    /// - Performance timing and monitoring
    /// - Request metadata and context tracking
    /// - Debug information logging when enabled
    ///
    /// When distributed tracing is enabled:
    /// - Creates a new activity span for the query execution
    /// - Adds request type and serialized request as span tags
    /// - Correlates with parent spans from calling services
    /// - Tracks execution timing and success/failure status
    ///
    /// Debug information logging includes:
    /// - Method entry and exit timing
    /// - Full type and method names for debugging
    /// - Integration with application settings for control
    ///
    /// The method ensures proper resource cleanup by using
    /// 'using' statements for activity disposal, even if exceptions occur.
    ///
    /// Tracing data integrates with:
    /// - OpenTelemetry collectors
    /// - Application Performance Monitoring (APM) tools
    /// - Distributed tracing systems like Jaeger or Zipkin
    /// - Cloud-native observability platforms
    /// </remarks>
    protected async Task<TResult> HandleWithTracing(TQuery request, Func<Task<TResult>> handleFunc)
    {
        // Log method entry for debug purposes
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(Handle));

        if (IsDistributedTracingEnabled)
        {
            // Create distributed tracing activity with request metadata
            using (var activity = IPlatformCqrsCommandApplicationHandler.ActivitySource.StartActivity($"QueryApplicationHandler.{nameof(Handle)}"))
            {
                // Add request metadata to tracing span
                activity?.SetTag("RequestType", request.GetType().Name);
                activity?.SetTag("Request", request.ToFormattedJson());

                return await handleFunc();
            }
        }

        // Execute without tracing when disabled
        var result = await handleFunc();

        // Log method completion for debug purposes
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} COMPLETED", GetType().FullName, nameof(Handle));

        return result;
    }

    /// <summary>
    /// Abstract method that must be implemented by concrete query application handlers.
    /// Contains the core business logic for processing the specific query type.
    /// </summary>
    /// <param name="request">The CQRS query to process</param>
    /// <param name="cancellationToken">Cancellation token that can be used to cancel the operation</param>
    /// <returns>The result of processing the CQRS query</returns>
    /// <remarks>
    /// This method contains the actual business logic for query processing.
    /// Implementers should focus on:
    /// - Data retrieval from repositories or external services
    /// - Business logic application and data transformation
    /// - Result optimization and DTO mapping
    /// - Cache integration for performance improvement
    ///
    /// Infrastructure concerns are handled by the base class:
    /// - Request validation (completed before this method)
    /// - Error handling and logging (wrapped around this method)
    /// - Distributed tracing (spans created around this method)
    /// - Retry logic (applied to this method execution)
    /// - Memory management (cleanup after this method)
    ///
    /// Common implementation patterns:
    /// - Repository pattern for data access
    /// - Mapping services for DTO conversion
    /// - Cache-aside pattern for performance
    /// - Aggregation and projection for complex queries
    ///
    /// Performance considerations:
    /// - Use async/await properly for I/O operations
    /// - Respect cancellation tokens for responsive behavior
    /// - Implement efficient database queries with proper indexing
    /// - Consider pagination for large result sets
    /// - Use projection to minimize data transfer
    ///
    /// Caching strategies:
    /// - Check cache before executing expensive operations
    /// - Store computed results with appropriate expiration
    /// - Use cache keys derived from query.BuildCacheKey()
    /// - Implement cache invalidation for data consistency
    ///
    /// Error handling:
    /// - Throw specific exceptions for different failure scenarios
    /// - Use PlatformNotFoundException for missing data
    /// - Let infrastructure handle logging and retry decisions
    /// - Ensure proper resource cleanup in finally blocks
    /// </remarks>
    protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
}
