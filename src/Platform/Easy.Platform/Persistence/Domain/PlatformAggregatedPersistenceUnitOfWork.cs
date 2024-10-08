using Easy.Platform.Common;
using Easy.Platform.Common.Extensions;
using Easy.Platform.Domain.UnitOfWork;
using Microsoft.Extensions.DependencyInjection;

namespace Easy.Platform.Persistence.Domain;

public interface IPlatformAggregatedPersistenceUnitOfWork : IPlatformUnitOfWork
{
    public bool IsPseudoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork;
    public bool MustKeepUowForQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork;
    public bool DoesSupportParallelQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork;
}

/// <summary>
/// The aggregated unit of work is to support multi database type in a same application.
/// Each item in InnerUnitOfWorks present a REAL unit of work including a db context
/// </summary>
public class PlatformAggregatedPersistenceUnitOfWork : PlatformUnitOfWork, IPlatformAggregatedPersistenceUnitOfWork
{
    /// <summary>
    /// Store associatedServiceScope to destroy it when uow is create, using and destroy
    /// </summary>
    private IServiceScope associatedServiceScope;

    public PlatformAggregatedPersistenceUnitOfWork(
        IPlatformRootServiceProvider rootServiceProvider,
        List<IPlatformUnitOfWork> innerUnitOfWorks,
        IServiceScope associatedServiceScope) : base(rootServiceProvider)
    {
        InnerUnitOfWorks = innerUnitOfWorks?
                               .Select(innerUow => innerUow.With(w => w.ParentUnitOfWork = this))
                               .ToList() ??
                           [];
        this.associatedServiceScope = associatedServiceScope;
    }

    public override bool IsPseudoTransactionUow()
    {
        return InnerUnitOfWorks.All(p => p.IsPseudoTransactionUow());
    }

    public override bool MustKeepUowForQuery()
    {
        return InnerUnitOfWorks.Any(p => p.MustKeepUowForQuery());
    }

    public override bool DoesSupportParallelQuery()
    {
        return InnerUnitOfWorks.All(p => p.DoesSupportParallelQuery());
    }

    public bool IsPseudoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork
    {
        return InnerUnitOfWorks.FirstOrDefault(p => p.Equals(uow))?.IsPseudoTransactionUow() == true;
    }

    public bool MustKeepUowForQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork
    {
        return InnerUnitOfWorks.FirstOrDefault(p => p.Equals(uow))?.MustKeepUowForQuery() == true;
    }

    public bool DoesSupportParallelQuery<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IPlatformUnitOfWork
    {
        return InnerUnitOfWorks.FirstOrDefault(p => p.Equals(uow))?.DoesSupportParallelQuery() == true;
    }

    public override bool IsActive()
    {
        return base.IsActive() && InnerUnitOfWorks.Any(p => p.IsActive());
    }

    protected override Task InternalSaveChangesAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    protected override void Dispose(bool disposing)
    {
        if (!Disposed)
        {
            base.Dispose(disposing);

            // Release managed resources
            if (disposing)
            {
                InnerUnitOfWorks.ForEach(p => p.Dispose());
                InnerUnitOfWorks.Clear();

                associatedServiceScope?.Dispose();
                associatedServiceScope = null;
            }

            Disposed = true;
        }
    }
}
