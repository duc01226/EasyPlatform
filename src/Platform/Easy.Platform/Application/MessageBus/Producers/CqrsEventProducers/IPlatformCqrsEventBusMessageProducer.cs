using Easy.Platform.Common.Cqrs.Events;
using MediatR;

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers
{
    /// <summary>
    /// This interface is used for conventional register all PlatformCqrsEventBusProducer
    /// </summary>
    public interface IPlatformCqrsEventBusMessageProducer<in TEvent> : INotificationHandler<TEvent>
        where TEvent : PlatformCqrsEvent, new()
    {
    }
}
