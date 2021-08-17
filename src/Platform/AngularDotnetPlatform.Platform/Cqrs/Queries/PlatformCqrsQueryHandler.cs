using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Queries
{
    public abstract class PlatformCqrsQueryHandler<TQuery, TResult> : PlatformCqrsRequestHandler<TQuery>, IRequestHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;

        public PlatformCqrsQueryHandler(IUnitOfWorkManager unitOfWorkManager)
        {
            UnitOfWorkManager = unitOfWorkManager;
        }

        public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
        {
            PopulateAuditInfo(request);

            using (var uow = BeginUnitOfWork())
            {
                var result = await HandleAsync(request, cancellationToken);
                return result;
            }
        }

        protected virtual IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin();
        }

        protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
    }

    public abstract class PlatformCqrsQueryHandler<TQuery, TResult, TUnitOfWork> : PlatformCqrsQueryHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
        where TUnitOfWork : IUnitOfWork
    {
        protected PlatformCqrsQueryHandler(IUnitOfWorkManager unitOfWorkManager) : base(unitOfWorkManager)
        {
        }

        protected override IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin<TUnitOfWork>();
        }
    }
}
