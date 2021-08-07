using System.Threading;
using System.Threading.Tasks;
using FluentValidation.Results;
using MediatR;
using AngularDotnetPlatform.Platform.Application.Exceptions;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.Cqrs
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

        /// <summary>
        /// Used to set <see cref="PlatformCqrsCommandEvent{TCommand,TCommandResult}.RoutingKeyPrefix"/> when send command event
        /// <inheritdoc cref="PlatformCqrsCommandEvent{TCommand,TCommandResult}.RoutingKeyPrefix"/>
        /// </summary>
        public abstract string CommandEventRoutingKeyPrefix { get; }

        public async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            using (var uow = unitOfWorkManager.Begin())
            {
                var result = await HandleAsync(request, cancellationToken);
                PopulateAuditInfo(request);
                await cqrs.SendEvent(new PlatformCqrsCommandEvent<TCommand, TResult>(request, CommandEventRoutingKeyPrefix), cancellationToken);
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
