using System.Linq.Expressions;
using Easy.Platform.Common.Cqrs;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.Entities;
using Easy.Platform.Domain.Repositories;
using Easy.Platform.Domain.UnitOfWork;
using Easy.Platform.EfCore.Domain.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace Easy.Platform.EfCore.Domain.Repositories;

public abstract class PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext> : PlatformRepository<TEntity, TPrimaryKey>
    where TEntity : class, IEntity<TPrimaryKey>, new()
    where TDbContext : PlatformEfCoreDbContext<TDbContext>
{
    public PlatformEfCoreRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs)
    {
        UnitOfWorkManager = unitOfWorkManager;
        Cqrs = cqrs;
    }

    public IUnitOfWorkManager UnitOfWorkManager { get; }
    protected IPlatformCqrs Cqrs { get; }

    protected virtual TDbContext DbContext =>
        UnitOfWorkManager.CurrentInnerActive<IPlatformEfCoreUnitOfWork<TDbContext>>().DbContext;

    /// <summary>
    /// Gets DbSet for given entity.
    /// </summary>
    protected DbSet<TEntity> Table => DbContext.Set<TEntity>();

    public override IUnitOfWork CurrentUow()
    {
        return UnitOfWorkManager.CurrentInnerActive<IPlatformEfCoreUnitOfWork<TDbContext>>();
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
        return Table.AsNoTracking();
    }

    public override Task<List<TEntity>> GetAllAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return GetAllQuery().WhereIf(predicate != null, predicate).ToListAsync(cancellationToken);
    }

    public override Task<TEntity> FirstOrDefaultAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        if (predicate == null)
            return GetAllQuery().FirstOrDefaultAsync(cancellationToken);
        return GetAllQuery().FirstOrDefaultAsync(predicate, cancellationToken);
    }

    public override Task<int> CountAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return GetAllQuery().WhereIf(predicate != null, predicate).CountAsync(cancellationToken);
    }

    public override Task<bool> AnyAsync(
        Expression<Func<TEntity, bool>> predicate = null,
        CancellationToken cancellationToken = default)
    {
        return GetAllQuery().WhereIf(predicate != null, predicate).AnyAsync(cancellationToken);
    }

    public override Task<List<TEntity>> GetAllAsync(
        IQueryable<TEntity> query,
        CancellationToken cancellationToken = default)
    {
        return query.ToListAsync(cancellationToken);
    }

    public override Task<TEntity> FirstOrDefaultAsync(
        IQueryable<TEntity> query,
        CancellationToken cancellationToken = default)
    {
        return query.FirstOrDefaultAsync(cancellationToken);
    }

    public override Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
    {
        return query.CountAsync(cancellationToken);
    }

    public override Task<List<TSelector>> GetAllAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return queryBuilder(GetAllQuery()).ToListAsync(cancellationToken);
    }

    public override Task<TSelector> FirstOrDefaultAsync<TSelector>(
        Func<IQueryable<TEntity>, IQueryable<TSelector>> queryBuilder,
        CancellationToken cancellationToken = default)
    {
        return queryBuilder(GetAllQuery()).FirstOrDefaultAsync(cancellationToken);
    }
}
