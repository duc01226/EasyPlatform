using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using MediatR;

namespace AngularDotnetPlatform.Platform.Application.Cqrs
{
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
            if (UnitOfWorkManager.Current() != null && UnitOfWorkManager.Current().IsActive())
            {
                await HandleAsync(request, cancellationToken);
            }
            else
            {
                using (var uow = BeginUnitOfWork())
                {
                    await HandleAsync(request, cancellationToken);
                    await uow.CompleteAsync(cancellationToken);
                }
            }
        }

        protected virtual IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin();
        }
    }
}
