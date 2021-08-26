using AngularDotnetPlatform.Platform.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsEntityEventHandler<TEntity, TEntityKey> : PlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity, TEntityKey>>
        where TEntity : class, IEntity<TEntityKey>, new()
    {
        protected PlatformCqrsEntityEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
