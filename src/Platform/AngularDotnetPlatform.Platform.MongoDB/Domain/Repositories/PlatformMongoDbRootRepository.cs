using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.Exceptions;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using FluentValidation.Results;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories
{
    public abstract class PlatformMongoDbRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext>, IPlatformRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
        where TDbContext : IPlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }

        public async Task<TEntity> CreateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            await Table.InsertOneAsync(entity, null, cancellationToken);
            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Created), cancellationToken);
            return entity;
        }

        public Task<TEntity> CreateOrUpdateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return CreateOrUpdateAsync(entity, null, dismissSendEvent, cancellationToken);
        }

        public Task<TEntity> CreateOrUpdateAsync(
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
                return UpdateAsync(entity, dismissSendEvent, cancellationToken);
            }
            else
            {
                return CreateAsync(entity, dismissSendEvent, cancellationToken);
            }
        }

        public async Task<List<TEntity>> CreateOrUpdateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
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

        public async Task<TEntity> UpdateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            var result = await Table.ReplaceOneAsync(p => p.Id.Equals(entity.Id), entity, new ReplaceOptions { IsUpsert = false }, cancellationToken);
            if (result.ModifiedCount > 0 && !dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Updated), cancellationToken);
            return entity;
        }

        public async Task DeleteAsync(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entity = await Table.Find(p => p.Id.Equals(entityId)).FirstAsync(cancellationToken);
            await DeleteAsync(entity, dismissSendEvent, cancellationToken);
        }

        public async Task DeleteAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var result = await Table.DeleteOneAsync(p => p.Id.Equals(entity.Id), null, cancellationToken);
            if (result.DeletedCount > 0 && !dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Deleted), cancellationToken);
        }

        public async Task<List<TEntity>> CreateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            if (entities.Any())
            {
                await Table.InsertManyAsync(entities, null, cancellationToken);
            }

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Created)),
                    cancellationToken);
            }

            return entities;
        }

        public async Task<List<TEntity>> UpdateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            if (entities.Any())
            {
                var idToUpdateEntityResultMap = entities
                    .Select(p => new
                    {
                        EntityId = p.Id,
                        UpdateResult = Table.ReplaceOneAsync(Builders<TEntity>.Filter.Eq(e => e.Id, p.Id), p, new ReplaceOptions { IsUpsert = false }, cancellationToken).Result
                    })
                    .ToDictionary(p => p.EntityId, p => p.UpdateResult);

                if (!dismissSendEvent)
                {
                    var updatedEntities = entities.Where(p => idToUpdateEntityResultMap[p.Id].ModifiedCount > 0);
                    await Cqrs.SendEvents(
                        updatedEntities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Updated)),
                        cancellationToken);
                }
            }

            return entities;
        }

        public async Task<List<TEntity>> DeleteManyAsync(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entities = await DbContext.GetAllAsync(GetAllQuery().Where(p => entityIds.Contains(p.Id)), cancellationToken);

            return await DeleteManyAsync(entities.ToList(), dismissSendEvent, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var ids = entities.Select(p => p.Id).ToList();
            await Table.DeleteManyAsync(p => ids.Contains(p.Id), cancellationToken);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Deleted)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        public async Task<List<TEntity>> DeleteManyAsync(Expression<Func<TEntity, bool>> predicate, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
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
