#region

using System.Linq.Expressions;
using Easy.Platform.Common;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;

#endregion

namespace Easy.Platform.Domain.Repositories;

/// <summary>
/// Abstract base repository implementation that provides comprehensive data access operations for domain entities within the Easy Platform architecture.
/// Implements the Repository pattern with Unit of Work coordination, CQRS event integration, and distributed tracing support.
/// Serves as the foundation for all concrete repository implementations across different persistence technologies (Entity Framework Core, MongoDB, etc.).
/// </summary>
/// <typeparam name="TEntity">The domain entity type that implements <see cref="IEntity{TPrimaryKey}"/> and has a parameterless constructor. Represents the aggregate root or entity being managed by this repository.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key for the entity. Common types include int, long, Guid, or composite key types. Must be comparable and serializable.</typeparam>
/// <typeparam name="TUow">The specific Unit of Work implementation type that coordinates transactions and change tracking for this repository. Must implement <see cref="IPlatformUnitOfWork"/>.</typeparam>
/// <remarks>
/// This abstract repository serves as the cornerstone of the Easy Platform's data access layer, implementing clean architecture principles:
///
/// <para><strong>Architecture Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Implements the Repository pattern to abstract data access logic from business logic</description></item>
/// <item><description>Coordinates with Unit of Work pattern for transaction management and change tracking</description></item>
/// <item><description>Integrates with CQRS pattern through automatic event publishing for Create, Update, Delete operations</description></item>
/// <item><description>Supports distributed tracing for observability across microservices</description></item>
/// </list>
///
/// <para><strong>Key Capabilities:</strong></para>
/// <list type="bullet">
/// <item><description>Thread-safe operations with automatic semaphore-based locking for non-parallel persistence technologies</description></item>
/// <item><description>Automatic Unit of Work management with support for both transactional and pseudo-transactional operations</description></item>
/// <item><description>Entity change tracking and original entity caching for efficient update operations</description></item>
/// <item><description>Comprehensive query operations including async enumerable support for large datasets</description></item>
/// <item><description>Bulk operations (CreateMany, UpdateMany, DeleteMany) for efficient batch processing</description></item>
/// <item><description>Event-driven architecture with configurable CQRS event publishing</description></item>
/// </list>
///
/// <para><strong>Usage Patterns:</strong></para>
/// The repository is extensively used across the platform in:
/// <list type="bullet">
/// <item><description>Query handlers for read operations (GetWorkingShiftFilterOptionQuery, GetPerformanceReviewParticipantInfoQuery)</description></item>
/// <item><description>Command handlers for write operations (CreateCandidateCommand, UpdateEmployeeCommand)</description></item>
/// <item><description>Event handlers for processing domain events and integration events</description></item>
/// <item><description>Background services and scheduled jobs for batch processing</description></item>
/// <item><description>Data seeders for initial data setup and migrations</description></item>
/// </list>
///
/// <para><strong>Concrete Implementations:</strong></para>
/// This abstract class is implemented by:
/// <list type="bullet">
/// <item><description>PlatformEfCoreRepository: Entity Framework Core implementation with full transaction support</description></item>
/// <item><description>PlatformPersistenceRepository: Generic persistence layer implementation</description></item>
/// <item><description>Custom domain-specific repositories for specialized business logic</description></item>
/// </list>
/// </remarks>
public abstract class PlatformRepository<TEntity, TPrimaryKey, TUow> : IPlatformQueryableRepository<TEntity, TPrimaryKey>
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TUow : class, IPlatformUnitOfWork
{
    /// <summary>
    /// Lazy-initialized CQRS service for publishing domain events and integration events.
    /// Used for event-driven architecture to notify other bounded contexts of entity changes.
    /// </summary>
    private readonly Lazy<IPlatformCqrs> cqrsLazy;

    /// <summary>
    /// Lazy-initialized Unit of Work manager responsible for creating, coordinating, and managing
    /// the lifecycle of Unit of Work instances across the repository's operations.
    /// </summary>
    private readonly Lazy<IPlatformUnitOfWorkManager> lazyUnitOfWorkManager;

    /// <summary>
    /// Initializes a new instance of the PlatformRepository with required dependencies.
    /// Sets up lazy-loaded services and configures distributed tracing based on platform module settings.
    /// </summary>
    /// <param name="serviceProvider">The service provider for dependency resolution. Used to resolve Unit of Work manager, CQRS services, and platform configuration.</param>
    /// <remarks>
    /// The constructor uses lazy initialization for performance optimization, ensuring that expensive services
    /// like CQRS and Unit of Work manager are only instantiated when actually needed.
    /// Distributed tracing is automatically enabled based on the PlatformModule.DistributedTracingConfig settings.
    /// </remarks>
    public PlatformRepository(IServiceProvider serviceProvider)
    {
        lazyUnitOfWorkManager = new Lazy<IPlatformUnitOfWorkManager>(() => serviceProvider.GetRequiredService<IPlatformUnitOfWorkManager>());
        cqrsLazy = serviceProvider.GetRequiredService<Lazy<IPlatformCqrs>>();
        ServiceProvider = serviceProvider;
        RootServiceProvider = serviceProvider.GetRequiredService<IPlatformRootServiceProvider>();
        IsDistributedTracingEnabled = serviceProvider.GetService<PlatformModule.DistributedTracingConfig>()?.Enabled == true;
    }

    /// <summary>
    /// Gets the root service provider that provides access to the application's root dependency injection container.
    /// Used for resolving services that require root-level scope, particularly in multi-tenant scenarios.
    /// </summary>
    /// <value>The root service provider instance for accessing application-wide services.</value>
    protected IPlatformRootServiceProvider RootServiceProvider { get; }

    /// <summary>
    /// Gets a value indicating whether distributed tracing is enabled for this repository instance.
    /// When enabled, repository operations will be traced across service boundaries for observability.
    /// </summary>
    /// <value><c>true</c> if distributed tracing is enabled; otherwise, <c>false</c>.</value>
    protected virtual bool IsDistributedTracingEnabled { get; }

    /// <summary>
    /// Gets the Unit of Work manager responsible for coordinating transactional operations across repositories.
    /// Provides access to current active Unit of Work instances and creates new ones when needed.
    /// </summary>
    /// <value>The Unit of Work manager instance for transaction coordination.</value>
    public IPlatformUnitOfWorkManager UnitOfWorkManager => lazyUnitOfWorkManager.Value;

    /// <summary>
    /// Gets the CQRS service for publishing domain events and integration events.
    /// Used to notify other bounded contexts and services of entity state changes.
    /// </summary>
    /// <value>The CQRS service instance for event publishing and command/query handling.</value>
    protected IPlatformCqrs Cqrs => cqrsLazy.Value;

    /// <summary>
    /// Gets the service provider used for dependency resolution within repository operations.
    /// Provides access to scoped and transient services required by repository implementations.
    /// </summary>
    /// <value>The service provider instance for dependency injection.</value>
    protected IServiceProvider ServiceProvider { get; }

    /// <summary>
    /// Gets the global-scoped Unit of Work instance that spans the entire application scope.
    /// Used for operations that need to coordinate across multiple repositories or services.
    /// </summary>
    /// <value>The global Unit of Work instance for cross-cutting transactional operations.</value>
    protected IPlatformUnitOfWork GlobalUow => UnitOfWorkManager.GlobalScopedUow;

    /// <summary>
    /// Gets the currently active Unit of Work for this repository's entity type.
    /// Throws an exception if no Unit of Work is currently active.
    /// </summary>
    /// <returns>The currently active Unit of Work instance of type <typeparamref name="TUow"/>.</returns>
    /// <exception cref="InvalidOperationException">Thrown when no Unit of Work is currently active.</exception>
    /// <remarks>
    /// This method should be used when you're certain that a Unit of Work is active in the current context.
    /// For scenarios where a Unit of Work might not be active, use <see cref="TryGetCurrentActiveUow"/> instead.
    /// </remarks>
    public IPlatformUnitOfWork CurrentActiveUow()
    {
        return UnitOfWorkManager.CurrentActiveUow().UowOfType<TUow>();
    }

    /// <summary>
    /// Gets the currently active Unit of Work or creates a new one with the specified identifier if none exists.
    /// Ensures that a Unit of Work is always available for the repository operation.
    /// </summary>
    /// <param name="uowId">The unique identifier for the Unit of Work. Used to track and coordinate the Unit of Work across multiple operations.</param>
    /// <returns>The currently active Unit of Work instance or a newly created one of type <typeparamref name="TUow"/>.</returns>
    /// <remarks>
    /// This method is useful in scenarios where you need to ensure a Unit of Work is available but want to avoid
    /// creating unnecessary instances if one already exists. The Unit of Work ID helps with tracking and debugging
    /// complex transactional scenarios across multiple services.
    /// </remarks>
    public IPlatformUnitOfWork CurrentOrCreatedActiveUow(string uowId)
    {
        return UnitOfWorkManager.CurrentOrCreatedActiveUow(uowId).UowOfType<TUow>();
    }

    /// <summary>
    /// Gets the Unit of Work manager instance for advanced Unit of Work lifecycle management.
    /// Provides direct access to Unit of Work creation, disposal, and coordination operations.
    /// </summary>
    /// <returns>The Unit of Work manager instance.</returns>
    /// <remarks>
    /// This method provides access to the underlying Unit of Work manager for scenarios that require
    /// advanced transaction management, such as creating nested transactions, managing multiple
    /// concurrent Unit of Work instances, or implementing custom transaction coordination logic.
    /// </remarks>
    public IPlatformUnitOfWorkManager UowManager()
    {
        return UnitOfWorkManager;
    }

    /// <summary>
    /// Retrieves a single entity by its primary key with support for loading related entities.
    /// </summary>
    /// <param name="id">The primary key value of the entity to retrieve.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <param name="loadRelatedEntities">Optional expressions to specify related entities that should be eagerly loaded with the main entity.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the entity with the specified primary key.</returns>
    /// <exception cref="InvalidOperationException">Thrown when no entity with the specified primary key is found.</exception>
    /// <remarks>
    /// This method is typically used in query handlers and application services when you need to retrieve
    /// a specific entity by its identifier. The method will throw an exception if the entity is not found,
    /// making it suitable for scenarios where the entity's existence is guaranteed or expected.
    /// </remarks>
    public abstract Task<TEntity> GetByIdAsync(TPrimaryKey id, CancellationToken cancellationToken = default, params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    /// <summary>
    /// Retrieves multiple entities by their primary keys with support for loading related entities.
    /// Returns entities in the same order as the provided IDs when possible.
    /// </summary>
    /// <param name="ids">A list of primary key values for the entities to retrieve.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <param name="loadRelatedEntities">Optional expressions to specify related entities that should be eagerly loaded with the main entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities matching the specified primary keys.</returns>
    /// <remarks>
    /// This method is optimized for bulk retrieval operations and is commonly used in scenarios where you need
    /// to load multiple entities efficiently. If some IDs don't match existing entities, they will be omitted
    /// from the result list. The method is particularly useful in event handlers and batch processing operations.
    /// </remarks>
    public abstract Task<List<TEntity>> GetByIdsAsync(
        List<TPrimaryKey> ids,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    /// <summary>
    /// Retrieves all entities that match the specified predicate with support for loading related entities.
    /// Automatically manages Unit of Work lifecycle for the read operation.
    /// </summary>
    /// <param name="predicate">An optional filter expression to apply to the entities. If null, all entities are returned.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <param name="loadRelatedEntities">Optional expressions to specify related entities that should be eagerly loaded with the main entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities matching the specified criteria.</returns>
    /// <remarks>
    /// This method automatically handles Unit of Work management, creating a temporary Unit of Work if none is active.
    /// It's commonly used in query handlers for retrieving filtered collections of entities. The method is optimized
    /// for scenarios where you need to load all matching entities into memory at once.
    /// </remarks>
    public virtual Task<List<TEntity>> GetAllAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((_, query) => GetAllAsync(query.WhereIf(predicate != null, predicate), cancellationToken), loadRelatedEntities);
    }

    /// <summary>
    /// Retrieves all entities using a custom query builder function that provides access to both Unit of Work and IQueryable.
    /// Allows for complex query composition with full access to the repository's query capabilities.
    /// </summary>
    /// <param name="queryBuilder">A function that takes a Unit of Work and IQueryable of entities and returns a modified IQueryable with applied filters, joins, and ordering.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <param name="loadRelatedEntities">Optional expressions to specify related entities that should be eagerly loaded with the main entities.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities matching the query builder criteria.</returns>
    /// <remarks>
    /// This overload provides the most flexibility for complex queries that require access to the Unit of Work context.
    /// It's particularly useful when you need to perform operations that depend on the current transaction state
    /// or when building dynamic queries based on Unit of Work properties.
    /// </remarks>
    public Task<List<TEntity>> GetAllAsync(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((uow, query) => GetAllAsync(queryBuilder(uow, query), cancellationToken), loadRelatedEntities);
    }

    /// <summary>
    /// Executes a pre-built IQueryable query and returns the results as a list.
    /// This method should be implemented by concrete repository classes to execute the actual database query.
    /// </summary>
    /// <param name="query">The IQueryable query to execute against the data store.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains a list of entities from the executed query.</returns>
    /// <remarks>
    /// This abstract method must be implemented by concrete repository classes to provide the actual
    /// data access implementation. It receives a fully composed IQueryable and is responsible for
    /// executing it against the underlying data store (Entity Framework, MongoDB, etc.).
    /// </remarks>
    public abstract Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public virtual IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((_, query) => GetAllAsyncEnumerable(queryBuilder(query), cancellationToken), loadRelatedEntities).GetResult();
    }

    public virtual IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((uow, query) => GetAllAsyncEnumerable(queryBuilder(uow, query), cancellationToken), loadRelatedEntities).GetResult();
    }

    public abstract IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public abstract Task<TEntity> FirstAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract Task<TEntity> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public Task<TEntity> FirstOrDefaultAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return FirstOrDefaultAsync(query.As<IEnumerable<TEntity>>(), cancellationToken);
    }

    public abstract Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

    public abstract Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

    public abstract Task<bool> AnyAsync<TQueryItemResult>(Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder, CancellationToken cancellationToken = default);

    public abstract Task<bool> AnyAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default);

    public abstract IEnumerable<TEntity> GetAllEnumerable(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public void SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate<TResult>(TResult? result, IPlatformUnitOfWork uow)
    {
        SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate(result, uow.UowOfType<TUow>());
    }

    public Task<List<TEntity>> GetAllAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((_, query) => GetAllAsync(queryBuilder(query), cancellationToken), loadRelatedEntities);
    }

    public Task<TEntity> FirstOrDefaultAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((_, query) => FirstOrDefaultAsync(queryBuilder(query), cancellationToken), loadRelatedEntities);
    }

    public Task<TEntity> FirstOrDefaultAsync(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead((uow, query) => FirstOrDefaultAsync(queryBuilder(uow, query), cancellationToken), loadRelatedEntities);
    }

    public abstract Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities
    );

    public abstract Task<int> CountAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default
    );

    public abstract Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

    public abstract Task<int> CountAsync<TQueryItemResult>(Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder, CancellationToken cancellationToken = default);

    public Func<IQueryable<TEntity>, IQueryable<TResult>> GetQueryBuilder<TResult>(Func<IQueryable<TEntity>, IQueryable<TResult>> builderFn)
    {
        return builderFn;
    }

    public Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TResult>> GetQueryBuilder<TResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TResult>> builderFn
    )
    {
        return builderFn;
    }

    public Func<IQueryable<TEntity>, IQueryable<TEntity>> GetQueryBuilder(Expression<Func<TEntity, bool>> predicate)
    {
        return query => query.Where(predicate);
    }

    public abstract IQueryable<TEntity> GetQuery(IPlatformUnitOfWork uow, params Expression<Func<TEntity, object?>>[] loadRelatedEntities);

    public IQueryable<TEntity> GetCurrentUowQuery(params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return GetQuery(CurrentActiveUow(), loadRelatedEntities);
    }

    public void SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate<TResult>(TResult? result, TUow uow)
    {
        if (uow == null || result is null)
            return;

        if (result is TEntity resultSingleEntity)
            uow.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(resultSingleEntity);
        else if (result is ICollection<TEntity> resultMultipleEntities && resultMultipleEntities.Any())
            resultMultipleEntities.ForEach(p => uow.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p));
        else if (result is ICollection<KeyValuePair<TPrimaryKey, TEntity>> resultMultipleEntitiesDict && resultMultipleEntitiesDict.Any())
            resultMultipleEntitiesDict.ForEach(p => uow.SetCachedExistingOriginalEntity<TEntity, TPrimaryKey>(p.Value));
        else if (result.GetType().IsAnonymousType())
        {
            foreach (var property in result.GetType().GetProperties())
                SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate(property.GetValue(result), uow);
        }
    }

    public abstract IQueryable<TEntity> GetQuery(IPlatformUnitOfWork uow, Expression<Func<TEntity, object?>>[] loadRelatedEntities, bool forAsyncEnumerable);

    public IPlatformRootServiceProvider GetRootServiceProvider()
    {
        return RootServiceProvider;
    }

    public abstract Task<TSource> FirstOrDefaultAsync<TSource>(IEnumerable<TSource> query, CancellationToken cancellationToken = default);

    public async Task<List<TEntity>> UpdateManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        Action<TEntity> updateAction,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    )
    {
        var updateItems = await GetAllAsync(predicate, cancellationToken).ThenAction(items => items.ForEach(updateAction));
        return await UpdateManyAsync(updateItems, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    /// <summary>
    /// Attempts to get the currently active Unit of Work for this repository's entity type.
    /// Returns null if no Unit of Work is currently active, making it safe for optional operations.
    /// </summary>
    /// <returns>The currently active Unit of Work instance of type <typeparamref name="TUow"/>, or null if none is active.</returns>
    /// <remarks>
    /// This method is the safe alternative to <see cref="CurrentActiveUow"/> when you're not certain
    /// that a Unit of Work is active. It's commonly used in scenarios where you want to participate
    /// in an existing transaction if available, but don't require one to be present.
    /// </remarks>
    public IPlatformUnitOfWork TryGetCurrentActiveUow()
    {
        return UnitOfWorkManager.TryGetCurrentActiveUow()?.UowOfType<TUow>();
    }

    /// <summary>
    /// Creates a new entity in the data store with automatic Unit of Work management and optional CQRS event publishing.
    /// </summary>
    /// <param name="entity">The entity to create. Must have all required properties populated.</param>
    /// <param name="dismissSendEvent">If <c>true</c>, suppresses the automatic publishing of CQRS entity creation events. Default is <c>false</c>.</param>
    /// <param name="eventCustomConfig">Optional configuration action to customize the CQRS event before publishing. Allows setting event metadata, correlation IDs, etc.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created entity with any generated values (like auto-incremented IDs) populated.</returns>
    /// <remarks>
    /// This method automatically creates a Unit of Work if none is active, persists the entity, and publishes
    /// a CQRS creation event unless suppressed. The method is commonly used in command handlers and application
    /// services for creating new domain entities. The returned entity will have any database-generated values
    /// (such as auto-incremented primary keys, timestamps, etc.) populated.
    /// </remarks>
    public abstract Task<TEntity> CreateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Creates a new entity within a specific Unit of Work context with optional CQRS event publishing.
    /// </summary>
    /// <param name="uow">The Unit of Work to use for the creation operation. Provides transaction context and change tracking.</param>
    /// <param name="entity">The entity to create. Must have all required properties populated.</param>
    /// <param name="dismissSendEvent">If <c>true</c>, suppresses the automatic publishing of CQRS entity creation events. Default is <c>false</c>.</param>
    /// <param name="eventCustomConfig">Optional configuration action to customize the CQRS event before publishing. Allows setting event metadata, correlation IDs, etc.</param>
    /// <param name="cancellationToken">A cancellation token to cancel the operation if needed.</param>
    /// <returns>A task that represents the asynchronous operation. The task result contains the created entity with any generated values populated.</returns>
    /// <remarks>
    /// This overload allows precise control over the transaction context by accepting a specific Unit of Work.
    /// It's particularly useful when you need to create entities as part of a larger transaction or when
    /// coordinating operations across multiple repositories within the same transactional boundary.
    /// </remarks>
    public abstract Task<TEntity> CreateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> CreateOrUpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> CreateOrUpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        TEntity? existingEntity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> CreateOrUpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> CreateOrUpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> UpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> SetAsync(TEntity entity, CancellationToken cancellationToken = default);

    public abstract Task<TEntity> SetAsync(IPlatformUnitOfWork uow, TEntity entity, CancellationToken cancellationToken = default);

    public abstract Task<TEntity> UpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> DeleteAsync(
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> DeleteAsync(
        IPlatformUnitOfWork uow,
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> DeleteAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> CreateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> CreateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> UpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> UpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TPrimaryKey>> DeleteManyAsync(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> DeleteManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<int> DeleteManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<int> DeleteManyAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<int> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<int> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<List<TEntity>> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    public abstract Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default
    );

    protected abstract void HandleDisposeUsingOnceTransientUowLogic<TResult>(IPlatformUnitOfWork uow, Expression<Func<TEntity, object>>[] loadRelatedEntities, TResult result);

    /// <summary>
    /// Return True to determine that this uow is Thread Safe and could support multiple parallel query
    /// </summary>
    protected abstract bool DoesSupportParallelExecution();

    /// <summary>
    /// If true, the uow actually do not handle real transaction. Repository when create/update data actually save immediately
    /// </summary>
    /// <remarks>
    /// The IsPseudoTransactionUow method is part of the IUnitOfWork interface in the Easy.Platform.Domain.UnitOfWork namespace. This method is used to determine whether the current unit of work (UoW) is handling a real transaction or not.
    /// <br />
    /// In the context of a UoW pattern, a real transaction implies that the changes made within the UoW are not immediately saved to the database, but are instead held until the UoW is completed. If the UoW fails, the changes can be rolled back, maintaining the integrity of the data.
    /// <br />
    /// On the other hand, a pseudo-transaction UoW implies that the changes are immediately saved to the database when they are made. This means there is no rollback mechanism if the UoW fails.
    /// <br />
    /// In the provided code, different implementations of the IUnitOfWork interface override the IsPseudoTransactionUow method to specify whether they handle real transactions or pseudo-transactions. For example, the PlatformEfCorePersistenceUnitOfWork class returns false, indicating it handles real transactions, while the PlatformMongoDbPersistenceUnitOfWork class returns true, indicating it handles pseudo-transactions.
    /// <br />
    /// This method is used in various parts of the code to decide how to handle certain operations. For example, in the PlatformCqrsEventApplicationHandler class, the IsPseudoTransactionUow method is used to determine whether to execute certain actions immediately or add them to the OnSaveChangesCompletedActions list to be executed when the UoW is completed.
    /// </remarks>
    protected abstract bool IsPseudoTransactionUow();

    protected virtual async Task<TResult> ExecuteAutoOpenUowUsingOnceTimeForRead<TResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, Task<TResult>> readDataFn,
        Expression<Func<TEntity, object>>[] loadRelatedEntities,
        bool forceOpenUowUsingOnce = false,
        bool forAsyncEnumerable = false
    )
    {
        var currentActiveUow = forceOpenUowUsingOnce ? null : UnitOfWorkManager.TryGetCurrentActiveUow();

        if (currentActiveUow == null)
        {
            if (DoesSupportParallelExecution())
                return await ExecuteReadData(GlobalUow, readDataFn, loadRelatedEntities, forAsyncEnumerable);
            else
            {
                var useOnceTransientUow = UnitOfWorkManager.CreateNewUow(true);
                TResult useOnceTransientUowResult = default;

                try
                {
                    useOnceTransientUowResult = await ExecuteReadData(useOnceTransientUow, readDataFn, loadRelatedEntities, forAsyncEnumerable);

                    return useOnceTransientUowResult;
                }
                finally
                {
                    HandleDisposeUsingOnceTransientUowLogic(useOnceTransientUow, loadRelatedEntities, useOnceTransientUowResult);
                }
            }
        }
        else
        {
            var result = await ExecuteUowReadQueryThreadSafe(
                currentActiveUow,
                uow => ExecuteReadData(uow, readDataFn, loadRelatedEntities, forAsyncEnumerable: forAsyncEnumerable)
            );

            // If there is opening uow, may get data for update => set cached original entities for track update
            SetCachedOriginalEntitiesInUowForTrackingCompareAfterUpdate(result, currentActiveUow.UowOfType<TUow>());

            return result;
        }
    }

    protected async Task<TResult> ExecuteUowReadQueryThreadSafe<TResult>(IPlatformUnitOfWork uow, Func<IPlatformUnitOfWork, Task<TResult>> executeFn)
    {
        if (DoesSupportParallelExecution() == false)
        {
            var uowOfTUow = uow.UowOfType<TUow>();

            try
            {
                //Asynchronously wait to enter the Semaphore. If no-one has been granted access to the Semaphore, code execution will proceed, otherwise this thread waits here until the semaphore is released
                await uowOfTUow.LockAsync();

                var result = await executeFn(uow);

                uowOfTUow.ReleaseLock();

                return result;
            }
            catch (Exception)
            {
                //When the task is ready, release the semaphore. It is vital to ALWAYS release the semaphore when we are ready, or else we will end up with a Semaphore that is forever locked.
                //This is why it is important to do the Release within a try...finally clause; program execution may crash or take a different path, this way you are guaranteed execution
                uowOfTUow.ReleaseLock();
            }
        }

        return await executeFn(uow);
    }

    protected Task<TResult> ExecuteReadData<TResult>(
        IPlatformUnitOfWork uow,
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, Task<TResult>> readDataFn,
        Expression<Func<TEntity, object>>[] loadRelatedEntities,
        bool forAsyncEnumerable = false
    )
    {
        return readDataFn(uow, GetQuery(uow, loadRelatedEntities, forAsyncEnumerable));
    }

    protected virtual Task<TResult> ExecuteAutoOpenUowUsingOnceTimeForRead<TResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, TResult> readDataFn,
        Expression<Func<TEntity, object>>[] loadRelatedEntities,
        bool forceOpenUowUsingOnce = false,
        bool forAsyncEnumerable = false
    )
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(ReadDataFnAsync, loadRelatedEntities, forceOpenUowUsingOnce, forAsyncEnumerable);

        async Task<TResult> ReadDataFnAsync(IPlatformUnitOfWork unitOfWork, IQueryable<TEntity> entities)
        {
            return readDataFn(unitOfWork, entities);
        }
    }

    protected virtual async Task<TResult> ExecuteAutoOpenUowUsingOnceTimeForWrite<TResult>(Func<IPlatformUnitOfWork, Task<TResult>> action, IPlatformUnitOfWork forceUseUow = null)
    {
        if (forceUseUow != null)
            return await action(forceUseUow);

        var currentActiveUow = UnitOfWorkManager.TryGetCurrentActiveUow();

        if (currentActiveUow == null)
        {
            if (DoesSupportParallelExecution() && IsPseudoTransactionUow())
            {
                var result = await action(GlobalUow);

                return result;
            }
            else
            {
                var uow = UnitOfWorkManager.CreateNewUow(true);
                TResult result = default;

                try
                {
                    result = await action(uow);

                    await uow.CompleteAsync();

                    return result;
                }
                finally
                {
                    if (!DoesNeedKeepUowForQueryOrEnumerableExecutionLater(result, uow))
                        uow.Dispose();
                }
            }
        }
        else
            return await action(currentActiveUow);
    }

    protected abstract bool DoesNeedKeepUowForQueryOrEnumerableExecutionLater<TResult>(TResult result, IPlatformUnitOfWork uow);
}
