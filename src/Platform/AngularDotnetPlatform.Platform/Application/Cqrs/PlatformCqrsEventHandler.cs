using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using MediatR;

namespace AngularDotnetPlatform.Platform.Application.Cqrs
{
    public abstract class PlatformCqrsEventHandler<TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;

        public PlatformCqrsEventHandler(IUnitOfWorkManager unitOfWorkManager)
        {
            UnitOfWorkManager = unitOfWorkManager;
        }

        public async Task Handle(TEvent request, CancellationToken cancellationToken)
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

        protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);
    }
}
