using MediatR;

namespace Easy.Platform.Common.Cqrs.Commands;

/// <summary>
/// Base interface for Platform CQRS commands that don't return a result.
/// Represents operations that modify system state without returning data (fire-and-forget operations).
/// </summary>
/// <remarks>
/// Used for commands that perform side effects without needing return values:
/// - Delete operations
/// - Notification sending
/// - State updates without response data
/// - Audit logging and cleanup operations
/// Extensively used in Growth service for leave request processing and Employee service for payroll operations.
/// </remarks>
public interface IPlatformCqrsCommand : IPlatformCqrsRequest
{
}

/// <summary>
/// Generic interface for Platform CQRS commands that return a result.
/// Represents operations that modify system state and return specific result data.
/// </summary>
/// <typeparam name="TResult">The type of result returned by the command, must implement IPlatformCqrsCommandResult</typeparam>
/// <remarks>
/// Used for commands that need to return data after execution:
/// - Create operations returning created entity information
/// - Update operations returning updated data or confirmation
/// - Batch operations returning processing results and statistics
/// - Validation operations returning validation results
/// Inherits from both IPlatformCqrsCommand and IRequest&lt;TResult&gt; for MediatR integration.
/// Constraint ensures all results implement IPlatformCqrsCommandResult for consistent error handling.
/// Widely used across Growth, Employee, Talents, and Permission Provider services.
/// </remarks>
public interface IPlatformCqrsCommand<out TResult> : IPlatformCqrsCommand, IRequest<TResult>
    where TResult : IPlatformCqrsCommandResult, new()
{
}

/// <summary>
/// Abstract base class for Platform CQRS commands that return a specific result type.
/// Provides common command infrastructure with type-safe result handling.
/// </summary>
/// <typeparam name="TResult">The type of result returned by the command, must inherit from PlatformCqrsCommandResult</typeparam>
/// <remarks>
/// Serves as foundation for all commands that return typed results.
/// Inherits audit tracking, validation, and caching capabilities from PlatformCqrsRequest.
/// Constraint ensures results inherit from PlatformCqrsCommandResult for standardized error handling.
/// 
/// Usage pattern:
/// 1. Define command class inheriting from this base
/// 2. Implement corresponding handler inheriting from PlatformCqrsCommandHandler
/// 3. Register handler with dependency injection for MediatR discovery
/// 
/// Examples from codebase:
/// - CreateEmployeeCommand&lt;CreateEmployeeResult&gt; in Employee service
/// - ProcessPayrollCommand&lt;PayrollProcessingResult&gt; in Talents service
/// - ApproveLeaveRequestCommand&lt;LeaveRequestResult&gt; in Growth service
/// </remarks>
public abstract class PlatformCqrsCommand<TResult> : PlatformCqrsRequest, IPlatformCqrsCommand<TResult>
    where TResult : PlatformCqrsCommandResult, new()
{
}

/// <summary>
/// Abstract base class for Platform CQRS commands that use the default command result.
/// Provides simplified command implementation for operations that don't need custom result types.
/// </summary>
/// <remarks>
/// Convenient base class for commands using standard PlatformCqrsCommandResult.
/// Eliminates need to specify generic type parameter for simple commands.
/// 
/// Use this base class when:
/// - Command only needs success/failure indication
/// - Standard error message and validation error collection is sufficient
/// - No custom result data is required
/// 
/// Use PlatformCqrsCommand&lt;TResult&gt; when:
/// - Command needs to return specific data
/// - Custom result structure is required
/// - Additional result properties beyond success/failure are needed
/// 
/// Common usage patterns:
/// - Simple CRUD operations
/// - State transition commands
/// - Notification and messaging commands
/// </remarks>
public abstract class PlatformCqrsCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>
{
}
