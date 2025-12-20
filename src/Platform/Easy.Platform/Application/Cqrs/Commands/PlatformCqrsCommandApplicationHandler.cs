#region

using System.Diagnostics;
using Easy.Platform.Application.Exceptions.Extensions;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Exceptions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Commands;

/// <summary>
/// Interface defining constants and shared infrastructure for Platform CQRS command application handlers.
/// Provides common configuration for retry policies, exception handling, and distributed tracing.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Shared Infrastructure:</strong>
/// This interface establishes common infrastructure used across all command application handlers:
/// - Exception types that should not trigger retry mechanisms
/// - Distributed tracing activity source for observability
/// - Common configuration and behavior patterns
/// </para>
///
/// <para>
/// <strong>Exception Handling Strategy:</strong>
/// Defines exception types that indicate business logic errors rather than transient failures.
/// These exceptions should not trigger retry mechanisms as they represent validation errors,
/// business rule violations, or data conflicts that won't resolve with retries.
/// </para>
///
/// <para>
/// <strong>Observability Integration:</strong>
/// Provides shared activity source for distributed tracing across all command handlers,
/// enabling consistent telemetry collection and performance monitoring.
/// </para>
/// </remarks>
public interface IPlatformCqrsCommandApplicationHandler
{
    /// <summary>
    /// Gets the list of exception types that should not trigger retry mechanisms.
    /// These exceptions represent business logic errors rather than transient failures.
    /// </summary>
    /// <value>
    /// Collection of exception types that indicate permanent failures:
    /// - IPlatformValidationException: Input validation failures
    /// - PlatformNotFoundException: Resource not found errors
    /// - PlatformDomainRowVersionConflictException: Optimistic concurrency conflicts
    /// </value>
    /// <remarks>
    /// These exception types represent scenarios where retrying would not resolve the issue:
    /// - Validation exceptions indicate invalid input that won't change
    /// - Not found exceptions indicate missing resources that won't appear
    /// - Concurrency conflicts require user intervention or conflict resolution
    /// 
    /// Used by retry mechanisms to avoid wasting resources on unrecoverable errors.
    /// Additional exception types can be added based on application requirements.
    /// </remarks>
    public static readonly List<Type> IgnoreFailedRetryExceptionTypes =
    [
        typeof(IPlatformValidationException),
        typeof(PlatformNotFoundException),
        typeof(PlatformDomainRowVersionConflictException)
    ];

    /// <summary>
    /// Gets the activity source for distributed tracing of command application handler execution.
    /// Enables observability and performance monitoring across distributed command processing.
    /// </summary>
    /// <value>
    /// ActivitySource instance for creating distributed tracing activities.
    /// Used to track command execution across service boundaries and infrastructure layers.
    /// </value>
    /// <remarks>
    /// Activity source enables:
    /// - Distributed tracing across microservices and infrastructure components
    /// - Performance monitoring and bottleneck identification
    /// - Request correlation and flow visualization
    /// - Error tracking and debugging support
    /// 
    /// Activities created include command type, execution timing, and result information.
    /// Integrates with platform observability infrastructure and monitoring systems.
    /// </remarks>
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsCommandApplicationHandler)}");
}

/// <summary>
/// Abstract base class for application-level Platform CQRS command handlers with typed results.
/// Provides complete command processing pipeline with validation, transaction management, event publishing, and error handling.
/// </summary>
/// <typeparam name="TCommand">The command type to handle, must inherit from PlatformCqrsCommand&lt;TResult&gt;</typeparam>
/// <typeparam name="TResult">The result type returned by command execution, must inherit from PlatformCqrsCommandResult</typeparam>
/// <remarks>
/// <para>
/// <strong>Complete Application Command Pipeline:</strong>
/// This abstract class provides comprehensive command processing including:
/// - Input validation with detailed error reporting
/// - Transaction management with automatic rollback on failure
/// - Event publishing for domain events and integration scenarios
/// - Distributed tracing and observability integration
/// - Retry mechanisms with intelligent exception handling
/// - Audit trail generation and compliance tracking
/// </para>
///
/// <para>
/// <strong>Transaction and Unit of Work Management:</strong>
/// Automatically manages database transactions and unit of work patterns:
/// - Creates transaction scope for command execution
/// - Commits on successful completion
/// - Rolls back on exceptions or validation failures
/// - Manages nested transaction scenarios
/// - Coordinates with domain repositories and services
/// </para>
///
/// <para>
/// <strong>Event-Driven Architecture Integration:</strong>
/// Seamlessly integrates with event-driven patterns:
/// - Publishes domain events after successful command execution
/// - Manages event context and correlation information
/// - Supports both synchronous and asynchronous event processing
/// - Enables cross-service communication and integration
/// </para>
///
/// <para>
/// <strong>Error Handling and Resilience:</strong>
/// Implements comprehensive error handling strategies:
/// - Validation error collection and reporting
/// - Business exception handling and transformation
/// - Retry mechanisms for transient failures
/// - Graceful degradation for non-critical operations
/// - Structured error logging and monitoring
/// </para>
///
/// <para>
/// <strong>Usage Pattern:</strong>
/// Application command handlers inherit from this class and implement:
/// - HandleAsync: Core business logic for command processing
/// - Optional validation and event handling customization
/// - Application-specific error handling and transformation
/// </para>
/// </remarks>
public abstract class PlatformCqrsCommandApplicationHandler<TCommand, TResult>
    : PlatformCqrsRequestApplicationHandler<TCommand>, IRequestHandler<TCommand, TResult>
    where TCommand : PlatformCqrsCommand<TResult>, IPlatformCqrsRequest, new()
    where TResult : PlatformCqrsCommandResult, new()
{
    /// <summary>
    /// Gets the lazy-loaded CQRS service for handling command and event operations.
    /// Provides access to command execution and event publishing capabilities.
    /// </summary>
    /// <value>
    /// Lazy-loaded IPlatformCqrs instance for CQRS operations.
    /// Essential for event publishing and cross-service command coordination.
    /// </value>
    /// <remarks>
    /// Lazy loading prevents circular dependencies during service container initialization.
    /// CQRS service provides:
    /// - Event publishing capabilities for domain events
    /// - Cross-service command execution coordination
    /// - Integration with message bus and event infrastructure
    /// - Request correlation and tracking across service boundaries
    /// 
    /// Used primarily for publishing events after successful command execution.
    /// Critical for event-driven architecture and service integration patterns.
    /// </remarks>
    protected readonly Lazy<IPlatformCqrs> Cqrs;

    /// <summary>
    /// Gets the unit of work manager for coordinating database transactions and resource management.
    /// Provides transaction boundaries and ensures data consistency across repositories.
    /// </summary>
    /// <value>
    /// IPlatformUnitOfWorkManager for transaction and resource coordination.
    /// Essential for maintaining data consistency and proper transaction boundaries.
    /// </value>
    /// <remarks>
    /// Unit of work manager provides:
    /// - Database transaction management and coordination
    /// - Multi-repository transaction boundaries
    /// - Automatic rollback on exceptions or validation failures
    /// - Resource cleanup and connection management
    /// - Integration with domain repositories and services
    /// 
    /// Used to ensure command execution occurs within proper transaction boundaries.
    /// Critical for data consistency and ACID compliance in command operations.
    /// </remarks>
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    /// <summary>
    /// Initializes a new instance of the command application handler with comprehensive application infrastructure.
    /// Sets up transaction management, CQRS services, logging, and distributed tracing capabilities.
    /// </summary>
    /// <param name="requestContextAccessor">Application request context accessor for user and security information</param>
    /// <param name="unitOfWorkManager">Unit of work manager for database transaction coordination</param>
    /// <param name="cqrs">Lazy-loaded CQRS service for command and event operations</param>
    /// <param name="loggerFactory">Logger factory for creating categorized loggers</param>
    /// <param name="serviceProvider">Service provider for dependency resolution and configuration access</param>
    /// <remarks>
    /// <para>
    /// <strong>Infrastructure Initialization:</strong>
    /// Constructor sets up complete application command processing infrastructure:
    /// 1. Base application handler initialization (logging, context, dependencies)
    /// 2. Transaction management setup for data consistency
    /// 3. CQRS service configuration for event publishing
    /// 4. Distributed tracing configuration based on platform settings
    /// 5. Application settings context for runtime configuration
    /// </para>
    ///
    /// <para>
    /// <strong>Configuration Discovery:</strong>
    /// Automatically discovers and configures:
    /// - Distributed tracing enablement from platform configuration
    /// - Application settings context for handler-specific configuration
    /// - Service dependencies required for command processing
    /// </para>
    ///
    /// <para>
    /// <strong>Dependency Strategy:</strong>
    /// Uses constructor injection to ensure all required infrastructure is available.
    /// Lazy CQRS loading prevents circular dependencies during container initialization.
    /// Configuration services are resolved immediately for runtime behavior control.
    /// </para>
    /// </remarks>
    protected PlatformCqrsCommandApplicationHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider
    ) : base(requestContextAccessor, loggerFactory, serviceProvider)
    {
        UnitOfWorkManager = unitOfWorkManager;
        Cqrs = cqrs;
        // Configure distributed tracing based on platform configuration
        IsDistributedTracingEnabled = serviceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
        // Resolve application settings context for handler configuration
        ApplicationSettingContext = serviceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
    }

    /// <summary>
    /// Gets a value indicating whether distributed tracing is enabled for this handler instance.
    /// Controls creation of tracing activities and telemetry collection.
    /// </summary>
    /// <value>
    /// True if distributed tracing is enabled; false to disable tracing for performance.
    /// Configured through PlatformModule.DistributedTracingConfig.Enabled setting.
    /// </value>
    /// <remarks>
    /// Distributed tracing enablement affects:
    /// - Activity creation for command execution tracking
    /// - Telemetry collection and performance monitoring
    /// - Cross-service request correlation and visualization
    /// - Debugging and troubleshooting capabilities
    /// 
    /// When enabled, creates detailed execution traces for:
    /// - Command validation and processing phases
    /// - Transaction boundaries and database operations
    /// - Event publishing and cross-service calls
    /// - Error conditions and exception handling
    /// 
    /// Performance consideration: Disable in high-throughput scenarios if needed.
    /// </remarks>
    protected bool IsDistributedTracingEnabled { get; }

    /// <summary>
    /// Gets the application setting context providing access to runtime configuration and settings.
    /// Enables handlers to access application-specific configuration and behavior customization.
    /// </summary>
    /// <value>
    /// IPlatformApplicationSettingContext for accessing application configuration.
    /// Provides runtime settings for handler behavior customization.
    /// </value>
    /// <remarks>
    /// Application setting context provides access to:
    /// - Handler-specific configuration and behavior settings
    /// - Feature flags and runtime behavior control
    /// - Integration endpoints and external service configuration
    /// - Performance tuning and optimization parameters
    /// 
    /// Used by handlers to:
    /// - Customize processing based on runtime configuration
    /// - Access external service endpoints and credentials
    /// - Control feature enablement and business logic variations
    /// - Adapt behavior based on environment and deployment settings
    /// 
    /// Essential for flexible and configurable command processing.
    /// </remarks>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets or sets the number of retry attempts to perform after a command execution failure.
    /// Provides resilience against transient failures in command processing.
    /// </summary>
    /// <value>
    /// The number of retry attempts. Default is 0 (no retries). 
    /// Increase for critical commands that must succeed or when dealing with transient failures.
    /// </value>
    /// <remarks>
    /// Retry logic applies to command execution failures including:
    /// - Database connection timeouts or deadlocks
    /// - Network connectivity issues with external services
    /// - Temporary resource unavailability
    /// - Optimistic concurrency conflicts
    /// 
    /// Validation errors and business logic exceptions are not retried
    /// as they represent permanent failures that won't resolve with retry.
    /// 
    /// Consider retry configuration based on command criticality:
    /// - Critical data operations: 3-5 retries
    /// - Non-critical operations: 0-1 retries
    /// - User-facing operations: Low retries to maintain responsiveness
    /// - Background processing: Higher retries for eventual consistency
    /// </remarks>
    public virtual int RetryOnFailedTimes { get; set; } = 0;

    /// <summary>
    /// Gets or sets the delay in seconds between retry attempts on command failure.
    /// Uses platform default delay for consistent retry behavior across the system.
    /// </summary>
    /// <value>
    /// Delay in seconds between retry attempts. Default uses TaskRunner.DefaultResilientDelaySeconds.
    /// Longer delays help prevent overwhelming failing systems.
    /// </value>
    /// <remarks>
    /// Retry delay serves multiple purposes:
    /// - Allows transient issues to resolve between attempts
    /// - Prevents retry storms that could overwhelm failing systems
    /// - Provides time for resources to become available
    /// - Enables graceful recovery from temporary failures
    /// 
    /// Delay strategies supported:
    /// - Fixed delay: Same interval between all retries
    /// - Exponential backoff: Increasing delays for subsequent retries
    /// - Configurable per handler for specific requirements
    /// 
    /// Consider adjusting based on:
    /// - Expected failure recovery time
    /// - User tolerance for response delays
    /// - System capacity and load characteristics
    /// - Downstream service recovery patterns
    /// </remarks>
    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    /// <summary>
    /// Gets a value indicating whether a unit of work should be automatically opened for command processing.
    /// Controls automatic transaction boundary management for command execution.
    /// </summary>
    /// <value>
    /// True to automatically open unit of work; false to manage transactions manually.
    /// Default is true for automatic transaction management.
    /// </value>
    /// <remarks>
    /// Automatic unit of work management provides:
    /// - Transparent transaction boundaries around command execution
    /// - Automatic rollback on exceptions or validation failures
    /// - Consistent transaction behavior across all command handlers
    /// - Integration with repository and domain service patterns
    /// 
    /// When enabled:
    /// - Transaction begins before command validation
    /// - Commits automatically after successful command execution
    /// - Rolls back automatically on any exception
    /// - Ensures all repository operations occur within same transaction
    /// 
    /// Override to false when:
    /// - Manual transaction control is required
    /// - Command doesn't modify data (read-only operations)
    /// - Custom transaction boundaries are needed
    /// - Integration with external transaction coordinators
    /// </remarks>
    protected virtual bool AutoOpenUow => true;

    /// <summary>
    /// Handles the specified CQRS command asynchronously with comprehensive processing pipeline.
    /// Orchestrates validation, execution, event publishing, and error handling with transaction management.
    /// </summary>
    /// <param name="request">The CQRS command to handle</param>
    /// <param name="cancellationToken">Cancellation token that can be used to cancel the operation</param>
    /// <returns>The result of handling the CQRS command</returns>
    /// <remarks>
    /// Complete command processing pipeline:
    /// 1. Distributed tracing setup (if enabled) 
    /// 2. Request validation using platform validation framework
    /// 3. Command execution within transaction boundaries
    /// 4. Automatic event publishing for command completion
    /// 5. Comprehensive error handling and logging
    /// 6. Automatic memory management and cleanup
    /// 
    /// Transaction Management:
    /// - Automatic unit of work creation (if AutoOpenUow is true)
    /// - Transaction commit on successful execution
    /// - Automatic rollback on exceptions or validation failures
    /// - Proper resource cleanup in all scenarios
    /// 
    /// Event Publishing:
    /// - Automatic detection of command event handlers
    /// - Publishing of PlatformCqrsCommandEvent with Executed action
    /// - Request context propagation for event correlation
    /// - Integration with event-driven architecture
    /// 
    /// Error Handling:
    /// - Comprehensive logging with full request context
    /// - Differentiated logging levels based on exception type
    /// - Stack trace beautification for debugging
    /// - Audit trail preservation for troubleshooting
    /// 
    /// Memory Management:
    /// - Automatic garbage collection optimization
    /// - Resource cleanup after command processing
    /// - Performance optimization for high-throughput scenarios
    /// </remarks>
    /// <exception cref="PlatformValidationException">Thrown when request validation fails</exception>
    /// <exception cref="OperationCanceledException">Thrown when operation is cancelled</exception>
    public virtual async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
    {
        try
        {
            return await HandleWithTracing(
                request,
                async () =>
                {
                    // Validate request and ensure all validation rules pass
                    await ValidateRequestAsync(request, cancellationToken).EnsureValidAsync();

                    // Execute command with comprehensive error handling
                    var result = await Util.TaskRunner.CatchExceptionContinueThrowAsync(
                        () => ExecuteHandleAsync(request, cancellationToken),
                        onException: ex =>
                        {
                            if (AutoLogOnException)
                            {
                                // Log errors with appropriate level and full context
                                LoggerFactory
                                    .CreateLogger(typeof(PlatformCqrsCommandApplicationHandler<>).GetNameOrGenericTypeName() + $"-{GetType().Name}")
                                    .Log(
                                        !ex.IsPlatformLogicException() ? LogLevel.Error : LogLevel.Warning,
                                        ex.BeautifyStackTrace(),
                                        "[{Tag1}] Command:{RequestName} has error {Error}. AuditTrackId:{AuditTrackId}. Request:{@Request}. RequestContext:{@RequestContext}",
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

                    // Publish command executed event if handlers are registered
                    if (RootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(
                        typeof(IPlatformCqrsEventHandler<PlatformCqrsCommandEvent<TCommand, TResult>>)) > 0)
                    {
                        await Cqrs.Value.SendEvent(
                            new PlatformCqrsCommandEvent<TCommand, TResult>(request, result, PlatformCqrsCommandEventAction.Executed)
                                .With(p => p.SetRequestContextValues(RequestContext.GetAllKeyValues())),
                            cancellationToken
                        );
                    }

                    return result;
                }
            );
        }
        finally
        {
            // Optimize memory usage after command processing
            ApplicationSettingContext.ProcessAutoGarbageCollect();
        }
    }

    /// <summary>
    /// Handles the specified CQRS command with distributed tracing integration.
    /// Creates tracing activities for observability and performance monitoring when enabled.
    /// </summary>
    /// <param name="request">The CQRS command to handle</param>
    /// <param name="handleFunc">The function representing the core command handling logic</param>
    /// <returns>The result of handling the CQRS command</returns>
    /// <remarks>
    /// Tracing integration provides:
    /// - Distributed tracing spans for cross-service correlation
    /// - Performance timing and monitoring capabilities
    /// - Request metadata and context tracking
    /// - Debug information logging when enabled
    /// 
    /// When distributed tracing is enabled:
    /// - Creates a new activity span for command execution
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
    /// - OpenTelemetry collectors and processors
    /// - Application Performance Monitoring (APM) tools
    /// - Distributed tracing systems like Jaeger or Zipkin
    /// - Cloud-native observability platforms
    /// </remarks>
    protected async Task<TResult> HandleWithTracing(TCommand request, Func<Task<TResult>> handleFunc)
    {
        // Log method entry for debug purposes
        if (ApplicationSettingContext.IsDebugInformationMode)
            Logger.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(Handle));

        if (IsDistributedTracingEnabled)
        {
            // Create distributed tracing activity with request metadata
            using (var activity = IPlatformCqrsCommandApplicationHandler.ActivitySource.StartActivity($"CommandApplicationHandler.{nameof(Handle)}"))
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
    /// Handles the specified CQRS command asynchronously with retry logic and unit of work management.
    /// </summary>
    /// <param name="request">The CQRS command to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS command.</returns>
    protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

    /// <summary>
    /// Executes the handling logic for the CQRS command with retry logic.
    /// </summary>
    /// <param name="request">The CQRS command to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS command.</returns>
    protected virtual Task<TResult> ExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
    {
        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () => DoExecuteHandleAsync(request, cancellationToken),
            retryCount: RetryOnFailedTimes,
            sleepDurationProvider: i => RetryOnFailedDelaySeconds.Seconds(),
            ignoreExceptionTypes: IPlatformCqrsCommandApplicationHandler.IgnoreFailedRetryExceptionTypes,
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Executes the handling logic for the CQRS command with or without opening a unit of work.
    /// </summary>
    /// <param name="request">The CQRS command to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS command.</returns>
    protected virtual async Task<TResult> DoExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
    {
        if (AutoOpenUow == false)
            return await HandleAsync(request, cancellationToken);

        return await UnitOfWorkManager.ExecuteUowTask(() => HandleAsync(request, cancellationToken));
    }
}

/// <summary>
/// Provides a base class for application-level handlers of CQRS command requests with a default result type.
/// </summary>
/// <typeparam name="TCommand">The type of CQRS command handled by this class.</typeparam>
public abstract class PlatformCqrsCommandApplicationHandler<TCommand> : PlatformCqrsCommandApplicationHandler<TCommand, PlatformCqrsCommandResult>
    where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>, IPlatformCqrsRequest, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsCommandApplicationHandler{TCommand}" /> class.
    /// </summary>
    /// <param name="requestContextAccessor">The request context accessor providing information about the current application request context.</param>
    /// <param name="unitOfWorkManager">The unit of work manager for managing database transactions.</param>
    /// <param name="cqrs">The CQRS service for handling commands.</param>
    /// <param name="loggerFactory">The logger factory used for creating loggers.</param>
    /// <param name="serviceProvider">The root service provider for resolving dependencies.</param>
    protected PlatformCqrsCommandApplicationHandler(
        IPlatformApplicationRequestContextAccessor requestContextAccessor,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        Lazy<IPlatformCqrs> cqrs,
        ILoggerFactory loggerFactory,
        IServiceProvider serviceProvider
    )
        : base(requestContextAccessor, unitOfWorkManager, cqrs, loggerFactory, serviceProvider)
    {
    }

    /// <summary>
    /// Handles the specified CQRS command without a result.
    /// </summary>
    /// <param name="request">The CQRS command to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>A <see cref="Task" /> representing the asynchronous operation.</returns>
    public abstract Task HandleNoResult(TCommand request, CancellationToken cancellationToken);

    /// <summary>
    /// Handles the specified CQRS command with a default result.
    /// </summary>
    /// <param name="request">The CQRS command to handle.</param>
    /// <param name="cancellationToken">A <see cref="CancellationToken" /> that can be used to cancel the operation.</param>
    /// <returns>The result of handling the CQRS command.</returns>
    protected override async Task<PlatformCqrsCommandResult> HandleAsync(TCommand request, CancellationToken cancellationToken)
    {
        await HandleNoResult(request, cancellationToken);
        return new PlatformCqrsCommandResult();
    }
}
