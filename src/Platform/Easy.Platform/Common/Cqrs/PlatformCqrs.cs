using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Cqrs.Queries;
using MediatR;

namespace Easy.Platform.Common.Cqrs;

public interface IPlatformCqrs
{
    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// </summary>
    Task<TResult> SendCommand<TCommand, TResult>(
        TCommand command,
        CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new();

    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// </summary>
    Task<TResult> SendCommand<TResult>(
        PlatformCqrsCommand<TResult> command,
        CancellationToken cancellationToken = default)
        where TResult : PlatformCqrsCommandResult, new();

    /// <summary>
    /// A Command is an imperative instruction to do something; it only has one handler. We will throw an error for multiple registered handlers of a command.
    /// Send a command without any result needed
    /// </summary>
    Task SendCommand<TCommand>(
        TCommand command,
        CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>;

    /// <summary>
    /// To get data by conditions defined in query object.
    /// </summary>
    Task<TResult> SendQuery<TQuery, TResult>(
        TQuery query,
        CancellationToken cancellationToken = default)
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult;

    /// <summary>
    /// To get data by conditions defined in query object.
    /// </summary>
    Task<TResult> SendQuery<TResult>(
        PlatformCqrsQuery<TResult> query,
        CancellationToken cancellationToken = default)
        where TResult : PlatformCqrsQueryResult;

    /// <summary>
    /// An Event is a notification that something has happened; it has zero or more handlers.
    /// </summary>
    Task SendEvent(
        PlatformCqrsEvent cqrsEvent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Send multiple events.
    /// </summary>
    Task SendEvents(
        IEnumerable<PlatformCqrsEvent> cqrsEvents,
        CancellationToken cancellationToken = default);
}

public class PlatformCqrs : IPlatformCqrs
{
    private readonly IMediator mediator;

    public PlatformCqrs(IMediator mediator)
    {
        this.mediator = mediator;
    }

    public async Task<TResult> SendCommand<TCommand, TResult>(
        TCommand command,
        CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        return await mediator.Send(command, cancellationToken);
    }

    public async Task<TResult> SendCommand<TResult>(
        PlatformCqrsCommand<TResult> command,
        CancellationToken cancellationToken = default) where TResult : PlatformCqrsCommandResult, new()
    {
        return await mediator.Send(command, cancellationToken);
    }

    public async Task SendCommand<TCommand>(TCommand command, CancellationToken cancellationToken = default)
        where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>
    {
        await mediator.Send(command, cancellationToken);
    }

    public async Task<TResult> SendQuery<TQuery, TResult>(
        TQuery query,
        CancellationToken cancellationToken = default) where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        return await mediator.Send(query, cancellationToken);
    }

    public async Task<TResult> SendQuery<TResult>(
        PlatformCqrsQuery<TResult> query,
        CancellationToken cancellationToken = default) where TResult : PlatformCqrsQueryResult
    {
        return await mediator.Send(query, cancellationToken);
    }

    public async Task SendEvent(PlatformCqrsEvent cqrsEvent, CancellationToken cancellationToken = default)
    {
        await mediator.Publish(cqrsEvent, cancellationToken);
    }

    public async Task SendEvents(
        IEnumerable<PlatformCqrsEvent> cqrsEvents,
        CancellationToken cancellationToken = default)
    {
        foreach (var cqrsEvent in cqrsEvents)
            await mediator.Publish(cqrsEvent, cancellationToken);
    }
}
