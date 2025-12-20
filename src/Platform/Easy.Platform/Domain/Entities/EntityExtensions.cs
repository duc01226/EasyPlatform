#nullable enable
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Common.Extensions;

namespace Easy.Platform.Domain.Entities;

/// <summary>
/// Provides extension methods for entities.
/// </summary>
public static class PlatformEntityExtensions
{
    /// <summary>
    /// Updates all properties' values from the current entity to a target entity, including triggering a <see cref="ISupportDomainEventsEntity.FieldUpdatedDomainEvent"/>.
    /// This method handles both public and non-public setters.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the entity's primary key.</typeparam>
    /// <param name="entity">The source entity.</param>
    /// <param name="targetEntity">The target entity to update.</param>
    /// <param name="ignorePropPredicate">An optional predicate to specify properties to ignore during the update. The predicate takes the source entity and property info as arguments.</param>
    /// <returns>The updated target entity.</returns>
    public static TEntity SetAllPropertiesIncludeValueUpdatedEvent<TEntity, TPrimaryKey>(
        this TEntity entity,
        TEntity targetEntity,
        Expression<Func<TEntity, PropertyInfo, bool>>? ignorePropPredicate = null
    )
        where TEntity : class, IEntity<TPrimaryKey>
    {
        typeof(TEntity)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.Name != nameof(IEntity<TPrimaryKey>.Id) && p.Name != nameof(IRowVersionEntity.ConcurrencyUpdateToken))
            .WhereIf(ignorePropPredicate != null, propertyInfo => !ignorePropPredicate!.Compile()(entity, propertyInfo))
            .ForEach(propertyInfo => targetEntity.SetPropertyIncludeValueUpdatedEvent(propertyInfo, newValue: propertyInfo!.GetValue(entity)));

        return targetEntity;
    }

    /// <summary>
    /// Updates all properties' values from the current entity to a target entity, even for properties with protected or private setters.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <typeparam name="TPrimaryKey">The type of the entity's primary key.</typeparam>
    /// <param name="entity">The source entity.</param>
    /// <param name="targetEntity">The target entity to update.</param>
    /// <param name="ignorePropPredicate">An optional predicate to specify properties to ignore during the update. The predicate takes the source entity and property info as arguments.</param>
    /// <returns>The updated target entity.</returns>
    public static TEntity SetAllProperties<TEntity, TPrimaryKey>(
        this TEntity entity,
        TEntity targetEntity,
        Expression<Func<TEntity, PropertyInfo, bool>>? ignorePropPredicate = null
    )
        where TEntity : class, IEntity<TPrimaryKey>
    {
        typeof(TEntity)
            .GetProperties(BindingFlags.Public | BindingFlags.Instance)
            .Where(p => p.Name != nameof(IEntity<TPrimaryKey>.Id) && p.Name != nameof(IRowVersionEntity.ConcurrencyUpdateToken))
            .WhereIf(ignorePropPredicate != null, propertyInfo => !ignorePropPredicate!.Compile()(entity, propertyInfo))
            .ForEach(propertyInfo => propertyInfo.SetValue(targetEntity, propertyInfo!.GetValue(entity)));

        return targetEntity;
    }

    /// <summary>
    /// Finds an entity in a collection by its ID.
    /// </summary>
    /// <typeparam name="T">The type of the entity.</typeparam>
    /// <typeparam name="TId">The type of the entity's ID.</typeparam>
    /// <param name="entities">The collection of entities to search.</param>
    /// <param name="id">The ID of the entity to find.</param>
    /// <returns>The entity with the specified ID, or null if not found.</returns>
    public static T? FindById<T, TId>(this IEnumerable<T> entities, TId id)
        where T : IEntity<TId>
    {
#pragma warning disable S2955
        if (entities is IQueryable<T> entitiesQuery)
            return entitiesQuery.FirstOrDefault(p => p.Id != null && p.Id.Equals(id));

        return entities.FirstOrDefault(p => p.Id != null && p.Id.Equals(id));
#pragma warning restore S2955
    }

    /// <summary>
    /// Checks if an entity is a user-audited entity.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="entity">The entity to check.</param>
    /// <returns>True if the entity is a user-audited entity, otherwise false.</returns>
    public static bool IsAuditedUserEntity<TEntity>(this TEntity entity)
        where TEntity : IEntity
    {
        return entity is IUserAuditedEntity && entity.GetType().FindMatchedGenericType(typeof(IFullAuditedEntity<>)) != null;
    }

    /// <summary>
    /// Gets the user ID type from a user-audited entity.
    /// </summary>
    /// <typeparam name="TEntity">The type of the entity.</typeparam>
    /// <param name="entity">The entity.</param>
    /// <returns>The type of the user ID.</returns>
    public static Type GetAuditedUserIdType<TEntity>(this TEntity entity)
        where TEntity : IEntity
    {
        return entity.GetType().FindMatchedGenericType(typeof(IFullAuditedEntity<>)).GenericTypeArguments[0];
    }
}
