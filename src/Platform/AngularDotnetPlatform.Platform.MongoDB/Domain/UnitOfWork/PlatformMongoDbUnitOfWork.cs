using System;
using System.Threading.Tasks;
using AngularDotnetPlatform.Platform.Domain.UnitOfWork;

namespace AngularDotnetPlatform.Platform.MongoDB.Domain.UnitOfWork
{
    public abstract class PlatformMongoDbUnitOfWork<TDbContext> : IUnitOfWork where TDbContext : PlatformMongoDbContext<TDbContext>
    {
        private readonly TDbContext dbContext;

        public PlatformMongoDbUnitOfWork(TDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        public event Action OnCompleted;
        public bool Completed { get; private set; }
        public bool Disposed { get; private set; }

        public Task CompleteAsync()
        {
            if (Completed)
                throw new Exception("This unit of work is completed");

            Completed = true;
            OnCompleted?.Invoke();
            return Task.CompletedTask;
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
                // context?.Dispose();
            }

            Disposed = true;
        }
    }
}
