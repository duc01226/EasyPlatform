#region

using System.Diagnostics;
using System.Linq.Expressions;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;

#endregion

namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Defines the foundational contract for all platform repositories, providing essential infrastructure
/// for data access operations within the Platform's clean architecture. This interface establishes
/// the basic capabilities required for repository implementations including unit of work management,
/// distributed tracing support, and transaction coordination.
/// </summary>
/// <remarks>
/// <para>
/// <strong>Repository Pattern Foundation:</strong>
/// This interface serves as the base contract for all repository implementations in the platform,
/// following the Repository pattern from Domain-Driven Design. It provides essential infrastructure
/// services that all repositories need regardless of their specific entity type or persistence technology.
/// </para>
///
/// <para>
/// <strong>Unit of Work Integration:</strong>
/// The interface provides methods for accessing and managing Unit of Work instances, enabling
/// repositories to participate in transactional boundaries and coordinate data access operations
/// across multiple repositories within the same business transaction.
/// </para>
///
/// <para>
/// <strong>Distributed Tracing Support:</strong>
/// Includes an <see cref="ActivitySource"/> for comprehensive distributed tracing and monitoring
/// of repository operations. This enables observability across microservices boundaries and
/// supports performance monitoring and debugging in distributed environments.
/// </para>
///
/// <para>
/// <strong>Implementation Strategy:</strong>
/// This interface is typically implemented by:
/// - Technology-specific base classes (e.g., <see cref="PlatformEfCoreRepository{TEntity, TPrimaryKey, TDbContext}"/>)
/// - Domain-specific repository interfaces that extend <see cref="IPlatformRepository{TEntity, TPrimaryKey}"/>
/// - Service-specific repository implementations that handle entity-specific business logic
/// </para>
///
/// <para>
/// <strong>Usage in Clean Architecture:</strong>
/// - <strong>Domain Layer:</strong> Defines repository interfaces extending this contract
/// - <strong>Application Layer:</strong> Uses repositories through dependency injection for use cases
/// - <strong>Persistence Layer:</strong> Implements repository interfaces using specific technologies
/// - <strong>Infrastructure Layer:</strong> Provides repository configurations and registrations
/// </para>
/// </remarks>
public interface IPlatformRepository
{
    /// <summary>
    /// Represents an activity source for repository tracing, used for creating and managing activities for monitoring and distributed tracing of repository operations.
    /// </summary>
    public static readonly ActivitySource ActivitySource = new($"{nameof(IPlatformRepository)}");

    /// <summary>
    /// Gets the current active unit of work.
    /// </summary>
    /// <returns>The current active unit of work.</returns>
    /// <exception cref="Exception">Thrown if there is no active unit of work.</exception>
    public IPlatformUnitOfWork CurrentActiveUow();

    /// <summary>
    /// Gets the current active unit of work or creates a new one if it doesn't exist.
    /// </summary>
    /// <param name="uowId">The identifier for the unit of work.</param>
    /// <returns>The current active unit of work or a new one if it doesn't exist.</returns>
    /// <exception cref="Exception">Thrown if there is no active unit of work.</exception>
    public IPlatformUnitOfWork CurrentOrCreatedActiveUow(string uowId);

    /// <summary>
    /// Attempts to get the current active unit of work or creates a new one if it doesn't exist, returning null if an exception occurs.
    /// This method provides a safe way to access the unit of work without throwing exceptions.
    /// </summary>
    /// <param name="uowId">The identifier for the unit of work.</param>
    /// <returns>The current active unit of work, a new unit of work, or null if an error occurs.</returns>
    public IPlatformUnitOfWork TryGetCurrentOrCreatedActiveUow(string uowId)
    {
        try
        {
            return CurrentOrCreatedActiveUow(uowId);
        }
        catch (Exception)
        {
            return null;
        }
    }

    /// <summary>
    /// Gets the unit of work manager.
    /// </summary>
    /// <returns>The unit of work manager.</returns>
    public IPlatformUnitOfWorkManager UowManager();
}

/// <summary>
/// Defines the contract for a platform repository that manages entities of a specific type.
/// </summary>
/// <typeparam name="TEntity">The type of the entity that the repository manages.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key for the entity.</typeparam>
/// <remarks>
/// This interface extends the base IPlatformRepository interface and adds methods for managing entities of a specific type.
/// It includes methods for asynchronous operations and supports cancellation tokens.
/// </remarks>
public interface IPlatformRepository<TEntity, TPrimaryKey> : IPlatformRepository
    where TEntity : class, IEntity<TPrimaryKey>, new()
{
    /// <summary>
    /// Retrieves an entity by its unique identifier asynchronously.
    /// </summary>
    /// <param name="id">The identifier of the entity to retrieve.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the entity.</returns>
    public Task<TEntity> GetByIdAsync(TPrimaryKey? id, CancellationToken cancellationToken = default, params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    /// <summary>
    /// Retrieves a list of entities by their unique identifiers asynchronously.
    /// </summary>
    /// <param name="ids">The identifiers of the entities to retrieve.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities.</returns>
    public Task<List<TEntity>> GetByIdsAsync(
        List<TPrimaryKey> ids,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    /// <summary>
    /// Retrieves all entities that match the specified predicate asynchronously.
    /// If no predicate is provided, all entities of the type are returned.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, all entities are returned.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities.</returns>
    public Task<List<TEntity>> GetAllAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Retrieves the first entity that matches the specified predicate asynchronously.
    /// Throws an exception if no entity is found.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, the first entity is returned.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the first entity that matches the predicate.</returns>
    public Task<TEntity> FirstAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Retrieves the first entity that matches the specified predicate asynchronously, or a default value if no such entity is found.
    /// Returns null or default value for the entity type if no matching entity exists.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, the first entity is returned.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the first entity that matches the predicate, or null if no entity is found.</returns>
    public Task<TEntity> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Counts the number of entities that match the specified predicate asynchronously.
    /// If no predicate is provided, counts all entities of the type.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, all entities are counted.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the number of entities that match the predicate.</returns>
    public Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if any entity exists that matches the specified predicate asynchronously.
    /// If no predicate is provided, checks if any entities of the type exist.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, checks for any entity.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result is true if any entity matches the predicate, otherwise false.</returns>
    public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if any result exists from the custom query built by the queryBuilder asynchronously.
    /// This method allows for complex queries to be built using a query builder function.
    /// </summary>
    /// <typeparam name="TQueryItemResult">The type of the result returned by the query builder.</typeparam>
    /// <param name="queryBuilder">A function that builds a custom query from the entity queryable.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result is true if any result exists from the custom query, otherwise false.</returns>
    public Task<bool> AnyAsync<TQueryItemResult>(Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if any result exists from the custom query built by the queryBuilder asynchronously.
    /// This method allows for complex queries to be built using a query builder function.
    /// </summary>
    /// <typeparam name="TQueryItemResult">The type of the result returned by the query builder.</typeparam>
    /// <param name="queryBuilder">A function that builds a custom query from the entity queryable.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result is true if any result exists from the custom query, otherwise false.</returns>
    public Task<bool> AnyAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all entities that match the specified predicate as an enumerable collection.
    /// This method provides synchronous enumeration over the results with support for cancellation.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition. If null, all entities are returned.</param>
    /// <param name="cancellationToken">A token to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to specify related entities to be included in the query.</param>
    /// <returns>An enumerable collection of entities that match the predicate.</returns>
    public IEnumerable<TEntity> GetAllEnumerable(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Sets cached original entities in the unit of work for tracking and comparison after update operations.
    /// This method stores the original state of entities to enable change tracking and optimistic concurrency control.
    /// </summary>
    /// <typeparam name="TResult">The type of the result containing entities to be cached.</typeparam>
    /// <param name="result">The result containing entities whose original state should be cached.</param>
    /// <param name="uow">The unit of work where the original entities should be cached.</param>
    public void SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate<TResult>(TResult? result, IPlatformUnitOfWork uow);
}

/// <summary>
/// Extends the IPlatformRepository interface for root entities (aggregate roots in domain-driven design).
/// Root entities are the main aggregate roots that can be directly manipulated through repository operations.
/// This interface provides additional methods for creating, updating, and deleting root entities with event support.
/// </summary>
/// <typeparam name="TEntity">The type of the root entity that implements IRootEntity.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key for the root entity.</typeparam>
public interface IPlatformRootRepository<TEntity, TPrimaryKey> : IPlatformRepository<TEntity, TPrimaryKey>
    where TEntity : class, IRootEntity<TPrimaryKey>, new()
{
    /// <summary>
    /// Asynchronously creates entity in the repository within the context of current active unit of work or single commit create immediately.
    /// The method handles entity validation, event dispatching, and unit of work management automatically.
    /// </summary>
    /// <param name="entity">The entity to create.</param>
    /// <param name="dismissSendEvent">If true, prevents sending domain events for this operation.</param>
    /// <param name="eventCustomConfig">Optional custom configuration for the entity event.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created entity.</returns>
    public Task<TEntity> CreateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates entity in the repository within the context of a specific unit of work.
    /// This allows for fine-grained control over the transaction scope and enables batch operations.
    /// </summary>
    /// <param name="uow">The unit of work context for the operation.</param>
    /// <param name="entity">The entity to create.</param>
    /// <param name="dismissSendEvent">If true, prevents sending domain events for this operation.</param>
    /// <param name="eventCustomConfig">Optional custom configuration for the entity event.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created entity.</returns>
    public Task<TEntity> CreateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates entity in the repository immediately, creating its own unit of work and committing immediately.
    /// This method creates a new unit of work, executes the create operation, and commits the transaction automatically.
    /// Use this when you need to ensure the entity is persisted immediately without depending on an external unit of work.
    /// </summary>
    /// <param name="entity">The entity to create.</param>
    /// <param name="dismissSendEvent">If true, prevents sending domain events for this operation.</param>
    /// <param name="eventCustomConfig">Optional custom configuration for the entity event.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created entity.</returns>
    public async Task<TEntity> CreateImmediatelyAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await CreateAsync(immediatelyUow, entity, dismissSendEvent, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    /// <summary>
    /// Asynchronously creates or updates entity in the repository immediately with retry logic and automatic unit of work management.
    /// This method creates a new unit of work, determines whether to create or update the entity based on its current state,
    /// executes the operation, and commits the transaction. Includes built-in retry mechanism for handling concurrency conflicts.
    /// </summary>
    /// <param name="entity">The entity to create or update.</param>
    /// <param name="dismissSendEvent">If true, prevents sending domain events for this operation.</param>
    /// <param name="checkDiff">If true, performs difference checking to determine if update is necessary.</param>
    /// <param name="eventCustomConfig">Optional custom configuration for the entity event.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created or updated entity.</returns>
    public async Task<TEntity> CreateOrUpdateImmediatelyAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                using (var immediatelyUow = UowManager().CreateNewUow(true))
                {
                    var result = await CreateOrUpdateAsync(immediatelyUow, entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);

                    await immediatelyUow.CompleteAsync(cancellationToken);

                    return result;
                }
            },
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Asynchronously creates or updates multiple entities in the repository immediately with retry logic and automatic unit of work management.
    /// This method creates a new unit of work, processes all entities in a batch operation, and commits the transaction.
    /// Includes built-in retry mechanism for handling concurrency conflicts during batch operations.
    /// </summary>
    /// <param name="entities">The list of entities to create or update.</param>
    /// <param name="dismissSendEvent">If true, prevents sending domain events for this operation.</param>
    /// <param name="eventCustomConfig">Optional custom configuration for the entity events.</param>
    /// <param name="cancellationToken">Token to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of the created or updated entities.</returns>
    public async Task<List<TEntity>> CreateOrUpdateManyImmediatelyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        return await Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                using (var immediatelyUow = UowManager().CreateNewUow(true))
                {
                    var result = await CreateOrUpdateManyAsync(
                        immediatelyUow,
                        entities,
                        dismissSendEvent,
                        eventCustomConfig: eventCustomConfig,
                        cancellationToken: cancellationToken
                    );

                    await immediatelyUow.CompleteAsync(cancellationToken);

                    return result;
                }
            },
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Asynchronously creates or updates entity in the repository within the context of current active unit of work or single commit create immediately.
    /// </summary>
    public Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates or updates entity in the repository within the context of a given unit of work or single commit create immediately.
    /// </summary>
    public Task<TEntity> CreateOrUpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates or updates multiple entities in the repository within the context of a unit of work.
    /// </summary>
    /// <param name="entities">The list of entities to be created or updated.</param>
    /// <param name="dismissSendEvent">Optional parameter. If set to true, the event associated with the operation will not be sent.</param>
    /// <param name="customCheckExistingPredicateBuilder">Optional parameter. A function to build a custom predicate for checking the existence of an entity.</param>
    /// <param name="eventCustomConfig">Optional parameter. An action to configure the event associated with the operation.</param>
    /// <param name="cancellationToken">Optional parameter. A token to cancel the asynchronous operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of the created or updated entities.</returns>
    public Task<List<TEntity>> CreateOrUpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates or updates multiple entities in the repository within the context of a unit of work.
    /// </summary>
    /// <param name="uow">The unit of work in which the operation is performed.</param>
    /// <param name="entities">The list of entities to be created or updated.</param>
    /// <param name="dismissSendEvent">Optional parameter. If set to true, the event associated with the operation will not be sent.</param>
    /// <param name="customCheckExistingPredicateBuilder">Optional parameter. A function to build a custom predicate for checking the existence of an entity.</param>
    /// <param name="eventCustomConfig">Optional parameter. An action to configure the event associated with the operation.</param>
    /// <param name="cancellationToken">Optional parameter. A token to cancel the asynchronous operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of the created or updated entities.</returns>
    public Task<List<TEntity>> CreateOrUpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously updates entity in the repository within the context of current active unit of work or single commit create immediately.
    /// </summary>
    public Task<TEntity> UpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously updates entity in the repository within the context of current active unit of work or single commit create immediately.
    /// Do not emit event, change row version or any smart auto update info. Purely just set update data only
    /// </summary>
    public Task<TEntity> SetAsync(TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Asynchronously updates entity in the repository within the context of given unit of work or single commit create immediately.
    /// Do not emit event, change row version or any smart auto update info. Purely just set update data only
    /// </summary>
    public Task<TEntity> SetAsync(IPlatformUnitOfWork uow, TEntity entity, CancellationToken cancellationToken = default);

    /// <summary>
    /// Asynchronously updates entity in the repository within the context of a unit of work.
    /// </summary>
    public Task<TEntity> UpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously updates entity in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<TEntity> UpdateImmediatelyAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await UpdateAsync(immediatelyUow, entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    /// <summary>
    /// Asynchronously set entity in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<TEntity> SetImmediatelyAsync(TEntity entity, CancellationToken cancellationToken = default)
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await SetAsync(immediatelyUow, entity, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    /// <summary>
    /// Asynchronously delete entity by id in the repository within the context of current active unit of work or single commit create immediately.
    /// </summary>
    public Task<TEntity> DeleteAsync(
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously delete entity by id in the repository within the context of a unit of work.
    /// </summary>
    public Task<TEntity> DeleteAsync(
        IPlatformUnitOfWork uow,
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously deletes entity by Id in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<TEntity> DeleteImmediatelyAsync(
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await DeleteAsync(immediatelyUow, entityId, dismissSendEvent, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    public async Task<int> DeleteManyImmediatelyAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await DeleteManyAsync(immediatelyUow, predicate, dismissSendEvent, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    public async Task<List<TEntity>> DeleteManyReturnDeletedItemsAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var items = await GetAllAsync(predicate, cancellationToken);

        await DeleteManyAsync(items, dismissSendEvent, eventCustomConfig, cancellationToken);

        return items;
    }

    public async Task<List<TEntity>> DeleteManyReturnDeletedItemsAsync(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var items = await GetAllAsync(p => entityIds.Contains(p.Id), cancellationToken);

        await DeleteManyAsync(items, dismissSendEvent, eventCustomConfig, cancellationToken);

        return items;
    }

    /// <summary>
    /// Asynchronously delete entity in the repository within the context of current active unit of work or single commit create immediately.
    /// </summary>
    public Task<TEntity> DeleteAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously create entities in the repository within the context of current active unit of work or single commit create immediately.
    /// </summary>
    public Task<List<TEntity>> CreateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates multiple entities in the repository within the context of a unit of work.
    /// </summary>
    public Task<List<TEntity>> CreateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates multiple entities in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<List<TEntity>> CreateManyImmediatelyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await CreateManyAsync(immediatelyUow, entities, dismissSendEvent, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    public Task<List<TEntity>> UpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously update multiple entities in the repository within the context of a unit of work.
    /// </summary>
    public Task<List<TEntity>> UpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously updates multiple entities in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<List<TEntity>> UpdateManyImmediatelyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await UpdateManyAsync(immediatelyUow, entities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    public Task<List<TEntity>> UpdateManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        Action<TEntity> updateAction,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public Task<List<TPrimaryKey>> DeleteManyAsync(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public Task<List<TEntity>> DeleteManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously delete multiple entities in the repository within the context of a unit of work.
    /// </summary>
    public Task<List<TEntity>> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously deletes multiple entities in the repository immediately, out of context of any current active uow.
    /// </summary>
    public async Task<List<TEntity>> DeleteManyImmediatelyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        using (var immediatelyUow = UowManager().CreateNewUow(true))
        {
            var result = await DeleteManyAsync(immediatelyUow, entities, dismissSendEvent, eventCustomConfig, cancellationToken);

            await immediatelyUow.CompleteAsync(cancellationToken);

            return result;
        }
    }

    public Task<int> DeleteManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public Task<int> DeleteManyAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public Task<int> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously creates a new entity or updates an existing one based on the provided predicate.
    /// </summary>
    /// <param name="entity">The entity to be created or updated.</param>
    /// <param name="customCheckExistingPredicate">A predicate to check if the entity already exists.</param>
    /// <param name="dismissSendEvent">Optional parameter. If set to true, the event associated with the entity creation or update is not sent. Default is false.</param>
    /// <param name="checkDiff">Whether check is entity values diff compared to original before update. Default is true</param>
    /// <param name="eventCustomConfig">Optional parameter. An action to configure the event associated with the entity creation or update.</param>
    /// <param name="cancellationToken">Optional parameter. A token to observe while waiting for the task to complete.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created or updated entity.</returns>
    public Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public async Task<TEntity> CreateIfNotExistAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var isExisted = await AnyAsync(predicate, cancellationToken);
        if (isExisted)
            return entity;

        return await CreateAsync(entity, dismissSendEvent, eventCustomConfig, cancellationToken);
    }

    /// <summary>
    /// Replaces multiple entities in the data store by deleting existing entities
    /// that match a given predicate and inserting or updating the new entities.
    /// </summary>
    /// <param name="replaceExistingEntitiesPredicate">The predicate to filter existing entities that should be replaced.</param>
    /// <param name="replaceNewEntities">The list of new entities to insert or update in place of the existing entities.</param>
    /// <param name="dismissSendEvent">Indicates whether to suppress the sending of entity events during the operation. Defaults to false.</param>
    /// <param name="eventCustomConfig">An optional action to customize the entity event configuration.</param>
    /// <param name="cancellationToken">A token that can be used to cancel the asynchronous operation.</param>
    /// <returns>
    /// A task representing the asynchronous operation. The result is a tuple containing two lists:
    /// <list type="bullet">
    ///     <item>
    ///         <description>A list of the entities that were inserted.</description>
    ///     </item>
    ///     <item>
    ///         <description>A list of the entities that were updated.</description>
    ///     </item>
    ///     <item>
    ///         <description>A list of the entities that were deleted.</description>
    ///     </item>
    /// </list>
    /// </returns>
    public async Task<(List<TEntity>, List<TEntity>, List<TEntity>)> ReplaceManyAsync(
        Expression<Func<TEntity, bool>> replaceExistingEntitiesPredicate,
        List<TEntity> replaceNewEntities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var existingEntities = await GetAllAsync(replaceExistingEntitiesPredicate, cancellationToken).Then(p => p.ToDictionary(x => x.GetUniqueId()));
        var toReplaceEntities = replaceNewEntities.Pipe(p => p.ToDictionary(x => x.GetUniqueId()));

        var toDeleteEntities = existingEntities.Where(p => !toReplaceEntities.ContainsKey(p.Value.GetUniqueId())).Select(p => p.Value).ToList();
        var (toInsertEntities, toUpdateEntities) = toReplaceEntities.Select(p => p.Value).WhereSplitResult(p => !existingEntities.ContainsKey(p.GetUniqueId()));

        await DeleteManyAsync(toDeleteEntities, dismissSendEvent, eventCustomConfig, cancellationToken);
        await UpdateManyAsync(
            toUpdateEntities.SelectList(p => p.With(p => p.Id = existingEntities.GetValueOrDefault(p.GetUniqueId()).Id)),
            dismissSendEvent,
            checkDiff,
            eventCustomConfig,
            cancellationToken
        );
        await CreateManyAsync(toInsertEntities, dismissSendEvent, eventCustomConfig, cancellationToken);

        return (toInsertEntities, toUpdateEntities, toDeleteEntities);
    }

    /// <summary>
    /// Replaces multiple entities in the data store by deleting existing entities
    /// that match a given predicate and inserting or updating the new entities.
    /// </summary>
    /// <param name="replaceExistingEntitiesPredicate">The predicate to filter existing entities that should be replaced.</param>
    /// <param name="replaceNewEntities">The list of new entities to insert or update in place of the existing entities.</param>
    /// <param name="dismissSendEvent">Indicates whether to suppress the sending of entity events during the operation. Defaults to false.</param>
    /// <param name="eventCustomConfig">An optional action to customize the entity event configuration.</param>
    /// <param name="cancellationToken">A token that can be used to cancel the asynchronous operation.</param>
    public async Task ReplaceManyImmediatelyAsync(
        Expression<Func<TEntity, bool>> replaceExistingEntitiesPredicate,
        List<TEntity> replaceNewEntities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        await DeleteManyImmediatelyAsync(replaceExistingEntitiesPredicate, dismissSendEvent, eventCustomConfig, cancellationToken);
        await CreateOrUpdateManyImmediatelyAsync(replaceNewEntities, dismissSendEvent, eventCustomConfig, cancellationToken);
    }
}

public interface IPlatformQueryableRepository<TEntity, TPrimaryKey> : IPlatformRepository<TEntity, TPrimaryKey>
    where TEntity : class, IEntity<TPrimaryKey>, new()
{
    /// <summary>
    /// Returns a query for the current Unit of Work (UoW).
    /// </summary>
    /// <param name="loadRelatedEntities">Expressions to load related entities.</param>
    /// <returns>An IQueryable of TEntity that represents the current UoW query.</returns>
    public IQueryable<TEntity> GetCurrentUowQuery(params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    /// <summary>
    /// Build and get query from a given uow
    /// </summary>
    public IQueryable<TResult> GetQuery<TResult>(
        IPlatformUnitOfWork uow,
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TResult>> queryBuilder,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return queryBuilder(uow, GetQuery(uow, loadRelatedEntities));
    }

    /// <summary>
    /// Retrieves a queryable collection of entities from the specified unit of work.
    /// </summary>
    /// <param name="uow">The unit of work from which to retrieve the entities.</param>
    /// <param name="loadRelatedEntities">An array of expressions specifying related entities to be loaded along with the main entities.</param>
    /// <returns>A queryable collection of entities.</returns>
    public IQueryable<TEntity> GetQuery(IPlatformUnitOfWork uow, params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    public Task<List<TEntity>> GetAllAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public Task<List<TEntity>> GetAllAsync(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public Task<TEntity> FirstOrDefaultAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public Task<TEntity> FirstOrDefaultAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public Task<TEntity> FirstOrDefaultAsync(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Asynchronously retrieves all entities of type TEntity that satisfy the conditions defined by the queryBuilder.
    /// </summary>
    /// <typeparam name="TSelector">The type of the result list elements.</typeparam>
    /// <param name="queryBuilder">A function to build a query for retrieving entities.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <param name="loadRelatedEntities">Expressions to load related entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of TSelector elements.</returns>
    public Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Asynchronously retrieves all entities of type <typeparamref name="TEntity" /> from the repository, and applies a transformation function to each entity.
    /// </summary>
    /// <typeparam name="TSelector">The type of the result after applying the transformation function to each entity.</typeparam>
    /// <param name="queryBuilder">A function that takes the current unit of work and a queryable of entities, and returns an enumerable of transformed entities.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <param name="loadRelatedEntities">An array of expressions specifying related entities to load along with the main entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of transformed entities.</returns>
    public Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Asynchronously retrieves the first element of a sequence, or a default value if the sequence contains no elements.
    /// </summary>
    /// <typeparam name="TSelector">The type of the elements of source.</typeparam>
    /// <param name="queryBuilder">A function to transform the queryable source sequence.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <param name="loadRelatedEntities">An array of expressions to include related entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the first element in the source sequence or a default value if the sequence contains no elements.</returns>
    public Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Asynchronously counts the number of items in the query result.
    /// </summary>
    /// <typeparam name="TQueryItemResult">The type of the items in the query result.</typeparam>
    /// <param name="queryBuilder">A function to build the query.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the number of items in the query result.</returns>
    public Task<int> CountAsync<TQueryItemResult>(Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder, CancellationToken cancellationToken = default);

    /// <summary>
    /// Asynchronously counts the number of items in a sequence.
    /// </summary>
    /// <typeparam name="TQueryItemResult">The type of the items in the sequence.</typeparam>
    /// <param name="queryBuilder">A function to build the queryable sequence.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the number of items in the sequence.</returns>
    public Task<int> CountAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Asynchronously counts the number of entities in the provided query.
    /// </summary>
    /// <param name="query">The IQueryable of TEntity to count.</param>
    /// <param name="cancellationToken">A CancellationToken to observe while waiting for the task to complete.</param>
    /// <returns>A Task that represents the asynchronous operation. The task result contains the count of entities in the query.</returns>
    public Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    /// <summary>
    /// Help to create a function to return a query which use want to use in the queryBuilder for a lot of
    /// other function. It's important to support PARALLELS query. If use GetAllQuery() to use outside, we need to open a uow without close,
    /// which could not run parallels because db context is not thread safe. <br />
    /// Ex:
    /// <br />
    /// var fullItemsQueryBuilder = repository.GetQueryBuilder(query => query.Where());<br />
    /// var pagedEntities = await repository.GetAllAsync(queryBuilder: query =>
    /// fullItemsQueryBuilder(query).PageBy(request.SkipCount, request.MaxResultCount));<br />
    /// var totalCount = await repository.CountAsync(fullItemsQueryBuilder, cancellationToken);
    /// </summary>
    public Func<IQueryable<TEntity>, IQueryable<TResult>> GetQueryBuilder<TResult>(Func<IQueryable<TEntity>, IQueryable<TResult>> builderFn);

    /// <summary>
    /// Help to create a function to return a query which use want to use in the queryBuilder for a lot of
    /// other function. It's important to support PARALLELS query. If use GetAllQuery() to use outside, we need to open a uow without close,
    /// which could not run parallels because db context is not thread safe. <br />
    /// Ex:
    /// <br />
    /// var fullItemsQueryBuilder = repository.GetQueryBuilder((uow, query) => query.Where());<br />
    /// var pagedEntities = await repository.GetAllAsync(queryBuilder: (uow, query) =>
    /// fullItemsQueryBuilder(query).PageBy(request.SkipCount, request.MaxResultCount));<br />
    /// var totalCount = await repository.CountAsync(fullItemsQueryBuilder, cancellationToken);
    /// </summary>
    public Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TResult>> GetQueryBuilder<TResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TResult>> builderFn
    );

    /// <summary>
    /// Help to create a function to return a query which use want to use in the queryBuilder for a lot of
    /// other function. It's important to support PARALLELS query. If use GetAllQuery() to use outside, we need to open a uow without close,
    /// which could not run parallels because db context is not thread safe. <br />
    /// Ex:
    /// <br />
    /// var fullItemsQueryBuilder = repository.GetQueryBuilder(p => p.PropertyX == true);<br />
    /// var pagedEntities = await repository.GetAllAsync(queryBuilder: query =>
    /// fullItemsQueryBuilder(query).PageBy(request.SkipCount, request.MaxResultCount));<br />
    /// var totalCount = await repository.CountAsync(fullItemsQueryBuilder, cancellationToken);
    /// </summary>
    public Func<IQueryable<TEntity>, IQueryable<TEntity>> GetQueryBuilder(Expression<Func<TEntity, bool>> predicate);

    public Expression<Func<TEntity, bool>> GetQueryExpr(Expression<Func<TEntity, bool>> predicate)
    {
        return predicate;
    }
}

public interface IPlatformQueryableRootRepository<TEntity, TPrimaryKey>
    : IPlatformQueryableRepository<TEntity, TPrimaryKey>, IPlatformRootRepository<TEntity, TPrimaryKey>
    where TEntity : class, IRootEntity<TPrimaryKey>, new()
{
    IPlatformRootServiceProvider GetRootServiceProvider();

    public async Task<List<TEntity>> DeleteManyReturnDeletedItemsAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var items = await GetAllAsync(queryBuilder, cancellationToken);

        await DeleteManyAsync(items, dismissSendEvent, eventCustomConfig, cancellationToken);

        return items;
    }

    /// <summary>
    /// Asynchronously deletes multiple entities from the repository using a scrolling paging mechanism.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition.</param>
    /// <param name="pageSize">The number of entities to delete in each batch.</param>
    /// <param name="dismissSendEvent">Optional parameter. If set to true, the event associated with the deletion will not be sent.</param>
    /// <param name="eventCustomConfig">Optional parameter. An action to configure the event associated with the deletion.</param>
    /// <param name="cancellationToken">Optional parameter. A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    /// <remarks>
    /// This method is designed to efficiently delete large amounts of data by dividing the operation into smaller batches.
    /// </remarks>
    public async Task DeleteManyScrollingPagingAsync(
        Expression<Func<TEntity, bool>> predicate,
        int? pageSize = null,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        pageSize ??= Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

        if (dismissSendEvent || !PlatformCqrsEntityEvent.IsAnyKindsOfEventHandlerRegisteredForEntity<TEntity, TPrimaryKey>(GetRootServiceProvider()))
            await DeleteManyAsync(predicate, dismissSendEvent, eventCustomConfig, cancellationToken);
        else
        {
            await Util.Pager.ExecuteScrollingPagingAsync(
                async () =>
                {
                    using (var uow = UowManager().CreateNewUow(true))
                    {
                        var pagingDeleteItems = await GetAllAsync(GetQuery(uow).Where(predicate).Take(pageSize.Value), cancellationToken);

                        await DeleteManyAsync(uow, pagingDeleteItems, dismissSendEvent: false, eventCustomConfig, cancellationToken);

                        await uow.CompleteAsync(cancellationToken);

                        return pagingDeleteItems;
                    }
                },
                await CountAsync(predicate, cancellationToken).Then(totalItemsCount => totalItemsCount / pageSize.Value),
                cancellationToken: cancellationToken
            );
        }
    }

    /// <summary>
    /// Asynchronously updates multiple entities in a paginated manner based on a specified predicate.
    /// </summary>
    /// <param name="predicate">A function to test each element for a condition.</param>
    /// <param name="updateAction">The action to perform on each entity that satisfies the predicate.</param>
    /// <param name="pageSize">The number of entities to be updated in each page.</param>
    /// <param name="dismissSendEvent">A boolean value indicating whether to dismiss sending events after updating.</param>
    /// <param name="eventCustomConfig">An action to configure the event associated with the update operation.</param>
    /// <param name="cancellationToken">A cancellation token that can be used to cancel the operation.</param>
    /// <returns>A task that represents the asynchronous operation.</returns>
    public async Task UpdateManyPagingAsync(
        Expression<Func<TEntity, bool>> predicate,
        Action<TEntity> updateAction,
        int? pageSize,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        pageSize ??= Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

        await Util.Pager.ExecutePagingAsync(
            async (skipCount, pageSize) =>
            {
                using (var uow = UowManager().CreateNewUow(true))
                {
                    var pagingUpdateItems = await GetAllAsync(GetQuery(uow).Where(predicate).Skip(skipCount).Take(pageSize), cancellationToken)
                        .ThenAction(items => items.ForEach(updateAction));

                    if (!dismissSendEvent)
                        SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate(pagingUpdateItems, uow);

                    await UpdateManyAsync(uow, pagingUpdateItems, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);

                    await uow.CompleteAsync(cancellationToken);
                }
            },
            await CountAsync(predicate, cancellationToken),
            pageSize.Value,
            cancellationToken: cancellationToken
        );
    }

    /// <summary>
    /// Asynchronously updates multiple entities in a paginated manner based on the provided predicate and update action.
    /// </summary>
    /// <param name="predicate">The expression to determine which entities to update.</param>
    /// <param name="updateAction">The action to perform on each entity that matches the predicate.</param>
    /// <param name="pageSize">The number of entities to process per page.</param>
    /// <param name="dismissSendEvent">Optional parameter to dismiss sending events. Default is false.</param>
    /// <param name="eventCustomConfig">Optional parameter to provide custom configuration for the event.</param>
    /// <param name="cancellationToken">Optional parameter to cancel the operation.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    public async Task UpdateManyScrollingPagingAsync(
        Expression<Func<TEntity, bool>> predicate,
        Action<TEntity> updateAction,
        int? pageSize,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        pageSize ??= Util.TaskRunner.DefaultNumberOfParallelIoTasksPerCpuRatio;

        await Util.Pager.ExecuteScrollingPagingAsync(
            async () =>
            {
                using (var uow = UowManager().CreateNewUow(true))
                {
                    var pagingUpdateItems = await GetAllAsync(GetQuery(uow).Where(predicate).Take(pageSize.Value), cancellationToken)
                        .ThenAction(items => items.ForEach(updateAction));

                    if (!dismissSendEvent)
                        SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate(pagingUpdateItems, uow);

                    var updatedItems = await UpdateManyAsync(uow, pagingUpdateItems, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);

                    return updatedItems;
                }
            },
            await CountAsync(predicate, cancellationToken).Then(totalItemsCount => totalItemsCount / pageSize.Value),
            cancellationToken: cancellationToken
        );
    }
}
