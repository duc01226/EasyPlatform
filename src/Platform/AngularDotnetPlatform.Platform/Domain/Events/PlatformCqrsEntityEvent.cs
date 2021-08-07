using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    /// <summary>
    /// This is class of events which is dispatched when an entity is created/updated/deleted.
    /// Implement and <see cref="PlatformCqrsEventHandler{TEvent}"/> to handle any events.
    /// </summary>
    public class PlatformCqrsEntityEvent<TEntity, TPrimaryKey> : PlatformCqrsEvent
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        public PlatformCqrsEntityEvent() { }

        public PlatformCqrsEntityEvent(TEntity entityData, EntityEventType type, string routingKeyPrefix)
        {
            EntityData = entityData;
            Type = type;
            RoutingKeyPrefix = routingKeyPrefix;
        }

        public TEntity EntityData { get; }

        public EntityEventType Type { get; }

        /// <summary>
        /// Routing Key Prefix is used as a prefix for entity event. The RoutingKey of an event is used to binding a event-bus queue to event for listening events.
        /// RoutingKey = $"{RoutingKeyPrefix}.EntityEvent.{nameof(TEntity)}.{<see cref="EntityEventType"/>}"
        /// Usually RoutingKeyPrefix should be the unique name of a micro-service.
        /// </summary>
        public string RoutingKeyPrefix { get; }

        public override string GetRoutingKey()
        {
            return $"{RoutingKeyPrefix}.EntityEvent.{nameof(TEntity)}.{Type}";
        }
    }
}
