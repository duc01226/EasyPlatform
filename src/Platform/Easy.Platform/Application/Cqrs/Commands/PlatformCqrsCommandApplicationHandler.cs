using Easy.Platform.Application.Context.UserContext;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Commands;
using Easy.Platform.Domain.UnitOfWork;
using MediatR;

namespace Easy.Platform.Application.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandApplicationHandler<TCommand, TResult> : PlatformCqrsRequestApplicationHandler<TCommand>, IRequestHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>, new()
        where TResult : PlatformCqrsCommandResult, new()
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;
        protected readonly IPlatformCqrs Cqrs;

        public PlatformCqrsCommandApplicationHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs) : base(userContext)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Cqrs = cqrs;
        }

        public virtual async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            EnsureValidationResultValid(request.Validate());
            PopulateAuditInfo(request);

            var result = await ExecuteHandleAsync(request, cancellationToken);

            await Cqrs.SendEvent(
                new PlatformCqrsCommandEvent<TCommand>(request, PlatformCqrsCommandEventAction.Executed),
                cancellationToken);

            return result;
        }

        protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

        protected virtual async Task<TResult> ExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
        {
            return await ExecuteHandleAsync(UnitOfWorkManager.Begin(), request, cancellationToken);
        }

        protected virtual async Task<TResult> ExecuteHandleAsync(
            IUnitOfWork usingUow,
            TCommand request,
            CancellationToken cancellationToken)
        {
            TResult result;
            using (usingUow)
            {
                result = await HandleAsync(request, cancellationToken);
                await Cqrs.SendEvent(
                    new PlatformCqrsCommandEvent<TCommand>(request, PlatformCqrsCommandEventAction.Executing),
                    cancellationToken);
                await usingUow.CompleteAsync(cancellationToken);
            }

            return result;
        }
    }

    public abstract class PlatformCqrsCommandApplicationHandler<TCommand> : PlatformCqrsCommandApplicationHandler<TCommand, PlatformCqrsCommandResult>
        where TCommand : PlatformCqrsCommand, new()
    {
        public PlatformCqrsCommandApplicationHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs) : base(userContext, unitOfWorkManager, cqrs)
        {
        }

        public abstract Task HandleNoResult(TCommand request, CancellationToken cancellationToken);

        protected override async Task<PlatformCqrsCommandResult> HandleAsync(
            TCommand request,
            CancellationToken cancellationToken)
        {
            await HandleNoResult(request, cancellationToken);
            return new PlatformCqrsCommandResult();
        }
    }
}
