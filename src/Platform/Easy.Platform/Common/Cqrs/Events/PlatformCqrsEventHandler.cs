#region

using System.Diagnostics;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Common.Cqrs.Events;

/// <summary>
/// Defines the core contract for all Platform CQRS event handlers in the system.
/// This interface provides the foundation for event-driven architecture by establishing
/// common execution patterns, error handling strategies, and distributed tracing capabilities.
/// </summary>
/// <remarks>
/// <para>
/// The IPlatformCqrsEventHandler interface serves as the base contract for all event handlers
/// in the Platform CQRS implementation. It provides essential infrastructure for:
/// </para>
///
/// <para>
/// <strong>Core Capabilities:</strong>
/// - Non-generic event handling for dynamic event processing
/// - Execution control flags for managing handler behavior
/// - Retry mechanisms for resilient event processing
/// - Distributed tracing integration for observability
/// - Thread safety and scope management
/// </para>
///
/// <para>
/// <strong>Execution Control:</strong>
/// The interface provides several control flags that allow fine-tuning of event handler execution:
/// - ForceCurrentInstanceHandleInCurrentThreadAndScope: Controls whether to use current instance or create new scope
/// - IsHandlingInNewScope: Indicates if the handler is executing in a new dependency injection scope
/// - RetryOnFailedTimes: Configures the number of retry attempts for failed operations
/// - ThrowExceptionOnHandleFailed: Controls exception propagation behavior
/// </para>
///
/// <para>
/// <strong>Design Pattern:</strong>
/// This interface follows the mediator pattern via MediatR integration, enabling loose coupling
/// between event producers and consumers. Event handlers are automatically discovered and registered
/// through dependency injection, supporting both synchronous and asynchronous event processing.
/// </para>
/// </remarks>
public interface IPlatformCqrsEventHandler
{
    /// <summary>
    /// Activity source for distributed tracing and observability of event handler execution.
    /// This enables monitoring of event processing across distributed systems and provides
    /// correlation tracking for debugging and performance analysis.
    /// </summary>
    /// <remarks>
    /// The ActivitySource is used to create Activity instances that track the execution of event handlers,
    /// providing valuable telemetry data for monitoring distributed event processing flows.
    /// Activities created from this source include handler type, event type, and execution timing information.
    /// </remarks>
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformCqrsEventHandler)}");

    /// <summary>
    /// Gets or sets a value indicating whether this handler instance should execute in the current thread and scope
    /// rather than being dispatched to a background thread with a new dependency injection scope.
    /// </summary>
    /// <value>
    /// <c>true</c> to force execution in the current thread and scope; <c>false</c> to allow background execution.
    /// Default is <c>false</c>, enabling background execution for better performance and non-blocking operations.
    /// </value>
    /// <remarks>
    /// <para>
    /// This property is particularly useful in scenarios where:
    /// - The event handler must complete before the originating operation continues
    /// - The handler requires access to the same database transaction or unit of work
    /// - Testing scenarios where background execution complicates verification
    /// - Synchronous processing is required for business logic consistency
    /// </para>
    ///
    /// <para>
    /// When set to <c>true</c>, the handler will execute synchronously in the same thread,
    /// which may impact performance but ensures immediate completion and shared context access.
    /// </para>
    /// </remarks>
    public bool ForceCurrentInstanceHandleInCurrentThreadAndScope { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this handler instance is currently executing within a new dependency injection scope.
    /// This flag helps handlers adapt their behavior based on their execution context.
    /// </summary>
    /// <value>
    /// <c>true</c> if the handler is executing in a new scope; <c>false</c> if executing in the original scope.
    /// This value is automatically set by the framework during handler execution.
    /// </value>
    /// <remarks>
    /// <para>
    /// This property is automatically managed by the event handling infrastructure and provides context
    /// about the execution environment. Handlers can use this information to:
    /// </para>
    ///
    /// <para>
    /// <strong>Behavioral Adaptations:</strong>
    /// - Modify logging behavior based on execution context
    /// - Adjust resource allocation strategies
    /// - Implement different error handling approaches
    /// - Optimize performance based on scope isolation
    /// </para>
    ///
    /// <para>
    /// <strong>Scope Lifecycle:</strong>
    /// New scopes are created for background execution to ensure proper resource management
    /// and isolation between concurrent event processing operations.
    /// </para>
    /// </remarks>
    public bool IsHandlingInNewScope { get; set; }

    /// <summary>
    /// Gets or sets the number of times to retry event handling upon failure.
    /// This provides resilience against transient failures and temporary resource unavailability.
    /// </summary>
    /// <value>
    /// The number of retry attempts. Default value is configured in <see cref="Util.TaskRunner.DefaultResilientRetryCount"/>.
    /// Set to 0 to disable retries, or use int.MaxValue for unlimited retries in critical scenarios.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Retry Strategy:</strong>
    /// The retry mechanism uses exponential backoff with configurable delays to avoid overwhelming
    /// failing resources. Each retry attempt includes detailed logging for troubleshooting purposes.
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases for Retries:</strong>
    /// - Database connection timeouts or deadlocks
    /// - Temporary network connectivity issues
    /// - Resource contention in high-load scenarios
    /// - External service temporary unavailability
    /// </para>
    ///
    /// <para>
    /// <strong>Configuration Guidelines:</strong>
    /// - Low values (1-3) for user-facing operations
    /// - Medium values (5-10) for background processing
    /// - High values or unlimited for critical data consistency operations
    /// </para>
    /// </remarks>
    public int RetryOnFailedTimes { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether exceptions should be thrown when event handling fails.
    /// This controls the error propagation behavior and affects the overall system resilience.
    /// </summary>
    /// <value>
    /// <c>true</c> to throw exceptions on failure; <c>false</c> to log errors without throwing.
    /// Default behavior varies based on handler type and execution context.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Error Handling Strategies:</strong>
    /// - <c>true</c>: Exceptions propagate to the caller, enabling immediate error handling but potentially disrupting normal flow
    /// - <c>false</c>: Errors are logged but don't disrupt the calling operation, providing better system resilience
    /// </para>
    ///
    /// <para>
    /// <strong>Contextual Behavior:</strong>
    /// The default value may be automatically adjusted based on:
    /// - Whether the handler is called from an inbox message consumer
    /// - The criticality of the event being processed
    /// - The execution context (background vs. foreground)
    /// </para>
    ///
    /// <para>
    /// <strong>Best Practices:</strong>
    /// Set to <c>true</c> for critical operations where failure should halt processing,
    /// and <c>false</c> for non-critical events where system availability is prioritized.
    /// </para>
    /// </remarks>
    public bool ThrowExceptionOnHandleFailed { get; set; }

    /// <summary>
    /// Handles the specified event in a non-generic manner, enabling dynamic event processing
    /// where the event type is determined at runtime.
    /// </summary>
    /// <param name="event">
    /// The event object to handle. Must implement IPlatformCqrsEvent or be compatible
    /// with the handler's expected event type.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// Handlers should respect this token for responsive cancellation.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event has been fully processed or fails with an exception.
    /// </returns>
    /// <remarks>
    /// <para>
    /// This method provides the entry point for polymorphic event handling, allowing
    /// the same interface to process different event types determined at runtime.
    /// It typically delegates to the strongly-typed Handle method after type validation.
    /// </para>
    ///
    /// <para>
    /// <strong>Implementation Pattern:</strong>
    /// Implementations usually cast the event parameter to the expected concrete type
    /// and then invoke the strongly-typed handling logic, providing both type safety
    /// and runtime flexibility.
    /// </para>
    /// </remarks>
    /// <exception cref="ArgumentException">Thrown when the event parameter is not of the expected type.</exception>
    /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled via the cancellation token.</exception>
    Task Handle(object @event, CancellationToken cancellationToken);

    /// <summary>
    /// Determines whether this handler should process the specified event based on runtime conditions.
    /// This provides conditional event processing capabilities for dynamic filtering.
    /// </summary>
    /// <param name="event">
    /// The event object to evaluate. The handler examines the event's properties and state
    /// to determine if processing should occur.
    /// </param>
    /// <returns>
    /// A Task containing <c>true</c> if the event should be handled; otherwise, <c>false</c>.
    /// This allows for asynchronous condition evaluation if needed.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Conditional Processing:</strong>
    /// This method enables handlers to implement sophisticated filtering logic based on:
    /// - Event content and properties
    /// - Current system state
    /// - Environmental conditions
    /// - Business rules and policies
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// By returning <c>false</c> for events that don't require processing, handlers can
    /// avoid unnecessary work and improve overall system performance.
    /// </para>
    ///
    /// <para>
    /// <strong>Dynamic Behavior:</strong>
    /// The evaluation can be based on runtime conditions, configuration settings,
    /// or complex business logic, providing flexible event routing capabilities.
    /// </para>
    /// </remarks>
    public Task<bool> HandleWhen(object @event);
}

/// <summary>
/// Generic interface for strongly-typed Platform CQRS event handlers.
/// Provides type-safe event processing with compile-time verification and enhanced IntelliSense support.
/// </summary>
/// <typeparam name="TEvent">The specific event type this handler processes, must implement IPlatformCqrsEvent</typeparam>
/// <remarks>
/// <para>
/// <strong>Type-Safe Event Handling:</strong>
/// This generic interface extends the base IPlatformCqrsEventHandler with strong typing,
/// providing compile-time safety and enhanced development experience through:
/// - Compile-time type verification for event-handler relationships
/// - IntelliSense support for event-specific properties and methods
/// - Automatic type conversion and validation
/// - Generic constraint enforcement for event type compatibility
/// </para>
///
/// <para>
/// <strong>MediatR Integration:</strong>
/// Inherits from INotificationHandler&lt;TEvent&gt; for seamless MediatR integration,
/// enabling automatic handler discovery, registration, and dispatching through
/// the mediator pattern implementation.
/// </para>
///
/// <para>
/// <strong>CQRS Pipeline Integration:</strong>
/// Combines strongly-typed processing with the complete CQRS event handling pipeline,
/// including conditional processing, distributed tracing, scope management,
/// and resilient execution patterns.
/// </para>
///
/// <para>
/// <strong>Usage Pattern:</strong>
/// Implement this interface for handlers that process specific event types:
/// - Domain events for business logic processing
/// - Integration events for cross-service communication
/// - Command events for audit and monitoring
/// - System events for infrastructure concerns
/// </para>
/// </remarks>
public interface IPlatformCqrsEventHandler<in TEvent> : INotificationHandler<TEvent>, IPlatformCqrsEventHandler
    where TEvent : IPlatformCqrsEvent
{
    /// <summary>
    /// Determines whether this handler should process the specified strongly-typed event based on runtime conditions.
    /// This provides conditional event processing capabilities for dynamic filtering with compile-time type safety.
    /// </summary>
    /// <param name="event">
    /// The strongly-typed event object to evaluate. The handler examines the event's properties and state
    /// to determine if processing should occur for this specific event type.
    /// </param>
    /// <returns>
    /// A Task containing <c>true</c> if the event should be handled; otherwise, <c>false</c>.
    /// This allows for asynchronous condition evaluation including database queries or external service calls.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Type-Safe Conditional Processing:</strong>
    /// This strongly-typed version provides compile-time safety and IntelliSense support
    /// while enabling sophisticated filtering logic based on:
    /// - Event-specific properties and business state
    /// - Handler configuration and runtime environment
    /// - Complex business rules and validation conditions
    /// - Integration with external systems or data sources
    /// </para>
    ///
    /// <para>
    /// <strong>Performance and Optimization:</strong>
    /// Handlers should implement efficient condition checking to avoid unnecessary processing.
    /// The result may be cached per event instance to prevent repeated evaluation.
    /// Consider early return patterns for common filtering scenarios.
    /// </para>
    ///
    /// <para>
    /// <strong>Integration with CQRS Pipeline:</strong>
    /// This method is called before <see cref="ExecuteHandleAsync"/> and can prevent
    /// event processing entirely if conditions are not met, supporting conditional
    /// event routing and business rule enforcement.
    /// </para>
    /// </remarks>
    public Task<bool> HandleWhen(TEvent @event);

    /// <summary>
    /// Executes the complete event handling pipeline for the specified strongly-typed event,
    /// including conditional processing, distributed tracing, and error handling.
    /// </summary>
    /// <param name="event">
    /// The strongly-typed event to process. This event will be validated, traced, and processed
    /// through the complete CQRS event handling pipeline.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// Handlers should respect this token for responsive cancellation and resource cleanup.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event has been fully processed through all pipeline stages.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Complete Processing Pipeline:</strong>
    /// This method orchestrates the entire event handling process including:
    /// - Conditional processing via <see cref="HandleWhen(TEvent)"/>
    /// - Distributed tracing and observability integration
    /// - Scope management and dependency injection handling
    /// - Retry mechanisms and resilient execution patterns
    /// - Error handling and logging coordination
    /// </para>
    ///
    /// <para>
    /// <strong>Execution Context Management:</strong>
    /// The method handles various execution contexts including:
    /// - Background thread execution with new dependency injection scopes
    /// - Current thread execution with shared context
    /// - Unit of work coordination and transaction management
    /// - Request context propagation across scopes
    /// </para>
    ///
    /// <para>
    /// <strong>Integration Points:</strong>
    /// This method serves as the primary entry point for MediatR integration
    /// and coordinates with inbox pattern processing, message bus integration,
    /// and application-layer event handling infrastructure.
    /// </para>
    /// </remarks>
    /// <exception cref="OperationCanceledException">Thrown when the operation is cancelled via the cancellation token.</exception>
    Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken);
}

/// <summary>
/// Abstract base class providing complete implementation for Platform CQRS event handlers.
/// Delivers full event processing pipeline with distributed tracing, scope management, and resilient execution.
/// </summary>
/// <typeparam name="TEvent">The specific event type this handler processes, must implement IPlatformCqrsEvent</typeparam>
/// <remarks>
/// <para>
/// <strong>Complete Event Processing Pipeline:</strong>
/// This abstract class provides a comprehensive implementation of the Platform CQRS event handling
/// pipeline, including all infrastructure concerns:
/// - Conditional processing with HandleWhen evaluation
/// - Distributed tracing and observability integration
/// - Dependency injection scope management
/// - Retry mechanisms with exponential backoff
/// - Error handling and logging coordination
/// - Request context propagation across boundaries
/// </para>
///
/// <para>
/// <strong>Execution Patterns:</strong>
/// Supports multiple execution patterns based on configuration:
/// - Background execution with new dependency injection scopes (default)
/// - Current thread execution with shared context
/// - Synchronous execution for critical handlers
/// - Asynchronous execution for performance optimization
/// </para>
///
/// <para>
/// <strong>Infrastructure Integration:</strong>
/// Integrates with key platform infrastructure components:
/// - MediatR for event distribution and handler discovery
/// - Dependency injection for service resolution and scoping
/// - Logging framework for structured event processing logs
/// - Activity source for distributed tracing and telemetry
/// - Configuration system for runtime behavior adjustment
/// </para>
///
/// <para>
/// <strong>Inheritance Pattern:</strong>
/// Concrete handlers inherit from this class and implement:
/// - HandleAsync: Core business logic for event processing
/// - HandleWhen: Optional conditional processing logic
/// - Custom configuration through constructor or properties
/// </para>
///
/// <para>
/// <strong>Thread Safety and Scope Management:</strong>
/// The handler automatically manages thread safety and dependency injection scopes,
/// ensuring proper resource isolation and cleanup in both foreground and background
/// execution scenarios.
/// </para>
/// </remarks>
public abstract class PlatformCqrsEventHandler<TEvent> : IPlatformCqrsEventHandler<TEvent>
    where TEvent : IPlatformCqrsEvent
{
    /// <summary>
    /// Factory for creating loggers with appropriate categorization for this handler type.
    /// Used throughout the handler lifecycle for consistent logging and troubleshooting.
    /// </summary>
    protected readonly ILoggerFactory LoggerFactory;

    /// <summary>
    /// Root service provider for the Platform application, providing access to singleton services
    /// and enabling creation of new dependency injection scopes for background processing.
    /// </summary>
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    /// <summary>
    /// Current dependency injection scope service provider, providing access to scoped services
    /// within the current execution context and request lifecycle.
    /// </summary>
    protected readonly IServiceProvider ServiceProvider;

    /// <summary>
    /// Cached result of the conditional processing check to avoid repeated evaluation
    /// for the same event instance during the handler execution lifecycle.
    /// </summary>
    private bool? cachedCheckHandleWhen;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsEventHandler{TEvent}"/> class
    /// with the required infrastructure dependencies for event processing.
    /// </summary>
    /// <param name="loggerFactory">
    /// Factory for creating categorized loggers for this handler type.
    /// Used for consistent logging throughout the event handling pipeline.
    /// </param>
    /// <param name="rootServiceProvider">
    /// Root service provider for accessing platform-wide services and creating new scopes.
    /// Essential for background execution and scope isolation patterns.
    /// </param>
    /// <param name="serviceProvider">
    /// Current scope service provider for accessing scoped dependencies.
    /// Provides access to services within the current request/execution context.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Dependency Injection Strategy:</strong>
    /// The handler requires both root and scoped service providers to support
    /// different execution patterns. The root provider enables background execution
    /// with new scopes, while the scoped provider provides current context access.
    /// </para>
    ///
    /// <para>
    /// <strong>Configuration Integration:</strong>
    /// During initialization, the handler automatically configures distributed tracing
    /// based on the platform configuration, enabling observability without additional setup.
    /// </para>
    /// </remarks>
    protected PlatformCqrsEventHandler(ILoggerFactory loggerFactory, IPlatformRootServiceProvider rootServiceProvider, IServiceProvider serviceProvider)
    {
        LoggerFactory = loggerFactory;
        RootServiceProvider = rootServiceProvider;
        ServiceProvider = serviceProvider;
        IsDistributedTracingEnabled = rootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
    }

    /// <summary>
    /// Gets or sets a value indicating whether distributed tracing is enabled for this handler instance.
    /// When enabled, event processing will be wrapped in distributed tracing activities for observability.
    /// </summary>
    /// <value>
    /// <c>true</c> if distributed tracing is enabled; otherwise, <c>false</c>.
    /// This value is automatically determined during handler initialization based on platform configuration.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Observability Integration:</strong>
    /// When distributed tracing is enabled, the handler creates activity spans
    /// that include handler type, event type, and event content for comprehensive
    /// observability across distributed event processing pipelines.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// Tracing adds minimal overhead but can be disabled in performance-critical
    /// scenarios. The setting is cached during initialization to avoid repeated
    /// configuration lookups during event processing.
    /// </para>
    /// </remarks>
    protected bool IsDistributedTracingEnabled { get; set; }

    /// <summary>
    /// Gets or sets the base delay in seconds between retry attempts for failed event handling operations.
    /// This value is used as the starting point for exponential backoff calculations.
    /// </summary>
    /// <value>
    /// The delay in seconds before the first retry attempt. Default value is configured
    /// in <see cref="Util.TaskRunner.DefaultResilientDelaySeconds"/>. Must be a positive number.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Retry Strategy Integration:</strong>
    /// This value works in conjunction with <see cref="MaxRetryOnFailedDelaySeconds"/>
    /// to implement exponential backoff. Each retry attempt increases the delay
    /// until the maximum delay is reached, preventing system overload during failures.
    /// </para>
    ///
    /// <para>
    /// <strong>Configuration Guidelines:</strong>
    /// - Use shorter delays (1-5 seconds) for real-time user-facing operations
    /// - Use longer delays (10+ seconds) for background processing and batch operations
    /// - Consider the nature of likely failures when setting retry delays
    /// </para>
    /// </remarks>
    public virtual double RetryOnFailedDelaySeconds { get; set; } = Util.TaskRunner.DefaultResilientDelaySeconds;

    /// <summary>
    /// Gets or sets the maximum delay in seconds between retry attempts for failed event handling operations.
    /// This value caps the exponential backoff to prevent excessively long delays.
    /// </summary>
    /// <value>
    /// The maximum delay in seconds between retry attempts. Default is 60 seconds.
    /// Must be greater than or equal to <see cref="RetryOnFailedDelaySeconds"/>.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Exponential Backoff Capping:</strong>
    /// This value prevents the exponential backoff algorithm from creating
    /// unreasonably long delays that could impact system responsiveness.
    /// The actual delay is calculated as: Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).
    /// </para>
    ///
    /// <para>
    /// <strong>System Stability:</strong>
    /// Capping retry delays helps maintain system predictability and prevents
    /// resource exhaustion during extended failure scenarios. Consider the
    /// acceptable time window for event processing when setting this value.
    /// </para>
    /// </remarks>
    public virtual double MaxRetryOnFailedDelaySeconds { get; set; } = 60;

    /// <summary>
    /// The MustWaitHandlerExecutionFinishedImmediately method is part of the IPlatformCqrsEvent interface and its implementation is in the PlatformCqrsEvent class. This method is used to determine whether the execution of a specific event handler should be waited for to finish immediately or not.
    /// <br />
    /// In the context of the Command Query Responsibility Segregation (CQRS) pattern, this method provides a way to control the execution flow of event handlers. By default, event handlers are executed in the background and the command returns immediately without waiting for the handlers to finish. However, there might be cases where it's necessary to wait for a handler to finish its execution before proceeding, and this is where MustWaitHandlerExecutionFinishedImmediately comes into play.
    /// <br />
    /// The method takes a Type parameter, which represents the event handler type, and returns a boolean. If the method returns true, it means that the execution of the event handler of the provided type should be waited for to finish immediately.
    /// <br />
    /// In the DoHandle method of the PlatformCqrsEventHandler class, this method is used to decide whether to queue the event handler execution in the background or execute it immediately. If MustWaitHandlerExecutionFinishedImmediately returns true for the event handler type, the handler is executed immediately using the same current active uow if existing active uow; otherwise, it's queued to run in the background.
    /// </summary>
    protected virtual bool MustWaitHandlerExecutionFinishedImmediately => false;

    /// <summary>
    /// Gets or sets a value indicating whether event instances should be cloned for each handler
    /// when multiple handlers are registered for the same event type. When disabled, the same
    /// event instance is shared across all handlers, improving performance but reducing isolation.
    /// </summary>
    /// <value>
    /// <c>true</c> to disable event cloning and share instances; <c>false</c> to clone events for each handler.
    /// Default is <c>false</c>, enabling cloning for safety. Automatically set to <c>true</c> when only one handler is registered.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Performance vs. Safety Trade-off:</strong>
    /// Cloning events provides isolation between handlers but has performance overhead.
    /// When only one handler is registered for an event type, cloning is automatically
    /// disabled. For multiple handlers, consider the risk of shared state mutation.
    /// </para>
    ///
    /// <para>
    /// <strong>Automatic Optimization:</strong>
    /// The system automatically sets this to <c>true</c> when it detects only one
    /// handler is registered for the event type, providing optimal performance
    /// without sacrificing safety in single-handler scenarios.
    /// </para>
    /// </remarks>
    public bool NoNeedCloneNewEventInstanceForTheHandler { get; set; }

    /// <summary>
    /// Gets or sets a delegate function that executes before handling an event in a new scope when running in background.
    /// This enables custom setup logic, context propagation, and initialization in the new dependency injection scope.
    /// </summary>
    /// <value>
    /// A function that takes the new scope service provider, event instance, and handler instance,
    /// and returns a Task for async initialization. Returns <c>null</c> by default, indicating no custom setup.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Scope Initialization Pattern:</strong>
    /// This function is called when creating a new dependency injection scope for background event processing.
    /// It provides an extension point for custom initialization logic such as:
    /// - Request context setup and propagation
    /// - Authentication and authorization context transfer
    /// - Custom service configuration in the new scope
    /// - Event-specific preparation and validation
    /// </para>
    ///
    /// <para>
    /// <strong>Function Signature:</strong>
    /// The function receives three parameters:
    /// - <c>IServiceProvider newScopeServiceProvider</c>: Services available in the new scope
    /// - <c>TEvent @event</c>: The event being processed
    /// - <c>PlatformCqrsEventHandler&lt;TEvent&gt; handlerNewInstance</c>: The handler instance in the new scope
    /// </para>
    ///
    /// <para>
    /// <strong>Execution Context:</strong>
    /// This function executes in the background thread within the new scope,
    /// before the actual event handling logic runs. Any exceptions thrown
    /// will be logged but won't affect the main execution flow.
    /// </para>
    /// </remarks>
    protected virtual Func<IServiceProvider, TEvent, PlatformCqrsEventHandler<TEvent>, Task>? ExecuteHandleInBackgroundNewScopeBeforeExecuteFn => null;

    public virtual int RetryOnFailedTimes { get; set; } = Util.TaskRunner.DefaultResilientRetryCount;

    public bool ForceCurrentInstanceHandleInCurrentThreadAndScope { get; set; }

    public bool IsHandlingInNewScope { get; set; }

    public virtual bool ThrowExceptionOnHandleFailed { get; set; }

    public abstract Task Handle(object @event, CancellationToken cancellationToken);

    /// <summary>
    /// Handles the event by delegating to the strongly-typed <see cref="DoHandle(TEvent, CancellationToken)"/> method.
    /// This implements the MediatR <see cref="INotificationHandler{TNotification}"/> interface for integration
    /// with the MediatR pipeline while providing type safety through delegation.
    /// </summary>
    /// <param name="notification">
    /// The strongly-typed event notification to handle. Must be of type <typeparamref name="TEvent"/>
    /// to ensure type safety throughout the handling pipeline.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// This token is propagated through the entire handling pipeline for responsive cancellation.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event has been processed through all pipeline stages.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>MediatR Integration Point:</strong>
    /// This method serves as the primary integration point with the MediatR notification
    /// pipeline. It provides the bridge between the generic MediatR infrastructure
    /// and the strongly-typed Platform CQRS event handling system.
    /// </para>
    ///
    /// <para>
    /// <strong>Pipeline Delegation:</strong>
    /// The method delegates to <see cref="DoHandle(TEvent, CancellationToken)"/>
    /// which orchestrates the complete event handling pipeline including:
    /// - Background vs. immediate execution decisions
    /// - Retry mechanisms and error handling
    /// - Scope management and context propagation
    /// - Distributed tracing and observability
    /// </para>
    /// </remarks>
    public virtual Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        return DoHandle(notification, cancellationToken);
    }

    /// <summary>
    /// Executes the complete event handling pipeline including conditional processing, distributed tracing,
    /// and the actual event handling logic. This method coordinates all aspects of event processing
    /// from validation through completion.
    /// </summary>
    /// <param name="event">
    /// The strongly-typed event to process through the complete handling pipeline.
    /// This event will be validated, conditionally processed, and handled with full observability.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// The token is respected throughout the pipeline for responsive cancellation.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event has been fully processed or skipped based on conditions.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Complete Processing Pipeline:</strong>
    /// This method orchestrates the entire event handling process:
    /// 1. Conditional processing check via <see cref="CheckHandleWhen(TEvent)"/>
    /// 2. Distributed tracing setup and activity creation
    /// 3. Actual event handling through <see cref="HandleAsync(TEvent, CancellationToken)"/>
    /// 4. Error handling and activity completion
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// If the conditional check returns false, the event is skipped entirely,
    /// avoiding unnecessary processing overhead. Distributed tracing is only
    /// enabled when configured, minimizing performance impact in production.
    /// </para>
    ///
    /// <para>
    /// <strong>Observability Integration:</strong>
    /// When distributed tracing is enabled, this method creates comprehensive
    /// activity spans that include handler type, event type, and event content
    /// for full observability across the event processing pipeline.
    /// </para>
    /// </remarks>
    public virtual async Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        if (!await CheckHandleWhen(@event))
            return;

        await ExecuteHandleWithTracingAsync(@event, () => HandleAsync(@event, cancellationToken));
    }

    public abstract Task<bool> HandleWhen(object @event);

    public abstract Task<bool> HandleWhen(TEvent @event);

    /// <summary>
    /// Orchestrates the complete event handling workflow including background execution decisions,
    /// retry mechanisms, error handling, and scope management. This is the core method that
    /// coordinates all aspects of event processing based on handler configuration and event properties.
    /// </summary>
    /// <param name="event">
    /// The strongly-typed event to process. This event will be cloned if necessary,
    /// enriched with stack trace information, and processed according to the handler's configuration.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// The token is propagated through all processing stages including background execution.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event has been processed or queued for background processing.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Processing Decision Logic:</strong>
    /// The method makes intelligent decisions about how to process the event:
    /// - Background execution in new scope for isolation and performance
    /// - Immediate execution in current scope for synchronous requirements
    /// - Considers handler configuration, event properties, and system state
    /// </para>
    ///
    /// <para>
    /// <strong>Background Execution Conditions:</strong>
    /// Events are processed in background when ALL conditions are met:
    /// - <see cref="AllowHandleInBackgroundThread(TEvent)"/> returns true
    /// - <see cref="NotNeedWaitHandlerExecutionFinishedImmediately(TEvent)"/> returns true
    /// - <see cref="ForceCurrentInstanceHandleInCurrentThreadAndScope"/> is false
    /// </para>
    ///
    /// <para>
    /// <strong>Resilient Execution:</strong>
    /// For immediate execution, the method implements resilient retry logic with:
    /// - Configurable retry count via <see cref="RetryOnFailedTimes"/>
    /// - Exponential backoff with maximum delay capping
    /// - Comprehensive error logging for troubleshooting
    /// - Graceful degradation when retries are exhausted
    /// </para>
    ///
    /// <para>
    /// <strong>Instance and Scope Management:</strong>
    /// The method handles event instance management including:
    /// - Event cloning for handler isolation when multiple handlers exist
    /// - Stack trace enrichment for distributed tracing
    /// - Property copying between handler instances for background execution
    /// - Service provider scope creation and lifecycle management
    /// </para>
    /// </remarks>
    /// <exception cref="Exception">
    /// Various exceptions may be thrown during event processing. The method includes
    /// comprehensive error handling that logs exceptions and optionally rethrows them
    /// based on the <see cref="ThrowExceptionOnHandleFailed"/> configuration.
    /// </exception>
    protected virtual async Task DoHandle(TEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            var thisHandlerInstanceEvent = DoHandle_BuildHandlerInstanceEvent(@event);

            DoHandle_AddEventStackTrace(thisHandlerInstanceEvent);

            // Use ServiceCollection.BuildServiceProvider() to create new Root ServiceProvider
            // so that it wont be disposed when run in background thread, this handler ServiceProvider will be disposed
            if (
                AllowHandleInBackgroundThread(thisHandlerInstanceEvent)
                && NotNeedWaitHandlerExecutionFinishedImmediately(thisHandlerInstanceEvent)
                && !ForceCurrentInstanceHandleInCurrentThreadAndScope
            )
                ExecuteHandleInBackgroundNewScopeAsync(thisHandlerInstanceEvent, cancellationToken);
            else
            {
                await BeforeExecuteHandleAsync(this, thisHandlerInstanceEvent);

                try
                {
                    // Retry RetryOnFailedTimes to help resilient PlatformCqrsEventHandler. Sometime parallel, create/update concurrency could lead to error
                    await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
                        () => ExecuteHandleAsync(thisHandlerInstanceEvent, CancellationToken.None),
                        retryCount: RetryOnFailedTimes,
                        sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
                        onRetry: (e, delayTime, retryAttempt, context) =>
                        {
                            if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                                LogError(thisHandlerInstanceEvent, e.BeautifyStackTrace(), LoggerFactory, "Retry");
                        },
                        cancellationToken: cancellationToken,
                        ignoreExceptionTypes: [typeof(IPlatformValidationException)]
                    );
                }
                catch (Exception e)
                {
                    if (ThrowExceptionOnHandleFailed)
                        throw;
                    LogError(thisHandlerInstanceEvent, e.BeautifyStackTrace(), LoggerFactory);
                }
            }
        }
        catch (Exception e)
        {
            if (ThrowExceptionOnHandleFailed)
                throw;
            LogError(@event, e.BeautifyStackTrace(), LoggerFactory);
        }
    }

    /// <summary>
    /// Enriches the event instance with stack trace information for distributed tracing and debugging purposes.
    /// This method conditionally adds stack trace data when distributed tracing is enabled and the event
    /// doesn't already contain stack trace information.
    /// </summary>
    /// <param name="thisHandlerInstanceEvent">
    /// The event instance to enrich with stack trace information.
    /// The event's StackTrace property will be set if conditions are met.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Conditional Stack Trace Capture:</strong>
    /// Stack trace information is only captured when:
    /// - Distributed tracing is enabled in platform configuration
    /// - Stack trace capture is specifically enabled in distributed tracing config
    /// - The event instance doesn't already have stack trace information
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// Stack trace capture has performance overhead, so it's only performed
    /// when explicitly enabled and needed. This balances observability needs
    /// with runtime performance requirements.
    /// </para>
    ///
    /// <para>
    /// <strong>Debugging and Observability:</strong>
    /// The captured stack trace provides valuable context for:
    /// - Understanding event flow across distributed systems
    /// - Debugging complex event processing scenarios
    /// - Correlating events with their originating operations
    /// - Performance analysis and bottleneck identification
    /// </para>
    /// </remarks>
    protected void DoHandle_AddEventStackTrace(TEvent thisHandlerInstanceEvent)
    {
        if (RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.IsStackTraceEnabled() == true && thisHandlerInstanceEvent.StackTrace == null)
            thisHandlerInstanceEvent.StackTrace = PlatformEnvironment.StackTrace();
    }

    /// <summary>
    /// Creates an appropriate event instance for handler processing, implementing intelligent cloning
    /// strategies to balance performance with handler isolation requirements.
    /// </summary>
    /// <param name="event">
    /// The original event instance to process. This may be returned directly or cloned
    /// depending on handler registration patterns and configuration.
    /// </param>
    /// <returns>
    /// An event instance suitable for processing by this handler. May be the original instance
    /// or a deep clone depending on isolation requirements and performance optimizations.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Intelligent Cloning Strategy:</strong>
    /// The method implements smart cloning logic:
    /// - Returns original instance if cloning is disabled or only one handler is registered
    /// - Creates deep clone if multiple handlers exist to ensure isolation
    /// - Automatically optimizes for single-handler scenarios to improve performance
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// When only one handler is registered for the event type, cloning is skipped
    /// automatically to improve performance since isolation is not needed.
    /// The <see cref="NoNeedCloneNewEventInstanceForTheHandler"/> flag is set
    /// after cloning to prevent repeated cloning operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Handler Isolation:</strong>
    /// For multiple handlers, each handler receives its own event instance
    /// to prevent unintended side effects from shared state mutations.
    /// This ensures predictable behavior when multiple handlers process the same event.
    /// </para>
    ///
    /// <para>
    /// <strong>Deep Cloning Implementation:</strong>
    /// Uses platform-standard deep cloning to ensure complete object graph isolation,
    /// including nested objects and collections within the event structure.
    /// </para>
    /// </remarks>
    protected TEvent DoHandle_BuildHandlerInstanceEvent(TEvent @event)
    {
        return NoNeedCloneNewEventInstanceForTheHandler ||
               RootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(typeof(IPlatformCqrsEventHandler<TEvent>)) == 1
            ? @event
            : @event
                .DeepClone()
                .PipeAction(_ =>
                {
                    NoNeedCloneNewEventInstanceForTheHandler = true;
                });
    }

    /// <summary>
    /// Determines whether the handler execution should NOT wait for completion immediately.
    /// This is a convenience method that inverts the result of <see cref="NeedWaitHandlerExecutionFinishedImmediately(TEvent)"/>
    /// for more intuitive conditional logic in execution flow decisions.
    /// </summary>
    /// <param name="event">
    /// The event being processed. Used to determine execution requirements
    /// based on event properties and handler configuration.
    /// </param>
    /// <returns>
    /// <c>true</c> if the handler can execute asynchronously without waiting;
    /// <c>false</c> if immediate completion is required.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Execution Flow Control:</strong>
    /// This method helps determine whether event processing can be deferred
    /// to background execution or must complete immediately. It's used throughout
    /// the processing pipeline to make execution strategy decisions.
    /// </para>
    ///
    /// <para>
    /// <strong>Background Processing Enablement:</strong>
    /// When this method returns <c>true</c>, the event may be eligible for
    /// background processing, subject to other conditions like thread allowance
    /// and scope management requirements.
    /// </para>
    /// </remarks>
    protected bool NotNeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return !NeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    /// <summary>
    /// Determines whether the handler execution must wait for completion immediately based on
    /// event requirements, handler configuration, and business logic constraints.
    /// </summary>
    /// <param name="event">
    /// The event being processed. The event may specify immediate execution requirements
    /// for specific handler types through its configuration.
    /// </param>
    /// <returns>
    /// <c>true</c> if the handler must complete execution immediately before continuing;
    /// <c>false</c> if execution can be deferred to background processing.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Execution Priority Logic:</strong>
    /// Immediate execution is required when either:
    /// - The event explicitly requires immediate execution for this handler type
    /// - The handler itself is configured to always execute immediately
    /// </para>
    ///
    /// <para>
    /// <strong>Event-Level Control:</strong>
    /// Events can specify per-handler-type execution requirements through
    /// <see cref="IPlatformCqrsEvent.MustWaitHandlerExecutionFinishedImmediately(Type)"/>.
    /// This enables fine-grained control over execution semantics based on business requirements.
    /// </para>
    ///
    /// <para>
    /// <strong>Handler-Level Control:</strong>
    /// The <see cref="MustWaitHandlerExecutionFinishedImmediately"/> property allows
    /// handlers to specify their own execution requirements, overriding default
    /// background execution behavior when business logic demands immediate processing.
    /// </para>
    ///
    /// <para>
    /// <strong>Use Cases for Immediate Execution:</strong>
    /// - Data consistency requirements across transaction boundaries
    /// - User-facing operations requiring immediate feedback
    /// - Critical business processes that cannot be deferred
    /// - Integration scenarios requiring synchronous completion
    /// </para>
    /// </remarks>
    protected virtual bool NeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return @event.MustWaitHandlerExecutionFinishedImmediately(GetType()) || MustWaitHandlerExecutionFinishedImmediately;
    }

    /// <summary>
    /// Default is True. If true, the event handler will run in separate thread scope with new instance
    /// and if exception, it won't affect the main flow
    /// </summary>
    protected virtual bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return true;
    }

    /// <summary>
    /// Executes event handling in a new background thread with an isolated dependency injection scope.
    /// This method provides complete isolation from the original request context while maintaining
    /// handler state and configuration through property copying and scope management.
    /// </summary>
    /// <param name="event">
    /// The event to process in the background. This event instance has already been prepared
    /// with appropriate cloning and stack trace information.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the background operation.
    /// The token is propagated to the background execution context.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Background Execution Architecture:</strong>
    /// This method implements the background execution pattern by:
    /// 1. Creating a new dependency injection scope using <see cref="RootServiceProvider"/>
    /// 2. Resolving a new handler instance within the isolated scope
    /// 3. Copying configuration and state from the current handler to the new instance
    /// 4. Executing optional pre-processing logic via <see cref="ExecuteHandleInBackgroundNewScopeBeforeExecuteFn"/>
    /// 5. Processing the event with the isolated handler instance
    /// </para>
    ///
    /// <para>
    /// <strong>Scope Isolation Benefits:</strong>
    /// Background execution in a new scope provides:
    /// - Complete isolation from the original request context
    /// - Independent database connections and transactions
    /// - Separate service lifetimes and state management
    /// - Protection against scope disposal during request completion
    /// - Parallel processing capabilities without resource conflicts
    /// </para>
    ///
    /// <para>
    /// <strong>State Management and Configuration:</strong>
    /// The method ensures continuity by:
    /// - Creating a new handler instance from the isolated service provider
    /// - Copying essential properties via <see cref="CopyPropertiesToNewInstanceBeforeExecution"/>
    /// - Setting execution context flags appropriately for the new scope
    /// - Maintaining handler configuration and behavior settings
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling and Resilience:</strong>
    /// Exceptions in background execution are handled gracefully:
    /// - Errors are logged but don't affect the main execution flow
    /// - The original request completes independently of background processing
    /// - Background failures are tracked for monitoring and debugging
    /// - Resource cleanup is automatically managed by scope disposal
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Characteristics:</strong>
    /// Background execution provides performance benefits through:
    /// - Non-blocking request processing for better user experience
    /// - Parallel event processing capabilities
    /// - Resource optimization through scope isolation
    /// - Reduced contention on shared resources
    /// </para>
    /// </remarks>
    protected void ExecuteHandleInBackgroundNewScopeAsync(TEvent @event, CancellationToken cancellationToken = default)
    {
        RootServiceProvider.ExecuteInjectScopedInBackgroundAsync(
            async (IServiceProvider sp) =>
            {
                try
                {
                    var thisHandlerNewInstance = sp.GetRequiredService(GetType())
                        .As<PlatformCqrsEventHandler<TEvent>>()
                        .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance));

                    if (ExecuteHandleInBackgroundNewScopeBeforeExecuteFn != null)
                        await ExecuteHandleInBackgroundNewScopeBeforeExecuteFn(sp, @event, thisHandlerNewInstance);

                    await thisHandlerNewInstance
                        .With(p => p.ForceCurrentInstanceHandleInCurrentThreadAndScope = true)
                        .With(p => p.IsHandlingInNewScope = true)
                        .Handle(@event, cancellationToken);
                }
                catch (Exception e)
                {
                    LogError(@event, e, LoggerFactory);
                }
            },
            loggerFactory: () => CreateLogger(LoggerFactory),
            queueLimitLock: true
        );
    }

    /// <summary>
    /// Executes custom logic before the main event handling begins. This virtual method provides
    /// an extension point for derived handlers to implement pre-processing, validation,
    /// or context setup specific to their event handling requirements.
    /// </summary>
    /// <param name="handlerNewInstance">
    /// The handler instance that will process the event. This may be the current instance
    /// or a new instance created for background processing.
    /// </param>
    /// <param name="event">
    /// The event that will be processed. This event has been prepared and is ready for handling.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous pre-processing operation.
    /// This task must complete before the main event handling begins.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Extension Point Purpose:</strong>
    /// This method serves as a hook for derived handlers to implement:
    /// - Custom validation logic before event processing
    /// - Context setup and initialization requirements
    /// - Resource preparation and dependency verification
    /// - Business rule enforcement and pre-conditions
    /// - Logging and audit trail initialization
    /// </para>
    ///
    /// <para>
    /// <strong>Execution Context:</strong>
    /// This method is called in the appropriate execution context:
    /// - Current scope for immediate execution
    /// - New isolated scope for background execution
    /// - After all infrastructure setup is complete
    /// - Before the actual event handling logic runs
    /// </para>
    ///
    /// <para>
    /// <strong>Default Implementation:</strong>
    /// The base implementation is empty and performs no operations,
    /// providing a no-op extension point that derived classes can override
    /// as needed without requiring base class modifications.
    /// </para>
    /// </remarks>
    protected virtual async Task BeforeExecuteHandleAsync(PlatformCqrsEventHandler<TEvent> handlerNewInstance, TEvent @event) { }

    /// <summary>
    /// Copies essential properties from the previous handler instance to a new instance before execution.
    /// This ensures that handler configuration, state, and behavior settings are preserved
    /// when creating new instances for background processing or scope isolation.
    /// </summary>
    /// <param name="previousInstance">
    /// The source handler instance containing the configuration and state to copy.
    /// This is typically the current handler instance initiating background processing.
    /// </param>
    /// <param name="newInstance">
    /// The target handler instance that will receive the copied configuration.
    /// This is typically a newly created instance in an isolated dependency injection scope.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Configuration Continuity:</strong>
    /// This method ensures consistent behavior across handler instances by copying:
    /// - Execution control flags and threading preferences
    /// - Retry configuration and error handling settings
    /// - Scope management and context preferences
    /// - Performance optimization flags and caching settings
    /// </para>
    ///
    /// <para>
    /// <strong>Properties Copied:</strong>
    /// The base implementation copies essential properties:
    /// - <see cref="ForceCurrentInstanceHandleInCurrentThreadAndScope"/>: Threading behavior
    /// - <see cref="IsHandlingInNewScope"/>: Scope context awareness
    /// - <see cref="RetryOnFailedTimes"/>: Retry behavior configuration
    /// - <see cref="ThrowExceptionOnHandleFailed"/>: Error handling strategy
    /// - <see cref="NoNeedCloneNewEventInstanceForTheHandler"/>: Performance optimization flags
    /// </para>
    ///
    /// <para>
    /// <strong>Extension Point:</strong>
    /// Derived classes can override this method to copy additional properties
    /// specific to their implementation, ensuring complete state preservation
    /// across instance boundaries in background processing scenarios.
    /// </para>
    /// </remarks>
    protected virtual void CopyPropertiesToNewInstanceBeforeExecution(PlatformCqrsEventHandler<TEvent> previousInstance, PlatformCqrsEventHandler<TEvent> newInstance)
    {
        newInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope = previousInstance.ForceCurrentInstanceHandleInCurrentThreadAndScope;
        newInstance.IsHandlingInNewScope = previousInstance.IsHandlingInNewScope;
        newInstance.RetryOnFailedTimes = previousInstance.RetryOnFailedTimes;
        newInstance.ThrowExceptionOnHandleFailed = previousInstance.ThrowExceptionOnHandleFailed;
        newInstance.NoNeedCloneNewEventInstanceForTheHandler = previousInstance.NoNeedCloneNewEventInstanceForTheHandler;
    }

    /// <summary>
    /// Executes event handling with optional distributed tracing integration, providing comprehensive
    /// observability for event processing while maintaining optimal performance when tracing is disabled.
    /// </summary>
    /// <param name="event">
    /// The event being processed. This event's type and content information will be included
    /// in tracing activities for comprehensive observability.
    /// </param>
    /// <param name="handleAsync">
    /// The actual event handling logic to execute. This delegate contains the core
    /// business logic for processing the event.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task completes when the event processing and any tracing activities are finished.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Distributed Tracing Integration:</strong>
    /// When distributed tracing is enabled, this method creates comprehensive activity spans that include:
    /// - Handler type information for identifying the processing component
    /// - Event type information for understanding the data being processed
    /// - Event content for debugging and analysis purposes
    /// - Activity naming for clear identification in tracing systems
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// When distributed tracing is disabled, the method executes the handling logic directly
    /// without any tracing overhead, ensuring optimal performance in production environments
    /// where observability is not required.
    /// </para>
    ///
    /// <para>
    /// <strong>Activity Lifecycle Management:</strong>
    /// Tracing activities are properly managed with using statements to ensure:
    /// - Automatic activity disposal and resource cleanup
    /// - Proper activity context propagation
    /// - Exception handling that doesn't interfere with tracing
    /// - Integration with external tracing and monitoring systems
    /// </para>
    ///
    /// <para>
    /// <strong>Observability Data:</strong>
    /// The activity includes rich metadata:
    /// - "Type" tag with the handler's full type name
    /// - "EventType" tag with the event's full type name
    /// - "Event" tag with formatted JSON representation of the event
    /// - Activity name indicating the operation being performed
    /// </para>
    /// </remarks>
    protected async Task ExecuteHandleWithTracingAsync(TEvent @event, Func<Task> handleAsync)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformCqrsEventHandler.ActivitySource.StartActivity($"EventHandler.{nameof(ExecuteHandleWithTracingAsync)}"))
            {
                activity?.AddTag("Type", GetType().FullName);
                activity?.AddTag("EventType", typeof(TEvent).FullName);
                activity?.AddTag("Event", @event.ToFormattedJson());

                await handleAsync();
            }
        }
        else
            await handleAsync();
    }

    /// <summary>
    /// Performs conditional processing check with caching to avoid repeated evaluation for the same event instance.
    /// This method optimizes performance by caching the result of the conditional check during the handler lifecycle.
    /// </summary>
    /// <param name="event">
    /// The event to evaluate for conditional processing. The result of this evaluation
    /// will be cached to avoid repeated computation for the same event instance.
    /// </param>
    /// <returns>
    /// A Task containing <c>true</c> if the event should be handled; otherwise, <c>false</c>.
    /// The result is cached after the first evaluation to improve performance.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// This method implements a caching strategy using the <see cref="cachedCheckHandleWhen"/> field
    /// to avoid repeated calls to <see cref="HandleWhen(TEvent)"/> for the same event instance.
    /// This is particularly beneficial for complex conditional logic that involves expensive operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Caching Strategy:</strong>
    /// The cache is instance-specific and event-specific:
    /// - First call evaluates the condition and caches the result
    /// - Subsequent calls return the cached value immediately
    /// - Cache is reset for each new handler instance
    /// - Cache lifetime is tied to the handler instance lifecycle
    /// </para>
    ///
    /// <para>
    /// <strong>Null Coalescing Assignment:</strong>
    /// Uses the null-coalescing assignment operator (??=) to implement lazy initialization:
    /// - If cached value exists, return it immediately
    /// - If cached value is null, evaluate condition and cache result
    /// - Thread-safe for single-threaded handler execution contexts
    /// </para>
    /// </remarks>
    protected async Task<bool> CheckHandleWhen(TEvent @event)
    {
        return cachedCheckHandleWhen ??= await HandleWhen(@event);
    }

    /// <summary>
    /// Logs detailed error information when event handling fails, providing comprehensive context
    /// for troubleshooting and monitoring event processing issues across the distributed system.
    /// </summary>
    /// <param name="notification">
    /// The event that was being processed when the error occurred.
    /// This provides context about what operation failed.
    /// </param>
    /// <param name="exception">
    /// The exception that occurred during event processing.
    /// The exception's details and stack trace will be logged for debugging.
    /// </param>
    /// <param name="loggerFactory">
    /// Factory for creating the appropriate logger instance.
    /// Used to create a categorized logger for this handler type.
    /// </param>
    /// <param name="prefix">
    /// Optional prefix to add to the log message for categorization.
    /// Commonly used values include "Retry" for retry attempts.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Comprehensive Error Context:</strong>
    /// The log message includes essential debugging information:
    /// - Exception message and beautified stack trace
    /// - Event type and handler type for component identification
    /// - Complete event content for reproducing the error condition
    /// - Optional prefix for categorizing different error scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Structured Logging Format:</strong>
    /// Uses structured logging with named parameters for better:
    /// - Log aggregation and searching capabilities
    /// - Integration with monitoring and alerting systems
    /// - Automated error analysis and pattern detection
    /// - Performance monitoring and trend analysis
    /// </para>
    ///
    /// <para>
    /// <strong>Error Categories:</strong>
    /// The prefix parameter allows categorization of errors:
    /// - "Retry" for errors that will be retried
    /// - Empty string for final failures
    /// - Custom prefixes for specific error handling scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Logger Categorization:</strong>
    /// Creates a categorized logger that includes the handler type name,
    /// enabling filtering and routing of logs based on the specific
    /// event handler that encountered the error.
    /// </para>
    /// </remarks>
    public virtual void LogError(TEvent notification, Exception exception, ILoggerFactory loggerFactory, string prefix = "")
    {
        CreateLogger(loggerFactory)
            .LogError(
                exception.BeautifyStackTrace(),
                "[PlatformCqrsEventHandler] {Prefix} Handle event failed. [[Message:{Message}]] [[EventType:{EventType}]]; [[HandlerType:{HandlerType}]]. [[EventContent:{@EventContent}]].",
                prefix,
                exception.Message,
                notification.GetType().Name,
                GetType().Name,
                notification
            );
    }

    /// <summary>
    /// Abstract method that derived classes must implement to provide the core event handling logic.
    /// This method contains the business logic specific to processing the strongly-typed event.
    /// </summary>
    /// <param name="event">
    /// The strongly-typed event to process. This event has passed all conditional checks
    /// and is ready for business logic processing.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the event handling operation.
    /// Implementations should respect this token for responsive cancellation.
    /// </param>
    /// <returns>
    /// A Task representing the asynchronous event handling operation.
    /// The task should complete when all business logic processing is finished.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Implementation Requirements:</strong>
    /// Derived classes must implement this method to provide:
    /// - Core business logic for processing the specific event type
    /// - Appropriate error handling for business-specific scenarios
    /// - Integration with domain services, repositories, and external systems
    /// - Proper resource management and cleanup
    /// </para>
    ///
    /// <para>
    /// <strong>Execution Context:</strong>
    /// This method executes within the complete Platform CQRS infrastructure:
    /// - Retry mechanisms are handled by the base class
    /// - Distributed tracing is managed automatically
    /// - Scope and context management is handled by the framework
    /// - Error logging and monitoring are provided by the base infrastructure
    /// </para>
    ///
    /// <para>
    /// <strong>Cancellation Support:</strong>
    /// Implementations should check the cancellation token periodically,
    /// especially during long-running operations, to ensure responsive
    /// cancellation and proper resource cleanup.
    /// </para>
    /// </remarks>
    protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);

    /// <summary>
    /// Creates a categorized logger instance for this handler type, enabling targeted logging
    /// and filtering based on the specific event handler implementation.
    /// </summary>
    /// <param name="loggerFactory">
    /// The logger factory to use for creating the logger instance.
    /// This factory provides the logging infrastructure and configuration.
    /// </param>
    /// <returns>
    /// A logger instance categorized with the handler type name for targeted logging.
    /// The category includes both the generic base type and the specific handler implementation.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Logger Categorization Strategy:</strong>
    /// The logger category includes:
    /// - Base generic type name for general event handler filtering
    /// - Specific handler type name for precise log targeting
    /// - Proper handling of generic type names for readability
    /// </para>
    ///
    /// <para>
    /// <strong>Log Filtering Benefits:</strong>
    /// Categorized loggers enable:
    /// - Filtering logs by specific handler types
    /// - Routing different handler logs to different outputs
    /// - Adjusting log levels per handler type
    /// - Creating targeted monitoring and alerting rules
    /// </para>
    ///
    /// <para>
    /// <strong>Example Category Format:</strong>
    /// For a handler named "OrderEventHandler" processing "OrderCreated" events,
    /// the category would be: "PlatformCqrsEventHandler-OrderEventHandler"
    /// </para>
    /// </remarks>
    public ILogger CreateLogger(ILoggerFactory loggerFactory)
    {
        return loggerFactory.CreateLogger(typeof(PlatformCqrsEventHandler<>).GetNameOrGenericTypeName() + $"-{GetType().Name}");
    }
}
