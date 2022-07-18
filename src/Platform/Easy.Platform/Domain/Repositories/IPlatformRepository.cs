using System.Linq.Expressions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Domain.Repositories
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformPersistenceModule.InternalRegister
    /// </summary>
    public interface IPlatformRepository
    {
        public IUnitOfWork CurrentUow();
    }

    public interface IPlatformBasicRepository<TEntity, TPrimaryKey> : IPlatformRepository
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        Task<TEntity> GetByIdAsync(TPrimaryKey id, CancellationToken cancellationToken = default);
        Task<List<TEntity>> GetByIdsAsync(List<TPrimaryKey> ids, CancellationToken cancellationToken = default);
    }

    public interface IPlatformRepository<TEntity, TPrimaryKey> : IPlatformBasicRepository<TEntity, TPrimaryKey>
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        Task<List<TEntity>> GetAllAsync(
            Expression<Func<TEntity, bool>> predicate = null,
            CancellationToken cancellationToken = default);

        Task<TEntity> FirstOrDefaultAsync(
            Expression<Func<TEntity, bool>> predicate = null,
            CancellationToken cancellationToken = default);

        Task<int> CountAsync(
            Expression<Func<TEntity, bool>> predicate = null,
            CancellationToken cancellationToken = default);

        Task<bool> AnyAsync(
            Expression<Func<TEntity, bool>> predicate = null,
            CancellationToken cancellationToken = default);
    }

    public interface IPlatformBasicRootRepository<TEntity, TPrimaryKey> : IPlatformBasicRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
    {
        Task<TEntity> CreateAsync(
            TEntity entity,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<TEntity> CreateOrUpdateAsync(
            TEntity entity,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateOrUpdateManyAsync(
            List<TEntity> entities,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<TEntity> UpdateAsync(
            TEntity entity,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task DeleteAsync(
            TPrimaryKey entityId,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task DeleteAsync(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateManyAsync(
            List<TEntity> entities,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<List<TEntity>> UpdateManyAsync(
            List<TEntity> entities,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteManyAsync(
            List<TPrimaryKey> entityIds,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteManyAsync(
            List<TEntity> entities,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteManyAsync(
            Expression<Func<TEntity, bool>> predicate,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);
    }

    public interface IPlatformRootRepository<TEntity, TPrimaryKey> : IPlatformBasicRootRepository<TEntity, TPrimaryKey>,
        IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
    {
        Task<TEntity> CreateOrUpdateAsync(
            TEntity entity,
            Expression<Func<TEntity, bool>> customCheckExistingPredicate = null,
            bool dismissSendEvent = false,
            CancellationToken cancellationToken = default);
    }

    public interface IPlatformQueryableRepository<TEntity, TPrimaryKey> : IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : class, IEntity<TPrimaryKey>, new()
    {
        IQueryable<TEntity> GetAllQuery();

        Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<List<TEntity>> GetAllAsync(
            Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
            CancellationToken cancellationToken = default);

        Task<TEntity> FirstOrDefaultAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<TEntity> FirstOrDefaultAsync(
            Func<IQueryable<TEntity>, IQueryable<TEntity>> queryBuilder,
            CancellationToken cancellationToken = default);

        Task<List<TSelector>> GetAllAsync<TSelector>(
            Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default);

        Task<TSelector> FirstOrDefaultAsync<TSelector>(
            Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
            CancellationToken cancellationToken = default);

        Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);
    }

    public interface IPlatformQueryableRootRepository<TEntity, TPrimaryKey>
        : IPlatformQueryableRepository<TEntity, TPrimaryKey>, IPlatformRootRepository<TEntity, TPrimaryKey>
        where TEntity : class, IRootEntity<TPrimaryKey>, new()
    {
    }
}
