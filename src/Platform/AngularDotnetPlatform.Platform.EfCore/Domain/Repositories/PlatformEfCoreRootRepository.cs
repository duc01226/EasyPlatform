using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Cqrs;
using AngularDotnetPlatform.Platform.Common.Extensions;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Events;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.Repositories
{
    public abstract class PlatformEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext>, IPlatformRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }

        public override IQueryable<TEntity> GetAllQuery()
        {
            return Table.AsQueryable();
        }

        public async Task<TEntity> CreateAsync(TEntity entity, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return await CreateInternal(entity, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public Task<TEntity> CreateOrUpdateAsync(TEntity entity, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return CreateOrUpdateAsync(entity, null, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public Task<TEntity> CreateOrUpdateAsync(
            TEntity entity,
            Expression<Func<TEntity, bool>> customCheckExistingPredicate = null,
            bool dismissSendEvent = false,
            string forBusinessAction = null,
            CancellationToken cancellationToken = default)
        {
            var existingEntity = customCheckExistingPredicate != null
                ? GetAllQuery().AsNoTracking().FirstOrDefault(customCheckExistingPredicate)
                : GetAllQuery().AsNoTracking().FirstOrDefault(p => p.Id.Equals(entity.Id));
            if (existingEntity != null)
            {
                entity.Id = existingEntity.Id;
                return UpdateAsync(entity, dismissSendEvent, forBusinessAction, cancellationToken);
            }
            else
            {
                return CreateAsync(entity, dismissSendEvent, forBusinessAction, cancellationToken);
            }
        }

        public async Task<List<TEntity>> CreateOrUpdateManyAsync(
            List<TEntity> entities,
            bool dismissSendEvent = false,
            string forBusinessAction = null,
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

            await CreateManyAsync(toCreateEntities, dismissSendEvent, forBusinessAction, cancellationToken);
            await UpdateManyAsync(toUpdateEntities, dismissSendEvent, forBusinessAction, cancellationToken);

            return entities;
        }

        public async Task<TEntity> UpdateAsync(
            TEntity entity,
            bool dismissSendEvent = false,
            string forBusinessAction = null,
            CancellationToken cancellationToken = default)
        {
            return await UpdateInternal(entity, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public Task DeleteAsync(
            TPrimaryKey entityId,
            bool dismissSendEvent = false,
            string forBusinessAction = null,
            CancellationToken cancellationToken = default)
        {
            var entity = Table.Find(entityId);
            return DeleteAsync(entity, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task DeleteAsync(
            TEntity entity,
            bool dismissSendEvent = false,
            string forBusinessAction = null,
            CancellationToken cancellationToken = default)
        {
            await DeleteInternal(entity, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task<List<TEntity>> CreateManyAsync(
            List<TEntity> entities, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return await CreateManyInternal(entities, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task<List<TEntity>> UpdateManyAsync(
            List<TEntity> entities, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return await UpdateManyInternal(entities, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteManyAsync(
            List<TPrimaryKey> entityIds, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            var entities = await GetAllQuery().Where(p => entityIds.Contains(p.Id)).ToListAsync(cancellationToken);
            return await DeleteManyAsync(entities, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteManyAsync(
            List<TEntity> entities, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return await DeleteManyInternal(entities, dismissSendEvent, forBusinessAction, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteManyAsync(
            Expression<Func<TEntity, bool>> predicate, bool dismissSendEvent = false, string forBusinessAction = null, CancellationToken cancellationToken = default)
        {
            return await DeleteManyAsync(await GetAllAsync(predicate, cancellationToken), dismissSendEvent, forBusinessAction, cancellationToken);
        }

        protected virtual async Task<List<TEntity>> DeleteManyInternal(
            List<TEntity> entities, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            Table.RemoveRange(entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity =>
                        new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted, forBusinessAction)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        protected virtual async Task<List<TEntity>> UpdateManyInternal(
            List<TEntity> entities, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            Table.UpdateRange(entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity =>
                        new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Updated, forBusinessAction)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        protected virtual async Task<List<TEntity>> CreateManyInternal(
            List<TEntity> entities, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            var result = await Table.AddRangeAsync(entities, cancellationToken).Map(() => entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity =>
                        new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created, forBusinessAction)),
                    cancellationToken);
            }

            return result;
        }

        protected virtual async Task<TEntity> CreateInternal(
            TEntity entity, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            await EnsureEntityValid(entity, cancellationToken);

            var result = await Table.AddAsync(entity, cancellationToken).Map(p => entity);
            if (!dismissSendEvent)
            {
                await Cqrs.SendEvent(
                    new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Created, forBusinessAction),
                    cancellationToken);
            }

            return result;
        }

        protected virtual async Task<TEntity> UpdateInternal(
            TEntity entity, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            await EnsureEntityValid(entity, cancellationToken);

            var result = await Task.FromResult(Table.Update(entity).Entity);
            if (!dismissSendEvent)
            {
                await Cqrs.SendEvent(
                    new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Updated, forBusinessAction),
                    cancellationToken);
            }

            return result;
        }

        protected virtual async Task DeleteInternal(
            TEntity entity, bool dismissSendEvent, string forBusinessAction, CancellationToken cancellationToken)
        {
            await Task.FromResult(Table.Remove(entity).Entity);
            if (!dismissSendEvent)
            {
                await Cqrs.SendEvent(
                    new PlatformCqrsEntityEvent<TEntity>(entity, PlatformCqrsEntityEventCrudAction.Deleted, forBusinessAction),
                    cancellationToken);
            }
        }
    }

    public abstract class PlatformDefaultEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformEfCoreRootRepository<TEntity, TPrimaryKey, TDbContext>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        protected PlatformDefaultEfCoreRootRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs) : base(unitOfWorkManager, cqrs)
        {
        }
    }
}
