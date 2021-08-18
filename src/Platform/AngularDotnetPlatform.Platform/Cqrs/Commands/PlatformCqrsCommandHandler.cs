using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Context.UserContext;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Validators;
using FluentValidation.Results;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandHandler<TCommand, TResult> : PlatformCqrsRequestHandler<TCommand>, IRequestHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        protected readonly IUnitOfWorkManager UnitOfWorkManager;
        protected readonly IPlatformCqrs Cqrs;

        public PlatformCqrsCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs) : base(userContext)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Cqrs = cqrs;
        }

        public async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            EnsureValidationResultValid(request.Validate());
            PopulateAuditInfo(request);

            var result = await ExecuteHandleAsync(request, cancellationToken);

            await Cqrs.SendEvent(new PlatformCqrsCommandEvent<TCommand, TResult>(request, PlatformCqrsCommandEventAction.Executed), cancellationToken);

            return result;
        }

        protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

        protected virtual IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin();
        }

        protected virtual async Task<TResult> ExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
        {
            return await ExecuteHandleAsync(BeginUnitOfWork(), request, cancellationToken);
        }

        protected virtual async Task<TResult> ExecuteHandleAsync(IUnitOfWork usingUow, TCommand request, CancellationToken cancellationToken)
        {
            TResult result;
            using (usingUow)
            {
                result = await HandleAsync(request, cancellationToken);
                await Cqrs.SendEvent(
                    new PlatformCqrsCommandEvent<TCommand, TResult>(request, PlatformCqrsCommandEventAction.Executing),
                    cancellationToken);
                await usingUow.CompleteAsync();
            }

            return result;
        }
    }

    public abstract class PlatformCqrsCommandHandler<TCommand, TResult, TUnitOfWork> : PlatformCqrsCommandHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
        where TUnitOfWork : IUnitOfWork
    {
        protected PlatformCqrsCommandHandler(
            IPlatformApplicationUserContextAccessor userContext,
            IUnitOfWorkManager unitOfWorkManager,
            IPlatformCqrs cqrs) : base(userContext, unitOfWorkManager, cqrs)
        {
        }

        protected override IUnitOfWork BeginUnitOfWork()
        {
            return UnitOfWorkManager.Begin<TUnitOfWork>();
        }
    }
}
