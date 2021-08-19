using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Threading;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Cqrs;
using AngularDotnetPlatform.Platform.Domain.Entities;
using AngularDotnetPlatform.Platform.Domain.Repositories;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;
using AngularDotnetPlatform.Platform.Extensions;
using AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork;
using MongoDB.Driver;
using MongoDB.Driver.Linq;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.Repositories
{
    public abstract class PlatformMongoDbRepository<TEntity, TPrimaryKey, TDbContext> : IPlatformRepository<TEntity, TPrimaryKey>
        where TEntity : Entity<TEntity, TPrimaryKey>, new()
        where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        public PlatformMongoDbRepository(IUnitOfWorkManager unitOfWorkManager, IPlatformCqrs cqrs)
        {
            UnitOfWorkManager = unitOfWorkManager;
            Cqrs = cqrs;
        }

        public IUnitOfWorkManager UnitOfWorkManager { get; }
        protected IPlatformCqrs Cqrs { get; }

        protected TDbContext DbContext =>
            UnitOfWorkManager.CurrentInnerActive<IPlatformMongoDbUnitOfWork<TDbContext>>().DbContext;

        /// <summary>
        /// Gets DbSet for given entity.
        /// </summary>
        protected IMongoCollection<TEntity> Table => DbContext.GetCollection<TEntity>();

        public IQueryable<TEntity> GetAllQuery()
        {
            // Ensure that UnitOfWork.Complete() will not Update/Delete entities without calling repository Update/Delete
            return Table.AsQueryable();
        }

        public Task<List<TEntity>> GetAllAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).ToListAsync(cancellationToken);
        }

        public Task<TEntity> FirstOrDefaultAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            if (predicate == null)
                return ((IMongoQueryable<TEntity>)GetAllQuery()).FirstOrDefaultAsync(cancellationToken);
            return ((IMongoQueryable<TEntity>)GetAllQuery()).FirstOrDefaultAsync(predicate, cancellationToken);
        }

        public Task<int> CountAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).CountAsync(cancellationToken);
        }

        public Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate = null, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)GetAllQuery().WhereIf(predicate != null, predicate)).AnyAsync(cancellationToken);
        }

        public Task<List<TEntity>> GetAllAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)query).ToListAsync(cancellationToken);
        }

        public Task<int> CountAsync(IQueryable<TEntity> query, CancellationToken cancellationToken = default)
        {
            return ((IMongoQueryable<TEntity>)query).CountAsync(cancellationToken);
        }
    }
}
