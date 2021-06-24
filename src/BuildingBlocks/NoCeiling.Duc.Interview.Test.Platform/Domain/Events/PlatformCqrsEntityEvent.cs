using System;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Events
{
    public class PlatformCqrsEntityEvent<TEntity, TPrimaryKey> : PlatformCqrsEvent
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : IEquatable<TPrimaryKey>
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
