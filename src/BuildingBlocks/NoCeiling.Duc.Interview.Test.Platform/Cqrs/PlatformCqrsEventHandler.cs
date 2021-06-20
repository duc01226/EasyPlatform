using System.Threading;
using System.Threading.Tasks;
using MediatR;

namespace NoCeiling.Duc.Interview.Test.Platform.Cqrs
{
    public abstract class PlatformCqrsEventHandler<TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent
    {
        public async Task Handle(TEvent request, CancellationToken cancellationToken)
        {
            await HandleAsync(request, cancellationToken);
        }

        protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);
    }
}
