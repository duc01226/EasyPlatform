using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Common.Cqrs.Queries;
using Easy.Platform.Domain.UnitOfWork;
using MediatR;

namespace Easy.Platform.Application.Cqrs.Queries
{
    public abstract class
        PlatformCqrsQueryApplicationHandler<TQuery, TResult> : PlatformCqrsRequestApplicationHandler<TQuery>,
            IRequestHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;

        public PlatformCqrsQueryApplicationHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager) : base(userContext)
        {
            UnitOfWorkManager = unitOfWorkManager;
        }

        public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
        {
            EnsureValidationResultValid(request.Validate());
            PopulateAuditInfo(request);

            using (var uow = UnitOfWorkManager.Begin())
            {
                var result = await HandleAsync(request, cancellationToken);
                return result;
            }
        }

        protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
    }
}
