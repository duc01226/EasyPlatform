using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace AngularDotnetPlatform.Platform.Cqrs.Events
{
    public abstract class PlatformCqrsEventHandler<TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
        public async Task Handle(TEvent request, CancellationToken cancellationToken)
        {
            await HandleAsync(request, cancellationToken);
        }

        protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);
    }
}
