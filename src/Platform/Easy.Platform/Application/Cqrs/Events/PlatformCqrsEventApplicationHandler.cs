#region

using System.Diagnostics;
using Easy.Platform.Application.Cqrs.Events.InboxSupport;
using Easy.Platform.Application.MessageBus.InboxPattern;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Common.Validations.Exceptions;
using Easy.Platform.Common.Validations.Extensions;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Defines the contract for a Platform CQRS Event Application Handler.
/// </summary>
/// <remarks>
/// This interface extends the IPlatformCqrsEventHandler and provides additional properties and methods
/// for handling CQRS events in the application context.
/// </remarks>
public interface IPlatformCqrsEventApplicationHandler : IPlatformCqrsEventHandler
{
    /// <summary>
    /// Gets a value indicating whether to enable Inbox Event Bus Message.
    /// </summary>
    public bool EnableInboxEventBusMessage { get; }

    /// <summary>
    /// Gets or sets a value indicating whether the current handler is being executed from an inbox message consumer.
    /// This is useful for handlers to apply different logic when they are re-triggered from the inbox persistence layer.
    /// </summary>
    public bool IsCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Determines whether the event can be handled using Inbox Consumer.
    /// </summary>
    /// <param name="event">The event to check.</param>
    public bool CanExecuteHandlingEventUsingInboxConsumer(object @event);
}

/// <summary>
/// Extends the <see cref="IPlatformCqrsEventApplicationHandler"/> for a specific event type.
/// </summary>
/// <typeparam name="TEvent">The type of the event.</typeparam>
public interface IPlatformCqrsEventApplicationHandler<in TEvent> : IPlatformCqrsEventApplicationHandler, IPlatformCqrsEventHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    /// <summary>
    /// Determines whether the handler can process the given event using the inbox pattern.
    /// </summary>
    /// <param name="event">The event to check.</param>
    /// <returns><c>true</c> if the event can be processed via the inbox; otherwise, <c>false</c>.</returns>
    public bool CanExecuteHandlingEventUsingInboxConsumer(TEvent @event);
}

/// <summary>
/// Abstract base class for handling CQRS events within the application layer.
/// It provides built-in support for logging, unit of work management, inbox pattern for reliable event processing,
/// and resilient execution with retries.
/// </summary>
/// <typeparam name="TEvent">The type of the CQRS event this handler is responsible for.</typeparam>
public abstract class PlatformCqrsEventApplicationHandler<TEvent> : PlatformCqrsEventHandler<TEvent>, IPlatformCqrsEventApplicationHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    /// <summary>
    /// Accessor for the current application request context.
    /// </summary>
    protected readonly IPlatformApplicationRequestContextAccessor RequestContextAccessor;

    /// <summary>
    /// Manager for handling Units of Work.
    /// </summary>
    protected readonly IPlatformUnitOfWorkManager UnitOfWorkManager;

    private double retryOnFailedDelaySeconds = Util.TaskRunner.DefaultResilientDelaySeconds;
    private int? retryOnFailedTimes;
    private bool? throwExceptionOnHandleFailed;

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsEventApplicationHandler{TEvent}"/> class
    /// with comprehensive application-layer dependencies for advanced event processing capabilities.
    /// </summary>
    /// <param name="loggerFactory">
    /// Factory for creating categorized loggers for this handler type.
    /// Enables consistent logging throughout the application-layer event handling pipeline.
    /// </param>
    /// <param name="unitOfWorkManager">
    /// Manager for coordinating database transactions and unit of work patterns.
    /// Essential for maintaining data consistency across event processing operations.
    /// </param>
    /// <param name="serviceProvider">
    /// Current dependency injection scope service provider for accessing scoped services.
    /// Provides access to application-layer services within the current request context.
    /// </param>
    /// <param name="rootServiceProvider">
    /// Root service provider for accessing platform-wide services and creating isolated scopes.
    /// Critical for background execution patterns and scope management strategies.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Application Layer Integration:</strong>
    /// This constructor establishes comprehensive integration with the application layer by:
    /// - Initializing base Platform CQRS event handling infrastructure
    /// - Setting up unit of work management for transaction coordination
    /// - Configuring request context access for user and session information
    /// - Establishing application settings context for configuration access
    /// - Creating lazy-initialized logger for optimal performance
    /// </para>
    ///
    /// <para>
    /// <strong>Dependency Resolution Strategy:</strong>
    /// The constructor uses service location pattern to resolve additional dependencies:
    /// - <see cref="RequestContextAccessor"/> for current request context access
    /// - <see cref="ApplicationSettingContext"/> for application configuration
    /// - Lazy logger initialization to defer creation until first use
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// Lazy initialization patterns are used where appropriate to minimize
    /// construction overhead and improve application startup performance,
    /// while ensuring all required dependencies are available when needed.
    /// </para>
    /// </remarks>
    public PlatformCqrsEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, rootServiceProvider, serviceProvider)
    {
        UnitOfWorkManager = unitOfWorkManager;
        RequestContextAccessor = ServiceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>();
        ApplicationSettingContext = ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>();
        Logger = new Lazy<ILogger>(() => CreateLogger(LoggerFactory));
    }

    /// <summary>
    /// Gets or sets the delay in seconds before retrying a failed event handling attempt.
    /// The delay is automatically increased for handlers that do not support the inbox pattern
    /// to prevent resource exhaustion and provide more conservative retry behavior.
    /// </summary>
    /// <value>
    /// The delay in seconds before retry attempts. For handlers without inbox support,
    /// the delay is multiplied by 10 to provide more conservative retry behavior.
    /// Base delay is configurable and defaults to <see cref="Util.TaskRunner.DefaultResilientDelaySeconds"/>.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Adaptive Retry Strategy:</strong>
    /// The retry delay automatically adapts based on handler capabilities:
    /// - Standard delay for handlers with inbox pattern support
    /// - Extended delay (10x base) for handlers without inbox support
    /// - Immediate execution handlers use standard delay regardless of inbox support
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Pattern Integration:</strong>
    /// Handlers with inbox support can use shorter delays because:
    /// - Failed messages are persisted and can be retried systematically
    /// - Resource contention is reduced through queuing mechanisms
    /// - Background processing provides natural load balancing
    /// </para>
    ///
    /// <para>
    /// <strong>Resource Protection:</strong>
    /// Extended delays for non-inbox handlers help prevent:
    /// - System overload during widespread failures
    /// - Resource exhaustion from aggressive retry patterns
    /// - Cascading failures across dependent services
    /// </para>
    /// </remarks>
    public override double RetryOnFailedDelaySeconds
    {
        get => !HasInboxMessageSupport() && !MustWaitHandlerExecutionFinishedImmediately ? retryOnFailedDelaySeconds * 10 : retryOnFailedDelaySeconds;
        set => retryOnFailedDelaySeconds = value;
    }

    /// <summary>
    /// Gets a function to be executed before handling an event in a new scope when running in the background.
    /// This function is responsible for transferring the request context from the original event to the new handler instance,
    /// ensuring continuity of user session information and request tracking across asynchronous processing boundaries.
    /// </summary>
    /// <value>
    /// A delegate that accepts a service provider, event instance, and handler instance, and returns a task.
    /// The function attempts to transfer request context values from the event to the new handler instance
    /// if the handler is an application-layer handler, with comprehensive error handling and logging.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Request Context Transfer Strategy:</strong>
    /// When events are processed in background threads or new scopes, the original request context
    /// (containing user identity, session information, and tracking data) must be explicitly transferred
    /// to maintain consistency across the distributed processing pipeline.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling:</strong>
    /// Context transfer failures are logged as warnings but do not interrupt event processing,
    /// ensuring system resilience when request context data is corrupted or unavailable.
    /// The error logging includes full event details for debugging and monitoring purposes.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// Context transfer is performed only for application-layer handlers that support request context,
    /// avoiding unnecessary overhead for domain-layer or infrastructure handlers that do not require
    /// user session information during background processing.
    /// </para>
    /// </remarks>
    protected override Func<IServiceProvider, TEvent, PlatformCqrsEventHandler<TEvent>, Task> ExecuteHandleInBackgroundNewScopeBeforeExecuteFn =>
        async (newScopeServiceProvider, @event, handlerNewInstance) =>
        {
            try
            {
                if (handlerNewInstance is PlatformCqrsEventApplicationHandler<TEvent> applicationHandlerNewInstance)
                    applicationHandlerNewInstance.RequestContext.SetValues(@event.RequestContext);
            }
            catch (Exception e)
            {
                Logger.Value.LogError(
                    e,
                    "[WARNING-AS_ERROR] ExecuteHandleInBackgroundNewScopeBeforeExecuteFn failed. EventHandler:{EventHandler} Event:{Event}",
                    GetType().GetFullNameOrGenericTypeFullName(),
                    @event.ToJson()
                );
            }
        };

    /// <summary>
    /// Gets a value indicating whether a new Unit of Work should be automatically opened for handling the event.
    /// This setting controls whether event processing is wrapped in a database transaction to ensure
    /// data consistency and enable rollback capabilities in case of processing failures.
    /// </summary>
    /// <value>
    /// <c>true</c> to automatically create and manage a Unit of Work for event processing;
    /// <c>false</c> to process events without automatic transaction management.
    /// Default implementation returns <c>true</c> for comprehensive data consistency guarantees.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Transaction Management Strategy:</strong>
    /// When enabled, each event handler execution is wrapped in a dedicated Unit of Work,
    /// providing ACID guarantees and enabling automatic rollback on processing failures.
    /// This ensures that side effects from failed event processing do not persist in the database.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Considerations:</strong>
    /// Automatic UoW creation adds transaction overhead but provides critical consistency guarantees.
    /// For read-only operations or scenarios where manual transaction control is preferred,
    /// this can be overridden to return <c>false</c> in derived handlers.
    /// </para>
    ///
    /// <para>
    /// <strong>Scope Management:</strong>
    /// When combined with background execution, new service scopes are created to prevent
    /// Unit of Work conflicts between concurrent event handlers processing different events
    /// within the same application request context.
    /// </para>
    /// </remarks>
    protected virtual bool AutoOpenUow => true;

    /// <summary>
    /// Gets the lazily-initialized logger instance for this handler, providing efficient logging capabilities
    /// with deferred creation to optimize application startup performance and memory usage.
    /// </summary>
    /// <value>
    /// A <see cref="Lazy{ILogger}"/> that creates the logger instance on first access using the configured
    /// <see cref="ILoggerFactory"/> and appropriate category naming conventions for this handler type.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Lazy Initialization Strategy:</strong>
    /// The logger is created only when first accessed, reducing memory footprint and improving
    /// application startup times, especially in scenarios with many registered event handlers
    /// that may not be frequently used.
    /// </para>
    ///
    /// <para>
    /// <strong>Category Naming:</strong>
    /// The logger category is automatically derived from the handler's type information,
    /// enabling filtering and routing of log messages based on specific handler types
    /// for improved debugging and monitoring capabilities.
    /// </para>
    ///
    /// <para>
    /// <strong>Thread Safety:</strong>
    /// The <see cref="Lazy{T}"/> wrapper ensures thread-safe initialization even in
    /// concurrent event processing scenarios, guaranteeing that only one logger instance
    /// is created per handler instance regardless of access patterns.
    /// </para>
    /// </remarks>
    protected Lazy<ILogger> Logger { get; }

    /// <summary>
    /// Gets the current application request context, providing access to user session information,
    /// authentication details, request tracking data, and other contextual information associated
    /// with the current application request being processed.
    /// </summary>
    /// <value>
    /// The current <see cref="IPlatformApplicationRequestContext"/> instance containing user identity,
    /// session state, request correlation identifiers, and other request-scoped data that flows
    /// through the application processing pipeline.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Context Availability:</strong>
    /// The request context is automatically available during synchronous event processing
    /// and is explicitly transferred during background or asynchronous processing through
    /// the <see cref="ExecuteHandleInBackgroundNewScopeBeforeExecuteFn"/> mechanism.
    /// </para>
    ///
    /// <para>
    /// <strong>User Identity and Authorization:</strong>
    /// Provides access to current user information including user ID, username, roles,
    /// and permissions, enabling event handlers to implement user-specific logic and
    /// authorization checks during event processing.
    /// </para>
    ///
    /// <para>
    /// <strong>Request Correlation:</strong>
    /// Contains request correlation identifiers that enable tracking and monitoring
    /// of event processing across distributed systems and microservices boundaries,
    /// supporting comprehensive observability and debugging capabilities.
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Pattern Considerations:</strong>
    /// When using inbox pattern processing, the request context is preserved from the original
    /// event trigger and restored during background message consumption to maintain consistency
    /// in user-scoped operations and audit trails.
    /// </para>
    /// </remarks>
    protected IPlatformApplicationRequestContext RequestContext => RequestContextAccessor.Current;

    /// <summary>
    /// Gets the application setting context, providing access to runtime configuration,
    /// feature flags, performance tuning parameters, and environment-specific settings
    /// that control application behavior and event processing strategies.
    /// </summary>
    /// <value>
    /// The <see cref="IPlatformApplicationSettingContext"/> instance containing configuration values,
    /// feature toggles, performance thresholds, and other settings that influence how events
    /// are processed, retried, and handled throughout the application lifecycle.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Configuration Access:</strong>
    /// Provides centralized access to application configuration including database connection settings,
    /// retry policies, timeout values, and other operational parameters that can be adjusted
    /// without code changes to optimize system behavior in different environments.
    /// </para>
    ///
    /// <para>
    /// <strong>Feature Flag Integration:</strong>
    /// Enables dynamic feature enablement and A/B testing scenarios by providing access to
    /// feature flags that can control event processing behavior, inbox pattern usage,
    /// background execution strategies, and other handler capabilities.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Tuning:</strong>
    /// Contains performance-related settings such as retry counts, delay intervals,
    /// circular pipeline prevention limits, and debug information modes that allow
    /// fine-tuning of event processing performance and reliability characteristics.
    /// </para>
    ///
    /// <para>
    /// <strong>Environment Awareness:</strong>
    /// Provides environment-specific configuration that enables handlers to behave
    /// differently in development, staging, and production environments, supporting
    /// comprehensive testing and deployment strategies.
    /// </para>
    /// </remarks>
    protected IPlatformApplicationSettingContext ApplicationSettingContext { get; }

    /// <summary>
    /// Gets a value indicating whether processed inbox event messages should be automatically deleted
    /// after successful processing, enabling cleanup of persistent message storage to prevent
    /// storage growth and improve query performance over time.
    /// </summary>
    /// <value>
    /// <c>true</c> to automatically delete processed inbox messages upon successful completion;
    /// <c>false</c> to retain processed messages for auditing, debugging, or replay scenarios.
    /// Default implementation returns <c>false</c> to preserve audit trails and enable message replay.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Storage Management:</strong>
    /// Automatic deletion helps manage storage growth in high-throughput scenarios where
    /// inbox messages accumulate rapidly. However, deletion should be balanced against
    /// requirements for audit trails, debugging capabilities, and potential message replay needs.
    /// </para>
    ///
    /// <para>
    /// <strong>Debugging and Monitoring:</strong>
    /// Retaining processed messages enables post-mortem analysis of event processing patterns,
    /// performance monitoring, and troubleshooting of complex event flows. Consider retention
    /// policies that balance storage costs with operational visibility requirements.
    /// </para>
    ///
    /// <para>
    /// <strong>Distributed Tracing Integration:</strong>
    /// When distributed tracing is enabled, automatic deletion may be disabled to preserve
    /// message correlation data that supports comprehensive trace analysis across service boundaries.
    /// </para>
    ///
    /// <para>
    /// <strong>Compliance and Audit Requirements:</strong>
    /// In regulated environments, message retention may be required for compliance purposes.
    /// Override this property to <c>true</c> only when such requirements do not apply or when
    /// alternative audit mechanisms are in place.
    /// </para>
    /// </remarks>
    public virtual bool AutoDeleteProcessedInboxEventMessage => false;

    /// <summary>
    /// Gets or sets the initial delay in seconds before retrying a failed inbox message consumer.
    /// This setting provides the baseline retry delay that forms the foundation of the exponential
    /// backoff strategy used for inbox message processing resilience.
    /// </summary>
    /// <value>
    /// The initial delay in seconds before the first retry attempt for failed inbox message processing.
    /// Default value is 1 second, providing immediate retry capability while allowing for quick
    /// recovery from transient failures.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Exponential Backoff Foundation:</strong>
    /// This value serves as the base delay that is incremented with each retry attempt,
    /// creating an exponential backoff pattern that reduces system load during extended
    /// failure scenarios while maintaining responsiveness for transient issues.
    /// </para>
    ///
    /// <para>
    /// <strong>Transient Failure Recovery:</strong>
    /// A short initial delay enables rapid recovery from temporary network issues,
    /// database connection problems, or resource contention scenarios that typically
    /// resolve within seconds of the initial failure.
    /// </para>
    ///
    /// <para>
    /// <strong>System Load Considerations:</strong>
    /// While shorter delays improve recovery time, they should be balanced against
    /// system capacity to handle retry attempts. In high-throughput scenarios,
    /// consider increasing this value to prevent retry storms during outages.
    /// </para>
    /// </remarks>
    public int RetryEventInboxBusMessageConsumerOnFailedDelaySeconds { get; set; } = 1;

    /// <summary>
    /// Gets or sets the maximum delay in seconds before retrying a failed inbox message consumer.
    /// This setting caps the exponential backoff delay to prevent excessively long wait times
    /// while maintaining system responsiveness during extended outage scenarios.
    /// </summary>
    /// <value>
    /// The maximum delay in seconds that retry attempts will wait before processing.
    /// Default value is 60 seconds, providing a balance between giving sufficient time
    /// for recovery while maintaining reasonable processing latency expectations.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Backoff Ceiling:</strong>
    /// Acts as an upper bound for the exponential backoff algorithm, preventing
    /// retry delays from growing indefinitely and ensuring that messages are not
    /// delayed beyond acceptable business requirements during extended failures.
    /// </para>
    ///
    /// <para>
    /// <strong>Service Level Agreement Compliance:</strong>
    /// The maximum delay should align with service level agreements and business
    /// requirements for event processing latency. Extended delays may be acceptable
    /// for background processing but not for user-facing operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Recovery Time Optimization:</strong>
    /// During system recovery, messages will resume processing at the maximum delay interval,
    /// providing predictable processing resumption while allowing adequate time for
    /// system stabilization after outage resolution.
    /// </para>
    ///
    /// <para>
    /// <strong>Resource Management:</strong>
    /// Longer maximum delays reduce system load during extended outages by spacing
    /// out retry attempts, preventing resource exhaustion while maintaining eventual
    /// processing guarantees for all persisted messages.
    /// </para>
    /// </remarks>
    public int RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds { get; set; } = 60;

    /// <summary>
    /// Gets or sets the maximum number of times to retry a failed inbox message consumer.
    /// This setting provides ultimate bounds on retry attempts to prevent infinite processing
    /// loops while supporting comprehensive recovery scenarios for persistent failures.
    /// </summary>
    /// <value>
    /// The maximum number of retry attempts for failed inbox message processing.
    /// Default value is <see cref="int.MaxValue"/>, providing unlimited retry attempts
    /// to ensure eventual consistency and comprehensive failure recovery capabilities.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Unlimited Retry Strategy:</strong>
    /// The default unlimited retry count ensures that no message is permanently lost
    /// due to transient failures, supporting eventual consistency guarantees in
    /// distributed systems and microservices architectures.
    /// </para>
    ///
    /// <para>
    /// <strong>Dead Letter Queue Alternative:</strong>
    /// While unlimited retries prevent message loss, they should be combined with
    /// monitoring and alerting to identify persistently failing messages that may
    /// require manual intervention or dead letter queue processing.
    /// </para>
    ///
    /// <para>
    /// <strong>Resource Considerations:</strong>
    /// Unlimited retries consume processing resources and storage for persistent
    /// failure tracking. In resource-constrained environments, consider setting
    /// finite retry limits combined with alternative failure handling mechanisms.
    /// </para>
    ///
    /// <para>
    /// <strong>Operational Monitoring:</strong>
    /// Monitor retry patterns and failure rates to identify systematic issues
    /// that require code fixes rather than continued retry attempts. High retry
    /// counts may indicate configuration problems or code defects requiring resolution.
    /// </para>
    /// </remarks>
    public int RetryEventInboxBusMessageConsumerMaxCount { get; set; } = int.MaxValue;

    /// <summary>
    /// Gets or sets the number of times to retry handling an event upon failure.
    /// The retry count automatically adapts based on handler capabilities, with unlimited retries
    /// for handlers without inbox support to ensure eventual consistency in distributed scenarios.
    /// </summary>
    /// <value>
    /// The number of retry attempts. Handlers without inbox support and immediate execution requirements
    /// default to <see cref="int.MaxValue"/> for unlimited retries. Handlers with inbox support
    /// use <see cref="Util.TaskRunner.DefaultResilientRetryCount"/> for bounded retries.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Adaptive Retry Count Strategy:</strong>
    /// The retry count automatically adapts to ensure system reliability:
    /// - Unlimited retries for handlers without inbox support (eventual consistency guarantee)
    /// - Standard retry count for handlers with inbox support (systematic retry via persistence)
    /// - Standard retry count for immediate execution handlers (bounded retry for responsiveness)
    /// </para>
    ///
    /// <para>
    /// <strong>Eventual Consistency Guarantee:</strong>
    /// Unlimited retries for non-inbox handlers ensure:
    /// - Critical events are eventually processed despite transient failures
    /// - System maintains consistency across distributed microservices
    /// - No event loss due to temporary infrastructure issues
    /// - Graceful handling of extended outages and recovery scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Pattern Benefits:</strong>
    /// Handlers with inbox support use bounded retries because:
    /// - Failed events are persisted and can be systematically reprocessed
    /// - Dead letter queues handle permanently failed messages
    /// - Monitoring and alerting can track persistent failures
    /// - Manual intervention options are available for complex failures
    /// </para>
    ///
    /// <para>
    /// <strong>Performance and Resource Considerations:</strong>
    /// While unlimited retries ensure consistency, they consume resources:
    /// - Extended retry delays prevent resource exhaustion
    /// - Background execution isolates retry overhead from user operations
    /// - Monitoring should track retry patterns for capacity planning
    /// </para>
    /// </remarks>
    public override int RetryOnFailedTimes
    {
        get => retryOnFailedTimes ??
               (!HasInboxMessageSupport() && !MustWaitHandlerExecutionFinishedImmediately
                   ? int.MaxValue
                   : Util.TaskRunner.DefaultOptimisticConcurrencyRetryResilientRetryCount);
        set => retryOnFailedTimes = value;
    }

    /// <summary>
    /// Gets or sets a value indicating whether the current instance of the event handler is called
    /// from the Inbox Bus Message Consumer, which affects error handling behavior and processing strategies.
    /// </summary>
    /// <value>
    /// <c>true</c> if this handler instance is executing as part of inbox message consumption;
    /// <c>false</c> if executing as part of direct event processing or background execution.
    /// This flag influences exception handling, immediate execution requirements, and error reporting.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Processing Context Awareness:</strong>
    /// This flag enables handlers to adapt their behavior based on the execution context,
    /// applying different logic for original event processing versus replay from persistent storage.
    /// Handlers can implement different retry strategies, error handling, or side effects based on this context.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling Strategy:</strong>
    /// When executing from inbox consumption, exceptions are typically thrown to enable
    /// the inbox consumer to properly track failed messages and implement systematic retry logic.
    /// Direct execution may use different error handling to prevent disruption of user operations.
    /// </para>
    ///
    /// <para>
    /// <strong>Immediate Execution Control:</strong>
    /// Inbox-triggered handlers must complete immediately without further background processing,
    /// as they are already executing in a managed background context with appropriate error handling
    /// and retry mechanisms provided by the inbox infrastructure.
    /// </para>
    ///
    /// <para>
    /// <strong>State Transfer:</strong>
    /// This property is automatically copied when creating new handler instances to ensure
    /// consistent behavior across scope boundaries and background execution contexts.
    /// </para>
    /// </remarks>
    public bool IsCalledFromInboxBusMessageConsumer { get; set; }

    /// <summary>
    /// Gets a value indicating whether inbox event bus message storage is enabled for this handler.
    /// When enabled, events processed by this handler can be persisted to the inbox for reliable
    /// asynchronous processing with comprehensive retry and failure handling capabilities.
    /// </summary>
    /// <value>
    /// <c>true</c> to enable inbox pattern storage for events handled by this handler;
    /// <c>false</c> to process events directly without inbox persistence.
    /// Default implementation returns <c>true</c> to support reliable event processing patterns.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Reliable Processing:</strong>
    /// When enabled, events are stored in persistent storage before processing, ensuring
    /// that no events are lost due to application crashes, network failures, or other
    /// infrastructure issues that might occur during event processing.
    /// </para>
    ///
    /// <para>
    /// <strong>Asynchronous Processing:</strong>
    /// Inbox storage enables true asynchronous event processing where the initial event
    /// trigger can complete immediately while actual processing occurs in background
    /// threads with appropriate retry and error handling mechanisms.
    /// </para>
    ///
    /// <para>
    /// <strong>Load Balancing:</strong>
    /// Persisted inbox messages can be processed by any available application instance,
    /// providing natural load balancing and horizontal scaling capabilities for
    /// event-intensive applications across multiple servers or containers.
    /// </para>
    ///
    /// <para>
    /// <strong>Override Scenarios:</strong>
    /// Override to return <c>false</c> for handlers that require immediate processing,
    /// have minimal failure risk, or when the overhead of persistence outweighs
    /// the reliability benefits for specific use cases.
    /// </para>
    /// </remarks>
    public virtual bool EnableInboxEventBusMessage => true;

    /// <summary>
    /// Gets or sets a value indicating whether to throw an exception when event handling fails.
    /// This setting controls error propagation behavior and adapts automatically based on the
    /// execution context to provide appropriate error handling for different processing scenarios.
    /// </summary>
    /// <value>
    /// <c>true</c> to throw exceptions on handling failures, enabling proper error propagation;
    /// <c>false</c> to suppress exceptions and rely on logging for error tracking.
    /// Default behavior is <c>true</c> when called from inbox message consumer, <c>false</c> otherwise.
    /// </value>
    /// <remarks>
    /// <para>
    /// <strong>Context-Adaptive Error Handling:</strong>
    /// The behavior automatically adapts based on execution context:
    /// - Inbox consumer execution: Exceptions are thrown to enable systematic retry tracking
    /// - Direct execution: Exceptions may be suppressed to prevent user operation disruption
    /// - Background execution: Behavior depends on specific implementation requirements
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Pattern Integration:</strong>
    /// When processing messages from the inbox, exceptions must be thrown to enable
    /// the inbox infrastructure to properly track failed messages, implement retry logic,
    /// and maintain processing state for comprehensive failure recovery.
    /// </para>
    ///
    /// <para>
    /// <strong>User Experience Considerations:</strong>
    /// For direct event processing triggered by user actions, suppressing exceptions
    /// may be appropriate to prevent user operation failures while still logging
    /// the errors for monitoring and debugging purposes.
    /// </para>
    ///
    /// <para>
    /// <strong>Monitoring and Observability:</strong>
    /// Regardless of exception throwing behavior, all failures are logged with
    /// comprehensive details to support monitoring, alerting, and debugging workflows.
    /// </para>
    /// </remarks>
    public override bool ThrowExceptionOnHandleFailed
    {
        get => throwExceptionOnHandleFailed ?? IsCalledFromInboxBusMessageConsumer;
        set => throwExceptionOnHandleFailed = value;
    }

    /// <summary>
    /// Handles the event by casting it to the specific event type and delegating to the strongly-typed handler.
    /// This method provides the polymorphic entry point for event processing when the event type is known
    /// only as a base object reference, enabling integration with generic event dispatching mechanisms.
    /// </summary>
    /// <param name="event">
    /// The event object to be processed. This will be cast to the specific <typeparamref name="TEvent"/> type
    /// before processing. The casting operation validates type compatibility and ensures type safety.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the asynchronous operation. This enables
    /// graceful shutdown scenarios and prevents resource waste during application termination.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous event handling operation. The task completes when
    /// the event has been fully processed, including any background operations, retries, or
    /// inbox processing that may be initiated by the handling logic.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Type Safety and Casting:</strong>
    /// The method performs safe casting from the generic object type to the specific event type,
    /// ensuring type compatibility and enabling access to strongly-typed event properties and methods.
    /// Invalid casts will result in appropriate exceptions being thrown.
    /// </para>
    ///
    /// <para>
    /// <strong>Polymorphic Processing:</strong>
    /// This overload enables polymorphic event handling scenarios where event types are determined
    /// at runtime, supporting dynamic event dispatching, reflection-based processing, and
    /// integration with dependency injection containers that work with base object types.
    /// </para>
    ///
    /// <para>
    /// <strong>Integration Point:</strong>
    /// Serves as a key integration point for event bus implementations, message queue consumers,
    /// and other infrastructure components that need to invoke event handlers without compile-time
    /// knowledge of specific event types.
    /// </para>
    /// </remarks>
    /// </para>
    ///
    /// <para>
    /// <strong>Polymorphic Processing:</strong>
    /// This overload enables polymorphic event handling scenarios where event types are determined
    /// at runtime, supporting dynamic event dispatching, reflection-based processing, and
    /// integration with dependency injection containers that work with base object types.
    /// </para>
    ///
    /// <para>
    /// <strong>Integration Point:</strong>
    /// Serves as a key integration point for event bus implementations, message queue consumers,
    /// and other infrastructure components that need to invoke event handlers without compile-time
    /// knowledge of specific event types.
    /// </para>
    /// </remarks>
    public override Task Handle(object @event, CancellationToken cancellationToken)
    {
        return DoHandle(@event.As<TEvent>(), cancellationToken);
    }

    /// <summary>
    /// Determines if the handler should process the event by casting it to the specific event type
    /// and evaluating the strongly-typed condition logic. This method provides polymorphic access
    /// to event filtering capabilities when working with base object references.
    /// </summary>
    /// <param name="event">
    /// The event object to be evaluated for processing eligibility. This will be cast to the
    /// specific <typeparamref name="TEvent"/> type before evaluation, ensuring type safety
    /// and enabling access to strongly-typed event properties for condition checking.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous evaluation operation, containing <c>true</c> if the
    /// event should be handled by this handler instance; otherwise, <c>false</c>. The evaluation
    /// may involve complex business logic, database queries, or external service calls.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Event Filtering Strategy:</strong>
    /// This method enables sophisticated event filtering based on event content, current system state,
    /// business rules, or external conditions. Handlers can implement selective processing to handle
    /// only relevant events while ignoring others that don't meet specific criteria.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// By evaluating processing conditions early, unnecessary handler execution can be avoided,
    /// reducing system load and improving overall performance in high-throughput event processing
    /// scenarios where many events may not require processing by specific handlers.
    /// </para>
    ///
    /// <para>
    /// <strong>Dynamic Behavior:</strong>
    /// The asynchronous nature allows for dynamic condition evaluation based on current system state,
    /// configuration changes, feature flags, or external service availability, enabling adaptive
    /// event processing behavior that responds to changing operational conditions.
    /// </para>
    ///
    /// <para>
    /// <strong>Integration with Event Bus:</strong>
    /// Provides polymorphic access for event bus implementations that work with base object types
    /// while still enabling handlers to implement sophisticated filtering logic based on
    /// strongly-typed event properties and business context.
    /// </para>
    /// </remarks>
    public override async Task<bool> HandleWhen(object @event)
    {
        return await HandleWhen(@event.As<TEvent>());
    }

    /// <summary>
    /// Determines whether the handler can process the given event using the inbox pattern by casting
    /// it to the specific event type and evaluating inbox compatibility. This method provides polymorphic
    /// access to inbox pattern eligibility checking for generic event processing scenarios.
    /// </summary>
    /// <param name="event">
    /// The event object to be evaluated for inbox processing compatibility. This will be cast to the
    /// specific <typeparamref name="TEvent"/> type before evaluation, ensuring type safety and
    /// enabling access to strongly-typed event properties for inbox eligibility determination.
    /// </param>
    /// <returns>
    /// <c>true</c> if the event can be processed via the inbox pattern, enabling reliable asynchronous
    /// processing with persistence and retry capabilities; <c>false</c> if the event must be processed
    /// immediately without inbox storage, typically due to user context requirements or immediate response needs.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Inbox Pattern Compatibility:</strong>
    /// The inbox pattern provides reliable event processing by persisting events before processing,
    /// enabling recovery from failures and supporting horizontal scaling. However, not all events
    /// are suitable for inbox processing due to context requirements or timing constraints.
    /// </para>
    ///
    /// <para>
    /// <strong>Type Safety and Polymorphism:</strong>
    /// This overload enables inbox compatibility checking in scenarios where event types are known
    /// only as base object references, such as in generic event dispatching systems or
    /// reflection-based processing frameworks.
    /// </para>
    ///
    /// <para>
    /// <strong>Processing Strategy Selection:</strong>
    /// The result influences whether events are processed immediately with full user context
    /// or deferred to background processing with reconstructed context from event data,
    /// enabling optimal processing strategies based on event characteristics and business requirements.
    /// </para>
    ///
    /// <para>
    /// <strong>Integration Point:</strong>
    /// Serves as a key decision point for event bus implementations and message routing logic
    /// that need to determine processing strategies without compile-time knowledge of specific event types.
    /// </para>
    /// </remarks>
    public bool CanExecuteHandlingEventUsingInboxConsumer(object @event)
    {
        return CanExecuteHandlingEventUsingInboxConsumer(@event.As<TEvent>());
    }

    /// <summary>
    /// Handles the specified event using the strongly-typed interface contract, providing the primary
    /// entry point for MediatR-based event processing. This method delegates to the comprehensive
    /// event handling pipeline that includes transaction management, retry logic, and inbox pattern support.
    /// </summary>
    /// <param name="notification">
    /// The strongly-typed event to be processed. This event contains all necessary data and context
    /// information required for processing, including request context, user information, and event-specific payload.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the asynchronous operation. This enables
    /// graceful shutdown scenarios and prevents resource waste during application termination or timeout conditions.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous event handling operation. The task completes when
    /// the event has been fully processed, including any Unit of Work operations, background processing,
    /// or inbox pattern storage that may be initiated by the handling logic.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>MediatR Integration:</strong>
    /// This method implements the MediatR <c>INotificationHandler&lt;TEvent&gt;</c> interface,
    /// enabling seamless integration with MediatR's event publishing and handler discovery mechanisms.
    /// It serves as the primary entry point for event processing in the MediatR pipeline.
    /// </para>
    ///
    /// <para>
    /// <strong>Pipeline Delegation:</strong>
    /// The method delegates to <see cref="DoHandle(TEvent, CancellationToken)"/> which orchestrates
    /// the complete event processing pipeline including condition checking, transaction management,
    /// background execution coordination, and comprehensive error handling with retry logic.
    /// </para>
    ///
    /// <para>
    /// <strong>Type Safety:</strong>
    /// Unlike the polymorphic object-based overloads, this method provides compile-time type safety
    /// and enables direct access to strongly-typed event properties without casting operations,
    /// improving performance and reducing the potential for runtime type errors.
    /// </para>
    ///
    /// <para>
    /// <strong>Consistency Guarantee:</strong>
    /// All event processing flows ultimately converge through the same underlying pipeline,
    /// ensuring consistent behavior regardless of the entry point used for event handling.
    /// </para>
    /// </remarks>
    public override async Task Handle(TEvent notification, CancellationToken cancellationToken)
    {
        await DoHandle(notification, cancellationToken);
    }

    /// <summary>
    /// Executes the comprehensive event handling logic with distributed tracing support and intelligent
    /// processing strategy selection. This method serves as the central orchestrator for all event processing,
    /// determining whether to use immediate processing, inbox pattern storage, or background execution based
    /// on event characteristics and system configuration.
    /// </summary>
    /// <param name="event">
    /// The event to be processed, containing all necessary data, context information, and metadata
    /// required for making processing decisions and executing the appropriate handling strategy.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the asynchronous operation. This token is
    /// propagated through all processing stages including background execution and inbox pattern processing.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous event processing operation. The task completes when
    /// the chosen processing strategy has been initiated, though actual event processing may continue
    /// asynchronously in background threads or through inbox consumer processing.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Processing Strategy Selection:</strong>
    /// The method intelligently selects the optimal processing strategy based on multiple factors:
    /// - Inbox pattern availability and compatibility
    /// - Immediate execution requirements from user operations
    /// - Unit of Work context and transaction boundaries
    /// - Background processing capabilities and resource availability
    /// - Request context preservation requirements
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Pattern Integration:</strong>
    /// When appropriate, events are persisted to the inbox for reliable asynchronous processing.
    /// This provides resilience against failures, enables horizontal scaling, and supports
    /// load balancing across multiple application instances while maintaining event ordering guarantees.
    /// </para>
    ///
    /// <para>
    /// <strong>Request Context Management:</strong>
    /// The method ensures proper propagation of request context information across processing boundaries,
    /// including user identity, session data, correlation identifiers, and other contextual information
    /// necessary for maintaining audit trails and implementing user-scoped business logic.
    /// </para>
    ///
    /// <para>
    /// <strong>Circular Pipeline Prevention:</strong>
    /// Implements sophisticated circular dependency detection to prevent infinite event processing loops
    /// that could occur when events trigger other events in complex business workflows, ensuring
    /// system stability and preventing resource exhaustion.
    /// </para>
    ///
    /// <para>
    /// <strong>Comprehensive Error Handling:</strong>
    /// Includes robust retry mechanisms with exponential backoff, comprehensive error logging,
    /// and graceful degradation strategies that ensure system resilience during failure scenarios
    /// while maintaining processing guarantees for critical business events.
    /// </para>
    /// </remarks>
    public override async Task ExecuteHandleAsync(TEvent @event, CancellationToken cancellationToken)
    {
        await ExecuteHandleWithTracingAsync(
            @event,
            async () =>
            {
                try
                {
                    if (@event.RequestContext.Count < RequestContextAccessor.Current.Count)
                        @event.RequestContext.UpsertMany(RequestContextAccessor.Current.GetAllKeyValues());

                    if (!await CheckHandleWhen(@event))
                        return;

                    if (CanExecuteHandlingEventUsingInboxConsumer(@event) && NotNeedWaitHandlerExecutionFinishedImmediately(@event))
                    {
                        // Execute using inbox
                        var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);
                        var currentBusMessageIdentity = BuildCurrentBusMessageIdentity(@event.RequestContext);

                        if (@event is IPlatformUowEvent && eventSourceUow != null && !eventSourceUow.IsPseudoTransactionUow())
                        {
                            await HandleExecutingInboxConsumerAsync(
                                @event,
                                ServiceProvider,
                                ServiceProvider.GetRequiredService<PlatformInboxConfig>(),
                                ServiceProvider.GetRequiredService<IPlatformInboxBusMessageRepository>(),
                                ServiceProvider.GetRequiredService<IPlatformApplicationSettingContext>(),
                                currentBusMessageIdentity,
                                eventSourceUow,
                                cancellationToken
                            );
                        }
                        else
                        {
                            await ServiceProvider.ExecuteInjectScopedAsync((
                                    IServiceProvider serviceProvider,
                                    PlatformInboxConfig inboxConfig,
                                    IPlatformInboxBusMessageRepository inboxMessageRepository,
                                    IPlatformApplicationSettingContext applicationSettingContext
                                ) =>
                                HandleExecutingInboxConsumerAsync(
                                    @event,
                                    serviceProvider,
                                    inboxConfig,
                                    inboxMessageRepository,
                                    applicationSettingContext,
                                    currentBusMessageIdentity,
                                    null,
                                    cancellationToken
                                )
                            );
                        }
                    }
                    else
                    {
                        if (ApplicationSettingContext.IsDebugInformationMode)
                            Logger.Value.LogInformation("{Type} {Method} STARTED", GetType().FullName, nameof(ExecuteHandleAsync));

                        EnsureNoCircularPipeLine(@event);

                        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync<PlatformDomainRowVersionConflictException>(
                            () =>
                            {
                                if (AutoOpenUow)
                                {
                                    // If not ForceCurrentInstanceHandleInCurrentThreadAndScope, then create new scope to open new uow so that multiple events handlers from an event do not get conflicted
                                    // uow in the same scope if not open new scope
                                    if (ForceCurrentInstanceHandleInCurrentThreadAndScope)
                                        return UnitOfWorkManager.ExecuteUowTask(() => HandleAsync(@event, cancellationToken));
                                    else
                                    {
                                        return ServiceProvider.ExecuteInjectScopedAsync((
                                                IPlatformUnitOfWorkManager unitOfWorkManager,
                                                IServiceProvider serviceProvider) =>
                                            unitOfWorkManager.ExecuteUowTask(() =>
                                                serviceProvider
                                                    .GetRequiredService(GetType())
                                                    .As<PlatformCqrsEventApplicationHandler<TEvent>>()
                                                    .With(newInstance => CopyPropertiesToNewInstanceBeforeExecution(this, newInstance))
                                                    .HandleAsync(@event, cancellationToken)
                                            )
                                        );
                                    }
                                }
                                else
                                    return HandleAsync(@event, cancellationToken);
                            },
                            retryCount: RetryOnFailedTimes,
                            sleepDurationProvider: retryAttempt => Math.Min(retryAttempt + RetryOnFailedDelaySeconds, MaxRetryOnFailedDelaySeconds).Seconds(),
                            onRetry: (e, delayTime, retryAttempt, context) =>
                            {
                                if (retryAttempt > Util.TaskRunner.DefaultResilientRetryCount)
                                    LogError(@event, e.BeautifyStackTrace(), LoggerFactory, "Retry");
                            },
                            cancellationToken: cancellationToken,
                            ignoreExceptionTypes: [typeof(IPlatformValidationException)]
                        );

                        if (ApplicationSettingContext.IsDebugInformationMode)
                            Logger.Value.LogInformation("{Type} {Method} FINISHED", GetType().FullName, nameof(ExecuteHandleAsync));
                    }
                }
                finally
                {
                    ApplicationSettingContext.ProcessAutoGarbageCollect();
                }
            }
        );
    }

    /// <summary>
    /// Determines whether the event can be handled using the inbox consumer pattern based on system
    /// capabilities and event characteristics. This method evaluates multiple factors to determine
    /// if reliable asynchronous processing with persistence is appropriate for the given event.
    /// </summary>
    /// <param name="event">
    /// The event to be evaluated for inbox processing compatibility. The evaluation considers
    /// event properties, handler capabilities, and current execution context to make the determination.
    /// </param>
    /// <returns>
    /// <c>true</c> if the event is eligible for inbox consumer processing, enabling reliable
    /// asynchronous execution with persistence and comprehensive retry capabilities;
    /// <c>false</c> if the event must be processed immediately without inbox pattern storage.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Inbox Pattern Eligibility Criteria:</strong>
    /// Events are eligible for inbox processing when all of the following conditions are met:
    /// - Inbox message support is available and configured in the application
    /// - The event does not require immediate execution (unless called from inbox consumer)
    /// - The handler does not have dependencies on current user request context
    /// - Background processing is compatible with the event's business requirements
    /// </para>
    ///
    /// <para>
    /// <strong>Request Context Considerations:</strong>
    /// Events that depend on user request context (authentication, session state, user-scoped data)
    /// typically cannot use inbox processing because this context is not available during
    /// background consumption. However, events with self-contained context can be safely processed via inbox.
    /// </para>
    ///
    /// <para>
    /// <strong>Immediate Execution Requirements:</strong>
    /// Some events require immediate processing to provide user feedback or maintain system responsiveness.
    /// These events bypass inbox processing to ensure minimal latency, though they sacrifice
    /// the reliability benefits of persistent storage and systematic retry mechanisms.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance and Scalability Benefits:</strong>
    /// Inbox-eligible events benefit from load balancing, horizontal scaling, and resource optimization
    /// through background processing, enabling better overall system performance and resilience
    /// during high-throughput scenarios or temporary resource constraints.
    /// </para>
    /// </remarks>
    public virtual bool CanExecuteHandlingEventUsingInboxConsumer(TEvent @event)
    {
        return HasInboxMessageSupport() && (NotNeedWaitHandlerExecutionFinishedImmediately(@event) || IsCalledFromInboxBusMessageConsumer);
    }

    /// <summary>
    /// Determines whether the event handling for the specified event can be executed in a background thread
    /// based on transaction context and execution requirements. This method evaluates system state and
    /// event characteristics to optimize processing strategies and resource utilization.
    /// </summary>
    /// <param name="event">
    /// The event to be evaluated for background execution compatibility. The evaluation considers
    /// current transaction state, unit of work context, and event-specific execution requirements.
    /// </param>
    /// <returns>
    /// <c>true</c> if the event handling can be safely executed in a background thread without
    /// affecting transaction integrity or user experience; <c>false</c> if immediate synchronous
    /// execution is required to maintain data consistency or provide timely user feedback.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Background Execution Eligibility:</strong>
    /// Events are eligible for background execution when they are not bound to active database
    /// transactions and do not require immediate completion for user operations. This enables
    /// better resource utilization and improved user experience by offloading work from request threads.
    /// </para>
    ///
    /// <para>
    /// <strong>Transaction Boundary Considerations:</strong>
    /// Events associated with active Unit of Work transactions typically cannot be processed
    /// in background threads because they must complete within the transaction boundary to
    /// maintain data consistency. Pseudo-transaction UoWs are exempt from this restriction.
    /// </para>
    ///
    /// <para>
    /// <strong>Immediate Execution Requirements:</strong>
    /// Events that require immediate execution (such as user-facing operations or time-sensitive
    /// business logic) are processed synchronously to ensure timely completion and appropriate
    /// user feedback, even if background execution would otherwise be technically feasible.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// Background execution enables better system performance by:
    /// - Reducing request thread blocking and improving responsiveness
    /// - Enabling parallel processing of independent events
    /// - Allowing for resource optimization and load balancing
    /// - Supporting graceful handling of high-throughput scenarios
    /// </para>
    ///
    /// <para>
    /// <strong>Resource Management:</strong>
    /// Background threads are managed by the system thread pool and include proper
    /// service scope management to ensure correct dependency injection and resource disposal.
    /// </para>
    /// </remarks>
    protected override bool AllowHandleInBackgroundThread(TEvent @event)
    {
        return TryGetCurrentOrCreatedActiveUow(@event).Pipe(p => p == null || p.IsPseudoTransactionUow()) && NotNeedWaitHandlerExecutionFinishedImmediately(@event);
    }

    /// <summary>
    /// Copies essential properties from the previous handler instance to the new instance before execution
    /// to ensure state consistency across scope boundaries and background processing contexts.
    /// This method enables stateful handler behavior in scenarios requiring new instance creation.
    /// </summary>
    /// <param name="previousInstance">
    /// The previous handler instance that contains the current state and configuration that needs
    /// to be preserved. This instance has been configured with the appropriate execution context
    /// and processing flags that must be maintained in the new instance.
    /// </param>
    /// <param name="newInstance">
    /// The newly created handler instance that will receive the copied state. This instance
    /// will be used for actual event processing and must inherit the execution context and
    /// configuration from the previous instance to ensure consistent behavior.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>State Transfer Strategy:</strong>
    /// This method ensures that critical handler state is preserved when creating new instances
    /// for background execution or scope isolation. Key state includes execution context flags,
    /// processing mode indicators, and other configuration that affects handler behavior.
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Consumer Context Preservation:</strong>
    /// The <see cref="IsCalledFromInboxBusMessageConsumer"/> flag is specifically transferred
    /// to ensure that the new instance maintains awareness of its execution context. This affects
    /// error handling behavior, immediate execution requirements, and exception throwing strategies.
    /// </para>
    ///
    /// <para>
    /// <strong>Scope Isolation Benefits:</strong>
    /// New instance creation enables proper scope isolation for background processing,
    /// preventing interference between concurrent event handlers and ensuring proper
    /// dependency injection scope management while maintaining consistent processing behavior.
    /// </para>
    ///
    /// <para>
    /// <strong>Inheritance Chain:</strong>
    /// Calls the base implementation to ensure that platform-level state is also properly
    /// transferred, creating a complete state transfer mechanism that works across the
    /// entire handler inheritance hierarchy.
    /// </para>
    /// </remarks>
    protected override void CopyPropertiesToNewInstanceBeforeExecution(PlatformCqrsEventHandler<TEvent> previousInstance, PlatformCqrsEventHandler<TEvent> newInstance)
    {
        base.CopyPropertiesToNewInstanceBeforeExecution(previousInstance, newInstance);

        var prevHandlerInstance = previousInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();
        var newHandlerInstance = newInstance.As<PlatformCqrsEventApplicationHandler<TEvent>>();

        newHandlerInstance.IsCalledFromInboxBusMessageConsumer = prevHandlerInstance.IsCalledFromInboxBusMessageConsumer;
    }

    /// <summary>
    /// Orchestrates the comprehensive event handling pipeline with intelligent processing strategy selection
    /// and transaction management. This method determines whether to execute immediately, defer to background
    /// processing, or integrate with Unit of Work boundaries based on event characteristics and system state.
    /// </summary>
    /// <param name="event">
    /// The event to be processed, containing all necessary data, context, and metadata required
    /// for processing decisions and execution. The event's properties influence processing strategy selection.
    /// </param>
    /// <param name="cancellationToken">
    /// A cancellation token that can be used to cancel the asynchronous operation. This token is
    /// propagated through all processing stages including background execution and transaction management.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous event processing operation. The task completes when
    /// the event has been queued for background processing or processed immediately, depending on
    /// the selected strategy and system configuration.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Processing Strategy Selection:</strong>
    /// The method intelligently selects between multiple processing strategies:
    /// - Immediate execution for time-sensitive or user-facing operations
    /// - Background execution for events that can be deferred without user impact
    /// - Unit of Work integration for events requiring transaction coordination
    /// - Error handling with comprehensive logging and optional exception suppression
    /// </para>
    ///
    /// <para>
    /// <strong>Unit of Work Integration:</strong>
    /// For events associated with active transactions, processing is deferred until the Unit of Work
    /// completion to ensure data consistency. Events are queued using OnSaveChangesCompletedActions
    /// to execute after successful transaction commit, preventing premature execution on rollback scenarios.
    /// </para>
    ///
    /// <para>
    /// <strong>Background Execution Strategy:</strong>
    /// When background execution is appropriate, events are processed in isolated service scopes
    /// with proper event instance cloning, stack trace preservation, and context transfer to ensure
    /// complete isolation from the originating request while maintaining all necessary processing context.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Handling and Resilience:</strong>
    /// Comprehensive error handling includes detailed logging with stack trace beautification,
    /// conditional exception throwing based on execution context, and preservation of error information
    /// for monitoring and debugging purposes while maintaining system stability.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// The method optimizes performance by avoiding unnecessary blocking operations for user requests
    /// while ensuring that critical processing is completed within appropriate transaction boundaries
    /// and that background work is properly isolated and managed.
    /// </para>
    /// </remarks>
    protected override async Task DoHandle(TEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            var eventSourceUow = TryGetCurrentOrCreatedActiveUow(@event);

            if (eventSourceUow?.IsPseudoTransactionUow() == false && NotNeedWaitHandlerExecutionFinishedImmediately(@event))
            {
                var thisHandlerInstanceEvent = DoHandle_BuildHandlerInstanceEvent(@event);

                DoHandle_AddEventStackTrace(thisHandlerInstanceEvent);

                eventSourceUow.OnSaveChangesCompletedActions.Add(async () =>
                {
                    // Execute task in background separated thread task
                    ExecuteHandleInBackgroundNewScopeAsync(thisHandlerInstanceEvent, cancellationToken);
                });
            }
            else
                await base.DoHandle(@event, cancellationToken);
        }
        catch (Exception e)
        {
            if (ThrowExceptionOnHandleFailed)
                throw;
            LogError(@event, e.BeautifyStackTrace(), LoggerFactory);
        }
    }

    /// <summary>
    /// Determines whether the handler must wait for the event processing to complete immediately
    /// based on execution context and business requirements. This method influences processing
    /// strategy selection and resource allocation for optimal user experience and system performance.
    /// </summary>
    /// <param name="event">
    /// The event being evaluated for immediate execution requirements. Event properties and
    /// current execution context are considered to make the determination.
    /// </param>
    /// <returns>
    /// <c>true</c> if the handler must complete processing before returning control to the caller,
    /// typically for user-facing operations or inbox consumer execution; <c>false</c> if processing
    /// can be deferred to background threads without affecting user experience or system consistency.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Immediate Execution Scenarios:</strong>
    /// Events require immediate execution in the following scenarios:
    /// - User-facing operations that need immediate feedback or response
    /// - Events triggered from inbox message consumers (already in background context)
    /// - Time-sensitive business operations with strict latency requirements
    /// - Operations that must complete within the current request/response cycle
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Consumer Context:</strong>
    /// When executing from an inbox consumer, immediate execution is required because the event
    /// is already being processed in a managed background context with appropriate error handling,
    /// retry logic, and transaction management provided by the inbox infrastructure.
    /// </para>
    ///
    /// <para>
    /// <strong>User Experience Impact:</strong>
    /// Immediate execution ensures that user operations receive timely responses and feedback,
    /// preventing scenarios where users experience delays or uncertainty about operation completion.
    /// This is particularly important for synchronous user interfaces and real-time business processes.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Trade-offs:</strong>
    /// While immediate execution provides better user experience and predictable behavior,
    /// it may impact system throughput and resource utilization. The method balances these
    /// concerns by enabling background execution when appropriate while ensuring immediate
    /// execution when required by business or technical constraints.
    /// </para>
    /// </remarks>
    protected override bool NeedWaitHandlerExecutionFinishedImmediately(TEvent @event)
    {
        return base.NeedWaitHandlerExecutionFinishedImmediately(@event) || IsCalledFromInboxBusMessageConsumer;
    }

    /// <summary>
    /// Executes preprocessing logic before the main event handling pipeline, managing event handler
    /// pipeline tracking and circular dependency prevention. This method ensures proper request context
    /// management and maintains comprehensive audit trails for event processing workflows.
    /// </summary>
    /// <param name="handlerNewInstance">
    /// The newly created handler instance that will process the event. This instance may be
    /// created in a different service scope to provide isolation and proper dependency management.
    /// </param>
    /// <param name="event">
    /// The event that will be processed, containing all necessary data and context information
    /// required for pipeline tracking and circular dependency detection.
    /// </param>
    /// <returns>
    /// A task that represents the asynchronous preprocessing operation. The task completes when
    /// all preprocessing logic has been executed and the handler is ready for main event processing.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Pipeline Tracking Strategy:</strong>
    /// When not executing from an inbox consumer, the method establishes comprehensive pipeline
    /// tracking by recording the event and handler combination in the request context. This enables
    /// monitoring of event processing flows and detection of complex processing patterns.
    /// </para>
    ///
    /// <para>
    /// <strong>Circular Dependency Prevention:</strong>
    /// The pipeline tracking information is used to detect and prevent circular event processing
    /// scenarios where events trigger other events that eventually lead back to the original event,
    /// preventing infinite loops and resource exhaustion in complex business workflows.
    /// </para>
    ///
    /// <para>
    /// <strong>Inbox Consumer Optimization:</strong>
    /// Pipeline tracking is bypassed for inbox consumer execution because these events are already
    /// being processed in a controlled background context with their own tracking and management
    /// mechanisms, avoiding unnecessary overhead and potential context conflicts.
    /// </para>
    ///
    /// <para>
    /// <strong>Request Context Management:</strong>
    /// The method ensures that pipeline information is properly maintained in both the event's
    /// request context and the current request context when executing in new scopes, providing
    /// comprehensive visibility into event processing flows across service boundaries.
    /// </para>
    ///
    /// <para>
    /// <strong>Debugging and Monitoring:</strong>
    /// Pipeline tracking provides valuable debugging information for understanding complex event
    /// processing flows, enabling developers and operators to trace event processing paths
    /// and identify performance bottlenecks or logical issues in event-driven architectures.
    /// </para>
    /// </remarks>
    protected override async Task BeforeExecuteHandleAsync(PlatformCqrsEventHandler<TEvent> handlerNewInstance, TEvent @event)
    {
        if (!IsCalledFromInboxBusMessageConsumer)
            ProcessEventHandlerPipeLineInRequestContext(@event);
    }

    /// <summary>
    /// Processes and maintains the event handler pipeline tracking information in the request context,
    /// providing comprehensive visibility into event processing flows and enabling monitoring of
    /// complex event-driven workflows across service boundaries and processing contexts.
    /// </summary>
    /// <param name="event">
    /// The event being processed, whose request context will be updated with pipeline tracking
    /// information. This context travels with the event throughout its processing lifecycle.
    /// </param>
    /// <remarks>
    /// <para>
    /// <strong>Pipeline Tracking Implementation:</strong>
    /// The method maintains a chronological list of event handlers that have processed or are
    /// processing events within the current request context. Each entry includes both the event
    /// type and handler type to provide complete processing path visibility.
    /// </para>
    ///
    /// <para>
    /// <strong>Routing Key Generation:</strong>
    /// Creates unique routing keys that combine application name, event type, and handler type
    /// to provide globally unique identifiers for each processing step. This enables
    /// cross-service tracking in distributed microservices architectures.
    /// </para>
    ///
    /// <para>
    /// <strong>Context Synchronization:</strong>
    /// When processing in new scopes, the method ensures that pipeline information is synchronized
    /// between the event's request context and the current request context, maintaining consistency
    /// across scope boundaries and enabling proper tracking in background processing scenarios.
    /// </para>
    ///
    /// <para>
    /// <strong>Monitoring and Debugging:</strong>
    /// The pipeline tracking information provides valuable insights for:
    /// - Understanding complex event processing flows and dependencies
    /// - Identifying performance bottlenecks in event processing chains
    /// - Debugging issues in event-driven business processes
    /// - Monitoring processing patterns and detecting anomalies
    /// </para>
    ///
    /// <para>
    /// <strong>Circular Dependency Detection:</strong>
    /// The tracked pipeline information is used by <see cref="EnsureNoCircularPipeLine"/> to detect
    /// and prevent circular event processing scenarios that could lead to infinite loops
    /// and system resource exhaustion.
    /// </para>
    /// </remarks>
    private void ProcessEventHandlerPipeLineInRequestContext(TEvent @event)
    {
        var requestContextEventHandlerPipeLine =
            @event.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(@event);

        requestContextEventHandlerPipeLine.Add(pipelineRoutingKey);

        @event.RequestContext.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextEventHandlerPipeLine);
        if (IsHandlingInNewScope)
            RequestContext.Upsert(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey, requestContextEventHandlerPipeLine, onlySelf: true);
    }

    /// <summary>
    /// Ensures that event processing does not result in circular pipeline execution that could
    /// lead to infinite loops and system resource exhaustion. This method implements sophisticated
    /// circular dependency detection to maintain system stability in complex event-driven workflows.
    /// </summary>
    /// <param name="event">
    /// The event being processed, whose request context contains the pipeline tracking information
    /// used for circular dependency detection and prevention.
    /// </param>
    /// <exception cref="PlatformDomainException">
    /// Thrown when a circular pipeline is detected, indicating that the same handler has been
    /// invoked more times than the configured safety threshold within the current request context.
    /// </exception>
    /// <remarks>
    /// <para>
    /// <strong>Circular Dependency Detection Algorithm:</strong>
    /// The method analyzes the event handler pipeline history to detect scenarios where the same
    /// handler is invoked repeatedly within a single request context. When the number of invocations
    /// exceeds the configured threshold, a circular dependency is identified and processing is halted.
    /// </para>
    ///
    /// <para>
    /// <strong>Safety Threshold Configuration:</strong>
    /// The circular detection threshold is configurable through the application setting context,
    /// allowing fine-tuning based on business requirements and system complexity. The threshold
    /// is applied as a multiplier to account for legitimate repeated processing scenarios.
    /// </para>
    ///
    /// <para>
    /// <strong>Performance Optimization:</strong>
    /// Circular detection is only performed when the pipeline has reached a minimum length
    /// (twice the configured threshold) to avoid unnecessary computation overhead for simple
    /// event processing scenarios while maintaining protection for complex workflows.
    /// </para>
    ///
    /// <para>
    /// <strong>Error Information:</strong>
    /// When circular dependencies are detected, comprehensive error information is provided
    /// including the complete pipeline history and the specific routing key that triggered
    /// the circular condition, enabling rapid debugging and resolution of complex event flows.
    /// </para>
    ///
    /// <para>
    /// <strong>Business Process Protection:</strong>
    /// This protection mechanism prevents legitimate business processes from accidentally
    /// creating infinite loops due to design errors, configuration mistakes, or unexpected
    /// data conditions that could otherwise consume system resources and impact performance.
    /// </para>
    /// </remarks>
    private void EnsureNoCircularPipeLine(TEvent @event)
    {
        var requestContextEventHandlerPipeLine =
            @event.RequestContext.GetRequestContextValue<List<string>>(PlatformApplicationCommonRequestContextKeys.ConsumerOrEventHandlerPipeLineKey) ?? [];
        var pipelineRoutingKey = GetPipelineRoutingKey(@event);

        // Prevent: A => [B, B => C, B => C => D] => A.
        if (requestContextEventHandlerPipeLine.Count >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount * 2)
        {
            // p => p.Take(p.Count - 1).Count(p => p == pipelineRoutingKey) >= ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount => circular ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount times => could be forever
            requestContextEventHandlerPipeLine
                .ValidateNot(
                    mustNot: p => p.Take(p.Count - 1).Count(p => p == pipelineRoutingKey) >=
                                  ApplicationSettingContext.ProcessEventEnsureNoCircularPipeLineMaxCircularCount,
                    $"The current [RequestContextEventHandlerPipeLine:{requestContextEventHandlerPipeLine.ToJson()}] lead to {pipelineRoutingKey} has circular call error."
                )
                .EnsureValid();
        }
    }

    /// <summary>
    /// Gets the pipeline routing key for the specified event, creating a globally unique identifier
    /// that combines application context, event type, and handler type information. This routing key
    /// enables comprehensive tracking and monitoring of event processing flows across distributed systems.
    /// </summary>
    /// <param name="event">
    /// The event for which to generate the routing key. The event's type information is combined
    /// with the handler's type information to create a unique processing step identifier.
    /// </param>
    /// <returns>
    /// A string that uniquely identifies this specific event and handler combination within
    /// the context of the current application. The format includes application name, event type,
    /// and handler type separated by distinctive delimiters for parsing and analysis.
    /// </returns>
    /// <remarks>
    /// <para>
    /// <strong>Routing Key Format:</strong>
    /// The routing key follows the pattern: "{ApplicationName}---{EventTypeName}::{HandlerTypeName}"
    /// This format provides hierarchical organization and enables efficient filtering and routing
    /// in distributed event processing scenarios and monitoring systems.
    /// </para>
    ///
    /// <para>
    /// <strong>Global Uniqueness:</strong>
    /// By incorporating the application name, the routing key ensures global uniqueness across
    /// microservices and distributed system boundaries, enabling comprehensive event tracking
    /// and correlation in complex distributed architectures.
    /// </para>
    ///
    /// <para>
    /// <strong>Type Safety:</strong>
    /// Uses generic type name resolution to handle both simple and generic types correctly,
    /// ensuring that parameterized handlers and events are properly represented in the
    /// routing key without type parameter noise or ambiguity.
    /// </para>
    ///
    /// <para>
    /// <strong>Monitoring Integration:</strong>
    /// The standardized routing key format enables integration with monitoring and observability
    /// tools that can parse and analyze event processing patterns, performance metrics,
    /// and system behavior across the entire distributed application ecosystem.
    /// </para>
    ///
    /// <para>
    /// <strong>Debugging Support:</strong>
    /// Provides clear, human-readable identifiers that aid in debugging complex event flows,
    /// enabling developers to quickly identify specific processing steps and trace event
    /// propagation through the system during troubleshooting activities.
    /// </para>
    /// </remarks>
    protected virtual string GetPipelineRoutingKey(TEvent @event)
    {
        return $"{ApplicationSettingContext.ApplicationName}---{@event.GetType().GetNameOrGenericTypeName()}::{GetType().GetNameOrGenericTypeName()}";
    }

    /// <summary>
    /// Checks if the application has inbox message support.
    /// </summary>
    /// <returns><c>true</c> if inbox message support is enabled; otherwise, <c>false</c>.</returns>
    protected bool HasInboxMessageSupport()
    {
        return RootServiceProvider.CheckHasRegisteredScopedService<IPlatformInboxBusMessageRepository>() && EnableInboxEventBusMessage;
    }

    /// <summary>
    /// Handles the execution of an inbox consumer.
    /// </summary>
    /// <param name="event">The event.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="inboxConfig">The inbox configuration.</param>
    /// <param name="inboxMessageRepository">The inbox message repository.</param>
    /// <param name="applicationSettingContext">The application setting context.</param>
    /// <param name="currentBusMessageIdentity">The current bus message identity.</param>
    /// <param name="eventSourceUow">The event source unit of work.</param>
    /// <param name="cancellationToken">The cancellation token.</param>
    protected async Task HandleExecutingInboxConsumerAsync(
        TEvent @event,
        IServiceProvider serviceProvider,
        PlatformInboxConfig inboxConfig,
        IPlatformInboxBusMessageRepository inboxMessageRepository,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformBusMessageIdentity currentBusMessageIdentity,
        IPlatformUnitOfWork eventSourceUow,
        CancellationToken cancellationToken
    )
    {
        var eventSubQueuePrefix = @event.As<IPlatformSubMessageQueuePrefixSupport>()?.SubQueuePrefix();

        await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            () =>
                PlatformInboxMessageBusConsumerHelper.HandleExecutingInboxConsumerAsync(
                    rootServiceProvider: RootServiceProvider,
                    currentScopeServiceProvider: serviceProvider,
                    consumerType: typeof(PlatformCqrsEventInboxBusMessageConsumer),
                    inboxBusMessageRepository: inboxMessageRepository,
                    inboxConfig: inboxConfig,
                    applicationSettingContext: applicationSettingContext,
                    message: CqrsEventInboxBusMessage(@event, eventHandlerType: GetType(), applicationSettingContext, currentBusMessageIdentity),
                    forApplicationName: ApplicationSettingContext.ApplicationName,
                    routingKey: PlatformBusMessageRoutingKey.BuildDefaultRoutingKey(@event.GetType(), applicationSettingContext.ApplicationName),
                    loggerFactory: CreateGlobalLogger,
                    retryProcessFailedMessageInSecondsUnit: PlatformInboxBusMessage.DefaultRetryProcessFailedMessageInSecondsUnit,
                    handleExistingInboxMessage: null,
                    currentScopeConsumerInstance: null,
                    handleInUow: eventSourceUow,
                    autoDeleteProcessedMessageImmediately: AutoDeleteProcessedInboxEventMessage
                                                           && RootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled != true,
                    subQueueMessageIdPrefix:
                    $"{GetType().GetNameOrGenericTypeName()}-{eventSubQueuePrefix.Pipe(p => p.IsNullOrEmpty() ? $"NoSubQueueRandomId-{Ulid.NewUlid()}" : p)}",
                    needToCheckAnySameSubQueueMessageIdPrefixOtherPreviousNotProcessedMessage: eventSubQueuePrefix.IsNotNullOrEmpty(),
                    allowHandleNewInboxMessageInBackground: true,
                    allowTryConsumeMessageImmediatelyBeforeCreateInboxMessage: false,
                    cancellationToken: cancellationToken
                ),
            retryCount: RetryEventInboxBusMessageConsumerMaxCount,
            sleepDurationProvider: retryAttempt =>
                Math.Min(RetryEventInboxBusMessageConsumerOnFailedDelaySeconds + retryAttempt, RetryEventInboxBusMessageConsumerOnFailedDelayMaxSeconds).Seconds(),
            cancellationToken: cancellationToken,
            onRetry: (exception, retryTime, retryAttempt, context) =>
                Logger.Value.LogError(
                    exception.BeautifyStackTrace(),
                    "Execute inbox consumer for EventType:{EventType}; Event:{@Event}.",
                    @event.GetType().FullName,
                    @event)
        );
    }

    /// <summary>
    /// Creates a CQRS event inbox bus message.
    /// </summary>
    /// <param name="event">The event.</param>
    /// <param name="eventHandlerType">The event handler type.</param>
    /// <param name="applicationSettingContext">The application setting context.</param>
    /// <param name="currentBusMessageIdentity">The current bus message identity.</param>
    /// <returns>A new platform bus message.</returns>
    protected virtual PlatformBusMessage<PlatformCqrsEventBusMessagePayload> CqrsEventInboxBusMessage(
        TEvent @event,
        Type eventHandlerType,
        IPlatformApplicationSettingContext applicationSettingContext,
        PlatformBusMessageIdentity currentBusMessageIdentity
    )
    {
        return PlatformBusMessage<PlatformCqrsEventBusMessagePayload>.New<PlatformBusMessage<PlatformCqrsEventBusMessagePayload>>(
            trackId: @event.Id,
            payload: PlatformCqrsEventBusMessagePayload.New(@event, eventHandlerType.FullName),
            identity: currentBusMessageIdentity,
            producerContext: applicationSettingContext.ApplicationName,
            messageGroup: nameof(PlatformCqrsEvent),
            messageAction: @event.EventAction,
            requestContext: @event.RequestContext
        );
    }

    /// <summary>
    /// Tries to get the current or created active unit of work.
    /// </summary>
    /// <param name="notification">The notification.</param>
    /// <returns>The unit of work if it exists; otherwise, null.</returns>
    protected IPlatformUnitOfWork? TryGetCurrentOrCreatedActiveUow(TEvent notification)
    {
        if (notification.As<IPlatformUowEvent>() == null)
            return null;

        return UnitOfWorkManager.TryGetCurrentOrCreatedActiveUow(notification.As<IPlatformUowEvent>().SourceUowId);
    }

    /// <summary>
    /// Builds the current bus message identity from the event request context.
    /// </summary>
    /// <param name="eventRequestContext">The event request context.</param>
    /// <returns>The platform bus message identity.</returns>
    public virtual PlatformBusMessageIdentity BuildCurrentBusMessageIdentity(IDictionary<string, object> eventRequestContext)
    {
        return new PlatformBusMessageIdentity
        {
            UserId = eventRequestContext.UserId(),
            RequestId = eventRequestContext.RequestId(),
            UserName = eventRequestContext.UserName()
        };
    }

    /// <summary>
    /// Creates a global logger.
    /// </summary>
    /// <returns>An ILogger instance.</returns>
    public ILogger CreateGlobalLogger()
    {
        return CreateLogger(RootServiceProvider.GetRequiredService<ILoggerFactory>());
    }
}
