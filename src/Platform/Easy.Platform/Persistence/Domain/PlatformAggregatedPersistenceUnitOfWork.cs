using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Persistence.Domain;

public interface IPlatformAggregatedPersistenceUnitOfWork : IUnitOfWork
{
    public bool IsNoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IUnitOfWork;
}

/// <summary>
/// The aggregated unit of work is to support multi database type in a same application.
/// Each item in InnerUnitOfWorks present a REAL unit of work including a db context
/// </summary>
public class PlatformAggregatedPersistenceUnitOfWork : PlatformUnitOfWork, IPlatformAggregatedPersistenceUnitOfWork
{
    public PlatformAggregatedPersistenceUnitOfWork(List<IUnitOfWork> innerUnitOfWorks)
    {
        InnerUnitOfWorks = innerUnitOfWorks ?? new List<IUnitOfWork>();
    }

    public Guid Id { get; } = Guid.NewGuid();

    public override bool IsNoTransactionUow()
    {
        return InnerUnitOfWorks.All(p => p.IsNoTransactionUow());
    }

    public bool IsNoTransactionUow<TInnerUnitOfWork>(TInnerUnitOfWork uow) where TInnerUnitOfWork : IUnitOfWork
    {
        return InnerUnitOfWorks.FirstOrDefault(p => p.Equals(uow))?.IsNoTransactionUow() == true;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (Disposed)
            return;

        if (disposing)
        {
            InnerUnitOfWorks.ForEach(p => p.Dispose());
            InnerUnitOfWorks.Clear();
        }

        Disposed = true;
    }
}
