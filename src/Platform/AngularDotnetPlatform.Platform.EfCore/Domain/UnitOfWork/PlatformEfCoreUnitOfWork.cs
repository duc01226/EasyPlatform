using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.EfCore.Domain.UnitOfWork
{
    public abstract class PlatformEfCoreUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformEfCoreDbContext<TDbContext>
    {
        private readonly TDbContext dbContext;

        public PlatformEfCoreUnitOfWork(TDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public event Action OnCompleted;

        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }

        public async Task CompleteAsync()
        {
            if (Completed)
                throw new Exception("This unit of work is completed");

            await dbContext.SaveChangesAsync();
            Completed = true;
            OnCompleted?.Invoke();
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
