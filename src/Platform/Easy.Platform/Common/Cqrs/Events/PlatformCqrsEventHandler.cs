using MediatR;

namespace Easy.Platform.Common.Cqrs.Events
{
    public abstract class PlatformCqrsEventHandler<TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
        public PlatformCqrsEventHandler()
        {
        }

        public virtual async Task Handle(TEvent request, CancellationToken cancellationToken)
        {
            await HandleAsync(request, cancellationToken);
        }

        protected abstract Task HandleAsync(TEvent @event, CancellationToken cancellationToken);
    }
}
