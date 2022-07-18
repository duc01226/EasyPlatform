using MediatR;

namespace Easy.Platform.Common.Cqrs.Queries
{
    public abstract class PlatformCqrsQueryHandler<TQuery, TResult> : PlatformCqrsRequestHandler<TQuery>,
        IRequestHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        public PlatformCqrsQueryHandler() : base()
        {
        }

        public virtual async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
        {
            EnsureValid(request.Validate(), error => new Exception(error.ErrorsMsg()));

            var result = await HandleAsync(request, cancellationToken);
            return result;
        }

        protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
    }
}
