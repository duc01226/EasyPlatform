using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NoCeiling.Duc.Interview.Test.Platform.Cqrs;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Entities;
using NoCeiling.Duc.Interview.Test.Platform.Domain.Repositories;
using NoCeiling.Duc.Interview.Test.Platform.Extensions;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore.Domain.Repositories
{
    public abstract class PlatformEfCoreRepository<TEntity, TPrimaryKey, TDbContext> : IRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        public PlatformEfCoreRepository(TDbContext dbContext, IPlatformCqrs cqrs)
        {
            DbContext = dbContext;
            Cqrs = cqrs;
        }

        protected IPlatformCqrs Cqrs { get; }

        protected TDbContext DbContext { get; }

        /// <summary>
        /// Gets DbSet for given entity.
        /// </summary>
        protected DbSet<TEntity> Table => DbContext.Set<TEntity>();

        protected abstract string EntityEventRoutingKeyPrefix { get; }

        public IQueryable<TEntity> GetAllQuery()
        {
            return Table.AsNoTracking();
        }

        public Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return GetAllQuery().WhereIf(predicate != null, predicate).ToListAsync(cancellationToken);
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
