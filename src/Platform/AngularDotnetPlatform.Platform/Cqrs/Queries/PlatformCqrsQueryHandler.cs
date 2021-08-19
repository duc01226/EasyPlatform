using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Validators;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Queries
{
    public abstract class PlatformCqrsQueryHandler<TQuery, TResult> : PlatformCqrsRequestHandler<TQuery>, IRequestHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;

        public PlatformCqrsQueryHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager) : base(userContext)
        {
            UnitOfWorkManager = unitOfWorkManager;
        }

        public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
        {
            EnsureValidationResultValid(request.Validate());
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
}
