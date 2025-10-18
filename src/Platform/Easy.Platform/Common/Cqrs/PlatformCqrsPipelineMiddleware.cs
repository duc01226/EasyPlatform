using MediatR;

namespace Easy.Platform.Common.Cqrs;

/// <summary>
/// Pipeline behavior to surround the inner query or command handler.
/// Implementations add additional behavior and await the next delegate.
/// Can use it for logging, command/query validation, etc ... anything before the Command/Query Handler is executed.
/// </summary>
public abstract class PlatformCqrsPipelineMiddleware<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull, IRequest<TResponse>
{
    public Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        return HandleAsync(request, next, cancellationToken);
    }

    protected abstract Task<TResponse> HandleAsync(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken);
}
