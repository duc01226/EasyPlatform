#region

using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Application.MessageBus.Producers.CqrsEventProducers;

/// <summary>
/// Specialized CQRS event producer for publishing entity-related domain events through the message bus infrastructure.
/// This class extends <see cref="PlatformCqrsEventBusMessageProducer{TEvent,TMessage}"/> to provide entity-specific
/// event publishing capabilities with support for entity lifecycle events, automated message construction,
/// and intelligent routing based on entity characteristics.
///
/// <para><strong>Core Responsibilities:</strong></para>
/// <para>• <strong>Entity Event Publishing:</strong> Publishes domain events when entities are created, updated, or deleted</para>
/// <para>• <strong>Message Construction:</strong> Automatically builds properly structured bus messages from entity events</para>
/// <para>• <strong>Identity Management:</strong> Manages event tracking and correlation across distributed systems</para>
/// <para>• <strong>Routing Intelligence:</strong> Provides smart routing based on entity characteristics and event types</para>
/// <para>• <strong>Context Preservation:</strong> Maintains request context and producer information for traceability</para>
///
/// <para><strong>CQRS Integration:</strong></para>
/// <para>Integrates seamlessly with CQRS patterns by:</para>
/// <para>• Publishing domain events after entity state changes</para>
/// <para>• Enabling event-driven read model updates</para>
/// <para>• Supporting eventual consistency across bounded contexts</para>
/// <para>• Facilitating command-query separation in distributed architectures</para>
/// <para>• Providing reliable event delivery for saga orchestration</para>
///
/// <para><strong>Entity Lifecycle Events:</strong></para>
/// <para>Supports comprehensive entity lifecycle event publishing:</para>
/// <para>• <strong>Creation Events:</strong> Published when new entities are created</para>
/// <para>• <strong>Update Events:</strong> Published when entity properties are modified</para>
/// <para>• <strong>Deletion Events:</strong> Published when entities are removed</para>
/// <para>• <strong>State Transition Events:</strong> Published for business state changes</para>
/// <para>• <strong>Bulk Operation Events:</strong> Support for batch operations and bulk changes</para>
///
/// <para><strong>Message Structure and Routing:</strong></para>
/// <para>Creates well-structured messages with:</para>
/// <para>• Unique tracking identifiers for event correlation</para>
/// <para>• Complete entity payload including before/after state</para>
/// <para>• Producer context information for debugging and monitoring</para>
/// <para>• Message grouping by entity type for organized processing</para>
/// <para>• Action-specific routing for targeted consumer processing</para>
///
/// <para><strong>Sub-Queue Support:</strong></para>
/// <para>Provides intelligent sub-queue routing through:</para>
/// <para>• Entity ID-based partitioning for ordered processing</para>
/// <para>• Composite ID support for complex entity hierarchies</para>
/// <para>• Automatic sub-queue prefix generation from entity characteristics</para>
/// <para>• Load balancing across consumer instances</para>
/// <para>• Prevention of concurrent processing conflicts</para>
///
/// <para><strong>Integration Points:</strong></para>
/// <para>The producer integrates with platform services including:</para>
/// <para>• <see cref="IPlatformUnitOfWorkManager"/> for transactional event publishing</para>
/// <para>• <see cref="IPlatformApplicationBusMessageProducer"/> for actual message delivery</para>
/// <para>• Domain entity change tracking for automatic event generation</para>
/// <para>• Request context management for cross-cutting concerns</para>
/// <para>• Logging infrastructure for operational monitoring</para>
///
/// <para><strong>Usage Patterns:</strong></para>
/// <para>Common implementation scenarios:</para>
/// <para>• Publishing user account change events for read model updates</para>
/// <para>• Notifying external systems of order status changes</para>
/// <para>• Triggering workflow processes based on entity state transitions</para>
/// <para>• Maintaining audit logs through event-driven mechanisms</para>
/// <para>• Synchronizing data across microservice boundaries</para>
///
/// <para><strong>Type Safety and Performance:</strong></para>
/// <para>Provides strong typing benefits:</para>
/// <para>• Compile-time validation of entity and message types</para>
/// <para>• Generic constraints ensuring proper interface implementation</para>
/// <para>• Automatic serialization of complex entity hierarchies</para>
/// <para>• Efficient memory usage through lazy message construction</para>
/// <para>• Optimized routing key generation based on entity metadata</para>
///
/// <para><strong>Event Processing Guarantees:</strong></para>
/// <para>Ensures reliable event processing through:</para>
/// <para>• Transactional publishing tied to entity persistence</para>
/// <para>• Automatic retry mechanisms for transient failures</para>
/// <para>• Dead letter queue support for persistent errors</para>
/// <para>• Duplicate event detection and handling</para>
/// <para>• Ordered processing within entity-specific sub-queues</para>
/// </summary>
/// <typeparam name="TMessage">The specific bus message type used for publishing entity events. Must implement required messaging interfaces.</typeparam>
/// <typeparam name="TEntity">The entity type for which events are being published. Must implement <see cref="IEntity{TPrimaryKey}"/>.</typeparam>
/// <typeparam name="TPrimaryKey">The primary key type of the entity, used for event routing and correlation.</typeparam>
public abstract class PlatformCqrsEntityEventBusMessageProducer<TMessage, TEntity, TPrimaryKey> : PlatformCqrsEventBusMessageProducer<PlatformCqrsEntityEvent<TEntity>, TMessage>
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TMessage : class, IPlatformWithPayloadBusMessage<PlatformCqrsEntityEvent<TEntity>>, IPlatformSelfRoutingKeyBusMessage, IPlatformTrackableBusMessage, new()
{
    protected PlatformCqrsEntityEventBusMessageProducer(
        ILoggerFactory loggerFactory,
        IPlatformUnitOfWorkManager unitOfWorkManager,
        IServiceProvider serviceProvider,
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformApplicationBusMessageProducer applicationBusMessageProducer
    )
        : base(loggerFactory, unitOfWorkManager, serviceProvider, rootServiceProvider, applicationBusMessageProducer) { }

    protected override TMessage BuildMessage(PlatformCqrsEntityEvent<TEntity> @event)
    {
        return PlatformCqrsEntityEventBusMessage<TEntity, TPrimaryKey>.New<TMessage>(
            trackId: @event.Id,
            payload: @event,
            identity: BuildPlatformEventBusMessageIdentity(@event.RequestContext),
            producerContext: ApplicationSettingContext.ApplicationName,
            messageGroup: PlatformCqrsEntityEvent.EventTypeValue,
            messageAction: @event.EventAction,
            requestContext: @event.RequestContext
        );
    }

    /// <summary>
    /// Default return True
    /// </summary>
    public override async Task<bool> HandleWhen(PlatformCqrsEntityEvent<TEntity> @event)
    {
        return true;
    }
}

/// <summary>
/// Specialized bus message implementation for CQRS entity events that provides intelligent routing
/// and sub-queue partitioning based on entity characteristics. This class extends the base
/// <see cref="PlatformBusMessage{T}"/> to add entity-specific routing logic that ensures
/// proper message ordering and distribution across processing queues.
///
/// <para><strong>Sub-Queue Partitioning Strategy:</strong></para>
/// <para>The message implements sophisticated sub-queue routing logic:</para>
/// <para>• <strong>Composite ID Support:</strong> Uses <see cref="IUniqueCompositeIdSupport"/> for complex entity hierarchies</para>
/// <para>• <strong>Primary Key Fallback:</strong> Falls back to entity ID when composite ID is not available</para>
/// <para>• <strong>Ordered Processing:</strong> Ensures messages for the same entity are processed in sequence</para>
/// <para>• <strong>Load Distribution:</strong> Distributes different entities across available consumer instances</para>
/// <para>• <strong>Conflict Prevention:</strong> Prevents concurrent processing of the same entity</para>
///
/// <para><strong>Routing Intelligence:</strong></para>
/// <para>Smart routing capabilities include:</para>
/// <para>• Automatic determination of optimal sub-queue based on entity identity</para>
/// <para>• Support for both simple and composite entity identifiers</para>
/// <para>• Graceful handling of entities without explicit routing requirements</para>
/// <para>• Consistent routing behavior across different entity types</para>
/// <para>• Performance-optimized routing key generation</para>
///
/// <para><strong>Integration with Platform Infrastructure:</strong></para>
/// <para>The message class integrates seamlessly with:</para>
/// <para>• Message bus routing infrastructure for efficient distribution</para>
/// <para>• Consumer load balancing mechanisms</para>
/// <para>• Dead letter queue handling for failed messages</para>
/// <para>• Monitoring and observability systems</para>
/// <para>• Platform logging and tracing infrastructure</para>
///
/// <para><strong>Usage in Entity Event Processing:</strong></para>
/// <para>This message type is specifically designed for:</para>
/// <para>• Entity lifecycle event distribution</para>
/// <para>• CQRS read model synchronization</para>
/// <para>• Event-driven microservice communication</para>
/// <para>• Audit trail and change tracking systems</para>
/// <para>• Workflow and business process automation</para>
/// </summary>
/// <typeparam name="TEntity">The entity type contained in the event payload.</typeparam>
/// <typeparam name="TPrimaryKey">The primary key type of the entity.</typeparam>
public class PlatformCqrsEntityEventBusMessage<TEntity, TPrimaryKey> : PlatformBusMessage<PlatformCqrsEntityEvent<TEntity>>
    where TEntity : class, IEntity<TPrimaryKey>, new()
{
    public override string? SubQueuePrefix()
    {
        return Payload?.EntityData?.As<IUniqueCompositeIdSupport>()?.UniqueCompositeId() ?? Payload?.EntityData?.Id?.ToString();
    }
}
