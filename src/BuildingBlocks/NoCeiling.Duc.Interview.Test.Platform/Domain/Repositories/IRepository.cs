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
    {
        IQueryable<TEntity> GetAllQuery();

        Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);
    }

    public interface IRootRepository<TEntity, TPrimaryKey> : IRepository<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        Task<TEntity> Create(TEntity entity, CancellationToken cancellationToken = default);

        Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null, CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateOrUpdateMany(List<TEntity> entities, CancellationToken cancellationToken = default);

        Task<TEntity> Update(TEntity entity, CancellationToken cancellationToken = default);

        Task Delete(TPrimaryKey entityId, CancellationToken cancellationToken = default);

        Task Delete(TEntity entity, CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateMany(List<TEntity> entities, CancellationToken cancellationToken = default);

        Task<List<TEntity>> UpdateMany(List<TEntity> entities, CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds, CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteMany(List<TEntity> entities, CancellationToken cancellationToken = default);
    }
}
