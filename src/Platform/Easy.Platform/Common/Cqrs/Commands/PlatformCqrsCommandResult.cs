namespace Easy.Platform.Common.Cqrs.Commands;

/// <summary>
/// Base interface for all Platform CQRS command results.
/// Provides a consistent contract for command execution results across the platform.
/// </summary>
/// <remarks>
/// Marker interface that establishes the foundation for all command result types.
/// Enables type safety in generic constraints and result processing pipelines.
/// 
/// Key benefits:
/// - Type safety for generic command handlers and result processors
/// - Consistent result handling across all platform services
/// - Framework-level result identification and processing
/// - Support for result transformation and mapping
/// 
/// Used extensively across:
/// - Growth service: Leave request processing, attendance management
/// - Employee service: Payroll operations, employee lifecycle management
/// - Talents service: Talent acquisition and management workflows
/// - Permission Provider: Subscription and usage limit management
/// 
/// All command results should implement this interface directly or inherit from PlatformCqrsCommandResult.
/// </remarks>
public interface IPlatformCqrsCommandResult
{
}

/// <summary>
/// Default implementation of Platform CQRS command result.
/// Provides basic result structure that can be extended or used as-is for simple command operations.
/// </summary>
/// <remarks>
/// Standard command result class that implements IPlatformCqrsCommandResult.
/// Can be used directly for simple commands or extended for more complex result requirements.
/// 
/// Usage patterns:
/// 1. Direct usage: Commands that only need success/failure indication
/// 2. Inheritance base: Custom result classes that extend this foundation
/// 3. Default fallback: When no specific result type is required
/// 
/// Design considerations:
/// - Lightweight implementation suitable for high-frequency operations
/// - Extensible through inheritance for domain-specific requirements
/// - Compatible with MediatR result handling patterns
/// - Supports serialization for API responses and message bus scenarios
/// 
/// Common extensions include:
/// - Success/failure status properties
/// - Error message collections
/// - Validation result details
/// - Created entity identifiers
/// - Processing statistics and metrics
/// 
/// Examples from codebase:
/// - Used as base for CreateEmployeeResult in Employee service
/// - Extended for PayrollProcessingResult in Talents service
/// - Foundation for LeaveRequestResult in Growth service
/// </remarks>
public class PlatformCqrsCommandResult : IPlatformCqrsCommandResult
{
}
