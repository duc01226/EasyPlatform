#region

using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Represents an application event handler for bulk entity events.
/// This class serves as a base for handling events related to multiple entities of the same type.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
public abstract class PlatformCqrsBulkEntitiesEventApplicationHandler<TEntity, TPrimaryKey>
    : PlatformCqrsEventApplicationHandler<PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey>>
    where TEntity : class, IEntity<TPrimaryKey>, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsBulkEntitiesEventApplicationHandler{TEntity, TPrimaryKey}"/> class.
    /// </summary>
    /// <param name="loggerFactory">The logger factory.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformCqrsBulkEntitiesEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider)
    {
    }

    /// <summary>
    /// Determines whether the event should be handled. Default is true.
    /// </summary>
    /// <param name="event">The event to be handled.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a boolean value indicating whether the event should be handled.</returns>
    public override async Task<bool> HandleWhen(PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey> @event)
    {
        return true;
    }
}
