using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Application.Cqrs.Events
{
    public abstract class PlatformCqrsDomainEventHandler<TEvent> : PlatformCqrsEventHandler<TEvent>
        where TEvent : PlatformCqrsDomainEvent, new()
    {
        protected PlatformCqrsDomainEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }
    }
}
