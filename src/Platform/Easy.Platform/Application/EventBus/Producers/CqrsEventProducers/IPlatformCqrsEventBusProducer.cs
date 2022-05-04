using Easy.Platform.Common.Cqrs.Events;
using MediatR;

namespace Easy.Platform.Application.EventBus.Producers.CqrsEventProducers
{
    /// <summary>
    /// This interface is used for conventional register all PlatformCqrsEventBusProducer
    /// </summary>
    public interface IPlatformCqrsEventBusProducer<in TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
    }
}
