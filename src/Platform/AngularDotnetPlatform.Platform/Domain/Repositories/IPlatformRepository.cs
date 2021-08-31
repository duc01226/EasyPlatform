using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.Entities;

namespace AngularDotnetPlatform.Platform.Domain.Repositories
{
    /// <summary>
    /// This interface is used for conventional register class mapping via PlatformPersistenceModule.InternalRegister
    /// </summary>
    public interface IPlatformRepository
    {
    }

    public interface IPlatformBasicRepository<TEntity, in TPrimaryKey> : IPlatformRepository
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        Task<TEntity> GetByIdAsync(TPrimaryKey id, CancellationToken cancellationToken = default);
    }

    public interface IPlatformRepository<TEntity, in TPrimaryKey> : IPlatformBasicRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<TEntity> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);

        Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default);
    }

    public interface IPlatformBasicRootRepository<TEntity, TPrimaryKey> : IPlatformBasicRepository<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        Task<TEntity> Create(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<TEntity> CreateOrUpdate(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateOrUpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<TEntity> Update(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task Delete(TPrimaryKey entityId, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task Delete(TEntity entity, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> CreateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> UpdateMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteMany(List<TPrimaryKey> entityIds, bool dismissSendEvent = false, CancellationToken cancellationToken = default);

        Task<List<TEntity>> DeleteMany(List<TEntity> entities, bool dismissSendEvent = false, CancellationToken cancellationToken = default);
    }

    public interface IPlatformRootRepository<TEntity, TPrimaryKey> : IPlatformBasicRootRepository<TEntity, TPrimaryKey>, IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
        Task<TEntity> CreateOrUpdate(TEntity entity, Expression<Func<TEntity, bool>> customCheckExistingPredicate = null, bool dismissSendEvent = false, CancellationToken cancellationToken = default);
    }

    public interface IPlatformQueryableRepository<TEntity, in TPrimaryKey> : IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
    {
        IQueryable<TEntity> GetAllQuery();

        Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);

        Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default);
    }

    public interface IPlatformQueryableRootRepository<TEntity, TPrimaryKey>
        : IPlatformQueryableRepository<TEntity, TPrimaryKey>, IPlatformRootRepository<TEntity, TPrimaryKey>
        where TEntity : RootEntity<TEntity, TPrimaryKey>, new()
    {
    }
}
