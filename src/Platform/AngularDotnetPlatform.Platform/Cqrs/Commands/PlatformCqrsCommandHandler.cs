using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using FluentValidation.Results;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandHandler<TCommand, TResult> : PlatformCqrsRequestHandler<TCommand>, IRequestHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult, new()
    {
        private readonly IUnitOfWorkManager unitOfWorkManager;
        private readonly IPlatformCqrs cqrs;

        public PlatformCqrsCommandHandler(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs)
        {
            this.unitOfWorkManager = unitOfWorkManager;
            this.cqrs = cqrs;
        }

        public async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var result = await HandleAsync(request, cancellationToken);
                PopulateAuditInfo(request);
                await cqrs.SendEvent(new PlatformCqrsCommandEvent<TCommand, TResult>(request, PlatformCqrsCommandEventAction.Executing), cancellationToken);
                await uow.CompleteAsync();
                await cqrs.SendEvent(new PlatformCqrsCommandEvent<TCommand, TResult>(request, PlatformCqrsCommandEventAction.Executed), cancellationToken);

                return result;
            }
        }

        protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

        protected void EnsureValidationResultValid(ValidationResult validationResult)
        {
            if (validationResult.IsValid == false)
            {
                throw new PlatformApplicationValidationException(validationResult);
            }
        }
    }
}
