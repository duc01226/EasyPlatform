using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Events
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
                    await uow.CompleteAsync();
                }
            }
        }

        protected virtual IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin();
        }

        protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);
    }

    public abstract class PlatformCqrsEventHandler<TEvent, TUnitOfWork> : PlatformCqrsEventHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
        where TUnitOfWork : IUnitOfWork
    {
        protected PlatformCqrsEventHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }

        protected override IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin<TUnitOfWork>();
        }
    }
}
