using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Application.Cqrs;

public abstract class PlatformCqrsEventApplicationHandler<TEvent> : PlatformCqrsEventHandler<TEvent>
    where TEvent : PlatformCqrsEvent, new()
{
    protected readonly IUnitOfWorkManager UnitOfWorkManager;

    public PlatformCqrsEventApplicationHandler(IUnitOfWorkManager unitOfWorkManager)
    {
        UnitOfWorkManager = unitOfWorkManager;
    }

    public override async Task Handle(TEvent request, CancellationToken cancellationToken)
    {
        var currentUow = UnitOfWorkManager.Current();

        if (currentUow?.IsActive() == true)
            await HandleAsync(request, cancellationToken);
        else
            using (var uow = BeginUnitOfWork())
            {
                await HandleAsync(request, cancellationToken);
                await uow.CompleteAsync(cancellationToken);
            }
    }

    protected virtual IUnitOfWork BeginUnitOfWork()
    {
        return UnitOfWorkManager.Begin();
    }
}
