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
using AngularDotnetPlatform.Platform.Extensions;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.Repositories
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

        /// <summary>
        /// Routing Key Prefix is used as a prefix for entity Create/Update/Delete event. The RoutingKey of an event is used to binding a queue to event for listening events.
        /// RoutingKey = $"{RoutingKeyPrefix}.{nameof(TEntity)}.{Type}"
        /// Usually RoutingKeyPrefix should be the unique name of a micro-service.
        /// </summary>
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
