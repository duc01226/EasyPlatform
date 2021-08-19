using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.Repositories
{
    public abstract class PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext> : IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Cqrs = cqrs;
        }

        public IUnitOfWorkManager UnitOfWorkManager { get; }
        protected IPlatformCqrs Cqrs { get; }

        protected TDbContext DbContext =>
            UnitOfWorkManager.CurrentInnerActive<IPlatformEfCoreUnitOfWork<TDbContext>>().DbContext;

        /// <summary>
        /// Gets DbSet for given entity.
        /// </summary>
        protected DbSet<TEntity> Table => DbContext.Set<TEntity>();

        public IQueryable<TEntity> GetAllQuery()
        {
            return Table.AsNoTracking();
        }

        public Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return GetAllQuery().WhereIf(predicate != null, predicate).ToListAsync(cancellationToken);
        }

        public Task<TEntity> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            if (predicate == null)
                return GetAllQuery().FirstOrDefaultAsync(cancellationToken);
            return GetAllQuery().FirstOrDefaultAsync(predicate, cancellationToken);
        }

        public Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return GetAllQuery().WhereIf(predicate != null, predicate).CountAsync(cancellationToken);
        }

        public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return GetAllQuery().WhereIf(predicate != null, predicate).AnyAsync(cancellationToken);
        }

        public Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return query.ToListAsync(cancellationToken);
        }

        public Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return query.CountAsync(cancellationToken);
        }
    }
}
