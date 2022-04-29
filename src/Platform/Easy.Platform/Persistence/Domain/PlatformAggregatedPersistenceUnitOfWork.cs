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
    public class PlatformAggregatedPersistenceUnitOfWork : PlatformUnitOfWork, IUnitOfWork
    {
        public PlatformAggregatedPersistenceUnitOfWork(List<IUnitOfWork> innerUnitOfWorks) : base()
        {
            InnerUnitOfWorks = innerUnitOfWorks ?? new List<IUnitOfWork>();
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
}
