using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Exceptions;
using FluentValidation.Results;

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

        public abstract Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        protected async Task EnsureEntityValid(TEntity entity, CancellationToken cancellationToken)
        {
            if (entity is IValidatableEntity<TEntity, TPrimaryKey> validatableEntity)
            {
                EnsureValid(validatableEntity.Validate());
                await EnsureValid(validatableEntity.CheckUniquenessValidator()
                    ?.Validate(predicate => AnyAsync(predicate, cancellationToken)));
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
            if (validationResultTask == null)
                return;

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

        protected async Task EnsureEntitiesUniqueness(List<TEntity> entities, CancellationToken cancellationToken)
        {
            // Validate each entity in the list is unique in the existed items and also in the new items will be persisted
            var entitiesValidateUniquenessFns = entities
                .Where(entity => entity is IValidatableEntity<TEntity, TPrimaryKey> validatableEntity && validatableEntity.CheckUniquenessValidator() != null)
                .Select(p => (IValidatableEntity<TEntity, TPrimaryKey>)p)
                .Select<IValidatableEntity<TEntity, TPrimaryKey>, Func<Task<ValidationResult>>>(entity => () =>
                    entity.CheckUniquenessValidator().Validate(async predicate =>
                        !entities.Any(entity.CheckUniquenessValidator().FindOtherDuplicatedItemExpr.Compile()) &&
                        await AnyAsync(predicate, cancellationToken)))
                .ToList();
            await EnsureValid(entitiesValidateUniquenessFns);
        }
    }

    public abstract class PlatformRootRepository<TEntity, TPrimaryKey> : PlatformRepository<TEntity, TPrimaryKey>, IPlatformQueryableRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
    {
        public abstract Task<TEntity> Create(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<TEntity> CreateOrUpdate(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> CreateOrUpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<TEntity> Update(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task Delete(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task Delete(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> CreateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> UpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public abstract Task<List<TEntity>> DeleteMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        public async Task<List<TEntity>> DeleteMany(Expression<Func<TEntity, bool>> predicate, bool dismissSendEvent = false, CancellationToken cancellationToken = default)
        {
            return await DeleteMany(await GetAllAsync(predicate, cancellationToken), dismissSendEvent, cancellationToken);
        }

        public abstract Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null, bool dismissSendEvent = false, CancellationToken cancellationToken = default);
    }
}
