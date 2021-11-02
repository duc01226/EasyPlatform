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
using AngularDotnetPlatform.Platform.Extensions;
using FluentValidation.Results;
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

        public new IQueryable<TEntity> GetAllQuery()
        {
            return Table.AsQueryable();
        }

        public async Task<TEntity> Create(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            var result = await Table.AddAsync(entity, cancellationToken).Map(p => entity);
            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Created), cancellationToken);
            return result;
        }

        public Task<TEntity> CreateOrUpdate(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return CreateOrUpdate(entity, null, dismissSendEvent, cancellationToken);
        }

        public Task<TEntity> CreateOrUpdate(
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
                return Update(entity, dismissSendEvent, cancellationToken);
            }
            else
            {
                return Create(entity, dismissSendEvent, cancellationToken);
            }
        }

        public async Task<List<TEntity>> CreateOrUpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
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

            await CreateMany(toCreateEntities, dismissSendEvent, cancellationToken);
            await UpdateMany(toUpdateEntities, dismissSendEvent, cancellationToken);

            return entities;
        }

        public async Task<TEntity> Update(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntityValid(entity, cancellationToken);

            var result = await Task.FromResult(Table.Update(entity).Entity);
            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Updated), cancellationToken);
            return result;
        }

        public Task Delete(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entity = Table.Find(entityId);
            return Delete(entity, dismissSendEvent, cancellationToken);
        }

        public async Task Delete(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await Task.FromResult(Table.Remove(entity).Entity);
            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Deleted), cancellationToken);
        }

        public async Task<List<TEntity>> CreateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            var result = await Table.AddRangeAsync(entities, cancellationToken).Map(() => entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Created)),
                    cancellationToken);
            }

            return result;
        }

        public async Task<List<TEntity>> UpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            await EnsureEntitiesValid(entities, cancellationToken);

            Table.UpdateRange(entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Updated)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        public async Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entities = await GetAllQuery().Where(p => entityIds.Contains(p.Id)).ToListAsync(cancellationToken);
            return await DeleteMany(entities, dismissSendEvent, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            Table.RemoveRange(entities);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformCqrsEntityEventAction.Deleted)),
                cancellationToken);
            }

            return await Task.FromResult(entities);
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
