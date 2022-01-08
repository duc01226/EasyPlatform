using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsEntityEventHandler<TEntity, TEntityKey> : PlatformCqrsApplicationEventHandler<PlatformCqrsEntityEvent<TEntity, TEntityKey>>
        where TEntity : class, IEntity<TEntityKey>, new()
    {
        protected PlatformCqrsEntityEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
