#region

using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Validations;
using Easy.Platform.Common.Validations.Validators;

#endregion

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// This interface is used for conventional type scan for entities.
/// </summary>
public interface IEntity
{
    private static readonly ConcurrentDictionary<Type, EntityIdExpressionInfo> GetIdsContainExprInfoCache = new();

    /// <summary>
    /// Gets the primary key of the entity in a non-generic way.
    /// </summary>
    /// <returns>The primary key of the entity as an object.</returns>
    public object GetId();

    /// <summary>
    /// Creates an expression to identify a single entity.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="entity">The entity to identify.</param>
    /// <returns>An expression that identifies the entity by its ID or composite ID.</returns>
    public static Expression<Func<TEntity, bool>> IdentifyExpr<TEntity>(TEntity entity)
        where TEntity : IEntity
    {
        return IdentifyExpr([entity]);
    }

    /// <summary>
    /// Creates an expression to identify multiple entities.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entities.</typeparam>
    /// <param name="entities">The list of entities to identify.</param>
    /// <returns>
    /// An expression that identifies the entities by their IDs or composite IDs.
    /// If entities implement IEntity&lt;&gt;, creates a "Contains" expression for the IDs.
    /// If entities implement IUniqueCompositeIdSupport&lt;TEntity&gt;, combines the FindByUniqueCompositeIdExpr expressions with OR.
    /// </returns>
    /// <exception cref="ArgumentException">Thrown if the entities do not implement required interfaces.</exception>
    public static Expression<Func<TEntity, bool>> IdentifyExpr<TEntity>(IList<TEntity> entities)
        where TEntity : IEntity
    {
        if (!entities.Any())
            return p => false;

        // Case 1: TEntity implements IEntity<>
        if (typeof(TEntity).IsAssignableToGenericType(typeof(IEntity<>)))
        {
            var exprInfo = GetIdsContainExprInfoCache.GetOrAdd(
                typeof(TEntity),
                p => GetIdsContainExprInfo()); // Get the IDs of the entities => Ensure ids are the correct type (cast to the correct primary key type) => Create the Expression for the ids array
            var idsExpr = entities
                .SelectList(entity => Convert.ChangeType(entity.GetId(), exprInfo.IdType))
                .Pipe(typedIds =>
                {
                    // Create an instance of a list of the specified ID type using Activator.CreateInstance
                    var listInstance = Activator.CreateInstance(exprInfo.ListIdType);

                    // Use reflection to add the items to the list
                    foreach (var id in typedIds)
                        exprInfo.ListIdAddMethodInfo.Invoke(listInstance, [id]);

                    return Expression.Constant(listInstance, exprInfo.ListIdType);
                });

            // Create the 'Contains' expression
            var containsExpr = Expression.Call(exprInfo.ContainsMethod, idsExpr, exprInfo.IdPropertyExpr);

            return Expression.Lambda<Func<TEntity, bool>>(containsExpr, exprInfo.Parameter);
        }

        // Case 2: TEntity implements IUniqueCompositeIdSupport<TEntity>
        if (entities.First() is IUniqueCompositeIdSupport<TEntity>)
        {
            var conditions = entities.OfType<IUniqueCompositeIdSupport<TEntity>>().Select(entity => entity.FindByUniqueCompositeIdExpr()).ToArray();

            // Aggregate the conditions with OR
            var combinedCondition = conditions.Aggregate((current, next) =>
                Expression.Lambda<Func<TEntity, bool>>(
                    Expression.OrElse(current.Body, Expression.Invoke(next, current.Parameters)),
                    current.Parameters
                )
            );

            return combinedCondition;
        }

        throw new ArgumentException(
            $"Entities of type {typeof(TEntity).FullName} must implement {typeof(IEntity<>).FullName} or {typeof(IUniqueCompositeIdSupport<TEntity>).FullName}",
            nameof(entities)
        );

        /// <summary>
        /// Gathers information needed to build a "Contains" expression for entity IDs.
        /// </summary>
        /// <returns>EntityIdExpressionInfo containing all components needed for the expression.</returns>
        /// <exception cref="InvalidOperationException">Thrown if the entity type does not have an Id property.</exception>
        static EntityIdExpressionInfo GetIdsContainExprInfo()
        {
            // Get the primary key property (Id) and its type
            var idProperty = typeof(TEntity).GetProperty(nameof(IEntity<object>.Id));
            if (idProperty == null)
                throw new InvalidOperationException($"Type {typeof(TEntity).FullName} must have an '{nameof(IEntity<object>.Id)}' property.");

            // Get the type of the Id property (the key type)
            var idType = idProperty.PropertyType;

            // Prepare the parameter for the expression
            var parameter = Expression.Parameter(typeof(TEntity), "p");

            // Create an expression for the 'Contains' method
            var idPropertyExpr = Expression.Property(parameter, idProperty);
            var containsMethod = typeof(Enumerable)
                .GetMethods()
                .First(m => m.Name == "Contains" && m.GetParameters().Length == 2)
                .MakeGenericMethod(idType);

            // Create an instance of a list of the specified ID type using Activator.CreateInstance
            var listIdType = typeof(List<>).MakeGenericType(idType);

            // Use reflection to add the items to the list
            var listIdAddMethodInfo = listIdType.GetMethod("Add");

            return new EntityIdExpressionInfo(idType, parameter, idPropertyExpr, containsMethod, listIdType, listIdAddMethodInfo);
        }
    }

    /// <summary>
    /// Filters out items that already exist in a given list.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entities.</typeparam>
    /// <param name="items">The list of items to filter.</param>
    /// <param name="existingItems">The list of existing items.</param>
    /// <returns>A list of items that do not exist in the existing items list, based on ID comparison.</returns>
    public static List<TEntity> FilterNotExistingItems<TEntity>(List<TEntity> items, List<TEntity> existingItems)
        where TEntity : IEntity
    {
        var existingItemIds = existingItems.Select(p => p.GetId()).ToHashSet();

        return items.Where(p => !existingItemIds.Contains(p.GetId())).ToList();
    }

    /// <summary>
    /// Holds information required to build entity identification expressions using primary keys.
    /// </summary>
    private sealed class EntityIdExpressionInfo
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="EntityIdExpressionInfo"/> class.
        /// </summary>
        /// <param name="idType">The type of the entity's Id property.</param>
        /// <param name="parameter">The parameter expression used in the LINQ expression.</param>
        /// <param name="idPropertyExpr">Expression for accessing the Id property of the entity.</param>
        /// <param name="containsMethod">The Contains method for checking if a collection contains the entity's Id.</param>
        /// <param name="listIdType">The generic list type corresponding to the Id type.</param>
        /// <param name="listIdAddMethodInfo">The Add method of the generic list type.</param>
        public EntityIdExpressionInfo(
            Type idType,
            ParameterExpression parameter,
            MemberExpression idPropertyExpr,
            MethodInfo containsMethod,
            Type listIdType,
            MethodInfo listIdAddMethodInfo
        )
        {
            IdType = idType;
            Parameter = parameter;
            IdPropertyExpr = idPropertyExpr;
            ContainsMethod = containsMethod;
            ListIdType = listIdType;
            ListIdAddMethodInfo = listIdAddMethodInfo;
        }

        /// <summary>
        /// The type of the entity's Id property.
        /// </summary>
        public Type IdType { get; }

        /// <summary>
        /// The parameter expression used in the LINQ expression.
        /// </summary>
        public ParameterExpression Parameter { get; }

        /// <summary>
        /// Expression for accessing the Id property of the entity.
        /// </summary>
        public MemberExpression IdPropertyExpr { get; }

        /// <summary>
        /// The Contains method for checking if a collection contains the entity's Id.
        /// </summary>
        public MethodInfo ContainsMethod { get; }

        /// <summary>
        /// The generic list type corresponding to the Id type.
        /// </summary>
        public Type ListIdType { get; }

        /// <summary>
        /// The Add method of the generic list type.
        /// </summary>
        public MethodInfo ListIdAddMethodInfo { get; }
    }
}

/// <summary>
/// Represents an entity with a generic primary key.
/// </summary>
/// <typeparam name="TPrimaryKey">Type of the primary key.</typeparam>
public interface IEntity<TPrimaryKey> : IEntity
{
    /// <summary>
    /// Gets or sets the primary key.
    /// </summary>
    public TPrimaryKey Id { get; set; }

    /// <summary>
    /// Gets a unique identifier string for the entity.
    /// </summary>
    /// <returns>
    /// If the entity implements IUniqueCompositeIdSupport, returns its UniqueCompositeId.
    /// Otherwise, returns the string representation of the entity's Id.
    /// </returns>
    public string GetUniqueId()
    {
        return this.As<IUniqueCompositeIdSupport>()?.UniqueCompositeId() ?? Id.ToString();
    }
}

public interface ISupportNavigationLoaderEntity : IEntity
{
    /// <summary>
    /// Injects the repository resolver for navigation property loading.
    /// Thread-safe. Called automatically by repository after loading.
    /// </summary>
    public void InjectRepositoryResolver(Repositories.IPlatformRepositoryResolver resolver);
}

/// <summary>
/// Represents an entity that supports validation.
/// </summary>
public interface IValidatableEntity
{
    /// <summary>
    /// Validates the entity and returns the validation result.
    /// </summary>
    /// <returns>Validation result.</returns>
    /// <remarks>
    /// The Easy.Platform.Domain.Entities.IValidatableEntity.Validate method is a part of the IValidatableEntity interface, which is implemented by entities that require validation. This method is used to validate the state of an entity and return a PlatformValidationResult object.
    /// <br />
    /// The PlatformValidationResult object encapsulates the result of the validation process. It contains information about any validation errors that occurred during the validation of the entity. This allows the system to provide detailed feedback about what went wrong during the validation process.
    /// <br />
    /// Entities that implement the IValidatableEntity interface, override the Validate method to provide their own specific validation logic.
    /// <br />
    /// In the IPlatformDbContext implementation class, the EnsureEntityValid method uses the Validate method to ensure that all modified or added entities are valid. If any entity is not valid, an exception is thrown.
    /// <br />
    /// In summary, the Validate method is a key part of the system's validation infrastructure, allowing for the validation of entities and the collection of detailed error information when validation fails.
    /// </remarks>
    public PlatformValidationResult Validate();

    /// <summary>
    /// Performs validation before an entity is deleted and an entity deleted event is sent.
    /// </summary>
    /// <returns>
    /// A validation result indicating whether the entity can be deleted.
    /// Returns null if no validation is needed or if deletion is allowed.
    /// Returns a validation result with errors if the entity should not be deleted.
    /// </returns>
    public PlatformValidationResult? BeforeSendEntityDeletedEventValidate();
}

/// <summary>
/// Represents a generic entity that supports validation.
/// </summary>
/// <typeparam name="TEntity">Type of the entity.</typeparam>
public interface IValidatableEntity<TEntity> : IValidatableEntity
{
    /// <inheritdoc cref="IValidatableEntity.Validate" />
    public new PlatformValidationResult<TEntity> Validate();

    /// <summary>
    /// Performs validation before an entity is deleted and an entity deleted event is sent.
    /// </summary>
    /// <returns>
    /// A strongly-typed validation result indicating whether the entity can be deleted.
    /// Returns null if no validation is needed or if deletion is allowed.
    /// Returns a validation result with errors if the entity should not be deleted.
    /// </returns>
    public new PlatformValidationResult<TEntity>? BeforeSendEntityDeletedEventValidate();
}

/// <summary>
/// Represents an entity that supports domain events.
/// </summary>
public interface ISupportDomainEventsEntity
{
    /// <summary>
    /// Gets the domain events associated with the entity.
    /// </summary>
    /// <returns>List of domain events.</returns>
    /// <remarks>
    /// The GetDomainEvents method is part of the ISupportDomainEventsEntity interface, which represents an entity that supports domain events in the context of Domain-Driven Design (DDD).
    /// <br />
    /// In DDD, a domain event is something that happened in the domain that you want to communicate system-wide. They are used to announce a significant change in the state of the system, which other parts of the system may need to react to.
    /// <br />
    /// The GetDomainEvents method is used to retrieve a list of domain events associated with the entity. Each event is represented as a KeyValuePair where the key is a string (possibly representing the event name or type) and the value is an instance of DomainEvent (or a derived class).
    /// <br />
    /// This method is essential for any entity that needs to communicate changes in its state to other parts of the system. For example, it can be used to trigger specific workflows or update other entities based on the events that occurred.
    /// <br />
    /// In the provided code, we can see that GetDomainEvents is used in several places, such as in the PlatformCqrsEntityEvent and PlatformCqrsBulkEntitiesEvent classes to serialize domain events for auditing or processing, and in the SupportDomainEventsEntityExtensions class to find specific types of domain events associated with an entity.
    /// </remarks>
    public List<KeyValuePair<string, DomainEvent>> GetDomainEvents();

    /// <summary>
    /// Adds a domain event to the entity.
    /// </summary>
    /// <typeparam name="TEvent">Type of the domain event.</typeparam>
    /// <param name="domainEvent">Domain event instance.</param>
    /// <param name="customDomainEventName">Custom domain event name.</param>
    /// <returns>Current instance of <see cref="ISupportDomainEventsEntity" />.</returns>
    public ISupportDomainEventsEntity AddDomainEvent<TEvent>(TEvent domainEvent, string customDomainEventName = null)
        where TEvent : DomainEvent;

    /// <summary>
    /// Represents a base class for domain events.
    /// </summary>
    public abstract class DomainEvent
    {
        /// <summary>
        /// Gets the default event name for a domain event type.
        /// </summary>
        /// <typeparam name="TEvent">Type of the domain event.</typeparam>
        /// <returns>Default event name.</returns>
        public static string GetDefaultEventName<TEvent>()
            where TEvent : DomainEvent
        {
            return typeof(TEvent).Name;
        }
    }

    /// <summary>
    /// Represents a domain event for field updates.
    /// </summary>
    public class FieldUpdatedDomainEvent : DomainEvent
    {
        /// <summary>
        /// Gets or sets the name of the field.
        /// </summary>
        public string FieldName { get; set; }

        /// <summary>
        /// Gets or sets the original value of the field.
        /// </summary>
        public object OriginalValue { get; set; }

        /// <summary>
        /// Gets or sets the new value of the field.
        /// </summary>
        public object NewValue { get; set; }

        /// <summary>
        /// Creates a new instance of <see cref="FieldUpdatedDomainEvent" />.
        /// </summary>
        /// <param name="propertyName">Name of the property.</param>
        /// <param name="originalValue">Original value of the property.</param>
        /// <param name="newValue">New value of the property.</param>
        /// <returns>New instance of <see cref="FieldUpdatedDomainEvent" />.</returns>
        public static FieldUpdatedDomainEvent Create(string propertyName, object originalValue, object newValue)
        {
            return new FieldUpdatedDomainEvent
            {
                FieldName = propertyName,
                OriginalValue = originalValue,
                NewValue = newValue
            };
        }
    }

    /// <summary>
    /// Represents a generic domain event for field updates.
    /// </summary>
    /// <typeparam name="TValue">Type of the field value.</typeparam>
    public class FieldUpdatedDomainEvent<TValue> : FieldUpdatedDomainEvent
    {
        /// <summary>
        /// Gets or sets the original value of the field.
        /// </summary>
        public new TValue OriginalValue { get; set; }

        /// <summary>
        /// Gets or sets the new value of the field.
        /// </summary>
        public new TValue NewValue { get; set; }

        /// <summary>
        /// Creates a new instance of <see cref="FieldUpdatedDomainEvent{TValue}" />.
        /// </summary>
        /// <param name="propertyName">Name of the property.</param>
        /// <param name="originalValue">Original value of the property.</param>
        /// <param name="newValue">New value of the property.</param>
        /// <returns>New instance of <see cref="FieldUpdatedDomainEvent{TValue}" />.</returns>
        public static FieldUpdatedDomainEvent<TValue> Create(string propertyName, TValue originalValue, TValue newValue)
        {
            return new FieldUpdatedDomainEvent<TValue>
            {
                FieldName = propertyName,
                OriginalValue = originalValue,
                NewValue = newValue
            };
        }
    }
}

/// <summary>
/// Represents a generic entity that supports domain events.
/// </summary>
/// <typeparam name="TEntity">Type of the entity.</typeparam>
public interface ISupportDomainEventsEntity<out TEntity> : ISupportDomainEventsEntity
    where TEntity : IEntity
{
    /// <summary>
    /// Adds a domain event to the entity.
    /// </summary>
    /// <typeparam name="TEvent">Type of the domain event.</typeparam>
    /// <param name="domainEvent">Domain event instance.</param>
    /// <param name="customDomainEventName">Custom domain event name.</param>
    /// <returns>Current instance of <typeparamref name="TEntity" />.</returns>
    public new TEntity AddDomainEvent<TEvent>(TEvent domainEvent, string customDomainEventName = null)
        where TEvent : DomainEvent;
}

/// <summary>
/// Represents a generic entity that supports validation and has a generic primary key.
/// </summary>
/// <typeparam name="TEntity">Type of the entity.</typeparam>
/// <typeparam name="TPrimaryKey">Type of the primary key.</typeparam>
public interface IValidatableEntity<TEntity, TPrimaryKey> : IValidatableEntity<TEntity>, IEntity<TPrimaryKey>
    where TEntity : IEntity<TPrimaryKey>
{
    /// <summary>
    /// Gets a validator for checking uniqueness during entity creation or update.
    /// </summary>
    /// <returns>PlatformCheckUniqueValidator for <typeparamref name="TEntity" />.</returns>
    public PlatformCheckUniqueValidator<TEntity> CheckUniqueValidator();
}

/// <summary>
/// Defines an interface for entities that are uniquely identified by a composite of properties
/// rather than a single primary key. This is often used for entities that have natural
/// composite keys or require unique identification across multiple fields.
/// </summary>
public interface IUniqueCompositeIdSupport
{
    /// <summary>
    /// Its unique composite ID.
    /// Default should return Null if no unique composite ID is defined.
    /// </summary>
    public string UniqueCompositeId();

    /// Guards against illegal updates that would implicitly change the logical identity of an entity
    /// whose uniqueness is defined by a <c>FindByUniqueCompositeIdExpr</c> expression.
    /// <para/>
    /// The method detects the scenario where:
    /// <list type="bullet">
    ///   <item>
    ///     <description><paramref name="entity"/> already has a non-default <c>Id</c> value,</description>
    ///   </item>
    ///   <item>
    ///     <description>that <c>Id</c> is different from the <c>Id</c> of the loaded <paramref name="existingEntity"/>, and</description>
    ///   </item>
    ///   <item>
    ///     <description>another persisted entity with the new <c>Id</c> already exists (verified by <paramref name="anyEntityExistByIdFn"/>).</description>
    ///   </item>
    /// </list>
    /// When all three conditions hold, the update would violate the uniqueness contract because one or more
    /// properties participating in <c>FindByUniqueCompositeIdExpr</c> must have been modified.
    /// The method therefore throws an <see cref="Exception"/> to halt the operation.
    /// </summary>
    /// <typeparam name="TEntity">
    /// The concrete entity type implementing <see cref="IEntity{TPrimaryKey}"/>.
    /// Must also implement <see cref="IUniqueCompositeIdSupport{TEntity}"/> to define a composite-key expression.
    /// </typeparam>
    /// <typeparam name="TPrimaryKey">The primary-key type used by <typeparamref name="TEntity"/> (e.g., <see cref="Guid"/>).</typeparam>
    /// <param name="entity">The entity instance the caller is attempting to persist.</param>
    /// <param name="existingEntity">The corresponding entity currently stored in the database.</param>
    /// <param name="anyEntityExistByIdFn">
    /// An asynchronous delegate that returns <c>true</c> if an entity with the supplied primary key already exists.
    /// Used to confirm the presence of a conflicting record before throwing.
    /// </param>
    /// <exception cref="Exception">
    /// Thrown when the update would change one or more properties referenced by
    /// <c>IUniqueCompositeIdSupport.FindByUniqueCompositeIdExpr</c>, effectively altering the entity’s logical identity.
    /// </exception>
    public static async Task EnsureNotUpdatePropFindInUniqueCompositeExpr<TEntity, TPrimaryKey>(
        TEntity entity,
        TEntity existingEntity,
        Func<TPrimaryKey, Task<bool>> anyEntityExistByIdFn
    )
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        if (!entity.Id.Equals(default(TPrimaryKey)) && !entity.Id.Equals(existingEntity.Id) && await anyEntityExistByIdFn(entity.Id))
        {
            throw new Exception(
                $"Update {typeof(TEntity).Name} entity with Id {entity.Id} is different from existing entity with Id {existingEntity.Id}. You might update one of property in {nameof(IUniqueCompositeIdSupport<IEntity>.FindByUniqueCompositeIdExpr)}, which is not allowed"
            );
        }
    }
}

public interface IUniqueCompositeIdSupport<TEntity> : IUniqueCompositeIdSupport
    where TEntity : IEntity
{
    /// <summary>
    /// Gets an expression for finding an entity by its unique composite ID.
    /// </summary>
    /// <returns>
    /// An expression that can be used to find an entity by its unique composite identifier.
    /// Default implementation returns null if no unique composite ID is defined.
    /// Used for checking existence during entity creation or update operations.
    /// </returns>
    public Expression<Func<TEntity, bool>> FindByUniqueCompositeIdExpr();
}

/// <summary>
/// Represents an abstract class for generic entities that support validation and domain events.
/// </summary>
/// <typeparam name="TEntity">Type of the entity.</typeparam>
/// <typeparam name="TPrimaryKey">Type of the primary key.</typeparam>
public abstract class Entity<TEntity, TPrimaryKey>
    : IValidatableEntity<TEntity, TPrimaryKey>,
        ISupportDomainEventsEntity<TEntity>,
        IUniqueCompositeIdSupport<TEntity>
    where TEntity : class, IEntity<TPrimaryKey>, ISupportDomainEventsEntity<TEntity>, IUniqueCompositeIdSupport<TEntity>, new()
{
    /// <summary>
    /// List to store domain events associated with the entity.
    /// </summary>
    protected readonly List<KeyValuePair<string, ISupportDomainEventsEntity.DomainEvent>> DomainEvents = [];

    /// <summary>
    /// Gets the domain events associated with the entity.
    /// </summary>
    /// <returns>List of domain events.</returns>
    public List<KeyValuePair<string, ISupportDomainEventsEntity.DomainEvent>> GetDomainEvents()
    {
        return DomainEvents;
    }

    /// <summary>
    /// Adds a domain event to the entity.
    /// </summary>
    /// <typeparam name="TEvent">Type of the domain event.</typeparam>
    /// <param name="domainEvent">Domain event instance.</param>
    /// <param name="customDomainEventName">Custom domain event name.</param>
    /// <returns>Current instance of <typeparamref name="TEntity" />.</returns>
    ISupportDomainEventsEntity ISupportDomainEventsEntity.AddDomainEvent<TEvent>(TEvent domainEvent, string customDomainEventName)
    {
        return AddDomainEvent(domainEvent, customDomainEventName);
    }

    /// <summary>
    /// Adds a domain event to the entity.
    /// </summary>
    /// <typeparam name="TEvent">Type of the domain event.</typeparam>
    /// <param name="domainEvent">Domain event instance.</param>
    /// <param name="customDomainEventName">Custom domain event name.</param>
    /// <returns>Current instance of <typeparamref name="TEntity" />.</returns>
    public virtual TEntity AddDomainEvent<TEvent>(TEvent domainEvent, string customDomainEventName = null)
        where TEvent : ISupportDomainEventsEntity.DomainEvent
    {
        DomainEvents.Add(
            new KeyValuePair<string, ISupportDomainEventsEntity.DomainEvent>(
                customDomainEventName ?? ISupportDomainEventsEntity.DomainEvent.GetDefaultEventName<TEvent>(),
                domainEvent
            )
        );
        return this.As<TEntity>();
    }

    /// <summary>
    /// Implements the FindByUniqueCompositeIdExpr method from IUniqueCompositeIdSupport<TEntity>.
    /// By default, returns null as this base implementation doesn't define a unique composite ID.
    /// Override this in derived classes to provide a custom expression for finding entities by composite ID.
    /// </summary>
    /// <returns>
    /// An expression that can be used to find an entity by its unique composite identifier,
    /// or null if the entity doesn't use composite keys.
    /// </returns>
    public virtual Expression<Func<TEntity, bool>> FindByUniqueCompositeIdExpr()
    {
        return null;
    }

    /// <summary>
    /// Implements the UniqueCompositeId method from IUniqueCompositeIdSupport.
    /// By default, returns null as this base implementation doesn't define a unique composite ID.
    /// Override this in derived classes to provide a custom string representation of the composite ID.
    /// </summary>
    /// <returns>
    /// A string that uniquely identifies the entity based on its composite key,
    /// or null if the entity doesn't use composite keys.
    /// </returns>
    public virtual string UniqueCompositeId()
    {
        return null;
    }

    /// <summary>
    /// Gets or sets the primary key of the entity.
    /// </summary>
    public virtual TPrimaryKey Id { get; set; }

    public object GetId()
    {
        return Id;
    }

    /// <summary>
    /// Gets a validator for checking uniqueness during entity creation or update.
    /// </summary>
    /// <returns>PlatformCheckUniqueValidator for <typeparamref name="TEntity" />.</returns>
    public virtual PlatformCheckUniqueValidator<TEntity> CheckUniqueValidator()
    {
        return null;
    }

    /// <summary>
    /// Validates the entity and returns the validation result.
    /// </summary>
    /// <returns>Validation result.</returns>
    public virtual PlatformValidationResult<TEntity> Validate()
    {
        var validator = GetValidator();
        return validator != null ? validator.Validate(this.As<TEntity>()) : PlatformValidationResult.Valid(this.As<TEntity>());
    }

    /// <summary>
    /// Validates the entity before it's deleted and before an entity deleted event is sent.
    /// By default, returns null indicating deletion is allowed.
    /// Override this method to implement custom validation logic for entity deletion.
    /// </summary>
    /// <returns>
    /// A strongly-typed validation result indicating whether the entity can be deleted.
    /// Returns null if deletion is allowed.
    /// Returns a validation result with errors if the entity should not be deleted.
    /// </returns>
    public virtual PlatformValidationResult<TEntity> BeforeSendEntityDeletedEventValidate()
    {
        return null;
    }

    PlatformValidationResult IValidatableEntity.BeforeSendEntityDeletedEventValidate()
    {
        return BeforeSendEntityDeletedEventValidate();
    }

    /// <summary>
    /// Validates the entity and returns the validation result.
    /// </summary>
    /// <returns>Validation result.</returns>
    PlatformValidationResult IValidatableEntity.Validate()
    {
        return Validate();
    }

    /// <summary>
    /// Adds a field updated domain event to the entity.
    /// </summary>
    /// <typeparam name="TValue">Type of the field value.</typeparam>
    /// <param name="propertyName">Name of the property.</param>
    /// <param name="originalValue">Original value of the property.</param>
    /// <param name="newValue">New value of the property.</param>
    /// <returns>Current instance of <typeparamref name="TEntity" />.</returns>
    public TEntity AddFieldUpdatedEvent<TValue>(string propertyName, TValue originalValue, TValue newValue)
    {
        return this.As<TEntity>().AddFieldUpdatedEvent(propertyName, originalValue, newValue);
    }

    /// <summary>
    /// Adds a field updated domain event to the entity using an expression for the property.
    /// </summary>
    /// <typeparam name="TValue">Type of the field value.</typeparam>
    /// <param name="property">Expression for the property.</param>
    /// <param name="originalValue">Original value of the property.</param>
    /// <param name="newValue">New value of the property.</param>
    /// <returns>Current instance of <typeparamref name="TEntity" />.</returns>
    public TEntity AddFieldUpdatedEvent<TValue>(Expression<Func<TEntity, TValue>> property, TValue originalValue, TValue newValue)
    {
        return this.As<TEntity>().AddFieldUpdatedEvent(property, originalValue, newValue);
    }

    /// <summary>
    /// Finds domain events of a specific type associated with the entity.
    /// </summary>
    /// <typeparam name="TEvent">Type of the domain event.</typeparam>
    /// <returns>List of domain events of the specified type.</returns>
    public List<TEvent> FindDomainEvents<TEvent>()
        where TEvent : ISupportDomainEventsEntity.DomainEvent
    {
        return this.As<TEntity>().FindDomainEvents<TEntity, TEvent>();
    }

    /// <summary>
    /// Finds field updated domain events for a specific field.
    /// </summary>
    /// <typeparam name="TValue">Type of the field value.</typeparam>
    /// <param name="propertyName">Name of the property.</param>
    /// <returns>List of field updated domain events for the specified field.</returns>
    public List<ISupportDomainEventsEntity.FieldUpdatedDomainEvent<TValue>> FindFieldUpdatedDomainEvents<TValue>(string propertyName)
    {
        return this.As<TEntity>().FindFieldUpdatedDomainEvents<TEntity, TValue>(propertyName);
    }

    /// <summary>
    /// Creates a clone of the entity.
    /// </summary>
    /// <returns>Clone of the entity.</returns>
    public virtual TEntity Clone()
    {
        return this.As<TEntity>().DeepClone(includeJsonIgnoredProps: true);
    }

    /// <summary>
    /// Gets the validator for the entity.
    /// </summary>
    /// <returns>PlatformValidator for <typeparamref name="TEntity" />.</returns>
    public virtual PlatformValidator<TEntity> GetValidator()
    {
        return null;
    }
}

/// <summary>
/// Represents a root entity with a generic primary key. In Domain-Driven Design, a root entity
/// is the main entry point to an aggregate and the only entity that can be directly accessed by repositories.
/// </summary>
/// <typeparam name="TPrimaryKey">Type of the primary key.</typeparam>
public interface IRootEntity<TPrimaryKey> : IEntity<TPrimaryKey>
{
}

/// <summary>
/// Root entity represents an aggregate root entity in Domain-Driven Design.
/// Only root entities can be directly created, updated, or deleted via repositories.
/// This abstract class provides the base implementation for all aggregate roots in the system.
/// </summary>
/// <typeparam name="TEntity">Type of the entity, used for fluent interfaces and self-referencing generics.</typeparam>
/// <typeparam name="TPrimaryKey">Type of the primary key.</typeparam>
public abstract class RootEntity<TEntity, TPrimaryKey> : Entity<TEntity, TPrimaryKey>, IRootEntity<TPrimaryKey>, ISupportNavigationLoaderEntity
    where TEntity : Entity<TEntity, TPrimaryKey>, IUniqueCompositeIdSupport<TEntity>, new()
{
    [System.Text.Json.Serialization.JsonIgnore]
    private volatile Repositories.IPlatformRepositoryResolver? repositoryResolver;

    /// <summary>
    /// Indicates whether a repository resolver has been injected.
    /// </summary>
    [System.Text.Json.Serialization.JsonIgnore]
    public bool HasRepositoryResolver => repositoryResolver != null;

    public void InjectRepositoryResolver(Repositories.IPlatformRepositoryResolver resolver)
    {
        repositoryResolver = resolver;
    }

    /// <summary>
    /// Loads a single navigation property.
    /// </summary>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <param name="selector">Navigation property selector</param>
    /// <param name="ct">Cancellation token</param>
    public async Task LoadNavigationAsync<TNav>(
        Expression<Func<TEntity, TNav?>> selector,
        CancellationToken ct = default)
        where TNav : class, IEntity<TPrimaryKey>, new()
    {
        EnsureResolverInjected();
        await PlatformNavigationLoader.LoadAsync<TEntity, TNav, TPrimaryKey>(
            this.As<TEntity>(),
            selector,
            repositoryResolver!,
            null,
            ct);
    }

    /// <summary>
    /// Loads a collection navigation property.
    /// </summary>
    /// <typeparam name="TNav">Navigation entity type</typeparam>
    /// <param name="selector">Navigation property selector (List)</param>
    /// <param name="ct">Cancellation token</param>
    public async Task LoadCollectionNavigationAsync<TNav>(
        Expression<Func<TEntity, List<TNav>?>> selector,
        CancellationToken ct = default)
        where TNav : class, IEntity<TPrimaryKey>, new()
    {
        EnsureResolverInjected();
        await PlatformNavigationLoader.LoadCollectionAsync<TEntity, TNav, TPrimaryKey>(
            this.As<TEntity>(),
            selector,
            repositoryResolver!,
            null,
            ct);
    }

    private void EnsureResolverInjected()
    {
        if (repositoryResolver == null)
        {
            throw new InvalidOperationException(
                $"Repository resolver not injected for {typeof(TEntity).Name}. " +
                "Entity must be loaded from a repository to use navigation loading.");
        }
    }
}
