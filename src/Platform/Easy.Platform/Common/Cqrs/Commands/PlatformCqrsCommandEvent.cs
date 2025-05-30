#region

using Easy.Platform.Common.Cqrs.Events;

#endregion

namespace Easy.Platform.Common.Cqrs.Commands;

/// <summary>
/// Abstract base class for all Platform CQRS command events.
/// Provides foundational event structure for command execution notifications.
/// </summary>
/// <remarks>
/// Base class for command-specific events in the Platform CQRS framework.
/// Inherits from PlatformCqrsEvent to provide standard event infrastructure including:
/// - Event identification and metadata
/// - Audit tracking and correlation
/// - Execution control through ShouldExecute property
/// 
/// Command events are published after successful command execution to enable:
/// - Event-driven architecture patterns
/// - Loose coupling between services
/// - Audit trail and monitoring
/// - Integration with external systems
/// - Workflow and business process automation
/// 
/// Used across platform services for command execution notifications:
/// - Growth service: Leave request processing events
/// - Employee service: Payroll operation events
/// - Talents service: Talent management workflow events
/// - Permission Provider: Subscription management events
/// </remarks>
public abstract class PlatformCqrsCommandEvent : PlatformCqrsEvent
{
    /// <summary>
    /// Constant defining the event type identifier for all command events.
    /// Used for event categorization, filtering, and routing.
    /// </summary>
    /// <remarks>
    /// Static event type identifier that categorizes all command events.
    /// Essential for event processing systems that need to:
    /// - Filter events by type
    /// - Route events to appropriate handlers
    /// - Monitor command execution patterns
    /// - Generate metrics and analytics
    /// 
    /// Value is the class name "PlatformCqrsCommandEvent" for consistency.
    /// </remarks>
    public const string EventTypeValue = nameof(PlatformCqrsCommandEvent);
}

/// <summary>
/// Generic command event for specific command and result types.
/// Captures command execution details including input data, results, and action performed.
/// </summary>
/// <typeparam name="TCommand">The command type that was executed</typeparam>
/// <typeparam name="TCommandResult">The result type returned by command execution</typeparam>
/// <remarks>
/// Strongly-typed command event that provides complete context about command execution:
/// - Original command data for event consumers
/// - Execution result for downstream processing
/// - Action performed (typically "Executed")
/// - Audit tracking information
/// 
/// Published automatically by PlatformCqrsCommandHandler after successful command execution.
/// Event consumers can access all command context for:
/// - Business process automation
/// - Data synchronization
/// - External system integration
/// - Audit trail generation
/// - Performance monitoring
/// 
/// Constraint ensures type safety and framework compatibility.
/// Used extensively in event-driven workflows across all platform services.
/// </remarks>
public class PlatformCqrsCommandEvent<TCommand, TCommandResult> : PlatformCqrsCommandEvent
    where TCommand : class, IPlatformCqrsCommand, new()
    where TCommandResult : class, IPlatformCqrsCommandResult, new()
{
    /// <summary>
    /// Initializes a new command event with default values.
    /// Used for deserialization and framework scenarios.
    /// </summary>
    /// <remarks>
    /// Parameterless constructor required for:
    /// - JSON deserialization
    /// - Framework instantiation
    /// - Generic constraints
    /// - Message bus scenarios
    /// 
    /// Properties should be set explicitly after construction.
    /// Prefer using the parameterized constructor for normal usage.
    /// </remarks>
    public PlatformCqrsCommandEvent() { }

    /// <summary>
    /// Initializes a command event with execution details.
    /// Creates event with command data, result, and optional action information.
    /// </summary>
    /// <param name="commandData">The command that was executed</param>
    /// <param name="commandResult">The result of command execution</param>
    /// <param name="action">The action performed (defaults to null, typically "Executed")</param>
    /// <remarks>
    /// Primary constructor for creating command events with full context.
    /// Automatically extracts audit track ID from command data for correlation.
    /// Generates new ULID if command audit info is missing for event tracking.
    /// 
    /// Used by PlatformCqrsCommandHandler to create events after command execution.
    /// Ensures complete command context is available to event consumers.
    /// Critical for maintaining audit trail and enabling event-driven workflows.
    /// </remarks>
    public PlatformCqrsCommandEvent(TCommand commandData, TCommandResult commandResult, PlatformCqrsCommandEventAction? action = null)
    {
        // Extract audit track ID from command for correlation, generate new ULID if missing
        AuditTrackId = commandData.AuditInfo?.AuditTrackId ?? Ulid.NewUlid().ToString();
        CommandData = commandData;
        CommandResult = commandResult;
        Action = action;
    }

    /// <summary>
    /// Gets the event type identifier for categorization and routing.
    /// Returns the constant EventTypeValue for all command events.
    /// </summary>
    /// <value>
    /// Constant string "PlatformCqrsCommandEvent" for event type identification.
    /// Used by event processing systems for filtering and routing.
    /// </value>
    /// <remarks>
    /// Overrides base class property to provide specific event type.
    /// Essential for event processing frameworks that route based on type.
    /// Enables filtering of command events from other event types.
    /// </remarks>
    public override string EventType => EventTypeValue;

    /// <summary>
    /// Gets the event name based on the command type.
    /// Provides specific identification of which command was executed.
    /// </summary>
    /// <value>
    /// Command type name (e.g., "CreateEmployeeCommand", "ProcessPayrollCommand").
    /// Used for specific event identification and handler routing.
    /// </value>
    /// <remarks>
    /// Provides granular event identification at the command level.
    /// Enables specific event handlers for different command types.
    /// Critical for event-driven workflows that need command-specific processing.
    /// Used in monitoring and analytics for command execution tracking.
    /// </remarks>
    public override string EventName => typeof(TCommand).Name;

    /// <summary>
    /// Gets the action performed as a string representation.
    /// Indicates what action was taken during command execution.
    /// </summary>
    /// <value>
    /// String representation of the Action enum value (e.g., "Executed").
    /// May be null if no specific action was provided.
    /// </value>
    /// <remarks>
    /// Provides context about what action was performed on the command.
    /// Currently primarily used for "Executed" action.
    /// Future extensibility for additional actions like "Validated", "Started", "Failed".
    /// Essential for audit trails and process monitoring.
    /// </remarks>
    public override string EventAction => Action?.ToString();

    /// <summary>
    /// Gets or sets the original command data that was executed.
    /// Provides complete command context to event consumers.
    /// </summary>
    /// <value>
    /// The original command instance with all input parameters.
    /// Essential for event consumers that need access to command details.
    /// </value>
    /// <remarks>
    /// Contains the complete command state at execution time.
    /// Event consumers can access all command properties for:
    /// - Business logic execution
    /// - Data synchronization
    /// - External system integration
    /// - Audit trail generation
    /// 
    /// Includes audit information for correlation and tracking.
    /// Critical for event-driven workflows and integration scenarios.
    /// </remarks>
    public TCommand CommandData { get; set; }

    /// <summary>
    /// Gets or sets the action that was performed during command execution.
    /// Indicates the specific action taken (typically "Executed").
    /// </summary>
    /// <value>
    /// Enum value indicating the action performed, or null if not specified.
    /// Currently supports "Executed" action with future extensibility.
    /// </value>
    /// <remarks>
    /// Provides context about the command execution lifecycle.
    /// Currently primarily "Executed" but designed for extensibility:
    /// - Future actions could include "Started", "Validated", "Failed"
    /// - Enables fine-grained event handling
    /// - Supports complex workflow scenarios
    /// 
    /// Nullable to support scenarios where action context isn't relevant.
    /// </remarks>
    public PlatformCqrsCommandEventAction? Action { get; set; }

    /// <summary>
    /// Gets or sets the result of command execution.
    /// Provides command output and status information to event consumers.
    /// </summary>
    /// <value>
    /// Command execution result with status, data, and error information.
    /// Defaults to new instance for type safety.
    /// </value>
    /// <remarks>
    /// Contains complete command execution outcome including:
    /// - Success/failure status
    /// - Return data from command
    /// - Error information if applicable
    /// - Validation results
    /// 
    /// Event consumers can use result data for:
    /// - Conditional workflow processing
    /// - Error handling and compensation
    /// - Data synchronization
    /// - Performance monitoring
    /// 
    /// Default initialization ensures event is always in valid state.
    /// </remarks>
    public TCommandResult CommandResult { get; set; } = new();
}

/// <summary>
/// Simplified command event for commands using default result type.
/// Provides convenient event type for commands that don't need custom results.
/// </summary>
/// <typeparam name="TCommand">The command type that was executed</typeparam>
/// <remarks>
/// Convenience class for commands using standard PlatformCqrsCommandResult.
/// Eliminates need to specify generic result type for simple command events.
/// 
/// Use this class when:
/// - Command uses default result type
/// - No custom result data is required
/// - Standard success/failure indication is sufficient
/// 
/// Use PlatformCqrsCommandEvent&lt;TCommand, TCommandResult&gt; when:
/// - Command returns custom result type
/// - Specific result data is needed by event consumers
/// - Complex result structure is required
/// 
/// Inherits all functionality from generic base class.
/// Provides same event processing capabilities with simplified usage.
/// </remarks>
public class PlatformCqrsCommandEvent<TCommand> : PlatformCqrsCommandEvent<TCommand, PlatformCqrsCommandResult>
    where TCommand : class, IPlatformCqrsCommand, new()
{
}

/// <summary>
/// Enumeration of possible actions that can be performed during command execution.
/// Provides standardized action identification for command events.
/// </summary>
/// <remarks>
/// Defines the lifecycle actions that can occur during command processing.
/// Currently focused on execution completion but designed for extensibility.
/// 
/// Current values:
/// - Executed: Command has completed execution (success or failure)
/// 
/// Future potential values:
/// - Started: Command execution has begun
/// - Validated: Command validation has completed
/// - Failed: Command execution has failed
/// - Compensated: Compensation logic has been executed
/// 
/// Used by event consumers to understand command execution context.
/// Essential for workflow automation and process monitoring.
/// Enables fine-grained event handling based on execution lifecycle.
/// </remarks>
public enum PlatformCqrsCommandEventAction
{
    /// <summary>
    /// Indicates that command execution has completed.
    /// Published after successful command processing and result generation.
    /// </summary>
    /// <remarks>
    /// Primary action indicating command has finished execution.
    /// Published regardless of business logic success/failure.
    /// Event consumers should check CommandResult for execution outcome.
    /// Used for completion notifications and downstream processing triggers.
    /// </remarks>
    Executed
}
