using System;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Events
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
