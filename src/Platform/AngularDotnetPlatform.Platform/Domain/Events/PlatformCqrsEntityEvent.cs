using System;
using AngularDotnetPlatform.Platform.Application.Cqrs;
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
    /// Implement and <see cref="Application.Cqrs.PlatformCqrsEventHandler{TEvent}"/> to handle any events.
    /// </summary>
    public class PlatformCqrsEntityEvent<TEntity> : PlatformCqrsEntityEvent
        where TEntity : class, IEntity, new()
    {
        public static string BuildEventAction(PlatformCqrsEntityEventCrudAction crudAction, string forBusinessAction)
        {
            return $"{crudAction}{(string.IsNullOrEmpty(forBusinessAction) ? "" : $".{forBusinessAction}")}";
        }

        public PlatformCqrsEntityEvent() { }

        public PlatformCqrsEntityEvent(TEntity entityData, PlatformCqrsEntityEventCrudAction crudAction, string businessAction = null)
        {
            Id = Guid.NewGuid().ToString();
            EntityData = entityData;
            CrudAction = crudAction;
            BusinessAction = businessAction;
        }

        public override string EventType => EventTypeValue;
        public override string EventName => EventNameValue<TEntity>();
        public override string EventAction => BuildEventAction(CrudAction, BusinessAction);

        public TEntity EntityData { get; set; }

        public PlatformCqrsEntityEventCrudAction CrudAction { get; set; }

        /// <summary>
        /// ForBusinessAction is used to give more detail about the crud operation. It could be given from a command name via repository, or the name of a domain entity action from entity action events
        /// </summary>
        public string BusinessAction { get; set; }
    }

    public class PlatformCqrsEntityEvent<TEntity, TBusinessActionPayload> : PlatformCqrsEntityEvent<TEntity>
        where TEntity : class, IEntity, new()
        where TBusinessActionPayload : class, new()
    {
        public TBusinessActionPayload BusinessActionPayload { get; set; }
    }
}
