using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs
{
    public abstract class PlatformCqrsQueryHandler<TQuery, TResult> : IRequestHandler<TQuery, TResult>
        where TQuery : PlatformCqrsQuery<TResult>
        where TResult : PlatformCqrsQueryResult
    {
        public PlatformCqrsQueryHandler()
        {
        }

        public async Task<TResult> Handle(TQuery request, CancellationToken cancellationToken)
        {
            var result = await HandleAsync(request, cancellationToken);
            return result;
        }

        protected abstract Task<TResult> HandleAsync(TQuery request, CancellationToken cancellationToken);
    }
}
