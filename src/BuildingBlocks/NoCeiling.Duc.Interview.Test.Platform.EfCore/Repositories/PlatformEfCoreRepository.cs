using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Events;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories;
using NoCeiling.Duc.Interview.Test.Platform.Extensions;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore.Repositories
{
    public abstract class PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext> : IRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : struct
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreRepository(TDbContext dbContext, IPlatformCqrs cqrs)
        {
            DbContext = dbContext;
            Cqrs = cqrs;
        }

        protected IPlatformCqrs Cqrs { get; }

        protected TDbContext DbContext { get; }

        /// <summary>
        /// Gets DbSet for given entity.
        /// </summary>
        protected DbSet<TEntity> Table => DbContext.Set<TEntity>();

        protected abstract string EntityEventRoutingKeyPrefix { get; }

        public IQueryable<TEntity> GetAll()
        {
            // Ensure that UnitOfWork.Complete() will not Update/Delete entities without calling repository Update/Delete
            return Table.AsNoTrackingWithIdentityResolution();
        }

        public async Task<TEntity> Create(TEntity entity)
        {
            await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, EntityEventType.Created, EntityEventRoutingKeyPrefix));
            return await Table.AddAsync(entity).Map(p => entity);
        }

        public Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null)
        {
            var existingEntity = customCheckExistingPredicate != null
                ? GetAll().FirstOrDefault(customCheckExistingPredicate)
                : GetAll().FirstOrDefault(p => p.Id.Equals(entity.Id));
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
            return await Task.FromResult(Table.Update(entity).Entity);
        }

        public Task Delete(TPrimaryKey entityId)
        {
            var entity = Table.Find(entityId);
            return Delete(entity);
        }

        public async Task Delete(TEntity entity)
        {
            await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, EntityEventType.Deleted, EntityEventRoutingKeyPrefix));
            await Task.FromResult(Table.Remove(entity).Entity);
        }

        public async Task<List<TEntity>> CreateMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Created, EntityEventRoutingKeyPrefix)));
            return await Table.AddRangeAsync(entities).Map(() => entities);
        }

        public async Task<List<TEntity>> UpdateMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Updated, EntityEventRoutingKeyPrefix)));
            Table.UpdateRange(entities);
            return await Task.FromResult(entities);
        }

        public async Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds)
        {
            var entities = await GetAll().Where(p => entityIds.Contains(p.Id)).ToListAsync();
            return await DeleteMany(entities);
        }

        public async Task<List<TEntity>> DeleteMany(List<TEntity> entities)
        {
            await Cqrs.SendEvents(entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(
                entity, EntityEventType.Deleted, EntityEventRoutingKeyPrefix)));
            Table.RemoveRange(entities);
            return await Task.FromResult(entities);
        }
    }
}
