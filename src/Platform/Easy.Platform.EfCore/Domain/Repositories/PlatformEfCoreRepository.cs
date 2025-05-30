#region

using System.Collections;
using System.Linq.Expressions;
using System.Reflection;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.Domain.UnitOfWork;
using Easy.Platform.Persistence.Domain;
using Microsoft.EntityFrameworkCore;

#endregion

namespace Easy.Platform.EfCore.Domain.Repositories;

/// <summary>
/// Marker interface for Entity Framework Core repository implementations within the Easy Platform architecture.
/// Provides a common contract for all EF Core-based repositories to enable type-safe service registration and dependency injection.
/// </summary>
/// <remarks>
/// This interface serves as a marker for the dependency injection container to identify and register
/// all Entity Framework Core repository implementations consistently. It enables bulk registration
/// of EF Core repositories and provides a common abstraction point for cross-cutting concerns
/// such as interceptors, decorators, and aspect-oriented programming scenarios.
/// </remarks>
public interface IPlatformEfCoreRepository
{
}

/// <summary>
/// Abstract Entity Framework Core repository implementation that provides comprehensive data access operations
/// for domain entities using Entity Framework Core as the persistence technology.
/// Extends <see cref="PlatformPersistenceRepository{TEntity, TPrimaryKey, TUow, TDbContext}"/> with EF Core-specific optimizations and behaviors.
/// </summary>
/// <typeparam name="TEntity">The domain entity type that implements <see cref="IEntity{TPrimaryKey}"/> and has a parameterless constructor. Represents the aggregate root or entity being managed by this repository.</typeparam>
/// <typeparam name="TPrimaryKey">The type of the primary key for the entity. Common types include int, long, Guid, or composite key types. Must be comparable and serializable.</typeparam>
/// <typeparam name="TDbContext">The Entity Framework Core DbContext type that inherits from <see cref="PlatformEfCoreDbContext{TDbContext}"/>. Provides the data access context and configuration for entity mappings.</typeparam>
/// <remarks>
/// This abstract repository serves as the foundation for Entity Framework Core-based data access within the Easy Platform:
///
/// <para><strong>Entity Framework Core Integration:</strong></para>
/// <list type="bullet">
/// <item><description>Leverages Entity Framework Core's advanced features including change tracking, lazy loading, and optimistic concurrency</description></item>
/// <item><description>Supports full ACID transactions with rollback capabilities (IsPseudoTransactionUow returns false)</description></item>
/// <item><description>Implements single-threaded operation model for optimal EF Core performance (DoesSupportParallelExecution returns false)</description></item>
/// <item><description>Provides direct access to DbSet{TEntity} for advanced query scenarios and bulk operations</description></item>
/// </list>
///
/// <para><strong>Architecture Benefits:</strong></para>
/// <list type="bullet">
/// <item><description>Inherits comprehensive CQRS event integration from the base PlatformPersistenceRepository</description></item>
/// <item><description>Automatic Unit of Work coordination with EF Core's DbContext change tracking</description></item>
/// <item><description>Seamless integration with Easy Platform's distributed tracing and logging infrastructure</description></item>
/// <item><description>Support for complex queries, joins, and projections through LINQ to Entities</description></item>
/// </list>
///
/// <para><strong>Performance Characteristics:</strong></para>
/// <list type="bullet">
/// <item><description>Non-parallel execution ensures optimal EF Core context usage and avoids threading issues</description></item>
/// <item><description>True transactional support with automatic rollback on exceptions</description></item>
/// <item><description>Efficient batch operations through EF Core's bulk insert/update capabilities</description></item>
/// <item><description>Advanced query optimization through EF Core's expression tree compilation</description></item>
/// </list>
/// </remarks>
public abstract class PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext>
    : PlatformPersistenceRepository<TEntity, TPrimaryKey, IPlatformEfCorePersistenceUnitOfWork<TDbContext>, TDbContext>,
        IPlatformEfCoreRepository
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TDbContext : PlatformEfCoreDbContext<TDbContext>
{
    /// <summary>
    /// Initializes a new instance of the PlatformEfCoreRepository with Entity Framework Core configuration and dependency injection setup.
    /// Configures the repository for optimal EF Core operations and performance.
    /// </summary>
    /// <param name="dbContextOptions">The Entity Framework Core configuration options for the DbContext. Contains connection strings, provider settings, and context-specific configurations.</param>
    /// <param name="serviceProvider">The service provider for dependency resolution. Used to resolve Unit of Work managers, CQRS services, and other platform dependencies.</param>
    /// <remarks>
    /// The constructor sets up the repository with EF Core-specific optimizations and ensures proper
    /// integration with the Easy Platform's dependency injection container. The DbContextOptions
    /// parameter allows for flexible configuration of different database providers and connection settings
    /// across various environments (development, testing, production).
    /// </remarks>
    public PlatformEfCoreRepository(DbContextOptions<TDbContext> dbContextOptions, IServiceProvider serviceProvider)
        : base(serviceProvider)
    {
        DbContextOptions = dbContextOptions;
    }

    /// <summary>
    /// Gets the Entity Framework Core configuration options for the DbContext.
    /// Contains database provider settings, connection strings, and context-specific configurations.
    /// </summary>
    /// <value>The DbContext configuration options used by this repository instance.</value>
    /// <remarks>
    /// These options control how the Entity Framework Core DbContext is configured and connected
    /// to the underlying database. The options include provider-specific settings (SQL Server, PostgreSQL, etc.),
    /// connection pooling configuration, and development/production optimizations.
    /// </remarks>
    protected DbContextOptions<TDbContext> DbContextOptions { get; }

    /// <summary>
    /// Indicates that Entity Framework Core repositories do not support parallel execution within the same context.
    /// Returns false to ensure thread-safe operations and optimal EF Core performance.
    /// </summary>
    /// <returns>Always returns <c>false</c> indicating that parallel execution is not supported.</returns>
    /// <remarks>
    /// Entity Framework Core DbContext instances are not thread-safe and should not be used concurrently
    /// from multiple threads. This override ensures that the repository's Unit of Work management
    /// uses appropriate locking mechanisms to prevent concurrent access issues and maintains
    /// the integrity of change tracking and transaction management.
    /// </remarks>
    protected override bool DoesSupportParallelExecution()
    {
        return false;
    }

    /// <summary>
    /// Indicates that Entity Framework Core repositories support real database transactions with full ACID properties.
    /// Returns false to enable proper transaction management with rollback capabilities.
    /// </summary>
    /// <returns>Always returns <c>false</c> indicating that this is a real transactional Unit of Work, not a pseudo-transaction.</returns>
    /// <remarks>
    /// Unlike some NoSQL databases or in-memory stores, Entity Framework Core provides full transaction support
    /// with the ability to rollback changes if operations fail. This enables:
    /// <list type="bullet">
    /// <item><description>Atomic operations across multiple entity changes</description></item>
    /// <item><description>Consistent data state even in case of failures</description></item>
    /// <item><description>Isolation between concurrent transactions</description></item>
    /// <item><description>Durability of committed changes</description></item>
    /// </list>
    /// This setting ensures that CQRS events are properly coordinated with transaction boundaries
    /// and that Unit of Work completion semantics are correctly applied.
    /// </remarks>
    protected override bool IsPseudoTransactionUow()
    {
        return false;
    }

    public virtual DbSet<TEntity> GetTable(IPlatformUnitOfWork uow)
    {
        return GetUowDbContext(uow).Set<TEntity>();
    }

    public override IQueryable<TEntity> GetQuery(IPlatformUnitOfWork uow, params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return GetQuery(uow, loadRelatedEntities, forAsyncEnumerable: false);
    }

    public override IQueryable<TEntity> GetQuery(IPlatformUnitOfWork uow, Expression<Func<TEntity, object?>>[] loadRelatedEntities, bool forAsyncEnumerable)
    {
        // Using IAsyncEnumerable<T> with await foreach (Best for Large Data). Go through each item and release memory like stream
        return GetTable(uow)
            .AsQueryable()
            .PipeIf(forAsyncEnumerable, query => query.AsNoTrackingWithIdentityResolution())
            .PipeIf(
                loadRelatedEntities.Any(),
                query => loadRelatedEntities.Aggregate(query, (query, loadRelatedEntityFn) => query.Include(loadRelatedEntityFn).DefaultIfEmpty()));
    }

    public override async Task<List<TSource>> ToListAsync<TSource>(IEnumerable<TSource> source, CancellationToken cancellationToken = default)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return await IPlatformDbContext.ExecuteWithBadQueryWarningHandling(
                () => source.As<IQueryable<TSource>>()?.ToListAsync(cancellationToken) ?? source.ToList().BoxedInTask(),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: false,
                resultQuery: source,
                resultQueryStringBuilder: source.As<IQueryable<TSource>>()?.Pipe(queryable => queryable != null ? queryable.ToQueryString : (Func<string>)null)
            );
        }

        return await (source.As<IQueryable<TSource>>()?.ToListAsync(cancellationToken) ?? source.ToList().BoxedInTask());
    }

    public override IAsyncEnumerable<TSource> ToAsyncEnumerable<TSource>(IEnumerable<TSource> source, CancellationToken cancellationToken = default)
    {
        return source.As<IQueryable<TSource>>()?.AsAsyncEnumerable() ?? source.ToAsyncEnumerable();
    }

    public override async Task<TSource> FirstOrDefaultAsync<TSource>(IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return await IPlatformDbContext.ExecuteWithBadQueryWarningHandling(
                () => source.FirstOrDefaultAsync(cancellationToken),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: false,
                resultQuery: source,
                resultQueryStringBuilder: source.As<IQueryable<TSource>>()?.Pipe(queryable => queryable != null ? queryable.ToQueryString : (Func<string>)null)
            );
        }

        return await source.FirstOrDefaultAsync(cancellationToken);
    }

    public override async Task<TSource> FirstOrDefaultAsync<TSource>(IEnumerable<TSource> query, CancellationToken cancellationToken = default)
    {
        if (query.As<IQueryable<TSource>>() != null)
            return await FirstOrDefaultAsync(query.As<IQueryable<TSource>>(), cancellationToken);

        return query.FirstOrDefault();
    }

    public override async Task<TSource> FirstAsync<TSource>(IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return await IPlatformDbContext.ExecuteWithBadQueryWarningHandling(
                () => source.FirstAsync(cancellationToken),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: false,
                resultQuery: source,
                resultQueryStringBuilder: source.As<IQueryable<TSource>>()?.Pipe(queryable => queryable != null ? queryable.ToQueryString : (Func<string>)null)
            );
        }

        return await source.FirstAsync(cancellationToken);
    }

    public override async Task<int> CountAsync<TSource>(IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return await IPlatformDbContext.ExecuteWithBadQueryWarningHandling(
                () => source.CountAsync(cancellationToken),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: false,
                resultQuery: source,
                resultQueryStringBuilder: source.As<IQueryable<TSource>>()?.Pipe(queryable => queryable != null ? queryable.ToQueryString : (Func<string>)null)
            );
        }

        return await source.CountAsync(cancellationToken);
    }

    public override async Task<bool> AnyAsync<TSource>(IQueryable<TSource> source, CancellationToken cancellationToken = default)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return await IPlatformDbContext.ExecuteWithBadQueryWarningHandling(
                () => source.AnyAsync(cancellationToken),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: false,
                resultQuery: source,
                resultQueryStringBuilder: source.As<IQueryable<TSource>>()?.Pipe(queryable => queryable != null ? queryable.ToQueryString : (Func<string>)null)
            );
        }

        return await source.AnyAsync(cancellationToken);
    }

    protected override void HandleDisposeUsingOnceTransientUowLogic<TResult>(
        IPlatformUnitOfWork uow,
        Expression<Func<TEntity, object>>[] loadRelatedEntities,
        TResult result)
    {
        var canDisposeContext = !DoesNeedKeepUowForQueryOrEnumerableExecutionLater(result, uow);

        if (DbContextOptions.IsUsingLazyLoadingProxy() && loadRelatedEntities?.Any() == true && canDisposeContext)
        {
            // Fix Eager loading include with using UseLazyLoadingProxies of EfCore by try to access the entity before dispose context
            if (result is TEntity entity)
                loadRelatedEntities.ForEach(loadRelatedEntityFn => loadRelatedEntityFn.Compile()(entity));
            else if (result is IEnumerable<TEntity> entities)
                entities.ForEach(entity => loadRelatedEntities.ForEach(loadRelatedEntityFn => loadRelatedEntityFn.Compile()(entity)));
            else
            {
                result
                    ?.GetType()
                    .GetProperties(BindingFlags.Instance | BindingFlags.Public)
                    .Where(p => p.PropertyType == typeof(TEntity))
                    .ForEach(entityPropertyInfo =>
                        loadRelatedEntities.ForEach(loadRelatedEntityFn => loadRelatedEntityFn.Compile()(entityPropertyInfo.GetValue(result).As<TEntity>()))
                    );
            }
        }

        if (canDisposeContext)
            uow.Dispose();
    }

    // If result has entity instance and MustKeepUowForQuery == true => ef core might use lazy-loading => need to keep the uow for db context
    // to help the entity could load lazy navigation property. If uow disposed => context disposed => lazy-loading proxy failed because db-context disposed
    protected override bool DoesNeedKeepUowForQueryOrEnumerableExecutionLater<TResult>(TResult result, IPlatformUnitOfWork uow)
    {
        if (result is null || result.GetType().Pipe(p => p.IsPrimitive || p.IsValueType) || result is string || result.As<ICollection>()?.Count == 0)
            return false;

        if (
            result
            .GetType()
            .Pipe(resultType =>
                IsEnumerableExecutionLaterType(resultType)
                || resultType
                    .GetInterfaces()
                    .FirstOrDefault(p => p.IsAssignableToGenericType(typeof(IDictionary<,>)))
                    .Pipe(p => p != null && IsEnumerableExecutionLaterType(p.GenericTypeArguments[1]))
            )
        )
            return true;

        // Keep uow for lazy-loading if the result is entity, Dictionary or Grouped result of entity or list entities
        return DbContextOptions.IsUsingLazyLoadingProxy() && (IsEntityOrListEntity(result) || IsDictionaryOfValueOfEntityOrListEntity(result.GetType()));

        static bool IsEntityOrListEntity<TData>(TData data)
        {
            var result =
                data is IEntity
                || data.GetType()
                    .Pipe(p =>
                        p.GetInterfaces()
                            .FirstOrDefault(p => p.IsAssignableToGenericType(typeof(IEnumerable<>)))
                            .Pipe(p => p != null && p.GenericTypeArguments[0].IsAssignableTo(typeof(IEntity)))
                        || p.GetProperties(BindingFlags.Instance | BindingFlags.Public).Any(p => p.PropertyType.IsAssignableTo(typeof(IEntity)))
                    );

            return result;
        }

        static bool IsDictionaryOfValueOfEntityOrListEntity(Type resultType)
        {
            return resultType
                .GetInterfaces()
                .FirstOrDefault(p => p.IsAssignableToGenericType(typeof(IDictionary<,>)))
                .Pipe(p => p != null && IsEntityOrListEntity(p.GenericTypeArguments[1]));
        }

        static bool IsEnumerableExecutionLaterType(Type resultType)
        {
            return resultType.IsAssignableToGenericType(typeof(IQueryable<>))
                   || resultType.IsAssignableToGenericType(typeof(IAsyncEnumerable<>))
                   || (resultType.IsAssignableToGenericType(typeof(IEnumerable<>)) && !resultType.IsAssignableToGenericType(typeof(ICollection<>)));
        }
    }
}

public abstract class PlatformEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext>
    : PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext>,
        IPlatformRootRepository<TEntity, TPrimaryKey>
    where TEntity : class, IRootEntity<TPrimaryKey>, new()
    where TDbContext : PlatformEfCoreDbContext<TDbContext>
{
    public PlatformEfCoreRootRepository(DbContextOptions<TDbContext> dbContextOptions, IServiceProvider serviceProvider)
        : base(dbContextOptions, serviceProvider)
    {
    }
}
