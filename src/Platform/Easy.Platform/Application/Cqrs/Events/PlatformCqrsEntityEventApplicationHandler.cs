using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Cqrs.Events
{
    public abstract class
        PlatformCqrsEntityEventApplicationHandler<TEntity> : PlatformCqrsEventApplicationHandler<
            PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
        protected PlatformCqrsEntityEventApplicationHandler(IUnitOfWorkManager unitOfWorkManager) : base(
            unitOfWorkManager)
        {
        }
    }
}
