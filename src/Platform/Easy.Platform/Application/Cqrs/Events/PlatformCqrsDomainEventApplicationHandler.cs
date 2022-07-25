using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Cqrs.Events;

public abstract class PlatformCqrsDomainEventApplicationHandler<TEvent> : PlatformCqrsEventApplicationHandler<TEvent>
    where TEvent : PlatformCqrsDomainEvent, new()
{
    protected PlatformCqrsDomainEventApplicationHandler(IUnitOfWorkManager unitOfWorkManager) : base(
        unitOfWorkManager)
    {
    }
}
