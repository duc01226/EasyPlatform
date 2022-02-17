using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Application.Cqrs.Events
{
    public abstract class PlatformCqrsEntityEventHandler<TEntity> : PlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity>>
        where TEntity : class, IEntity, new()
    {
        protected PlatformCqrsEntityEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }

    public abstract class PlatformCqrsEntityEventHandler<TEntity, TBusinessActionPayload> : PlatformCqrsEventHandler<PlatformCqrsEntityEvent<TEntity, TBusinessActionPayload>>
        where TEntity : class, IEntity, new()
        where TBusinessActionPayload : class, new()
    {
        protected PlatformCqrsEntityEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
