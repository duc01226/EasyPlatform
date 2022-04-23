using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Easy.Platform.Domain.UnitOfWork;

namespace Easy.Platform.Persistence.Domain
{
    /// <summary>
    /// The aggregated unit of work is to support multi database type in a same application.
    /// Each item in InnerUnitOfWorks present a REAL unit of work including a db context
    /// </summary>
    public class PlatformAggregatedPersistenceUnitOfWork : IUnitOfWork
    {
        public PlatformAggregatedPersistenceUnitOfWork(List<IUnitOfWork> innerUnitOfWorks)
        {
            InnerUnitOfWorks = innerUnitOfWorks ?? new List<IUnitOfWork>();
        }

        public event EventHandler OnCompleted;
        public event EventHandler<UnitOfWorkFailedArgs> OnFailed;
        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }
        public List<IUnitOfWork> InnerUnitOfWorks { get; private set; }

        public async Task CompleteAsync(CancellationToken cancellationToken = default)
        {
            if (Completed)
                return;

            try
            {
                await Task.WhenAll(InnerUnitOfWorks.Select(p => p.CompleteAsync(cancellationToken)));
                Completed = true;
                OnCompleted?.Invoke(this, EventArgs.Empty);
            }
            catch (Exception e)
            {
                OnFailed?.Invoke(this, new UnitOfWorkFailedArgs(e));
                throw;
            }
        }

        public bool IsActive()
        {
            return InnerUnitOfWorks.Any(p => p.IsActive());
        }

        public void Dispose()
        {
            // Dispose of unmanaged resources
            Dispose(true);

            // Suppress finalization
            GC.SuppressFinalize(this);
        }

        protected virtual void Dispose(bool disposing)
        {
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
}
