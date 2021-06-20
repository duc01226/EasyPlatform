using System.Threading;
using System.Threading.Tasks;
using FluentValidation.Results;
using MediatR;
using NoCeiling.Duc.Interview.Test.Platform.Application.Exceptions;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public abstract class PlatformCqrsCommandHandler<TCommand, TResult> : IRequestHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>
        where TResult : PlatformCqrsCommandResult
    {
        private readonly IUnitOfWorkManager unitOfWorkManager;

        public PlatformCqrsCommandHandler(IUnitOfWorkManager unitOfWorkManager)
        {
            this.unitOfWorkManager = unitOfWorkManager;
        }

        public async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var result = await HandleAsync(request, cancellationToken);
                await uow.CompleteAsync();

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
