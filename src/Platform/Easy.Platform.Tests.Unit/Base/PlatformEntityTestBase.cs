using Easy.Platform.Domain.Entities;
using FluentAssertions;

namespace Easy.Platform.Tests.Unit.Base;

/// <summary>
/// Base class for testing <see cref="Entity{TEntity,TPrimaryKey}"/> subclasses.
/// Provides entity creation, domain event, and validation assertion helpers.
/// </summary>
/// <typeparam name="TEntity">The concrete entity type.</typeparam>
/// <typeparam name="TKey">The entity's primary key type.</typeparam>
public abstract class PlatformEntityTestBase<TEntity, TKey> : PlatformUnitTestBase
    where TEntity : class, IEntity<TKey>, ISupportDomainEventsEntity<TEntity>, IUniqueCompositeIdSupport<TEntity>, new()
{
    /// <summary>
    /// Override to create a valid entity instance with required properties set.
    /// </summary>
    protected abstract TEntity CreateValidEntity();

    /// <summary>
    /// Assert that the entity has a domain event of the specified type.
    /// </summary>
    protected static void AssertHasDomainEvent<TEvent>(TEntity entity)
        where TEvent : ISupportDomainEventsEntity.DomainEvent
    {
        entity.GetDomainEvents()
            .Should().Contain(e => e.Value is TEvent, $"Expected domain event of type {typeof(TEvent).Name}");
    }

    /// <summary>
    /// Assert that the entity has no domain events.
    /// </summary>
    protected static void AssertNoDomainEvents(TEntity entity)
    {
        entity.GetDomainEvents().Should().BeEmpty();
    }

    /// <summary>
    /// Assert that the entity has the expected number of domain events.
    /// </summary>
    protected static void AssertDomainEventCount(TEntity entity, int expectedCount)
    {
        entity.GetDomainEvents().Should().HaveCount(expectedCount);
    }

    /// <summary>
    /// Assert entity identification expression works for a single entity.
    /// </summary>
    protected static void AssertIdentifyExprMatchesSelf(TEntity entity)
    {
        var expr = IEntity.IdentifyExpr(entity);
        var compiled = expr.Compile();
        compiled(entity).Should().BeTrue("Entity should be identified by its own IdentifyExpr");
    }
}
