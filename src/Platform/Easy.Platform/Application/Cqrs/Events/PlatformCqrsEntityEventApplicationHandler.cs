using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.Cqrs.Events;

/// <summary>
/// Represents an application event handler for CQRS entity events.
/// </summary>
/// <typeparam name="TEntity">The type of the entity.</typeparam>
public abstract class PlatformCqrsEntityEventApplicationHandler<TEntity> : PlatformCqrsEventApplicationHandler<PlatformCqrsEntityEvent<TEntity>>
    where TEntity : class, IEntity, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsEntityEventApplicationHandler{TEntity}"/> class.
    /// </summary>
    /// <param name="loggerFactory">The logger factory.</param>
    /// <param name="unitOfWorkManager">The unit of work manager.</param>
    /// <param name="serviceProvider">The service provider.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    protected PlatformCqrsEntityEventApplicationHandler(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider) { }
}
