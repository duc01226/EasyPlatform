using System;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public class PlatformCqrsEntityEvent<TEntity, TPrimaryKey> : PlatformCqrsEvent
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        public PlatformCqrsEntityEvent(TEntity entityData, EntityEventType type, string routingKeyPrefix)
        {
            EntityData = entityData;
            Type = type;
            RoutingKeyPrefix = routingKeyPrefix;
        }

        public TEntity EntityData { get; }

        public EntityEventType Type { get; }

        public string RoutingKeyPrefix { get; }

        public override string GetRoutingKey()
        {
            return $"{RoutingKeyPrefix}.{nameof(TEntity)}.{Type}";
        }
    }
}
