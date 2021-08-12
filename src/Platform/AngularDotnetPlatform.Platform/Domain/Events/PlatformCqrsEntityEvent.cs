using AngularDotnetPlatform.Platform.Cqrs.Events;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Events
{
    public abstract class PlatformCqrsEntityEvent : PlatformCqrsEvent
    {
        public const string EventTypeValue = "EntityEvent";
        public static string EventNameValue<TEntity>()
        {
            return typeof(TEntity).Name;
        }
    }

    /// <summary>
    /// This is class of events which is dispatched when an entity is created/updated/deleted.
    /// Implement and <see cref="PlatformCqrsEventHandler{TEvent}"/> to handle any events.
    /// </summary>
    public class PlatformCqrsEntityEvent<TEntity, TPrimaryKey> : PlatformCqrsEntityEvent
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        public PlatformCqrsEntityEvent() { }

        public PlatformCqrsEntityEvent(TEntity entityData, PlatformCqrsEntityEventAction action)
        {
            Id = entityData.Id.ToString();
            EntityData = entityData;
            Action = action;
        }

        public TEntity EntityData { get; }

        public PlatformCqrsEntityEventAction Action { get; }

        public override string EventType => EventTypeValue;
        public override string EventName => EventNameValue<TEntity>();
        public override string EventAction => Action.ToString();
    }
}
