using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
using MediatR;

namespace AngularDotnetPlatform.Platform.Application.EventBus.Producers
{
    /// <summary>
    /// This interface is used for conventional register all PlatformCqrsEventBusProducer
    /// </summary>
    public interface IPlatformCqrsEventBusProducer<in TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
    }
}
