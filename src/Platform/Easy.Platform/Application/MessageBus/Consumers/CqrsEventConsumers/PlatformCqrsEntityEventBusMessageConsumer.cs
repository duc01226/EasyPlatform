using Easy.Platform.Common;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Application.MessageBus.Consumers.CqrsEventConsumers;

public interface IPlatformCqrsEntityEventBusMessageConsumer<in TMessage, TEntity> : IPlatformApplicationMessageBusConsumer<TMessage>
    where TEntity : class, IEntity, new()
    where TMessage : class, IPlatformWithPayloadBusMessage<PlatformCqrsEntityEvent<TEntity>>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
{
}

public abstract class PlatformCqrsEntityEventBusMessageConsumer<TMessage, TEntity>
    : PlatformApplicationMessageBusConsumer<TMessage>
    where TEntity : class, IEntity, new()
    where TMessage : class, IPlatformWithPayloadBusMessage<PlatformCqrsEntityEvent<TEntity>>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
{
    protected PlatformCqrsEntityEventBusMessageConsumer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager uowManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider) : base(loggerFactory, uowManager, serviceProvider, rootServiceProvider)
    {
    }

    /// <summary>
    /// MUST be <c>abstract override</c>, never <c>new abstract</c>. <c>new</c> HIDES the base virtual and allocates a
    /// SEPARATE vtable slot; the pipeline gate resolves the base slot instead — <c>HandleAsync</c>
    /// (PlatformMessageBusConsumer.cs:381) calls <c>CheckHandleWhen</c> (:442), which is compiled inside
    /// <c>PlatformMessageBusConsumer&lt;TMessage&gt;</c> and therefore binds the base <c>HandleWhen</c> whose body is
    /// an unconditional <c>return true</c> (:422). A derived consumer's filter compiled, read as correct, and was
    /// never consulted, so every entity event was handled regardless of the declared CRUD filter. The compiler warned
    /// (CS0108) and <c>new</c> silenced it. <c>override</c> puts the derived filter back in the slot the gate reads.
    /// </summary>
    public abstract override Task<bool> HandleWhen(TMessage message, string routingKey);
}
