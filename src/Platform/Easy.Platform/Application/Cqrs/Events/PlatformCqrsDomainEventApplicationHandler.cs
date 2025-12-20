#region

using Easy.Platform.Common;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Represents an application event handler for CQRS domain events.
/// </summary>
/// <typeparam name="TEvent">The type of the domain event.</typeparam>
public abstract class PlatformCqrsDomainEventApplicationHandler<TEvent> : PlatformCqrsEventApplicationHandler<TEvent>
    where TEvent : PlatformCqrsDomainEvent, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsDomainEventApplicationHandler{TEvent}"/> class.
    /// </summary>
    /// <param name="loggerFactory">The logger factory.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformCqrsDomainEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }

    /// <summary>
    /// Determines whether the event should be handled. Default is true.
    /// </summary>
    /// <param name="event">The domain event.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains true if the event should be handled; otherwise, false.</returns>
    public override async Task<bool> HandleWhen(TEvent @event)
    {
        return true;
    }
}
