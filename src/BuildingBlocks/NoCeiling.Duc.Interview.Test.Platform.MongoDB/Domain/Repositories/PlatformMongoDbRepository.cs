using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Events;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories;
using NoCeiling.Duc.Interview.Test.Platform.Extensions;
using NoCeiling.Duc.Interview.Test.Platform.MongoDB;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace NoCeiling.Duc.Interview.Test.Platform.MongoDB.Domain.Repositories
{
    public abstract class PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext> : IRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : IEquatable<TPrimaryKey>
        where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbRepository(TDbContext dbContext, IPlatformCqrs cqrs)
        {
            DbContext = dbContext;
            Cqrs = cqrs;
        }

        protected IPlatformCqrs Cqrs { get; }

        protected TDbContext DbContext { get; }

        /// <summary>
        /// Gets DbSet for given entity.
        /// </summary>
        protected IMongoCollection<TEntity> Table => DbContext.Database.GetCollection<TEntity>(nameof(TEntity));

        protected abstract string EntityEventRoutingKeyPrefix { get; }

        public IQueryable<TEntity> GetAllQuery()
        {
            // Ensure that UnitOfWork.Complete() will not Update/Delete entities without calling repository Update/Delete
            return Table.AsQueryable();
        }

        public Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).ToListAsync(cancellationToken);
        }

        public Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).CountAsync(cancellationToken);
        }

        public Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)query).ToListAsync(cancellationToken);
        }

        public Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)query).CountAsync(cancellationToken);
        }

        public async Task<TEntity> Create(TEntity entity)
        {
            await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, EntityEventType.Created, EntityEventRoutingKeyPrefix));
            await Table.InsertOneAsync(entity);
            return entity;
        }

        public Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null)
        {
            var existingEntity = customCheckExistingPredicate != null
                ? GetAllQuery().FirstOrDefault(customCheckExistingPredicate)
                : GetAllQuery().FirstOrDefault(p => p.Id.Equals(entity.Id));
            if (existingEntity != null)
            {
                entity.Id = existingEntity.Id;
                return Update(entity);
            }
            else
            {
                return Create(entity);
            }
        }

        public async Task<TEntity> Update(TEntity entity)
        {
            await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, EntityEventType.Updated, EntityEventRoutingKeyPrefix));
            await Table.ReplaceOneAsync(p => p.Id.Equals(entity.Id), entity, new ReplaceOptions { IsUpsert = true });
            return entity;
        }

        public Task Delete(TPrimaryKey entityId)
        {
            var entity = Table.Find(p => p.Id.Equals(entityId)).First();
            return Delete(entity);
        }

        public async Task Delete(TEntity entity)
        {
            await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, EntityEventType.Deleted, EntityEventRoutingKeyPrefix));
            await Table.DeleteOneAsync(p => p.Id.Equals(entity.Id));
        }

        public async Task<List<TEntity>> CreateMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Created, EntityEventRoutingKeyPrefix)));

            if (entities.Any())
            {
                await Table.InsertManyAsync(entities);
            }

            return entities;
        }

        public async Task<List<TEntity>> UpdateMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Updated, EntityEventRoutingKeyPrefix)));

            if (entities.Any())
            {
                await Task.WhenAll(entities.Select(p =>
                    Table.ReplaceOneAsync(
                        Builders<TEntity>.Filter.Eq(e => e.Id, p.Id), p, new ReplaceOptions { IsUpsert = true })));
            }

            return entities;
        }

        public async Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds)
        {
            var entities = await DbContext.ToListAsync(GetAllQuery().Where(p => entityIds.Contains(p.Id)));

            return await DeleteMany(entities);
        }

        public async Task<List<TEntity>> DeleteMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Deleted, EntityEventRoutingKeyPrefix)));

            var ids = entities.Select(p => p.Id).ToList();
            await Table.DeleteManyAsync(p => ids.Contains(p.Id));

            return await Task.FromResult(entities);
        }
    }
}
