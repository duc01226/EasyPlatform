#region

using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;

#endregion

namespace Easy.Platform.Domain.Events;

/// <summary>
/// Provides extension methods for sending platform CQRS entity events.
/// </summary>
public static class SendPlatformCqrsEntityEventExtension
{
    /// <summary>
    /// Sends a single entity event if any handlers are registered for it.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="cqrs">The CQRS bus.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="entity">The entity instance.</param>
    /// <param name="crudAction">The CRUD action being performed.</param>
    /// <param name="eventCustomConfig">An optional action to customize the event before sending.</param>
    /// <param name="cancellationToken">A cancellation token.</param>
    public static async Task SendEntityEvent<TEntity>(
        this IPlatformCqrs cqrs,
        IPlatformRootServiceProvider rootServiceProvider,
        TEntity entity,
        PlatformCqrsEntityEventCrudAction crudAction,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity, new()
    {
        if (
            rootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(
                typeof(IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity>>)
            ) > 0
        )
        {
            await cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity>(entity, crudAction).With(x => eventCustomConfig?.Invoke(x)), cancellationToken);
        }
    }

    /// <summary>
    /// Sends multiple entity events if any handlers are registered for them.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="cqrs">The CQRS bus.</param>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="entities">The list of entity instances.</param>
    /// <param name="crudAction">The CRUD action being performed.</param>
    /// <param name="eventCustomConfig">An optional action to customize each event before sending.</param>
    /// <param name="cancellationToken">A cancellation token.</param>
    public static async Task SendEntityEvents<TEntity>(
        this IPlatformCqrs cqrs,
        IPlatformRootServiceProvider rootServiceProvider,
        IList<TEntity> entities,
        PlatformCqrsEntityEventCrudAction crudAction,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity, new()
    {
        if (
            rootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(
                typeof(IPlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity>>)
            ) > 0
        )
        {
            await cqrs.SendEvents(
                entities.SelectList(entity => new PlatformCqrsEntityEvent<TEntity>(entity, crudAction).With(x => eventCustomConfig?.Invoke(x))),
                cancellationToken
            );
        }
    }
}
