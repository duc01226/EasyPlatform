using System.Linq.Expressions;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace Easy.Platform.EfCore.Domain.Repositories;

public abstract class PlatformEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext> :
    PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext>,
    IPlatformRootRepository<TEntity, TPrimaryKey>
    where TEntity : class, IRootEntity<TPrimaryKey>, new()
    where TDbContext : PlatformEfCoreDbContext<TDbContext>
{
    public PlatformEfCoreRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(
        unitOfWorkManager,
        cqrs)
    {
    }

    public virtual async Task<TEntity> CreateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureEntityValid(entity, cancellationToken);

        var result = await Table.AddAsync(entity, cancellationToken).Map(p => entity);
        if (!dismissSendEvent)
            await Cqrs.SendEvent(
                new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created),
                cancellationToken);

        return result;
    }

    public virtual Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        return CreateOrUpdateAsync(
            entity,
            null,
            dismissSendEvent,
            cancellationToken);
    }

    public virtual Task<TEntity> CreateOrUpdateAsync(
        TEntity entity,
        Expression<Func<TEntity, bool>> customCheckExistingPredicate = null,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        var existingEntity = customCheckExistingPredicate != null
            ? GetAllQuery().AsNoTracking().FirstOrDefault(customCheckExistingPredicate)
            : GetAllQuery().AsNoTracking().FirstOrDefault(p => p.Id.Equals(entity.Id));
        if (existingEntity != null)
        {
            entity.Id = existingEntity.Id;

            if (entity is IRowVersionEntity rowVersionEntity &&
                existingEntity is IRowVersionEntity existingRowVersionEntity)
                rowVersionEntity.ConcurrencyUpdateToken = existingRowVersionEntity.ConcurrencyUpdateToken;

            return UpdateAsync(entity, dismissSendEvent, cancellationToken);
        }

        return CreateAsync(entity, dismissSendEvent, cancellationToken);
    }

    public virtual async Task<List<TEntity>> CreateOrUpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        var entityIds = entities.Select(p => p.Id);

        var existingEntityIds =
            (await GetAllQuery()
                .Where(p => entityIds.Contains(p.Id))
                .Select(p => p.Id)
                .Distinct()
                .ToListAsync(cancellationToken))
            .ToHashSet();

        var toCreateEntities = entities.Where(p => !existingEntityIds.Contains(p.Id)).ToList();
        var toUpdateEntities = entities.Where(p => existingEntityIds.Contains(p.Id)).ToList();

        await CreateManyAsync(toCreateEntities, dismissSendEvent, cancellationToken);
        await UpdateManyAsync(toUpdateEntities, dismissSendEvent, cancellationToken);

        return entities;
    }

    public virtual async Task<TEntity> UpdateAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureEntityValid(entity, cancellationToken);

        var result = await Task.FromResult(Table.Update(entity).Entity);

        if (result is IRowVersionEntity rowVersionEntity)
            rowVersionEntity.ConcurrencyUpdateToken = Guid.NewGuid();

        if (!dismissSendEvent)
            await Cqrs.SendEvent(
                new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Updated),
                cancellationToken);

        return result;
    }

    public virtual Task DeleteAsync(
        TPrimaryKey entityId,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        var entity = Table.Find(entityId);
        return DeleteAsync(entity, dismissSendEvent, cancellationToken);
    }

    public virtual async Task DeleteAsync(
        TEntity entity,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        await Task.FromResult(Table.Remove(entity).Entity);
        if (!dismissSendEvent)
            await Cqrs.SendEvent(
                new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted),
                cancellationToken);
    }

    public virtual async Task<List<TEntity>> CreateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        await EnsureEntitiesValid(entities, cancellationToken);

        var result = await Table.AddRangeAsync(entities, cancellationToken).Map(() => entities);

        if (!dismissSendEvent)
            await Cqrs.SendEvents(
                entities.Select(
                    entity => new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created)),
                cancellationToken);

        return result;
    }

    public virtual async Task<List<TEntity>> UpdateManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        foreach (var entity in entities)
            await UpdateAsync(entity, dismissSendEvent, cancellationToken);

        return entities;
    }

    public virtual async Task<List<TEntity>> DeleteManyAsync(
        List<TPrimaryKey> entityIds,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        var entities = await GetAllQuery().Where(p => entityIds.Contains(p.Id)).ToListAsync(cancellationToken);
        return await DeleteManyAsync(entities, dismissSendEvent, cancellationToken);
    }

    public virtual async Task<List<TEntity>> DeleteManyAsync(
        List<TEntity> entities,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        Table.RemoveRange(entities);

        if (!dismissSendEvent)
            await Cqrs.SendEvents(
                entities.Select(
                    entity => new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted)),
                cancellationToken);

        return await Task.FromResult(entities);
    }

    public virtual async Task<List<TEntity>> DeleteManyAsync(
        Expression<Func<TEntity, bool>> predicate,
        bool dismissSendEvent = false,
        CancellationToken cancellationToken = default)
    {
        return await DeleteManyAsync(
            await GetAllAsync(predicate, cancellationToken),
            dismissSendEvent,
            cancellationToken);
    }

    public override IQueryable<TEntity> GetAllQuery()
    {
        return Table.AsQueryable();
    }
}

public abstract class PlatformDefaultEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext>
    where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    where TDbContext : PlatformEfCoreDbContext<TDbContext>
{
    protected PlatformDefaultEfCoreRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(
        unitOfWorkManager,
        cqrs)
    {
    }
}
