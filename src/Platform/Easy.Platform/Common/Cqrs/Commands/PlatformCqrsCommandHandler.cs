#region

using Easy.Platform.Application.Cqrs.Events;
using Easy.Platform.Common.Validations.Extensions;
using MediatR;

#endregion

namespace Easy.Platform.Common.Cqrs.Commands;

/// <summary>
/// Abstract base class for handling Platform CQRS commands with typed results.
/// Provides standardized command processing pipeline including validation, execution, and event publishing.
/// </summary>
/// <typeparam name="TCommand">The command type to handle, must inherit from PlatformCqrsCommand&lt;TResult&gt;</typeparam>
/// <typeparam name="TResult">The result type returned by command execution, must inherit from PlatformCqrsCommandResult</typeparam>
/// <remarks>
/// Core command handler providing the foundation for all command processing in the Platform CQRS framework.
/// Implements the standard command execution pipeline:
/// 1. Request validation using platform validation framework
/// 2. Command execution through abstract HandleAsync method
/// 3. Event publishing for PlatformCqrsCommandEvent if handlers are registered
/// 
/// Key features:
/// - Automatic validation with EnsureValidAsync extension
/// - Event-driven architecture with command execution events
/// - Lazy-loaded CQRS infrastructure for performance
/// - Service provider integration for dependency resolution
/// - Cancellation token support for responsive operations
/// 
/// Used extensively across platform services:
/// - Growth service: Leave request processing, attendance management
/// - Employee service: Payroll operations, employee lifecycle management
/// - Talents service: Talent acquisition workflows
/// - Permission Provider: Subscription and usage management
/// 
/// Handler discovery and registration is automatic through MediatR conventions.
/// </remarks>
public abstract class PlatformCqrsCommandHandler<TCommand, TResult>
    : PlatformCqrsRequestHandler<TCommand>, IRequestHandler<TCommand, TResult>
    where TCommand : PlatformCqrsCommand<TResult>, IPlatformCqrsRequest, new()
    where TResult : PlatformCqrsCommandResult, new()
{
    /// <summary>
    /// Lazy-loaded CQRS infrastructure for command and event processing.
    /// Provides access to SendEvent method for publishing command execution events.
    /// </summary>
    /// <remarks>
    /// Lazy loading prevents circular dependencies during service registration.
    /// Used primarily for event publishing after successful command execution.
    /// Essential for event-driven architecture and loose coupling between services.
    /// </remarks>
    protected readonly Lazy<IPlatformCqrs> Cqrs;

    /// <summary>
    /// Root service provider for dependency resolution and service discovery.
    /// Used to check for registered event handlers and resolve dependencies.
    /// </summary>
    /// <remarks>
    /// Enables dynamic event handler discovery to avoid unnecessary event publishing.
    /// Provides access to the entire service container for complex dependency scenarios.
    /// Critical for conditional event publishing based on registered handlers.
    /// </remarks>
    protected readonly IPlatformRootServiceProvider RootServiceProvider;

    /// <summary>
    /// Initializes a new instance of the command handler with required dependencies.
    /// Sets up CQRS infrastructure and service provider for command processing.
    /// </summary>
    /// <param name="cqrs">Lazy-loaded CQRS infrastructure for event publishing</param>
    /// <param name="rootServiceProvider">Root service provider for dependency resolution</param>
    /// <remarks>
    /// Constructor injection pattern ensures all required dependencies are available.
    /// Lazy CQRS prevents circular dependency issues during service container initialization.
    /// All concrete command handlers must call this base constructor.
    /// </remarks>
    public PlatformCqrsCommandHandler(Lazy<IPlatformCqrs> cqrs, IPlatformRootServiceProvider rootServiceProvider)
    {
        Cqrs = cqrs;
        RootServiceProvider = rootServiceProvider;
    }

    /// <summary>
    /// Handles command execution through the standard processing pipeline.
    /// Validates request, executes command logic, and publishes execution events.
    /// </summary>
    /// <param name="request">The command to execute</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Command execution result containing success/failure status and any return data</returns>
    /// <remarks>
    /// Standard command processing pipeline:
    /// 1. Validates request using ValidateRequestAsync (inherited from base)
    /// 2. Ensures validation passes with EnsureValidAsync extension
    /// 3. Executes command through ExecuteHandleAsync virtual method
    /// 4. Checks for registered command event handlers
    /// 5. Publishes PlatformCqrsCommandEvent if handlers exist
    /// 6. Returns command execution result
    /// 
    /// Validation failures throw PlatformValidationException automatically.
    /// Event publishing is conditional based on registered handlers for performance.
    /// Cancellation token is passed through entire pipeline for responsiveness.
    /// </remarks>
    /// <exception cref="PlatformValidationException">Thrown when request validation fails</exception>
    public virtual async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
    {
        // Validate the incoming request and ensure it passes validation rules
        await ValidateRequestAsync(request, cancellationToken).EnsureValidAsync();

        // Execute the core command logic through the virtual method
        var result = await ExecuteHandleAsync(request, cancellationToken);

        // Check if any command event handlers are registered for this command type
        // Only publish events if handlers exist to avoid unnecessary overhead
        if (RootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(
            typeof(IPlatformCqrsEventApplicationHandler<PlatformCqrsCommandEvent<TCommand, TResult>>)) > 0)
        {
            // Publish command execution event for loose coupling and event-driven architecture
            await Cqrs.Value.SendEvent(
                new PlatformCqrsCommandEvent<TCommand, TResult>(request, result, PlatformCqrsCommandEventAction.Executed),
                cancellationToken);
        }

        return result;
    }

    /// <summary>
    /// Abstract method that must be implemented by concrete command handlers.
    /// Contains the core business logic for processing the specific command.
    /// </summary>
    /// <param name="request">The command to process</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Command execution result</returns>
    /// <remarks>
    /// This method contains the actual business logic for the command.
    /// Implementers should:
    /// - Focus on business logic without worrying about validation or events
    /// - Handle domain-specific errors and return appropriate results
    /// - Use cancellation token for database operations and external calls
    /// - Return detailed error information in the result object
    /// 
    /// Called after validation passes and before events are published.
    /// Should not perform validation (handled by pipeline) or publish events (handled by base).
    /// </remarks>
    protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

    /// <summary>
    /// Virtual method for customizing command execution logic.
    /// Provides extension point for cross-cutting concerns like caching, logging, or transactions.
    /// </summary>
    /// <param name="request">The command to execute</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Command execution result</returns>
    /// <remarks>
    /// Default implementation directly calls HandleAsync.
    /// Override this method to add:
    /// - Transaction management
    /// - Performance monitoring
    /// - Additional logging
    /// - Cache invalidation
    /// - Retry logic
    /// 
    /// Most handlers will use the default implementation.
    /// Override only when additional cross-cutting concerns are needed.
    /// </remarks>
    protected virtual async Task<TResult> ExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
    {
        // Default implementation delegates directly to the abstract HandleAsync method
        var result = await HandleAsync(request, cancellationToken);

        return result;
    }
}

/// <summary>
/// Abstract base class for handling Platform CQRS commands that don't return custom results.
/// Provides simplified command handling for operations that only need success/failure indication.
/// </summary>
/// <typeparam name="TCommand">The command type to handle, must use default PlatformCqrsCommandResult</typeparam>
/// <remarks>
/// Specialized command handler for commands using the default result type.
/// Simplifies implementation by requiring only HandleNoResult method instead of full result creation.
/// 
/// Use this base class when:
/// - Command doesn't need to return specific data
/// - Success/failure indication is sufficient
/// - Standard error handling meets requirements
/// 
/// Use PlatformCqrsCommandHandler&lt;TCommand, TResult&gt; when:
/// - Command needs to return specific data
/// - Custom result structure is required
/// - Additional result properties are needed
/// 
/// Automatically creates PlatformCqrsCommandResult after successful execution.
/// Inherits all validation, event publishing, and pipeline features from base class.
/// </remarks>
public abstract class PlatformCqrsCommandHandler<TCommand> : PlatformCqrsCommandHandler<TCommand, PlatformCqrsCommandResult>
    where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>, IPlatformCqrsRequest, new()
{
    /// <summary>
    /// Initializes a new instance of the simplified command handler.
    /// Passes dependencies to base class for standard command processing pipeline.
    /// </summary>
    /// <param name="cqrs">Lazy-loaded CQRS infrastructure for event publishing</param>
    /// <param name="rootServiceProvider">Root service provider for dependency resolution</param>
    /// <remarks>
    /// Constructor follows same pattern as generic base class.
    /// All simplified command handlers must call this base constructor.
    /// Enables same validation, event publishing, and pipeline features.
    /// </remarks>
    public PlatformCqrsCommandHandler(
        Lazy<IPlatformCqrs> cqrs,
        IPlatformRootServiceProvider rootServiceProvider) : base(cqrs, rootServiceProvider)
    {
    }

    /// <summary>
    /// Abstract method for implementing command logic without result creation.
    /// Focuses purely on business logic without needing to construct result objects.
    /// </summary>
    /// <param name="request">The command to process</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Task representing the asynchronous operation</returns>
    /// <remarks>
    /// Simplified command processing method that:
    /// - Contains core business logic for the command
    /// - Doesn't need to create or return result objects
    /// - Should throw exceptions for error conditions
    /// - Uses cancellation token for external operations
    /// 
    /// Framework automatically creates PlatformCqrsCommandResult after successful completion.
    /// Validation and event publishing are handled by the base class pipeline.
    /// Focus on domain logic and let the framework handle infrastructure concerns.
    /// </remarks>
    public abstract Task HandleNoResult(TCommand request, CancellationToken cancellationToken);

    /// <summary>
    /// Implementation of HandleAsync that delegates to HandleNoResult and creates default result.
    /// Bridges the gap between simplified interface and full command handler pipeline.
    /// </summary>
    /// <param name="request">The command to process</param>
    /// <param name="cancellationToken">Cancellation token for responsive operation handling</param>
    /// <returns>Default PlatformCqrsCommandResult indicating successful execution</returns>
    /// <remarks>
    /// Internal implementation method that:
    /// 1. Calls abstract HandleNoResult method for business logic
    /// 2. Creates and returns default PlatformCqrsCommandResult
    /// 3. Maintains compatibility with base class expectations
    /// 
    /// This method is sealed through inheritance and should not be overridden.
    /// All customization should happen in HandleNoResult method.
    /// Automatically handles result creation for simplified command pattern.
    /// </remarks>
    protected override async Task<PlatformCqrsCommandResult> HandleAsync(
        TCommand request,
        CancellationToken cancellationToken)
    {
        // Execute the simplified business logic without result creation
        await HandleNoResult(request, cancellationToken);

        // Create and return default success result
        return new PlatformCqrsCommandResult();
    }
}
