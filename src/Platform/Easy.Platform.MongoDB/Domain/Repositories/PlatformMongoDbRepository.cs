using System.Linq.Expressions;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.MongoDB.Domain.UnitOfWork;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace Easy.Platform.MongoDB.Domain.Repositories;

public abstract class PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext> : PlatformRepository<TEntity, TPrimaryKey>
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TDbContext : IPlatformMongoDbContext<TDbContext>
{
    public PlatformMongoDbRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs)
    {
        UnitOfWorkManager = unitOfWorkManager;
        Cqrs = cqrs;
    }

    public IUnitOfWorkManager UnitOfWorkManager { get; }
    protected IPlatformCqrs Cqrs { get; }

    protected virtual TDbContext DbContext =>
        UnitOfWorkManager.CurrentInnerActive<IPlatformMongoDbUnitOfWork<TDbContext>>().DbContext;

    /// <summary>
    /// Gets DbSet for given entity.
    /// </summary>
    protected virtual IMongoCollection<TEntity> Table => DbContext.GetCollection<TEntity>();

    public override IUnitOfWork CurrentUow()
    {
        return UnitOfWorkManager.CurrentInnerActive<IPlatformMongoDbUnitOfWork<TDbContext>>();
    }

    public override Task<TEntity> GetByIdAsync(TPrimaryKey id, CancellationToken cancellationToken = default)
    {
        return FirstOrDefaultAsync(p => p.Id.Equals(id), cancellationToken);
    }

    public override Task<List<TEntity>> GetByIdsAsync(
        List<TPrimaryKey> ids,
        CancellationToken cancellationToken = default)
    {
        return GetAllAsync(p => ids.Contains(p.Id), cancellationToken);
    }

    public override IQueryable<TEntity> GetAllQuery()
    {
        return Table.AsQueryable();
    }

    public override Task<List<TEntity>> GetAllAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).ToListAsync(
            cancellationToken);
    }

    public override Task<TEntity> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        if (predicate == null)
            return ((IMongoQueryable<TEntity>)GetAllQuery()).FirstOrDefaultAsync(cancellationToken);
        return ((IMongoQueryable<TEntity>)GetAllQuery()).FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public override Task<int> CountAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).CountAsync(
            cancellationToken);
    }

    public override Task<bool> AnyAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).AnyAsync(
            cancellationToken);
    }

    public override Task<List<TEntity>> GetAllAsync(
        IQueryable<TEntity> query,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)query).ToListAsync(cancellationToken);
    }

    public override Task<TEntity> FirstOrDefaultAsync(
        IQueryable<TEntity> query,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)query).FirstOrDefaultAsync(cancellationToken);
    }

    public override Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TEntity>)query).CountAsync(cancellationToken);
    }

    public override Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TSelector>)queryBuilder(GetAllQuery())).ToListAsync(cancellationToken);
    }

    public override Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return ((IMongoQueryable<TSelector>)queryBuilder(GetAllQuery())).FirstOrDefaultAsync(cancellationToken);
    }
}
