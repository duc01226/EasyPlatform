using System;
using AngularDotnetPlatform.Platform.Application.Cqrs.Events;
using AngularDotnetPlatform.Platform.Common.Cqrs.Events;
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
    /// Implement and <see cref="PlatformCqrsApplicationEventHandler{TEvent}"/> to handle any events.
    /// </summary>
    public class PlatformCqrsEntityEvent<TEntity> : PlatformCqrsEntityEvent
        where TEntity : class, IEntity, new()
    {
        public static string BuildEventAction(PlatformCqrsEntityEventCrudAction crudAction, string forBusinessAction)
        {
            return $"{crudAction}{(string.IsNullOrEmpty(forBusinessAction) ? "" : $".{forBusinessAction}")}";
        }

        public PlatformCqrsEntityEvent() { }

        public PlatformCqrsEntityEvent(TEntity entityData, PlatformCqrsEntityEventCrudAction crudAction, string forBusinessAction = null)
        {
            Id = Guid.NewGuid().ToString();
            EntityData = entityData;
            CrudAction = crudAction;
            ForBusinessAction = forBusinessAction;
        }

        public TEntity EntityData { get; set; }

        public PlatformCqrsEntityEventCrudAction CrudAction { get; set; }

        public string ForBusinessAction { get; set; }

        public override string EventType => EventTypeValue;
        public override string EventName => EventNameValue<TEntity>();
        public override string EventAction => BuildEventAction(CrudAction, ForBusinessAction);
    }
}
