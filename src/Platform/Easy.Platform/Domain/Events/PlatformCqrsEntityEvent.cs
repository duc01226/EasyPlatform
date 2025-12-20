#region

using System.Diagnostics.CodeAnalysis;
using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json.Serialization;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Cqrs.Events;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.JsonSerialization;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.Infrastructures.MessageBus;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Domain.Events;

/// <summary>
/// Represents a CQRS event specifically related to entity operations within the Easy Platform domain layer.
/// Extends the base CQRS event interface with entity-specific functionality including Unit of Work tracking and handler coordination.
/// </summary>
/// <remarks>
/// This interface bridges the gap between domain entities and the CQRS event system by providing:
///
/// <para><strong>Unit of Work Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Tracks the source Unit of Work that generated the event for audit and debugging purposes</description></item>
/// <item><description>Enables correlation between entity changes and their transactional context</description></item>
/// <item><description>Supports distributed tracing and monitoring across service boundaries</description></item>
/// <item><description>Facilitates rollback scenarios and compensation patterns</description></item>
/// </list>
///
/// <para><strong>Event Handler Coordination:</strong></para>
/// <list type="bullet">
/// <item><description>Provides mechanisms to force synchronous processing for critical handlers</description></item>
/// <item><description>Enables fine-grained control over event processing order and timing</description></item>
/// <item><description>Supports scenarios where immediate consistency is required</description></item>
/// <item><description>Allows for conditional event processing based on handler types</description></item>
/// </list>
///
/// <para><strong>Domain Event Lifecycle:</strong></para>
/// <list type="bullet">
/// <item><description>Generated automatically by repository operations (Create, Update, Delete)</description></item>
/// <item><description>Carries entity state information and change metadata</description></item>
/// <item><description>Processed by domain event handlers and integration event handlers</description></item>
/// <item><description>Enables loose coupling between bounded contexts and microservices</description></item>
/// </list>
///
/// <para><strong>Common Use Cases:</strong></para>
/// <list type="bullet">
/// <item><description>Entity lifecycle events (EmployeeCreatedEvent, CandidateUpdatedEvent, GoalDeletedEvent)</description></item>
/// <item><description>Business workflow triggers (PerformanceReviewStartedEvent, AttendanceApprovedEvent)</description></item>
/// <item><description>Integration events for external systems (UserRegisteredEvent, PayrollProcessedEvent)</description></item>
/// <item><description>Audit and compliance events (DataAccessEvent, SecurityViolationEvent)</description></item>
/// </list>
/// </remarks>
public interface IPlatformCqrsEntityEvent : IPlatformCqrsEvent
{
    /// <summary>
    /// The SourceUowId property in the IPlatformCqrsEntityEvent interface is a string that likely represents the identifier of the Unit of Work (UoW) from which the event originated.
    /// <br />
    /// In the context of the Command Query Responsibility Segregation (CQRS) pattern, events are generated when changes are made to the system's state. These events are then processed by event handlers to update the read models or trigger additional actions.
    /// <br />
    /// The SourceUowId property can be used to track the origin of these changes, especially in a distributed system where multiple units of work may be operating concurrently. This can be useful for debugging, auditing, or tracing the flow of events in the system.
    /// <br />
    /// For example, if an error occurs while processing an event, knowing the SourceUowId can help identify the initial operation that led to the event being generated. Similarly, in an auditing scenario, the SourceUowId can provide information about which unit of work was responsible for a particular change in the system's state.
    /// </summary>
    public string SourceUowId { get; set; }

    /// <summary>
    /// Sets the event to wait for a specific handler to finish execution immediately.
    /// </summary>
    /// <typeparam name="THandler">The type of the event handler.</typeparam>
    /// <returns>The event instance.</returns>
    public PlatformCqrsEntityEvent SetForceWaitEventHandlerFinished<THandler>()
        where THandler : IPlatformCqrsEventHandler;
}

/// <summary>
/// Interface to support domain events in an entity, allowing tracking of domain event actions.
/// <br />
/// It holds a list of domain events represented as key-value pairs where the key is the event name and the value is the serialized event data.
/// </summary>
public interface IPlatformCqrsDomainEventsSupportEntityEvent
{
    /// <summary>
    /// Gets or sets a collection of domain events where each event is represented as a key-value pair.
    /// The key represents the event name, and the value represents the event serialized as JSON.
    /// <br />
    /// This property helps to capture actions that have occurred within the entity, such as changes to its state.
    /// </summary>
    public List<KeyValuePair<string, string>> DomainEvents { get; set; }
}

/// <summary>
/// Generic version of the <see cref="IPlatformCqrsDomainEventsSupportEntityEvent" /> interface,
/// designed to support domain events in a specific entity type.
/// <br />
/// It allows for strongly-typed domain event handling for the specified entity type <typeparamref name="TEntity" />.
/// </summary>
/// <typeparam name="TEntity">The type of entity associated with the domain events.</typeparam>
public interface IPlatformCqrsDomainEventsSupportEntityEvent<TEntity> : IPlatformCqrsDomainEventsSupportEntityEvent
{
}

/// <summary>
/// Provides extension methods for <see cref="IPlatformCqrsDomainEventsSupportEntityEvent"/>.
/// </summary>
public static class PlatformCqrsDomainEventsSupportEntityEventExtensions
{
    /// <summary>
    /// Finds and retrieves a list of specific domain events associated with an entity.
    /// </summary>
    /// <typeparam name="TEvent">The type of domain event to find. Must be a type of ISupportDomainEventsEntity.DomainEvent.</typeparam>
    /// <param name="event">The entity event.</param>
    /// <param name="customDomainEventName">Optional custom domain event name.</param>
    /// <returns>A list of domain events of type TEvent associated with the entity.</returns>
    /// <remarks>
    /// The FindEvents[TEvent]() method in the PlatformCqrsEntityEvent[TEntity] class is used to find and retrieve a list of specific domain events associated with an entity.
    /// <br />
    /// This method is generic and takes a type parameter TEvent which must be a type of ISupportDomainEventsEntity.DomainEvent. It filters the DomainEvents property, which is a list of key-value pairs where the key is the event name and the value is the serialized event data, to find events that match the default event name for the TEvent type.
    /// <br />
    /// The method then deserializes the event data into instances of TEvent using the PlatformJsonSerializer.TryDeserializeOrDefault[TEvent] method and returns a list of these instances.
    /// <br />
    /// This method is useful in scenarios where you need to process specific types of domain events associated with an entity. For example, in the provided code snippets, it is used to find and process events such as User.PropertyRelatedToCustomFieldChangedDomainEvent, User.SetNeedToUpdateConnectionEvent, CandidateEntity.UpsertApplicationsDomainEvent, CandidateEntity.ChangeRejectStatusApplicationDomainEvent, and TextSnippetEntity.EncryptSnippetTextDomainEvent.
    /// <br />
    /// This method is a part of the Domain-Driven Design (DDD) approach, where domain events are used to capture side effects resulting from changes to the domain.
    /// </remarks>
    public static List<TEvent> FindEvents<TEvent>(this IPlatformCqrsDomainEventsSupportEntityEvent @event, string? customDomainEventName = null)
        where TEvent : ISupportDomainEventsEntity.DomainEvent
    {
        return @event
            .DomainEvents.Where(p => p.Key == (customDomainEventName ?? ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<TEvent>()))
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<TEvent>(p.Value))
            .ToList();
    }

    /// <summary>
    /// Finds and returns a specific FieldUpdatedDomainEvent from the list of domain events associated with an entity.
    /// </summary>
    /// <typeparam name="TValue">The type of the field value.</typeparam>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="event">The entity event.</param>
    /// <param name="field">A lambda expression that specifies the field of the entity.</param>
    /// <returns>A FieldUpdatedDomainEvent that matches the specified field, or null if no such event is found.</returns>
    /// <remarks>
    /// The FindFieldUpdatedEvent[TValue] method in the PlatformCqrsEntityEvent[TEntity] class is used to find and return a specific FieldUpdatedDomainEvent from the list of domain events associated with an entity. This method is useful when you need to check if a specific field of an entity was updated during a CRUD operation.
    /// <br />
    /// The method takes an Expression[Func[TEntity, TValue]] as a parameter, which represents a lambda expression that specifies the field of the entity. It then checks the DomainEvents list for a FieldUpdatedDomainEvent that matches the specified field. If such an event is found, it is returned; otherwise, the method returns null.
    /// <br />
    /// This method is used in event handlers, such as CreateGoalActionHistoryOnUpdateGoalEntityEventHandler and SendEmailOnCreateOrUpdateAttendanceRequestEntityEventHandler, to check if specific fields were updated and to handle these updates accordingly. For example, if the Measurement field of a Goal entity was updated, an action history might be created; or if the Status field of an AttendanceRequest entity was updated, an email notification might be sent.
    /// </remarks>
    public static ISupportDomainEventsEntity.FieldUpdatedDomainEvent<TValue>? FindFieldUpdatedEvent<TValue, TEntity>(
        this IPlatformCqrsDomainEventsSupportEntityEvent<TEntity> @event,
        Expression<Func<TEntity, TValue>> field
    )
    {
        return @event
            .DomainEvents.Where(p => p.Key == ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<ISupportDomainEventsEntity.FieldUpdatedDomainEvent>())
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<ISupportDomainEventsEntity.FieldUpdatedDomainEvent<TValue>>(p.Value))
            .FirstOrDefault(p => p != null && p.FieldName == field.GetPropertyName());
    }

    /// <summary>
    /// Checks if any of the specified fields have associated field update events.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="event">The entity event.</param>
    /// <param name="fields">An array of expressions specifying the fields to check for update events. If empty, just check any domain events</param>
    /// <returns>True if any of the specified fields have an update event, false otherwise.</returns>
    public static bool HasAnyFieldUpdatedEvents<TEntity>(
        this IPlatformCqrsDomainEventsSupportEntityEvent<TEntity> @event,
        params Expression<Func<TEntity, object>>[] fields)
    {
        if (fields == null || fields.Length == 0)
            return @event.DomainEvents.Any();

        var fieldNames = fields.Select(p => p.GetPropertyName()).ToHashSet();

        return @event
            .DomainEvents.Where(p => p.Key == ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<ISupportDomainEventsEntity.FieldUpdatedDomainEvent>())
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<ISupportDomainEventsEntity.FieldUpdatedDomainEvent<object>>(p.Value))
            .Any(p => p != null && fieldNames.Contains(p.FieldName));
    }
}

/// <summary>
/// Abstract base class for CQRS entity events.
/// </summary>
public abstract class PlatformCqrsEntityEvent : PlatformCqrsEvent, IPlatformUowEvent, IPlatformCqrsEntityEvent
{
    /// <summary>
    /// The event type value for entity events.
    /// </summary>
    public const string EventTypeValue = nameof(PlatformCqrsEntityEvent);

    /// <summary>
    /// Gets or sets the CRUD action that triggered the event.
    /// </summary>
    public PlatformCqrsEntityEventCrudAction CrudAction { get; set; }

    /// <summary>
    /// Gets or sets the entity data associated with the event.
    /// </summary>
    public object EntityData { get; set; }

    /// <summary>
    /// Existing entity data before update/delete. Only available for entity implement <see cref="IRowVersionEntity" /> or entity with attribute <see cref="TrackFieldUpdatedDomainEventAttribute" />
    /// </summary>
    public object? ExistingEntityData { get; set; }

    /// <inheritdoc cref="PlatformCqrsEvent.SetWaitHandlerExecutionFinishedImmediately" />
    /// <summary>
    /// Sets the event to wait for a specific handler to finish execution immediately.
    /// </summary>
    /// <typeparam name="THandler">The type of the event handler.</typeparam>
    /// <returns>The event instance.</returns>
    public virtual PlatformCqrsEntityEvent SetForceWaitEventHandlerFinished<THandler>()
        where THandler : IPlatformCqrsEventHandler
    {
        return SetWaitHandlerExecutionFinishedImmediately(typeof(THandler)).Cast<PlatformCqrsEntityEvent>();
    }

    /// <summary>
    /// Gets or sets the ID of the source unit of work.
    /// </summary>
    public string SourceUowId { get; set; }

    /// <summary>
    /// Sends an entity event.
    /// </summary>
    private static async Task SendEvent<TEvent>(
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformUnitOfWork? mappedToDbContextUow,
        Func<TEvent> eventBuilder,
        Action<TEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken,
        Action? beforeSendEvent = null
    )
        where TEvent : PlatformCqrsEntityEvent
    {
        if (IsAnyEventHandlerRegistered<TEvent>(rootServiceProvider))
        {
            beforeSendEvent?.Invoke();

            var entityEvent = eventBuilder()
                .With(@event => eventCustomConfig?.Invoke(@event))
                .WithIf(mappedToDbContextUow != null && !mappedToDbContextUow.IsPseudoTransactionUow(), @event => @event.SourceUowId = mappedToDbContextUow?.Id)
                .WithIf(requestContext != null, @event => @event.SetRequestContextValues(requestContext!()))
                .WithIf(p => eventStackTrace != null, p => p.StackTrace = eventStackTrace);

            if (mappedToDbContextUow?.CreatedByUnitOfWorkManager != null)
                await mappedToDbContextUow.CreatedByUnitOfWorkManager.CurrentSameScopeCqrs.SendEvent(entityEvent, cancellationToken);
            else
                await rootServiceProvider.ExecuteInjectScopedAsync((IPlatformCqrs cqrs) => cqrs.SendEvent(entityEvent, cancellationToken));
        }
    }

    /// <summary>
    /// Gets the stack trace for an entity event if distributed tracing is enabled and any event handlers are registered.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <param name="dismissSendEvent">A flag to indicate whether to dismiss sending the event.</param>
    /// <returns>The distributed tracing stack trace, or null.</returns>
    public static string GetEntityEventStackTrace<TEntity>(IPlatformRootServiceProvider rootServiceProvider, bool dismissSendEvent)
        where TEntity : class, IEntity, new()
    {
        return !dismissSendEvent && IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(rootServiceProvider)
            ? rootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.GetStackTraceIfEnabled()
            : null;
    }

    /// <summary>
    /// Checks if any event handlers are registered for a specific event type.
    /// </summary>
    /// <typeparam name="TEvent">The type of the event.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <returns>True if any handlers are registered, otherwise false.</returns>
    public static bool IsAnyEventHandlerRegistered<TEvent>(IPlatformRootServiceProvider rootServiceProvider)
        where TEvent : PlatformCqrsEntityEvent
    {
        return rootServiceProvider.ImplementationAssignableToServiceTypeRegisteredCount(typeof(IPlatformCqrsEventHandler<TEvent>)) > 0;
    }

    /// <summary>
    /// Checks if any event handlers are registered for a specific entity type.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <returns>True if any handlers are registered, otherwise false.</returns>
    public static bool IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(IPlatformRootServiceProvider rootServiceProvider)
        where TEntity : class, IEntity, new()
    {
        return IsAnyEventHandlerRegistered<PlatformCqrsEntityEvent<TEntity>>(rootServiceProvider);
    }

    /// <summary>
    /// Checks if any event handlers are registered for bulk entity events of a specific entity type.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <returns>True if any handlers are registered, otherwise false.</returns>
    public static bool IsAnyBulkEntitiesEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(IPlatformRootServiceProvider rootServiceProvider)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return IsAnyEventHandlerRegistered<PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey>>(rootServiceProvider);
    }

    /// <summary>
    /// Checks if any kind of event handlers (single or bulk) are registered for a specific entity type.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <returns>True if any handlers are registered, otherwise false.</returns>
    public static bool IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(IPlatformRootServiceProvider rootServiceProvider)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return IsAnyEntityEventHandlerRegisteredForEntity<TEntity>(rootServiceProvider)
               || IsAnyBulkEntitiesEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(rootServiceProvider);
    }

    /// <summary>
    /// Sends a single entity event.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    public static Task SendEvent<TEntity>(
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformUnitOfWork mappedToDbContextUow,
        TEntity entity,
        TEntity existingOriginalEntity,
        PlatformCqrsEntityEventCrudAction crudAction,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken,
        Action? beforeSendEvent = null
    )
        where TEntity : class, IEntity, new()
    {
        return SendEvent<PlatformCqrsEntityEvent<TEntity>>(
            rootServiceProvider,
            mappedToDbContextUow,
            () =>
                new PlatformCqrsEntityEvent<TEntity>(entity, crudAction).WithIf(
                    entity.As<IEntity>().HasTrackValueUpdatedDomainEventAttribute(),
                    @event => @event.ExistingOriginalEntityData = existingOriginalEntity
                ),
            eventCustomConfig,
            requestContext,
            eventStackTrace,
            cancellationToken,
            beforeSendEvent
        );
    }

    /// <summary>
    /// Sends a bulk entities event.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    public static Task SendBulkEntitiesEvent<TEntity, TPrimaryKey>(
        IPlatformRootServiceProvider rootServiceProvider,
        [AllowNull] IPlatformUnitOfWork mappedToDbContextUow,
        List<TEntity> entities,
        PlatformCqrsEntityEventCrudAction crudAction,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return SendEvent<PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey>>(
            rootServiceProvider,
            mappedToDbContextUow,
            () => new PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey>(entities, crudAction),
            eventCustomConfig,
            requestContext,
            eventStackTrace,
            cancellationToken
        );
    }

    /// <summary>
    /// Executes a delete action and sends a corresponding entity event.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <typeparam name="TResult">The type of the result of the delete action.</typeparam>
    /// <returns>The result of the delete action.</returns>
    public static async Task<TResult> ExecuteWithSendingDeleteEntityEvent<TEntity, TPrimaryKey, TResult>(
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformUnitOfWork? mappedToDbContextUow,
        TEntity entity,
        Func<TEntity, Task<TResult>> deleteEntityAction,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var result = await deleteEntityAction(entity)
            .ThenActionAsync(async _ =>
            {
                if (!dismissSendEvent)
                {
                    await SendEvent(
                        rootServiceProvider,
                        mappedToDbContextUow,
                        entity,
                        entity,
                        PlatformCqrsEntityEventCrudAction.Deleted,
                        eventCustomConfig,
                        requestContext,
                        eventStackTrace,
                        cancellationToken,
                        beforeSendEvent: () =>
                        {
                            if (entity is IValidatableEntity validatableEntity)
                                validatableEntity.BeforeSendEntityDeletedEventValidate()?.EnsureValid();
                        }
                    );
                }
            });

        return result;
    }

    /// <summary>
    /// Executes a create action and sends a corresponding entity event.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <typeparam name="TResult">The type of the result of the create action.</typeparam>
    /// <returns>The result of the create action.</returns>
    public static async Task<TResult> ExecuteWithSendingCreateEntityEvent<TEntity, TPrimaryKey, TResult>(
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformUnitOfWork mappedToDbContextUow,
        TEntity entity,
        Func<TEntity, Task<TResult>> createEntityAction,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        var result = await createEntityAction(entity)
            .ThenActionAsync(_ =>
            {
                if (!dismissSendEvent)
                {
                    return SendEvent(
                        rootServiceProvider,
                        mappedToDbContextUow,
                        entity,
                        null,
                        PlatformCqrsEntityEventCrudAction.Created,
                        eventCustomConfig,
                        requestContext,
                        eventStackTrace,
                        cancellationToken
                    );
                }

                return Task.CompletedTask;
            });

        return result;
    }

    /// <summary>
    /// Executes an update action and sends a corresponding entity event.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <typeparam name="TResult">The type of the result of the update action.</typeparam>
    /// <returns>The result of the update action.</returns>
    public static async Task<TResult> ExecuteWithSendingUpdateEntityEvent<TEntity, TPrimaryKey, TResult>(
        IPlatformRootServiceProvider rootServiceProvider,
        IPlatformUnitOfWork unitOfWork,
        TEntity entity,
        TEntity? existingOriginalEntity,
        Func<TEntity, Task<(TResult result, bool isDataChanged)>> updateEntityAction,
        bool dismissSendEvent,
        Action<PlatformCqrsEntityEvent> eventCustomConfig,
        Func<IDictionary<string, object>> requestContext,
        string eventStackTrace,
        CancellationToken cancellationToken = default
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (!dismissSendEvent && existingOriginalEntity != null)
            entity.AutoAddFieldUpdatedEvent(existingOriginalEntity);

        var (result, _) = await updateEntityAction(entity)
            .ThenActionAsync(p =>
            {
                if (!dismissSendEvent && p.isDataChanged)
                {
                    return SendEvent(
                        rootServiceProvider,
                        unitOfWork,
                        entity,
                        existingOriginalEntity,
                        PlatformCqrsEntityEventCrudAction.Updated,
                        eventCustomConfig,
                        requestContext,
                        eventStackTrace,
                        cancellationToken
                    );
                }

                return Task.CompletedTask;
            });

        return result;
    }

    /// <summary>
    /// Gets the stack trace for a bulk entities event if distributed tracing is enabled and any event handlers are registered.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the primary key of the entity.</typeparam>
    /// <param name="rootServiceProvider">The root service provider.</param>
    /// <returns>The distributed tracing stack trace, or null.</returns>
    public static string GetBulkEntitiesEventStackTrace<TEntity, TPrimaryKey>(IPlatformRootServiceProvider rootServiceProvider)
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        return IsAnyBulkEntitiesEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(rootServiceProvider)
            ? rootServiceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.GetStackTraceIfEnabled()
            : null;
    }
}

/// <summary>
/// This is class of events which is dispatched when an entity is created/updated/deleted.
/// Implement and <see cref="Application.Cqrs.Events.PlatformCqrsEventApplicationHandler{TEvent}" /> to handle any events.
/// </summary>
/// <remarks>
/// The PlatformCqrsEntityEvent[TEntity] class in C# is an event class used in the context of the CQRS (Command Query Responsibility Segregation) pattern. It is designed to represent events that occur when an entity is created, updated, or deleted in the system.
/// <br />
/// The class is generic, with TEntity being the type of the entity that the event is related to. This entity must implement the IEntity interface.
/// <br />
/// The class contains properties such as EntityData (the data of the entity involved in the event), CrudAction (the type of CRUD operation that triggered the event), and DomainEvents (a list of domain events associated with the entity).
/// <br />
/// The class also provides methods to find specific types of events, check if any field update events exist, and clone the event.
/// <br />
/// This class is used throughout the system to handle entity-related events, allowing different parts of the system to react to these events in a decoupled manner. For example, it's used in various event handlers and message producers/consumers to handle or propagate these events.
/// <br />
/// In summary, PlatformCqrsEntityEvent[TEntity] is a key part of the event-driven architecture of the system, facilitating the handling and propagation of entity-related events.
/// </remarks>
public class PlatformCqrsEntityEvent<TEntity> : PlatformCqrsEntityEvent, IPlatformSubMessageQueuePrefixSupport, IPlatformCqrsDomainEventsSupportEntityEvent<TEntity>
    where TEntity : class, IEntity, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsEntityEvent{TEntity}"/> class.
    /// </summary>
    public PlatformCqrsEntityEvent() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsEntityEvent{TEntity}"/> class.
    /// </summary>
    /// <param name="entityData">The entity data.</param>
    /// <param name="crudAction">The CRUD action.</param>
    public PlatformCqrsEntityEvent(TEntity entityData, PlatformCqrsEntityEventCrudAction crudAction)
    {
        AuditTrackId = Ulid.NewUlid().ToString();
        EntityData = entityData;
        CrudAction = crudAction;

        if (entityData is ISupportDomainEventsEntity businessActionEventsEntity)
            DomainEvents = businessActionEventsEntity.GetDomainEvents()
                .Select(p => new KeyValuePair<string, string>(p.Key, PlatformJsonSerializer.Serialize(p.Value)))
                .ToList();
    }

    /// <summary>
    /// Gets the type of the event.
    /// </summary>
    public override string EventType => EventTypeValue;

    /// <summary>
    /// Gets the name of the event, which is the name of the entity type.
    /// </summary>
    public override string EventName => typeof(TEntity).Name;

    /// <summary>
    /// Gets the action of the event, which is the string representation of the CRUD action.
    /// </summary>
    public override string EventAction => CrudAction.ToString();

    /// <summary>
    /// Gets or sets the entity data associated with the event.
    /// </summary>
    public new TEntity EntityData { get; set; }

    /// <summary>
    /// Existing entity data before update/delete. Only available for entity with attribute <see cref="TrackFieldUpdatedDomainEventAttribute" />
    /// </summary>
    public TEntity? ExistingOriginalEntityData { get; set; }

    /// <summary>
    /// Gets or sets the list of domain events associated with the entity.
    /// </summary>
    public List<KeyValuePair<string, string>> DomainEvents { get; set; } = [];

    /// <summary>
    /// Gets the sub-queue prefix for the message bus, which is the entity's ID.
    /// </summary>
    /// <returns>The entity's ID as a string.</returns>
    public string SubQueuePrefix()
    {
        return EntityData?.GetId()?.ToString();
    }

    /// <summary>
    /// Gets a list of fields that were updated.
    /// </summary>
    /// <returns>A list of <see cref="ISupportDomainEventsEntity.FieldUpdatedDomainEvent"/>.</returns>
    public List<ISupportDomainEventsEntity.FieldUpdatedDomainEvent> GetUpdatedFields()
    {
        if (EntityData == null || ExistingOriginalEntityData == null)
            return [];

        return typeof(TEntity)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(prop => prop.GetCustomAttribute<JsonIgnoreAttribute>() == null)
            .Select(prop =>
            {
                var oldValue = prop.GetValue(ExistingOriginalEntityData);
                var newValue = prop.GetValue(EntityData);

                return oldValue.IsValuesDifferent(newValue) ? ISupportDomainEventsEntity.FieldUpdatedDomainEvent.Create(prop.Name, oldValue, newValue) : null;
            })
            .WhereNotNull()
            .ToList();
    }
}

/// <summary>
/// This is class of events which is dispatched when list of entities is createdMany/updatedMany/deletedMany.
/// Implement and <see cref="Application.Cqrs.Events.PlatformCqrsEventApplicationHandler{TEvent}" /> to handle any events.
/// </summary>
public class PlatformCqrsBulkEntitiesEvent<TEntity, TPrimaryKey> : PlatformCqrsEntityEvent
    where TEntity : class, IEntity<TPrimaryKey>, new()
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsBulkEntitiesEvent{TEntity, TPrimaryKey}"/> class.
    /// </summary>
    public PlatformCqrsBulkEntitiesEvent() { }

    /// <summary>
    /// Initializes a new instance of the <see cref="PlatformCqrsBulkEntitiesEvent{TEntity, TPrimaryKey}"/> class.
    /// </summary>
    /// <param name="entities">The list of entities.</param>
    /// <param name="crudAction">The CRUD action.</param>
    public PlatformCqrsBulkEntitiesEvent(IList<TEntity> entities, PlatformCqrsEntityEventCrudAction crudAction)
    {
        AuditTrackId = Ulid.NewUlid().ToString();
        Entities = entities;
        CrudAction = crudAction;

        if (typeof(TEntity).IsAssignableTo(typeof(ISupportDomainEventsEntity)))
        {
            DomainEvents = entities
                .GroupBy(p => p.Id)
                .ToDictionary(
                    group => group.Key,
                    group =>
                        group
                            .AsEnumerable()
                            .SelectMany(entity =>
                                entity
                                    .As<ISupportDomainEventsEntity>()
                                    .GetDomainEvents()
                                    .Select(p => new KeyValuePair<string, string>(p.Key, PlatformJsonSerializer.Serialize(p.Value)))
                            )
                            .ToList()
                );
        }
    }

    /// <summary>
    /// Gets the type of the event.
    /// </summary>
    public override string EventType => EventTypeValue;

    /// <summary>
    /// Gets the name of the event, which is the name of the entity type.
    /// </summary>
    public override string EventName => typeof(TEntity).Name;

    /// <summary>
    /// Gets the action of the event, which is the string representation of the CRUD action.
    /// </summary>
    public override string EventAction => CrudAction.ToString();

    /// <summary>
    /// Gets or sets the list of entities associated with the event.
    /// </summary>
    public IList<TEntity> Entities { get; set; }

    /// <summary>
    /// DomainEvents is used to give more detail about the domain event action inside entity.<br />
    /// It is a dictionary of EntityId => list of DomainEventName-DomainEventAsJson from entity domain events
    /// </summary>
    public Dictionary<TPrimaryKey, List<KeyValuePair<string, string>>> DomainEvents { get; set; } = [];

    /// <summary>
    /// Finds domain events of a specific type for a given entity.
    /// </summary>
    /// <typeparam name="TEvent">The type of the domain event.</typeparam>
    /// <param name="entityId">The ID of the entity.</param>
    /// <returns>A list of deserialized domain events.</returns>
    public List<TEvent> FindEvents<TEvent>(TPrimaryKey entityId)
        where TEvent : ISupportDomainEventsEntity.DomainEvent
    {
        return DomainEvents[entityId]
            .Where(p => p.Key == ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<TEvent>())
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<TEvent>(p.Value))
            .ToList();
    }

    /// <summary>
    /// Finds a field updated event for a specific field of an entity.
    /// </summary>
    /// <typeparam name="TValue">The type of the field value.</typeparam>
    /// <param name="entityId">The ID of the entity.</param>
    /// <param name="field">An expression representing the field.</param>
    /// <returns>The deserialized field updated event, or null if not found.</returns>
    public ISupportDomainEventsEntity.FieldUpdatedDomainEvent<TValue> FindFieldUpdatedEvent<TValue>(TPrimaryKey entityId, Expression<Func<TEntity, TValue>> field)
    {
        return DomainEvents[entityId]
            .Where(p => p.Key == ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<ISupportDomainEventsEntity.FieldUpdatedDomainEvent>())
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<ISupportDomainEventsEntity.FieldUpdatedDomainEvent<TValue>>(p.Value))
            .FirstOrDefault(p => p != null && p.FieldName == field.GetPropertyName());
    }

    /// <summary>
    /// Checks if any of the specified fields have been updated for a given entity.
    /// </summary>
    /// <param name="entityId">The ID of the entity.</param>
    /// <param name="fields">Expressions representing the fields to check.</param>
    /// <returns>True if any of the fields have been updated, otherwise false.</returns>
    public bool HasAnyFieldUpdated(TPrimaryKey entityId, params Expression<Func<TEntity, object>>[] fields)
    {
        var fieldNames = fields.Select(p => p.GetPropertyName()).ToHashSet();

        return DomainEvents[entityId]
            .Where(p => p.Key == ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<ISupportDomainEventsEntity.FieldUpdatedDomainEvent>())
            .Select(p => PlatformJsonSerializer.TryDeserializeOrDefault<ISupportDomainEventsEntity.FieldUpdatedDomainEvent<object>>(p.Value))
            .Any(p => p != null && fieldNames.Contains(p.FieldName));
    }

    /// <summary>
    /// Creates a shallow copy of the event.
    /// </summary>
    /// <returns>A new <see cref="PlatformCqrsEntityEvent{TEntity}"/> instance.</returns>
    public PlatformCqrsEntityEvent<TEntity> Clone()
    {
        return MemberwiseClone().As<PlatformCqrsEntityEvent<TEntity>>();
    }
}

/// <summary>
/// Represents the CRUD action of an entity event.
/// </summary>
public enum PlatformCqrsEntityEventCrudAction
{
    /// <summary>
    /// The entity was created.
    /// </summary>
    Created,

    /// <summary>
    /// The entity was updated.
    /// </summary>
    Updated,

    /// <summary>
    /// The entity was deleted.
    /// </summary>
    Deleted
}
