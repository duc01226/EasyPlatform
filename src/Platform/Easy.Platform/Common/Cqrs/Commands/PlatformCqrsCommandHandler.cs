using MediatR;

namespace Easy.Platform.Common.Cqrs.Commands
{
    public abstract class PlatformCqrsCommandHandler<TCommand, TResult> : PlatformCqrsRequestHandler<TCommand>,
        IRequestHandler<TCommand, TResult>
        where TCommand : PlatformCqrsCommand<TResult>, new()
        where TResult : PlatformCqrsCommandResult, new()
    {
        protected readonly IPlatformCqrs Cqrs;

        public PlatformCqrsCommandHandler(IPlatformCqrs cqrs)
        {
            Cqrs = cqrs;
        }

        public virtual async Task<TResult> Handle(TCommand request, CancellationToken cancellationToken)
        {
            EnsureValid(request.Validate(), error => new Exception(error.ErrorsMsg()));

            var result = await ExecuteHandleAsync(request, cancellationToken);

            await Cqrs.SendEvent(
                new PlatformCqrsCommandEvent<TCommand>(request, PlatformCqrsCommandEventAction.Executed),
                cancellationToken);

            return result;
        }

        protected abstract Task<TResult> HandleAsync(TCommand request, CancellationToken cancellationToken);

        protected virtual async Task<TResult> ExecuteHandleAsync(TCommand request, CancellationToken cancellationToken)
        {
            var result = await HandleAsync(request, cancellationToken);
            await Cqrs.SendEvent(
                new PlatformCqrsCommandEvent<TCommand>(request, PlatformCqrsCommandEventAction.Executing),
                cancellationToken);

            return result;
        }
    }

    public abstract class
        PlatformCqrsCommandHandler<TCommand> : PlatformCqrsCommandHandler<TCommand, PlatformCqrsCommandResult>
        where TCommand : PlatformCqrsCommand, new()
    {
        public PlatformCqrsCommandHandler(
            IPlatformCqrs cqrs) : base(cqrs)
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
