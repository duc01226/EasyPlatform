#region

using Easy.Platform.Application.Persistence;
using Easy.Platform.Application.RequestContext;
using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

#endregion

namespace Easy.Platform.Persistence.Domain;

public interface IPlatformPersistenceUnitOfWork<out TDbContext> : IPlatformUnitOfWork
    where TDbContext : IPlatformDbContext
{
    public TDbContext DbContext { get; }
}

public abstract class PlatformPersistenceUnitOfWork<TDbContext> : PlatformUnitOfWork, IPlatformPersistenceUnitOfWork<TDbContext>
    where TDbContext : IPlatformDbContext
{
    public PlatformPersistenceUnitOfWork(
        IPlatformRootServiceProvider rootServiceProvider,
        IServiceProvider serviceProvider,
        ILoggerFactory loggerFactory) : base(rootServiceProvider, serviceProvider, loggerFactory)
    {
        DbContextLazy = new Lazy<TDbContext>(() => DbContextFactory(serviceProvider).With(dbContext => dbContext.MappedUnitOfWork = this));
    }

    protected Lazy<TDbContext> DbContextLazy { get; }

    public TDbContext DbContext => DbContextLazy.Value;

    protected override Task InternalSaveChangesAsync(CancellationToken cancellationToken)
    {
        if (DbContextLazy.IsValueCreated)
            return DbContext.SaveChangesAsync(cancellationToken);

        return Task.CompletedTask;
    }

    // Protected implementation of Dispose pattern.
    protected override void Dispose(bool disposing)
    {
        if (!Disposed)
        {
            base.Dispose(disposing);

            // Release managed resources
            if (disposing && ShouldDisposeDbContext())
            {
                BeforeDisposeDbContext(DbContext);
                DbContext?.Dispose();
            }

            Disposed = true;
        }
    }

    protected virtual bool ShouldDisposeDbContext()
    {
        return DbContextLazy.IsValueCreated;
    }

    protected virtual void BeforeDisposeDbContext(TDbContext dbContext)
    {
    }

    protected virtual TDbContext DbContextFactory(IServiceProvider serviceProvider)
    {
        return serviceProvider.GetRequiredService<TDbContext>()
            .With(p => p.CurrentRequestContextAccessor = serviceProvider.GetRequiredService<IPlatformApplicationRequestContextAccessor>());
    }
}
