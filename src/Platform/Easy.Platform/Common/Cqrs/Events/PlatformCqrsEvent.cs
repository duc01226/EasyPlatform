#region

using System.Text.Json.Serialization;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.RequestContext;
using Easy.Platform.Common.Timing;
using MediatR;

#endregion

namespace Easy.Platform.Common.Cqrs.Events;

/// <summary>
/// Interface defining the contract for all Platform CQRS events.
/// Provides standardized event structure for domain event handling and notification patterns.
/// </summary>
/// <remarks>
/// Core interface for event-driven architecture in the Platform CQRS framework.
/// Extends MediatR's INotification to leverage the mediator pattern for event distribution.
/// 
/// Key features:
/// - Event identification and metadata management
/// - Audit tracking with correlation IDs
/// - Request context preservation across event boundaries
/// - Execution control for synchronous vs asynchronous handler execution
/// - Flexible handler execution strategies
/// 
/// Event lifecycle:
/// 1. Event creation with automatic metadata population
/// 2. Request context capture for correlation
/// 3. Handler discovery and execution planning
/// 4. Execution based on synchronous/asynchronous requirements
/// 5. Result aggregation and completion
/// 
/// Used extensively for:
/// - Domain event publishing after command execution
/// - Cross-service communication and integration
/// - Audit trail and monitoring
/// - Business process automation
/// - Workflow orchestration
/// 
/// Integration points:
/// - MediatR for event distribution and handler discovery
/// - Request context for correlation and user tracking
/// - Background job processing for asynchronous execution
/// - Distributed tracing for cross-service visibility
/// </remarks>
public interface IPlatformCqrsEvent : INotification
{
    /// <summary>
    /// Gets or sets the audit tracking identifier for event correlation.
    /// Used to correlate this event with originating commands and queries.
    /// </summary>
    /// <value>
    /// ULID string that uniquely identifies the event execution context.
    /// Typically inherited from the originating command's audit information.
    /// </value>
    /// <remarks>
    /// Essential for distributed tracing and audit trail correlation.
    /// Enables tracking event flow across service boundaries.
    /// Automatically generated if not provided during event creation.
    /// Used by monitoring and debugging tools for request correlation.
    /// </remarks>
    string AuditTrackId { get; set; }

    /// <summary>
    /// Gets the UTC timestamp when this event was created.
    /// Provides precise timing information for event ordering and analysis.
    /// </summary>
    /// <value>
    /// UTC DateTime representing when the event was instantiated.
    /// Used for event ordering, performance analysis, and audit purposes.
    /// </value>
    /// <remarks>
    /// Immutable property set during event construction.
    /// Always in UTC for consistency across time zones.
    /// Critical for event sourcing and temporal query patterns.
    /// Used by event stores and audit systems for chronological ordering.
    /// </remarks>
    DateTime CreatedDate { get; }

    /// <summary>
    /// Gets or sets the identifier of the user who triggered this event.
    /// Provides user context for security and audit purposes.
    /// </summary>
    /// <value>
    /// User identifier or system account that initiated the event.
    /// May be null for system-generated or scheduled events.
    /// </value>
    /// <remarks>
    /// Essential for security auditing and user activity tracking.
    /// Inherited from command audit information when available.
    /// Used for authorization checks in event handlers.
    /// May represent service accounts for inter-service events.
    /// </remarks>
    string CreatedBy { get; set; }

    /// <summary>
    /// Gets the type categorization of this event.
    /// Used for event filtering, routing, and processing decisions.
    /// </summary>
    /// <value>
    /// String identifier representing the broad category of event.
    /// Examples: "PlatformCqrsCommandEvent", "DomainEvent", "IntegrationEvent".
    /// </value>
    /// <remarks>
    /// Abstract property implemented by concrete event classes.
    /// Enables event processing systems to categorize and route events.
    /// Used by event handlers for filtering and subscription management.
    /// Critical for event-driven architecture and integration patterns.
    /// </remarks>
    string EventType { get; }

    /// <summary>
    /// Gets the specific name identifier of this event.
    /// Provides granular event identification for handler routing.
    /// </summary>
    /// <value>
    /// String identifier representing the specific event occurrence.
    /// Examples: "EmployeeCreated", "PayrollProcessed", "LeaveRequestApproved".
    /// </value>
    /// <remarks>
    /// Abstract property providing specific event identification.
    /// Enables fine-grained event handler subscription and routing.
    /// Used by event processors for specific event type handling.
    /// Essential for business process automation and workflow triggers.
    /// </remarks>
    string EventName { get; }

    /// <summary>
    /// Gets the action performed that triggered this event.
    /// Indicates the specific operation or lifecycle stage.
    /// </summary>
    /// <value>
    /// String identifier representing the action performed.
    /// Examples: "Created", "Updated", "Deleted", "Executed", "Approved".
    /// </value>
    /// <remarks>
    /// Abstract property indicating the event trigger action.
    /// Enables action-specific event handling and business logic.
    /// Used for fine-grained event processing and state management.
    /// Critical for event sourcing and audit trail generation.
    /// </remarks>
    string EventAction { get; }

    /// <summary>
    /// Gets the unique identifier for this specific event instance.
    /// Combines action and audit track ID for unique event identification.
    /// </summary>
    /// <value>
    /// Composite identifier in format "{EventAction}-{AuditTrackId}".
    /// Provides unique identification for event deduplication and tracking.
    /// </value>
    /// <remarks>
    /// Computed property providing unique event instance identification.
    /// Essential for event deduplication and idempotency handling.
    /// Used by event stores and processing systems for uniqueness.
    /// Enables reliable event processing and exactly-once delivery.
    /// </remarks>
    string Id { get; }

    /// <summary>
    /// Gets or sets the stack trace information for debugging purposes.
    /// Captures execution context when distributed tracing is enabled.
    /// </summary>
    /// <value>
    /// Stack trace string showing the call hierarchy when event was created.
    /// Null when distributed tracing is disabled for performance.
    /// </value>
    /// <remarks>
    /// Debugging aid for development and troubleshooting scenarios.
    /// Only populated when PlatformModule.DistributedTracingConfig.Enabled is true.
    /// Provides deep execution context for complex event flows.
    /// Should be excluded from production logging for performance and security.
    /// </remarks>
    string? StackTrace { get; set; }

    /// <summary>
    /// Gets or sets the request context dictionary for event correlation.
    /// Stores contextual information from the originating request.
    /// </summary>
    /// <value>
    /// Dictionary containing key-value pairs of contextual information.
    /// Preserves request context across event boundaries for correlation.
    /// </value>
    /// <remarks>
    /// Essential for maintaining request context across event processing.
    /// Contains information such as:
    /// - User context and security information
    /// - Correlation IDs and tracking data
    /// - Request metadata and custom properties
    /// - Service context and routing information
    /// 
    /// Used by event handlers to access originating request context.
    /// Critical for security, auditing, and cross-service correlation.
    /// </remarks>
    Dictionary<string, object> RequestContext { get; set; }

    /// <summary>
    /// Gets or sets the collection of handler types that must complete execution immediately.
    /// Controls synchronous vs asynchronous handler execution behavior.
    /// </summary>
    /// <value>
    /// HashSet of full type names for handlers requiring immediate execution.
    /// Empty or null indicates all handlers can execute asynchronously.
    /// </value>
    /// <remarks>
    /// Advanced execution control for critical event handlers.
    /// By default, event handlers execute asynchronously in background threads.
    /// Use this property to force specific handlers to execute synchronously.
    /// 
    /// Common scenarios for immediate execution:
    /// - Critical business validation that must complete before response
    /// - Data consistency requirements across multiple systems
    /// - Compensation logic that must execute before transaction commit
    /// - Security checks that must complete before proceeding
    /// 
    /// Performance consideration: Synchronous execution impacts response time.
    /// Use sparingly and only when business requirements demand immediate completion.
    /// </remarks>
    HashSet<string> WaitHandlerExecutionFinishedImmediatelyFullNames { get; set; }

    /// <summary>
    /// Configures specific event handler types to execute immediately before continuing.
    /// Provides fine-grained control over handler execution timing.
    /// </summary>
    /// <param name="eventHandlerTypes">Array of handler types that must complete immediately</param>
    /// <returns>The event instance for method chaining</returns>
    /// <remarks>
    /// Method for specifying handlers that must complete before the command returns.
    /// 
    /// Default behavior:
    /// - Event handlers execute in background threads
    /// - Command returns immediately without waiting
    /// - Provides optimal response time and system throughput
    /// 
    /// Use immediate execution when:
    /// - Handler performs critical validation
    /// - Data consistency requires immediate completion
    /// - Business rules demand synchronous processing
    /// - Compensation logic must execute before commit
    /// 
    /// The method accepts Type objects representing handler classes.
    /// Full type names are stored for efficient lookup during execution.
    /// Multiple handlers can be specified for complex execution requirements.
    /// 
    /// Performance impact: Immediate execution increases response time.
    /// Use judiciously and only when business requirements mandate synchronous execution.
    /// </remarks>
    PlatformCqrsEvent SetWaitHandlerExecutionFinishedImmediately(params Type[] eventHandlerTypes);

    /// <summary>
    /// Generic version of SetWaitHandlerExecutionFinishedImmediately for type-safe handler specification.
    /// Provides compile-time type safety for handler and event type relationships.
    /// </summary>
    /// <typeparam name="THandler">The handler type that must execute immediately</typeparam>
    /// <typeparam name="TEvent">The event type that the handler processes</typeparam>
    /// <returns>The event instance for method chaining</returns>
    /// <remarks>
    /// Type-safe wrapper around the core SetWaitHandlerExecutionFinishedImmediately method.
    /// Provides compile-time verification of handler and event type compatibility.
    /// 
    /// Generic constraints ensure:
    /// - THandler implements IPlatformCqrsEventHandler&lt;TEvent&gt;
    /// - TEvent inherits from PlatformCqrsEvent and has parameterless constructor
    /// - Type safety and proper handler-event relationships
    /// 
    /// Preferred method when handler types are known at compile time.
    /// Eliminates runtime type errors and provides better IntelliSense support.
    /// </remarks>
    PlatformCqrsEvent SetWaitHandlerExecutionFinishedImmediately<THandler, TEvent>()
        where THandler : IPlatformCqrsEventHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new();

    /// <summary>
    /// Determines whether a specific event handler type must execute immediately.
    /// Used by the event processing pipeline to control execution flow.
    /// </summary>
    /// <param name="eventHandlerType">The handler type to check for immediate execution requirement</param>
    /// <returns>True if the handler must execute immediately; false if it can execute asynchronously</returns>
    /// <remarks>
    /// Core method used by the event processing infrastructure to determine execution strategy.
    /// 
    /// Used in DoHandle method of PlatformCqrsEventHandler to decide:
    /// - Immediate execution: Handler runs in current thread with active UoW
    /// - Background execution: Handler queued for background processing
    /// 
    /// Decision logic:
    /// - Checks if handler type's full name is in WaitHandlerExecutionFinishedImmediatelyFullNames
    /// - Returns true for immediate execution, false for background execution
    /// - Handles null/empty collections gracefully
    /// 
    /// Performance implications:
    /// - Immediate execution blocks current request until handler completes
    /// - Background execution provides better responsiveness but eventual consistency
    /// - Critical for balancing performance with business requirements
    /// 
    /// Used by framework infrastructure, typically not called directly by application code.
    /// </remarks>
    bool MustWaitHandlerExecutionFinishedImmediately(Type eventHandlerType);

    /// <summary>
    /// Retrieves a typed value from the request context dictionary.
    /// Provides strongly-typed access to contextual information.
    /// </summary>
    /// <typeparam name="T">The expected type of the context value</typeparam>
    /// <param name="contextKey">The key identifying the context value</param>
    /// <returns>The typed context value</returns>
    /// <remarks>
    /// Type-safe method for accessing request context values.
    /// Throws KeyNotFoundException if the key is not found.
    /// Provides automatic type conversion when possible.
    /// 
    /// Common context keys:
    /// - User information and security context
    /// - Correlation and tracking identifiers
    /// - Request metadata and custom properties
    /// - Service context and routing information
    /// 
    /// Used by event handlers to access originating request information.
    /// Essential for maintaining context across event processing boundaries.
    /// </remarks>
    /// <exception cref="KeyNotFoundException">Thrown when the context key is not found</exception>
    /// <exception cref="ArgumentNullException">Thrown when contextKey is null</exception>
    T GetRequestContextValue<T>(string contextKey);

    /// <summary>
    /// Sets multiple request context values from a dictionary.
    /// Provides batch update capability for request context information.
    /// </summary>
    /// <param name="values">Dictionary of key-value pairs to add to request context</param>
    /// <returns>The event instance for method chaining</returns>
    /// <remarks>
    /// Batch method for setting multiple context values efficiently.
    /// Existing keys are updated with new values (upsert behavior).
    /// 
    /// Used for:
    /// - Copying context from originating requests
    /// - Setting multiple related context values
    /// - Preserving request state across event boundaries
    /// - Enriching events with additional metadata
    /// 
    /// Each key-value pair is added to the RequestContext dictionary.
    /// Existing keys are overwritten with new values.
    /// Enables fluent API usage through method chaining.
    /// </remarks>
    PlatformCqrsEvent SetRequestContextValues(IDictionary<string, object> values);

    /// <summary>
    /// Sets a single request context value with type safety.
    /// Provides strongly-typed context value assignment.
    /// </summary>
    /// <typeparam name="TValue">The type of the context value</typeparam>
    /// <param name="key">The key identifying the context value</param>
    /// <param name="value">The typed value to store in context</param>
    /// <returns>The event instance for method chaining</returns>
    /// <remarks>
    /// Type-safe method for setting individual context values.
    /// Provides compile-time type checking for context values.
    /// 
    /// Common usage patterns:
    /// - Setting user context information
    /// - Storing correlation identifiers
    /// - Adding custom metadata
    /// - Preserving request-specific data
    /// 
    /// Uses upsert behavior - existing keys are updated with new values.
    /// Enables fluent API usage through method chaining.
    /// </remarks>
    PlatformCqrsEvent SetRequestContextValue<TValue>(string key, TValue value);
}

/// <summary>
/// Abstract base class providing default implementation for Platform CQRS events.
/// Provides concrete implementation of event infrastructure and metadata management.
/// </summary>
/// <remarks>
/// Foundation class for all Platform CQRS events implementing IPlatformCqrsEvent interface.
/// Provides automatic metadata generation, request context management, and execution control.
/// 
/// Key features:
/// - Automatic audit tracking and correlation ID generation
/// - Request context preservation across event boundaries
/// - Flexible handler execution control (sync vs async)
/// - Additional metadata storage for extensibility
/// - Integration with platform timing and tracing systems
/// 
/// Default behavior:
/// - Generates ULID for audit tracking if not provided
/// - Sets creation timestamp to current UTC time
/// - Initializes empty collections for contexts and metadata
/// - Configures asynchronous handler execution by default
/// 
/// Extensibility:
/// - Abstract properties require implementation by derived classes
/// - Virtual methods can be overridden for custom behavior
/// - Additional metadata dictionary for custom properties
/// - Request context system for cross-boundary correlation
/// 
/// Used as base class for:
/// - Domain events in business logic
/// - Integration events for cross-service communication
/// - Command events for audit and monitoring
/// - System events for infrastructure concerns
/// 
/// Integration with platform systems:
/// - Clock service for consistent timestamps
/// - Request context helper for correlation
/// - JSON serialization for event persistence
/// - MediatR notification system for distribution
/// </remarks>
public abstract class PlatformCqrsEvent : IPlatformCqrsEvent
{
    /// <summary>
    /// Gets or sets additional metadata dictionary for custom event properties.
    /// Provides extensibility point for domain-specific event data.
    /// </summary>
    /// <value>
    /// Dictionary containing custom key-value pairs for additional event metadata.
    /// Initialized as empty dictionary, can be populated by derived classes.
    /// </value>
    /// <remarks>
    /// Extensibility mechanism for adding custom properties to events.
    /// Useful for domain-specific metadata that doesn't fit standard properties.
    /// 
    /// Common usage:
    /// - Business-specific identifiers and references
    /// - Performance metrics and timing information
    /// - Integration-specific routing and configuration data
    /// - Custom audit and compliance information
    /// 
    /// Separate from RequestContext which is for request correlation.
    /// Can be serialized with event for persistence and transmission.
    /// </remarks>
    public Dictionary<string, object> AdditionalMetadata { get; set; } = [];

    /// <summary>
    /// Gets or sets the audit tracking identifier for event correlation.
    /// Automatically generated using ULID if not explicitly set.
    /// </summary>
    /// <value>
    /// ULID string providing unique, time-ordered event identification.
    /// Generated automatically during construction for reliable tracking.
    /// </value>
    /// <remarks>
    /// Core audit property enabling event correlation across distributed systems.
    /// ULID (Universally Unique Lexicographically Sortable Identifier) provides:
    /// - 128-bit uniqueness compatible with UUID
    /// - Lexicographic sorting based on creation time
    /// - Base32 encoding for efficient storage and transmission
    /// 
    /// Typically inherited from originating command's audit information.
    /// Essential for distributed tracing and debugging scenarios.
    /// Used by monitoring systems for request flow visualization.
    /// </remarks>
    public string AuditTrackId { get; set; } = Ulid.NewUlid().ToString();

    /// <summary>
    /// Gets the UTC timestamp when this event was created.
    /// Set automatically during construction using platform Clock service.
    /// </summary>
    /// <value>
    /// UTC DateTime representing exact event creation time.
    /// Immutable property set once during object construction.
    /// </value>
    /// <remarks>
    /// Immutable timestamp providing precise event creation timing.
    /// Uses platform Clock.UtcNow for consistent time handling across services.
    /// 
    /// Critical for:
    /// - Event ordering and sequencing
    /// - Performance analysis and monitoring
    /// - Audit trail and compliance reporting
    /// - Temporal queries and event sourcing
    /// 
    /// Always in UTC to ensure consistency across time zones.
    /// Set once during construction to prevent manipulation.
    /// </remarks>
    public DateTime CreatedDate { get; } = Clock.UtcNow;

    /// <summary>
    /// Gets or sets the identifier of the user who triggered this event.
    /// Provides user context for security and audit purposes.
    /// </summary>
    /// <value>
    /// User identifier string or null for system-initiated events.
    /// Typically inherited from command audit information.
    /// </value>
    /// <remarks>
    /// User context property for security auditing and accountability.
    /// May represent:
    /// - Individual user accounts
    /// - Service accounts for inter-service communication
    /// - System accounts for automated processes
    /// - Null for anonymous or system-generated events
    /// 
    /// Used by event handlers for:
    /// - Authorization and security checks
    /// - User activity tracking and analytics
    /// - Audit trail and compliance reporting
    /// - Personalization and user-specific processing
    /// </remarks>
    public string CreatedBy { get; set; }

    /// <summary>
    /// Gets the type categorization of this event.
    /// Abstract property that must be implemented by derived classes.
    /// </summary>
    /// <value>
    /// String identifier representing the broad category of event.
    /// Examples: "DomainEvent", "IntegrationEvent", "CommandEvent".
    /// </value>
    /// <remarks>
    /// Abstract property requiring implementation by concrete event classes.
    /// Provides high-level event categorization for:
    /// - Event filtering and routing systems
    /// - Handler subscription and discovery
    /// - Monitoring and analytics grouping
    /// - Integration pattern identification
    /// 
    /// Should return consistent values for event class hierarchies.
    /// Used by event processing infrastructure for categorization.
    /// </remarks>
    public abstract string EventType { get; }

    /// <summary>
    /// Gets the specific name identifier of this event.
    /// Abstract property that must be implemented by derived classes.
    /// </summary>
    /// <value>
    /// String identifier representing the specific event occurrence.
    /// Examples: "EmployeeCreated", "PayrollProcessed", "OrderCompleted".
    /// </value>
    /// <remarks>
    /// Abstract property providing granular event identification.
    /// Used for:
    /// - Specific event handler routing and subscription
    /// - Business process triggers and automation
    /// - Event analytics and reporting
    /// - Integration endpoint mapping
    /// 
    /// Should be descriptive and follow consistent naming conventions.
    /// Typically reflects the domain entity and action performed.
    /// </remarks>
    public abstract string EventName { get; }

    /// <summary>
    /// Gets the action performed that triggered this event.
    /// Abstract property that must be implemented by derived classes.
    /// </summary>
    /// <value>
    /// String identifier representing the action performed.
    /// Examples: "Created", "Updated", "Deleted", "Approved", "Executed".
    /// </value>
    /// <remarks>
    /// Abstract property indicating the specific action that occurred.
    /// Used for:
    /// - Action-specific event handling logic
    /// - State transition tracking and validation
    /// - Audit trail action recording
    /// - Business rule and workflow triggers
    /// 
    /// Should follow consistent action naming conventions.
    /// Typically represents CRUD operations or business actions.
    /// </remarks>
    public abstract string EventAction { get; }

    /// <summary>
    /// Gets the unique identifier for this specific event instance.
    /// Computed property combining action and audit track ID.
    /// </summary>
    /// <value>
    /// Composite identifier in format "{EventAction}-{AuditTrackId}".
    /// Provides globally unique identification for this event instance.
    /// </value>
    /// <remarks>
    /// Computed property ensuring unique event instance identification.
    /// Format: "{EventAction}-{AuditTrackId}" provides both context and uniqueness.
    /// 
    /// Used for:
    /// - Event deduplication and idempotency handling
    /// - Event store key generation
    /// - Logging and tracing correlation
    /// - Exactly-once delivery semantics
    /// 
    /// Automatically computed from existing properties.
    /// Guaranteed unique due to ULID uniqueness properties.
    /// </remarks>
    public string Id => $"{EventAction}-{AuditTrackId}";

    /// <summary>
    /// Gets or sets the stack trace information for debugging purposes.
    /// Populated when distributed tracing is enabled in platform configuration.
    /// </summary>
    /// <value>
    /// Stack trace string showing execution context when event was created.
    /// Null when distributed tracing is disabled for performance optimization.
    /// </value>
    /// <remarks>
    /// Debugging aid enabled through PlatformModule.DistributedTracingConfig.Enabled setting.
    /// Provides detailed execution context for complex event flow debugging.
    /// 
    /// When enabled, captures:
    /// - Complete call stack at event creation
    /// - Method names and line numbers
    /// - Assembly and namespace information
    /// - Execution flow through layers
    /// 
    /// Performance considerations:
    /// - Stack trace capture has overhead
    /// - Should be disabled in production for performance
    /// - Only enable for debugging and development scenarios
    /// 
    /// Security considerations:
    /// - Stack traces may expose internal implementation details
    /// - Should be excluded from external logging and transmission
    /// - Filter sensitive information before logging
    /// </remarks>
    public string? StackTrace { get; set; }

    /// <summary>
    /// Gets or sets the request context dictionary for preserving originating request information.
    /// Stores contextual data from the command or query that generated this event.
    /// </summary>
    /// <value>
    /// Dictionary containing key-value pairs of contextual information.
    /// Initialized as empty dictionary, populated during event creation.
    /// </value>
    /// <remarks>
    /// Essential mechanism for preserving request context across event boundaries.
    /// Enables event handlers to access originating request information.
    /// 
    /// Common context data:
    /// - User identity and security claims
    /// - Correlation and tracking identifiers
    /// - Request metadata and custom properties
    /// - Service routing and configuration data
    /// - Business context and tenant information
    /// 
    /// Used by event handlers for:
    /// - Security and authorization decisions
    /// - Request correlation and tracing
    /// - User-specific processing logic
    /// - Multi-tenant routing and isolation
    /// 
    /// Preserved across event processing boundaries for consistency.
    /// Critical for maintaining request context in distributed scenarios.
    /// </remarks>
    public Dictionary<string, object> RequestContext { get; set; } = [];

    /// <summary>
    /// Gets or sets the collection of handler types requiring immediate execution.
    /// Controls whether handlers execute synchronously or asynchronously.
    /// </summary>
    /// <value>
    /// HashSet of full type names for handlers requiring immediate completion.
    /// Null or empty indicates all handlers execute asynchronously.
    /// </value>
    /// <remarks>
    /// Advanced execution control for critical event handlers.
    /// JsonIgnore attribute prevents serialization of this execution control data.
    /// 
    /// Default behavior: Asynchronous execution
    /// - Handlers execute in background threads
    /// - Commands return immediately for better responsiveness
    /// - Eventual consistency model
    /// 
    /// Immediate execution scenarios:
    /// - Critical validation that must complete before response
    /// - Data consistency requirements across systems
    /// - Compensation logic requiring synchronous execution
    /// - Security checks that must complete before proceeding
    /// 
    /// Performance impact: Immediate execution increases response latency.
    /// Use judiciously based on business requirements vs performance trade-offs.
    /// </remarks>
    [JsonIgnore]
    public HashSet<string> WaitHandlerExecutionFinishedImmediatelyFullNames { get; set; }

    /// <summary>
    /// Configures specific event handler types to execute immediately before continuing.
    /// Stores full type names of handlers requiring synchronous execution.
    /// </summary>
    /// <param name="eventHandlerTypes">Array of handler types that must complete immediately</param>
    /// <returns>The event instance for fluent API method chaining</returns>
    /// <remarks>
    /// Core method for configuring synchronous handler execution requirements.
    /// Converts Type objects to full name strings for efficient storage and lookup.
    /// 
    /// Configuration workflow:
    /// 1. Extract full type names from provided Type objects
    /// 2. Store in HashSet for O(1) lookup performance
    /// 3. Return event instance for method chaining
    /// 
    /// Used when handlers must complete before command response:
    /// - Critical business validation
    /// - Data consistency enforcement
    /// - Security and authorization checks
    /// - Compensation and rollback logic
    /// 
    /// Performance considerations:
    /// - Immediate execution blocks request thread
    /// - Increases response time and resource usage
    /// - Use only when business requirements mandate synchronous execution
    /// 
    /// Thread safety: Replaces entire collection, not thread-safe for concurrent modification.
    /// </remarks>
    public virtual PlatformCqrsEvent SetWaitHandlerExecutionFinishedImmediately(params Type[] eventHandlerTypes)
    {
        // Convert handler types to full names and store in HashSet for efficient lookup
        WaitHandlerExecutionFinishedImmediatelyFullNames = eventHandlerTypes.Select(p => p.FullName).ToHashSet();

        return this;
    }

    /// <summary>
    /// Generic type-safe version for configuring immediate handler execution.
    /// Provides compile-time type checking for handler and event relationships.
    /// </summary>
    /// <typeparam name="THandler">The handler type that must execute immediately</typeparam>
    /// <typeparam name="TEvent">The event type that the handler processes</typeparam>
    /// <returns>The event instance for fluent API method chaining</returns>
    /// <remarks>
    /// Type-safe wrapper providing compile-time verification of handler-event relationships.
    /// Generic constraints ensure proper interface implementation and type compatibility.
    /// 
    /// Constraints enforce:
    /// - THandler implements IPlatformCqrsEventHandler&lt;TEvent&gt;
    /// - TEvent inherits from PlatformCqrsEvent with parameterless constructor
    /// - Compile-time type safety and IntelliSense support
    /// 
    /// Delegates to the core SetWaitHandlerExecutionFinishedImmediately method.
    /// Preferred when handler types are known at compile time.
    /// Eliminates runtime type errors and improves code maintainability.
    /// </remarks>
    public virtual PlatformCqrsEvent SetWaitHandlerExecutionFinishedImmediately<THandler, TEvent>()
        where THandler : IPlatformCqrsEventHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
        // Delegate to main method with type safety
        return SetWaitHandlerExecutionFinishedImmediately(typeof(THandler));
    }

    /// <summary>
    /// Determines whether a specific event handler type must execute immediately.
    /// Used by event processing infrastructure to control execution flow.
    /// </summary>
    /// <param name="eventHandlerType">The handler type to check for immediate execution requirement</param>
    /// <returns>True if handler must execute immediately; false for asynchronous execution</returns>
    /// <remarks>
    /// Core decision method used by event processing pipeline to determine execution strategy.
    /// Called by PlatformCqrsEventHandler.DoHandle to choose execution path.
    /// 
    /// Decision logic:
    /// - Returns true if handler's full name exists in immediate execution collection
    /// - Returns false for null/empty collection (default asynchronous behavior)
    /// - Handles null collection gracefully
    /// 
    /// Execution implications:
    /// - True: Handler executes in current thread with active Unit of Work
    /// - False: Handler queued for background execution
    /// 
    /// Performance impact:
    /// - Immediate execution blocks current request until completion
    /// - Background execution provides better system responsiveness
    /// - Critical balance between consistency and performance
    /// 
    /// Thread safety: Read-only operation, safe for concurrent access.
    /// </remarks>
    public bool MustWaitHandlerExecutionFinishedImmediately(Type eventHandlerType)
    {
        // Check if handler type's full name is configured for immediate execution
        return WaitHandlerExecutionFinishedImmediatelyFullNames?.Contains(eventHandlerType.FullName) == true;
    }

    /// <summary>
    /// Retrieves a strongly-typed value from the request context dictionary.
    /// Provides type-safe access to contextual information with automatic conversion.
    /// </summary>
    /// <typeparam name="T">The expected type of the context value</typeparam>
    /// <param name="contextKey">The key identifying the context value to retrieve</param>
    /// <returns>The typed context value if found and convertible</returns>
    /// <remarks>
    /// Type-safe accessor for request context values with automatic type conversion.
    /// Uses PlatformRequestContextHelper for consistent value extraction and conversion.
    /// 
    /// Retrieval process:
    /// 1. Validates context key is not null
    /// 2. Attempts to find and convert value using platform helper
    /// 3. Returns typed value if found and convertible
    /// 4. Throws KeyNotFoundException if key not found
    /// 
    /// Common usage:
    /// - Accessing user identity information
    /// - Retrieving correlation identifiers
    /// - Getting request metadata and properties
    /// - Extracting business context data
    /// 
    /// Type conversion handles:
    /// - Primitive type conversions
    /// - JSON deserialization for complex types
    /// - Null value handling
    /// - Compatible type casting
    /// 
    /// Error handling: Throws exceptions for missing keys or conversion failures.
    /// </remarks>
    /// <exception cref="ArgumentNullException">Thrown when contextKey is null</exception>
    /// <exception cref="KeyNotFoundException">Thrown when context key is not found</exception>
    public T GetRequestContextValue<T>(string contextKey)
    {
        // Validate input parameter
        ArgumentNullException.ThrowIfNull(contextKey);

        // Attempt to retrieve and convert the context value
        if (PlatformRequestContextHelper.TryGetAndConvertValue(RequestContext, contextKey, out T item)) return item;

        // Throw informative exception if key not found
        throw new KeyNotFoundException($"{contextKey} not found in {nameof(RequestContext)}");
    }

    /// <summary>
    /// Sets multiple request context values from a dictionary using batch upsert.
    /// Provides efficient mechanism for copying context from originating requests.
    /// </summary>
    /// <param name="values">Dictionary of key-value pairs to add to request context</param>
    /// <returns>The event instance for fluent API method chaining</returns>
    /// <remarks>
    /// Batch update method for efficiently setting multiple context values.
    /// Uses upsert semantics - existing keys are updated, new keys are added.
    /// 
    /// Common usage scenarios:
    /// - Copying context from originating command/query
    /// - Setting multiple related context properties
    /// - Preserving request state across service boundaries
    /// - Enriching events with additional metadata
    /// 
    /// Implementation:
    /// - Iterates through provided dictionary
    /// - Performs upsert operation for each key-value pair
    /// - Updates existing keys with new values
    /// - Adds new keys to context
    /// 
    /// Performance: Efficient batch operation avoiding multiple individual calls.
    /// Thread safety: Not thread-safe, intended for single-threaded event creation.
    /// </remarks>
    public PlatformCqrsEvent SetRequestContextValues(IDictionary<string, object> values)
    {
        // Perform batch upsert of all provided values
        values.ForEach(p => RequestContext.Upsert(p.Key, p.Value));

        return this;
    }

    /// <summary>
    /// Sets a single request context value with strong typing and upsert semantics.
    /// Provides type-safe individual context value assignment.
    /// </summary>
    /// <typeparam name="TValue">The type of the context value being set</typeparam>
    /// <param name="key">The key identifying the context value</param>
    /// <param name="value">The typed value to store in context</param>
    /// <returns>The event instance for fluent API method chaining</returns>
    /// <remarks>
    /// Type-safe method for setting individual context values with compile-time type checking.
    /// Uses upsert semantics - existing keys are updated, new keys are added.
    /// 
    /// Common usage patterns:
    /// - Setting user identity information
    /// - Storing correlation identifiers
    /// - Adding custom metadata properties
    /// - Preserving business context data
    /// 
    /// Benefits:
    /// - Compile-time type safety
    /// - IntelliSense support for value types
    /// - Automatic type validation
    /// - Consistent value storage
    /// 
    /// Implementation uses Dictionary.Upsert extension for consistent behavior.
    /// Enables fluent API usage through method chaining.
    /// Thread safety: Not thread-safe, intended for single-threaded event creation.
    /// </remarks>
    public PlatformCqrsEvent SetRequestContextValue<TValue>(string key, TValue value)
    {
        // Perform upsert operation for single key-value pair
        RequestContext.Upsert(key, value);

        return this;
    }
}
