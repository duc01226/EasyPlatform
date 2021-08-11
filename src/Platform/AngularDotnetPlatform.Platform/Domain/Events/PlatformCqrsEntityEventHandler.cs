using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsEntityEventHandler<TEntity, TEntityKey> : PlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity, TEntityKey>>
        where TEntity : RootEntity<TEntity, TEntityKey>, new()
    {
    }
}
