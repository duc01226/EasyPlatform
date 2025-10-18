using System.Linq.Expressions;
using Easy.Platform.Application.Persistence;
using Easy.Platform.Common.Exceptions.Extensions;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Common.Utils;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Easy.Platform.Persistence.Domain;

public abstract class PlatformPersistenceRepository<TEntity, TPrimaryKey, TUow, TDbContext> : PlatformRepository<TEntity, TPrimaryKey, TUow>
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TUow : class, IPlatformPersistenceUnitOfWork<TDbContext>
    where TDbContext : IPlatformDbContext
{
    private readonly Lazy<ILogger> loggerLazy;

    protected PlatformPersistenceRepository(
        IServiceProvider serviceProvider) : base(serviceProvider)
    {
        PersistenceConfiguration = serviceProvider.GetRequiredService<PlatformPersistenceConfiguration<TDbContext>>();
        loggerLazy = new Lazy<ILogger>(() => serviceProvider.GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(PlatformPersistenceRepository<,,,>).GetNameOrGenericTypeName() + $"-{GetType().Name}"));
    }

    /// <summary>
    /// Return CurrentActiveUow db context if exist or. <br />
    /// Auto use GlobalUow if there's no current active uow. <br />
    /// Support for old system code or other application want to use platform repository inherit DbContext but without open new uow
    /// </summary>
    protected virtual TDbContext DbContext => GetUowDbContext(TryGetCurrentActiveUow() ?? GlobalUow);

    protected PlatformPersistenceConfiguration<TDbContext> PersistenceConfiguration { get; }
    protected ILogger Logger => loggerLazy.Value;

    protected override Task<TResult> ExecuteAutoOpenUowUsingOnceTimeForWrite<TResult>(
        Func<IPlatformUnitOfWork, Task<TResult>> action,
        IPlatformUnitOfWork forceUseUow = null)
    {
        return ExecuteWithBadQueryWarningForWriteHandling(forceUseUow => base.ExecuteAutoOpenUowUsingOnceTimeForWrite(action, forceUseUow), forceUseUow);
    }

    protected Task<TResult> ExecuteWithBadQueryWarningForWriteHandling<TResult>(Func<IPlatformUnitOfWork, Task<TResult>> action, IPlatformUnitOfWork uow)
    {
        if (PersistenceConfiguration.BadQueryWarning.IsEnabled)
        {
            return IPlatformDbContext.ExecuteWithBadQueryWarningHandling<TResult, TEntity>(
                () => action(uow),
                Logger,
                PersistenceConfiguration,
                forWriteQuery: true,
                resultQuery: null,
                resultQueryStringBuilder: null);
        }

        return action(uow);
    }

    public TDbContext GetUowDbContext(IPlatformUnitOfWork uow)
    {
        return uow.UowOfType<TUow>().DbContext;
    }

    public abstract Task<List<TSource>> ToListAsync<TSource>(
        IEnumerable<TSource> source,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Use ToAsyncEnumerable to convert IQueryable to IAsyncEnumerable to help return data like a stream. Also help
    /// using it as a true IEnumerable which Then can select anything and it will work.
    /// Default as Enumerable from IQueryable still like Queryable which cause error query could not be translated for free select using constructor map for example
    /// </summary>
    public abstract IAsyncEnumerable<TSource> ToAsyncEnumerable<TSource>(
        IEnumerable<TSource> source,
        CancellationToken cancellationToken = default);

    public abstract Task<TSource> FirstOrDefaultAsync<TSource>(
        IQueryable<TSource> source,
        CancellationToken cancellationToken = default);

    public abstract Task<TSource> FirstAsync<TSource>(
        IQueryable<TSource> source,
        CancellationToken cancellationToken = default);

    public abstract Task<int> CountAsync<TSource>(
        IQueryable<TSource> source,
        CancellationToken cancellationToken = default);

    public abstract Task<bool> AnyAsync<TSource>(
        IQueryable<TSource> source,
        CancellationToken cancellationToken = default);

    public override Task<TEntity> GetByIdAsync(
        TPrimaryKey id,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => FirstOrDefaultAsync(query.Where(p => p.Id!.Equals(id)), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<List<TEntity>> GetByIdsAsync(
        List<TPrimaryKey> ids,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => ToListAsync(query.Where(p => ids.Contains(p.Id)), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return ToListAsync(query, cancellationToken);
    }

    public override IEnumerable<TEntity> GetAllEnumerable(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
                (_, query) => ToAsyncEnumerable(query.WhereIf(predicate != null, predicate), cancellationToken).ToEnumerable(),
                loadRelatedEntities,
                forAsyncEnumerable: true)
            .GetResult();
    }

    public override IAsyncEnumerable<TEntity> GetAllAsyncEnumerable(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return ToAsyncEnumerable(query, cancellationToken);
    }

    public override IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
                (_, query) => ToAsyncEnumerable(queryBuilder(query), cancellationToken),
                loadRelatedEntities,
                forAsyncEnumerable: true)
            .GetResult();
    }

    public override IAsyncEnumerable<TSelector> GetAllAsyncEnumerable<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
                (uow, query) => ToAsyncEnumerable(queryBuilder(uow, query), cancellationToken),
                loadRelatedEntities,
                forAsyncEnumerable: true)
            .GetResult();
    }

    public override Task<TEntity> FirstAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => FirstOrDefaultAsync(query.WhereIf(predicate != null, predicate), cancellationToken)
                .EnsureFound($"{typeof(TEntity).Name} is not found"),
            loadRelatedEntities);
    }

    public override Task<TEntity> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => FirstOrDefaultAsync(query.WhereIf(predicate != null, predicate), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<int> CountAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => GetUowDbContext(uow).CountAsync(predicate, cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return CountAsync(query, cancellationToken);
    }

    public override Task<bool> AnyAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => GetUowDbContext(uow).AnyAsync(predicate, cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<bool> AnyAsync<TQueryItemResult>(
        Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => GetUowDbContext(uow).AnyAsync(queryBuilder(query), cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<bool> AnyAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => GetUowDbContext(uow).AnyAsync(queryBuilder(uow, query), cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<int> CountAsync<TQueryItemResult>(
        Func<IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => CountAsync(queryBuilder(query), cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<int> CountAsync<TQueryItemResult>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TQueryItemResult>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => CountAsync(queryBuilder(uow, query), cancellationToken),
            [],
            forceOpenUowUsingOnce: true);
    }

    public override Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => ToListAsync(queryBuilder(query), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities)
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => ToListAsync(queryBuilder(uow, query), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities) where TSelector : default
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (_, query) => FirstOrDefaultAsync(queryBuilder(query), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IPlatformUnitOfWork, IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default,
        params Expression<Func<TEntity, object?>>[] loadRelatedEntities) where TSelector : default
    {
        return ExecuteAutoOpenUowUsingOnceTimeForRead(
            (uow, query) => FirstOrDefaultAsync(queryBuilder(uow, query), cancellationToken),
            loadRelatedEntities);
    }

    public override Task<TEntity> CreateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return CreateAsync(null, entity, dismissSendEvent, eventCustomConfig, cancellationToken);
    }

    public override async Task<TEntity> CreateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entity.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow).CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            uow => GetUowDbContext(uow).CreateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return CreateOrUpdateAsync(null, entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    public override Task<TEntity> CreateOrUpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return CreateOrUpdateAsync(uow, entity, existingEntity: null, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    public override Task<TEntity> CreateOrUpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        TEntity? existingEntity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (IsDistributedTracingEnabled)
                {
                    using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateOrUpdateAsync)}"))
                    {
                        activity?.AddTag("EntityType", typeof(TEntity).FullName);
                        activity?.AddTag("Entity", entity.ToFormattedJson());

                        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                            uow => GetUowDbContext(uow)
                                .CreateOrUpdateAsync<TEntity, TPrimaryKey>(
                                    entity,
                                    existingEntity,
                                    null,
                                    dismissSendEvent,
                                    checkDiff,
                                    eventCustomConfig,
                                    cancellationToken),
                            uow);
                    }
                }

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow)
                        .CreateOrUpdateAsync<TEntity, TPrimaryKey>(entity, existingEntity, null, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken),
                    uow);
            },
            cancellationToken: cancellationToken);
    }

    public override Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (IsDistributedTracingEnabled)
                {
                    using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateOrUpdateAsync)}"))
                    {
                        activity?.AddTag("EntityType", typeof(TEntity).FullName);
                        activity?.AddTag("Entity", entity.ToFormattedJson());

                        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow => GetUowDbContext(uow)
                            .CreateOrUpdateAsync<TEntity, TPrimaryKey>(
                                entity,
                                customCheckExistingPredicate,
                                dismissSendEvent,
                                checkDiff,
                                eventCustomConfig,
                                cancellationToken));
                    }
                }

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow => GetUowDbContext(uow)
                    .CreateOrUpdateAsync<TEntity, TPrimaryKey>(
                        entity,
                        customCheckExistingPredicate,
                        dismissSendEvent,
                        checkDiff,
                        eventCustomConfig,
                        cancellationToken));
            },
            cancellationToken: cancellationToken);
    }

    public override Task<List<TEntity>> CreateOrUpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return CreateOrUpdateManyAsync(null, entities, dismissSendEvent, checkDiff, customCheckExistingPredicateBuilder, eventCustomConfig, cancellationToken);
    }

    public override Task<List<TEntity>> CreateOrUpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Func<TEntity, Expression<Func<TEntity, bool>>> customCheckExistingPredicateBuilder = null,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return Util.TaskRunner.WaitRetryThrowFinalExceptionAsync(
            async () =>
            {
                if (entities.IsNullOrEmpty()) return entities;

                if (IsDistributedTracingEnabled)
                {
                    using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateOrUpdateManyAsync)}"))
                    {
                        activity?.AddTag("EntityType", typeof(TEntity).FullName);
                        activity?.AddTag("Entity", entities.ToFormattedJson());

                        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                            uow => GetUowDbContext(uow)
                                .CreateOrUpdateManyAsync<TEntity, TPrimaryKey>(
                                    entities,
                                    customCheckExistingPredicateBuilder,
                                    dismissSendEvent,
                                    checkDiff,
                                    eventCustomConfig,
                                    cancellationToken),
                            uow);
                    }
                }

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow)
                        .CreateOrUpdateManyAsync<TEntity, TPrimaryKey>(
                            entities,
                            customCheckExistingPredicateBuilder,
                            dismissSendEvent,
                            checkDiff,
                            eventCustomConfig,
                            cancellationToken),
                    uow);
            },
            cancellationToken: cancellationToken);
    }

    public override Task<TEntity> UpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return UpdateAsync(null, entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken);
    }

    public override Task<TEntity> SetAsync(
        TEntity entity,
        CancellationToken cancellationToken = default)
    {
        return SetAsync(null, entity, cancellationToken);
    }

    public override async Task<TEntity> SetAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(UpdateAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entity.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    async uow => await GetUowDbContext(uow).SetAsync<TEntity, TPrimaryKey>(entity, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            async uow => await GetUowDbContext(uow).SetAsync<TEntity, TPrimaryKey>(entity, cancellationToken),
            uow);
    }

    public override async Task<TEntity> UpdateAsync(
        IPlatformUnitOfWork uow,
        TEntity entity,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(UpdateAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entity.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    async uow => await GetUowDbContext(uow).UpdateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            async uow => await GetUowDbContext(uow).UpdateAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken),
            uow);
    }

    public override Task<TEntity> DeleteAsync(
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return DeleteAsync(null, entityId, dismissSendEvent, eventCustomConfig, cancellationToken);
    }

    public override async Task<TEntity> DeleteAsync(
        IPlatformUnitOfWork uow,
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("EntityId", entityId);

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow).DeleteAsync<TEntity, TPrimaryKey>(entityId, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            uow => GetUowDbContext(uow).DeleteAsync<TEntity, TPrimaryKey>(entityId, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<TEntity> DeleteAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entity.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
                    GetUowDbContext(uow).DeleteAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken));
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
            GetUowDbContext(uow).DeleteAsync<TEntity, TPrimaryKey>(entity, dismissSendEvent, eventCustomConfig, cancellationToken));
    }

    public override async Task<List<TEntity>> CreateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
                    GetUowDbContext(uow).CreateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken));
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
            GetUowDbContext(uow).CreateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken));
    }

    public override async Task<List<TEntity>> CreateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(CreateManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteWithBadQueryWarningForWriteHandling(
                    uow => GetUowDbContext(uow).CreateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteWithBadQueryWarningForWriteHandling(
            uow => GetUowDbContext(uow).CreateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<List<TEntity>> UpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(UpdateManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
                    GetUowDbContext(uow).UpdateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken));
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
            GetUowDbContext(uow).UpdateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken));
    }

    public override async Task<List<TEntity>> UpdateManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        bool checkDiff = true,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(UpdateManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteWithBadQueryWarningForWriteHandling(
                    uow => GetUowDbContext(uow).UpdateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteWithBadQueryWarningForWriteHandling(
            uow => GetUowDbContext(uow).UpdateManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, checkDiff, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<List<TPrimaryKey>> DeleteManyAsync(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entityIds.IsNullOrEmpty()) return [];

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entityIds.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
                    GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entityIds, dismissSendEvent, eventCustomConfig, cancellationToken));
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
            GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entityIds, dismissSendEvent, eventCustomConfig, cancellationToken));
    }

    public override Task<int> DeleteManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return DeleteManyAsync(null, predicate, dismissSendEvent, eventCustomConfig, cancellationToken);
    }

    public override Task<int> DeleteManyAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        return DeleteManyAsync(null, queryBuilder, dismissSendEvent, eventCustomConfig, cancellationToken);
    }

    public override async Task<int> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(queryBuilder, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(queryBuilder, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<int> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("EntityPredicate", predicate.ToString());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
                    uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(predicate, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(
            uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(predicate, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<List<TEntity>> DeleteManyAsync(
        IPlatformUnitOfWork uow,
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteWithBadQueryWarningForWriteHandling(
                    uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken),
                    uow);
            }
        }

        return await ExecuteWithBadQueryWarningForWriteHandling(
            uow => GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken),
            uow);
    }

    public override async Task<List<TEntity>> DeleteManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        Action<PlatformCqrsEntityEvent> eventCustomConfig = null,
        CancellationToken cancellationToken = default)
    {
        if (entities.IsNullOrEmpty()) return entities;

        if (IsDistributedTracingEnabled)
        {
            using (var activity = IPlatformRepository.ActivitySource.StartActivity($"Repository.{nameof(DeleteManyAsync)}"))
            {
                activity?.AddTag("EntityType", typeof(TEntity).FullName);
                activity?.AddTag("Entity", entities.ToFormattedJson());

                return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
                    GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken));
            }
        }

        return await ExecuteAutoOpenUowUsingOnceTimeForWrite(uow =>
            GetUowDbContext(uow).DeleteManyAsync<TEntity, TPrimaryKey>(entities, dismissSendEvent, eventCustomConfig, cancellationToken));
    }
}

public abstract class PlatformPersistenceRootRepository<TEntity, TPrimaryKey, TUow, TDbContext>
    : PlatformPersistenceRepository<TEntity, TPrimaryKey, TUow, TDbContext>
    where TEntity : class, IRootEntity<TPrimaryKey>, new()
    where TUow : class, IPlatformPersistenceUnitOfWork<TDbContext>
    where TDbContext : IPlatformDbContext
{
    protected PlatformPersistenceRootRepository(IServiceProvider serviceProvider) : base(
        serviceProvider)
    {
    }
}
