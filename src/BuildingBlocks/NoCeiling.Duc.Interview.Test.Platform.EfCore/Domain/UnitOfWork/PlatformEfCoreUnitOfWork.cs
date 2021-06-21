using System;
using System.Threading.Tasks;
using NoCeiling.Duc.Interview.Test.Platform.Domain.UnitOfWork;

namespace NoCeiling.Duc.Interview.Test.Platform.EfCore.Domain.UnitOfWork
{
    public abstract class PlatformEfCoreUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        private readonly TDbContext dbContext;

        public PlatformEfCoreUnitOfWork(TDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }

        public async Task CompleteAsync()
        {
            await dbContext.SaveChangesAsync();
            Completed = true;
        }

        public void Dispose()
        {
            // Dispose of unmanaged resources.
            Dispose(true);
            // Suppress finalization.
            GC.SuppressFinalize(this);
        }

        // Protected implementation of Dispose pattern.
        protected virtual void Dispose(bool disposing)
        {
            if (Disposed)
            {
                return;
            }

            if (disposing)
            {
                // Dispose managed state (managed objects).
                dbContext?.Dispose();
            }

            Disposed = true;
        }
    }
}
