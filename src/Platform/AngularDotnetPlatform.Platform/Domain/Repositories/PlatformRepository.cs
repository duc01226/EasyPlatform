using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Common.Validators;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Exceptions;

namespace AngularDotnetPlatform.Platform.Domain.Repositories
{
    public abstract class PlatformRepository<TEntity, TPrimaryKey> : IPlatformQueryableRepository<TEntity, TPrimaryKey>
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        public abstract Task<TEntity> GetByIdAsync(TPrimaryKey id, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        public abstract Task<TEntity> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        public abstract Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        public abstract Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        public abstract IQueryable<TEntity> GetAllQuery();

        public abstract Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        public Task<List<TEntity>> GetAllAsync(Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder, CancellationToken cancellationToken = default)
        {
            return GetAllAsync(queryBuilder(GetAllQuery()), cancellationToken);
        }

        public abstract Task<TEntity> FirstOrDefaultAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        public Task<TEntity> FirstOrDefaultAsync(Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder, CancellationToken cancellationToken = default)
        {
            return FirstOrDefaultAsync(queryBuilder(GetAllQuery()), cancellationToken);
        }

        public abstract Task<List<TSelector>> GetAllAsync<TSelector>(
            Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default);

        public abstract Task<TSelector> FirstOrDefaultAsync<TSelector>(
            Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default);

        public abstract Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        protected async Task EnsureEntityValid(TEntity entity, CancellationToken cancellationToken)
        {
            if (entity is IValidatableEntity<TEntity, TPrimaryKey> validatableEntity)
            {
                EnsureValid(validatableEntity.Validate());
                await EnsureValid(validatableEntity.CheckUniquenessValidator()?.Validate(predicate => AnyAsync(predicate, cancellationToken)));
            }
        }

        protected async Task EnsureEntitiesValid(List<TEntity> entities, CancellationToken cancellationToken)
        {
            EnsureValid(entities);
            await EnsureEntitiesUniqueness(entities, cancellationToken);
        }

        protected void EnsureValid(List<TEntity> entities)
        {
            foreach (var entity in entities)
            {
                if (entity is IValidatableEntity<TEntity, TPrimaryKey> validatableEntity)
                {
                    EnsureValid(validatableEntity.Validate());
                }
            }
        }

        protected void EnsureValid(PlatformValidationResult validationResult)
        {
            if (validationResult != null && !validationResult.IsValid)
                throw new PlatformDomainValidationException(validationResult);
        }

        protected void EnsureValid(List<Func<PlatformValidationResult>> validationResultFns)
        {
            foreach (var validationResultFn in validationResultFns)
            {
                var validationResult = validationResultFn();
                if (validationResult != null && !validationResult.IsValid)
                    throw new PlatformDomainValidationException(validationResult);
            }
        }

        protected async Task EnsureValid(Task<PlatformValidationResult> validationResultTask)
        {
            if (validationResultTask == null)
                return;

            var validationResult = await validationResultTask;
            if (validationResult != null && !validationResult.IsValid)
                throw new PlatformDomainValidationException(validationResult);
        }

        protected async Task EnsureValid(List<Func<Task<PlatformValidationResult>>> validationResultAsyncFns)
        {
            foreach (var validationResultAsyncFn in validationResultAsyncFns)
            {
                var validationResult = await validationResultAsyncFn();
                if (validationResult != null && !validationResult.IsValid)
                    throw new PlatformDomainValidationException(validationResult);
            }
        }

        protected async Task EnsureEntitiesUniqueness(List<TEntity> entities, CancellationToken cancellationToken)
        {
            // Validate each entity in the list is unique in the existed items and also in the new items will be persisted
            var entitiesValidateUniquenessFns = entities
                .Where(entity => entity is IValidatableEntity<TEntity, TPrimaryKey> validatableEntity && validatableEntity.CheckUniquenessValidator() != null)
                .Select(p => (IValidatableEntity<TEntity, TPrimaryKey>)p)
                .Select<IValidatableEntity<TEntity, TPrimaryKey>, Func<Task<PlatformValidationResult>>>(entity =>
                    () => entity.CheckUniquenessValidator().Validate(
                        async predicate =>
                            !entities.Any(entity.CheckUniquenessValidator().FindOtherDuplicatedItemExpr.Compile()) &&
                            await AnyAsync(predicate, cancellationToken)))
                .ToList();
            await EnsureValid(entitiesValidateUniquenessFns);
        }
    }

    public abstract class PlatformRootRepository<TEntity, TPrimaryKey> : PlatformRepository<TEntity, TPrimaryKey>, IPlatformQueryableRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
    {
        public abstract Task<TEntity> CreateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<TEntity> CreateOrUpdateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> CreateOrUpdateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<TEntity> UpdateAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task DeleteAsync(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task DeleteAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> CreateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> UpdateManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> DeleteManyAsync(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> DeleteManyAsync(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public async Task<List<TEntity>> DeleteManyAsync(Expression<Func<TEntity, bool>> predicate, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return await DeleteManyAsync(await GetAllAsync(predicate, cancellationToken), dismissSendEvent, cancellationToken);
        }

        public abstract Task<TEntity> CreateOrUpdateAsync(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null, bool dismissSendEvent = false, CancellationToken cancellationToken = default);
    }
}
