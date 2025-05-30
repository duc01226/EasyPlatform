using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Common.Extensions;
using MediatR;

namespace Easy.Platform.Common.Cqrs;

/// <summary>
/// Core CQRS (Command Query Responsibility Segregation) service interface that provides a unified API
/// for dispatching commands, queries, and events within the Easy Platform architecture.
/// Serves as the central coordination point for all CQRS operations and integrates with MediatR for message handling.
/// </summary>
/// <remarks>
/// This interface implements the CQRS pattern which separates read and write operations:
///
/// <para><strong>Command Responsibility:</strong></para>
/// <list type="bullet">
/// <item><description>Commands represent imperative instructions to modify system state</description></item>
/// <item><description>Each command has exactly one handler to ensure single responsibility</description></item>
/// <item><description>Commands can return results or execute without return values</description></item>
/// <item><description>Command execution is coordinated with Unit of Work for transactional consistency</description></item>
/// </list>
///
/// <para><strong>Query Responsibility:</strong></para>
/// <list type="bullet">
/// <item><description>Queries represent read-only operations to retrieve data</description></item>
/// <item><description>Queries do not modify system state and can be cached or optimized</description></item>
/// <item><description>Query handlers can access multiple data sources and repositories</description></item>
/// <item><description>Supports complex projections and data transformations</description></item>
/// </list>
///
/// <para><strong>Event-Driven Architecture:</strong></para>
/// <list type="bullet">
/// <item><description>Events represent notifications of state changes that have already occurred</description></item>
/// <item><description>Events can have zero or more handlers for loose coupling between components</description></item>
/// <item><description>Events enable cross-cutting concerns like auditing, logging, and integration</description></item>
/// <item><description>Supports both synchronous and asynchronous event processing</description></item>
/// </list>
///
/// <para><strong>Integration Benefits:</strong></para>
/// <list type="bullet">
/// <item><description>Seamless integration with dependency injection for handler resolution</description></item>
/// <item><description>Automatic validation and preprocessing through MediatR behaviors</description></item>
/// <item><description>Built-in support for cross-cutting concerns like logging and performance monitoring</description></item>
/// <item><description>Enables clean separation between API controllers and business logic</description></item>
/// </list>
///
/// <para><strong>Usage Examples:</strong></para>
/// This interface is extensively used across the platform in:
/// <list type="bullet">
/// <item><description>API controllers for handling HTTP requests with commands and queries</description></item>
/// <item><description>Repository implementations for publishing entity change events</description></item>
/// <item><description>Background services for processing scheduled commands and events</description></item>
/// <item><description>Event handlers for handling domain events and integration events</description></item>
/// <item><description>Application services for orchestrating complex business workflows</description></item>
/// </list>
/// </remarks>
public interface IPlatformCqrs
{
    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// </summary>
    /// <typeparam name="TCommand">The specific command type that extends PlatformCqrsCommand{TResult}. Provides compile-time type safety for command dispatching.</typeparam>
    /// <typeparam name="TResult">The result type that the command will return, extending PlatformCqrsCommandResult. Ensures consistent result handling across the platform.</typeparam>
    /// <param name="command">The command instance containing all necessary data for execution. Must be fully populated with required properties.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the command execution if needed. Enables graceful cancellation in long-running operations.</param>
    /// <returns>A task representing the asynchronous command execution. The task result contains the command execution result with status, data, and any error information.</returns>
    /// <remarks>
    /// This method enforces the single-handler constraint of the CQRS pattern. If multiple handlers are registered
    /// for the same command type, an exception will be thrown. Commands are executed within the current Unit of Work
    /// context if available, ensuring transactional consistency with repository operations.
    /// Common usage includes CreateEmployeeCommand, UpdatePerformanceReviewCommand, and DeleteCandidateCommand.
    /// </remarks>
    /// <exception cref="InvalidOperationException">Thrown when multiple handlers are registered for the command type.</exception>
    /// <exception cref="ArgumentNullException">Thrown when the command parameter is null.</exception>
    Task<TResult> SendCommand<TCommand, TResult>(TCommand command, CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new();

    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// Sends a command with a result type that can be determined at runtime to its corresponding handler.
    /// Provides flexibility when the command type is not known at compile time.
    /// </summary>
    /// <typeparam name="TResult">The result type that the command will return, extending PlatformCqrsCommandResult. Defines the expected return structure.</typeparam>
    /// <param name="command">The command instance that extends PlatformCqrsCommand{TResult}. Contains the command data and implements the required command interface.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the command execution if needed. Supports cooperative cancellation patterns.</param>
    /// <returns>A task representing the asynchronous command execution with the specified result type.</returns>
    /// <remarks>
    /// This overload is useful when working with polymorphic command scenarios or when the exact command type
    /// is determined at runtime. It maintains the same single-handler constraint and transactional behavior
    /// as the strongly-typed version while providing additional flexibility for dynamic command dispatching.
    /// </remarks>
    Task<TResult> SendCommand<TResult>(PlatformCqrsCommand<TResult> command, CancellationToken cancellationToken = default)
        where TResult : PlatformCqrsCommandResult, new();

    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// Sends a command that does not require a return value to its corresponding handler for execution.
    /// Used for fire-and-forget command scenarios where only execution success/failure is needed.
    /// </summary>
    /// <typeparam name="TCommand">The specific command type that extends PlatformCqrsCommand{PlatformCqrsCommandResult}. Uses the default command result type.</typeparam>
    /// <param name="command">The command instance containing all necessary data for execution. Must implement the platform command interface.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the command execution if needed. Enables responsive cancellation handling.</param>
    /// <returns>A task representing the asynchronous command execution without a specific return value.</returns>
    /// <remarks>
    /// This method is optimized for commands that primarily perform side effects (like sending emails,
    /// logging events, or triggering external systems) where the caller only needs to know if the
    /// operation completed successfully. The command still returns a PlatformCqrsCommandResult internally
    /// for consistency but the caller doesn't need to handle specific result data.
    /// </remarks>
    Task SendCommand<TCommand>(TCommand command, CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>;

    /// <summary>
    /// To get data by conditions defined in query object.
    /// </summary>
    /// <typeparam name="TQuery">The specific query type that extends PlatformCqrsQuery{TResult}. Provides compile-time type safety for query dispatching.</typeparam>
    /// <typeparam name="TResult">The result type that the query will return. Can be any type including DTOs, view models, or domain entities.</typeparam>
    /// <param name="query">The query instance containing all search criteria and parameters. Defines what data to retrieve and how to filter it.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the query execution if needed. Important for long-running or complex queries.</param>
    /// <returns>A task representing the asynchronous query execution. The task result contains the retrieved data in the specified format.</returns>
    /// <remarks>
    /// Queries are optimized for read operations and can access multiple data sources, apply complex filters,
    /// and perform data transformations. They do not participate in Unit of Work transactions but can
    /// access the current Unit of Work context for data consistency. Common examples include
    /// GetEmployeeByIdQuery, GetPerformanceReviewListQuery, and GetCandidateSearchResultsQuery.
    /// </remarks>
    Task<TResult> SendQuery<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default)
        where TQuery : PlatformCqrsQuery<TResult>;

    /// <summary>
    /// Sends a query with a result type that can be determined at runtime to its corresponding handler.
    /// Provides flexibility for dynamic query scenarios and polymorphic query handling.
    /// </summary>
    /// <typeparam name="TResult">The result type that the query will return. Defines the expected data structure.</typeparam>
    /// <param name="query">The query instance that extends PlatformCqrsQuery{TResult}. Contains the query logic and parameters.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the query execution if needed. Supports responsive query cancellation.</param>
    /// <returns>A task representing the asynchronous query execution with the specified result type.</returns>
    /// <remarks>
    /// This overload is particularly useful for scenarios where the query type is determined at runtime,
    /// such as dynamic reporting systems or API endpoints that handle multiple query types through
    /// a common interface. It maintains the same read-only semantics and performance characteristics
    /// as the strongly-typed version.
    /// </remarks>
    Task<TResult> SendQuery<TResult>(PlatformCqrsQuery<TResult> query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Publishes an event to all registered event handlers for processing.
    /// Events represent notifications of state changes that have already occurred in the system.
    /// </summary>
    /// <param name="cqrsEvent">The event instance containing all relevant data about the state change. Must extend PlatformCqrsEvent.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the event publication if needed. Affects all event handler executions.</param>
    /// <returns>A task representing the asynchronous event publication. Completes when all event handlers have finished processing.</returns>
    /// <remarks>
    /// Events follow the publish-subscribe pattern where zero or more handlers can process the same event.
    /// Event handlers execute in parallel when possible and are not part of the originating transaction
    /// unless explicitly coordinated. Common events include EmployeeCreatedEvent, PerformanceReviewCompletedEvent,
    /// and CandidateStatusChangedEvent. Events enable loose coupling between bounded contexts and support
    /// cross-cutting concerns like auditing, notifications, and integration with external systems.
    /// </remarks>
    Task SendEvent(PlatformCqrsEvent cqrsEvent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Publishes multiple events in parallel to their registered handlers for efficient batch processing.
    /// Optimizes performance when multiple related events need to be processed simultaneously.
    /// </summary>
    /// <param name="cqrsEvents">A collection of event instances to publish. Each event will be processed by its respective handlers.</param>
    /// <param name="cancellationToken">A cancellation token to cancel all event publications if needed. Affects all event handler executions across all events.</param>
    /// <returns>A task representing the asynchronous publication of all events. Completes when all event handlers for all events have finished processing.</returns>
    /// <remarks>
    /// This method optimizes the publication of multiple events by processing them in parallel rather than sequentially.
    /// It's particularly useful in scenarios like bulk operations, batch processing, or when multiple domain events
    /// are generated from a single business operation. Each event is published independently, so failure in one
    /// event's handlers does not affect other events. The method uses parallel processing to improve performance
    /// while maintaining the same event handler execution semantics as single event publication.
    /// </remarks>
    Task SendEvents(IEnumerable<PlatformCqrsEvent> cqrsEvents, CancellationToken cancellationToken = default);
}

/// <summary>
/// Concrete implementation of the CQRS service that provides command, query, and event dispatching capabilities
/// through integration with the MediatR library. Serves as the central hub for all CQRS operations in the Easy Platform.
/// </summary>
/// <remarks>
/// This implementation leverages MediatR's proven messaging infrastructure to provide:
///
/// <para><strong>MediatR Integration Benefits:</strong></para>
/// <list type="bullet">
/// <item><description>Automatic handler discovery and registration through dependency injection</description></item>
/// <item><description>Built-in support for behaviors and pipelines for cross-cutting concerns</description></item>
/// <item><description>Optimized message routing and handler resolution</description></item>
/// <item><description>Strong typing and compile-time verification of message contracts</description></item>
/// </list>
///
/// <para><strong>Performance Characteristics:</strong></para>
/// <list type="bullet">
/// <item><description>Efficient handler resolution through cached delegate compilation</description></item>
/// <item><description>Parallel event processing for improved throughput</description></item>
/// <item><description>Minimal overhead for command and query dispatching</description></item>
/// <item><description>Supports async/await patterns throughout the pipeline</description></item>
/// </list>
///
/// <para><strong>Error Handling:</strong></para>
/// <list type="bullet">
/// <item><description>Propagates exceptions from handlers to callers for proper error handling</description></item>
/// <item><description>Supports cancellation tokens for responsive operation cancellation</description></item>
/// <item><description>Maintains stack traces for debugging and monitoring purposes</description></item>
/// <item><description>Enables custom error handling through MediatR behaviors</description></item>
/// </list>
///
/// <para><strong>Usage in Platform:</strong></para>
/// This class is registered as a scoped service in the dependency injection container and is used throughout
/// the platform by controllers, application services, repositories, and event handlers to maintain
/// clean separation of concerns and enable testable, maintainable code architecture.
/// </remarks>
public class PlatformCqrs : IPlatformCqrs
{
    /// <summary>
    /// The MediatR mediator instance that handles the actual message dispatching and handler resolution.
    /// Provides the underlying infrastructure for CQRS message processing.
    /// </summary>
    private readonly IMediator mediator;

    /// <summary>
    /// Initializes a new instance of the PlatformCqrs class with the required MediatR mediator.
    /// </summary>
    /// <param name="mediator">The MediatR mediator instance for message dispatching. Must be properly configured with handler registrations.</param>
    /// <remarks>
    /// The mediator is typically injected by the dependency injection container and comes pre-configured
    /// with all registered command handlers, query handlers, and event handlers. The mediator handles
    /// the complexity of handler discovery, lifetime management, and message routing.
    /// </remarks>
    public PlatformCqrs(IMediator mediator)
    {
        this.mediator = mediator;
    }

    public Task<TResult> SendCommand<TCommand, TResult>(TCommand command, CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        return mediator.Send(command, cancellationToken);
    }

    public Task<TResult> SendCommand<TResult>(PlatformCqrsCommand<TResult> command, CancellationToken cancellationToken = default)
        where TResult : PlatformCqrsCommandResult, new()
    {
        return mediator.Send(command, cancellationToken);
    }

    public Task SendCommand<TCommand>(TCommand command, CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>
    {
        return mediator.Send(command, cancellationToken);
    }

    public Task<TResult> SendQuery<TQuery, TResult>(TQuery query, CancellationToken cancellationToken = default)
        where TQuery : PlatformCqrsQuery<TResult>
    {
        return mediator.Send(query, cancellationToken);
    }

    public Task<TResult> SendQuery<TResult>(PlatformCqrsQuery<TResult> query, CancellationToken cancellationToken = default)
    {
        return mediator.Send(query, cancellationToken);
    }

    public Task SendEvent(PlatformCqrsEvent cqrsEvent, CancellationToken cancellationToken = default)
    {
        return mediator.Publish(cqrsEvent, cancellationToken);
    }

    public Task SendEvents(IEnumerable<PlatformCqrsEvent> cqrsEvents, CancellationToken cancellationToken = default)
    {
        return cqrsEvents.ParallelAsync(cqrsEvent => mediator.Publish(cqrsEvent, cancellationToken));
    }
}
