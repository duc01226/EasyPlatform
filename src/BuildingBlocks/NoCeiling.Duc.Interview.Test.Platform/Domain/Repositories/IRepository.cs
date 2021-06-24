using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;

namespace NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories
{
    public interface IRepository
    {
    }

    public interface IRepository<TEntity, TPrimaryKey> : IRepository
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TPrimaryKey : struct
    {
        IQueryable<TEntity> GetAllQuery();

        Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<TEntity> Create(TEntity entity);

        Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null);

        Task<TEntity> Update(TEntity entity);

        Task Delete(TPrimaryKey entityId);

        Task Delete(TEntity entity);

        Task<List<TEntity>> CreateMany(List<TEntity> entities);

        Task<List<TEntity>> UpdateMany(List<TEntity> entities);

        Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds);

        Task<List<TEntity>> DeleteMany(List<TEntity> entities);
    }
}
