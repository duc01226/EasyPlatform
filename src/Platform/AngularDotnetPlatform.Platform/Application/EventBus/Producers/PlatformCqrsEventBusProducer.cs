using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using MediatR;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    public interface IPlatformCqrsEventBusProducer<in TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
    }
}
