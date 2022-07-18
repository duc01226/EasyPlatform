using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Entities;

namespace Easy.Platform.Domain.Events
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
    /// Implement and <see cref="Application.Cqrs.PlatformCqrsEventApplicationHandler{TEvent}"/> to handle any events.
    /// </summary>
    public class PlatformCqrsEntityEvent<TEntity> : PlatformCqrsEntityEvent
        where TEntity : class, IEntity, new()
    {
        public PlatformCqrsEntityEvent() { }

        public PlatformCqrsEntityEvent(
            TEntity entityData,
            PlatformCqrsEntityEventCrudAction crudAction)
        {
            Id = Guid.NewGuid().ToString();
            EntityData = entityData;
            CrudAction = crudAction;

            if (entityData is ISupportBusinessActionEventsEntity businessActionEventsEntity)
            {
                BusinessActionEvents = businessActionEventsEntity.GetBusinessActionEvents()
                    .Select(p => new KeyValuePair<string, string>(p.Key, PlatformJsonSerializer.Serialize(p.Value)))
                    .ToList();
            }
        }

        public override string EventType => EventTypeValue;
        public override string EventName => EventNameValue<TEntity>();
        public override string EventAction => CrudAction.ToString();

        public TEntity EntityData { get; set; }

        public PlatformCqrsEntityEventCrudAction CrudAction { get; set; }

        /// <summary>
        /// BusinessAction is used to give more detail about the crud operation.<br/>
        /// It is a list of action-actionPayloadJson from entity action events
        /// </summary>
        public List<KeyValuePair<string, string>> BusinessActionEvents { get; set; } =
            new List<KeyValuePair<string, string>>();

        public List<TEventPayload> FindBusinessActionEvents<TEventPayload>(string eventName)
        {
            return BusinessActionEvents
                .Where(p => p.Key == eventName)
                .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<TEventPayload>(p.Value))
                .ToList();
        }
    }
}
