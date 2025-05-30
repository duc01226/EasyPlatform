#region

using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Represents an application event handler for CQRS command events with a specified result type.
/// </summary>
/// <typeparam name="TCommand">The type of the CQRS command.</typeparam>
/// <typeparam name="TCommandResult">The type of the command result.</typeparam>
public abstract class PlatformCqrsCommandEventApplicationHandler<TCommand, TCommandResult>
    : PlatformCqrsEventApplicationHandler<PlatformCqrsCommandEvent<TCommand, TCommandResult>>
    where TCommand : PlatformCqrsCommand<TCommandResult>, IPlatformCqrsRequest, new()
    where TCommandResult : PlatformCqrsCommandResult, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsCommandEventApplicationHandler{TCommand, TCommandResult}"/> class.
    /// </summary>
    /// <param name="loggerFactory">The logger factory.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformCqrsCommandEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }

    /// <summary>
    /// Determines whether the event should be handled based on the event action.
    /// </summary>
    /// <param name="event">The command event.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains true if the event action is "Executed"; otherwise, false.</returns>
    public override async Task<bool> HandleWhen(PlatformCqrsCommandEvent<TCommand, TCommandResult> @event)
    {
        return @event.Action == PlatformCqrsCommandEventAction.Executed;
    }
}

/// <summary>
/// Represents an application event handler for CQRS command events with a default result type.
/// </summary>
/// <typeparam name="TCommand">The type of the CQRS command.</typeparam>
public abstract class PlatformCqrsCommandEventApplicationHandler<TCommand>
    : PlatformCqrsCommandEventApplicationHandler<TCommand, PlatformCqrsCommandResult>
    where TCommand : PlatformCqrsCommand<PlatformCqrsCommandResult>, IPlatformCqrsRequest, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsCommandEventApplicationHandler{TCommand}"/> class.
    /// </summary>
    /// <param name="loggerFactory">The logger factory.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformCqrsCommandEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }
}
