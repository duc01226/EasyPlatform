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
using FluentValidation.Results;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories
{
    public abstract class PlatformMongoDbRootRepository<TEntity, TPrimaryKey, TDbContext> : PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext>, IRootRepository<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
        where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbRootRepository(TDbContext dbContext, IPlatformCqrs cqrs) : base(dbContext, cqrs)
        {
        }

        public async Task<TEntity> Create(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            EnsureValid(entity.Validate());
            await EnsureValid(entity.CheckUniquenessValidator()?.Validate(predicate => Table.AsQueryable().AnyAsync(predicate, cancellationToken)));

            await Table.InsertOneAsync(entity, null, cancellationToken);
            if (!dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Created), cancellationToken);
            return entity;
        }

        public Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var existingEntity = customCheckExistingPredicate != null
                ? GetAllQuery().FirstOrDefault(customCheckExistingPredicate)
                : GetAllQuery().FirstOrDefault(p => p.Id.Equals(entity.Id));
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
                (await ((IMongoQueryable<TEntity>)GetAllQuery())
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
            EnsureValid(entity.Validate());
            await EnsureValid(entity.CheckUniquenessValidator()?.Validate(predicate => Table.AsQueryable().AnyAsync(predicate, cancellationToken)));

            var result = await Table.ReplaceOneAsync(p => p.Id.Equals(entity.Id), entity, new ReplaceOptions { IsUpsert = false }, cancellationToken);
            if (result.ModifiedCount > 0 && !dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Updated), cancellationToken);
            return entity;
        }

        public async Task Delete(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entity = await Table.Find(p => p.Id.Equals(entityId)).FirstAsync(cancellationToken);
            await Delete(entity, dismissSendEvent, cancellationToken);
        }

        public async Task Delete(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var result = await Table.DeleteOneAsync(p => p.Id.Equals(entity.Id), null, cancellationToken);
            if (result.DeletedCount > 0 && !dismissSendEvent)
                await Cqrs.SendEvent(new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Deleted), cancellationToken);
        }

        public async Task<List<TEntity>> CreateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            EnsureValid(entities);
            await EnsureEntitiesUniqueness(entities, cancellationToken);

            if (entities.Any())
            {
                await Table.InsertManyAsync(entities, null, cancellationToken);
            }

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Created)),
                    cancellationToken);
            }

            return entities;
        }

        public async Task<List<TEntity>> UpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            EnsureValid(entities);
            await EnsureEntitiesUniqueness(entities, cancellationToken);

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
                        updatedEntities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Updated)),
                        cancellationToken);
                }
            }

            return entities;
        }

        public async Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var entities = await DbContext.ToListAsync(GetAllQuery().Where(p => entityIds.Contains(p.Id)));

            return await DeleteMany(entities, dismissSendEvent, cancellationToken);
        }

        public async Task<List<TEntity>> DeleteMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            var ids = entities.Select(p => p.Id).ToList();
            await Table.DeleteManyAsync(p => ids.Contains(p.Id), cancellationToken);

            if (!dismissSendEvent)
            {
                await Cqrs.SendEvents(
                    entities.Select(entity => new PlatformCqrsEntityEvent<TEntity, TPrimaryKey>(entity, PlatformEntityEventAction.Deleted)),
                    cancellationToken);
            }

            return await Task.FromResult(entities);
        }

        protected void EnsureValid(List<TEntity> entities)
        {
            foreach (var entity in entities)
            {
                EnsureValid(entity.Validate());
            }
        }

        protected void EnsureValid(ValidationResult validationResult)
        {
            if (validationResult != null && !validationResult.IsValid)
                throw new PlatformDomainValidationException(validationResult);
        }

        protected void EnsureValid(List<Func<ValidationResult>> validationResultFns)
        {
            foreach (var validationResultFn in validationResultFns)
            {
                var validationResult = validationResultFn();
                if (validationResult != null && !validationResult.IsValid)
                    throw new PlatformDomainValidationException(validationResult);
            }
        }

        protected async Task EnsureValid(Task<ValidationResult> validationResultTask)
        {
            var validationResult = await validationResultTask;
            if (validationResult != null && !validationResult.IsValid)
                throw new PlatformDomainValidationException(validationResult);
        }

        protected async Task EnsureValid(List<Func<Task<ValidationResult>>> validationResultAsyncFns)
        {
            foreach (var validationResultAsyncFn in validationResultAsyncFns)
            {
                var validationResult = await validationResultAsyncFn();
                if (validationResult != null && !validationResult.IsValid)
                    throw new PlatformDomainValidationException(validationResult);
            }
        }

        private async Task EnsureEntitiesUniqueness(List<TEntity> entities, CancellationToken cancellationToken)
        {
            // Validate each entity in the list is unique in the existed items and also in the new items will be persisted
            var entitiesValidateUniquenessFns = entities
                .Where(p => p.CheckUniquenessValidator() != null)
                .Select<TEntity, Func<Task<ValidationResult>>>(entity => () =>
                    entity.CheckUniquenessValidator().Validate(async predicate =>
                        !entities.Any(entity.CheckUniquenessValidator().FindOtherDuplicatedItemExpr.Compile()) &&
                        await Table.AsQueryable().AnyAsync(predicate, cancellationToken)))
                .ToList();
            await EnsureValid(entitiesValidateUniquenessFns);
        }
    }
}
