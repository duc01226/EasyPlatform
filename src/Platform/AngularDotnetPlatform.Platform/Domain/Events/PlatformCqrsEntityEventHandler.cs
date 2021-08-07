using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsEntityEventHandler<TEntityEvent, TEntity> : PlatformCqrsEventHandler<TEntityEvent>
        where TEntityEvent : PlatformCqrsEntityEvent<TEntity, object>
        where TEntity : RootEntity<TEntity, object>, new()
    {
    }
}
