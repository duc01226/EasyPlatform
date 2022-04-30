using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Events;
using Easy.Platform.Domain.Exceptions;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using FluentValidation.Results;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace Easy.Platform.MongoDB.Domain.Repositories
{
    public abstract class PlatformMongoDbRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext>, IPlatformRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }

        public virtual async Task<TEntity> CreateAsync(
            TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            await Table.InsertOneAsync(entity, null, cancellationToken);

            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created), cancellationToken);

            return entity;
        }

        public virtual Task<TEntity> CreateOrUpdateAsync(
            TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return CreateOrUpdateAsync(entity, null, dismissSendEvent, cancellationToken);
        }

        public virtual Task<TEntity> CreateOrUpdateAsync(
            TEntity entity,
            Expression<Func<TEntity, bool>> customCheckExistingPredicate = null,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default)
        {
            var existingEntity = customCheckExistingPredicate != null
                ? GetAllQuery().FirstOrDefault(customCheckExistingPredicate)
                : GetAllQuery().FirstOrDefault(p => p.Id.Equals(entity.Id));
            if (existingEntity != null)
            {
                entity.Id = existingEntity.Id;

                if (entity is IRowVersionEntity rowVersionEntity && existingEntity is IRowVersionEntity existingRowVersionEntity)
                {
                    rowVersionEntity.ConcurrencyUpdateToken = existingRowVersionEntity.ConcurrencyUpdateToken;
                }

                return UpdateAsync(entity, dismissSendEvent, cancellationToken);
            }
            else
            {
                return CreateAsync(entity, dismissSendEvent, cancellationToken);
            }
        }

        public virtual async Task<List<TEntity>> CreateOrUpdateManyAsync(
            List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entityIds = entities.Select(p => p.Id);

            var existingEntityIds =
                (await ((IMongoQueryable<TEntity>)GetAllQuery())
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
            TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            if (entity is IRowVersionEntity rowVersionEntity)
            {
                var currentInMemoryConcurrencyUpdateToken = rowVersionEntity.ConcurrencyUpdateToken;
                var newUpdateConcurrencyUpdateToken = Guid.NewGuid();

                rowVersionEntity.ConcurrencyUpdateToken = newUpdateConcurrencyUpdateToken;

                var result = await Table.ReplaceOneAsync(
                    p => p.Id.Equals(entity.Id) &&
                         (((IRowVersionEntity)p).ConcurrencyUpdateToken == null ||
                          ((IRowVersionEntity)p).ConcurrencyUpdateToken == Guid.Empty ||
                          ((IRowVersionEntity)p).ConcurrencyUpdateToken == currentInMemoryConcurrencyUpdateToken),
                    entity,
                    new ReplaceOptions { IsUpsert = false },
                    cancellationToken);

                if (result.MatchedCount <= 0)
                {
                    if (await AnyAsync(p => p.Id.Equals(entity.Id), cancellationToken))
                    {
                        throw new PlatformRowVersionConflictDomainException(
                            $"Update {typeof(TEntity).Name} with Id:{entity.Id} has conflicted version.");
                    }
                    else
                    {
                        throw new PlatformEntityNotFoundDomainException<TEntity>(entity.Id.ToString());
                    }
                }
            }
            else
            {
                var result = await Table.ReplaceOneAsync(p => p.Id.Equals(entity.Id), entity, new ReplaceOptions { IsUpsert = false }, cancellationToken);

                if (result.MatchedCount <= 0)
                {
                    throw new PlatformEntityNotFoundDomainException<TEntity>(entity.Id.ToString());
                }
            }

            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Updated), cancellationToken);
            return entity;
        }

        public virtual async Task DeleteAsync(
            TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entity = await Table.Find(p => p.Id.Equals(entityId)).FirstAsync(cancellationToken);
            await DeleteAsync(entity, dismissSendEvent, cancellationToken);
        }

        public virtual async Task DeleteAsync(
            TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var result = await Table.DeleteOneAsync(p => p.Id.Equals(entity.Id), null, cancellationToken);
            if (result.DeletedCount > 0 && !dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted), cancellationToken);
        }

        public virtual async Task<List<TEntity>> CreateManyAsync(
            List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            if (entities.Any())
            {
                await Table.InsertManyAsync(entities, null, cancellationToken);
            }

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created)),
                    cancellationToken);
            }

            return entities;
        }

        public virtual async Task<List<TEntity>> UpdateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            foreach (var entity in entities)
            {
                await UpdateAsync(entity, dismissSendEvent, cancellationToken);
            }

            return entities;
        }

        public virtual async Task<List<TEntity>> UpdateWhereAsync(Expression<Func<TEntity, bool>> predicate, Action<TEntity> updateAction, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entities = await GetAllAsync(predicate, cancellationToken);

            entities.ForEach(updateAction);

            return await UpdateManyAsync(entities, dismissSendEvent, cancellationToken);
        }

        public virtual async Task<List<TEntity>> DeleteManyAsync(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entities = await DbContext.GetAllAsync(GetAllQuery().Where(p => entityIds.Contains(p.Id)), cancellationToken);

            return await DeleteManyAsync(entities.ToList(), dismissSendEvent, cancellationToken);
        }

        public virtual async Task<List<TEntity>> DeleteManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var ids = entities.Select(p => p.Id).ToList();
            await Table.DeleteManyAsync(p => ids.Contains(p.Id), cancellationToken);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        public virtual async Task<List<TEntity>> DeleteManyAsync(Expression<Func<TEntity, bool>> predicate, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return await DeleteManyAsync(await GetAllAsync(predicate, cancellationToken), dismissSendEvent, cancellationToken);
        }
    }

    public class PlatformDefaultMongoDbRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformMongoDbRootRepository<TEntity, TPrimaryKey, TDbContext>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformDefaultMongoDbRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
